import { DISPLAY_NAME_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@mini-chat/shared';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(DISPLAY_NAME_MAX_LENGTH)
  displayName: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(128)
  password: string;
}
