#!/usr/bin/env ts-node

/**
 * CLI script for creating users via Prisma
 *
 * Usage:
 *   npm run create-user -- <name> <email> <password> <timezone>
 *
 * Example:
 *   npm run create-user -- "Admin User" "admin@example.com" "SecurePass123!" "America/Chicago"
 *
 * Or with environment variables:
 *   DATABASE_URL=postgres://... npm run create-user -- "Admin User" "admin@example.com" "SecurePass123!" "America/Chicago"
 */

import 'dotenv/config';
import { createUser } from '../src/services/user.service';

async function main() {
  const [name, email, password, timezone] = process.argv.slice(2);

  if (!name || !email || !password || !timezone) {
    console.error('Error: Missing required arguments\n');
    console.error(
      'Usage: npm run create-user -- <name> <email> <password> <timezone>',
    );
    console.error('\nExample:');
    console.error(
      '  npm run create-user -- "Admin User" "admin@example.com" "SecurePass123!" "America/Chicago"',
    );
    console.error('\nAvailable timezones:');
    console.error(
      '  America/New_York, America/Chicago, America/Denver, America/Los_Angeles',
    );
    console.error(
      '  UTC, Europe/London, Europe/Paris, Asia/Tokyo, Asia/Shanghai, Australia/Sydney',
    );
    process.exit(1);
  }

  try {
    console.log('Creating user...');
    const user = await createUser({ name, email, password, timezone });
    console.log('\nUser created successfully:');
    console.log(JSON.stringify(user, null, 2));
    process.exit(0);
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('\nError creating user:', err.message);
    } else {
      console.error('\nUnknown error creating user:', err);
    }
    process.exit(1);
  }
}

main();
