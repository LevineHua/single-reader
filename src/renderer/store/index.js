/*
 * @Description: 
 * @Author: 华松林
 * @Date: 2021-09-24 16:56:34
 * @LastEditors: 华松林
 * @LastEditTime: 2021-09-27 10:00:54
 * @FilePath: \single-reader\src\renderer\store\index.js
 */
import Vue from 'vue'
import Vuex from 'vuex'

import { createPersistedState, createSharedMutations } from 'vuex-electron'

import modules from './modules'

Vue.use(Vuex)

export default new Vuex.Store({
  modules,
  plugins: [
    createPersistedState(),
    createSharedMutations()
  ],
  strict: process.env.NODE_ENV !== 'production'
})
