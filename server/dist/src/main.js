"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const express_1 = require("express");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((0, express_1.json)({ limit: '50mb' }));
    app.use((0, express_1.urlencoded)({ extended: true, limit: '50mb' }));
    app.enableCors();
    const port = process.env.SERVER_PORT || 3000;
    await app.listen(port);
    console.log(`🧠 AI Brain is running on port ${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map