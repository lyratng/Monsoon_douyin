// pages/test/test.js - API测试页面

const app = getApp();

Page({
  data: {
    testResults: [],
    isLoading: false,
    currentTest: '',
    apiKey: '01bcd0d4-10e3-4609-ab1e-2d6122e82df7'
  },

  onLoad() {
    console.log('API测试页面加载');
  },

  // 测试文本生成API
  async testTextAPI() {
    this.setData({
      isLoading: true,
      currentTest: '文本生成API测试中...'
    });

    try {
      const testPrompt = "你好，请简单介绍一下自己，用中文回答。";
      
      const result = await this.callTextAPI(testPrompt);
      
      this.addTestResult('文本生成API', {
        success: true,
        prompt: testPrompt,
        response: result.choices[0].message.content,
        timestamp: new Date().toLocaleString()
      });

    } catch (error) {
      console.error('文本API测试失败:', error);
      this.addTestResult('文本生成API', {
        success: false,
        error: error.message,
        timestamp: new Date().toLocaleString()
      });
    } finally {
      this.setData({
        isLoading: false,
        currentTest: ''
      });
    }
  },

  // 测试图像分析API
  async testVisionAPI() {
    this.setData({
      isLoading: true,
      currentTest: '图像分析API测试中...'
    });

    try {
      // 使用base64编码的简单测试图片（1x1像素的白色图片）
      const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      const testPrompt = "请简单描述这张图片的内容。";
      
      console.log('开始图像分析测试，使用base64图片');
      
      const result = await this.callVisionAPI(testPrompt, testImageBase64);
      
      this.addTestResult('图像分析API', {
        success: true,
        prompt: testPrompt,
        imageUrl: 'base64图片',
        response: result.choices[0].message.content,
        timestamp: new Date().toLocaleString()
      });

    } catch (error) {
      console.error('图像API测试失败:', error);
      this.addTestResult('图像分析API', {
        success: false,
        error: error.message,
        timestamp: new Date().toLocaleString()
      });
    } finally {
      this.setData({
        isLoading: false,
        currentTest: ''
      });
    }
  },

  // 测试风格分析API
  async testStyleAnalysisAPI() {
    this.setData({
      isLoading: true,
      currentTest: '风格分析API测试中...'
    });

    try {
      const testQuestionnaire = {
        gender: "女",
        answers: {
          q1: ["经典优雅", "休闲舒适"],
          q2: "会根据场合精心搭配",
          q3: "增加自信和魅力",
          q4: "有一点影响，但有自己偏好",
          q5: "节奏适中、相对稳定",
          q6: ["明黄", "森绿", "天蓝"],
          q7: ["舒适感和实用性", "独特性和个性化"],
          q8: ["根据具体场合和需求", "凭借个人感觉和直觉"]
        }
      };

      const testPrompt = `基于用户的问卷回答，请进行个人风格分析。

问卷信息：${JSON.stringify(testQuestionnaire, null, 2)}

请严格按照以下JSON格式输出分析结果：
{
  "userProfile": {
    "questionnaireSummary": {
      "stylePreference": 3.0,
      "occasionAdaptability": 3.5,
      "functionOrientation": 2.8,
      "socialInfluenceSensitivity": 2.5,
      "lifeRhythm": 2.0,
      "colorPreference": "warm",
      "stylingFocus": "comfort_practical",
      "purchaseDecisionPattern": "demand_oriented",
      "socialScenarios": ["work", "social"]
    }
  },
  "mainColorTone": {
    "type": "秋季暖色调",
    "description": "肤色偏黄,温暖而富有质感",
    "season": "autumn",
    "temperature": "warm"
  },
  "colorPalette": {
    "mainColors": [
      {"name": "暖金色", "hex": "#D4A574", "usage": "主色调，适合外套和配饰"},
      {"name": "杏黄", "hex": "#F4D03F", "usage": "提亮色，适合内搭"},
      {"name": "赭石", "hex": "#8B4513", "usage": "深色系，适合下装"},
      {"name": "深棕", "hex": "#654321", "usage": "基础色，适合鞋包"}
    ]
  },
  "suitableStyle": {
    "primaryStyle": "经典优雅",
    "secondaryStyle": "休闲舒适",
    "styleKeywords": ["自然", "质感", "和谐", "实用"],
    "typicalScenarios": ["职场", "日常", "约会", "旅行"]
  }
}`;

      const result = await this.callTextAPI(testPrompt);
      
      // 尝试解析JSON
      try {
        const parsedResult = JSON.parse(result.choices[0].message.content);
        this.addTestResult('风格分析API', {
          success: true,
          prompt: '风格分析测试',
          response: parsedResult,
          timestamp: new Date().toLocaleString()
        });
      } catch (parseError) {
        this.addTestResult('风格分析API', {
          success: false,
          error: 'JSON解析失败: ' + parseError.message,
          rawResponse: result.choices[0].message.content,
          timestamp: new Date().toLocaleString()
        });
      }

    } catch (error) {
      console.error('风格分析API测试失败:', error);
      this.addTestResult('风格分析API', {
        success: false,
        error: error.message,
        timestamp: new Date().toLocaleString()
      });
    } finally {
      this.setData({
        isLoading: false,
        currentTest: ''
      });
    }
  },

  // 调用文本生成API
  async callTextAPI(prompt, temperature = 0.5) {
    const data = {
      model: 'doubao-1-5-pro-32k-250115',
      messages: [
        {
          role: "system",
          content: "你是'季风 Monsoon'的个人风格分析师，口吻要轻柔、亲切、陪伴式。"
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

    return await this.requestAPI(data);
  },

  // 调用图像分析API
  async callVisionAPI(prompt, imageUrl) {
    const data = {
      model: 'doubao-1-5-thinking-vision-pro-250428',
      messages: [
        {
          role: "system",
          content: "你是'季风 Monsoon'的个人风格分析师，擅长分析照片中的肤色特征。"
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

    console.log('图像分析API请求数据:', JSON.stringify(data, null, 2));
    return await this.requestAPI(data);
  },

  // 通用API请求方法
  async requestAPI(data) {
    return new Promise((resolve, reject) => {
      tt.request({
        url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.data.apiKey}`
        },
        data: data,
        timeout: 30000,
        success: (res) => {
          console.log('API响应:', res);
          if (res.statusCode === 200) {
            resolve(res.data);
          } else {
            const errorMsg = `API请求失败: ${res.statusCode} - ${JSON.stringify(res.data)}`;
            console.error(errorMsg);
            reject(new Error(errorMsg));
          }
        },
        fail: (err) => {
          reject(new Error(`网络请求失败: ${err.errMsg}`));
        }
      });
    });
  },

  // 添加测试结果
  addTestResult(testName, result) {
    const testResults = this.data.testResults;
    testResults.unshift({
      name: testName,
      ...result
    });
    
    this.setData({
      testResults: testResults
    });
  },

  // 清除测试结果
  clearResults() {
    this.setData({
      testResults: []
    });
  },

  // 复制结果到剪贴板
  copyResult(e) {
    const index = e.currentTarget.dataset.index;
    const result = this.data.testResults[index];
    
    let textToCopy = '';
    if (result.success) {
      textToCopy = JSON.stringify(result.response, null, 2);
    } else {
      textToCopy = `错误: ${result.error}`;
    }
    
    tt.setClipboardData({
      data: textToCopy,
      success: () => {
        tt.showToast({
          title: '已复制到剪贴板',
          icon: 'success'
        });
      }
    });
  },

  // 返回主页
  goBack() {
    tt.navigateBack();
  },

  // 测试简单API调用
  testSimpleAPI() {
    console.log('测试简单API调用...');
    
    tt.request({
      url: 'https://httpbin.org/get',
      method: 'GET',
      success: (res) => {
        console.log('简单API成功:', res);
        tt.showModal({
          title: 'API测试成功',
          content: `状态码: ${res.statusCode}\n数据: ${JSON.stringify(res.data)}`,
          showCancel: false
        });
      },
      fail: (err) => {
        console.error('简单API失败:', err);
        tt.showModal({
          title: 'API测试失败',
          content: `错误: ${JSON.stringify(err)}`,
          showCancel: false
        });
      }
    });
  },

  // 测试豆包API（简化版）
  testDoubaoSimple() {
    console.log('测试豆包API简化版...');
    
    const data = {
      model: "doubao-1-5-pro-32k-250115",
      messages: [
        {
          role: "user",
          content: "你好"
        }
      ]
    };
    
    tt.request({
      url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 01bcd0d4-10e3-4609-ab1e-2d6122e82df7'
      },
      data: data,
      success: (res) => {
        console.log('豆包API成功:', res);
        tt.showModal({
          title: '豆包API成功',
          content: `状态码: ${res.statusCode}\n数据: ${JSON.stringify(res.data)}`,
          showCancel: false
        });
      },
      fail: (err) => {
        console.error('豆包API失败:', err);
        tt.showModal({
          title: '豆包API失败',
          content: `错误: ${JSON.stringify(err)}`,
          showCancel: false
        });
      }
    });
  }
}); 