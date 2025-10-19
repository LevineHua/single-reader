/*
 * @Description: 
 * @Author: 华松林
 * @Date: 2021-09-24 16:56:34
 * @LastEditors: 系统
 * @LastEditTime: 2025-10-11
 * @FilePath: \single-reader\src\renderer\store\index.js
 */
import Vue from 'vue'
import Vuex from 'vuex'

import { createSharedMutations } from 'vuex-electron'
import createPersistedState from './persisted-state'

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
