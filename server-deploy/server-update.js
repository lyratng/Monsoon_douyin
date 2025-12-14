/**
 * 需要添加到 /home/ecs-user/monsoon-api/server.js 的代码
 * 
 * 使用方法：
 * 1. 先将 content-security.js 上传到 /home/ecs-user/monsoon-api/ 目录
 * 2. 然后将下面的代码添加到现有的 server.js 中
 */

// ========== 在文件顶部添加（require 部分后面）==========

const contentSecurity = require('./content-security');

// ========== 在现有路由后面添加以下API端点 ==========

/**
 * 文本内容安全检测接口
 * POST /api/content-security/text
 * Body: { text: "待检测的文本" }
 */
app.post('/api/content-security/text', async (req, res) => {
  console.log('[API] 收到文本安全检测请求');
  
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        safe: false,
        message: '缺少 text 参数'
      });
    }
    
    const result = await contentSecurity.checkTextSafety(text);
    
    res.json({
      success: true,
      safe: result.safe,
      message: result.message,
      details: result.details
    });
    
  } catch (error) {
    console.error('[API] 文本安全检测错误:', error);
    res.status(500).json({
      success: false,
      safe: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

/**
 * 图片内容安全检测接口
 * POST /api/content-security/image
 * Body: { image_data: "base64图片数据" } 或 { image_url: "图片URL" }
 */
app.post('/api/content-security/image', async (req, res) => {
  console.log('[API] 收到图片安全检测请求');
  
  try {
    const { image_data, image_url } = req.body;
    
    if (!image_data && !image_url) {
      return res.status(400).json({
        success: false,
        safe: false,
        message: '缺少 image_data 或 image_url 参数'
      });
    }
    
    const result = await contentSecurity.checkImageSafety(image_data, image_url);
    
    res.json({
      success: true,
      safe: result.safe,
      message: result.message,
      details: result.details
    });
    
  } catch (error) {
    console.error('[API] 图片安全检测错误:', error);
    res.status(500).json({
      success: false,
      safe: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

/**
 * 获取抖音 Access Token（仅用于调试）
 * GET /api/content-security/token
 */
app.get('/api/content-security/token', async (req, res) => {
  console.log('[API] 收到获取 Token 请求');
  
  try {
    const token = await contentSecurity.getAccessToken();
    
    res.json({
      success: true,
      message: 'Token 获取成功',
      token_preview: token.substring(0, 20) + '...' // 只返回前20位
    });
    
  } catch (error) {
    console.error('[API] 获取 Token 错误:', error);
    res.status(500).json({
      success: false,
      message: '获取 Token 失败',
      error: error.message
    });
  }
});

// ========== 完整的 server.js 示例（供参考）==========
/*
const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const contentSecurity = require('./content-security');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' })); // 增加限制以支持大图片

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ... 现有的 /api/chat/completions 等路由 ...

// 内容安全检测路由（上面的代码）
app.post('/api/content-security/text', async (req, res) => { ... });
app.post('/api/content-security/image', async (req, res) => { ... });
app.get('/api/content-security/token', async (req, res) => { ... });

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
*/

