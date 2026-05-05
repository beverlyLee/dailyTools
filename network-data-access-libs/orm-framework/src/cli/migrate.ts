/**
 * CLI Migration tool
 * 
 * Provides commands:
 * - migrate up [count]
 * - migrate down [count]
 * - migrate status
 * - migrate create <name>
 */

import * as path from 'path';
import { MigrationManager } from '../migration';
import { initializeORM, ConnectionManager } from '../connection';

// Default configuration
const DEFAULT_CONFIG = {
  filename: path.join(process.cwd(), 'database.sqlite'),
  migrationsDir: path.join(process.cwd(), 'migrations'),
};

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

/**
 * Show help
 */
function showHelp(): void {
  console.log(`
Usage: migrate [command] [options]

Commands:
  up [count]        Run pending migrations (all or specified count)
  down [count]      Rollback last N migrations (default: 1)
  status            Show migration status
  create <name>     Create a new migration file
  help              Show this help message

Examples:
  migrate up
  migrate up 3
  migrate down
  migrate down 2
  migrate status
  migrate create add_users_table
`);
}

/**
 * Load configuration
 */
function loadConfig() {
  // Try to load from ormconfig.json or ormconfig.ts
  const configPath = path.join(process.cwd(), 'ormconfig.json');
  const configTsPath = path.join(process.cwd(), 'ormconfig.ts');
  
  try {
    // Try JSON config first
    if (require('fs').existsSync(configPath)) {
      const config = require(configPath);
      return {
        filename: config.database || DEFAULT_CONFIG.filename,
        migrationsDir: config.migrationsDir || DEFAULT_CONFIG.migrationsDir,
      };
    }
  } catch (e) {
    // Ignore errors
  }
  
  return DEFAULT_CONFIG;
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const config = loadConfig();
  
  // Initialize ORM
  initializeORM({ filename: config.filename });
  
  const migrationManager = new MigrationManager(config.migrationsDir);
  
  try {
    switch (command) {
      case 'up':
        await handleUp(migrationManager);
        break;
      case 'down':
        await handleDown(migrationManager);
        break;
      case 'status':
        await handleStatus(migrationManager);
        break;
      case 'create':
        await handleCreate(migrationManager);
        break;
      case 'help':
      default:
        showHelp();
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    // Close connection
    const manager = ConnectionManager.getInstance();
    if (manager.isInitialized()) {
      await manager.close();
    }
  }
}

/**
 * Handle migrate up command
 */
async function handleUp(manager: MigrationManager): Promise<void> {
  const countArg = args[1];
  const count = countArg ? parseInt(countArg, 10) : undefined;
  
  if (countArg && isNaN(count)) {
    console.error('Error: count must be a number');
    process.exit(1);
  }
  
  console.log('Running migrations up...');
  
  const applied = await manager.up(count);
  
  if (applied.length === 0) {
    console.log('No pending migrations.');
  } else {
    console.log(`Successfully applied ${applied.length} migration(s):`);
    applied.forEach((m) => console.log(`  - ${m.name}`));
  }
}

/**
 * Handle migrate down command
 */
async function handleDown(manager: MigrationManager): Promise<void> {
  const countArg = args[1];
  const count = countArg ? parseInt(countArg, 10) : 1;
  
  if (isNaN(count)) {
    console.error('Error: count must be a number');
    process.exit(1);
  }
  
  console.log(`Rolling back last ${count} migration(s)...`);
  
  const rolledBack = await manager.down(count);
  
  if (rolledBack.length === 0) {
    console.log('No migrations to rollback.');
  } else {
    console.log(`Successfully rolled back ${rolledBack.length} migration(s):`);
    rolledBack.forEach((m) => console.log(`  - ${m.name}`));
  }
}

/**
 * Handle migrate status command
 */
async function handleStatus(manager: MigrationManager): Promise<void> {
  console.log('Migration status:');
  console.log('');
  
  await manager.initialize();
  const allMigrations = await manager.loadMigrations();
  const appliedNames = await manager.getAppliedMigrations();
  
  if (allMigrations.length === 0) {
    console.log('No migrations found.');
    return;
  }
  
  console.log('Migrations:');
  console.log('');
  
  allMigrations.forEach((m) => {
    const isApplied = appliedNames.includes(m.name);
    const status = isApplied ? '[x]' : '[ ]';
    console.log(`  ${status} ${m.name} (${new Date(m.timestamp).toISOString()})`);
  });
  
  console.log('');
  console.log(`Applied: ${appliedNames.length}/${allMigrations.length}`);
}

/**
 * Handle migrate create command
 */
async function handleCreate(manager: MigrationManager): Promise<void> {
  const name = args[1];
  
  if (!name) {
    console.error('Error: migration name is required');
    console.log('Usage: migrate create <name>');
    process.exit(1);
  }
  
  // Validate name
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    console.error('Error: migration name can only contain letters, numbers, and underscores');
    process.exit(1);
  }
  
  // Create a basic migration template
  const timestamp = Date.now();
  const content = `/**
 * Migration: ${name}
 * Generated at: ${new Date().toISOString()}
 */

import { MigrationFile } from 'lightweight-orm';

const migration: MigrationFile = {
  timestamp: ${timestamp},
  name: '${name}',
  up: \`
    -- Write your UP migration SQL here
    -- Example: CREATE TABLE table_name (...);
  \`,
  down: \`
    -- Write your DOWN migration SQL here
    -- Example: DROP TABLE IF EXISTS table_name;
  \`
};

export default migration;
`;
  
  const filePath = manager.createMigration(name, content);
  console.log(`Created migration: ${filePath}`);
}

// Run the CLI
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
