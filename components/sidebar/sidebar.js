/**
 * 侧边栏组件
 * 显示用户信息、寓言币余额、消费记录
 */
const userUtils = require('../../utils/user');

Component({
  properties: {
    // 是否显示侧边栏
    show: {
      type: Boolean,
      value: false
    }
  },

  data: {
    animationClass: '',
    userInfo: null,
    coinBalance: 0,
    isFirstCharge: true,
    transactions: [],
    isLoading: true
  },

  observers: {
    'show': function(show) {
      if (show) {
        // 显示时添加动画并加载数据
        setTimeout(() => {
          this.setData({ animationClass: 'show' });
        }, 50);
        this.loadUserData();
      } else {
        this.setData({ animationClass: '' });
      }
    }
  },

  methods: {
    // 加载用户数据
    async loadUserData() {
      this.setData({ isLoading: true });
      
      try {
        // 并行加载用户信息、余额、消费记录
        const [userInfo, balanceData, transactions] = await Promise.all([
          userUtils.getUserInfo(),
          userUtils.getCoinBalance(),
          userUtils.getCoinTransactions(20)
        ]);
        
        this.setData({
          userInfo: userInfo,
          coinBalance: balanceData.balance,
          isFirstCharge: balanceData.isFirstCharge,
          transactions: transactions,
          isLoading: false
        });
      } catch (error) {
        console.error('[Sidebar] 加载数据失败:', error);
        this.setData({ isLoading: false });
      }
    },
    
    // 刷新余额
    async refreshBalance() {
      const balanceData = await userUtils.getCoinBalance();
      this.setData({
        coinBalance: balanceData.balance,
        isFirstCharge: balanceData.isFirstCharge
      });
    },
    
    // 点击遮罩层关闭
    handleMaskClick() {
      this.close();
    },
    
    // 阻止内容区点击冒泡
    handleContentClick() {
      // 阻止冒泡
    },
    
    // 关闭侧边栏
    close() {
      this.setData({ animationClass: '' });
      setTimeout(() => {
        this.triggerEvent('close');
      }, 300);
    },
    
    // 点击充值
    handleRecharge() {
      this.triggerEvent('recharge');
    },
    
    // 点击邀请好友
    handleInvite() {
      this.triggerEvent('invite');
    },
    
    // 点击登录
    handleLogin() {
      this.triggerEvent('login');
    },
    
    // 格式化时间
    formatTime(timeStr) {
      if (!timeStr) return '';
      // 只显示月-日 时:分
      const date = new Date(timeStr.replace(' ', 'T'));
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const hour = date.getHours().toString().padStart(2, '0');
      const minute = date.getMinutes().toString().padStart(2, '0');
      return `${month}-${day} ${hour}:${minute}`;
    },
    
    // 获取交易类型的图标
    getTypeIcon(type) {
      const icons = {
        'initial': '🎁',
        'consume': '💫',
        'recharge': '💰',
        'first_bonus': '🎊',
        'invite_reward': '👥',
        'invited_reward': '🎉'
      };
      return icons[type] || '📝';
    }
  }
});

