# 安全检测API修复和部署指南

## 🔍 问题诊断

### 错误现象
- 前端显示：`[图片安全检测] ❌ API响应异常`
- HTTP状态码：`502 Bad Gateway`
- 响应内容：`<html><head><title>502 Bad Gateway</title></head>...`

### 问题原因
502 Bad Gateway 错误表示：
1. **Nginx可以接收请求**（说明域名和SSL配置正常）
2. **但无法连接到后端Node.js服务**（localhost:3000）
3. 可能的原因：
   - Node.js服务没有运行
   - Node.js服务崩溃了（可能因为之前的错误代码）
   - 端口3000没有监听

## ✅ 已修复的问题

### 1. Token获取URL错误
- ❌ 错误：`https://open.douyin.com/oauth/client_token/`
- ✅ 正确：`https://developer.toutiao.com/api/apps/v2/token`

### 2. Token请求参数格式错误
- ❌ 错误：`client_key` 和 `client_secret`
- ✅ 正确：`appid` 和 `secret`

### 3. Token响应格式检查
- ✅ 添加了 `err_no === 0` 检查
- ✅ 改进了错误消息输出

## 📋 部署步骤

### 1. 连接到服务器
```bash
ssh root@8.209.210.83
# 或使用配置的别名
ssh monsoon-japan
```

### 2. 检查当前服务状态
```bash
# 检查PM2服务状态
pm2 status

# 查看服务日志（查看是否有错误）
pm2 logs monsoon-api --lines 50

# 检查端口3000是否在监听
sudo ss -tlnp | grep 3000
```

### 3. 备份当前代码
```bash
cd /home/ecs-user/monsoon-api
cp server.js server.js.backup.$(date +%Y%m%d_%H%M%S)
```

### 4. 部署修复后的代码

**⚠️ 重要：使用Python heredoc方式写入文件，避免编码问题**

