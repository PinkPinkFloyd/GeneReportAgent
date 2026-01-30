"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const _prisma_1 = require("./_prisma");
async function run() {
    const filePath = path_1.default.resolve(__dirname, '../../static/snp_facts.json');
    const raw = JSON.parse(fs_1.default.readFileSync(filePath, 'utf-8'));
    const facts = raw.facts;
    console.log(`📥 读取 ${facts.length} 条 SNP 规则`);
    for (const f of facts) {
        if (!f.rsid || !f.genotype)
            continue;
        await _prisma_1.prisma.snpRule.upsert({
            where: {
                rsid_genotype: {
                    rsid: f.rsid,
                    genotype: f.genotype,
                },
            },
            update: {
                conclusion: f.effect,
                confidence: f.riskLevel ?? 'medium',
                recommendation: f.notes ?? null,
            },
            create: {
                rsid: f.rsid,
                genotype: f.genotype,
                conclusion: f.effect,
                confidence: f.riskLevel ?? 'medium',
                recommendation: f.notes ?? null,
            },
        });
    }
    console.log('✅ SNP 规则表入库完成');
    await _prisma_1.prisma.$disconnect();
}
run().catch(console.error);
//# sourceMappingURL=import_snp_rules.js.map