# 服务器部署指南

## 阿里云ECS服务器信息
- 服务器地址：api.radiance.asia
- Node.js服务目录：/home/ecs-user/monsoon-api/
- 进程管理：PM2 (monsoon-api)

## 部署代码的正确方法

### ⚠️ 注意：不要使用以下方法
- ❌ nano/vim 直接粘贴代码（会导致编码问题）
- ❌ cat << 'EOF' heredoc（会导致编码问题）
- ❌ base64 编码传输（会被破坏）
- ❌ scp（可能连接不稳定）

### ✅ 正确方法：使用Python写入

```bash
python3 << 'PYEOF'
code = '''
# 在这里放入你的JavaScript代码
const express = require('express');
// ... 更多代码 ...
'''
with open('/home/ecs-user/monsoon-api/server.js', 'w') as f:
    f.write(code)
print('Done!')
PYEOF
```

### 验证和重启

```bash
# 检查语法
node --check /home/ecs-user/monsoon-api/server.js

# 重启服务
pm2 restart monsoon-api

# 查看日志
pm2 logs monsoon-api --lines 20

# 测试API
curl https://api.radiance.asia/health
curl https://api.radiance.asia/api/content-security/token
```

## 常用命令

```bash
# 查看当前代码
cat /home/ecs-user/monsoon-api/server.js

# 备份代码
cp /home/ecs-user/monsoon-api/server.js /home/ecs-user/monsoon-api/server.js.backup

# 恢复备份
cp /home/ecs-user/monsoon-api/server.js.backup /home/ecs-user/monsoon-api/server.js

# 查看PM2状态
pm2 status

# 查看实时日志
pm2 logs monsoon-api
```

## 当前已部署的API端点

1. `GET /health` - 健康检查
2. `POST /api/chat/completions` - OpenAI代理
3. `POST /api/content-security/text` - 文本安全检测（抖音API）
4. `POST /api/content-security/image` - 图片安全检测（抖音API）
5. `GET /api/content-security/token` - 测试Token获取

## 重要：抖音API Token接口

⚠️ **必须使用正确的Token接口**：

- ❌ 错误：`https://open.douyin.com/oauth/client_token/`（返回的token无法用于内容安全检测）
- ✅ 正确：`https://developer.toutiao.com/api/apps/v2/token`

参数格式：
```json
{
  "appid": "tt6a791cc4f57bed5d01",
  "secret": "你的AppSecret",
  "grant_type": "client_credential"
}
```

返回格式：
```json
{
  "err_no": 0,
  "err_tips": "success",
  "data": {
    "access_token": "xxx",
    "expires_in": 7200
  }
}
```

