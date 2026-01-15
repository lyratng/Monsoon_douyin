// 穿搭优化历史页面
Page({
  data: {
    historyList: [],
    isEmpty: true
  },

  onLoad() {
    console.log('穿搭优化历史页面加载');
  },

  onShow() {
    this.loadHistory();
  },

  // 加载历史记录
  loadHistory() {
    try {
      const history = tt.getStorageSync('outfitOptimizationHistory') || [];
      this.setData({
        historyList: history,
        isEmpty: history.length === 0
      });
      console.log('📜 加载历史记录:', history.length, '条');
    } catch (e) {
      console.error('加载历史失败:', e);
      this.setData({
        historyList: [],
        isEmpty: true
      });
    }
  },

  // 查看历史详情
  viewDetail(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.historyList[index];
    
    if (item) {
      // 保存到临时存储，供详情页读取
      tt.setStorageSync('outfitOptimizationResult', item);
      tt.navigateTo({
        url: '/packageTools/pages/outfit-result/outfit-result'
      });
    }
  },

  // 长按删除
  onLongPress(e) {
    const index = e.currentTarget.dataset.index;
    const self = this;
    
    tt.showActionSheet({
      itemList: ['删除此记录'],
      success(res) {
        if (res.tapIndex === 0) {
          self.deleteItem(index);
        }
      }
    });
  },

  // 删除单条记录
  deleteItem(index) {
    const history = this.data.historyList.slice();
    history.splice(index, 1);
    
    tt.setStorageSync('outfitOptimizationHistory', history);
    this.setData({
      historyList: history,
      isEmpty: history.length === 0
    });
    
    tt.showToast({
      title: '已删除',
      icon: 'success'
    });
  },

  // 清空所有历史
  clearAll() {
    const self = this;
    tt.showModal({
      title: '',
      content: '确定要清空所有历史记录吗？',
      confirmText: '清空',
      confirmColor: '#2C2C2C',
      success(res) {
        if (res.confirm) {
          tt.removeStorageSync('outfitOptimizationHistory');
          self.setData({
            historyList: [],
            isEmpty: true
          });
          
          tt.showToast({
            title: '已清空',
            icon: 'success'
          });
        }
      }
    });
  }
});
