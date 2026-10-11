import type { AuthResponse } from '@mini-chat/shared';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { AddressInfo } from 'node:net';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/setup-app';

/** Boots the real app on a random port against the test database (from `.env.test`). */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  setupApp(app);
  await app.listen(0);
  await app.get(DataSource).runMigrations();
  return app;
}

/** Empties every table so each test starts from a clean database. */
export async function resetDatabase(app: INestApplication): Promise<void> {
  await app
    .get(DataSource)
    .query('TRUNCATE users, refresh_tokens, conversations, conversation_members, messages CASCADE');
}

export interface TestUser {
  id: string;
  token: string;
  /** The `Set-Cookie` header from login/register (holds the refresh token). */
  cookie: string[];
}

let userCounter = 0;

export async function registerUser(
  app: INestApplication,
  displayName = 'Tester',
): Promise<TestUser> {
  userCounter += 1;
  const res = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send({ email: `user${userCounter}@test.dev`, displayName, password: 'password123' })
    .expect(201);
  const body = res.body as AuthResponse;
  return { id: body.user.id, token: body.accessToken, cookie: res.get('Set-Cookie') ?? [] };
}

export function connectSocket(app: INestApplication, token: string): Promise<Socket> {
  const { port } = app.getHttpServer().address() as AddressInfo;
  const socket = io(`http://localhost:${port}`, { auth: { token }, transports: ['websocket'] });
  return new Promise((resolve, reject) => {
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });
}

/** Resolves with the payload of the next `event` the socket receives. */
export function nextEvent<T>(socket: Socket, event: string, timeoutMs = 3000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for "${event}"`)),
      timeoutMs,
    );
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}
