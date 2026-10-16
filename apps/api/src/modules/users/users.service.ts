import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import { User } from './entities/user.entity';

const SEARCH_LIMIT = 20;

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  async findById(id: string): Promise<User> {
    const user = await this.users.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /** Includes `passwordHash`, which is hidden by default. Only for checking credentials. */
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: email.toLowerCase() })
      .getOne();
  }

  async emailExists(email: string): Promise<boolean> {
    return this.users.existsBy({ email: email.toLowerCase() });
  }

  create(data: { email: string; displayName: string; passwordHash: string }): Promise<User> {
    return this.users.save(this.users.create({ ...data, email: data.email.toLowerCase() }));
  }

  /** Finds people to chat with by the start of their name or email, excluding yourself. */
  search(term: string, excludeUserId: string): Promise<User[]> {
    // Escape LIKE wildcards so a search for "50%" matches literally.
    const prefix = `${term.trim().replace(/[\\%_]/g, '\\$&')}%`;
    return this.users
      .createQueryBuilder('user')
      .where('user.id != :excludeUserId', { excludeUserId })
      .andWhere('(user.displayName ILIKE :prefix OR user.email ILIKE :prefix)', { prefix })
      .orderBy('user.displayName', 'ASC')
      .limit(SEARCH_LIMIT)
      .getMany();
  }

  async updateProfile(userId: string, changes: UpdateProfileDto): Promise<User> {
    const user = await this.findById(userId);
    if (changes.displayName !== undefined) user.displayName = changes.displayName.trim();
    if (changes.avatarUrl !== undefined) user.avatarUrl = changes.avatarUrl;
    return this.users.save(user);
  }
}
