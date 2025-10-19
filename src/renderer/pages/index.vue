<!--
import { MenuItem } from 'electron';
import { log } from 'util';
 * @Description: 
 * @Author: 华松林
 * @Date: 2021-09-24 17:05:35
 * @LastEditors: 华松林
 * @LastEditTime: 2021-09-27 11:11:05
 * @FilePath: \single-reader\src\renderer\pages\index.vue
-->
<template>
  <div id="page" :class="{active: mouseInView}" 
       @mouseover="mouseIn(true)" 
       @mouseout="mouseIn(false)" 
       @contextmenu.prevent="rightClick"
       @mousedown="startDrag">
    <!-- 如果鼠标不再阅读器上则显示随便放一个网站域名 -->
    <div class="preview" :style="{ fontSize: fontSize + 'px' }">
      {{ getDisplayContent }}
      {{ book && isLastPage ? '（已读完）' : '' }}
    </div>
    <!-- {{ keyword }} -->
  </div>
</template>

<script>
  import { ipcRenderer } from "electron";
  const { remote } = require('electron')

  export default {
    name: 'index-page',
    data: () => {
      return {
        content: ``,
        lineSize: 20, // 默认一行显示20个字
        fontSize: 13, // 默认字体大小
        mouseInView: false,
        menu: null,
        keyword: '',
        lastLineSize: 20, // 记录上一次的每行字数设置
        lastFontSize: 13, // 记录上一次的字体大小设置
        isDragging: false,
        dragStartX: 0,
        dragStartY: 0,
        windowStartX: 0,
        windowStartY: 0,
        mouseControlEnabled: true // 鼠标控制开关，从设置加载
      }
    },
    mounted() {
      // 加载保存的设置
      this.loadSettings()
      
      // 监听主进程的窗口设置请求
      ipcRenderer.on('request-window-settings', () => {
        this.sendWindowSettings()
      })
      
      // 监听localStorage变化事件
      window.addEventListener('localStorageChange', this.handleSettingsChange)
      
      // 启动轮询检查localStorage变化（作为备用方案）
      this.startPolling()
      
      // 添加全局鼠标事件监听
      this.addGlobalMouseListeners()
    },
    beforeDestroy() {
      // 停止轮询
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval)
      }
      // 移除事件监听
      window.removeEventListener('localStorageChange', this.handleSettingsChange)
      // 移除全局鼠标事件监听
      this.removeGlobalMouseListeners()
    },
    created() {
      // 监听键盘事件
      document.onkeydown = (e) => {
        this.keyupEvent(e)
      }
      this.initMenu()
    },
    computed: {
      book() {
        return this.$store.state.Book.book
      },
      // 计算总页数
      totalPages() {
        return this.book ? Math.ceil(this.book.size / this.lineSize) : 0
      },
      // 检查是否是最后一页
      isLastPage() {
        return this.book && this.book.page >= this.totalPages
      },
      // 正在阅读的内容
      nowRead() {
        if (!this.book) return '请先右键选择'
        
        const start = this.lineSize * (this.book.page - 1)
        const end = start + this.lineSize
        
        // 确保不会超出文本范围
        if (start >= this.book.context.length) {
          return '（已读完）'
        }
        
        return this.book.context.slice(start, Math.min(end, this.book.context.length))
      },
      // 根据鼠标控制设置决定显示内容
      getDisplayContent() {
        // 如果鼠标控制功能关闭，始终显示小说内容
        if (!this.mouseControlEnabled) {
          return this.nowRead
        }
        // 如果鼠标控制功能开启，根据鼠标位置决定显示内容
        return this.mouseInView ? this.nowRead : 'fanyi.baidu.com/translate?aldtype=16047&query=&keyfrom=baidu&smartresult=dict&lang=auto2zh#en/zh/single-reader'
      }
    },
    methods: {
      // 处理localStorage变化事件
      handleSettingsChange(event) {
        const { key, value } = event.detail
        
        if (key === 'reader_settings') {
          const { lineSize, fontSize, mouseControlEnabled } = value
          
          if (lineSize && lineSize !== this.lastLineSize) {
            this.lineSize = lineSize
            this.lastLineSize = lineSize
            // 强制更新视图
            this.$forceUpdate()
          }
          
          if (fontSize && fontSize !== this.lastFontSize) {
            const validFontSize = Math.max(5, Math.min(40, fontSize))
            this.fontSize = validFontSize
            this.lastFontSize = validFontSize
            // 强制更新视图
            this.$forceUpdate()
          }
          
          if (mouseControlEnabled !== undefined && mouseControlEnabled !== this.mouseControlEnabled) {
            this.mouseControlEnabled = mouseControlEnabled
            // 如果关闭了鼠标控制，强制显示小说内容
            if (!mouseControlEnabled) {
              this.mouseInView = true
            }
            // 强制更新视图
            this.$forceUpdate()
          }
        }
      },
      // 添加全局鼠标事件监听
      addGlobalMouseListeners() {
        document.addEventListener('mousemove', this.handleDrag)
        document.addEventListener('mouseup', this.stopDrag)
      },
      // 移除全局鼠标事件监听
      removeGlobalMouseListeners() {
        document.removeEventListener('mousemove', this.handleDrag)
        document.removeEventListener('mouseup', this.stopDrag)
      },
      // 开始拖动
      startDrag(event) {
        if (event.button !== 0) return; // 只响应左键点击
        
        this.isDragging = true
        this.dragStartX = event.screenX
        this.dragStartY = event.screenY
        
        // 获取当前窗口位置
        const currentWindow = remote.getCurrentWindow()
        const [x, y] = currentWindow.getPosition()
        this.windowStartX = x
        this.windowStartY = y
        
        // 防止文本选择
        event.preventDefault()
      },
      // 处理拖动
      handleDrag(event) {
        if (!this.isDragging) return
        
        const deltaX = event.screenX - this.dragStartX
        const deltaY = event.screenY - this.dragStartY
        
        const newX = this.windowStartX + deltaX
        const newY = this.windowStartY + deltaY
        
        // 发送窗口移动请求到主进程
        ipcRenderer.send('move-window', {
          x: newX,
          y: newY
        })
        
        event.preventDefault()
      },
      // 停止拖动
      stopDrag() {
        this.isDragging = false
        this.dragStartX = 0
        this.dragStartY = 0
        this.windowStartX = 0
        this.windowStartY = 0
      },
      // 启动轮询检查localStorage变化
      startPolling() {
        this.pollingInterval = setInterval(() => {
          this.checkSettingsChange()
        }, 500) // 每500毫秒检查一次
      },
      // 检查设置是否发生变化
      checkSettingsChange() {
        const savedLineSize = localStorage.getItem('reader_lineSize')
        const savedFontSize = localStorage.getItem('reader_fontSize')
        const savedMouseControl = localStorage.getItem('reader_mouseControlEnabled')
        
        if (savedLineSize) {
          const newLineSize = parseInt(savedLineSize)
          if (newLineSize !== this.lastLineSize) {
            this.lineSize = newLineSize
            this.lastLineSize = newLineSize
            // 强制更新视图
            this.$forceUpdate()
          }
        }
        
        if (savedFontSize) {
          const newFontSize = parseInt(savedFontSize)
          const validFontSize = Math.max(5, Math.min(40, newFontSize))
          if (validFontSize !== this.lastFontSize) {
            this.fontSize = validFontSize
            this.lastFontSize = validFontSize
            // 强制更新视图
            this.$forceUpdate()
          }
        }
        
        if (savedMouseControl) {
          const newMouseControl = savedMouseControl === 'true'
          if (newMouseControl !== this.mouseControlEnabled) {
            this.mouseControlEnabled = newMouseControl
            // 如果关闭了鼠标控制，强制显示小说内容
            if (!newMouseControl) {
              this.mouseInView = true
            }
            // 强制更新视图
            this.$forceUpdate()
          }
        }
      },
      // 加载设置
      loadSettings() {
        const savedLineSize = localStorage.getItem('reader_lineSize')
        if (savedLineSize) {
          this.lineSize = parseInt(savedLineSize)
          this.lastLineSize = this.lineSize
        }
        
        const savedFontSize = localStorage.getItem('reader_fontSize')
        if (savedFontSize) {
          const fontSize = parseInt(savedFontSize)
          this.fontSize = Math.max(5, Math.min(40, fontSize))
          this.lastFontSize = this.fontSize
        }
        
        const savedMouseControl = localStorage.getItem('reader_mouseControlEnabled')
        if (savedMouseControl) {
          this.mouseControlEnabled = savedMouseControl === 'true'
          // 如果关闭了鼠标控制，强制显示小说内容
          if (!this.mouseControlEnabled) {
            this.mouseInView = true
          }
        }
      },
      // 发送窗口设置给主进程
      sendWindowSettings() {
        const savedWidth = localStorage.getItem('reader_windowWidth')
        const savedHeight = localStorage.getItem('reader_windowHeight')
        
        const width = savedWidth ? parseInt(savedWidth) : 324
        const height = savedHeight ? parseInt(savedHeight) : 15
        
        // 发送窗口设置给主进程
        ipcRenderer.send('update-window-settings', {
          width: width,
          height: height
        })
      },
      // 鼠标是否放置在阅读器中
      mouseIn(value) {
        // 如果鼠标控制功能关闭，不处理鼠标事件
        if (!this.mouseControlEnabled) {
          this.mouseInView = true
          return
        }
        this.mouseInView = value
      },
      // 按键
      keyupEvent(e) {
        if (!this.mouseInView) return

        switch (window.event.keyCode) {
          case 37:
            // 上一页
            this.prevPage()
            break;
          case 39:
            // 下一页
            this.nextPage()
            break;
          case 33: // PageUp键
            // 快速向前翻10页
            this.fastPrevPage()
            break;
          case 34: // PageDown键
            // 快速向后翻10页
            this.fastNextPage()
            break;
        }
      },
      prevPage() {
        if (this.book && this.book.page > 1) {
          this.$store.dispatch('prevPage')
        }
      },
      nextPage() {
        if (this.book && !this.isLastPage) {
          this.$store.dispatch('nextPage')
        }
      },
      // 快速向后翻10页
      fastNextPage() {
        if (this.book && !this.isLastPage) {
          const targetPage = Math.min(this.book.page + 10, this.totalPages)
          this.$store.dispatch('jumpToPage', {
            title: this.book.title,
            page: targetPage,
            lineSize: this.lineSize
          })
        }
      },
      // 快速向前翻10页
      fastPrevPage() {
        if (this.book && this.book.page > 1) {
          const targetPage = Math.max(this.book.page - 10, 1)
          this.$store.dispatch('jumpToPage', {
            title: this.book.title,
            page: targetPage,
            lineSize: this.lineSize
          })
        }
      },
      // 初始化菜单
      initMenu() {
        const Menu = remote.Menu
        const MenuItem = remote.MenuItem
        this.menu = new Menu()
        this.menu.append(new MenuItem({
          label: '菜单',
          click: () => {
            ipcRenderer.send('openMenuWindow')
          }
        }))
      },
      // 右键打开菜单
      rightClick() {
        this.menu.popup(remote.getCurrentWindow())
      }
    }
  }
</script>

<style>
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    user-select: none; /* 防止文本选择 */
  }
  html, body {
    overflow: hidden; /* 隐藏整个页面的滚动条 */
  }
  #page {
    height: 100%;
    display: flex;
    align-items: center;
    width: 100%;
    min-width: 300px; /* 最小宽度确保基本显示 */
    overflow: hidden; /* 隐藏容器滚动条 */
    cursor: move; /* 鼠标悬停时显示移动光标 */
  }
  #page.active {
    background: rgba(222, 225, 230, 0.8); /* 鼠标悬停时显示背景 */
  }
  .preview {
    white-space: nowrap;
    overflow: hidden; /* 隐藏文本溢出滚动条 */
    padding: 0 10px; /* 增加内边距 */
    width: 100%;
    font-family: 'Microsoft YaHei', Arial, sans-serif;
    line-height: 1.2;
    text-overflow: ellipsis; /* 文本溢出显示省略号 */
  }
</style>
