
const BASE_URL = process.env.API_BASE_URL;
if (!BASE_URL) {
  throw new Error('API_BASE_URL 未配置');
}
export async function chatWithAgent(content: string) {
    try {
      const response = await fetch(`${BASE_URL}/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content })
      })
  
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
  
      return await response.text()
    } catch (error) {
      console.error('[chatService] 请求失败:', error)
      throw error
    }
  }
  