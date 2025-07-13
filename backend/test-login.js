const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testLogin() {
  try {
    console.log('=== 测试登录功能 ===');

    // 测试用户1: default@example.com
    console.log('\n1. 测试 default@example.com 登录:');
    try {
      const response1 = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'default@example.com',
        password: 'default123',
      });
      console.log('✅ 登录成功:', response1.data);
    } catch (error) {
      console.log('❌ 登录失败:', error.response?.data || error.message);
    }

    // 测试用户2: admin@liayal.com
    console.log('\n2. 测试 admin@liayal.com 登录:');
    try {
      const response2 = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'admin@liayal.com',
        password: 'your-password-here', // 请替换为实际密码
      });
      console.log('✅ 登录成功:', response2.data);
    } catch (error) {
      console.log('❌ 登录失败:', error.response?.data || error.message);
    }

    // 测试错误的密码
    console.log('\n3. 测试错误密码:');
    try {
      const response3 = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'admin@liayal.com',
        password: 'wrong-password',
      });
      console.log('✅ 登录成功:', response3.data);
    } catch (error) {
      console.log('❌ 登录失败 (预期):', error.response?.data || error.message);
    }
  } catch (error) {
    console.error('测试过程中出错:', error.message);
  }
}

testLogin();
