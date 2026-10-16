import { MESSAGES_PAGE_SIZE } from '@mini-chat/shared';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class ListMessagesQuery {
  /** Return messages older than this message id. Omit to get the newest page. */
  @IsOptional()
  @IsUUID()
  before?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = MESSAGES_PAGE_SIZE;
}
