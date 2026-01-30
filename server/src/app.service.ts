import { Injectable  } from '@nestjs/common';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PrismaService } from './prisma.service';
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { WriteFileTool } from './tools/file.tool';
import { ListDirectoryTool, ReadFileTool } from './tools/explorer.tool';
import { ShellCommandTool } from './tools/shell.tool';
import { createKnowledgeTools } from './tools/knowledge.tool'; //知识库相关
import { KnowledgeService } from './knowledge/knowledge.service';//知识库相关
import { DnaAnalysisService } from './dna/dnaAnalysis.service'; //DNA
import { createDnaAnalysisTool } from './tools/analyzeUserDna.tool';
//! 引入千问
import { ChatAlibabaTongyi } from "@langchain/community/chat_models/alibaba_tongyi";
//! 1️⃣ 修改引入：使用 ChatOpenAI
import { ChatOpenAI } from "@langchain/openai";
import * as path from 'path'; // 引入 path 模块
import * as os from 'os'; // 引入 os 模块
// 🎯 核心：直接从 langchain 引入
import { createAgent } from "langchain";
@Injectable()
export class AppService {
  private model: ChatGoogleGenerativeAI;
  //! 千问
  private modelB:ChatOpenAI;
  private tools: any[];

  constructor(
    private prisma: PrismaService,
    private knowledgeService: KnowledgeService,
    private dnaAnalysisService: DnaAnalysisService //注入服务
  ) {
    // 1. 初始化模型
    this.model = new ChatGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_API_KEY,
      model: "gemini-2.0-flash-lite-001",
      temperature: 0,
    });
    // !千问
    this.modelB = new ChatOpenAI({
      // 必须配置项：
      configuration: {
        baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1", // 阿里云官方兼容地址
      },
      apiKey: process.env.QIANWEN_API_KEY, // 依然用你的阿里云 Key
      modelName: "qwen-max", // 模型名称
      temperature: 0.1,
    });
    // 创建知识库
    const knowledgeTools = createKnowledgeTools(this.knowledgeService);
    const dnaTool = createDnaAnalysisTool(this.dnaAnalysisService); // 传入自身实例
    // 2. 装载工具
    this.tools = [
      // LangChain新版推荐写法,不要再写类tool了
      WriteFileTool,
      ReadFileTool,
      ListDirectoryTool,
      ShellCommandTool,
      ...knowledgeTools,
      dnaTool
    ];
  }


  async chat(userMessage: string) {
    // 获取当前电脑的桌面路径，帮 Agent 剩下猜的时间
    const desktopPath = path.join(os.homedir(), 'Desktop');
    // 1. 存数据库
    await this.prisma.conversation.create({
      data: { role: 'user', content: userMessage }
    });

    console.log(`🤖 Agent 收到指令: ${userMessage}`);

    try {
      //修正点：根据index.d.ts 文件
      const agent = createAgent({
        // 参数 1: 模型 (之前的报错说 llm 不存在，所以用 model)
        model: this.modelB as any,

        // 参数 2: 工具
        tools: this.tools,
        // 删除 prompt / systemMessage / instructions,已经不支持这些
      });
      // 3. 执行 Invoke
      // 注意：createAgent 返回的是 ReactAgent，它的 invoke 参数需要 messages 数组
      const result = await agent.invoke({
        messages: [
          // 在这里“注入”人设
          new SystemMessage(`
          你是一位专业的生物信息学遗传咨询专家。你拥有读取用户 DNA 分析报告的能力。

当用户提问时（例如：“我应该怎么吃？”或“我会得老年痴呆吗？”）：
1. **不要**直接凭空回答通用的健康建议。
2. **必须**先调用 search_genetic_dna 工具，查询用户的基因数据。
3. **综合分析（关键步骤）**：
   - 拿到的数据可能是零散的（比如 rs123 说你代谢慢，rs456 说你吸收好）。
   - 你需要像医生一样，把这些冲突或相关的信息**串联**起来。
   - 举例：如果发现用户有 APOE e4（阿兹海默风险）且有叶酸代谢障碍基因，你应该建议他“重点补充叶酸和B12以保护神经系统”，而不仅仅是报数据。

4. **回答风格**：
   - 先给出结论（风险高/中/低）。
   - 再列出科学依据（“检测到 rsXXXX 呈 AA 型...”）。
   - 最后给出高度定制化的生活/饮食建议。

⚠️ 必须附带免责声明：本结果仅供参考，不作为临床诊断依据。
        `),

          // 用户的消息紧随其后
          new HumanMessage(userMessage)
        ],
      },
        // 核心修改：传入配置对象，增加递归限制,这个治标不治本
        // {
        //   recursionLimit: 50, // 把它改成 50 或 100
        // }
      );

      // === 第四步：智能解析结果 (修复 {"reply":"[]"} 问题) ===
      // ReactAgent 的结果通常包含 structuredResponse 或 messages
      // 我们尝试获取最后一条消息的内容
      const lastMessage = result.messages[result.messages.length - 1];
      let aiContent = "";

      // 情况 1: 普通文本回复
      if (typeof lastMessage.content === 'string') {
        aiContent = lastMessage.content;
      }
      // 情况 2: 多模态回复 (数组形式)
      else if (Array.isArray(lastMessage.content)) {
        // 提取数组里的文本部分
        aiContent = lastMessage.content
          .map((c: any) => c.text || '')
          .join('');
      }

      // 🚨 核心修复：如果内容是空的，检查是不是在调用工具
      if (!aiContent || aiContent === '[]') {
        // @ts-ignore (忽略类型检查，确保能读到 tool_calls)
        if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
          // @ts-ignore
          const toolNames = lastMessage.tool_calls.map(t => t.name).join(', ');
          // 手动生成一句回复，告诉用户发生了什么
          aiContent = `🔧 Agent 正在调用工具: [${toolNames}]...\n(任务正在进行中，请耐心等待或查看后端日志)`;
        } else {
          // 兜底：既没说话也没调工具
          aiContent = "✅ 任务似乎已完成，但 Agent 没有返回总结信息。";
        }
      }

      // 5. 存数据库
      await this.prisma.conversation.create({
        data: { role: 'ai', content: aiContent }
      });

      return aiContent;

    } catch (error) {
      console.error("❌ Agent 执行出错:", error);
      // 打印完整的错误对象以便调试
      console.dir(error, { depth: null });
      return `Agent 出错: ${error.message}`;
    }
  }

  async getHistory() {
    return this.prisma.conversation.findMany({
      orderBy: { createdAt: 'asc' }
    });
  }
}