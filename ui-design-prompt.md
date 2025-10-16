# 衣索寓言抖音小程序 - UI设计风格指南

## 核心设计理念
**极简美学 + AI科技感** - 打造优雅、现代的个性化穿搭分析体验

## 色彩系统

### 主色调
- **背景色**: `#F5F5F0` - 温暖米白色，营造柔和舒适的视觉体验
- **主色**: `#2C2C2C` - 深灰色，提供足够的对比度而不刺眼
- **边框色**: `#E8E8E3` - 浅灰米色，用于分隔和边框

### 辅助色
- **禁用色**: `#999` - 中灰色，用于禁用状态和次要文本
- **提示色**: `#666` - 中浅灰，用于说明文字
- **阴影色**: `rgba(0, 0, 0, 0.1)` - 轻微阴影，增加层次感

## 字体系统

### 字体族
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
```

### 字体大小层级
- **标题**: 48rpx (font-weight: 300)
- **副标题**: 32rpx (font-weight: 300)  
- **正文**: 28rpx (font-weight: 300)
- **说明**: 24rpx (font-weight: 300)
- **辅助**: 20rpx (font-weight: 300)

### 字间距
- **标题**: 2rpx letter-spacing
- **正文**: 1rpx letter-spacing
- **说明**: 0.5rpx letter-spacing

## 布局系统

### 间距规范
- **页面边距**: 40rpx (左右)
- **组件间距**: 60rpx (主要区块间)
- **内边距**: 24rpx-48rpx (按钮、卡片等)
- **安全区域**: `env(safe-area-inset-bottom)` (底部适配)

### 响应式断点
- **移动端优先**: 使用 rpx 单位
- **最大宽度约束**: 使用 max-width: 70vw/50vw 等防止元素过大
- **高度约束**: 使用 max-height 防止内容溢出

## 组件设计模式

### 按钮系统
```css
.analyze-button {
  height: 88rpx;
  border-radius: 44rpx;
  background: #E8E8E3;
  color: #999;
  transition: all 0.3s ease;
  font-weight: 300;
  letter-spacing: 1rpx;
}

.analyze-button.active {
  background: #2C2C2C;
  color: #FFFFFF;
  box-shadow: 0 8rpx 32rpx rgba(44, 44, 44, 0.2);
}
```

### 卡片系统
```css
.card {
  background: #FFFFFF;
  border: 1rpx solid #E8E8E3;
  border-radius: 20rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.1);
}
```

### 图片容器
```css
.image-container {
  border-radius: 16rpx;
  overflow: hidden;
  max-width: 50vw;
  max-height: 50vw;
  aspect-ratio: 1;
}
```

## 动画效果

### 过渡动画
- **持续时间**: 0.3s ease
- **交互反馈**: transform: scale(0.95) 或 scale(0.98)
- **透明度变化**: opacity: 0 → 1

### 加载动画
- **脉冲效果**: loadingPulse 关键帧动画
- **浮动效果**: iconFloat 关键帧动画
- **渐显效果**: 逐行或整体渐显

## 交互模式

### 触摸反馈
```css
.element:active {
  transform: scale(0.95);
  background: #FAFAFA;
  border-color: #2C2C2C;
}
```

### 状态切换
- **禁用状态**: 降低对比度，移除交互效果
- **选中状态**: 边框加深，添加阴影
- **加载状态**: 显示加载动画，禁用交互

## 页面结构模式

### 固定布局
```css
.container {
  min-height: 100vh;
  background: #F5F5F0;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  max-height: calc(100vh - 240rpx);
  overflow-y: auto;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #FFFFFF;
  border-top: 1rpx solid #E8E8E3;
  z-index: 100;
}
```

### 滚动区域
```css
.scroll-content {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
```

## 设计原则

### 1. 极简主义
- 减少视觉噪音，突出核心内容
- 使用大量留白，营造呼吸感
- 统一的圆角和边框样式

### 2. 层次分明
- 通过颜色深浅建立信息层级
- 合理的间距和字体大小变化
- 清晰的交互状态反馈

### 3. 现代感
- 毛玻璃效果和轻微阴影
- 流畅的过渡动画
- 科技感的图标和元素

### 4. 可访问性
- 足够的颜色对比度
- 清晰的触摸目标区域
- 适配不同屏幕尺寸

## 特殊效果

### 毛玻璃效果
```css
.glass-effect {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
```

### 渐显动画
```css
.fade-in {
  animation: fadeIn 0.6s ease-out forwards;
  opacity: 0;
}

@keyframes fadeIn {
  to {
    opacity: 1;
  }
}
```

### 加载遮罩
```css
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
```

## 应用场景

### 1. 引导页面
- 全屏毛玻璃背景
- 逐行渐显文字动画
- 底部固定导航指示

### 2. 测试页面
- 清晰的进度指示
- 卡片式问题布局
- 固定底部操作按钮

### 3. 结果页面
- 突出的数据展示
- 柔和的视觉层次
- 分享和保存功能

### 4. 对话页面
- 气泡式对话布局
- AI响应的加载状态
- 历史记录滚动区域

### 5. 图片上传页面
- 居中的上传区域
- 网格式样例展示
- 固定底部分析按钮

---

**设计风格关键词**: 极简、优雅、现代、科技感、柔和、专业、可信赖