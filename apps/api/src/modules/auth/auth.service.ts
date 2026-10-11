import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import type { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import { type IssuedRefreshToken, TokensService } from './tokens.service';

export interface Session {
  user: User;
  accessToken: string;
  refreshToken: IssuedRefreshToken;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokensService: TokensService,
  ) {}

  async register(dto: RegisterDto): Promise<Session> {
    if (await this.usersService.emailExists(dto.email)) {
      throw new ConflictException('An account with this email already exists');
    }
    const user = await this.usersService.create({
      email: dto.email,
      displayName: dto.displayName.trim(),
      passwordHash: await argon2.hash(dto.password),
    });
    return this.startSession(user);
  }

  async login(dto: LoginDto): Promise<Session> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    // Same error for "no such user" and "wrong password", so emails can't be probed.
    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.startSession(user);
  }

  async refresh(refreshToken: string): Promise<Session> {
    const rotated = await this.tokensService.rotateRefreshToken(refreshToken);
    const user = await this.usersService.findById(rotated.userId);
    return {
      user,
      accessToken: await this.tokensService.signAccessToken(user.id),
      refreshToken: rotated.refreshToken,
    };
  }

  logout(refreshToken: string): Promise<void> {
    return this.tokensService.deleteRefreshToken(refreshToken);
  }

  private async startSession(user: User): Promise<Session> {
    return {
      user,
      accessToken: await this.tokensService.signAccessToken(user.id),
      refreshToken: await this.tokensService.issueRefreshToken(user.id),
    };
  }
}
