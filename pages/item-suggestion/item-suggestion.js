// pages/item-suggestion/item-suggestion.js
const app = getApp();
const api = require('../../utils/api.js');
const cdnConfig = require('../../config/cdn.js');
const simpleImageLoader = require('../../utils/simpleImageLoader.js');

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
      'https://monsoon.oss-cn-beijing.aliyuncs.com/assets/images/backgrounds/carousel/bg-1.jpg',
      'https://monsoon.oss-cn-beijing.aliyuncs.com/assets/images/backgrounds/carousel/bg-2.jpg',
      'https://monsoon.oss-cn-beijing.aliyuncs.com/assets/images/backgrounds/carousel/bg-3.jpg'
    ],
    imageLoadingStates: {}, // 跟踪每张图片的加载状态
    loadingProgress: 0 // 整体加载进度
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.initPage();
    // 初始化背景索引，但不启动轮播
    this.setData({
      currentBgIndex: 0
    });
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    this.stopBackgroundCarousel();
    // 清理图片加载器状态
    simpleImageLoader.reset();
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
   * 加载样例图片 - 简化版本
   */
  loadSampleImages() {
    console.log('[页面] 开始加载样例图片');
    
    const sampleImages = [];
    
    for (let i = 1; i <= 40; i++) {
      const cdnUrl = cdnConfig.getSampleClothesUrl(i);
      
      sampleImages.push({
        id: i,
        name: `样例${i}`,
        path: cdnUrl // 直接使用CDN URL，无本地兜底
      });
    }
    
    this.setData({
      sampleImages: sampleImages
    });

    console.log('[页面] 样例图片数据已设置，共', sampleImages.length, '张');
  },

  /**
   * 选择样例图片
   */
  selectSample(e) {
    const sample = e.currentTarget.dataset.sample;
    console.log('🔍 [DEBUG] 选择样例图片:', sample);
    console.log('🔍 [DEBUG] 样例图片路径:', sample.path);
    console.log('🔍 [DEBUG] 样例图片ID:', sample.id);
    this.setData({
      selectedSample: sample,
      uploadedImage: null
    });
  },

  /**
   * 图片加载错误处理 - 已移除本地兜底逻辑
   */
  onImageError(e) {
    const item = e.currentTarget.dataset.item;
    
    console.warn(`[页面] CDN图片加载失败 ${item.id}:`, item.path);
    console.log(`[页面] 无本地兜底，请检查CDN配置或网络连接`);
    
    // 不再进行本地兜底，只记录错误
  },

  /**
   * 图片加载成功处理
   */
  onImageLoad(e) {
    const item = e.currentTarget.dataset.item;
    console.log(`[页面] 图片加载成功 ${item.id}:`, item.path.includes('aliyuncs.com') ? 'CDN' : '本地');
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
    console.log('🚀 [DEBUG] 开始分析按钮被点击');
    const image = this.data.selectedSample || this.data.uploadedImage;
    console.log('🔍 [DEBUG] 当前选中的图片:', image);
    console.log('🔍 [DEBUG] selectedSample:', this.data.selectedSample);
    console.log('🔍 [DEBUG] uploadedImage:', this.data.uploadedImage);
    
    if (!image) {
      console.log('❌ [DEBUG] 没有选择图片');
      tt.showToast({
        title: '请先选择或上传图片',
        icon: 'none'
      });
      return;
    }
    
    console.log('✅ [DEBUG] 图片检查通过，图片路径:', image.path);

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

    // 开始分析时启动背景轮播
    this.startBackgroundCarousel();

    try {
      console.log('🎯 [DEBUG] 开始单品分析流程');
      
      // 第一步：将图片转换为base64
      console.log('📷 [DEBUG] 第一步：开始转换图片为base64');
      console.log('📷 [DEBUG] 图片路径类型:', typeof image.path);
      console.log('📷 [DEBUG] 图片路径值:', image.path);
      
      const base64Image = await this.convertImageToBase64(image.path);
      console.log('✅ [DEBUG] 图片转换成功，base64长度:', base64Image.length);
      
      // 第二步：第一层API - 衣物信息提取
      console.log('📋 [DEBUG] 第二步：第一层API - 衣物信息提取');
      const clothingInfo = await api.extractClothingInfo(base64Image);
      console.log('✅ [DEBUG] 衣物信息提取完成:', clothingInfo);
      
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
      
      // 停止背景轮播
      this.stopBackgroundCarousel();
      
      // 跳转到结果页面
      tt.navigateTo({
        url: '/packageTools/pages/item-result/item-result'
      });
      
    } catch (error) {
      console.error('单品分析失败:', error);
      this.setData({
        isAnalyzing: false
      });
      
      // 停止背景轮播
      this.stopBackgroundCarousel();
      
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
      console.log('🔧 [DEBUG] convertImageToBase64 函数开始');
      console.log('🔧 [DEBUG] 传入的路径:', imagePath);
      console.log('🔧 [DEBUG] 路径类型:', typeof imagePath);
      console.log('🔧 [DEBUG] 是否以http开头:', imagePath.startsWith('http'));
      
      // 判断是否为网络URL
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        console.log('🌐 [DEBUG] 检测到网络URL，开始下载...');
        // 网络图片：先下载到本地，再转换
        tt.downloadFile({
          url: imagePath,
          success: (res) => {
            console.log('✅ [DEBUG] 图片下载成功，临时路径:', res.tempFilePath);
            const tempFilePath = res.tempFilePath;
            // 读取下载的临时文件
            tt.getFileSystemManager().readFile({
              filePath: tempFilePath,
              encoding: 'base64',
              success: (readRes) => {
                console.log('✅ [DEBUG] 文件读取成功，数据长度:', readRes.data.length);
                resolve(readRes.data);
              },
              fail: (readError) => {
                console.error('❌ [DEBUG] 读取下载文件失败:', readError);
                console.error('❌ [DEBUG] 读取错误详情:', JSON.stringify(readError));
                reject(new Error('图片处理失败'));
              }
            });
          },
          fail: (downloadError) => {
            console.error('❌ [DEBUG] 下载图片失败:', downloadError);
            console.error('❌ [DEBUG] 下载错误详情:', JSON.stringify(downloadError));
            
            // 检查具体的错误类型
            if (downloadError.errNo === 21100) {
              console.error('💡 [DEBUG] 域名白名单问题，请在抖音开发者平台配置域名白名单');
              reject(new Error('域名未在白名单中，请稍后重试'));
            } else {
              console.error('💡 [DEBUG] 其他下载错误，可能是网络问题');
              reject(new Error('图片下载失败，请检查网络连接'));
            }
          }
        });
      } else {
        console.log('📁 [DEBUG] 检测到本地路径，直接读取...');
        // 本地图片：直接读取
        tt.getFileSystemManager().readFile({
          filePath: imagePath,
          encoding: 'base64',
          success: (res) => {
            console.log('✅ [DEBUG] 文件读取成功，数据长度:', res.data.length);
            resolve(res.data);
          },
          fail: (error) => {
            console.error('❌ [DEBUG] 图片转base64失败:', error);
            console.error('❌ [DEBUG] 错误详情:', JSON.stringify(error));
            console.error('❌ [DEBUG] 失败的文件路径:', imagePath);
            reject(new Error('图片处理失败'));
          }
        });
      }
    });
  },

  /**
   * 保存分析结果到历史记录
   */
  async saveAnalysisResult(image, clothingInfo, suitabilityResult) {
    try {
      // 保存图片到本地（如果是用户上传的临时图片）
      const savedImagePath = await this.saveImageToLocal(image.path);
      
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
          type: image.type || 'unknown',
          path: savedImagePath || image.path // 使用保存后的路径，如果保存失败则使用原路径
        },
        clothingInfo: clothingInfo,
        suitabilityResult: suitabilityResult,
        // 保存缩略图
        thumbnail: savedImagePath || (image.path.startsWith('http') ? image.path : null)
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
   * 保存图片到本地文件系统
   */
  saveImageToLocal(tempFilePath) {
    return new Promise((resolve, reject) => {
      // 如果已经是本地路径或网络路径，直接返回
      if (!tempFilePath.startsWith('ttfile://temp/')) {
        resolve(tempFilePath);
        return;
      }

      const fs = tt.getFileSystemManager();
      const timestamp = Date.now();
      const fileName = `clothing_${timestamp}.jpg`;
      const savedPath = `${tt.env.USER_DATA_PATH}/images/${fileName}`;
      
      // 确保目录存在
      try {
        fs.mkdirSync(`${tt.env.USER_DATA_PATH}/images`, true);
      } catch (e) {
        // 目录可能已存在，忽略错误
      }
      
      // 压缩并保存图片
      tt.compressImage({
        src: tempFilePath,
        quality: 60, // 压缩质量，节省空间
        success: (res) => {
          // 复制压缩后的图片到永久位置
          fs.copyFile({
            srcPath: res.tempFilePath,
            destPath: savedPath,
            success: () => {
              console.log('图片保存成功:', savedPath);
              resolve(savedPath);
            },
            fail: (error) => {
              console.error('复制图片失败:', error);
              reject(error);
            }
          });
        },
        fail: (error) => {
          console.error('压缩图片失败:', error);
          // 压缩失败，尝试直接复制原图
          fs.copyFile({
            srcPath: tempFilePath,
            destPath: savedPath,
            success: () => {
              console.log('原图保存成功:', savedPath);
              resolve(savedPath);
            },
            fail: (copyError) => {
              console.error('复制原图失败:', copyError);
              reject(copyError);
            }
          });
        }
      });
    });
  },

  /**
   * 开始背景轮播 - 简单滑动切换模式
   */
  startBackgroundCarousel() {
    console.log('开始背景轮播，图片数量:', this.data.backgroundImages.length);
    console.log('背景图片路径:', this.data.backgroundImages);
    
    // 每2秒切换到下一张图片
    this.backgroundTimer = setInterval(() => {
      const nextIndex = (this.data.currentBgIndex + 1) % this.data.backgroundImages.length;
      console.log('切换到背景图片索引:', nextIndex);
      this.setData({
        currentBgIndex: nextIndex
      });
    }, 2000); // 每2秒切换一次
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