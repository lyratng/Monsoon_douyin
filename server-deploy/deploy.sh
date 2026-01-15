#!/bin/bash
# 衣索寓言 - 后端部署脚本
# 在服务器上执行: bash deploy.sh

echo "=========================================="
echo "衣索寓言后端部署脚本"
echo "=========================================="

cd /home/ecs-user/monsoon-api

# 备份旧文件
echo "1. 备份旧文件..."
cp server.js server.js.backup_$(date +%Y%m%d_%H%M%S) 2>/dev/null || true

# 创建目录
echo "2. 创建目录..."
mkdir -p routes

# 写入 database.js
echo "3. 写入 database.js..."
cat > database.js << 'DBEOF'
const Database = require('better-sqlite3');
const path = require('path');
const DB_PATH = path.join(__dirname, 'data.db');
let db = null;

function getDB() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    console.log('[Database] 连接成功:', DB_PATH);
  }
  return db;
}

function initDatabase() {
  const d = getDB();
  console.log('[Database] 初始化表...');
  d.exec('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, openid TEXT UNIQUE NOT NULL, phone TEXT, nickname TEXT, avatar TEXT, coins INTEGER DEFAULT 10, is_first_charge INTEGER DEFAULT 1, inviter_id INTEGER, created_at TEXT DEFAULT (datetime(\'now\', \'localtime\')), updated_at TEXT DEFAULT (datetime(\'now\', \'localtime\')))');
  d.exec('CREATE INDEX IF NOT EXISTS idx_users_openid ON users(openid)');
  d.exec('CREATE TABLE IF NOT EXISTS coin_transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, type TEXT NOT NULL, amount INTEGER NOT NULL, balance_after INTEGER NOT NULL, description TEXT, order_id TEXT, created_at TEXT DEFAULT (datetime(\'now\', \'localtime\')))');
  d.exec('CREATE INDEX IF NOT EXISTS idx_transactions_user ON coin_transactions(user_id)');
  d.exec('CREATE TABLE IF NOT EXISTS invitations (id INTEGER PRIMARY KEY AUTOINCREMENT, inviter_id INTEGER NOT NULL, invitee_id INTEGER NOT NULL, inviter_rewarded INTEGER DEFAULT 0, invitee_rewarded INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime(\'now\', \'localtime\')))');
  d.exec('CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, order_no TEXT UNIQUE NOT NULL, douyin_order_id TEXT, amount INTEGER NOT NULL, coins INTEGER NOT NULL, bonus_coins INTEGER DEFAULT 0, status TEXT DEFAULT \'pending\', created_at TEXT DEFAULT (datetime(\'now\', \'localtime\')), paid_at TEXT)');
  console.log('[Database] 初始化完成');
}

function findUserByOpenid(openid) { return getDB().prepare('SELECT * FROM users WHERE openid = ?').get(openid); }
function findUserById(id) { return getDB().prepare('SELECT * FROM users WHERE id = ?').get(id); }

function addCoinTransaction(userId, type, amount, balanceAfter, description, orderId) {
  return getDB().prepare('INSERT INTO coin_transactions (user_id, type, amount, balance_after, description, order_id) VALUES (?, ?, ?, ?, ?, ?)').run(userId, type, amount, balanceAfter, description, orderId || null);
}

function createUser(userData) {
  const d = getDB();
  const result = d.prepare('INSERT INTO users (openid, phone, nickname, avatar, coins, inviter_id) VALUES (?, ?, ?, ?, 10, ?)').run(userData.openid, userData.phone || null, userData.nickname || null, userData.avatar || null, userData.inviter_id || null);
  if (result.lastInsertRowid) { addCoinTransaction(result.lastInsertRowid, 'initial', 10, 10, '注册赠送', null); }
  return findUserById(result.lastInsertRowid);
}

