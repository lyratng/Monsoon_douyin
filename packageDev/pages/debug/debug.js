// 调试页面 - 用于测试API调用
const { analyzeImage, generateStyleReport } = require('../../../utils/api');

Page({
  data: {
    testResults: [],
    isLoading: false,
    debugLogs: []
  },

  onLoad() {
    this.addLog('调试页面加载完成');
  },

  /**
   * 跳转到API测试页面
   */
  goToApiTest() {
    tt.navigateTo({
      url: '/pages/api-test/api-test'
    });
  },

  /**
   * 添加调试日志
   */
  addLog(message) {
    const timestamp = new Date().toLocaleTimeString();
    const newLog = `[${timestamp}] ${message}`;
    
    this.setData({
      debugLogs: [newLog, ...this.data.debugLogs].slice(0, 20) // 只保留最近20条
    });
    
    console.log(newLog);
  },

  /**
   * 测试API Key是否正确配置
   */
  testApiKeyConfig() {
    this.addLog('开始测试API Key配置...');
    
    try {
      const ENV_CONFIG = require('../../../config/env');
      
      if (!ENV_CONFIG.OPENAI_API_KEY) {
        this.addLog('❌ API Key未配置');
        return;
      }
      
      const apiKey = ENV_CONFIG.OPENAI_API_KEY;
      this.addLog(`✅ API Key已配置: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
      this.addLog(`📡 API URL: ${ENV_CONFIG.OPENAI_BASE_URL}`);
      this.addLog(`🤖 模型: ${ENV_CONFIG.GPT_MODEL}`);
      this.addLog(`🔄 使用模拟数据: ${ENV_CONFIG.USE_MOCK_DATA}`);
      
    } catch (error) {
      this.addLog(`❌ 配置检查失败: ${error.message}`);
    }
  },

  /**
   * 测试网络连接
   */
  testNetworkConnection() {
    this.addLog('开始测试网络连接...');
    this.setData({ isLoading: true });

    tt.request({
      url: 'https://api.openai.com/v1/models',
      method: 'GET',
      header: {
        'Authorization': `Bearer ${require('../../../config/env').OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      success: (res) => {
        this.addLog(`✅ 网络连接成功: ${res.statusCode}`);
        this.addLog(`📝 响应数据: ${JSON.stringify(res.data).substring(0, 200)}...`);
      },
      fail: (error) => {
        this.addLog(`❌ 网络连接失败: ${JSON.stringify(error)}`);
      },
      complete: () => {
        this.setData({ isLoading: false });
      }
    });
  },

  /**
   * 测试图像分析API
   */
  testImageAnalysis() {
    this.addLog('开始测试图像分析API...');
    this.setData({ isLoading: true });

    // 创建一个测试用的base64图片（1x1像素的透明PNG）
    const testBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    // 模拟调用
    const mockCall = async () => {
      try {
        this.addLog('📡 调用图像分析API...');
        
        // 检查API配置
        const ENV_CONFIG = require('../../../config/env');
        this.addLog(`🔧 使用模拟数据: ${ENV_CONFIG.USE_MOCK_DATA}`);
        
        if (ENV_CONFIG.USE_MOCK_DATA) {
          this.addLog('⚠️ 当前使用模拟数据模式');
          // 模拟延迟
          await new Promise(resolve => setTimeout(resolve, 2000));
          this.addLog('✅ 模拟图像分析完成');
          return;
        }

        // 真实API调用
        const result = await analyzeImage('temp_image_path', 'cool');
        this.addLog(`✅ 图像分析成功: ${JSON.stringify(result)}`);
        
      } catch (error) {
        this.addLog(`❌ 图像分析失败: ${error.message}`);
        this.addLog(`🔍 错误详情: ${JSON.stringify(error)}`);
      }
    };

    mockCall().finally(() => {
      this.setData({ isLoading: false });
    });
  },

  /**
   * 测试风格报告生成API
   */
  testReportGeneration() {
    this.addLog('开始测试风格报告生成API...');
    this.setData({ isLoading: true });

    // 创建模拟用户档案
    const mockUserProfile = {
      basic_info: {
        gender: 'female',
        age: 25,
        height: 165,
        weight: 55
      },
      color_analysis: {
        season_12: 'Cool Summer',
        axes: {
          depth: '浅',
          contrast: '低',
          edge: '柔',
          temperature: '冷',
          chroma: '低'
        }
      },
      personality_test: {
        scores: { a: 2, b: 8, c: 3, d: 5 },
        mbti: 'ISFP'
      },
      preferences: {
        favorite_colors: ['蓝', '绿', '白'],
        occasions: ['work', 'everyday']
      }
    };

    const testCall = async () => {
      try {
        this.addLog('📡 调用风格报告生成API...');
        this.addLog(`👤 测试用户档案: ${JSON.stringify(mockUserProfile).substring(0, 100)}...`);
        
        const result = await generateStyleReport(mockUserProfile);
        this.addLog(`✅ 风格报告生成成功`);
        this.addLog(`📋 报告预览: ${JSON.stringify(result).substring(0, 200)}...`);
        
      } catch (error) {
        this.addLog(`❌ 风格报告生成失败: ${error.message}`);
        this.addLog(`🔍 错误详情: ${JSON.stringify(error)}`);
      }
    };

    testCall().finally(() => {
      this.setData({ isLoading: false });
    });
  },

  /**
   * 测试域名白名单
   */
  testDomainWhitelist() {
    this.addLog('开始测试域名白名单配置...');
    this.setData({ isLoading: true });

    // 测试多个OpenAI相关域名
    const testDomains = [
      'https://api.openai.com/v1/models',
      'https://api.openai.com/v1/chat/completions'
    ];

    let completedTests = 0;
    const totalTests = testDomains.length;

    testDomains.forEach((url, index) => {
      this.addLog(`🌐 测试域名 ${index + 1}: ${url}`);
      
      tt.request({
        url: url,
        method: 'GET',
        header: {
          'Authorization': `Bearer test-key`,
          'Content-Type': 'application/json'
        },
        success: (res) => {
          this.addLog(`✅ 域名 ${index + 1} 可访问: ${res.statusCode}`);
        },
        fail: (error) => {
          if (error.errNo === 21100) {
            this.addLog(`❌ 域名 ${index + 1} 不在白名单: ${error.errMsg}`);
          } else if (error.errNo === 401 || error.statusCode === 401) {
            this.addLog(`✅ 域名 ${index + 1} 可访问但API Key无效 (预期行为)`);
          } else {
            this.addLog(`⚠️ 域名 ${index + 1} 其他错误: ${JSON.stringify(error)}`);
          }
        },
        complete: () => {
          completedTests++;
          if (completedTests === totalTests) {
            this.setData({ isLoading: false });
            this.addLog('🏁 域名测试完成');
          }
        }
      });
    });
  },

  /**
   * 清除调试日志
   */
  clearLogs() {
    this.setData({
      debugLogs: [],
      testResults: []
    });
    this.addLog('调试日志已清除');
  },

  /**
   * 复制日志到剪贴板
   */
  copyLogs() {
    const allLogs = this.data.debugLogs.join('\n');
    
    tt.setClipboardData({
      data: allLogs,
      success: () => {
        tt.showToast({
          title: '日志已复制到剪贴板',
          icon: 'success'
        });
      },
      fail: () => {
        tt.showToast({
          title: '复制失败',
          icon: 'none'
        });
      }
    });
  }
});
