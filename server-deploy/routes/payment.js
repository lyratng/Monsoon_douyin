/**
 * 支付相关路由
 * 抖音通用交易系统 (tt.requestOrder + tt.getOrderPayment)
 */
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { findUserByOpenid, createOrder, updateOrderStatus, findOrderByOrderNo, rechargeCoins, findUserById } = require('../database');

// 支付配置
const PAYMENT_CONFIG = {
  APP_ID: 'tt6a791cc4f57bed5d01',
  KEY_VERSION: '1',
  NOTIFY_URL: 'https://api.radiance.asia/api/payment/callback'
};

// 读取私钥
let PRIVATE_KEY = null;
try {
  const keyPath = path.join(__dirname, '..', 'private_key.pem');
  if (fs.existsSync(keyPath)) {
    PRIVATE_KEY = fs.readFileSync(keyPath, 'utf8');
    console.log('[Payment] 私钥加载成功');
  } else {
    console.warn('[Payment] 私钥文件不存在:', keyPath);
  }
} catch (e) {
  console.error('[Payment] 读取私钥失败:', e.message);
}

// 充值档位配置
const RECHARGE_PLANS = {
  'coins_10': { coins: 10, price: 500, name: '10枚寓言币', skuId: 'coins_10' },
  'coins_30': { coins: 30, price: 1200, name: '30枚寓言币', skuId: 'coins_30' },
  'coins_60': { coins: 60, price: 2000, name: '60枚寓言币', skuId: 'coins_60' }
};

/**
 * 生成订单号
 */
function generateOrderNo() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `YY${year}${month}${day}${hour}${minute}${second}${random}`;
}

/**
 * 生成随机字符串
 */
function generateNonce() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * 生成 byteAuthorization 签名
 * 待签名字符串格式（严格5行，每行以\n结尾）：
 * POST\n
 * /requestOrder\n
 * 时间戳\n
 * 随机串\n
 * data\n
 */
function generateByteAuthorization(timestamp, nonce, data) {
  // 构建待签名字符串 - URI 必须是 /requestOrder
  const signString = `POST\n/requestOrder\n${timestamp}\n${nonce}\n${data}\n`;
  
  console.log('[Payment] 待签名字符串:', JSON.stringify(signString));
  
  // RSA-SHA256 签名
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signString);
  const signature = sign.sign(PRIVATE_KEY, 'base64');
  
  // 构建 byteAuthorization
  const byteAuth = `SHA256-RSA2048 appid=${PAYMENT_CONFIG.APP_ID},nonce_str=${nonce},timestamp=${timestamp},key_version=${PAYMENT_CONFIG.KEY_VERSION},signature=${signature}`;
  
  console.log('[Payment] byteAuthorization:', byteAuth);
  
  return byteAuth;
}

/**
 * 创建支付订单
 * POST /api/payment/create
 * 返回 data 和 byteAuthorization 供前端调用 tt.requestOrder
 */
