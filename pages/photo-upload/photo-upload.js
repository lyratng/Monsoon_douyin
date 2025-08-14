// pages/photo-upload/photo-upload.js - 照片上传页逻辑


const MAX_COMPRESS_BYTES = 2 * 1024 * 1024;   // 2MB：超过则压缩
const TARGET_BYTES = 1.2 * 1024 * 1024;       // 约 1.2MB：压缩目标
const app = getApp();

Page({
  data: {
    photoTypes: [
      {
        id: 'wrist',
        name: '手腕',
        description: '拍摄手腕内侧，用于分析肤色和静脉颜色',
        required: true,
        icon: '👋',
        uploaded: false,
        imageUrl: ''
      },
      {
        id: 'neck',
        name: '脖子',
        description: '拍摄脖子侧面，用于分析肤色色调',
        required: true,
        icon: '👤',
        uploaded: false,
        imageUrl: ''
      },
      {
        id: 'face',
        name: '正脸',
        description: '拍摄正面脸部，自然光线下无滤镜',
        required: true,
        icon: '😊',
        uploaded: false,
        imageUrl: ''
      },
      {
        id: 'half_body',
        name: '半身',
        description: '拍摄上半身，用于整体风格分析',
        required: false,
        icon: '👕',
        uploaded: false,
        imageUrl: ''
      },
      {
        id: 'full_body',
        name: '全身',
        description: '拍摄全身照，用于整体搭配分析',
        required: false,
        icon: '👗',
        uploaded: false,
        imageUrl: ''
      }
    ],
    uploadedCount: 0,
    requiredCount: 3,
    isLoading: false,
    currentUploading: null
  },

  onLoad() {
    console.log('照片上传页加载');
    this.updateUploadedCount();
  },

  // 选择照片
  selectPhoto(e) {
    const { type } = e.currentTarget.dataset;
    const photoType = this.data.photoTypes.find(item => item.id === type);
    
    if (!photoType) return;

    console.log('开始选择照片:', type);

    this.setData({
      currentUploading: type
    });

    // 显示选择选项
    this.showPhotoOptions(type);
  },

  // 显示照片选择选项
  showPhotoOptions(type) {
    tt.showActionSheet({
      itemList: ['从相册选择', '拍照', '使用模拟数据'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0: // 相册
            this.chooseImageFromAlbum(type);
            break;
          case 1: // 拍照
            this.chooseImageFromCamera(type);
            break;
          case 2: // 模拟数据
            this.mockUploadPhoto(type);
            break;
        }
      },
      fail: () => {
        // 如果ActionSheet失败，直接使用模拟数据
        this.mockUploadPhoto(type);
      }
    });
  },

  // 从相册选择
  chooseImageFromAlbum(type) {
    // 先尝试chooseImage
    tt.chooseImage({
      count: 1,
      sourceType: ['album'],
      success: (res) => {
        if (res.tempFilePaths && res.tempFilePaths.length > 0) {
          this.uploadPhoto(type, res.tempFilePaths[0]);
        }
      },
      fail: (err) => {
        console.error('chooseImage失败(album):', err);
        this.onPickFail(err, type, 'album');
      }
    });
  },

  // 拍照
  chooseImageFromCamera(type) {
    // 先尝试chooseImage
    tt.chooseImage({
      count: 1,
      sourceType: ['camera'],
      success: (res) => {
        if (res.tempFilePaths && res.tempFilePaths.length > 0) {
          this.uploadPhoto(type, res.tempFilePaths[0]);
        }
      },
      fail: (err) => {
        console.error('chooseImage失败(camera):', err);
        this.onPickFail(err, type, 'camera');
      }
    });
  },

  // 尝试chooseMedia
  tryChooseMedia(type, sourceType) {
    tt.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: [sourceType],
      success: (res) => {
        if (res.tempFiles && res.tempFiles.length > 0) {
          this.uploadPhoto(type, res.tempFiles[0].tempFilePath);
        }
      },
      fail: (err) => {
        console.error('chooseMedia失败:', err);
        this.onPickFail(err, type, sourceType);
      }
    });
  },

  // 模拟上传照片（用于测试）
  mockUploadPhoto(type) {
    console.log('使用模拟数据:', type);
    
    // 使用一个简单的base64图片作为模拟数据
    const mockImageUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    const photoTypes = this.data.photoTypes.map(item => {
      if (item.id === type) {
        return {
          ...item,
          uploaded: true,
          imageUrl: mockImageUrl
        };
      }
      return item;
    });

    this.setData({
      photoTypes: photoTypes,
      currentUploading: null
    });

    this.updateUploadedCount();

    tt.showToast({
      title: '模拟上传成功',
      icon: 'success'
    });
  },

    // 选择图片
  chooseImage() {
    console.log('=== 开始选择图片 ===');
    console.log('当前上传类型:', this.data.currentUploading);
    
    // 直接尝试选择图片
    console.log('直接尝试选择图片...');
    this.doChooseImage();
  },



  // 执行选择图片
  doChooseImage() {
    console.log('尝试使用chooseImage API...');
    
    // 使用最基础的chooseImage配置
    tt.chooseImage({
      count: 1,
      success: (res) => {
        console.log('✅ chooseImage成功:', res);
        console.log('临时文件路径:', res.tempFilePaths);
        
        if (res.tempFilePaths && res.tempFilePaths.length > 0) {
          const tempFilePath = res.tempFilePaths[0];
          console.log('选择的文件路径:', tempFilePath);
          this.uploadPhoto(this.data.currentUploading, tempFilePath);
        } else {
          console.error('❌ 没有获取到文件路径');
          this.showErrorAndReset('获取图片失败');
        }
      },
      fail: (err) => {
        console.error('❌ chooseImage失败:', err);
        this.onPickFail(err, this.data.currentUploading, undefined);
      }
    });
  },


  // —— 权限失败统一处理与引导 ——
  handleAuthFailure(err, retryFn) {
    const msg = (err && err.errMsg) ? String(err.errMsg) : '';
    const code = err && (err.errNo || err.errorCode);

    // 判断是否是授权相关错误（用户拒绝授权/系统未授权/隐私协议未声明）
    const isAuthDenied = /auth\s*deny|permission\s*denied|system\s*auth\s*deny/i.test(msg) || code === 113390 || code === 113389;
    const isCancel = /cancel/i.test(msg);
    const isPrivacyNotDeclared = /scope\s*is\s*not\s*declared|privacy/i.test(msg);

    if (isCancel) {
      // 用户主动取消，不再打扰
      tt.showToast({ title: '已取消', icon: 'none' });
      this.setData({ currentUploading: null });
      return;
    }

    if (isPrivacyNotDeclared) {
      // 明确提示到『用户隐私保护协议』声明，而不是 app.json
      tt.showModal({
        title: '隐私声明缺失',
        content: '当前能力未在「用户隐私保护协议」中声明或未完成隐私授权，平台将阻止相册/相机调用。请到开发者后台→设置→基础设置→用户隐私保护协议，补充相册/摄像头条目与使用场景说明后再试。',
        showCancel: false,
      });
      this.setData({ currentUploading: null });
      return;
    }

    if (isAuthDenied) {
      // 引导用户去设置里开启权限，然后重试
      tt.showModal({
        title: '需要权限',
        content: '请在设置中授予相册/摄像头权限后再重试。是否现在去开启？',
        success: (r) => {
          if (r.confirm) {
            tt.openSetting({
              success: () => {
                // 不强依赖 authSetting 的具体字段名，直接重试用户刚才的操作
                if (typeof retryFn === 'function') retryFn();
              },
              complete: () => {
                // 无论如何清理 loading 状态
              }
            });
          } else {
            this.setData({ currentUploading: null });
          }
        }
      });
      return;
    }

    // 其它错误统一走现有错误流程
    this.showErrorAndReset(msg || '访问失败');
  },

  // 根据来源封装一个重试函数
  makeRetryFn(type, sourceType) {
    if (sourceType === 'album') {
      return () => this.chooseImageFromAlbum(type);
    }
    if (sourceType === 'camera') {
      return () => this.chooseImageFromCamera(type);
    }
    // 默认退回通用选择
    return () => this.doChooseImage();
  },

  // 统一的失败分发（chooseImage/chooseMedia 共用）
  onPickFail(err, type, sourceType) {
    console.error('图片选择失败: ', err);
    const retry = this.makeRetryFn(type, sourceType);
    this.handleAuthFailure(err, retry);
  },

  // 显示错误并重置状态
  showErrorAndReset(message) {
    console.log('=== 错误分析 ===');
    console.log('错误消息:', message);
    console.log('所有API都失败了，使用模拟数据');
    
    // 显示详细错误信息
    tt.showModal({
      title: '图片选择失败',
      content: `错误信息: ${message}\n\n可能原因:\n1. 权限未授权\n2. 存储空间不足\n3. API版本不支持\n4. 开发者工具限制\n\n是否使用模拟数据继续测试？`,
      success: (res) => {
        if (res.confirm) {
          this.mockUploadPhoto(this.data.currentUploading);
        } else {
          tt.showToast({
            title: message,
            icon: 'none'
          });
          this.setData({
            currentUploading: null
          });
        }
      }
    });
  },

  // 分析错误详情
  analyzeError(err) {
    console.log('=== 错误分析 ===');
    console.log('错误对象:', err);
    console.log('错误消息:', err.errMsg);
    console.log('错误码:', err.errNo);
    console.log('错误类型:', err.errorType);
    
    // 收集更多系统信息
    tt.getSystemInfo({
      success: (sysInfo) => {
        console.log('系统信息:', sysInfo);
        console.log('平台:', sysInfo.platform);
        console.log('版本:', sysInfo.version);
        console.log('SDK版本:', sysInfo.SDKVersion);
        console.log('设备型号:', sysInfo.model);
        
        // 显示更详细的错误信息
        this.showDetailedError(err, sysInfo);
      },
      fail: () => {
        this.showDetailedError(err, null);
      }
    });
  },

  // 显示详细错误信息
  showDetailedError(err, sysInfo) {
    let errorType = 'unknown';
    let errorDescription = '未知错误';
    
    if (err.errMsg) {
      if (err.errMsg.includes('scope is not declared')) {
        errorType = 'permission_scope';
        errorDescription = '隐私能力未在「用户隐私保护协议」中声明或未完成隐私授权';
      } else if (err.errMsg.includes('auth')) {
        errorType = 'permission_denied';
        errorDescription = '用户拒绝授权';
      } else if (err.errMsg.includes('cancel')) {
        errorType = 'user_cancel';
        errorDescription = '用户取消操作';
      } else if (err.errMsg.includes('timeout')) {
        errorType = 'timeout';
        errorDescription = '请求超时';
      } else if (err.errMsg.includes('fail')) {
        errorType = 'api_fail';
        errorDescription = 'API调用失败';
      }
    }
    
    const sysInfoText = sysInfo ? 
      `\n系统信息:\n平台: ${sysInfo.platform}\n版本: ${sysInfo.version}\nSDK版本: ${sysInfo.SDKVersion}\n设备: ${sysInfo.model}` : '';
    
    tt.showModal({
      title: '详细错误信息',
      content: `错误类型: ${errorType}\n错误描述: ${errorDescription}\n错误消息: ${err.errMsg}\n错误码: ${err.errNo || '无'}\n错误类型: ${err.errorType || '无'}${sysInfoText}`,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 上传照片
  async uploadPhoto(type, filePath) {
    try {
      console.log('开始处理照片:', type, filePath);

      // 读取图片信息 + 大小
      const info = await this.getImageInfoSafe(filePath);
      const origBytes = await this.getFileSizeSafe(filePath);
      console.log('[image] 原始信息:', info, '原始大小(bytes)=', origBytes);

      let workingPath = filePath;
      // 大小超阈值 → 压缩一次（必要时再降质）
      if (origBytes > MAX_COMPRESS_BYTES) {
        let quality = origBytes > 5 * 1024 * 1024 ? 60 : 80;
        console.log(`[image] 触发压缩，quality=${quality}`);
        workingPath = await this.compressImage(workingPath, quality);
        const afterBytes = await this.getFileSizeSafe(workingPath);
        console.log('[image] 压缩后大小(bytes)=', afterBytes, '路径=', workingPath);

        // 若仍然过大，继续降到 60 → 40（最多两次）
        if (afterBytes > TARGET_BYTES && quality !== 60) {
          quality = 60;
          workingPath = await this.compressImage(workingPath, quality);
          console.log('[image] 二次压缩至quality=60, 新路径=', workingPath);
        }
      }

      // 优先用 getImageInfo 的类型；否则从扩展名推断
      const mime = (info && info.type) ? `image/${info.type}` : this.getMimeType(workingPath);

      // 生成 base64 供算法/后续上传使用；预览仍用临时路径以确保稳定
      let dataUrl = null;
      try {
        dataUrl = await this.fileToBase64(workingPath, mime);
        console.log('[image] base64长度=', dataUrl ? dataUrl.length : 0);
      } catch (e) {
        console.warn('[image] 转base64失败，保留临时路径用于展示:', e);
      }

      const photoTypes = this.data.photoTypes.map(item => {
        if (item.id === type) {
          return {
            ...item,
            uploaded: true,
            imageUrl: workingPath,   // 用临时路径做预览，兼容性更好
            imageData: dataUrl || '',// 同时保留 base64 数据（下游可选用）
            mimeType: mime || ''
          };
        }
        return item;
      });

      this.setData({
        photoTypes,
        currentUploading: null
      });

      this.updateUploadedCount();

      console.log('=== 照片处理完成 ===');
      console.log('照片类型:', type);
      console.log('最终图片路径:', workingPath);
      console.log('base64数据长度:', dataUrl ? dataUrl.length : 0);
      console.log('MIME类型:', mime);
      tt.showToast({ title: '上传成功', icon: 'success' });

    } catch (error) {
      console.error('上传照片失败:', error);
      tt.showToast({ title: '上传失败', icon: 'error' });
      this.setData({ currentUploading: null });
    }
  },

  // 压缩图片（可传入质量）
  compressImage(filePath, quality = 80) {
    return new Promise((resolve, reject) => {
      tt.compressImage({
        src: filePath,
        quality: Math.max(10, Math.min(100, quality)),
        success: (res) => resolve(res.tempFilePath),
        fail: (err) => {
          console.error('压缩图片失败:', err);
          resolve(filePath); // 压缩失败则回退到原图
        }
      });
    });
  },

  // 文件转base64（返回 data URL）
  fileToBase64(filePath, mime) {
    return new Promise((resolve, reject) => {
      tt.getFileSystemManager().readFile({
        filePath,
        encoding: 'base64',
        success: (res) => {
          const type = mime || this.getMimeType(filePath);
          resolve(`data:${type};base64,${res.data}`);
        },
        fail: (err) => {
          console.error('读取文件失败:', err);
          reject(err);
        }
      });
    });
  },

  // 安全获取图片信息
  getImageInfoSafe(src) {
    return new Promise((resolve) => {
      tt.getImageInfo({
        src,
        success: (r) => resolve(r),
        fail: () => resolve(null)
      });
    });
  },

  // 安全获取文件大小（bytes）
  getFileSizeSafe(path) {
    return new Promise((resolve) => {
      try {
        tt.getFileSystemManager().stat({
          path,
          success: (s) => resolve(s.size || 0),
          fail: () => resolve(0)
        });
      } catch (e) {
        resolve(0);
      }
    });
  },

  // 获取MIME类型（优先按扩展名推断；未知则回退为 image/jpeg）
  getMimeType(filePath) {
    const ext = (filePath.split('.').pop() || '').toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/jpeg';
    }
  },

  // 删除照片
  deletePhoto(e) {
    const { type } = e.currentTarget.dataset;
    
    tt.showModal({
      title: '确认删除',
      content: '确定要删除这张照片吗？',
      success: (res) => {
        if (res.confirm) {
          const photoTypes = this.data.photoTypes.map(item => {
            if (item.id === type) {
              return {
                ...item,
                uploaded: false,
                imageUrl: ''
              };
            }
            return item;
          });

          this.setData({
            photoTypes: photoTypes
          });

          this.updateUploadedCount();

          tt.showToast({
            title: '已删除',
            icon: 'success'
          });
        }
      }
    });
  },

  // 预览照片
  previewPhoto(e) {
    const { type } = e.currentTarget.dataset;
    const photoType = this.data.photoTypes.find(item => item.id === type);
    
    if (photoType && photoType.imageUrl) {
      tt.previewImage({
        urls: [photoType.imageUrl],
        current: photoType.imageUrl
      });
    }
  },

  // 更新已上传数量
  updateUploadedCount() {
    const uploadedCount = this.data.photoTypes.filter(item => item.uploaded).length;
    this.setData({
      uploadedCount: uploadedCount
    });
  },

  // 检查是否可以继续
  canContinue() {
    const requiredUploaded = this.data.photoTypes
      .filter(item => item.required)
      .every(item => item.uploaded);
    
    return requiredUploaded;
  },

  // 开始分析
  startAnalysis() {
    if (!this.canContinue()) {
      tt.showToast({
        title: '请至少上传3张必填照片',
        icon: 'none'
      });
      return;
    }

    // 保存照片数据
    const uploadedPhotos = this.data.photoTypes
      .filter(item => item.uploaded)
      .map(item => ({
        type: item.id,
        // 继续保留原预览路径（临时文件）
        url: item.imageUrl,
        // 新增：下游分析优先使用的 dataURL（若存在）
        imageData: item.imageData || '',
        mimeType: item.mimeType || '',
        description: item.description
      }));

    console.log('=== 准备跳转到生成页面 ===');
    console.log('上传的照片数量:', uploadedPhotos.length);
    console.log('照片数据详情:', uploadedPhotos.map(p => ({
      type: p.type,
      hasImageData: !!p.imageData,
      imageDataLength: p.imageData ? p.imageData.length : 0,
      mimeType: p.mimeType
    })));

    app.globalData.uploadedImages = uploadedPhotos;

    // 记录埋点
    // const analytics = require('../../utils/analytics.js');
    // analytics.track('photo_upload_completed', {
    //   totalPhotos: uploadedPhotos.length,
    //   photoTypes: uploadedPhotos.map(p => p.type)
    // });

    // 跳转到生成页
    tt.navigateTo({
      url: '/pages/generating/generating'
    });
  },

  // 快速测试（跳过照片上传）
  quickTest() {
    tt.showModal({
      title: '快速测试',
      content: '将使用模拟照片数据进行测试，是否继续？',
      success: (res) => {
        if (res.confirm) {
          // 自动上传所有必填照片的模拟数据
          const requiredTypes = this.data.photoTypes.filter(item => item.required);
          requiredTypes.forEach((item, index) => {
            setTimeout(() => {
              this.mockUploadPhoto(item.id);
            }, index * 200); // 间隔200ms上传
          });
          
          // 3秒后自动开始分析
          setTimeout(() => {
            this.startAnalysis();
          }, 3000);
        }
      }
    });
  },

  // 返回上一页
  goBack() {
    tt.navigateBack();
  },

  // 显示拍摄指南
  showGuide(e) {
    const { type } = e.currentTarget.dataset;
    const photoType = this.data.photoTypes.find(item => item.id === type);
    
    if (photoType) {
      tt.showModal({
        title: `${photoType.name}拍摄指南`,
        content: photoType.description,
        showCancel: false,
        confirmText: '知道了'
      });
    }
  }
});