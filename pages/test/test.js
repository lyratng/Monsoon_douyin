// 测试页面
Page({
  data: {
    currentStep: 1,
    totalSteps: 16,
    isLoading: false,
    
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
      { name: '白', value: 'white', color: '#FFFFFF', border: true },
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
      currentStep: step
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
        this.setData({
          colorAnalysisResult: userProfile.color_analysis
        });
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
      
      app.updateUserProfile(updates);
      console.log('步骤数据已保存');
      
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
        if (!this.data.colorAnalysisResult) {
          tt.showToast({ title: '请上传照片完成分析', icon: 'none' });
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
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        const imagePath = res.tempFilePaths[0];
        self.setData({
          uploadedImage: imagePath
        });
        
        // 调用图像分析
        self.analyzeImage(imagePath);
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

  // 分析图片
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
      personalityScores: scores
    });
    
    // 自动进入下一步
    var self = this;
    setTimeout(function() {
      self.nextStep();
    }, 500);
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

  // 生成报告
  generateReport: function() {
    var self = this;
    this.setData({ isLoading: true });
    
    tt.showLoading({
      title: '生成报告中...'
    });
    
    // 保存最终数据
    this.saveStepData();
    
    const api = require('../../utils/api');
    const app = getApp();
    const userProfile = app.getUserProfile();
    
    api.generateStyleReport(userProfile)
      .then(function(styleReport) {
        // 保存生成的报告到用户档案
        app.updateUserProfile({
          style_report: styleReport
        });
        
        tt.hideLoading();
        tt.redirectTo({
          url: '/pages/report/report?generate=true'
        });
      })
      .catch(function(error) {
        console.error('报告生成失败:', error);
        tt.hideLoading();
        
        tt.showModal({
          title: '报告生成失败',
          content: 'API调用失败，是否继续查看模拟报告？',
          success: function(res) {
            if (res.confirm) {
              // 生成模拟报告并跳转
              const mockReport = self.generateMockReport(userProfile);
              app.updateUserProfile({
                style_report: mockReport
              });
              
              tt.redirectTo({
                url: '/pages/report/report?generate=true'
              });
            }
          }
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
  }
});