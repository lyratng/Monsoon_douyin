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
        id: 'basic_doubao',
        name: 'Doubao-1.5-Pro 基础测试',
        description: '使用Doubao-1.5-Pro模型进行基础测试',
        prompt: 'Give me a whimsical random color name.',
        config: {
          max_tokens: 256,
          temperature: 1.0
        },
        model: 'doubao-1-5-pro-32k-250115'
      },
      {
        id: 'json_doubao',
        name: 'Doubao JSON测试',
        description: '测试Doubao的JSON输出能力',
        prompt: '请输出一个简单的JSON: {"message": "test"}',
        config: {
          max_tokens: 256,
          temperature: 1.0
        },
        model: 'doubao-1-5-pro-32k-250115'
      },
      {
        id: 'vision_doubao',
        name: 'Doubao Vision测试',
        description: '测试Doubao Vision模型 (需在代码中硬编码图片)',
        prompt: 'What is in this image?',
        config: {
          max_tokens: 512,
          temperature: 0.1
        },
        model: 'doubao-seed-1-6-vision-250815'
      },
      {
        id: 'image_gen_doubao',
        name: 'Doubao Image Gen测试',
        description: '测试Doubao图片生成',
        prompt: 'A cute cat',
        config: {
          size: "2K"
        },
        model: 'doubao-seedream-4-5-251128'
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
      let url, requestData;

      // 判断是否为图片生成模型
      if (model === ENV_CONFIG.IMAGE_GEN_MODEL) {
        url = `${ENV_CONFIG.OPENAI_BASE_URL}/images/generations`;
        requestData = {
          model: model,
          prompt: prompt,
          sequential_image_generation: "disabled",
          response_format: "url",
          stream: false,
          watermark: true,
          ...config
        };
      } else if (model === ENV_CONFIG.VISION_MODEL) {
        // Vision模型使用 /responses 端点
        url = `${ENV_CONFIG.OPENAI_BASE_URL}/responses`;
        requestData = {
          model: model,
          input: [
            {
              role: "user",
              content: [
                // 注意：测试页面这里简化处理，Vision测试需要硬编码图片或上传逻辑
                // 这里仅作为占位，实际Vision测试可能需要专门的逻辑
                { type: "input_text", text: prompt }
              ]
            }
          ]
        };
      } else {
        // 默认文本/对话模型
        url = `${ENV_CONFIG.OPENAI_BASE_URL}/chat/completions`;
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
        requestData = {
          model: model,
          messages: messages,
          ...config
        };
      }

      console.log('📤 请求地址:', url);
      console.log('📤 请求数据:', JSON.stringify(requestData, null, 2));

      tt.request({
        url: url,
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
            // 处理图片生成响应
            if (model === ENV_CONFIG.IMAGE_GEN_MODEL) {
              if (res.data && res.data.data && res.data.data.length > 0) {
                resolve({
                  content: `Image URL: ${res.data.data[0].url}`,
                  raw: res.data
                });
              } else {
                reject(new Error('图片生成响应中没有data数据'));
              }
              return;
            }

            // 处理Vision/Text响应
            if (res.data) {
              let content = null;

              // 1. 标准OpenAI格式
              if (res.data.choices && res.data.choices.length > 0) {
                content = res.data.choices[0].message.content;
              }
              // 2. Volcengine Vision格式 (output数组结构)
              else if (res.data.output && Array.isArray(res.data.output)) {
                console.log('🔍 检测到Volcengine Vision格式 (output数组)');
                // 寻找 type: "message" 的项
                const messageItem = res.data.output.find(item => item.type === 'message');
                console.log('🔍 messageItem:', messageItem ? 'Found' : 'Not Found');

                if (messageItem && messageItem.content && Array.isArray(messageItem.content)) {
                  // 寻找 type: "output_text" 的项
                  const textItem = messageItem.content.find(c => c.type === 'output_text');
                  console.log('🔍 textItem:', textItem ? 'Found' : 'Not Found');

                  if (textItem) {
                    content = textItem.text;
                  }
                }
                // 如果没找到message，尝试直接找text (兼容性)
                if (!content && res.data.output.text) {
                  content = res.data.output.text;
                }
              }
              // 3. 其他可能格式
              else if (res.data.data && res.data.data.text) {
                content = res.data.data.text;
              }

              if (content) {
                resolve({
                  content: content,
                  usage: res.data.usage,
                  model: res.data.model,
                  raw: res.data
                });
              } else {
                // 某些模型可能返回空内容但有reasoning
                if (res.data.choices && res.data.choices[0].message.reasoning) {
                  resolve({
                    content: `(Reasoning only)\n${res.data.choices[0].message.reasoning}`,
                    raw: res.data
                  });
                } else {
                  console.error('无法解析响应结构:', JSON.stringify(res.data));
                  reject(new Error('无法解析API响应结构: ' + JSON.stringify(res.data)));
                }
              }
            } else {
              reject(new Error('响应中没有data数据'));
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
