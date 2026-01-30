import { ipcMain, dialog } from 'electron'
export function registerDialogOpenIpc() {
    ipcMain.handle('dialog:open', async (_event, type: 'file' | 'folder') => {
        const result = await dialog.showOpenDialog({
            properties: [
                type === 'file' ? 'openFile' : 'openDirectory', // 根据参数决定选文件还是选文件夹
                'showHiddenFiles' // 可选：显示隐藏文件
            ]
        })
        // 如果用户取消了，result.canceled 为 true
        if (result.canceled) {
            return null
        } else {
            // 返回选择的第一个路径
            return result.filePaths[0]
        }
    })
}