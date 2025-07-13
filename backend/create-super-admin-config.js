const fs = require('fs');
const path = require('path');

/**
 * @description 创建超级管理员配置文件
 */
function createSuperAdminConfig() {
  const envPath = path.join(__dirname, '.env');
  const envExamplePath = path.join(__dirname, 'env.example');

  console.log('=== 超级管理员配置向导 ===\n');

  // 读取现有的 .env 文件
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // 检查是否已有超级管理员配置
  if (envContent.includes('SUPER_ADMIN_EMAIL')) {
    console.log('检测到已存在超级管理员配置：');
    const emailMatch = envContent.match(/SUPER_ADMIN_EMAIL=(.+)/);
    const nameMatch = envContent.match(/SUPER_ADMIN_NAME=(.+)/);

    if (emailMatch) console.log(`邮箱: ${emailMatch[1]}`);
    if (nameMatch) console.log(`姓名: ${nameMatch[1]}`);
    console.log('\n如需修改配置，请手动编辑 .env 文件中的以下字段：');
    console.log('- SUPER_ADMIN_EMAIL');
    console.log('- SUPER_ADMIN_PASSWORD');
    console.log('- SUPER_ADMIN_NAME');
    return;
  }

  // 生成默认配置
  const defaultConfig = `
# Super Admin Configuration
SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_PASSWORD=superadmin123
SUPER_ADMIN_NAME=Super Administrator
`;

  // 添加到 .env 文件
  const newEnvContent = envContent + defaultConfig;
  fs.writeFileSync(envPath, newEnvContent);

  console.log('✅ 超级管理员配置已添加到 .env 文件');
  console.log('\n默认配置：');
  console.log('邮箱: admin@example.com');
  console.log('密码: superadmin123');
  console.log('姓名: Super Administrator');
  console.log('\n⚠️  请修改 .env 文件中的配置，使用安全的邮箱和密码！');
  console.log('\n配置完成后，重启后端服务即可自动创建超级管理员账号。');
}

// 运行配置向导
createSuperAdminConfig();
