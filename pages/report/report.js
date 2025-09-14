// pages/report/report.js
const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    userProfile: null,
    styleReport: null,
    loading: true
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
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

      this.setData({
        userProfile: userProfile,
        styleReport: styleReport,
        loading: false
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

    this.setData({
      userProfile: { name: "季风用户" },
      styleReport: mockReport,
      loading: false
    });

    tt.showToast({
      title: '模拟报告已生成',
      icon: 'success'
    });
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
  backToHome() {
    // 不设置showInitialPage，让主页正常显示（包括已测出的风格报告按钮）
    const app = getApp();
    app.globalData = app.globalData || {};
    // 移除错误的showInitialPage设置，让主页正常判断是否有报告
    
    // 跳转到主页
    tt.switchTab({
      url: '/pages/index/index'
    });
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