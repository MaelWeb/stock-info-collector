const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

/**
 * @description 数据库修复脚本
 */
async function fixDatabase() {
  console.log('🔧 Starting database fix...');

  try {
    // 检查数据库文件是否存在
    const dbPath = path.join(__dirname, 'prisma', 'dev.db');
    if (fs.existsSync(dbPath)) {
      console.log('📁 Database file exists, backing up...');
      const backupPath = path.join(__dirname, 'prisma', 'dev.db.backup');
      fs.copyFileSync(dbPath, backupPath);
      console.log('✅ Database backed up to dev.db.backup');
    }

    // 删除现有数据库文件
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log('🗑️  Deleted existing database file');
    }

    // 重新生成Prisma客户端
    console.log('🔨 Regenerating Prisma client...');
    const { execSync } = require('child_process');
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Prisma client regenerated');

    // 推送schema到数据库
    console.log('📤 Pushing schema to database...');
    execSync('npx prisma db push', { stdio: 'inherit' });
    console.log('✅ Schema pushed to database');

    // 运行种子脚本
    console.log('🌱 Running seed script...');
    execSync('node seed.js', { stdio: 'inherit' });
    console.log('✅ Seed script completed');

    console.log('🎉 Database fix completed successfully!');
    console.log('🚀 You can now start the backend server with: npm run dev');
  } catch (error) {
    console.error('❌ Database fix failed:', error);

    // 尝试恢复备份
    const backupPath = path.join(__dirname, 'prisma', 'dev.db.backup');
    const dbPath = path.join(__dirname, 'prisma', 'dev.db');

    if (fs.existsSync(backupPath)) {
      console.log('🔄 Attempting to restore backup...');
      try {
        fs.copyFileSync(backupPath, dbPath);
        console.log('✅ Backup restored');
      } catch (restoreError) {
        console.error('❌ Failed to restore backup:', restoreError);
      }
    }

    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 运行修复脚本
fixDatabase()
  .then(() => {
    console.log('✅ Database fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Database fix failed:', error);
    process.exit(1);
  });
