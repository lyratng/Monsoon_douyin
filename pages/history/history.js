Page({
  data: {
    historyReports: [],
    loading: true,
    swipedIndex: -1 // 当前左滑的索引
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

  // 触摸开始
  onTouchStart(e) {
    const index = e.currentTarget.dataset.index;
    const touch = e.touches[0];
    
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.currentIndex = index;
    
    console.log('触摸开始:', index, '位置:', touch.clientX, touch.clientY);
  },

  // 触摸移动
  onTouchMove(e) {
    if (this.currentIndex === undefined) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;
    
    // 判断是否为水平滑动
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      e.preventDefault();
      
      // 只允许向左滑动
      if (deltaX < 0) {
        const swipeDistance = Math.min(Math.abs(deltaX), 120);
        this.setData({
          [`historyReports[${this.currentIndex}].swipeDistance`]: swipeDistance
        });
      }
    }
  },

  // 触摸结束
  onTouchEnd(e) {
    if (this.currentIndex === undefined) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - this.touchStartX;
    
    // 如果左滑距离超过60rpx，显示删除按钮
    if (deltaX < -60) {
      this.setData({
        swipedIndex: this.currentIndex
      });
      console.log('显示删除按钮:', this.currentIndex);
    } else {
      // 否则隐藏删除按钮
      this.setData({
        swipedIndex: -1
      });
      console.log('隐藏删除按钮');
    }
    
    // 重置触摸状态
    this.currentIndex = undefined;
    this.touchStartX = undefined;
    this.touchStartY = undefined;
  },

  // 查看报告详情
  viewReport(e) {
    const index = e.currentTarget.dataset.index;
    const report = this.data.historyReports[index];
    
    console.log('点击查看报告:', report);
    
    // 如果当前有左滑状态，先隐藏
    if (this.data.swipedIndex !== -1) {
      this.setData({
        swipedIndex: -1
      });
      return;
    }
    
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
        historyReports: reports,
        swipedIndex: -1
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
              historyReports: [],
              swipedIndex: -1
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
    tt.reLaunch({
      url: '/pages/index/index'
    });
  }
});
