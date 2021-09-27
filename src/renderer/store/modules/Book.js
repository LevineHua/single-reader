/*
 * @Description: 
 * @Author: 华松林
 * @Date: 2021-09-24 16:56:34
 * @LastEditors: 华松林
 * @LastEditTime: 2021-09-27 10:29:27
 * @FilePath: \single-reader\src\renderer\store\modules\Book.js
 */
const fs = require('fs')
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
      books[index].page = book.page
      commit('setData', ['books', books])
      commit('setData', ['book', book])
    }
  },
  nextPage({ commit, state }) {
    let book = JSON.parse(JSON.stringify(state.book))
    let books = JSON.parse(JSON.stringify(state.books))

    if (!book) return
    book.page++
    const index = books.findIndex(val => val.title === book.title)
    books[index].page = book.page
    commit('setData', ['books', books])
    commit('setData', ['book', book])
  },
  // 选择书籍
  selectBook ({ commit, state }, book) {
    if (state.book && state.book.title === book.title) {
      return
    }
    fs.readFile(book.path, async (err, data) => {
      book['context'] = data.toLocaleString()
      commit('read', book)
    })
  }
}

export default {
  state,
  mutations,
  actions
}
