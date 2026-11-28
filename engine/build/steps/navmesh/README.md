# @gamestudio/step-navmesh

Bước build `navmesh` (EP-CHR-01, MOD-CHR-18, DTO-CHR-06, CFG-CHR-06; T-0019). Bước node theo IF-CLI-02: `step.json` trỏ `entry: dist/index.js`. **Cần `pnpm -r build` trước `engine build`.**

Theo CR-02, build không dựng navmesh: bước chỉ gom nguồn và thông số tác nhân; player dựng `NavMeshData` từng ô 64 m lúc nạp zone (`engine/unity/Assets/GameStudio/NpcAi/Nav/`, PSC-CHR-07).

## Vào / ra

- Vào: đầu ra `terrain.mesh` của zone (`chunks/<cx>_<cz>/`, `collider/height-lod1.meta.json`). `perZone: true`.
- Ra: `nav/sources.json` theo schema `nav-sources/1`: `agentTypes` (4 họ), `voxelSize` 0,2, `tileSize` 64, `bounds`, `tiles[]` (một ô mỗi chunk, sắp theo z rồi x), `sources[]`.
- Nguồn giai đoạn này chỉ có `terrain`; `placement`, `water_deep` thêm khi có bước tương ứng (khi đó thêm lại `deps`).

## Thông số tác nhân (`src/agent-types.ts`)

| Họ | r (m) | cao (m) | dốc (°) | bậc (m) |
|---|---|---|---|---|
| `nguoi` | 0,3 | 1,7 | 40 | 0,35 |
| `thu4_nho` | 0,25 | 0,6 | 45 | 0,3 |
| `thu4_lon` | 0,6 | 1,6 | 35 | 0,4 |
| `gia_cam` | 0,15 | 0,4 | 40 | 0,2 |

Người theo `player.json` mặc định (SCH-CHR-01); ba họ thú là đề xuất tới khi có `family.json` (IF-CHR-03).

## Mã

`src/sources.ts` (hàm thuần `navSources`), `src/index.ts` (`run(ctx)`, `readChunks`). Test: `src/navmesh.test.ts`.
