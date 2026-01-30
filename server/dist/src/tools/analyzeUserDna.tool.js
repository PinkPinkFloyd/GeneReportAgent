"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRetrievalTool = exports.createDnaAnalysisTool = void 0;
const tools_1 = require("@langchain/core/tools");
const zod_1 = require("zod");
const createDnaAnalysisTool = (dnaAnalysisService) => {
    return new tools_1.DynamicStructuredTool({
        name: "analyze_dna_file",
        description: "当用户提供 DNA 文件路径（如 .txt 或 .vcf）并要求分析、提取或解析基因信息时使用。该工具会解析文件、匹配 SNP 并将结果存入向量数据库。",
        schema: zod_1.z.object({
            filePath: zod_1.z.string().describe("DNA 文件的绝对路径"),
            userId: zod_1.z.number().describe("当前用户的 ID"),
        }),
        func: async ({ filePath, userId }) => {
            try {
                const result = await dnaAnalysisService.analyzeUserDna(filePath, userId);
                return JSON.stringify(result);
            }
            catch (error) {
                return `分析失败: ${error.message}`;
            }
        },
    });
};
exports.createDnaAnalysisTool = createDnaAnalysisTool;
const createRetrievalTool = (dnaAnalysisService) => {
    return new tools_1.DynamicStructuredTool({
        name: "search_genetic_dna",
        description: "当用户询问关于由于自身基因导致的健康风险、体质特征、营养建议时，必须使用此工具。它会从用户的 DNA 分析报告中检索相关信息。",
        schema: zod_1.z.object({
            query: zod_1.z.string().describe("关于基因或健康的自然语言查询，例如 '我容易胖吗' 或 '阿兹海默症风险'"),
            userId: zod_1.z.number().describe("当前用户ID"),
        }),
        func: async ({ query, userId }) => {
            const results = await dnaAnalysisService.searchVectorStore(query, userId);
            if (!results || results.length === 0) {
                return "在用户的基因报告中未找到相关风险描述。";
            }
            return JSON.stringify(results);
        },
    });
};
exports.createRetrievalTool = createRetrievalTool;
//# sourceMappingURL=analyzeUserDna.tool.js.map