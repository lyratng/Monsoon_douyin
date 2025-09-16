// API配置和调用工具
const ENV_CONFIG = require('../config/env');

// 🔧 根据任务类型获取适合的模型
function getModelForTask(taskType) {
  switch(taskType) {
    case 'vision':
      return ENV_CONFIG.VISION_MODEL; // GPT-4o for image recognition
    case 'text':
      return ENV_CONFIG.TEXT_MODEL;   // GPT-5-Chat for text generation
    default:
      return ENV_CONFIG.TEXT_MODEL;   // 默认使用文本模型
  }
}

// 🔧 根据任务类型获取优化的参数
function getConfigForTask(taskType) {
  switch(taskType) {
    case 'vision':
      return {
        max_tokens: 1000,
        temperature: 0.1
      };
    case 'text':
      return {
        max_tokens: 4000,
        temperature: 1.0,
        include_reasoning: false
      };
    default:
      return {
        max_tokens: 1000,
        temperature: 0.1
      };
  }
}

// 🧹 清理GPT-5-Chat返回的Markdown格式JSON
function cleanMarkdownJSON(content) {
  if (!content) return content;
  
  console.log('🧹 开始清理Markdown JSON格式');
  console.log('  原始内容预览:', content.substring(0, 100) + '...');
  console.log('  原始内容结尾:', content.substring(content.length - 100));
  
  // 移除markdown代码块标记
  let cleaned = content
    .replace(/```json\s*/gi, '')  // 移除开始的```json
    .replace(/```\s*$/gi, '')     // 移除结尾的```
    .replace(/^\s*```.*$/gm, '')  // 移除任何其他```行
    .trim();
  
  // 如果开头有其他文本，尝试找到JSON开始的位置
  const jsonStart = cleaned.indexOf('{');
  if (jsonStart > 0) {
    cleaned = cleaned.substring(jsonStart);
  }
  
  // 修复被截断的JSON - 检查是否有完整的结尾大括号
  const openBraces = (cleaned.match(/\{/g) || []).length;
  const closeBraces = (cleaned.match(/\}/g) || []).length;
  
  console.log('  开括号数量:', openBraces, '闭括号数量:', closeBraces);
  
  if (openBraces > closeBraces) {
    console.log('  🔧 检测到JSON被截断，尝试修复...');
    
    // 查找最后一个有效的完整对象结束位置
    let fixedContent = cleaned;
    
    // 查找最后一个完整的数组或对象
    const lastCompleteItem = findLastCompleteItem(cleaned);
    if (lastCompleteItem) {
      fixedContent = lastCompleteItem;
      console.log('  ✅ 找到最后一个完整项目，已修复');
    } else {
      // 如果找不到完整项目，尝试基本修复
      // 移除最后一个不完整的字段
      fixedContent = cleaned.replace(/,\s*"[^"]*":\s*"[^"]*$/, '');
      // 确保有足够的闭括号
      const missingBraces = openBraces - closeBraces;
      for (let i = 0; i < missingBraces; i++) {
        fixedContent += '}';
      }
      console.log('  ⚠️ 使用基本修复方法');
    }
    
    cleaned = fixedContent;
  }
  
  console.log('  清理后内容预览:', cleaned.substring(0, 100) + '...');
  console.log('  清理后内容结尾:', cleaned.substring(cleaned.length - 100));
  return cleaned;
}

// 辅助函数：查找最后一个完整的JSON项目
function findLastCompleteItem(jsonStr) {
  try {
    // 尝试找到最后一个完整的对象或数组
    let braceCount = 0;
    let inString = false;
    let escape = false;
    let lastValidPos = -1;
    
    for (let i = 0; i < jsonStr.length; i++) {
      const char = jsonStr[i];
      
      if (escape) {
        escape = false;
        continue;
      }
      
      if (char === '\\') {
        escape = true;
        continue;
      }
      
      if (char === '"') {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '{' || char === '[') {
          braceCount++;
        } else if (char === '}' || char === ']') {
          braceCount--;
          if (braceCount === 0) {
            lastValidPos = i + 1;
          }
        }
      }
    }
    
    if (lastValidPos > 0) {
      return jsonStr.substring(0, lastValidPos);
    }
    
    return null;
  } catch (error) {
    console.log('  修复JSON时出错:', error.message);
    return null;
  }
}

const CONFIG = {
  // 从环境配置文件获取
  OPENAI_API_KEY: ENV_CONFIG.OPENAI_API_KEY,
  OPENAI_BASE_URL: ENV_CONFIG.OPENAI_BASE_URL,
  // 🖼️ 图像识别模型
  VISION_MODEL: ENV_CONFIG.VISION_MODEL,
  // 📝 文本生成模型  
  TEXT_MODEL: ENV_CONFIG.TEXT_MODEL,
  // 兼容旧代码
  GPT_MODEL: ENV_CONFIG.TEXT_MODEL, // 默认使用文本模型
  TIMEOUT: ENV_CONFIG.TIMEOUT,
  
  // 调试配置
  DEBUG: ENV_CONFIG.DEBUG,
  USE_MOCK_DATA: ENV_CONFIG.USE_MOCK_DATA,
  
  // 速率限制配置
  RATE_LIMIT_DELAY: 1000, // 请求间隔1秒
  MAX_RETRIES: 3, // 最大重试次数
  RETRY_DELAY: 2000 // 重试延迟2秒
};

// API调用记录
let lastApiCallTime = 0;
let apiCallCount = 0;

/**
 * 速率限制控制
 * @returns {Promise} 延迟Promise
 */
function rateLimit() {
  return new Promise((resolve) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCallTime;
    
    if (timeSinceLastCall < CONFIG.RATE_LIMIT_DELAY) {
      const delay = CONFIG.RATE_LIMIT_DELAY - timeSinceLastCall;
      setTimeout(resolve, delay);
    } else {
      resolve();
    }
  });
}

/**
 * 带重试的API请求
 * @param {Object} options - 请求选项
 * @param {number} retryCount - 重试次数
 * @returns {Promise} API响应
 */
function apiRequestWithRetry(options, retryCount = 0) {
  return new Promise((resolve, reject) => {
    tt.request({
      ...options,
      success: async (res) => {
        if (res.statusCode === 429) {
          if (retryCount < CONFIG.MAX_RETRIES) {
            console.log(`API频率限制，第${retryCount + 1}次重试...`);
            await new Promise(r => setTimeout(r, CONFIG.RETRY_DELAY * (retryCount + 1)));
            try {
              const result = await apiRequestWithRetry(options, retryCount + 1);
              resolve(result);
            } catch (error) {
              reject(error);
            }
          } else {
            reject(new Error('API请求频率超限，请稍后再试'));
          }
        } else if (res.statusCode === 200) {
          resolve(res);
        } else {
          reject(new Error(`API请求失败: ${res.statusCode}`));
        }
      },
      fail: async (error) => {
        if (error.statusCode === 429 && retryCount < CONFIG.MAX_RETRIES) {
          console.log(`API频率限制，第${retryCount + 1}次重试...`);
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

/**
 * 获取API Key
 */
function getApiKey() {
  return CONFIG.OPENAI_API_KEY;
}

/**
 * 设置API Key（供设置页面调用）
 */
function setApiKey(apiKey) {
  try {
    tt.setStorageSync('openai_api_key', apiKey);
    return true;
  } catch (error) {
    console.error('保存API Key失败:', error);
    return false;
  }
}

/**
 * 调用GPT进行图像分析
 * @param {string} imagePath - 图片路径
 * @param {string} wristColor - 手腕血管颜色 'warm' | 'cool'
 * @returns {Promise} 分析结果
 */
function analyzeImage(imagePath, wristColor) {
  return new Promise((resolve, reject) => {
    // 获取API Key
    const apiKey = getApiKey();
    if (!apiKey) {
      console.error('API Key未配置');
      reject(new Error('API Key未配置'));
      return;
    }
    
    // 如果启用模拟数据，直接返回模拟结果
    if (CONFIG.USE_MOCK_DATA) {
      console.log('使用模拟数据进行图像分析');
      setTimeout(() => {
        const mockResult = {
          season_12: "Cool Summer",
          axes: {
            depth: "浅",
            contrast: "低", 
            edge: "柔",
            temperature: "冷",
            chroma: "低"
          },
          pccs_tones: {
            primary: ["sf", "g", "llg"],
            secondary: ["p", "lt"],
            base_deep_neutrals: ["dp", "dkg"],
            avoid: ["v", "s", "b"]
          }
        };
        resolve(mockResult);
      }, 1000);
      return;
    }

    // 读取图片文件
    const fs = tt.getFileSystemManager();
    
    fs.readFile({
      filePath: imagePath,
      encoding: 'base64',
      success: (res) => {
        const base64Image = res.data;
        
        // 调用OpenAI API
        callOpenAIVisionAPI(base64Image, wristColor, apiKey)
          .then(resolve)
          .catch(reject);
      },
      fail: (error) => {
        console.error('读取图片失败:', error);
        reject(error);
      }
    });
  });
}

/**
 * 调用OpenAI Vision API
 * @param {string} base64Image - base64编码的图片
 * @param {string} wristColor - 手腕血管颜色
 * @param {string} apiKey - API密钥
 * @returns {Promise} API响应
 */
async function callOpenAIVisionAPI(base64Image, wristColor, apiKey) {
  // 速率限制
  await rateLimit();
  lastApiCallTime = Date.now();
  
  const colorTempMap = {
    'warm': '暖',
    'cool': '冷'
  };
  
  const prompt = `输入：
1) 一张正脸自然光照片（无遮挡、无滤镜）；
2) 一行文字：主色调=${colorTempMap[wristColor]}。

请仅基于可见证据完成：五维评估 → 12季型映射 → PCCS色调建议。
严格按指定JSON输出，禁止输出颜色名列表、十六进制、解释或过程文字。

【评估维度（先内判，不写入解释）】
- 冷/暖（底色）：已给出。
- 深/浅（value depth）：比较"头发/虹膜"相对"肤色"的明度；发眼显著更深→偏深；三者都浅→偏浅。
- 浓/淡（对比度）：观察发-肤-眼白的明度差；黑白分明→浓；差值不大→淡。
- 柔/锐（轮廓与边缘）：脸部转折是否尖刻、五官边缘是否硬朗、眼白是否强亮；圆润模糊→柔；棱角清晰→锐。
- 饱和度/清透度（chroma）：整体是否像加了灰滤镜（低饱和）或宝石般清透（高饱和）。

【12季型判定准则（内用）】
- 冷轴（夏/冬）  
  - 低对比+低饱和 → 柔夏 Soft Summer  
  - 低对比+浅明度 → 浅夏 Light Summer  
  - 纯冷+中对比中低饱和 → 冷夏 Cool Summer  
  - 高对比+高饱和 → 亮冬 Bright Winter  
  - 很深+高对比 → 深冬 Deep Winter  
  - 纯冷+高对比 → 冷冬 Cool Winter
- 暖轴（春/秋）  
  - 高饱和+明亮 → 亮春 Bright Spring  
  - 浅明度+轻快 → 浅春 Light Spring  
  - 纯暖+中对比 → 暖春 Warm Spring  
  - 低饱和+柔和 → 柔秋 Soft Autumn  
  - 很深+朴厚 → 深秋 Deep Autumn  
  - 纯暖+中深+浓郁 → 暖秋 Warm Autumn

【12季型 → PCCS色调映射（用于产出，仅给代号，不给色名）】
- 亮春：v / s / b / lt（少量 p）
- 浅春：lt / p / b（少量 s）
- 暖春：s / b / v（少量 lt）
- 柔秋：sf / g / d / llg（基底少量 dp）
- 深秋：dp / dk / dkg / d（点缀 sf）
- 暖秋：d / dp / g / sf
- 亮冬：v / s / b（中性底可少量 dk）
- 深冬：dk / dp / s（点缀 v）
- 冷冬：s / v / dk
- 浅夏：lt / p / llg（少量 sf）
- 冷夏：llg / sf / p / g
- 柔夏：sf / g / llg / p / lt（基底克制用 dp/dkg）

【输出格式（严格遵守；只输出此JSON；中文值；不得包含颜色名、解释、十六进制）】
{
  "season_12": "<从['Bright Spring','Light Spring','Warm Spring','Soft Autumn','Deep Autumn','Warm Autumn','Bright Winter','Deep Winter','Cool Winter','Light Summer','Cool Summer','Soft Summer']中选择其一>",
  "axes": {
    "depth": "<'浅' | '中等' | '中等偏深' | '深'>",
    "contrast": "<'低' | '中' | '高'>",
    "edge": "<'柔' | '中性' | '锐'>",
    "temperature": "<'冷' | '中性偏冷' | '中性偏暖' | '暖'>",
    "chroma": "<'低' | '中' | '高'>"
  },
  "pccs_tones": {
    "primary": ["<主推PCCS代号，如'sf','g','llg'>"],
    "secondary": ["<次级代号，如'p','lt','b'等>"],
    "base_deep_neutrals": ["<可用基底深色代号，如'dp','dkg','dk'>"],
    "avoid": ["<需避免的代号，如'v','s','b','dk'>"]
  }
}

【其他约束】
- 仅输出一次纯JSON，不加任何多余文字、换行说明、markdown代码块标记（如\`\`\`json）。
- 直接输出JSON对象，不要包装在代码块中。
- 若输入主色调给定，则以其为最高优先级；否则按照片相对关系自判。
- 若证据冲突，优先保证"季型-色调映射"一致性（宁可收紧到更保守的色调集合）。`;

  try {
    const res = await apiRequestWithRetry({
      url: `${CONFIG.OPENAI_BASE_URL}/chat/completions`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://monsoon-douyin.app', // OpenRouter所需
        'X-Title': 'Monsoon AI Fashion Assistant' // OpenRouter所需
      },
      timeout: CONFIG.TIMEOUT,
      data: {
        model: CONFIG.GPT_MODEL,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      }
    });

    // 🔍 调试：检查完整API响应
    console.log('🎯 【调试 - 完整API响应】');
    console.log('  状态码:', res.statusCode);
    console.log('  响应数据结构:', res.data);
    console.log('  choices存在:', !!res.data.choices);
    console.log('  choices长度:', res.data.choices ? res.data.choices.length : 0);
    
    if (!res.data.choices || res.data.choices.length === 0) {
      throw new Error('API响应中没有choices数据');
    }
    
    if (!res.data.choices[0].message) {
      throw new Error('API响应中没有message数据');
    }
    
    const content = res.data.choices[0].message.content;
    
    // 🔍 调试：检查内容
    console.log('🎯 【调试 - 响应内容检查】');
    console.log('  内容类型:', typeof content);
    console.log('  内容长度:', content ? content.length : 0);
    console.log('  内容是否为空:', !content || content.trim() === '');
    
    if (!content || content.trim() === '') {
      throw new Error('API返回的内容为空');
    }
    
    // 🧹 清理可能的markdown格式
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    cleanedContent = cleanedContent.trim();
    
    console.log('🧹 图像分析清理后内容:', cleanedContent.substring(0, 200) + '...');
    
    const result = JSON.parse(cleanedContent);
    
    // 🔍 断点1：图像分析API返回结果
    console.log('🎯 【断点1 - 图像分析API返回】');
    console.log('  原始API响应内容:', content);
    console.log('  解析后季型 (season_12):', result.season_12);
    console.log('  完整结果对象:', JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error('OpenAI API调用失败:', error);
    throw error;
  }
}

/**
 * 生成风格报告
 * @param {Object} userProfile - 用户档案
 * @returns {Promise} 生成的报告
 */
function generateStyleReport(userProfile) {
  return new Promise((resolve, reject) => {
    // 如果启用模拟数据，直接返回模拟结果
    if (CONFIG.USE_MOCK_DATA) {
      console.log('使用模拟数据生成风格报告');
      setTimeout(() => {
        const mockResult = {
          "季型名称": "冷夏型",
          "适合颜色的简短描述": "低饱和度、柔和、冷色调，适合清凉淡雅的色彩",
          "能量类型名称": "自洽自律型",
          "能量匹配的风格简短描述": "沉稳柔和，圆润不锋利，适合柔软飘逸的面料和含蓄的搭配",
          "推荐的颜色列表": [
            { "name": "雾霭蓝", "hex": "#A8B8D0" },
            { "name": "鼠尾草绿", "hex": "#9CAF88" },
            { "name": "灰紫色", "hex": "#B8A9C9" },
            { "name": "米白色", "hex": "#F5F2E8" },
            { "name": "淡粉色", "hex": "#E8D5D5" },
            { "name": "灰蓝色", "hex": "#B8C5D6" },
            { "name": "薄荷绿", "hex": "#C5D5C5" },
            { "name": "薰衣草紫", "hex": "#D4C5E8" },
            { "name": "珍珠灰", "hex": "#D5D5D5" },
            { "name": "浅灰蓝", "hex": "#C5D0D8" },
            { "name": "淡玫瑰粉", "hex": "#E8D0D0" },
            { "name": "青瓷色", "hex": "#B8D0D0" }
          ],
          "推荐的材质列表（按季节）": {
            "春": [
              { "name": "真丝", "why": "轻盈柔软，符合用户的柔和气质，适合春季的温暖天气" },
              { "name": "莫代尔", "why": "柔软舒适，具有良好的悬垂感，适合春季的轻薄穿搭" }
            ],
            "夏": [
              { "name": "莱赛尔", "why": "清凉透气，柔软光滑，非常适合夏季的炎热天气" },
              { "name": "竹纤维", "why": "天然抗菌，柔软亲肤，符合用户追求舒适的特点" }
            ],
            "秋": [
              { "name": "精纺毛织物", "why": "质地细腻，保暖性好，符合秋季的温暖需求" },
              { "name": "醋酸", "why": "具有丝绸般的光泽，柔软垂坠，适合秋季的优雅穿搭" }
            ],
            "冬": [
              { "name": "山羊绒", "why": "极其柔软保暖，符合用户追求舒适的特质" },
              { "name": "人丝", "why": "柔软光滑，具有良好的保暖性和垂坠感" }
            ]
          },
          "推荐的风格列表": ["简约基础", "自然文艺", "静奢老钱风", "韩系", "松弛文艺", "Clean Fit"],
          "场合推荐": [
            {
              "name": "通勤工作",
              "notes": "简约、专业、舒适的办公穿搭",
              "outfits": [
                {
                  "top": "雾霭蓝真丝衬衫",
                  "bottom": "米白色西装裤",
                  "shoes": "浅灰乐福鞋",
                  "accessories": "珍珠灰丝巾"
                },
                {
                  "top": "鼠尾草绿针织衫",
                  "bottom": "灰蓝色半身裙",
                  "shoes": "裸色平底鞋",
                  "accessories": "简约手表"
                }
              ]
            },
            {
              "name": "日常通用",
              "notes": "舒适、自然、适合日常活动的穿搭",
              "outfits": [
                {
                  "top": "灰紫色宽松T恤",
                  "bottom": "米白色阔腿裤",
                  "shoes": "白色运动鞋",
                  "accessories": "简约帆布包"
                },
                {
                  "top": "淡粉色针织开衫",
                  "bottom": "灰蓝色牛仔裤",
                  "shoes": "裸色乐福鞋",
                  "accessories": "小巧银饰"
                }
              ]
            }
          ]
        };
        resolve(mockResult);
      }, 2000);
      return;
    }

    // 获取API Key
    const apiKey = getApiKey();
    if (!apiKey) {
      console.error('API Key未配置');
      reject(new Error('API Key未配置'));
      return;
    }

  // 🔍 断点6：风格报告生成API开始
  console.log('🎯 【断点6 - 风格报告生成API开始】');
  console.log('  接收到的用户档案:', JSON.stringify(userProfile, null, 2));
  if (userProfile.color_analysis) {
    console.log('  接收到的季型 (season_12):', userProfile.color_analysis.season_12);
  }
  
  // 构建prompt（这里需要根据需求文档的prompt）
  const prompt = buildStyleReportPrompt(userProfile);
  
  // 🔍 断点7：生成的prompt检查
  console.log('🎯 【断点7 - 生成的prompt检查】');
  console.log('  完整prompt长度:', prompt.length);
  // 提取包含季型信息的部分
  const seasonLine = prompt.split('\n').find(line => line.includes('用户的季型是'));
  console.log('  prompt中的季型行:', seasonLine);
    
    // 使用带重试的API请求
    apiRequestWithRetry({
      url: `${CONFIG.OPENAI_BASE_URL}/chat/completions`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://monsoon-douyin.app', // OpenRouter所需
        'X-Title': 'Monsoon AI Fashion Assistant' // OpenRouter所需
      },
      timeout: CONFIG.TIMEOUT,
      data: {
        model: getModelForTask('text'), // 📝 风格报告使用GPT-5-Chat
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant specialized in fashion and style analysis."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 1.0,
        include_reasoning: false
      }
    }).then((res) => {
      try {
        // 🔍 调试：检查风格报告API响应
        console.log('🎯 【调试 - 风格报告API响应】');
        console.log('  状态码:', res.statusCode);
        console.log('  响应数据结构:', res.data);
        console.log('  choices存在:', !!res.data.choices);
        console.log('  choices长度:', res.data.choices ? res.data.choices.length : 0);
        
        if (!res.data.choices || res.data.choices.length === 0) {
          throw new Error('风格报告API响应中没有choices数据');
        }
        
        if (!res.data.choices[0].message) {
          throw new Error('风格报告API响应中没有message数据');
        }
        
        const content = res.data.choices[0].message.content;
        
        // 🔍 断点8：风格报告API原始返回
        console.log('🎯 【断点8 - 风格报告API原始返回】');
        console.log('  API原始响应内容:', content);
        console.log('  内容类型:', typeof content);
        console.log('  内容长度:', content ? content.length : 0);
        console.log('  内容是否为空:', !content || content.trim() === '');
        
        if (!content || content.trim() === '') {
          throw new Error('风格报告API返回的内容为空');
        }
        
        // 🧹 清理GPT-5-Chat的Markdown格式
        const cleanedContent = cleanMarkdownJSON(content);
        console.log('🎯 【清理后的JSON内容】:', cleanedContent.substring(0, 200) + '...');
        
        const result = JSON.parse(cleanedContent);
        
        // 🔍 断点9：风格报告解析后的结果
        console.log('🎯 【断点9 - 风格报告解析后结果】');
        console.log('  解析后的季型名称:', result['季型名称']);
        console.log('  完整解析结果:', JSON.stringify(result, null, 2));
        
        resolve(result);
      } catch (error) {
        console.error('解析API响应失败:', error);
        reject(error);
      }
    }).catch((error) => {
      reject(error);
    });
  });
}

/**
 * 构建风格报告生成的prompt
 * @param {Object} userProfile - 用户档案
 * @returns {string} prompt
 */
function buildStyleReportPrompt(userProfile) {
  // 计算能量类型
  const scores = userProfile.personality_test.scores;
  const sortedScores = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const topTwo = sortedScores.slice(0, 2).map(item => item[0]).join('');
  
  // 能量类型映射
  const pairToNameMap = {
    'ab': '活跃舒展型', 'ac': '活跃激进型', 'ad': '活跃笃定型',
    'ba': '舒展活跃型', 'bc': '自洽自律型', 'bd': '自洽笃定型',
    'ca': '能量锋利型', 'cb': '自律自洽型', 'cd': '锋利笃定型',
    'da': '动静自如型', 'db': '笃定自洽型', 'dc': '笃定锐利型'
  };
  
  const energyType = pairToNameMap[topTwo] || '自洽自律型';
  
  // 气质特征映射
  const typeToPromptMap = {
    'a': '用户是一个轻快、愉悦而俏皮，展现出高度的律动感，高能量的人，适合的衣服具有这些特征：1. 量感轻 2. 自由流动，带有随机元素和印花，营造出一种趣味感 3. 细节设计带有可爱感，比如纽扣、蝴蝶结或荷叶边 4. 搭配组合必须带有新鲜感，包含新的单品与搭配方式，不以同样的方式重复穿着 5. 点缀的亮色 6. 色彩基调：明亮轻盈，带有白色底调',
    'b': '用户是这样的人：性格沉稳柔和，圆润不锋利，举止安定，从容，表达方式细腻含蓄，处理事务更注重耐心与时间。适合的衣服具有这些特征：1. 柔软的面料，类似睡衣的质感 2. 圆润且柔和的细节 3. 宽松飘逸的版型 4. 水彩般的图案或印花 5. 整体柔和、含蓄且低调 6. 色彩基调：低对比度，带灰色底调',
    'c': '用户是一个这样的人：基调带有棱角，举止充满动感与突兀感，行动上向前推进，带有强烈的力量感，是典型的实干者。适合的衣服具有这些特征：1. 较厚重、有质感的面料 2. 带有原始感、不完美处理的质地 3. 厚实且极具实用性 4. 前卫的细节，造型和轮廓带有棱角与尖点 5. 色彩基调：浓郁，带棕色底调',
    'd': '用户是这样的人：静止、平直而笔直，能量专注、稳定而直接，行事谨慎、善于分析，举止间带有不容忽视的沉稳气场。1. 合身且有结构感的廓形 2. 大胆的色块与高对比度的配色组合 3. 干净、简洁的线条 4. 鲜明独特 5. 精致得体 6. 色彩基调：饱和、纯正的色相'
  };
  
  const firstType = sortedScores[0][0];
  const secondType = sortedScores[1][0];
  
  const prompt = `你是专业的造型师和风格指导师。请你根据以下规则，为一位希望找到个人风格、前来咨询的${userProfile.basic_info.gender === 'male' ? '男性' : '女性'}用户提供专业、系统、可靠的建议。输出必须符合结构化要求，并严格按照给定格式生成。

【重要】季型定义（严格遵守，不得更改）：
- Warm Spring = 暖春型：纯暖+中对比
- Warm Autumn = 暖秋型：纯暖+中深+浓郁
- Cool Summer = 冷夏型：纯冷+中等对比
- 其他季型也必须严格按照英文名称对应中文名称，不得混淆

---

1. 色彩部分

用户的季型是：${userProfile.color_analysis.season_12}（请严格保持此季型不变，不得转换为其他季型）
此季型适合的颜色特征：${getSeasonDescription(userProfile.color_analysis.season_12)}
用户个人偏好颜色：${userProfile.preferences.favorite_colors.join('、')}

请以季型适合的颜色为主导，以用户偏好为辅助，生成 **12 种推荐颜色**。
用户的色相偏好决定哪几个颜色会出现在前面，用户不偏好但从色调上适合他的颜色会排在后面。比如用户选择喜欢蓝、绿，如果他适合铅灰色系，那么先推荐雾蓝、鼠尾草绿，再推荐雾粉、薰衣草紫等。最终保证各种色相（红橙黄绿青蓝紫）都覆盖到。
要求每种颜色包含：美化后的颜色名称（避免"浅绿""深红"等生硬表达）和对应的 Hex 值。

- 原则1：优先推荐兼顾季型与用户偏好的颜色。
- 原则2：颜色命名需优雅且准确，如"勃艮第红""鼠尾草绿"，保持美感与专业性。
- 原则3：黑/白/灰类颜色若不适合季型，不应直接推荐；但可通过调整使其符合季型特征。
- 原则4：黑、白、灰每一项最多出现一种，比如雾灰和温暖灰只能出现一种，选择最适合用户的那一种推荐。
- 原则5：保证「红橙黄绿蓝紫」所有色相都覆盖到。
- 原则6：颜色名字不超过5个字，不要出现括号。

---

2. 材质部分

用户的气质特点有两类：
首要特征：${typeToPromptMap[firstType]}
第二特征：${typeToPromptMap[secondType]}

【任务要求】：
结合用户的首要+第二气质特征，从以下材质库中筛选出 ** 8 种适合材质**，并覆盖春夏秋冬不同季节，每个季节对应两种材质，既包含轻薄面料也包含厚重面料。输出时，每个材质需包含字段：name（材质名称）+ why（推荐理由，1-2 句话，解释其与用户气质和使用场景的契合点）。
【软性规则】注意，要价格均衡，尽量做到3件高价材质，5件平价材质。
- 高价材质：真丝、山羊绒、马海毛、精纺毛织物、粗纺毛织物（高端呢料、大衣面料）、皮革（羊皮、牛皮等天然皮革）、缎（尤其真丝缎）、莱赛尔（高端品牌定价较高）、醋酸、长毛绒（高档工艺 / 真毛替代品部分价位较高）
- 平价材质：纯棉类：府绸、卡其、哔叽、牛仔布、灯芯绒、罗纹布、珠地布、毛巾布、抓绒；麻（亚麻布）；莫代尔；锦纶；涤纶；腈纶；人丝/人棉/粘纤；竹纤维氨纶；）羽绒；棉麻混纺；涤麻混纺；羊毛（

【材质和气质/能量类型对应参考】：

以下材质库包含每种材质的特征分类、常见用途和适合季节，请结合用户气质特征进行匹配：

**轻流动特质材质**：
- 真丝（Silk）：轻流动/柔软圆润，丝衬衫、连衣裙、丝巾，春夏
- 亚麻布（Linen）：轻流动/挺阔结构感，夏季衬衫、裙装，夏
- 人丝（Rayon/Viscose）：轻流动/柔软圆润，连衣裙、衬衫，春夏
- 醋酸（Acetate）：柔软圆润/轻流动，衬里、连衣裙、衬衫，春夏
- 莱赛尔（Lyocell/Tencel）：柔软圆润/轻流动，裙装、衬衫、裤装，春夏秋
- 人棉（Viscose Rayon）：轻流动/柔软圆润，裙装、衬衫、裤装，春夏
- 粘纤（Viscose）：轻流动/柔软圆润，连衣裙、衬衫，春夏
- 缎（Satin）：轻流动/柔软圆润，礼服、裙装、衬衫，春夏
- 棉麻混纺：柔软圆润/轻流动，夏季衬衫、裙装，春夏
- 涤麻混纺：挺阔结构感/轻流动，西装套装、衬衫，春秋
- 锦纶（Nylon）：挺阔结构感/轻流动，风衣、泳衣、运动装，春夏秋
- 羽绒（Down）：轻流动/厚重质感，羽绒服、棉被，冬

**柔软圆润特质材质**：
- 莫代尔（Modal）：柔软圆润/轻流动，内衣、T恤、家居服，春夏
- 竹纤维（Bamboo Fiber）：柔软圆润/轻流动，内衣、T恤、家居服，夏
- 罗纹布（Rib Knit）：柔软圆润/合身结构感，T恤、针织衫、打底，四季
- 毛巾布（Terry Cloth）：柔软圆润，运动服、卫衣、家居服，春夏
- 山羊绒（Cashmere）：柔软圆润/厚重质感，高档毛衣、大衣，秋冬
- 氨纶（Spandex/Elastane）：合身结构感/柔软圆润，紧身裤、瑜伽服、泳衣，四季（贴身类）

**挺阔结构感特质材质**：
- 府绸（Cotton Poplin）：挺阔结构感/柔软圆润，衬衫、连衣裙，春夏
- 珠地布（Piqué）：挺阔结构感/柔软圆润，Polo衫，春夏
- 涤纶（Polyester）：挺阔结构感/柔软圆润，衬衫、运动服、西装，四季
- 卡其布（Cotton Twill）：挺阔结构感/厚重质感，工装裤、外套，春秋
- 哔叽（Serge）：挺阔结构感/厚重质感，制服、西装裤，秋冬
- 精纺毛织物（Worsted Wool）：挺阔结构感/厚重质感，西装、正装裤，秋冬
- 牛仔布（Denim）：厚重质感/挺阔结构感，牛仔裤、夹克、裙装，四季（尤春秋）
- 皮革（羊皮、牛皮等）：厚重质感/挺阔结构感，皮夹克、皮裤、鞋包，秋冬

**厚重质感特质材质**：
- 灯芯绒（Corduroy）：厚重质感/柔软圆润，裤装、外套、裙装，秋冬
- 抓绒（Fleece）：厚重质感/柔软圆润，卫衣、运动外套，秋冬
- 腈纶（Acrylic）：厚重质感/柔软圆润，针织衫、毛衣、围巾，秋冬
- 马海毛（Mohair）：厚重质感/柔软圆润，毛衣、大衣，秋冬
- 粗纺毛织物（Woolen）：厚重质感/柔软圆润，大衣、呢料外套，秋冬
- 长毛绒（Faux Fur/羊羔毛）：厚重质感/柔软圆润，外套、夹克，秋冬
- 羊毛（Wool）：厚重质感/柔软圆润，毛衣、大衣、针织品，秋冬

---

3. 风格部分

结合用户气质，从以下风格库中推荐 ** 6 种风格**，要求符合用户适合的配色与用户性格气质。
【设定】：a代表灵动飘逸型人，b代表松弛流动型人，c代表锐利效率型人，d代表沉稳坚实型人。
【风格对应关系】：
	•	简约基础 (Minimal)：b, d
	•	街头潮流 (Streetwear)：a, c
	•	名媛淑女 (Elegant Lady)：b, d
	•	摩登复古 (Modern Vintage)：b, d
	•	日系 (Japanese)：a, b
	•	韩系 (K-style)：a, b, d
	•	时髦前卫 (Avant-garde)：a, c, d
	•	甜美少女 (Sweet)：a, b
	•	自然文艺 (Artsy)：a, b
	•	乡村巴恩风 (Barn)：b, c
	•	静奢老钱风 (Old Money)：b, d
	•	无性别廓形 (Gender-neutral)：c, d
	•	美拉德风 (Maillard)：b, c, d
	•	都市游牧风 (Urban Nomad)：a, c
	•	机车工装风 (Workwear)：c, d
	•	多巴胺风 (Dopamine)：a
	•	Y2K 千禧风 (Y2K Aesthetic)：a, c
	•	新中式 (Neo-Chinese)：b, d
	•	常春藤学院风 (Ivy)：d, b
	•	Clean Fit (Sharp Minimal)：d, b
	•	假日南法风 (French Riviera)：a, b
	•	千金玛德琳 (Madeleine Girl)：a, b
	•	牛仔丹宁风 (Denim)：a, c
	•	都市运动风 (Athleisure)：a, c
	•	大女人风 (Power Dressing)：c, d
	•	高智感穿搭 (Intellectual Chic)：d
	•	美式复古 (Americana Vintage)：c, b
	•	英伦风 (British Classic)：d, b
	•	极简主义 (Minimalism)：b, d
	•	甜酷风 (Sweet-Cool)：a, c

---

4. 分场合推荐

用户所需场合为：${userProfile.preferences.occasions.map(o => getOccasionName(o)).join('、')}
（注意：**仅输出用户指定的场合**，不要输出未指定场合的推荐。）

【任务要求】：
为每个场合提供 2-3 套穿搭推荐。
每套包含：上衣、裤子/裙子、鞋、配饰。描述需具体实用，整体搭配符合用户气质与审美要求。
在场合推荐部分，只需描述颜色名称，不再使用 Hex 值。

---

5. 输出格式（必须严格遵守）

{
  "季型名称": "${getSeasonChineseName(userProfile.color_analysis.season_12)}"（注意：仅中文；必须与输入的${userProfile.color_analysis.season_12}完全对应，不得更改季型），
  "适合颜色的简短描述": "",
  "能量类型名称": "${energyType}",
  "能量匹配的风格简短描述": "",
  "推荐的颜色列表": [
    { "name": "", "hex": "" }
  ],
  "推荐的材质列表（按季节）": {
    "春": [{ "name": "", "why": "" }],
    "夏": [{ "name": "", "why": "" }],
    "秋": [{ "name": "", "why": "" }],
    "冬": [{ "name": "", "why": "" }]
  },
  "推荐的风格列表": ["中文（对应英文）", "", ""],
  "场合推荐": [
    {
      "name": "",
      "notes": "",
      "outfits": [
        {
          "top": "",
          "bottom": "",
          "shoes": "",
          "accessories": ""
        }
      ]
    }
  ]
}`;

  return prompt;
}

// 辅助函数
function getSeasonDescription(season) {
  const descriptions = {
    'Bright Spring': '高饱和度、明亮清透、暖色调',
    'Light Spring': '浅色调、轻快活泼、暖色调',
    'Warm Spring': '纯暖色调、中等对比度',
    'Soft Autumn': '低饱和度、柔和温润、暖色调',
    'Deep Autumn': '深色调、浓郁朴厚、暖色调',
    'Warm Autumn': '纯暖色调、中深色调',
    'Bright Winter': '高对比度、高饱和度、冷色调',
    'Deep Winter': '深色调、高对比度、冷色调',
    'Cool Winter': '纯冷色调、高对比度',
    'Light Summer': '浅色调、低对比度、冷色调',
    'Cool Summer': '纯冷色调、中等对比度',
    'Soft Summer': '低饱和度、柔和、冷色调'
  };
  return descriptions[season] || '温和色调';
}

function getSeasonChineseName(season) {
  const names = {
    'Bright Spring': '亮春型',
    'Light Spring': '浅春型', 
    'Warm Spring': '暖春型',
    'Soft Autumn': '柔秋型',
    'Deep Autumn': '深秋型',
    'Warm Autumn': '暖秋型',
    'Bright Winter': '亮冬型',
    'Deep Winter': '深冬型',
    'Cool Winter': '冷冬型',
    'Light Summer': '浅夏型',
    'Cool Summer': '冷夏型',
    'Soft Summer': '柔夏型'
  };
  return names[season] || '冷夏型';
}

function getOccasionName(occasion) {
  const names = {
    'work': '通勤工作',
    'workout': '运动健身',
    'party': '玩乐聚会',
    'everyday': '日常通用',
    'weekend': '周末休闲',
    'beachwear': '海滩度假'
  };
  return names[occasion] || occasion;
}

/**
 * 第一层API：衣物信息提取
 * @param {string} base64Image - base64编码的图片
 * @returns {Promise<Object>} 衣物信息
 */
async function extractClothingInfo(base64Image) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API Key未配置');
  }

  const prompt = `衣服包括上衣、下装、连衣裙、鞋、包、配饰等。请判断图中物体，如果不是衣服，请直接输出"图片非衣物，请重新上传"，跳过以下所有步骤，break.
如果图中是一件衣物（可能是上衣、下装、鞋、配饰等），请你仔细分析，提取出如下信息，按照如下json格式输出。
如果图中有多件衣物，取最主要的占据面积最大的那件来进行同样分析。

请严格按照以下JSON格式输出，不要包含任何其他文字：

{
  "category": "",
  "sub_category": "",
  "gender": "",
  "fit_shape": "",
  "material": {
    "main": "",
    "lining": "",
    "trim": "",
    "hardware": ""
  },
  "details": {
    "structure": "",
    "closure": "",
    "strap_handle": "",
    "length": "",
    "silhouette": "",
    "pockets": "",
    "ornament": "",
    "other": ""
  },
  "color": {
    "main": "",
    "contrast": "",
    "pattern": ""
  },
  "style": "",
  "occasions": [],
  "season": "",
  "pairing": []
}`;

  try {
    console.log('🔍 第一层API：衣物信息提取');
    console.log('  - 图片大小:', base64Image.length, '字符');
    
    const res = await apiRequestWithRetry({
      url: `${CONFIG.OPENAI_BASE_URL}/chat/completions`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://monsoon-douyin.app',
        'X-Title': 'Monsoon AI Fashion Assistant'
      },
      timeout: CONFIG.TIMEOUT,
      data: {
        model: CONFIG.GPT_MODEL,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      }
    });

    const rawContent = res.data.choices[0].message.content;
    console.log('🤖 衣物信息提取原始内容:', rawContent);
    
    // 检查是否为非衣物
    if (rawContent.includes('图片非衣物，请重新上传')) {
      return {
        error: '图片非衣物，请重新上传',
        isClothing: false
      };
    }
    
    // 清理Markdown代码块标记
    let content = rawContent.trim();
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    content = content.trim();
    
    console.log('🧹 衣物信息清理后内容:', content);
    
    // 尝试解析JSON
    let result;
    try {
      result = JSON.parse(content);
      result.isClothing = true;
      console.log('✅ 衣物信息JSON解析成功:', result);
    } catch (parseError) {
      console.warn('⚠️ JSON解析失败，使用默认结果:', parseError.message);
      result = {
        error: 'AI回复格式异常，请重新上传',
        isClothing: false
      };
    }
    
    return result;
  } catch (error) {
    console.error('衣物信息提取失败:', error);
    throw error;
  }
}

/**
 * 第二层API：适配度分析
 * @param {Object} clothingInfo - 第一层提取的衣物信息
 * @param {Object} userProfile - 用户档案
 * @returns {Promise<Object>} 适配度分析结果
 */
async function analyzeSuitability(clothingInfo, userProfile) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API Key未配置');
  }

  // 构建用户档案信息
  const styleReport = userProfile.style_report || userProfile['style_report'];
  const userInfo = `
用户的档案如下：
季型名称: ${styleReport['季型名称'] || styleReport.season_name || '冷夏型'}
适合颜色描述: ${styleReport['适合颜色的简短描述'] || styleReport.season_description || '适合低对比度、带灰感的柔和色彩'}
能量类型: ${styleReport['能量类型名称'] || styleReport.energy_type_name || '自洽自律型'}
能量描述: ${styleReport['能量匹配的风格简短描述'] || styleReport.energy_description || '沉稳优雅，适合柔软飘逸的风格'}
推荐颜色: ${JSON.stringify(styleReport['推荐的颜色列表'] || styleReport.recommended_colors || [])}
推荐风格: ${JSON.stringify(styleReport['推荐的风格列表'] || styleReport.recommended_styles || [])}`;

  const prompt = `${userInfo}

用户上传的单品如下：
${JSON.stringify(clothingInfo, null, 2)}

请判断此衣服是否适合此用户。

请严格按照以下JSON格式输出，不要包含任何其他文字：

{
  "overall_evaluation": {
    "conclusion": "",
    "suitability_score": 0
  },
  "analysis": {
    "color": {
      "clothing_color": "",
      "person_season": "",
      "fit": "",
      "reason": ""
    },
    "material": {
      "clothing_material": "",
      "recommended_materials": [],
      "fit": "",
      "reason": ""
    },
    "style": {
      "clothing_style": "",
      "person_energy": "",
      "fit": "",
      "reason": ""
    },
    "pairing": {
      "clothing_suggestions": [],
      "fit": "",
      "reason": ""
    },
    "season": {
      "clothing_season": "",
      "recommended_for_person": [],
      "fit": "",
      "reason": ""
    }
  },
  "recommendations": {
    "better_colors": [],
    "better_materials": [],
    "better_styles": []
  }
}

评分规则：
- 5分：颜色、材质、风格三个维度都匹配用户季型和能量特征
- 4分：三个维度中有两个匹配
- 3分：三个维度中有一个匹配
- 2分：三个维度都不匹配（最低分）`;

  try {
    console.log('🔍 第二层API：适配度分析');
    
    const res = await apiRequestWithRetry({
      url: `${CONFIG.OPENAI_BASE_URL}/chat/completions`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://monsoon-douyin.app',
        'X-Title': 'Monsoon AI Fashion Assistant'
      },
      timeout: CONFIG.TIMEOUT,
      data: {
        model: CONFIG.GPT_MODEL,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.3
      }
    });

    const rawContent = res.data.choices[0].message.content;
    console.log('🤖 适配度分析原始内容:', rawContent);
    
    // 清理Markdown代码块标记
    let content = rawContent.trim();
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    content = content.trim();
    
    console.log('🧹 适配度分析清理后内容:', content);
    
    // 尝试解析JSON
    let result;
    try {
      result = JSON.parse(content);
      console.log('✅ 适配度分析JSON解析成功:', result);
    } catch (parseError) {
      console.warn('⚠️ JSON解析失败，使用默认结果:', parseError.message);
      result = {
        overall_evaluation: {
          conclusion: "分析过程中出现错误，请重新尝试",
          suitability_score: 3
        },
        analysis: {
          color: { fit: "无法分析", reason: "系统错误" },
          material: { fit: "无法分析", reason: "系统错误" },
          style: { fit: "无法分析", reason: "系统错误" },
          pairing: { fit: "无法分析", reason: "系统错误" },
          season: { fit: "无法分析", reason: "系统错误" }
        },
        recommendations: {
          better_colors: [],
          better_materials: [],
          better_styles: []
        }
      };
    }
    
    return result;
  } catch (error) {
    console.error('适配度分析失败:', error);
    throw error;
  }
}

module.exports = {
  analyzeImage,
  generateStyleReport,
  extractClothingInfo,
  analyzeSuitability,
  getApiKey,
  setApiKey,
  CONFIG
};
