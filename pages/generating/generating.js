// pages/generating/generating.js - 生成中页面逻辑

const app = getApp();

Page({
  data: {
    progress: 0,
    currentStep: 0,
    steps: [
      { name: '分析问卷数据', icon: '📝', description: '正在分析您的问卷回答...' },
      { name: '处理照片信息', icon: '📸', description: '正在分析上传的照片...' },
      { name: '生成风格报告', icon: '🎨', description: '正在生成个性化风格建议...' },
      { name: '优化推荐内容', icon: '✨', description: '正在优化推荐内容...' }
    ],
    isGenerating: false,
    errorMessage: '',
    showError: false
  },

  onLoad() {
    console.log('生成中页面加载');
    this.startGeneration();
  },

  // 开始生成
  async startGeneration() {
    this.setData({
      isGenerating: true,
      progress: 0,
      currentStep: 0,
      errorMessage: '',
      showError: false
    });

    try {
      // 检查必要数据
      if (!app.globalData.questionnaireData) {
        throw new Error('问卷数据缺失');
      }

      if (!app.globalData.uploadedImages || app.globalData.uploadedImages.length === 0) {
        throw new Error('照片数据缺失');
      }

      console.log('开始生成风格报告...');

      // 步骤1: 分析问卷数据
      await this.updateProgress(0, '分析问卷数据');
      await this.analyzeQuestionnaire();

      // 步骤2: 处理照片信息
      await this.updateProgress(1, '处理照片信息');
      await this.analyzeImages();

      // 步骤3: 生成风格报告
      await this.updateProgress(2, '生成风格报告');
      const report = await this.generateStyleReport();

      // 步骤4: 优化推荐内容
      await this.updateProgress(3, '优化推荐内容');
      await this.optimizeReport(report);

      // 保存报告
      app.globalData.currentReport = report;
      app.saveHistoryReport(report);

      // 跳转到报告页
      setTimeout(() => {
        tt.navigateTo({
          url: '/pages/report/report'
        });
      }, 1000);

    } catch (error) {
      console.error('生成报告失败:', error);
      this.handleError(error.message || '生成报告失败，请重试');
    }
  },

  // 更新进度
  async updateProgress(stepIndex, stepName) {
    const progress = ((stepIndex + 1) / this.data.steps.length) * 100;
    
    this.setData({
      currentStep: stepIndex,
      progress: progress
    });

    console.log(`执行步骤 ${stepIndex + 1}: ${stepName}`);
    
    // 模拟处理时间
    await this.delay(1500 + Math.random() * 1000);
  },

  // 延迟函数
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // 分析问卷数据
  async analyzeQuestionnaire() {
    try {
      const questionnaireData = app.globalData.questionnaireData;
      console.log('分析问卷数据:', questionnaireData);
      
      // 模拟分析
      await this.delay(1000);
      console.log('问卷分析完成');
      
    } catch (error) {
      console.error('问卷分析失败:', error);
      throw new Error('问卷分析失败');
    }
  },

  // 分析照片信息
  async analyzeImages() {
    try {
      const images = app.globalData.uploadedImages;
      console.log('分析照片信息:', images);
      
      // 模拟分析
      await this.delay(1500);
      console.log('照片分析完成');
      
    } catch (error) {
      console.error('照片分析失败:', error);
      throw new Error('照片分析失败');
    }
  },

  // 测试简单AI调用
  async testSimpleAI() {
    try {
      console.log('=== 开始简单AI测试 ===');
      const api = require('../../utils/api.js');
      
      const simplePrompt = "请回答：你好，请用一句话回复。";
      
      const response = await api.callTextAPI(simplePrompt, 0.5);
      console.log('简单AI测试成功:', response);
      return true;
    } catch (error) {
      console.error('简单AI测试失败:', error);
      return false;
    }
  },

  // 生成风格报告
  async generateStyleReport() {
    try {
      console.log('生成风格报告...');
      
      const questionnaireData = app.globalData.questionnaireData;
      const images = app.globalData.uploadedImages;
      
      // 总是尝试调用AI（使用占位照片）
      try {
        console.log('尝试调用真实AI分析...');
        const report = await this.callRealAI(questionnaireData, images);
        console.log('AI分析完成:', report);
        return report;
      } catch (aiError) {
        console.error('AI调用失败，使用问卷分析:', aiError);
        // AI失败时，基于问卷生成结果
        return this.generateReportFromQuestionnaire(questionnaireData);
      }
      
    } catch (error) {
      console.error('生成风格报告失败:', error);
      return this.generateMockReport();
    }
  },

  // 调用真实AI
  async callRealAI(questionnaireData, images) {
    try {
      console.log('开始调用真实AI...');
      
      // 先测试简单AI调用
      const simpleTest = await this.testSimpleAI();
      if (!simpleTest) {
        throw new Error('简单AI测试失败，跳过复杂调用');
      }
      
      const api = require('../../utils/api.js');
      
      // 使用用户上传的照片数据
      console.log('=== 生成报告页面接收到的照片数据 ===');
      console.log('照片数组长度:', images.length);
      console.log('照片数据详情:', images.map((img, index) => ({
        index: index + 1,
        type: img.type,
        hasImageData: !!img.imageData,
        imageDataLength: img.imageData ? img.imageData.length : 0,
        imageDataStart: img.imageData ? img.imageData.substring(0, 50) + '...' : 'none',
        mimeType: img.mimeType
      })));
      
      // 提取base64图片数据
      console.log('=== 开始提取base64图片数据 ===');
      const imageDataList = images.map((image, index) => {
        if (image.imageData && image.imageData.startsWith('data:image')) {
          console.log(`✅ 照片${index + 1}使用base64数据，长度: ${image.imageData.length}`);
          return image.imageData;
        } else {
          console.log(`⚠️ 照片${index + 1}使用占位图片，原因: ${!image.imageData ? '无imageData' : '不是data:image格式'}`);
          return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
        }
      });
      console.log('最终传递给AI的图片数据数量:', imageDataList.length);
      
      // 1. 分析照片
      console.log('=== 开始AI照片分析 ===');
      console.log('准备分析的照片数量:', imageDataList.length);
      const imageAnalysis = await this.analyzeImagesWithAI(api, imageDataList);
      
      // 2. 生成完整报告
      console.log('生成风格报告中...');
      const report = await this.generateReportWithAI(api, questionnaireData, imageAnalysis);
      
      console.log('AI分析完成:', report);
      return report;
      
    } catch (error) {
      console.error('AI调用失败:', error);
      throw error;
    }
  },

  // 使用AI分析照片
  async analyzeImagesWithAI(api, images) {
    try {
      const imagePrompts = [
        "请分析这张照片中人物的肤色特征，包括肤色色调、亮度、饱和度等。重点关注面部和手部的肤色。",
        "请分析这张照片中人物的面部特征和整体气质，包括面部轮廓、五官特点、表情气质等。",
        "请分析这张照片中人物的整体形象，包括身材比例、穿着风格、个人气质等。"
      ];
      
      const analyses = [];
      
      for (let i = 0; i < Math.min(images.length, imagePrompts.length); i++) {
        try {
          console.log(`=== 开始分析照片${i+1} ===`);
          console.log(`照片${i+1}数据长度:`, images[i].length);
          console.log(`照片${i+1}数据开头:`, images[i].substring(0, 50) + '...');
          
          const analysis = await api.callVisionAPI(images[i], imagePrompts[i]);
          analyses.push(analysis);
          console.log(`✅ 照片${i+1}分析完成:`, analysis);
        } catch (error) {
          console.error(`❌ 照片${i+1}分析失败:`, error);
          console.error(`照片${i+1}错误详情:`, error.message);
          analyses.push({ error: '分析失败' });
        }
      }
      
      return analyses;
      
    } catch (error) {
      console.error('照片分析失败:', error);
      throw error;
    }
  },

  // 使用AI生成完整报告
  async generateReportWithAI(api, questionnaireData, imageAnalysis) {
    const maxRetries = 2;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`AI生成报告尝试 ${attempt}/${maxRetries}`);
        
        const prompt = this.buildAIPrompt(questionnaireData, imageAnalysis);
        
        const response = await api.callTextAPI(prompt, 0.5);
        
        console.log('AI原始响应:', response);
        
        // 解析AI返回的JSON
        let report;
        try {
          // 提取AI返回的内容
          const content = response.choices[0].message.content;
          console.log('AI返回内容:', content);
          
          // 尝试解析JSON
          report = JSON.parse(content);
          console.log('解析后的报告:', report);
          
          // 验证报告结构
          if (this.validateReportStructure(report)) {
            return report;
          } else {
            throw new Error('报告结构不完整');
          }
        } catch (parseError) {
          console.error('AI返回格式解析失败:', parseError);
          console.error('原始内容:', response.choices[0].message.content);
          // 如果解析失败，使用备用格式
          report = this.parseAIResponse(response.choices[0].message.content);
          if (report) return report;
        }
        
      } catch (error) {
        console.error(`AI生成报告尝试 ${attempt} 失败:`, error);
        if (attempt === maxRetries) {
          throw error;
        }
        // 等待一秒后重试
        await this.delay(1000);
      }
    }
  },

  // 构建AI提示词
  buildAIPrompt(questionnaireData, imageAnalysis) {
    const answers = questionnaireData.answers;
    
    // 简化照片分析结果
    const simplifiedAnalysis = imageAnalysis.map((analysis, index) => {
      if (analysis.error) return `照片${index+1}: 分析失败`;
      try {
        const content = analysis.choices[0].message.content;
        // 只取前100个字符
        return `照片${index+1}: ${content.substring(0, 100)}...`;
      } catch (e) {
        return `照片${index+1}: 数据格式错误`;
      }
    }).join('\n');
    
    return `基于以下信息生成详细的个人风格分析报告：

## 问卷信息（按权重排序）
**高权重信息（30%）：**
- 颜色偏好(q6): ${answers.q6?.join(', ') || '未选择'} - 用于个性化色彩推荐
- 风格偏好(q1): ${answers.q1?.join(', ') || '未选择'} - 用于风格和材质推荐

**中权重信息（15%）：**
- 生活节奏(q5): ${answers.q5 || '未选择'} - 影响材质实用性选择
- 场合适应性(q2): ${answers.q2 || '未选择'} - 影响单品推荐策略

**低权重信息（5%）：**
- 功能重视(q3): ${answers.q3 || '未选择'} - 影响材质选择倾向
- 搭配注重(q7): ${answers.q7?.join(', ') || '未选择'} - 影响搭配建议

## 照片分析（权重70%）
${simplifiedAnalysis}

**照片分析要求：**
1. 优先选择自然光最充足的照片进行肤色分析
2. 综合多张照片避免光线和相机白平衡误差
3. 分析要素权重：
   - 面部+脖子肤色：25%（色调、亮度、饱和度、底色）
   - 血管颜色：15%（蓝紫为冷，绿色为暖）
   - 面部线条：5%（圆润为暖，棱角为冷）
   - 发色+瞳色：5%（暖棕/冷棕/黑/金/灰）

## 12季色彩分析标准
请根据分析结果，将用户归类为以下12种季型之一：

**春季型：**
- 净春型：明亮鲜艳的暖色调
- 暖春型：温暖明亮的色调  
- 浅春型：浅淡温暖的色调

**夏季型：**
- 柔夏型：柔和的中性色调
- 冷夏型：冷色调的柔和色
- 浅夏型：浅淡的冷色调

**秋季型：**
- 柔秋型：柔和的暖色调
- 暖秋型：温暖的深色调
- 深秋型：深沉的暖色调

**冬季型：**
- 净冬型：明亮鲜艳的冷色调
- 冷冬型：冷色调的深色
- 深冬型：深沉的冷色调

**重要说明：** 以上季型标准仅供参考，实际色彩推荐需要结合用户偏好进行定制化分析。

## 定制化色彩推荐要求
**色彩推荐权重分配：**
- 季型基础色彩：40%（作为基础参考）
- 用户颜色偏好：30%（优先考虑用户喜欢的颜色）
- 肤色适配度：20%（确保与肤色和谐）
- 风格一致性：10%（与整体风格匹配）

**推荐逻辑：**
1. 首先确定用户季型作为基础参考
2. 优先选择用户喜欢的颜色类型
3. 在用户喜欢的颜色范围内，选择最适合肤色的色调
4. 确保推荐的颜色与用户风格偏好一致
5. 最终生成10种定制化颜色，包含用户偏好但避免不合适的颜色

## 分析逻辑要求

**季型判断逻辑：**
1. 基于照片分析确定基础季型（权重70%）
2. 结合问卷颜色偏好微调，但保持季型不变
3. 如果用户喜欢冷色但季型为暖色，推荐该季型中偏冷的颜色

**个性化推荐逻辑：**
1. 色彩推荐：基于季型标准色 + 用户颜色偏好调整
2. 风格推荐：基于问卷风格偏好 + 季型特征
3. 材质推荐：基于风格偏好 + 生活节奏 + 功能需求

**照片分析优先级：**
1. 优先选择自然光充足的照片
2. 综合多张照片避免光线误差
3. 重点关注肤色、血管、面部线条、发色瞳色

## 要求
请生成一份完整的JSON格式报告，包含以下字段：

**重要提示：**
1. 请确保返回的是有效的JSON格式，不要包含其他文字
2. 颜色代码请使用标准的6位十六进制格式（如 #FF6B35）
3. popups字段必须严格按照以下结构返回，不要简化或修改字段名
4. 推荐色板必须包含10种颜色，材质推荐必须包含3种主要材质
5. 文本内容要具体、实用，避免空泛的描述
6. 请保持简洁，避免冗长的描述
7. 色彩推荐要结合用户偏好，不要强制推荐用户不喜欢的颜色

{
  "userProfile": {"questionnaireSummary": "总结", "imageFindings": "发现"},
  "mainColorTone": {"type": "季型（如：暖春型）", "description": "描述", "season": "季节", "temperature": "冷暖"},
  "colorPalette": {"mainColors": ["颜色1", "颜色2"], "extendedPalette": ["扩展1", "扩展2"]},
  "suitableStyle": {"primaryStyle": "主风格", "secondaryStyle": "次风格", "styleKeywords": ["关键词1", "关键词2"], "typicalScenarios": ["场景1", "场景2"], "recommendedItems": {"上衣": ["单品1"], "下装": ["单品2"], "鞋子": ["单品3"]}},
  "recommendedMaterials": {"primary": ["材质1", "材质2", "材质3"], "secondary": ["材质1", "材质2"], "avoid": ["避免1"], "materialDetails": ["详情1"]},
  "avoidanceItems": {"coldTones": {"colors": [], "reason": ""}, "highSaturation": {"colors": [], "reason": ""}, "highContrast": {"combinations": [], "reason": ""}},
  "popups": {
    "colorPalettePopup": {"title": "推荐色板", "description": "描述", "colors": [{"name": "颜色名1", "hex": "#FF0000"}, {"name": "颜色名2", "hex": "#00FF00"}, {"name": "颜色名3", "hex": "#0000FF"}, {"name": "颜色名4", "hex": "#FFFF00"}, {"name": "颜色名5", "hex": "#FF00FF"}, {"name": "颜色名6", "hex": "#00FFFF"}, {"name": "颜色名7", "hex": "#FFA500"}, {"name": "颜色名8", "hex": "#800080"}, {"name": "颜色名9", "hex": "#008000"}, {"name": "颜色名10", "hex": "#FFC0CB"}], "usageTips": "建议"},
    "stylePopup": {"title": "适合风格", "description": "描述", "styleAnalysis": "分析", "styleElements": ["元素1"], "outfitSuggestions": ["建议1"]},
    "materialPopup": {"title": "推荐材质", "description": "描述", "materialAnalysis": "分析", "recommendations": ["推荐1", "推荐2", "推荐3"], "careTips": "护理"}
  },
  "rationale": "分析依据"
}

只返回JSON，不要其他文字。`;
  },

  // 解析AI响应（备用方案）
  parseAIResponse(content) {
    // 如果AI返回的不是标准JSON，尝试提取有用信息
    console.log('使用备用解析方案:', content);
    
    // 返回一个基础报告结构
    return {
      userProfile: {
        questionnaireSummary: {
          stylePreference: 3.2,
          occasionAdaptability: 3.5,
          functionOrientation: 2.8,
          socialInfluenceSensitivity: 2.5,
          lifeRhythm: 2.0,
          colorPreference: "mixed",
          stylingFocus: "comfort_practical",
          purchaseDecisionPattern: "demand_oriented",
          socialScenarios: ["work", "social"]
        },
        imageFindings: {
          skinTone: "mixed",
          undertone: "neutral",
          brightness: "medium",
          saturation: "medium",
          veinColor: "mixed",
          faceFeatures: "natural"
        }
      },
      mainColorTone: {
        type: "AI分析色调",
        description: "基于AI分析的个人色调",
        season: "mixed",
        temperature: "neutral"
      },
      colorPalette: {
        mainColors: [
          { name: "AI推荐色1", hex: "#D4A574", usage: "主色调" },
          { name: "AI推荐色2", hex: "#F4D03F", usage: "提亮色" }
        ],
        extendedPalette: [
          { name: "扩展色1", hex: "#F5F5DC" },
          { name: "扩展色2", hex: "#D3D3D3" }
        ]
      },
      suitableStyle: {
        primaryStyle: "AI推荐风格",
        secondaryStyle: "辅助风格",
        styleKeywords: ["AI分析", "个性化", "专业推荐"],
        typicalScenarios: ["职场", "日常", "约会"],
        recommendedItems: {
          tops: ["AI推荐上衣"],
          bottoms: ["AI推荐下装"],
          accessories: ["AI推荐配饰"],
          shoes: ["AI推荐鞋履"]
        }
      },
      recommendedMaterials: {
        primary: ["AI推荐材质"],
        secondary: ["辅助材质"],
        avoid: ["避免材质"],
        materialDetails: [
          {
            name: "AI推荐材质",
            characteristics: "AI分析特性",
            suitableFor: ["适用单品"],
            reason: "AI推荐理由"
          }
        ]
      },
      avoidanceItems: {
        coldTones: { colors: [], reason: "AI分析" },
        highSaturation: { colors: [], reason: "AI分析" },
        highContrast: { combinations: [], reason: "AI分析" }
      },
      popups: {
        colorPalettePopup: {
          title: "AI推荐色板",
          description: "基于AI分析的个性化色板",
          colors: [],
          usageTips: "AI使用建议"
        },
        stylePopup: {
          title: "AI推荐风格",
          description: "基于AI分析的风格建议",
          styleAnalysis: "AI风格分析",
          styleElements: ["AI元素1", "AI元素2"],
          outfitSuggestions: ["AI搭配建议"]
        },
        materialPopup: {
          title: "AI推荐材质",
          description: "基于AI分析的材质建议",
          materialAnalysis: "AI材质分析",
          recommendations: ["AI材质推荐"],
          careTips: "AI护理建议"
        }
      },
      rationale: "基于AI分析的个人风格报告，结合问卷信息和照片分析结果生成。"
    };
  },

  // 基于问卷生成报告
  generateReportFromQuestionnaire(questionnaireData) {
    console.log('基于问卷生成报告:', questionnaireData);
    console.log('问卷答案:', questionnaireData.answers);
    
    // 分析问卷答案，生成不同的结果
    const result = this.analyzeQuestionnaireAnswers(questionnaireData.answers);
    
    return {
      userProfile: {
        questionnaireSummary: result.summary,
        imageFindings: {
          skinTone: result.skinTone,
          undertone: result.undertone,
          brightness: "medium",
          saturation: "medium",
          veinColor: result.veinColor,
          faceFeatures: result.faceFeatures
        }
      },
      mainColorTone: {
        type: result.colorTone,
        description: result.colorDescription,
        season: result.season,
        temperature: result.temperature
      },
      colorPalette: result.colorPalette,
      suitableStyle: result.suitableStyle,
      recommendedMaterials: result.recommendedMaterials,
      avoidanceItems: result.avoidanceItems,
      popups: result.popups,
      rationale: result.rationale
    };
  },

  // 分析问卷答案
  analyzeQuestionnaireAnswers(answers) {
    console.log('开始分析问卷答案:', answers);
    
    // 基于问卷答案生成不同的结果
    const colorChoices = answers.q6 || [];
    const styleChoices = answers.q1 || [];
    const occasionAdaptability = answers.q2;
    const functionOrientation = answers.q3;
    const socialInfluence = answers.q4;
    const lifeRhythm = answers.q5;
    const stylingFocus = answers.q7 || [];
    const purchasePattern = answers.q8 || [];
    const socialScenarios = answers.q9;
    
    console.log('颜色选择:', colorChoices);
    console.log('风格选择:', styleChoices);
    
    // 根据颜色选择判断色调
    let colorTone, season, temperature, skinTone, undertone, veinColor;
    
    if (colorChoices.includes('明黄') || colorChoices.includes('橙红')) {
      colorTone = "春季暖色调";
      season = "spring";
      temperature = "warm";
      skinTone = "warm_yellow";
      undertone = "warm";
      veinColor = "green";
    } else if (colorChoices.includes('天蓝') || colorChoices.includes('深蓝')) {
      colorTone = "夏季冷色调";
      season = "summer";
      temperature = "cool";
      skinTone = "cool_pink";
      undertone = "cool";
      veinColor = "blue";
    } else if (colorChoices.includes('森绿') || colorChoices.includes('橄榄')) {
      colorTone = "秋季暖色调";
      season = "autumn";
      temperature = "warm";
      skinTone = "warm_yellow";
      undertone = "warm";
      veinColor = "green";
    } else if (colorChoices.includes('深蓝') || colorChoices.includes('紫灰')) {
      colorTone = "冬季冷色调";
      season = "winter";
      temperature = "cool";
      skinTone = "cool_pink";
      undertone = "cool";
      veinColor = "blue";
    } else {
      // 默认秋季
      colorTone = "秋季暖色调";
      season = "autumn";
      temperature = "warm";
      skinTone = "warm_yellow";
      undertone = "warm";
      veinColor = "green";
    }
    
    // 根据风格选择判断主风格
    let primaryStyle, secondaryStyle;
    if (styleChoices.includes('经典优雅')) {
      primaryStyle = "经典优雅";
      secondaryStyle = "休闲舒适";
    } else if (styleChoices.includes('时尚前卫')) {
      primaryStyle = "时尚前卫";
      secondaryStyle = "个性独特";
    } else if (styleChoices.includes('休闲舒适')) {
      primaryStyle = "休闲舒适";
      secondaryStyle = "经典优雅";
    } else if (styleChoices.includes('甜美可爱')) {
      primaryStyle = "甜美可爱";
      secondaryStyle = "休闲舒适";
    } else {
      primaryStyle = "经典优雅";
      secondaryStyle = "休闲舒适";
    }
    
    return {
      summary: {
        stylePreference: 3.2,
        occasionAdaptability: 3.5,
        functionOrientation: 2.8,
        socialInfluenceSensitivity: 2.5,
        lifeRhythm: 2.0,
        colorPreference: temperature,
        stylingFocus: "comfort_practical",
        purchaseDecisionPattern: "demand_oriented",
        socialScenarios: ["work", "social"]
      },
      skinTone,
      undertone,
      veinColor,
      faceFeatures: "natural_warm",
      colorTone,
      colorDescription: `肤色偏${temperature === 'warm' ? '黄' : '粉'},${temperature === 'warm' ? '温暖' : '清爽'}而富有质感`,
      season,
      temperature,
      colorPalette: this.generateColorPalette(season),
      suitableStyle: {
        primaryStyle,
        secondaryStyle,
        styleKeywords: ["自然", "质感", "和谐", "实用"],
        typicalScenarios: ["职场", "日常", "约会", "旅行"],
        recommendedItems: {
          tops: ["亚麻衬衫", "针织毛衣", "西装外套"],
          bottoms: ["直筒裤", "A字裙", "工装裤"],
          accessories: ["皮质包袋", "金属配饰", "丝巾"],
          shoes: ["乐福鞋", "小白鞋", "短靴"]
        }
      },
      recommendedMaterials: {
        primary: ["亚麻", "棉", "针织"],
        secondary: ["羊毛", "丝绸", "牛仔"],
        avoid: ["亮面材质", "荧光色面料"],
        materialDetails: [
          {
            name: "亚麻",
            characteristics: "透气、自然、质感",
            suitableFor: ["衬衫", "外套", "裤子"],
            reason: "与您的自然气质相契合"
          }
        ]
      },
      avoidanceItems: {
        coldTones: {
          colors: ["纯黑", "纯白", "亮蓝", "紫色"],
          reason: "会让肤色显得暗沉"
        },
        highSaturation: {
          colors: ["荧光色"],
          reason: "与您的自然气质形成冲突"
        },
        highContrast: {
          combinations: ["黑白强对比"],
          reason: "不利于展现您的和谐气质"
        }
      },
      popups: this.generatePopups(colorTone, primaryStyle),
      rationale: `基于您的问卷回答，您属于${colorTone}类型。问卷显示您偏好${primaryStyle}风格，注重舒适实用性，生活节奏适中。因此推荐${temperature === 'warm' ? '暖' : '冷'}色系、自然材质、${primaryStyle}的穿搭风格。`
    };
  },

  // 生成色板
  generateColorPalette(season) {
    const palettes = {
      spring: {
        mainColors: [
          { name: "樱花粉", hex: "#FFB7C5", usage: "主色调，适合外套和配饰" },
          { name: "薄荷绿", hex: "#98FB98", usage: "提亮色，适合内搭" },
          { name: "珊瑚橙", hex: "#FF7F50", usage: "深色系，适合下装" },
          { name: "天空蓝", hex: "#87CEEB", usage: "基础色，适合鞋包" }
        ],
        extendedPalette: [
          { name: "米白", hex: "#F5F5DC" },
          { name: "浅黄", hex: "#FFFFE0" },
          { name: "淡紫", hex: "#E6E6FA" },
          { name: "浅绿", hex: "#90EE90" },
          { name: "杏色", hex: "#FFE4B5" },
          { name: "天蓝", hex: "#87CEEB" }
        ]
      },
      summer: {
        mainColors: [
          { name: "薰衣草紫", hex: "#E6E6FA", usage: "主色调，适合外套和配饰" },
          { name: "天空蓝", hex: "#87CEEB", usage: "提亮色，适合内搭" },
          { name: "玫瑰粉", hex: "#FFB6C1", usage: "深色系，适合下装" },
          { name: "薄荷绿", hex: "#98FB98", usage: "基础色，适合鞋包" }
        ],
        extendedPalette: [
          { name: "纯白", hex: "#FFFFFF" },
          { name: "浅灰", hex: "#D3D3D3" },
          { name: "淡蓝", hex: "#ADD8E6" },
          { name: "浅粉", hex: "#FFC0CB" },
          { name: "银灰", hex: "#C0C0C0" },
          { name: "淡紫", hex: "#DDA0DD" }
        ]
      },
      autumn: {
        mainColors: [
          { name: "暖金色", hex: "#D4A574", usage: "主色调，适合外套和配饰" },
          { name: "杏黄", hex: "#F4D03F", usage: "提亮色，适合内搭" },
          { name: "赭石", hex: "#8B4513", usage: "深色系，适合下装" },
          { name: "深棕", hex: "#654321", usage: "基础色，适合鞋包" }
        ],
        extendedPalette: [
          { name: "米白", hex: "#F5F5DC" },
          { name: "浅灰", hex: "#D3D3D3" },
          { name: "橄榄绿", hex: "#6B8E23" },
          { name: "深红", hex: "#8B0000" },
          { name: "驼色", hex: "#DEB887" },
          { name: "卡其", hex: "#F4A460" }
        ]
      },
      winter: {
        mainColors: [
          { name: "纯黑", hex: "#000000", usage: "主色调，适合外套和配饰" },
          { name: "纯白", hex: "#FFFFFF", usage: "提亮色，适合内搭" },
          { name: "深蓝", hex: "#000080", usage: "深色系，适合下装" },
          { name: "深红", hex: "#8B0000", usage: "基础色，适合鞋包" }
        ],
        extendedPalette: [
          { name: "纯白", hex: "#FFFFFF" },
          { name: "深灰", hex: "#696969" },
          { name: "深紫", hex: "#800080" },
          { name: "深绿", hex: "#006400" },
          { name: "深蓝", hex: "#000080" },
          { name: "深红", hex: "#8B0000" }
        ]
      }
    };
    
    return palettes[season] || palettes.autumn;
  },

  // 生成弹窗内容
  generatePopups(colorTone, primaryStyle) {
    return {
      colorPalettePopup: {
        title: "推荐色板",
        description: "为您精选的10个最适合的颜色",
        colors: this.generateColorPalette(colorTone.includes('春季') ? 'spring' : 
                                        colorTone.includes('夏季') ? 'summer' : 
                                        colorTone.includes('秋季') ? 'autumn' : 'winter').extendedPalette,
        usageTips: "建议将这些颜色作为您衣橱的主色调"
      },
      stylePopup: {
        title: "适合风格",
        description: "基于您的个人特质推荐的风格方向",
        styleAnalysis: `您属于${primaryStyle}型，适合简约而不失质感的穿搭`,
        styleElements: ["线条简洁", "材质自然", "色彩和谐"],
        outfitSuggestions: [
          "亚麻衬衫 + 直筒裤 + 乐福鞋",
          "针织毛衣 + A字裙 + 小白鞋",
          "西装外套 + 工装裤 + 短靴"
        ]
      },
      materialPopup: {
        title: "推荐材质",
        description: "最适合您的面料选择",
        materialAnalysis: "天然材质最能体现您的质感",
        recommendations: [
          "亚麻：透气自然，适合春夏",
          "棉质：舒适亲肤，四季适用",
          "针织：柔软温暖，秋冬必备"
        ],
        careTips: "建议选择易于打理的天然面料"
      }
    };
  },

  // 生成模拟报告（保留作为备用）
  generateMockReport() {
    return {
      userProfile: {
        questionnaireSummary: {
          stylePreference: 3.2,
          occasionAdaptability: 3.5,
          functionOrientation: 2.8,
          socialInfluenceSensitivity: 2.5,
          lifeRhythm: 2.0,
          colorPreference: "warm",
          stylingFocus: "comfort_practical",
          purchaseDecisionPattern: "demand_oriented",
          socialScenarios: ["work", "social"]
        },
        imageFindings: {
          skinTone: "warm_yellow",
          undertone: "warm",
          brightness: "medium",
          saturation: "medium",
          veinColor: "green",
          faceFeatures: "natural_warm"
        }
      },
      mainColorTone: {
        type: "秋季暖色调",
        description: "肤色偏黄,温暖而富有质感",
        season: "autumn",
        temperature: "warm"
      },
      colorPalette: {
        mainColors: [
          { name: "暖金色", hex: "#D4A574", usage: "主色调，适合外套和配饰" },
          { name: "杏黄", hex: "#F4D03F", usage: "提亮色，适合内搭" },
          { name: "赭石", hex: "#8B4513", usage: "深色系，适合下装" },
          { name: "深棕", hex: "#654321", usage: "基础色，适合鞋包" }
        ],
        extendedPalette: [
          { name: "米白", hex: "#F5F5DC" },
          { name: "浅灰", hex: "#D3D3D3" },
          { name: "橄榄绿", hex: "#6B8E23" },
          { name: "深红", hex: "#8B0000" },
          { name: "驼色", hex: "#DEB887" },
          { name: "卡其", hex: "#F4A460" }
        ]
      },
      suitableStyle: {
        primaryStyle: "经典优雅",
        secondaryStyle: "休闲舒适",
        styleKeywords: ["自然", "质感", "和谐", "实用"],
        typicalScenarios: ["职场", "日常", "约会", "旅行"],
        recommendedItems: {
          tops: ["亚麻衬衫", "针织毛衣", "西装外套"],
          bottoms: ["直筒裤", "A字裙", "工装裤"],
          accessories: ["皮质包袋", "金属配饰", "丝巾"],
          shoes: ["乐福鞋", "小白鞋", "短靴"]
        }
      },
      recommendedMaterials: {
        primary: ["亚麻", "棉", "针织"],
        secondary: ["羊毛", "丝绸", "牛仔"],
        avoid: ["亮面材质", "荧光色面料"],
        materialDetails: [
          {
            name: "亚麻",
            characteristics: "透气、自然、质感",
            suitableFor: ["衬衫", "外套", "裤子"],
            reason: "与您的自然气质相契合"
          }
        ]
      },
      avoidanceItems: {
        coldTones: {
          colors: ["纯黑", "纯白", "亮蓝", "紫色"],
          reason: "会让肤色显得暗沉"
        },
        highSaturation: {
          colors: ["荧光色"],
          reason: "与您的自然气质形成冲突"
        },
        highContrast: {
          combinations: ["黑白强对比"],
          reason: "不利于展现您的和谐气质"
        }
      },
      popups: {
        colorPalettePopup: {
          title: "推荐色板",
          description: "为您精选的10个最适合的颜色",
          colors: [
            { name: "暖金色", hex: "#D4A574" },
            { name: "杏黄", hex: "#F4D03F" },
            { name: "赭石", hex: "#8B4513" },
            { name: "深棕", hex: "#654321" },
            { name: "米白", hex: "#F5F5DC" },
            { name: "浅灰", hex: "#D3D3D3" },
            { name: "橄榄绿", hex: "#6B8E23" },
            { name: "深红", hex: "#8B0000" },
            { name: "驼色", hex: "#DEB887" },
            { name: "卡其", hex: "#F4A460" }
          ],
          usageTips: "建议将这些颜色作为您衣橱的主色调"
        },
        stylePopup: {
          title: "适合风格",
          description: "基于您的个人特质推荐的风格方向",
          styleAnalysis: "您属于自然优雅型，适合简约而不失质感的穿搭",
          styleElements: ["线条简洁", "材质自然", "色彩和谐"],
          outfitSuggestions: [
            "亚麻衬衫 + 直筒裤 + 乐福鞋",
            "针织毛衣 + A字裙 + 小白鞋",
            "西装外套 + 工装裤 + 短靴"
          ]
        },
        materialPopup: {
          title: "推荐材质",
          description: "最适合您的面料选择",
          materialAnalysis: "天然材质最能体现您的质感",
          recommendations: [
            "亚麻：透气自然，适合春夏",
            "棉质：舒适亲肤，四季适用",
            "针织：柔软温暖，秋冬必备"
          ],
          careTips: "建议选择易于打理的天然面料"
        }
      },
      rationale: "基于您的问卷回答和照片分析，您属于秋季暖色调类型。问卷显示您偏好经典优雅风格，注重舒适实用性，生活节奏适中。照片分析显示您的肤色偏黄，温暖而富有质感。因此推荐暖色系、自然材质、简约优雅的穿搭风格。"
    };
  },

  // 验证报告结构
  validateReportStructure(report) {
    const requiredFields = [
      'userProfile', 'mainColorTone', 'colorPalette', 'suitableStyle', 
      'recommendedMaterials', 'avoidanceItems', 'popups'
    ];
    
    const requiredPopups = [
      'colorPalettePopup', 'stylePopup', 'materialPopup'
    ];
    
    // 检查主要字段
    for (const field of requiredFields) {
      if (!report[field]) {
        console.error(`缺少必需字段: ${field}`);
        return false;
      }
    }
    
    // 检查popups字段
    if (!report.popups) {
      console.error('缺少popups字段');
      return false;
    }
    
    for (const popup of requiredPopups) {
      if (!report.popups[popup]) {
        console.error(`缺少popup字段: ${popup}`);
        return false;
      }
    }
    
    // 检查颜色数组
    if (!report.popups.colorPalettePopup.colors || 
        !Array.isArray(report.popups.colorPalettePopup.colors) ||
        report.popups.colorPalettePopup.colors.length === 0) {
      console.error('缺少颜色数组');
      return false;
    }
    
    console.log('报告结构验证通过');
    return true;
  },

  // 解析AI响应的备用方法
  parseAIResponse(content) {
    console.log('使用备用解析方法解析:', content);
    
    // 尝试从内容中提取JSON部分
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error('备用JSON解析失败:', e);
      }
    }
    
    // 如果无法解析，返回默认报告
    console.log('无法解析AI响应，使用默认报告');
    return this.generateMockReport();
  },

  // 优化报告
  async optimizeReport(report) {
    try {
      console.log('优化报告内容...');
      
      // 模拟优化
      await this.delay(1000);
      console.log('报告优化完成');
      
    } catch (error) {
      console.error('报告优化失败:', error);
    }
  },

  // 处理错误
  handleError(message) {
    this.setData({
      isGenerating: false,
      errorMessage: message,
      showError: true
    });
  },

  // 重试
  retry() {
    this.setData({
      showError: false,
      errorMessage: ''
    });
    this.startGeneration();
  },

  // 返回上一页
  goBack() {
    tt.navigateBack();
  },

  // 调试函数 - 查看当前数据
  debugData() {
    console.log('=== 调试信息 ===');
    console.log('全局数据:', app.globalData);
    console.log('问卷数据:', app.globalData.questionnaireData);
    console.log('上传图片:', app.globalData.uploadedImages);
    
    tt.showModal({
      title: '调试信息',
      content: `问卷数据: ${JSON.stringify(app.globalData.questionnaireData, null, 2)}`,
      showCancel: false
    });
  }
}); 