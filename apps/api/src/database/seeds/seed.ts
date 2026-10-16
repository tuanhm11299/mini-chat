/**
 * Demo data for local development: `pnpm db:seed`.
 * Everyone's password is "password123". Safe to run twice (it skips if the users exist).
 */
import * as argon2 from 'argon2';
import { ConversationMember } from '../../modules/conversations/entities/conversation-member.entity';
import { Conversation } from '../../modules/conversations/entities/conversation.entity';
import { Message } from '../../modules/messages/entities/message.entity';
import { User } from '../../modules/users/entities/user.entity';
import dataSource from '../data-source';

const PASSWORD = 'password123';

async function seed() {
  await dataSource.initialize();
  const users = dataSource.getRepository(User);

  if (await users.existsBy({ email: 'alice@example.com' })) {
    console.log('Seed data already present, nothing to do.');
    return;
  }

  const passwordHash = await argon2.hash(PASSWORD);
  const [alice, bob, carol] = await users.save(
    ['Alice', 'Bob', 'Carol'].map((name) =>
      users.create({ email: `${name.toLowerCase()}@example.com`, displayName: name, passwordHash }),
    ),
  );

  await dataSource.transaction(async (manager) => {
    const direct = await manager.save(
      manager.create(Conversation, {
        type: 'direct',
        title: null,
        directKey: [alice!.id, bob!.id].sort().join(':'),
      }),
    );
    const group = await manager.save(
      manager.create(Conversation, { type: 'group', title: 'Weekend plans', directKey: null }),
    );

    // Spread the messages a minute apart so they appear in order.
    const lines: Array<[Conversation, User, string]> = [
      [direct, alice!, 'Hey Bob! 👋'],
      [direct, bob!, 'Hi Alice, how is it going?'],
      [group, carol!, 'Anyone up for a hike on Saturday?'],
      [group, alice!, 'Count me in!'],
    ];
    const start = Date.now() - lines.length * 60_000;

    // Nobody has read anything yet, so the demo shows unread badges.
    const lastReadAt = new Date(start - 60_000);
    await manager.insert(ConversationMember, [
      { conversationId: direct.id, userId: alice!.id, lastReadAt },
      { conversationId: direct.id, userId: bob!.id, lastReadAt },
      { conversationId: group.id, userId: alice!.id, lastReadAt },
      { conversationId: group.id, userId: bob!.id, lastReadAt },
      { conversationId: group.id, userId: carol!.id, lastReadAt },
    ]);
    const messages = lines.map(([conversation, sender, body], index) => ({
      conversationId: conversation.id,
      senderId: sender.id,
      body,
      createdAt: new Date(start + index * 60_000),
    }));
    await manager.insert(Message, messages);
    for (const message of messages) {
      await manager.update(Conversation, message.conversationId, {
        lastMessageAt: message.createdAt,
      });
    }
  });

  console.log(`Seeded users alice, bob and carol @example.com (password: ${PASSWORD}).`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => dataSource.destroy());
