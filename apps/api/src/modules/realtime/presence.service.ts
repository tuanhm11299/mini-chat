import { Injectable } from '@nestjs/common';

/**
 * Tracks who is online by counting open sockets per user (one per tab/device).
 *
 * Kept in memory, so it only works with a single API instance. To run several instances,
 * move this to Redis and add the Socket.IO Redis adapter (see docs/architecture.md).
 */
@Injectable()
export class PresenceService {
  private readonly socketCounts = new Map<string, number>();

  /** Returns true if this is the user's first open socket (they just came online). */
  connect(userId: string): boolean {
    const count = (this.socketCounts.get(userId) ?? 0) + 1;
    this.socketCounts.set(userId, count);
    return count === 1;
  }

  /** Returns true if that was the user's last open socket (they just went offline). */
  disconnect(userId: string): boolean {
    const count = (this.socketCounts.get(userId) ?? 0) - 1;
    if (count > 0) {
      this.socketCounts.set(userId, count);
      return false;
    }
    this.socketCounts.delete(userId);
    return true;
  }

  filterOnline(userIds: string[]): string[] {
    return userIds.filter((id) => this.socketCounts.has(id));
  }
}
