"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createKnowledgeTools = void 0;
const zod_1 = require("zod");
const tools_1 = require("@langchain/core/tools");
const createKnowledgeTools = (knowledgeService) => {
    const searchTool = (0, tools_1.tool)(async ({ query }) => {
        console.log(`🧠 [RAG] Agent 正在思考并查询: "${query}"`);
        const result = await knowledgeService.query(query);
        return result || "知识库中未找到相关信息，请尝试换个关键词，或告知用户无法回答。";
    }, {
        name: "search_knowledge_base",
        description: "【核心工具】搜索企业知识库和代码库。当用户询问具体的技术细节、API用法、业务逻辑、或者提到'参考文档'时，必须优先使用此工具。不要猜测，要依据搜索结果回答。",
        schema: zod_1.z.object({
            query: zod_1.z.string().describe("搜索关键词，越具体越好，例如 '用户登录接口参数' 或 '部署流程文档'"),
        }),
    });
    const learnTool = (0, tools_1.tool)(async ({ filePath }) => {
        console.log(`📥 [RAG] Agent 正在学习文件: ${filePath}`);
        return await knowledgeService.addFileToKnowledge(filePath);
    }, {
        name: "add_to_knowledge_base",
        description: "【官方唯一入库通道】将文件（代码、文本、PDF、DNA序列、Word文档等）存入向量数据库。该工具内置了针对不同文件类型（如DNA、代码）的专业切片策略。当用户要求'学习'、'切片'或'存入'文件时，必须调用此工具。",
        schema: zod_1.z.object({
            filePath: zod_1.z.string().describe("文件的绝对路径或相对路径"),
        }),
    });
    return [searchTool, learnTool];
};
exports.createKnowledgeTools = createKnowledgeTools;
//# sourceMappingURL=knowledge.tool.js.map