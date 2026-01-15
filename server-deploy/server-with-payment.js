// 衣索寓言 - 后端服务器
// 包含：内容安全检测、用户系统、寓言币系统、支付系统

const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

// 数据库模块
const { initDatabase, closeDB } = require('./database');

// 路由模块
const userRoutes = require('./routes/user');
const coinsRoutes = require('./routes/coins');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 请求日志中间件
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ========== 配置 ==========

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = 'https://openrouter.ai/api/v1';

const DOUYIN_CONFIG = {
  APP_ID: process.env.DOUYIN_APP_ID || 'tt6a791cc4f57bed5d01',
  APP_SECRET: process.env.DOUYIN_APP_SECRET || '9489b0068583a5b61b6d1ea29c7b054178d75cef',
  TOKEN_URL: 'https://developer.toutiao.com/api/apps/v2/token',
  TEXT_CHECK_URL: 'https://developer.toutiao.com/api/v2/tags/text/antidirt',
  IMAGE_CHECK_URL: 'https://developer.toutiao.com/api/apps/censor/image'
};

// Access Token 缓存
let tokenCache = {
  accessToken: null,
  expiresAt: 0
};

// ========== 内容安全检测 ==========

async function getDouyinAccessToken() {
  const now = Date.now();
  
  if (tokenCache.accessToken && tokenCache.expiresAt > now + 300000) {
    console.log('[Security] 使用缓存的 Token');
    return tokenCache.accessToken;
  }
  
  console.log('[Security] 获取新 Token...');
  
  try {
    const response = await axios.post(DOUYIN_CONFIG.TOKEN_URL, {
      appid: DOUYIN_CONFIG.APP_ID,
      secret: DOUYIN_CONFIG.APP_SECRET,
      grant_type: 'client_credential'
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    
    if (response.data && response.data.err_no === 0 && response.data.data) {
      const data = response.data.data;
      tokenCache.accessToken = data.access_token;
      tokenCache.expiresAt = now + (data.expires_in * 1000);
      console.log('[Security] Token 获取成功');
      return tokenCache.accessToken;
    } else {
      throw new Error('Token 响应格式异常');
    }
  } catch (error) {
    console.error('[Security] Token 获取失败:', error.message);
    throw error;
  }
}

async function checkTextSafety(text) {
  if (!text || text.trim() === '') {
    return { safe: true, message: '空文本' };
  }
  
  try {
    const accessToken = await getDouyinAccessToken();
    
    const response = await axios.post(DOUYIN_CONFIG.TEXT_CHECK_URL, {
      tasks: [{ content: text }]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Token': accessToken
      },
      timeout: 10000
    });
    
    if (response.data && response.data.data && response.data.data.length > 0) {
      const result = response.data.data[0];
      
      if (result.code !== 0) {
        return { safe: false, message: '检测服务异常' };
      }
      
      const predicts = result.predicts || [];
      const hitItems = predicts.filter(p => p.hit === true);
      
      if (hitItems.length > 0) {
        return { safe: false, message: '内容包含敏感信息' };
      }
      
      return { safe: true, message: '检测通过' };
    }
    
    return { safe: true, message: '检测完成' };
    
  } catch (error) {
    console.error('[Security] 文本检测失败:', error.message);
    return { safe: false, message: '安全检测服务不可用' };
  }
}

async function checkImageSafety(imageData, imageUrl = null) {
  try {
    const accessToken = await getDouyinAccessToken();
    
    const requestBody = {
      app_id: DOUYIN_CONFIG.APP_ID,
      access_token: accessToken
    };
    
    if (imageUrl) {
      requestBody.image = imageUrl;
    } else if (imageData) {
      requestBody.image_data = imageData;
    } else {
      return { safe: false, message: '未提供图片' };
    }
    
    const response = await axios.post(DOUYIN_CONFIG.IMAGE_CHECK_URL, requestBody, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    
    if (response.data) {
      if (response.data.error !== 0) {
        return { safe: false, message: '图片检测服务异常' };
      }
      
      const predicts = response.data.predicts || [];
      const hitItems = predicts.filter(p => p.hit === true);
      
      if (hitItems.length > 0) {
        return { safe: false, message: '图片未通过安全检测' };
      }
      
      return { safe: true, message: '检测通过' };
    }
    
    return { safe: true, message: '检测完成' };
    
  } catch (error) {
    console.error('[Security] 图片检测失败:', error.message);
    return { safe: false, message: '安全检测服务不可用' };
  }
}

// ========== API 路由 ==========

// 健康检查
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    features: ['content-security', 'ai-proxy', 'user-system', 'coins']
  });
});

// OpenAI/OpenRouter 代理
app.post('/api/chat/completions', async (req, res) => {
  try {
    const response = await axios.post(
      `${OPENAI_BASE_URL}/chat/completions`,
      req.body,
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://api.radiance.asia',
          'X-Title': 'Monsoon'
        },
        timeout: 60000
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('[AI] API错误:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || { message: error.message }
    });
  }
});

// 文本内容安全检测
app.post('/api/content-security/text', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ success: false, safe: false, message: '缺少 text 参数' });
    }
    
    const result = await checkTextSafety(text);
    res.json({ success: true, safe: result.safe, message: result.message });
    
  } catch (error) {
    res.status(500).json({ success: false, safe: false, message: '服务器错误' });
  }
});

// 图片内容安全检测
app.post('/api/content-security/image', async (req, res) => {
  try {
    const { image_data, image_url } = req.body;
    
    if (!image_data && !image_url) {
      return res.status(400).json({ success: false, safe: false, message: '缺少图片参数' });
    }
    
    const result = await checkImageSafety(image_data, image_url);
    res.json({ success: true, safe: result.safe, message: result.message });
    
  } catch (error) {
    res.status(500).json({ success: false, safe: false, message: '服务器错误' });
  }
});

// Token 测试
app.get('/api/content-security/token', async (req, res) => {
  try {
    const token = await getDouyinAccessToken();
    res.json({ success: true, message: 'Token OK', token_preview: token.substring(0, 20) + '...' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Token 获取失败', error: error.message });
  }
});

// ========== 用户和寓言币路由 ==========
app.use('/api/user', userRoutes);
app.use('/api/coins', coinsRoutes);

// ========== 错误处理 ==========
app.use((err, req, res, next) => {
  console.error('[Error]', err);
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ========== 启动服务器 ==========
function start() {
  // 初始化数据库
  initDatabase();
  
  // 启动服务器
  app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log('衣索寓言 API 服务器启动成功');
    console.log('='.repeat(50));
    console.log(`端口: ${PORT}`);
    console.log(`时间: ${new Date().toISOString()}`);
    console.log('功能: 内容安全检测、AI代理、用户系统、寓言币');
    console.log('='.repeat(50));
  });
}

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n收到 SIGINT 信号，正在关闭...');
  closeDB();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n收到 SIGTERM 信号，正在关闭...');
  closeDB();
  process.exit(0);
});

// 启动
start();

