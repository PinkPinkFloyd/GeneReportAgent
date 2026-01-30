// SNP 定义层/生物事实层 入库脚本 因为数据量有124w条，截取跟snp_facts.json中的rsid匹配，然后入库
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import csvParser from "csv-parser";

const prisma = new PrismaClient();

async function main() {
  const factsPath = path.join(__dirname, "../../static/snp_facts.json");
  const csvPath = path.join(__dirname, "../../static/snp_rule_base.csv");

  // 1️⃣ 读取规则集 rsid
  const factsRaw = fs.readFileSync(factsPath, "utf-8");
  const factsData = JSON.parse(factsRaw);
  const allowedRsids = new Set(factsData.facts.map((f: any) => f.rsid));

  console.log(`⚡ 总规则 rsid 数量: ${allowedRsids.size}`);

  // 2️⃣ 读取 CSV 并过滤
  const filteredRows: any[] = [];

  fs.createReadStream(csvPath)
    .pipe(csvParser())
    .on("data", (row: any) => {
      if (!row.rsid || !allowedRsids.has(row.rsid)) return;

      // 修剪长度，防止 Prisma 报错
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

      // 3️⃣ 批量 upsert
      const BATCH_SIZE = 50;
      for (let i = 0; i < filteredRows.length; i += BATCH_SIZE) {
        const batch = filteredRows.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async (row) => {
            try {
              await prisma.snpDefinition.upsert({
                where: { rsid: row.rsid },
                update: row,
                create: row,
              });
            } catch (err: any) {
              console.error(`❌ rsid ${row.rsid} 入库失败: ${err.message}`);
            }
          })
        );
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
