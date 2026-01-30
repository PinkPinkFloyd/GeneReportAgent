// client/src/main/server.ts
import { utilityProcess } from 'electron';
import { join } from 'path';
import { is } from '@electron-toolkit/utils';
import tcpPortUsed from 'tcp-port-used';
import * as fs from 'fs'; // 引入 fs,解决竞态问题

const PORT = 3000; // 暂时写死，后面可以做成动态获取空闲端口

export async function startServer(): Promise<void> {
  // 1. 检查端口是否已经被占用了 (避免重复启动)
  const inUse = await tcpPortUsed.check(PORT, '127.0.0.1');
  if (inUse) {
    console.log(`🧠 端口 ${PORT} 已被占用，假设大脑已经在运行。`);
    return;
  }



  // 2. 确定 NestJS 的入口文件路径
  // 开发环境：指向 server 目录的 dist
  // 生产环境：指向资源目录下的 server 文件
  const serverPath = is.dev
    ? join(__dirname, '../../../server/dist/src/main.js')
    : join(process.resourcesPath, 'server/dist/main.js');
  // 新增逻辑：轮询等待文件生成 
  if (!fs.existsSync(serverPath)) {
    console.log('⏳ 大脑(NestJS) 正在编译中，等待 10 秒后重试...');
    setTimeout(startServer, 10000); // 10秒后递归调用自己
    return;
  }
  console.log('🧠 正在启动 AI 大脑...', serverPath);
  // 3. 使用 utilityProcess (Electron 推荐的子进程方式) 启动 Nest
  const apiProcess = utilityProcess.fork(serverPath, [], {
    env: {
      ...process.env,
      SERVER_PORT: PORT.toString(),
      GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || "AIzaSyAHbqFjnvKlwGaUZl-3ayyDEglkZd0FoHo", // 传递 Key
      // 必须把数据库连接传给子进程！
      // 注意：在打包后，你可能需要提供一个设置界面让用户填这个 URL
      // 或者默认连 localhost
      DATABASE_URL: process.env.DATABASE_URL || "mysql://root:Sunsumin37.@192.168.100.155:3306/ai_agent_db"
    },
    stdio: 'pipe', // 管道模式，让我们可以看到日志
  });

  // 4. 将 NestJS 的日志打印到 Electron 的控制台 (方便调试)
  apiProcess.stdout?.on('data', (data) => {
    console.log(`[NestJS]: ${data.toString().trim()}`);
  });
  apiProcess.stderr?.on('data', (data) => {
    console.error(`[NestJS Error]: ${data.toString().trim()}`);
  });

  // 5. 进程退出处理
  apiProcess.on('exit', (code) => {
    console.log(`🧠 大脑已停止，退出码: ${code}`);
  });
}