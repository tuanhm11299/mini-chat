import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import type { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { TokensService } from './tokens.service';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<
    Pick<UsersService, 'emailExists' | 'create' | 'findByEmailWithPassword' | 'findById'>
  >;

  const user = { id: 'user-1', email: 'ada@test.dev', displayName: 'Ada' } as User;

  beforeEach(async () => {
    usersService = {
      emailExists: jest.fn(),
      create: jest.fn(),
      findByEmailWithPassword: jest.fn(),
      findById: jest.fn(),
    };
    const tokensService: Partial<TokensService> = {
      signAccessToken: jest.fn().mockResolvedValue('access-token'),
      issueRefreshToken: jest
        .fn()
        .mockResolvedValue({ token: 'refresh-token', expiresAt: new Date() }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: TokensService, useValue: tokensService },
      ],
    }).compile();
    authService = moduleRef.get(AuthService);
  });

  describe('register', () => {
    it('hashes the password and starts a session', async () => {
      usersService.emailExists.mockResolvedValue(false);
      usersService.create.mockResolvedValue(user);

      const session = await authService.register({
        email: 'ada@test.dev',
        displayName: '  Ada ',
        password: 'password123',
      });

      const saved = usersService.create.mock.calls[0]![0];
      expect(saved.displayName).toBe('Ada');
      expect(saved.passwordHash).not.toBe('password123');
      expect(await argon2.verify(saved.passwordHash, 'password123')).toBe(true);
      expect(session.accessToken).toBe('access-token');
    });

    it('refuses an email that is already taken', async () => {
      usersService.emailExists.mockResolvedValue(true);
      await expect(
        authService.register({
          email: 'ada@test.dev',
          displayName: 'Ada',
          password: 'password123',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login', () => {
    it('gives the same error for an unknown email and a wrong password', async () => {
      usersService.findByEmailWithPassword.mockResolvedValueOnce(null);
      await expect(
        authService.login({ email: 'nobody@test.dev', password: 'password123' }),
      ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));

      usersService.findByEmailWithPassword.mockResolvedValueOnce({
        ...user,
        passwordHash: await argon2.hash('right-password'),
      });
      await expect(
        authService.login({ email: 'ada@test.dev', password: 'wrong-password' }),
      ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
    });
  });
});
