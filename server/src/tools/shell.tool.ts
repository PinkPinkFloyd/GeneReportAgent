import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { exec } from 'child_process';
import * as path from 'path';

export const ShellCommandTool = tool(
    async ({ command, directory }) => {
        // 1. 确定执行目录：如果 Agent 指定了目录就用指定的，否则默认用项目根目录
        // 注意：这允许 Agent 访问你电脑上的任何位置！
        const targetDir = directory || process.cwd();

        console.log(`💻 正在执行命令: "${command}" (目录: ${targetDir})`);

        return new Promise((resolve) => {
            // 2. 执行命令
            //   使用 PowerShell
            exec(command, { cwd: targetDir, shell: 'powershell.exe' }, (error, stdout, stderr) => {
                // 3. 构造返回结果
                let result = "";
                // PowerShell 的报错通常也在 stderr 里，但也可能在 stdout 里，所以都检查一下
                if (error) {
                    result += `❌ 出错 (Exit Code ${error.code}):\n${stderr || error.message}`;
                } else {
                    // 成功的输出
                    if (stderr) result += `⚠️ 警告:\n${stderr}\n`;
                    result += `✅ 输出:\n${stdout}`;
                }

                // 截断过长的输出，防止 Token 爆炸
                if (result.length > 2000) {
                    result = result.substring(0, 2000) + "\n...(输出过长已截断)...";
                }

                resolve(result);
            });
        });
    },
    {
        name: "execute_shell_command",
        description: "在终端执行命令。环境已配置为 Windows PowerShell，你可以放心地使用 ls, pwd, cat, echo 等通用命令，也可以运行 python, npm。",
        schema: z.object({
            command: z.string().describe("要执行的终端命令，例如 'npm install' 或 'python main.py'"),
            directory: z.string().optional().describe("【可选】命令执行的目录路径。如果不填，默认在项目根目录执行。如果你需要进入某个子文件夹执行，请务必填入完整绝对路径。"),
        }),
    }
);