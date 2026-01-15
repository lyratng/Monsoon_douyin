 # 衣索寓言 - 支付系统设计文档

> 创建时间：2025-12-18
> 状态：开发中
> 数据库：SQLite（未来可迁移至 MySQL）

---

## 一、功能概述

### 1.1 核心功能
- **用户登录**：抖音一键登录（手机号授权）
- **虚拟货币系统**：寓言币的获取、消费、充值
- **支付功能**：抖音担保支付
- **邀请奖励**：分享链接邀请好友，双方各得10币

### 1.2 业务规则

| 规则 | 说明 |
|------|------|
| 初始赠送 | 用户首次登录后赠送 10 枚寓言币 |
| 消费场景 | 单品建议、穿搭优化 - 点击"开始分析"时扣除 1 币 |
| 消费提示 | "消耗了一枚寓言币，还剩 X 枚" |
| 余额不足 | 弹出充值卡片（遮罩层） |
| 首充礼包 | 首次充值任意金额额外送 5 币 |
| 邀请奖励 | 邀请人和被邀请人各得 10 币 |
| 邀请绑定 | 以首次点击的邀请链接为准 |

### 1.3 充值档位

| 档位 | 价格 | 寓言币 | 标签 |
|------|------|--------|------|
| 档位1 | ¥5 | 10 币 | - |
| 档位2 | ¥12 | 30 币 | 最受欢迎 |
| 档位3 | ¥20 | 60 币 | 最划算 |

---

## 二、技术架构

### 2.1 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端小程序                                │
├─────────────────────────────────────────────────────────────────┤
│  登录组件   │  侧边栏  │  充值卡片  │  单品/穿搭（消费）         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   后端 API (api.radiance.asia)                   │
├─────────────────────────────────────────────────────────────────┤
│  /api/user/login        │  登录 & code2session                  │
│  /api/user/info         │  获取用户信息                          │
│  /api/coins/balance     │  查询寓言币余额                        │
│  /api/coins/consume     │  消费寓言币                            │
│  /api/coins/transactions│  消费记录                              │
│  /api/payment/create    │  创建支付订单                          │
│  /api/payment/callback  │  支付回调（抖音服务器调用）             │
│  /api/invite/bindInviter│  绑定邀请关系                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SQLite 数据库                               │
│                 /home/ecs-user/monsoon-api/data.db              │
├─────────────────────────────────────────────────────────────────┤
│  users              │  用户表                                    │
│  coin_transactions  │  寓言币流水                                │
│  invitations        │  邀请关系                                  │
│  orders             │  支付订单                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | 抖音小程序（ttml/ttss/js） |
| 后端 | Node.js 18 + Express |
| 数据库 | SQLite（better-sqlite3） |
| 部署 | 阿里云 ECS + PM2 + Nginx |
| 支付 | 抖音担保支付 |

---

## 三、数据库设计

### 3.1 用户表 (users)

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  openid TEXT UNIQUE NOT NULL,          -- 抖音唯一标识
  phone TEXT,                            -- 手机号
  nickname TEXT,                         -- 昵称
  avatar TEXT,                           -- 头像URL
  coins INTEGER DEFAULT 10,              -- 寓言币余额
  is_first_charge INTEGER DEFAULT 1,    -- 是否首充（1=是，0=否）
  inviter_id INTEGER,                   -- 邀请人用户ID
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (inviter_id) REFERENCES users(id)
);

-- 索引
CREATE INDEX idx_users_openid ON users(openid);
CREATE INDEX idx_users_phone ON users(phone);
```

### 3.2 寓言币流水表 (coin_transactions)

```sql
CREATE TABLE coin_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,                   -- 类型
  amount INTEGER NOT NULL,              -- 金额（正数增加，负数减少）
  balance_after INTEGER NOT NULL,       -- 交易后余额
  description TEXT,                     -- 描述
  order_id TEXT,                        -- 关联订单号（充值时）
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 类型枚举：
-- 'initial'         - 初始赠送
-- 'consume'         - 功能消费
-- 'recharge'        - 充值
-- 'first_bonus'     - 首充奖励
-- 'invite_reward'   - 邀请奖励
-- 'invited_reward'  - 被邀请奖励

