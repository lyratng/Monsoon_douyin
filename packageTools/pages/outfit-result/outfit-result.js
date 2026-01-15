// 穿搭优化结果页面
Page({
  data: {
    originalImage: '',
    optimizedImageUrl: '',
    recommendations: null,
    outfitAnalysis: null,
    hasOptimizedImage: false
  },

  onLoad() {
    console.log('穿搭优化结果页面加载');
    this.loadResultData();
  },

  // 加载结果数据
  loadResultData() {
    try {
      const result = tt.getStorageSync('outfitOptimizationResult');
      if (result) {
        this.setData({
          originalImage: result.originalImage || '',
          optimizedImageUrl: result.optimizedImageUrl || '',
          recommendations: result.recommendations || null,
          outfitAnalysis: result.outfitAnalysis || null,
          hasOptimizedImage: !!result.optimizedImageUrl
        });
        console.log('✅ 结果数据加载成功');
      } else {
        console.warn('⚠️ 未找到结果数据');
        tt.showToast({
          title: '数据加载失败',
          icon: 'none'
        });
      }
    } catch (e) {
      console.error('加载结果数据失败:', e);
    }
  },

  // 预览原图
  previewOriginal() {
    if (!this.data.originalImage) {
      tt.showToast({
        title: '图片加载中',
        icon: 'none'
      });
      return;
    }
    
    const urls = [this.data.originalImage];
    if (this.data.hasOptimizedImage && this.data.optimizedImageUrl) {
      urls.push(this.data.optimizedImageUrl);
    }
    
    tt.previewImage({
      current: this.data.originalImage,
      urls: urls
    });
  },

  // 预览优化后的图
  previewOptimized() {
    if (!this.data.hasOptimizedImage || !this.data.optimizedImageUrl) {
      tt.showToast({
        title: '优化图片暂未生成',
        icon: 'none'
      });
      return;
    }
    
    const urls = [];
    if (this.data.originalImage) {
      urls.push(this.data.originalImage);
    }
    urls.push(this.data.optimizedImageUrl);
    
    tt.previewImage({
      current: this.data.optimizedImageUrl,
      urls: urls
    });
  },

  // 保存原图到相册
  saveOriginalImage() {
    if (!this.data.originalImage) {
      tt.showToast({
        title: '图片不存在',
        icon: 'none'
      });
      return;
    }
    
    this.saveImageToAlbum(this.data.originalImage, '原图');
  },

  // 保存优化图到相册
  saveOptimizedImage() {
    if (!this.data.hasOptimizedImage || !this.data.optimizedImageUrl) {
      tt.showToast({
        title: '优化图片暂未生成',
        icon: 'none'
      });
      return;
    }
    
    this.saveImageToAlbum(this.data.optimizedImageUrl, '优化图');
  },

  // 保存图片到相册
  saveImageToAlbum(imagePath, imageType) {
    const self = this;
    
    tt.showLoading({
      title: '保存中...',
      mask: true
    });
    
    // 判断是网络图片还是本地图片
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      // 网络图片，先下载再保存
      tt.downloadFile({
        url: imagePath,
        success(res) {
          if (res.statusCode === 200) {
            self.doSaveToAlbum(res.tempFilePath, imageType);
          } else {
            tt.hideLoading();
            tt.showToast({
              title: '下载失败',
              icon: 'none'
            });
          }
        },
        fail(err) {
          console.error('下载图片失败:', err);
          tt.hideLoading();
          tt.showToast({
            title: '下载失败',
            icon: 'none'
          });
        }
      });
    } else {
      // 本地图片，直接保存
      self.doSaveToAlbum(imagePath, imageType);
    }
  },

  // 执行保存到相册
  doSaveToAlbum(filePath, imageType) {
    tt.saveImageToPhotosAlbum({
      filePath: filePath,
      success() {
        tt.hideLoading();
        tt.showToast({
          title: imageType + '已保存',
          icon: 'success'
        });
      },
      fail(err) {
        tt.hideLoading();
        console.error('保存图片失败:', err);
        
        // 检查是否是权限问题
        if (err.errMsg && err.errMsg.includes('auth')) {
          tt.showModal({
            title: '需要相册权限',
            content: '请在设置中允许访问相册',
            confirmText: '去设置',
            success(res) {
              if (res.confirm) {
                tt.openSetting();
              }
            }
          });
        } else {
          tt.showToast({
            title: '保存失败',
            icon: 'none'
          });
        }
      }
    });
  },

  // 重新分析
  retryAnalysis() {
    tt.navigateBack();
  },

  // 返回专属建议主页
  backToHome() {
    tt.switchTab({
      url: '/pages/exclusive-advice/exclusive-advice'
    });
  },

  // 图片加载错误处理
  onOptimizedImageError() {
    console.warn('优化后图片加载失败');
    this.setData({ hasOptimizedImage: false });
  }
});
