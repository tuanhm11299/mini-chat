import { GROUP_MAX_MEMBERS, GROUP_TITLE_MAX_LENGTH } from '@mini-chat/shared';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateGroupConversationDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(GROUP_TITLE_MAX_LENGTH)
  title: string;

  /** Everyone to add besides yourself. */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(GROUP_MAX_MEMBERS - 1)
  @IsUUID('all', { each: true })
  memberIds: string[];
}
