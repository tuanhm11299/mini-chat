import {
  ClientEvents,
  type ClientToServerEvents,
  ServerEvents,
  type ServerToClientEvents,
} from '@mini-chat/shared';
import { io, type Socket } from 'socket.io-client';

/**
 * Owns the Socket.IO connection and feeds server events into the stores.
 * Components never touch the socket directly; they use `useNuxtApp().$realtime`.
 */
export default defineNuxtPlugin(() => {
  const auth = useAuthStore();
  const conversations = useConversationsStore();
  const messages = useMessagesStore();
  const presence = usePresenceStore();
  const { apiUrl } = useRuntimeConfig().public;

  const connected = ref(false);
  let hasConnectedBefore = false;

  const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(apiUrl, {
    autoConnect: false,
    transports: ['websocket'],
    // Called on every (re)connect, so it always sends the latest access token.
    auth: (send) => send({ token: auth.accessToken }),
  });

  socket.on('connect', () => {
    connected.value = true;
    // After a reconnect, catch up on anything that happened while we were offline.
    if (hasConnectedBefore) void resync();
    hasConnectedBefore = true;
  });

  socket.on('disconnect', (reason) => {
    connected.value = false;
    presence.reset();
    // The server closed the connection on purpose; socket.io won't retry by itself.
    if (reason === 'io server disconnect' && auth.isLoggedIn) {
      setTimeout(() => socket.connect(), 2000);
    }
  });

  socket.on('connect_error', async (error) => {
    // The access token expired: get a new one and try again.
    if (error.message === 'Unauthorized' && (await auth.refresh())) socket.connect();
  });

  socket.on(ServerEvents.MessageNew, (message) => {
    messages.receive(message);
    presence.setTyping({
      conversationId: message.conversationId,
      userId: message.senderId,
      isTyping: false,
    });
  });
  socket.on(ServerEvents.ConversationUpdated, (conversation) => conversations.upsert(conversation));
  socket.on(ServerEvents.ReadUpdated, (payload) => conversations.onReadUpdated(payload));
  socket.on(ServerEvents.PresenceSnapshot, ({ onlineUserIds }) =>
    presence.markOnline(onlineUserIds),
  );
  socket.on(ServerEvents.PresenceUpdated, ({ userId, online }) =>
    presence.setOnline(userId, online),
  );
  socket.on(ServerEvents.TypingUpdated, (payload) => presence.setTyping(payload));

  async function resync() {
    await conversations.fetchAll();
    if (conversations.activeId) await messages.loadLatest(conversations.activeId);
  }

  watch(
    () => auth.isLoggedIn,
    (loggedIn) => (loggedIn ? socket.connect() : socket.disconnect()),
    { immediate: true },
  );

  // Phones pause background apps; reconnect as soon as the app is visible again.
  useEventListener(document, 'visibilitychange', () => {
    if (document.visibilityState === 'visible' && auth.isLoggedIn && !socket.connected) {
      socket.connect();
    }
  });

  return {
    provide: {
      realtime: {
        connected: readonly(connected),
        sendTyping(conversationId: string, isTyping: boolean) {
          if (!socket.connected) return;
          socket.emit(isTyping ? ClientEvents.TypingStart : ClientEvents.TypingStop, {
            conversationId,
          });
        },
      },
    },
  };
});
