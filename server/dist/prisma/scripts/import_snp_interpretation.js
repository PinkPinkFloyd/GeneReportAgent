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
    console.log(`📥 读取 ${facts.length} 条 SNP 解释`);
    for (const f of facts) {
        if (!f.rsid)
            continue;
        const interpretationText = [
            `影响：${f.effect}`,
            f.notes ? `补充说明：${f.notes}` : '',
            f.evidence ? `证据来源：${f.evidence}` : '',
        ].filter(Boolean).join('\n');
        await _prisma_1.prisma.snpInterpretation.create({
            data: {
                rsid: f.rsid,
                category: f.trait ?? null,
                interpretation: interpretationText,
                source: f.evidence ?? null,
                evidenceLevel: 'medium',
            },
        });
    }
    console.log('✅ SNP 解释表入库完成');
    await _prisma_1.prisma.$disconnect();
}
run().catch(console.error);
//# sourceMappingURL=import_snp_interpretation.js.map