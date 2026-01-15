// 用户相关路由
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const router = express.Router();

const {
  findUserByOpenid,
  createUser,
  updateUser,
  giveInviteReward
} = require('../database');

// 抖音配置
const DOUYIN_CONFIG = {
  APP_ID: process.env.DOUYIN_APP_ID || 'tt6a791cc4f57bed5d01',
  APP_SECRET: process.env.DOUYIN_APP_SECRET || '9489b0068583a5b61b6d1ea29c7b054178d75cef',
  JSCODE2SESSION_URL: 'https://developer.toutiao.com/api/apps/v2/jscode2session'
};

// ========== 辅助函数 ==========

// 通过 code 获取 session_key 和 openid
async function code2session(code) {
  try {
    console.log('[User] code2session 请求, code:', code.substring(0, 20) + '...');
    
    const response = await axios.post(DOUYIN_CONFIG.JSCODE2SESSION_URL, {
      appid: DOUYIN_CONFIG.APP_ID,
      secret: DOUYIN_CONFIG.APP_SECRET,
      code: code
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    
    console.log('[User] code2session 响应:', JSON.stringify(response.data));
    
    if (response.data && response.data.err_no === 0 && response.data.data) {
      return {
        success: true,
        data: response.data.data
      };
    } else {
      return {
        success: false,
        error: response.data.err_tips || '获取session失败'
      };
    }
  } catch (error) {
    console.error('[User] code2session 错误:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// 解密手机号
function decryptPhoneNumber(sessionKey, encryptedData, iv) {
  try {
    // Base64 解码
    const sessionKeyBuffer = Buffer.from(sessionKey, 'base64');
    const encryptedDataBuffer = Buffer.from(encryptedData, 'base64');
    const ivBuffer = Buffer.from(iv, 'base64');
    
    // AES-128-CBC 解密
    const decipher = crypto.createDecipheriv('aes-128-cbc', sessionKeyBuffer, ivBuffer);
    decipher.setAutoPadding(true);
    
    let decrypted = decipher.update(encryptedDataBuffer, 'binary', 'utf8');
    decrypted += decipher.final('utf8');
    
    const result = JSON.parse(decrypted);
    console.log('[User] 手机号解密成功:', result.phoneNumber ? result.phoneNumber.substring(0, 3) + '****' + result.phoneNumber.substring(7) : 'null');
    
    return {
      success: true,
      phoneNumber: result.phoneNumber || result.purePhoneNumber,
      countryCode: result.countryCode
    };
  } catch (error) {
    console.error('[User] 手机号解密失败:', error.message);
    return {
      success: false,
      error: '手机号解密失败: ' + error.message
    };
  }
}

// 手机号脱敏
function maskPhone(phone) {
  if (!phone || phone.length < 7) return phone;
  return phone.substring(0, 3) + '****' + phone.substring(7);
}

// ========== 路由 ==========

/**
 * 用户登录
 * POST /api/user/login
 * 
 * Body:
 * - code: tt.login 获取的 code
 * - encryptedData: 手机号加密数据（可选）
 * - iv: 加密向量（可选）
 * - inviter_openid: 邀请人 openid（可选）
 * - nickname: 用户昵称（可选）
 * - avatar: 用户头像（可选）
 */
router.post('/login', async (req, res) => {
  console.log('[API] 收到登录请求');
  
  try {
    const { code, encryptedData, iv, inviter_openid, nickname, avatar } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: '缺少 code 参数'
      });
    }
    
    // 1. 通过 code 获取 openid 和 session_key
    const sessionResult = await code2session(code);
    if (!sessionResult.success) {
      return res.status(400).json({
        success: false,
        message: sessionResult.error || '登录失败，请重试'
      });
    }
    
    const { openid, session_key } = sessionResult.data;
    console.log('[User] 获取到 openid:', openid.substring(0, 10) + '...');
    
    // 2. 解密手机号（如果提供了加密数据）
    let phoneNumber = null;
    if (encryptedData && iv && session_key) {
      const phoneResult = decryptPhoneNumber(session_key, encryptedData, iv);
      if (phoneResult.success) {
        phoneNumber = phoneResult.phoneNumber;
      } else {
        console.warn('[User] 手机号解密失败，继续登录流程');
      }
    }
    
    // 3. 查找或创建用户
    let user = findUserByOpenid(openid);
    let isNewUser = false;
    let inviteReward = 0;
    
    if (!user) {
      // 新用户
      isNewUser = true;
      
      // 检查邀请人
      let inviterId = null;
      if (inviter_openid && inviter_openid !== openid) {
        const inviter = findUserByOpenid(inviter_openid);
        if (inviter) {
          inviterId = inviter.id;
          console.log('[User] 新用户被邀请, 邀请人ID:', inviterId);
        }
      }
      
      // 创建用户
      user = createUser({
        openid,
        phone: phoneNumber,
        nickname: nickname || null,
        avatar: avatar || null,
        inviter_id: inviterId
      });
      
      console.log('[User] 新用户创建成功, ID:', user.id);
      
      // 如果有邀请人，发放邀请奖励
      if (inviterId) {
        const rewardResult = giveInviteReward(inviter_openid, openid);
        if (rewardResult.success) {
          inviteReward = 10;
          // 重新获取用户信息（奖励已发放）
          user = findUserByOpenid(openid);
          console.log('[User] 邀请奖励已发放');
        }
      }
    } else {
      // 老用户，更新信息
      const updates = {};
      if (phoneNumber && !user.phone) updates.phone = phoneNumber;
      if (nickname && !user.nickname) updates.nickname = nickname;
      if (avatar && !user.avatar) updates.avatar = avatar;
      
      if (Object.keys(updates).length > 0) {
        user = updateUser(openid, updates);
        console.log('[User] 用户信息已更新');
      }
    }
    
    // 4. 返回用户信息
    res.json({
      success: true,
      data: {
        user_id: user.id,
        openid: user.openid,
        phone: maskPhone(user.phone),
        nickname: user.nickname,
        avatar: user.avatar,
        coins: user.coins,
        is_new_user: isNewUser,
        invite_reward: inviteReward,
        is_first_charge: user.is_first_charge === 1
      }
    });
    
  } catch (error) {
    console.error('[API] 登录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

/**
 * 获取用户信息
 * GET /api/user/info?openid=xxx
 */
router.get('/info', (req, res) => {
  console.log('[API] 获取用户信息');
  
  try {
    const { openid } = req.query;
    
    if (!openid) {
      return res.status(400).json({
        success: false,
        message: '缺少 openid 参数'
      });
    }
    
    const user = findUserByOpenid(openid);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    res.json({
      success: true,
      data: {
        user_id: user.id,
        openid: user.openid,
        phone: maskPhone(user.phone),
        nickname: user.nickname,
        avatar: user.avatar,
        coins: user.coins,
        is_first_charge: user.is_first_charge === 1,
        created_at: user.created_at
      }
    });
    
  } catch (error) {
    console.error('[API] 获取用户信息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

/**
 * 静默登录（仅通过 code 获取 openid，不获取手机号）
 * POST /api/user/silent-login
 */
router.post('/silent-login', async (req, res) => {
  console.log('[API] 静默登录');
  
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: '缺少 code 参数'
      });
    }
    
    // 通过 code 获取 openid
    const sessionResult = await code2session(code);
    if (!sessionResult.success) {
      return res.status(400).json({
        success: false,
        message: sessionResult.error || '登录失败'
      });
    }
    
    const { openid } = sessionResult.data;
    const user = findUserByOpenid(openid);
    
    res.json({
      success: true,
      data: {
        openid: openid,
        is_registered: !!user,
        user: user ? {
          user_id: user.id,
          nickname: user.nickname,
          avatar: user.avatar,
          coins: user.coins,
          is_first_charge: user.is_first_charge === 1
        } : null
      }
    });
    
  } catch (error) {
    console.error('[API] 静默登录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

module.exports = router;

