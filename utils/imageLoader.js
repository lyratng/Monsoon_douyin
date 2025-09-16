// 图片加载管理器 - 解决并发加载和卡住问题
class ImageLoadManager {
  constructor() {
    this.maxConcurrent = 3; // 最大并发数，控制同时加载的图片数量
    this.loadingQueue = []; // 待加载队列
    this.loadingCount = 0; // 当前加载数量
    this.loadedImages = new Map(); // 已加载图片缓存
    this.retryCount = new Map(); // 重试次数记录
    this.maxRetries = 2; // 最大重试次数
    this.timeout = 8000; // 超时时间 8秒
  }

  /**
   * 添加图片到加载队列
   */
  loadImage(imageInfo, callback) {
    const { url, fallbackUrl, id } = imageInfo;
    
    // 检查是否已经加载过
    if (this.loadedImages.has(url)) {
      callback(null, this.loadedImages.get(url));
      return;
    }

    // 添加到队列
    this.loadingQueue.push({
      url,
      fallbackUrl,
      id,
      callback,
      timestamp: Date.now()
    });

    // 尝试处理队列
    this.processQueue();
  }

  /**
   * 处理加载队列
   */
  processQueue() {
    // 如果当前加载数量已达上限，或队列为空，则返回
    if (this.loadingCount >= this.maxConcurrent || this.loadingQueue.length === 0) {
      return;
    }

    const task = this.loadingQueue.shift();
    this.loadingCount++;

    console.log(`[ImageLoader] 开始加载图片 ${task.id}, 当前并发: ${this.loadingCount}`);

    this.doLoadImage(task)
      .then(result => {
        this.loadedImages.set(task.url, result);
        task.callback(null, result);
      })
      .catch(error => {
        console.error(`[ImageLoader] 图片加载失败 ${task.id}:`, error);
        task.callback(error, task.fallbackUrl);
      })
      .finally(() => {
        this.loadingCount--;
        console.log(`[ImageLoader] 图片加载完成 ${task.id}, 当前并发: ${this.loadingCount}`);
        
        // 继续处理队列
        setTimeout(() => this.processQueue(), 100);
      });
  }

  /**
   * 实际加载图片 - 适配小程序环境
   */
  doLoadImage(task) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let hasTimedOut = false;

      // 设置超时
      const timer = setTimeout(() => {
        hasTimedOut = true;
        console.warn(`[ImageLoader] 图片加载超时 ${task.id}: ${task.url}`);
        reject(new Error('Image load timeout'));
      }, this.timeout);

      // 使用小程序的网络请求验证图片
      if (typeof tt !== 'undefined' && tt.request) {
        // 在抖音小程序环境
        tt.request({
          url: task.url,
          method: 'HEAD', // 只获取头部信息，不下载完整图片
          success: (res) => {
            if (!hasTimedOut) {
              clearTimeout(timer);
              const loadTime = Date.now() - startTime;
              console.log(`[ImageLoader] 图片验证成功 ${task.id}, 耗时: ${loadTime}ms, 状态: ${res.statusCode}`);
              
              if (res.statusCode === 200) {
                resolve(task.url);
              } else {
                this.handleLoadError(task, resolve, reject);
              }
            }
          },
          fail: (error) => {
            if (!hasTimedOut) {
              clearTimeout(timer);
              console.warn(`[ImageLoader] 图片验证失败 ${task.id}:`, error);
              this.handleLoadError(task, resolve, reject);
            }
          }
        });
      } else {
        // 在其他环境，尝试使用Image对象
        try {
          const tempImage = new Image();
          
          tempImage.onload = () => {
            if (!hasTimedOut) {
              clearTimeout(timer);
              const loadTime = Date.now() - startTime;
              console.log(`[ImageLoader] 图片预加载成功 ${task.id}, 耗时: ${loadTime}ms`);
              resolve(task.url);
            }
          };

          tempImage.onerror = () => {
            if (!hasTimedOut) {
              clearTimeout(timer);
              this.handleLoadError(task, resolve, reject);
            }
          };

          tempImage.src = task.url;
        } catch (e) {
          // 如果Image对象不可用，直接返回URL（乐观加载）
          clearTimeout(timer);
          console.log(`[ImageLoader] 无法验证图片，乐观加载 ${task.id}`);
          resolve(task.url);
        }
      }
    });
  }

  /**
   * 处理加载错误和重试
   */
  handleLoadError(task, resolve, reject) {
    console.warn(`[ImageLoader] 图片加载失败 ${task.id}, 尝试重试`);
    
    // 重试逻辑
    const retryCount = this.retryCount.get(task.url) || 0;
    if (retryCount < this.maxRetries) {
      this.retryCount.set(task.url, retryCount + 1);
      setTimeout(() => {
        this.doLoadImage(task).then(resolve).catch(reject);
      }, 1000 * (retryCount + 1)); // 递增延迟
    } else {
      reject(new Error('Image load failed after retries'));
    }
  }

  /**
   * 清理缓存和重置状态
   */
  reset() {
    this.loadingQueue = [];
    this.loadingCount = 0;
    this.loadedImages.clear();
    this.retryCount.clear();
    console.log('[ImageLoader] 已重置加载器状态');
  }

  /**
   * 获取当前状态
   */
  getStatus() {
    return {
      queueLength: this.loadingQueue.length,
      loadingCount: this.loadingCount,
      cacheSize: this.loadedImages.size
    };
  }
}

// 创建全局单例
const imageLoadManager = new ImageLoadManager();

module.exports = imageLoadManager;
