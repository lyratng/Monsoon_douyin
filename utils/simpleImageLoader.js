// 简化版图片加载管理器 - 专为小程序优化
class SimpleImageLoader {
  constructor() {
    this.loadingImages = new Set(); // 正在加载的图片
    this.maxConcurrent = 6; // 增加并发数，但仍控制在合理范围
    this.loadQueue = []; // 等待队列
    this.retryMap = new Map(); // 重试记录
    this.maxRetries = 1; // 减少重试次数
  }

  /**
   * 加载图片
   */
  loadImage(url, fallbackUrl, callback) {
    // 如果正在加载相同图片，直接返回
    if (this.loadingImages.has(url)) {
      return;
    }

    // 如果达到并发限制，加入队列
    if (this.loadingImages.size >= this.maxConcurrent) {
      this.loadQueue.push({ url, fallbackUrl, callback });
      return;
    }

    this.doLoad(url, fallbackUrl, callback);
  }

  /**
   * 执行加载
   */
  doLoad(url, fallbackUrl, callback) {
    this.loadingImages.add(url);
    
    // 直接返回CDN URL，让image组件自己处理加载
    // 如果加载失败，image组件的binderror会触发
    setTimeout(() => {
      this.loadingImages.delete(url);
      callback(null, url);
      
      // 处理队列中的下一个
      this.processQueue();
    }, 50); // 短暂延迟，避免瞬间并发
  }

  /**
   * 处理队列
   */
  processQueue() {
    if (this.loadQueue.length > 0 && this.loadingImages.size < this.maxConcurrent) {
      const next = this.loadQueue.shift();
      this.doLoad(next.url, next.fallbackUrl, next.callback);
    }
  }

  /**
   * 重置状态
   */
  reset() {
    this.loadingImages.clear();
    this.loadQueue = [];
    this.retryMap.clear();
  }

  /**
   * 获取状态
   */
  getStatus() {
    return {
      loading: this.loadingImages.size,
      queued: this.loadQueue.length
    };
  }
}

module.exports = new SimpleImageLoader();

