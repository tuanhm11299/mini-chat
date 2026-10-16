import type { CurrentUserDto } from './user';

/**
 * Returned by login, register and refresh.
 * The refresh token is never in the body: it travels in an httpOnly cookie.
 */
export interface AuthResponse {
  accessToken: string;
  user: CurrentUserDto;
}
