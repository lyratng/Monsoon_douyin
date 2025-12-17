// 测试页面
Page({
  data: {
    currentStep: 1,
    totalSteps: 16,
    isLoading: false,
    loadingText: 'AI正在为您生成专属风格报告...', // 加载文字
    stepAnimationClass: '', // 控制页面动画：'fade-in' | 'fade-out' | ''
    
    // 加载轮播相关
    currentBgIndex: 0,
    backgroundImages: [
      'https://monsoon.oss-cn-beijing.aliyuncs.com/assets/images/backgrounds/carousel/bg-1.jpg',
      'https://monsoon.oss-cn-beijing.aliyuncs.com/assets/images/backgrounds/carousel/bg-2.jpg',
      'https://monsoon.oss-cn-beijing.aliyuncs.com/assets/images/backgrounds/carousel/bg-3.jpg'
    ],
    
    // 基本信息（第1页）
    gender: '',
    age: 25,
    height: 165,
    weight: 60,
    
    // 手腕血管颜色（第2页）
    wristColor: '', // 'warm' | 'cool'
    
    // 照片分析结果（第3页）
    uploadedImage: '',
    colorAnalysisResult: null,
    
    // 偏好设置（第4-7页）
    favoriteColors: [],
    occasions: [],
    styleAwareness: '',
    shoppingSatisfaction: '',
    
    // 心理测试得分（第8-16页）
    personalityScores: {
      a: 0, // 轻快愉悦型
      b: 0, // 沉稳柔和型
      c: 0, // 棱角力量型
      d: 0  // 静止笔直型
    },
    psychologyAnswers: [], // 心理测试选择记录，8个问题对应8个答案
    mbtiType: '',
    
    // 颜色选项
    colorOptions: [
      { name: '红', value: 'red', color: '#FF6B6B' },
      { name: '橙', value: 'orange', color: '#FF9F43' },
      { name: '黄', value: 'yellow', color: '#FFC048' },
      { name: '绿', value: 'green', color: '#26C281' },
      { name: '蓝', value: 'blue', color: '#4A90E2' },
      { name: '紫', value: 'purple', color: '#9B59B6' },
      { name: '黑', value: 'black', color: '#2C2C2C' },
      { name: '白', value: 'white', color: '#FFFFFF' },
      { name: '灰', value: 'gray', color: '#95A5A6' }
    ],
    
    // 场合选项
    occasionOptions: [
      { name: '通勤工作', value: 'work' },
      { name: '运动健身', value: 'workout' },
      { name: '玩乐聚会', value: 'party' },
      { name: '日常通用', value: 'everyday' },
      { name: '周末休闲', value: 'weekend' },
      { name: '海滩度假', value: 'beachwear' }
    ],
    
    // MBTI选项
    mbtiOptions: [
      'ENFJ', 'ENFP', 'INFJ', 'INFP',
      'ENTJ', 'ENTP', 'INTJ', 'INTP', 
      'ESFJ', 'ISFJ', 'ESTJ', 'ISTJ',
      'ESFP', 'ISFP', 'ESTP', 'ISTP'
    ]
  },

  onLoad: function(options) {
    const step = parseInt(options.step) || 1;
    this.setData({
      currentStep: step,
      stepAnimationClass: '' // 重置动画状态，确保新页面正常显示fade-in
    });
    
    // 从本地存储恢复进度
    this.loadTestProgress();
    
    console.log('测试页面加载，当前步骤:', step);
  },

  // 加载测试进度
  loadTestProgress: function() {
    try {
      const app = getApp();
      const userProfile = app.getUserProfile();
      
      if (userProfile.basic_info) {
        this.setData({
          gender: userProfile.basic_info.gender || '',
          age: userProfile.basic_info.age || 25,
          height: userProfile.basic_info.height || 165,
          weight: userProfile.basic_info.weight || 60,
          wristColor: userProfile.basic_info.wrist_color || ''
        });
      }
      
      // 加载照片分析结果（如果存在）
      try {
        const savedAnalysisResult = tt.getStorageSync('colorAnalysisResult');
        if (savedAnalysisResult) {
          this.setData({
            colorAnalysisResult: savedAnalysisResult
          });
          console.log('已恢复照片分析结果:', savedAnalysisResult);
        }
      } catch (error) {
        console.error('加载照片分析结果失败:', error);
      }
      
      if (userProfile.preferences) {
        const favoriteColors = userProfile.preferences.favorite_colors || [];
        const occasions = userProfile.preferences.occasions || [];
        
        // 更新颜色选项的选中状态
        const colorOptions = this.data.colorOptions.map(item => ({
          ...item,
          selected: favoriteColors.indexOf(item.value) > -1
        }));
        
        // 更新场合选项的选中状态
        const occasionOptions = this.data.occasionOptions.map(item => ({
          ...item,
          selected: occasions.indexOf(item.value) > -1
        }));
        
        this.setData({
          favoriteColors: favoriteColors,
          occasions: occasions,
          colorOptions: colorOptions,
          occasionOptions: occasionOptions,
          styleAwareness: userProfile.preferences.style_awareness || '',
          shoppingSatisfaction: userProfile.preferences.shopping_satisfaction || ''
        });
      }
      
      if (userProfile.personality_test) {
        this.setData({
          personalityScores: userProfile.personality_test.scores || { a: 0, b: 0, c: 0, d: 0 },
          mbtiType: userProfile.personality_test.mbti || ''
        });
      }
      
      if (userProfile.color_analysis) {
        // 🔍 断点13：检查用户档案中的color_analysis是否与本地存储一致
        console.log('🎯 【断点13 - 数据一致性检查】');
        console.log('  本地存储的colorAnalysisResult:', this.data.colorAnalysisResult);
        console.log('  用户档案中的color_analysis:', userProfile.color_analysis);
        
        // 如果本地存储中已经有数据，优先使用本地存储的（更新鲜）
        if (!this.data.colorAnalysisResult) {
          console.log('  使用用户档案中的color_analysis数据');
          this.setData({
            colorAnalysisResult: userProfile.color_analysis
          });
        } else {
          console.log('  保持使用本地存储的数据（更新鲜）');
          // 检查数据是否一致，如果不一致则修复用户档案
          if (this.data.colorAnalysisResult.season_12 !== userProfile.color_analysis.season_12) {
            console.warn('⚠️ 数据不一致！本地存储:', this.data.colorAnalysisResult.season_12, 
                        ', 用户档案:', userProfile.color_analysis.season_12);
            console.log('🔧 自动修复用户档案中的错误数据...');
            
            // 用本地存储的正确数据更新用户档案
            const app = getApp();
            app.updateUserProfile({
              color_analysis: this.data.colorAnalysisResult
            });
            console.log('✅ 用户档案已修复为:', this.data.colorAnalysisResult.season_12);
          }
        }
      }
      
    } catch (error) {
      console.error('加载测试进度失败:', error);
    }
  },

  // 保存当前步骤数据
  saveStepData: function() {
    try {
      const app = getApp();
      const currentProfile = app.getUserProfile();
      
      const updates = {
        basic_info: {
          gender: this.data.gender,
          age: this.data.age,
          height: this.data.height,
          weight: this.data.weight,
          wrist_color: this.data.wristColor,
          created_at: currentProfile.basic_info ? currentProfile.basic_info.created_at : new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        preferences: {
          favorite_colors: this.data.favoriteColors,
          occasions: this.data.occasions,
          style_awareness: this.data.styleAwareness,
          shopping_satisfaction: this.data.shoppingSatisfaction
        },
        personality_test: {
          scores: this.data.personalityScores,
          mbti: this.data.mbtiType
        },
        color_analysis: this.data.colorAnalysisResult
      };
      
      // 🔍 断点3：保存用户档案前的数据检查
      console.log('🎯 【断点3 - 保存用户档案前】');
      console.log('  即将保存的color_analysis:', this.data.colorAnalysisResult);
      if (this.data.colorAnalysisResult) {
        console.log('  即将保存的季型 (season_12):', this.data.colorAnalysisResult.season_12);
      }
      console.log('  完整updates对象:', JSON.stringify(updates, null, 2));
      
      app.updateUserProfile(updates);
      console.log('步骤数据已保存');
      
      // 🔍 断点4：保存用户档案后的验证
      const savedProfile = app.getUserProfile();
      console.log('🎯 【断点4 - 保存用户档案后验证】');
      console.log('  保存后的color_analysis:', savedProfile.color_analysis);
      if (savedProfile.color_analysis) {
        console.log('  保存后的季型 (season_12):', savedProfile.color_analysis.season_12);
      }
      
    } catch (error) {
      console.error('保存步骤数据失败:', error);
    }
  },

  // 下一步
  nextStep: function() {
    // 验证当前步骤数据
    if (!this.validateCurrentStep()) {
      return;
    }
    
    // 保存当前数据
    this.saveStepData();
    
    if (this.data.currentStep < this.data.totalSteps) {
      // 跳转到下一步
      const nextStep = this.data.currentStep + 1;
      tt.redirectTo({
        url: '/pages/test/test?step=' + nextStep
      });
    } else {
      // 最后一步，开始生成报告
      this.generateReport();
    }
  },

  // 上一步
  prevStep: function() {
    if (this.data.currentStep > 1) {
      const prevStep = this.data.currentStep - 1;
      tt.redirectTo({
        url: '/pages/test/test?step=' + prevStep
      });
    }
  },

  // 验证当前步骤
  validateCurrentStep: function() {
    const currentStep = this.data.currentStep;
    
    switch (currentStep) {
      case 1:
        if (!this.data.gender) {
          tt.showToast({ title: '请选择性别', icon: 'none' });
          return false;
        }
        break;
      case 2:
        if (!this.data.wristColor) {
          tt.showToast({ title: '请选择手腕血管颜色', icon: 'none' });
          return false;
        }
        break;
      case 3:
        if (!this.data.uploadedImage) {
          tt.showToast({ title: '请先上传照片', icon: 'none' });
          return false;
        }
        break;
      case 4:
        if (this.data.favoriteColors.length === 0) {
          tt.showToast({ title: '请至少选择一种喜欢的颜色', icon: 'none' });
          return false;
        }
        break;
      case 5:
        if (this.data.occasions.length === 0) {
          tt.showToast({ title: '请至少选择一个穿搭场合', icon: 'none' });
          return false;
        }
        break;
      case 6:
        if (!this.data.styleAwareness) {
          tt.showToast({ title: '请选择对风格的了解程度', icon: 'none' });
          return false;
        }
        break;
      case 7:
        if (!this.data.shoppingSatisfaction) {
          tt.showToast({ title: '请选择购物经历满意度', icon: 'none' });
          return false;
        }
        break;
      case 16:
        if (!this.data.mbtiType) {
          tt.showToast({ title: '请选择MBTI类型', icon: 'none' });
          return false;
        }
        break;
      default:
        // 心理测试步骤暂时不验证
        break;
    }
    
    return true;
  },

  // 基本信息处理函数
  onGenderChange: function(e) {
    this.setData({
      gender: e.currentTarget.dataset.gender
    });
  },

  onAgeChange: function(e) {
    this.setData({
      age: parseInt(e.detail.value)
    });
  },

  onHeightChange: function(e) {
    this.setData({
      height: parseInt(e.detail.value)
    });
  },

  onWeightChange: function(e) {
    this.setData({
      weight: parseInt(e.detail.value)
    });
  },

  // 手腕血管颜色
  onWristColorChange: function(e) {
    this.setData({
      wristColor: e.currentTarget.dataset.color
    });
  },

  // 照片上传
  chooseImage: function() {
    var self = this;
    tt.chooseImage({
      count: 1,
      sizeType: ['compressed'], // 先进行系统压缩
      sourceType: ['album', 'camera'],
      success: function(res) {
        const imagePath = res.tempFilePaths[0];
        
        console.log('📸 原始图片路径:', imagePath);
        
        // 进一步压缩图片以避免413错误
        tt.compressImage({
          src: imagePath,
          quality: 60, // 压缩质量60%，大幅减小体积
          success: function(compressRes) {
            const compressedPath = compressRes.tempFilePath;
            console.log('✅ 图片压缩成功');
            console.log('   压缩后路径:', compressedPath);
            
            self.setData({
              uploadedImage: compressedPath
            });
            
            // 立即显示上传成功，用户可以进入下一步
            tt.showToast({
              title: '照片上传成功',
              icon: 'success'
            });
            
            // 在后台开始分析（不阻塞用户操作）
            self.analyzeImageInBackground(compressedPath);
          },
          fail: function(compressError) {
            // 如果压缩失败，使用原图
            console.warn('⚠️ 图片压缩失败，使用原图:', compressError);
            
            self.setData({
              uploadedImage: imagePath
            });
            
            tt.showToast({
              title: '照片上传成功',
              icon: 'success'
            });
            
            self.analyzeImageInBackground(imagePath);
          }
        });
      },
      fail: function(error) {
        console.error('选择图片失败:', error);
        tt.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },

  // 后台分析图片（不阻塞用户操作，无前端动效）
  analyzeImageInBackground: function(imagePath) {
    var self = this;
    // 移除isLoading状态设置，不显示任何加载动效
    
    const api = require('../../utils/api');
    
    // 先进行内容安全检测
    api.checkImageSafetyFromFile(imagePath)
      .then(function(safetyResult) {
        if (!safetyResult.safe) {
          console.log('[安全检测] ❌ 照片未通过安全检测:', safetyResult.message);
          // 清除已上传的图片
          self.setData({
            uploadedImage: ''
          });
          tt.showModal({
            title: '图片检测未通过',
            content: safetyResult.message || '您上传的图片未通过安全检测，请更换图片后重试',
            showCancel: false
          });
          return Promise.reject(new Error('图片安全检测未通过'));
        }
        console.log('[安全检测] ✅ 照片安全检测通过');
        // 安全检测通过后，继续进行AI分析
        return api.analyzeImage(imagePath, self.data.wristColor);
      })
      .then(function(result) {
        if (!result) return; // 如果安全检测未通过，这里result为undefined
        // 静默保存分析结果，不显示Toast，不更改UI状态
        self.setData({
          colorAnalysisResult: result
        });
        
        // 🔍 断点2：测试页面接收到图像分析结果
        console.log('🎯 【断点2 - 测试页面接收图像分析结果】');
        console.log('  接收到的季型 (season_12):', result.season_12);
        console.log('  完整结果:', JSON.stringify(result, null, 2));
        console.log('图像分析完成（后台）:', result);
        
        // 保存到本地存储，确保数据不丢失
        try {
          tt.setStorageSync('colorAnalysisResult', result);
        } catch (error) {
          console.error('保存分析结果失败:', error);
        }
      })
      .catch(function(error) {
        console.error('图像分析失败（后台）:', error);
        // 移除isLoading状态更新
        
        // 如果API调用失败，使用模拟数据（静默处理）
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
        
        self.setData({
          colorAnalysisResult: mockResult
        });
        
        // 保存模拟数据到本地存储
        try {
          tt.setStorageSync('colorAnalysisResult', mockResult);
        } catch (error) {
          console.error('保存模拟数据失败:', error);
        }
        
        console.log('API调用失败，已使用模拟数据（后台）');
      });
  },

  // 原始分析图片函数（保留用于直接分析场景）
  analyzeImage: function(imagePath) {
    var self = this;
    this.setData({ isLoading: true });
    
    const api = require('../../utils/api');
    
    api.analyzeImage(imagePath, this.data.wristColor)
      .then(function(result) {
        self.setData({
          colorAnalysisResult: result,
          isLoading: false
        });
        
        tt.showToast({
          title: '分析完成',
          icon: 'success'
        });
      })
      .catch(function(error) {
        console.error('图像分析失败:', error);
        self.setData({ isLoading: false });
        
        // 如果API调用失败，使用模拟数据
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
        
        self.setData({
          colorAnalysisResult: mockResult
        });
        
        tt.showToast({
          title: 'API调用失败，使用模拟数据',
          icon: 'none'
        });
      });
  },

  // 喜欢的颜色
  onColorToggle: function(e) {
    const color = e.currentTarget.dataset.color;
    const favoriteColors = this.data.favoriteColors.slice();
    const index = favoriteColors.indexOf(color);
    
    if (index > -1) {
      favoriteColors.splice(index, 1);
    } else {
      favoriteColors.push(color);
    }
    
    // 更新颜色选项的选中状态
    const colorOptions = this.data.colorOptions.map(item => ({
      ...item,
      selected: favoriteColors.indexOf(item.value) > -1
    }));
    
    this.setData({
      favoriteColors: favoriteColors,
      colorOptions: colorOptions
    });
  },

  // 穿搭场合
  onOccasionToggle: function(e) {
    const occasion = e.currentTarget.dataset.occasion;
    const occasions = this.data.occasions.slice();
    const index = occasions.indexOf(occasion);
    
    if (index > -1) {
      occasions.splice(index, 1);
    } else {
      occasions.push(occasion);
    }
    
    // 更新场合选项的选中状态
    const occasionOptions = this.data.occasionOptions.map(item => ({
      ...item,
      selected: occasions.indexOf(item.value) > -1
    }));
    
    this.setData({
      occasions: occasions,
      occasionOptions: occasionOptions
    });
  },

  // 风格认知程度
  onStyleAwarenessChange: function(e) {
    this.setData({
      styleAwareness: e.currentTarget.dataset.value
    });
  },

  // 购物满意度
  onShoppingSatisfactionChange: function(e) {
    this.setData({
      shoppingSatisfaction: e.currentTarget.dataset.value
    });
  },

  // 心理测试
  onPersonalityChoice: function(e) {
    const choice = e.currentTarget.dataset.choice;
    const currentQuestionIndex = this.data.currentStep - 8; // 第8步开始是第0个问题
    
    // 更新选择记录
    const answers = this.data.psychologyAnswers || [];
    answers[currentQuestionIndex] = choice;
    
    const scores = {
      a: this.data.personalityScores.a,
      b: this.data.personalityScores.b,
      c: this.data.personalityScores.c,
      d: this.data.personalityScores.d
    };
    
    // 根据选择更新得分
    switch (choice) {
      case 'A':
        scores.a += 2;
        break;
      case 'B':
        scores.b += 2;
        break;
      case 'C':
        scores.c += 2;
        break;
      case 'D':
        scores.d += 2;
        break;
    }
    
    this.setData({
      psychologyAnswers: answers,
      personalityScores: scores
    });
    
    // 丝滑过渡：先显示选择反馈，然后退出动画，最后跳转
    var self = this;
    
    // 第一阶段：短暂显示选择状态 (300ms)
    setTimeout(function() {
      // 第二阶段：开始退出动画
      self.setData({
        stepAnimationClass: 'fade-out'
      });
      
      // 第三阶段：动画完成后跳转 (400ms fadeOut动画时长)
      setTimeout(function() {
        self.nextStep();
      }, 400);
    }, 300);
  },

  // MBTI选择
  onMbtiChange: function(e) {
    const mbti = e.currentTarget.dataset.mbti;
    const scores = {
      a: this.data.personalityScores.a,
      b: this.data.personalityScores.b,
      c: this.data.personalityScores.c,
      d: this.data.personalityScores.d
    };
    
    // 根据MBTI更新得分
    const mbtiScores = {
      'ENFJ': { b: 2, c: 2, d: 1 },
      'ENFP': { a: 2 },
      'INFJ': { b: 2, c: 1 },
      'INFP': { b: 2 },
      'ENTJ': { c: 2 },
      'ENTP': { a: 1 },
      'INTJ': { c: 1, d: 1 },
      'INTP': { b: 1, d: 1 },
      'ESFJ': { a: 1, b: 1, c: 1 },
      'ISFJ': { b: 1, c: 1 },
      'ESTJ': { c: 2, d: 1 },
      'ISTJ': { c: 1, d: 2 },
      'ESFP': { a: 2 },
      'ISFP': { b: 2 },
      'ESTP': { a: 1 },
      'ISTP': { b: 1, d: 1 }
    };
    
    const mbtiScore = mbtiScores[mbti] || {};
    if (mbtiScore.a) scores.a += mbtiScore.a;
    if (mbtiScore.b) scores.b += mbtiScore.b;
    if (mbtiScore.c) scores.c += mbtiScore.c;
    if (mbtiScore.d) scores.d += mbtiScore.d;
    
    this.setData({
      mbtiType: mbti,
      personalityScores: scores
    });
  },

  // MBTI不确定选项
  onMbtiUncertain: function() {
    console.log('选择了MBTI不确定选项');
    this.setData({
      mbtiType: '不确定',
      // 不确定时保持原有分数不变
      personalityScores: this.data.personalityScores
    });
  },

  // 生成报告
  generateReport: function() {
    var self = this;
    this.setData({ 
      isLoading: true,
      loadingText: 'AI正在为您生成专属风格报告...'
    });
    
    // 开始背景轮播
    this.startBackgroundCarousel();
    
    // 保存最终数据
    this.saveStepData();
    
    const api = require('../../utils/api');
    const app = getApp();
    
    // 等待照片分析完成后再生成报告
    this.waitForColorAnalysis(function() {
      // 再次保存数据，确保 colorAnalysisResult 已保存
      self.saveStepData();
      
      const userProfile = app.getUserProfile();
      
      // 🔍 断点5：生成风格报告前的用户档案检查
      console.log('🎯 【断点5 - 生成风格报告前】');
      console.log('  获取到的完整用户档案:', JSON.stringify(userProfile, null, 2));
      console.log('  color_analysis:', userProfile.color_analysis);
      if (userProfile.color_analysis) {
        console.log('  传入报告生成的季型 (season_12):', userProfile.color_analysis.season_12);
      }
      
      self.doGenerateStyleReport(api, app, userProfile);
    });
  },
  
  // 等待照片分析完成
  waitForColorAnalysis: function(callback) {
    var self = this;
    var maxWaitTime = 30000; // 最多等待30秒
    var checkInterval = 500; // 每500ms检查一次
    var waitedTime = 0;
    
    function check() {
      // 先检查本地 data
      if (self.data.colorAnalysisResult) {
        console.log('✅ 照片分析已完成（来自本地data）');
        callback();
        return;
      }
      
      // 再检查本地存储
      try {
        var savedResult = tt.getStorageSync('colorAnalysisResult');
        if (savedResult) {
          console.log('✅ 照片分析已完成（来自本地存储）');
          self.setData({ colorAnalysisResult: savedResult });
          callback();
          return;
        }
      } catch (e) {
        console.error('检查本地存储失败:', e);
      }
      
      waitedTime += checkInterval;
      
      if (waitedTime >= maxWaitTime) {
        console.warn('⚠️ 等待照片分析超时，使用模拟数据');
        // 超时后使用模拟数据
        var mockResult = {
          season_12: "Cool Summer",
          season_4: "Summer",
          confidence: 0.75,
          characteristics: {
            best: ["s", "m", "c"],
            avoid: ["v", "s", "b"]
          }
        };
        self.setData({ colorAnalysisResult: mockResult });
        tt.setStorageSync('colorAnalysisResult', mockResult);
        callback();
        return;
      }
      
      // 更新等待提示
      self.setData({ 
        loadingText: 'AI正在分析您的照片...' 
      });
      
      setTimeout(check, checkInterval);
    }
    
    check();
  },
  
  // 执行风格报告生成（并行生成报告和专属形象）
  doGenerateStyleReport: function(api, app, userProfile) {
    var self = this;
    
    this.setData({ 
      loadingText: 'AI正在为您生成专属风格报告...'
    });
    
    console.log('🚀 开始并行生成：报告 + 专属形象');
    
    // 任务1：生成风格报告
    var reportPromise = api.generateStyleReport(userProfile)
      .then(function(styleReport) {
        console.log('🎯 【断点10 - 风格报告生成完成】');
        console.log('  生成的报告季型名称:', styleReport['季型名称']);
        
        // 对AI生成的报告内容进行安全过滤
        const filteredReport = self.filterReportContent(styleReport);
        console.log('🔒 [安全] 报告内容已过滤');
        
        // 保存过滤后的报告到用户档案
        app.updateUserProfile({
          style_report: filteredReport
        });
        
        console.log('✅ 风格报告已保存');
        return { success: true, report: filteredReport };
      })
      .catch(function(error) {
        console.error('❌ 报告生成失败:', error);
        return { success: false, error: error };
      });
    
    // 任务2：生成专属形象（不再依赖 styleReport，可并行）
    var avatarPromise = api.generateAvatar(userProfile)
      .then(function(avatarBase64) {
        console.log('🎨 Avatar生成成功，base64长度:', avatarBase64 ? avatarBase64.length : 0);
        
        // 直接保存base64 data URI到userProfile
        const dataUri = 'data:image/png;base64,' + avatarBase64;
        
        app.updateUserProfile({
          avatar_image: dataUri
        });
        
        console.log('✅ Avatar已保存到userProfile');
        return { success: true };
      })
      .catch(function(error) {
        console.error('❌ Avatar生成失败:', error);
        return { success: false, error: error };
      });
    
    // 等待两个任务都完成
    Promise.all([reportPromise, avatarPromise])
      .then(function(results) {
        var reportResult = results[0];
        var avatarResult = results[1];
        
        console.log('📊 并行任务完成:', {
          reportSuccess: reportResult.success,
          avatarSuccess: avatarResult.success
        });
        
        // 停止背景轮播
        self.stopBackgroundCarousel();
        self.setData({ isLoading: false });
        
        // 报告失败时使用模拟报告
        if (!reportResult.success) {
          tt.showModal({
            title: '报告生成失败',
            content: 'API调用失败，是否继续查看模拟报告？',
            success: function(res) {
              if (res.confirm) {
                const mockReport = self.generateMockReport(userProfile);
                app.updateUserProfile({
                  style_report: mockReport
                });
                
                tt.redirectTo({
                  url: '/packageReport/pages/report/report?generate=true'
                });
              }
            }
          });
          return;
        }
        
        // 报告成功，跳转到报告页（形象失败时不显示形象，已在报告页处理）
        tt.redirectTo({
          url: '/packageReport/pages/report/report?generate=true'
        });
      });
  },

  // 生成模拟报告（API失败时使用）
  generateMockReport: function(userProfile) {
    return {
      "季型名称": "真夏型",
      "适合颜色的简短描述": "适合低对比度、带灰色底调的柔和色彩",
      "能量类型名称": "自洽自律型",
      "能量匹配的风格简短描述": "沉稳优雅，适合柔软飘逸的风格",
      "推荐的颜色列表": [
        { "name": "雾霾蓝", "hex": "#8BB8C7" },
        { "name": "鼠尾草绿", "hex": "#9CAF88" },
        { "name": "薰衣草紫", "hex": "#B19CD9" },
        { "name": "珍珠白", "hex": "#F8F6F0" }
      ],
      "推荐的材质列表（按季节）": {
        "春": [{ "name": "莫代尔", "why": "轻薄透气，触感柔软，符合柔和气质" }],
        "夏": [{ "name": "亚麻布", "why": "自然质朴，透气舒适，展现随性优雅" }],
        "秋": [{ "name": "羊绒", "why": "柔软温暖，质感高级，彰显低调奢华" }],
        "冬": [{ "name": "精纺毛织物", "why": "保暖舒适，版型挺括，适合正式场合" }]
      },
      "推荐的风格列表": ["静奢老钱风", "松弛文艺", "日系", "自然文艺"],
      "场合推荐": [
        {
          "name": "通勤工作",
          "notes": "正式合规、低调稳重",
          "outfits": [
            {
              "top": "雾霾蓝衬衫",
              "bottom": "灰色西装裤",
              "shoes": "黑色低跟鞋",
              "accessories": "简约珍珠耳钉"
            }
          ]
        }
      ]
    };
  },

  /**
   * 开始背景轮播
   */
  startBackgroundCarousel: function() {
    console.log('开始背景轮播，图片数量:', this.data.backgroundImages.length);
    
    // 每2秒切换到下一张图片
    this.backgroundTimer = setInterval(() => {
      const nextIndex = (this.data.currentBgIndex + 1) % this.data.backgroundImages.length;
      console.log('切换到背景图片索引:', nextIndex);
      this.setData({
        currentBgIndex: nextIndex
      });
    }, 2000); // 每2秒切换一次
  },

  /**
   * 对AI生成的报告内容进行安全过滤
   */
  filterReportContent: function(report) {
    if (!report) return report;
    
    // 本地敏感词列表
    const SENSITIVE_WORDS = [
      '法轮', '六四', '天安门', '达赖', '藏独', '疆独', '台独', '港独',
      '习近平', '毛泽东', '反党', '反华', '颠覆', '政变', '游行', '示威',
      '共产党', '国民党', '民进党', '轮子', '邪教',
      '裸体', '色情', '嫖娼', '卖淫', '性交', '做爱', '约炮', '援交',
      '黄片', '成人片', '一夜情', 'AV',
      '杀人', '自杀', '炸弹', '恐怖', '枪支', '贩卖', '走私', '暗杀',
      '绑架', '投毒', '爆炸', '行刺',
      '赌博', '博彩', '毒品', '吸毒', '大麻', '冰毒', '海洛因', '可卡因',
      '代孕', '器官买卖', '人口贩卖', '洗钱'
    ];
    
    // 检查文本是否包含敏感词
    const containsSensitive = function(text) {
      if (!text || typeof text !== 'string') return false;
      const lowerText = text.toLowerCase();
      for (var i = 0; i < SENSITIVE_WORDS.length; i++) {
        if (lowerText.includes(SENSITIVE_WORDS[i].toLowerCase())) {
          console.log('[报告安全过滤] ❌ 检测到敏感词:', SENSITIVE_WORDS[i]);
          return true;
        }
      }
      return false;
    };
    
    // 安全替换文本
    const safeText = function(text, fallback) {
      if (!text) return fallback || '';
      if (containsSensitive(text)) {
        return fallback || '内容已过滤';
      }
      return text;
    };
    
    // 深拷贝
    const filtered = JSON.parse(JSON.stringify(report));
    
    // 过滤文字描述字段
    if (filtered['适合颜色的简短描述']) {
      filtered['适合颜色的简短描述'] = safeText(filtered['适合颜色的简短描述'], '适合您的颜色');
    }
    if (filtered['能量匹配的风格简短描述']) {
      filtered['能量匹配的风格简短描述'] = safeText(filtered['能量匹配的风格简短描述'], '适合您的风格');
    }
    
    // 过滤场合推荐中的文字
    if (filtered['场合推荐'] && Array.isArray(filtered['场合推荐'])) {
      filtered['场合推荐'] = filtered['场合推荐'].map(function(occasion) {
        if (occasion.notes) {
          occasion.notes = safeText(occasion.notes, '搭配建议');
        }
        return occasion;
      });
    }
    
    console.log('[报告安全过滤] ✅ 过滤完成');
    return filtered;
  },

  /**
   * 停止背景轮播
   */
  stopBackgroundCarousel: function() {
    if (this.backgroundTimer) {
      clearInterval(this.backgroundTimer);
      this.backgroundTimer = null;
    }
  }
});