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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var KnowledgeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeService = void 0;
const common_1 = require("@nestjs/common");
const chroma_1 = require("@langchain/community/vectorstores/chroma");
const qwen3_embeddings_1 = require("../embeddings/qwen3.embeddings");
const textsplitters_1 = require("@langchain/textsplitters");
const docx_1 = require("@langchain/community/document_loaders/fs/docx");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let KnowledgeService = KnowledgeService_1 = class KnowledgeService {
    logger = new common_1.Logger(KnowledgeService_1.name);
    vectorStore;
    embeddings;
    COLLECTION_NAME = "agent_codebase";
    constructor() {
        this.embeddings = new qwen3_embeddings_1.Qwen3Embeddings(`${process.env.EMBEDDINGS_URL}/embeddings`);
    }
    async initVectorStore() {
        this.vectorStore = await chroma_1.Chroma.fromExistingCollection(this.embeddings, {
            collectionName: this.COLLECTION_NAME,
            url: process.env.CHROMA_URL,
        });
    }
    async addFileToKnowledge(filePath) {
        if (!fs.existsSync(filePath))
            return `❌ 文件不存在: ${filePath}`;
        if (!this.vectorStore)
            await this.initVectorStore();
        const fileName = path.basename(filePath);
        const ext = path.extname(filePath).toLowerCase();
        let docs = [];
        let processingInfo = "";
        try {
            this.logger.log(`⏳ 开始读取文件: ${fileName}`);
            if (ext === '.docx') {
                const loader = new docx_1.DocxLoader(filePath);
                const rawDocs = await loader.load();
                const splitter = new textsplitters_1.RecursiveCharacterTextSplitter({
                    chunkSize: 1000,
                    chunkOverlap: 100,
                });
                docs = await splitter.splitDocuments(rawDocs);
                processingInfo = "Word 解析模式";
                docs.forEach(doc => {
                    doc.metadata = { ...doc.metadata, source: filePath, fileName, type: 'docx' };
                });
            }
            else if (this.isCodeFile(ext)) {
                const content = fs.readFileSync(filePath, 'utf-8');
                const lang = this.getCodeLang(ext);
                const splitter = textsplitters_1.RecursiveCharacterTextSplitter.fromLanguage(lang, {
                    chunkSize: 2000,
                    chunkOverlap: 200,
                });
                docs = await splitter.createDocuments([content]);
                processingInfo = `代码结构模式 (${lang})`;
                docs.forEach(doc => {
                    doc.metadata = { ...doc.metadata, source: filePath, fileName, type: 'code', lang };
                });
            }
            else {
                const content = fs.readFileSync(filePath, 'utf-8');
                const splitter = new textsplitters_1.RecursiveCharacterTextSplitter({
                    chunkSize: 1000,
                    chunkOverlap: 100,
                });
                docs = await splitter.createDocuments([content]);
                processingInfo = "纯文本模式";
                docs.forEach(doc => {
                    doc.metadata = { ...doc.metadata, source: filePath, fileName, type: 'text' };
                });
            }
            if (docs.length === 0)
                return "⚠️ 无有效数据";
            this.runBatchIngestionFast(docs, fileName).catch(e => {
                this.logger.error(`❌ 任务终止: ${e.message}`);
            });
            return `✅ ${fileName} 极速入库已启动！\n📊 片段数: ${docs.length}\n🚀 预计速度: 30-50 片/秒`;
        }
        catch (error) {
            this.logger.error(`❌ 处理文件失败: ${filePath}`, error);
            return `❌ 入库失败 (${fileName}): ${error.message}`;
        }
    }
    async runBatchIngestionFast(docs, fileName) {
        const startTime = Date.now();
        const CONCURRENCY = 2;
        const BATCH_SIZE = 64;
        const chunks = [];
        for (let i = 0; i < docs.length; i += BATCH_SIZE) {
            chunks.push(docs.slice(i, i + BATCH_SIZE));
        }
        this.logger.log(`🏁 [极速流水线] 启动: 总批次 ${chunks.length} | 并发 ${CONCURRENCY}`);
        let completedChunks = 0;
        let completedDocs = 0;
        const runWorker = async () => {
            while (chunks.length > 0) {
                const batch = chunks.shift();
                if (!batch)
                    break;
                try {
                    await this.vectorStore.addDocuments(batch);
                    completedChunks++;
                    completedDocs += batch.length;
                    if (completedChunks % 5 === 0) {
                        const duration = (Date.now() - startTime) / 1000;
                        const speed = (completedDocs / duration).toFixed(1);
                        const percent = ((completedDocs / docs.length) * 100).toFixed(1);
                        this.logger.log(`   🚀 速度: ${speed} 片/秒 | 进度: ${percent}%`);
                    }
                }
                catch (e) {
                    this.logger.error(`   ❌ 批次失败: ${e.message}`);
                }
            }
        };
        const workers = [];
        for (let i = 0; i < CONCURRENCY; i++) {
            workers.push(runWorker());
        }
        await Promise.all(workers);
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
        this.logger.log(`🎉 [任务完成] ${fileName} 全部入库！\n⏱️ 总耗时: ${totalTime}秒\n⚡️ 平均速度: ${(docs.length / parseFloat(totalTime)).toFixed(1)} 片/秒`);
    }
    async query(question, k = 3) {
        if (!this.vectorStore)
            await this.initVectorStore();
        const results = await this.vectorStore.similaritySearch(question, k);
        if (!results.length)
            return null;
        return results.map(res => `📄 [${res.metadata.type?.toUpperCase() || 'DOC'}] ${res.metadata.fileName}\n------------------------\n${res.pageContent}`).join('\n\n');
    }
    isCodeFile(ext) {
        return ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.html', '.css', '.php', '.cpp', '.c', '.vue'].includes(ext);
    }
    getCodeLang(ext) {
        const map = {
            '.js': 'js', '.jsx': 'js', '.ts': 'js', '.tsx': 'js', '.vue': 'js',
            '.py': 'python',
            '.java': 'java',
            '.go': 'go',
            '.html': 'html',
            '.php': 'php',
            '.cpp': 'cpp', '.c': 'cpp',
        };
        return map[ext] || 'js';
    }
};
exports.KnowledgeService = KnowledgeService;
exports.KnowledgeService = KnowledgeService = KnowledgeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], KnowledgeService);
//# sourceMappingURL=knowledge.service.js.map