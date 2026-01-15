/**
 * 充值卡片组件
 * 显示充值选项
 */
const paymentUtils = require('../../utils/payment');
const userUtils = require('../../utils/user');

Component({
  properties: {
    // 是否显示
    show: {
      type: Boolean,
      value: false
    },
    // 是否首充（显示首充奖励）
    isFirstCharge: {
      type: Boolean,
      value: true
    },
    // 当前余额
    currentBalance: {
      type: Number,
      value: 0
    }
  },

  data: {
    animationClass: '',
    selectedPlan: 1, // 默认选中中间档
    rechargePlans: [
      {
        id: 0,
        price: 5,
        coins: 10,
        tag: '',
        productId: 'coins_10'
      },
      {
        id: 1,
        price: 12,
        coins: 30,
        tag: '最受欢迎',
        productId: 'coins_30'
      },
      {
        id: 2,
        price: 20,
        coins: 60,
        tag: '最划算',
        productId: 'coins_60'
      }
    ],
    isPayLoading: false
  },

  observers: {
    'show': function(show) {
      if (show) {
        setTimeout(() => {
          this.setData({ animationClass: 'show' });
        }, 50);
      } else {
        this.setData({ animationClass: '' });
      }
    }
  },

  methods: {
    // 选择充值档位
    selectPlan(e) {
      const planId = e.currentTarget.dataset.id;
      this.setData({ selectedPlan: planId });
    },
    
    // 确认充值
    handleRecharge() {
      const selectedPlan = this.data.rechargePlans[this.data.selectedPlan];
      
      if (this.data.isPayLoading) return;
      
      // 检查登录状态
      const openid = userUtils.getOpenid();
      if (!openid) {
        tt.showToast({
          title: '请先登录',
          icon: 'none'
        });
        this.triggerEvent('needlogin');
        return;
      }
      
      this.setData({ isPayLoading: true });
      
      // 调用支付
      paymentUtils.startPayment(
        openid,
        selectedPlan.productId,
        // 成功回调
        (result) => {
          console.log('[RechargeCard] 支付成功:', result);
          this.setData({ isPayLoading: false });
          
          // 触发充值成功事件
          this.triggerEvent('rechargesuccess', {
            plan: selectedPlan,
            result: result
          });
          
          // 关闭充值卡片
          this.close();
        },
        // 失败回调
        (error) => {
          console.log('[RechargeCard] 支付失败或取消:', error);
          this.setData({ isPayLoading: false });
        }
      );
    },
    
    // 重置加载状态（供外部调用）
    resetLoading() {
      this.setData({ isPayLoading: false });
    },
    
    // 点击邀请好友
    handleInvite() {
      this.triggerEvent('invite');
    },
    
    // 点击遮罩层关闭
    handleMaskClick() {
      this.close();
    },
    
    // 阻止内容区点击冒泡
    handleContentClick() {
      // 阻止冒泡
    },
    
    // 关闭
    close() {
      if (this.data.isPayLoading) return; // 支付中不允许关闭
      
      this.setData({ animationClass: '' });
      setTimeout(() => {
        this.triggerEvent('close');
      }, 300);
    }
  }
});

