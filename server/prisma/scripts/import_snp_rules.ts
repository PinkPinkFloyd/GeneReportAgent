// SNP 规则层入库（snp_facts.json → SnpRule）
// 规则层的本质
// “当 rsid + genotype 命中时，给出结论” 不是全文，不是解释。
import fs from 'fs';
import path from 'path';
import { prisma } from './_prisma';

type Fact = {
  rsid: string;
  genotype: string;
  effect: string;
  riskLevel?: string;
  notes?: string;
};

async function run() {
  const filePath = path.resolve(__dirname, '../../static/snp_facts.json');
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  const facts: Fact[] = raw.facts;
  console.log(`📥 读取 ${facts.length} 条 SNP 规则`);

  for (const f of facts) {
    if (!f.rsid || !f.genotype) continue;

    await prisma.snpRule.upsert({
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
  await prisma.$disconnect();
}

run().catch(console.error);
