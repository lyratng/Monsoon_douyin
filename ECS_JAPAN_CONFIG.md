# Monsoon项目 - 日本ECS服务器配置文档

## 📊 基本信息

### 实例详情
- **实例ID**: `i-6we5va6yrqmh1dqpckq8`
- **实例名称**: `launch-advisor-20251008`
- **地域**: 日本（东京）
- **可用区**: 日本（东京）C区
- **实例规格**: `ecs.e-c1m2.large`

### 硬件配置
- **CPU**: 2核 vCPU
- **内存**: 4 GiB
- **架构**: x86_64
- **操作系统**: Alibaba Cloud Linux 3.2104 LTS 64位

## 🌐 网络配置

### IP地址
- **公网IP**: `8.209.210.83`
- **私网IP**: `172.30.179.105`
- **带宽**: 1 Mbps 固定带宽

### 网络资源
- **专有网络VPC**: `vpc-6we5b919ejw2wmpw6wb3k`
- **交换机vSwitch**: `vsw-6weq7x3do0vble18rxr8d`
- **网络类型**: 专有网络

## 🔐 访问配置

### 方式1：通过阿里云控制台（推荐）
```
1. 访问阿里云ECS控制台: https://ecs.console.aliyun.com
2. 找到实例: i-6we5va6yrqmh1dqpckq8 或搜索 8.209.210.83
3. 点击右侧 "远程连接"
4. 选择 "通过Workbench远程连接"
5. 用户名: root 或 ecs-user
6. 直接在浏览器中操作服务器（无需SSH密钥）
```

### 方式2：SSH密钥连接
```bash
# SSH密钥位置
密钥文件: /Users/apple/Downloads/monsoon_japan.pem

# SSH连接命令
ssh -i /Users/apple/Downloads/monsoon_japan.pem root@8.209.210.83

# 或使用 ecs-user
ssh -i /Users/apple/Downloads/monsoon_japan.pem ecs-user@8.209.210.83

# 连接参数
主机: 8.209.210.83
端口: 22
用户: root (推荐) 或 ecs-user
密钥: /Users/apple/Downloads/monsoon_japan.pem
```

### 安全组规则
```
✅ SSH (22): 0.0.0.0/0 (已开放)
✅ HTTP (80): 0.0.0.0/0 (已开放)
✅ HTTPS (443): 0.0.0.0/0 (已开放)
✅ 自定义端口配置完成
```

## 💾 存储配置

### 系统盘
- **类型**: ESSD Entry
- **容量**: 40GB
- **设备名**: /dev/xvda
- **文件系统**: ext4

### 数据盘
- **状态**: 无数据盘（系统盘足够使用）

## 💰 计费信息

### 付费详情
- **付费方式**: 包年包月
- **购买时长**: 1个月（测试期）
- **预估月费**: ¥157.07
- **带宽计费**: 按固定带宽
- **到期提醒**: 建议设置自动续费

## 🚀 部署用途

### 项目信息
- **项目名称**: Monsoon 抖音小程序
- **服务类型**: GPT-5 API代理服务
- **解决问题**: 绕过地区限制访问OpenAI GPT-5模型
- **目标**: 解决 `unsupported_country_region_territory` 错误

### 域名配置
- **域名**: api.radiance.asia
- **DNS解析**: A记录 → 8.209.210.83
- **SSL证书**: Let's Encrypt（自动续期，到期时间：2026-01-06）
- **证书邮箱**: lyratng@gmail.om（用于续期提醒）

### 架构设计
```
[抖音小程序] → [api.radiance.asia HTTPS] → [Nginx反向代理] → [Node.js:3000] → [OpenRouter GPT-5]
     ↓                    ↓                         ↓                   ↓                  ↓
  用户请求          SSL加密传输              负载均衡           API转发           GPT模型调用
```

