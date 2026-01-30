import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod"; 
import { DnaAnalysisService } from "../dna/dnaAnalysis.service";

/**
 * 将分析功能封装为 Agent 可调用的工具
 */

// 有多个参数,有副作用（写数据库 / 写向量库）,不能靠模糊字符串,不能用普通的tools方法
export const createDnaAnalysisTool = (dnaAnalysisService: DnaAnalysisService) => {
  return new DynamicStructuredTool({
    name: "analyze_dna_file",
    description: "当用户提供 DNA 文件路径（如 .txt 或 .vcf）并要求分析、提取或解析基因信息时使用。该工具会解析文件、匹配 SNP 并将结果存入向量数据库。",
    
    schema: z.object({
      filePath: z.string().describe("DNA 文件的绝对路径"),
      userId: z.number().describe("当前用户的 ID"),
    }),
    func: async ({ filePath, userId }) => {
      try {
        
        const result = await dnaAnalysisService.analyzeUserDna(filePath, userId);
        
        // 工具必须返回字符串给 Agent
        return JSON.stringify(result);
      } catch (error) {
        return `分析失败: ${error.message}`;
      }
    },
  });
};
// 查询向量库
export const createRetrievalTool = (dnaAnalysisService: DnaAnalysisService) => {
  return new DynamicStructuredTool({
    name: "search_genetic_dna",
    description: "当用户询问关于由于自身基因导致的健康风险、体质特征、营养建议时，必须使用此工具。它会从用户的 DNA 分析报告中检索相关信息。",
    schema: z.object({
      query: z.string().describe("关于基因或健康的自然语言查询，例如 '我容易胖吗' 或 '阿兹海默症风险'"),
      userId: z.number().describe("当前用户ID"),
    }),
    func: async ({ query, userId }) => {
      // 调用 DnaAnalysisService 去 Chroma 查
      const results = await dnaAnalysisService.searchVectorStore(query, userId);
      if (!results || results.length === 0) {
        return "在用户的基因报告中未找到相关风险描述。";
      }
      return JSON.stringify(results);
    },
  });
};