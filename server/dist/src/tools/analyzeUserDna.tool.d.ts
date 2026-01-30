import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { DnaAnalysisService } from "../dna/dnaAnalysis.service";
export declare const createDnaAnalysisTool: (dnaAnalysisService: DnaAnalysisService) => DynamicStructuredTool<z.ZodObject<{
    filePath: z.ZodString;
    userId: z.ZodNumber;
}, z.core.$strip>, {
    filePath: string;
    userId: number;
}, {
    filePath: string;
    userId: number;
}, string, "analyze_dna_file">;
export declare const createRetrievalTool: (dnaAnalysisService: DnaAnalysisService) => DynamicStructuredTool<z.ZodObject<{
    query: z.ZodString;
    userId: z.ZodNumber;
}, z.core.$strip>, {
    query: string;
    userId: number;
}, {
    query: string;
    userId: number;
}, string, "search_genetic_dna">;
