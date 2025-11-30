// pages/item-history/item-history.js
const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    historyList: [],
    loading: true,
    isEmpty: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadHistory();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 每次显示页面时重新加载历史记录，以防有新的分析结果
    this.loadHistory();
  },

  /**
   * 加载历史记录
   */
  loadHistory() {
    this.setData({
      loading: true
    });

    try {
      const history = tt.getStorageSync('item_analysis_history') || [];
      console.log('加载历史记录:', history);
      
      // 处理历史记录数据，添加格式化信息
      const processedHistory = history.map(item => {
        // 数据迁移：确保图片路径存在
        if (!item.image.path && item.thumbnail) {
          item.image.path = item.thumbnail;
        }
        
        return {
          ...item,
          formattedTime: this.formatTime(item.timestamp),
          scoreStars: this.generateStars(item.suitabilityResult?.overall_evaluation?.suitability_score || 3),
          categoryDisplay: this.getCategoryDisplay(item.clothingInfo?.category),
          colorDisplay: item.clothingInfo?.color?.main || '未知颜色'
        };
      });

      this.setData({
        historyList: processedHistory,
        isEmpty: processedHistory.length === 0,
        loading: false
      });

    } catch (error) {
      console.error('加载历史记录失败:', error);
      this.setData({
        historyList: [],
        isEmpty: true,
        loading: false
      });
      
      tt.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 格式化时间显示
   */
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // 小于1小时显示"刚刚"
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000));
      return minutes < 1 ? '刚刚' : `${minutes}分钟前`;
    }
    
    // 小于24小时显示小时
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `${hours}小时前`;
    }
    
    // 小于7天显示天数
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      return `${days}天前`;
    }
    
    // 超过7天显示具体日期
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  },

  /**
   * 生成星级显示数组
   */
  generateStars(score) {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(i <= score);
    }
    return stars;
  },

  /**
   * 获取分类显示名称
   */
  getCategoryDisplay(category) {
    const categoryMap = {
      'Jacket': '外套',
      'Trousers': '裤装',
      'Sneakers': '运动鞋',
      'Handbag': '手提包',
      'Necklace': '项链',
      'Shirt': '衬衫',
      'Dress': '连衣裙',
      'Skirt': '裙装',
      'Shoes': '鞋履',
      'Accessories': '配饰'
    };
    return categoryMap[category] || category || '未知类型';
  },

  /**
   * 查看详细分析结果
   */
  viewDetail(e) {
    const index = e.currentTarget.dataset.index;
    const historyItem = this.data.historyList[index];
    
    if (!historyItem) {
      tt.showToast({
        title: '记录不存在',
        icon: 'none'
      });
      return;
    }

    // 构造结果数据格式，与分析页面保持一致
    const resultData = {
      image: {
        path: historyItem.image.path || historyItem.thumbnail || '/assets/images/placeholder.jpg',
        name: historyItem.image.name,
        type: historyItem.image.type
      },
      clothingInfo: historyItem.clothingInfo,
      suitabilityResult: historyItem.suitabilityResult,
      timestamp: historyItem.timestamp
    };

    // 存储到全局数据
    app.globalData.currentAnalysisResult = resultData;
    
    // 跳转到结果页面
    tt.navigateTo({
      url: '/pages/item-result/item-result'
    });
  },

  /**
   * 删除单条记录
   */
  deleteItem(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.historyList[index];
    
    tt.showModal({
      title: '确认删除',
      content: `确定要删除这条分析记录吗？`,
      confirmText: '删除',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.performDelete(index);
        }
      }
    });
  },

  /**
   * 执行删除操作
   */
  performDelete(index) {
    try {
      // 从当前列表中删除
      const newHistoryList = [...this.data.historyList];
      newHistoryList.splice(index, 1);
      
      // 更新本地存储
      const storageData = newHistoryList.map(item => ({
        id: item.id,
        timestamp: item.timestamp,
        image: item.image,
        clothingInfo: item.clothingInfo,
        suitabilityResult: item.suitabilityResult,
        thumbnail: item.thumbnail
      }));
      
      tt.setStorageSync('item_analysis_history', storageData);
      
      // 更新页面数据
      this.setData({
        historyList: newHistoryList,
        isEmpty: newHistoryList.length === 0
      });
      
      tt.showToast({
        title: '删除成功',
        icon: 'success'
      });
      
    } catch (error) {
      console.error('删除记录失败:', error);
      tt.showToast({
        title: '删除失败',
        icon: 'none'
      });
    }
  },

  /**
   * 清空所有历史记录
   */
  clearAll() {
    if (this.data.historyList.length === 0) {
      return;
    }
    
    tt.showModal({
      title: '确认清空',
      content: '确定要清空所有历史记录吗？此操作不可恢复。',
      confirmText: '清空',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          try {
            tt.removeStorageSync('item_analysis_history');
            this.setData({
              historyList: [],
              isEmpty: true
            });
            
            tt.showToast({
              title: '清空成功',
              icon: 'success'
            });
          } catch (error) {
            console.error('清空历史记录失败:', error);
            tt.showToast({
              title: '清空失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  /**
   * 返回单品建议页面
   */
  goBack() {
    tt.navigateBack();
  },

  /**
   * 去分析新单品
   */
  analyzeNew() {
    tt.navigateBack();
  }
});