-- 索引
CREATE INDEX idx_transactions_user ON coin_transactions(user_id);
CREATE INDEX idx_transactions_type ON coin_transactions(type);
CREATE INDEX idx_transactions_time ON coin_transactions(created_at);
```

### 3.3 邀请关系表 (invitations)

```sql
CREATE TABLE invitations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inviter_id INTEGER NOT NULL,          -- 邀请人
  invitee_id INTEGER NOT NULL,          -- 被邀请人
  inviter_rewarded INTEGER DEFAULT 0,   -- 邀请人奖励已发放
  invitee_rewarded INTEGER DEFAULT 0,   -- 被邀请人奖励已发放
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (inviter_id) REFERENCES users(id),
  FOREIGN KEY (invitee_id) REFERENCES users(id)
);

-- 索引
CREATE UNIQUE INDEX idx_invitations_invitee ON invitations(invitee_id);
CREATE INDEX idx_invitations_inviter ON invitations(inviter_id);
```

### 3.4 支付订单表 (orders)

```sql
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  order_no TEXT UNIQUE NOT NULL,        -- 商户订单号
  douyin_order_id TEXT,                 -- 抖音订单号
  amount INTEGER NOT NULL,              -- 金额（分）
  coins INTEGER NOT NULL,               -- 购买的币数
  status TEXT DEFAULT 'pending',        -- pending/paid/failed/refunded
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  paid_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 索引
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_order_no ON orders(order_no);
```

---

## 四、API 接口设计

### 4.1 登录接口

#### POST /api/user/login

**请求参数**：
```json
{
  "code": "tt.login获取的code",
  "encryptedData": "手机号加密数据",
  "iv": "加密向量",
  "inviter_openid": "邀请人openid（可选）"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "openid": "xxx",
    "phone": "138****1234",
    "nickname": "用户昵称",
    "avatar": "头像URL",
    "coins": 10,
    "is_new_user": true,
    "invite_reward": 10  // 如果是被邀请的新用户
  }
}
```

### 4.2 获取用户信息

#### GET /api/user/info?openid=xxx

**响应**：
```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "nickname": "用户昵称",
    "avatar": "头像URL",
    "phone": "138****1234",
    "coins": 18,
    "is_first_charge": true
  }
}
```

### 4.3 消费寓言币

#### POST /api/coins/consume

**请求参数**：
```json
{
  "openid": "用户openid",
  "amount": 1,
  "description": "单品建议"  // 或 "穿搭优化"
}
```

**响应（成功）**：
```json
{
  "success": true,
  "data": {
    "consumed": 1,
    "balance": 9,
    "message": "消耗了一枚寓言币，还剩9枚"
  }
}
```

**响应（余额不足）**：
```json
{
  "success": false,
  "code": "INSUFFICIENT_BALANCE",
  "message": "寓言币不足",
  "data": {
    "balance": 0
  }
}
```

### 4.4 查询消费记录

#### GET /api/coins/transactions?openid=xxx&limit=20

**响应**：
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "type": "consume",
      "amount": -1,
      "balance_after": 9,
      "description": "单品建议",
      "created_at": "2025-12-18 15:30:00"
    },
    {
      "id": 2,
      "type": "invite_reward",
      "amount": 10,
      "balance_after": 10,
      "description": "邀请好友奖励",
      "created_at": "2025-12-18 14:00:00"
    }
  ]
}
```

### 4.5 创建支付订单

#### POST /api/payment/create

**请求参数**：
```json
{
  "openid": "用户openid",
  "product_id": "coins_30"  // coins_10 / coins_30 / coins_60
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "order_no": "YY20251218153000001",
    "order_id": "抖音订单号",
    "order_token": "支付token（用于前端唤起支付）"
  }
}
```

### 4.6 支付回调

#### POST /api/payment/callback

