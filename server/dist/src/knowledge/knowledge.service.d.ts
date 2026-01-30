export declare class KnowledgeService {
    private readonly logger;
    private vectorStore;
    private embeddings;
    private readonly COLLECTION_NAME;
    constructor();
    initVectorStore(): Promise<void>;
    addFileToKnowledge(filePath: string): Promise<string>;
    private runBatchIngestionFast;
    query(question: string, k?: number): Promise<string | null>;
    private isCodeFile;
    private getCodeLang;
}
