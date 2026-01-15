#!/bin/bash
# 衣索寓言 - 支付模块部署脚本
# 在服务器上执行: bash deploy-payment.sh

echo "=========================================="
echo "支付模块部署脚本"
echo "=========================================="

cd /home/ecs-user/monsoon-api

# 备份
echo "1. 备份旧文件..."
cp server.js server.js.backup_$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
mkdir -p routes

# 写入 routes/payment.js
echo "2. 写入 routes/payment.js..."
cat > routes/payment.js << 'PAYEOF'
const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const router = express.Router();
const { findUserByOpenid, findUserById, createOrder, updateOrderStatus, findOrderByOrderNo, rechargeCoins } = require('../database');

const PAYMENT_CONFIG = {
  APP_ID: 'tt6a791cc4f57bed5d01',
  MERCHANT_ID: '75838683797701614350',
  SALT: '9489b0068583a5b61b6d1ea29c7b054178d75cef',
  TOKEN: '0801121847494271533459712b7462386a4b58484f6661424b413d3d18a3d5a001',
  NOTIFY_URL: 'https://api.radiance.asia/api/payment/callback',
  CREATE_ORDER_URL: 'https://developer.toutiao.com/api/apps/ecpay/v1/create_order'
};

const RECHARGE_PLANS = {
  'coins_10': { coins: 10, price: 500, name: '10枚寓言币' },
  'coins_30': { coins: 30, price: 1200, name: '30枚寓言币' },
  'coins_60': { coins: 60, price: 2000, name: '60枚寓言币' }
};

function generateOrderNo() {
  const d = new Date();
  const pad = (n, l) => String(n).padStart(l, '0');
  return 'YY' + d.getFullYear() + pad(d.getMonth()+1,2) + pad(d.getDate(),2) + pad(d.getHours(),2) + pad(d.getMinutes(),2) + pad(d.getSeconds(),2) + pad(Math.floor(Math.random()*10000),4);
}

function generateSign(params, salt) {
  const parts = Object.keys(params).sort().filter(k => k !== 'sign' && params[k] !== '' && params[k] !== null && params[k] !== undefined).map(k => k + '=' + (typeof params[k] === 'object' ? JSON.stringify(params[k]) : String(params[k])));
  const str = parts.join('&') + salt;
  console.log('[Payment] 签名字符串:', str);
  return crypto.createHash('md5').update(str, 'utf8').digest('hex');
}

