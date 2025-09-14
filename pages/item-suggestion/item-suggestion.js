// pages/item-suggestion/item-suggestion.js
const app = getApp();
const api = require('../../utils/api.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    userProfile: null,
    uploadedImage: null,
    selectedSample: null,
    sampleImages: [],
    isAnalyzing: false,
    analysisHistory: [],
    currentBgIndex: 0,
    backgroundImages: [
      '/assets/images/backgrounds/carousel/bg-1.jpg',
      '/assets/images/backgrounds/carousel/bg-2.jpg',
      '/assets/images/backgrounds/carousel/bg-3.jpg'
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.initPage();
    // 确保第一张图片立即显示
    this.setData({
      currentBgIndex: 0
    });
    this.startBackgroundCarousel();
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    this.stopBackgroundCarousel();
  },

  /**
   * 初始化页面
   */
  initPage() {
    // 无论是否完成测试，都加载样例图片
    this.loadSampleImages();
    
    // 检查用户是否完成测试
    const userProfile = app.getUserProfile();
    if (!userProfile || !userProfile.style_report) {
      // 显示提示但不阻止页面功能
      console.log('用户尚未完成测试，但仍可以查看样例图片');
    }
    
    this.setData({
      userProfile: userProfile
    });
  },

  /**
   * 加载样例图片
   */
  loadSampleImages() {
    // 加载20张样例图片 - 使用正确的路径格式（必须以/开头）
    const sampleImages = [];
    for (let i = 1; i <= 20; i++) {
      sampleImages.push({
        id: i,
        name: `样例${i}`,
        path: `/assets/images/sample-clothes/sample-${i}.jpg`
      });
    }
    
    this.setData({
      sampleImages: sampleImages
    });
  },

  /**
   * 选择样例图片
   */
  selectSample(e) {
    const sample = e.currentTarget.dataset.sample;
    this.setData({
      selectedSample: sample,
      uploadedImage: null
    });
  },

  /**
   * 上传照片
   */
  uploadImage() {
    tt.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        
        this.setData({
          uploadedImage: {
            path: tempFilePath,
            name: '用户上传',
            type: '待分析'
          },
          selectedSample: null
        });
      },
      fail: (error) => {
        console.error('选择图片失败:', error);
        tt.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 移除上传的图片
   */
  removeImage() {
    this.setData({
      uploadedImage: null
    });
  },



  /**
   * 查看历史记录
   */
  viewHistory() {
    tt.navigateTo({
      url: '/pages/item-history/item-history'
    });
  },

  /**
   * 开始分析
   */
  async startAnalysis() {
    const image = this.data.selectedSample || this.data.uploadedImage;
    if (!image) {
      tt.showToast({
        title: '请先选择或上传图片',
        icon: 'none'
      });
      return;
    }

    // 检查用户是否完成测试
    const userProfile = this.data.userProfile;
    if (!userProfile || !userProfile.style_report) {
      tt.showModal({
        title: '提示',
        content: '需要先完成个人风格测试才能进行单品分析，是否前往测试？',
        confirmText: '去测试',
        cancelText: '稍后',
        success: (res) => {
          if (res.confirm) {
            tt.switchTab({
              url: '/pages/index/index'
            });
          }
        }
      });
      return;
    }

    this.setData({
      isAnalyzing: true
    });

    try {
      console.log('🎯 开始单品分析流程');
      
      // 第一步：将图片转换为base64
      const base64Image = await this.convertImageToBase64(image.path);
      
      // 第二步：第一层API - 衣物信息提取
      console.log('📋 第一层：衣物信息提取');
      const clothingInfo = await api.extractClothingInfo(base64Image);
      
      // 检查是否为衣物
      if (!clothingInfo.isClothing) {
        this.setData({
          isAnalyzing: false
        });
        tt.showModal({
          title: '提示',
          content: clothingInfo.error || '图片非衣物，请重新上传',
          showCancel: false
        });
        return;
      }
      
      // 第三步：第二层API - 适配度分析
      console.log('🔍 第二层：适配度分析');
      const suitabilityResult = await api.analyzeSuitability(clothingInfo, userProfile);
      
      // 第四步：保存分析结果到历史记录
      await this.saveAnalysisResult(image, clothingInfo, suitabilityResult);
      
      // 第五步：跳转到结果页面
      const resultData = {
        image: image,
        clothingInfo: clothingInfo,
        suitabilityResult: suitabilityResult,
        timestamp: new Date().toISOString()
      };
      
      // 将结果数据存储到全局，供结果页面使用
      getApp().globalData.currentAnalysisResult = resultData;
      
      this.setData({
        isAnalyzing: false
      });
      
      // 跳转到结果页面
      tt.navigateTo({
        url: '/pages/item-result/item-result'
      });
      
    } catch (error) {
      console.error('单品分析失败:', error);
      this.setData({
        isAnalyzing: false
      });
      
      let errorMessage = '分析失败，请重试';
      if (error.message.includes('API Key')) {
        errorMessage = 'API配置错误，请联系管理员';
      } else if (error.message.includes('网络')) {
        errorMessage = '网络连接失败，请检查网络后重试';
      }
      
      tt.showModal({
        title: '分析失败',
        content: errorMessage,
        showCancel: false
      });
    }
  },

  /**
   * 将图片转换为base64
   */
  convertImageToBase64(imagePath) {
    return new Promise((resolve, reject) => {
      tt.getFileSystemManager().readFile({
        filePath: imagePath,
        encoding: 'base64',
        success: (res) => {
          resolve(res.data);
        },
        fail: (error) => {
          console.error('图片转base64失败:', error);
          reject(new Error('图片处理失败'));
        }
      });
    });
  },

  /**
   * 保存分析结果到历史记录
   */
  async saveAnalysisResult(image, clothingInfo, suitabilityResult) {
    try {
      // 获取现有历史记录
      let history = [];
      try {
        history = tt.getStorageSync('item_analysis_history') || [];
      } catch (e) {
        console.log('获取历史记录失败，使用空数组');
      }
      
      // 创建新的记录
      const newRecord = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        image: {
          name: image.name,
          type: image.type || 'unknown'
        },
        clothingInfo: clothingInfo,
        suitabilityResult: suitabilityResult,
        // 保存缩略图（如果是用户上传的图片）
        thumbnail: image.path.startsWith('http') ? image.path : null
      };
      
      // 添加到历史记录开头
      history.unshift(newRecord);
      
      // 只保留最近10条记录
      if (history.length > 10) {
        history = history.slice(0, 10);
      }
      
      // 保存到本地存储
      tt.setStorageSync('item_analysis_history', history);
      console.log('✅ 分析结果已保存到历史记录');
      
    } catch (error) {
      console.error('保存历史记录失败:', error);
      // 不阻断主流程，只记录错误
    }
  },

  /**
   * 开始背景轮播
   */
  startBackgroundCarousel() {
    console.log('开始背景轮播，图片数量:', this.data.backgroundImages.length);
    console.log('背景图片路径:', this.data.backgroundImages);
    
    this.backgroundTimer = setInterval(() => {
      const nextIndex = (this.data.currentBgIndex + 1) % this.data.backgroundImages.length;
      console.log('切换到背景图片索引:', nextIndex);
      this.setData({
        currentBgIndex: nextIndex
      });
    }, 5000); // 每5秒切换一次
  },

  /**
   * 停止背景轮播
   */
  stopBackgroundCarousel() {
    if (this.backgroundTimer) {
      clearInterval(this.backgroundTimer);
      this.backgroundTimer = null;
    }
  }
});