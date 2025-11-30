// pages/item-result/item-result.js
const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    analysisResult: null,
    loading: true
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadAnalysisResult();
  },

  /**
   * 加载分析结果
   */
  loadAnalysisResult() {
    const result = app.globalData.currentAnalysisResult;
    if (!result) {
      tt.showModal({
        title: '错误',
        content: '未找到分析结果',
        showCancel: false,
        success: () => {
          tt.navigateBack();
        }
      });
      return;
    }

    this.setData({
      analysisResult: result,
      loading: false
    });

    console.log('分析结果数据:', result);
  },

  /**
   * 生成星级显示
   */
  generateStars(score) {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(i <= score);
    }
    return stars;
  },

  /**
   * 再次分析
   */
  analyzeAgain() {
    tt.navigateBack();
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
   * 分享结果
   */
  shareResult() {
    tt.showShareMenu({
      withShareTicket: true,
      success: () => {
        console.log('分享成功');
      },
      fail: (error) => {
        console.error('分享失败:', error);
        tt.showToast({
          title: '分享功能暂不可用',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 页面分享
   */
  onShareAppMessage() {
    const result = this.data.analysisResult;
    const score = result?.suitabilityResult?.overall_evaluation?.suitability_score || 3;
    
    return {
      title: `我的单品适配度是${score}分！快来测试你的穿搭风格吧`,
      path: '/pages/index/index',
      imageUrl: '/assets/images/share-cover.jpg' // 需要准备分享封面图
    };
  }
});