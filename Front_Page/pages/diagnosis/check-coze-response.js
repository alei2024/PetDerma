/**
 * 定期检查智能体回复状态
 * 用于获取智能体的最终回复
 */

// 定期检查智能体回复状态
const checkCozeResponse = () => {
  console.log('🔍 开始定期检查智能体回复状态...');
  
  const petList = wx.getStorageSync('petList') || [];
  if (petList.length === 0) {
    console.error('❌ 没有宠物数据');
    return;
  }
  
  const petId = petList[0].id || petList[0]._id;
  console.log('使用宠物ID:', petId);
  
  // 设置检查间隔（每10秒检查一次）
  const checkInterval = setInterval(() => {
    console.log('⏰ 检查智能体回复状态...');
    
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
          
          if (response.data?.status === 'completed') {
            console.log('🎉 智能体处理完成！');
            console.log('=== 智能体最终回复 ===');
            
            if (response.data?.messages) {
              const assistantMessage = response.data.messages.find(msg => msg.role === 'assistant');
              if (assistantMessage) {
                console.log('智能体回复内容:', assistantMessage.content);
                console.log('回复长度:', assistantMessage.content.length);
                console.log('回复时间:', new Date().toLocaleString());
              } else {
                console.log('未找到assistant消息');
              }
            } else {
              console.log('未找到messages字段');
            }
            
            // 停止检查
            clearInterval(checkInterval);
            console.log('✅ 检查完成，已停止轮询');
            
          } else if (response.data?.status === 'failed') {
            console.log('❌ 智能体处理失败');
            console.log('错误信息:', response.data?.last_error);
            clearInterval(checkInterval);
            
          } else if (response.data?.status === 'in_progress') {
            console.log('⏳ 智能体仍在处理中，继续等待...');
          } else {
            console.log('❓ 未知状态:', response.data?.status);
          }
        }
      },
      fail: (error) => {
        console.error('❌ 智能体问诊失败:', error);
        clearInterval(checkInterval);
      }
    });
  }, 10000); // 每10秒检查一次
  
  // 设置超时（5分钟后停止检查）
  setTimeout(() => {
    clearInterval(checkInterval);
    console.log('⏰ 检查超时，已停止轮询');
  }, 300000); // 5分钟超时
  
  console.log('✅ 已开始定期检查，每10秒检查一次，最多检查5分钟');
};

// 运行检查
checkCozeResponse();




