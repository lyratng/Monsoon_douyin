# 抖音小程序域名配置说明

## 问题描述
当前 API 调用失败，错误信息：
```
request:fail url not in domain list, url == https://api.openai.com/v1/chat/completions
```

## 解决方案

### 1. 配置域名白名单
在抖音小程序开发者平台配置以下域名：

**服务器域名** 需要添加：
- `https://api.openai.com`

### 2. 配置步骤
1. 登录 [抖音小程序开发者平台](https://developer.open-douyin.com/)
2. 进入您的小程序项目
3. 找到 "开发管理" -> "开发设置"
4. 在 "服务器域名" 部分添加：
   - **request合法域名**: `https://api.openai.com`
5. 保存配置

### 3. 临时解决方案
当前已启用模拟数据模式 (`USE_MOCK_DATA: true`)，可以继续测试功能。

要恢复真实API调用，需要：
1. 完成域名配置
2. 将 `config/env.js` 中的 `USE_MOCK_DATA` 改为 `false`

### 4. 生产环境建议
为了更好的安全性，建议：
- 使用后端代理服务器转发API请求
- 将API Key保存在后端，前端只调用自己的API
- 配置自己的服务器域名而不是直接调用OpenAI

## 当前状态
✅ 模拟数据已启用，功能可正常测试  
⏳ 等待域名配置完成  
⏳ 待配置完成后切换到真实API  
