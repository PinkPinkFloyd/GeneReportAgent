import { z } from "zod";
export declare const WriteFileTool: import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{
    filePath: z.ZodString;
    content: z.ZodString;
}, z.core.$strip>, {
    filePath: string;
    content: string;
}, {
    filePath: string;
    content: string;
}, string, "write_file">;
