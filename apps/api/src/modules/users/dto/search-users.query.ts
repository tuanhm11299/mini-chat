import { IsString, MaxLength, MinLength } from 'class-validator';

export class SearchUsersQuery {
  /** Matches the start of a display name or email. */
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  search: string;
}
