import { ipcMain } from 'electron'
import { chatWithAgent } from '../services/chatService'

export function registerChatIpc() {
  ipcMain.handle('chat', async (_event, content: string) => {
    console.log('主线程已获取', content)

    try {
      return await chatWithAgent(content)
    } catch {
      return 'Agent 暂时无法连接后端服务。'
    }
  })
}
