// 主页 - 个人风格报告入口
const userUtils = require('../../utils/user');

Page({
  data: {
    hasReport: false,
    userProfile: null,
    seasonType: '',
    energyType: '',
    showInitial: false,
    statusBarHeight: 0,
    navigationHeight: 0,
    capsuleInfo: null,
    showGPT5Test: false, // 控制GPT5测试按钮显示
    titleClickCount: 0, // 标题点击次数
    firstClickTime: 0, // 第一次点击的时间戳
    // 用户系统相关
    showLoginPopup: false,
    showSidebar: false,
    showRechargeCard: false,
    inviterOpenid: '',
    coinBalance: 0,
    isFirstCharge: true,
    serverUserInfo: null
  },

  onLoad: function(options) {
    console.log('个人风格报告页面加载', options);
    
    // 获取系统信息以处理状态栏和胶囊位置
    this.getSystemInfo();
    
    // 处理邀请参数
    if (options && options.inviter) {
      console.log('检测到邀请人:', options.inviter);
      this.setData({ inviterOpenid: options.inviter });
      // 保存到全局
      const app = getApp();
      app.globalData.inviterOpenid = options.inviter;
    }
    
    // 检查是否需要显示极简初始页面
    if (options && options.showInitial === 'true') {
      this.setData({
        showInitial: true,
        hasReport: false
      });
    } else {
      this.checkUserReport();
    }
    
    // 加载用户余额
    this.loadUserBalance();
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
    // 重置GPT5测试按钮状态（从其他页面返回时隐藏）
    this.setData({
      showGPT5Test: false,
      titleClickCount: 0,
      firstClickTime: 0
    });
    
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
    
    // 检查是否需要显示充值卡片（从消费页面跳转过来）
    if (app.globalData && app.globalData.showRechargeOnIndex) {
      app.globalData.showRechargeOnIndex = false;
      // 延迟显示，等待页面完全显示
      setTimeout(() => {
        this.setData({ showRechargeCard: true });
      }, 300);
    }
    
    // 刷新用户余额
    this.loadUserBalance();
  },

  onHide: function() {
    // 离开页面时重置GPT5测试按钮状态
    this.setData({
      showGPT5Test: false,
      titleClickCount: 0,
      firstClickTime: 0
    });
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
        url: '/packageReport/pages/report/report'
      });
    } else {
      this.startTest();
    }
  },

  // 查看模拟报告
  viewMockReport: function() {
    tt.navigateTo({
      url: '/packageReport/pages/report/report'
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

  // 跳转到调试页面
  goToDebug: function() {
    tt.navigateTo({
      url: '/packageDev/pages/debug/debug'
    });
  },

  // 点击"衣索寓言"标题的处理函数
  handleTitleClick: function() {
    const currentTime = Date.now();
    const clickCount = this.data.titleClickCount;
    const firstClickTime = this.data.firstClickTime;
    
    // 如果是第一次点击，记录时间戳
    if (clickCount === 0) {
      this.setData({
        titleClickCount: 1,
        firstClickTime: currentTime
      });
      console.log('第1次点击标题');
    } else {
      // 检查是否在3秒内
      const timeDiff = currentTime - firstClickTime;
      
      if (timeDiff > 3000) {
        // 超过3秒，重置计数
        this.setData({
          titleClickCount: 1,
          firstClickTime: currentTime
        });
        console.log('超过3秒，重新计数 - 第1次点击标题');
      } else {
        // 在3秒内，增加计数
        const newCount = clickCount + 1;
        this.setData({
          titleClickCount: newCount
        });
        console.log('第' + newCount + '次点击标题');
        
        // 如果点击了3次，显示GPT5测试按钮
        if (newCount >= 3) {
          this.setData({
            showGPT5Test: true
          });
          console.log('✨ 已解锁GPT-5测试功能！');
          tt.showToast({
            title: '✨ 已解锁测试功能',
            icon: 'none',
            duration: 1500
          });
        }
      }
    }
  },

  // GPT-5测试功能
  openGPT5Test: function() {
    console.log('点击了GPT-5测试按钮');
    tt.navigateTo({
      url: '/packageDev/pages/gpt5-test/gpt5-test'
    });
  },
  
  // ========== 用户系统相关方法 ==========
  
  // 加载用户余额
  loadUserBalance: async function() {
    // 检查是否已在服务器注册（不只是有 openid）
    const app = getApp();
    if (app.globalData.isServerLoggedIn || userUtils.isLoggedIn()) {
      try {
        const balanceData = await userUtils.getCoinBalance();
        this.setData({
          coinBalance: balanceData.balance,
          isFirstCharge: balanceData.isFirstCharge
        });
      } catch (e) {
        console.log('加载余额跳过（用户可能未注册）');
      }
    }
  },
  
  // 打开侧边栏
  openSidebar: function() {
    this.setData({ showSidebar: true });
  },
  
  // 关闭侧边栏
  onSidebarClose: function() {
    this.setData({ showSidebar: false });
  },
  
  // 侧边栏点击登录
  onSidebarLogin: function() {
    this.setData({ 
      showSidebar: false,
      showLoginPopup: true 
    });
  },
  
  // 侧边栏点击充值
  onSidebarRecharge: function() {
    this.setData({ 
      showSidebar: false,
      showRechargeCard: true 
    });
  },
  
  // 登录成功回调
  onLoginSuccess: function(e) {
    console.log('登录成功:', e.detail);
    const userData = e.detail;
    this.setData({
      serverUserInfo: userData,
      coinBalance: userData.coins,
      isFirstCharge: userData.is_first_charge
    });
    // 更新全局数据
    const app = getApp();
    app.globalData.serverUserInfo = userData;
    app.globalData.isServerLoggedIn = true;
    app.globalData.coinBalance = userData.coins;
  },
  
  // 关闭登录弹窗
  onLoginPopupClose: function() {
    this.setData({ showLoginPopup: false });
  },
  
  // 关闭充值卡片
  onRechargeCardClose: function() {
    this.setData({ showRechargeCard: false });
  },
  
  // 充值成功回调
  onRechargeSuccess: function(e) {
    const { plan, result } = e.detail;
    console.log('充值成功:', plan, result);
    
    // 刷新用户余额
    this.loadUserBalance();
    
    // 关闭充值卡片
    this.setData({ showRechargeCard: false });
  },
  
  // 需要登录（从充值卡片触发）
  onNeedLogin: function() {
    this.setData({
      showRechargeCard: false,
      showLoginPopup: true
    });
  },
  
  // 邀请好友
  onInviteFriends: function() {
    const openid = userUtils.getOpenid();
    if (!openid) {
      // 未登录，先显示登录弹窗
      this.setData({
        showRechargeCard: false,
        showSidebar: false,
        showLoginPopup: true
      });
      return;
    }
    
    // 触发分享
    tt.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage']
    });
  },
  
  // 页面分享 - 带邀请参数
  onShareAppMessage: function() {
    const openid = userUtils.getOpenid();
    let path = '/pages/index/index';
    if (openid) {
      path += '?inviter=' + openid;
    }
    return {
      title: '发现你的专属穿搭风格！首次登录送10枚寓言币',
      path: path
    };
  }
});

