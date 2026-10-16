import type { CursorPage, MessageDto } from '@mini-chat/shared';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ConversationsService } from '../conversations/conversations.service';
import { Conversation } from '../conversations/entities/conversation.entity';
import type { ListMessagesQuery } from './dto/list-messages.query';
import type { SendMessageDto } from './dto/send-message.dto';
import { Message } from './entities/message.entity';
import { MessageCreatedEvent } from './messages.events';
import { toMessageDto } from './messages.mapper';

@Injectable()
export class MessagesService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Message) private readonly messages: Repository<Message>,
    private readonly conversationsService: ConversationsService,
    private readonly events: EventEmitter2,
  ) {}

  /**
   * One page of history, returned oldest → newest (ready to render).
   * Pass `nextCursor` back as `before` to load the page before it.
   */
  async list(
    conversationId: string,
    userId: string,
    query: ListMessagesQuery,
  ): Promise<CursorPage<MessageDto>> {
    await this.conversationsService.assertMember(conversationId, userId);

    const qb = this.messages
      .createQueryBuilder('message')
      .where('message.conversationId = :conversationId', { conversationId })
      .orderBy('message.createdAt', 'DESC')
      .addOrderBy('message.id', 'DESC')
      // Fetch one extra row to know whether an older page exists.
      .take(query.limit + 1);

    if (query.before) {
      // Compare (created_at, id) in SQL so ties and microsecond precision are handled exactly.
      qb.andWhere(
        `(message.createdAt, message.id) < (
          SELECT cursor.created_at, cursor.id FROM messages cursor
          WHERE cursor.id = :before AND cursor.conversation_id = :conversationId
        )`,
        { before: query.before },
      );
    }

    const rows = await qb.getMany();
    const hasMore = rows.length > query.limit;
    const page = rows.slice(0, query.limit).reverse();
    return {
      items: page.map((message) => toMessageDto(message)),
      nextCursor: hasMore ? (page[0]?.id ?? null) : null,
    };
  }

  async send(conversationId: string, userId: string, input: SendMessageDto): Promise<MessageDto> {
    await this.conversationsService.assertMember(conversationId, userId);

    const saved = await this.dataSource.transaction(async (manager) => {
      const created = await manager.save(
        manager.create(Message, { conversationId, senderId: userId, body: input.body }),
      );
      // now() is the transaction start time, i.e. exactly the message's created_at.
      await manager.update(Conversation, conversationId, { lastMessageAt: () => 'now()' });
      return created;
    });

    const message = toMessageDto(saved, input.clientId);
    this.events.emit(MessageCreatedEvent.event, new MessageCreatedEvent(message));
    return message;
  }
}
