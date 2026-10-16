/** A page of results for "load more" style lists. */
export interface CursorPage<T> {
  items: T[];
  /** Pass this back as `before` to get the next (older) page. `null` when there is nothing left. */
  nextCursor: string | null;
}
