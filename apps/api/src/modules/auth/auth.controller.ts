import type { AuthResponse, CurrentUserDto } from '@mini-chat/shared';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { type AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { toCurrentUserDto } from '../users/users.mapper';
import { UsersService } from '../users/users.service';
import { type Session, AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const REFRESH_COOKIE = 'refresh_token';
// The cookie is only ever sent to the auth endpoints, never to the rest of the API.
const REFRESH_COOKIE_PATH = '/api/auth';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    return this.respondWithSession(res, await this.authService.register(dto));
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    return this.respondWithSession(res, await this.authService.login(dto));
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const token = readRefreshCookie(req);
    if (!token) throw new UnauthorizedException('No session');
    try {
      return this.respondWithSession(res, await this.authService.refresh(token));
    } catch (error) {
      res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
      throw error;
    }
  }

  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const token = readRefreshCookie(req);
    if (token) await this.authService.logout(token);
    res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
  }

  @ApiBearerAuth()
  @Get('me')
  async me(@CurrentUser() me: AuthUser): Promise<CurrentUserDto> {
    return toCurrentUserDto(await this.usersService.findById(me.id));
  }

  private respondWithSession(res: Response, session: Session): AuthResponse {
    res.cookie(REFRESH_COOKIE, session.refreshToken.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: REFRESH_COOKIE_PATH,
      expires: session.refreshToken.expiresAt,
    });
    return { accessToken: session.accessToken, user: toCurrentUserDto(session.user) };
  }
}

function readRefreshCookie(req: Request): string | undefined {
  const cookies = req.cookies as Record<string, string | undefined>;
  return cookies[REFRESH_COOKIE];
}
