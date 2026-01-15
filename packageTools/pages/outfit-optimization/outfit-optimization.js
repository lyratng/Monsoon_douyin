// 穿搭优化页面
const api = require('../../../utils/api');
const userUtils = require('../../../utils/user');

Page({
  data: {
    uploadedImage: '', // 用户上传的图片路径
    isLoading: false,
    loadingText: 'AI正在给你推荐配饰/穿搭技巧',
    
    // 加载轮播相关
    currentBgIndex: 0,
    backgroundImages: [
      'https://monsoon.oss-cn-beijing.aliyuncs.com/assets/images/backgrounds/carousel/bg-1.jpg',
      'https://monsoon.oss-cn-beijing.aliyuncs.com/assets/images/backgrounds/carousel/bg-2.jpg',
      'https://monsoon.oss-cn-beijing.aliyuncs.com/assets/images/backgrounds/carousel/bg-3.jpg'
    ],
    
    // 分析结果
    outfitAnalysis: null,
    recommendations: null,
    optimizedImageUrl: null,
    
    // 原图base64（用于图生图）
    originalImageBase64: ''
  },

  onLoad() {
    console.log('穿搭优化页面加载');
  },

  // 跳转到历史记录
  goToHistory() {
    tt.navigateTo({
      url: '/packageTools/pages/outfit-history/outfit-history'
    });
  },

  onUnload() {
    this.stopBackgroundCarousel();
  },

  // 选择图片
  chooseImage() {
    const self = this;
    tt.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'], // 优先原图，兼容不支持original的机型
      sourceType: ['album', 'camera'],
      success(res) {
        const imagePath = res.tempFilePaths[0];
        console.log('📸 选择图片:', imagePath);
        
        if (!imagePath) {
          console.error('选择图片失败: 临时文件路径为空');
          tt.showToast({
            title: '选择图片失败，请重试',
            icon: 'none'
          });
          return;
        }
        
        self.setData({
          uploadedImage: imagePath
        });
        
        tt.showToast({
          title: '图片上传成功',
          icon: 'success'
        });
      },
      fail(err) {
        console.error('选择图片失败:', err);
        // 针对 tempFile is nil 错误给出明确提示
        let errMsg = '选择图片失败';
        if (err && err.errMsg && err.errMsg.includes('tempFile is nil')) {
          errMsg = '获取图片失败，请重试';
        }
        tt.showToast({
          title: errMsg,
          icon: 'none'
        });
      }
    });
  },

  // 开始分析
  async startAnalysis() {
    if (!this.data.uploadedImage) {
      tt.showToast({
        title: '请先上传穿搭照片',
        icon: 'none'
      });
      return;
    }

    const self = this;
    
    // ========== 寓言币消费逻辑 ==========
    // 检查是否登录
    if (!userUtils.isLoggedIn()) {
      tt.showModal({
        title: '需要登录',
        content: '使用穿搭优化功能需要先登录，是否前往登录？',
        confirmText: '去登录',
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
    
    // 消费寓言币
    const consumeResult = await userUtils.consumeCoins(1, '穿搭优化');
    console.log('💰 寓言币消费结果:', consumeResult);
    
    if (!consumeResult.success) {
      if (consumeResult.needLogin) {
        tt.showModal({
          title: '需要登录',
          content: '请先登录后再使用此功能',
          confirmText: '去登录',
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
      
      if (consumeResult.needRecharge) {
        // 余额不足，跳转到首页显示充值卡片
        tt.showModal({
          title: '寓言币不足',
          content: '您的寓言币余额不足，是否前往充值？',
          confirmText: '去充值',
          cancelText: '稍后',
          success: (res) => {
            if (res.confirm) {
              // 跳转到首页并触发充值弹窗
              tt.switchTab({
                url: '/pages/index/index',
                success: () => {
                  // 通过全局数据通知首页打开充值卡片
                  const appInstance = getApp();
                  appInstance.globalData.showRechargeOnIndex = true;
                }
              });
            }
          }
        });
        return;
      }
      
      // 其他错误
      tt.showToast({
        title: consumeResult.message || '消费失败',
        icon: 'none'
      });
      return;
    }
    
    // 消费成功，显示提示
    tt.showToast({
      title: consumeResult.message,
      icon: 'none',
      duration: 2000
    });
    // ========== 寓言币消费逻辑结束 ==========
    
    // 显示加载状态
    this.setData({
      isLoading: true,
      loadingText: '正在进行安全检测...'
    });
    
    // 开始背景轮播
    this.startBackgroundCarousel();

    try {
      // 1. 先进行内容安全检测（使用文件路径方式，更稳定）
      console.log('🔒 开始安全检测...');
      const safetyResult = await api.checkImageSafetyFromFile(self.data.uploadedImage, false);
      
      if (!safetyResult.safe) {
        self.setData({ isLoading: false, uploadedImage: '' });
        self.stopBackgroundCarousel();
        tt.showModal({
          title: '图片检测未通过',
          content: safetyResult.message || '您上传的图片未通过安全检测，请更换图片后重试',
          showCancel: false
        });
        return;
      }
      
      console.log('✅ 安全检测通过');
      
      // 2. 读取图片为base64
      self.setData({ loadingText: 'AI正在分析你的穿搭...' });
      const base64Image = await self.readImageAsBase64(self.data.uploadedImage);
      self.setData({ originalImageBase64: base64Image });
      
      // 3. 继续分析流程
      await self.analyzeOutfit(base64Image);
      
    } catch (error) {
      console.error('分析过程出错:', error);
      self.setData({ isLoading: false });
      self.stopBackgroundCarousel();
      tt.showToast({
        title: error.message || '分析失败，请重试',
        icon: 'none'
      });
    }
  },

  // 读取图片为base64
  readImageAsBase64(filePath) {
    return new Promise((resolve, reject) => {
      const fs = tt.getFileSystemManager();
      fs.readFile({
        filePath: filePath,
        encoding: 'base64',
        success(res) {
          if (res.data && res.data.length > 0) {
            resolve(res.data);
          } else {
            reject(new Error('图片数据为空'));
          }
        },
        fail(err) {
          console.error('读取图片失败:', err);
          reject(new Error('图片读取失败'));
        }
      });
    });
  },

  // 分析穿搭（安全检测已通过）
  async analyzeOutfit(base64Image) {
    const self = this;
    
    try {
      console.log('🔍 开始穿搭分析...');
      
      // 分析穿搭图片
      self.setData({ loadingText: 'AI正在识别你的穿搭...' });
      const analysisResult = await api.analyzeOutfitImage(base64Image);
      
      if (!analysisResult.success) {
        self.setData({ isLoading: false });
        self.stopBackgroundCarousel();
        tt.showModal({
          title: '分析失败',
          content: analysisResult.error || '照片未检测到穿搭，请您重新上传',
          showCancel: false
        });
        return;
      }
      
      console.log('✅ 穿搭分析完成:', analysisResult.data);
      self.setData({ outfitAnalysis: analysisResult.data });
      
      // 3. 加载知识库并生成配饰推荐
      self.setData({ loadingText: 'AI正在给你推荐配饰/穿搭技巧...' });
      const knowledgeBase = await api.loadOutfitKnowledge();
      const recommendResult = await api.generateAccessoryRecommendations(
        analysisResult.data,
        knowledgeBase
      );
      
      if (!recommendResult.success) {
        self.setData({ isLoading: false });
        self.stopBackgroundCarousel();
        tt.showToast({
          title: '推荐生成失败',
          icon: 'none'
        });
        return;
      }
      
      console.log('✅ 配饰推荐完成:', recommendResult.data);
      self.setData({ recommendations: recommendResult.data });
      
      // 4. 生成优化后的穿搭图片（图生图）
      self.setData({ loadingText: 'AI正在生成优化后的穿搭效果图...' });
      const imageResult = await api.generateOptimizedOutfitImage(
        base64Image,
        recommendResult.data.accessories,
        recommendResult.data.styling_tips
      );
      
      if (imageResult.success) {
        console.log('✅ 优化图片生成成功');
        self.setData({ optimizedImageUrl: imageResult.imageUrl });
      } else {
        console.warn('⚠️ 优化图片生成失败，将只显示文字建议:', imageResult.error);
        // 图片生成失败不阻断流程，继续跳转到结果页
      }
      
      // 5. 停止加载，跳转到结果页
      self.setData({ isLoading: false });
      self.stopBackgroundCarousel();
      
      // 创建结果对象
      const resultData = {
        originalImage: self.data.uploadedImage,
        outfitAnalysis: self.data.outfitAnalysis,
        recommendations: self.data.recommendations,
        optimizedImageUrl: self.data.optimizedImageUrl,
        createTime: new Date().toLocaleString('zh-CN')
      };
      
      // 保存数据到本地存储（用于结果页显示）
      try {
        tt.setStorageSync('outfitOptimizationResult', resultData);
        
        // 同时保存到历史记录
        const history = tt.getStorageSync('outfitOptimizationHistory') || [];
        history.unshift(resultData); // 新记录放在最前面
        // 最多保存20条
        if (history.length > 20) {
          history.pop();
        }
        tt.setStorageSync('outfitOptimizationHistory', history);
        console.log('✅ 历史记录已保存');
      } catch (e) {
        console.error('保存结果失败:', e);
      }
      
      // 跳转到结果页
      tt.navigateTo({
        url: '/packageTools/pages/outfit-result/outfit-result'
      });
      
    } catch (error) {
      console.error('分析过程出错:', error);
      self.setData({ isLoading: false });
      self.stopBackgroundCarousel();
      tt.showToast({
        title: '分析失败，请重试',
        icon: 'none'
      });
    }
  },

  // 开始背景轮播
  startBackgroundCarousel() {
    console.log('开始背景轮播');
    this.backgroundTimer = setInterval(() => {
      const nextIndex = (this.data.currentBgIndex + 1) % this.data.backgroundImages.length;
      this.setData({ currentBgIndex: nextIndex });
    }, 2000);
  },

  // 停止背景轮播
  stopBackgroundCarousel() {
    if (this.backgroundTimer) {
      clearInterval(this.backgroundTimer);
      this.backgroundTimer = null;
    }
  }
});
