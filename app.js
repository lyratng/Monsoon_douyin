// app.js - 季风 Monsoon 小程序入口文件
App({
  globalData: {
    userInfo: null,
    questionnaireData: null,
    uploadedImages: [],
    currentReport: null,
    isFirstLaunch: true
  },

  onLaunch() {
    console.log('季风 Monsoon 小程序启动');
    this.initApp();

    // —— 接入抖音隐私授权总线（≥ 基础库 3.19.0）——
    if (typeof tt !== 'undefined' && tt.onNeedPrivacyAuthorization) {
      tt.onNeedPrivacyAuthorization(( resolve, eventInfo ) => {
        console.log('[privacy] need authorization for:', eventInfo && eventInfo.referrer);
        tt.showModal({
          title: '隐私授权',
          content: '为实现拍照/相册选择，我们仅在你主动操作时使用相册与摄像头能力。',
          success: (r) => {
            resolve({ event: r.confirm ? 'agree' : 'disagree' });
          },
          fail: () => resolve({ event: 'disagree' })
        });
      });
    }
  },

  onShow() {
    console.log('小程序显示');
  },

  onHide() {
    console.log('小程序隐藏');
  },

  onError(msg) {
    console.error('小程序错误:', msg);
  },

  // 初始化应用
  initApp() {
    // 检查是否首次启动
    const isFirstLaunch = tt.getStorageSync('isFirstLaunch');
    if (isFirstLaunch === '') {
      tt.setStorageSync('isFirstLaunch', 'false');
      this.globalData.isFirstLaunch = true;
    } else {
      this.globalData.isFirstLaunch = false;
    }

    // 加载用户数据
    this.loadUserData();
    
    // 初始化埋点
    this.initAnalytics();
  },

  // 加载用户数据
  loadUserData() {
    try {
      const userInfo = tt.getStorageSync('userInfo');
      const questionnaireData = tt.getStorageSync('questionnaireData');
      const historyReports = tt.getStorageSync('historyReports');

      if (userInfo) this.globalData.userInfo = userInfo;
      if (questionnaireData) this.globalData.questionnaireData = questionnaireData;
      if (historyReports) this.globalData.historyReports = historyReports;
    } catch (error) {
      console.error('加载用户数据失败:', error);
    }
  },

  // 初始化埋点
  initAnalytics() {
    // 暂时注释掉埋点初始化，避免require错误
    // const analytics = require('./utils/analytics.js');
    // analytics.init();
    console.log('埋点系统初始化完成');
  },

  // 保存用户数据
  saveUserData() {
    try {
      tt.setStorageSync('userInfo', this.globalData.userInfo);
      tt.setStorageSync('questionnaireData', this.globalData.questionnaireData);
    } catch (error) {
      console.error('保存用户数据失败:', error);
    }
  },

  // 保存历史报告
  saveHistoryReport(report) {
    try {
      let historyReports = tt.getStorageSync('historyReports') || [];
      
      // 添加时间信息
      const now = new Date();
      report.timestamp = now.toISOString();
      report.id = Date.now().toString();
      report.date = now.toLocaleDateString('zh-CN');
      report.time = now.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      // 限制最多保存5份报告
      if (historyReports.length >= 5) {
        historyReports = historyReports.slice(-4);
      }
      
      historyReports.push(report);
      tt.setStorageSync('historyReports', historyReports);
      
      console.log('历史报告保存成功:', report.date, report.time);
    } catch (error) {
      console.error('保存历史报告失败:', error);
    }
  },

  // 获取历史报告
  getHistoryReports() {
    try {
      return tt.getStorageSync('historyReports') || [];
    } catch (error) {
      console.error('获取历史报告失败:', error);
      return [];
    }
  }
});
