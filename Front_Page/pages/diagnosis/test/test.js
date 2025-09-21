/**
 * 模型测试页面
 * 用于测试模型预测功能是否正常工作
 */
const modelService = require('../model/modelService.js');

Page({
  data: {
    testResults: [],
    isTesting: false,
    testImagePath: ''
  },

  onLoad: function() {
    console.log('模型测试页面加载');
  },

  // 选择测试图片
  chooseTestImage: function() {
    const that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        const imagePath = res.tempFiles[0].tempFilePath;
        that.setData({
          testImagePath: imagePath
        });
        console.log('选择测试图片:', imagePath);
      }
    });
  },

  // 运行单张图片测试
  runSingleImageTest: function() {
    if (!this.data.testImagePath) {
      wx.showToast({
        title: '请先选择测试图片',
        icon: 'none'
      });
      return;
    }

    this.setData({
      isTesting: true
    });

    const that = this;
    modelService.predictSkinDisease(this.data.testImagePath)
      .then(result => {
        console.log('单张图片测试结果:', result);
        
        const testResult = {
          id: Date.now(),
          type: 'single',
          imagePath: that.data.testImagePath,
          result: result,
          timestamp: new Date().toLocaleString()
        };
        
        that.setData({
          testResults: [testResult, ...that.data.testResults],
          isTesting: false
        });
        
        wx.showToast({
          title: '测试完成',
          icon: 'success'
        });
      })
      .catch(error => {
        console.error('单张图片测试失败:', error);
        that.setData({
          isTesting: false
        });
        wx.showToast({
          title: '测试失败',
          icon: 'none'
        });
      });
  },

  // 运行多张图片测试
  runMultipleImageTest: function() {
    const that = this;
    wx.chooseMedia({
      count: 3,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        const imagePaths = res.tempFiles.map(file => file.tempFilePath);
        
        that.setData({
          isTesting: true
        });
        
        modelService.predictMultipleImages(imagePaths)
          .then(result => {
            console.log('多张图片测试结果:', result);
            
            const testResult = {
              id: Date.now(),
              type: 'multiple',
              imagePaths: imagePaths,
              result: result,
              timestamp: new Date().toLocaleString()
            };
            
            that.setData({
              testResults: [testResult, ...that.data.testResults],
              isTesting: false
            });
            
            wx.showToast({
              title: '测试完成',
              icon: 'success'
            });
          })
          .catch(error => {
            console.error('多张图片测试失败:', error);
            that.setData({
              isTesting: false
            });
            wx.showToast({
              title: '测试失败',
              icon: 'none'
            });
          });
      }
    });
  },

  // 清空测试结果
  clearResults: function() {
    this.setData({
      testResults: []
    });
    wx.showToast({
      title: '已清空',
      icon: 'success'
    });
  },

  // 查看详细结果
  viewDetail: function(e) {
    const index = e.currentTarget.dataset.index;
    const result = this.data.testResults[index];
    
    wx.showModal({
      title: '详细测试结果',
      content: `疾病名称: ${result.result.diseaseName}\n可信度: ${result.result.confidence}%\n严重程度: ${result.result.severity}\n描述: ${result.result.description}`,
      showCancel: false
    });
  }
});
