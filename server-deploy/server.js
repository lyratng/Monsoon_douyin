const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

// 导入模块
const { initDatabase, closeDB } = require('./database');
const userRoutes = require('./routes/user');
const coinsRoutes = require('./routes/coins');
const paymentRoutes = require('./routes/payment');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = 'https://openrouter.ai/api/v1';

// ========== 抖音小程序内容安全检测配置 ==========
const DOUYIN_CONFIG = {
  APP_ID: 'tt6a791cc4f57bed5d01',
  APP_SECRET: '9489b0068583a5b61b6d1ea29c7b054178d75cef',
  TOKEN_URL: 'https://developer.toutiao.com/api/apps/v2/token',
  TEXT_CHECK_URL: 'https://developer.toutiao.com/api/v2/tags/text/antidirt',
  IMAGE_CHECK_URL: 'https://developer.toutiao.com/api/apps/censor/image'
};

// Access Token 缓存
let tokenCache = {
  accessToken: null,
  expiresAt: 0
};

// ========== 获取抖音 Access Token ==========
async function getDouyinAccessToken() {
  const now = Date.now();
  
  // 检查缓存是否有效（提前5分钟刷新）
  if (tokenCache.accessToken && tokenCache.expiresAt > now + 300000) {
    console.log('[Content Security] 使用缓存的 Access Token');
    return tokenCache.accessToken;
  }
  
  console.log('[Content Security] 获取新的 Access Token...');
  
  try {
    const response = await axios.post(DOUYIN_CONFIG.TOKEN_URL, {
      appid: DOUYIN_CONFIG.APP_ID,
      secret: DOUYIN_CONFIG.APP_SECRET,
      grant_type: 'client_credential'
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    
    console.log('[Content Security] Token API 响应:', JSON.stringify(response.data));
    
    if (response.data && response.data.err_no === 0 && response.data.data && response.data.data.access_token) {
      const data = response.data.data;
      tokenCache.accessToken = data.access_token;
      tokenCache.expiresAt = now + (data.expires_in * 1000);
      console.log('[Content Security] Access Token 获取成功，有效期:', data.expires_in, '秒');
      return tokenCache.accessToken;
    } else {
      throw new Error('获取 Access Token 失败: 响应格式异常');
    }
  } catch (error) {
    console.error('[Content Security] 获取 Access Token 失败:', error.message);
    throw error;
  }
}

// ========== 文本安全检测 ==========
async function checkTextSafety(text) {
  if (!text || text.trim() === '') {
    return { safe: true, message: '空文本', details: null };
  }
  
  console.log('[Content Security] 开始文本安全检测，文本长度:', text.length);
  
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
    
    console.log('[Content Security] 文本检测响应:', JSON.stringify(response.data));
    
    if (response.data && response.data.data && response.data.data.length > 0) {
      const result = response.data.data[0];
      
      if (result.code !== 0) {
        return { safe: false, message: '检测服务异常，请稍后重试', details: result };
      }
      
      const predicts = result.predicts || [];
      const hitItems = predicts.filter(p => p.hit === true);
      
      if (hitItems.length > 0) {
        console.log('[Content Security] ❌ 文本检测不通过，命中模型:', hitItems.map(h => h.model_name).join(', '));
        return {
          safe: false,
          message: '您输入的内容可能包含敏感信息，请修改后重试',
          details: { hitModels: hitItems.map(h => h.model_name), taskId: result.task_id }
        };
      }
      
      console.log('[Content Security] ✅ 文本检测通过');
      return { safe: true, message: '检测通过', details: { taskId: result.task_id } };
    }
    
    return { safe: true, message: '检测完成', details: response.data };
    
  } catch (error) {
    console.error('[Content Security] 文本检测失败:', error.message);
    return { safe: false, message: '安全检测服务暂时不可用，请稍后重试', details: { error: error.message } };
  }
}

// ========== 图片安全检测 ==========
async function checkImageSafety(imageData, imageUrl = null) {
  console.log('[Content Security] 开始图片安全检测');
  console.log('[Content Security] 图片数据长度:', imageData ? imageData.length : 0);
  console.log('[Content Security] 图片URL:', imageUrl || '无');
  
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
      return { safe: false, message: '未提供图片数据', details: null };
    }
    
    const response = await axios.post(DOUYIN_CONFIG.IMAGE_CHECK_URL, requestBody, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    
    console.log('[Content Security] 图片检测响应:', JSON.stringify(response.data));
    
    if (response.data) {
      if (response.data.error !== 0) {
        return { safe: false, message: '图片检测服务异常，请稍后重试', details: response.data };
      }
      
      const predicts = response.data.predicts || [];
      const hitItems = predicts.filter(p => p.hit === true);
      
      if (hitItems.length > 0) {
        console.log('[Content Security] ❌ 图片检测不通过，命中模型:', hitItems.map(h => h.model_name).join(', '));
        return {
          safe: false,
          message: '您上传的图片未通过安全检测，请更换图片后重试',
          details: { hitModels: hitItems.map(h => h.model_name) }
        };
      }
      
      console.log('[Content Security] ✅ 图片检测通过');
      return { safe: true, message: '检测通过', details: { checkedModels: predicts.map(p => p.model_name) } };
    }
    
    return { safe: true, message: '检测完成', details: response.data };
    
  } catch (error) {
    console.error('[Content Security] 图片检测失败:', error.message);
    return { safe: false, message: '安全检测服务暂时不可用，请稍后重试', details: { error: error.message } };
  }
}

