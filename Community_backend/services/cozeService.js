const axios = require('axios');

class CozeService {
  constructor() {
    this.baseURL = 'https://api.coze.cn';
    this.botId = '7533228527584739364';
    this.token = 'pat_7uBvwhAdTidpBYB9xCJJEjz7KZGO3GzWUbiMQH3egyW3GXf1DizZCjAqri24k8jd';
    
    // 创建axios实例
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000 // 30秒超时
    });
  }

  /**
   * 设置用户变量（严格按照测试代码的格式）
   * @param {string} userId - 用户ID
   * @param {Object} petData - PetData对象
   * @returns {Promise<Object>} 设置结果
   */
  async setUserVariables(userId, petData) {
    try {
      console.log('设置用户变量:', { userId, petDataKeys: Object.keys(petData) });

      const requestData = {
        bot_id: this.botId,
        connector_uid: userId,
        data: [
          {
            keyword: "petname",
            value: petData.petInfo?.name || ""
          },
          {
            keyword: "PetData",
            value: JSON.stringify(petData)
          }
        ]
      };

      console.log('设置变量请求数据:', JSON.stringify(requestData, null, 2));

      const response = await this.client.put('/v1/variables', requestData);
      
      console.log('设置变量响应:', response.data);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('设置用户变量失败:', error);
      
      if (error.response) {
        console.error('响应错误:', error.response.data);
        return {
          success: false,
          error: error.response.data?.message || error.response.statusText || '设置用户变量失败',
          status: error.response.status
        };
      } else {
        return {
          success: false,
          error: error.message
        };
      }
    }
  }

  /**
   * 发送消息到Coze智能体（修复流式响应解析逻辑）
   * @param {string} chatId - 会话ID（可选，首次对话不传）
   * @param {string} query - 用户查询
   * @param {Object} petData - PetData对象
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} Coze智能体响应
   */
  async sendMessage(chatId, query, petData, userId = 'pet-owner') {
    try {
      console.log('发送消息到Coze智能体:', {
        chatId,
        query,
        petDataKeys: Object.keys(petData),
        userId
      });

      const requestData = {
        bot_id: this.botId,
        user_id: userId,
        stream: true,
        additional_messages: [
          {
            role: "user",
            type: "question",
            content_type: "text",
            content: query
          }
        ]
      };

      if (chatId) {
        requestData.chat_id = chatId;
      }

      console.log('请求数据:', JSON.stringify(requestData, null, 2));

      // 发送流式请求
      const response = await this.client.post('/v3/chat', requestData, {
        responseType: 'stream'
      });
      
      let agentReply = '';
      let newChatId = chatId;
      
      return new Promise((resolve, reject) => {
        response.data.on('data', (chunk) => {
          const lines = chunk.toString().split('\n');
          console.log('收到流式数据块:', chunk.toString());
          
          for (const line of lines) {
            if (!line) continue; // 跳过空行
            const lineStr = line.trim();
            console.log('处理行:', lineStr);
            
            // 修复1：正确分割data:前缀（分割成2段，取第2段）
            if (lineStr.startsWith('data:')) {
              const splitResult = lineStr.split('data:', 2); // 关键修复：分割为2段
              if (splitResult.length < 2) continue; // 无数据内容则跳过
              
              const dataStr = splitResult[1].trim();
              if (!dataStr) continue;
              
              try {
                const data = JSON.parse(dataStr);
                
                // 提取首次对话的chat_id
                if (!chatId && data?.chat?.id) {
                  newChatId = data.chat.id;
                  console.log('获取到新的chat_id:', newChatId);
                }
                
                // 修复2：正确拼接智能体回复（只要是assistant的answer就覆盖/拼接）
                if (data?.role === 'assistant' && data?.type === 'answer') {
                  const newContent = (data.content || '').trim();
                  console.log('🔍 检测到智能体回复事件:');
                  console.log('  - 新增内容:', newContent);
                  
                  // 关键修复：直接覆盖或拼接（根据API返回格式选择，此处优先覆盖确保完整性）
                  if (newContent) {
                    agentReply = newContent; 
                    console.log('✅ 更新智能体回复:', agentReply);
                  }
                }
              } catch (error) {
                console.log('解析流式数据失败:', error.message, '数据:', lineStr);
              }
            }
          }
        });
        
        response.data.on('end', () => {
          console.log('流式响应结束，最终回复:', agentReply);
          resolve({
            success: true,
            data: {
              chatId: newChatId,
              reply: agentReply
            }
          });
        });
        
        response.data.on('error', (error) => {
          console.error('流式响应错误:', error);
          reject({
            success: false,
            error: error.message
          });
        });
      });
      
    } catch (error) {
      console.error('Coze智能体调用失败:', error);
      
      if (error.response) {
        console.error('响应错误:', error.response.data);
        return {
          success: false,
          error: error.response.data?.message || error.response.statusText || '请求失败',
          status: error.response.status
        };
      } else if (error.request) {
        console.error('请求错误:', error.request);
        return {
          success: false,
          error: '网络请求失败',
          details: error.message
        };
      } else {
        console.error('其他错误:', error.message);
        return {
          success: false,
          error: error.message
        };
      }
    }
  }

  /**
   * 创建新的会话
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 会话信息
   */
  async createConversation(userId = 'pet-owner') {
    try {
      const conversationId = `conversation-${userId}-${Date.now()}`;
      
      return {
        success: true,
        data: {
          conversation_id: conversationId,
          user: userId
        }
      };
    } catch (error) {
      console.error('创建会话失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取会话历史
   * @param {string} conversationId - 会话ID
   * @returns {Promise<Object>} 会话历史
   */
  async getConversationHistory(conversationId) {
    try {
      const response = await this.client.get(`/bots/${this.botId}/conversations/${conversationId}/messages`);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('获取会话历史失败:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * 发送宠物问诊消息（严格按照测试代码的流程）
   * @param {string} petId - 宠物ID
   * @param {Object} petData - PetData对象
   * @param {string} question - 用户问题
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 问诊结果
   */
  async sendPetConsultation(petId, petData, question, userId) {
    try {
      console.log('开始宠物问诊:', {
        petId,
        question,
        petDataSummary: {
          petName: petData.petInfo?.name,
          petType: petData.petInfo?.type,
          currentDisease: petData.currentDiagnosis?.diseaseName,
          symptoms: petData.currentDiagnosis?.symptomDescription
        }
      });

      // 第一步：设置用户变量
      console.log('第一步：设置用户变量...');
      const variableResult = await this.setUserVariables(userId, petData);
      
      if (!variableResult.success) {
        console.warn('设置用户变量失败，但继续发送消息:', variableResult.error);
      } else {
        console.log('✅ 用户变量设置成功');
      }

      // 第二步：发送消息到智能体
      console.log('第二步：发送消息到智能体...');
      const messageResult = await this.sendMessage(null, question, petData, userId);
      
      if (messageResult.success) {
        return {
          success: true,
          data: {
            chatId: messageResult.data.chatId,
            petId,
            question,
            response: messageResult.data.reply,
            timestamp: new Date().toISOString()
          }
        };
      } else {
        return messageResult;
      }
    } catch (error) {
      console.error('宠物问诊失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 测试连接
   * @returns {Promise<Object>} 测试结果
   */
  async testConnection() {
    try {
      const testPetData = {
        petInfo: {
          name: "测试宠物",
          type: "dog",
          breed: "测试品种",
          gender: "male",
          age: 1,
          notes: "测试用宠物"
        },
        currentDiagnosis: {
          symptomDescription: "测试症状",
          diseaseName: "测试疾病",
          confidence: 50,
          severity: 1,
          description: "测试描述",
          allProbabilities: []
        },
        healthProfile: {
          currentWeight: 5,
          allergies: "无",
          sterilized: "否",
          deworming: {
            frequency: "从不",
            lastDate: null
          },
          recentContact: "",
          skinDiseaseHistory: []
        }
      };

      // 测试设置用户变量
      const variableResult = await this.setUserVariables('test-user', testPetData);
      
      if (!variableResult.success) {
        return {
          success: false,
          message: '设置用户变量失败',
          error: variableResult.error
        };
      }

      // 测试发送消息
      const messageResult = await this.sendMessage(null, '你好，这是一个连接测试', testPetData, 'test-user');
      
      return {
        success: messageResult.success,
        message: messageResult.success ? 'Coze智能体连接正常' : 'Coze智能体连接失败',
        details: {
          success: messageResult.success,
          reply: messageResult.data?.reply,
          error: messageResult.error
        }
      };
    } catch (error) {
      console.error('连接测试失败:', error);
      return {
        success: false,
        message: '连接测试失败',
        error: error.message
      };
    }
  }
}

module.exports = CozeService;