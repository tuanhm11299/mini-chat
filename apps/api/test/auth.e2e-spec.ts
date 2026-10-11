import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, registerUser, resetDatabase } from './test-app';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(() => resetDatabase(app));
  afterAll(() => app.close());

  it('registers, then returns the current user', async () => {
    const user = await registerUser(app, 'Ada');

    const me = await api().get('/api/auth/me').auth(user.token, { type: 'bearer' }).expect(200);
    expect(me.body).toMatchObject({ id: user.id, displayName: 'Ada' });
    expect(me.body).not.toHaveProperty('passwordHash');
  });

  it('sets the refresh token as an httpOnly cookie limited to /api/auth', async () => {
    const user = await registerUser(app);
    expect(user.cookie[0]).toMatch(/refresh_token=.+; Path=\/api\/auth; .*HttpOnly/);
  });

  it('rejects a duplicate email regardless of case', async () => {
    await api()
      .post('/api/auth/register')
      .send({ email: 'same@test.dev', displayName: 'A', password: 'password123' })
      .expect(201);
    await api()
      .post('/api/auth/register')
      .send({ email: 'SAME@test.dev', displayName: 'B', password: 'password123' })
      .expect(409);
  });

  it('logs in with the right password only', async () => {
    await api()
      .post('/api/auth/register')
      .send({ email: 'login@test.dev', displayName: 'L', password: 'password123' })
      .expect(201);

    await api()
      .post('/api/auth/login')
      .send({ email: 'login@test.dev', password: 'wrong-password' })
      .expect(401);
    const res = await api()
      .post('/api/auth/login')
      .send({ email: 'login@test.dev', password: 'password123' })
      .expect(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
  });

  it('rotates the refresh token, and logout ends the session', async () => {
    const user = await registerUser(app);

    const refreshed = await api().post('/api/auth/refresh').set('Cookie', user.cookie).expect(200);
    expect(refreshed.body.user.id).toBe(user.id);
    const newCookie = refreshed.get('Set-Cookie') ?? [];
    expect(newCookie[0]).not.toEqual(user.cookie[0]);

    await api().post('/api/auth/logout').set('Cookie', newCookie).expect(204);
    await api().post('/api/auth/refresh').set('Cookie', newCookie).expect(401);
  });

  it('requires a token for protected routes', async () => {
    await api().get('/api/conversations').expect(401);
    await api().get('/api/conversations').auth('not-a-jwt', { type: 'bearer' }).expect(401);
  });
});
