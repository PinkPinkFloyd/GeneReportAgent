import { PrismaService } from './prisma.service';
import { KnowledgeService } from './knowledge/knowledge.service';
import { DnaAnalysisService } from './dna/dnaAnalysis.service';
export declare class AppService {
    private prisma;
    private knowledgeService;
    private dnaAnalysisService;
    private model;
    private modelB;
    private tools;
    constructor(prisma: PrismaService, knowledgeService: KnowledgeService, dnaAnalysisService: DnaAnalysisService);
    chat(userMessage: string): Promise<string>;
    getHistory(): Promise<{
        id: number;
        createdAt: Date;
        content: string;
        role: string;
    }[]>;
}
