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
  <div id="page" :class="{active: mouseInView}" @mouseover="mouseIn(true)" @mouseout="mouseIn(false)" @contextmenu.prevent="rightClick">
    <!-- 如果鼠标不再阅读器上则显示随便放一个网站域名 -->
    <div class="preview">
      {{ mouseInView ? nowRead : 'fanyi.baidu.com/translate?aldtype=16047&query=&keyfrom=baidu&smartresult=dict&lang=auto2zh#en/zh/single-reader' }}
      {{ book && nowRead.length < lineSize ? '（已读完）' : '' }}
    </div>
    <!-- {{ keyword }} -->
  </div>
</template>

<script>
  import { ipcRenderer, app } from "electron";
  const { remote } = require('electron')

  export default {
    name: 'index-page',
    data: () => {
      return {
        content: ``,
        lineSize: 38, // 一行显示38个字
        mouseInView: false,
        menu: null,
        keyword: ''
      }
    },
    mounted() {
      
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
      // 正在阅读的内容
      nowRead() {
        return this.book ? this.book.context.slice(this.lineSize * (this.book.page - 1), this.lineSize * this.book.page) : '请先右键选择'
      }
    },
    methods: {
      // 鼠标是否放置在阅读器中
      mouseIn(value) {
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
        }
      },
      prevPage() {
        this.$store.dispatch('prevPage')
      },
      nextPage() {
        // 如果当前正在阅读的内容小于一行显示的文本数量，则说明是最后一行
        if (this.nowRead.length === this.lineSize) {
          this.$store.dispatch('nextPage')
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
  }
  #page {
    height: 100%;
    display: flex;
    align-items: center;
  }
  .preview {
    white-space: nowrap;
    overflow: hidden;
    padding: 0 5px;
  }
</style>
