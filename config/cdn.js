// CDN配置文件
module.exports = {
  // 阿里云OSS CDN基础URL
  CDN_BASE_URL: 'https://monsoon.oss-cn-beijing.aliyuncs.com',
  
  // 图片路径配置
  IMAGE_PATHS: {
    SAMPLE_CLOTHES: '/sample-clothes',
    BACKGROUNDS: '/backgrounds/carousel',
    GUIDE: '/guide',
    SEASONS: '/seasons',
    TEST: '/test',
    OCCASIONS: '/occasions',
    STYLES: '/assets/images/styles'
  },
  
  // 缓存配置
  CACHE_CONFIG: {
    maxAge: 31536000, // 1年缓存
    headers: {
      'Cache-Control': 'public, max-age=31536000',
      'Expires': new Date(Date.now() + 31536000 * 1000).toUTCString()
    }
  },
  
  // 图片加载配置
  LOADING_CONFIG: {
    maxRetries: 3,
    retryDelay: 2000,
    timeout: 10000
  },
  
  // 获取完整的图片URL
  getImageUrl(path, filename) {
    return `${this.CDN_BASE_URL}${path}/${filename}`;
  },
  
  // 获取样例服装图片URL
  getSampleClothesUrl(index) {
    return this.getImageUrl(this.IMAGE_PATHS.SAMPLE_CLOTHES, `sample-${index}.jpg`);
  },
  
  // 获取本地备用路径
  getFallbackPath(path, filename) {
    return `/assets/images${path}/${filename}`;
  }
};
