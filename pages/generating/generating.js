// pages/generating/generating.js - 生成中页面逻辑

const app = getApp();

Page({
  data: {
    progress: 0,
    currentStep: 0,
    steps: [
      { name: '分析问卷数据', icon: '📝', description: '正在分析您的问卷回答...' },
      { name: '处理照片信息', icon: '📸', description: '正在分析上传的照片...' },
      { name: '生成风格报告', icon: '🎨', description: '正在生成个性化风格建议...' },
      { name: '优化推荐内容', icon: '✨', description: '正在优化推荐内容...' }
    ],
    isGenerating: false,
    errorMessage: '',
    showError: false
  },

  onLoad() {
    console.log('生成中页面加载');
    this.startGeneration();
  },

  // 开始生成
  async startGeneration() {
    this.setData({
      isGenerating: true,
      progress: 0,
      currentStep: 0,
      errorMessage: '',
      showError: false
    });

    try {
      // 检查必要数据
      if (!app.globalData.questionnaireData) {
        throw new Error('问卷数据缺失');
      }

      if (!app.globalData.uploadedImages || app.globalData.uploadedImages.length === 0) {
        throw new Error('照片数据缺失');
      }

      console.log('开始生成风格报告...');

      // 步骤1: 分析问卷数据
      await this.updateProgress(0, '分析问卷数据');
      await this.analyzeQuestionnaire();

      // 步骤2: 处理照片信息
      await this.updateProgress(1, '处理照片信息');
      await this.analyzeImages();

      // 步骤3: 生成风格报告
      await this.updateProgress(2, '生成风格报告');
      const report = await this.generateStyleReport();

      // 步骤4: 优化推荐内容
      await this.updateProgress(3, '优化推荐内容');
      await this.optimizeReport(report);

      // 保存报告
      app.globalData.currentReport = report;
      app.saveHistoryReport(report);

      // 跳转到报告页
      setTimeout(() => {
        tt.navigateTo({
          url: '/pages/report/report'
        });
      }, 1000);

    } catch (error) {
      console.error('生成报告失败:', error);
      this.handleError(error.message || '生成报告失败，请重试');
    }
  },

  // 更新进度
  async updateProgress(stepIndex, stepName) {
    const progress = ((stepIndex + 1) / this.data.steps.length) * 100;
    
    this.setData({
      currentStep: stepIndex,
      progress: progress
    });

    console.log(`执行步骤 ${stepIndex + 1}: ${stepName}`);
    
    // 模拟处理时间
    await this.delay(1500 + Math.random() * 1000);
  },

  // 延迟函数
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // 分析问卷数据
  async analyzeQuestionnaire() {
    try {
      const questionnaireData = app.globalData.questionnaireData;
      console.log('分析问卷数据:', questionnaireData);
      
      // 模拟分析
      await this.delay(1000);
      console.log('问卷分析完成');
      
    } catch (error) {
      console.error('问卷分析失败:', error);
      throw new Error('问卷分析失败');
    }
  },

  // 分析照片信息
  async analyzeImages() {
    try {
      const images = app.globalData.uploadedImages;
      console.log('分析照片信息:', images);
      
      // 模拟分析
      await this.delay(1500);
      console.log('照片分析完成');
      
    } catch (error) {
      console.error('照片分析失败:', error);
      throw new Error('照片分析失败');
    }
  },

  // ========== 季型分析模块 ==========
  
  // A. 手腕分析prompt
  buildSeasonPromptA() {
    return `你是专业的十二季色彩分析师。输入是一张"手腕/手背靠近手腕处"的清晰照片。请仅分析血管颜色来判断冷暖，不看指尖与掌心，不看指甲颜色。

【枚举与数值规范】
- 所有数值：范围[0,1]，最多三位小数；计算后先截断到[0,1]，再四舍五入至三位。
- meta.light_condition ∈ {"natural","warm","cool","mixed"}
- meta.photo_quality ∈ {"high","medium","low"}
- meta.flags 为布尔标志对象，键至少包含：{"filter","beauty","overexposure","underexposure","strong_shadow","color_cast","occlusion"}
- features 仅包含 name="warm_cool" 一项；weight 固定为 0.300。

【判断步骤】
1) 识别血管主观颜色比例：
   - 估计 green_ratio 与 purple_ratio，二者和≈1.000（允许±0.020误差）。
   - green_ratio>purple_ratio ⇒ value="warm"，否则 value="cool"；strength=较大者。
   - 若二者非常接近（|差值|<0.05），仍需给出胜出侧，strength≥0.501。

2) 光线识别（meta.light_condition）：
   - 肤色/背景整体偏黄橙、白平衡偏暖 ⇒ "warm"
   - 明显偏蓝青 ⇒ "cool"
   - 区域混合或双色光 ⇒ "mixed"
   - 接近日光中性 ⇒ "natural"

3) 画质评估（meta.photo_quality）：
   - "high"：对焦清晰、噪点低、无重度压缩/锐化伪影
   - "medium"：轻微模糊或压缩但血管仍易辨
   - "low"：明显模糊、强压缩、严重噪点/摩尔纹

4) 标志（meta.flags）：
   - filter：疑似滤镜/统一色调
   - beauty：疑似美颜磨皮/瘦形
   - overexposure/underexposure：局部过曝/欠曝
   - strong_shadow：明显硬阴影
   - color_cast：明显偏色
   - occlusion：目标被遮挡

5) 置信度计算（confidence）——以血管稳健性为基线：
   - 基线：0.900
   - 若 photo_quality="medium"：-0.100；"low"：-0.200
   - 若 flags.filter 或 flags.beauty：各 -0.050
   - 若 flags.overexposure 或 flags.underexposure 或 flags.strong_shadow：各 -0.050（最多-0.150）
   - 若 light_condition="mixed"：-0.050
   - 限幅：min=0.600，max=0.980

6) 输出要求：仅输出 JSON，字段与模板一致；数值三位小数。

【输出 JSON 模板】
{
  "part": "wrist",
  "meta": {
    "light_condition": "natural|warm|cool|mixed",
    "photo_quality": "high|medium|low",
    "flags": {
      "filter": false,
      "beauty": false,
      "overexposure": false,
      "underexposure": false,
      "strong_shadow": false,
      "color_cast": false,
      "occlusion": false
    },
    "notes": "可简述取样区域与异常现象"
  },
  "observations": {
    "green_ratio": 0.000,
    "purple_ratio": 0.000
  },
  "features": [
    {
      "name": "warm_cool",
      "value": "warm or cool",
      "strength": 0.000,
      "confidence": 0.000,
      "weight": 0.300
    }
  ]
}`;
  },

  // B. 脖子分析prompt
  buildSeasonPromptB() {
    return `你是专业的十二季色彩分析师。输入是一张"脖颈区域"照片，尽量避开厚重彩妆、项链强反光与大片硬阴影；以皮肤中性色区（颈侧、锁骨上方）判断冷暖。

【枚举与数值规范】
- 数值范围与四舍五入：同上（0–1，三位小数）
- meta.light_condition ∈ {"natural","warm","cool","mixed"}
- meta.photo_quality ∈ {"high","medium","low"}
- meta.flags 至少含：{"filter","beauty","overexposure","underexposure","strong_shadow","color_cast","occlusion","heavy_makeup"}
- features 仅包含 name="warm_cool"，weight=0.300

【判断步骤】
1) 冷暖判定：
   - 观察颈部中性色区底色与泛红/泛黄倾向：
     * 偏桃粉/玫紫/青粉 ⇒ "cool"
     * 偏金杏/橄榄/黄米 ⇒ "warm"
   - value 取优势侧；strength 表示优势强度，若模糊也需 ≥0.501。

2) 光线与画质：
   - light_condition 与 photo_quality 判定标准同 A。
   - heavy_makeup：若出现修容/粉底明显改变底色，设为 true。

3) 置信度计算（从画质出发再按光线一致性微调）：
   - 基线（按 photo_quality）："high"=0.800；"medium"=0.700；"low"=0.600
   - 若 light_condition 与 value 方向相反（如光暖而判断为 cool，或光冷而判断为 warm）：+0.100
   - 若 light_condition 与 value 同向：-0.100
   - flags.filter/beauty：各 -0.050
   - flags.overexposure/underexposure/strong_shadow/color_cast：各 -0.050（最多-0.150）
   - flags.heavy_makeup：-0.100
   - 限幅：min=0.550，max=0.950

4) 输出仅 JSON；数值三位小数。

【输出 JSON 模板】
{
  "part": "neck",
  "meta": {
    "light_condition": "natural|warm|cool|mixed",
    "photo_quality": "high|medium|low",
    "flags": {
      "filter": false,
      "beauty": false,
      "overexposure": false,
      "underexposure": false,
      "strong_shadow": false,
      "color_cast": false,
      "occlusion": false,
      "heavy_makeup": false
    },
    "notes": "注明是否有首饰反光/厚粉底/色温偏移等"
  },
  "features": [
    {
      "name": "warm_cool",
      "value": "warm or cool",
      "strength": 0.000,
      "confidence": 0.000,
      "weight": 0.300
    }
  ]
}`;
  },

  // C. 正脸分析prompt
  buildSeasonPromptC() {
    return `你是专业的十二季色彩分析师。输入是一张"正脸"照片，尽量直面镜头、无遮挡、不强背光。分别判断：冷暖(warm_cool)、深浅(contrast_depth: deep|light)、亮/柔(clarity: bright|soft)。

【枚举与数值规范】
- 数值：0–1，三位小数；四舍五入前先截断到[0,1]
- meta.light_condition ∈ {"natural","warm","cool","mixed"}
- meta.photo_quality ∈ {"high","medium","low"}
- meta.flags 至少含：{"filter","beauty","overexposure","underexposure","strong_shadow","color_cast","occlusion","heavy_makeup","glasses_reflection"}
- weights：warm_cool=0.240；contrast_depth=0.500；clarity=0.500

【判定要点】
1) 冷暖（warm_cool）：
   - 取耳廓、颧侧、法令区等易显底色区域；避开口红/腮红影响。
   - value 与 strength：优势侧≥0.501；明显优势≥0.700。

2) 深浅（contrast_depth: deep|light）：
   - 依据"头发-皮肤-五官"的明度跨度与阴影力度：
     * deep：黑白对比大、轮廓边缘清晰、五官阴影深
     * light：整体明度接近、阴影浅、对比度小
   - strength 指偏向强度，明显 deep/light ≥0.700。

3) 亮/柔（clarity: bright|soft）：
   - bright：边缘清晰、毛孔/睫毛等微细节可辨、肌肤通透高光、色彩饱和稳定
   - soft：轻微雾化/去纹理、边缘松散、饱和度偏低或偏灰
   - strength：明显特征 ≥0.700。

4) 光线/画质/标志：
   - light_condition/photo_quality：标准同前
   - flags.glasses_reflection：若镜片强反光影响对比/清晰度
   - heavy_makeup：厚粉底/高遮瑕/强高光阴影修容

5) 置信度计算：
   - 对 warm_cool：
     * 基线（按 photo_quality）：high=0.800，medium=0.700，low=0.600
     * light_condition 与 value 相反：+0.100；同向：-0.100
     * heavy_makeup：-0.100；filter/beauty：各 -0.050
     * over/underexposure/strong_shadow/color_cast：各 -0.050（最多-0.150）
     * 限幅：0.550–0.950
   - 对 contrast_depth：
     * 基线：high=0.850，medium=0.700，low=0.600
     * 模糊/强去纹理(beauty=true)：-0.100
     * over/underexposure/strong_shadow：各 -0.050（最多-0.150）
     * glasses_reflection：-0.050
     * 限幅：0.550–0.960
   - 对 clarity：
     * 基线：high=0.850，medium=0.700，low=0.600
     * beauty 或 filter：各 -0.100
     * 模糊、降噪/涂抹痕迹：-0.100
     * over/underexposure/color_cast：各 -0.050（最多-0.150）
     * 限幅：0.550–0.960

6) 输出仅 JSON；数值三位小数。

【输出 JSON 模板】
{
  "part": "face",
  "meta": {
    "light_condition": "natural|warm|cool|mixed",
    "photo_quality": "high|medium|low",
    "flags": {
      "filter": false,
      "beauty": false,
      "overexposure": false,
      "underexposure": false,
      "strong_shadow": false,
      "color_cast": false,
      "occlusion": false,
      "heavy_makeup": false,
      "glasses_reflection": false
    },
    "notes": "注明是否口红/腮红影响、反光等"
  },
  "features": [
    {
      "name": "warm_cool",
      "value": "warm or cool",
      "strength": 0.000,
      "confidence": 0.000,
      "weight": 0.240
    },
    {
      "name": "contrast_depth",
      "value": "deep or light",
      "strength": 0.000,
      "confidence": 0.000,
      "weight": 0.500
    },
    {
      "name": "clarity",
      "value": "bright or soft",
      "strength": 0.000,
      "confidence": 0.000,
      "weight": 0.500
    }
  ]
}`;
  },

  // D. 半身分析prompt
  buildSeasonPromptD() {
    return `你是专业的十二季色彩分析师。输入是一张"半身"照片（含头肩与上衣）。在判断时，以裸露皮肤（颈、手臂）为主，衣物颜色仅作旁证；如衣物高饱和或强对比，需下调相关置信度并记录标志。

【枚举与数值规范】
- 数值：0–1，三位小数
- meta.light_condition ∈ {"natural","warm","cool","mixed"}
- meta.photo_quality ∈ {"high","medium","low"}
- meta.flags 至少含：{"filter","beauty","overexposure","underexposure","strong_shadow","color_cast","occlusion","heavy_makeup","strong_clothing_influence","busy_background"}
- weights：warm_cool=0.080；contrast_depth=0.250；clarity=0.250

【判定要点】
1) warm_cool：以可见皮肤底色为基准；衣物仅参考。
2) contrast_depth：综合"人+衣"的整体明度反差（衣物极深/极浅会抬高或压低对比观感）。
3) clarity：画面整体清晰度/通透感与边缘锐度（衣料纹理与灯光雾化会影响）。

【置信度计算】
- 对 warm_cool：
  * 基线：high=0.750，medium=0.650，low=0.600
  * light_condition 与 value 相反：+0.050；同向：-0.050
  * strong_clothing_influence 或 busy_background：-0.100
  * heavy_makeup：-0.050；filter/beauty：各 -0.050
  * 过/欠曝、强阴影、偏色：各 -0.050（最多-0.150）
  * 限幅：0.500–0.900
- 对 contrast_depth：
  * 基线：high=0.800，medium=0.680，low=0.600
  * strong_clothing_influence/busy_background：-0.100
  * 模糊/美颜：-0.100；过/欠曝、强阴影：各 -0.050
  * 限幅：0.500–0.940
- 对 clarity：
  * 基线：high=0.800，medium=0.680，low=0.600
  * filter/beauty 或明显降噪/涂抹：-0.100
  * strong_clothing_influence/busy_background：-0.050
  * 过/欠曝、偏色：各 -0.050
  * 限幅：0.500–0.940

【输出 JSON 模板】
{
  "part": "half_body",
  "meta": {
    "light_condition": "natural|warm|cool|mixed",
    "photo_quality": "high|medium|low",
    "flags": {
      "filter": false,
      "beauty": false,
      "overexposure": false,
      "underexposure": false,
      "strong_shadow": false,
      "color_cast": false,
      "occlusion": false,
      "heavy_makeup": false,
      "strong_clothing_influence": false,
      "busy_background": false
    },
    "notes": "如衣物/背景干扰强，需说明"
  },
  "features": [
    {
      "name": "warm_cool",
      "value": "warm or cool",
      "strength": 0.000,
      "confidence": 0.000,
      "weight": 0.080
    },
    {
      "name": "contrast_depth",
      "value": "deep or light",
      "strength": 0.000,
      "confidence": 0.000,
      "weight": 0.250
    },
    {
      "name": "clarity",
      "value": "bright or soft",
      "strength": 0.000,
      "confidence": 0.000,
      "weight": 0.250
    }
  ]
}`;
  },

  // E. 全身分析prompt
  buildSeasonPromptE() {
    return `你是专业的十二季色彩分析师。输入是一张"全身"照片。以裸露皮肤为准，服饰与背景仅作旁证；当服饰/背景强干扰时需降低相关置信度并记录标志。

【枚举与数值规范】
- 数值：0–1，三位小数
- meta.light_condition ∈ {"natural","warm","cool","mixed"}
- meta.photo_quality ∈ {"high","medium","low"}
- meta.flags 至少含：{"filter","beauty","overexposure","underexposure","strong_shadow","color_cast","occlusion","heavy_makeup","strong_clothing_influence","busy_background"}
- weights：warm_cool=0.080；contrast_depth=0.250；clarity=0.250

【判定要点】
1) warm_cool：以可见皮肤底色判断；服饰仅参考。
2) contrast_depth：人物与服饰/背景整体明度反差；远景时注意曝光压缩。
3) clarity：全身画面清晰度、边缘锐度与雾化程度。

【置信度计算】
- 对 warm_cool：
  * 基线：high=0.700，medium=0.630，low=0.580
  * light_condition 与 value 相反：+0.050；同向：-0.050
  * strong_clothing_influence/busy_background：-0.100
  * heavy_makeup：-0.050；filter/beauty：各 -0.050
  * 过/欠曝、强阴影、偏色：各 -0.050（最多-0.150）
  * 限幅：0.500–0.880
- 对 contrast_depth：
  * 基线：high=0.780，medium=0.660，low=0.580
  * strong_clothing_influence/busy_background：-0.100
  * 模糊/美颜：-0.100；过/欠曝、强阴影：各 -0.050
  * 限幅：0.500–0.920
- 对 clarity：
  * 基线：high=0.780，medium=0.660，low=0.580
  * filter/beauty 或明显降噪/涂抹：-0.100
  * strong_clothing_influence/busy_background：-0.050
  * 过/欠曝、偏色：各 -0.050
  * 限幅：0.500–0.920

【输出 JSON 模板】
{
  "part": "full_body",
  "meta": {
    "light_condition": "natural|warm|cool|mixed",
    "photo_quality": "high|medium|low",
    "flags": {
      "filter": false,
      "beauty": false,
      "overexposure": false,
      "underexposure": false,
      "strong_shadow": false,
      "color_cast": false,
      "occlusion": false,
      "heavy_makeup": false,
      "strong_clothing_influence": false,
      "busy_background": false
    },
    "notes": "说明远景压缩/背景强对比等"
  },
  "features": [
    {
      "name": "warm_cool",
      "value": "warm or cool",
      "strength": 0.000,
      "confidence": 0.000,
      "weight": 0.080
    },
    {
      "name": "contrast_depth",
      "value": "deep or light",
      "strength": 0.000,
      "confidence": 0.000,
      "weight": 0.250
    },
    {
      "name": "clarity",
      "value": "bright or soft",
      "strength": 0.000,
      "confidence": 0.000,
      "weight": 0.250
    }
  ]
}`;
  },

  // F. 融合分析prompt
  buildSeasonPromptF(firstLayerResults) {
    // 解析第一层结果
    const parsedResults = firstLayerResults.map((result, index) => {
      try {
        const content = result.choices[0].message.content;
        return JSON.parse(content);
      } catch (error) {
        console.error(`解析第${index + 1}个结果失败:`, error);
        return null;
      }
    }).filter(result => result !== null);

    return `你是专业的十二季色彩分析融合器。输入是来自 A–E 的五段 JSON，它们都包含 part/meta/features。请按下述规则计算六类属性得分并输出唯一 JSON 结果。仅输出 JSON，不要多余文本。所有数值取 0–1、三位小数。

【输入数据】
${JSON.stringify(parsedResults, null, 2)}

【属性集合】
six_attrs = {"warm","cool","light","deep","bright","soft"}
同义映射（用于季型表）："dark"≡"deep"；"muted"≡"soft"

【计算规则】
1) 初始化 scores[attr]=0
2) 遍历每个输入的 features：
   - name="warm_cool"：
       value="warm" ⇒ scores.warm += strength*confidence*weight
       value="cool" ⇒ scores.cool  += strength*confidence*weight
   - name="contrast_depth"：
       value="deep"  ⇒ scores.deep  += strength*confidence*weight
       value="light" ⇒ scores.light += strength*confidence*weight
   - name="clarity"：
       value="bright"⇒ scores.bright+= strength*confidence*weight
       value="soft"  ⇒ scores.soft  += strength*confidence*weight
3) 所有加总完成后，将 scores 各值截断到[0,1]并四舍五入三位小数。
4) 排序得到 ranking（从高到低的六项）。
5) 形成 top3 为 ranking 的前三。
6) **强制冷暖**：若 top2 不包含 {"warm","cool"}，则从 {"warm","cool"} 中选择分数更高者，替换第二名，并置 forced_coolwarm=true；否则 forced_coolwarm=false。
7) 取调整后的 first 与 second，按映射表得到 season：
   映射（First,Second → Season）：
   (Bright, Warm) → 净春
   (Warm, Bright) → 暖春
   (Light, Warm) → 浅春
   (Light, Cool) → 浅夏
   (Cool, Muted) → 冷夏
   (Muted, Cool) → 柔夏
   (Muted, Warm) → 柔秋
   (Dark,  Warm) → 深秋
   (Warm,  Muted)→ 暖秋
   (Dark,  Cool) → 深冬
   (Cool,  Bright)→ 冷冬
   (Bright,Cool) → 净冬
   备注：在匹配时用 {"deep"→"Dark","soft"→"Muted","bright"→"Bright","light"→"Light"} 的名义进行匹配。

8) **次优候选（secondary_candidates）**：
   - 规则 A：保持第一不变，用第三与第一组成候选（若有映射）。
   - 规则 B：保持第二不变，用第三与第二组成候选（若有映射）。
   - 最多返回 2 个候选，按对应 pair 的 min(scores[first_like], scores[second_like]) 降序。
   - 给出简短 reason，例如"第三属性接近第二，且与第一能形成有效季型"。

9) 简短解释 rationale（≤70字）：说明贡献最大的维度/部位与关键置信度因素。

【输出 JSON 模板】
{
  "scores": {
    "warm": 0.000,
    "cool": 0.000,
    "light": 0.000,
    "deep": 0.000,
    "bright": 0.000,
    "soft": 0.000
  },
  "ranking": [
    {"attr": "X", "score": 0.000},
    {"attr": "Y", "score": 0.000},
    {"attr": "Z", "score": 0.000},
    {"attr": "W", "score": 0.000},
    {"attr": "U", "score": 0.000},
    {"attr": "V", "score": 0.000}
  ],
  "top3": [
    {"attr": "X", "score": 0.000},
    {"attr": "Y", "score": 0.000},
    {"attr": "Z", "score": 0.000}
  ],
  "pair_used": {
    "first": "X",
    "second": "Y",
    "forced_coolwarm": false
  },
  "season": "净春 | 暖春 | 浅春 | 浅夏 | 冷夏 | 柔夏 | 柔秋 | 深秋 | 暖秋 | 深冬 | 冷冬 | 净冬",
  "secondary_candidates": [
    {
      "pair": ["X","Z"],
      "season": "…",
      "reason": "简述为何成立（≤40字）"
    }
  ],
  "rationale": "≤70字，说明关键来源与可信度因素"
}`;
  },

  // ========== 季型分析核心函数 ==========
  
  // 季型分析主函数
  async analyzeSeasonType(images) {
    try {
      console.log('=== 开始季型分析 ===');
      const api = require('../../utils/api.js');
      
      // 1. 第一层分析：A-E五个prompt
      const firstLayerResults = await this.analyzeSeasonFirstLayer(api, images);
      
      // 2. 第二层融合：F prompt
      const seasonResult = await this.analyzeSeasonSecondLayer(api, firstLayerResults);
      
      console.log('季型分析完成:', seasonResult);
      return seasonResult;
      
    } catch (error) {
      console.error('季型分析失败:', error);
      // 返回默认季型结果
      return this.getDefaultSeasonResult();
    }
  },

  // 第一层分析：A-E五个prompt
  async analyzeSeasonFirstLayer(api, images) {
    const seasonPrompts = [
      this.buildSeasonPromptA(), // 手腕
      this.buildSeasonPromptB(), // 脖子
      this.buildSeasonPromptC(), // 正脸
      this.buildSeasonPromptD(), // 半身
      this.buildSeasonPromptE()  // 全身
    ];
    
    const results = [];
    
    // 并行处理所有prompt
    const promises = images.map(async (image, index) => {
      if (index < seasonPrompts.length) {
        try {
          console.log(`=== 季型分析 ${index + 1}/5: ${['手腕', '脖子', '正脸', '半身', '全身'][index]} ===`);
          const result = await api.callVisionAPI(image.imageData, seasonPrompts[index]);
          console.log(`✅ 季型分析 ${index + 1} 完成:`, result);
          return result;
        } catch (error) {
          console.error(`❌ 季型分析 ${index + 1} 失败:`, error);
          return this.getDefaultSeasonAnalysis(index);
        }
      }
      return null;
    });
    
    const analysisResults = await Promise.all(promises);
    
    // 过滤掉null结果，确保有5个结果
    for (let i = 0; i < 5; i++) {
      if (analysisResults[i]) {
        results.push(analysisResults[i]);
      } else {
        results.push(this.getDefaultSeasonAnalysis(i));
      }
    }
    
    return results;
  },

  // 第二层融合：F prompt
  async analyzeSeasonSecondLayer(api, firstLayerResults) {
    try {
      console.log('=== 开始季型融合分析 ===');
      
      const fusionPrompt = this.buildSeasonPromptF(firstLayerResults);
      const result = await api.callTextAPI(fusionPrompt, 0.3);
      
      console.log('季型融合分析完成:', result);
      
      // 解析结果
      try {
        const content = result.choices[0].message.content;
        const seasonResult = JSON.parse(content);
        return seasonResult;
      } catch (parseError) {
        console.error('季型融合结果解析失败:', parseError);
        return this.getDefaultSeasonResult();
      }
      
    } catch (error) {
      console.error('季型融合分析失败:', error);
      return this.getDefaultSeasonResult();
    }
  },

  // 获取默认季型分析结果
  getDefaultSeasonAnalysis(index) {
    const parts = ['wrist', 'neck', 'face', 'half_body', 'full_body'];
    const part = parts[index] || 'unknown';
    
    return {
      choices: [{
        message: {
          content: JSON.stringify({
            part: part,
            meta: {
              light_condition: "natural",
              photo_quality: "medium",
              flags: {
                filter: false,
                beauty: false,
                overexposure: false,
                underexposure: false,
                strong_shadow: false,
                color_cast: false,
                occlusion: false
              },
              notes: "默认分析结果"
            },
            features: [
              {
                name: "warm_cool",
                value: "warm",
                strength: 0.600,
                confidence: 0.700,
                weight: 0.300
              }
            ]
          })
        }
      }]
    };
  },

  // 获取默认季型结果
  getDefaultSeasonResult() {
    return {
      scores: {
        warm: 0.600,
        cool: 0.400,
        light: 0.500,
        deep: 0.500,
        bright: 0.500,
        soft: 0.500
      },
      ranking: [
        {"attr": "warm", "score": 0.600},
        {"attr": "light", "score": 0.500},
        {"attr": "deep", "score": 0.500},
        {"attr": "bright", "score": 0.500},
        {"attr": "soft", "score": 0.500},
        {"attr": "cool", "score": 0.400}
      ],
      top3: [
        {"attr": "warm", "score": 0.600},
        {"attr": "light", "score": 0.500},
        {"attr": "deep", "score": 0.500}
      ],
      pair_used: {
        first: "warm",
        second: "light",
        forced_coolwarm: false
      },
      season: "浅春",
      secondary_candidates: [],
      rationale: "默认季型分析结果"
    };
  },

  // 测试简单AI调用
  async testSimpleAI() {
    try {
      console.log('=== 开始简单AI测试 ===');
      const api = require('../../utils/api.js');
      
      const simplePrompt = "请回答：你好，请用一句话回复。";
      
      const response = await api.callTextAPI(simplePrompt, 0.5);
      console.log('简单AI测试成功:', response);
      return true;
    } catch (error) {
      console.error('简单AI测试失败:', error);
      return false;
    }
  },

  // 生成风格报告
  async generateStyleReport() {
    try {
      console.log('生成风格报告...');
      
      const questionnaireData = app.globalData.questionnaireData;
      const images = app.globalData.uploadedImages;
      
      // 总是尝试调用AI（使用占位照片）
      try {
        console.log('尝试调用真实AI分析...');
        const report = await this.callRealAI(questionnaireData, images);
        console.log('AI分析完成:', report);
        return report;
      } catch (aiError) {
        console.error('AI调用失败，使用问卷分析:', aiError);
        // AI失败时，基于问卷生成结果
        return this.generateReportFromQuestionnaire(questionnaireData);
      }
      
    } catch (error) {
      console.error('生成风格报告失败:', error);
      return this.generateMockReport();
    }
  },

  // 调用真实AI
  async callRealAI(questionnaireData, images) {
    try {
      console.log('开始调用真实AI...');
      
      // 先测试简单AI调用
      const simpleTest = await this.testSimpleAI();
      if (!simpleTest) {
        throw new Error('简单AI测试失败，跳过复杂调用');
      }
      
      const api = require('../../utils/api.js');
      
      // 使用用户上传的照片数据
      console.log('=== 生成报告页面接收到的照片数据 ===');
      console.log('照片数组长度:', images.length);
      console.log('照片数据详情:', images.map((img, index) => ({
        index: index + 1,
        type: img.type,
        hasImageData: !!img.imageData,
        imageDataLength: img.imageData ? img.imageData.length : 0,
        imageDataStart: img.imageData ? img.imageData.substring(0, 50) + '...' : 'none',
        mimeType: img.mimeType
      })));
      
      // 提取base64图片数据
      console.log('=== 开始提取base64图片数据 ===');
      const imageDataList = images.map((image, index) => {
        if (image.imageData && image.imageData.startsWith('data:image')) {
          console.log(`✅ 照片${index + 1}使用base64数据，长度: ${image.imageData.length}`);
          return image.imageData;
        } else {
          console.log(`⚠️ 照片${index + 1}使用占位图片，原因: ${!image.imageData ? '无imageData' : '不是data:image格式'}`);
          return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
        }
      });
      console.log('最终传递给AI的图片数据数量:', imageDataList.length);
      
      // 1. 季型分析（ABCDEF）
      console.log('=== 开始季型分析（ABCDEF） ===');
      const seasonResult = await this.analyzeSeasonType(images);
      console.log('季型分析结果:', seasonResult);
      
      // 2. 分析照片（原有视觉分析）
      console.log('=== 开始AI照片分析 ===');
      console.log('准备分析的照片数量:', imageDataList.length);
      const imageAnalysis = await this.analyzeImagesWithAI(api, imageDataList);
      
      // 3. 生成完整报告（集成季型结果）
      console.log('生成风格报告中...');
      const report = await this.generateReportWithAI(api, questionnaireData, imageAnalysis, seasonResult);
      
      console.log('AI分析完成:', report);
      return report;
      
    } catch (error) {
      console.error('AI调用失败:', error);
      throw error;
    }
  },

  // 使用AI分析照片
  async analyzeImagesWithAI(api, images) {
    try {
      const imagePrompts = [
        "请分析这张照片中人物的肤色特征，包括肤色色调、亮度、饱和度等。重点关注面部和手部的肤色。",
        "请分析这张照片中人物的面部特征和整体气质，包括面部轮廓、五官特点、表情气质等。",
        "请分析这张照片中人物的整体形象，包括身材比例、穿着风格、个人气质等。"
      ];
      
      const analyses = [];
      
      for (let i = 0; i < Math.min(images.length, imagePrompts.length); i++) {
        try {
          console.log(`=== 开始分析照片${i+1} ===`);
          console.log(`照片${i+1}数据长度:`, images[i].length);
          console.log(`照片${i+1}数据开头:`, images[i].substring(0, 50) + '...');
          
          const analysis = await api.callVisionAPI(images[i], imagePrompts[i]);
          analyses.push(analysis);
          console.log(`✅ 照片${i+1}分析完成:`, analysis);
        } catch (error) {
          console.error(`❌ 照片${i+1}分析失败:`, error);
          console.error(`照片${i+1}错误详情:`, error.message);
          analyses.push({ error: '分析失败' });
        }
      }
      
      return analyses;
      
    } catch (error) {
      console.error('照片分析失败:', error);
      throw error;
    }
  },

  // 使用AI生成完整报告
  async generateReportWithAI(api, questionnaireData, imageAnalysis, seasonResult) {
    const maxRetries = 2;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`AI生成报告尝试 ${attempt}/${maxRetries}`);
        
        const prompt = this.buildAIPrompt(questionnaireData, imageAnalysis, seasonResult);
        
        const response = await api.callTextAPI(prompt, 0.5);
        
        console.log('AI原始响应:', response);
        
        // 解析AI返回的JSON
        let report;
        try {
          // 提取AI返回的内容
          const content = response.choices[0].message.content;
          console.log('AI返回内容:', content);
          
          // 尝试解析JSON
          report = JSON.parse(content);
          console.log('解析后的报告:', report);
          
          // 验证报告结构
          if (this.validateReportStructure(report)) {
            return report;
          } else {
            throw new Error('报告结构不完整');
          }
        } catch (parseError) {
          console.error('AI返回格式解析失败:', parseError);
          console.error('原始内容:', response.choices[0].message.content);
          // 如果解析失败，使用备用格式
          report = this.parseAIResponse(response.choices[0].message.content);
          if (report) return report;
        }
        
      } catch (error) {
        console.error(`AI生成报告尝试 ${attempt} 失败:`, error);
        if (attempt === maxRetries) {
          throw error;
        }
        // 等待一秒后重试
        await this.delay(1000);
      }
    }
  },

  // 构建AI提示词
  buildAIPrompt(questionnaireData, imageAnalysis, seasonResult) {
    const answers = questionnaireData.answers;
    
    // 简化照片分析结果
    const simplifiedAnalysis = imageAnalysis.map((analysis, index) => {
      if (analysis.error) return `照片${index+1}: 分析失败`;
      try {
        const content = analysis.choices[0].message.content;
        // 只取前100个字符
        return `照片${index+1}: ${content.substring(0, 100)}...`;
      } catch (e) {
        return `照片${index+1}: 数据格式错误`;
      }
    }).join('\n');
    
    return `基于问卷和照片分析生成个人风格报告：

## 季型分析结果（已通过专业12季色彩分析得出）
**季型判断：** ${seasonResult?.season || '待分析'}
**主要特征：** ${seasonResult?.pair_used?.first || 'warm'} + ${seasonResult?.pair_used?.second || 'light'}
**分析依据：** ${seasonResult?.rationale || '基于多维度照片分析'}
**置信度：** ${seasonResult?.top3?.[0]?.score ? Math.round(seasonResult.top3[0].score * 100) : 60}%

问卷：颜色偏好(${answers.q6?.join(', ') || '无'})，风格偏好(${answers.q1?.join(', ') || '无'})，生活节奏(${answers.q5 || '无'})

照片分析：${simplifiedAnalysis}

要求：
1. 基于已判定的季型：${seasonResult?.season || '待分析'}
2. 推荐10种颜色（结合用户偏好）
3. 推荐3种材质
4. 权重：季型50%，用户偏好25%，肤色15%，风格10%

返回JSON格式：
{
  "userProfile": {"questionnaireSummary": "总结", "imageFindings": "发现"},
  "mainColorTone": {"type": "${seasonResult?.season || '季型（如：暖春型）'}", "description": "基于专业12季色彩分析", "season": "季节", "temperature": "冷暖"},
  "colorPalette": {"mainColors": ["颜色1", "颜色2"], "extendedPalette": ["扩展1", "扩展2"]},
  "suitableStyle": {"primaryStyle": "主风格", "secondaryStyle": "次风格", "styleKeywords": ["关键词1", "关键词2"], "typicalScenarios": ["场景1", "场景2"], "recommendedItems": {"上衣": ["单品1"], "下装": ["单品2"], "鞋子": ["单品3"]}},
  "recommendedMaterials": {"primary": ["材质1", "材质2", "材质3"], "secondary": ["材质1", "材质2"], "avoid": ["避免1"], "materialDetails": ["详情1"]},
  "avoidanceItems": {"coldTones": {"colors": [], "reason": ""}, "highSaturation": {"colors": [], "reason": ""}, "highContrast": {"combinations": [], "reason": ""}},
  "popups": {
    "colorPalettePopup": {"title": "推荐色板", "description": "描述", "colors": [{"name": "颜色名1", "hex": "#FF0000"}, {"name": "颜色名2", "hex": "#00FF00"}, {"name": "颜色名3", "hex": "#0000FF"}, {"name": "颜色名4", "hex": "#FFFF00"}, {"name": "颜色名5", "hex": "#FF00FF"}, {"name": "颜色名6", "hex": "#00FFFF"}, {"name": "颜色名7", "hex": "#FFA500"}, {"name": "颜色名8", "hex": "#800080"}, {"name": "颜色名9", "hex": "#008000"}, {"name": "颜色名10", "hex": "#FFC0CB"}], "usageTips": "建议"},
    "stylePopup": {"title": "适合风格", "description": "描述", "styleAnalysis": "分析", "styleElements": ["元素1"], "outfitSuggestions": ["建议1"]},
    "materialPopup": {"title": "推荐材质", "description": "描述", "materialAnalysis": "分析", "recommendations": ["推荐1", "推荐2", "推荐3"], "careTips": "护理"}
  },
  "rationale": "分析依据"
}`;
  },

  // 解析AI响应（备用方案）
  parseAIResponse(content) {
    // 如果AI返回的不是标准JSON，尝试提取有用信息
    console.log('使用备用解析方案:', content);
    
    // 返回一个基础报告结构
    return {
      userProfile: {
        questionnaireSummary: {
          stylePreference: 3.2,
          occasionAdaptability: 3.5,
          functionOrientation: 2.8,
          socialInfluenceSensitivity: 2.5,
          lifeRhythm: 2.0,
          colorPreference: "mixed",
          stylingFocus: "comfort_practical",
          purchaseDecisionPattern: "demand_oriented",
          socialScenarios: ["work", "social"]
        },
        imageFindings: {
          skinTone: "mixed",
          undertone: "neutral",
          brightness: "medium",
          saturation: "medium",
          veinColor: "mixed",
          faceFeatures: "natural"
        }
      },
      mainColorTone: {
        type: "AI分析色调",
        description: "基于AI分析的个人色调",
        season: "mixed",
        temperature: "neutral"
      },
      colorPalette: {
        mainColors: [
          { name: "AI推荐色1", hex: "#D4A574", usage: "主色调" },
          { name: "AI推荐色2", hex: "#F4D03F", usage: "提亮色" }
        ],
        extendedPalette: [
          { name: "扩展色1", hex: "#F5F5DC" },
          { name: "扩展色2", hex: "#D3D3D3" }
        ]
      },
      suitableStyle: {
        primaryStyle: "AI推荐风格",
        secondaryStyle: "辅助风格",
        styleKeywords: ["AI分析", "个性化", "专业推荐"],
        typicalScenarios: ["职场", "日常", "约会"],
        recommendedItems: {
          tops: ["AI推荐上衣"],
          bottoms: ["AI推荐下装"],
          accessories: ["AI推荐配饰"],
          shoes: ["AI推荐鞋履"]
        }
      },
      recommendedMaterials: {
        primary: ["AI推荐材质"],
        secondary: ["辅助材质"],
        avoid: ["避免材质"],
        materialDetails: [
          {
            name: "AI推荐材质",
            characteristics: "AI分析特性",
            suitableFor: ["适用单品"],
            reason: "AI推荐理由"
          }
        ]
      },
      avoidanceItems: {
        coldTones: { colors: [], reason: "AI分析" },
        highSaturation: { colors: [], reason: "AI分析" },
        highContrast: { combinations: [], reason: "AI分析" }
      },
      popups: {
        colorPalettePopup: {
          title: "AI推荐色板",
          description: "基于AI分析的个性化色板",
          colors: [],
          usageTips: "AI使用建议"
        },
        stylePopup: {
          title: "AI推荐风格",
          description: "基于AI分析的风格建议",
          styleAnalysis: "AI风格分析",
          styleElements: ["AI元素1", "AI元素2"],
          outfitSuggestions: ["AI搭配建议"]
        },
        materialPopup: {
          title: "AI推荐材质",
          description: "基于AI分析的材质建议",
          materialAnalysis: "AI材质分析",
          recommendations: ["AI材质推荐"],
          careTips: "AI护理建议"
        }
      },
      rationale: "基于AI分析的个人风格报告，结合问卷信息和照片分析结果生成。"
    };
  },

  // 基于问卷生成报告
  generateReportFromQuestionnaire(questionnaireData) {
    console.log('基于问卷生成报告:', questionnaireData);
    console.log('问卷答案:', questionnaireData.answers);
    
    // 分析问卷答案，生成不同的结果
    const result = this.analyzeQuestionnaireAnswers(questionnaireData.answers);
    
    return {
      userProfile: {
        questionnaireSummary: result.summary,
        imageFindings: {
          skinTone: result.skinTone,
          undertone: result.undertone,
          brightness: "medium",
          saturation: "medium",
          veinColor: result.veinColor,
          faceFeatures: result.faceFeatures
        }
      },
      mainColorTone: {
        type: result.colorTone,
        description: result.colorDescription,
        season: result.season,
        temperature: result.temperature
      },
      colorPalette: result.colorPalette,
      suitableStyle: result.suitableStyle,
      recommendedMaterials: result.recommendedMaterials,
      avoidanceItems: result.avoidanceItems,
      popups: result.popups,
      rationale: result.rationale
    };
  },

  // 分析问卷答案
  analyzeQuestionnaireAnswers(answers) {
    console.log('开始分析问卷答案:', answers);
    
    // 基于问卷答案生成不同的结果
    const colorChoices = answers.q6 || [];
    const styleChoices = answers.q1 || [];
    const occasionAdaptability = answers.q2;
    const functionOrientation = answers.q3;
    const socialInfluence = answers.q4;
    const lifeRhythm = answers.q5;
    const stylingFocus = answers.q7 || [];
    const purchasePattern = answers.q8 || [];
    const socialScenarios = answers.q9;
    
    console.log('颜色选择:', colorChoices);
    console.log('风格选择:', styleChoices);
    
    // 根据颜色选择判断色调
    let colorTone, season, temperature, skinTone, undertone, veinColor;
    
    if (colorChoices.includes('明黄') || colorChoices.includes('橙红')) {
      colorTone = "春季暖色调";
      season = "spring";
      temperature = "warm";
      skinTone = "warm_yellow";
      undertone = "warm";
      veinColor = "green";
    } else if (colorChoices.includes('天蓝') || colorChoices.includes('深蓝')) {
      colorTone = "夏季冷色调";
      season = "summer";
      temperature = "cool";
      skinTone = "cool_pink";
      undertone = "cool";
      veinColor = "blue";
    } else if (colorChoices.includes('森绿') || colorChoices.includes('橄榄')) {
      colorTone = "秋季暖色调";
      season = "autumn";
      temperature = "warm";
      skinTone = "warm_yellow";
      undertone = "warm";
      veinColor = "green";
    } else if (colorChoices.includes('深蓝') || colorChoices.includes('紫灰')) {
      colorTone = "冬季冷色调";
      season = "winter";
      temperature = "cool";
      skinTone = "cool_pink";
      undertone = "cool";
      veinColor = "blue";
    } else {
      // 默认秋季
      colorTone = "秋季暖色调";
      season = "autumn";
      temperature = "warm";
      skinTone = "warm_yellow";
      undertone = "warm";
      veinColor = "green";
    }
    
    // 根据风格选择判断主风格
    let primaryStyle, secondaryStyle;
    if (styleChoices.includes('经典优雅')) {
      primaryStyle = "经典优雅";
      secondaryStyle = "休闲舒适";
    } else if (styleChoices.includes('时尚前卫')) {
      primaryStyle = "时尚前卫";
      secondaryStyle = "个性独特";
    } else if (styleChoices.includes('休闲舒适')) {
      primaryStyle = "休闲舒适";
      secondaryStyle = "经典优雅";
    } else if (styleChoices.includes('甜美可爱')) {
      primaryStyle = "甜美可爱";
      secondaryStyle = "休闲舒适";
    } else {
      primaryStyle = "经典优雅";
      secondaryStyle = "休闲舒适";
    }
    
    return {
      summary: {
        stylePreference: 3.2,
        occasionAdaptability: 3.5,
        functionOrientation: 2.8,
        socialInfluenceSensitivity: 2.5,
        lifeRhythm: 2.0,
        colorPreference: temperature,
        stylingFocus: "comfort_practical",
        purchaseDecisionPattern: "demand_oriented",
        socialScenarios: ["work", "social"]
      },
      skinTone,
      undertone,
      veinColor,
      faceFeatures: "natural_warm",
      colorTone,
      colorDescription: `肤色偏${temperature === 'warm' ? '黄' : '粉'},${temperature === 'warm' ? '温暖' : '清爽'}而富有质感`,
      season,
      temperature,
      colorPalette: this.generateColorPalette(season),
      suitableStyle: {
        primaryStyle,
        secondaryStyle,
        styleKeywords: ["自然", "质感", "和谐", "实用"],
        typicalScenarios: ["职场", "日常", "约会", "旅行"],
        recommendedItems: {
          tops: ["亚麻衬衫", "针织毛衣", "西装外套"],
          bottoms: ["直筒裤", "A字裙", "工装裤"],
          accessories: ["皮质包袋", "金属配饰", "丝巾"],
          shoes: ["乐福鞋", "小白鞋", "短靴"]
        }
      },
      recommendedMaterials: {
        primary: ["亚麻", "棉", "针织"],
        secondary: ["羊毛", "丝绸", "牛仔"],
        avoid: ["亮面材质", "荧光色面料"],
        materialDetails: [
          {
            name: "亚麻",
            characteristics: "透气、自然、质感",
            suitableFor: ["衬衫", "外套", "裤子"],
            reason: "与您的自然气质相契合"
          }
        ]
      },
      avoidanceItems: {
        coldTones: {
          colors: ["纯黑", "纯白", "亮蓝", "紫色"],
          reason: "会让肤色显得暗沉"
        },
        highSaturation: {
          colors: ["荧光色"],
          reason: "与您的自然气质形成冲突"
        },
        highContrast: {
          combinations: ["黑白强对比"],
          reason: "不利于展现您的和谐气质"
        }
      },
      popups: this.generatePopups(colorTone, primaryStyle),
      rationale: `基于您的问卷回答，您属于${colorTone}类型。问卷显示您偏好${primaryStyle}风格，注重舒适实用性，生活节奏适中。因此推荐${temperature === 'warm' ? '暖' : '冷'}色系、自然材质、${primaryStyle}的穿搭风格。`
    };
  },

  // 生成色板
  generateColorPalette(season) {
    const palettes = {
      spring: {
        mainColors: [
          { name: "樱花粉", hex: "#FFB7C5", usage: "主色调，适合外套和配饰" },
          { name: "薄荷绿", hex: "#98FB98", usage: "提亮色，适合内搭" },
          { name: "珊瑚橙", hex: "#FF7F50", usage: "深色系，适合下装" },
          { name: "天空蓝", hex: "#87CEEB", usage: "基础色，适合鞋包" }
        ],
        extendedPalette: [
          { name: "米白", hex: "#F5F5DC" },
          { name: "浅黄", hex: "#FFFFE0" },
          { name: "淡紫", hex: "#E6E6FA" },
          { name: "浅绿", hex: "#90EE90" },
          { name: "杏色", hex: "#FFE4B5" },
          { name: "天蓝", hex: "#87CEEB" }
        ]
      },
      summer: {
        mainColors: [
          { name: "薰衣草紫", hex: "#E6E6FA", usage: "主色调，适合外套和配饰" },
          { name: "天空蓝", hex: "#87CEEB", usage: "提亮色，适合内搭" },
          { name: "玫瑰粉", hex: "#FFB6C1", usage: "深色系，适合下装" },
          { name: "薄荷绿", hex: "#98FB98", usage: "基础色，适合鞋包" }
        ],
        extendedPalette: [
          { name: "纯白", hex: "#FFFFFF" },
          { name: "浅灰", hex: "#D3D3D3" },
          { name: "淡蓝", hex: "#ADD8E6" },
          { name: "浅粉", hex: "#FFC0CB" },
          { name: "银灰", hex: "#C0C0C0" },
          { name: "淡紫", hex: "#DDA0DD" }
        ]
      },
      autumn: {
        mainColors: [
          { name: "暖金色", hex: "#D4A574", usage: "主色调，适合外套和配饰" },
          { name: "杏黄", hex: "#F4D03F", usage: "提亮色，适合内搭" },
          { name: "赭石", hex: "#8B4513", usage: "深色系，适合下装" },
          { name: "深棕", hex: "#654321", usage: "基础色，适合鞋包" }
        ],
        extendedPalette: [
          { name: "米白", hex: "#F5F5DC" },
          { name: "浅灰", hex: "#D3D3D3" },
          { name: "橄榄绿", hex: "#6B8E23" },
          { name: "深红", hex: "#8B0000" },
          { name: "驼色", hex: "#DEB887" },
          { name: "卡其", hex: "#F4A460" }
        ]
      },
      winter: {
        mainColors: [
          { name: "纯黑", hex: "#000000", usage: "主色调，适合外套和配饰" },
          { name: "纯白", hex: "#FFFFFF", usage: "提亮色，适合内搭" },
          { name: "深蓝", hex: "#000080", usage: "深色系，适合下装" },
          { name: "深红", hex: "#8B0000", usage: "基础色，适合鞋包" }
        ],
        extendedPalette: [
          { name: "纯白", hex: "#FFFFFF" },
          { name: "深灰", hex: "#696969" },
          { name: "深紫", hex: "#800080" },
          { name: "深绿", hex: "#006400" },
          { name: "深蓝", hex: "#000080" },
          { name: "深红", hex: "#8B0000" }
        ]
      }
    };
    
    return palettes[season] || palettes.autumn;
  },

  // 生成弹窗内容
  generatePopups(colorTone, primaryStyle) {
    return {
      colorPalettePopup: {
        title: "推荐色板",
        description: "为您精选的10个最适合的颜色",
        colors: this.generateColorPalette(colorTone.includes('春季') ? 'spring' : 
                                        colorTone.includes('夏季') ? 'summer' : 
                                        colorTone.includes('秋季') ? 'autumn' : 'winter').extendedPalette,
        usageTips: "建议将这些颜色作为您衣橱的主色调"
      },
      stylePopup: {
        title: "适合风格",
        description: "基于您的个人特质推荐的风格方向",
        styleAnalysis: `您属于${primaryStyle}型，适合简约而不失质感的穿搭`,
        styleElements: ["线条简洁", "材质自然", "色彩和谐"],
        outfitSuggestions: [
          "亚麻衬衫 + 直筒裤 + 乐福鞋",
          "针织毛衣 + A字裙 + 小白鞋",
          "西装外套 + 工装裤 + 短靴"
        ]
      },
      materialPopup: {
        title: "推荐材质",
        description: "最适合您的面料选择",
        materialAnalysis: "天然材质最能体现您的质感",
        recommendations: [
          "亚麻：透气自然，适合春夏",
          "棉质：舒适亲肤，四季适用",
          "针织：柔软温暖，秋冬必备"
        ],
        careTips: "建议选择易于打理的天然面料"
      }
    };
  },

  // 生成模拟报告（保留作为备用）
  generateMockReport() {
    return {
      userProfile: {
        questionnaireSummary: {
          stylePreference: 3.2,
          occasionAdaptability: 3.5,
          functionOrientation: 2.8,
          socialInfluenceSensitivity: 2.5,
          lifeRhythm: 2.0,
          colorPreference: "warm",
          stylingFocus: "comfort_practical",
          purchaseDecisionPattern: "demand_oriented",
          socialScenarios: ["work", "social"]
        },
        imageFindings: {
          skinTone: "warm_yellow",
          undertone: "warm",
          brightness: "medium",
          saturation: "medium",
          veinColor: "green",
          faceFeatures: "natural_warm"
        }
      },
      mainColorTone: {
        type: "秋季暖色调",
        description: "肤色偏黄,温暖而富有质感",
        season: "autumn",
        temperature: "warm"
      },
      colorPalette: {
        mainColors: [
          { name: "暖金色", hex: "#D4A574", usage: "主色调，适合外套和配饰" },
          { name: "杏黄", hex: "#F4D03F", usage: "提亮色，适合内搭" },
          { name: "赭石", hex: "#8B4513", usage: "深色系，适合下装" },
          { name: "深棕", hex: "#654321", usage: "基础色，适合鞋包" }
        ],
        extendedPalette: [
          { name: "米白", hex: "#F5F5DC" },
          { name: "浅灰", hex: "#D3D3D3" },
          { name: "橄榄绿", hex: "#6B8E23" },
          { name: "深红", hex: "#8B0000" },
          { name: "驼色", hex: "#DEB887" },
          { name: "卡其", hex: "#F4A460" }
        ]
      },
      suitableStyle: {
        primaryStyle: "经典优雅",
        secondaryStyle: "休闲舒适",
        styleKeywords: ["自然", "质感", "和谐", "实用"],
        typicalScenarios: ["职场", "日常", "约会", "旅行"],
        recommendedItems: {
          tops: ["亚麻衬衫", "针织毛衣", "西装外套"],
          bottoms: ["直筒裤", "A字裙", "工装裤"],
          accessories: ["皮质包袋", "金属配饰", "丝巾"],
          shoes: ["乐福鞋", "小白鞋", "短靴"]
        }
      },
      recommendedMaterials: {
        primary: ["亚麻", "棉", "针织"],
        secondary: ["羊毛", "丝绸", "牛仔"],
        avoid: ["亮面材质", "荧光色面料"],
        materialDetails: [
          {
            name: "亚麻",
            characteristics: "透气、自然、质感",
            suitableFor: ["衬衫", "外套", "裤子"],
            reason: "与您的自然气质相契合"
          }
        ]
      },
      avoidanceItems: {
        coldTones: {
          colors: ["纯黑", "纯白", "亮蓝", "紫色"],
          reason: "会让肤色显得暗沉"
        },
        highSaturation: {
          colors: ["荧光色"],
          reason: "与您的自然气质形成冲突"
        },
        highContrast: {
          combinations: ["黑白强对比"],
          reason: "不利于展现您的和谐气质"
        }
      },
      popups: {
        colorPalettePopup: {
          title: "推荐色板",
          description: "为您精选的10个最适合的颜色",
          colors: [
            { name: "暖金色", hex: "#D4A574" },
            { name: "杏黄", hex: "#F4D03F" },
            { name: "赭石", hex: "#8B4513" },
            { name: "深棕", hex: "#654321" },
            { name: "米白", hex: "#F5F5DC" },
            { name: "浅灰", hex: "#D3D3D3" },
            { name: "橄榄绿", hex: "#6B8E23" },
            { name: "深红", hex: "#8B0000" },
            { name: "驼色", hex: "#DEB887" },
            { name: "卡其", hex: "#F4A460" }
          ],
          usageTips: "建议将这些颜色作为您衣橱的主色调"
        },
        stylePopup: {
          title: "适合风格",
          description: "基于您的个人特质推荐的风格方向",
          styleAnalysis: "您属于自然优雅型，适合简约而不失质感的穿搭",
          styleElements: ["线条简洁", "材质自然", "色彩和谐"],
          outfitSuggestions: [
            "亚麻衬衫 + 直筒裤 + 乐福鞋",
            "针织毛衣 + A字裙 + 小白鞋",
            "西装外套 + 工装裤 + 短靴"
          ]
        },
        materialPopup: {
          title: "推荐材质",
          description: "最适合您的面料选择",
          materialAnalysis: "天然材质最能体现您的质感",
          recommendations: [
            "亚麻：透气自然，适合春夏",
            "棉质：舒适亲肤，四季适用",
            "针织：柔软温暖，秋冬必备"
          ],
          careTips: "建议选择易于打理的天然面料"
        }
      },
      rationale: "基于您的问卷回答和照片分析，您属于秋季暖色调类型。问卷显示您偏好经典优雅风格，注重舒适实用性，生活节奏适中。照片分析显示您的肤色偏黄，温暖而富有质感。因此推荐暖色系、自然材质、简约优雅的穿搭风格。"
    };
  },

  // 验证报告结构
  validateReportStructure(report) {
    const requiredFields = [
      'userProfile', 'mainColorTone', 'colorPalette', 'suitableStyle', 
      'recommendedMaterials', 'avoidanceItems', 'popups'
    ];
    
    const requiredPopups = [
      'colorPalettePopup', 'stylePopup', 'materialPopup'
    ];
    
    // 检查主要字段
    for (const field of requiredFields) {
      if (!report[field]) {
        console.error(`缺少必需字段: ${field}`);
        return false;
      }
    }
    
    // 检查popups字段
    if (!report.popups) {
      console.error('缺少popups字段');
      return false;
    }
    
    for (const popup of requiredPopups) {
      if (!report.popups[popup]) {
        console.error(`缺少popup字段: ${popup}`);
        return false;
      }
    }
    
    // 检查颜色数组
    if (!report.popups.colorPalettePopup.colors || 
        !Array.isArray(report.popups.colorPalettePopup.colors) ||
        report.popups.colorPalettePopup.colors.length === 0) {
      console.error('缺少颜色数组');
      return false;
    }
    
    console.log('报告结构验证通过');
    return true;
  },

  // 解析AI响应的备用方法
  parseAIResponse(content) {
    console.log('使用备用解析方法解析:', content);
    
    // 尝试从内容中提取JSON部分
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error('备用JSON解析失败:', e);
      }
    }
    
    // 如果无法解析，返回默认报告
    console.log('无法解析AI响应，使用默认报告');
    return this.generateMockReport();
  },

  // 优化报告
  async optimizeReport(report) {
    try {
      console.log('优化报告内容...');
      
      // 模拟优化
      await this.delay(1000);
      console.log('报告优化完成');
      
    } catch (error) {
      console.error('报告优化失败:', error);
    }
  },

  // 处理错误
  handleError(message) {
    this.setData({
      isGenerating: false,
      errorMessage: message,
      showError: true
    });
  },

  // 重试
  retry() {
    this.setData({
      showError: false,
      errorMessage: ''
    });
    this.startGeneration();
  },

  // 返回上一页
  goBack() {
    tt.navigateBack();
  },

  // ========== 调试和测试函数 ==========
  
  // 调试函数 - 查看当前数据
  debugData() {
    console.log('=== 调试信息 ===');
    console.log('全局数据:', app.globalData);
    console.log('问卷数据:', app.globalData.questionnaireData);
    console.log('上传图片:', app.globalData.uploadedImages);
    
    tt.showModal({
      title: '调试信息',
      content: `问卷数据: ${JSON.stringify(app.globalData.questionnaireData, null, 2)}`,
      showCancel: false
    });
  },

  // 测试季型分析模块
  async testSeasonAnalysis() {
    try {
      console.log('=== 开始季型分析模块测试 ===');
      
      const images = app.globalData.uploadedImages;
      if (!images || images.length === 0) {
        throw new Error('没有上传的照片数据');
      }
      
      // 测试第一层分析
      console.log('--- 测试第一层分析 ---');
      const api = require('../../utils/api.js');
      const firstLayerResults = await this.analyzeSeasonFirstLayer(api, images);
      console.log('第一层分析结果:', firstLayerResults);
      
      // 测试第二层融合
      console.log('--- 测试第二层融合 ---');
      const seasonResult = await this.analyzeSeasonSecondLayer(api, firstLayerResults);
      console.log('季型融合结果:', seasonResult);
      
      // 显示测试结果
      tt.showModal({
        title: '季型分析测试完成',
        content: `季型: ${seasonResult?.season || '未知'}\n置信度: ${seasonResult?.top3?.[0]?.score ? Math.round(seasonResult.top3[0].score * 100) : 0}%\n依据: ${seasonResult?.rationale || '无'}`,
        showCancel: false
      });
      
      return seasonResult;
      
    } catch (error) {
      console.error('季型分析测试失败:', error);
      tt.showModal({
        title: '测试失败',
        content: error.message,
        showCancel: false
      });
      return null;
    }
  },

  // 测试单个prompt
  async testSinglePrompt(e) {
    const promptIndex = parseInt(e.currentTarget.dataset.index);
    try {
      console.log(`=== 测试单个Prompt ${promptIndex + 1} ===`);
      
      const images = app.globalData.uploadedImages;
      if (!images || images.length === 0) {
        throw new Error('没有上传的照片数据');
      }
      
      if (promptIndex >= images.length) {
        throw new Error(`照片数量不足，需要至少${promptIndex + 1}张照片`);
      }
      
      const api = require('../../utils/api.js');
      const prompts = [
        this.buildSeasonPromptA(), // 手腕
        this.buildSeasonPromptB(), // 脖子
        this.buildSeasonPromptC(), // 正脸
        this.buildSeasonPromptD(), // 半身
        this.buildSeasonPromptE()  // 全身
      ];
      
      const promptNames = ['手腕', '脖子', '正脸', '半身', '全身'];
      const prompt = prompts[promptIndex];
      const image = images[promptIndex];
      
      console.log(`测试${promptNames[promptIndex]}分析...`);
      const result = await api.callVisionAPI(image.imageData, prompt);
      
      console.log(`${promptNames[promptIndex]}分析结果:`, result);
      
      // 解析结果
      try {
        const content = result.choices[0].message.content;
        const parsedResult = JSON.parse(content);
        
        tt.showModal({
          title: `${promptNames[promptIndex]}分析测试`,
          content: `部位: ${parsedResult.part}\n特征: ${parsedResult.features?.[0]?.name || '无'}\n值: ${parsedResult.features?.[0]?.value || '无'}\n强度: ${parsedResult.features?.[0]?.strength || 0}\n置信度: ${parsedResult.features?.[0]?.confidence || 0}`,
          showCancel: false
        });
        
        return parsedResult;
      } catch (parseError) {
        console.error('解析结果失败:', parseError);
        tt.showModal({
          title: '解析失败',
          content: '返回结果格式不正确',
          showCancel: false
        });
        return null;
      }
      
    } catch (error) {
      console.error(`Prompt ${promptIndex + 1}测试失败:`, error);
      tt.showModal({
        title: '测试失败',
        content: error.message,
        showCancel: false
      });
      return null;
    }
  },

  // 测试融合逻辑
  async testFusionLogic() {
    try {
      console.log('=== 测试融合逻辑 ===');
      
      // 创建模拟的第一层结果
      const mockResults = [
        {
          choices: [{
            message: {
              content: JSON.stringify({
                part: "wrist",
                features: [{
                  name: "warm_cool",
                  value: "warm",
                  strength: 0.700,
                  confidence: 0.800,
                  weight: 0.300
                }]
              })
            }
          }]
        },
        {
          choices: [{
            message: {
              content: JSON.stringify({
                part: "neck",
                features: [{
                  name: "warm_cool",
                  value: "warm",
                  strength: 0.600,
                  confidence: 0.750,
                  weight: 0.300
                }]
              })
            }
          }]
        },
        {
          choices: [{
            message: {
              content: JSON.stringify({
                part: "face",
                features: [
                  {
                    name: "warm_cool",
                    value: "warm",
                    strength: 0.650,
                    confidence: 0.800,
                    weight: 0.240
                  },
                  {
                    name: "contrast_depth",
                    value: "light",
                    strength: 0.600,
                    confidence: 0.700,
                    weight: 0.500
                  },
                  {
                    name: "clarity",
                    value: "bright",
                    strength: 0.550,
                    confidence: 0.750,
                    weight: 0.500
                  }
                ]
              })
            }
          }]
        },
        {
          choices: [{
            message: {
              content: JSON.stringify({
                part: "half_body",
                features: [
                  {
                    name: "warm_cool",
                    value: "warm",
                    strength: 0.500,
                    confidence: 0.650,
                    weight: 0.080
                  },
                  {
                    name: "contrast_depth",
                    value: "light",
                    strength: 0.550,
                    confidence: 0.680,
                    weight: 0.250
                  },
                  {
                    name: "clarity",
                    value: "bright",
                    strength: 0.600,
                    confidence: 0.700,
                    weight: 0.250
                  }
                ]
              })
            }
          }]
        },
        {
          choices: [{
            message: {
              content: JSON.stringify({
                part: "full_body",
                features: [
                  {
                    name: "warm_cool",
                    value: "warm",
                    strength: 0.450,
                    confidence: 0.630,
                    weight: 0.080
                  },
                  {
                    name: "contrast_depth",
                    value: "light",
                    strength: 0.500,
                    confidence: 0.660,
                    weight: 0.250
                  },
                  {
                    name: "clarity",
                    value: "bright",
                    strength: 0.550,
                    confidence: 0.680,
                    weight: 0.250
                  }
                ]
              })
            }
          }]
        }
      ];
      
      const api = require('../../utils/api.js');
      const fusionResult = await this.analyzeSeasonSecondLayer(api, mockResults);
      
      console.log('融合测试结果:', fusionResult);
      
      tt.showModal({
        title: '融合逻辑测试',
        content: `季型: ${fusionResult?.season || '未知'}\n主要特征: ${fusionResult?.pair_used?.first || '无'} + ${fusionResult?.pair_used?.second || '无'}\n依据: ${fusionResult?.rationale || '无'}`,
        showCancel: false
      });
      
      return fusionResult;
      
    } catch (error) {
      console.error('融合逻辑测试失败:', error);
      tt.showModal({
        title: '测试失败',
        content: error.message,
        showCancel: false
      });
      return null;
    }
  },

  // 测试默认值处理
  testDefaultValues() {
    console.log('=== 测试默认值处理 ===');
    
    const defaultAnalysis = this.getDefaultSeasonAnalysis(0);
    const defaultResult = this.getDefaultSeasonResult();
    
    console.log('默认分析结果:', defaultAnalysis);
    console.log('默认季型结果:', defaultResult);
    
    tt.showModal({
      title: '默认值测试',
      content: `默认季型: ${defaultResult.season}\n默认特征: ${defaultResult.pair_used.first} + ${defaultResult.pair_used.second}`,
      showCancel: false
    });
    
    return { defaultAnalysis, defaultResult };
  }
}); 