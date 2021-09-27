<!--
 * @Description: 
 * @Author: 华松林
 * @Date: 2021-09-24 16:56:34
 * @LastEditors: 华松林
 * @LastEditTime: 2021-09-26 10:16:02
 * @FilePath: \single-reader\src\renderer\App.vue
-->
<template>
  <div id="app">
    <router-view></router-view>
  </div>
</template>

<script>
  export default {
    name: 'single-reader'
  }
</script>

<style>
  /* CSS */
  html, body, #app {
    height: 100%;
  }
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  body { font-family: 'Source Sans Pro', sans-serif; }
</style>
