/**
 * 支付工具函数
 * 使用担保支付 (tt.pay)
 */

const API_BASE = 'https://api.radiance.asia';

/**
 * 从服务端创建订单
 */
async function createOrder(openid, productId) {
  return new Promise((resolve, reject) => {
    tt.request({
      url: `${API_BASE}/api/payment/create`,
      method: 'POST',
      data: { openid, product_id: productId },
      header: { 'Content-Type': 'application/json' },
      success: (res) => {
        if (res.statusCode === 200 && res.data.success) {
          resolve(res.data);
        } else {
          reject(new Error(res.data.message || '创建订单失败'));
        }
      },
      fail: (err) => {
        console.error('[Payment] 创建订单请求失败:', err);
        reject(new Error('网络错误，请重试'));
      }
    });
  });
}

/**
 * 调用 tt.pay 拉起收银台
 */
function callPay(orderInfo) {
  return new Promise((resolve, reject) => {
    console.log('[Payment] tt.pay 参数:', orderInfo);
    
    tt.pay({
      orderInfo: orderInfo,
      service: 5,  // 担保支付
      success: (res) => {
        console.log('[Payment] tt.pay 成功:', res);
        // code: 0=成功, 1=超时, 2=失败, 3=取消, 9=订单状态更新
        if (res.code === 0 || res.code === 9) {
          resolve({ success: true, code: res.code });
        } else if (res.code === 3) {
          resolve({ success: false, code: 3, message: '支付已取消' });
        } else {
          resolve({ success: false, code: res.code, message: '支付失败' });
        }
      },
      fail: (err) => {
        console.error('[Payment] tt.pay 失败:', err);
        reject(new Error(err.errMsg || '支付失败'));
      }
    });
  });
}

/**
 * 查询订单状态
 */
async function queryOrderStatus(orderNo) {
  return new Promise((resolve, reject) => {
    tt.request({
      url: `${API_BASE}/api/payment/status?order_no=${orderNo}`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200 && res.data.success) {
          resolve(res.data.data);
        } else {
          reject(new Error(res.data.message || '查询订单失败'));
        }
      },
      fail: () => reject(new Error('网络错误'))
    });
  });
}

/**
 * 模拟支付成功（测试用）
 */
async function mockPaySuccess(orderNo) {
  return new Promise((resolve, reject) => {
    tt.request({
      url: `${API_BASE}/api/payment/mock-success`,
      method: 'POST',
      data: { order_no: orderNo },
      header: { 'Content-Type': 'application/json' },
      success: (res) => {
        if (res.statusCode === 200 && res.data.success) {
          resolve(res.data.data);
        } else {
          reject(new Error(res.data.message || '模拟支付失败'));
        }
      },
      fail: () => reject(new Error('网络错误'))
    });
  });
}

/**
 * 完整的支付流程
 * 使用担保支付：后端预下单 -> tt.pay
 */
async function startPayment(openid, productId, onSuccess, onFail) {
  try {
    // 1. 显示加载中
    tt.showLoading({ title: '创建订单中...' });
    
    // 2. 从服务端获取订单信息
    const orderResult = await createOrder(openid, productId);
    console.log('[Payment] 订单创建成功:', orderResult);
    
    const { order_no, order_id, order_token, coins } = orderResult.data;
    
    tt.hideLoading();
    
    // 3. 检查是否有 order_id（正式支付）
    if (!order_id || !order_token) {
      // 模拟支付模式
      tt.showModal({
        title: '支付功能开发中',
        content: '是否模拟支付成功？（仅用于测试）',
        confirmText: '模拟支付',
        cancelText: '取消',
        success: async (modalRes) => {
          if (modalRes.confirm) {
            tt.showLoading({ title: '处理中...' });
            try {
              const mockResult = await mockPaySuccess(order_no);
              tt.hideLoading();
              tt.showToast({ title: '充值成功！', icon: 'success', duration: 2000 });
              if (onSuccess) onSuccess({ orderNo: order_no, coins: mockResult.coins, balance: mockResult.balance });
            } catch (err) {
              tt.hideLoading();
              tt.showToast({ title: err.message, icon: 'none' });
              if (onFail) onFail(err);
            }
          } else {
            if (onFail) onFail(new Error('用户取消'));
          }
        }
      });
      return;
    }
    
    // 4. 构建 orderInfo 并调用 tt.pay
    const orderInfo = {
      order_id: order_id,
      order_token: order_token
    };
    
    const payResult = await callPay(orderInfo);
    
    if (payResult.success) {
      // 5. 支付成功，轮询确认订单状态
      tt.showLoading({ title: '确认支付结果...' });
      
      let retryCount = 0;
      const maxRetry = 10;
      
      const checkStatus = async () => {
        try {
          const status = await queryOrderStatus(order_no);
          if (status.status === 'paid') {
            tt.hideLoading();
            tt.showToast({ title: '充值成功！', icon: 'success', duration: 2000 });
            if (onSuccess) onSuccess({ orderNo: order_no, coins: status.coins, balance: null });
            return;
          }
        } catch (e) {
          console.log('[Payment] 查询订单状态失败:', e);
        }
        
        retryCount++;
        if (retryCount < maxRetry) {
          setTimeout(checkStatus, 1000);
        } else {
          tt.hideLoading();
          tt.showToast({ title: '支付成功，请稍后查看余额', icon: 'success' });
          if (onSuccess) onSuccess({ orderNo: order_no, coins: coins, balance: null });
        }
      };
      
      checkStatus();
      
    } else {
      // 支付取消或失败
      if (payResult.code === 3) {
        tt.showToast({ title: '已取消支付', icon: 'none' });
      } else {
        tt.showToast({ title: payResult.message || '支付失败', icon: 'none' });
      }
      if (onFail) onFail(new Error(payResult.message));
    }
    
  } catch (error) {
    tt.hideLoading();
    console.error('[Payment] 支付流程错误:', error);
    tt.showToast({ title: error.message || '支付失败', icon: 'none' });
    if (onFail) onFail(error);
  }
}

module.exports = {
  createOrder,
  callPay,
  queryOrderStatus,
  mockPaySuccess,
  startPayment
};
