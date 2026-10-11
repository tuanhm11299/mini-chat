import type { ConversationDto } from '@mini-chat/shared';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, QueryFailedError, Repository } from 'typeorm';
import { Message } from '../messages/entities/message.entity';
import { User } from '../users/entities/user.entity';
import { ConversationCreatedEvent, ConversationReadEvent } from './conversations.events';
import { toConversationDto } from './conversations.mapper';
import type { CreateDirectConversationDto } from './dto/create-direct-conversation.dto';
import type { CreateGroupConversationDto } from './dto/create-group-conversation.dto';
import { ConversationMember } from './entities/conversation-member.entity';
import { Conversation } from './entities/conversation.entity';

const isUniqueViolation = (error: unknown) =>
  error instanceof QueryFailedError &&
  (error.driverError as { code?: string } | undefined)?.code === '23505';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Conversation) private readonly conversations: Repository<Conversation>,
    @InjectRepository(ConversationMember) private readonly members: Repository<ConversationMember>,
    @InjectRepository(Message) private readonly messages: Repository<Message>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly events: EventEmitter2,
  ) {}

  /** All conversations the user belongs to, most recently active first. */
  async listForUser(userId: string): Promise<ConversationDto[]> {
    const conversations = await this.queryWithMembers()
      .innerJoin('conversation.members', 'me', 'me.userId = :userId', { userId })
      .orderBy('conversation.lastMessageAt', 'DESC')
      .getMany();
    return this.toDtos(conversations, userId);
  }

  async getForUser(conversationId: string, userId: string): Promise<ConversationDto> {
    await this.assertMember(conversationId, userId);
    const conversation = await this.queryWithMembers()
      .where('conversation.id = :conversationId', { conversationId })
      .getOneOrFail();
    const [dto] = await this.toDtos([conversation], userId);
    return dto!;
  }

  /** Returns the existing direct chat with that person, or starts a new one. */
  async createDirect(userId: string, dto: CreateDirectConversationDto): Promise<ConversationDto> {
    if (dto.userId === userId)
      throw new BadRequestException('You cannot start a chat with yourself');
    await this.assertUsersExist([dto.userId]);

    const directKey = [userId, dto.userId].sort().join(':');
    const existing = await this.conversations.findOneBy({ directKey });
    if (existing) return this.getForUser(existing.id, userId);

    try {
      const id = await this.insertConversation({ type: 'direct', title: null, directKey }, [
        userId,
        dto.userId,
      ]);
      return this.announceCreated(id, userId);
    } catch (error) {
      // Both people pressed "start chat" at the same moment: use the one that won.
      if (isUniqueViolation(error)) {
        const winner = await this.conversations.findOneByOrFail({ directKey });
        return this.getForUser(winner.id, userId);
      }
      throw error;
    }
  }

  async createGroup(userId: string, dto: CreateGroupConversationDto): Promise<ConversationDto> {
    const memberIds = [...new Set([userId, ...dto.memberIds])];
    await this.assertUsersExist(memberIds);

    const id = await this.insertConversation(
      { type: 'group', title: dto.title, directKey: null },
      memberIds,
    );
    return this.announceCreated(id, userId);
  }

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    await this.assertMember(conversationId, userId);
    // Use the database clock so the comparison with messages.created_at is exact.
    await this.members.update({ conversationId, userId }, { lastReadAt: () => 'now()' });
    const { lastReadAt } = await this.members.findOneByOrFail({ conversationId, userId });
    this.events.emit(
      ConversationReadEvent.event,
      new ConversationReadEvent(conversationId, userId, lastReadAt),
    );
  }

  /** Throws 404 (not 403) so non-members can't tell whether a conversation exists. */
  async assertMember(conversationId: string, userId: string): Promise<void> {
    const isMember = await this.members.existsBy({ conversationId, userId });
    if (!isMember) throw new NotFoundException('Conversation not found');
  }

  async findConversationIds(userId: string): Promise<string[]> {
    const memberships = await this.members.find({
      where: { userId },
      select: { conversationId: true },
    });
    return memberships.map((membership) => membership.conversationId);
  }

  /** Everyone who shares at least one conversation with the user. */
  async findContactIds(userId: string): Promise<string[]> {
    const rows = await this.members
      .createQueryBuilder('other')
      .select('DISTINCT other.userId', 'userId')
      .innerJoin(ConversationMember, 'mine', 'mine.conversationId = other.conversationId')
      .where('mine.userId = :userId', { userId })
      .andWhere('other.userId != :userId', { userId })
      .getRawMany<{ userId: string }>();
    return rows.map((row) => row.userId);
  }

  private queryWithMembers() {
    return this.conversations
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.members', 'member')
      .leftJoinAndSelect('member.user', 'user')
      .addOrderBy('member.joinedAt', 'ASC');
  }

  private async insertConversation(
    data: Pick<Conversation, 'type' | 'title' | 'directKey'>,
    memberIds: string[],
  ): Promise<string> {
    return this.dataSource.transaction(async (manager) => {
      const conversation = await manager.save(manager.create(Conversation, data));
      await manager.insert(
        ConversationMember,
        memberIds.map((memberId) => ({ conversationId: conversation.id, userId: memberId })),
      );
      return conversation.id;
    });
  }

  private async announceCreated(conversationId: string, userId: string): Promise<ConversationDto> {
    const dto = await this.getForUser(conversationId, userId);
    this.events.emit(ConversationCreatedEvent.event, new ConversationCreatedEvent(dto));
    return dto;
  }

  private async assertUsersExist(ids: string[]): Promise<void> {
    const found = await this.users.countBy({ id: In(ids) });
    if (found !== ids.length) throw new BadRequestException('One or more users do not exist');
  }

  /** Adds the last message and unread count to each conversation (2 queries in total). */
  private async toDtos(conversations: Conversation[], userId: string): Promise<ConversationDto[]> {
    if (conversations.length === 0) return [];
    const ids = conversations.map((conversation) => conversation.id);
    const [lastMessages, unreadCounts] = await Promise.all([
      this.findLastMessages(ids),
      this.countUnread(ids, userId),
    ]);
    return conversations.map((conversation) =>
      toConversationDto(conversation, {
        lastMessage: lastMessages.get(conversation.id) ?? null,
        unreadCount: unreadCounts.get(conversation.id) ?? 0,
      }),
    );
  }

  private async findLastMessages(conversationIds: string[]): Promise<Map<string, Message>> {
    // DISTINCT ON keeps the first row per conversation, i.e. the newest message.
    const messages = await this.messages
      .createQueryBuilder('message')
      .distinctOn(['message.conversationId'])
      .where('message.conversationId IN (:...conversationIds)', { conversationIds })
      .orderBy('message.conversationId')
      .addOrderBy('message.createdAt', 'DESC')
      .addOrderBy('message.id', 'DESC')
      .getMany();
    return new Map(messages.map((message) => [message.conversationId, message]));
  }

  private async countUnread(
    conversationIds: string[],
    userId: string,
  ): Promise<Map<string, number>> {
    const rows = await this.messages
      .createQueryBuilder('message')
      .select('message.conversationId', 'conversationId')
      .addSelect('COUNT(*)::int', 'count')
      .innerJoin(
        ConversationMember,
        'member',
        'member.conversationId = message.conversationId AND member.userId = :userId',
        { userId },
      )
      .where('message.conversationId IN (:...conversationIds)', { conversationIds })
      .andWhere('message.senderId != :userId', { userId })
      .andWhere('message.createdAt > member.lastReadAt')
      .groupBy('message.conversationId')
      .getRawMany<{ conversationId: string; count: number }>();
    return new Map(rows.map((row) => [row.conversationId, row.count]));
  }
}
