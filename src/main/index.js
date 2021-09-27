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
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    height: 10,
    useContentSize: false,
    width: 500,
    backgroundColor: '#DEE1E6',
    x: 0,
    y: height - 22,
    autoHideMenuBar: true,  // 隐藏菜单栏
    transparent: true,
    closable: false,  // 是否可关闭
    minimizable: false,
    maximizable: false, 
    frame: false, // 无边框
    resizable: false, // 是否可调整大小
    // alwaysOnTop: true,  // 是否永远在别的窗口上面
    // opacity: 0.8,
    webPreferences: {
      devTools: false,  // 是否启动控制台
      defaultFontSize: 13,  // 默认字体大小
    }
  })

  mainWindow.loadURL(winURL)
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
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
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
