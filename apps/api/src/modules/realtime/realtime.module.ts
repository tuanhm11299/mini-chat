import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { ChatGateway } from './chat.gateway';
import { PresenceService } from './presence.service';

@Module({
  imports: [AuthModule, ConversationsModule],
  providers: [ChatGateway, PresenceService],
})
export class RealtimeModule {}
