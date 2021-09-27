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
      <div class="menu-item" :class="{active: currentIndex === index}" v-for="(item, index) in menus" :key="item.key" @click="checkMenu(index)">
        {{ item.title }}
      </div>
    </div>
    <div class="body">
      <!-- 列表 -->
      <div class="main-item book-list" v-if="currentIndex === 0">
        <div class="book-item">
          <div class="item-th">小说名</div>
          <div class="item-th">阅读进度</div>
          <div class="item-th">操作</div>
        </div>
        <div class="book-item" :class="{active: book && book.title === item.title}" v-for="item in books" :key="item.title">
          <div class="item-th">{{ item.title }}</div>
          <div class="item-th">{{ ((38 * (item.page -1) / item.size) * 100).toFixed(2) }}%</div>
          <div class="item-th">
            <button @click="selectBook(item)">{{ book && book.title === item.title ? '继续' : '开始' }}阅读</button>
            <button @click="deleteBook(item.title)">删除</button>
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
  </div>
</template>

<script>
  const fs = require('fs')
  import { dirExists } from "../utils/file.js";
  import { ipcRenderer } from "electron";
  const { remote } = require('electron')
  export default {
    name: 'menu-page',
    data: () => {
      return {
        menus: [
          {
            title: '小说列表',
            key: 'list'
          },
          {
            title: '上传小说',
            key: 'upload'
          }
        ],
        currentIndex: 0,
        error: '',
        success: '',
        uploading: '',
        log: ''
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
      }
    }
  }
</script>

<style lang="scss">
  #menu {
    height: 100%;
    display: flex;
    border-top: solid 1px #F3F3F3;
    .menu-list {
      width: 180px;
      height: 100%;
      overflow: auto;
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
      }
    }
    .body {
      flex: 1;
      height: 100%;
      .main-item {
        height: 100%;
        overflow: auto;
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
          width: calc(100% / 3);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          height: 40px;
          line-height: 40px;
          padding: 0 10px;
          button {
            background: #2C2E3A;
            color: #fff;
            font-size: 12px;
            border: none;
            padding: 5px;
            border-radius: 5px;
            cursor: pointer;
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
  }
</style>
