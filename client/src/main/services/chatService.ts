export async function chatWithAgent(content: string) {
    try {
      const response = await fetch('http://localhost:3000/agent/chat', {
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
  