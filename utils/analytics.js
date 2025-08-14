// utils/analytics.js - 埋点统计工具

class Analytics {
  constructor() {
    this.enabled = true;
    this.events = [];
    this.sessionId = this.generateSessionId();
    this.userId = this.getUserId();
  }

  // 初始化埋点
  init() {
    console.log('埋点系统初始化');
    this.track('app_launch', {
      sessionId: this.sessionId,
      timestamp: Date.now()
    });
  }

  // 生成会话ID
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // 获取用户ID
  getUserId() {
    let userId = tt.getStorageSync('analytics_user_id');
    if (!userId) {
      userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      tt.setStorageSync('analytics_user_id', userId);
    }
    return userId;
  }

  // 记录事件
  track(eventName, properties = {}) {
    if (!this.enabled) return;

    const event = {
      eventName,
      properties: {
        ...properties,
        userId: this.userId,
        sessionId: this.sessionId,
        timestamp: Date.now(),
        platform: 'douyin_miniprogram',
        version: '1.0.0'
      }
    };

    this.events.push(event);
    console.log('埋点事件:', event);

    // 本地存储事件
    this.saveEvent(event);

    // 批量上报（每10个事件上报一次）
    if (this.events.length >= 10) {
      this.batchReport();
    }
  }

  // 保存事件到本地
  saveEvent(event) {
    try {
      let events = tt.getStorageSync('analytics_events') || [];
      events.push(event);
      
      // 限制本地存储的事件数量（最多保存100个）
      if (events.length > 100) {
        events = events.slice(-100);
      }
      
      tt.setStorageSync('analytics_events', events);
    } catch (error) {
      console.error('保存埋点事件失败:', error);
    }
  }

  // 批量上报事件
  async batchReport() {
    if (this.events.length === 0) return;

    const eventsToReport = [...this.events];
    this.events = [];

    try {
      // 这里可以配置上报到自己的服务器
      // await this.reportToServer(eventsToReport);
      
      // 目前先打印到控制台
      console.log('批量上报事件:', eventsToReport);
      
      // 清除已上报的事件
      this.clearReportedEvents(eventsToReport);
    } catch (error) {
      console.error('批量上报失败:', error);
      // 上报失败，重新加入队列
      this.events.unshift(...eventsToReport);
    }
  }

  // 上报到服务器（预留接口）
  async reportToServer(events) {
    // 这里可以配置上报到自己的服务器
    // const response = await tt.request({
    //   url: 'your_analytics_endpoint',
    //   method: 'POST',
    //   data: { events }
    // });
    // return response;
  }

  // 清除已上报的事件
  clearReportedEvents(reportedEvents) {
    try {
      let events = tt.getStorageSync('analytics_events') || [];
      const reportedIds = reportedEvents.map(e => e.properties.timestamp);
      
      events = events.filter(event => 
        !reportedIds.includes(event.properties.timestamp)
      );
      
      tt.setStorageSync('analytics_events', events);
    } catch (error) {
      console.error('清除已上报事件失败:', error);
    }
  }

  // 页面访问埋点
  trackPageView(pageName, properties = {}) {
    this.track('page_view', {
      pageName,
      ...properties
    });
  }

  // 按钮点击埋点
  trackButtonClick(buttonName, properties = {}) {
    this.track('button_click', {
      buttonName,
      ...properties
    });
  }

  // 功能使用埋点
  trackFeatureUse(featureName, properties = {}) {
    this.track('feature_use', {
      featureName,
      ...properties
    });
  }

  // 错误埋点
  trackError(errorType, errorMessage, properties = {}) {
    this.track('error', {
      errorType,
      errorMessage,
      ...properties
    });
  }

  // 性能埋点
  trackPerformance(action, duration, properties = {}) {
    this.track('performance', {
      action,
      duration,
      ...properties
    });
  }

  // 问卷相关埋点
  trackQuestionnaire(questionId, answer, properties = {}) {
    this.track('questionnaire_answer', {
      questionId,
      answer,
      ...properties
    });
  }

  // 照片上传埋点
  trackPhotoUpload(photoType, success, properties = {}) {
    this.track('photo_upload', {
      photoType,
      success,
      ...properties
    });
  }

  // 报告生成埋点
  trackReportGeneration(success, duration, properties = {}) {
    this.track('report_generation', {
      success,
      duration,
      ...properties
    });
  }

  // 分享埋点
  trackShare(shareType, properties = {}) {
    this.track('share', {
      shareType,
      ...properties
    });
  }

  // 获取埋点数据（用于调试）
  getEvents() {
    return this.events;
  }

  // 获取本地存储的事件
  getStoredEvents() {
    try {
      return tt.getStorageSync('analytics_events') || [];
    } catch (error) {
      console.error('获取存储事件失败:', error);
      return [];
    }
  }

  // 清除所有埋点数据
  clearAllEvents() {
    this.events = [];
    try {
      tt.removeStorageSync('analytics_events');
      tt.removeStorageSync('analytics_user_id');
    } catch (error) {
      console.error('清除埋点数据失败:', error);
    }
  }

  // 启用/禁用埋点
  setEnabled(enabled) {
    this.enabled = enabled;
  }
}

// 创建单例实例
const analytics = new Analytics();

module.exports = analytics; 