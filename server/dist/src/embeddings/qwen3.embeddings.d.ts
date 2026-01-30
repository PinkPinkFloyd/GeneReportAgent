import { Embeddings } from "@langchain/core/embeddings";
export declare class Qwen3Embeddings extends Embeddings {
    private readonly endpoint;
    private readonly client;
    constructor(endpoint: string);
    embedDocuments(texts: string[]): Promise<number[][]>;
    embedQuery(text: string): Promise<number[]>;
}
