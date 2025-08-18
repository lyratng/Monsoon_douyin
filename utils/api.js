// utils/api.js - API调用工具函数

// 配置信息（直接写在代码中，避免require JSON文件）
const config = {
  systemRole: "你是'季风 Monsoon'的个人风格分析师，一款基于大模型能力的抖音小程序。你的口吻要轻柔、亲切、陪伴式，像一位温柔的朋友在引导用户探索自己的个人风格。你擅长通过心理学问卷和照片分析，为用户提供个性化的色彩分析和风格建议。",
  styleAnalysis: {
    main: "请基于用户的问卷回答和照片分析，生成一份详细的个人风格报告。报告应包含：主色调分析、推荐色板、适合风格、推荐材质、避免项目等。",
    image: "请分析用户上传的照片，重点关注肤色、面部特征、整体气质等，为风格分析提供视觉依据。",
    questionnaire: "请分析用户的问卷回答，了解其风格偏好、生活节奏、社交场景等，为个性化推荐提供依据。"
  },
  colorAnalysis: "请基于肤色分析结果，推荐最适合的颜色色板，包括主色调和扩展色板。",
  styleRecommendation: "请基于用户的个人特质，推荐最适合的穿搭风格和具体搭配建议。",
  avoidanceItems: "请列出用户应该避免的颜色、材质和搭配，并说明原因。",
  popupContent: {
    colorPalette: "请为推荐色板弹窗生成详细内容，包括颜色说明和使用建议。",
    style: "请为风格推荐弹窗生成详细内容，包括风格分析和搭配建议。",
    material: "请为材质推荐弹窗生成详细内容，包括材质特性和护理建议。"
  },
  refinePrompt: "请基于用户的反馈，对之前的风格报告进行优化和调整。",
  constraints: "不得输出医疗诊断，尊重拍摄条件限制，字段缺失显式null。",
  models: {
    vision: "doubao-1-5-thinking-vision-pro-250428",
    text: "doubao-1-5-pro-32k-250115",
    apiEndpoint: "https://ark.cn-beijing.volces.com/api/v3/chat/completions"
  }
};

class ApiService {
  constructor() {
    this.baseUrl = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
    this.apiKey = '01bcd0d4-10e3-4609-ab1e-2d6122e82df7'; // 豆包API密钥
    this.visionModel = 'doubao-1-5-thinking-vision-pro-250428';
    this.textModel = 'doubao-1-5-pro-32k-250115';
  }

  // 设置API密钥
  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  // 通用请求方法
  async request(url, data) {
    return new Promise((resolve, reject) => {
      console.log('发送API请求:', url);
      console.log('请求数据:', JSON.stringify(data, null, 2));
      
      tt.request({
        url: url,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        data: data,
        timeout: 60000, // 增加到60秒
        success: (response) => {
          console.log('API响应:', response);
          console.log('状态码:', response.statusCode);
          console.log('响应数据:', response.data);

          if (response.statusCode === 200) {
            resolve(response.data);
          } else {
            const error = new Error(`API请求失败: ${response.statusCode} - ${JSON.stringify(response.data)}`);
            console.error('API请求错误:', error);
            reject(error);
          }
        },
        fail: (error) => {
          console.error('API请求错误:', error);
          console.error('错误详情:', {
            message: error.message,
            errMsg: error.errMsg,
            statusCode: error.statusCode,
            data: error.data
          });
          reject(error);
        }
      });
    });
  }

