const CozeService = require('../services/cozeService');
const { integratePetData } = require('./diagnosisController');

class ConsultationController {
  constructor() {
    this.cozeService = new CozeService();
  }

  /**
   * 发送宠物问诊请求
   */
  sendPetConsultation = async (req, res) => {
    try {
      const { petId, question } = req.body;
      const userId = req.user.userId;

      // 验证参数
      if (!petId) {
        return res.status(400).json({
          success: false,
          message: "缺少宠物ID参数",
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "用户未登录",
        });
      }

      console.log('收到问诊请求:', { petId, question, userId });

      // 获取PetData
      let petData;
      try {
        petData = await integratePetData(userId, petId);
        console.log('PetData获取成功:', {
          petName: petData.petInfo.name,
          currentDisease: petData.currentDiagnosis.diseaseName,
          symptoms: petData.currentDiagnosis.symptomDescription
        });
      } catch (error) {
        if (error.message.includes('请先进行皮肤病诊断')) {
          return res.status(400).json({
            success: false,
            message: "请先进行皮肤病诊断，然后再进行智能问诊",
            error: "NO_DIAGNOSIS_RECORD"
          });
        }
        throw error;
      }

      // 发送到Coze智能体
      const consultationResult = await this.cozeService.sendPetConsultation(
        petId,
        petData,
        question,
        userId.toString()
      );

      if (consultationResult.success) {
        res.json({
          success: true,
          message: "问诊请求发送成功",
          data: consultationResult.data,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "问诊请求失败",
          error: consultationResult.error,
        });
      }
    } catch (error) {
      console.error("发送问诊请求失败:", error);
      res.status(500).json({
        success: false,
        message: "服务器内部错误",
        error: error.message,
      });
    }
  };

  /**
   * 测试Coze智能体连接
   */
  testCozeConnection = async (req, res) => {
    try {
      console.log('测试Coze智能体连接...');
      
      const testResult = await this.cozeService.testConnection();
      
      res.json({
        success: testResult.success,
        message: testResult.message,
        data: testResult.details,
      });
    } catch (error) {
      console.error("测试Coze连接失败:", error);
      res.status(500).json({
        success: false,
        message: "测试连接失败",
        error: error.message,
      });
    }
  };

  /**
   * 获取问诊历史
   */
  getConsultationHistory = async (req, res) => {
    try {
      const { conversationId } = req.params;
      
      if (!conversationId) {
        return res.status(400).json({
          success: false,
          message: "缺少会话ID参数",
        });
      }

      const historyResult = await this.cozeService.getConversationHistory(conversationId);
      
      if (historyResult.success) {
        res.json({
          success: true,
          message: "获取问诊历史成功",
          data: historyResult.data,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "获取问诊历史失败",
          error: historyResult.error,
        });
      }
    } catch (error) {
      console.error("获取问诊历史失败:", error);
      res.status(500).json({
        success: false,
        message: "服务器内部错误",
        error: error.message,
      });
    }
  };

  /**
   * 创建新的问诊会话
   */
  createConsultationSession = async (req, res) => {
    try {
      const userId = req.user.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "用户未登录",
        });
      }
      
      const sessionResult = await this.cozeService.createConversation(userId.toString());
      
      if (sessionResult.success) {
        res.json({
          success: true,
          message: "创建问诊会话成功",
          data: sessionResult.data,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "创建问诊会话失败",
          error: sessionResult.error,
        });
      }
    } catch (error) {
      console.error("创建问诊会话失败:", error);
      res.status(500).json({
        success: false,
        message: "服务器内部错误",
        error: error.message,
      });
    }
  };

  /**
   * 发送简单消息到Coze智能体
   */
  sendMessage = async (req, res) => {
    try {
      const { chatId, message, petId } = req.body;
      const userId = req.user.userId;

      // 验证参数
      if (!message) {
        return res.status(400).json({
          success: false,
          message: "缺少消息内容",
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "用户未登录",
        });
      }

      let petData = null;
      
      // 如果提供了petId，获取PetData
      if (petId) {
        try {
          petData = await integratePetData(userId, petId);
        } catch (error) {
          console.warn('获取PetData失败，将发送不带PetData的消息:', error.message);
        }
      }

      // 发送消息
      const messageResult = await this.cozeService.sendMessage(
        chatId,
        message,
        petData,
        userId.toString()
      );

      if (messageResult.success) {
        res.json({
          success: true,
          message: "消息发送成功",
          data: messageResult.data,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "消息发送失败",
          error: messageResult.error,
        });
      }
    } catch (error) {
      console.error("发送消息失败:", error);
      res.status(500).json({
        success: false,
        message: "服务器内部错误",
        error: error.message || "未知错误",
      });
    }
  };
}

module.exports = new ConsultationController();
