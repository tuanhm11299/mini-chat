/**
 * Used by the TypeORM CLI only (see the `db:*` scripts in package.json).
 * The running app connects through DatabaseModule instead.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { baseTypeOrmOptions } from './typeorm-options';

const envFile = join(__dirname, '..', '..', '.env');
if (!process.env.DATABASE_URL && existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Copy apps/api/.env.example to apps/api/.env.');
}

export default new DataSource({
  ...baseTypeOrmOptions(process.env.DATABASE_URL),
  entities: [join(__dirname, '..', 'modules', '**', '*.entity.{ts,js}')],
});
