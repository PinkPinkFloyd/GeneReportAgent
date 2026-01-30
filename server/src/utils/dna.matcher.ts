// src/utils/dna.matcher.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 解析一行 DNA.txt
 * 格式示例: rs12345	A/T
 */
export function parseDnaLine(line: string): { rsid: string; genotype: string } | null {
  const parts = line.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const rsid = parts[0];
  const genotype = parts[1].replace(/\|/g, ''); // A|T → AT
  if (!rsid || !genotype) return null;
  return { rsid, genotype };
}

/**
 * 根据数据库 SnpRule 匹配规则
 */
export async function matchSnpRules(snp: { rsid: string; genotype: string }): Promise<any[]> {
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