function updateUser(openid, updates) {
  const d = getDB();
  const fields = []; const values = [];
  if (updates.phone !== undefined) { fields.push('phone = ?'); values.push(updates.phone); }
  if (updates.nickname !== undefined) { fields.push('nickname = ?'); values.push(updates.nickname); }
  if (updates.avatar !== undefined) { fields.push('avatar = ?'); values.push(updates.avatar); }
  if (updates.coins !== undefined) { fields.push('coins = ?'); values.push(updates.coins); }
  if (updates.is_first_charge !== undefined) { fields.push('is_first_charge = ?'); values.push(updates.is_first_charge); }
  fields.push('updated_at = datetime(\'now\', \'localtime\')');
  values.push(openid);
  d.prepare('UPDATE users SET ' + fields.join(', ') + ' WHERE openid = ?').run(...values);
  return findUserByOpenid(openid);
}

function consumeCoins(openid, amount, description) {
  const d = getDB();
  const user = findUserByOpenid(openid);
  if (!user) return { success: false, code: 'USER_NOT_FOUND', message: '用户不存在' };
  if (user.coins < amount) return { success: false, code: 'INSUFFICIENT_BALANCE', message: '寓言币不足', balance: user.coins };
  const newBalance = user.coins - amount;
  const txn = d.transaction(() => {
    d.prepare('UPDATE users SET coins = ?, updated_at = datetime(\'now\', \'localtime\') WHERE openid = ?').run(newBalance, openid);
    addCoinTransaction(user.id, 'consume', -amount, newBalance, description, null);
  });
  txn();
  return { success: true, consumed: amount, balance: newBalance, message: '消耗了' + (amount === 1 ? '一枚' : amount + '枚') + '寓言币，还剩' + newBalance + '枚' };
}

function rechargeCoins(openid, coins, bonusCoins, orderId) {
  const d = getDB();
  const user = findUserByOpenid(openid);
  if (!user) return { success: false, code: 'USER_NOT_FOUND', message: '用户不存在' };
  const newBalance = user.coins + coins + bonusCoins;
  const txn = d.transaction(() => {
    d.prepare('UPDATE users SET coins = ?, is_first_charge = 0, updated_at = datetime(\'now\', \'localtime\') WHERE openid = ?').run(newBalance, openid);
    addCoinTransaction(user.id, 'recharge', coins, user.coins + coins, '充值' + coins + '枚寓言币', orderId);
    if (bonusCoins > 0) addCoinTransaction(user.id, 'first_bonus', bonusCoins, newBalance, '首充奖励', orderId);
  });
  txn();
  return { success: true, coins: coins, bonus: bonusCoins, balance: newBalance };
}

function giveInviteReward(inviterOpenid, inviteeOpenid) {
  const d = getDB();
  const inviter = findUserByOpenid(inviterOpenid);
  const invitee = findUserByOpenid(inviteeOpenid);
  if (!inviter || !invitee) return { success: false, message: '用户不存在' };
  const invitation = d.prepare('SELECT * FROM invitations WHERE invitee_id = ?').get(invitee.id);
  if (invitation && invitation.inviter_rewarded && invitation.invitee_rewarded) return { success: false, message: '奖励已发放' };
  const txn = d.transaction(() => {
    const inviterNew = inviter.coins + 10;
    d.prepare('UPDATE users SET coins = ?, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?').run(inviterNew, inviter.id);
    addCoinTransaction(inviter.id, 'invite_reward', 10, inviterNew, '邀请好友奖励', null);
    const inviteeNew = invitee.coins + 10;
    d.prepare('UPDATE users SET coins = ?, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?').run(inviteeNew, invitee.id);
    addCoinTransaction(invitee.id, 'invited_reward', 10, inviteeNew, '受邀注册奖励', null);
    if (invitation) { d.prepare('UPDATE invitations SET inviter_rewarded = 1, invitee_rewarded = 1 WHERE id = ?').run(invitation.id); }
    else { d.prepare('INSERT INTO invitations (inviter_id, invitee_id, inviter_rewarded, invitee_rewarded) VALUES (?, ?, 1, 1)').run(inviter.id, invitee.id); }
  });
  txn();
  return { success: true, message: '邀请奖励发放成功' };
}

