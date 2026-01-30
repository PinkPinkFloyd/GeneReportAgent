import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

@Injectable()
export class SnpService {
    constructor(private readonly prisma: PrismaService) { }
    // 查询某个用户某个 rsid（最核心）
    async getUserSnpDetail(userId: bigint, rsid: string) {
        // 1. 用户基因型
        const userSnp = await this.prisma.userSnpResult.findUnique({
            where: {
                userId_rsid: {
                    userId,
                    rsid,
                },
            },
        });

        if (!userSnp) {
            return {
                rsid,
                message: "用户在该 SNP 位点无检测结果",
            };
        }

        // 2. SNP 定义
        const definition = await this.prisma.snpDefinition.findUnique({
            where: { rsid },
        });

        // 3. 规则匹配（最重要）
        const rule = await this.prisma.snpRule.findUnique({
            where: {
                rsid_genotype: {
                    rsid,
                    genotype: userSnp.genotype,
                },
            },
        });

        // 4. 研究解释（给 LLM 用）
        const interpretations = await this.prisma.snpInterpretation.findMany({
            where: { rsid },
            orderBy: { evidenceLevel: "desc" },
            take: 3,
        });

        return {
            rsid,
            genotype: userSnp.genotype,
            chromosome: userSnp.chromosome,
            position: userSnp.position,
            gene: definition?.geneSymbol,
            rule,
            interpretations,
        };
    }
    // 批量查询（给 Agent 用）
    async getUserSnpsByCategory(
        userId: bigint,
        category: string,
      ) {
        // 1. 找到该分类下的 SNP
        const interpretations = await this.prisma.snpInterpretation.findMany({
          where: { category },
          select: { rsid: true },
          distinct: ["rsid"],
        });
    
        const rsids = interpretations.map(i => i.rsid);
    
        // 2. 查询用户命中的 SNP
        const userSnps = await this.prisma.userSnpResult.findMany({
          where: {
            userId,
            rsid: { in: rsids },
          },
        });
    
        // 3. 批量规则匹配
        const rules = await this.prisma.snpRule.findMany({
          where: {
            OR: userSnps.map(snp => ({
              rsid: snp.rsid,
              genotype: snp.genotype,
            })),
          },
        });
    
        return userSnps.map(snp => ({
          rsid: snp.rsid,
          genotype: snp.genotype,
          rule: rules.find(
            r => r.rsid === snp.rsid && r.genotype === snp.genotype,
          ),
        }));
      }
    

}