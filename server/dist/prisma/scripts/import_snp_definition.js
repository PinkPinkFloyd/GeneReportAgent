"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const prisma = new client_1.PrismaClient();
async function main() {
    const factsPath = path_1.default.join(__dirname, "../../static/snp_facts.json");
    const csvPath = path_1.default.join(__dirname, "../../static/snp_rule_base.csv");
    const factsRaw = fs_1.default.readFileSync(factsPath, "utf-8");
    const factsData = JSON.parse(factsRaw);
    const allowedRsids = new Set(factsData.facts.map((f) => f.rsid));
    console.log(`⚡ 总规则 rsid 数量: ${allowedRsids.size}`);
    const filteredRows = [];
    fs_1.default.createReadStream(csvPath)
        .pipe((0, csv_parser_1.default)())
        .on("data", (row) => {
        if (!row.rsid || !allowedRsids.has(row.rsid))
            return;
        const referenceAllele = row.ref?.substring(0, 20) || null;
        const alternateAllele = row.alt?.substring(0, 255) || null;
        filteredRows.push({
            rsid: row.rsid,
            chromosome: row.chromosome,
            position: parseInt(row.position),
            referenceAllele,
            alternateAllele,
            geneSymbol: row.geneSymbol || null,
            description: row.description || null,
        });
    })
        .on("end", async () => {
        console.log(`✅ 过滤后 SNP 数量: ${filteredRows.length}`);
        const BATCH_SIZE = 50;
        for (let i = 0; i < filteredRows.length; i += BATCH_SIZE) {
            const batch = filteredRows.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(async (row) => {
                try {
                    await prisma.snpDefinition.upsert({
                        where: { rsid: row.rsid },
                        update: row,
                        create: row,
                    });
                }
                catch (err) {
                    console.error(`❌ rsid ${row.rsid} 入库失败: ${err.message}`);
                }
            }));
            console.log(`📦 已处理: ${i + batch.length}/${filteredRows.length}`);
        }
        console.log("🎉 SNP 公共定义入库完成！");
        await prisma.$disconnect();
    });
}
main().catch((err) => {
    console.error(err);
    prisma.$disconnect();
});
//# sourceMappingURL=import_snp_definition.js.map