// pages/shopping/shopping.js - 购物建议页面逻辑

const app = getApp();

Page({
  data: {
    userReport: null,
    uploadedItem: null,
    analysisResult: null,
    isLoading: false,
    currentStep: 'upload', // upload, analyzing, result
  },

  onLoad(options) {
    console.log('购物建议页面 onLoad, options:', options);
    
    // 如果是从历史记录跳转过来显示结果
    if (options.showResult && app.globalData.currentShoppingAdvice) {
      console.log('显示历史购物建议');
      this.showHistoryResult(app.globalData.currentShoppingAdvice);
    } else {
      // 只有不是显示历史结果时才加载用户报告
      this.loadUserReport();
    }
  },

  onShow() {
    console.log('购物建议页面 onShow');
    // 只有在没有显示历史结果时才重新加载用户报告
    if (!this.data.analysisResult) {
      this.loadUserReport();
    }
  },

  // 加载用户最近的分析报告
  loadUserReport() {
    try {
      // 优先使用当前报告，如果没有则从历史记录中获取最新的
      let report = app.globalData.currentReport;
      
      if (!report) {
        const historyReports = tt.getStorageSync('historyReports') || [];
        if (historyReports.length > 0) {
          report = historyReports[historyReports.length - 1]; // 最新的报告
        }
      }

      if (report) {
        this.setData({ userReport: report });
        console.log('加载用户报告:', report.mainColorTone.type);
      } else {
        this.showNoReportModal();
      }
    } catch (error) {
      console.error('加载用户报告失败:', error);
      this.showNoReportModal();
    }
  },

  // 显示无报告提示
  showNoReportModal() {
    tt.showModal({
      title: '需要先进行风格分析',
      content: '购物建议功能需要基于您的个人风格分析结果。请先完成一次风格分析。',
      confirmText: '去分析',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          tt.navigateTo({
            url: '/pages/index/index'
          });
        }
      }
    });
  },

  // 测试网络连接
  async testNetwork() {
    try {
      console.log('=== 测试网络连接 ===');
      
      // 测试基本网络连接
      const testUrl = 'https://httpbin.org/get';
      
      console.log('测试网络请求到:', testUrl);
      
      const result = await new Promise((resolve, reject) => {
        tt.request({
          url: testUrl,
          method: 'GET',
          timeout: 10000,
          success: (response) => {
            console.log('网络测试成功:', response);
            resolve(response);
          },
          fail: (error) => {
            console.error('网络测试失败:', error);
            reject(error);
          }
        });
      });
      
      tt.showModal({
        title: '网络测试成功',
        content: '网络连接正常，可以访问外部API',
        showCancel: false
      });
      
    } catch (error) {
      console.error('网络测试失败:', error);
      tt.showModal({
        title: '网络测试失败',
        content: '网络连接有问题，请检查网络设置',
        showCancel: false
      });
    }
  },

  // 上传商品图片
  uploadItemImage() {
    if (!this.data.userReport) {
      this.showNoReportModal();
      return;
    }

    this.setData({ isLoading: true });

    // 尝试真实上传，如果失败则使用模拟数据
    this.chooseImage();
  },

  // 选择图片
  chooseImage() {
    console.log('=== 开始选择商品图片 ===');
    
    tt.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        console.log('选择图片成功:', res);
        console.log('图片路径:', res.tempFilePaths);
        if (res.tempFilePaths && res.tempFilePaths.length > 0) {
          const imagePath = res.tempFilePaths[0];
          console.log('准备分析图片:', imagePath);
          this.analyzeImageWithAI(imagePath);
        } else {
          console.error('没有获取到图片路径');
          this.useMockData();
        }
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
        console.error('错误详情:', err.errMsg);
        // 如果选择图片失败，使用模拟数据
        this.useMockData();
      }
    });
  },

  // 使用AI分析图片
  async analyzeImageWithAI(imagePath) {
    try {
      console.log('=== 开始AI分析商品图片 ===');
      console.log('图片路径:', imagePath);
      console.log('图片路径类型:', typeof imagePath);
      console.log('图片路径是否以ttfile开头:', imagePath.startsWith('ttfile://'));
      console.log('图片路径是否以data:image开头:', imagePath.startsWith('data:image'));
      
      // 先设置图片到界面，让用户看到
      const tempItem = {
        name: '正在分析...',
        colors: ['#CCCCCC'],
        style: 'analyzing',
        material: 'analyzing',
        type: 'analyzing',
        imageUrl: imagePath
      };
      
      this.setData({
        uploadedItem: tempItem,
        currentStep: 'analyzing',
        isLoading: false
      });

      // 调用豆包视觉API分析图片
      const api = require('../../utils/api.js');
      console.log('API模块加载成功');
      
      const prompt = `请仔细分析这张商品图片，提取以下信息：

1. 商品类型：请准确判断是以下哪种类型
   - 上衣：衬衫、T恤、毛衣、卫衣等
   - 下装：裤子、牛仔裤、半身裙、短裙等
   - 连衣裙：连身裙、长裙等
   - 外套：夹克、大衣、风衣等
   - 鞋子：各种鞋类
   - 配饰：包包、帽子、围巾等

2. 主要颜色：提取图片中最明显的3-5个颜色，使用十六进制代码（如#FF0000）

3. 风格特征：经典/休闲/优雅/甜美/正式/时尚/可爱/运动等

4. 材质类型：棉质/牛仔/丝绸/皮革/羊毛/聚酯纤维/针织等

5. 商品名称：具体的商品名称，如"彩色半身裙"、"白色衬衫"等

请严格按照以下JSON格式返回，不要添加其他文字：
{
  "type": "商品类型",
  "colors": ["#颜色1", "#颜色2", "#颜色3"],
  "style": "风格",
  "material": "材质",
  "name": "商品名称"
}`;

      console.log('发送AI请求，提示词:', prompt);
      console.log('准备调用API，图片路径:', imagePath);
      
      // 将本地图片路径转换为base64
      console.log('=== 开始转换图片为base64 ===');
      const base64Image = await this.convertImageToBase64(imagePath);
      console.log('✅ 转换后的base64图片长度:', base64Image.length);
      console.log('✅ 转换后的base64图片开头:', base64Image.substring(0, 50) + '...');
      
      // 强制调用AI，不使用模拟数据
      console.log('=== 开始调用AI分析 ===');
      console.log('发送给AI的base64长度:', base64Image.length);
      const imageAnalysis = await api.callVisionAPI(base64Image, prompt);
      
      console.log('=== AI分析结果 ===');
      console.log('AI响应详情:', imageAnalysis);
      
      if (imageAnalysis && imageAnalysis.choices && imageAnalysis.choices[0]) {
        const content = imageAnalysis.choices[0].message.content;
        console.log('AI返回内容:', content);
        
        const itemData = this.parseAIResponse(content);
        console.log('解析后的商品数据:', itemData);
        
        if (itemData) {
          const item = {
            ...itemData,
            imageUrl: imagePath
          };
          
          console.log('最终商品数据:', item);
          this.setData({ uploadedItem: item });
          this.analyzeItem(item);
        } else {
          throw new Error('AI返回数据格式错误');
        }
      } else {
        console.error('AI返回数据格式异常:', imageAnalysis);
        throw new Error('AI分析失败');
      }
    } catch (error) {
      console.error('AI分析失败:', error);
      console.error('错误详情:', error.message);
      console.error('错误堆栈:', error.stack);
      // 如果AI分析失败，使用模拟数据但保留图片
      this.useMockDataWithImage(imagePath);
    }
  },

  // 将图片转换为base64
  convertImageToBase64(imagePath) {
    return new Promise((resolve, reject) => {
      console.log('=== convertImageToBase64 开始 ===');
      console.log('输入图片路径:', imagePath);
      console.log('路径类型:', typeof imagePath);
      
      // 读取图片文件
      tt.getFileSystemManager().readFile({
        filePath: imagePath,
        encoding: 'base64',
        success: (res) => {
          console.log('✅ 图片读取成功');
          console.log('原始base64长度:', res.data.length);
          console.log('原始base64开头:', res.data.substring(0, 20) + '...');
          const base64Data = `data:image/jpeg;base64,${res.data}`;
          console.log('✅ 最终data URL长度:', base64Data.length);
          console.log('✅ 最终data URL开头:', base64Data.substring(0, 50) + '...');
          resolve(base64Data);
        },
        fail: (error) => {
          console.error('❌ 图片读取失败:', error);
          console.error('错误详情:', error.errMsg);
          reject(error);
        }
      });
    });
  },

  // 解析AI返回的数据
  parseAIResponse(content) {
    try {
      console.log('开始解析AI响应:', content);
      
      // 尝试直接解析JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        console.log('找到JSON字符串:', jsonStr);
        const parsed = JSON.parse(jsonStr);
        console.log('JSON解析成功:', parsed);
        return parsed;
      }
      
      console.log('未找到JSON格式，尝试文本解析');
      
      // 如果直接解析失败，尝试提取信息
      const itemData = {
        type: 'unknown',
        colors: ['#FFFFFF'],
        style: 'classic',
        material: 'cotton',
        name: '商品'
      };
      
      // 提取颜色
      const colorMatches = content.match(/#[0-9A-Fa-f]{6}/g);
      if (colorMatches) {
        itemData.colors = colorMatches.slice(0, 5);
        console.log('提取到颜色:', itemData.colors);
      }
      
      // 提取类型
      if (content.includes('连衣裙') || content.includes('裙子')) {
        itemData.type = 'dress';
        itemData.name = '连衣裙';
      } else if (content.includes('上衣') || content.includes('衬衫') || content.includes('T恤') || content.includes('毛衣')) {
        itemData.type = 'top';
        itemData.name = '上衣';
      } else if (content.includes('下装') || content.includes('裤子') || content.includes('牛仔裤')) {
        itemData.type = 'bottom';
        itemData.name = '下装';
      } else if (content.includes('外套') || content.includes('大衣') || content.includes('夹克')) {
        itemData.type = 'outerwear';
        itemData.name = '外套';
      } else if (content.includes('鞋子') || content.includes('鞋') || content.includes('靴子')) {
        itemData.type = 'shoes';
        itemData.name = '鞋子';
      } else if (content.includes('配饰') || content.includes('包') || content.includes('帽子') || content.includes('包包')) {
        itemData.type = 'accessory';
        itemData.name = '配饰';
      }
      
      // 提取风格
      if (content.includes('甜美') || content.includes('可爱') || content.includes('少女')) {
        itemData.style = 'feminine';
      } else if (content.includes('休闲') || content.includes('舒适') || content.includes('日常')) {
        itemData.style = 'casual';
      } else if (content.includes('优雅') || content.includes('正式') || content.includes('商务')) {
        itemData.style = 'elegant';
      } else if (content.includes('经典') || content.includes('传统')) {
        itemData.style = 'classic';
      }
      
      // 提取材质
      if (content.includes('丝绸') || content.includes('丝质')) {
        itemData.material = 'silk';
      } else if (content.includes('牛仔') || content.includes('丹宁')) {
        itemData.material = 'denim';
      } else if (content.includes('皮革') || content.includes('皮质')) {
        itemData.material = 'leather';
      } else if (content.includes('羊毛') || content.includes('毛呢')) {
        itemData.material = 'wool';
      } else if (content.includes('棉质') || content.includes('棉')) {
        itemData.material = 'cotton';
      }
      
      console.log('文本解析结果:', itemData);
      return itemData;
    } catch (error) {
      console.error('解析AI响应失败:', error);
      return null;
    }
  },

  // 使用模拟数据（备用方案）
  useMockData() {
    console.log('=== 使用模拟商品数据 ===');
    console.log('原因：AI分析失败或未调用');
    
    const mockItem = {
      name: '经典白色衬衫',
      colors: ['#FFFFFF', '#F5F5F5', '#E8E8E8'],
      style: 'classic',
      material: 'cotton',
      type: 'top',
      imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    };
    
    this.setData({
      uploadedItem: mockItem,
      currentStep: 'analyzing',
      isLoading: false
    });

    // 模拟分析过程
    setTimeout(() => {
      this.analyzeItem(mockItem);
    }, 2000);
  },

  // 使用模拟数据但保留用户上传的图片
  useMockDataWithImage(imagePath) {
    console.log('=== 使用模拟数据但保留图片 ===');
    console.log('保留的图片路径:', imagePath);
    
    const mockItem = {
      name: '商品分析中...',
      colors: ['#FF6B6B', '#4ECDC4', '#45B7D1'],
      style: 'casual',
      material: 'cotton',
      type: 'top',
      imageUrl: imagePath
    };
    
    this.setData({
      uploadedItem: mockItem,
      currentStep: 'analyzing',
      isLoading: false
    });

    // 模拟分析过程
    setTimeout(() => {
      this.analyzeItem(mockItem);
    }, 2000);
  },

  // 分析商品是否适合
  async analyzeItem(item) {
    console.log('=== 开始分析商品 ===');
    console.log('商品数据:', item);
    console.log('用户报告:', this.data.userReport);
    
    const report = this.data.userReport;
    const analysis = this.performAnalysis(item, report);
    
    console.log('分析完成，结果:', analysis);
    
    // 强制更新数据
          // 预先计算百分比
      const analysisWithPercent = {
        ...analysis,
        scorePercent: Math.round(analysis.score * 100),
        colorMatchPercent: Math.round(analysis.colorMatch * 100),
        styleMatchPercent: Math.round(analysis.styleMatch * 100),
        materialMatchPercent: Math.round(analysis.materialMatch * 100)
      };
      
      console.log('添加百分比后的analysis对象:', analysisWithPercent);
      
      this.setData({
        analysisResult: analysisWithPercent,
        currentStep: 'result',
        isLoading: false
      }, async () => {
      console.log('数据更新完成');
      console.log('当前analysisResult:', this.data.analysisResult);
      console.log('分数详情:');
      console.log('- 总分:', analysis.score, '(', Math.round(analysis.score * 100) + '%)');
      console.log('- 颜色匹配:', analysis.colorMatch, '(', Math.round(analysis.colorMatch * 100) + '%)');
      console.log('- 风格匹配:', analysis.styleMatch, '(', Math.round(analysis.styleMatch * 100) + '%)');
      console.log('- 材质匹配:', analysis.materialMatch, '(', Math.round(analysis.materialMatch * 100) + '%)');
      
      // 保存购物建议到历史记录
      console.log('=== 准备保存购物建议 ===');
      console.log('保存前的analysis对象:', analysis);
      console.log('保存前的analysis.score类型:', typeof analysis.score, '值:', analysis.score);
      console.log('保存前的analysis.colorMatch类型:', typeof analysis.colorMatch, '值:', analysis.colorMatch);
      console.log('保存前的analysis.styleMatch类型:', typeof analysis.styleMatch, '值:', analysis.styleMatch);
      console.log('保存前的analysis.materialMatch类型:', typeof analysis.materialMatch, '值:', analysis.materialMatch);
              await this.saveShoppingAdvice(item, analysis);
    });
  },

  // 执行分析算法
  performAnalysis(item, report) {
    const result = {
      score: 0,
      recommendation: '',
      reasons: [],
      colorMatch: 0,
      styleMatch: 0,
      materialMatch: 0,
      overallRating: '',
      suggestions: []
    };

    // 1. 颜色匹配分析 (权重40%)
    result.colorMatch = this.analyzeColorMatch(item.colors, report);
    result.score += result.colorMatch * 0.4;

    // 2. 风格匹配分析 (权重35%)
    result.styleMatch = this.analyzeStyleMatch(item.style, report);
    result.score += result.styleMatch * 0.35;

    // 3. 材质匹配分析 (权重25%)
    result.materialMatch = this.analyzeMaterialMatch(item.material, report);
    result.score += result.materialMatch * 0.25;

    // 4. 生成推荐结果
    result.overallRating = this.getOverallRating(result.score);
    result.recommendation = this.generateRecommendation(result);
    result.reasons = this.generateReasons(result, item, report);
    result.suggestions = this.generateSuggestions(result, item, report);

    return result;
  },

  // 颜色匹配分析
  analyzeColorMatch(itemColors, report) {
    console.log('分析颜色匹配:', itemColors, report.colorPalette);
    
    const userColors = report.colorPalette.mainColors || [];
    const userExtendedColors = report.colorPalette.extendedPalette || [];
    const allUserColors = [...userColors, ...userExtendedColors];
    
    if (allUserColors.length === 0) {
      console.log('没有用户颜色数据，返回默认值');
      return 0.5;
    }
    
    let matchScore = 0;
    let matchCount = 0;

    itemColors.forEach(itemColor => {
      allUserColors.forEach(userColor => {
        if (this.isColorSimilar(itemColor, userColor)) {
          matchCount++;
        }
      });
    });

    matchScore = Math.min(matchCount / itemColors.length, 1);
    console.log('颜色匹配分数:', matchScore);
    return matchScore;
  },

  // 颜色相似度判断
  isColorSimilar(color1, color2) {
    // 简化的颜色相似度算法
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');
    
    // 转换为RGB
    const r1 = parseInt(hex1.substr(0, 2), 16);
    const g1 = parseInt(hex1.substr(2, 2), 16);
    const b1 = parseInt(hex1.substr(4, 2), 16);
    
    const r2 = parseInt(hex2.substr(0, 2), 16);
    const g2 = parseInt(hex2.substr(2, 2), 16);
    const b2 = parseInt(hex2.substr(4, 2), 16);
    
    // 计算欧几里得距离
    const distance = Math.sqrt(
      Math.pow(r1 - r2, 2) + 
      Math.pow(g1 - g2, 2) + 
      Math.pow(b1 - b2, 2)
    );
    
    // 距离越小越相似，阈值设为100
    return distance < 100;
  },

  // 风格匹配分析
  analyzeStyleMatch(itemStyle, report) {
    console.log('分析风格匹配:', itemStyle, report.suitableStyle);
    
    const userStyle = report.suitableStyle.primaryStyle || '';
    const userKeywords = report.suitableStyle.styleKeywords || [];
    
    console.log('用户风格:', userStyle);
    console.log('用户关键词:', userKeywords);
    
    // 风格匹配规则
    const styleMatches = {
      classic: ['经典优雅', '职业正式', '经典'],
      casual: ['休闲舒适', '轻松', '日常'],
      elegant: ['经典优雅', '优雅', '正式'],
      feminine: ['甜美可爱', '女性化', '温柔'],
      formal: ['职业正式', '正式', '商务']
    };

    let matchScore = 0;
    
    // 检查主风格匹配
    if (styleMatches[itemStyle]) {
      styleMatches[itemStyle].forEach(style => {
        if (userStyle.includes(style) || userKeywords.some(keyword => keyword.includes(style))) {
          matchScore = Math.max(matchScore, 0.8);
        }
      });
    }

    // 检查关键词匹配
    userKeywords.forEach(keyword => {
      if (keyword.includes(itemStyle) || itemStyle.includes(keyword)) {
        matchScore = Math.max(matchScore, 0.6);
      }
    });

    console.log('风格匹配分数:', matchScore);
    return matchScore;
  },

  // 材质匹配分析
  analyzeMaterialMatch(itemMaterial, report) {
    const userMaterials = report.recommendedMaterials.primary || [];
    const avoidMaterials = report.recommendedMaterials.avoid || [];
    
    let matchScore = 0.5; // 默认中等匹配
    
    // 检查推荐材质
    userMaterials.forEach(material => {
      if (material.includes(itemMaterial) || itemMaterial.includes(material)) {
        matchScore = Math.max(matchScore, 0.9);
      }
    });

    // 检查避免材质
    avoidMaterials.forEach(material => {
      if (material.includes(itemMaterial) || itemMaterial.includes(material)) {
        matchScore = Math.min(matchScore, 0.2);
      }
    });

    return matchScore;
  },

  // 获取整体评分
  getOverallRating(score) {
    if (score >= 0.8) return '非常推荐';
    if (score >= 0.6) return '推荐';
    if (score >= 0.4) return '一般';
    if (score >= 0.2) return '不太推荐';
    return '不推荐';
  },

  // 生成推荐建议
  generateRecommendation(result) {
    const { score, overallRating } = result;
    
    if (score >= 0.8) {
      return '这件商品非常适合您的个人风格！颜色、风格和材质都与您的偏好高度匹配。';
    } else if (score >= 0.6) {
      return '这件商品比较适合您，可以考虑购买。建议搭配时注意整体协调性。';
    } else if (score >= 0.4) {
      return '这件商品与您的风格有一定差距，建议谨慎考虑。';
    } else {
      return '这件商品不太适合您的个人风格，建议选择其他款式。';
    }
  },

  // 生成具体原因
  generateReasons(result, item, report) {
    const reasons = [];
    
    if (result.colorMatch >= 0.7) {
      reasons.push('✅ 颜色与您的肤色和偏好非常匹配');
    } else if (result.colorMatch >= 0.4) {
      reasons.push('⚠️ 颜色匹配度一般，建议考虑其他色系');
    } else {
      reasons.push('❌ 颜色与您的风格不太协调');
    }

    if (result.styleMatch >= 0.7) {
      reasons.push('✅ 风格与您的个人偏好高度一致');
    } else if (result.styleMatch >= 0.4) {
      reasons.push('⚠️ 风格匹配度中等，可能需要调整搭配');
    } else {
      reasons.push('❌ 风格与您的偏好有较大差异');
    }

    if (result.materialMatch >= 0.7) {
      reasons.push('✅ 材质符合您的使用习惯和偏好');
    } else if (result.materialMatch >= 0.4) {
      reasons.push('⚠️ 材质匹配度一般，注意护理要求');
    } else {
      reasons.push('❌ 材质可能不适合您的使用习惯');
    }

    return reasons;
  },

  // 生成改进建议
  generateSuggestions(result, item, report) {
    const suggestions = [];
    
    if (result.colorMatch < 0.6) {
      suggestions.push(`建议选择${report.colorPalette.mainColors?.[0] || '更适合您肤色的颜色'}`);
    }
    
    if (result.styleMatch < 0.6) {
      suggestions.push(`考虑选择更符合您${report.suitableStyle.primaryStyle}风格的单品`);
    }
    
    if (result.materialMatch < 0.6) {
      suggestions.push(`推荐选择${report.recommendedMaterials.primary?.[0] || '更适合的材质'}`);
    }

    if (suggestions.length === 0) {
      suggestions.push('这件商品非常适合您，可以放心购买！');
    }

    return suggestions;
  },

  // 重新分析
  reanalyze() {
    this.setData({
      currentStep: 'upload',
      uploadedItem: null,
      analysisResult: null
    });
  },

  // 显示历史记录结果
  showHistoryResult(advice) {
    console.log('显示历史购物建议:', advice);
    
    // 清理全局数据，避免重复显示
    app.globalData.currentShoppingAdvice = null;
    
    this.setData({
      uploadedItem: {
        name: advice.itemName,
        type: advice.itemType,
        imageUrl: advice.imageUrl,
        colors: advice.colors,
        style: advice.style,
        material: advice.material
      },
      analysisResult: {
        score: Number(advice.score) || 0,
        overallRating: advice.overallRating,
        recommendation: advice.recommendation,
        colorMatch: Number(advice.colorMatch) || 0,
        styleMatch: Number(advice.styleMatch) || 0,
        materialMatch: Number(advice.materialMatch) || 0,
        reasons: this.generateReasonsFromHistory(advice),
        suggestions: this.generateSuggestionsFromHistory(advice),
        // 添加百分比字段
        scorePercent: Math.round((Number(advice.score) || 0) * 100),
        colorMatchPercent: Math.round((Number(advice.colorMatch) || 0) * 100),
        styleMatchPercent: Math.round((Number(advice.styleMatch) || 0) * 100),
        materialMatchPercent: Math.round((Number(advice.materialMatch) || 0) * 100)
      },
      currentStep: 'result',
      isLoading: false
    });
    
    console.log('历史记录显示 - 分数详情:');
    console.log('- 总分:', Number(advice.score) || 0, '(', Math.round((Number(advice.score) || 0) * 100) + '%)');
    console.log('- 颜色匹配:', Number(advice.colorMatch) || 0, '(', Math.round((Number(advice.colorMatch) || 0) * 100) + '%)');
    console.log('- 风格匹配:', Number(advice.styleMatch) || 0, '(', Math.round((Number(advice.styleMatch) || 0) * 100) + '%)');
    console.log('- 材质匹配:', Number(advice.materialMatch) || 0, '(', Math.round((Number(advice.materialMatch) || 0) * 100) + '%)');
    
    // 调试：检查设置的analysisResult
    const analysisResult = {
      score: Number(advice.score) || 0,
      overallRating: advice.overallRating,
      recommendation: advice.recommendation,
      colorMatch: Number(advice.colorMatch) || 0,
      styleMatch: Number(advice.styleMatch) || 0,
      materialMatch: Number(advice.materialMatch) || 0,
      reasons: this.generateReasonsFromHistory(advice),
      suggestions: this.generateSuggestionsFromHistory(advice),
      scorePercent: Math.round((Number(advice.score) || 0) * 100),
      colorMatchPercent: Math.round((Number(advice.colorMatch) || 0) * 100),
      styleMatchPercent: Math.round((Number(advice.styleMatch) || 0) * 100),
      materialMatchPercent: Math.round((Number(advice.materialMatch) || 0) * 100)
    };
    
    console.log('设置的analysisResult对象:', analysisResult);
    console.log('百分比字段检查:');
    console.log('- scorePercent:', analysisResult.scorePercent);
    console.log('- colorMatchPercent:', analysisResult.colorMatchPercent);
    console.log('- styleMatchPercent:', analysisResult.styleMatchPercent);
    console.log('- materialMatchPercent:', analysisResult.materialMatchPercent);
  },

  // 从历史记录生成原因
  generateReasonsFromHistory(advice) {
    const reasons = [];
    
    if (advice.colorMatch > 0.7) {
      reasons.push('颜色搭配与您的个人风格非常匹配');
    } else if (advice.colorMatch > 0.4) {
      reasons.push('颜色搭配与您的个人风格基本匹配');
    } else {
      reasons.push('颜色搭配与您的个人风格不太匹配');
    }
    
    if (advice.styleMatch > 0.7) {
      reasons.push('风格与您的个人偏好高度一致');
    } else if (advice.styleMatch > 0.4) {
      reasons.push('风格与您的个人偏好基本一致');
    } else {
      reasons.push('风格与您的个人偏好存在差异');
    }
    
    if (advice.materialMatch > 0.7) {
      reasons.push('材质选择符合您的需求');
    } else if (advice.materialMatch > 0.4) {
      reasons.push('材质选择基本符合您的需求');
    } else {
      reasons.push('材质选择可能不太适合您');
    }
    
    return reasons;
  },

  // 从历史记录生成建议
  generateSuggestionsFromHistory(advice) {
    const suggestions = [];
    
    if (advice.score < 0.6) {
      suggestions.push('建议考虑其他更适合您风格的商品');
      suggestions.push('可以尝试调整颜色或风格选择');
    } else if (advice.score < 0.8) {
      suggestions.push('这个商品基本适合您，可以考虑购买');
      suggestions.push('搭配时注意与其他单品的协调性');
    } else {
      suggestions.push('这个商品非常适合您，强烈推荐');
      suggestions.push('可以作为您衣橱中的经典单品');
    }
    
    return suggestions;
  },

  // 保存购物建议到历史记录
  async saveShoppingAdvice(item, analysis) {
    try {
      console.log('=== saveShoppingAdvice 开始 ===');
      console.log('传入的item:', item);
      console.log('传入的analysis:', analysis);
      console.log('analysis.score原始值:', analysis.score, '类型:', typeof analysis.score);
      console.log('analysis.colorMatch原始值:', analysis.colorMatch, '类型:', typeof analysis.colorMatch);
      console.log('analysis.styleMatch原始值:', analysis.styleMatch, '类型:', typeof analysis.styleMatch);
      console.log('analysis.materialMatch原始值:', analysis.materialMatch, '类型:', typeof analysis.materialMatch);
      
      // 将图片转换为base64存储
      let imageData = '';
      if (item.imageUrl && !item.imageUrl.startsWith('data:image')) {
        try {
          console.log('开始转换图片为base64存储...');
          imageData = await this.convertImageToBase64(item.imageUrl);
          console.log('图片转换成功，base64长度:', imageData.length);
        } catch (error) {
          console.error('图片转换失败:', error);
          imageData = item.imageUrl; // 保留原始路径作为备用
        }
      } else {
        imageData = item.imageUrl; // 已经是base64或不需要转换
      }
      
      const advice = {
        itemName: item.name || '未知商品',
        itemType: item.type || '未知类型',
        imageUrl: imageData, // 使用base64数据
        colors: item.colors || [],
        style: item.style || '',
        material: item.material || '',
        score: Number(analysis.score) || 0,
        overallRating: analysis.overallRating,
        recommendation: analysis.recommendation,
        colorMatch: Number(analysis.colorMatch) || 0,
        styleMatch: Number(analysis.styleMatch) || 0,
        materialMatch: Number(analysis.materialMatch) || 0
      };
      
      console.log('转换后的advice对象:', advice);
      console.log('转换后的score:', advice.score, '类型:', typeof advice.score);
      console.log('转换后的colorMatch:', advice.colorMatch, '类型:', typeof advice.colorMatch);
      console.log('转换后的styleMatch:', advice.styleMatch, '类型:', typeof advice.styleMatch);
      console.log('转换后的materialMatch:', advice.materialMatch, '类型:', typeof advice.materialMatch);
      
      console.log('保存的购物建议数据:', advice);
      console.log('分数类型检查:', {
        score: typeof advice.score,
        colorMatch: typeof advice.colorMatch,
        styleMatch: typeof advice.styleMatch,
        materialMatch: typeof advice.materialMatch
      });
      
      app.saveShoppingAdvice(advice);
      console.log('购物建议已保存到历史记录');
    } catch (error) {
      console.error('保存购物建议失败:', error);
    }
  },

  // 返回首页
  goHome() {
    // 如果是从历史页面来的，返回历史页面
    if (this.data.currentStep === 'result' && this.data.analysisResult) {
      tt.navigateBack();
    } else {
      tt.navigateTo({
        url: '/pages/index/index'
      });
    }
  },

  // 查看历史报告
  viewHistory() {
    tt.navigateTo({
      url: '/pages/history/history'
    });
  },

  // 图片加载错误处理
  onImageError(e) {
    console.error('图片加载失败:', e);
    tt.showToast({
      title: '图片加载失败',
      icon: 'none'
    });
  },

  // 测试AI调用
  async testAI() {
    try {
      console.log('=== 测试AI调用 ===');
      
      const api = require('../../utils/api.js');
      console.log('API模块加载成功');
      
      // 检查API配置
      console.log('API配置:', {
        baseUrl: api.baseUrl,
        apiKey: api.apiKey ? '已设置' : '未设置',
        visionModel: api.visionModel
      });
      
      // 使用一个更大的测试图片（32x32像素）
      const testImagePath = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAA7AAAAOwBeShxvQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAGiSURBVFiF7ZY9TsNAEIXfzK4dO4kQKQoKJCQKJI6QK3AErkBHwQk4Ah0FJ6Cj4QhQ0FAgUaRwEseJ7d3d2aFwYjvx2k4cQ0HxS6+0M+/N7M7sLgD8x/8VQghxOp3eXl1d3QghxGg0ugEAIcQ1gDcA7wDehRDPQoiX4XD4PBgMngaDwfNgMHgZDoefw+HwczQafY1Go6/xePw1mUy+JpPJ12Qy+ZpOp1/T6fRrNpt9zWazr/l8/jWfz78Wi8XXYrH4WiwWX8vl8mu5XH4tl8uv1Wr1tVqtvtbr9dd6vf7abDZfm83ma7vdfm2326/dbve12+2+9vv9136//zocDl+Hw+HreDx+HY/Hr9Pp9HU6nb7O5/PX+Xz+ulgsXheLxetyuXxdLpevq9XqdbVava7X69f1ev263W5ft9vt6+12+7rb7V53u93rfr9/3e/3r4fD4fVwOLyeTqfX0+n0ej6fX8/n8+vFYnG9WCyul8vl9XK5vF6tVter1ep6vV5fr9fr681mc73ZbK632+31dru93u1217vd7nq/31/v9/vrw+FwfTgcrs/n8/X5fL6+XC7Xl8vl+nq9Xl+v1+vb7XZ9u92u7/f79f1+v344HK4fDofr5/P5+nw+X18ul+vL5XJ9u92ub7fb9ePxeH08Hq+fn5/Xz8/P6y8vL9cvLy/XX19fr79+/Xr9/f39+vv7+/WPj4/rHx8f1z8/P69/fn5e//r6uv719XX9+/v7+vf39/Wfn5/rPz8/139/f6///v5e//v7u/4P8Qc4qj8JqQ8J5QAAAABJRU5ErkJggg==';
      
      const prompt = '请简单描述这张图片的内容';
      
      console.log('发送测试AI请求...');
      console.log('图片路径:', testImagePath);
      console.log('提示词:', prompt);
      
      const result = await api.callVisionAPI(testImagePath, prompt);
      
      console.log('AI测试结果:', result);
      
      tt.showModal({
        title: 'AI测试结果',
        content: JSON.stringify(result, null, 2),
        showCancel: false
      });
      
    } catch (error) {
      console.error('AI测试失败:', error);
      console.error('错误堆栈:', error.stack);
      
      let errorMessage = error.message;
      if (error.errMsg) {
        errorMessage += '\n\n错误信息: ' + error.errMsg;
      }
      if (error.statusCode) {
        errorMessage += '\n状态码: ' + error.statusCode;
      }
      
      tt.showModal({
        title: 'AI测试失败',
        content: errorMessage,
        showCancel: false
      });
    }
  },

  // 测试网络连接
  // (duplicate removed)
});
