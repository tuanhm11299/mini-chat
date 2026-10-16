import {
  CreateDateColumn,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Conversation } from './conversation.entity';

@Entity('conversation_members')
export class ConversationMember {
  @PrimaryColumn({ type: 'uuid' })
  conversationId: string;

  @Index()
  @PrimaryColumn({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => Conversation, (conversation) => conversation.members, { onDelete: 'CASCADE' })
  @JoinColumn()
  conversation: Conversation;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  /** Messages created after this moment count as unread for this member. */
  @Column({ type: 'timestamptz', default: () => 'now()' })
  lastReadAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  joinedAt: Date;
}
