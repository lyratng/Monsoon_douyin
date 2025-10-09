# 阿里云OSS Bucket图片/视频使用方法论

## 概述

本文档总结了在小程序项目中使用阿里云OSS Bucket存储和显示图片/视频的完整方法论，基于Monsoon抖音小程序项目的实际实践。

## 1. 项目架构设计

### 1.1 核心配置文件 (`config/cdn.js`)

```javascript
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
    OCCASIONS: '/occasions'  // 场合图片
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
```

### 1.2 图片加载管理器 (`utils/simpleImageLoader.js`)

```javascript
// 简化版图片加载管理器 - 专为小程序优化
class SimpleImageLoader {
  constructor() {
    this.loadingImages = new Set(); // 正在加载的图片
    this.maxConcurrent = 6; // 并发控制
    this.loadQueue = []; // 等待队列
    this.retryMap = new Map(); // 重试记录
    this.maxRetries = 1; // 重试次数
  }

  /**
   * 加载图片
   */
  loadImage(url, fallbackUrl, callback) {
    // 并发控制逻辑
    if (this.loadingImages.has(url)) {
      return;
    }

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
}

module.exports = new SimpleImageLoader();
```

## 2. 使用模式

### 2.1 在小程序app.json中预声明

```json
{
  "assets": [
    "https://monsoon.oss-cn-beijing.aliyuncs.com/assets/images/backgrounds/carousel/bg-1.jpg",
    "https://monsoon.oss-cn-beijing.aliyuncs.com/assets/images/backgrounds/carousel/bg-2.jpg", 
    "https://monsoon.oss-cn-beijing.aliyuncs.com/assets/images/backgrounds/carousel/bg-3.jpg",
    "https://monsoon.oss-cn-beijing.aliyuncs.com/assets/images/guide/abstract-pattern.png",
    "https://monsoon.oss-cn-beijing.aliyuncs.com/assets/images/guide/heart-pattern.png",
    "https://monsoon.oss-cn-beijing.aliyuncs.com/assets/images/guide/guide-square.png",
    "https://monsoon.oss-cn-beijing.aliyuncs.com/assets/images/seasons/spring.jpg",
    "https://monsoon.oss-cn-beijing.aliyuncs.com/assets/images/seasons/summer.jpg",
    "https://monsoon.oss-cn-beijing.aliyuncs.com/assets/images/seasons/autumn.jpg",
    "https://monsoon.oss-cn-beijing.aliyuncs.com/assets/images/seasons/winter.jpg"
  ]
}
```

### 2.2 在JavaScript中使用

#### 方式1：直接在data中配置

```javascript
const cdnConfig = require('../../config/cdn.js');

Page({
  data: {
    backgroundImages: [
      'https://monsoon.oss-cn-beijing.aliyuncs.com/assets/images/backgrounds/carousel/bg-1.jpg',
      'https://monsoon.oss-cn-beijing.aliyuncs.com/assets/images/backgrounds/carousel/bg-2.jpg',
      'https://monsoon.oss-cn-beijing.aliyuncs.com/assets/images/backgrounds/carousel/bg-3.jpg'
    ],
    seasons: [
      { name: '春', image: 'https://monsoon.oss-cn-beijing.aliyuncs.com/assets/images/seasons/spring.jpg' },
      { name: '夏', image: 'https://monsoon.oss-cn-beijing.aliyuncs.com/assets/images/seasons/summer.jpg' },
      { name: '秋', image: 'https://monsoon.oss-cn-beijing.aliyuncs.com/assets/images/seasons/autumn.jpg' },
      { name: '冬', image: 'https://monsoon.oss-cn-beijing.aliyuncs.com/assets/images/seasons/winter.jpg' }
    ]
  }
});
```

#### 方式2：使用CDN配置方法

```javascript
const cdnConfig = require('../../config/cdn.js');

Page({
  onLoad() {
    // 动态生成图片URL
    const sampleImage = cdnConfig.getSampleClothesUrl(1); // sample-1.jpg
    const customImage = cdnConfig.getImageUrl('/seasons', 'spring.jpg');
    
    this.setData({
      sampleImage,
      customImage
    });
  }
});
```

### 2.3 在TTML模板中使用

```xml
<!-- 直接使用完整URL -->
<image class="season-bg-image" 
       src="https://monsoon.oss-cn-beijing.aliyuncs.com/assets/images/seasons/spring.jpg" 
       mode="aspectFill" />

<!-- 使用数据绑定 -->
<image wx:for="{{seasons}}" 
       wx:key="index"
       class="season-image" 
       src="{{item.image}}" 
       mode="aspectFill" />

<!-- 动态拼接路径 -->
<image class="occasion-bg-image" 
       src="https://monsoon.oss-cn-beijing.aliyuncs.com/assets/images/occasions/{{occasionMap[item.name] || 'daily'}}.jpg" 
       mode="aspectFill" />
```

### 2.4 图片加载错误处理

