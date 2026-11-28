// T-0020 (MOD-CLI-04): chạy bước texture từ dòng lệnh, in một dòng JSON (TextureReport) và ghi <out>/textures-report.json.
// Dùng: node engine/build/packager/dist/main.js --out <thư mục> --budgets <budgets.json> [--tier vua] [--sharp id1,id2] <ảnh…>
// id texture = tên tệp ảnh không đuôi. Mã thoát SRS-04 §7.2: 0 đạt, 2 vượt ngân sách, 4 sai đầu vào, 5/6 công cụ.
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { parseArgs } from 'node:util';

import { PackToolError } from './exec.js';
import { textureReport } from './metrics.js';
import { packTextures } from './textures.js';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: 'string' },
    budgets: { type: 'string' },
    tier: { type: 'string', default: 'vua' },
    sharp: { type: 'string', default: '' },
  },
});

interface TierBudget {
  maxTexture?: number;
  coreTextureMax?: number;
  coreZoneMB?: number;
}

if (values.out === undefined || values.budgets === undefined || positionals.length === 0) {
  console.error('ERR-CLI-01 Cần --out, --budgets và ít nhất một tệp ảnh.');
  process.exitCode = 4;
} else {
  try {
    const budgets = JSON.parse(readFileSync(values.budgets, 'utf8')) as { tiers?: Record<string, TierBudget> };
    const tier = budgets.tiers?.[values.tier];
    if (tier?.maxTexture === undefined || tier.coreTextureMax === undefined || tier.coreZoneMB === undefined)
      throw new Error(`budgets.tiers.${values.tier} thiếu maxTexture, coreTextureMax hoặc coreZoneMB.`);
    const sharp = new Set(values.sharp.split(',').filter((s) => s !== ''));
    const inputs = positionals.map((path) => {
      const id = basename(path, extname(path));
      return { id, path, sharp: sharp.has(id) };
    });
    const packed = await packTextures(inputs, {
      outDir: values.out,
      maxTexture: tier.maxTexture,
      coreTextureMax: tier.coreTextureMax,
    });
    const report = textureReport(packed, { coreTextureMax: tier.coreTextureMax, coreZoneMB: tier.coreZoneMB });
    writeFileSync(join(values.out, 'textures-report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
    process.exitCode = report.result === 'fail' ? 2 : 0;
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = e instanceof PackToolError ? e.code : 4;
  }
}
