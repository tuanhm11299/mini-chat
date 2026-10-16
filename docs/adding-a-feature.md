# Adding a feature

This guide walks through a realistic example, **emoji reactions on messages**. The same steps work for most features. Each step names the files to touch and the existing code to copy.

> Checklist: shared contract → entity + migration → service + controller → domain event → gateway → store → component → tests.

## 1. Describe the contract (`packages/shared`)

Start with the shape of the data both sides will exchange.

```ts
// packages/shared/src/types/reaction.ts
export interface ReactionDto {
  messageId: string;
  userId: string;
  emoji: string;
}
// export it from packages/shared/src/types/index.ts
```

```ts
// packages/shared/src/events.ts
export const ServerEvents = {
  // ...
  ReactionsUpdated: 'reactions:updated',
} as const;

export interface ServerToClientEvents {
  // ...
  [ServerEvents.ReactionsUpdated]: (payload: {
    messageId: string;
    reactions: ReactionDto[];
  }) => void;
}
```

`pnpm dev` rebuilds the package automatically. TypeScript now tells you everywhere the new types are needed.

## 2. Entity and migration (`apps/api/src/modules/reactions`)

Copy the layout of `modules/messages`:

```
modules/reactions/
  entities/reaction.entity.ts
  dto/toggle-reaction.dto.ts
  reactions.controller.ts
  reactions.service.ts
  reactions.events.ts
  reactions.mapper.ts
  reactions.module.ts
```

```ts
// entities/reaction.entity.ts
@Entity('message_reactions')
export class Reaction {
  @PrimaryColumn({ type: 'uuid' }) messageId: string;
  @PrimaryColumn({ type: 'uuid' }) userId: string;
  @PrimaryColumn({ type: 'varchar', length: 16 }) emoji: string;

  @ManyToOne(() => Message, { onDelete: 'CASCADE' }) @JoinColumn() message: Message;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn() user: User;

  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
```

Then let TypeORM write the SQL for you, read it, and apply it:

```bash
pnpm db:migration:generate AddMessageReactions
pnpm db:migrate
```

Commit the generated file in `src/database/migrations/`. CI checks that entities and migrations match.

## 3. Service and controller

- **DTO**: validate input with `class-validator`, like `SendMessageDto`. Unknown fields are rejected automatically.
- **Service**: do the work and check permissions. Reuse `ConversationsService.assertMember()` so non-members get a 404. Map entities to DTOs before returning, as in `toMessageDto`.
- **Controller**: stay thin. Use `@CurrentUser()` to get the caller and `ParseUUIDPipe` for ids.

```ts
@Controller('messages/:messageId/reactions')
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @Post()
  toggle(
    @CurrentUser() me: AuthUser,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() dto: ToggleReactionDto,
  ) {
    return this.reactionsService.toggle(messageId, me.id, dto.emoji);
  }
}
```

Register the module in `app.module.ts` and add the entity to `TypeOrmModule.forFeature([...])`.

## 4. Push it live with a domain event

Services never talk to sockets directly. Emit an event:

```ts
// reactions.events.ts
export class ReactionsUpdatedEvent {
  static readonly event = 'reactions.updated';
  constructor(
    public readonly conversationId: string,
    public readonly messageId: string,
    public readonly reactions: ReactionDto[],
  ) {}
}

// in ReactionsService.toggle()
this.events.emit(
  ReactionsUpdatedEvent.event,
  new ReactionsUpdatedEvent(conversationId, messageId, reactions),
);
```

…and forward it in `modules/realtime/chat.gateway.ts`:

```ts
@OnEvent(ReactionsUpdatedEvent.event)
onReactionsUpdated({ conversationId, messageId, reactions }: ReactionsUpdatedEvent): void {
  this.server
    .to(conversationRoom(conversationId))
    .emit(ServerEvents.ReactionsUpdated, { messageId, reactions });
}
```

## 5. Web app

1. **Store**: add a `reactions` field to `ChatMessage` (or a `reactionsByMessage` map in the messages store) and an action that calls `useApi()`.
2. **Socket**: in `plugins/realtime.client.ts`, add `socket.on(ServerEvents.ReactionsUpdated, …)` and pass the payload to the store.
3. **UI**: render reactions under the bubble in `MessageBubble.vue`, and add a picker (for example a `UPopover` with a few emoji buttons).

Components are auto-imported by file name, and stores and composables by their exported names. You don't need to register anything.

## 6. Tests

- **API e2e** (`apps/api/test/*.e2e-spec.ts`): copy a test from `chat.e2e-spec.ts`. Use `registerUser`, `connectSocket` and `nextEvent` from `test-app.ts` to test both the REST call and the live event.
- **Unit tests** for pure logic: next to the file (`*.spec.ts` in the API, `*.test.ts` in `apps/web/app/utils`).
- **Browser e2e** (`e2e/`): only for the main user journey.

Run `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e:api` before opening a PR.

---

## Feature ideas that fit this structure

| Feature                  | Where it plugs in                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| Web push notifications   | New `notifications` module listening to `message.created`; service worker `push` handler |
| Image / file attachments | `attachments` module + object storage (S3/R2) with pre-signed upload URLs                |
| Edit / delete messages   | `PATCH`/`DELETE` in `messages`, new `message:updated` event                              |
| Group management         | Add/remove members and rename in `conversations`, plus `conversation:updated` events     |
| Message search           | PostgreSQL full-text index on `messages.body`                                            |
| Multiple API instances   | See [architecture.md → Scaling out](architecture.md#scaling-out)                         |