// ========== API 路由 ==========

// 健康检查
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '2.1.0'
  });
});

// 用户相关路由
app.use('/api/user', userRoutes);

// 寓言币相关路由
app.use('/api/coins', coinsRoutes);

// 支付相关路由
app.use('/api/payment', paymentRoutes);

// OpenAI/OpenRouter 代理
app.post('/api/chat/completions', async (req, res) => {
  try {
    console.log('收到请求:', new Date().toISOString());
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
    console.log('API响应成功');
    res.json(response.data);
  } catch (error) {
    console.error('API错误:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || { message: error.message }
    });
  }
});

// 文本内容安全检测
app.post('/api/content-security/text', async (req, res) => {
  console.log('[API] 收到文本安全检测请求');
  
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ success: false, safe: false, message: '缺少 text 参数' });
    }
    
    const result = await checkTextSafety(text);
    res.json({ success: true, safe: result.safe, message: result.message, details: result.details });
    
  } catch (error) {
    console.error('[API] 文本安全检测错误:', error);
    res.status(500).json({ success: false, safe: false, message: '服务器内部错误', error: error.message });
  }
});

// 图片内容安全检测
app.post('/api/content-security/image', async (req, res) => {
  console.log('[API] 收到图片安全检测请求');
  
  try {
    const { image_data, image_url } = req.body;
    
    if (!image_data && !image_url) {
      return res.status(400).json({ success: false, safe: false, message: '缺少 image_data 或 image_url 参数' });
    }
    
    const result = await checkImageSafety(image_data, image_url);
    res.json({ success: true, safe: result.safe, message: result.message, details: result.details });
    
  } catch (error) {
    console.error('[API] 图片安全检测错误:', error);
    res.status(500).json({ success: false, safe: false, message: '服务器内部错误', error: error.message });
  }
});

// 获取抖音 Token（调试用）
app.get('/api/content-security/token', async (req, res) => {
  console.log('[API] 收到获取 Token 请求');
  
  try {
    const token = await getDouyinAccessToken();
    res.json({ success: true, message: 'Token 获取成功', token_preview: token.substring(0, 20) + '...' });
  } catch (error) {
    console.error('[API] 获取 Token 错误:', error);
    res.status(500).json({ success: false, message: '获取 Token 失败', error: error.message });
  }
});

// ========== 初始化数据库并启动服务器 ==========
initDatabase();

app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('衣索寓言 API v2.1.0');
  console.log('端口:', PORT);
  console.log('功能: 内容安全、AI代理、用户系统、寓言币、支付');
  console.log('='.repeat(50));
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号，关闭数据库连接...');
  closeDB();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，关闭数据库连接...');
  closeDB();
  process.exit(0);
});