```bash
cd /home/ecs-user/monsoon-api

python3 << 'PYEOF'
code = '''const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = 'https://openrouter.ai/api/v1';

const DOUYIN_CONFIG = {
  APP_ID: 'tt6a791cc4f57bed5d01',
  APP_SECRET: '9489b0068583a5b61b6d1ea29c7b054178d75cef',
  // ✅ 正确的Token获取URL（用于内容安全检测）
  TOKEN_URL: 'https://developer.toutiao.com/api/apps/v2/token',
  TEXT_CHECK_URL: 'https://developer.toutiao.com/api/v2/tags/text/antidirt',
  IMAGE_CHECK_URL: 'https://developer.toutiao.com/api/apps/censor/image'
};

let tokenCache = { accessToken: null, expiresAt: 0 };

async function getDouyinAccessToken() {
  const now = Date.now();
  if (tokenCache.accessToken && tokenCache.expiresAt > now + 300000) {
    console.log('[Security] Using cached token');
    return tokenCache.accessToken;
  }
  console.log('[Security] Getting new token...');
  try {
    // ✅ 使用正确的参数格式：appid 和 secret
    const response = await axios.post(DOUYIN_CONFIG.TOKEN_URL, {
      appid: DOUYIN_CONFIG.APP_ID,
      secret: DOUYIN_CONFIG.APP_SECRET,
      grant_type: 'client_credential'
    }, { headers: { 'Content-Type': 'application/json' }, timeout: 10000 });
    console.log('[Security] Token response:', JSON.stringify(response.data));
    // ✅ 检查正确的响应格式：err_no === 0 表示成功
    if (response.data && response.data.err_no === 0 && response.data.data && response.data.data.access_token) {
      const data = response.data.data;
      tokenCache.accessToken = data.access_token;
      tokenCache.expiresAt = now + (data.expires_in * 1000);
      console.log('[Security] Token obtained, expires in:', data.expires_in);
      return tokenCache.accessToken;
    } else {
      const errorMsg = response.data ? `Token response error: err_no=${response.data.err_no}, err_tips=${response.data.err_tips}` : 'Token response format error';
      throw new Error(errorMsg);
    }
  } catch (error) {
    console.error('[Security] Token error:', error.message);
    console.error('[Security] Token error stack:', error.stack);
    console.error('[Security] Token error response:', error.response ? JSON.stringify(error.response.data) : 'No response');
    throw error;
  }
}

async function checkTextSafety(text) {
  if (!text || text.trim() === '') {
    return { safe: true, message: 'Empty text' };
  }
  console.log('[Security] Text check, length:', text.length);
  try {
    const accessToken = await getDouyinAccessToken();
    const response = await axios.post(DOUYIN_CONFIG.TEXT_CHECK_URL, {
      tasks: [{ content: text }]
    }, {
      headers: { 'Content-Type': 'application/json', 'X-Token': accessToken },
      timeout: 10000
    });
    console.log('[Security] Text response:', JSON.stringify(response.data));
    if (response.data && response.data.data && response.data.data.length > 0) {
      const result = response.data.data[0];
      if (result.code !== 0) {
        return { safe: false, message: 'Service error', details: result };
      }
      const predicts = result.predicts || [];
      const hitItems = predicts.filter(function(p) { return p.hit === true; });
      if (hitItems.length > 0) {
        console.log('[Security] Text blocked:', hitItems.map(function(h) { return h.model_name; }).join(', '));
        return { safe: false, message: 'Content contains sensitive info', details: { hitModels: hitItems.map(function(h) { return h.model_name; }) } };
      }
      console.log('[Security] Text passed');
      return { safe: true, message: 'Passed' };
    }
    return { safe: true, message: 'Checked' };
  } catch (error) {
    console.error('[Security] Text error:', error.message);
    console.error('[Security] Text error stack:', error.stack);
    console.error('[Security] Text error response:', error.response ? JSON.stringify(error.response.data) : 'No response');
    // 根据错误类型返回更友好的错误消息
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return { safe: false, message: '安全检测服务连接失败，请检查网络连接', details: { error: error.message } };
    } else if (error.response && error.response.status === 401) {
      return { safe: false, message: '安全检测服务认证失败，请联系管理员', details: { error: error.message } };
    } else {
      return { safe: false, message: '安全检测服务暂时不可用，请稍后重试', details: { error: error.message } };
    }
  }
}

async function checkImageSafety(imageData, imageUrl) {
  console.log('[Security] Image check, data len:', imageData ? imageData.length : 0, 'url:', imageUrl || 'none');
  try {
    const accessToken = await getDouyinAccessToken();
    const requestBody = { app_id: DOUYIN_CONFIG.APP_ID, access_token: accessToken };
    if (imageUrl) {
      requestBody.image = imageUrl;
    } else if (imageData) {
      requestBody.image_data = imageData;
    } else {
      return { safe: false, message: 'No image provided' };
    }
    const response = await axios.post(DOUYIN_CONFIG.IMAGE_CHECK_URL, requestBody, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    console.log('[Security] Image response:', JSON.stringify(response.data));
    if (response.data) {
      if (response.data.error !== 0) {
        return { safe: false, message: 'Image service error', details: response.data };
      }
      const predicts = response.data.predicts || [];
      const hitItems = predicts.filter(function(p) { return p.hit === true; });
      if (hitItems.length > 0) {
        console.log('[Security] Image blocked:', hitItems.map(function(h) { return h.model_name; }).join(', '));
        return { safe: false, message: 'Image blocked', details: { hitModels: hitItems.map(function(h) { return h.model_name; }) } };
      }
      console.log('[Security] Image passed');
      return { safe: true, message: 'Passed' };
    }
    return { safe: true, message: 'Checked' };
  } catch (error) {
    console.error('[Security] Image error:', error.message);
    console.error('[Security] Image error stack:', error.stack);
    console.error('[Security] Image error response:', error.response ? JSON.stringify(error.response.data) : 'No response');
    // 根据错误类型返回更友好的错误消息
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return { safe: false, message: '安全检测服务连接失败，请检查网络连接', details: { error: error.message } };
    } else if (error.response && error.response.status === 401) {
      return { safe: false, message: '安全检测服务认证失败，请联系管理员', details: { error: error.message } };
    } else {
      return { safe: false, message: '安全检测服务暂时不可用，请稍后重试', details: { error: error.message } };
    }
  }
}

app.get('/health', function(req, res) {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.post('/api/chat/completions', async function(req, res) {
  try {
    console.log('Chat request:', new Date().toISOString());
    const response = await axios.post(OPENAI_BASE_URL + '/chat/completions', req.body, {
      headers: {
        'Authorization': 'Bearer ' + OPENAI_API_KEY,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://api.radiance.asia',
        'X-Title': 'Monsoon'
      },
      timeout: 60000
    });
    console.log('Chat response OK');
    res.json(response.data);
  } catch (error) {
    console.error('Chat error:', error.response ? error.response.data : error.message);
    res.status(error.response ? error.response.status : 500).json({ error: error.response ? error.response.data : { message: error.message } });
  }
});

app.post('/api/content-security/text', async function(req, res) {
  console.log('[API] Text security request');
  try {
    var text = req.body.text;
    if (!text) {
      return res.status(400).json({ success: false, safe: false, message: 'Missing text' });
    }
    var result = await checkTextSafety(text);
    res.json({ success: true, safe: result.safe, message: result.message, details: result.details });
  } catch (error) {
    console.error('[API] Text error:', error);
    res.status(500).json({ success: false, safe: false, message: 'Server error', error: error.message });
  }
});

app.post('/api/content-security/image', async function(req, res) {
  console.log('[API] Image security request');
  try {
    var image_data = req.body.image_data;
    var image_url = req.body.image_url;
    if (!image_data && !image_url) {
      return res.status(400).json({ success: false, safe: false, message: 'Missing image_data or image_url' });
    }
    var result = await checkImageSafety(image_data, image_url);
    res.json({ success: true, safe: result.safe, message: result.message, details: result.details });
  } catch (error) {
    console.error('[API] Image error:', error);
    res.status(500).json({ success: false, safe: false, message: 'Server error', error: error.message });
  }
});

app.get('/api/content-security/token', async function(req, res) {
  console.log('[API] Token request');
  try {
    var token = await getDouyinAccessToken();
    res.json({ success: true, message: 'Token OK', token_preview: token.substring(0, 20) + '...' });
  } catch (error) {
    console.error('[API] Token error:', error);
    res.status(500).json({ success: false, message: 'Token failed', error: error.message });
  }
});

app.listen(PORT, function() {
  console.log('Server running on port ' + PORT);
  console.log('Content security enabled');
});
'''
with open('/home/ecs-user/monsoon-api/server.js', 'w') as f:
    f.write(code)
print('✅ 代码已写入')
PYEOF
```

