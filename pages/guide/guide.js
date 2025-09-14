// 引导页面
Page({
  data: {
    currentPage: 1,
    totalPages: 3,
    isAnimating: false,
    guidePages: [
      {
        id: 1,
        content: [
          "你知道吗？",
          "你的肤色 发色 瞳色",
          "决定你适合的颜色",
          "你的面部特征",
          "也影响了你的气质",
          "「12季型人」",
          "你是其中一种",
          "季风帮你找到专属调色盘"
        ]
      },
      {
        id: 2,
        content: [
          "同时你的人格决定你适合的风格",
          "穿上这些衣服",
          "你会感到：",
          "「这就是我。」",
          "衣服与你同频共振",
          "把你衬得容光焕发",
          "结合大五人格",
          "和能量四象限理论",
          "季风帮你解开",
          "风格密码"
        ]
      },
      {
        id: 3,
        content: [
          "你的外在特征+内在特质",
          "共同决定了你最适配的穿衣风格",
          "踏上季风之旅",
          "快来解锁你的风格报告吧~"
        ]
      }
    ],
    animatedLines: [],
    showStartButton: false
  },

  onLoad() {
    console.log('引导页加载');
    this.startAnimation();
  },

  // 开始动画
  startAnimation() {
    // 防止重复动画
    if (this.data.isAnimating) {
      console.log('动画正在进行中，跳过重复触发');
      return;
    }
    
    const currentPageData = this.data.guidePages[this.data.currentPage - 1];
    const lines = currentPageData.content.filter(line => line.trim() !== ''); // 过滤空行
    
    console.log(`第${this.data.currentPage}页开始动画，共${lines.length}行`);
    
    // 设置动画状态和清空之前的动画内容
    this.setData({
      isAnimating: true,
      animatedLines: [],
      showStartButton: false
    });

    // 一次性设置所有行，使用纯CSS动画控制时序
    const animatedLines = lines.map((line, index) => ({
      text: line,
      index: index
    }));
    
    this.setData({
      animatedLines: animatedLines
    });
    
    console.log(`第${this.data.currentPage}页所有行已设置，共${lines.length}行`);

    // 如果是最后一页，让开始按钮跟随最后一行文字一起升起
    if (this.data.currentPage === 3) {
      setTimeout(() => {
        console.log('显示开始按钮');
        this.setData({
          showStartButton: true
        });
      }, (lines.length - 1) * 300); // 与最后一行文字同时开始动画
    }
    
    // 动画完成后的回调
    setTimeout(() => {
      console.log(`第${this.data.currentPage}页动画完成，停留在当前页面`);
      this.setData({
        isAnimating: false
      });
      // 不做任何页面切换操作，让用户手动滑动
    }, lines.length * 300 + 1000);
  },

  // 下一页
  nextPage() {
    if (this.data.currentPage < this.data.totalPages) {
      this.setData({
        currentPage: this.data.currentPage + 1
      });
      this.startAnimation();
    }
  },

  // 上一页
  prevPage() {
    if (this.data.currentPage > 1) {
      this.setData({
        currentPage: this.data.currentPage - 1
      });
      this.startAnimation();
    }
  },

  // 开始测试
  startTest() {
    tt.navigateTo({
      url: '/pages/test/test?step=1'
    });
  },

  // 滑动处理
  onSwiperChange(e) {
    const current = e.detail.current + 1;
    const source = e.detail.source || 'touch'; // 获取触发源
    
    console.log(`页面切换到第${current}页，触发源: ${source}`);
    
    // 只有在用户手动滑动时才更新页面
    if (source === 'touch' || source === '' || source === undefined) {
      if (current !== this.data.currentPage) {
        this.setData({
          currentPage: current
        });
        this.startAnimation();
      }
    }
  },

  // 页面分享
  onShareAppMessage() {
    return {
      title: '发现你的专属穿搭风格',
      path: '/pages/index/index'
    };
  }
});