router.post('/create', async (req, res) => {
  console.log('[Payment] 创建订单请求:', req.body);
  
  try {
    const { openid, product_id } = req.body;
    
    // 参数验证
    if (!openid) {
      return res.status(400).json({ success: false, message: '缺少openid' });
    }
    if (!product_id) {
      return res.status(400).json({ success: false, message: '缺少product_id' });
    }
    
    // 验证充值档位
    const plan = RECHARGE_PLANS[product_id];
    if (!plan) {
      return res.status(400).json({ success: false, message: '无效的充值档位' });
    }
    
    // 查找用户
    const user = findUserByOpenid(openid);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    // 检查私钥是否存在
    if (!PRIVATE_KEY) {
      console.warn('[Payment] 私钥不存在，返回模拟模式');
      const orderNo = generateOrderNo();
      createOrder(user.id, orderNo, plan.price, plan.coins);
      
      return res.json({
        success: true,
        data: {
          order_no: orderNo,
          coins: plan.coins,
          amount: plan.price,
          mock: true,
          message: '支付功能配置中，请上传私钥文件'
        }
      });
    }
    
    // 生成订单号
    const orderNo = generateOrderNo();
    
    // 构建订单数据（这个 JSON 字符串会直接传给前端）
    const orderData = {
      skuList: [{
        skuId: plan.skuId,
        price: plan.price,
        quantity: 1,
        title: plan.name,
        imageList: ['https://api.radiance.asia/images/coin.png'],
        type: 701,
        tagGroupId: ''
      }],
      outOrderNo: orderNo,
      totalAmount: plan.price,
      payExpireSeconds: 3600,
      payNotifyUrl: PAYMENT_CONFIG.NOTIFY_URL,
      orderEntrySchema: {
        path: 'pages/index/index',
        params: JSON.stringify({ order_no: orderNo })
      }
    };
    
    // 将订单数据转为 JSON 字符串（这个字符串会原样传给前端）
    const dataString = JSON.stringify(orderData);
    
    // 生成签名参数
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = generateNonce();
    
    // 生成 byteAuthorization
    const byteAuthorization = generateByteAuthorization(timestamp, nonce, dataString);
    
    // 在数据库中创建订单记录
    createOrder(user.id, orderNo, plan.price, plan.coins);
    
    console.log('[Payment] 订单创建成功:', {
      order_no: orderNo,
      amount: plan.price,
      coins: plan.coins
    });
    
    // 返回给前端
    res.json({
      success: true,
      data: {
        order_no: orderNo,
        data: dataString,  // 前端原样传给 tt.requestOrder
        byteAuthorization: byteAuthorization,  // 前端原样传给 tt.requestOrder
        coins: plan.coins,
        amount: plan.price
      }
    });
    
  } catch (error) {
    console.error('[Payment] 创建订单错误:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
});

/**
 * 支付回调
 * POST /api/payment/callback
 * 抖音服务器调用，用于通知支付结果
 */
router.post('/callback', async (req, res) => {
  console.log('[Payment] 收到支付回调:', JSON.stringify(req.body));
  
  try {
    const { msg, msg_signature, type, timestamp, nonce } = req.body;
    
    // 解析消息内容
    let msgData;
    try {
      msgData = JSON.parse(msg);
    } catch (e) {
      console.error('[Payment] 解析回调消息失败:', e);
      return res.json({ err_no: 1, err_tips: '消息解析失败' });
    }
    
    console.log('[Payment] 回调消息内容:', msgData);
    
    // TODO: 验证签名（生产环境必须验证）
    
    // 处理支付成功
    if (type === 'payment' && msgData.status === 'SUCCESS') {
      const orderNo = msgData.cp_orderno || msgData.out_order_no;
      const douyinOrderId = msgData.order_id;
      
      // 查找订单
      const order = findOrderByOrderNo(orderNo);
      if (!order) {
        console.error('[Payment] 订单不存在:', orderNo);
        return res.json({ err_no: 3, err_tips: '订单不存在' });
      }
      
      // 检查订单状态，避免重复处理
      if (order.status === 'paid') {
        console.log('[Payment] 订单已处理:', orderNo);
        return res.json({ err_no: 0, err_tips: 'success' });
      }
      
      // 获取用户
      const user = findUserById(order.user_id);
      if (!user) {
        console.error('[Payment] 用户不存在:', order.user_id);
        return res.json({ err_no: 4, err_tips: '用户不存在' });
      }
      
      // 更新订单状态
      updateOrderStatus(orderNo, 'paid', douyinOrderId);
      
      // 给用户充值寓言币
      const bonusCoins = order.bonus_coins || 0;
      const rechargeResult = rechargeCoins(user.openid, order.coins, bonusCoins, orderNo);
      
      console.log('[Payment] 充值结果:', rechargeResult);
      
      if (rechargeResult.success) {
        console.log(`[Payment] 订单 ${orderNo} 处理成功，充值 ${order.coins} + ${bonusCoins} 枚寓言币`);
        return res.json({ err_no: 0, err_tips: 'success' });
      } else {
        console.error('[Payment] 充值失败:', rechargeResult);
        return res.json({ err_no: 5, err_tips: '充值失败' });
      }
    }
    
    // 其他类型，返回成功
    return res.json({ err_no: 0, err_tips: 'success' });
    
  } catch (error) {
    console.error('[Payment] 回调处理错误:', error);
    res.json({ err_no: 500, err_tips: '服务器错误' });
  }
});

/**
 * 查询订单状态
 * GET /api/payment/status?order_no=xxx
 */
router.get('/status', (req, res) => {
  try {
    const { order_no } = req.query;
    
    if (!order_no) {
      return res.status(400).json({ success: false, message: '缺少order_no' });
    }
    
    const order = findOrderByOrderNo(order_no);
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }
    
    res.json({
      success: true,
      data: {
        order_no: order.order_no,
        status: order.status,
        amount: order.amount,
        coins: order.coins,
        bonus_coins: order.bonus_coins,
        created_at: order.created_at,
        paid_at: order.paid_at
      }
    });
    
  } catch (error) {
    console.error('[Payment] 查询订单状态错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * 模拟支付成功（仅用于测试）
 * POST /api/payment/mock-success
 */
router.post('/mock-success', (req, res) => {
  console.log('[Payment] 模拟支付成功请求:', req.body);
  
  try {
    const { order_no } = req.body;
    
    if (!order_no) {
      return res.status(400).json({ success: false, message: '缺少order_no' });
    }
    
    const order = findOrderByOrderNo(order_no);
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }
    
    if (order.status === 'paid') {
      return res.json({ success: false, message: '订单已支付' });
    }
    
    const user = findUserById(order.user_id);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    updateOrderStatus(order_no, 'paid', 'mock_' + Date.now());
    
    const bonusCoins = order.bonus_coins || 0;
    const rechargeResult = rechargeCoins(user.openid, order.coins, bonusCoins, order_no);
    
    if (rechargeResult.success) {
      res.json({
        success: true,
        data: {
          order_no: order_no,
          coins: order.coins,
          bonus: bonusCoins,
          balance: rechargeResult.balance,
          message: '充值成功！'
        }
      });
    } else {
      res.status(500).json({ success: false, message: '充值失败' });
    }
    
  } catch (error) {
    console.error('[Payment] 模拟支付错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
