/**
 * 查看实际传入的petname和PetData
 * 用于调试智能体接收到的数据
 */

// 查看实际传入的petname和PetData
const checkPetDataAndPetname = () => {
  console.log('🔍 查看实际传入的petname和PetData...');
  
  const petList = wx.getStorageSync('petList') || [];
  if (petList.length === 0) {
    console.error('❌ 没有宠物数据');
    return;
  }
  
  const petId = petList[0].id || petList[0]._id;
  console.log('使用宠物ID:', petId);
  
  // 先获取PetData
  wx.request({
    url: `http://172.25.164.19:3000/api/diagnosis/petdata/${petId}`,
    method: 'GET',
    header: {
      'Authorization': `Bearer ${wx.getStorageSync('token')}`,
      'Content-Type': 'application/json'
    },
    success: (res) => {
      console.log('✅ PetData获取结果:', res.data);
      
      if (res.data.success && res.data.data) {
        const petData = res.data.data;
        console.log('\n=== PetData详细内容 ===');
        console.log('petInfo:', petData.petInfo);
        console.log('currentDiagnosis:', petData.currentDiagnosis);
        console.log('healthProfile:', petData.healthProfile);
        
        console.log('\n=== 传入智能体的变量 ===');
        console.log('petname:', petData.petInfo?.name || '');
        console.log('PetData (JSON字符串):', JSON.stringify(petData));
        
        // 现在测试智能体调用
        console.log('\n=== 测试智能体调用 ===');
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
                console.log('⏳ 智能体正在处理中');
                console.log('✅ 数据已成功传入智能体');
              } else if (response.data?.status === 'completed') {
                console.log('✅ 智能体处理完成！');
                if (response.data?.messages) {
                  const assistantMessage = response.data.messages.find(msg => msg.role === 'assistant');
                  if (assistantMessage) {
                    console.log('🎉 智能体回复:', assistantMessage.content);
                  }
                }
              }
            }
          },
          fail: (error) => {
            console.error('❌ 智能体问诊失败:', error);
          }
        });
      }
    },
    fail: (error) => {
      console.error('❌ PetData获取失败:', error);
    }
  });
};

// 运行测试
checkPetDataAndPetname();




