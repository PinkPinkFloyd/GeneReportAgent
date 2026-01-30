"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDnaLine = parseDnaLine;
exports.matchSnpRules = matchSnpRules;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
function parseDnaLine(line) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2)
        return null;
    const rsid = parts[0];
    const genotype = parts[1].replace(/\|/g, '');
    if (!rsid || !genotype)
        return null;
    return { rsid, genotype };
}
async function matchSnpRules(snp) {
    const rules = await prisma.snpRule.findMany({
        where: { rsid: snp.rsid, genotype: snp.genotype }
    });
    return rules.map(r => ({
        rsid: snp.rsid,
        genotype: snp.genotype,
        ruleId: Number(r.id),
        confidence: r.confidence
    }));
}
//# sourceMappingURL=dna.matcher.js.map