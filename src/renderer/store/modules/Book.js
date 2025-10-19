/*
 * @Description: 
 * @Author: 华松林
 * @Date: 2021-09-24 16:56:34
 * @LastEditors: 系统
 * @LastEditTime: 2025-10-11
 * @FilePath: \single-reader\src\renderer\store\modules\Book.js
 */
const fs = require('fs')

// 初始状态，持久化由自定义插件处理
const state = {
  books: [],
  book: null
}

const mutations = {
  // 开始阅读
  read (state, book) {
    state.book = book
  },
  setData(state, [key, value]) {
    state[key] = value
  },
  // 新增：专门处理跳转的mutation
  jumpToPage(state, { book, page }) {
    if (state.book && state.book.title === book.title) {
      state.book.page = page
    }
    // 更新书籍列表中的页码
    const bookIndex = state.books.findIndex(val => val.title === book.title)
    if (bookIndex !== -1) {
      state.books[bookIndex].page = page
    }
  },
  // 新增：章节跳转
  jumpToChapter(state, { book, chapterIndex, lineSize = 38 }) {
    if (state.book && state.book.title === book.title && book.chapters && book.chapters[chapterIndex]) {
      const chapter = book.chapters[chapterIndex]
      // 根据章节位置计算页码
      const page = Math.ceil(chapter.position / lineSize) + 1
      state.book.page = page
    }
    // 更新书籍列表中的页码
    const bookIndex = state.books.findIndex(val => val.title === book.title)
    if (bookIndex !== -1 && state.books[bookIndex].chapters && state.books[bookIndex].chapters[chapterIndex]) {
      const chapter = state.books[bookIndex].chapters[chapterIndex]
      const page = Math.ceil(chapter.position / lineSize) + 1
      state.books[bookIndex].page = page
    }
  },
  // 新增：调整每行字数时重新计算页码，保持字符位置不变
  adjustPagesForLineSize(state, { oldLineSize, newLineSize }) {
    state.books.forEach(book => {
      if (book.page && book.size) {
        // 计算当前页码对应的字符位置
        const charPosition = (book.page - 1) * oldLineSize
        // 根据新的每行字数重新计算页码
        const newPage = Math.ceil(charPosition / newLineSize) + 1
        // 确保页码在有效范围内
        const totalPages = Math.ceil(book.size / newLineSize)
        book.page = Math.min(Math.max(newPage, 1), totalPages)
      }
    })
    
    // 更新当前阅读的书籍页码
    if (state.book && state.book.size) {
      const charPosition = (state.book.page - 1) * oldLineSize
      const newPage = Math.ceil(charPosition / newLineSize) + 1
      const totalPages = Math.ceil(state.book.size / newLineSize)
      state.book.page = Math.min(Math.max(newPage, 1), totalPages)
    }
  }
}

const actions = {
  // 添加
  addBook ({ commit, state }, book) {
    let books = JSON.parse(JSON.stringify(state.books))
    const index = books.findIndex(val => val.title === book.title)
    if (index === -1) {
      books.push(book)
    } else {
      books.splice(index, 1, book)
    }
    commit('setData', ['books', books])
  },
  // 删除
  deleteBook ({ commit, state }, title) {
    let books = JSON.parse(JSON.stringify(state.books))
    const index = books.findIndex(val => val.title === title)
    books.splice(index, 1)
    commit('setData', ['books', books])

    if (state.book && state.book.title === title) {
      commit('setData', ['book', null])
    }
  },

  prevPage({ commit, state }) {
    let book = JSON.parse(JSON.stringify(state.book))
    let books = JSON.parse(JSON.stringify(state.books))

    if (book && book.page > 1) {
      book.page--
      const index = books.findIndex(val => val.title === book.title)
      if (index !== -1) {
        books[index].page = book.page
        commit('setData', ['books', books])
        commit('setData', ['book', book])
      }
    }
  },
  nextPage({ commit, state }) {
    let book = JSON.parse(JSON.stringify(state.book))
    let books = JSON.parse(JSON.stringify(state.books))

    if (!book) return
    
    // 检查是否还有下一页（需要知道总页数，这里简单检查页码不超过书籍大小）
    const lineSize = 38 // 默认每行字数
    const totalPages = Math.ceil(book.size / lineSize)
    
    if (book.page < totalPages) {
      book.page++
      const index = books.findIndex(val => val.title === book.title)
      if (index !== -1) {
        books[index].page = book.page
        commit('setData', ['books', books])
        commit('setData', ['book', book])
      }
    }
  },
  // 跳转到指定页码
  jumpToPage({ commit, state }, { title, page, lineSize = 38 }) {
    const index = state.books.findIndex(val => val.title === title)
    
    if (index !== -1) {
      const book = state.books[index]
      const totalPages = Math.ceil(book.size / lineSize)
      
      // 确保页码在有效范围内
      if (page < 1) page = 1
      if (page > totalPages) page = totalPages
      
      // 直接调用mutation来确保响应式更新
      commit('jumpToPage', { book, page })
    }
  },
  // 新增：跳转到指定章节
  jumpToChapter({ commit, state }, { title, chapterIndex, lineSize = 38 }) {
    const index = state.books.findIndex(val => val.title === title)
    
    if (index !== -1) {
      const book = state.books[index]
      
      // 确保章节索引在有效范围内
      if (book.chapters && book.chapters.length > 0) {
        if (chapterIndex < 0) chapterIndex = 0
        if (chapterIndex >= book.chapters.length) chapterIndex = book.chapters.length - 1
        
        // 直接调用mutation来确保响应式更新
        commit('jumpToChapter', { book, chapterIndex, lineSize })
      }
    }
  },
  // 选择书籍
  selectBook ({ commit, state }, book) {
    if (state.book && state.book.title === book.title) {
      return
    }
    fs.readFile(book.path, async (err, data) => {
      if (err) {
        console.error('读取书籍文件失败:', err)
        return
      }
      book['context'] = data.toString()
      commit('read', book)
    })
  },
  // 新增：调整每行字数时重新计算页码，保持阅读进度百分比不变
  adjustLineSize({ commit, state }, { oldLineSize, newLineSize }) {
    commit('adjustPagesForLineSize', { oldLineSize, newLineSize })
  }
}

export default {
  state,
  mutations,
  actions
}
