import type { CurrentUserDto, UserDto } from '@mini-chat/shared';
import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { type AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { SearchUsersQuery } from './dto/search-users.query';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { toCurrentUserDto, toUserDto } from './users.mapper';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async search(@CurrentUser() me: AuthUser, @Query() query: SearchUsersQuery): Promise<UserDto[]> {
    const users = await this.usersService.search(query.search, me.id);
    return users.map(toUserDto);
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() me: AuthUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<CurrentUserDto> {
    return toCurrentUserDto(await this.usersService.updateProfile(me.id, dto));
  }
}
