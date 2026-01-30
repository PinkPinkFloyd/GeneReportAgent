import { z } from "zod";
import { tool } from "@langchain/core/tools";
import * as fs from 'fs';
import * as path from 'path';


// 工具 1: 列出目录文件
export const ListDirectoryTool = tool(
    async ({ directory }) => {
        try {
            // 🔥 解锁核心：如果不传，默认看当前根目录；如果传了，看指定目录
            const targetDir = directory ? path.resolve(directory) : process.cwd();
            if (!fs.existsSync(targetDir)) return `❌ 目录不存在: ${targetDir}`;
            const files = fs.readdirSync(targetDir);
            // 简单过滤一下，不显示 .git 和 node_modules 这种巨大的文件夹内容，防止 Token 爆炸
            const filteredFiles = files.filter(f => f !== '.git' && f !== 'node_modules');
            return files.length > 0
                ? `📂 目录 [${targetDir}] 内容:\n${filteredFiles.join(', ')}`
                : "目录为空。";
        } catch (error) {
            return `读取目录失败: ${error.message}`;
        }
    },
    {
        name: "list_directory",
        description: "查看指定文件夹下的所有文件。当你不知道文件在哪里，或者需要检查生成结果时使用。",
        schema: z.object({
            directory: z.string().optional().describe("要查看的目录路径（绝对路径）。如果不填，默认查看项目根目录。"),
          }), 
    }
);

// 工具 2: 读取任意文件的内容
export const ReadFileTool = tool(
    async ({ filePath }) => {
      try {
        // 🔥 解锁核心：直接读取绝对路径
        const fullPath = path.resolve(filePath);
        
        if (!fs.existsSync(fullPath)) return `❌ 错误: 文件 ${fullPath} 不存在。`;
        
        // 增加一个大小限制，防止读取巨大的二进制文件导致内存崩溃
        const stats = fs.statSync(fullPath);
        if (stats.size > 1024 * 1024) return "❌ 文件过大 (>1MB)，拒绝读取。";
  
        const content = fs.readFileSync(fullPath, 'utf-8');
        return content;
      } catch (error) {
        return `❌ 读取文件失败: ${error.message}`;
      }
    },
    {
      name: "read_file",
      description: "读取某个文件的具体代码内容。支持读取系统任意位置的文本文件。",
      schema: z.object({
        filePath: z.string().describe("要读取的完整文件路径，例如 'C:/Users/Desktop/log.txt'"),
      }),
    }
  );