import type { CurrentUserDto, UserDto } from '@mini-chat/shared';
import type { User } from './entities/user.entity';

export function toUserDto(user: User): UserDto {
  return { id: user.id, displayName: user.displayName, avatarUrl: user.avatarUrl };
}

export function toCurrentUserDto(user: User): CurrentUserDto {
  return { ...toUserDto(user), email: user.email };
}
