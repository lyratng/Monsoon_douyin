// 衣索寓言 - AI穿搭小程序
App({
  onLaunch: function(options) {
    console.log('衣索寓言小程序启动', options);
    
    // 初始化用户档案系统
    this.initUserProfile();
    
    // 检查是否首次使用
    this.checkFirstTimeUser();
  },

  onShow: function(options) {
    console.log('衣索寓言小程序显示', options);
  },

  onHide: function() {
    console.log('衣索寓言小程序隐藏');
  },

  onError: function(msg) {
    console.error('衣索寓言小程序错误', msg);
  },

  // 初始化用户档案
  initUserProfile: function() {
    try {
      const userProfile = tt.getStorageSync('user_profile');
      if (!userProfile) {
        // 创建空的用户档案
        const emptyProfile = this.createEmptyUserProfile();
        tt.setStorageSync('user_profile', emptyProfile);
        console.log('创建新用户档案');
      } else {
        console.log('用户档案已存在');
      }
    } catch (error) {
      console.error('初始化用户档案失败:', error);
    }
  },

  // 创建空用户档案
  createEmptyUserProfile: function() {
    return {
      basic_info: {
        gender: null,
        age: null,
        height: null,
        weight: null,
        wrist_color: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      color_analysis: null,
      personality_test: {
        scores: { a: 0, b: 0, c: 0, d: 0 },
        energy_type: null,
        mbti: null
      },
      preferences: {
        favorite_colors: [],
        occasions: [],
        style_awareness: null,
        shopping_satisfaction: null
      },
      style_report: null,
      conversation_memory: {
        natural_language_memory: "",
        conversation_history: []
      },
      version: "1.0",
      test_count: 0
    };
  },

  // 检查是否首次使用
  checkFirstTimeUser: function() {
    try {
      const userProfile = tt.getStorageSync('user_profile');
      this.globalData.isFirstTime = !userProfile.style_report;
    } catch (error) {
      console.error('检查首次使用状态失败:', error);
      this.globalData.isFirstTime = true;
    }
  },

  // 全局数据
  globalData: {
    isFirstTime: true,
    currentTestStep: 1,
    maxTestSteps: 16,
    userProfile: null
  },

  // 获取用户档案
  getUserProfile: function() {
    try {
      return tt.getStorageSync('user_profile');
    } catch (error) {
      console.error('获取用户档案失败:', error);
      return this.createEmptyUserProfile();
    }
  },

  // 更新用户档案
  updateUserProfile: function(updates) {
    try {
      const currentProfile = this.getUserProfile();
      const updatedProfile = {
        basic_info: currentProfile.basic_info || {},
        color_analysis: currentProfile.color_analysis,
        personality_test: currentProfile.personality_test || {},
        preferences: currentProfile.preferences || {},
        style_report: currentProfile.style_report,
        avatar_image: currentProfile.avatar_image || '',
        avatar_chunks: currentProfile.avatar_chunks || 0,
        conversation_memory: currentProfile.conversation_memory || {},
        version: currentProfile.version || "1.0",
        test_count: currentProfile.test_count || 0
      };

      // 合并更新
      if (updates.basic_info) {
        updatedProfile.basic_info = Object.assign(updatedProfile.basic_info, updates.basic_info);
        updatedProfile.basic_info.updated_at = new Date().toISOString();
      }
      if (updates.color_analysis) {
        updatedProfile.color_analysis = updates.color_analysis;
      }
      if (updates.personality_test) {
        updatedProfile.personality_test = Object.assign(updatedProfile.personality_test, updates.personality_test);
      }
      if (updates.preferences) {
        updatedProfile.preferences = Object.assign(updatedProfile.preferences, updates.preferences);
      }
      if (updates.style_report) {
        updatedProfile.style_report = updates.style_report;
      }
      if (updates.avatar_image) {
        // 如果图片太大，使用分片存储
        const avatarData = updates.avatar_image;
        if (avatarData.length > 900000) { // 900KB阈值
          console.log('🎨 Avatar图片较大，使用分片存储, 大小:', avatarData.length);
          // 分片大小：每片900KB
          const chunkSize = 900000;
          const chunks = [];
          for (let i = 0; i < avatarData.length; i += chunkSize) {
            chunks.push(avatarData.substring(i, i + chunkSize));
          }
          console.log('🎨 分为', chunks.length, '片存储');
          
          // 保存每一片
          for (let i = 0; i < chunks.length; i++) {
            try {
              tt.setStorageSync(`avatar_chunk_${i}`, chunks[i]);
            } catch (error) {
              console.error(`保存avatar片段${i}失败:`, error);
            }
          }
          
          // 在userProfile中只保存元信息
          updatedProfile.avatar_image = 'CHUNKED';
          updatedProfile.avatar_chunks = chunks.length;
        } else {
          updatedProfile.avatar_image = updates.avatar_image;
        }
      }
      if (updates.conversation_memory) {
        updatedProfile.conversation_memory = Object.assign(updatedProfile.conversation_memory, updates.conversation_memory);
      }
      if (updates.test_count !== undefined) {
        updatedProfile.test_count = updates.test_count;
      }
      
      tt.setStorageSync('user_profile', updatedProfile);
      console.log('用户档案更新成功');
      return updatedProfile;
    } catch (error) {
      console.error('更新用户档案失败:', error);
      return null;
    }
  }
});