```javascript
Page({
  /**
   * 图片加载错误处理
   */
  onImageError(e) {
    const item = e.currentTarget.dataset.item;
    console.error(`图片加载失败 ${item.id}:`, item.path);
    
    // 不再进行本地兜底，只记录错误
  },

  /**
   * 图片加载成功处理
   */
  onImageLoad(e) {
    const item = e.currentTarget.dataset.item;
    console.log(`图片加载成功 ${item.id}:`, item.path.includes('aliyuncs.com') ? 'CDN' : '本地');
  }
});
```

## 3. OSS Bucket目录结构设计

```
monsoon.oss-cn-beijing.aliyuncs.com/
├── assets/
│   └── images/
│       ├── backgrounds/
│       │   └── carousel/
│       │       ├── bg-1.jpg
│       │       ├── bg-2.jpg
│       │       └── bg-3.jpg
│       ├── guide/
│       │   ├── abstract-pattern.png
│       │   ├── heart-pattern.png
│       │   └── guide-square.png
│       ├── seasons/
│       │   ├── spring.jpg
│       │   ├── summer.jpg
│       │   ├── autumn.jpg
│       │   └── winter.jpg
│       ├── sample-clothes/
│       │   ├── sample-1.jpg
│       │   ├── sample-2.jpg
│       │   └── ...
│       ├── occasions/
│       │   ├── work.jpg
│       │   ├── party.jpg
│       │   ├── daily.jpg
│       │   └── ...
│       └── test/
│           ├── wrist-warm.jpg
│           └── wrist-cool.jpg
```

## 4. 最佳实践

### 4.1 性能优化

1. **并发控制**：使用图片加载管理器控制同时加载的图片数量（建议6个）
2. **预加载声明**：在app.json中声明常用图片，实现预下载
3. **缓存策略**：设置长期缓存（1年），减少重复请求
4. **图片压缩**：上传到OSS前进行适当压缩

### 4.2 错误处理

1. **优雅降级**：图片加载失败时不显示本地兜底，只记录错误
2. **重试机制**：网络图片加载失败时进行有限次数重试
3. **日志记录**：详细记录图片加载状态，便于调试

### 4.3 代码组织

1. **统一配置**：所有CDN配置集中在`config/cdn.js`
2. **路径标准化**：使用预定义的路径常量，避免硬编码
3. **工具类封装**：提供通用的URL生成方法

### 4.4 命名规范

1. **文件命名**：使用语义化的英文名称，小写+短横线
2. **目录结构**：按功能模块组织，层级清晰
3. **版本管理**：重要图片文件名包含版本信息

## 5. 新项目应用指南

### 5.1 初始化配置

1. 复制`config/cdn.js`到新项目
2. 修改`CDN_BASE_URL`为新项目的OSS域名
3. 根据项目需要调整`IMAGE_PATHS`配置
4. 复制`utils/simpleImageLoader.js`图片加载管理器

### 5.2 OSS Bucket设置

1. 创建新的OSS Bucket
2. 设置合适的访问权限（公共读）
3. 配置CDN加速域名
4. 设置CORS规则支持小程序访问

### 5.3 图片上传流程

1. 按照设计的目录结构上传图片
2. 确保图片格式和大小符合小程序要求
3. 在`app.json`中声明关键图片进行预加载
4. 测试所有图片URL的可访问性

### 5.4 代码集成

1. 在页面JS文件中引入CDN配置：`const cdnConfig = require('../../config/cdn.js');`
2. 在TTML模板中使用完整的CDN URL
3. 添加图片加载错误处理逻辑
4. 使用图片加载管理器控制并发

## 6. 注意事项

### 6.1 小程序限制

1. 图片域名需要在小程序后台配置download域名白名单
2. 单个图片文件大小不能超过10MB
3. 同时下载的文件数量有限制

### 6.2 成本控制

1. 定期清理无用的图片文件
2. 使用CDN缓存减少OSS请求次数
3. 选择合适的OSS存储类型

### 6.3 安全考虑

1. 设置合理的访问权限
2. 使用HTTPS协议
3. 考虑使用防盗链功能

## 7. 扩展功能

### 7.1 视频支持

对于视频文件，可以扩展配置：

```javascript
// 在cdn.js中添加
VIDEO_PATHS: {
  TUTORIALS: '/videos/tutorials',
  DEMOS: '/videos/demos'
},

getVideoUrl(path, filename) {
  return `${this.CDN_BASE_URL}${path}/${filename}`;
}
```

### 7.2 动态图片处理

利用阿里云OSS的图片处理功能：

```javascript
// 获取缩略图
getThumbnailUrl(path, filename, width = 200, height = 200) {
  return `${this.CDN_BASE_URL}${path}/${filename}?x-oss-process=image/resize,m_fill,w_${width},h_${height}`;
}
```

## 8. 总结

这套方法论提供了一个完整的、可复用的阿里云OSS图片管理解决方案，具有以下优势：

1. **标准化**：统一的配置和使用方式
2. **高性能**：并发控制和缓存优化
3. **可维护**：清晰的代码结构和错误处理
4. **可扩展**：支持新功能和新项目的快速集成

通过遵循这套方法论，可以在任何新项目中快速、稳定地集成阿里云OSS图片服务。
