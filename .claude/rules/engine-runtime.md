---
paths:
  - 'engine/runtime/**'
---

# Rule: engine/runtime (FR-DEV-04, TSD-04)

- Chạy trong trình duyệt: không import `node:*`, `fs`, `path` (dependency-cruiser chặn).
- Không cấp phát trong vòng lặp nóng (`update(dt)`): dùng pool, mảng kiểu SoA, vector tạm tái dùng (FR-RTM-23, ADR-019).
- Hệ thống có `init / update(dt) / dispose`, thứ tự cố định (SRS-04 §2.1).
- Game chỉ dùng API công khai `@gamestudio/engine/api` (FR-RTM-04); không export nội bộ ra ngoài `src/index.ts`.
- `combat/`, `dialogue-ai/` là chunk tuỳ chọn: chỉ nạp qua `import()` khi cờ bật.
- Tất định: `@gamestudio/rng`, `Clock` tiêm; không `Math.random()`, `Date.now()`.
- Sửa render/shader/vật liệu: chạy `/perf-snapshot` (hook H-05 nhắc).
