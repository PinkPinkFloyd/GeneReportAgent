import axios, { AxiosInstance } from "axios";
import { Embeddings } from "@langchain/core/embeddings";
import * as http from 'http'; // 🔥 引入 http 模块

export class Qwen3Embeddings extends Embeddings {
  private readonly client: AxiosInstance;

  constructor(
    private readonly endpoint: string,
  ) {
    super({});

    // 🔥 核心优化: 创建一个持久化的 HTTP Agent
    // 这相当于在 NestJS 和 Python 之间拉了一条"光纤专线"
    // 不再需要每次请求都打电话(握手)，而是保持通话状态
    const agent = new http.Agent({
      keepAlive: true,        // 开启长连接
      keepAliveMsecs: 1000,   // 空闲 1 秒后才断开
      maxSockets: Infinity,   // 允许无限并发 (受限于系统 fd)
      maxFreeSockets: 10,     // 预留 10 个空闲插座
    });

    // 初始化 Axios 实例，复用上面的 agent
    this.client = axios.create({
      httpAgent: agent,
      // 显式设置超时，防止 Python 卡死导致 NestJS 无限等待
      timeout: 300000, // 2分钟超时 (给 Python 留足计算时间)
      headers: {
        'Content-Type': 'application/json',
        // 显式告诉服务器我们要长连接
        'Connection': 'keep-alive' 
      }
    });
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    try {
      // ✅ 使用持久化的 this.client 发送请求
      const res = await this.client.post(this.endpoint, {
        texts,
      });

      // 简单的数据校验，防止 Python 报错导致这里崩掉
      if (!res.data || !res.data.data) {
         throw new Error("Invalid response from Embedding Server");
      }

      return res.data.data;
    } catch (error) {
      // 打印简略错误，避免把整个 huge payload 打印出来
      console.error(`❌ Embedding Error: ${error.message}`);
      throw error;
    }
  }

  async embedQuery(text: string): Promise<number[]> {
    try {
      const res = await this.client.post(this.endpoint, {
        texts: [text],
      });
      return res.data.data[0];
    } catch (error) {
      console.error(`❌ Query Embedding Error: ${error.message}`);
      throw error;
    }
  }
}