// pages/report/report.js - 报告展示页面逻辑

const app = getApp();

Page({
  data: {
    report: null,
    isLoading: true,
    showColorPopup: false,
    showStylePopup: false,
    showMaterialPopup: false,
    currentPopup: null
  },

  onLoad() {
    console.log('报告页面加载');
    this.loadReport();
  },

  // 加载报告数据
  loadReport() {
    const report = app.globalData.currentReport;
    if (report) {
      console.log('加载报告数据:', report);
      this.setData({
        report: report,
        isLoading: false
      });
    } else {
      console.error('报告数据缺失');
      tt.showToast({
        title: '报告数据缺失',
        icon: 'error'
      });
      setTimeout(() => {
        tt.navigateBack();
      }, 1500);
    }
  },

  // 显示色板弹窗
  showColorPopup() {
    this.setData({
      showColorPopup: true,
      currentPopup: 'color'
    });
  },

  // 显示风格弹窗
  showStylePopup() {
    this.setData({
      showStylePopup: true,
      currentPopup: 'style'
    });
  },

  // 显示材质弹窗
  showMaterialPopup() {
    this.setData({
      showMaterialPopup: true,
      currentPopup: 'material'
    });
  },

  // 关闭弹窗
  closePopup() {
    this.setData({
      showColorPopup: false,
      showStylePopup: false,
      showMaterialPopup: false,
      currentPopup: null
    });
  },

  // 返回主页
  goHome() {
    tt.reLaunch({
      url: '/pages/index/index'
    });
  },

  // 查看历史报告
  viewHistory() {
    tt.navigateTo({
      url: '/pages/history/history'
    });
  },

  // 分享报告
  shareReport() {
    tt.showShareMenu({
      withShareTicket: true,
      success: () => {
        console.log('显示分享菜单成功');
      },
      fail: (err) => {
        console.error('显示分享菜单失败:', err);
        tt.showToast({
          title: '分享功能暂不可用',
          icon: 'none'
        });
      }
    });
  },

  // 分享回调
  onShareAppMessage() {
    const report = this.data.report;
    return {
      title: `我的个人风格报告 - ${report?.mainColorTone?.type || '季风 Monsoon'}`,
      path: '/pages/index/index',
      imageUrl: '/assets/images/share-cover.png'
    };
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  }
}); 