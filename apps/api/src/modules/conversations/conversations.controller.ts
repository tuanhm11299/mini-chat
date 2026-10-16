import type { ConversationDto } from '@mini-chat/shared';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { type AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { ConversationsService } from './conversations.service';
import { CreateDirectConversationDto } from './dto/create-direct-conversation.dto';
import { CreateGroupConversationDto } from './dto/create-group-conversation.dto';

@ApiTags('conversations')
@ApiBearerAuth()
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  list(@CurrentUser() me: AuthUser): Promise<ConversationDto[]> {
    return this.conversationsService.listForUser(me.id);
  }

  @Post('direct')
  createDirect(
    @CurrentUser() me: AuthUser,
    @Body() dto: CreateDirectConversationDto,
  ): Promise<ConversationDto> {
    return this.conversationsService.createDirect(me.id, dto);
  }

  @Post('group')
  createGroup(
    @CurrentUser() me: AuthUser,
    @Body() dto: CreateGroupConversationDto,
  ): Promise<ConversationDto> {
    return this.conversationsService.createGroup(me.id, dto);
  }

  @Get(':id')
  get(
    @CurrentUser() me: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ConversationDto> {
    return this.conversationsService.getForUser(id, me.id);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post(':id/read')
  markAsRead(@CurrentUser() me: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.conversationsService.markAsRead(id, me.id);
  }
}
