// 主进程入口，放在最上面
import 'dotenv/config';
import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
// 引入自定义ipc
import { registerChatIpc } from './ipc/chat'
import { registerDialogOpenIpc } from './ipc/dialogOpen'
// 导入server启动器，子进程启动 NestJS
import { startServer } from './server'
function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      // 1. 指定 preload 文件路径（服务员在哪里）
      preload: join(__dirname, '../preload/index.js'),
      // 2. 开启隔离（装上防弹玻璃），默认就是 true，显式写出来
      contextIsolation: true,
      // 3. 禁用 Node 集成（禁止顾客进后厨），默认也是 false
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  console.log('[ENV] API_BASE_URL =', process.env.API_BASE_URL)
  // Set app user model id for windows
  // 1️⃣ 系统 & Electron 层准备
  electronApp.setAppUserModelId('com.electron')
  // 2️⃣ IPC 注册（越早越好）
  registerChatIpc();
  registerDialogOpenIpc();
  // IPC test
  ipcMain.on('ping', () => console.log('pong'))
  // 在创建窗口前，先启动后端
  await startServer();
  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })



  createWindow()
  // macOS 特有逻辑
  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
