// 数据库初始化和管理模块
// 使用 SQLite (better-sqlite3)

const Database = require('better-sqlite3');
const path = require('path');

// 数据库文件路径
const DB_PATH = path.join(__dirname, 'data.db');

// 创建数据库连接
let db = null;

function getDB() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL'); // 使用 WAL 模式提高并发性能
    console.log('[Database] 数据库连接成功:', DB_PATH);
  }
  return db;
}

// 初始化数据库表
function initDatabase() {
  const db = getDB();
  
  console.log('[Database] 开始初始化数据库表...');
  
  // 用户表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      openid TEXT UNIQUE NOT NULL,
      phone TEXT,
      nickname TEXT,
      avatar TEXT,
      coins INTEGER DEFAULT 10,
      is_first_charge INTEGER DEFAULT 1,
      inviter_id INTEGER,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (inviter_id) REFERENCES users(id)
    )
  `);
  
  // 用户表索引
  db.exec(`CREATE INDEX IF NOT EXISTS idx_users_openid ON users(openid)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)`);
  
  console.log('[Database] 用户表创建完成');
  
  // 寓言币流水表
  db.exec(`
    CREATE TABLE IF NOT EXISTS coin_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      description TEXT,
      order_id TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  
  // 流水表索引
  db.exec(`CREATE INDEX IF NOT EXISTS idx_transactions_user ON coin_transactions(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_transactions_type ON coin_transactions(type)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_transactions_time ON coin_transactions(created_at)`);
  
  console.log('[Database] 寓言币流水表创建完成');
  
  // 邀请关系表
  db.exec(`
    CREATE TABLE IF NOT EXISTS invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inviter_id INTEGER NOT NULL,
      invitee_id INTEGER NOT NULL,
      inviter_rewarded INTEGER DEFAULT 0,
      invitee_rewarded INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (inviter_id) REFERENCES users(id),
      FOREIGN KEY (invitee_id) REFERENCES users(id)
    )
  `);
  
  // 邀请表索引
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_invitee ON invitations(invitee_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_invitations_inviter ON invitations(inviter_id)`);
  
  console.log('[Database] 邀请关系表创建完成');
  
  // 支付订单表
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      order_no TEXT UNIQUE NOT NULL,
      douyin_order_id TEXT,
      amount INTEGER NOT NULL,
      coins INTEGER NOT NULL,
      bonus_coins INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      paid_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  
  // 订单表索引
  db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_order_no ON orders(order_no)`);
  
  console.log('[Database] 支付订单表创建完成');
  console.log('[Database] 数据库初始化完成！');
}

// ========== 用户操作 ==========

// 根据 openid 查找用户
function findUserByOpenid(openid) {
  const db = getDB();
  return db.prepare('SELECT * FROM users WHERE openid = ?').get(openid);
}

