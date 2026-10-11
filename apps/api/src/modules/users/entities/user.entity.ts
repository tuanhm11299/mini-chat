import { DISPLAY_NAME_MAX_LENGTH } from '@mini-chat/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Always stored lower-case so lookups are case-insensitive. */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email: string;

  /** Not loaded by default; ask for it explicitly with `addSelect` when checking a password. */
  @Column({ type: 'varchar', select: false })
  passwordHash: string;

  @Column({ type: 'varchar', length: DISPLAY_NAME_MAX_LENGTH })
  displayName: string;

  @Column({ type: 'text', nullable: true })
  avatarUrl: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
