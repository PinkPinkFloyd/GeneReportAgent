"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppService = void 0;
const common_1 = require("@nestjs/common");
const google_genai_1 = require("@langchain/google-genai");
const prisma_service_1 = require("./prisma.service");
const messages_1 = require("@langchain/core/messages");
const file_tool_1 = require("./tools/file.tool");
const explorer_tool_1 = require("./tools/explorer.tool");
const shell_tool_1 = require("./tools/shell.tool");
const knowledge_tool_1 = require("./tools/knowledge.tool");
const knowledge_service_1 = require("./knowledge/knowledge.service");
const dnaAnalysis_service_1 = require("./dna/dnaAnalysis.service");
const analyzeUserDna_tool_1 = require("./tools/analyzeUserDna.tool");
const openai_1 = require("@langchain/openai");
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const langchain_1 = require("langchain");
let AppService = class AppService {
    prisma;
    knowledgeService;
    dnaAnalysisService;
    model;
    modelB;
    tools;
    constructor(prisma, knowledgeService, dnaAnalysisService) {
        this.prisma = prisma;
        this.knowledgeService = knowledgeService;
        this.dnaAnalysisService = dnaAnalysisService;
        this.model = new google_genai_1.ChatGoogleGenerativeAI({
            apiKey: process.env.GOOGLE_API_KEY,
            model: "gemini-2.0-flash-lite-001",
            temperature: 0,
        });
        this.modelB = new openai_1.ChatOpenAI({
            configuration: {
                baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
            },
            apiKey: process.env.QIANWEN_API_KEY,
            modelName: "qwen-max",
            temperature: 0.1,
        });
        const knowledgeTools = (0, knowledge_tool_1.createKnowledgeTools)(this.knowledgeService);
        const dnaTool = (0, analyzeUserDna_tool_1.createDnaAnalysisTool)(this.dnaAnalysisService);
        this.tools = [
            file_tool_1.WriteFileTool,
            explorer_tool_1.ReadFileTool,
            explorer_tool_1.ListDirectoryTool,
            shell_tool_1.ShellCommandTool,
            ...knowledgeTools,
            dnaTool
        ];
    }
    async chat(userMessage) {
        const desktopPath = path.join(os.homedir(), 'Desktop');
        await this.prisma.conversation.create({
            data: { role: 'user', content: userMessage }
        });
        console.log(`🤖 Agent 收到指令: ${userMessage}`);
        try {
            const agent = (0, langchain_1.createAgent)({
                model: this.modelB,
                tools: this.tools,
            });
            const result = await agent.invoke({
                messages: [
                    new messages_1.SystemMessage(`
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
                    new messages_1.HumanMessage(userMessage)
                ],
            });
            const lastMessage = result.messages[result.messages.length - 1];
            let aiContent = "";
            if (typeof lastMessage.content === 'string') {
                aiContent = lastMessage.content;
            }
            else if (Array.isArray(lastMessage.content)) {
                aiContent = lastMessage.content
                    .map((c) => c.text || '')
                    .join('');
            }
            if (!aiContent || aiContent === '[]') {
                if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
                    const toolNames = lastMessage.tool_calls.map(t => t.name).join(', ');
                    aiContent = `🔧 Agent 正在调用工具: [${toolNames}]...\n(任务正在进行中，请耐心等待或查看后端日志)`;
                }
                else {
                    aiContent = "✅ 任务似乎已完成，但 Agent 没有返回总结信息。";
                }
            }
            await this.prisma.conversation.create({
                data: { role: 'ai', content: aiContent }
            });
            return aiContent;
        }
        catch (error) {
            console.error("❌ Agent 执行出错:", error);
            console.dir(error, { depth: null });
            return `Agent 出错: ${error.message}`;
        }
    }
    async getHistory() {
        return this.prisma.conversation.findMany({
            orderBy: { createdAt: 'asc' }
        });
    }
};
exports.AppService = AppService;
exports.AppService = AppService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        knowledge_service_1.KnowledgeService,
        dnaAnalysis_service_1.DnaAnalysisService])
], AppService);
//# sourceMappingURL=app.service.js.map