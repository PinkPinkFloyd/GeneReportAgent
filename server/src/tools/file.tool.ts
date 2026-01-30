import { z } from "zod";
import { tool } from "@langchain/core/tools";
import * as fs from 'fs';
import * as path from 'path';

// 🔥 新版函数式写法：不需要 class，不需要 extends
export const WriteFileTool = tool(
  async ({ filePath, content }) => {
    try {
      // 解析路径（支持绝对路径，解除 workspace 限制）
      const fullPath = path.resolve(filePath);
      
      console.log(`📝 [WriteFile] 正在写入: ${fullPath}`);

      // 自动递归创建父目录
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // 写入文件
      fs.writeFileSync(fullPath, content, 'utf-8');
      
      return `✅ 文件写入成功: ${fullPath}`;
    } catch (error) {
      return `❌ 写入失败: ${error.message}`;
    }
  },
  {
    name: "write_file",
    description: "在文件系统的任意位置创建或修改文件。如果是创建新项目，请确保路径正确。",
    schema: z.object({
      filePath: z.string().describe("完整的文件路径（绝对路径或相对路径）。例如: 'D:/code/test.py' 或 'package.json'"),
      content: z.string().describe("要写入文件的完整内容"),
    }),
  }
);