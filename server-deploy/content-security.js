/**
 * 抖音小程序内容安全检测模块
 * 用于检测用户上传的图片和文字是否包含违规内容
 * 
 * 部署位置: /home/ecs-user/monsoon-api/content-security.js
 */

const axios = require('axios');

// 抖音小程序配置
const DOUYIN_CONFIG = {
  APP_ID: 'tt6a791cc4f57bed5d01',
  APP_SECRET: '9489b0068583a5b61b6d1ea29c7b054178d75cef',
  
  // API端点
  TOKEN_URL: 'https://open.douyin.com/oauth/client_token/',
  TEXT_CHECK_URL: 'https://developer.toutiao.com/api/v2/tags/text/antidirt',
  IMAGE_CHECK_URL: 'https://developer.toutiao.com/api/apps/censor/image'
};

// Access Token 缓存
let tokenCache = {
  accessToken: null,
  expiresAt: 0
};

/**
 * 获取抖音小程序 Access Token
 * 自动缓存，过期前自动刷新
 */
async function getAccessToken() {
  const now = Date.now();
  
  // 检查缓存是否有效（提前5分钟刷新）
  if (tokenCache.accessToken && tokenCache.expiresAt > now + 300000) {
    console.log('[Content Security] 使用缓存的 Access Token');
    return tokenCache.accessToken;
  }
  
  console.log('[Content Security] 获取新的 Access Token...');
  
  try {
    const response = await axios.post(DOUYIN_CONFIG.TOKEN_URL, {
      client_key: DOUYIN_CONFIG.APP_ID,
      client_secret: DOUYIN_CONFIG.APP_SECRET,
      grant_type: 'client_credential'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('[Content Security] Token API 响应:', JSON.stringify(response.data));
    
    if (response.data && response.data.data && response.data.data.access_token) {
      const data = response.data.data;
      tokenCache.accessToken = data.access_token;
      tokenCache.expiresAt = now + (data.expires_in * 1000);
      
      console.log('[Content Security] Access Token 获取成功，有效期:', data.expires_in, '秒');
      return tokenCache.accessToken;
    } else {
      console.error('[Content Security] Token 响应格式异常:', response.data);
      throw new Error('获取 Access Token 失败: 响应格式异常');
    }
  } catch (error) {
    console.error('[Content Security] 获取 Access Token 失败:', error.message);
    if (error.response) {
      console.error('[Content Security] 错误详情:', error.response.data);
    }
    throw error;
  }
}

/**
 * 文本内容安全检测
 * @param {string} text - 待检测的文本内容
 * @returns {Object} { safe: boolean, message: string, details: object }
 */
async function checkTextSafety(text) {
  if (!text || text.trim() === '') {
    return { safe: true, message: '空文本', details: null };
  }
  
  console.log('[Content Security] 开始文本安全检测，文本长度:', text.length);
  
  try {
    const accessToken = await getAccessToken();
    
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
    
    // 解析检测结果
    if (response.data && response.data.data && response.data.data.length > 0) {
      const result = response.data.data[0];
      
      if (result.code !== 0) {
        console.error('[Content Security] 文本检测错误码:', result.code, result.msg);
        return { 
          safe: false, 
          message: '检测服务异常，请稍后重试', 
          details: result 
        };
      }
      
      // 检查是否有违规内容
      const predicts = result.predicts || [];
      const hitItems = predicts.filter(p => p.hit === true);
      
      if (hitItems.length > 0) {
        console.log('[Content Security] ❌ 文本检测不通过，命中模型:', hitItems.map(h => h.model_name).join(', '));
        return {
          safe: false,
          message: '您输入的内容可能包含敏感信息，请修改后重试',
          details: {
            hitModels: hitItems.map(h => h.model_name),
            taskId: result.task_id
          }
        };
      }
      
      console.log('[Content Security] ✅ 文本检测通过');
      return {
        safe: true,
        message: '检测通过',
        details: {
          taskId: result.task_id
        }
      };
    }
    
    // 如果响应格式异常，默认放行但记录日志
    console.warn('[Content Security] 文本检测响应格式异常，默认放行');
    return { safe: true, message: '检测完成', details: response.data };
    
  } catch (error) {
    console.error('[Content Security] 文本检测失败:', error.message);
    if (error.response) {
      console.error('[Content Security] 错误详情:', error.response.data);
    }
    
    // 检测失败时，为了不影响用户体验，可以选择放行或拒绝
    // 这里选择拒绝，以确保安全
    return {
      safe: false,
      message: '安全检测服务暂时不可用，请稍后重试',
      details: { error: error.message }
    };
  }
}

/**
 * 图片内容安全检测
 * @param {string} imageData - 图片的 base64 数据（不含 data:image/xxx;base64, 前缀）
 * @param {string} imageUrl - 图片的URL地址（与 imageData 二选一）
 * @returns {Object} { safe: boolean, message: string, details: object }
 */
async function checkImageSafety(imageData, imageUrl = null) {
  console.log('[Content Security] 开始图片安全检测');
  console.log('[Content Security] 图片数据长度:', imageData ? imageData.length : 0);
  console.log('[Content Security] 图片URL:', imageUrl || '无');
  
  try {
    const accessToken = await getAccessToken();
    
    // 构建请求体
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
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 图片检测可能需要更长时间
    });
    
    console.log('[Content Security] 图片检测响应:', JSON.stringify(response.data));
    
    // 解析检测结果
    if (response.data) {
      if (response.data.error !== 0) {
        console.error('[Content Security] 图片检测错误:', response.data.error, response.data.message);
        return {
          safe: false,
          message: '图片检测服务异常，请稍后重试',
          details: response.data
        };
      }
      
      // 检查是否有违规内容
      const predicts = response.data.predicts || [];
      const hitItems = predicts.filter(p => p.hit === true);
      
      if (hitItems.length > 0) {
        console.log('[Content Security] ❌ 图片检测不通过，命中模型:', hitItems.map(h => h.model_name).join(', '));
        return {
          safe: false,
          message: '您上传的图片未通过安全检测，请更换图片后重试',
          details: {
            hitModels: hitItems.map(h => h.model_name)
          }
        };
      }
      
      console.log('[Content Security] ✅ 图片检测通过');
      return {
        safe: true,
        message: '检测通过',
        details: {
          checkedModels: predicts.map(p => p.model_name)
        }
      };
    }
    
    // 如果响应格式异常，默认放行但记录日志
    console.warn('[Content Security] 图片检测响应格式异常，默认放行');
    return { safe: true, message: '检测完成', details: response.data };
    
  } catch (error) {
    console.error('[Content Security] 图片检测失败:', error.message);
    if (error.response) {
      console.error('[Content Security] 错误详情:', error.response.data);
    }
    
    // 检测失败时拒绝，以确保安全
    return {
      safe: false,
      message: '安全检测服务暂时不可用，请稍后重试',
      details: { error: error.message }
    };
  }
}

module.exports = {
  getAccessToken,
  checkTextSafety,
  checkImageSafety,
  DOUYIN_CONFIG
};

