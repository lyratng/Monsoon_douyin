// 单品建议历史页面
Page({
  data: {
    historyList: [],
    isEmpty: true
  },

  onLoad() {
    console.log('单品建议历史页面加载');
  },

  onShow() {
    this.loadHistory();
  },

  // 加载历史记录
  loadHistory() {
    try {
      const history = tt.getStorageSync('item_analysis_history') || [];
      
      // 格式化时间显示
      const formattedHistory = history.map(item => ({
        ...item,
        displayTime: this.formatTime(item.timestamp)
      }));
      
      this.setData({
        historyList: formattedHistory,
        isEmpty: formattedHistory.length === 0
      });
      console.log('📜 加载历史记录:', formattedHistory.length, '条');
    } catch (e) {
      console.error('加载历史失败:', e);
      this.setData({
        historyList: [],
        isEmpty: true
      });
    }
  },

  // 格式化时间
  formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}/${month}/${day} ${hour}:${minute}`;
  },

  // 查看历史详情
  viewDetail(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.historyList[index];
    
    if (item) {
      // 保存到全局，供详情页读取
      getApp().globalData.currentAnalysisResult = {
        image: item.image,
        clothingInfo: item.clothingInfo,
        suitabilityResult: item.suitabilityResult,
        timestamp: item.timestamp
      };
      
      tt.navigateTo({
        url: '/packageTools/pages/item-result/item-result'
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
    
    tt.setStorageSync('item_analysis_history', history);
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
          tt.removeStorageSync('item_analysis_history');
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











