// Usage: pnpm db:migration:generate AddMessageReactions
// Compares the entities with the database and writes the SQL needed to match them.
const { execFileSync } = require('node:child_process');

const name = process.argv[2];
if (!name || !/^[A-Za-z][A-Za-z0-9]*$/.test(name)) {
  console.error('Usage: pnpm db:migration:generate <PascalCaseName>');
  process.exit(1);
}

execFileSync(
  'pnpm',
  ['typeorm', 'migration:generate', `src/database/migrations/${name}`, '--pretty'],
  {
    stdio: 'inherit',
  },
);
execFileSync('pnpm', ['exec', 'prettier', '--write', 'src/database/migrations'], {
  stdio: 'inherit',
});
