import { join } from 'node:path';
import type { DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

/** Options shared by the running app (DatabaseModule) and the migration CLI (data-source.ts). */
export function baseTypeOrmOptions(databaseUrl: string): DataSourceOptions {
  return {
    type: 'postgres',
    url: databaseUrl,
    // `displayName` in code becomes `display_name` in the database.
    namingStrategy: new SnakeNamingStrategy(),
    // Use Postgres' built-in gen_random_uuid() (PG 13+) instead of installing an extension.
    uuidExtension: 'pgcrypto',
    installExtensions: false,
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    // The schema only ever changes through migrations, never automatically.
    synchronize: false,
  };
}
