import type { CursorPage, MessageDto } from '@mini-chat/shared';
import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { type AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { ListMessagesQuery } from './dto/list-messages.query';
import { SendMessageDto } from './dto/send-message.dto';
import { MessagesService } from './messages.service';

@ApiTags('messages')
@ApiBearerAuth()
@Controller('conversations/:conversationId/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  list(
    @CurrentUser() me: AuthUser,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Query() query: ListMessagesQuery,
  ): Promise<CursorPage<MessageDto>> {
    return this.messagesService.list(conversationId, me.id, query);
  }

  @Post()
  send(
    @CurrentUser() me: AuthUser,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Body() dto: SendMessageDto,
  ): Promise<MessageDto> {
    return this.messagesService.send(conversationId, me.id, dto);
  }
}
