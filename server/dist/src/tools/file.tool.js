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
exports.WriteFileTool = void 0;
const zod_1 = require("zod");
const tools_1 = require("@langchain/core/tools");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
exports.WriteFileTool = (0, tools_1.tool)(async ({ filePath, content }) => {
    try {
        const fullPath = path.resolve(filePath);
        console.log(`📝 [WriteFile] 正在写入: ${fullPath}`);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(fullPath, content, 'utf-8');
        return `✅ 文件写入成功: ${fullPath}`;
    }
    catch (error) {
        return `❌ 写入失败: ${error.message}`;
    }
}, {
    name: "write_file",
    description: "在文件系统的任意位置创建或修改文件。如果是创建新项目，请确保路径正确。",
    schema: zod_1.z.object({
        filePath: zod_1.z.string().describe("完整的文件路径（绝对路径或相对路径）。例如: 'D:/code/test.py' 或 'package.json'"),
        content: zod_1.z.string().describe("要写入文件的完整内容"),
    }),
});
//# sourceMappingURL=file.tool.js.map