function getCoinTransactions(openid, limit) {
  const user = findUserByOpenid(openid);
  if (!user) return [];
  return getDB().prepare('SELECT id, type, amount, balance_after, description, created_at FROM coin_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(user.id, limit || 20);
}

function createOrder(userId, orderNo, amount, coins) {
  const d = getDB();
  const user = findUserById(userId);
  const bonusCoins = user && user.is_first_charge ? 5 : 0;
  d.prepare('INSERT INTO orders (user_id, order_no, amount, coins, bonus_coins, status) VALUES (?, ?, ?, ?, ?, \'pending\')').run(userId, orderNo, amount, coins, bonusCoins);
  return d.prepare('SELECT * FROM orders WHERE order_no = ?').get(orderNo);
}

function updateOrderStatus(orderNo, status, douyinOrderId) {
  const d = getDB();
  if (status === 'paid') { d.prepare('UPDATE orders SET status = ?, douyin_order_id = ?, paid_at = datetime(\'now\', \'localtime\') WHERE order_no = ?').run(status, douyinOrderId || null, orderNo); }
  else { d.prepare('UPDATE orders SET status = ?, douyin_order_id = ? WHERE order_no = ?').run(status, douyinOrderId || null, orderNo); }
  return d.prepare('SELECT * FROM orders WHERE order_no = ?').get(orderNo);
}

function findOrderByOrderNo(orderNo) { return getDB().prepare('SELECT * FROM orders WHERE order_no = ?').get(orderNo); }
function closeDB() { if (db) { db.close(); db = null; console.log('[Database] 连接已关闭'); } }

module.exports = { getDB, initDatabase, closeDB, findUserByOpenid, findUserById, createUser, updateUser, addCoinTransaction, consumeCoins, rechargeCoins, giveInviteReward, getCoinTransactions, createOrder, updateOrderStatus, findOrderByOrderNo };
DBEOF

# 写入 routes/user.js
echo "4. 写入 routes/user.js..."
cat > routes/user.js << 'USEREOF'
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const router = express.Router();
const { findUserByOpenid, createUser, updateUser, giveInviteReward } = require('../database');

const DOUYIN_CONFIG = { APP_ID: process.env.DOUYIN_APP_ID || 'tt6a791cc4f57bed5d01', APP_SECRET: process.env.DOUYIN_APP_SECRET || '9489b0068583a5b61b6d1ea29c7b054178d75cef', JSCODE2SESSION_URL: 'https://developer.toutiao.com/api/apps/v2/jscode2session' };

async function code2session(code) {
  try {
    console.log('[User] code2session, code:', code.substring(0, 20) + '...');
    const response = await axios.post(DOUYIN_CONFIG.JSCODE2SESSION_URL, { appid: DOUYIN_CONFIG.APP_ID, secret: DOUYIN_CONFIG.APP_SECRET, code: code }, { headers: { 'Content-Type': 'application/json' }, timeout: 10000 });
    console.log('[User] code2session 响应:', JSON.stringify(response.data));
    if (response.data && response.data.err_no === 0 && response.data.data) { return { success: true, data: response.data.data }; }
    return { success: false, error: response.data.err_tips || '获取session失败' };
  } catch (error) { console.error('[User] code2session 错误:', error.message); return { success: false, error: error.message }; }
}

function decryptPhoneNumber(sessionKey, encryptedData, iv) {
  try {
    const sessionKeyBuffer = Buffer.from(sessionKey, 'base64');
    const encryptedDataBuffer = Buffer.from(encryptedData, 'base64');
    const ivBuffer = Buffer.from(iv, 'base64');
    const decipher = crypto.createDecipheriv('aes-128-cbc', sessionKeyBuffer, ivBuffer);
    decipher.setAutoPadding(true);
    let decrypted = decipher.update(encryptedDataBuffer, 'binary', 'utf8');
    decrypted += decipher.final('utf8');
    const result = JSON.parse(decrypted);
    return { success: true, phoneNumber: result.phoneNumber || result.purePhoneNumber };
  } catch (error) { console.error('[User] 解密失败:', error.message); return { success: false, error: error.message }; }
}

function maskPhone(phone) { if (!phone || phone.length < 7) return phone; return phone.substring(0, 3) + '****' + phone.substring(7); }

router.post('/login', async (req, res) => {
  console.log('[API] 登录请求');
  try {
    const { code, encryptedData, iv, inviter_openid, nickname, avatar } = req.body;
    if (!code) return res.status(400).json({ success: false, message: '缺少 code' });
    const sessionResult = await code2session(code);
    if (!sessionResult.success) return res.status(400).json({ success: false, message: sessionResult.error });
    const { openid, session_key } = sessionResult.data;
    let phoneNumber = null;
    if (encryptedData && iv && session_key) { const phoneResult = decryptPhoneNumber(session_key, encryptedData, iv); if (phoneResult.success) phoneNumber = phoneResult.phoneNumber; }
    let user = findUserByOpenid(openid);
    let isNewUser = false; let inviteReward = 0;
    if (!user) {
      isNewUser = true;
      let inviterId = null;
      if (inviter_openid && inviter_openid !== openid) { const inviter = findUserByOpenid(inviter_openid); if (inviter) inviterId = inviter.id; }
      user = createUser({ openid, phone: phoneNumber, nickname, avatar, inviter_id: inviterId });
      if (inviterId) { const rewardResult = giveInviteReward(inviter_openid, openid); if (rewardResult.success) { inviteReward = 10; user = findUserByOpenid(openid); } }
    } else {
      const updates = {};
      if (phoneNumber && !user.phone) updates.phone = phoneNumber;
      if (nickname && !user.nickname) updates.nickname = nickname;
      if (avatar && !user.avatar) updates.avatar = avatar;
      if (Object.keys(updates).length > 0) user = updateUser(openid, updates);
    }
    res.json({ success: true, data: { user_id: user.id, openid: user.openid, phone: maskPhone(user.phone), nickname: user.nickname, avatar: user.avatar, coins: user.coins, is_new_user: isNewUser, invite_reward: inviteReward, is_first_charge: user.is_first_charge === 1 } });
  } catch (error) { console.error('[API] 登录错误:', error); res.status(500).json({ success: false, message: '服务器错误', error: error.message }); }
});

router.get('/info', (req, res) => {
  try {
    const { openid } = req.query;
    if (!openid) return res.status(400).json({ success: false, message: '缺少 openid' });
    const user = findUserByOpenid(openid);
    if (!user) return res.status(404).json({ success: false, message: '用户不存在' });
    res.json({ success: true, data: { user_id: user.id, openid: user.openid, phone: maskPhone(user.phone), nickname: user.nickname, avatar: user.avatar, coins: user.coins, is_first_charge: user.is_first_charge === 1, created_at: user.created_at } });
  } catch (error) { res.status(500).json({ success: false, message: '服务器错误' }); }
});

router.post('/silent-login', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: '缺少 code' });
    const sessionResult = await code2session(code);
    if (!sessionResult.success) return res.status(400).json({ success: false, message: sessionResult.error });
    const { openid } = sessionResult.data;
    const user = findUserByOpenid(openid);
    res.json({ success: true, data: { openid: openid, is_registered: !!user, user: user ? { user_id: user.id, nickname: user.nickname, avatar: user.avatar, coins: user.coins, is_first_charge: user.is_first_charge === 1 } : null } });
  } catch (error) { res.status(500).json({ success: false, message: '服务器错误' }); }
});

