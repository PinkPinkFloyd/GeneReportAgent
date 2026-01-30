// SNP 解释层入库（→ Chroma 的前置）
// 给人看的、给 LLM 用的、允许模糊的
import fs from 'fs';
import path from 'path';
import { prisma } from './_prisma';

type Fact = {
  rsid: string;
  trait?: string;
  effect: string;
  evidence?: string;
  notes?: string;
};

async function run() {
  const filePath = path.resolve(__dirname, '../../static/snp_facts.json');
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  const facts: Fact[] = raw.facts;
  console.log(`📥 读取 ${facts.length} 条 SNP 解释`);

  for (const f of facts) {
    if (!f.rsid) continue;

    const interpretationText = [
      `影响：${f.effect}`,
      f.notes ? `补充说明：${f.notes}` : '',
      f.evidence ? `证据来源：${f.evidence}` : '',
    ].filter(Boolean).join('\n');

    await prisma.snpInterpretation.create({
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
  await prisma.$disconnect();
}

run().catch(console.error);
