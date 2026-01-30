import { z } from "zod";
import { KnowledgeService } from "../knowledge/knowledge.service";
export declare const createKnowledgeTools: (knowledgeService: KnowledgeService) => (import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{
    query: z.ZodString;
}, z.core.$strip>, {
    query: string;
}, {
    query: string;
}, string, "search_knowledge_base"> | import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{
    filePath: z.ZodString;
}, z.core.$strip>, {
    filePath: string;
}, {
    filePath: string;
}, string, "add_to_knowledge_base">)[];
