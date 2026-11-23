# web/

Web Studio (TSD-08, DDD-08; ADR-027…032). Hiện **chưa có gói**; dựng từ W1 (sau cổng G-E1).

| Thư mục | Gói | Ghi chú |
|---|---|---|
| `app/` | `@gamestudio/web-app` | SPA React 19 + Vite |
| `api/` | `@gamestudio/web-api` | Fastify, PostgreSQL 17 + Drizzle |
| `ai-gateway/` | `@gamestudio/web-ai-gateway` | Fastify; **chỉ nơi này giữ khoá AI** (ADR-031) |
| `worker/` | `@gamestudio/web-worker` | pg-boss, gọi `engine` qua tiến trình con |
| `shared/` | `@gamestudio/web-shared` | DTO, mã lỗi, ma trận quyền |
| `deploy/` | không phải gói | `compose.yaml`, `Caddyfile`, `Dockerfile.*` |

Luật phụ thuộc kiểm bằng `pnpm depcruise` (`.dependency-cruiser.cjs`).