module.exports = router;
USEREOF

# 写入 routes/coins.js
echo "5. 写入 routes/coins.js..."
cat > routes/coins.js << 'COINSEOF'
const express = require('express');
const router = express.Router();
const { findUserByOpenid, consumeCoins, getCoinTransactions } = require('../database');

router.get('/balance', (req, res) => {
  try {
    const { openid } = req.query;
    if (!openid) return res.status(400).json({ success: false, message: '缺少 openid' });
    const user = findUserByOpenid(openid);
    if (!user) return res.status(404).json({ success: false, message: '用户不存在' });
    res.json({ success: true, data: { balance: user.coins, is_first_charge: user.is_first_charge === 1 } });
  } catch (error) { res.status(500).json({ success: false, message: '服务器错误' }); }
});

router.post('/consume', (req, res) => {
  try {
    const { openid, amount, description } = req.body;
    if (!openid) return res.status(400).json({ success: false, message: '缺少 openid' });
    const result = consumeCoins(openid, amount || 1, description || '功能消费');
    if (!result.success) { return res.status(400).json({ success: false, code: result.code, message: result.message, data: { balance: result.balance || 0 } }); }
    res.json({ success: true, data: { consumed: result.consumed, balance: result.balance, message: result.message } });
  } catch (error) { res.status(500).json({ success: false, message: '服务器错误' }); }
});

