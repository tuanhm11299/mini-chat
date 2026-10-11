import type { ConversationType } from '@mini-chat/shared';
import { GROUP_TITLE_MAX_LENGTH } from '@mini-chat/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ConversationMember } from './conversation-member.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 10 })
  type: ConversationType;

  /** Groups only. */
  @Column({ type: 'varchar', length: GROUP_TITLE_MAX_LENGTH, nullable: true })
  title: string | null;

  /**
   * Direct chats only: both user ids, sorted and joined with ":".
   * The unique index guarantees two people never get two separate direct chats.
   */
  @Column({ type: 'varchar', length: 80, nullable: true, unique: true })
  directKey: string | null;

  /** Updated on every new message so the conversation list can be sorted cheaply. */
  @Column({ type: 'timestamptz', default: () => 'now()' })
  lastMessageAt: Date;

  @OneToMany(() => ConversationMember, (member) => member.conversation)
  members: ConversationMember[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
