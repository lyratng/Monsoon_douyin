// pages/report/report.js
const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    userProfile: null,
    styleReport: null,
    loading: true,
    userGender: '', // 用户性别：'male' 或 'female'
    preloadedImages: {}, // 存储预加载的图片本地路径 {风格名: 本地路径}
    // 材质弹窗相关
    showMaterialModal: false,
    selectedSeason: '',
    modalAnimationClass: '',
    // 场合弹窗相关
    showOccasionModal: false,
    selectedOccasion: '',
    occasionModalAnimationClass: '',
    // 风格弹窗相关
    showStyleModal: false,
    selectedStyle: '',
    styleModalAnimationClass: '',
    // 季节映射：中文季节名 -> 英文文件名
    seasonMap: {
      '春': 'spring',
      '夏': 'summer', 
      '秋': 'autumn',
      '冬': 'winter'
    },
    // 场合映射：中文场合名 -> 英文文件名
    occasionMap: {
      '通勤工作': 'work',
      '运动健身': 'workout',
      '玩乐聚会': 'party',
      '日常通用': 'daily',
      '周末休闲': 'weekends',
      '海滩度假': 'beach'
    },
    // 风格映射：中文风格名 -> 英文文件名
    styleMap: {
      '简约基础': 'minimal',
      '街头潮流': 'streetwear',
      '名媛淑女': 'elegant-lady',
      '摩登复古': 'modern-vintage',
      '日系': 'japanese',
      '韩系': 'k-style',
      '时髦前卫': 'avant-garde',
      '甜美少女': 'sweet',
      '自然文艺': 'artsy',
      '乡村巴恩风': 'barn',
      '静奢老钱风': 'old-money',
      '无性别廓形': 'gender-neutral',
      '美拉德风': 'maillard',
      '都市游牧风': 'urban-nomad',
      '机车工装风': 'workwear',
      '多巴胺风': 'dopamine',
      'Y2K 千禧风': 'y2k-aesthetic',
      '新中式': 'neo-chinese',
      '常春藤学院风': 'ivy',
      'Clean Fit': 'sharp-minimal',
      '假日南法风': 'french-riviera',
      '千金玛德琳': 'madeleine-girl',
      '牛仔丹宁风': 'denim',
      '都市运动风': 'athleisure',
      '大女人风': 'power-dressing',
      '高智感穿搭': 'intellectual-chic',
      '美式复古': 'americana-vintage',
      '英伦风': 'british-classic',
      '极简主义': 'minimalism',
      '甜酷风': 'sweet-cool'
    },
    // 季节数据：包含中文名和图片路径
    seasons: [
      { name: '春', image: 'https://monsoon.oss-cn-beijing.aliyuncs.com/assets/images/seasons/spring.jpg' },
      { name: '夏', image: 'https://monsoon.oss-cn-beijing.aliyuncs.com/assets/images/seasons/summer.jpg' },
      { name: '秋', image: 'https://monsoon.oss-cn-beijing.aliyuncs.com/assets/images/seasons/autumn.jpg' },
      { name: '冬', image: 'https://monsoon.oss-cn-beijing.aliyuncs.com/assets/images/seasons/winter.jpg' }
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const pageLoadStartTime = Date.now();
    console.log('📄 [性能监控] ========== 报告页面开始加载 ==========');
    console.log('📄 [性能监控] 页面加载开始时间:', new Date().toLocaleTimeString(), pageLoadStartTime);
    this.pageLoadStartTime = pageLoadStartTime;
    
    this.loadReport();
  },

  /**
   * 加载用户报告
   */
  loadReport() {
    try {
      // 获取用户档案
      const userProfile = app.getUserProfile();
      
      // 检查是否有风格报告
      let styleReport = null;
      if (userProfile && userProfile.style_report) {
        styleReport = userProfile.style_report;
      } else if (userProfile && userProfile.styleReport) {
        styleReport = userProfile.styleReport;
      }
      
      if (!styleReport) {
        // 显示选择：生成模拟报告或去测试
        tt.showModal({
          title: '暂无个人风格报告',
          content: '您还没有完成测试，要查看模拟报告还是现在去测试？',
          confirmText: '查看模拟报告',
          cancelText: '去测试',
          success: (res) => {
            if (res.confirm) {
              // 生成模拟报告
              this.generateMockReport();
            } else {
              // 去测试
              tt.navigateTo({
                url: '/pages/test/test'
              });
            }
          }
        });
        return;
      }

      // 🔍 断点12：报告页面最终显示
      console.log('🎯 【断点12 - 报告页面最终显示】');
      console.log('  报告页面显示的季型名称:', styleReport['季型名称']);
      console.log('  报告页面的color_analysis季型:', userProfile.color_analysis ? userProfile.color_analysis.season_12 : '无');
      console.log('  报告页面完整styleReport:', JSON.stringify(styleReport, null, 2));
      
      // 获取用户性别
      const userGender = (userProfile.basic_info && userProfile.basic_info.gender) || 'female'; // 默认为 female
      console.log('  用户性别:', userGender);
      
      const beforeSetData = Date.now();
      
      this.setData({
        userProfile: userProfile,
        styleReport: styleReport,
        userGender: userGender,
        loading: false
      }, () => {
        const afterSetData = Date.now();
        console.log('📄 [性能监控] 报告数据setData完成');
        console.log('📄 [性能监控] setData耗时:', afterSetData - beforeSetData, 'ms');
        
        if (this.pageLoadStartTime) {
          const totalLoadTime = afterSetData - this.pageLoadStartTime;
          console.log('📄 [性能监控] 页面总加载时间:', totalLoadTime, 'ms');
          console.log('📄 [性能监控] ========== 报告页面加载完成 ==========');
        }
        
        // 检查推荐的风格数量
        if (styleReport && styleReport['推荐的风格列表']) {
          console.log('📊 [数据统计] 推荐风格数量:', styleReport['推荐的风格列表'].length);
          console.log('📊 [数据统计] 推荐风格列表:', styleReport['推荐的风格列表']);
        }
        
        // 页面加载完成后，开始预加载所有风格图片
        // 使用 setTimeout 延迟执行，避免阻塞页面渲染
        setTimeout(() => {
          this.preloadStyleImages();
        }, 100);
      });

    } catch (error) {
      console.error('加载报告失败:', error);
      this.setData({
        loading: false
      });
      tt.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 生成模拟报告
   */
  generateMockReport() {
    const mockReport = {
      // 按照需求文档的JSON格式
      "季型名称": "冷夏型",
      "适合颜色的简短描述": "适合低对比度、带灰感的柔和色彩，冷色调为主",
      "能量类型名称": "自洽自律型", 
      "能量匹配的风格简短描述": "沉稳优雅，举止从容，处事细腻含蓄，适合柔软飘逸的风格",
      "推荐的颜色列表": [
        { "name": "雾霭蓝", "hex": "#A8B8D0" },
        { "name": "鼠尾草绿", "hex": "#9CAF88" },
        { "name": "薰衣草紫", "hex": "#D4C5E8" },
        { "name": "珍珠白", "hex": "#F5F2E8" },
        { "name": "淡粉色", "hex": "#E8D5D5" },
        { "name": "灰蓝色", "hex": "#B8C5D6" },
        { "name": "柔和米色", "hex": "#E8E0D0" },
        { "name": "浅灰紫", "hex": "#D0C8D8" },
        { "name": "雾粉", "hex": "#E0D0D8" },
        { "name": "冷灰", "hex": "#C8C8C0" },
        { "name": "浅青灰", "hex": "#B8C8C8" },
        { "name": "温柔绿", "hex": "#C0D0C0" }
      ],
      "推荐的材质列表（按季节）": {
        "春": [
          { "name": "莫代尔", "why": "轻薄透气，触感柔软，符合柔和气质" },
          { "name": "真丝", "why": "飘逸优雅，光泽柔和，提升整体质感" }
        ],
        "夏": [
          { "name": "亚麻布", "why": "自然质朴，透气舒适，展现随性优雅" },
          { "name": "棉质", "why": "舒适透气，易于打理，适合日常穿着" }
        ],
        "秋": [
          { "name": "羊绒", "why": "柔软温暖，质感高级，彰显低调奢华" },
          { "name": "精纺羊毛", "why": "保暖舒适，版型挺括，适合正式场合" }
        ],
        "冬": [
          { "name": "羊毛呢", "why": "保暖性好，质地厚实，适合制作大衣外套" },
          { "name": "山羊绒", "why": "轻盈保暖，触感丝滑，展现精致品味" }
        ]
      },
      "推荐的风格列表": ["静奢老钱风", "松弛文艺", "日系简约", "自然文艺", "知性优雅"],
      "场合推荐": [
        {
          "name": "通勤工作",
          "notes": "正式合规、低调稳重，体现专业感",
          "outfits": [
            {
              "top": "雾霭蓝衬衫",
              "bottom": "灰色西装裤",
              "shoes": "黑色低跟鞋",
              "accessories": "简约珍珠耳钉"
            },
            {
              "top": "羊绒针织衫",
              "bottom": "A字裙",
              "shoes": "裸色平底鞋",
              "accessories": "细链项链"
            }
          ]
        },
        {
          "name": "日常通用",
          "notes": "简洁实穿，强调可重复性和舒适感",
          "outfits": [
            {
              "top": "白色棉质T恤",
              "bottom": "浅蓝色牛仔裤",
              "shoes": "小白鞋",
              "accessories": "帆布包"
            },
            {
              "top": "针织开衫",
              "bottom": "长裙",
              "shoes": "乐福鞋",
              "accessories": "丝巾"
            }
          ]
        },
        {
          "name": "周末休闲",
          "notes": "轻松但精致，避免过于华丽",
          "outfits": [
            {
              "top": "薰衣草紫毛衣",
              "bottom": "米色阔腿裤",
              "shoes": "运动鞋",
              "accessories": "棒球帽"
            }
          ]
        }
      ],
      generated_time: new Date().toLocaleDateString()
    };

    // 为模拟报告设置默认性别
    const mockUserProfile = { 
      name: "季风用户",
      basic_info: {
        gender: 'female' // 模拟数据默认女性
      }
    };
    
    this.setData({
      userProfile: mockUserProfile,
      styleReport: mockReport,
      userGender: 'female',
      loading: false
    }, () => {
      // 模拟报告生成后也预加载图片
      setTimeout(() => {
        this.preloadStyleImages();
      }, 100);
    });

    tt.showToast({
      title: '模拟报告已生成',
      icon: 'success'
    });
  },

  /**
   * 根据性别和风格名生成图片URL
   */
  getStyleImageUrl(styleName) {
    const gender = this.data.userGender || 'female';
    const genderSuffix = gender === 'male' ? 'man' : 'woman';
    
    // 去掉风格名中的括号部分，只保留中文部分
    // 例如："韩系 (K-style)" -> "韩系"
    const cleanStyleName = styleName.split('(')[0].trim();
    
    const styleKey = this.data.styleMap[cleanStyleName] || 'minimal';
    
    console.log('风格匹配调试:', {
      原始风格名: styleName,
      清理后: cleanStyleName,
      映射结果: styleKey,
      性别后缀: genderSuffix
    });
    
    return `https://monsoon.oss-cn-beijing.aliyuncs.com/assets/images/styles/${styleKey}-${genderSuffix}.jpg`;
  },

  /**
   * 预加载所有风格图片（使用队列控制并发）
   */
  preloadStyleImages() {
    const startTime = Date.now();
    console.log('🚀 [预加载] ========================================');
    console.log('🚀 [预加载] ========== 开始预加载风格图片 ==========');
    console.log('🚀 [预加载] 开始时间:', new Date().toLocaleTimeString());
    
    const styleReport = this.data.styleReport;
    if (!styleReport || !styleReport['推荐的风格列表']) {
      console.warn('⚠️ [预加载] 没有风格列表，跳过预加载');
      return;
    }
    
    const styleList = styleReport['推荐的风格列表'];
    const totalCount = styleList.length;
    const userGender = this.data.userGender;
    
    console.log('🚀 [预加载] 用户性别:', userGender);
    console.log('🚀 [预加载] 需要预加载的风格数量:', totalCount);
    console.log('🚀 [预加载] 风格列表:', styleList.join(', '));
    console.log('🚀 [预加载] 使用下载队列，每次最多2张并发');
    console.log('🚀 [预加载] ----------------------------------------');
    
    // 准备下载队列
    const downloadQueue = styleList.map((styleName, index) => ({
      styleName,
      index,
      url: this.getStyleImageUrl(styleName)
    }));
    
    this.processDownloadQueue(downloadQueue, startTime, totalCount);
  },

  /**
   * 处理下载队列（控制并发）
   */
  processDownloadQueue(queue, startTime, totalCount) {
    const maxConcurrent = 2; // 最多同时下载2张
    let loadedCount = 0;
    let failedCount = 0;
    const loadTimes = [];
    const preloadedImages = this.data.preloadedImages || {};
    
    const downloadNext = () => {
      if (queue.length === 0) {
        // 队列已空，检查是否全部完成
        if (loadedCount + failedCount === totalCount) {
          this.setData({ preloadedImages });
          this.logPreloadSummary(startTime, loadedCount, failedCount, loadTimes);
        }
        return;
      }
      
      const item = queue.shift();
      const imageStartTime = Date.now();
      
      console.log(`🔄 [预加载] [${item.index + 1}/${totalCount}] 开始下载:`, item.styleName);
      console.log(`   ↳ URL: ${item.url}`);
      
      // 使用 tt.downloadFile 真正下载图片
      tt.downloadFile({
        url: item.url,
        success: (res) => {
          if (res.statusCode === 200) {
            const imageLoadTime = Date.now() - imageStartTime;
            loadedCount++;
            loadTimes.push(imageLoadTime);
            
            // 保存本地临时文件路径
            preloadedImages[item.styleName] = res.tempFilePath;
            
            console.log(`✅ [预加载] [${loadedCount + failedCount}/${totalCount}] 成功:`, item.styleName);
            console.log(`   ↳ 本地路径: ${res.tempFilePath}`);
            console.log(`   ↳ 耗时: ${imageLoadTime}ms`);
          } else {
            failedCount++;
            console.error(`❌ [预加载] [${loadedCount + failedCount}/${totalCount}] 失败:`, item.styleName);
            console.error(`   ↳ HTTP状态码: ${res.statusCode}`);
          }
          
          // 下载下一张
          downloadNext();
        },
        fail: (err) => {
          const imageLoadTime = Date.now() - imageStartTime;
          failedCount++;
          
          console.error(`❌ [预加载] [${loadedCount + failedCount}/${totalCount}] 失败:`, item.styleName);
          console.error(`   ↳ 错误: ${err.errMsg || JSON.stringify(err)}`);
          console.error(`   ↳ 耗时: ${imageLoadTime}ms`);
          
          // 下载下一张
          downloadNext();
        }
      });
    };
    
    // 启动初始并发下载
    for (let i = 0; i < Math.min(maxConcurrent, queue.length); i++) {
      downloadNext();
    }
  },

  /**
   * 输出预加载总结
   */
  logPreloadSummary(startTime, loadedCount, failedCount, loadTimes) {
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const avgTime = loadTimes.length > 0 ? (loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length).toFixed(0) : 0;
    const minTime = loadTimes.length > 0 ? Math.min(...loadTimes) : 0;
    const maxTime = loadTimes.length > 0 ? Math.max(...loadTimes) : 0;
    const totalCount = loadedCount + failedCount;
    const successRate = totalCount > 0 ? ((loadedCount / totalCount) * 100).toFixed(1) : 0;
    
    console.log('🚀 [预加载] ----------------------------------------');
    console.log('🚀 [预加载] ========== 预加载完成 ==========');
    console.log('🚀 [预加载] ✅ 成功:', loadedCount, '/', totalCount, `(${successRate}%)`);
    console.log('🚀 [预加载] ❌ 失败:', failedCount);
    console.log('🚀 [预加载] 📊 总耗时:', totalTime, 'ms');
    console.log('🚀 [预加载] 📊 平均耗时:', avgTime, 'ms/张');
    console.log('🚀 [预加载] 📊 最快:', minTime, 'ms');
    console.log('🚀 [预加载] 📊 最慢:', maxTime, 'ms');
    console.log('🚀 [预加载] 📂 已缓存图片数量:', Object.keys(this.data.preloadedImages || {}).length);
    
    if (failedCount === 0) {
      console.log('🎉 [预加载] 所有图片下载成功！用户点击时将瞬间显示本地图片');
      console.log('💡 [优化建议] 预加载成功率100%，性能已达最优');
    } else if (loadedCount > 0) {
      console.warn(`⚠️ [预加载] ${failedCount}张图片下载失败，这些图片将在用户点击时从网络加载`);
      console.log('💡 [优化建议] 检查网络连接或图片文件是否存在');
    } else {
      console.error('❌ [预加载] 所有图片下载失败！请检查网络和域名白名单配置');
    }
    
    console.log('🚀 [预加载] ========================================');
  },

  /**
   * 返回主页
   */
  goToHome() {
    tt.switchTab({
      url: '/pages/index/index'
    });
  },

  /**
   * 重新测试
   */
  retakeTest() {
    tt.showModal({
      title: '确认重新测试',
      content: '重新测试将清除当前报告，确定要继续吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除本地存储的测试数据
          try {
            tt.removeStorageSync('user_profile');
            tt.removeStorageSync('test_progress');
            
            // 跳转到测试页面
            tt.redirectTo({
              url: '/pages/test/test'
            });
          } catch (error) {
            console.error('清除数据失败:', error);
            tt.showToast({
              title: '操作失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  /**
   * 保存为图片
   */
  saveAsImage() {
    tt.showLoading({
      title: '生成图片中...'
    });

    // 使用截屏API生成长图
    tt.createSelectorQuery()
      .select('.report-content')
      .boundingClientRect((rect) => {
        if (rect) {
          // 创建canvas绘制长图
          const ctx = tt.createCanvasContext('reportCanvas');
          
          // 设置canvas尺寸
          const canvasWidth = 375;
          const canvasHeight = Math.max(rect.height, 800);
          
          // 绘制背景
          ctx.setFillStyle('#F5F5F0');
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);
          
          // 绘制内容（这里简化处理，实际需要遍历所有元素）
          ctx.setFillStyle('#2C2C2C');
          ctx.setFontSize(16);
          ctx.fillText('个人风格报告', 20, 40);
          
          ctx.draw(false, () => {
            tt.canvasToTempFilePath({
              canvasId: 'reportCanvas',
              success: (res) => {
                tt.hideLoading();
                
                // 尝试保存到相册，如果失败则提供预览
                tt.saveImageToPhotosAlbum({
                  filePath: res.tempFilePath,
                  success: () => {
                    tt.showToast({
                      title: '已保存到相册',
                      icon: 'success'
                    });
                  },
                  fail: (error) => {
                    console.error('保存失败:', error);
                    // 如果保存失败，预览图片让用户手动保存
                    tt.previewImage({
                      urls: [res.tempFilePath],
                      current: res.tempFilePath,
                      success: () => {
                        tt.showModal({
                          title: '保存提示',
                          content: '请长按图片保存到相册',
                          showCancel: false
                        });
                      }
                    });
                  }
                });
              },
              fail: (error) => {
                tt.hideLoading();
                console.error('生成图片失败:', error);
                tt.showToast({
                  title: '生成图片失败',
                  icon: 'none'
                });
              }
            });
          });
        } else {
          tt.hideLoading();
          tt.showToast({
            title: '获取页面内容失败',
            icon: 'none'
          });
        }
      })
      .exec();
  },

  /**
   * 返回主页
   */
  goToHome() {
    // 跳转到主页
    tt.switchTab({
      url: '/pages/index/index'
    });
  },

  /**
   * 选择季节
   */
  selectSeason(e) {
    const season = e.currentTarget.dataset.season;
    this.setData({
      selectedSeason: season,
      showMaterialModal: true,
      modalAnimationClass: 'modal-slide-in'
    });
  },

  /**
   * 关闭材质弹窗
   */
  closeMaterialModal() {
    this.setData({
      modalAnimationClass: 'modal-slide-out'
    });
    
    // 延迟隐藏弹窗，等待动画完成
    setTimeout(() => {
      this.setData({
        showMaterialModal: false,
        selectedSeason: '',
        modalAnimationClass: ''
      });
    }, 300);
  },

  /**
   * 返回主页
   */
  backToHome() {
    console.log('点击返回主页按钮');
    tt.switchTab({
      url: '/pages/index/index'
    });
  },

  /**
   * 导航栏返回主页（已移除，保留兼容性）
   */
  goToHome() {
    console.log('点击导航栏返回按钮');
    tt.switchTab({
      url: '/pages/index/index'
    });
  },

  /**
   * 选择场合
   */
  selectOccasion(e) {
    const occasion = e.currentTarget.dataset.occasion;
    this.setData({
      selectedOccasion: occasion,
      showOccasionModal: true,
      occasionModalAnimationClass: 'modal-slide-in'
    });
  },

  /**
   * 关闭场合弹窗
   */
  closeOccasionModal() {
    this.setData({
      occasionModalAnimationClass: 'modal-slide-out'
    });
    
    // 延迟隐藏弹窗，等待动画完成
    setTimeout(() => {
      this.setData({
        showOccasionModal: false,
        selectedOccasion: '',
        occasionModalAnimationClass: ''
      });
    }, 300);
  },

  /**
   * 选择风格
   */
  selectStyle(e) {
    const startTime = Date.now();
    this.styleClickTime = startTime; // 记录点击时间，用于后续计算总耗时
    
    console.log('🕐 [性能监控] ========== 开始加载风格图片 ==========');
    console.log('🕐 [性能监控] 点击风格按钮时间:', new Date().toLocaleTimeString(), startTime);
    
    const style = e.currentTarget.dataset.style;
    const preloadedImages = this.data.preloadedImages || {};
    
    // 优先使用预加载的本地路径
    let styleImageUrl;
    let isFromCache = false;
    
    if (preloadedImages[style]) {
      styleImageUrl = preloadedImages[style];
      isFromCache = true;
      console.log('⚡ [缓存命中] 使用预加载的本地图片:', style);
      console.log('   ↳ 本地路径:', styleImageUrl);
    } else {
      styleImageUrl = this.getStyleImageUrl(style);
      console.log('🌐 [实时加载] 图片未预加载，使用网络URL:', style);
      console.log('   ↳ 网络URL:', styleImageUrl);
    }
    
    console.log('选择风格:', style, '性别:', this.data.userGender);
    
    const beforeSetData = Date.now();
    console.log('🕐 [性能监控] URL准备耗时:', beforeSetData - startTime, 'ms');
    
    this.setData({
      selectedStyle: style,
      selectedStyleImageUrl: styleImageUrl,
      showStyleModal: true,
      styleModalAnimationClass: 'modal-slide-in'
    }, () => {
      const afterSetData = Date.now();
      console.log('🕐 [性能监控] setData完成耗时:', afterSetData - beforeSetData, 'ms');
      console.log('🕐 [性能监控] 从点击到setData完成:', afterSetData - startTime, 'ms');
      if (isFromCache) {
        console.log('🕐 [性能监控] 预期：图片将瞬间显示（来自本地缓存）');
      } else {
        console.log('🕐 [性能监控] 预期：需要从网络加载图片...');
      }
    });
  },

  /**
   * 关闭风格弹窗
   */
  closeStyleModal() {
    this.setData({
      styleModalAnimationClass: 'modal-slide-out'
    });
    
    // 延迟隐藏弹窗，等待动画完成
    setTimeout(() => {
      this.setData({
        showStyleModal: false,
        selectedStyle: '',
        selectedStyleImageUrl: '',
        styleModalAnimationClass: ''
      });
    }, 300);
  },

  /**
   * 风格图片加载完成
   */
  onStyleImageLoad(e) {
    const loadTime = Date.now();
    const imageUrl = this.data.selectedStyleImageUrl;
    const isLocalFile = imageUrl && imageUrl.startsWith('http://tmp/') || imageUrl.startsWith('ttfile://');
    
    console.log('🖼️ [性能监控] ========== 图片加载完成 ==========');
    console.log('🖼️ [性能监控] 图片加载完成时间:', new Date().toLocaleTimeString(), loadTime);
    console.log('🖼️ [性能监控] 图片尺寸:', e.detail.width, 'x', e.detail.height);
    console.log('🖼️ [性能监控] 图片来源:', isLocalFile ? '本地文件' : '网络URL');
    console.log('🖼️ [性能监控] 图片路径:', imageUrl);
    
    // 如果有记录点击时间，计算总耗时
    if (this.styleClickTime) {
      const totalTime = loadTime - this.styleClickTime;
      console.log('🖼️ [性能监控] ⏱️ 从点击到图片显示总耗时:', totalTime, 'ms');
      
      // 性能分析和缓存判断
      if (isLocalFile && totalTime < 100) {
        console.log('⚡⚡⚡ [性能分析] 加载速度：极快（本地文件预加载成功）');
      } else if (totalTime < 100) {
        console.log('⚡ [性能分析] 加载速度：极快（图片来自缓存）');
      } else if (totalTime < 500) {
        console.log('✅ [性能分析] 加载速度：优秀');
      } else if (totalTime < 1000) {
        console.log('⚠️ [性能分析] 加载速度：一般（建议优化）');
      } else if (totalTime < 2000) {
        console.log('⚠️ [性能分析] 加载速度：较慢（需要优化）');
      } else {
        console.log('❌ [性能分析] 加载速度：很慢（严重需要优化）');
      }
      
      console.log('🖼️ [性能监控] ========================================');
    }
  },

  /**
   * 风格图片加载失败
   */
  onStyleImageError(e) {
    console.error('❌ [性能监控] 图片加载失败:', this.data.selectedStyleImageUrl);
    console.error('❌ 错误详情:', e.detail);
  },

  /**
   * 阻止事件冒泡
   */
  stopPropagation() {
    // 阻止点击卡片内容时关闭弹窗
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 每次显示页面时重新加载数据，以防数据更新
    this.loadReport();
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    const styleReport = this.data.styleReport;
    return {
      title: `我的个人风格是${styleReport?.season_analysis?.season_12 || '优雅知性'}，快来测试你的吧！`,
      path: '/pages/index/index',
      imageUrl: '/assets/share-cover.jpg' // 可以后续添加分享封面图
    };
  }
});