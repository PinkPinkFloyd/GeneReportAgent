"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShellCommandTool = void 0;
const zod_1 = require("zod");
const tools_1 = require("@langchain/core/tools");
const child_process_1 = require("child_process");
exports.ShellCommandTool = (0, tools_1.tool)(async ({ command, directory }) => {
    const targetDir = directory || process.cwd();
    console.log(`💻 正在执行命令: "${command}" (目录: ${targetDir})`);
    return new Promise((resolve) => {
        (0, child_process_1.exec)(command, { cwd: targetDir, shell: 'powershell.exe' }, (error, stdout, stderr) => {
            let result = "";
            if (error) {
                result += `❌ 出错 (Exit Code ${error.code}):\n${stderr || error.message}`;
            }
            else {
                if (stderr)
                    result += `⚠️ 警告:\n${stderr}\n`;
                result += `✅ 输出:\n${stdout}`;
            }
            if (result.length > 2000) {
                result = result.substring(0, 2000) + "\n...(输出过长已截断)...";
            }
            resolve(result);
        });
    });
}, {
    name: "execute_shell_command",
    description: "在终端执行命令。环境已配置为 Windows PowerShell，你可以放心地使用 ls, pwd, cat, echo 等通用命令，也可以运行 python, npm。",
    schema: zod_1.z.object({
        command: zod_1.z.string().describe("要执行的终端命令，例如 'npm install' 或 'python main.py'"),
        directory: zod_1.z.string().optional().describe("【可选】命令执行的目录路径。如果不填，默认在项目根目录执行。如果你需要进入某个子文件夹执行，请务必填入完整绝对路径。"),
    }),
});
//# sourceMappingURL=shell.tool.js.map