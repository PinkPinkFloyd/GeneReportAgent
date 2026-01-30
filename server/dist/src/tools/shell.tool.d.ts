import { z } from "zod";
export declare const ShellCommandTool: import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{
    command: z.ZodString;
    directory: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, {
    command: string;
    directory?: string | undefined;
}, {
    command: string;
    directory?: string | undefined;
}, unknown, "execute_shell_command">;
