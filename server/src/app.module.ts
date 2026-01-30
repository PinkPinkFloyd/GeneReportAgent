import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service'; // 导入
import {KnowledgeService} from './knowledge/knowledge.service'; // 导入
import {DnaAnalysisService} from './dna/dnaAnalysis.service'; // 导入
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 让 .env 全局生效
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService, // 注册
    KnowledgeService,
    DnaAnalysisService
  ],
})
export class AppModule {}