> 由抖音服务器调用，需验签

---

## 五、前端组件设计

### 5.1 登录弹窗组件

**文件**：`components/login-popup/`

```
位置：页面底部弹出
触发：首次进入小程序 / 需要登录时
内容：
  - 标题：欢迎来到衣索寓言
  - 副标题：一键登录开启你的穿搭之旅
  - 按钮：📱 一键登录 (open-type="getPhoneNumber")
  - 关闭：稍后登录（点击空白处关闭）
```

### 5.2 侧边栏组件

**文件**：`components/sidebar/`

```
位置：从左侧滑出，覆盖60%宽度
触发：点击左上角 ≡ 按钮
内容：
  - 用户信息区：头像 + 昵称 + 手机号
  - 寓言币区：余额 + [充值] + [邀请好友]
  - 消费记录：最近20条流水
  - 设置入口：预留
```

### 5.3 充值卡片组件

**文件**：`components/recharge-card/`

```
位置：页面中央，带遮罩层
触发：余额不足 / 点击充值按钮
内容：
  - 标题：获取更多寓言币
  - 三档充值选项（带标签）
  - 分割线
  - 邀请好友入口
  - 首充提示（如适用）
  - 关闭按钮
```

---

## 六、页面改动清单

### 6.1 需要修改的页面

| 页面 | 改动内容 |
|------|----------|
| `pages/index/index` | 添加侧边栏入口按钮、登录弹窗、侧边栏组件 |
| `pages/exclusive-advice/exclusive-advice` | 添加侧边栏入口按钮 |
| `pages/item-suggestion/item-suggestion` | 添加寓言币消费逻辑 |
| `packageTools/pages/outfit-optimization/outfit-optimization` | 添加寓言币消费逻辑 |
| `app.js` | 添加全局用户状态管理 |

### 6.2 需要新增的文件

| 文件路径 | 说明 |
|----------|------|
| `components/login-popup/*` | 登录弹窗组件 |
| `components/sidebar/*` | 侧边栏组件 |
| `components/recharge-card/*` | 充值卡片组件 |
| `utils/user.js` | 用户相关工具函数 |
| `utils/payment.js` | 支付相关工具函数 |

---

## 七、后端改动清单

### 7.1 需要安装的依赖

```bash
cd /home/ecs-user/monsoon-api
npm install better-sqlite3 crypto-js uuid
```

### 7.2 需要新增的文件

| 文件 | 说明 |
|------|------|
| `database.js` | 数据库初始化和连接 |
| `routes/user.js` | 用户相关路由 |
| `routes/coins.js` | 寓言币相关路由 |
| `routes/payment.js` | 支付相关路由 |

### 7.3 需要修改的文件

| 文件 | 改动 |
|------|------|
| `server.js` | 引入新路由模块 |

---

## 八、抖音登录技术细节

### 8.1 登录流程

```
前端                          后端                        抖音服务器
  │                            │                              │
  │── tt.login() ─────────────►│                              │
  │◄──── code ─────────────────│                              │
  │                            │                              │
  │── 用户点击授权按钮 ────────►│                              │
  │◄── encryptedData + iv ─────│                              │
  │                            │                              │
  │── POST /api/user/login ───►│                              │
  │    (code, encrypted, iv)   │── code2session ─────────────►│
  │                            │◄── openid + session_key ────│
  │                            │                              │
  │                            │── 解密手机号 ────────────────│
  │                            │                              │
  │                            │── 创建/更新用户 ─────────────│
  │                            │                              │
  │◄── 用户信息 + token ───────│                              │
```

### 8.2 code2session 接口

**URL**：`https://developer.toutiao.com/api/apps/v2/jscode2session`

**请求**：
```json
{
  "appid": "tt6a791cc4f57bed5d01",
  "secret": "APP_SECRET",
  "code": "前端传来的code"
}
```

**响应**：
```json
{
  "err_no": 0,
  "err_tips": "success",
  "data": {
    "session_key": "xxx",
    "openid": "xxx",
    "anonymous_openid": "xxx",
    "unionid": "xxx"
  }
}
```

