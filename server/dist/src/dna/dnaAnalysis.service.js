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
var DnaAnalysisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DnaAnalysisService = void 0;
const fs = __importStar(require("fs"));
const readline = __importStar(require("readline"));
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const chroma_1 = require("@langchain/community/vectorstores/chroma");
const qwen3_embeddings_1 = require("../embeddings/qwen3.embeddings");
const documents_1 = require("@langchain/core/documents");
let DnaAnalysisService = DnaAnalysisService_1 = class DnaAnalysisService {
    prisma;
    vectorStore;
    embeddings;
    logger = new common_1.Logger(DnaAnalysisService_1.name);
    COLLECTION_NAME = "agent_codebase";
    BATCH_SIZE = 1000;
    constructor(prisma) {
        this.prisma = prisma;
        this.embeddings = new qwen3_embeddings_1.Qwen3Embeddings("http://192.168.100.246:8000/embeddings");
    }
    async initVectorStore() {
        if (this.vectorStore)
            return;
        this.vectorStore = await chroma_1.Chroma.fromExistingCollection(this.embeddings, {
            collectionName: this.COLLECTION_NAME,
            url: process.env.CHROMA_URL || "http://localhost:8000",
        });
    }
    async searchVectorStore(query, userId) {
        await this.initVectorStore();
        const results = await this.vectorStore.similaritySearch(query, 5, {
            userId: userId
        });
        return results.map(doc => doc.pageContent).join("\n\n");
    }
    async analyzeUserDna(filePath, userId) {
        try {
            this.logger.log(`🧬 [Step 0] 开始分析 DNA 文件: ${filePath} (userId=${userId})`);
            const matchCount = await this.processFileInBatches(filePath, userId);
            this.logger.log(`✅ [Step 1-3] DNA 分析入库完成，共命中并存储规则 ${matchCount} 条`);
            if (matchCount > 0) {
                await this.vectorizeUserResults(userId);
            }
            return {
                status: 'success',
                message: `DNA 分析完成，命中 ${matchCount} 条规则，并已生成 AI 知识库`,
                matchCount
            };
        }
        catch (error) {
            this.logger.error(`❌ DNA 分析失败: ${error.message}`, error.stack);
            throw error;
        }
    }
    async processFileInBatches(filePath, userId) {
        if (!fs.existsSync(filePath))
            throw new Error('DNA 文件不存在');
        const fileStream = fs.createReadStream(filePath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity,
        });
        let buffer = [];
        let totalMatches = 0;
        for await (const line of rl) {
            if (!line.trim() || line.startsWith('#'))
                continue;
            const snp = this.parseDnaLine(line);
            if (snp)
                buffer.push(snp);
            if (buffer.length >= this.BATCH_SIZE) {
                totalMatches += await this.processBatch(userId, buffer);
                buffer = [];
            }
        }
        if (buffer.length > 0) {
            totalMatches += await this.processBatch(userId, buffer);
        }
        return totalMatches;
    }
    async processBatch(userId, snps) {
        if (snps.length === 0)
            return 0;
        const rsids = snps.map(s => s.rsid);
        const definedSnps = await this.prisma.snpDefinition.findMany({
            where: { rsid: { in: rsids } },
            select: { rsid: true }
        });
        const validRsidSet = new Set(definedSnps.map(d => d.rsid));
        const validSnps = snps.filter(s => validRsidSet.has(s.rsid));
        if (validSnps.length === 0)
            return 0;
        const validRsidsForRules = validSnps.map(s => s.rsid);
        const rules = await this.prisma.snpRule.findMany({
            where: { rsid: { in: validRsidsForRules } }
        });
        const hits = [];
        for (const snp of validSnps) {
            const matchedRule = rules.find(r => r.rsid === snp.rsid && r.genotype === snp.genotype);
            if (matchedRule) {
                hits.push(snp);
            }
        }
        if (hits.length === 0)
            return 0;
        const dataToInsert = hits.map(hit => ({
            userId: BigInt(userId),
            rsid: hit.rsid,
            chromosome: hit.chromosome,
            position: hit.position,
            genotype: hit.genotype,
            quality: 1.0
        }));
        await this.prisma.userSnpResult.createMany({
            data: dataToInsert,
            skipDuplicates: true
        });
        return hits.length;
    }
    async vectorizeUserResults(userId) {
        await this.initVectorStore();
        const userResults = await this.prisma.userSnpResult.findMany({
            where: { userId: BigInt(userId) }
        });
        if (userResults.length === 0)
            return;
        const rsids = userResults.map(u => u.rsid);
        const [rules, interpretations] = await Promise.all([
            this.prisma.snpRule.findMany({ where: { rsid: { in: rsids } } }),
            this.prisma.snpInterpretation.findMany({ where: { rsid: { in: rsids } } })
        ]);
        const documents = [];
        for (const result of userResults) {
            const rule = rules.find(r => r.rsid === result.rsid && r.genotype === result.genotype);
            const interpretation = interpretations.find(i => i.rsid === result.rsid);
            if (!rule)
                continue;
            const content = `
            【基因分析报告】
            - 用户ID: ${userId}
            - 位点: ${result.rsid}
            - 基因型: ${result.genotype}
            - 分析结论: ${rule.conclusion}
            - 风险建议: ${rule.recommendation || '暂无具体建议'}
            - 科学背景: ${interpretation?.interpretation || '暂无详细科学背景'}
            - 证据等级: ${interpretation?.evidenceLevel || 'low'}
            `.trim();
            documents.push(new documents_1.Document({
                pageContent: content,
                metadata: {
                    userId: userId,
                    rsid: result.rsid,
                    type: 'dna_analysis',
                    genotype: result.genotype
                }
            }));
        }
        if (documents.length > 0) {
            await this.vectorStore.addDocuments(documents);
            this.logger.log(`🧬 [Step 4] 已将 ${documents.length} 条分析数据存入 Chroma 向量库`);
        }
    }
    parseDnaLine(line) {
        const trimmed = line.trim();
        if (!trimmed)
            return null;
        const parts = trimmed.split(/\s+/);
        if (parts.length < 4)
            return null;
        const rsid = parts[0];
        const chromosome = parts[1];
        const position = parseInt(parts[2], 10);
        const genotype = parts[3].trim();
        if (rsid.startsWith('#') || rsid.toLowerCase() === 'rsid')
            return null;
        if (genotype === '--' || genotype === '__')
            return null;
        if (rsid.length < 2)
            return null;
        if (isNaN(position))
            return null;
        return { rsid, chromosome, position, genotype };
    }
};
exports.DnaAnalysisService = DnaAnalysisService;
exports.DnaAnalysisService = DnaAnalysisService = DnaAnalysisService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DnaAnalysisService);
//# sourceMappingURL=dnaAnalysis.service.js.map