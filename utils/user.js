/**
 * 用户系统工具函数
 * 处理登录、用户信息、寓言币等功能
 */

const API_BASE = 'https://api.radiance.asia';

// 用户状态缓存
let userCache = {
  openid: null,
  userInfo: null,
  isLoggedIn: false
};

/**
 * 静默登录 - 获取 openid，检查是否已注册
 * @returns {Promise<{openid: string, isRegistered: boolean, user: object|null}>}
 */
async function silentLogin() {
  return new Promise((resolve, reject) => {
    tt.login({
      success: async (loginRes) => {
        if (!loginRes.code) {
          reject(new Error('获取登录凭证失败'));
          return;
        }
        
        try {
          const response = await request('/api/user/silent-login', 'POST', {
            code: loginRes.code
          });
          
          if (response.success) {
            userCache.openid = response.data.openid;
            if (response.data.is_registered && response.data.user) {
              userCache.userInfo = response.data.user;
              userCache.isLoggedIn = true;
              // 保存到本地存储
              tt.setStorageSync('user_openid', response.data.openid);
              tt.setStorageSync('user_info', response.data.user);
            }
            resolve(response.data);
          } else {
            reject(new Error(response.message || '静默登录失败'));
          }
        } catch (error) {
          console.error('[User] 静默登录请求失败:', error);
          reject(error);
        }
      },
      fail: (err) => {
        console.error('[User] tt.login失败:', err);
        reject(new Error('登录失败'));
      }
    });
  });
}

/**
 * 使用用户信息登录（不需要手机号）
 * @param {object} userInfo - 用户信息（nickName, avatarUrl等）
 * @param {string} inviterOpenid - 邀请人openid（可选）
 * @returns {Promise<object>}
 */
async function loginWithUserInfo(userInfo, inviterOpenid = null) {
  return new Promise((resolve, reject) => {
    tt.login({
      success: async (loginRes) => {
        if (!loginRes.code) {
          reject(new Error('获取登录凭证失败'));
          return;
        }
        
        try {
          const requestData = {
            code: loginRes.code,
            nickname: userInfo.nickName,
            avatar: userInfo.avatarUrl
          };
          
          if (inviterOpenid) {
            requestData.inviter_openid = inviterOpenid;
          }
          
          const response = await request('/api/user/login', 'POST', requestData);
          
          if (response.success) {
            userCache.openid = response.data.openid;
            userCache.userInfo = response.data;
            userCache.isLoggedIn = true;
            
            // 保存到本地存储
            tt.setStorageSync('user_openid', response.data.openid);
            tt.setStorageSync('user_info', response.data);
            
            resolve(response.data);
          } else {
            reject(new Error(response.message || '登录失败'));
          }
        } catch (error) {
          console.error('[User] 登录请求失败:', error);
          reject(error);
        }
      },
      fail: (err) => {
        console.error('[User] tt.login失败:', err);
        reject(new Error('登录失败'));
      }
    });
  });
}

/**
 * 完整登录 - 获取手机号并注册/登录
 * @param {string} encryptedData - 加密的手机号数据
 * @param {string} iv - 加密向量
 * @param {string} inviterOpenid - 邀请人openid（可选）
 * @returns {Promise<object>}
 */
async function loginWithPhone(encryptedData, iv, inviterOpenid = null) {
  return new Promise((resolve, reject) => {
    tt.login({
      success: async (loginRes) => {
        if (!loginRes.code) {
          reject(new Error('获取登录凭证失败'));
          return;
        }
        
        try {
          const requestData = {
            code: loginRes.code,
            encryptedData: encryptedData,
            iv: iv
          };
          
          if (inviterOpenid) {
            requestData.inviter_openid = inviterOpenid;
          }
          
          // 尝试获取用户头像和昵称
          try {
            const userInfo = await getUserProfile();
            if (userInfo) {
              requestData.nickname = userInfo.nickName;
              requestData.avatar = userInfo.avatarUrl;
            }
          } catch (e) {
            console.log('[User] 获取用户头像昵称失败，继续登录');
          }
          
          const response = await request('/api/user/login', 'POST', requestData);
          
          if (response.success) {
            userCache.openid = response.data.openid;
            userCache.userInfo = response.data;
            userCache.isLoggedIn = true;
            
            // 保存到本地存储
            tt.setStorageSync('user_openid', response.data.openid);
            tt.setStorageSync('user_info', response.data);
            
            resolve(response.data);
          } else {
            reject(new Error(response.message || '登录失败'));
          }
        } catch (error) {
          console.error('[User] 登录请求失败:', error);
          reject(error);
        }
      },
      fail: (err) => {
        console.error('[User] tt.login失败:', err);
        reject(new Error('登录失败'));
      }
    });
  });
}

/**
 * 获取用户头像和昵称
 */