### 8.3 手机号解密

使用 AES-128-CBC 解密：
- Key: Base64解码的 session_key
- IV: Base64解码的 iv
- 数据: Base64解码的 encryptedData

---

## 九、抖音支付技术细节

### 9.1 支付流程

```
前端                          后端                        抖音服务器
  │                            │                              │
  │── POST /api/payment/create►│                              │
  │                            │── 创建预下单 ────────────────►│
  │                            │◄── order_id + order_token ──│
  │◄── order_token ────────────│                              │
  │                            │                              │
  │── tt.pay(order_token) ────►│                              │
  │         用户支付           │                              │
  │◄── 支付结果 ───────────────│                              │
  │                            │                              │
  │                            │◄── 支付回调 ─────────────────│
  │                            │    (异步通知)                │
  │                            │── 验签 + 发币 ───────────────│
  │                            │── 返回 success ─────────────►│
```

### 9.2 预下单接口

**URL**：`https://developer.toutiao.com/api/apps/ecpay/v1/create_order`

### 9.3 支付回调验签

需要使用抖音提供的公钥验证签名，确保回调来自抖音服务器。

---

## 十、迁移至 MySQL 指南

### 10.1 何时迁移
- 日活用户超过 1000
- 数据库文件超过 500MB
- 需要复杂查询或事务

### 10.2 迁移步骤

1. **安装 MySQL**
```bash
sudo yum install -y mysql-server
sudo systemctl start mysqld
sudo systemctl enable mysqld
```

2. **创建数据库**
```sql
CREATE DATABASE monsoon CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

3. **修改表结构**
```sql
-- 主要改动：
-- INTEGER → INT
-- TEXT → VARCHAR(255) 或 TEXT
-- datetime('now') → NOW()
-- 添加 AUTO_INCREMENT
```

4. **数据迁移**
```bash
# 导出 SQLite 数据
sqlite3 data.db .dump > dump.sql

# 转换 SQL 语法（手动或使用工具）

# 导入 MySQL
mysql -u root -p monsoon < dump_mysql.sql
```

5. **修改后端代码**
```javascript
// 将 better-sqlite3 替换为 mysql2
const mysql = require('mysql2/promise');
```

---

## 十一、开发进度追踪

### Phase 1: 后端基础设施
- [ ] 安装 SQLite 依赖
- [ ] 创建数据库初始化脚本
- [ ] 实现 code2session
- [ ] 实现手机号解密
- [ ] 实现用户登录接口

### Phase 2: 前端登录
- [ ] 登录弹窗组件
- [ ] 侧边栏组件
- [ ] 全局用户状态管理

### Phase 3: 寓言币系统
- [ ] 余额查询接口
- [ ] 消费接口
- [ ] 流水记录接口

### Phase 4: 充值功能
- [ ] 充值卡片组件
- [ ] 前端消费逻辑
- [ ] 余额不足处理

### Phase 5: 支付对接
- [ ] 创建订单接口
- [ ] 支付回调接口
- [ ] 前端支付唤起

### Phase 6: 邀请功能
- [ ] 分享链接生成
- [ ] 邀请关系绑定
- [ ] 奖励发放逻辑

### Phase 7: 联调测试
- [ ] 端到端测试
- [ ] 异常场景测试
- [ ] 性能优化

---

## 十二、注意事项

### 12.1 安全相关
- 所有涉及金额的操作必须在后端完成
- 支付回调必须验签
- 敏感信息（手机号）需要脱敏显示
- API 接口需要做频率限制

### 12.2 用户体验
- 登录失败要有友好提示
- 支付过程中显示加载状态
- 网络错误要有重试机制

### 12.3 数据一致性
- 消费和充值需要使用事务
- 邀请奖励需要防止重复发放
- 订单状态变更需要记录日志

---

**文档版本**：v1.0
**最后更新**：2025-12-18
**维护人员**：Claude AI Assistant

