Page({
  data: {},

  onLoad() {},

  // 跳转到单品建议
  goToItemSuggestion() {
    tt.navigateTo({
      url: '/pages/item-suggestion/item-suggestion'
    });
  },

  // 跳转到穿搭优化
  goToOutfitOptimization() {
    tt.navigateTo({
      url: '/packageTools/pages/outfit-optimization/outfit-optimization'
    });
  }
});











