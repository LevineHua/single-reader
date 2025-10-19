/**
 * 自定义Vuex持久化插件
 * 使用electron-store进行状态持久化
 */
const Store = require('electron-store')

// 创建electron-store实例
const electronStore = new Store({
  name: 'single-reader-state',
  defaults: {
    Book: {
      books: [],
      book: null
    }
  }
})

export default function createPersistedState() {
  return store => {
    // 从electron-store加载保存的状态
    try {
      const savedState = electronStore.get('Book')
      if (savedState) {
        store.replaceState({
          ...store.state,
          Book: savedState
        })
        console.log('状态加载成功')
      }
    } catch (error) {
      console.warn('Failed to load saved Vuex state:', error)
    }

    // 订阅mutation变化，保存状态到electron-store
    let saveTimeout = null
    let isSaving = false
    let pendingSave = false
    
    store.subscribe((mutation, state) => {
      // 防抖保存，避免频繁写入
      if (saveTimeout) {
        clearTimeout(saveTimeout)
      }
      
      saveTimeout = setTimeout(async () => {
        // 如果正在保存，标记有挂起的保存请求
        if (isSaving) {
          pendingSave = true
          return
        }
        
        isSaving = true
        pendingSave = false
        
        try {
          // 只保存Book模块的状态
          const stateToSave = {
            books: state.Book.books,
            book: state.Book.book
          }
          
          // 使用异步写入和重试机制
          await saveWithRetry(stateToSave)
          console.log('状态保存成功')
        } catch (error) {
          console.warn('Failed to save Vuex state after retries:', error)
        } finally {
          isSaving = false
          
          // 如果有挂起的保存请求，立即执行
          if (pendingSave) {
            setTimeout(() => {
              store._subscribers.forEach(sub => sub(mutation, state))
            }, 100)
          }
        }
      }, 1000) // 增加到1秒防抖，减少写入频率
    })
  }
}

// 带重试机制的保存函数
async function saveWithRetry(stateToSave, retries = 3, delay = 100) {
  for (let i = 0; i < retries; i++) {
    try {
      electronStore.set('Book', stateToSave)
      return
    } catch (error) {
      if (i === retries - 1) {
        throw error // 最后一次重试失败，抛出错误
      }
      // 等待一段时间后重试
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)))
    }
  }
}