### 实际部署（✅ 已完成）
- **运行环境**: Node.js 18.20.8 ✅
- **Web服务器**: Nginx 1.20.1 (反向代理) ✅
- **SSL证书**: Certbot (Let's Encrypt) ✅
- **API端口**: 3000 (内部) ✅
- **对外端口**: 80 (重定向) / 443 (HTTPS) ✅
- **进程管理**: PM2 (开机自启) ✅
- **API地址**: https://api.radiance.asia/api/chat/completions ✅

## 📝 常用操作

### 连接服务器（两种方式）

#### 方式1：阿里云Workbench（最简单，推荐）
```
1. 访问 https://ecs.console.aliyun.com
2. 找到实例 i-6we5va6yrqmh1dqpckq8
3. 点击 "远程连接" → "通过Workbench远程连接"
4. 用户名: root
5. 直接在浏览器操作，无需密钥
```

#### 方式2：SSH密钥连接
```bash
# 设置密钥权限（首次使用）
chmod 400 /Users/apple/Downloads/monsoon_japan.pem

# SSH连接
ssh -i /Users/apple/Downloads/monsoon_japan.pem root@8.209.210.83

# 配置SSH别名（可选，~/.ssh/config）
Host monsoon-japan
    HostName 8.209.210.83
    User root
    IdentityFile /Users/apple/Downloads/monsoon_japan.pem
    Port 22

# 使用别名连接
ssh monsoon-japan
```

### 系统管理
```bash
# 系统更新
sudo yum update -y

# 查看系统信息
uname -a
cat /etc/os-release

# 查看资源使用
htop
df -h
free -h

# 查看网络状态
ss -tlnp
curl -I http://www.baidu.com
```

## 🛠️ 部署清单

### ✅ 已完成（2025-10-08）
- [x] ECS实例创建
- [x] 网络配置
- [x] 安全组配置（SSH/HTTP/HTTPS）
- [x] SSH密钥配置
- [x] 基础系统准备
- [x] 域名注册和DNS解析（api.radiance.asia）
- [x] 环境安装 (Node.js 18, Nginx, Certbot, PM2)
- [x] API代理服务部署（/home/ecs-user/monsoon-api）
- [x] SSL证书配置（Let's Encrypt，自动续期）
- [x] Nginx反向代理配置
- [x] PM2进程管理和开机自启
- [x] 抖音小程序域名白名单配置
- [x] API功能测试（GPT-5调用成功）

### 📋 待完成（可选优化）
- [ ] 性能监控配置（Prometheus/Grafana）
- [ ] 日志管理配置（日志轮转）
- [ ] 自动备份配置
- [ ] 安全加固（防火墙规则优化）
- [ ] CDN加速（如需要）

## 🔧 API代理服务配置

### 项目位置
```bash
项目目录: /home/ecs-user/monsoon-api
服务文件: /home/ecs-user/monsoon-api/server.js
环境文件: /home/ecs-user/monsoon-api/.env
Nginx配置: /etc/nginx/conf.d/radiance.conf
SSL证书: /etc/letsencrypt/live/api.radiance.asia/
```

### 环境变量
```bash
# /home/ecs-user/monsoon-api/.env
OPENAI_API_KEY=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
PORT=3000
NODE_ENV=production
```

### 服务端口
```
内部服务: localhost:3000 (Node.js)
外部HTTP: 80 → 自动重定向到HTTPS
外部HTTPS: 443 (Nginx反向代理)
域名访问: https://api.radiance.asia
```

### API端点
```
健康检查: https://api.radiance.asia/health
GPT-5 API: https://api.radiance.asia/api/chat/completions
```

### 前端配置（已完成）
```javascript
// config/env.js - 当前配置
const ENV_CONFIG = {
  OPENAI_API_KEY: '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',
  OPENAI_BASE_URL: 'https://api.radiance.asia/api', // ✅ 已配置
  VISION_MODEL: 'openai/gpt-4o',
  TEXT_MODEL: 'openai/gpt-5-chat',
  TIMEOUT: 30000,
  // ...
};
```

### 抖音小程序白名单（已添加）
```
域名: https://api.radiance.asia
类型: request合法域名
状态: ✅ 已添加到抖音开放平台
```

## 📋 完整部署步骤记录

### 1. 系统环境安装
```bash
# 更新系统
sudo yum update -y

# 安装Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 安装Nginx
sudo yum install -y nginx

# 安装SSL证书工具
sudo yum install -y certbot python3-certbot-nginx

# 安装PM2进程管理器
sudo npm install -g pm2

# 验证安装
node --version  # v18.20.8
nginx -v       # nginx/1.20.1
certbot --version
pm2 --version
```

### 2. 创建API代理项目
```bash
# 创建项目目录
mkdir -p /home/ecs-user/monsoon-api
cd /home/ecs-user/monsoon-api

# 初始化项目
npm init -y

# 安装依赖
npm install express cors axios dotenv

# 创建server.js（内容见下方）
# 创建.env文件（内容见下方）
```

### 3. 配置Nginx临时HTTP服务（用于申请SSL）
```bash
# 创建Nginx配置
sudo tee /etc/nginx/conf.d/radiance.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name api.radiance.asia;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

# 测试并启动Nginx
sudo nginx -t
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 4. 启动Node.js服务
```bash
cd /home/ecs-user/monsoon-api

# 使用PM2启动服务
pm2 start server.js --name monsoon-api

# 设置开机自启
pm2 startup
pm2 save

# 查看服务状态
pm2 status
pm2 logs monsoon-api
```

### 5. 申请SSL证书
```bash
# 申请Let's Encrypt证书
sudo certbot --nginx -d api.radiance.asia
# 输入邮箱: lyratng@gmail.om
# 同意条款: Y
# 分享邮箱: N

# 证书自动安装完成
# 证书位置: /etc/letsencrypt/live/api.radiance.asia/
# 到期时间: 2026-01-06
# 自动续期已配置
```

### 6. 更新Nginx完整配置（HTTPS）
```bash
# 更新配置文件
sudo tee /etc/nginx/conf.d/radiance.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name api.radiance.asia;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.radiance.asia;
    
    ssl_certificate /etc/letsencrypt/live/api.radiance.asia/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.radiance.asia/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

# 测试并重启Nginx
sudo nginx -t
sudo systemctl reload nginx
```

### 7. 测试验证
```bash
# 健康检查
curl https://api.radiance.asia/health
# 预期返回: {"status":"OK","timestamp":"..."}

# API调用测试
curl -X POST https://api.radiance.asia/api/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"openai/gpt-5-chat","messages":[{"role":"user","content":"Hello"}],"max_tokens":50}'
# 预期返回: GPT-5响应内容
```

## 🔧 服务管理命令

### PM2服务管理
```bash
# 查看所有服务状态
pm2 status

# 查看日志（实时）
pm2 logs monsoon-api

# 查看日志（最近50行）
pm2 logs monsoon-api --lines 50

# 重启服务
pm2 restart monsoon-api

# 停止服务
pm2 stop monsoon-api

# 启动服务
pm2 start monsoon-api

# 删除服务
pm2 delete monsoon-api

# 查看服务详细信息
pm2 info monsoon-api

# 监控资源使用
pm2 monit

# 保存当前服务列表
pm2 save
```

### Nginx管理
```bash
# 查看状态
sudo systemctl status nginx

# 启动Nginx
sudo systemctl start nginx

# 停止Nginx
sudo systemctl stop nginx

# 重启Nginx
sudo systemctl restart nginx

# 重新加载配置（不中断服务）
sudo systemctl reload nginx

# 测试配置文件语法
sudo nginx -t

# 查看配置文件
cat /etc/nginx/conf.d/radiance.conf

# 查看错误日志
sudo tail -f /var/log/nginx/error.log

# 查看访问日志
sudo tail -f /var/log/nginx/access.log
```

### SSL证书管理
```bash
# 查看所有证书
sudo certbot certificates

# 手动续期所有证书
sudo certbot renew

# 测试续期（不实际续期）
sudo certbot renew --dry-run

# 撤销证书
sudo certbot revoke --cert-path /etc/letsencrypt/live/api.radiance.asia/cert.pem

# 删除证书
sudo certbot delete --cert-name api.radiance.asia
```

### 系统监控
```bash
# 查看端口占用
sudo ss -tlnp | grep -E ":(80|443|3000)"

# 查看进程
ps aux | grep -E "(nginx|node)"

# 查看系统资源
htop           # 需先安装: sudo yum install -y htop
top            # 系统自带
df -h          # 磁盘使用
free -h        # 内存使用

# 查看系统日志
journalctl -u nginx -f          # Nginx日志
journalctl -u pm2-root -f       # PM2日志

# 测试网络连接
curl -I https://api.radiance.asia
ping api.radiance.asia
nslookup api.radiance.asia
```

## 🚨 故障排查指南

### 问题1：API无响应
```bash
# 1. 检查Node.js服务是否运行
pm2 status
pm2 logs monsoon-api

# 2. 检查端口是否被占用
sudo ss -tlnp | grep 3000

# 3. 重启服务
pm2 restart monsoon-api

# 4. 查看详细日志
pm2 logs monsoon-api --lines 100
```

### 问题2：HTTPS无法访问
```bash
# 1. 检查Nginx状态
sudo systemctl status nginx

# 2. 检查SSL证书
sudo certbot certificates

# 3. 检查防火墙/安全组
sudo ss -tlnp | grep -E ":(80|443)"

# 4. 测试Nginx配置
sudo nginx -t

# 5. 查看Nginx错误日志
sudo tail -50 /var/log/nginx/error.log

# 6. 重启Nginx
sudo systemctl restart nginx
```

### 问题3：SSL证书过期
```bash
# 1. 检查证书状态
sudo certbot certificates

# 2. 手动续期
sudo certbot renew

# 3. 重启Nginx
sudo systemctl reload nginx

# 4. 设置自动续期（通常已自动配置）
sudo crontab -e
# 添加: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 问题4：服务器重启后服务未启动
```bash
# 1. 检查PM2自启状态
pm2 startup

# 2. 重新保存PM2服务列表
pm2 save

# 3. 检查Nginx自启状态
sudo systemctl is-enabled nginx
sudo systemctl enable nginx

# 4. 手动启动所有服务
pm2 resurrect
sudo systemctl start nginx
```

### 问题5：域名解析失败
```bash
# 1. 检查DNS解析
nslookup api.radiance.asia
ping api.radiance.asia

# 2. 等待DNS传播（通常需要5-30分钟）

# 3. 清除本地DNS缓存（Mac）
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

# 4. 检查阿里云DNS配置
# 访问域名管理控制台确认A记录配置正确
```

## 📞 联系信息

### 阿里云控制台
- **地址**: https://ecs.console.aliyun.com
- **实例管理**: 云服务器ECS > 实例与镜像 > 实例
- **实例直达**: 搜索 `i-6we5va6yrqmh1dqpckq8`

### 技术支持
- **阿里云工单**: 控制台 > 工单与建议
- **文档中心**: https://help.aliyun.com/product/25365.html

## 🚨 重要提醒

### 安全注意事项
1. **定期更新系统**: `sudo yum update -y`
2. **监控资源使用**: 避免超出配置限制
3. **备份重要数据**: 定期备份配置文件和数据库
4. **监控费用**: 关注账单，避免意外扣费
5. **API Key安全**: 不要泄露API Key，定期更换
6. **防火墙规则**: 定期检查安全组配置

### 性能监控建议
1. **CPU使用率**: 正常 < 70%，告警 > 85%
2. **内存使用率**: 正常 < 80%，告警 > 90%
3. **磁盘使用率**: 正常 < 85%，告警 > 95%
4. **网络带宽**: 监控1Mbps限制，如需升级联系阿里云
5. **API响应时间**: 正常 < 3秒，优化 < 1秒

### 定期维护任务
```bash
# 每周执行
sudo yum update -y              # 更新系统
pm2 logs monsoon-api --lines 100  # 检查日志
df -h                           # 检查磁盘空间

# 每月执行
sudo certbot renew --dry-run    # 测试证书续期
pm2 restart monsoon-api         # 重启服务清理内存

# 每季度执行
备份整个 /home/ecs-user/monsoon-api 目录
备份 /etc/nginx/conf.d/radiance.conf
导出PM2配置: pm2 save
```

## 📊 服务状态总览

### 当前运行状态
```
✅ ECS服务器: 正常运行
✅ Node.js服务: PM2管理，端口3000
✅ Nginx服务: 反向代理，端口80/443
✅ SSL证书: 有效期至 2026-01-06
✅ 域名解析: api.radiance.asia → 8.209.210.83
✅ API健康检查: https://api.radiance.asia/health
✅ GPT-5调用: 正常工作
✅ 抖音小程序: 白名单已配置
```

### 快速访问链接
- **阿里云ECS控制台**: https://ecs.console.aliyun.com
- **域名管理**: 根据您的域名注册商
- **抖音开放平台**: https://developer.open-douyin.com/
- **SSL证书状态**: 登录服务器执行 `sudo certbot certificates`

---

**📝 文档信息**
- **创建时间**: 2025-10-08
- **最后更新**: 2025-10-08
- **部署状态**: ✅ 已完成，服务正常运行
- **维护人员**: lyratng
- **项目版本**: v1.0.0

**🎉 部署完成！Monsoon API服务已成功上线！**
