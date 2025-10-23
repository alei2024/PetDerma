/**
 * 获取智能体最终回复
 * 用于测试智能体处理完成后的结果
 */

// 获取智能体最终回复
const getCozeFinalResponse = () => {
  console.log('🔍 获取智能体最终回复...');
  
  const petList = wx.getStorageSync('petList') || [];
  if (petList.length === 0) {
    console.error('❌ 没有宠物数据');
    return;
  }
  
  const petId = petList[0].id || petList[0]._id;
  console.log('使用宠物ID:', petId);
  
  wx.request({
    url: 'http://172.25.164.19:3000/api/consultation/pet-consultation',
    method: 'POST',
    header: {
      'Authorization': `Bearer ${wx.getStorageSync('token')}`,
      'Content-Type': 'application/json'
    },
    data: {
      petId: petId,
      question: '你好，请介绍一下自己'
    },
    success: (res) => {
      console.log('✅ 智能体问诊结果:', res.data);
      
      if (res.data.success && res.data.data?.response) {
        const response = res.data.data.response;
        console.log('回复状态:', response.data?.status);
        console.log('消息ID:', response.data?.id);
        
        if (response.data?.status === 'in_progress') {
          console.log('⏳ 智能体仍在处理中，请再等待30秒');
          console.log('💡 建议：30秒后再次运行此测试');
        } else if (response.data?.status === 'completed') {
          console.log('✅ 智能体处理完成！');
          console.log('🎉 获取到最终回复:');
          
          if (response.data?.messages) {
            const assistantMessage = response.data.messages.find(msg => msg.role === 'assistant');
            if (assistantMessage) {
              console.log('智能体回复内容:', assistantMessage.content);
              console.log('回复长度:', assistantMessage.content.length);
            } else {
              console.log('未找到assistant消息');
            }
          } else {
            console.log('未找到messages字段');
          }
        } else if (response.data?.status === 'failed') {
          console.log('❌ 智能体处理失败');
          console.log('错误信息:', response.data?.last_error);
        } else {
          console.log('❓ 未知状态:', response.data?.status);
        }
      }
    },
    fail: (error) => {
      console.error('❌ 智能体问诊失败:', error);
    }
  });
};

// 运行测试
getCozeFinalResponse();
