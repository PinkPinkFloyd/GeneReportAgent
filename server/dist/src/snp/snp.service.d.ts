import { PrismaService } from "../prisma.service";
export declare class SnpService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getUserSnpDetail(userId: bigint, rsid: string): Promise<{
        rsid: string;
        message: string;
        genotype?: undefined;
        chromosome?: undefined;
        position?: undefined;
        gene?: undefined;
        rule?: undefined;
        interpretations?: undefined;
    } | {
        rsid: string;
        genotype: string;
        chromosome: string;
        position: number;
        gene: string | null | undefined;
        rule: {
            id: bigint;
            rsid: string;
            createdAt: Date;
            genotype: string;
            conclusion: string;
            confidence: string;
            recommendation: string | null;
        } | null;
        interpretations: {
            id: bigint;
            rsid: string;
            createdAt: Date;
            category: string | null;
            interpretation: string;
            population: string | null;
            evidenceLevel: string;
            source: string | null;
        }[];
        message?: undefined;
    }>;
    getUserSnpsByCategory(userId: bigint, category: string): Promise<{
        rsid: string;
        genotype: string;
        rule: {
            id: bigint;
            rsid: string;
            createdAt: Date;
            genotype: string;
            conclusion: string;
            confidence: string;
            recommendation: string | null;
        } | undefined;
    }[]>;
}
