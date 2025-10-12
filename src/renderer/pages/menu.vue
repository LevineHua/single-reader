<!--
 * @Description: 
 * @Author: 华松林
 * @Date: 2021-09-26 10:14:00
 * @LastEditors: 华松林
 * @LastEditTime: 2021-09-27 10:29:50
 * @FilePath: \single-reader\src\renderer\pages\menu.vue
-->
<template>
  <div id="menu">
    <div class="menu-list">
      <div class="menu-item" :class="{active: currentIndex === 2}" @click="checkMenu(2)">设置</div>
      <div class="menu-item" :class="{active: currentIndex === 0}" @click="checkMenu(0)">小说列表</div>
      <div class="menu-item" :class="{active: currentIndex === 1}" @click="checkMenu(1)">上传小说</div>
    </div>
    <div class="body">
      <!-- 设置 -->
      <div class="main-item settings-main" v-if="currentIndex === 2">
        <div class="setting-item">
          <label>字体大小：</label>
          <input type="number" v-model="fontSize" :min="10" :max="20">
          <span class="setting-tip">（范围：10-20px）</span>
        </div>
        <div class="setting-item">
          <label>每行显示字数：</label>
          <input type="number" v-model="lineSize" :min="20" :max="100">
          <span class="setting-tip">（范围：20-100）</span>
        </div>
        <div class="setting-item">
          <label>主界面宽度：</label>
          <input type="number" v-model="windowWidth" :min="200" :max="800">
          <span class="setting-tip">（范围：200-800）</span>
        </div>
        <div class="setting-item">
          <label>主界面高度：</label>
          <input type="number" v-model="windowHeight" :min="15" :max="50">
          <span class="setting-tip">（范围：15-50）</span>
        </div>
        <div class="setting-item">
          <button @click="saveSettings">保存设置</button>
          <button @click="resetSettings">重置</button>
        </div>
        <div class="setting-tip" v-if="saveMessage" :class="{success: saveMessage}">{{ saveMessage }}</div>
      </div>
      
      <!-- 列表 -->
      <div class="main-item book-list" v-if="currentIndex === 0">
        <div class="book-item">
          <div class="item-th">小说名</div>
          <div class="item-th">阅读进度</div>
          <div class="item-th">操作</div>
        </div>
        <div class="book-item" :class="{active: book && book.title === item.title}" v-for="item in books" :key="item.title">
          <div class="item-th">{{ item.title }}</div>
          <div class="item-th">{{ ((item.page - 1) * lineSize / item.size * 100).toFixed(2) }}%</div>
          <div class="item-th">
            <button @click="selectBook(item)">{{ book && book.title === item.title ? '继续' : '开始' }}阅读</button>
            <button @click="deleteBook(item.title)">删除</button>
            <button @click="showJumpDialog(item)">跳转进度</button>
          </div>
        </div>
        <div class="list-tip" v-if="books.length === 0">暂无上传小说，请先上传~</div>
      </div>
      <!-- 上传 -->
      <div class="main-item upload-main" v-if="currentIndex === 1">
        <img src="~@/assets/upload.png" class="upload-icon" @click="selectFile">
        <div class="upload-tip">点击选择文件上传，仅支持.txt文件</div>
        <div class="upload-tip" v-if="error" :class="{error: error}">{{ error }}</div>
        <div class="upload-tip" v-if="success" :class="{success: success}">{{ success }}</div>
        <div class="upload-tip" v-if="uploading" :class="{uploading: uploading}">{{ uploading }}</div>
        <input id="uploadFileTempSeat" type="file" accept=".txt" hidden @change="afterFileSelected">
      </div>
    </div>
    
    <!-- 进度跳转对话框 -->
    <div class="jump-dialog" v-if="showJump">
      <div class="dialog-content">
        <h3>跳转进度 - {{ currentJumpBook.title }}</h3>
        <div class="jump-options">
          <div class="option">
            <label>页码跳转：</label>
            <input type="number" v-model="jumpPage" :min="1" :max="Math.ceil(currentJumpBook.size / lineSize)">
            <span>总页数：{{ Math.ceil(currentJumpBook.size / lineSize) }}</span>
          </div>
          <div class="option">
            <label>百分比跳转：</label>
            <input type="number" v-model="jumpPercent" :min="0" :max="100">
            <span>%</span>
          </div>
        </div>
        <div class="dialog-buttons">
          <button @click="confirmJump">确认跳转</button>
          <button @click="cancelJump">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  const fs = require('fs')
  import { dirExists } from "../utils/file.js";
  const { remote, ipcRenderer } = require('electron')
  export default {
    name: 'menu-page',
    data: () => {
      return {
        currentIndex: 2, // 默认显示设置页面
        error: '',
        success: '',
        uploading: '',
        log: '',
        showJump: false,
        currentJumpBook: null,
        jumpPage: 1,
        jumpPercent: 0,
        fontSize: 13, // 默认字体大小
        lineSize: 38, // 默认每行显示字数
        windowWidth: 324, // 默认主界面宽度 (38 * 8 + 20 = 324)
        windowHeight: 15, // 默认主界面高度
        saveMessage: '',
        oldLineSize: 38 // 记录之前的每行字数
      }
    },
    computed: {
      books() {
        return this.$store.state.Book.books
      },
      book() {
        return this.$store.state.Book.book
      }
    },
    watch: {
      jumpPage(newVal) {
        if (this.currentJumpBook) {
          const totalPages = Math.ceil(this.currentJumpBook.size / this.lineSize)
          if (newVal > totalPages) {
            this.jumpPage = totalPages
          }
          this.jumpPercent = ((newVal - 1) * this.lineSize / this.currentJumpBook.size * 100).toFixed(2)
        }
      },
      jumpPercent(newVal) {
        if (this.currentJumpBook) {
          if (newVal > 100) {
            this.jumpPercent = 100
          }
          const targetPage = Math.ceil(this.currentJumpBook.size * newVal / 100 / this.lineSize)
          this.jumpPage = targetPage > 0 ? targetPage : 1
        }
      }
    },
    mounted() {
      // 加载保存的设置
      this.loadSettings()
    },
    methods: {
      checkMenu(index) {
        this.currentIndex = index
      },
      // 选择文件
      selectFile() {
        const inputElement = document.getElementById('uploadFileTempSeat')
        inputElement.click()
      },
      // 选择文件后
      async afterFileSelected(e) {
        this.error = ''
        this.success = ''
        this.uploading = '上传中...'

        const file = e.target.files[0]
        const fileName = file.name
        const path = file.path
        // this.log = file.path
        // 读取选中的文件
        fs.readFile(path, async (err, data) => {
          if (err) {
            this.error = '上传失败'
            this.uploading = ''
          } else {
            const context = data.toString().trim()
            // 读取成功则写入到指定文件中，并存入store
            await dirExists('./book')
            fs.writeFile('./book/' + fileName, context, (error) => {
              this.uploading = ''
              if (error) {
                this.error = '上传失败'
              } else {
                this.success = '上传成功'
                
                const book = {
                  title: fileName.replace('.txt', ''),
                  path: './book/' + fileName,
                  progress: 0,  // 进度
                  page: 1,  // 当前所在页
                  size: context.length
                }
                this.$store.dispatch('addBook', book)
              }
            })
          }
          // this.log = data
        })
      },
      deleteBook(title) {
        this.$store.dispatch('deleteBook', title)
      },
      selectBook(book) {
        this.$store.dispatch('selectBook', book)
        remote.getCurrentWindow().close()
      },
      // 显示跳转进度对话框
      showJumpDialog(book) {
        this.currentJumpBook = book
        this.jumpPage = book.page
        this.jumpPercent = ((book.page - 1) * this.lineSize / book.size * 100).toFixed(2)
        this.showJump = true
      },
      // 确认跳转
      confirmJump() {
        if (this.currentJumpBook) {
          this.$store.dispatch('jumpToPage', {
            title: this.currentJumpBook.title,
            page: parseInt(this.jumpPage),
            lineSize: this.lineSize
          })
          this.showJump = false
          this.currentJumpBook = null
        }
      },
      // 取消跳转
      cancelJump() {
        this.showJump = false
        this.currentJumpBook = null
      },
      // 加载设置
      loadSettings() {
        const savedFontSize = localStorage.getItem('reader_fontSize')
        if (savedFontSize) {
          this.fontSize = parseInt(savedFontSize)
        }
        
        const savedLineSize = localStorage.getItem('reader_lineSize')
        if (savedLineSize) {
          this.oldLineSize = parseInt(savedLineSize)
          this.lineSize = this.oldLineSize
        }
        
        const savedWidth = localStorage.getItem('reader_windowWidth')
        if (savedWidth) {
          this.windowWidth = parseInt(savedWidth)
        }
        
        const savedHeight = localStorage.getItem('reader_windowHeight')
        if (savedHeight) {
          this.windowHeight = parseInt(savedHeight)
        }
      },
      // 发送窗口设置给主进程
      sendWindowSettings() {
        ipcRenderer.send('update-window-settings', {
          width: this.windowWidth,
          height: this.windowHeight
        })
      },
      // 保存设置
      saveSettings() {
        if (this.fontSize < 10) this.fontSize = 10
        if (this.fontSize > 20) this.fontSize = 20
        
        if (this.lineSize < 20) this.lineSize = 20
        if (this.lineSize > 100) this.lineSize = 100
        
        if (this.windowWidth < 200) this.windowWidth = 200
        if (this.windowWidth > 800) this.windowWidth = 800
        
        if (this.windowHeight < 15) this.windowHeight = 15
        if (this.windowHeight > 50) this.windowHeight = 50
        
        // 如果每行字数发生了变化，调整页码以保持相同的字符位置
        if (this.lineSize !== this.oldLineSize) {
          this.$store.dispatch('adjustLineSize', {
            oldLineSize: this.oldLineSize,
            newLineSize: this.lineSize
          })
          this.oldLineSize = this.lineSize
        }
        
        localStorage.setItem('reader_fontSize', this.fontSize.toString())
        localStorage.setItem('reader_lineSize', this.lineSize.toString())
        localStorage.setItem('reader_windowWidth', this.windowWidth.toString())
        localStorage.setItem('reader_windowHeight', this.windowHeight.toString())
        
        // 发送窗口设置给主进程，立即生效
        this.sendWindowSettings()
        
        // 触发自定义事件通知其他页面设置已更新
        const event = new CustomEvent('localStorageChange', {
          detail: {
            key: 'reader_settings',
            value: {
              fontSize: this.fontSize,
              lineSize: this.lineSize,
              width: this.windowWidth,
              height: this.windowHeight
            }
          }
        })
        window.dispatchEvent(event)
        
        this.saveMessage = '设置已保存，阅读进度百分比保持不变'
        
        // 3秒后清除提示消息
        setTimeout(() => {
          this.saveMessage = ''
        }, 3000)
      },
      // 重置设置
      resetSettings() {
        this.fontSize = 13
        this.lineSize = 21
        this.windowWidth = 324
        this.windowHeight = 15
        
        // 记录重置前的每行字数
        const oldLineSize = this.lineSize
        
        localStorage.setItem('reader_fontSize', '13')
        localStorage.setItem('reader_lineSize', '21')
        localStorage.setItem('reader_windowWidth', '324')
        localStorage.setItem('reader_windowHeight', '15')
        
        // 如果每行字数发生了变化，调整页码以保持相同的字符位置
        if (oldLineSize !== 21) {
          this.$store.dispatch('adjustLineSize', {
            oldLineSize: oldLineSize,
            newLineSize: 21
          })
        }
        this.oldLineSize = 21
        
        // 发送窗口设置给主进程，立即生效
        this.sendWindowSettings()
        
        // 触发自定义事件通知其他页面设置已更新
        const event = new CustomEvent('localStorageChange', {
          detail: {
            key: 'reader_settings',
            value: {
              fontSize: 13,
              lineSize: 21,
              width: 324,
              height: 15
            }
          }
        })
        window.dispatchEvent(event)
        
        this.saveMessage = '设置已重置为默认值，阅读进度百分比保持不变'
        
        // 3秒后清除提示消息
        setTimeout(() => {
          this.saveMessage = ''
        }, 3000)
      }
    }
  }
