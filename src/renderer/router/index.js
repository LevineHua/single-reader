/*
 * @Description: 
 * @Author: 华松林
 * @Date: 2021-09-24 16:56:34
 * @LastEditors: 华松林
 * @LastEditTime: 2021-09-26 10:15:17
 * @FilePath: \single-reader\src\renderer\router\index.js
 */
import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'index-page',
      component: require('@/pages/index').default
    },
    {
      path: '*',
      redirect: '/'
    },
    {
      path: '/menu',
      name: 'menu',
      component: require('@/pages/menu').default
    }
  ]
})
