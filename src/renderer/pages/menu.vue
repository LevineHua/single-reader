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
          <label>伪装开关：</label>
          <label class="switch">
            <input type="checkbox" v-model="mouseControlEnabled">
            <span class="slider round"></span>
          </label>
          <span class="setting-tip">（开启时鼠标移入显示小说，移出显示链接）</span>
        </div>
        <div class="setting-item">
          <label>字体大小：</label>
          <input type="number" v-model="fontSize" :min="5" :max="40">
          <span class="setting-tip">（范围：5-40px）</span>
        </div>
        <div class="setting-item">
          <label>每行显示字数：</label>
          <input type="number" v-model="lineSize" :min="10" :max="200">
          <span class="setting-tip">（范围：10-200）</span>
        </div>
        <div class="setting-item">
          <label>主界面宽度：</label>
          <input type="number" v-model="windowWidth" :min="100" :max="2000">
          <span class="setting-tip">（范围：100-2000）</span>
        </div>
        <div class="setting-item">
          <label>主界面高度：</label>
          <input type="number" v-model="windowHeight" :min="10" :max="200">
          <span class="setting-tip">（范围：10-200）</span>
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
            <button v-if="item.type === 'epub' && item.chapters && item.chapters.length > 0" @click="showChapterDialog(item)">章节跳转</button>
          </div>
        </div>
        <div class="list-tip" v-if="books.length === 0">暂无上传小说，请先上传~</div>
      </div>
      <!-- 上传 -->
      <div class="main-item upload-main" v-if="currentIndex === 1">
        <img src="~@/assets/upload.png" class="upload-icon" @click="selectFile">
        <div class="upload-tip">点击选择文件上传，支持.txt和.epub文件</div>
        <div class="upload-tip" v-if="error" :class="{error: error}">{{ error }}</div>
        <div class="upload-tip" v-if="success" :class="{success: success}">{{ success }}</div>
        <div class="upload-tip" v-if="uploading" :class="{uploading: uploading}">{{ uploading }}</div>
        <input id="uploadFileTempSeat" type="file" accept=".txt,.epub" hidden @change="afterFileSelected">
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
    
    <!-- 章节跳转对话框 -->
    <div class="chapter-dialog" v-if="showChapter">
      <div class="dialog-content">
        <h3>章节跳转 - {{ currentChapterBook.title }}</h3>
        <div class="chapter-list">
          <div class="chapter-item" 
               v-for="(chapter, index) in displayedChapters" 
               :key="index"
               :class="{active: selectedChapterIndex === chapter.originalIndex}"
               @click="selectChapter(chapter.originalIndex)">
            <span class="chapter-title" :style="{ 'margin-left': getChapterIndent(chapter.level) }">
              {{ chapter.title }}
            </span>
            <span v-if="chapter.level === 1 && chapter.hasChildren" class="expand-icon" @click.stop="toggleExpand(chapter.originalIndex)">
              {{ expandedChapters[chapter.originalIndex] ? '−' : '+' }}
            </span>
          </div>
        </div>
        <div class="dialog-buttons">
          <button @click="confirmChapterJump">确认跳转</button>
          <button @click="cancelChapterJump">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  const fs = require('fs')
  import { dirExists } from "../utils/file.js";
  import { parseEpub, isEpubFile } from "../utils/epub.js";
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
        showChapter: false,
        currentChapterBook: null,
        selectedChapterIndex: 0,
        expandedChapters: {}, // 记录哪些level1章节是展开的
        mouseControlEnabled: false, // 鼠标控制开关，默认关闭
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
      },
      // 根据展开状态计算显示的章节列表
      displayedChapters() {
        if (!this.currentChapterBook || !this.currentChapterBook.chapters) {
          return []
        }
        
        const chapters = this.currentChapterBook.chapters
        const displayed = []
        
        for (let i = 0; i < chapters.length; i++) {
          const chapter = chapters[i]
          
          // 如果是level1章节，总是显示
          if (chapter.level === 1) {
            // 检查该level1章节是否有子章节
            const hasChildren = this.hasChildren(i, chapters)
            displayed.push({
              ...chapter,
              originalIndex: i,
              hasChildren: hasChildren
            })
            
            // 如果该章节是展开的，显示其子章节
            if (this.expandedChapters[i] && hasChildren) {
              // 找到所有属于该level1的子章节
              let j = i + 1
              while (j < chapters.length && chapters[j].level > 1) {
                displayed.push({
                  ...chapters[j],
                  originalIndex: j,
                  hasChildren: false
                })
                j++
              }
            }
          }
        }
        
        return displayed
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
      // 检查某个章节是否有子章节
      hasChildren(index, chapters) {
        if (index >= chapters.length - 1) return false
        
        const currentChapter = chapters[index]
        const nextChapter = chapters[index + 1]
        
        // 如果下一章节的层级大于当前章节，说明有子章节
        return nextChapter.level > currentChapter.level
      },
      // 切换章节展开/折叠状态
      toggleExpand(chapterIndex) {
        this.$set(this.expandedChapters, chapterIndex, !this.expandedChapters[chapterIndex])
      },
      checkMenu(index) {
        this.currentIndex = index
      },
      // 根据章节层级获取缩进距离
      getChapterIndent(level) {
        if (!level || level === 0) return '0px'
        // 层级1: 0px, 层级2: 15px, 层级3: 30px, 层级4: 45px, 层级5: 60px, 层级6: 75px
        return `${(level - 1) * 15}px`
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
        
        try {
          // 检查文件类型
          if (isEpubFile(fileName)) {
            // 处理EPUB文件
            this.uploading = '正在解析EPUB文件...'
            const result = await parseEpub(path)
            
            // 生成唯一的文件名
            const uniqueFileName = `epub_${Date.now()}_${fileName.replace('.epub', '.txt')}`
            
            // 保存解析后的文本内容到文件
            await dirExists('./book')
            fs.writeFile('./book/' + uniqueFileName, result.content, (error) => {
              this.uploading = ''
              if (error) {
                this.error = 'EPUB文件保存失败'
              } else {
                this.success = 'EPUB上传并解析成功'
                
                const book = {
                  title: result.bookInfo.title,
                  path: './book/' + uniqueFileName,
                  progress: 0,
                  page: 1,
                  size: result.content.length,
                  type: 'epub',
                  originalPath: path, // 保存原始EPUB文件路径
                  chapters: result.chapters // 保存章节信息
                }
                this.$store.dispatch('addBook', book)
              }
            })
          } else {
            // 处理TXT文件（原有逻辑）
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
                      progress: 0,
                      page: 1,
                      size: context.length,
                      type: 'txt'
                    }
                    this.$store.dispatch('addBook', book)
                  }
                })
              }
            })
          }
        } catch (error) {
          this.uploading = ''
          this.error = `文件处理失败: ${error.message}`
        }
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
      // 显示章节跳转对话框
      showChapterDialog(book) {
        this.currentChapterBook = book
        this.selectedChapterIndex = 0
        this.expandedChapters = {} // 重置展开状态
        this.showChapter = true
      },
      // 选择章节
      selectChapter(index) {
        this.selectedChapterIndex = index
      },
      // 确认章节跳转
      confirmChapterJump() {
        if (this.currentChapterBook) {
          this.$store.dispatch('jumpToChapter', {
            title: this.currentChapterBook.title,
            chapterIndex: this.selectedChapterIndex,
            lineSize: this.lineSize
          })
          this.showChapter = false
          this.currentChapterBook = null
        }
      },
      // 取消章节跳转
      cancelChapterJump() {
        this.showChapter = false
        this.currentChapterBook = null
      },
      // 加载设置
      loadSettings() {
        const savedMouseControl = localStorage.getItem('reader_mouseControlEnabled')
        if (savedMouseControl) {
          this.mouseControlEnabled = savedMouseControl === 'true'
        }
        
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
        if (this.fontSize < 5) this.fontSize = 5
        if (this.fontSize > 40) this.fontSize = 40
        
        if (this.lineSize < 10) this.lineSize = 10
        if (this.lineSize > 200) this.lineSize = 200
        
        if (this.windowWidth < 100) this.windowWidth = 100
        if (this.windowWidth > 2000) this.windowWidth = 2000
        
        if (this.windowHeight < 10) this.windowHeight = 10
        if (this.windowHeight > 200) this.windowHeight = 200
        
        // 如果每行字数发生了变化，调整页码以保持相同的字符位置
        if (this.lineSize !== this.oldLineSize) {
          this.$store.dispatch('adjustLineSize', {
            oldLineSize: this.oldLineSize,
            newLineSize: this.lineSize
          })
          this.oldLineSize = this.lineSize
        }
        
        localStorage.setItem('reader_mouseControlEnabled', this.mouseControlEnabled.toString())
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
              mouseControlEnabled: this.mouseControlEnabled,
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
        this.mouseControlEnabled = true
        this.fontSize = 13
        this.lineSize = 20 // 重置为20
        this.windowWidth = 324
        this.windowHeight = 15
        
        // 记录重置前的每行字数
        const oldLineSize = this.lineSize
        
        localStorage.setItem('reader_mouseControlEnabled', 'true')
        localStorage.setItem('reader_fontSize', '13')
        localStorage.setItem('reader_lineSize', '20') // 重置为20
        localStorage.setItem('reader_windowWidth', '324')
        localStorage.setItem('reader_windowHeight', '15')
        
        // 如果每行字数发生了变化，调整页码以保持相同的字符位置
        if (oldLineSize !== 20) {
          this.$store.dispatch('adjustLineSize', {
            oldLineSize: oldLineSize,
            newLineSize: 20
          })
        }
        this.oldLineSize = 20
        
        // 发送窗口设置给主进程，立即生效
        this.sendWindowSettings()
        
        // 触发自定义事件通知其他页面设置已更新
        const event = new CustomEvent('localStorageChange', {
          detail: {
            key: 'reader_settings',
            value: {
              mouseControlEnabled: true,
              fontSize: 13,
              lineSize: 20,
              width: 324,
              height: 15
            }
          }
        })
        window.dispatchEvent(event)
        
        this.saveMessage = '设置已重置为默认值'
        
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
    height: 100vh; /* 使用视窗高度 */
    display: flex;
    border-top: solid 1px #F3F3F3;
    .menu-list {
      width: 200px; /* 增加菜单宽度 */
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
        padding: 15px; /* 减小内边距 */
        .setting-item {
          margin-bottom: 15px; /* 减小间距 */
          display: flex;
          align-items: center;
          label {
            display: inline-block;
            width: 120px; 
            min-width: 80px; /* 减小标签最小宽度 */
            font-size: 16px; 
          }
          input {
            width: 60px; /* 减小输入框宽度 */
            padding: 4px; /* 减小内边距 */
            margin-right: 5px; /* 减小右边距 */
            font-size: 13px; /* 减小字体大小 */
          }
          button {
            background: #2C2E3A;
            color: #fff;
            border: none;
            padding: 6px 12px; /* 减小按钮内边距 */
            border-radius: 4px; /* 减小圆角 */
            cursor: pointer;
            margin-right: 8px; /* 减小右边距 */
            font-size: 12px; /* 减小字体大小 */
          }
        }
        .setting-tip {
          color: #999;
          font-size: 13px; /* 减小提示文字大小 */
          margin-left: 5px; /* 在输入框右侧显示 */
          &.success {
            color: green;
          }
        }
        /* 开关样式 - 更紧凑的布局 */
        .switch {
          position: relative;
          display: inline-block;
          width: 25px;  /* 减小宽度 */
          height: 20px; /* 减小高度 */
          margin-right: 10px; /* 减小右边距 */
        }
        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: .4s;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 16px; /* 减小滑块高度 */
          width: 16px;  /* 减小滑块宽度 */
          left: 2px;    /* 调整位置 */
          bottom: 2px;  /* 调整位置 */
          background-color: white;
          transition: .4s;
        }
        input:checked + .slider {
          background-color: #2C2E3A;
        }
        input:checked + .slider:before {
          transform: translateX(20px); /* 调整移动距离 */
        }
        .slider.round {
          border-radius: 14px; /* 调整圆角 */
        }
        .slider.round:before {
          border-radius: 50%;
        }
      }
      .book-list {
        height: 100%;
        overflow-y: auto; /* 允许垂直滚动 */
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
          height: 50px; /* 增加行高 */
          line-height: 50px;
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
            gap: 8px; /* 增加按钮间距 */
            flex-wrap: wrap; /* 允许按钮换行 */
          }
          button {
            background: #2C2E3A;
            color: #fff;
            font-size: 12px; /* 增加字体大小 */
            border: none;
            padding: 6px 12px; /* 增加按钮内边距 */
            border-radius: 4px;
            cursor: pointer;
            white-space: nowrap;
            min-width: 60px; /* 设置按钮最小宽度 */
          }
        }
        .list-tip {
          text-align: center;
          padding: 20px 0;
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
    .chapter-dialog {
      position: fixed;
      top: 20px;
      left: 20px;
      right: 20px;
      bottom: 20px;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      .dialog-content {
        background: white;
        padding: 15px;
        border-radius: 5px;
        width: 600px; /* 增加对话框宽度 */
        max-height: 90vh; /* 增加最大高度 */
        display: flex;
        flex-direction: column;
        h3 {
          margin-bottom: 15px;
          text-align: center;
          font-size: 16px;
        }
        .chapter-list {
          flex: 1;
          overflow-y: auto;
          margin-bottom: 15px;
          border: 1px solid #ddd;
          border-radius: 3px;
          max-height: 70vh; /* 增加章节列表高度 */
          .chapter-item {
            padding: 10px; /* 增加内边距 */
            cursor: pointer;
            border-bottom: 1px solid #eee;
            display: flex;
            align-items: center;
            font-size: 14px; /* 增加字体大小 */
            &:hover {
              background-color: #f5f5f5;
            }
            &.active {
              background-color: #2C2E3A;
              color: white;
            }
            &:last-child {
              border-bottom: none;
            }
            .chapter-title {
              flex: 1;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              padding-left: 8px; /* 添加左侧内边距以替代序号 */
            }
            .expand-icon {
              width: 25px; /* 增加宽度 */
              text-align: center;
              font-weight: bold;
              font-size: 16px; /* 增加字体大小 */
              cursor: pointer;
              margin-left: 8px; /* 增加左边距 */
              &:hover {
                background-color: #e0e0e0;
                border-radius: 3px;
              }
            }
          }
        }
        .dialog-buttons {
          text-align: center;
          button {
            background: #2C2E3A;
            color: #fff;
            border: none;
            padding: 8px 16px; /* 增加按钮内边距 */
            border-radius: 4px;
            cursor: pointer;
            margin: 0 10px;
            font-size: 14px; /* 增加字体大小 */
          }
        }
      }
    }
  }
</style>
