// pages/shopping-history/shopping-history.js - 历史购物建议页面

const app = getApp();

Page({
  data: {
    shoppingHistory: [],
    loading: true,
    swipedIndex: -1 // 当前左滑的索引
  },

  onLoad() {
    this.loadShoppingHistory();
  },

  onShow() {
    this.loadShoppingHistory();
  },

  // 加载历史购物建议
  loadShoppingHistory() {
    try {
      const history = app.getShoppingHistory();
      
      // 调试：检查每个记录的分数
      console.log('=== 加载历史购物建议调试 ===');
      console.log('原始history数据:', history);
      console.log('history长度:', history.length);
      console.log('history类型:', typeof history);
      
      history.forEach((item, index) => {
        console.log(`=== 记录${index + 1}详情 ===`);
        console.log('完整item对象:', item);
        console.log('item.score:', item.score, '类型:', typeof item.score);
        console.log('item.colorMatch:', item.colorMatch, '类型:', typeof item.colorMatch);
        console.log('item.styleMatch:', item.styleMatch, '类型:', typeof item.styleMatch);
        console.log('item.materialMatch:', item.materialMatch, '类型:', typeof item.materialMatch);
        console.log('计算百分比 - score:', item.score ? Math.round(item.score * 100) + '%' : 'N/A');
        console.log('计算百分比 - colorMatch:', item.colorMatch ? Math.round(item.colorMatch * 100) + '%' : 'N/A');
        console.log('计算百分比 - styleMatch:', item.styleMatch ? Math.round(item.styleMatch * 100) + '%' : 'N/A');
        console.log('计算百分比 - materialMatch:', item.materialMatch ? Math.round(item.materialMatch * 100) + '%' : 'N/A');
      });
      
      // 为每个历史记录添加百分比字段
      const historyWithPercent = history.map(item => ({
        ...item,
        scorePercent: Math.round((item.score || 0) * 100),
        colorMatchPercent: Math.round((item.colorMatch || 0) * 100),
        styleMatchPercent: Math.round((item.styleMatch || 0) * 100),
        materialMatchPercent: Math.round((item.materialMatch || 0) * 100)
      }));
      
      console.log('添加百分比后的历史数据:', historyWithPercent);
      
      this.setData({
        shoppingHistory: historyWithPercent,
        loading: false
      });
      console.log('加载历史购物建议:', history.length, '条');
    } catch (error) {
      console.error('加载历史购物建议失败:', error);
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
          [`shoppingHistory[${this.currentIndex}].swipeDistance`]: swipeDistance
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

  // 查看购物建议详情
  viewShoppingAdvice(e) {
    const index = e.currentTarget.dataset.index;
    const advice = this.data.shoppingHistory[index];
    
    console.log('点击查看购物建议:', advice);
    
    // 如果当前有左滑状态，先隐藏
    if (this.data.swipedIndex !== -1) {
      this.setData({
        swipedIndex: -1
      });
      return;
    }
    
    // 设置当前购物建议到全局数据
    app.globalData.currentShoppingAdvice = advice;
    
    // 跳转到购物建议页面并显示结果
    tt.navigateTo({
      url: '/pages/shopping/shopping?showResult=true',
      success: () => {
        console.log('导航成功');
      },
      fail: (error) => {
        console.error('导航失败:', error);
      }
    });
  },

  // 删除购物建议
  deleteShoppingAdvice(e) {
    const index = e.currentTarget.dataset.index;
    const advice = this.data.shoppingHistory[index];
    
    tt.showModal({
      title: '确认删除',
      content: `确定要删除 ${advice.date} 的购物建议吗？`,
      success: (res) => {
        if (res.confirm) {
          this.removeShoppingAdvice(index);
        }
      }
    });
  },

  // 移除购物建议
  removeShoppingAdvice(index) {
    try {
      const history = [...this.data.shoppingHistory];
      history.splice(index, 1);
      
      // 更新本地存储
      app.saveShoppingHistory(history);
      
      // 更新页面数据
      this.setData({
        shoppingHistory: history,
        swipedIndex: -1
      });
      
      tt.showToast({
        title: '删除成功',
        icon: 'success'
      });
      
      console.log('删除购物建议成功，剩余:', history.length, '条');
    } catch (error) {
      console.error('删除购物建议失败:', error);
      tt.showToast({
        title: '删除失败',
        icon: 'error'
      });
    }
  },

  // 清空所有购物建议
  clearAllShoppingAdvice() {
    if (this.data.shoppingHistory.length === 0) {
      tt.showToast({
        title: '暂无记录',
        icon: 'none'
      });
      return;
    }
    
    tt.showModal({
      title: '确认清空',
      content: '确定要清空所有历史购物建议吗？此操作不可恢复。',
      success: (res) => {
        if (res.confirm) {
          try {
            app.saveShoppingHistory([]);
            this.setData({
              shoppingHistory: [],
              swipedIndex: -1
            });
            
            tt.showToast({
              title: '清空成功',
              icon: 'success'
            });
            
            console.log('清空所有购物建议成功');
          } catch (error) {
            console.error('清空购物建议失败:', error);
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
