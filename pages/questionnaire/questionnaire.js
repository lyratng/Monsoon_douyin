// pages/questionnaire/questionnaire.js - 问卷页逻辑

const app = getApp();

Page({
  data: {
    questionnaire: null,
    currentQuestionIndex: 0,
    answers: {},
    currentOptions: [],
    isLoading: true,
    progress: 0,
    userInfo: {
      gender: '',
      height: '',
      weight: ''
    }
  },

  onLoad() {
    console.log('问卷页加载');
    this.loadQuestionnaire();
  },

  // 加载问卷配置
  async loadQuestionnaire() {
    try {
      // 直接定义问卷数据，避免require问题
      const questionnaire = {
        "title": "个人风格探索问卷",
        "description": "通过回答以下问题，帮助我们更好地了解您的个人风格偏好",
        "questions": [
          {
            "id": "q1",
            "type": "multi_select",
            "title": "你最喜欢的穿衣风格是？",
            "options": [
              {"value": "经典优雅", "label": "经典优雅", "icon": "🎩"},
              {"value": "时尚前卫", "label": "时尚前卫", "icon": "✨"},
              {"value": "休闲舒适", "label": "休闲舒适", "icon": "😌"},
              {"value": "职业正式", "label": "职业正式", "icon": "💼"},
              {"value": "甜美可爱", "label": "甜美可爱", "icon": "🌸"},
              {"value": "个性独特", "label": "个性独特", "icon": "🎭"},
              {"value": "其他", "label": "其他", "icon": "💫"}
            ],
            "maxSelect": 3,
            "dimension": "stylePreference",
            "weight": 0.3
          },
          {
            "id": "q2",
            "type": "single_select",
            "title": "你会根据不同场合改变穿衣风格吗？",
            "options": [
              {"value": "会根据场合精心搭配", "label": "会根据场合精心搭配", "score": 4},
              {"value": "有时会考虑，主要看心情", "label": "有时会考虑，主要看心情", "score": 3},
              {"value": "不太在意场合", "label": "不太在意场合", "score": 2},
              {"value": "基本不改变个人风格", "label": "基本不改变个人风格", "score": 1}
            ],
            "dimension": "occasionAdaptability",
            "weight": 0.2
          },
          {
            "id": "q3",
            "type": "single_select",
            "title": "对你来说，服装最重要的功能是？",
            "options": [
              {"value": "增加自信和魅力", "label": "增加自信和魅力", "score": 4},
              {"value": "符合社会和职场要求", "label": "符合社会和职场要求", "score": 3},
              {"value": "舒适和易于穿着", "label": "舒适和易于穿着", "score": 2},
              {"value": "表达个人风格和品味", "label": "表达个人风格和品味", "score": 1}
            ],
            "dimension": "functionOrientation",
            "weight": 0.15
          },
          {
            "id": "q4",
            "type": "single_select",
            "title": "你容易受到他人对你穿衣建议的影响吗？",
            "options": [
              {"value": "容易受他人建议影响", "label": "容易受他人建议影响", "score": 4},
              {"value": "有一点影响，但有自己偏好", "label": "有一点影响，但有自己偏好", "score": 3},
              {"value": "基本不受他人影响", "label": "基本不受他人影响", "score": 2},
              {"value": "喜欢挑战他人的审美观", "label": "喜欢挑战他人的审美观", "score": 1}
            ],
            "dimension": "socialInfluenceSensitivity",
            "weight": 0.1
          },
          {
            "id": "q5",
            "type": "single_select",
            "title": "你的生活节奏通常是什么样？",
            "options": [
              {"value": "快节奏、高强度", "label": "快节奏、高强度", "score": 4},
              {"value": "节奏适中、相对稳定", "label": "节奏适中、相对稳定", "score": 3},
              {"value": "慢节奏、轻松悠闲", "label": "慢节奏、轻松悠闲", "score": 2},
              {"value": "不固定、变化极大", "label": "不固定、变化极大", "score": 1}
            ],
            "dimension": "lifeRhythm",
            "weight": 0.1
          },
          {
            "id": "q6",
            "type": "multi_select",
            "title": "你最喜欢的颜色？",
            "options": [
              {"value": "明黄", "label": "明黄", "hex": "#FFD700", "category": "warm"},
              {"value": "橙红", "label": "橙红", "hex": "#FF4500", "category": "warm"},
              {"value": "森绿", "label": "森绿", "hex": "#228B22", "category": "natural"},
              {"value": "天蓝", "label": "天蓝", "hex": "#87CEEB", "category": "cool"},
              {"value": "浅灰", "label": "浅灰", "hex": "#D3D3D3", "category": "neutral"},
              {"value": "粉红", "label": "粉红", "hex": "#FFC0CB", "category": "warm"},
              {"value": "棕色", "label": "棕色", "hex": "#A52A2A", "category": "natural"},
              {"value": "深蓝", "label": "深蓝", "hex": "#000080", "category": "cool"},
              {"value": "米白", "label": "米白", "hex": "#F5F5DC", "category": "neutral"},
              {"value": "黑色", "label": "黑色", "hex": "#000000", "category": "neutral"},
              {"value": "橄榄", "label": "橄榄", "hex": "#808000", "category": "natural"},
              {"value": "紫灰", "label": "紫灰", "hex": "#8B7D8B", "category": "cool"}
            ],
            "maxSelect": 12,
            "dimension": "colorPreference",
            "weight": 0.15
          },
          {
            "id": "q7",
            "type": "multi_select",
            "title": "你在穿衣搭配时最注重什么？",
            "options": [
              {"value": "时尚感和流行度", "label": "时尚感和流行度", "icon": "🔥"},
              {"value": "舒适感和实用性", "label": "舒适感和实用性", "icon": "😌"},
              {"value": "独特性和个性化", "label": "独特性和个性化", "icon": "⭐"},
              {"value": "品牌和价格", "label": "品牌和价格", "icon": "💰"},
              {"value": "易于打理和维护", "label": "易于打理和维护", "icon": "🧺"}
            ],
            "maxSelect": 3,
            "dimension": "stylingFocus",
            "weight": 0.1
          },
          {
            "id": "q8",
            "type": "multi_select",
            "title": "你通常如何决定购买衣服？",
            "options": [
              {"value": "跟随流行趋势和时尚杂志", "label": "跟随流行趋势和时尚杂志", "icon": "📰"},
              {"value": "根据具体场合和需求", "label": "根据具体场合和需求", "icon": "🎯"},
              {"value": "听取销售员或品牌推荐", "label": "听取销售员或品牌推荐", "icon": "👔"},
              {"value": "注重实用性和性价比", "label": "注重实用性和性价比", "icon": "💡"},
              {"value": "参考朋友和家人的评价", "label": "参考朋友和家人的评价", "icon": "👥"},
              {"value": "凭借个人感觉和直觉", "label": "凭借个人感觉和直觉", "icon": "💫"}
            ],
            "maxSelect": 3,
            "dimension": "purchaseDecisionPattern",
            "weight": 0.1
          }
        ]
      };

      this.setData({
        questionnaire: questionnaire,
        isLoading: false,
        progress: 0
      });
      
      // 初始化第一个问题的选项
      this.updateCurrentOptions();
      
      console.log('问卷加载成功:', questionnaire);
    } catch (error) {
      console.error('加载问卷失败:', error);
      this.setData({
        isLoading: false
      });
      tt.showToast({
        title: '加载问卷失败',
        icon: 'error'
      });
    }
  },

  // 获取当前问题
  getCurrentQuestion() {
    if (!this.data.questionnaire || !this.data.questionnaire.questions) {
      return null;
    }
    return this.data.questionnaire.questions[this.data.currentQuestionIndex];
  },

  // 选择答案
  selectAnswer(e) {
    const { value, type } = e.currentTarget.dataset;
    const currentQuestion = this.getCurrentQuestion();
    
    if (!currentQuestion) return;

    let newAnswers = { ...this.data.answers };
    
    if (type === 'single_select') {
      // 单选题
      newAnswers[currentQuestion.id] = value;
    } else if (type === 'multi_select') {
      // 多选题
      const currentAnswers = newAnswers[currentQuestion.id] || [];
      const maxSelect = currentQuestion.maxSelect || 3;
      
      if (currentAnswers.includes(value)) {
        // 取消选择
        newAnswers[currentQuestion.id] = currentAnswers.filter(item => item !== value);
      } else {
        // 添加选择
        if (currentAnswers.length < maxSelect) {
          newAnswers[currentQuestion.id] = [...currentAnswers, value];
        } else {
          tt.showToast({
            title: `最多只能选择${maxSelect}项`,
            icon: 'none'
          });
          return;
        }
      }
    }

    this.setData({
      answers: newAnswers
    });

    // 更新选项状态
    this.updateCurrentOptions();

    // 记录埋点
    // const analytics = require('../../utils/analytics.js');
    // analytics.trackQuestionnaire(currentQuestion.id, value, {
    //   questionType: type,
    //   questionIndex: this.data.currentQuestionIndex
    // });
  },

  // 输入用户信息
  inputUserInfo(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    this.setData({
      [`userInfo.${field}`]: value
    });
  },

  // 上一题
  prevQuestion() {
    if (this.data.currentQuestionIndex > 0) {
      this.setData({
        currentQuestionIndex: this.data.currentQuestionIndex - 1
      });
      this.updateProgress();
      this.updateCurrentOptions();
    }
  },

  // 下一题
  nextQuestion() {
    const currentQuestion = this.getCurrentQuestion();
    if (!currentQuestion) return;

    // 检查是否已回答
    const currentAnswer = this.data.answers[currentQuestion.id];
    if (!currentAnswer || (Array.isArray(currentAnswer) && currentAnswer.length === 0)) {
      tt.showToast({
        title: '请先回答当前问题',
        icon: 'none'
      });
      return;
    }

    if (this.data.currentQuestionIndex < this.data.questionnaire.questions.length - 1) {
      this.setData({
        currentQuestionIndex: this.data.currentQuestionIndex + 1
      });
      this.updateProgress();
      this.updateCurrentOptions();
    } else {
      this.submitQuestionnaire();
    }
  },

  // 更新进度
  updateProgress() {
    const progress = ((this.data.currentQuestionIndex + 1) / this.data.questionnaire.questions.length) * 100;
    this.setData({
      progress: progress
    });
  },

  // 提交问卷
  async submitQuestionnaire() {
    // 检查是否所有问题都已回答
    const unansweredQuestions = this.data.questionnaire.questions.filter(q => {
      const answer = this.data.answers[q.id];
      return !answer || (Array.isArray(answer) && answer.length === 0);
    });

    if (unansweredQuestions.length > 0) {
      tt.showToast({
        title: `还有${unansweredQuestions.length}个问题未回答`,
        icon: 'none'
      });
      return;
    }

    // 保存问卷数据
    const questionnaireData = {
      userInfo: this.data.userInfo,
      answers: this.data.answers,
      timestamp: new Date().toISOString()
    };

    // 保存到全局数据
    app.globalData.questionnaireData = questionnaireData;
    app.saveUserData();

    // 记录埋点
    // const analytics = require('../../utils/analytics.js');
    // analytics.track('questionnaire_completed', {
    //   questionCount: this.data.questionnaire.questions.length,
    //   timestamp: Date.now()
    // });

    // 跳转到照片上传页
    tt.navigateTo({
      url: '/pages/photo-upload/photo-upload'
    });
  },

  // 跳过当前问题
  skipQuestion() {
    if (this.data.currentQuestionIndex < this.data.questionnaire.questions.length - 1) {
      this.setData({
        currentQuestionIndex: this.data.currentQuestionIndex + 1
      });
      this.updateProgress();
      this.updateCurrentOptions();
    }
  },

  // 返回上一页
  goBack() {
    tt.navigateBack();
  },

  // 判断选项是否被选中
  isOptionSelected(questionId, optionValue) {
    const answer = this.data.answers[questionId];
    if (Array.isArray(answer)) {
      return answer.includes(optionValue);
    }
    return answer === optionValue;
  },

  // 获取当前问题的选项状态
  getCurrentOptions() {
    const currentQuestion = this.getCurrentQuestion();
    if (!currentQuestion) return [];
    
    return currentQuestion.options.map(option => ({
      ...option,
      isSelected: this.isOptionSelected(currentQuestion.id, option.value)
    }));
  },

  // 更新当前选项状态
  updateCurrentOptions() {
    const currentOptions = this.getCurrentOptions();
    this.setData({
      currentOptions: currentOptions
    });
  },

  // 页面显示时更新进度
  onShow() {
    this.updateProgress();
  }
}); 