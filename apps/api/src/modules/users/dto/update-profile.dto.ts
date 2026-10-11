import { DISPLAY_NAME_MAX_LENGTH } from '@mini-chat/shared';
import { IsOptional, IsString, IsUrl, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(DISPLAY_NAME_MAX_LENGTH)
  displayName?: string;

  /** Send `null` to remove the avatar. */
  @IsOptional()
  @ValidateIf((_dto, value) => value !== null)
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  avatarUrl?: string | null;
}
