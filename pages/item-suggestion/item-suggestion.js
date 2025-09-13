// pages/item-suggestion/item-suggestion.js
const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    userProfile: null,
    uploadedImage: null,
    selectedSample: null,
    sampleImages: [],
    isAnalyzing: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.initPage();
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
   * 开始分析
   */
  startAnalysis() {
    const image = this.data.selectedSample || this.data.uploadedImage;
    if (!image) {
      tt.showToast({
        title: '请先选择或上传图片',
        icon: 'none'
      });
      return;
    }

    this.setData({
      isAnalyzing: true
    });

    // 模拟分析过程
    setTimeout(() => {
      this.setData({
        isAnalyzing: false
      });
      
      tt.showToast({
        title: '分析功能开发中',
        icon: 'none'
      });
    }, 2000);
  }
});