### 5. 验证代码语法
```bash
node --check /home/ecs-user/monsoon-api/server.js
```

### 6. 启动服务（如果服务不存在）
```bash
# ⚠️ 重要：如果 pm2 restart monsoon-api 报错 "Process not found"
# 说明服务从未启动过，需要先启动服务

cd /home/ecs-user/monsoon-api

# 启动服务
pm2 start server.js --name monsoon-api

# 设置开机自启
pm2 startup
pm2 save

# 查看服务状态
pm2 status

# 查看实时日志
pm2 logs monsoon-api --lines 20
```

### 7. 重启服务（如果服务已存在）
```bash
# 如果服务已存在，使用重启命令
pm2 restart monsoon-api

# 查看服务状态
pm2 status

# 查看实时日志
pm2 logs monsoon-api --lines 20
```

### 8. 测试API
```bash
# 测试健康检查
curl https://api.radiance.asia/health

# 测试Token获取
curl https://api.radiance.asia/api/content-security/token

# 测试文本安全检测
curl -X POST https://api.radiance.asia/api/content-security/text \
  -H "Content-Type: application/json" \
  -d '{"text":"测试文本"}'
```

### 9. 修复数据库模块错误（如果出现）

**如果日志显示 `better-sqlite3` 模块版本不匹配错误**：

```bash
cd /home/ecs-user/monsoon-api

# 重新编译 better-sqlite3 模块
npm rebuild better-sqlite3

# 或者重新安装
npm install better-sqlite3 --build-from-source

# 重启服务
pm2 restart monsoon-api
```

**注意**：如果只需要安全检测API功能，可以暂时忽略数据库错误，因为安全检测API不依赖数据库。

## 🚨 常见问题

### 问题1：PM2中没有monsoon-api服务

**现象**：
```bash
pm2 restart monsoon-api
# [PM2][ERROR] Process or Namespace monsoon-api not found
```

**原因**：服务从未启动过，或者被删除了

**解决方案**：
```bash
cd /home/ecs-user/monsoon-api
pm2 start server.js --name monsoon-api
pm2 save
pm2 status
```

### 问题2：端口3000没有服务监听

**检查方法**：
```bash
sudo ss -tlnp | grep 3000
# 如果输出为空，说明没有服务在监听
```

**解决方案**：
```bash
# 检查PM2服务状态
pm2 status

# 如果monsoon-api不存在，启动它
cd /home/ecs-user/monsoon-api
pm2 start server.js --name monsoon-api

# 确认端口监听
sudo ss -tlnp | grep 3000
# 应该看到类似：LISTEN 0 128 *:3000 *:* users:(("node",pid=xxx,fd=xx))
```

## 🔧 故障排查

### 如果服务无法启动

1. **检查代码语法**
```bash
node --check /home/ecs-user/monsoon-api/server.js
```

2. **手动运行查看错误**
```bash
cd /home/ecs-user/monsoon-api
node server.js
```

3. **检查环境变量**
```bash
cat /home/ecs-user/monsoon-api/.env
```

4. **查看PM2日志**
```bash
pm2 logs monsoon-api --lines 100
```

5. **检查端口占用**
```bash
sudo ss -tlnp | grep 3000
```

### 如果仍然出现502错误

1. **检查Nginx配置**
```bash
sudo nginx -t
sudo tail -50 /var/log/nginx/error.log
```

2. **检查Nginx反向代理配置**
```bash
cat /etc/nginx/conf.d/radiance.conf
```

3. **重启Nginx**
```bash
sudo systemctl restart nginx
```

## 📝 修复总结

### 修复内容
1. ✅ Token获取URL：`https://developer.toutiao.com/api/apps/v2/token`
2. ✅ Token请求参数：`appid` 和 `secret`（而不是 `client_key` 和 `client_secret`）
3. ✅ Token响应检查：检查 `err_no === 0`
4. ✅ 改进错误处理：更详细的错误消息

### 预期结果
- ✅ Token可以正常获取
- ✅ 文本安全检测可以正常工作
- ✅ 图片安全检测可以正常工作
- ✅ 不再出现502错误

## ⚠️ 注意事项

1. **部署前务必备份**：`cp server.js server.js.backup`
2. **使用Python heredoc方式**：避免编码问题
3. **验证语法后再重启**：`node --check server.js`
4. **查看日志确认**：`pm2 logs monsoon-api`
5. **测试API功能**：确保所有端点正常工作

