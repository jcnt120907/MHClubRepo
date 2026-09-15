import { seedSeptember } from "../lib/seed";
const added = await seedSeptember();
console.log(`新增 ${added} 条样本；已有样本保持不变。`);
process.exit(0);
