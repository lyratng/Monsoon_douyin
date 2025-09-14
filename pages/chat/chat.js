// pages/chat/chat.js
const app = getApp();
const { generateStyleReport, CONFIG } = require('../../utils/api');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    userProfile: null,
    messages: [],
    inputText: '',
    isLoading: false,
    recommendedQuestions: [
      '推荐一套适合10–20°C的通勤穿搭',
      '推荐3套去上海街区逛街潮流穿搭',
      '推荐一套适合去看艺术展的气质穿搭',
      '我不喜欢条纹衬衫，请不要给我推荐',
      '你记住了关于我的什么？',
      '我适合金饰还是银饰？',
      '我穿什么样的蓝色好看？',
      '我是否适合美拉德风格？'
    ],
    showRecommended: true,
    memory: '', // 自然语言记忆，最多500字
    conversationHistory: [] // 完整对话历史
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.initChat();
  },

  /**
   * 初始化聊天
   */
  initChat() {
    try {
      // 获取用户档案
      const userProfile = app.getUserProfile();
      if (!userProfile || !userProfile.style_report) {
        tt.showModal({
          title: '提示',
          content: '请先完成个人风格测试，AI才能为您提供专业建议',
          confirmText: '去测试',
          success: (res) => {
            if (res.confirm) {
              tt.navigateTo({
                url: '/pages/test/test'
              });
            }
          }
        });
        return;
      }

      // 加载聊天记录
      const chatHistory = this.loadChatHistory();
      const memory = this.loadMemory();

      this.setData({
        userProfile: userProfile,
        messages: chatHistory,
        memory: memory,
        showRecommended: chatHistory.length === 0
      });

      // 如果是首次进入，显示欢迎消息
      if (chatHistory.length === 0) {
        this.addWelcomeMessage();
      }

      // 延迟滚动到底部，确保DOM渲染完成
      setTimeout(() => {
        this.scrollToBottom();
      }, 100);

    } catch (error) {
      console.error('初始化聊天失败:', error);
      tt.showToast({
        title: '初始化失败',
        icon: 'none'
      });
    }
  },

  /**
   * 添加欢迎消息
   */
  addWelcomeMessage() {
    const userProfile = this.data.userProfile;
    const styleReport = userProfile.style_report;
    
    const welcomeMessage = {
      id: Date.now(),
      type: 'ai',
      content: `你好！我是季风AI助手 🌸\n\n基于您的个人风格报告，我了解到您是${styleReport.季型名称}，主要特质是${styleReport.能量类型名称}。\n\n我可以为您提供专业的穿搭建议、色彩搭配、造型指导等。请随时向我提问，或者选择下方的推荐问题开始对话！`,
      timestamp: new Date().toLocaleTimeString()
    };

    this.setData({
      messages: [welcomeMessage]
    });
  },

  /**
   * 处理输入框内容变化
   */
  onInputChange(e) {
    this.setData({
      inputText: e.detail.value
    });
  },

  /**
   * 发送消息
   */
  sendMessage(e) {
    const content = e?.detail?.content || this.data.inputText.trim();
    if (!content) {
      tt.showToast({
        title: '请输入消息内容',
        icon: 'none'
      });
      return;
    }

    // 检查字数限制（200字）
    if (content.length > 200) {
      tt.showToast({
        title: '消息不能超过200字',
        icon: 'none'
      });
      return;
    }

    // 添加用户消息
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: content,
      timestamp: new Date().toLocaleTimeString()
    };

    this.setData({
      messages: [...this.data.messages, userMessage],
      inputText: '',
      isLoading: true,
      showRecommended: false
    });

    // 滚动到新消息
    setTimeout(() => {
      this.scrollToBottom();
    }, 100);

    // 调用AI回复
    this.getAIResponse(content);
  },

  /**
   * 点击推荐问题
   */
  onRecommendedQuestionTap(e) {
    const content = e.currentTarget.dataset.question;
    this.sendMessage({ detail: { content } });
  },

  /**
   * 获取AI回复
   */
  async getAIResponse(userMessage) {
    try {
      const userProfile = this.data.userProfile;
      const memory = this.data.memory;
      
      // 构建AI提示词
      const prompt = this.buildAIPrompt(userMessage, userProfile, memory);
      
      // 调用AI回复API
      const aiResponse = await this.getAIChatResponse(prompt);
      
      // 添加AI回复消息
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: aiResponse.reply,
        timestamp: new Date().toLocaleTimeString()
      };

      this.setData({
        messages: [...this.data.messages, aiMessage],
        isLoading: false
      });

      // 滚动到新消息
      setTimeout(() => {
        this.scrollToBottom();
      }, 100);

      // 更新记忆
      this.updateMemory(userMessage, aiResponse.reply, aiResponse.memory_extract);

      // 保存聊天记录
      this.saveChatHistory();

    } catch (error) {
      console.error('AI回复失败:', error);
      
      let errorMessage = '抱歉，我暂时无法回复。请稍后再试。';
      
      // 根据错误类型提供更具体的提示
      if (error.message.includes('API Key未配置')) {
        errorMessage = 'API配置有误，请联系管理员。';
      } else if (error.message.includes('API Key无效')) {
        errorMessage = 'API密钥无效，请联系管理员。';
      } else if (error.message.includes('域名不在白名单')) {
        errorMessage = '网络配置问题，请联系管理员添加域名白名单。';
      } else if (error.message.includes('网络连接超时')) {
        errorMessage = '网络连接超时，请检查网络后重试。';
      } else if (error.message.includes('过于频繁')) {
        errorMessage = '请求太频繁，请稍后再试。';
      } else if (error.message.includes('解析AI回复失败')) {
        errorMessage = 'AI回复格式异常，请重新提问。';
      }
      
      const errorResponse = {
        id: Date.now() + 1,
        type: 'ai',
        content: errorMessage,
        timestamp: new Date().toLocaleTimeString()
      };

      this.setData({
        messages: [...this.data.messages, errorResponse],
        isLoading: false
      });
    }
  },

  /**
   * 构建AI提示词
   */
  buildAIPrompt(userMessage, userProfile, memory) {
    const styleReport = userProfile.style_report;
    const colorAnalysis = userProfile.color_analysis;
    
    return `（首先导入用户档案）
gender: ${userProfile.basic_info.gender}
seasonType: ${styleReport.季型名称}
age: ${userProfile.basic_info.age}
height: ${userProfile.basic_info.height}
weight: ${userProfile.basic_info.weight}
energy_type: ${styleReport.能量类型名称}
season_description: ${styleReport.适合颜色的简短描述}
energy_description: ${styleReport.能量匹配的风格简短描述}
recommended_colors: ${styleReport.推荐的颜色列表.map(c => c.name).join('、')}
recommended_styles: ${styleReport.推荐的风格列表.join('、')}
personality_test_scores: ${JSON.stringify(userProfile.personality_test.scores)}
记忆信息：${memory || '无历史记忆'}

用户问题：${userMessage}

请根据用户的个人风格报告和一切档案信息，对用户的问题做出回答。
规则：
1. （硬性规则！）判断用户问题是否与"穿搭"或者"时尚"有关，如果无关，请回复"你的问题似乎非穿搭问题呢，很抱歉阿季帮不了你:("
2. 字数不超过200字。当问题不复杂时，可以简短回答。
3. 输出的答案（穿搭推荐/单品建议/品牌推荐等）要符合审美，要具体。
4. 如果用户的回答中出现偏好性/态度性观点，请提取浓缩信息，作为记忆，存储到用户档案里的"自然语言记忆"部分，要有条理，清晰明白，让大模型下次调用用户档案的时候易读易懂。
5. 用户档案"自然语言记忆"部分字数上限500字。当达到500字上限时，采用滑动窗口机制：删除最早添加的记忆内容，保留最新的记忆，确保记忆总长度不超过500字。这样保证了系统的简洁性和可靠性。
6. 当用户问到"你记住了关于我的什么"、"你对我的记忆包含哪些内容"类似的问题，请把你的用户档案整理成清晰的条目输出出来，可以超过200字，这是一个特例。

请严格按照以下JSON格式回复：
{
  "reply": "回复内容（200字以内）",
  "memory_extract": "本次对话的关键信息提取（50字以内）"
}`;
  },

  /**
   * 调用AI回复API
   */
  async getAIChatResponse(prompt) {
    // 添加详细的调试日志
    console.log('🔄 开始调用AI回复API...');
    console.log('📝 USE_MOCK_DATA:', CONFIG.USE_MOCK_DATA);
    console.log('🔧 API配置检查:');
    console.log('  - API_KEY存在:', !!CONFIG.OPENAI_API_KEY);
    console.log('  - API_KEY长度:', CONFIG.OPENAI_API_KEY ? CONFIG.OPENAI_API_KEY.length : 0);
    console.log('  - BASE_URL:', CONFIG.OPENAI_BASE_URL);
    console.log('  - MODEL:', CONFIG.GPT_MODEL);
    console.log('  - TIMEOUT:', CONFIG.TIMEOUT);
    
    if (CONFIG.USE_MOCK_DATA) {
      console.log('🎭 使用模拟数据模式');
      // 如果启用模拟数据，返回模拟回复
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockResponses = [
        {
          reply: '根据您的季型和特质，我建议您选择柔和的穿搭风格。可以尝试低饱和度的色彩搭配，配合优雅的剪裁。面料建议选择柔软透气的材质，如真丝、棉麻等。避免过于鲜艳的颜色和夸张的款式。✨',
          memory_extract: '用户咨询穿搭建议，推荐了柔和优雅的风格'
        },
        {
          reply: '职场面试建议穿着简约优雅的套装！推荐选择深蓝色或深灰色西装，内搭白色或淡蓝色衬衫。避免过于鲜艳的颜色。鞋子选择黑色或深蓝色的尖头低跟鞋，配饰保持简约。整体要展现专业与优雅并重的形象。💼',
          memory_extract: '用户询问面试穿搭，推荐了专业优雅的正装搭配'
        },
        {
          reply: '参加婚礼时，建议选择柔和优雅的颜色。可以选择薄荷绿、浅蓝灰或淡紫色的连衣裙，避免正红色或亮橙色。面料推荐雪纺或真丝，版型选择A字裙或修身款。配饰可以选择珍珠或银色首饰，既优雅又不会抢夺新娘风头。🌸',
          memory_extract: '用户询问婚礼穿搭，推荐了适合的颜色和款式'
        }
      ];
      
      return mockResponses[Math.floor(Math.random() * mockResponses.length)];
    }

    // 真实API调用
    console.log('🚀 切换到真实API调用模式');
    return new Promise((resolve, reject) => {
      const apiKey = CONFIG.OPENAI_API_KEY;
      
      console.log('🔑 API Key验证:');
      console.log('  - Key存在:', !!apiKey);
      console.log('  - Key长度:', apiKey ? apiKey.length : 0);
      console.log('  - Key格式检查:', apiKey ? (apiKey.startsWith('sk-') ? '✅ 格式正确' : '❌ 格式错误') : '❌ 空值');
      
      if (!apiKey || apiKey === 'your-api-key-here') {
        console.error('❌ API Key未配置或格式错误');
        reject(new Error('API Key未配置，请检查配置文件'));
        return;
      }

      console.log('🌐 准备调用OpenAI API...');
      console.log('📍 请求配置:');
      console.log('  - URL:', CONFIG.OPENAI_BASE_URL + '/chat/completions');
      console.log('  - Model:', CONFIG.GPT_MODEL);
      console.log('  - Timeout:', CONFIG.TIMEOUT);
      console.log('  - API Key前缀:', apiKey.substring(0, 20) + '...');
      console.log('📤 发送请求...');
      
      // 详细记录请求数据
      const requestData = {
        model: CONFIG.GPT_MODEL,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      };
      
      console.log('📋 请求数据:');
      console.log('  - Model:', requestData.model);
      console.log('  - Max Tokens:', requestData.max_tokens);
      console.log('  - Temperature:', requestData.temperature);
      console.log('  - Prompt 长度:', prompt.length);
      console.log('  - Prompt 前500字符:', prompt.substring(0, 500));
      
      tt.request({
        url: `${CONFIG.OPENAI_BASE_URL}/chat/completions`,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://monsoon-douyin.app', // OpenRouter所需
          'X-Title': 'Monsoon AI Fashion Assistant' // OpenRouter所需
        },
        timeout: CONFIG.TIMEOUT,
        data: requestData,
        success: (res) => {
          console.log('📥 收到API响应');
          console.log('✅ 响应状态码:', res.statusCode);
          console.log('📊 响应头信息:', res.header);
          console.log('📄 响应数据结构:', typeof res.data, Object.keys(res.data || {}));
          
          // 详细记录响应数据
          if (res.data) {
            console.log('📝 完整响应数据:', JSON.stringify(res.data, null, 2));
          }
          
          try {
            if (res.statusCode === 200) {
              console.log('✅ API调用成功');
              if (res.data && res.data.choices && res.data.choices[0]) {
                const rawContent = res.data.choices[0].message.content;
                console.log('🤖 AI回复原始内容:', rawContent);
                
                // 清理Markdown代码块标记
                let content = rawContent.trim();
                if (content.startsWith('```json')) {
                  content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                } else if (content.startsWith('```')) {
                  content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
                }
                content = content.trim();
                
                console.log('🧹 清理后内容:', content);
                console.log('🔄 尝试解析JSON...');
                const result = JSON.parse(content);
                console.log('✅ JSON解析成功:', result);
                resolve(result);
              } else {
                console.error('❌ 响应格式异常 - 缺少choices数据');
                reject(new Error('API响应格式异常：缺少choices数据'));
              }
            } else if (res.statusCode === 429) {
              console.error('⚠️ API状态码429详细分析:', res.data);
              
              // 检查具体的429错误类型
              if (res.data?.error?.code === 'insufficient_quota') {
                console.error('💰 配额不足: API账户余额已用完');
                reject(new Error('API账户配额已用完，请检查OpenAI账户余额和计费设置'));
              } else if (res.data?.error?.code === 'rate_limit_exceeded') {
                console.error('🚦 频率限制: 请求过于频繁');
                reject(new Error('API请求过于频繁，请稍后再试'));
              } else {
                console.error('🚫 其他429错误:', res.data?.error?.message || 'Unknown 429 error');
                reject(new Error(res.data?.error?.message || 'API请求失败，请稍后再试'));
              }
            } else if (res.statusCode === 401) {
              console.error('🔐 API Key无效:', res.data);
              reject(new Error('API Key无效，请检查配置'));
            } else if (res.statusCode === 403) {
              console.error('🚫 API访问被禁止:', res.data);
              reject(new Error('API访问被禁止，请检查API Key权限'));
            } else {
              console.error('❌ API请求失败 - 状态码:', res.statusCode);
              console.error('❌ 错误详情:', JSON.stringify(res.data, null, 2));
              reject(new Error(`API请求失败: ${res.statusCode} - ${JSON.stringify(res.data)}`));
            }
          } catch (error) {
            console.error('❌ 解析AI回复失败:', error);
            console.error('❌ 原始内容:', res.data?.choices?.[0]?.message?.content);
            reject(new Error('解析AI回复失败: ' + error.message));
          }
        },
        fail: (error) => {
          console.error('🚨 网络请求失败');
          console.error('❌ 错误对象:', error);
          console.error('❌ 错误代码:', error.errNo);
          console.error('❌ 错误信息:', error.errMsg);
          console.error('❌ 完整错误详情:', JSON.stringify(error, null, 2));
          
          // 详细分析错误类型
          if (error.errNo === 21100) {
            console.error('🌐 域名白名单问题: api.openai.com 未添加到小程序域名白名单');
            reject(new Error('域名不在白名单中，请在抖音小程序后台添加api.openai.com'));
          } else if (error.errNo === 10202) {
            console.error('⏰ 网络超时问题: 请求超过' + CONFIG.TIMEOUT + 'ms');
            reject(new Error('网络连接超时，请检查网络设置'));
          } else if (error.errNo === 10203) {
            console.error('🚫 请求被取消');
            reject(new Error('网络请求被取消'));
          } else if (error.errNo === 21101) {
            console.error('🔒 HTTPS证书问题');
            reject(new Error('HTTPS证书验证失败'));
          } else if (error.errNo === 21102) {
            console.error('🌐 网络不可达');
            reject(new Error('网络不可达，请检查网络连接'));
          } else {
            console.error('❓ 未知网络错误，错误码:', error.errNo);
            reject(new Error(`网络请求失败: ${error.errMsg || JSON.stringify(error)}`));
          }
        }
      });
    });
  },

  /**
   * 更新记忆
   */
  updateMemory(userMessage, aiReply, memoryExtract) {
    let currentMemory = this.data.memory;
    const newMemoryItem = `${memoryExtract}`;
    
    // 添加新记忆
    if (currentMemory) {
      currentMemory += `；${newMemoryItem}`;
    } else {
      currentMemory = newMemoryItem;
    }
    
    // 检查记忆长度，使用滑动窗口机制
    if (currentMemory.length > 500) {
      // 删除最早的记忆，保留最新的500字
      const memoryItems = currentMemory.split('；');
      while (currentMemory.length > 450 && memoryItems.length > 1) {
        memoryItems.shift(); // 删除最早的记忆项
        currentMemory = memoryItems.join('；');
      }
    }
    
    this.setData({
      memory: currentMemory
    });
    
    // 保存到本地存储
    try {
      tt.setStorageSync('chat_memory', currentMemory);
    } catch (error) {
      console.error('保存记忆失败:', error);
    }
  },

  /**
   * 加载聊天记录
   */
  loadChatHistory() {
    try {
      return tt.getStorageSync('chat_history') || [];
    } catch (error) {
      console.error('加载聊天记录失败:', error);
      return [];
    }
  },

  /**
   * 保存聊天记录
   */
  saveChatHistory() {
    try {
      // 只保存最近20条消息
      const messages = this.data.messages.slice(-20);
      tt.setStorageSync('chat_history', messages);
    } catch (error) {
      console.error('保存聊天记录失败:', error);
    }
  },

  /**
   * 加载记忆
   */
  loadMemory() {
    try {
      return tt.getStorageSync('chat_memory') || '';
    } catch (error) {
      console.error('加载记忆失败:', error);
      return '';
    }
  },

  /**
   * 清除聊天记录
   */
  clearChatHistory() {
    tt.showModal({
      title: '确认清除',
      content: '确定要清除所有聊天记录吗？此操作无法撤销。',
      success: (res) => {
        if (res.confirm) {
          try {
            tt.removeStorageSync('chat_history');
            tt.removeStorageSync('chat_memory');
            
            this.setData({
              messages: [],
              memory: '',
              showRecommended: true
            });
            
            this.addWelcomeMessage();
            
            tt.showToast({
              title: '已清除聊天记录',
              icon: 'success'
            });
          } catch (error) {
            console.error('清除失败:', error);
            tt.showToast({
              title: '清除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  /**
   * 滚动到聊天底部
   */
  scrollToBottom() {
    const messages = this.data.messages;
    if (messages.length > 0) {
      const lastMessageId = `msg-${messages[messages.length - 1].id}`;
      this.setData({
        scrollToView: lastMessageId
      });
    } else {
      // 如果没有消息，设置一个很大的scrollTop值来滚动到底部
      this.setData({
        scrollTop: 999999
      });
    }
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 每次显示页面时刷新用户信息
    const userProfile = app.getUserProfile();
    if (userProfile && userProfile.style_report) {
      this.setData({
        userProfile: userProfile
      });
    }
    
    // 每次显示页面时滚动到底部
    setTimeout(() => {
      this.scrollToBottom();
    }, 100);
  }
});