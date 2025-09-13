// API测试页面 - 专门用于调试AI对话API
const { CONFIG } = require('../../utils/api');

Page({
  data: {
    logs: [],
    isTestRunning: false,
    testResults: {
      configCheck: null,
      simpleTest: null,
      chatTest: null
    }
  },

  onLoad() {
    this.addLog('🔧 API测试页面加载完成');
    this.addLog('📋 准备开始API调用测试...');
  },

  // 添加日志
  addLog(message) {
    const timestamp = new Date().toLocaleTimeString();
    const logs = this.data.logs;
    logs.unshift(`[${timestamp}] ${message}`);
    
    // 只保留最近50条日志
    if (logs.length > 50) {
      logs.pop();
    }
    
    this.setData({ logs });
    console.log(message);
  },

  // 清空日志
  clearLogs() {
    this.setData({ logs: [] });
  },

  // 开始完整测试
  async startFullTest() {
    if (this.data.isTestRunning) {
      this.addLog('⚠️ 测试正在进行中，请等待...');
      return;
    }

    this.setData({ isTestRunning: true });
    this.addLog('🚀 开始完整API测试流程');

    try {
      // 步骤1: 检查配置
      this.addLog('📋 步骤1: 检查API配置...');
      const configCheck = await this.testConfig();
      
      // 步骤2: 简单请求测试
      this.addLog('🌐 步骤2: 测试基础连接...');
      const simpleTest = await this.testSimpleRequest();
      
      // 步骤3: AI对话测试
      this.addLog('🤖 步骤3: 测试AI对话功能...');
      const chatTest = await this.testChatAPI();
      
      this.setData({
        testResults: {
          configCheck,
          simpleTest, 
          chatTest
        }
      });
      
      this.addLog('✅ 完整测试流程结束');
      
    } catch (error) {
      this.addLog(`❌ 测试过程中发生错误: ${error.message}`);
    } finally {
      this.setData({ isTestRunning: false });
    }
  },

  // 测试配置
  async testConfig() {
    this.addLog('🔍 检查API配置...');
    
    const checks = {
      hasApiKey: !!CONFIG.OPENAI_API_KEY,
      apiKeyFormat: CONFIG.OPENAI_API_KEY ? CONFIG.OPENAI_API_KEY.startsWith('sk-') : false,
      apiKeyLength: CONFIG.OPENAI_API_KEY ? CONFIG.OPENAI_API_KEY.length : 0,
      baseUrl: CONFIG.OPENAI_BASE_URL,
      model: CONFIG.GPT_MODEL,
      timeout: CONFIG.TIMEOUT,
      mockMode: CONFIG.USE_MOCK_DATA
    };
    
    this.addLog(`  - API Key存在: ${checks.hasApiKey ? '✅' : '❌'}`);
    this.addLog(`  - API Key格式: ${checks.apiKeyFormat ? '✅' : '❌'} (${checks.apiKeyLength}字符)`);
    this.addLog(`  - Base URL: ${checks.baseUrl}`);
    this.addLog(`  - Model: ${checks.model}`);
    this.addLog(`  - Timeout: ${checks.timeout}ms`);
    this.addLog(`  - 模拟模式: ${checks.mockMode ? '开启' : '关闭'}`);
    
    const configOk = checks.hasApiKey && checks.apiKeyFormat && checks.baseUrl && checks.model;
    this.addLog(`📋 配置检查结果: ${configOk ? '✅ 通过' : '❌ 失败'}`);
    
    return { ...checks, configOk };
  },

  // 测试简单请求
  async testSimpleRequest() {
    this.addLog('🌐 测试网络连接...');
    
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      tt.request({
        url: `${CONFIG.OPENAI_BASE_URL}/models`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://monsoon-douyin.app', // OpenRouter所需
          'X-Title': '季风AI穿搭助手' // OpenRouter所需
        },
        timeout: 10000,
        success: (res) => {
          const duration = Date.now() - startTime;
          this.addLog(`✅ 网络连接成功 (${duration}ms)`);
          this.addLog(`  - 状态码: ${res.statusCode}`);
          this.addLog(`  - 可用模型数量: ${res.data?.data?.length || 0}`);
          
          resolve({
            success: true,
            statusCode: res.statusCode,
            duration,
            modelsCount: res.data?.data?.length || 0
          });
        },
        fail: (error) => {
          const duration = Date.now() - startTime;
          this.addLog(`❌ 网络连接失败 (${duration}ms)`);
          this.addLog(`  - 错误码: ${error.errNo}`);
          this.addLog(`  - 错误信息: ${error.errMsg}`);
          
          resolve({
            success: false,
            error: error,
            duration
          });
        }
      });
    });
  },

  // 测试AI对话API
  async testChatAPI() {
    this.addLog('🤖 测试AI对话API...');
    
    const testPrompt = `请严格按照以下JSON格式回复，不要包含任何其他文字：
{
  "reply": "这是一个API测试回复",
  "memory_extract": "API测试"
}`;

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      tt.request({
        url: `${CONFIG.OPENAI_BASE_URL}/chat/completions`,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`,
          'HTTP-Referer': 'https://monsoon-douyin.app', // OpenRouter所需
          'X-Title': '季风AI穿搭助手' // OpenRouter所需
        },
        timeout: CONFIG.TIMEOUT,
        data: {
          model: CONFIG.GPT_MODEL,
          messages: [
            {
              role: "user",
              content: testPrompt
            }
          ],
          max_tokens: 200,
          temperature: 0.1
        },
        success: (res) => {
          const duration = Date.now() - startTime;
          this.addLog(`📥 收到API响应 (${duration}ms)`);
          this.addLog(`  - 状态码: ${res.statusCode}`);
          
          if (res.statusCode === 200) {
            this.addLog(`✅ AI对话API调用成功`);
            
            try {
              if (res.data?.choices?.[0]?.message?.content) {
                const content = res.data.choices[0].message.content;
                this.addLog(`  - AI回复: ${content.substring(0, 100)}...`);
                
                // 尝试解析JSON
                const parsed = JSON.parse(content);
                this.addLog(`  - JSON解析: ✅ 成功`);
                this.addLog(`  - 回复字段: ${parsed.reply ? '✅' : '❌'}`);
                this.addLog(`  - 记忆字段: ${parsed.memory_extract ? '✅' : '❌'}`);
                
                resolve({
                  success: true,
                  statusCode: res.statusCode,
                  duration,
                  content,
                  parsed,
                  jsonValid: true
                });
              } else {
                this.addLog(`❌ 响应格式异常`);
                resolve({
                  success: false,
                  error: '响应格式异常',
                  duration
                });
              }
            } catch (parseError) {
              this.addLog(`❌ JSON解析失败: ${parseError.message}`);
              resolve({
                success: false,
                error: parseError.message,
                duration,
                jsonValid: false
              });
            }
          } else if (res.statusCode === 429) {
            this.addLog(`⚠️ API状态码429`);
            
            // 详细分析429错误
            if (res.data?.error?.code === 'insufficient_quota') {
              this.addLog(`💰 问题诊断: API账户配额已用完`);
              this.addLog(`  - 错误类型: ${res.data.error.code}`);
              this.addLog(`  - 错误信息: ${res.data.error.message}`);
              this.addLog(`🔧 解决方案: 请检查OpenAI账户余额和计费设置`);
              
              resolve({
                success: false,
                error: 'API配额不足',
                errorCode: res.data.error.code,
                duration,
                needsBilling: true
              });
            } else if (res.data?.error?.code === 'rate_limit_exceeded') {
              this.addLog(`🚦 问题诊断: 请求频率过快`);
              this.addLog(`  - 错误类型: ${res.data.error.code}`);
              this.addLog(`🔧 解决方案: 等待1分钟后重试`);
              
              resolve({
                success: false,
                error: '请求频率限制',
                errorCode: res.data.error.code,
                duration,
                needsDelay: true
              });
            } else {
              this.addLog(`🚫 其他429错误: ${res.data?.error?.message || 'Unknown'}`);
              resolve({
                success: false,
                error: res.data?.error?.message || '未知429错误',
                duration
              });
            }
          } else {
            this.addLog(`❌ API调用失败 - 状态码: ${res.statusCode}`);
            this.addLog(`  - 错误详情: ${JSON.stringify(res.data)}`);
            
            resolve({
              success: false,
              error: res.data,
              statusCode: res.statusCode,
              duration
            });
          }
        },
        fail: (error) => {
          const duration = Date.now() - startTime;
          this.addLog(`❌ AI对话API调用失败 (${duration}ms)`);
          this.addLog(`  - 错误码: ${error.errNo}`);
          this.addLog(`  - 错误信息: ${error.errMsg}`);
          
          resolve({
            success: false,
            error: error,
            duration
          });
        }
      });
    });
  },

  // 快速测试单个功能
  async quickTestConfig() {
    this.addLog('🔍 快速检查配置...');
    await this.testConfig();
  },

  async quickTestNetwork() {
    this.addLog('🌐 快速测试网络...');
    await this.testSimpleRequest();
  },

  async quickTestChat() {
    this.addLog('🤖 快速测试对话...');
    await this.testChatAPI();
  },

  // 复制日志
  copyLogs() {
    const logText = this.data.logs.join('\n');
    tt.setClipboardData({
      data: logText,
      success: () => {
        tt.showToast({
          title: '日志已复制',
          icon: 'success'
        });
      }
    });
  }
});
