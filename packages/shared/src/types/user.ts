/** A user as other people see them (no private fields). */
export interface UserDto {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

/** The signed-in user, including private fields only they can see. */
export interface CurrentUserDto extends UserDto {
  email: string;
}
