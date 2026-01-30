export declare function parseDnaLine(line: string): {
    rsid: string;
    genotype: string;
} | null;
export declare function matchSnpRules(snp: {
    rsid: string;
    genotype: string;
}): Promise<any[]>;
