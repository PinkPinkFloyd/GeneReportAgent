import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// 解除 NestJS 请求体大小限制 1. 引入 json 和 urlencoded
import { json, urlencoded } from 'express';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // 2. 设置请求体大小限制为 50MB (根据需要调整)
  // 基因报告、大文档通常会有几 MB，给大一点保险
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  // 允许跨域，因为 Vue (renderer) 和 Nest (localhost) 算跨域
  app.enableCors();
  // 获取环境变量里的端口，如果没有则默认 3000
  const port = process.env.SERVER_PORT || 3000;
  await app.listen(port);
  console.log(`🧠 AI Brain is running on port ${port}`);
}
bootstrap();