  // 调用豆包文本生成API
  async callTextAPI(prompt, temperature = 0.5) {
    const data = {
      model: this.textModel,
      messages: [
        {
          role: "system",
          content: config.systemRole
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: temperature,
      max_tokens: 2000,
      top_p: 0.8,
      top_k: 40
    };

    // 添加重试机制
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`API调用尝试 ${attempt}/${maxRetries}`);
        return await this.request(this.baseUrl, data);
      } catch (error) {
        console.error(`API调用尝试 ${attempt} 失败:`, error);
        if (attempt === maxRetries) {
          throw error;
        }
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
  }

  // 调用豆包多模态API（图像分析）
  async callVisionAPI(imageUrl, prompt) {
    console.log('=== API callVisionAPI 开始 ===');
    console.log('输入imageUrl类型:', typeof imageUrl);
    console.log('输入imageUrl长度:', imageUrl ? imageUrl.length : 0);
    console.log('输入imageUrl开头:', imageUrl ? imageUrl.substring(0, 50) + '...' : 'null');
    console.log('输入imageUrl是否以data:image开头:', imageUrl ? imageUrl.startsWith('data:image') : false);
    console.log('输入imageUrl是否以http开头:', imageUrl ? imageUrl.startsWith('http') : false);
    
    const data = {
      model: this.visionModel,
      messages: [
        {
          role: "system",
          content: config.systemRole
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: imageUrl
              }
            },
            {
              type: "text",
              text: prompt
            }
          ]
        }
      ],
      temperature: 0.5,
      max_tokens: 1000,
      top_p: 0.8,
      top_k: 40
    };

    console.log('发送给API的image_url开头:', data.messages[1].content[0].image_url.url.substring(0, 50) + '...');
    
    // 添加重试机制
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Vision API调用尝试 ${attempt}/${maxRetries}`);
        return await this.request(this.baseUrl, data);
      } catch (error) {
        console.error(`Vision API调用尝试 ${attempt} 失败:`, error);
        if (attempt === maxRetries) {
          throw error;
        }
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
  }

  // 分析单张照片
  async analyzeImage(imageUrl, imageType) {
    const prompt = config.styleAnalysis.imageAnalysisPrompt.replace('{imageUrl}', imageUrl);
    
    try {
      const response = await this.callVisionAPI(imageUrl, prompt);
      return {
        type: imageType,
        analysis: response.choices[0].message.content,
        success: true
      };
    } catch (error) {
      console.error('图片分析失败:', error);
      return {
        type: imageType,
        analysis: null,
        success: false,
        error: error.message
      };
    }
  }

  // 分析问卷数据
  async analyzeQuestionnaire(questionnaireData) {
    const prompt = config.styleAnalysis.questionnaireAnalysisPrompt.replace(
      '{questionnaireAnswers}', 
      JSON.stringify(questionnaireData, null, 2)
    );

    try {
      const response = await this.callTextAPI(prompt);
      return {
        analysis: response.choices[0].message.content,
        success: true
      };
    } catch (error) {
      console.error('问卷分析失败:', error);
      return {
        analysis: null,
        success: false,
        error: error.message
      };
    }
  }

  // 生成完整风格报告
  async generateStyleReport(questionnaireData, imageAnalyses) {
    const prompt = config.styleAnalysis.mainPrompt
      .replace('{questionnaire}', JSON.stringify(questionnaireData, null, 2))
      .replace('{images}', JSON.stringify(imageAnalyses, null, 2));

    try {
      const response = await this.callTextAPI(prompt);
      const content = response.choices[0].message.content;
      
      // 尝试解析JSON
      try {
        const report = JSON.parse(content);
        return {
          report: report,
          success: true
        };
      } catch (parseError) {
        console.error('JSON解析失败:', parseError);
        return {
          report: null,
          success: false,
          error: '报告格式错误'
        };
      }
    } catch (error) {
      console.error('生成报告失败:', error);
      return {
        report: null,
        success: false,
        error: error.message
      };
    }
  }

  // 追问改进
  async refineReport(originalReport, userFeedback) {
    const prompt = config.refinePrompt
      .replace('{originalAnalysis}', JSON.stringify(originalReport, null, 2))
      .replace('{userFeedback}', userFeedback);

    try {
      const response = await this.callTextAPI(prompt);
      const content = response.choices[0].message.content;
      
      try {
        const refinedReport = JSON.parse(content);
        return {
          report: refinedReport,
          success: true
        };
      } catch (parseError) {
        console.error('JSON解析失败:', parseError);
        return {
          report: null,
          success: false,
          error: '报告格式错误'
        };
      }
    } catch (error) {
      console.error('改进报告失败:', error);
      return {
        report: null,
        success: false,
        error: error.message
      };
    }
  }

  // 生成弹窗内容
  async generatePopupContent(type, data) {
    let prompt = '';
    
    switch (type) {
      case 'colorPalette':
        prompt = config.popupContent.colorPalettePopup.replace('{colorPalette}', JSON.stringify(data, null, 2));
        break;
      case 'style':
        prompt = config.popupContent.stylePopup.replace('{styleAnalysis}', JSON.stringify(data, null, 2));
        break;
      case 'material':
        prompt = config.popupContent.materialPopup.replace('{materialRecommendation}', JSON.stringify(data, null, 2));
        break;
      default:
        throw new Error('未知的弹窗类型');
    }

    try {
      const response = await this.callTextAPI(prompt);
      return {
        content: response.choices[0].message.content,
        success: true
      };
    } catch (error) {
      console.error('生成弹窗内容失败:', error);
      return {
        content: null,
        success: false,
        error: error.message
      };
    }
  }
}

// 创建单例实例
const apiService = new ApiService();

module.exports = apiService; 