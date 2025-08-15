// pages/index/index.js - 主页逻辑

const app = getApp();

Page({
  data: {
    isFirstLaunch: true,
    hasHistory: false,
    hasShoppingHistory: false,
    userInfo: null
  },

  onLoad() {
    this.initPage();
  },

  onShow() {
    this.checkHistory();
  },

  // 初始化页面
  initPage() {
    this.setData({
      isFirstLaunch: app.globalData.isFirstLaunch
    });

    // 检查是否有历史报告
    this.checkHistory();
  },

  // 检查历史报告
  checkHistory() {
    const historyReports = app.getHistoryReports();
    const shoppingHistory = app.getShoppingHistory();
    this.setData({
      hasHistory: historyReports.length > 0,
      hasShoppingHistory: shoppingHistory.length > 0
    });
  },

  // 开始风格分析
  startStyleAnalysis() {
    // 记录埋点
    // const analytics = require('../../utils/analytics.js');
    // analytics.track('start_style_analysis', {
    //   page: 'index',
    //   timestamp: Date.now()
    // });

    // 跳转到引导页
    tt.navigateTo({
      url: '/pages/guide/guide'
    });
  },

  // 购物建议
  showShoppingAdvice() {
    tt.navigateTo({
      url: '/pages/shopping/shopping'
    });

    // 记录埋点
    // const analytics = require('../../utils/analytics.js');
    // analytics.track('shopping_advice_click', {
    //   page: 'index',
    //   timestamp: Date.now()
    // });
  },

  // 查看历史报告
  viewHistory() {
    tt.navigateTo({
      url: '/pages/history/history'
    });
  },

  // 查看历史购物建议
  viewShoppingHistory() {
    tt.navigateTo({
      url: '/pages/shopping-history/shopping-history'
    });
  },

  // 分享小程序
  onShareAppMessage() {
    return {
      title: '季风 Monsoon - 发现你的个人风格',
      path: '/pages/index/index',
      imageUrl: '/assets/images/share-cover.png'
    };
  },

  // 跳转到测试页面
  goToTest() {
    tt.navigateTo({
      url: '/pages/test/test'
    });
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '季风 Monsoon - 发现你的个人风格',
      imageUrl: '/assets/images/share-cover.png'
    };
  }
});
