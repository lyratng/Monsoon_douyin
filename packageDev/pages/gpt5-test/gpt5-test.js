// GPT-5 API 测试页面
const api = require('../../../utils/api');

Page({
  data: {
    testResults: [],
    currentTest: null,
    isLoading: false,
    apiKey: '',
    
    // 测试配置
    tests: [
      {
        id: 'basic_gpt5',
        name: 'GPT-5基础测试',
        description: '使用最佳实践配置的GPT-5基础测试',
        prompt: 'Give me a whimsical random color name.',
        config: {
          max_tokens: 256,
          temperature: 1.0,
          include_reasoning: false
        },
        model: 'openai/gpt-5'
      },
      {
        id: 'basic_gpt5_chat', 
        name: 'GPT-5-Chat基础测试',
        description: '使用对话专用模型GPT-5-Chat',
        prompt: 'Give me a whimsical random color name.',
        config: {
          max_tokens: 256,
          temperature: 1.0,
          include_reasoning: false
        },
        model: 'openai/gpt-5-chat'
      },
      {
        id: 'json_gpt5',
        name: 'GPT-5 JSON测试',
        description: '测试GPT-5的JSON输出能力',
        prompt: '请输出一个简单的JSON: {"message": "test"}',
        config: {
          max_tokens: 256,
          temperature: 1.0,
          include_reasoning: false
        },
        model: 'openai/gpt-5-chat'
      },
      {
        id: 'reasoning_test',
        name: 'GPT-5 Reasoning测试',
        description: '测试include_reasoning参数',
        prompt: 'Explain why the sky appears blue.',
        config: {
          max_tokens: 512,
          temperature: 1.0,
          include_reasoning: true
        },
        model: 'openai/gpt-5-chat'
      },
      {
        id: 'gpt4_comparison',
        name: 'GPT-4对比测试',
        description: '用GPT-4测试相同请求，对比结果',
        prompt: 'Give me a whimsical random color name.',
        config: {
          max_tokens: 256,
          temperature: 1.0
        },
        model: 'openai/gpt-4o'
      },
      {
        id: 'chinese_test',
        name: 'GPT-5中文测试',
        description: '测试GPT-5的中文处理能力',
        prompt: '请简单介绍一下人工智能，用JSON格式输出：{"title": "", "content": ""}',
        config: {
          max_tokens: 512,
          temperature: 1.0,
          include_reasoning: false
        },
        model: 'openai/gpt-5-chat'
      }
    ]
  },

  onLoad() {
    console.log('GPT-5 测试页面加载');
    // 获取当前API配置
    const ENV_CONFIG = require('../../../config/env');
    this.setData({
      apiKey: ENV_CONFIG.OPENAI_API_KEY ? ENV_CONFIG.OPENAI_API_KEY.substring(0, 20) + '...' : '未配置'
    });
  },

  // 运行单个测试
  async runTest(e) {
    const testId = e.currentTarget.dataset.testId;
    const test = this.data.tests.find(t => t.id === testId);
    
    if (!test) return;
    
    this.setData({ 
      isLoading: true,
      currentTest: testId
    });
    
    console.log(`🧪 开始运行测试: ${test.name}`);
    console.log(`📝 Prompt: ${test.prompt}`);
    console.log(`⚙️ 配置:`, test.config);
    
    const startTime = Date.now();
    
    try {
      const result = await this.callGPT5API(test.prompt, test.config, test.model);
      const endTime = Date.now();
      
      const testResult = {
        id: testId,
        name: test.name,
        status: 'success',
        prompt: test.prompt,
        config: test.config,
        response: result,
        duration: endTime - startTime,
        timestamp: new Date().toLocaleTimeString()
      };
      
      this.addTestResult(testResult);
      console.log(`✅ 测试成功:`, testResult);
      
    } catch (error) {
      const endTime = Date.now();
      
      const testResult = {
        id: testId,
        name: test.name,
        status: 'error',
        prompt: test.prompt,
        config: test.config,
        error: error.message,
        duration: endTime - startTime,
        timestamp: new Date().toLocaleTimeString()
      };
      
      this.addTestResult(testResult);
      console.error(`❌ 测试失败:`, testResult);
    }
    
    this.setData({ 
      isLoading: false,
      currentTest: null
    });
  },

  // 调用GPT API（支持不同模型）
  async callGPT5API(prompt, config, customModel = null) {
    const ENV_CONFIG = require('../../../config/env');
    const model = customModel || ENV_CONFIG.GPT_MODEL;
    
    console.log('🚀 调用GPT API');
    console.log('📍 URL:', ENV_CONFIG.OPENAI_BASE_URL);
    console.log('🤖 Model:', model);
    console.log('🔑 API Key前缀:', ENV_CONFIG.OPENAI_API_KEY.substring(0, 20) + '...');
    
    return new Promise((resolve, reject) => {
      // 按照最佳实践构建消息，包含system消息
      const messages = [
        {
          role: "system",
          content: "You are a helpful assistant."
        },
        {
          role: "user",
          content: prompt
        }
      ];

      const requestData = {
        model: model,
        messages: messages,
        ...config
      };
      
      console.log('📤 请求数据:', JSON.stringify(requestData, null, 2));
      
      tt.request({
        url: `${ENV_CONFIG.OPENAI_BASE_URL}/chat/completions`,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ENV_CONFIG.OPENAI_API_KEY}`,
          'HTTP-Referer': 'https://monsoon-douyin.app',
          'X-Title': 'Monsoon AI Fashion Assistant'
        },
        timeout: ENV_CONFIG.TIMEOUT,
        data: requestData,
        success: (res) => {
          console.log('📥 收到响应');
          console.log('📊 状态码:', res.statusCode);
          console.log('📄 完整响应:', JSON.stringify(res.data, null, 2));
          
          if (res.statusCode === 200) {
            if (res.data && res.data.choices && res.data.choices.length > 0) {
              const message = res.data.choices[0].message;
              const content = message.content;
              console.log('📝 响应内容:', content);
              console.log('📏 内容长度:', content ? content.length : 0);
              console.log('🔍 内容是否为空:', !content || content.trim() === '');
              
              // 🔍 分析GPT-5特有的reasoning字段
              if (message.reasoning) {
                console.log('🧠 GPT-5 Reasoning:', message.reasoning);
              }
              if (message.reasoning_details) {
                console.log('🧠 GPT-5 Reasoning Details:', message.reasoning_details.length, '个reasoning块');
                message.reasoning_details.forEach((detail, index) => {
                  console.log(`  🧠 Reasoning ${index + 1}:`, detail.type);
                  if (detail.summary) {
                    console.log(`    📝 摘要:`, detail.summary.substring(0, 200) + '...');
                  }
                });
              }
              
              if (!content || content.trim() === '') {
                console.warn('⚠️ GPT-5返回空内容，但有reasoning数据！这可能是GPT-5的特殊行为');
                reject(new Error('API返回的内容为空'));
              } else {
                resolve({
                  content: content,
                  usage: res.data.usage,
                  model: res.data.model,
                  raw: res.data
                });
              }
            } else {
              reject(new Error('响应中没有choices数据'));
            }
          } else {
            reject(new Error(`API请求失败: ${res.statusCode}`));
          }
        },
        fail: (error) => {
          console.error('❌ 请求失败:', error);
          reject(error);
        }
      });
    });
  },

  // 添加测试结果
  addTestResult(result) {
    const results = this.data.testResults.slice();
    results.unshift(result); // 最新的在前面
    this.setData({ testResults: results });
  },

  // 清除测试结果
  clearResults() {
    this.setData({ testResults: [] });
  },

  // 运行所有测试
  async runAllTests() {
    this.clearResults();
    
    for (const test of this.data.tests) {
      await this.runTest({ currentTarget: { dataset: { testId: test.id } } });
      // 每个测试之间间隔1秒
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    tt.showToast({
      title: '所有测试完成',
      icon: 'success'
    });
  },

  // 复制结果到剪贴板
  copyResult(e) {
    const index = e.currentTarget.dataset.index;
    const result = this.data.testResults[index];
    
    const text = JSON.stringify(result, null, 2);
    
    // 抖音小程序的复制功能
    tt.setClipboardData({
      data: text,
      success: () => {
        tt.showToast({
          title: '已复制到剪贴板',
          icon: 'success'
        });
      }
    });
  },

  // 返回主页
  goHome() {
    tt.switchTab({
      url: '/pages/index/index'
    });
  }
});
