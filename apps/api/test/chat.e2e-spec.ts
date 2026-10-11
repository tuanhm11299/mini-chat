import {
  ClientEvents,
  type ConversationDto,
  type MessageDto,
  type ReadUpdatedPayload,
  ServerEvents,
  type TypingUpdatedPayload,
} from '@mini-chat/shared';
import type { INestApplication } from '@nestjs/common';
import type { Socket } from 'socket.io-client';
import request from 'supertest';
import {
  connectSocket,
  createTestApp,
  nextEvent,
  registerUser,
  resetDatabase,
  type TestUser,
} from './test-app';

describe('Conversations, messages and realtime (e2e)', () => {
  let app: INestApplication;
  let alice: TestUser;
  let bob: TestUser;
  let sockets: Socket[] = [];

  const as = (user: TestUser) => {
    const agent = request(app.getHttpServer());
    const auth = { type: 'bearer' as const };
    return {
      get: (url: string) => agent.get(url).auth(user.token, auth),
      post: (url: string, body?: object) => agent.post(url).auth(user.token, auth).send(body),
    };
  };

  const startDirectChat = async (from: TestUser, to: TestUser) =>
    (await as(from).post('/api/conversations/direct', { userId: to.id }).expect(201))
      .body as ConversationDto;

  const send = async (from: TestUser, conversationId: string, body: string) =>
    (await as(from).post(`/api/conversations/${conversationId}/messages`, { body }).expect(201))
      .body as MessageDto;

  const socketFor = async (user: TestUser) => {
    const socket = await connectSocket(app, user.token);
    sockets.push(socket);
    return socket;
  };

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDatabase(app);
    alice = await registerUser(app, 'Alice');
    bob = await registerUser(app, 'Bob');
  });
  afterEach(() => {
    sockets.forEach((socket) => socket.disconnect());
    sockets = [];
  });
  afterAll(() => app.close());

  describe('REST', () => {
    it('reuses the same direct chat for the same two people', async () => {
      const first = await startDirectChat(alice, bob);
      const second = await startDirectChat(bob, alice);
      expect(second.id).toBe(first.id);
      expect(first.members.map((member) => member.id).sort()).toEqual([alice.id, bob.id].sort());
    });

    it('hides conversations from non-members', async () => {
      const carol = await registerUser(app, 'Carol');
      const chat = await startDirectChat(alice, bob);

      await as(carol).get(`/api/conversations/${chat.id}`).expect(404);
      await as(carol).get(`/api/conversations/${chat.id}/messages`).expect(404);
      await as(carol).post(`/api/conversations/${chat.id}/messages`, { body: 'hi' }).expect(404);
    });

    it('creates a group with the creator included', async () => {
      const carol = await registerUser(app, 'Carol');
      const res = await as(alice)
        .post('/api/conversations/group', { title: ' Team ', memberIds: [bob.id, carol.id] })
        .expect(201);
      expect(res.body).toMatchObject({ type: 'group', title: 'Team' });
      expect(res.body.members).toHaveLength(3);
    });

    it('pages through history from newest to oldest', async () => {
      const chat = await startDirectChat(alice, bob);
      for (const body of ['one', 'two', 'three', 'four', 'five']) {
        await send(alice, chat.id, body);
      }

      const url = `/api/conversations/${chat.id}/messages?limit=2`;
      const page1 = (await as(bob).get(url).expect(200)).body;
      expect(page1.items.map((m: MessageDto) => m.body)).toEqual(['four', 'five']);

      const page2 = (await as(bob).get(`${url}&before=${page1.nextCursor}`).expect(200)).body;
      expect(page2.items.map((m: MessageDto) => m.body)).toEqual(['two', 'three']);

      const page3 = (await as(bob).get(`${url}&before=${page2.nextCursor}`).expect(200)).body;
      expect(page3.items.map((m: MessageDto) => m.body)).toEqual(['one']);
      expect(page3.nextCursor).toBeNull();
    });

    it('counts unread messages until the conversation is marked as read', async () => {
      const chat = await startDirectChat(alice, bob);
      await send(alice, chat.id, 'hello');
      await send(alice, chat.id, 'are you there?');

      const unread = async (user: TestUser) =>
        ((await as(user).get('/api/conversations').expect(200)).body as ConversationDto[])[0]!
          .unreadCount;

      expect(await unread(bob)).toBe(2);
      expect(await unread(alice)).toBe(0); // your own messages are never unread

      await as(bob).post(`/api/conversations/${chat.id}/read`).expect(204);
      expect(await unread(bob)).toBe(0);
    });

    it('lists conversations with their last message, most recent first', async () => {
      const carol = await registerUser(app, 'Carol');
      const withBob = await startDirectChat(alice, bob);
      const withCarol = await startDirectChat(alice, carol);
      await send(alice, withCarol.id, 'to carol');
      await send(alice, withBob.id, 'to bob');

      const list = (await as(alice).get('/api/conversations').expect(200))
        .body as ConversationDto[];
      expect(list.map((c) => c.id)).toEqual([withBob.id, withCarol.id]);
      expect(list[0]!.lastMessage?.body).toBe('to bob');
    });

    it('rejects empty messages', async () => {
      const chat = await startDirectChat(alice, bob);
      await as(alice).post(`/api/conversations/${chat.id}/messages`, { body: '   ' }).expect(400);
    });
  });

  describe('Realtime', () => {
    it('refuses sockets without a valid token', async () => {
      await expect(connectSocket(app, 'bad-token')).rejects.toThrow('Unauthorized');
    });

    it('pushes new messages to the other member', async () => {
      const chat = await startDirectChat(alice, bob);
      const bobSocket = await socketFor(bob);

      const received = nextEvent<MessageDto>(bobSocket, ServerEvents.MessageNew);
      await send(alice, chat.id, 'live!');
      expect(await received).toMatchObject({ body: 'live!', senderId: alice.id });
    });

    it('adds members to a new conversation room right away', async () => {
      const bobSocket = await socketFor(bob);

      const announced = nextEvent<ConversationDto>(bobSocket, ServerEvents.ConversationUpdated);
      const chat = await startDirectChat(alice, bob);
      expect((await announced).id).toBe(chat.id);

      const received = nextEvent<MessageDto>(bobSocket, ServerEvents.MessageNew);
      await send(alice, chat.id, 'first message');
      expect((await received).body).toBe('first message');
    });

    it('relays typing and read receipts', async () => {
      const chat = await startDirectChat(alice, bob);
      const [aliceSocket, bobSocket] = [await socketFor(alice), await socketFor(bob)];

      const typing = nextEvent<TypingUpdatedPayload>(bobSocket, ServerEvents.TypingUpdated);
      aliceSocket.emit(ClientEvents.TypingStart, { conversationId: chat.id });
      expect(await typing).toEqual({ conversationId: chat.id, userId: alice.id, isTyping: true });

      const read = nextEvent<ReadUpdatedPayload>(aliceSocket, ServerEvents.ReadUpdated);
      await as(bob).post(`/api/conversations/${chat.id}/read`).expect(204);
      expect(await read).toMatchObject({ conversationId: chat.id, userId: bob.id });
    });

    it('tells contacts when someone comes online and goes offline', async () => {
      await startDirectChat(alice, bob);
      const aliceSocket = await socketFor(alice);

      const online = nextEvent(aliceSocket, ServerEvents.PresenceUpdated);
      const bobSocket = await socketFor(bob);
      expect(await online).toEqual({ userId: bob.id, online: true });

      const offline = nextEvent(aliceSocket, ServerEvents.PresenceUpdated);
      bobSocket.disconnect();
      expect(await offline).toEqual({ userId: bob.id, online: false });
    });
  });
});
