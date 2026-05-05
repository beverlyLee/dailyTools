/**
 * Example usage of the TypeScript ORM framework
 * 
 * This example demonstrates:
 * - Model definition with decorators (@Table, @Column, @PrimaryKey)
 * - CRUD operations (find, insert, update, delete)
 * - Query building with where, orderBy, limit
 * - Type-safe queries
 */

import { 
  Table, 
  Column, 
  PrimaryKey, 
  Model, 
  ColumnType,
  initializeORM,
  QueryBuilder,
  generateCreateTableSQL,
  ConnectionManager
} from '../orm-framework/src';

/**
 * Example 1: Defining a Model with Decorators
 */

@Table('users')
class User extends Model {
  @PrimaryKey()
  id!: number;

  @Column({ type: ColumnType.String, length: 100, nullable: false })
  name!: string;

  @Column({ type: ColumnType.String, length: 255, unique: true })
  email!: string;

  @Column({ type: ColumnType.Integer })
  age!: number;

  @Column({ type: ColumnType.Boolean, default: true })
  isActive!: boolean;

  @Column({ type: ColumnType.DateTime })
  createdAt!: Date;

  @Column({ type: ColumnType.Json })
  metadata!: Record<string, any>;
}

@Table('posts')
class Post extends Model {
  @PrimaryKey()
  id!: number;

  @Column({ type: ColumnType.String, length: 200, nullable: false })
  title!: string;

  @Column({ type: ColumnType.Text })
  content!: string;

  @Column({ type: ColumnType.Integer })
  userId!: number;

  @Column({ type: ColumnType.DateTime })
  publishedAt!: Date;
}

/**
 * Main example function
 */
