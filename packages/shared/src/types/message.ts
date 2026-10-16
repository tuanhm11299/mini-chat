export interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  /** ISO date string. */
  createdAt: string;
  /**
   * Temporary id the sender's client generated for its optimistic message.
   * Echoed back so the client can replace the placeholder with the saved message.
   */
  clientId?: string;
}
