// 知识库服务
import { Injectable, Logger } from '@nestjs/common';
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { Embeddings } from "@langchain/core/embeddings";
// import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";// 弃用
import { Qwen3Embeddings } from "../embeddings/qwen3.embeddings";
import {
  RecursiveCharacterTextSplitter,
  //   MarkdownHeaderTextSplitter 
} from "@langchain/textsplitters";
import type { SupportedTextSplitterLanguages } from "@langchain/textsplitters";
// 新增：Word 文档加载器
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { Document } from "@langchain/core/documents";
import * as fs from 'fs';
import * as path from 'path';
type CodeLang = (typeof SupportedTextSplitterLanguages)[number];
@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);
  private vectorStore: Chroma;
  private embeddings: Embeddings;

  private readonly COLLECTION_NAME = "agent_codebase";

  constructor() {
    // 确保 Qwen3Embeddings 内部 fetch 使用 Keep-Alive
    // Qwen3Embeddings确保传给 fetch 的 agent 是 keepAlive: true
    // 初始化
    this.embeddings = new Qwen3Embeddings(
      `${process.env.EMBEDDINGS_URL}/embeddings` // Mac IP
    );
  }
  //   初始化向量存储
  async initVectorStore() {
    this.vectorStore = await Chroma.fromExistingCollection(
      this.embeddings,
      {
        collectionName: this.COLLECTION_NAME,
        url: process.env.CHROMA_URL,
      }
    );
  }

  /**
   * 全能文件入库：支持 Code, Markdown, Word, Text
   * 新增特性：
   * 1. 过滤空切片 (防止 Chroma 报错)
   * 2. 分批入库 (防止 Google API 超时或 Rate Limit)
   * 3. 详细进度日志
   */
  async addFileToKnowledge(filePath: string) {
    if (!fs.existsSync(filePath)) return `❌ 文件不存在: ${filePath}`;
    // 确保连接
    if (!this.vectorStore) await this.initVectorStore();

    const fileName = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();

    let docs: Document[] = [];
    let processingInfo = "";

    try {
      this.logger.log(`⏳ 开始读取文件: ${fileName}`);
      // =================================================
      // 策略 1: Word 文档 (.docx)
      // =================================================
      if (ext === '.docx') {
        // Word 是二进制，必须用 Loader 加载，不能直接 readFileSync
        const loader = new DocxLoader(filePath);
        const rawDocs = await loader.load(); // 加载出来通常是整篇或按页

        // Word 文档通常文字较多，用递归字符切割器
        const splitter = new RecursiveCharacterTextSplitter({
          chunkSize: 1000,
          chunkOverlap: 100,
        });

        docs = await splitter.splitDocuments(rawDocs);
        processingInfo = "Word 解析模式";

        // 补全元数据
        docs.forEach(doc => {
          doc.metadata = { ...doc.metadata, source: filePath, fileName, type: 'docx' };
        });
      }

      // =================================================
      // 策略 3: 代码文件 (.ts, .js, .py ...)
      // =================================================
      else if (this.isCodeFile(ext)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lang = this.getCodeLang(ext);

        const splitter = RecursiveCharacterTextSplitter.fromLanguage(lang, {
          chunkSize: 2000, // 代码块上下文要大
          chunkOverlap: 200,
        });

        docs = await splitter.createDocuments([content]);
        processingInfo = `代码结构模式 (${lang})`;

        docs.forEach(doc => {
          doc.metadata = { ...doc.metadata, source: filePath, fileName, type: 'code', lang };
        });
      }

      // =================================================
      // 策略 4: 普通文本/兜底 (.txt, .env, etc)
      // =================================================
      else {
        const content = fs.readFileSync(filePath, 'utf-8');

        const splitter = new RecursiveCharacterTextSplitter({
          chunkSize: 1000,
          chunkOverlap: 100,
        });

        docs = await splitter.createDocuments([content]);
        processingInfo = "纯文本模式";

        docs.forEach(doc => {
          doc.metadata = { ...doc.metadata, source: filePath, fileName, type: 'text' };
        });
      }
      if (docs.length === 0) return "⚠️ 无有效数据";
      // 异步后台跑
      this.runBatchIngestionFast(docs, fileName).catch(e => {
        this.logger.error(`❌ 任务终止: ${e.message}`);
      });
      return `✅ ${fileName} 极速入库已启动！\n📊 片段数: ${docs.length}\n🚀 预计速度: 30-50 片/秒`;
    } catch (error) {
      this.logger.error(`❌ 处理文件失败: ${filePath}`, error);
      return `❌ 入库失败 (${fileName}): ${error.message}`;
    }
  }

  /**
    * 并发入库 (流水线模式)
    * 针对 M4 芯片优化：高并发，小批次
    */
  private async runBatchIngestionFast(docs: Document[], fileName: string) {
    const startTime = Date.now();

    // 🔥 参数调优 (M4 16GB 黄金参数)
    // 1. 并发数: 同时有 5 个请求在飞 (占满 Python 的空闲时间)
    const CONCURRENCY = 2;
    // 2. 批次大小: 每次发 128 条 (配合 Python 端的 batch_size=16 刚好是 8 倍)
    // 小包传输更快，不容易超时
    const BATCH_SIZE = 64;

    // 将 docs 切分成小批次 (Chunks)
    const chunks: Document[][] = [];
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      chunks.push(docs.slice(i, i + BATCH_SIZE));
    }

    this.logger.log(`🏁 [极速流水线] 启动: 总批次 ${chunks.length} | 并发 ${CONCURRENCY}`);

    let completedChunks = 0;
    let completedDocs = 0;

    // 核心逻辑: 任务池 (Worker Pool)
    // 这种写法保证永远有 CONCURRENCY 个任务在跑，而不是跑完一组等下一组
    const runWorker = async () => {
      while (chunks.length > 0) {
        // 取出一个任务
        const batch = chunks.shift();
        if (!batch) break;

        try {
          // 发送请求
          await this.vectorStore.addDocuments(batch);

          // 统计
          completedChunks++;
          completedDocs += batch.length;

          // 进度日志 (每完成 5 个批次打印一次，减少刷屏)
          if (completedChunks % 5 === 0) {
            const duration = (Date.now() - startTime) / 1000;
            const speed = (completedDocs / duration).toFixed(1); // 计算瞬时速度
            const percent = ((completedDocs / docs.length) * 100).toFixed(1);
            this.logger.log(`   🚀 速度: ${speed} 片/秒 | 进度: ${percent}%`);
          }

        } catch (e) {
          this.logger.error(`   ❌ 批次失败: ${e.message}`);
          // 失败了就不重试了，保证整体速度，实际生产可以加重试队列
        }
      }
    };

    // 启动 5 个并发 (Worker)
    const workers: any = [];
    for (let i = 0; i < CONCURRENCY; i++) {
      workers.push(runWorker());
    }

    // 等待所有工人下班
    await Promise.all(workers);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    this.logger.log(`🎉 [任务完成] ${fileName} 全部入库！\n⏱️ 总耗时: ${totalTime}秒\n⚡️ 平均速度: ${(docs.length / parseFloat(totalTime)).toFixed(1)} 片/秒`);
  }
  /**
   * 辅助工具：检索
   */
  async query(question: string, k = 3) {
    if (!this.vectorStore) await this.initVectorStore();
    const results = await this.vectorStore.similaritySearch(question, k);
    if (!results.length) return null;
    return results.map(res =>
      `📄 [${res.metadata.type?.toUpperCase() || 'DOC'}] ${res.metadata.fileName}\n------------------------\n${res.pageContent}`
    ).join('\n\n');
  }

  // 辅助函数：判断是否为代码
  private isCodeFile(ext: string): boolean {
    return ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.html', '.css', '.php', '.cpp', '.c', '.vue'].includes(ext);
  }

  // 辅助函数：获取对应的语言枚举
  private getCodeLang(ext: string): CodeLang {
    const map: Record<string, CodeLang> = {
      '.js': 'js', '.jsx': 'js', '.ts': 'js', '.tsx': 'js', '.vue': 'js',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.html': 'html',
      '.php': 'php',
      '.cpp': 'cpp', '.c': 'cpp',
    };
    return map[ext] || 'js'; // 默认 fallback
  }
}