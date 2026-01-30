"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnpService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let SnpService = class SnpService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getUserSnpDetail(userId, rsid) {
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
        const definition = await this.prisma.snpDefinition.findUnique({
            where: { rsid },
        });
        const rule = await this.prisma.snpRule.findUnique({
            where: {
                rsid_genotype: {
                    rsid,
                    genotype: userSnp.genotype,
                },
            },
        });
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
    async getUserSnpsByCategory(userId, category) {
        const interpretations = await this.prisma.snpInterpretation.findMany({
            where: { category },
            select: { rsid: true },
            distinct: ["rsid"],
        });
        const rsids = interpretations.map(i => i.rsid);
        const userSnps = await this.prisma.userSnpResult.findMany({
            where: {
                userId,
                rsid: { in: rsids },
            },
        });
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
            rule: rules.find(r => r.rsid === snp.rsid && r.genotype === snp.genotype),
        }));
    }
};
exports.SnpService = SnpService;
exports.SnpService = SnpService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SnpService);
//# sourceMappingURL=snp.service.js.map