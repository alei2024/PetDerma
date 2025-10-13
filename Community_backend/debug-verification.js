// 调试验证码问题
const axios = require('axios');

const BASE_URL = 'http://172.25.164.19:3000';

async function debugVerification() {
  console.log('🔍 开始调试验证码问题...\n');

  try {
    const phoneNumber = '13800138000';
    
    // 1. 发送验证码
    console.log('1. 发送验证码...');
    const sendCodeResponse = await axios.post(`${BASE_URL}/api/auth/send-verification-code`, {
      phoneNumber: phoneNumber
    });
    console.log('✅ 发送验证码响应:', sendCodeResponse.data);
    
    // 获取验证码
    const verificationCode = sendCodeResponse.data.data?.verificationCode;
    if (!verificationCode) {
      console.log('❌ 未获取到验证码');
      return;
    }
    console.log(`📱 验证码: ${verificationCode}\n`);

    // 2. 立即尝试注册
    console.log('2. 尝试注册...');
    const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
      phoneNumber: phoneNumber,
      verificationCode: verificationCode,
      password: '123456',
      confirmPassword: '123456',
      nickName: '测试用户'
    });
    console.log('✅ 注册响应:', registerResponse.data);

  } catch (error) {
    console.error('❌ 错误详情:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
  }
}

// 运行调试
debugVerification();
