import { contextBridge,ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
//! 暴露给前端的 API
// const api = {
//   getUser: (id) => ipcRenderer.invoke('get-user', id)
// }
//! 前端就能用：window.api.getUser(1)
// 自定义接口的地方
const api = {
  // 定义 chat，前端才能调用 window.api.chat
  chat: (message) => ipcRenderer.invoke('chat', message),
  selectPath: (type: 'file' | 'folder') => ipcRenderer.invoke('dialog:open', type),
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electronAPI = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
