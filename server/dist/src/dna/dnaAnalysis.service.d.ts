import { PrismaService } from '../prisma.service';
export declare class DnaAnalysisService {
    private prisma;
    private vectorStore;
    private embeddings;
    private readonly logger;
    private readonly COLLECTION_NAME;
    private readonly BATCH_SIZE;
    constructor(prisma: PrismaService);
    initVectorStore(): Promise<void>;
    searchVectorStore(query: string, userId: number): Promise<string>;
    analyzeUserDna(filePath: string, userId: number): Promise<{
        status: string;
        message: string;
        matchCount: number;
    }>;
    private processFileInBatches;
    private processBatch;
    private vectorizeUserResults;
    private parseDnaLine;
}
