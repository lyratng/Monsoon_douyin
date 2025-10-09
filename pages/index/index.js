// 主页 - 个人风格报告入口
Page({
  data: {
    hasReport: false,
    userProfile: null,
    seasonType: '',
    energyType: '',
    showInitial: false,
    statusBarHeight: 0,
    navigationHeight: 0,
    capsuleInfo: null
  },

  onLoad: function(options) {
    console.log('个人风格报告页面加载');
    
    // 获取系统信息以处理状态栏和胶囊位置
    this.getSystemInfo();
    
    // 检查是否需要显示极简初始页面
    if (options && options.showInitial === 'true') {
      this.setData({
        showInitial: true,
        hasReport: false
      });
    } else {
      this.checkUserReport();
    }
  },

  // 获取系统信息，用于全屏显示
  getSystemInfo: function() {
    try {
      // 获取系统信息
      const systemInfo = tt.getSystemInfoSync();
      console.log('系统信息:', systemInfo);
      
      // 获取胶囊按钮位置信息（抖音小程序特有）
      let capsuleInfo = null;
      try {
        capsuleInfo = tt.getCustomButtonBoundingClientRect && tt.getCustomButtonBoundingClientRect();
        console.log('胶囊信息:', capsuleInfo);
      } catch (e) {
        console.log('获取胶囊信息失败，可能是开发工具环境:', e);
      }
      
      this.setData({
        statusBarHeight: systemInfo.statusBarHeight || 0,
        navigationHeight: (capsuleInfo ? capsuleInfo.height + (capsuleInfo.top - systemInfo.statusBarHeight) * 2 : 0),
        capsuleInfo: capsuleInfo
      });
      
      console.log('状态栏高度:', this.data.statusBarHeight);
      console.log('导航栏高度:', this.data.navigationHeight);
      
    } catch (error) {
      console.error('获取系统信息失败:', error);
    }
  },

  onShow: function() {
    // 检查是否从报告页面返回，如果是则显示极简页面
    const app = getApp();
    if (app.globalData && app.globalData.showInitialPage) {
      this.setData({
        showInitial: true,
        hasReport: false
      });
      // 清除标记
      app.globalData.showInitialPage = false;
    } else if (!this.data.showInitial) {
      this.checkUserReport();
    }
  },

  // 检查用户是否已有报告
  checkUserReport: function() {
    try {
      const app = getApp();
      const userProfile = app.getUserProfile();
      
      this.setData({
        userProfile: userProfile,
        hasReport: !!userProfile.style_report,
        seasonType: userProfile.style_report ? userProfile.style_report.season_name || '' : '',
        energyType: userProfile.style_report ? userProfile.style_report.energy_type_name || '' : ''
      });

      console.log('用户报告状态:', this.data.hasReport);
    } catch (error) {
      console.error('检查用户报告失败:', error);
      this.setData({
        hasReport: false
      });
    }
  },

  // 开始测试（首次用户或重新测试）
  startTest: function() {
    tt.navigateTo({
      url: '/pages/guide/guide'
    });
  },

  // 查看报告
  viewReport: function() {
    if (this.data.hasReport) {
      tt.navigateTo({
        url: '/pages/report/report'
      });
    } else {
      this.startTest();
    }
  },

  // 查看模拟报告
  viewMockReport: function() {
    tt.navigateTo({
      url: '/pages/report/report'
    });
  },

  // 重新测试
  retakeTest: function() {
    var self = this;
    tt.showModal({
      title: '确认重新测试',
      content: '重新测试将覆盖您当前的风格报告，确定要继续吗？',
      success: function(res) {
        if (res.confirm) {
          try {
            const app = getApp();
            const currentProfile = app.getUserProfile();
            const updatedProfile = {
              basic_info: currentProfile.basic_info,
              color_analysis: null,
              personality_test: {
                scores: { a: 0, b: 0, c: 0, d: 0 },
                energy_type: null,
                mbti: null
              },
              preferences: {
                favorite_colors: [],
                occasions: [],
                style_awareness: null,
                shopping_satisfaction: null
              },
              style_report: null,
              version: currentProfile.version,
              test_count: currentProfile.test_count + 1
            };
            
            app.updateUserProfile(updatedProfile);
            self.startTest();
          } catch (error) {
            console.error('重置用户数据失败:', error);
            tt.showToast({
              title: '重置失败，请重试',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 分享报告
  shareReport: function() {
    if (!this.data.hasReport) {
      tt.showToast({
        title: '请先完成测试',
        icon: 'none'
      });
      return;
    }

    tt.showShareMenu({
      withShareTicket: true,
      success: function() {
        console.log('分享成功');
      },
      fail: function() {
        tt.showToast({
          title: '分享失败',
          icon: 'none'
        });
      }
    });
  },

  // 页面分享
  onShareAppMessage: function() {
    return {
      title: '我发现了我的专属穿搭风格！',
      path: '/pages/index/index'
    };
  },

  // 跳转到调试页面
  goToDebug: function() {
    tt.navigateTo({
      url: '/pages/debug/debug'
    });
  },

  // GPT-5测试功能
  openGPT5Test: function() {
    console.log('点击了GPT-5测试按钮');
    tt.navigateTo({
      url: '/pages/gpt5-test/gpt5-test'
    });
  }
});

