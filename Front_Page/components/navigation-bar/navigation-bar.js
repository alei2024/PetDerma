Component({
  options: {
    multipleSlots: true // 在组件定义时的选项中启用多slot支持
  },
  /**
   * 组件的属性列表
   */
  properties: {
    extClass: {
      type: String,
      value: ''
    },
    title: {
      type: String,
      value: ''
    },
    background: {
      type: String,
      value: ''
    },
    color: {
      type: String,
      value: ''
    },
    backColor: {
      type: String,
      value: ''
    },
    back: {
      type: Boolean,
      value: true
    },
    loading: {
      type: Boolean,
      value: false
    },
    homeButton: {
      type: Boolean,
      value: false,
    },
    animated: {
      // 显示隐藏的时候opacity动画效果
      type: Boolean,
      value: true
    },
    show: {
      // 显示隐藏导航，隐藏的时候navigation-bar的高度占位还在
      type: Boolean,
      value: true,
      observer: '_showChange'
    },
    // back为true的时候，返回的页面深度
    delta: {
      type: Number,
      value: 1
    },
    // 允许外部自定义标题样式（如字体大小）
    titleStyle: {
      type: String,
      value: ''
    },
    // 玻璃拟态效果
    glass: {
      type: Boolean,
      value: false
    },
  },
  /**
   * 组件的初始数据
   */
  data: {
    displayStyle: ''
  },
  lifetimes: {
    attached() {
      const rect = wx.getMenuButtonBoundingClientRect()

      const getDeviceInfoSafe = () => {
        try {
          if (typeof wx.getDeviceInfo === 'function') return wx.getDeviceInfo()
          if (typeof wx.getSystemInfoSync === 'function') return wx.getSystemInfoSync()
        } catch (e) {}
        return {}
      }

      const getWindowInfoSafe = () => {
        try {
          if (typeof wx.getWindowInfo === 'function') return wx.getWindowInfo()
          if (typeof wx.getSystemInfoSync === 'function') return wx.getSystemInfoSync()
        } catch (e) {}
        return {}
      }

      const deviceInfo = getDeviceInfoSafe()
      const platform = deviceInfo.platform
      const isAndroid = platform === 'android'
      const isDevtools = platform === 'devtools'

      const { windowWidth = 375, safeArea: { top = 0, bottom = 0 } = {} } = getWindowInfoSafe()

      this.setData({
        ios: !isAndroid,
        innerPaddingRight: `padding-right: ${windowWidth - rect.left}px`,
        leftWidth: `width: ${windowWidth - rect.left}px`,
        safeAreaTop: isDevtools || isAndroid ? `height: calc(var(--height) + ${top}px); padding-top: ${top}px` : ``
      })
    },
  },
  /**
   * 组件的方法列表
   */
  methods: {
    _showChange(show) {
      const animated = this.data.animated
      let displayStyle = ''
      if (animated) {
        displayStyle = `opacity: ${show ? '1' : '0'
          };transition:opacity 0.5s;`
      } else {
        displayStyle = `display: ${show ? '' : 'none'}`
      }
      this.setData({
        displayStyle
      })
    },
    back() {
      const data = this.data
      if (data.delta) {
        wx.navigateBack({
          delta: data.delta
        })
      }
      this.triggerEvent('back', { delta: data.delta }, {})
    }
  },
})
