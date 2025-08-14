// pages/guide/guide.js - 引导页逻辑

const app = getApp();

Page({
  data: {
    currentPage: 0,
    totalPages: 3,
    pages: [
      {
        id: 1,
        title: "探索你的色彩魔法",
        content: "印象派画家说,季节更替的光,会悄悄调换大地的色彩,我们借着这束光把颜色分成三个维度串成独属于你的季节色谱。",
        features: [
          { icon: "🌡️", title: "色温", subtitle: "冷·中性·暖" },
          { icon: "🌓", title: "明度", subtitle: "暗·中性·明" },
          { icon: "🎨", title: "柔度", subtitle: "明亮·柔和" }
        ]
      },
      {
        id: 2,
        title: "发现你的季节色彩",
        content: "头发的色泽、肌肤的颜色、瞳色的深浅……这些细微的色彩线索悄悄说出你属于哪一个色彩季节。在12种季节色彩中正有一组颜色在等着与你共鸣。",
        seasons: [
          { name: "春季", colors: ["#FFD700", "#FFA500", "#90EE90", "#87CEEB", "#FFB6C1"] },
          { name: "夏季", colors: ["#FFB6C1", "#E6E6FA", "#B0C4DE", "#98FB98", "#F5DEB3"] },
          { name: "秋季", colors: ["#DEB887", "#6B8E23", "#8B4513", "#FFB347", "#F5DEB3"] },
          { name: "冬季", colors: ["#000080", "#4B0082", "#006400", "#DC143C", "#C0C0C0"] }
        ]
      },
      {
        id: 3,
        title: "季风与你同行",
        content: "于是,我们创造了季风不是为了告诉你什么适合你而是帮你用颜色看见那个一直发光的自己你的色彩,从不属于被定义的标签而是流淌在你的光与影之间季风陪你找到它"
      }
    ]
  },

  onLoad() {
    console.log('引导页加载');
  },

  // 下一页
  nextPage() {
    if (this.data.currentPage < this.data.totalPages - 1) {
      this.setData({
        currentPage: this.data.currentPage + 1
      });
    } else {
      // 最后一页，跳转到问卷
      this.goToQuestionnaire();
    }
  },

  // 上一页
  prevPage() {
    if (this.data.currentPage > 0) {
      this.setData({
        currentPage: this.data.currentPage - 1
      });
    }
  },

  // 跳转到问卷
  goToQuestionnaire() {
    tt.navigateTo({
      url: '/pages/questionnaire/questionnaire'
    });
  },

  // 跳过引导
  skipGuide() {
    this.goToQuestionnaire();
  },

  // 返回首页
  goHome() {
    tt.reLaunch({
      url: '/pages/index/index'
    });
  },

  // 轮播切换
  onSwiperChange(e) {
    this.setData({
      currentPage: e.detail.current
    });
  },

  // 跳转到指定页面
  goToPage(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      currentPage: index
    });
  }
}); 