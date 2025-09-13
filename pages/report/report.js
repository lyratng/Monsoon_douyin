// pages/report/report.js
const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    userProfile: null,
    styleReport: null,
    loading: true
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadReport();
  },

  /**
   * 加载用户报告
   */
  loadReport() {
    try {
      // 获取用户档案
      const userProfile = app.getUserProfile();
      if (!userProfile || !userProfile.styleReport) {
        tt.showModal({
          title: '提示',
          content: '暂无个人风格报告，请先完成测试',
          confirmText: '去测试',
          success: (res) => {
            if (res.confirm) {
              tt.navigateTo({
                url: '/pages/test/test'
              });
            }
          }
        });
        return;
      }

      this.setData({
        userProfile: userProfile,
        styleReport: userProfile.styleReport,
        loading: false
      });

    } catch (error) {
      console.error('加载报告失败:', error);
      this.setData({
        loading: false
      });
      tt.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 返回主页
   */
  goToHome() {
    tt.switchTab({
      url: '/pages/index/index'
    });
  },

  /**
   * 重新测试
   */
  retakeTest() {
    tt.showModal({
      title: '确认重新测试',
      content: '重新测试将清除当前报告，确定要继续吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除本地存储的测试数据
          try {
            tt.removeStorageSync('user_profile');
            tt.removeStorageSync('test_progress');
            
            // 跳转到测试页面
            tt.redirectTo({
              url: '/pages/test/test'
            });
          } catch (error) {
            console.error('清除数据失败:', error);
            tt.showToast({
              title: '操作失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  /**
   * 分享报告
   */
  shareReport() {
    tt.showShareMenu({
      withShareTicket: true,
      success: () => {
        console.log('分享菜单显示成功');
      },
      fail: () => {
        tt.showToast({
          title: '分享功能暂不可用',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 每次显示页面时重新加载数据，以防数据更新
    this.loadReport();
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    const styleReport = this.data.styleReport;
    return {
      title: `我的个人风格是${styleReport?.season_analysis?.season_12 || '优雅知性'}，快来测试你的吧！`,
      path: '/pages/index/index',
      imageUrl: '/assets/share-cover.jpg' // 可以后续添加分享封面图
    };
  }
});