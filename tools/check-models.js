import 'dotenv/config'
// check-models.js
// 运行方法: node check-models.js

// 1. 尝试从环境变量获取 Key，如果没有则手动填入
const API_KEY = process.env.GOOGLE_API_KEY;
console.log(process.env);

if (!API_KEY || API_KEY.startsWith("你的")) {
  console.error("❌ 错误: 请先在脚本中填入有效的 GOOGLE_API_KEY，或者设置环境变量。");
  process.exit(1);
}

console.log("🔍 正在连接 Google AI Studio 检查账号状态...");

async function checkAccount() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`请求失败: ${data.error?.message || response.statusText}`);
    }

    console.log("\n✅ API Key 验证成功！你的账号状态正常。");
    console.log("---------------------------------------------------");
    
    // 过滤出核心模型
    const models = data.models?.filter(m => m.name.includes('gemini'));
    
    if (models && models.length > 0) {
      console.log(`📦 你当前可用的 Gemini 模型 (${models.length} 个):`);
      models.forEach(model => {
        // 简单美化输出
        const name = model.name.replace('models/', '');
        console.log(` - 🟢 ${name.padEnd(25)} | 版本: ${model.version}`);
      });
    } else {
      console.log("⚠️ 验证通过，但未找到 gemini 系列模型 (可能是权限问题)。");
    }

    console.log("---------------------------------------------------");
    console.log("📊 关于配额 (Quota) 的说明：");
    console.log("Google API 不提供查询'剩余次数'的接口，但通常限制如下 (免费版)：");
    console.log("");
    console.log("🚀 Gemini 1.5 Flash (你正在用的):");
    console.log("   • RPM (每分钟请求):  15 次 (主要瓶颈)");
    console.log("   • TPM (每分钟Token): 100 万");
    console.log("   • RPD (每天请求):    1,500 次");
    console.log("");
    console.log("🚀 Gemini 1.5 Pro:");
    console.log("   • RPM (每分钟请求):  2 次 (非常严格)");
    console.log("   • TPM (每分钟Token): 32,000");
    console.log("   • RPD (每天请求):    50 次");
    console.log("");
    console.log("💡 提示: 如果遇到 429 Resource Exhausted 错误，说明触发了 RPM 限制。");
    console.log("🔗 查看实时用量: https://aistudio.google.com/app/plan_information");

  } catch (error) {
    console.error("\n❌ 连接失败:", error.message);
    console.log("👉 请检查：");
    console.log("1. 你的 API Key 是否正确？");
    console.log("2. 你是否开启了 VPN？(Google API 在国内无法直连)");
  }
}

checkAccount();