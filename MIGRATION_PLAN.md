# 衣索寓言 - 跨平台迁移规划文档

## 📋 目录

1. [项目现状分析](#1-项目现状分析)
2. [框架选择决策](#2-框架选择决策)
3. [版本管理策略](#3-版本管理策略)
4. [迁移架构设计](#4-迁移架构设计)
5. [详细迁移步骤](#5-详细迁移步骤)
6. [API 适配方案](#6-api-适配方案)
7. [服务端改造](#7-服务端改造)
8. [测试方案](#8-测试方案)
9. [时间规划](#9-时间规划)
10. [风险管理](#10-风险管理)
11. [发布策略](#11-发布策略)

---

## 1. 项目现状分析

### 1.1 技术栈概览

| 层面 | 当前技术 | 说明 |
|------|---------|------|
| 前端框架 | 抖音原生小程序 | `.ttml` + `.ttss` + `.js` |
| 语法 | 类微信小程序 | `tt.xxx` API |
| 组件化 | 自定义组件 | login-popup, sidebar, recharge-card |
| 分包 | 3个分包 | packageReport, packageTools, packageDev |
| 后端 | Node.js + Express | api.radiance.asia |
| 数据库 | SQLite | 用户数据、寓言币 |
| AI 服务 | 火山引擎 | 图像识别、文本生成、图片生成 |
| 内容安全 | 抖音官方 API | 文本/图片内容检测 |

### 1.2 项目结构

```
Monsoon_douyin/
├── app.js                    # 入口文件
├── app.json                  # 全局配置
├── app.ttss                  # 全局样式
├── pages/                    # 主包页面
│   ├── index/               # 首页
│   ├── chat/                # 智能问答
│   ├── exclusive-advice/    # 专属建议
│   ├── item-suggestion/     # 单品建议
│   ├── test/                # 风格测试
│   └── guide/               # 引导页
├── packageReport/           # 报告分包
├── packageTools/            # 工具分包
├── packageDev/              # 开发分包
├── components/              # 公共组件
├── utils/                   # 工具函数
├── config/                  # 配置文件
├── assets/                  # 静态资源
└── server-deploy/           # 服务端代码
```

### 1.3 核心功能模块

| 模块 | 功能 | 依赖平台 API |
|------|------|-------------|
| 用户系统 | 登录、授权、用户信息 | `tt.login`, `tt.getUserProfile` |
| 风格测试 | 多步骤问卷、照片分析 | `tt.chooseImage`, `tt.getFileSystemManager` |
| AI 对话 | 穿搭咨询 | 无平台依赖 |
| 单品分析 | 拍照/选择衣物分析 | `tt.chooseImage`, `tt.showActionSheet` |
| 内容安全 | 文本/图片安全检测 | 后端调用抖音 API |
| 支付系统 | 寓言币充值 | `tt.pay` (抖音支付) |
| 存储 | 用户档案、聊天记录 | `tt.getStorageSync`, `tt.setStorageSync` |

### 1.4 代码量统计

| 类型 | 文件数 | 约代码行数 |
|------|-------|-----------|
| JavaScript | ~25 | ~4000 行 |
| 模板 (TTML) | ~15 | ~1500 行 |
| 样式 (TTSS) | ~15 | ~2000 行 |
| 配置文件 | ~8 | ~300 行 |
| 服务端 | ~8 | ~800 行 |
| **总计** | **~71** | **~8600 行** |

---

## 2. 框架选择决策

### 2.1 候选框架对比

| 特性 | uni-app | Taro | 原生分别开发 |
|------|---------|------|-------------|
| 语法基础 | Vue 2/3 | React/Vue | 各平台原生 |
| 微信小程序 | ✅ 完善 | ✅ 完善 | ✅ 原生 |
| 抖音小程序 | ✅ 完善 | ✅ 完善 | ✅ 原生 |
| iOS App | ✅ (原生渲染) | ✅ (React Native) | 需重写 |
| Android App | ✅ (原生渲染) | ✅ (React Native) | 需重写 |
| H5 | ✅ 支持 | ✅ 支持 | 需重写 |
| **迁移成本** | ⭐⭐ 低 | ⭐⭐⭐⭐ 高 | ⭐⭐⭐⭐⭐ 极高 |
| **学习成本** | ⭐⭐ 低 | ⭐⭐⭐ 中 | ⭐⭐⭐⭐ 高 |
| **生态系统** | ⭐⭐⭐⭐⭐ 丰富 | ⭐⭐⭐⭐ 丰富 | 分散 |
| **App 性能** | ⭐⭐⭐⭐ 优秀 | ⭐⭐⭐ 良好 | ⭐⭐⭐⭐⭐ 最优 |
| **社区支持** | ⭐⭐⭐⭐⭐ 活跃 | ⭐⭐⭐⭐ 活跃 | 分散 |

### 2.2 决策：选择 uni-app

**推荐使用 uni-app**，理由如下：

#### ✅ 迁移成本最低

```javascript
// 抖音原生小程序 (当前)
tt.getStorageSync('user_profile');
tt.navigateTo({ url: '/pages/test/test' });
tt.showToast({ title: '成功', icon: 'success' });

// uni-app (迁移后) - 几乎相同！
uni.getStorageSync('user_profile');
uni.navigateTo({ url: '/pages/test/test' });
uni.showToast({ title: '成功', icon: 'success' });
```

#### ✅ 模板语法高度兼容

```html
<!-- 抖音原生 (当前) -->
<view tt:if="{{hasReport}}" class="container">
  <text bindtap="viewReport">查看报告</text>
</view>

<!-- uni-app (迁移后) - 非常相似 -->
<view v-if="hasReport" class="container">
  <text @tap="viewReport">查看报告</text>
</view>
```

#### ✅ 一套代码多端运行

```
uni-app 项目
    ├── npm run dev:mp-weixin     → 微信小程序
    ├── npm run dev:mp-toutiao    → 抖音小程序
    ├── npm run dev:app-plus      → iOS/Android App
    └── npm run dev:h5            → H5 网页
```

#### ✅ App 端原生能力强

- 基于 Android/iOS 原生渲染引擎
- 支持 nvue 高性能原生页面
- 丰富的原生插件生态
- 支持 App 推送、地图、支付等原生能力

#### ✅ 社区生态完善

- 插件市场有大量现成组件
- 文档完善，中文友好
- 问题解决方案丰富

### 2.3 为什么不选择 Taro？

| 问题 | 说明 |
|------|------|
| 迁移成本高 | 需要将 Page/Component 语法完全重写为 React 组件 |
| 学习曲线 | 团队需要学习 React 生态 |
| 模板差异大 | `.ttml` → `.tsx` 改动量大 |
| App 端 | 依赖 React Native，配置复杂 |

---

## 3. 版本管理策略

### 3.1 分支策略

```
main                    ← 将改为 uni-app 跨平台版本
    │
    ├── douyin-original ← 创建分支保存当前抖音原生版本
    │
    ├── develop         ← 开发分支
    │
    ├── feature/*       ← 功能分支
    │
    └── release/*       ← 发布分支
```

### 3.2 立即执行的 Git 操作

```bash
# 步骤1: 确保当前代码已提交
git add .
git commit -m "feat: 抖音小程序完整版本 - 迁移前备份"

# 步骤2: 创建抖音原生版本分支
git checkout -b douyin-original
git push origin douyin-original

# 步骤3: 回到 main 分支，准备迁移
git checkout main

# 步骤4: 创建开发分支
git checkout -b develop
git push origin develop
```

### 3.3 版本命名规范

| 分支 | 版本格式 | 示例 |
|------|---------|------|
| main | `vX.Y.Z` | v2.0.0 (uni-app 首版) |
| douyin-original | `douyin-vX.Y.Z` | douyin-v1.5.0 |
| 微信小程序发布 | `weixin-vX.Y.Z` | weixin-v2.0.0 |
| App 发布 | `app-vX.Y.Z` | app-v2.0.0 |

### 3.4 迁移完成后的分支用途

| 分支 | 用途 |
|------|------|
| `main` | 统一代码主分支，uni-app 项目 |
| `douyin-original` | 抖音原生版本归档，紧急修复用 |
| `develop` | 日常开发，功能集成 |
| `release/weixin` | 微信小程序专用配置 |
| `release/douyin` | 抖音小程序专用配置 |
| `release/app` | App 专用配置和原生插件 |

---

## 4. 迁移架构设计

### 4.1 项目新结构

```
monsoon-uniapp/
├── src/
│   ├── App.vue                 # 入口组件
│   ├── main.js                 # 入口文件
│   ├── manifest.json           # 应用配置（多端）
│   ├── pages.json              # 页面配置
│   ├── uni.scss                # 全局样式变量
│   │
│   ├── pages/                  # 主包页面
│   │   ├── index/
│   │   │   └── index.vue       # 合并 .ttml + .ttss + .js
│   │   ├── chat/
│   │   │   └── chat.vue
│   │   ├── test/
│   │   │   └── test.vue
│   │   └── ...
│   │
│   ├── pagesReport/            # 报告分包
│   │   └── report/
│   │       └── report.vue
│   │
│   ├── pagesTools/             # 工具分包
│   │   ├── item-result/
│   │   ├── outfit-optimization/
│   │   └── ...
│   │
│   ├── pagesDev/               # 开发分包（可选）
│   │
│   ├── components/             # 公共组件
│   │   ├── login-popup/
│   │   │   └── login-popup.vue
│   │   ├── sidebar/
│   │   │   └── sidebar.vue
│   │   └── recharge-card/
│   │       └── recharge-card.vue
│   │
│   ├── utils/                  # 工具函数
│   │   ├── api.js              # API 调用
│   │   ├── user.js             # 用户系统
│   │   ├── payment.js          # 支付相关
│   │   └── platform.js         # 🆕 平台适配层
│   │
│   ├── config/                 # 配置文件
│   │   ├── env.js              # 环境配置
│   │   └── platform.js         # 🆕 平台特定配置
│   │
│   ├── static/                 # 静态资源
│   │   └── images/
│   │       ├── tabbar/
│   │       └── ...
│   │
│   └── store/                  # 🆕 Vuex 状态管理（可选）
│       └── index.js
│
├── server-deploy/              # 服务端代码（保持不变）
│
├── package.json
├── vue.config.js               # Vue CLI 配置
└── README.md
```

### 4.2 多端配置架构

```javascript
// manifest.json 核心配置结构
{
  "name": "衣索寓言",
  "appid": "__UNI__XXXXXXX",
  "versionName": "2.0.0",
  "versionCode": "200",
  
  // 微信小程序配置
  "mp-weixin": {
    "appid": "wx_your_appid",
    "setting": { "urlCheck": false },
    "usingComponents": true
  },
  
  // 抖音小程序配置
  "mp-toutiao": {
    "appid": "tt6a791cc4f57bed5d01",
    "setting": { "urlCheck": false }
  },
  
  // App 配置
  "app-plus": {
    "distribute": {
      "android": {
        "packagename": "com.monsoon.yisuoyuyan",
        "keystore": "release.keystore"
      },
      "ios": {
        "appid": "com.monsoon.yisuoyuyan",
        "mobileprovision": "xxx.mobileprovision"
      }
    },
    "modules": {
      "OAuth": { "weixin": {}, "qq": {} },
      "Payment": { "alipay": {}, "weixin": {} },
      "Push": {}
    }
  }
}
```

### 4.3 平台适配层设计

```javascript
// src/utils/platform.js - 平台适配核心

/**
 * 平台检测
 */
export function getPlatform() {
  // #ifdef MP-WEIXIN
  return 'mp-weixin';
  // #endif
  
  // #ifdef MP-TOUTIAO
  return 'mp-toutiao';
  // #endif
  
  // #ifdef APP-PLUS
  return 'app';
  // #endif
  
  // #ifdef H5
  return 'h5';
  // #endif
  
  return 'unknown';
}

/**
 * 统一登录接口
 */
export async function platformLogin() {
  const platform = getPlatform();
  
  // #ifdef MP-WEIXIN
  return new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: res => resolve(res.code),
      fail: reject
    });
  });
  // #endif
  
  // #ifdef MP-TOUTIAO
  return new Promise((resolve, reject) => {
    uni.login({
      success: res => resolve(res.code),
      fail: reject
    });
  });
  // #endif
  
  // #ifdef APP-PLUS
  return new Promise((resolve, reject) => {
    // App 端使用 OAuth 登录或自定义登录
    uni.login({
      provider: 'weixin', // 或 'qq', 'apple' 等
      success: res => resolve(res.code),
      fail: reject
    });
  });
  // #endif
  
  // #ifdef H5
  // H5 使用账号密码或手机验证码登录
  throw new Error('H5 需要使用账号密码登录');
  // #endif
}

/**
 * 统一支付接口
 */
export async function platformPay(orderInfo) {
  const platform = getPlatform();
  
  // #ifdef MP-WEIXIN
  return uni.requestPayment({
    provider: 'wxpay',
    ...orderInfo.weixin
  });
  // #endif
  
  // #ifdef MP-TOUTIAO
  return uni.requestPayment({
    provider: 'toutiao',
    ...orderInfo.toutiao
  });
  // #endif
  
  // #ifdef APP-PLUS
  return uni.requestPayment({
    provider: orderInfo.provider || 'alipay', // 'alipay' | 'wxpay'
    ...orderInfo[orderInfo.provider]
  });
  // #endif
}

/**
 * 内容安全检测（平台相关）
 */
export async function checkContentSecurity(content, type = 'text') {
  const platform = getPlatform();
  
  // 小程序端调用后端 API（后端调用平台官方检测）
  // #ifdef MP-WEIXIN || MP-TOUTIAO
  return uni.request({
    url: `${API_BASE}/api/content-security/${type}`,
    method: 'POST',
    data: type === 'text' ? { text: content } : { image_data: content }
  });
  // #endif
  
  // App 端可以使用第三方检测或自建检测
  // #ifdef APP-PLUS
  return uni.request({
    url: `${API_BASE}/api/content-security/${type}`,
    method: 'POST',
    data: type === 'text' ? { text: content } : { image_data: content }
  });
  // #endif
}
```

---

## 5. 详细迁移步骤

### 5.1 阶段一：环境准备（1天）

#### 5.1.1 安装 uni-app CLI

```bash
# 全局安装 vue-cli
npm install -g @vue/cli

# 创建 uni-app 项目
vue create -p dcloudio/uni-preset-vue monsoon-uniapp

# 选择 Vue 2 + JavaScript 模板（与当前代码更兼容）
```

#### 5.1.2 配置开发环境

```bash
# 进入项目目录
cd monsoon-uniapp

# 安装依赖
npm install

# 安装可能需要的额外依赖
npm install axios dayjs
```

#### 5.1.3 配置 HBuilderX（推荐）

虽然可以用 VSCode + CLI 开发，但 HBuilderX 对 uni-app 有更好的支持：
- 真机调试更方便
- App 打包更简单
- 代码提示更完善

### 5.2 阶段二：核心文件迁移（3-5天）

#### 5.2.1 全局配置迁移

**app.json → pages.json**

```json
// pages.json
{
  "pages": [
    { "path": "pages/index/index", "style": { "navigationBarTitleText": "风格报告" } },
    { "path": "pages/chat/chat", "style": { "navigationBarTitleText": "智能问答" } },
    { "path": "pages/exclusive-advice/exclusive-advice", "style": { "navigationBarTitleText": "专属建议" } },
    { "path": "pages/item-suggestion/item-suggestion", "style": { "navigationBarTitleText": "单品建议" } },
    { "path": "pages/guide/guide", "style": { "navigationBarTitleText": "引导" } },
    { "path": "pages/test/test", "style": { "navigationBarTitleText": "风格测试" } }
  ],
  
  "subPackages": [
    {
      "root": "pagesReport",
      "pages": [
        { "path": "report/report", "style": { "navigationBarTitleText": "风格报告" } }
      ]
    },
    {
      "root": "pagesTools",
      "pages": [
        { "path": "item-result/item-result" },
        { "path": "outfit-optimization/outfit-optimization" },
        { "path": "outfit-result/outfit-result" },
        { "path": "outfit-history/outfit-history" }
      ]
    }
  ],
  
  "preloadRule": {
    "pages/test/test": {
      "network": "all",
      "packages": ["pagesReport"]
    }
  },
  
  "globalStyle": {
    "navigationBarBackgroundColor": "#F5F5F0",
    "navigationBarTitleText": "衣索寓言",
    "navigationBarTextStyle": "black",
    "backgroundColor": "#F5F5F0"
  },
  
  "tabBar": {
    "color": "#999999",
    "selectedColor": "#2C2C2C",
    "backgroundColor": "#F5F5F0",
    "borderStyle": "black",
    "list": [
      {
        "pagePath": "pages/index/index",
        "text": "风格报告",
        "iconPath": "static/images/tabbar/profile-normal.png",
        "selectedIconPath": "static/images/tabbar/profile-active.png"
      },
      {
        "pagePath": "pages/chat/chat",
        "text": "智能问答",
        "iconPath": "static/images/tabbar/chat-normal.png",
        "selectedIconPath": "static/images/tabbar/chat-active.png"
      },
      {
        "pagePath": "pages/exclusive-advice/exclusive-advice",
        "text": "专属建议",
        "iconPath": "static/images/tabbar/item-normal.png",
        "selectedIconPath": "static/images/tabbar/item-active.png"
      }
    ]
  }
}
```

**app.js → App.vue**

```vue
<!-- App.vue -->
<script>
import userUtils from '@/utils/user.js';

export default {
  globalData: {
    isFirstTime: true,
    currentTestStep: 1,
    maxTestSteps: 16,
    userProfile: null,
    openid: null,
    serverUserInfo: null,
    isServerLoggedIn: false,
    inviterOpenid: null,
    coinBalance: 0,
    isFirstCharge: true
  },
  
  onLaunch(options) {
    console.log('衣索寓言小程序启动', options);
    
    // 初始化用户档案系统
    this.initUserProfile();
    this.checkFirstTimeUser();
    userUtils.initUserState();
    
    // 处理分享参数
    if (options?.query?.inviter) {
      this.globalData.inviterOpenid = options.query.inviter;
    }
    
    // 静默登录
    this.silentLogin();
  },
  
  onShow(options) {
    console.log('App Show', options);
  },
  
  methods: {
    silentLogin() {
      userUtils.silentLogin().then(result => {
        this.globalData.serverUserInfo = result.user;
        this.globalData.isServerLoggedIn = result.is_registered;
        this.globalData.openid = result.openid;
      }).catch(err => {
        console.log('静默登录失败:', err.message);
      });
    },
    
    initUserProfile() {
      try {
        const userProfile = uni.getStorageSync('user_profile');
        if (!userProfile) {
          const emptyProfile = this.createEmptyUserProfile();
          uni.setStorageSync('user_profile', emptyProfile);
        }
      } catch (error) {
        console.error('初始化用户档案失败:', error);
      }
    },
    
    createEmptyUserProfile() {
      return {
        basic_info: {
          gender: null,
          age: null,
          height: null,
          weight: null,
          wrist_color: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        color_analysis: null,
        personality_test: { scores: { a: 0, b: 0, c: 0, d: 0 }, energy_type: null, mbti: null },
        preferences: { favorite_colors: [], occasions: [], style_awareness: null, shopping_satisfaction: null },
        style_report: null,
        conversation_memory: { natural_language_memory: "", conversation_history: [] },
        version: "1.0",
        test_count: 0
      };
    },
    
    checkFirstTimeUser() {
      try {
        const userProfile = uni.getStorageSync('user_profile');
        this.globalData.isFirstTime = !userProfile?.style_report;
      } catch (error) {
        this.globalData.isFirstTime = true;
      }
    },
    
    getUserProfile() {
      try {
        return uni.getStorageSync('user_profile') || this.createEmptyUserProfile();
      } catch (error) {
        return this.createEmptyUserProfile();
      }
    },
    
    updateUserProfile(updates) {
      // 与原有逻辑相同，将 tt. 替换为 uni.
      // ... 完整实现
    }
  }
};
</script>

<style>
/* 全局样式 - 从 app.ttss 迁移 */
page {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  background-color: #F5F5F0;
  color: #2C2C2C;
  line-height: 1.6;
}
/* ... 其他全局样式 */
</style>
```

#### 5.2.2 页面迁移示例

**index.ttml + index.ttss + index.js → index.vue**

```vue
<!-- pages/index/index.vue -->
<template>
  <view class="container gradient-bg">
    <!-- 侧边栏入口按钮 -->
    <view class="menu-btn" @tap="openSidebar">
      <view class="menu-line"></view>
      <view class="menu-line"></view>
      <view class="menu-line"></view>
    </view>
    
    <!-- 极简初始页面 -->
    <view v-if="showInitial" class="initial-container">
      <view class="initial-hero">
        <text class="initial-title" @tap="handleTitleClick">衣索寓言</text>
        <text class="initial-subtitle">AI穿搭风格诊断</text>
      </view>
      <view class="initial-actions">
        <button class="initial-btn" @tap="startTest">开启风格之旅</button>
        <button v-if="showGPT5Test" class="simple-btn debug" @tap="openGPT5Test">🧪 GPT-5测试</button>
      </view>
    </view>

    <!-- 首次用户引导页面 -->
    <view v-else-if="!hasReport" class="report-simple-container">
      <view class="photo-background">
        <image class="main-photo" src="/static/images/home/main-photo.png" mode="widthFix" />
      </view>
      <view class="floating-content">
        <view class="simple-hero-first">
          <text class="simple-title title-lowered" @tap="handleTitleClick">衣索寓言</text>
        </view>
        <view class="simple-actions">
          <button class="simple-btn primary" @tap="startTest">开启风格之旅</button>
        </view>
      </view>
    </view>

    <!-- 已有报告的用户页面 -->
    <view v-else class="report-simple-container">
      <view class="photo-background">
        <image class="main-photo" src="/static/images/home/main-photo.png" mode="widthFix" />
      </view>
      <view class="floating-content">
        <view class="simple-hero">
          <text class="simple-title title-lowered" @tap="handleTitleClick">衣索寓言</text>
        </view>
        <view class="simple-actions">
          <button class="simple-btn primary" @tap="viewReport">查看风格报告</button>
          <button class="simple-btn secondary" @tap="retakeTest">重新测试</button>
        </view>
      </view>
    </view>
    
    <!-- 组件 -->
    <login-popup 
      :show="showLoginPopup"
      :inviter-openid="inviterOpenid"
      @loginsuccess="onLoginSuccess"
      @close="onLoginPopupClose"
    />
    
    <sidebar 
      :show="showSidebar"
      @close="onSidebarClose"
      @login="onSidebarLogin"
      @recharge="onSidebarRecharge"
      @invite="onInviteFriends"
    />
    
    <recharge-card 
      :show="showRechargeCard"
      :is-first-charge="isFirstCharge"
      :current-balance="coinBalance"
      @close="onRechargeCardClose"
      @rechargesuccess="onRechargeSuccess"
      @needlogin="onNeedLogin"
      @invite="onInviteFriends"
    />
  </view>
</template>

<script>
import userUtils from '@/utils/user.js';
import LoginPopup from '@/components/login-popup/login-popup.vue';
import Sidebar from '@/components/sidebar/sidebar.vue';
import RechargeCard from '@/components/recharge-card/recharge-card.vue';

export default {
  components: {
    LoginPopup,
    Sidebar,
    RechargeCard
  },
  
  data() {
    return {
      hasReport: false,
      userProfile: null,
      seasonType: '',
      energyType: '',
      showInitial: false,
      statusBarHeight: 0,
      navigationHeight: 0,
      capsuleInfo: null,
      showGPT5Test: false,
      titleClickCount: 0,
      firstClickTime: 0,
      showLoginPopup: false,
      showSidebar: false,
      showRechargeCard: false,
      inviterOpenid: '',
      coinBalance: 0,
      isFirstCharge: true,
      serverUserInfo: null
    };
  },
  
  onLoad(options) {
    console.log('个人风格报告页面加载', options);
    this.getSystemInfo();
    
    if (options?.inviter) {
      this.inviterOpenid = options.inviter;
      getApp().globalData.inviterOpenid = options.inviter;
    }
    
    if (options?.showInitial === 'true') {
      this.showInitial = true;
      this.hasReport = false;
    } else {
      this.checkUserReport();
    }
    
    this.loadUserBalance();
  },
  
  onShow() {
    this.showGPT5Test = false;
    this.titleClickCount = 0;
    this.firstClickTime = 0;
    
    const app = getApp();
    if (app.globalData?.showInitialPage) {
      this.showInitial = true;
      this.hasReport = false;
      app.globalData.showInitialPage = false;
    } else if (!this.showInitial) {
      this.checkUserReport();
    }
    
    this.loadUserBalance();
  },
  
  methods: {
    getSystemInfo() {
      const systemInfo = uni.getSystemInfoSync();
      this.statusBarHeight = systemInfo.statusBarHeight || 0;
      
      // 跨平台获取胶囊信息
      // #ifdef MP-TOUTIAO
      try {
        const capsuleInfo = tt.getCustomButtonBoundingClientRect?.();
        if (capsuleInfo) {
          this.capsuleInfo = capsuleInfo;
          this.navigationHeight = capsuleInfo.height + (capsuleInfo.top - systemInfo.statusBarHeight) * 2;
        }
      } catch (e) { }
      // #endif
      
      // #ifdef MP-WEIXIN
      try {
        const capsuleInfo = wx.getMenuButtonBoundingClientRect?.();
        if (capsuleInfo) {
          this.capsuleInfo = capsuleInfo;
          this.navigationHeight = capsuleInfo.height + (capsuleInfo.top - systemInfo.statusBarHeight) * 2;
        }
      } catch (e) { }
      // #endif
    },
    
    checkUserReport() {
      try {
        const app = getApp();
        const userProfile = app.getUserProfile();
        this.userProfile = userProfile;
        this.hasReport = !!userProfile.style_report;
        this.seasonType = userProfile.style_report?.season_name || '';
        this.energyType = userProfile.style_report?.energy_type_name || '';
      } catch (error) {
        this.hasReport = false;
      }
    },
    
    startTest() {
      uni.navigateTo({ url: '/pages/guide/guide' });
    },
    
    viewReport() {
      if (this.hasReport) {
        uni.navigateTo({ url: '/pagesReport/report/report' });
      } else {
        this.startTest();
      }
    },
    
    retakeTest() {
      uni.showModal({
        title: '确认重新测试',
        content: '重新测试将覆盖您当前的风格报告，确定要继续吗？',
        success: (res) => {
          if (res.confirm) {
            // 重置用户数据...
            this.startTest();
          }
        }
      });
    },
    
    handleTitleClick() {
      const currentTime = Date.now();
      
      if (this.titleClickCount === 0) {
        this.titleClickCount = 1;
        this.firstClickTime = currentTime;
      } else {
        const timeDiff = currentTime - this.firstClickTime;
        if (timeDiff > 3000) {
          this.titleClickCount = 1;
          this.firstClickTime = currentTime;
        } else {
          this.titleClickCount++;
          if (this.titleClickCount >= 3) {
            this.showGPT5Test = true;
            uni.showToast({ title: '✨ 已解锁测试功能', icon: 'none' });
          }
        }
      }
    },
    
    async loadUserBalance() {
      const app = getApp();
      if (app.globalData.isServerLoggedIn || userUtils.isLoggedIn()) {
        try {
          const balanceData = await userUtils.getCoinBalance();
          this.coinBalance = balanceData.balance;
          this.isFirstCharge = balanceData.isFirstCharge;
        } catch (e) { }
      }
    },
    
    openSidebar() { this.showSidebar = true; },
    onSidebarClose() { this.showSidebar = false; },
    onSidebarLogin() { this.showSidebar = false; this.showLoginPopup = true; },
    onSidebarRecharge() { this.showSidebar = false; this.showRechargeCard = true; },
    
    onLoginSuccess(userData) {
      this.serverUserInfo = userData;
      this.coinBalance = userData.coins;
      this.isFirstCharge = userData.is_first_charge;
      const app = getApp();
      app.globalData.serverUserInfo = userData;
      app.globalData.isServerLoggedIn = true;
    },
    
    onLoginPopupClose() { this.showLoginPopup = false; },
    onRechargeCardClose() { this.showRechargeCard = false; },
    
    onRechargeSuccess({ plan, result }) {
      this.loadUserBalance();
      this.showRechargeCard = false;
    },
    
    onNeedLogin() {
      this.showRechargeCard = false;
      this.showLoginPopup = true;
    },
    
    onInviteFriends() {
      // 触发分享...
    }
  },
  
  // 分享配置
  onShareAppMessage() {
    const openid = userUtils.getOpenid();
    let path = '/pages/index/index';
    if (openid) path += '?inviter=' + openid;
    return {
      title: '发现你的专属穿搭风格！首次登录送10枚寓言币',
      path: path
    };
  }
};
</script>

<style lang="scss" scoped>
/* 从 index.ttss 迁移样式 */
.container {
  padding: 20rpx;
  min-height: 100vh;
}

.gradient-bg {
  background: linear-gradient(135deg, #F5F5F0 0%, #E8E8E3 50%, #F5F5F0 100%);
}

/* ... 其他样式 */
</style>
```

### 5.3 阶段三：工具函数迁移（1-2天）

#### 5.3.1 API 调用迁移

```javascript
// utils/api.js - 主要改动是将 tt. 替换为 uni.

// 带重试的API请求
function apiRequestWithRetry(options, retryCount = 0) {
  return new Promise((resolve, reject) => {
    uni.request({  // tt.request → uni.request
      ...options,
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res);
        } else {
          reject(new Error(`API请求失败: ${res.statusCode}`));
        }
      },
      fail: async (error) => {
        if (error.statusCode === 429 && retryCount < CONFIG.MAX_RETRIES) {
          await new Promise(r => setTimeout(r, CONFIG.RETRY_DELAY * (retryCount + 1)));
          try {
            const result = await apiRequestWithRetry(options, retryCount + 1);
            resolve(result);
          } catch (err) {
            reject(err);
          }
        } else {
          reject(error);
        }
      }
    });
  });
}

// 图像分析 - 文件系统调用
function analyzeImage(imagePath, wristColor) {
  return new Promise((resolve, reject) => {
    // 读取图片文件
    // #ifdef MP-WEIXIN || MP-TOUTIAO
    const fs = uni.getFileSystemManager();
    fs.readFile({
      filePath: imagePath,
      encoding: 'base64',
      success: (res) => {
        // ... 调用API
      },
      fail: reject
    });
    // #endif
    
    // #ifdef APP-PLUS
    // App 端使用 plus.io 读取文件
    plus.io.resolveLocalFileSystemURL(imagePath, (entry) => {
      entry.file((file) => {
        const reader = new plus.io.FileReader();
        reader.onloadend = (e) => {
          const base64 = e.target.result.split(',')[1];
          // ... 调用API
        };
        reader.readAsDataURL(file);
      });
    });
    // #endif
  });
}
```

#### 5.3.2 用户系统迁移

```javascript
// utils/user.js - 平台适配

import { getPlatform, platformLogin } from './platform.js';

const API_BASE = 'https://api.radiance.asia';

/**
 * 静默登录 - 跨平台
 */
async function silentLogin() {
  const platform = getPlatform();
  
  try {
    const code = await platformLogin();
    
    const response = await request('/api/user/silent-login', 'POST', {
      code: code,
      platform: platform  // 告知后端是哪个平台
    });
    
    if (response.success) {
      // 存储用户信息...
      return response.data;
    } else {
      throw new Error(response.message);
    }
  } catch (error) {
    throw error;
  }
}

/**
 * 通用请求函数
 */
function request(path, method = 'GET', data = {}) {
  return new Promise((resolve, reject) => {
    const url = API_BASE + path;
    
    uni.request({  // tt.request → uni.request
      url: method === 'GET' ? `${url}?${objectToQueryString(data)}` : url,
      method: method,
      data: method === 'GET' ? {} : data,
      header: { 'Content-Type': 'application/json' },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      },
      fail: reject
    });
  });
}

export {
  silentLogin,
  loginWithUserInfo,
  loginWithPhone,
  getUserInfo,
  getCoinBalance,
  consumeCoins,
  isLoggedIn,
  getOpenid,
  logout,
  initUserState
};
```

### 5.4 阶段四：组件迁移（2天）

#### 5.4.1 组件迁移示例

**login-popup.js + .ttml + .ttss → login-popup.vue**

```vue
<!-- components/login-popup/login-popup.vue -->
<template>
  <view v-if="show" class="popup-mask" @tap="handleMaskClick">
    <view class="popup-content" :class="{ show: animationClass }" @tap.stop="handleContentClick">
      <view class="popup-header">
        <text class="popup-title">登录/注册</text>
        <text class="popup-subtitle">获取专属穿搭建议，赢取寓言币</text>
      </view>
      
      <view class="popup-body">
        <!-- 主登录按钮 - 跨平台适配 -->
        <!-- #ifdef MP-TOUTIAO -->
        <button 
          class="login-btn primary" 
          :loading="isLoading"
          @tap="handleDouyinLogin"
        >
          <text>抖音授权登录</text>
        </button>
        <!-- #endif -->
        
        <!-- #ifdef MP-WEIXIN -->
        <button 
          class="login-btn primary"
          :loading="isLoading"
          open-type="getUserInfo"
          @getuserinfo="handleWeixinLogin"
        >
          <text>微信授权登录</text>
        </button>
        <!-- #endif -->
        
        <!-- #ifdef APP-PLUS -->
        <button 
          class="login-btn primary"
          :loading="isLoading"
          @tap="handleAppLogin"
        >
          <text>微信一键登录</text>
        </button>
        <button 
          class="login-btn secondary"
          :loading="isLoading"
          @tap="handlePhoneLogin"
        >
          <text>手机号登录</text>
        </button>
        <!-- #endif -->
        
        <button class="login-btn text" @tap="handleLater">
          <text>稍后登录</text>
        </button>
      </view>
      
      <view class="popup-footer">
        <text class="agreement-text">
          登录即表示同意《用户协议》和《隐私政策》
        </text>
      </view>
    </view>
  </view>
</template>

<script>
import userUtils from '@/utils/user.js';
import { platformLogin, getPlatform } from '@/utils/platform.js';

export default {
  name: 'LoginPopup',
  
  props: {
    show: { type: Boolean, default: false },
    inviterOpenid: { type: String, default: '' },
    enablePhoneLogin: { type: Boolean, default: false }
  },
  
  data() {
    return {
      isLoading: false,
      animationClass: ''
    };
  },
  
  watch: {
    show(val) {
      if (val) {
        setTimeout(() => { this.animationClass = 'show'; }, 50);
      } else {
        this.animationClass = '';
      }
    }
  },
  
  methods: {
    // 抖音登录
    async handleDouyinLogin() {
      this.isLoading = true;
      
      try {
        // 获取用户信息
        const userInfo = await new Promise((resolve, reject) => {
          uni.getUserProfile({
            desc: '用于完善用户资料',
            success: res => resolve(res.userInfo),
            fail: reject
          });
        });
        
        const userData = await userUtils.loginWithUserInfo(userInfo, this.inviterOpenid);
        this.handleLoginSuccess(userData);
      } catch (error) {
        this.isLoading = false;
        uni.showToast({ title: error.message || '登录失败', icon: 'none' });
      }
    },
    
    // 微信登录
    handleWeixinLogin(e) {
      if (!e.detail.userInfo) {
        uni.showToast({ title: '需要授权才能登录', icon: 'none' });
        return;
      }
      
      this.isLoading = true;
      userUtils.loginWithUserInfo(e.detail.userInfo, this.inviterOpenid)
        .then(this.handleLoginSuccess)
        .catch(err => {
          this.isLoading = false;
          uni.showToast({ title: err.message, icon: 'none' });
        });
    },
    
    // App 端登录
    async handleAppLogin() {
      this.isLoading = true;
      
      try {
        // App 端使用 OAuth 登录
        const loginResult = await new Promise((resolve, reject) => {
          uni.login({
            provider: 'weixin',
            success: resolve,
            fail: reject
          });
        });
        
        // 调用后端登录接口...
      } catch (error) {
        this.isLoading = false;
        uni.showToast({ title: '登录失败', icon: 'none' });
      }
    },
    
    handleLoginSuccess(userData) {
      let welcomeMsg = '登录成功！';
      if (userData.is_new_user) {
        welcomeMsg = userData.invite_reward > 0 ? '欢迎加入！获得20枚寓言币' : '欢迎加入！已赠送10枚寓言币';
      }
      
      uni.showToast({ title: welcomeMsg, icon: 'success', duration: 2000 });
      this.isLoading = false;
      
      this.$emit('loginsuccess', userData);
      this.close();
    },
    
    handleMaskClick() { this.close(); },
    handleContentClick() { /* 阻止冒泡 */ },
    close() {
      this.animationClass = '';
      setTimeout(() => { this.$emit('close'); }, 300);
    },
    handleLater() { this.close(); }
  }
};
</script>

<style lang="scss" scoped>
.popup-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 999;
}

.popup-content {
  width: 100%;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 40rpx;
  transform: translateY(100%);
  transition: transform 0.3s ease-out;
  
  &.show {
    transform: translateY(0);
  }
}

/* ... 其他样式 */
</style>
```

### 5.5 阶段五：静态资源迁移（0.5天）

```bash
# 资源目录映射
assets/images/  →  static/images/

# 图片引用路径调整
/assets/images/tabbar/  →  /static/images/tabbar/
```

### 5.6 阶段六：多端调试（2-3天）

```bash
# 微信小程序
npm run dev:mp-weixin

# 抖音小程序
npm run dev:mp-toutiao

# H5
npm run dev:h5

# App（需要 HBuilderX）
# 在 HBuilderX 中运行到模拟器/真机
```

---

## 6. API 适配方案

### 6.1 API 替换对照表

| 抖音原生 | uni-app | 说明 |
|---------|---------|------|
| `tt.request` | `uni.request` | 网络请求 |
| `tt.login` | `uni.login` | 登录 |
| `tt.getUserProfile` | `uni.getUserProfile` | 获取用户信息 |
| `tt.chooseImage` | `uni.chooseImage` | 选择图片 |
| `tt.showToast` | `uni.showToast` | 提示 |
| `tt.showModal` | `uni.showModal` | 模态框 |
| `tt.navigateTo` | `uni.navigateTo` | 页面跳转 |
| `tt.getStorageSync` | `uni.getStorageSync` | 同步存储 |
| `tt.setStorageSync` | `uni.setStorageSync` | 同步存储 |
| `tt.getFileSystemManager` | `uni.getFileSystemManager` | 文件系统（小程序） |
| `tt.downloadFile` | `uni.downloadFile` | 下载文件 |
| `tt.getSystemInfoSync` | `uni.getSystemInfoSync` | 系统信息 |
| `tt.pay` | `uni.requestPayment` | 支付 |
| `tt.showShareMenu` | `uni.showShareMenu` | 分享菜单 |

### 6.2 平台特有 API 处理

```javascript
// 条件编译处理平台差异
// #ifdef MP-TOUTIAO
// 抖音特有API
const capsuleInfo = tt.getCustomButtonBoundingClientRect();
// #endif

// #ifdef MP-WEIXIN
// 微信特有API
const capsuleInfo = wx.getMenuButtonBoundingClientRect();
// #endif

// #ifdef APP-PLUS
// App 端使用 plus API
const capsuleInfo = null; // App 端无胶囊按钮
// #endif
```

### 6.3 支付适配

```javascript
// utils/payment.js

export async function requestPayment(orderInfo) {
  const platform = getPlatform();
  
  // #ifdef MP-WEIXIN
  return uni.requestPayment({
    provider: 'wxpay',
    timeStamp: orderInfo.timeStamp,
    nonceStr: orderInfo.nonceStr,
    package: orderInfo.package,
    signType: orderInfo.signType,
    paySign: orderInfo.paySign
  });
  // #endif
  
  // #ifdef MP-TOUTIAO
  return new Promise((resolve, reject) => {
    tt.pay({
      orderInfo: orderInfo.orderInfo,
      service: orderInfo.service || 5,
      success: resolve,
      fail: reject
    });
  });
  // #endif
  
  // #ifdef APP-PLUS
  return uni.requestPayment({
    provider: orderInfo.provider || 'alipay', // 'alipay' | 'wxpay'
    orderInfo: orderInfo.orderString
  });
  // #endif
}
```

---

## 7. 服务端改造

### 7.1 多平台用户系统

```javascript
// server-deploy/routes/user.js - 改造

// 静默登录 - 支持多平台
router.post('/silent-login', async (req, res) => {
  const { code, platform } = req.body;
  
  let openid;
  
  switch (platform) {
    case 'mp-toutiao':
      openid = await getDouyinOpenid(code);
      break;
    case 'mp-weixin':
      openid = await getWeixinOpenid(code);
      break;
    case 'app':
      // App 端可能使用不同的登录方式
      openid = await getAppOpenid(code);
      break;
    default:
      return res.status(400).json({ success: false, message: '不支持的平台' });
  }
  
  // 查询或创建用户...
});

// 获取抖音 openid
async function getDouyinOpenid(code) {
  const response = await axios.get('https://developer.toutiao.com/api/apps/jscode2session', {
    params: {
      appid: DOUYIN_CONFIG.APP_ID,
      secret: DOUYIN_CONFIG.APP_SECRET,
      code: code
    }
  });
  return response.data.openid;
}

// 获取微信 openid
async function getWeixinOpenid(code) {
  const response = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
    params: {
      appid: WEIXIN_CONFIG.APP_ID,
      secret: WEIXIN_CONFIG.APP_SECRET,
      js_code: code,
      grant_type: 'authorization_code'
    }
  });
  return response.data.openid;
}
```

### 7.2 多平台内容安全

```javascript
// server-deploy/routes/content-security.js

// 文本安全检测 - 多平台
router.post('/text', async (req, res) => {
  const { text, platform } = req.body;
  
  let result;
  
  switch (platform) {
    case 'mp-toutiao':
      result = await checkDouyinTextSafety(text);
      break;
    case 'mp-weixin':
      result = await checkWeixinTextSafety(text);
      break;
    case 'app':
    case 'h5':
      // App/H5 使用通用检测方案
      result = await checkGeneralTextSafety(text);
      break;
  }
  
  res.json(result);
});

// 微信内容安全检测
async function checkWeixinTextSafety(text) {
  const accessToken = await getWeixinAccessToken();
  const response = await axios.post(
    `https://api.weixin.qq.com/wxa/msg_sec_check?access_token=${accessToken}`,
    { content: text }
  );
  
  return {
    safe: response.data.errcode === 0,
    message: response.data.errcode === 0 ? '检测通过' : '内容包含敏感信息'
  };
}
```

### 7.3 多平台支付

```javascript
// server-deploy/routes/payment.js

// 创建订单 - 多平台
router.post('/create-order', async (req, res) => {
  const { plan_id, openid, platform } = req.body;
  
  // 创建统一订单...
  
  let paymentParams;
  
  switch (platform) {
    case 'mp-toutiao':
      paymentParams = await createDouyinPayment(order);
      break;
    case 'mp-weixin':
      paymentParams = await createWeixinPayment(order);
      break;
    case 'app':
      // App 端可选支付宝或微信
      paymentParams = await createAppPayment(order, req.body.provider);
      break;
  }
  
  res.json({ success: true, data: paymentParams });
});
```

---

## 8. 测试方案

### 8.1 测试矩阵

| 功能模块 | 微信小程序 | 抖音小程序 | iOS App | Android App | H5 |
|---------|-----------|-----------|---------|-------------|-----|
| 登录授权 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 用户信息 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 风格测试 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 照片上传 | ✅ | ✅ | ✅ | ✅ | ✅ |
| AI 对话 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 单品分析 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 支付充值 | ✅ | ✅ | ✅ | ✅ | ❌ |
| 内容安全 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 分享 | ✅ | ✅ | ✅ | ✅ | ❌ |

### 8.2 测试流程

```
1. 单元测试
   - utils 工具函数测试
   - API 调用测试
   - 数据处理测试

2. 组件测试
   - 登录弹窗
   - 侧边栏
   - 充值卡片

3. 页面测试
   - 首页流程
   - 测试流程
   - 报告展示

4. 集成测试
   - 完整用户流程
   - 多端一致性

5. 性能测试
   - 首屏加载时间
   - 页面切换流畅度
   - 内存占用
```

### 8.3 测试设备清单

| 平台 | 设备/环境 |
|------|----------|
| 微信小程序 | 微信开发者工具、iPhone 12、小米 12 |
| 抖音小程序 | 抖音开发者工具、iPhone 14、华为 P50 |
| iOS App | iPhone 12 (iOS 15)、iPhone 14 (iOS 16) |
| Android App | 小米 12 (Android 12)、华为 P50 (HarmonyOS) |
| H5 | Chrome、Safari、微信内置浏览器 |

---

## 9. 时间规划

### 9.1 总体时间线（预计 2-3 周）

```
Week 1
├── Day 1-2: 环境准备 + Git 分支管理
├── Day 3-5: 核心页面迁移（index, chat, test）
└── Day 6-7: 工具函数迁移 + 组件迁移

Week 2
├── Day 1-2: 剩余页面迁移
├── Day 3-4: 平台适配层完善
├── Day 5: 服务端改造
└── Day 6-7: 多端调试（抖音、微信）

Week 3
├── Day 1-2: App 端调试
├── Day 3-4: 测试 + Bug 修复
├── Day 5: 性能优化
└── Day 6-7: 文档 + 发布准备
```

### 9.2 里程碑

| 里程碑 | 时间 | 交付物 |
|--------|------|--------|
| M1: 环境就绪 | Day 2 | uni-app 项目骨架，Git 分支 |
| M2: 核心功能 | Day 7 | 首页、测试、聊天功能可用 |
| M3: 全功能 | Day 12 | 所有功能迁移完成 |
| M4: 抖音+微信 | Day 14 | 两个小程序平台测试通过 |
| M5: App | Day 16 | iOS/Android App 测试通过 |
| M6: 发布 | Day 21 | 全平台发布 |

---

## 10. 风险管理

### 10.1 风险识别

| 风险 | 概率 | 影响 | 应对策略 |
|------|------|------|----------|
| API 兼容性问题 | 中 | 高 | 提前梳理 API 差异，编写适配层 |
| 样式兼容问题 | 高 | 中 | 使用 rpx 单位，多端测试 |
| 支付集成复杂 | 中 | 高 | 各平台单独开发支付模块 |
| 审核不通过 | 中 | 中 | 提前了解各平台审核规则 |
| 性能问题 | 低 | 中 | 使用 nvue 优化关键页面 |
| 原生功能缺失 | 低 | 低 | 开发自定义原生插件 |

### 10.2 回滚方案

```
如果迁移失败或出现严重问题：

1. 保持 douyin-original 分支可用
2. 可随时切换回原生抖音小程序
3. 服务端保持向后兼容
4. 数据库结构不做破坏性修改
```

---

## 11. 发布策略

### 11.1 发布顺序

```
1. 抖音小程序（优先）
   - 验证与原版功能一致
   - 用户无感知升级

2. 微信小程序
   - 注册微信小程序账号
   - 申请相关能力（支付、登录等）
   - 提交审核

3. H5 版本
   - 部署到服务器
   - 配置域名

4. App 版本
   - 打包 iOS/Android
   - 提交应用商店审核
```

### 11.2 各平台准备工作

| 平台 | 准备工作 |
|------|----------|
| 微信小程序 | 注册账号、申请登录/支付能力、配置域名白名单 |
| 抖音小程序 | 更新到 uni-app 版本、重新提交审核 |
| iOS App | 申请 Apple 开发者账号、证书配置、App Store Connect |
| Android App | 签名证书、各应用商店开发者账号 |
| H5 | 服务器部署、域名备案 |

### 11.3 版本发布记录

| 版本 | 平台 | 日期 | 说明 |
|------|------|------|------|
| v2.0.0 | 抖音小程序 | TBD | uni-app 首版 |
| v2.0.0 | 微信小程序 | TBD | 微信首发 |
| v2.0.0 | iOS App | TBD | App Store 首发 |
| v2.0.0 | Android App | TBD | 应用商店首发 |

---

## 📌 附录

### A. 迁移检查清单

- [ ] Git 分支创建完成
- [ ] uni-app 项目初始化
- [ ] pages.json 配置完成
- [ ] App.vue 迁移完成
- [ ] 所有页面迁移完成
- [ ] 所有组件迁移完成
- [ ] utils 工具函数迁移完成
- [ ] 静态资源迁移完成
- [ ] 服务端多平台支持
- [ ] 微信小程序测试通过
- [ ] 抖音小程序测试通过
- [ ] iOS App 测试通过
- [ ] Android App 测试通过
- [ ] H5 测试通过
- [ ] 性能测试通过
- [ ] 安全审计通过

### B. 参考资源

- [uni-app 官方文档](https://uniapp.dcloud.net.cn/)
- [uni-app 条件编译](https://uniapp.dcloud.net.cn/tutorial/platform.html)
- [微信小程序文档](https://developers.weixin.qq.com/miniprogram/dev/)
- [抖音小程序文档](https://developer.open-douyin.com/docs/resource/zh-CN/mini-app/develop/guide/)
- [App 打包配置](https://uniapp.dcloud.net.cn/tutorial/app-base.html)

### C. 联系方式

如有问题，请联系：
- 项目负责人：[待定]
- 技术支持：[待定]

---

**文档版本：** v1.0.0  
**创建日期：** 2026-01-15  
**最后更新：** 2026-01-15  
**作者：** AI Assistant

