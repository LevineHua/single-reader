/*
 * @Description: 
 * @Author: 华松林
 * @Date: 2021-09-24 16:56:34
 * @LastEditors: 华松林
 * @LastEditTime: 2021-09-27 11:10:38
 * @FilePath: \single-reader\src\main\index.js
 */
import { app, BrowserWindow, screen, ipcMain } from 'electron'
import '../renderer/store'

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let mainWindow
const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`

function createWindow () {
  // 获取屏幕高度
  const { height } = screen.getPrimaryDisplay().workAreaSize
  
  // 默认窗口设置
  const defaultWidth = 324 // 38 * 8 + 20 = 324
  const defaultHeight = 15
  const defaultLineSize = 21
  
  // 初始化窗口时使用默认值
  let windowWidth = defaultWidth
  let windowHeight = defaultHeight
  
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    height: windowHeight,
    useContentSize: false,
    width: windowWidth,
    backgroundColor: '#DEE1E6',
    x: 0,
    y: height - 22,
    autoHideMenuBar: true,  // 隐藏菜单栏
    transparent: true,
    closable: false,  // 是否可关闭
    minimizable: false,
    maximizable: false, 
    frame: false, // 无边框
    resizable: false, // 不可调整大小
    // alwaysOnTop: true,  // 是否永远在别的窗口上面
    // opacity: 0.8,
    webPreferences: {
      devTools: false,  // 是否启动控制台
      defaultFontSize: 13,  // 默认字体大小
    }
  })

  mainWindow.loadURL(winURL)
  
  // 当页面加载完成后，通过IPC获取保存的设置并调整窗口大小
  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow.webContents.send('request-window-settings')
  })
  
  mainWindow.on('closed', () => {
    mainWindow = null
    app.quit()
  })
}

app.on('ready', createWindow)

// app.on('window-all-closed', () => {
//   if (process.platform !== 'darwin') {
//     app.quit()
//   }
// })

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

// 监听窗口设置更新
ipcMain.on('update-window-settings', (event, settings) => {
  if (mainWindow) {
    // 确保宽度和高度是数字类型
    const width = parseInt(settings.width, 10)
    const height = parseInt(settings.height, 10)
    
    // 验证数值范围
    const validWidth = Math.max(200, Math.min(800, width))
    const validHeight = Math.max(15, Math.min(50, height))
    
    // 重新定位窗口到屏幕底部
    const { height: screenHeight } = screen.getPrimaryDisplay().workAreaSize
    const newY = screenHeight - validHeight - 7
    
    // 使用setBounds方法一次性设置位置和大小，这个方法更可靠
    mainWindow.setBounds({
      x: 0,
      y: newY,
      width: validWidth,
      height: validHeight
    })
    
    // 强制刷新窗口以确保大小变化生效
    mainWindow.setResizable(true)
    mainWindow.setResizable(false)
    
    // 再次确保窗口位置正确
    mainWindow.setBounds({
      x: 0,
      y: newY,
      width: validWidth,
      height: validHeight
    })
  }
})

// 监听窗口位置移动
ipcMain.on('move-window', (event, position) => {
  if (mainWindow) {
    const { x, y } = position
    mainWindow.setPosition(x, y)
  }
})

// 定义菜单窗体
let menuWindow
function openMenuWindow () {
  menuWindow = new BrowserWindow({
    title: '菜单栏',
    height: 350,
    useContentSize: false,
    width: 600,
    backgroundColor: '#fff',
    autoHideMenuBar: true,  // 隐藏菜单栏
    // transparent: true,
    // minimizable: false,
    maximizable: false, 
    // frame: false, // 无边框
    resizable: false, // 是否可调整大小
    // alwaysOnTop: true,  // 是否永远在别的窗口上面
    // opacity: 0.8,
    webPreferences: {
      devTools: false,  // 是否启动控制台
      defaultFontSize: 13,  // 默认字体大小
    }
  })

  menuWindow.loadURL(`${winURL}#/menu`)
  menuWindow.on('closed', () => {
    menuWindow = null
  })
}
ipcMain.on('openMenuWindow', e => {
  if (!menuWindow) {
    openMenuWindow()
  }
})
ipcMain.on('closeMenuWindow', e => {
  menuWindow = null
})

/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */

/*
import { autoUpdater } from 'electron-updater'

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})

app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
})
 */
