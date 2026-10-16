import { IsUUID } from 'class-validator';

export class CreateDirectConversationDto {
  /** The person to chat with. */
  @IsUUID()
  userId: string;
}