router.post('/create', async (req, res) => {
  console.log('[Payment] 创建订单:', req.body);
  try {
    const { openid, product_id } = req.body;
    if (!openid) return res.status(400).json({ success: false, message: '缺少openid' });
    if (!product_id) return res.status(400).json({ success: false, message: '缺少product_id' });
    const plan = RECHARGE_PLANS[product_id];
    if (!plan) return res.status(400).json({ success: false, message: '无效档位' });
    const user = findUserByOpenid(openid);
    if (!user) return res.status(404).json({ success: false, message: '用户不存在' });

    const orderNo = generateOrderNo();
    const orderParams = {
      app_id: PAYMENT_CONFIG.APP_ID,
      out_order_no: orderNo,
      total_amount: plan.price,
      subject: plan.name,
      body: '衣索寓言-' + plan.name,
      valid_time: 3600,
      notify_url: PAYMENT_CONFIG.NOTIFY_URL,
      cp_extra: JSON.stringify({ openid, product_id, user_id: user.id })
    };
    orderParams.sign = generateSign(orderParams, PAYMENT_CONFIG.SALT);
    console.log('[Payment] 预下单参数:', orderParams);

    const response = await axios.post(PAYMENT_CONFIG.CREATE_ORDER_URL, orderParams, { headers: { 'Content-Type': 'application/json' }, timeout: 10000 });
    console.log('[Payment] 预下单响应:', response.data);

    if (response.data && response.data.err_no === 0 && response.data.data) {
      const order = createOrder(user.id, orderNo, plan.price, plan.coins);
      if (response.data.data.order_id) updateOrderStatus(orderNo, 'pending', response.data.data.order_id);
      return res.json({ success: true, data: { order_no: orderNo, order_id: response.data.data.order_id, order_token: response.data.data.order_token, amount: plan.price, coins: plan.coins } });
    } else {
      console.error('[Payment] 预下单失败:', response.data);
      return res.status(500).json({ success: false, message: response.data.err_tips || '创建订单失败', error_code: response.data.err_no });
    }
  } catch (error) {
    console.error('[Payment] 创建订单错误:', error.message);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
});

router.post('/callback', async (req, res) => {
  console.log('[Payment] 收到回调:', req.body);
  try {
    const { msg, type } = req.body;
    let msgData;
    try { msgData = JSON.parse(msg); } catch (e) { return res.json({ err_no: 1, err_tips: '解析失败' }); }
    console.log('[Payment] 回调内容:', msgData);

    if (type === 'payment' && msgData.status === 'SUCCESS') {
      const orderNo = msgData.cp_orderno;
      const order = findOrderByOrderNo(orderNo);
      if (!order) return res.json({ err_no: 3, err_tips: '订单不存在' });
      if (order.status === 'paid') return res.json({ err_no: 0, err_tips: 'success' });
      const user = findUserById(order.user_id);
      if (!user) return res.json({ err_no: 4, err_tips: '用户不存在' });
      updateOrderStatus(orderNo, 'paid', msgData.order_id);
      const result = rechargeCoins(user.openid, order.coins, order.bonus_coins || 0, orderNo);
      console.log('[Payment] 充值结果:', result);
      return res.json({ err_no: 0, err_tips: 'success' });
    }
    return res.json({ err_no: 0, err_tips: 'success' });
  } catch (error) {
    console.error('[Payment] 回调错误:', error);
    res.json({ err_no: 500, err_tips: '服务器错误' });
  }
});

router.get('/status', (req, res) => {
  try {
    const { order_no } = req.query;
    if (!order_no) return res.status(400).json({ success: false, message: '缺少order_no' });
    const order = findOrderByOrderNo(order_no);
    if (!order) return res.status(404).json({ success: false, message: '订单不存在' });
    res.json({ success: true, data: { order_no: order.order_no, status: order.status, amount: order.amount, coins: order.coins, bonus_coins: order.bonus_coins } });
  } catch (error) { res.status(500).json({ success: false, message: '服务器错误' }); }
});

router.post('/mock-success', (req, res) => {
  console.log('[Payment] 模拟支付:', req.body);
  try {
    const { order_no } = req.body;
    if (!order_no) return res.status(400).json({ success: false, message: '缺少order_no' });
    const order = findOrderByOrderNo(order_no);
    if (!order) return res.status(404).json({ success: false, message: '订单不存在' });
    if (order.status === 'paid') return res.json({ success: false, message: '已支付' });
    const user = findUserById(order.user_id);
    if (!user) return res.status(404).json({ success: false, message: '用户不存在' });
    updateOrderStatus(order_no, 'paid', 'mock_' + Date.now());
    const result = rechargeCoins(user.openid, order.coins, order.bonus_coins || 0, order_no);
    if (result.success) res.json({ success: true, data: { order_no, coins: order.coins, bonus: order.bonus_coins || 0, balance: result.balance } });
    else res.status(500).json({ success: false, message: '充值失败' });
  } catch (error) { res.status(500).json({ success: false, message: '服务器错误' }); }
});

module.exports = router;
PAYEOF

# 更新 server.js 添加 payment 路由
echo "3. 更新 server.js..."
if grep -q "paymentRoutes" server.js; then
  echo "   payment 路由已存在，跳过"
else
  # 在 coinsRoutes 后面添加 paymentRoutes
  sed -i "s|const coinsRoutes = require('./routes/coins');|const coinsRoutes = require('./routes/coins');\nconst paymentRoutes = require('./routes/payment');|" server.js
  # 在 app.use('/api/coins' 后面添加 payment 路由
  sed -i "s|app.use('/api/coins', coinsRoutes);|app.use('/api/coins', coinsRoutes);\napp.use('/api/payment', paymentRoutes);|" server.js
  echo "   ✅ 已添加 payment 路由"
fi

echo "4. 检查语法..."
node --check server.js
if [ $? -ne 0 ]; then
  echo "❌ 语法错误！"
  exit 1
fi

node --check routes/payment.js
if [ $? -ne 0 ]; then
  echo "❌ payment.js 语法错误！"
  exit 1
fi

echo "5. 重启服务..."
pm2 restart monsoon-api

echo "6. 等待启动..."
sleep 3

echo "7. 查看日志..."
pm2 logs monsoon-api --lines 15 --nostream

echo ""
echo "=========================================="
echo "✅ 支付模块部署完成！"
echo "=========================================="
echo "配置信息："
echo "  商户号: 75838683797701614350"
echo "  SALT: 9489b00...（已配置）"
echo "  回调地址: https://api.radiance.asia/api/payment/callback"
echo ""
echo "测试命令："
echo "  curl https://api.radiance.asia/health"
echo "  curl -X POST https://api.radiance.asia/api/payment/create -H 'Content-Type: application/json' -d '{\"openid\":\"YOUR_OPENID\",\"product_id\":\"coins_10\"}'"
echo "=========================================="

