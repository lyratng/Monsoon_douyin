/**
 * 登录弹窗组件
 * 支持抖音用户信息授权登录 + 手机号登录（需上线后申请）
 */
const userUtils = require('../../utils/user');

Component({
  properties: {
    // 是否显示弹窗
    show: {
      type: Boolean,
      value: false
    },
    // 邀请人openid（从分享链接获取）
    inviterOpenid: {
      type: String,
      value: ''
    },
    // 是否启用手机号登录（小程序上线并申请能力后设为true）
    enablePhoneLogin: {
      type: Boolean,
      value: false
    }
  },

  data: {
    isLoading: false,
    animationClass: ''
  },

  observers: {
    'show': function(show) {
      if (show) {
        // 显示时添加动画
        setTimeout(() => {
          this.setData({ animationClass: 'show' });
        }, 50);
      } else {
        this.setData({ animationClass: '' });
      }
    }
  },

  methods: {
    // 抖音用户信息授权登录（主要方式）
    handleDouyinLogin() {
      console.log('[LoginPopup] 开始抖音授权登录');
      this.setData({ isLoading: true });
      
      // 先获取用户信息
      tt.getUserProfile({
        desc: '用于完善用户资料',
        success: (profileRes) => {
          console.log('[LoginPopup] 获取用户信息成功:', profileRes.userInfo);
          
          // 调用登录（不带手机号）
          userUtils.loginWithUserInfo(
            profileRes.userInfo,
            this.properties.inviterOpenid
          ).then(userData => {
            console.log('[LoginPopup] 登录成功:', userData);
            this.handleLoginSuccess(userData);
          }).catch(error => {
            console.error('[LoginPopup] 登录失败:', error);
            this.setData({ isLoading: false });
            tt.showToast({
              title: error.message || '登录失败，请重试',
              icon: 'none'
            });
          });
        },
        fail: (err) => {
          console.log('[LoginPopup] 用户拒绝授权:', err);
          this.setData({ isLoading: false });
          tt.showToast({
            title: '需要授权才能登录哦',
            icon: 'none'
          });
        }
      });
    },
    
    // 处理获取手机号（备用方式，需上线后申请能力）
    handleGetPhoneNumber(e) {
      console.log('[LoginPopup] 手机号授权结果:', JSON.stringify(e.detail));
      
      // 检查是否有加密数据
      if (!e.detail.encryptedData || !e.detail.iv) {
        console.log('[LoginPopup] 手机号授权失败或用户拒绝');
        tt.showToast({
          title: '手机号授权失败，请使用抖音授权登录',
          icon: 'none'
        });
        return;
      }
      
      this.setData({ isLoading: true });
      
      // 调用登录
      userUtils.loginWithPhone(
        e.detail.encryptedData,
        e.detail.iv,
        this.properties.inviterOpenid
      ).then(userData => {
        console.log('[LoginPopup] 手机号登录成功:', userData);
        this.handleLoginSuccess(userData);
      }).catch(error => {
        console.error('[LoginPopup] 登录失败:', error);
        this.setData({ isLoading: false });
        tt.showToast({
          title: error.message || '登录失败，请重试',
          icon: 'none'
        });
      });
    },
    
    // 登录成功统一处理
    handleLoginSuccess(userData) {
      // 显示欢迎提示
      let welcomeMsg = '登录成功！';
      if (userData.is_new_user) {
        welcomeMsg = '欢迎加入！已赠送10枚寓言币';
        if (userData.invite_reward > 0) {
          welcomeMsg = '欢迎加入！获得20枚寓言币';
        }
      }
      
      tt.showToast({
        title: welcomeMsg,
        icon: 'success',
        duration: 2000
      });
      
      this.setData({ isLoading: false });
      
      // 触发登录成功事件
      this.triggerEvent('loginsuccess', userData);
      
      // 关闭弹窗
      this.close();
    },
    
    // 点击遮罩层关闭
    handleMaskClick() {
      this.close();
    },
    
    // 阻止内容区点击冒泡
    handleContentClick() {
      // 阻止冒泡
    },
    
    // 关闭弹窗
    close() {
      this.setData({ animationClass: '' });
      setTimeout(() => {
        this.triggerEvent('close');
      }, 300);
    },
    
    // 稍后登录
    handleLater() {
      this.close();
    }
  }
});