async function main() {
  console.log('=== TypeScript ORM Framework Example ===');
  console.log('');

  // Initialize the ORM
  console.log('1. Initializing ORM...');
  initializeORM({
    filename: ':memory:', // Using in-memory SQLite for example
  });
  console.log('   ORM initialized with in-memory database');
  console.log('');

  // Get connection
  const conn = await import('../orm-framework/src/connection').then(m => m.getConnection());

  // Example 1: Generate CREATE TABLE SQL from model
  console.log('2. Generating CREATE TABLE SQL from User model...');
  const userTableSQL = generateCreateTableSQL(User);
  console.log(userTableSQL);
  console.log('');

  console.log('   Generating CREATE TABLE SQL from Post model...');
  const postTableSQL = generateCreateTableSQL(Post);
  console.log(postTableSQL);
  console.log('');

  // Create tables
  console.log('3. Creating tables in database...');
  await conn.exec(userTableSQL);
  await conn.exec(postTableSQL);
  console.log('   Tables created: users, posts');
  console.log('');

  // Example 2: Inserting data
  console.log('4. Inserting data using Model.create()...');
  
  const user1 = await User.create({
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
    isActive: true,
    createdAt: new Date(),
    metadata: { role: 'admin', department: 'engineering' }
  });
  console.log(`   Created user: ${user1.name} (ID: ${user1.id})`);

  const user2 = await User.create({
    name: 'Jane Smith',
    email: 'jane@example.com',
    age: 25,
    isActive: true,
    createdAt: new Date(),
    metadata: { role: 'user', department: 'marketing' }
  });
  console.log(`   Created user: ${user2.name} (ID: ${user2.id})`);

  const user3 = await User.create({
    name: 'Bob Wilson',
    email: 'bob@example.com',
    age: 35,
    isActive: false,
    createdAt: new Date(),
    metadata: { role: 'user', department: 'engineering' }
  });
  console.log(`   Created user: ${user3.name} (ID: ${user3.id})`);
  console.log('');

  // Example 3: Finding data
  console.log('5. Finding data...');

  // Find by primary key
  const foundUser = await User.find(1);
  if (foundUser) {
    console.log(`   Found user by ID: ${foundUser.name}`);
  }

  // Find all users
  const allUsers = await User.findAll();
  console.log(`   Total users: ${allUsers.length}`);

  // Find with conditions
  const activeUsers = await User.findAll({ isActive: true });
  console.log(`   Active users: ${activeUsers.length}`);

  // Find one with conditions
  const jane = await User.findOne({ email: 'jane@example.com' });
  if (jane) {
    console.log(`   Found Jane: ${jane.name}, age: ${jane.age}`);
  }
  console.log('');

  // Example 4: Query building with chainable methods
  console.log('6. Query building with chainable methods...');

  // Using query builder
  const qb = User.query()
    .where('age', '>', 20)
    .where('isActive', true)
    .orderBy('name', 'ASC')
    .limit(10);

  // Get the generated SQL
  console.log(`   Generated SQL: ${qb.toSQL()}`);

  // Execute the query
  const filteredUsers = await qb.get();
  console.log(`   Filtered users count: ${filteredUsers.length}`);

  // More complex query
  const complexQuery = User.query()
    .select('id', 'name', 'email')
    .whereIn('id', [1, 2, 3])
    .orWhere('isActive', false)
    .orderByDesc('createdAt');

  console.log(`   Complex SQL: ${complexQuery.toSQL()}`);
  console.log('');

  // Example 5: Updating data
  console.log('7. Updating data...');

  // Update using instance method
  if (foundUser) {
    foundUser.age = 31;
    foundUser.name = 'John Doe Updated';
    await foundUser.update();
    console.log(`   Updated user: ${foundUser.name}, age: ${foundUser.age}`);
  }

  // Update using static method
  const updatedCount = await User.update(
    { isActive: true }, // conditions
    { isActive: false }  // updates
  );
  console.log(`   Updated ${updatedCount} users from active to inactive`);
  console.log('');

  // Example 6: Deleting data
  console.log('8. Deleting data...');

  // Delete using instance method
  const deleteCount1 = await user3.delete();
  console.log(`   Deleted user ${user3.name}: ${deleteCount1 ? 'success' : 'failed'}`);

  // Delete using static method
  const deleteCount2 = await User.destroy({ email: 'nonexistent@example.com' });
  console.log(`   Deleted ${deleteCount2} users with matching email`);

  // Count remaining users
  const remainingCount = await User.count();
  console.log(`   Remaining users: ${remainingCount}`);
  console.log('');

  // Example 7: Type safety demonstration
  console.log('9. Type safety demonstration...');
  
  // TypeScript will catch type errors at compile time:
  // @ts-expect-error - 'invalidField' is not a property of User
  // await User.findAll({ invalidField: 'value' });
  
  // @ts-expect-error - 'name' should be string, not number
  // await User.findAll({ name: 123 });

  console.log('   TypeScript type checking ensures:');
  console.log('   - Only valid model properties can be used in queries');
  console.log('   - Query values must match property types');
  console.log('   - Better IDE autocomplete and refactoring support');
  console.log('');

  // Example 8: Aggregation
  console.log('10. Aggregation operations...');

  const totalUsers = await User.count();
  console.log(`   Total users: ${totalUsers}`);

  const activeCount = await User.count({ isActive: true });
  console.log(`   Active users: ${activeCount}`);

  const exists = await User.query().where('name', 'John Doe Updated').exists();
  console.log(`   Does John exist? ${exists ? 'Yes' : 'No'}`);
  console.log('');

  // Cleanup
  console.log('11. Cleaning up...');
  await User.truncate();
  const finalCount = await User.count();
  console.log(`   Users after truncate: ${finalCount}`);
  console.log('');

  // Close connection
  const manager = ConnectionManager.getInstance();
  await manager.close();

  console.log('=== Example Complete ===');
  console.log('');
  console.log('Key features demonstrated:');
  console.log('1. Decorator-based model definition (@Table, @Column, @PrimaryKey)');
  console.log('2. Type-safe CRUD operations (create, find, update, delete)');
  console.log('3. Chainable query builder (where, orderBy, limit, etc.)');
  console.log('4. TypeScript type safety for queries');
  console.log('5. Migration system support (SQL generation)');
  console.log('');
  console.log('Migration CLI commands:');
  console.log('   npm run migrate up        - Run pending migrations');
  console.log('   npm run migrate down      - Rollback last migration');
  console.log('   npm run migrate status    - Show migration status');
  console.log('   npm run migrate create    - Create new migration');
}

// Run the example
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
