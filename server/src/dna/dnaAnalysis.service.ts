import * as fs from 'fs';
import * as readline from 'readline';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { Qwen3Embeddings } from "../embeddings/qwen3.embeddings";
import { Embeddings } from "@langchain/core/embeddings";
import { Document } from "@langchain/core/documents";

// 定义解析后的中间结构
interface ParsedSnp {
    rsid: string;
    chromosome: string;
    position: number;
    genotype: string;
}

@Injectable()
export class DnaAnalysisService {
    private vectorStore: Chroma;
    private embeddings: Embeddings;
    private readonly logger = new Logger(DnaAnalysisService.name);
    private readonly COLLECTION_NAME = "agent_codebase";
    
    // 批处理大小：平衡内存占用与数据库IO
    private readonly BATCH_SIZE = 1000;

    constructor(
        private prisma: PrismaService
    ) {
        console.log('初始化 Embedding 服务======>',process.env);
        // 初始化 Embedding 服务
        // 确保你的 Qwen3Embeddings 服务地址是正确的
        this.embeddings = new Qwen3Embeddings(
            `${process.env.EMBEDDINGS_URL}/embeddings`
        );
    }

    /**
     * 初始化向量存储连接
     */
    async initVectorStore() {
        if (this.vectorStore) return;
        this.vectorStore = await Chroma.fromExistingCollection(
            this.embeddings,
            {
                collectionName: this.COLLECTION_NAME,
                url: process.env.CHROMA_URL,
            }
        );
    }
    // 查询向量库方法
    async searchVectorStore(query: string, userId: number) {
        await this.initVectorStore();
        // 语义搜索：找最相似的 5 条记录
        const results = await this.vectorStore.similaritySearch(query, 5, {
            userId: userId // 确保只搜这个人的（metadata 过滤）
        });
        return results.map(doc => doc.pageContent).join("\n\n");
    }
    /**
     * 总入口：分析 DNA -> 存库 -> 向量化
     * analyzeUserDna.tool.ts调用
     */
    async analyzeUserDna(filePath: string, userId: number) {
        try {
            this.logger.log(`🧬 [Step 0] 开始分析 DNA 文件: ${filePath} (userId=${userId})`);

            // 1. 流式处理文件，分批进行 过滤 -> 规则匹配 -> 入库
            const matchCount = await this.processFileInBatches(filePath, userId);
            
            this.logger.log(`✅ [Step 1-3] DNA 分析入库完成，共命中并存储规则 ${matchCount} 条`);

            // 2. 针对刚刚入库的数据，生成向量并存入 Chroma
            if (matchCount > 0) {
                await this.vectorizeUserResults(userId);
            }

            return {
                status: 'success',
                message: `DNA 分析完成，命中 ${matchCount} 条规则，并已生成 AI 知识库`,
                matchCount
            };

        } catch (error) {
            this.logger.error(`❌ DNA 分析失败: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * 核心流程：分批读取文件，减少内存占用
     */
    private async processFileInBatches(filePath: string, userId: number): Promise<number> {
        if (!fs.existsSync(filePath)) throw new Error('DNA 文件不存在');

        const fileStream = fs.createReadStream(filePath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity,
        });

        let buffer: ParsedSnp[] = [];
        let totalMatches = 0;

        for await (const line of rl) {
            // 基础过滤：跳过空行和注释
            if (!line.trim() || line.startsWith('#')) continue;

            const snp = this.parseDnaLine(line);
            if (snp) buffer.push(snp);

            // 当缓冲区达到批次大小时，执行处理
            if (buffer.length >= this.BATCH_SIZE) {
                totalMatches += await this.processBatch(userId, buffer);
                buffer = []; // 清空缓冲区
            }
        }

        // 处理剩余的数据
        if (buffer.length > 0) {
            totalMatches += await this.processBatch(userId, buffer);
        }

        return totalMatches;
    }

    /**
     * 批次处理逻辑：Step 1 (定义筛选) -> Step 2 (规则匹配) -> Step 3 (结果入库)
     */
    private async processBatch(userId: number, snps: ParsedSnp[]): Promise<number> {
        if (snps.length === 0) return 0;

        const rsids = snps.map(s => s.rsid);

        // --- Step 1: 匹配 SNP 公共定义表 (筛选出有效的 RSID) ---
        // 这一步是为了过滤掉那些系统里根本没记录的杂项 SNP，保证数据质量
        const definedSnps = await this.prisma.snpDefinition.findMany({
            where: { rsid: { in: rsids } },
            select: { rsid: true }
        });
        
        const validRsidSet = new Set(definedSnps.map(d => d.rsid));
        
        // 🚨 生产环境建议开启此过滤。
        // 如果你的 SnpDefinition 表数据不全，可以暂时注释掉下面这行，直接用 const validSnps = snps;
        const validSnps = snps.filter(s => validRsidSet.has(s.rsid));

        if (validSnps.length === 0) return 0;

        // --- Step 2: 匹配 SNP 规则表 (SnpRule) ---
        // 查找这些 RSID 是否有对应的规则（同时匹配 genotype）
        const validRsidsForRules = validSnps.map(s => s.rsid);
        const rules = await this.prisma.snpRule.findMany({
            where: { rsid: { in: validRsidsForRules } }
        });

        const hits: ParsedSnp[] = [];

        for (const snp of validSnps) {
            // 在规则列表中寻找匹配：RSID 相同 且 Genotype 相同
            const matchedRule = rules.find(r => r.rsid === snp.rsid && r.genotype === snp.genotype);
            if (matchedRule) {
                hits.push(snp);
            }
        }

        if (hits.length === 0) return 0;

        // --- Step 3: 存入 UserSnpResult 表 ---
        // 使用 createMany 提高写入性能，skipDuplicates 防止重复
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

    /**
     * Step 4: 向量化处理
     * 查询 UserSnpResult + SnpInterpretation + SnpRule，生成文档存入 RAG
     */
    private async vectorizeUserResults(userId: number) {
        await this.initVectorStore();

        // 查用户结果
        const userResults = await this.prisma.userSnpResult.findMany({
            where: { userId: BigInt(userId) }
        });

        if (userResults.length === 0) return;

        const rsids = userResults.map(u => u.rsid);

        // 查规则结论 (SnpRule) & 百科解释 (SnpInterpretation)
        const [rules, interpretations] = await Promise.all([
            this.prisma.snpRule.findMany({ where: { rsid: { in: rsids } } }),
            this.prisma.snpInterpretation.findMany({ where: { rsid: { in: rsids } } })
        ]);

        const documents: Document[] = [];

        for (const result of userResults) {
            const rule = rules.find(r => r.rsid === result.rsid && r.genotype === result.genotype);
            const interpretation = interpretations.find(i => i.rsid === result.rsid);

            if (!rule) continue;

            // --- 🤖 构建 AI 自然语言片段 ---
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

            documents.push(new Document({
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

    // --- 工具方法 ---

    /**
     * 生产级 DNA 行解析器
     * 兼容 Tab/空格，移除不合理限制，增强健壮性
     */
    private parseDnaLine(line: string): ParsedSnp | null {
        const trimmed = line.trim();
        if (!trimmed) return null;

        // 使用正则兼容 Tab (\t) 和多个空格
        const parts = trimmed.split(/\s+/);

        if (parts.length < 4) return null;

        const rsid = parts[0];
        const chromosome = parts[1];
        const position = parseInt(parts[2], 10);
        const genotype = parts[3].trim(); // 再次 trim 确保无隐形字符

        // 1. 过滤标题行
        if (rsid.startsWith('#') || rsid.toLowerCase() === 'rsid') return null;

        // 2. 过滤无效检测 (--)
        if (genotype === '--' || genotype === '__') return null;

        // 3. 基础长度校验 (允许 rs, ws, kgp 等开头)
        if (rsid.length < 2) return null;

        // 4. Position 校验
        if (isNaN(position)) return null;

        return { rsid, chromosome, position, genotype };
    }
}