router.get('/transactions', (req, res) => {
  try {
    const { openid, limit } = req.query;
    if (!openid) return res.status(400).json({ success: false, message: '缺少 openid' });
    const transactions = getCoinTransactions(openid, parseInt(limit) || 20);
    const typeNames = { 'initial': '注册赠送', 'consume': '功能消费', 'recharge': '充值', 'first_bonus': '首充奖励', 'invite_reward': '邀请奖励', 'invited_reward': '受邀奖励' };
    const formatted = transactions.map(t => ({ id: t.id, type: t.type, type_name: typeNames[t.type] || t.type, amount: t.amount, balance_after: t.balance_after, description: t.description, created_at: t.created_at }));
    res.json({ success: true, data: formatted });
  } catch (error) { res.status(500).json({ success: false, message: '服务器错误' }); }
});

module.exports = router;
COINSEOF

# 写入 server.js
echo "6. 写入 server.js..."
cat > server.js << 'SERVEREOF'
const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();
const { initDatabase, closeDB } = require('./database');
const userRoutes = require('./routes/user');
const coinsRoutes = require('./routes/coins');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = 'https://openrouter.ai/api/v1';
const DOUYIN_CONFIG = { APP_ID: 'tt6a791cc4f57bed5d01', APP_SECRET: '9489b0068583a5b61b6d1ea29c7b054178d75cef', TOKEN_URL: 'https://developer.toutiao.com/api/apps/v2/token', TEXT_CHECK_URL: 'https://developer.toutiao.com/api/v2/tags/text/antidirt', IMAGE_CHECK_URL: 'https://developer.toutiao.com/api/apps/censor/image' };
let tokenCache = { accessToken: null, expiresAt: 0 };

async function getDouyinAccessToken() {
  const now = Date.now();
  if (tokenCache.accessToken && tokenCache.expiresAt > now + 300000) return tokenCache.accessToken;
  console.log('[Security] 获取新 Token...');
  const response = await axios.post(DOUYIN_CONFIG.TOKEN_URL, { appid: DOUYIN_CONFIG.APP_ID, secret: DOUYIN_CONFIG.APP_SECRET, grant_type: 'client_credential' }, { headers: { 'Content-Type': 'application/json' }, timeout: 10000 });
  if (response.data && response.data.err_no === 0 && response.data.data) { tokenCache.accessToken = response.data.data.access_token; tokenCache.expiresAt = now + (response.data.data.expires_in * 1000); return tokenCache.accessToken; }
  throw new Error('Token获取失败');
}

async function checkTextSafety(text) {
  if (!text || text.trim() === '') return { safe: true, message: '空文本' };
  try {
    const accessToken = await getDouyinAccessToken();
    const response = await axios.post(DOUYIN_CONFIG.TEXT_CHECK_URL, { tasks: [{ content: text }] }, { headers: { 'Content-Type': 'application/json', 'X-Token': accessToken }, timeout: 10000 });
    if (response.data && response.data.data && response.data.data.length > 0) {
      const result = response.data.data[0];
      if (result.code !== 0) return { safe: false, message: '检测服务异常' };
      const hitItems = (result.predicts || []).filter(p => p.hit);
      if (hitItems.length > 0) return { safe: false, message: '内容包含敏感信息' };
      return { safe: true, message: '检测通过' };
    }
    return { safe: true, message: '检测完成' };
  } catch (error) { console.error('[Security] 文本检测失败:', error.message); return { safe: false, message: '安全检测服务不可用' }; }
}

