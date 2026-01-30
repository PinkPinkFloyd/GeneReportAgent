import { z } from "zod";
export declare const ListDirectoryTool: import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{
    directory: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, {
    directory?: string | undefined;
}, {
    directory?: string | undefined;
}, string, "list_directory">;
export declare const ReadFileTool: import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{
    filePath: z.ZodString;
}, z.core.$strip>, {
    filePath: string;
}, {
    filePath: string;
}, string, "read_file">;
