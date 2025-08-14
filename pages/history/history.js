Page({
  data: {
    historyReports: [],
    loading: true
  },

  onLoad() {
    this.loadHistoryReports();
  },

  onShow() {
    this.loadHistoryReports();
  },

  // 加载历史报告
  loadHistoryReports() {
    try {
      const reports = tt.getStorageSync('historyReports') || [];
      this.setData({
        historyReports: reports,
        loading: false
      });
      console.log('加载历史报告:', reports.length, '份');
    } catch (error) {
      console.error('加载历史报告失败:', error);
      this.setData({ loading: false });
    }
  },

  // 查看报告详情
  viewReport(e) {
    const index = e.currentTarget.dataset.index;
    const report = this.data.historyReports[index];
    
    // 设置当前报告到全局数据
    getApp().globalData.currentReport = report;
    
    // 跳转到报告页面
    tt.navigateTo({
      url: '/pages/report/report'
    });
  },

  // 删除报告
  deleteReport(e) {
    const index = e.currentTarget.dataset.index;
    const report = this.data.historyReports[index];
    
    tt.showModal({
      title: '确认删除',
      content: `确定要删除 ${report.date} 的报告吗？`,
      success: (res) => {
        if (res.confirm) {
          this.removeReport(index);
        }
      }
    });
  },

  // 移除报告
  removeReport(index) {
    try {
      const reports = [...this.data.historyReports];
      reports.splice(index, 1);
      
      // 更新本地存储
      tt.setStorageSync('historyReports', reports);
      
      // 更新页面数据
      this.setData({
        historyReports: reports
      });
      
      tt.showToast({
        title: '删除成功',
        icon: 'success'
      });
      
      console.log('删除报告成功，剩余:', reports.length, '份');
    } catch (error) {
      console.error('删除报告失败:', error);
      tt.showToast({
        title: '删除失败',
        icon: 'error'
      });
    }
  },

  // 清空所有报告
  clearAllReports() {
    if (this.data.historyReports.length === 0) {
      tt.showToast({
        title: '暂无报告',
        icon: 'none'
      });
      return;
    }
    
    tt.showModal({
      title: '确认清空',
      content: '确定要清空所有历史报告吗？此操作不可恢复。',
      success: (res) => {
        if (res.confirm) {
          try {
            tt.removeStorageSync('historyReports');
            this.setData({
              historyReports: []
            });
            
            tt.showToast({
              title: '清空成功',
              icon: 'success'
            });
            
            console.log('清空所有报告成功');
          } catch (error) {
            console.error('清空报告失败:', error);
            tt.showToast({
              title: '清空失败',
              icon: 'error'
            });
          }
        }
      }
    });
  },

  // 返回首页
  goHome() {
    tt.switchTab({
      url: '/pages/index/index'
    });
  }
});