// 根据 ID 查找用户
function findUserById(id) {
  const db = getDB();
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

// 创建新用户
function createUser(userData) {
  const db = getDB();
  const { openid, phone, nickname, avatar, inviter_id } = userData;
  
  const stmt = db.prepare(`
    INSERT INTO users (openid, phone, nickname, avatar, coins, inviter_id)
    VALUES (?, ?, ?, ?, 10, ?)
  `);
  
  const result = stmt.run(openid, phone || null, nickname || null, avatar || null, inviter_id || null);
  
  // 记录初始赠送流水
  if (result.lastInsertRowid) {
    addCoinTransaction(result.lastInsertRowid, 'initial', 10, 10, '注册赠送');
  }
  
  return findUserById(result.lastInsertRowid);
}

// 更新用户信息
function updateUser(openid, updates) {
  const db = getDB();
  const fields = [];
  const values = [];
  
  if (updates.phone !== undefined) { fields.push('phone = ?'); values.push(updates.phone); }
  if (updates.nickname !== undefined) { fields.push('nickname = ?'); values.push(updates.nickname); }
  if (updates.avatar !== undefined) { fields.push('avatar = ?'); values.push(updates.avatar); }
  if (updates.coins !== undefined) { fields.push('coins = ?'); values.push(updates.coins); }
  if (updates.is_first_charge !== undefined) { fields.push('is_first_charge = ?'); values.push(updates.is_first_charge); }
  
  fields.push("updated_at = datetime('now', 'localtime')");
  values.push(openid);
  
  const sql = `UPDATE users SET ${fields.join(', ')} WHERE openid = ?`;
  db.prepare(sql).run(...values);
  
  return findUserByOpenid(openid);
}

// ========== 寓言币操作 ==========

// 添加流水记录
function addCoinTransaction(userId, type, amount, balanceAfter, description, orderId = null) {
  const db = getDB();
  const stmt = db.prepare(`
    INSERT INTO coin_transactions (user_id, type, amount, balance_after, description, order_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(userId, type, amount, balanceAfter, description, orderId);
}

// 消费寓言币
function consumeCoins(openid, amount, description) {
  const db = getDB();
  const user = findUserByOpenid(openid);
  
  if (!user) {
    return { success: false, code: 'USER_NOT_FOUND', message: '用户不存在' };
  }
  
  if (user.coins < amount) {
    return { 
      success: false, 
      code: 'INSUFFICIENT_BALANCE', 
      message: '寓言币不足',
      balance: user.coins 
    };
  }
  
  const newBalance = user.coins - amount;
  
  // 使用事务确保数据一致性
  const transaction = db.transaction(() => {
    // 更新余额
    db.prepare('UPDATE users SET coins = ?, updated_at = datetime("now", "localtime") WHERE openid = ?')
      .run(newBalance, openid);
    
    // 记录流水
    addCoinTransaction(user.id, 'consume', -amount, newBalance, description);
  });
  
  transaction();
  
  return {
    success: true,
    consumed: amount,
    balance: newBalance,
    message: `消耗了${amount === 1 ? '一枚' : amount + '枚'}寓言币，还剩${newBalance}枚`
  };
}

// 充值寓言币
function rechargeCoins(openid, coins, bonusCoins, orderId) {
  const db = getDB();
  const user = findUserByOpenid(openid);
  
  if (!user) {
    return { success: false, code: 'USER_NOT_FOUND', message: '用户不存在' };
  }
  
  const totalCoins = coins + bonusCoins;
  const newBalance = user.coins + totalCoins;
  
  const transaction = db.transaction(() => {
    // 更新余额和首充状态
    db.prepare(`
      UPDATE users 
      SET coins = ?, is_first_charge = 0, updated_at = datetime('now', 'localtime') 
      WHERE openid = ?
    `).run(newBalance, openid);
    
    // 记录充值流水
    addCoinTransaction(user.id, 'recharge', coins, user.coins + coins, `充值${coins}枚寓言币`, orderId);
    
    // 如果有首充奖励，单独记录
    if (bonusCoins > 0) {
      addCoinTransaction(user.id, 'first_bonus', bonusCoins, newBalance, '首充奖励', orderId);
    }
  });
  
  transaction();
  
  return {
    success: true,
    coins: coins,
    bonus: bonusCoins,
    balance: newBalance
  };
}

// 发放邀请奖励
function giveInviteReward(inviterOpenid, inviteeOpenid) {
  const db = getDB();
  const inviter = findUserByOpenid(inviterOpenid);
  const invitee = findUserByOpenid(inviteeOpenid);
  
  if (!inviter || !invitee) {
    return { success: false, message: '用户不存在' };
  }
  
  // 检查是否已经发放过奖励
  const invitation = db.prepare('SELECT * FROM invitations WHERE invitee_id = ?').get(invitee.id);
  if (invitation && invitation.inviter_rewarded && invitation.invitee_rewarded) {
    return { success: false, message: '奖励已发放' };
  }
  
  const transaction = db.transaction(() => {
    // 给邀请人加币
    const inviterNewBalance = inviter.coins + 10;
    db.prepare('UPDATE users SET coins = ?, updated_at = datetime("now", "localtime") WHERE id = ?')
      .run(inviterNewBalance, inviter.id);
    addCoinTransaction(inviter.id, 'invite_reward', 10, inviterNewBalance, '邀请好友奖励');
    
    // 给被邀请人加币（被邀请人的初始10币在创建用户时已给，这里再给10币）
    const inviteeNewBalance = invitee.coins + 10;
    db.prepare('UPDATE users SET coins = ?, updated_at = datetime("now", "localtime") WHERE id = ?')
      .run(inviteeNewBalance, invitee.id);
    addCoinTransaction(invitee.id, 'invited_reward', 10, inviteeNewBalance, '受邀注册奖励');
    
    // 更新邀请记录
    if (invitation) {
      db.prepare('UPDATE invitations SET inviter_rewarded = 1, invitee_rewarded = 1 WHERE id = ?')
        .run(invitation.id);
    } else {
      db.prepare(`
        INSERT INTO invitations (inviter_id, invitee_id, inviter_rewarded, invitee_rewarded)
        VALUES (?, ?, 1, 1)
      `).run(inviter.id, invitee.id);
    }
  });
  
  transaction();
  
  return { success: true, message: '邀请奖励发放成功' };
}

// 获取用户消费记录
function getCoinTransactions(openid, limit = 20) {
  const db = getDB();
  const user = findUserByOpenid(openid);
  
  if (!user) {
    return [];
  }
  
  return db.prepare(`
    SELECT id, type, amount, balance_after, description, created_at
    FROM coin_transactions
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(user.id, limit);
}

// ========== 订单操作 ==========

// 创建订单
function createOrder(userId, orderNo, amount, coins) {
  const db = getDB();
  const user = findUserById(userId);
  const bonusCoins = user && user.is_first_charge ? 5 : 0; // 首充送5币
  
  const stmt = db.prepare(`
    INSERT INTO orders (user_id, order_no, amount, coins, bonus_coins, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `);
  
  const result = stmt.run(userId, orderNo, amount, coins, bonusCoins);
  return db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);
}

// 更新订单状态
function updateOrderStatus(orderNo, status, douyinOrderId = null) {
  const db = getDB();
  const updates = ["status = ?", "updated_at = datetime('now', 'localtime')"];
  const values = [status];
  
  if (status === 'paid') {
    updates.push("paid_at = datetime('now', 'localtime')");
  }
  
  if (douyinOrderId) {
    updates.push('douyin_order_id = ?');
    values.push(douyinOrderId);
  }
  
  values.push(orderNo);
  
  const sql = `UPDATE orders SET ${updates.join(', ')} WHERE order_no = ?`;
  db.prepare(sql).run(...values);
  
  return db.prepare('SELECT * FROM orders WHERE order_no = ?').get(orderNo);
}

// 根据订单号查找订单
function findOrderByOrderNo(orderNo) {
  const db = getDB();
  return db.prepare('SELECT * FROM orders WHERE order_no = ?').get(orderNo);
}

// 关闭数据库连接
function closeDB() {
  if (db) {
    db.close();
    db = null;
    console.log('[Database] 数据库连接已关闭');
  }
}

module.exports = {
  getDB,
  initDatabase,
  closeDB,
  // 用户
  findUserByOpenid,
  findUserById,
  createUser,
  updateUser,
  // 寓言币
  addCoinTransaction,
  consumeCoins,
  rechargeCoins,
  giveInviteReward,
  getCoinTransactions,
  // 订单
  createOrder,
  updateOrderStatus,
  findOrderByOrderNo
};