async function checkImageSafety(imageData, imageUrl) {
  try {
    const accessToken = await getDouyinAccessToken();
    const requestBody = { app_id: DOUYIN_CONFIG.APP_ID, access_token: accessToken };
    if (imageUrl) requestBody.image = imageUrl;
    else if (imageData) requestBody.image_data = imageData;
    else return { safe: false, message: '未提供图片' };
    const response = await axios.post(DOUYIN_CONFIG.IMAGE_CHECK_URL, requestBody, { headers: { 'Content-Type': 'application/json' }, timeout: 30000 });
    if (response.data) {
      if (response.data.error !== 0) return { safe: false, message: '图片检测服务异常' };
      const hitItems = (response.data.predicts || []).filter(p => p.hit);
      if (hitItems.length > 0) return { safe: false, message: '图片未通过安全检测' };
      return { safe: true, message: '检测通过' };
    }
    return { safe: true, message: '检测完成' };
  } catch (error) { console.error('[Security] 图片检测失败:', error.message); return { safe: false, message: '安全检测服务不可用' }; }
}

app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString(), version: '2.0.0' }));

app.post('/api/chat/completions', async (req, res) => {
  try {
    const response = await axios.post(OPENAI_BASE_URL + '/chat/completions', req.body, { headers: { 'Authorization': 'Bearer ' + OPENAI_API_KEY, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://api.radiance.asia', 'X-Title': 'Monsoon' }, timeout: 60000 });
    res.json(response.data);
  } catch (error) { console.error('[AI] 错误:', error.response ? error.response.data : error.message); res.status(error.response ? error.response.status : 500).json({ error: error.response ? error.response.data : { message: error.message } }); }
});

app.post('/api/content-security/text', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ success: false, safe: false, message: '缺少 text' });
  const result = await checkTextSafety(text);
  res.json({ success: true, safe: result.safe, message: result.message });
});

app.post('/api/content-security/image', async (req, res) => {
  const { image_data, image_url } = req.body;
  if (!image_data && !image_url) return res.status(400).json({ success: false, safe: false, message: '缺少图片' });
  const result = await checkImageSafety(image_data, image_url);
  res.json({ success: true, safe: result.safe, message: result.message });
});

app.get('/api/content-security/token', async (req, res) => {
  try { const token = await getDouyinAccessToken(); res.json({ success: true, token_preview: token.substring(0, 20) + '...' }); }
  catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.use('/api/user', userRoutes);
app.use('/api/coins', coinsRoutes);

initDatabase();
app.listen(PORT, () => {
  console.log('==================================================');
  console.log('衣索寓言 API v2.0.0');
  console.log('端口:', PORT);
  console.log('功能: 内容安全、AI代理、用户系统、寓言币');
  console.log('==================================================');
});

process.on('SIGINT', () => { closeDB(); process.exit(0); });
process.on('SIGTERM', () => { closeDB(); process.exit(0); });
SERVEREOF

echo "7. 检查语法..."
node --check server.js
if [ $? -ne 0 ]; then
  echo "❌ 语法错误！请检查代码"
  exit 1
fi

echo "8. 重启服务..."
pm2 restart monsoon-api

echo "9. 等待启动..."
sleep 3

echo "10. 查看日志..."
pm2 logs monsoon-api --lines 20 --nostream

echo ""
echo "=========================================="
echo "✅ 部署完成！"
echo "=========================================="
echo "测试命令："
echo "  curl https://api.radiance.asia/health"
echo "  curl 'https://api.radiance.asia/api/coins/balance?openid=test'"
echo "=========================================="