</script>

<style lang="scss">
  html, body {
    overflow: hidden; /* 隐藏整个页面的滚动条 */
  }
  #menu {
    height: 100%;
    display: flex;
    border-top: solid 1px #F3F3F3;
    .menu-list {
      width: 180px;
      height: 100%;
      overflow: hidden; /* 隐藏滚动条 */
      border-right: solid 1px #F3F3F3;
      .menu-item {
        padding: 20px;
        border-bottom: solid 1px #F3F3F3;
        font-size: 14px;
        cursor: pointer;
        &.active {
          background: #2C2E3A;
          color: #fff;
        }
        &:first-child {
          cursor: pointer;
        }
      }
    }
    .body {
      flex: 1;
      height: 100%;
      overflow: hidden; /* 隐藏滚动条 */
      .main-item {
        height: 100%;
        overflow: hidden; /* 隐藏滚动条 */
      }
      .settings-main {
        padding: 20px;
        .setting-item {
          margin-bottom: 20px;
          label {
            display: inline-block;
            width: 120px;
          }
          input {
            width: 80px;
            padding: 5px;
            margin-right: 10px;
          }
          button {
            background: #2C2E3A;
            color: #fff;
            border: none;
            padding: 8px 15px;
            border-radius: 5px;
            cursor: pointer;
            margin-right: 10px;
          }
        }
        .setting-tip {
          color: #999;
          font-size: 12px;
          &.success {
            color: green;
          }
        }
      }
      .book-list {
        .book-item {
          display: flex;
          border-bottom: solid 1px #F3F3F3;
          &.active {
            background: #F3F3F3;
          }
        }
        .item-th {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          height: 40px;
          line-height: 40px;
          padding: 0 10px;
          &:first-child {
            width: 30%;
          }
          &:nth-child(2) {
            width: 20%;
            text-align: center;
          }
          &:last-child {
            width: 50%;
            display: flex;
            align-items: center;
            gap: 5px;
          }
          button {
            background: #2C2E3A;
            color: #fff;
            font-size: 11px;
            border: none;
            padding: 4px 8px;
            border-radius: 3px;
            cursor: pointer;
            white-space: nowrap;
          }
        }
        .list-tip {
          text-align: center;
          padding: 10px 0;
        }
      }
      .upload-main {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        .upload-icon {
          width: 100px;
          cursor: pointer;
        }
        .upload-tip {
          color: #999;
        }
        .error {
          color: red
        }
        .success {
          color: greenyellow;
        }
        .uploading {
          color: blue;
        }
      }
    }
    .jump-dialog {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      .dialog-content {
        background: white;
        padding: 20px;
        border-radius: 5px;
        width: 400px;
        h3 {
          margin-bottom: 20px;
          text-align: center;
        }
        .jump-options {
          margin-bottom: 20px;
          .option {
            margin-bottom: 15px;
            label {
              display: inline-block;
              width: 100px;
            }
            input {
              width: 80px;
              padding: 5px;
              margin: 0 10px;
            }
          }
        }
        .dialog-buttons {
          text-align: center;
          button {
            background: #2C2E3A;
            color: #fff;
            border: none;
            padding: 8px 15px;
            border-radius: 5px;
            cursor: pointer;
            margin: 0 10px;
          }
        }
      }
    }
  }
</style>
