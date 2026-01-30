// 匹配rsid_list和00-common_all.vcf，生成 snp_rule_base.csv
const fs = require("fs");
const readline = require("readline");
const path = require("path");

// ===== 配置 =====
const RSID_FILE = path.resolve(__dirname, "rsid_list.txt");
const VCF_FILE = path.resolve(__dirname, "00-common_all.vcf");
const OUTPUT_FILE = path.resolve(__dirname, "snp_rule_base.csv");

// ===== Step 1: 加载 rsid 到 Set =====
console.log("📥 加载 rsid 列表...");
const rsidSet = new Set(
  fs.readFileSync(RSID_FILE, "utf-8")
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
);

console.log(`✅ rsid 数量: ${rsidSet.size}`);

// ===== Step 2: 创建输出流 =====
const output = fs.createWriteStream(OUTPUT_FILE);
output.write("rsid,chromosome,position,ref,alt\n");

// ===== Step 3: 流式读取 VCF =====
console.log("🔍 开始扫描 VCF...");

let scanned = 0;
let matched = 0;

const rl = readline.createInterface({
  input: fs.createReadStream(VCF_FILE),
  crlfDelay: Infinity,
});

rl.on("line", line => {
  // 跳过注释行
  if (line.startsWith("#")) return;

  scanned++;

  // VCF 标准列
  // CHROM POS ID REF ALT QUAL FILTER INFO
  const parts = line.split("\t");
  if (parts.length < 5) return;

  const chrom = parts[0];
  const pos = parts[1];
  const rsid = parts[2];
  const ref = parts[3];
  const alt = parts[4];

  if (rsidSet.has(rsid)) {
    matched++;
    output.write(`${rsid},${chrom},${pos},${ref},${alt}\n`);
  }

  // 进度日志（每 100 万行）
  if (scanned % 1_000_000 === 0) {
    console.log(
      `⏱ 已扫描 ${scanned.toLocaleString()} 行 | 命中 ${matched.toLocaleString()}`
    );
  }
});

rl.on("close", () => {
  output.end();
  console.log("🎉 完成！");
  console.log(`📊 总扫描行数: ${scanned.toLocaleString()}`);
  console.log(`✅ 匹配 SNP 数: ${matched.toLocaleString()}`);
  console.log(`📁 输出文件: ${OUTPUT_FILE}`);
});
