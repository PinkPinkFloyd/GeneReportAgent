"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReadFileTool = exports.ListDirectoryTool = void 0;
const zod_1 = require("zod");
const tools_1 = require("@langchain/core/tools");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
exports.ListDirectoryTool = (0, tools_1.tool)(async ({ directory }) => {
    try {
        const targetDir = directory ? path.resolve(directory) : process.cwd();
        if (!fs.existsSync(targetDir))
            return `❌ 目录不存在: ${targetDir}`;
        const files = fs.readdirSync(targetDir);
        const filteredFiles = files.filter(f => f !== '.git' && f !== 'node_modules');
        return files.length > 0
            ? `📂 目录 [${targetDir}] 内容:\n${filteredFiles.join(', ')}`
            : "目录为空。";
    }
    catch (error) {
        return `读取目录失败: ${error.message}`;
    }
}, {
    name: "list_directory",
    description: "查看指定文件夹下的所有文件。当你不知道文件在哪里，或者需要检查生成结果时使用。",
    schema: zod_1.z.object({
        directory: zod_1.z.string().optional().describe("要查看的目录路径（绝对路径）。如果不填，默认查看项目根目录。"),
    }),
});
exports.ReadFileTool = (0, tools_1.tool)(async ({ filePath }) => {
    try {
        const fullPath = path.resolve(filePath);
        if (!fs.existsSync(fullPath))
            return `❌ 错误: 文件 ${fullPath} 不存在。`;
        const stats = fs.statSync(fullPath);
        if (stats.size > 1024 * 1024)
            return "❌ 文件过大 (>1MB)，拒绝读取。";
        const content = fs.readFileSync(fullPath, 'utf-8');
        return content;
    }
    catch (error) {
        return `❌ 读取文件失败: ${error.message}`;
    }
}, {
    name: "read_file",
    description: "读取某个文件的具体代码内容。支持读取系统任意位置的文本文件。",
    schema: zod_1.z.object({
        filePath: zod_1.z.string().describe("要读取的完整文件路径，例如 'C:/Users/Desktop/log.txt'"),
    }),
});
//# sourceMappingURL=explorer.tool.js.map