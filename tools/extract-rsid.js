const fs = require('fs');
const path = require('path');

const dnaFile = path.resolve('D:/code/ai-agent-studio/server/uploads/DNA.txt');
console.log('读取文件路径:', dnaFile);

const outputFile = path.resolve('D:/code/ai-agent-studio/server/uploads/rsid_list.txt');
console.log('输出文件路径:', outputFile);

const rsidSet = new Set();

try {
  if (!fs.existsSync(dnaFile)) {
    console.error('❌ 文件不存在，请检查路径！');
    process.exit(1);
  }

  const lines = fs.readFileSync(dnaFile, 'utf-8').split(/\r?\n/);
  console.log('文件总行数:', lines.length);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const [rsid] = trimmed.split('\t');
    if (rsid.startsWith('rs')) rsidSet.add(rsid);
  }

  const rsidList = Array.from(rsidSet);
  fs.writeFileSync(outputFile, rsidList.join('\n'));

  console.log(`✅ 总共提取 ${rsidList.length} 个唯一 rsid`);
  console.log(`📄 rsid 已保存到: ${outputFile}`);

} catch (err) {
  console.error('❌ 读取 DNA.txt 出错:', err);
}