function getUserProfile() {
  return new Promise((resolve, reject) => {
    tt.getUserProfile({
      success: (res) => {
        resolve(res.userInfo);
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
}

/**
 * 获取用户信息（从缓存或服务器）
 * @param {boolean} forceRefresh - 是否强制刷新
 */
async function getUserInfo(forceRefresh = false) {
  // 如果有缓存且不强制刷新
  if (!forceRefresh && userCache.userInfo) {
    return userCache.userInfo;
  }
  
  // 获取 openid
  let openid = userCache.openid || tt.getStorageSync('user_openid');
  
  if (!openid) {
    // 尝试静默登录获取 openid
    try {
      const loginResult = await silentLogin();
      openid = loginResult.openid;
      if (loginResult.user) {
        return loginResult.user;
      }
    } catch (error) {
      console.error('[User] 静默登录失败:', error);
      return null;
    }
  }
  
  // 从服务器获取用户信息
  try {
    const response = await request('/api/user/info', 'GET', { openid });
    if (response.success) {
      userCache.userInfo = response.data;
      userCache.isLoggedIn = true;
      tt.setStorageSync('user_info', response.data);
      return response.data;
    }
    return null;
  } catch (error) {
    // 404 表示用户未注册，不是错误
    if (error.message && error.message.includes('404')) {
      console.log('[User] 用户未注册，需要先登录');
    } else {
      console.error('[User] 获取用户信息失败:', error);
    }
    return null;
  }
}

/**
 * 获取寓言币余额
 */
async function getCoinBalance() {
  const openid = userCache.openid || tt.getStorageSync('user_openid');
  if (!openid) {
    return { balance: 0, isFirstCharge: true };
  }
  
  try {
    const response = await request('/api/coins/balance', 'GET', { openid });
    if (response.success) {
      return {
        balance: response.data.balance,
        isFirstCharge: response.data.is_first_charge
      };
    }
    return { balance: 0, isFirstCharge: true };
  } catch (error) {
    // 404 表示用户未注册，静默处理
    if (error.message && error.message.includes('404')) {
      console.log('[User] 用户未注册，余额为0');
    } else {
      console.error('[User] 获取余额失败:', error);
    }
    return { balance: 0, isFirstCharge: true };
  }
}

/**
 * 消费寓言币
 * @param {number} amount - 消费数量
 * @param {string} description - 消费描述
 * @returns {Promise<{success: boolean, balance: number, message: string, needRecharge: boolean}>}
 */
async function consumeCoins(amount = 1, description = '功能消费') {
  const openid = userCache.openid || tt.getStorageSync('user_openid');
  if (!openid) {
    return { 
      success: false, 
      balance: 0, 
      message: '请先登录', 
      needLogin: true,
      needRecharge: false 
    };
  }
  
  try {
    const response = await request('/api/coins/consume', 'POST', {
      openid,
      amount,
      description
    });
    
    if (response.success) {
      // 更新缓存
      if (userCache.userInfo) {
        userCache.userInfo.coins = response.data.balance;
      }
      return {
        success: true,
        balance: response.data.balance,
        message: response.data.message,
        needRecharge: false
      };
    } else {
      // 余额不足
      if (response.code === 'INSUFFICIENT_BALANCE') {
        return {
          success: false,
          balance: response.data?.balance || 0,
          message: response.message,
          needRecharge: true
        };
      }
      return {
        success: false,
        balance: 0,
        message: response.message,
        needRecharge: false
      };
    }
  } catch (error) {
    console.error('[User] 消费寓言币失败:', error);
    return {
      success: false,
      balance: 0,
      message: '网络错误，请重试',
      needRecharge: false
    };
  }
}

/**
 * 获取消费记录
 * @param {number} limit - 获取数量
 */
async function getCoinTransactions(limit = 20) {
  const openid = userCache.openid || tt.getStorageSync('user_openid');
  if (!openid) {
    return [];
  }
  
  try {
    const response = await request('/api/coins/transactions', 'GET', { openid, limit });
    if (response.success) {
      return response.data;
    }
    return [];
  } catch (error) {
    console.error('[User] 获取消费记录失败:', error);
    return [];
  }
}

/**
 * 检查是否已登录
 */
function isLoggedIn() {
  if (userCache.isLoggedIn) return true;
  const openid = tt.getStorageSync('user_openid');
  const userInfo = tt.getStorageSync('user_info');
  if (openid && userInfo) {
    userCache.openid = openid;
    userCache.userInfo = userInfo;
    userCache.isLoggedIn = true;
    return true;
  }
  return false;
}

/**
 * 获取当前 openid
 */
function getOpenid() {
  return userCache.openid || tt.getStorageSync('user_openid');
}

/**
 * 退出登录
 */
function logout() {
  userCache = {
    openid: null,
    userInfo: null,
    isLoggedIn: false
  };
  tt.removeStorageSync('user_openid');
  tt.removeStorageSync('user_info');
}

/**
 * 初始化用户状态（从本地存储恢复）
 */
function initUserState() {
  const openid = tt.getStorageSync('user_openid');
  const userInfo = tt.getStorageSync('user_info');
  if (openid) {
    userCache.openid = openid;
    userCache.userInfo = userInfo;
    userCache.isLoggedIn = !!userInfo;
  }
}

/**
 * 通用请求函数
 */
function request(path, method = 'GET', data = {}) {
  return new Promise((resolve, reject) => {
    const url = API_BASE + path;
    
    tt.request({
      url: method === 'GET' ? `${url}?${objectToQueryString(data)}` : url,
      method: method,
      data: method === 'GET' ? {} : data,
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
}

/**
 * 对象转查询字符串
 */
function objectToQueryString(obj) {
  return Object.keys(obj)
    .filter(key => obj[key] !== undefined && obj[key] !== null)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
    .join('&');
}

module.exports = {
  silentLogin,
  loginWithUserInfo,
  loginWithPhone,
  getUserInfo,
  getCoinBalance,
  consumeCoins,
  getCoinTransactions,
  isLoggedIn,
  getOpenid,
  logout,
  initUserState
};

