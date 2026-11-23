// Luật phụ thuộc giữa gói. Nguồn: TSD-00 §4.2, DDD-00 §4.2, DDD-08 (luật web), TST-GEN-04, TST-INT-10.
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      comment: 'DDD-00 §4.2 (1): đồ thị gói không có vòng (TST-GEN-04).',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'runtime-no-node',
      comment: 'DDD-00 §4.2 (2): engine/runtime chạy trong trình duyệt, không tới node:*, fs, path.',
      severity: 'error',
      from: { path: '^engine/runtime/' },
      to: { dependencyTypes: ['core'] },
    },
    {
      name: 'game-scripts-only-engine-api',
      comment: 'DDD-00 §4.2 (3), FR-RTM-04: script game chỉ dùng @gamestudio/engine/api.',
      severity: 'error',
      from: { path: '^games/[^/]+/scripts/' },
      to: { pathNot: ['^engine/runtime/src/api/', '@gamestudio/engine/api'] },
    },
    {
      name: 'app-not-server',
      comment: 'DDD-00 §4.2 (4): web/app không tới web/api, web/ai-gateway, web/worker.',
      severity: 'error',
      from: { path: '^web/app/' },
      to: { path: '^web/(api|ai-gateway|worker)/' },
    },
    {
      name: 'web-no-intake-internals',
      comment:
        'DDD-00 §4.2 (5), TST-INT-10: web chỉ dùng @gamestudio/intake, không import engine/intake/src/** trực tiếp.',
      severity: 'error',
      from: { path: '^web/' },
      to: { path: '^engine/intake/src/' },
    },
    {
      name: 'api-no-anthropic-sdk',
      comment: 'DDD-08, ADR-031: chỉ ai-gateway gọi dịch vụ AI.',
      severity: 'error',
      from: { path: '^web/(api|worker|app)/' },
      to: { path: '@anthropic-ai/sdk' },
    },
    {
      name: 'worker-not-api',
      comment: 'DDD-08: web/worker không tới web/api.',
      severity: 'error',
      from: { path: '^web/worker/' },
      to: { path: '^web/api/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(^|/)(dist|build|cache|node_modules)/' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: { exportsFields: ['exports'], conditionNames: ['import', 'require', 'node', 'default'] },
  },
};
