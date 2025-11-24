import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';

const prisma = new PrismaClient();

async function main() {
  console.log('📦 Applying migration fix...\n');

  const sql = readFileSync('./fix-marketing-migration.sql', 'utf8');

  try {
    // Execute the SQL
    await prisma.$executeRawUnsafe(sql);
    console.log('✅ Migration fix applied successfully!\n');

    // Verify the columns were added
    console.log('🔍 Verifying table structure...\n');
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'MarketingContent'
      AND column_name IN ('slug', 'channel', 'sourceContentId')
      ORDER BY column_name;
    `;

    console.table(columns);

    if (columns.length === 3) {
      console.log('\n✅ All 3 new fields have been added successfully!');
      console.log('\nNext steps:');
      console.log('1. Run: npx prisma migrate resolve --applied "20251123211300_add_marketing_content_enhancements"');
      console.log('2. Run: npx prisma generate');
      console.log('3. Commit your changes');
    } else {
      console.log(`\n⚠️  Only ${columns.length}/3 fields were added. Check for errors above.`);
    }
  } catch (error) {
    console.error('❌ Error applying migration fix:');
    console.error(error.message);
    process.exit(1);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
