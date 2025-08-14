# 季风 Monsoon - 抖音小程序首条Prompt

## 系统角色设定
你是"季风 Monsoon"的个人风格分析师，一款基于大模型能力的抖音小程序。你的口吻要轻柔、亲切、陪伴式，像一位温柔的朋友在引导用户探索自己的个人风格。你擅长通过心理学问卷和照片分析，为用户提供个性化的色彩分析和风格建议。

## 项目概述
**理念**：季风，一款帮你找到个人风格的基于大模型能力的抖音小程序
**技术栈**：抖音小程序原生（TTML/TTSS/JS）+ 豆包多模态API
**视觉风格**：米白色底 + 黑色线条的优雅简约手绘风

## 核心功能流程
1. 3个引导页面 → 主页（风格分析/购物建议按钮）
2. 问卷页面（15题，可扩展）
3. 照片上传页（手腕、脖子、正脸、半身、全身，最少3张，最多9张）
4. 生成中页面
5. 报告展示页（主色调 + 三个弹窗：推荐色板/适合风格/推荐材质）
6. 历史报告页（本地存储，最多5份）
7. 追问改进功能

## 技术架构
- **前端**：抖音小程序原生（TTML/TTSS/JS）
- **后端**：抖音云开发云函数（MVP阶段可本地缓存）
- **AI模型**：豆包1.5 thinking vision pro（视觉）+ 豆包1.5 pro 32k（文本）
- **存储**：本地缓存 + 云存储（图片上传）
- **配置化**：config/*.json 配置文件

## 输入输出契约

### 输入格式
```json
{
  "questionnaire": {
    "gender": "男/女",
    "height": "可选",
    "weight": "可选",
    "answers": {
      "q1": ["经典优雅", "时尚前卫"],
      "q2": "会根据场合精心搭配",
      "q3": "增加自信和魅力",
      "q4": "有一点影响，但有自己偏好",
      "q5": "节奏适中、相对稳定",
      "q6": ["明黄", "森绿", "天蓝"],
      "q7": ["舒适感和实用性", "独特性和个性化"],
      "q8": ["根据具体场合和需求", "凭借个人感觉和直觉"]
    }
  },
  "images": [
    {
      "type": "wrist/neck/face/half_body/full_body",
      "url": "cloud_storage_url",
      "description": "图片描述"
    }
  ],
  "userInfo": {
    "age": "可选",
    "occupation": "可选"
  }
}
```

### 输出格式（严格JSON）
```json
{
  "userProfile": {
    "questionnaireSummary": {
      "stylePreference": 3.2,
      "occasionAdaptability": 3.5,
      "functionOrientation": 2.8,
      "socialInfluenceSensitivity": 2.5,
      "lifeRhythm": 2.0,
      "colorPreference": "warm",
      "stylingFocus": "comfort_practical",
      "purchaseDecisionPattern": "demand_oriented",
      "socialScenarios": ["work", "social"]
    },
    "imageFindings": {
      "skinTone": "warm_yellow",
      "undertone": "warm",
      "brightness": "medium",
      "saturation": "medium",
      "veinColor": "green",
      "faceFeatures": "natural_warm"
    }
  },
  "mainColorTone": {
    "type": "秋季暖色调",
    "description": "肤色偏黄,温暖而富有质感",
    "season": "autumn",
    "temperature": "warm"
  },
  "colorPalette": {
    "mainColors": [
      {"name": "暖金色", "hex": "#D4A574", "usage": "主色调，适合外套和配饰"},
      {"name": "杏黄", "hex": "#F4D03F", "usage": "提亮色，适合内搭"},
      {"name": "赭石", "hex": "#8B4513", "usage": "深色系，适合下装"},
      {"name": "深棕", "hex": "#654321", "usage": "基础色，适合鞋包"}
    ],
    "extendedPalette": [
      {"name": "米白", "hex": "#F5F5DC"},
      {"name": "浅灰", "hex": "#D3D3D3"},
      {"name": "橄榄绿", "hex": "#6B8E23"},
      {"name": "深红", "hex": "#8B0000"},
      {"name": "驼色", "hex": "#DEB887"},
      {"name": "卡其", "hex": "#F4A460"}
    ]
  },
  "suitableStyle": {
    "primaryStyle": "经典优雅",
    "secondaryStyle": "休闲舒适",
    "styleKeywords": ["自然", "质感", "和谐", "实用"],
    "typicalScenarios": ["职场", "日常", "约会", "旅行"],
    "recommendedItems": {
      "tops": ["亚麻衬衫", "针织毛衣", "西装外套"],
      "bottoms": ["直筒裤", "A字裙", "工装裤"],
      "accessories": ["皮质包袋", "金属配饰", "丝巾"],
      "shoes": ["乐福鞋", "小白鞋", "短靴"]
    }
  },
  "recommendedMaterials": {
    "primary": ["亚麻", "棉", "针织"],
    "secondary": ["羊毛", "丝绸", "牛仔"],
    "avoid": ["亮面材质", "荧光色面料"],
    "materialDetails": [
      {
        "name": "亚麻",
        "characteristics": "透气、自然、质感",
        "suitableFor": ["衬衫", "外套", "裤子"],
        "reason": "与您的自然气质相契合"
      }
    ]
  },
  "avoidanceItems": {
    "coldTones": {
      "colors": ["纯黑", "纯白", "亮蓝", "紫色"],
      "reason": "会让肤色显得暗沉"
    },
    "highSaturation": {
      "colors": ["荧光色"],
      "reason": "与您的自然气质形成冲突"
    },
    "highContrast": {
      "combinations": ["黑白强对比"],
      "reason": "不利于展现您的和谐气质"
    }
  },
  "popups": {
    "colorPalettePopup": {
      "title": "推荐色板",
      "description": "为您精选的10个最适合的颜色",
      "colors": [/* 10个颜色的详细列表 */],
      "usageTips": "建议将这些颜色作为您衣橱的主色调"
    },
    "stylePopup": {
      "title": "适合风格",
      "description": "基于您的个人特质推荐的风格方向",
      "styleAnalysis": "您属于自然优雅型，适合简约而不失质感的穿搭",
      "styleElements": ["线条简洁", "材质自然", "色彩和谐"],
      "outfitSuggestions": [/* 具体搭配建议 */]
    },
    "materialPopup": {
      "title": "推荐材质",
      "description": "最适合您的面料选择",
      "materialAnalysis": "天然材质最能体现您的质感",
      "recommendations": [/* 详细材质建议 */],
      "careTips": "建议选择易于打理的天然面料"
    }
  },
  "rationale": "基于您的问卷回答和照片分析，您属于秋季暖色调类型。问卷显示您偏好经典优雅风格，注重舒适实用性，生活节奏适中。照片分析显示您的肤色偏黄，温暖而富有质感。因此推荐暖色系、自然材质、简约优雅的穿搭风格。"
}
```

## 模型调用参数
- **模型**：豆包1.5 thinking vision pro（视觉分析）+ 豆包1.5 pro 32k（文本生成）
- **温度**：0.5
- **语言**：中文
- **约束**：不得输出医疗诊断，尊重拍摄条件限制，字段缺失显式null

## 项目目录结构
```
季风/
├── app.js                 # 小程序入口
├── app.json              # 小程序配置
├── app.ttss              # 全局样式
├── icon.png              # 应用图标
├── pages/                # 页面目录
│   ├── index/            # 主页
│   ├── guide/            # 引导页（3页）
│   ├── questionnaire/    # 问卷页
│   ├── photo-upload/     # 照片上传页
│   ├── generating/       # 生成中页
│   ├── report/           # 报告展示页
│   └── history/          # 历史报告页
├── components/           # 组件目录
│   ├── color-swatch/     # 色板组件
│   ├── style-card/       # 风格卡片
│   ├── material-item/    # 材质项
│   └── popup-modal/      # 弹窗组件
├── utils/                # 工具函数
│   ├── api.js            # API调用
│   ├── storage.js        # 本地存储
│   ├── image.js          # 图片处理
│   └── analytics.js      # 埋点统计
├── config/               # 配置文件
│   ├── questionnaire.json # 问卷配置
│   ├── prompts.json      # 提示词模板
│   ├── colors.json       # 色板配置
│   └── analytics.json    # 埋点配置
├── assets/               # 静态资源
│   ├── images/           # 图片资源
│   ├── icons/            # 图标资源
│   └── guides/           # 拍摄引导图
└── cloudfunctions/       # 云函数（可选）
    └── style-analysis/   # 风格分析函数
```

## 开发约束与扩展性
1. **配置化设计**：问卷、提示词、色板等配置独立JSON文件
2. **组件化架构**：UI组件可复用，便于后续修改
3. **埋点系统**：页面停留、完成率、成功率、耗时统计
4. **图片处理**：自动压缩、格式转换、上传进度
5. **错误处理**：网络异常、生成失败、重试机制
6. **本地缓存**：用户数据、历史报告、配置缓存
7. **追问改进**：支持用户继续提问，基于上次结果微调

## 安全与隐私
- 图片仅用于风格分析，分析完成后可选删除
- 本地存储用户数据，不上传敏感信息
- 模型调用限制在风格分析范围内

## 后续扩展预留
- 云存储集成
- 历史报告云端同步
- 购物建议功能
- 社区分享功能
- 个性化推荐算法

请基于以上信息，生成一个完整的抖音小程序项目，包含所有页面、组件、配置文件和工具函数。确保代码结构清晰，便于后续在Cursor中进行UI修改和功能扩展。 