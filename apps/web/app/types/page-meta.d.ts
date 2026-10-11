declare module '#app' {
  interface PageMeta {
    /** Pages anyone can open without signing in (login, register). */
    public?: boolean;
  }
}

export {};
