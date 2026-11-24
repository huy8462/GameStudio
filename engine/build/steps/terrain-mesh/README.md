# @gamestudio/step-terrain-mesh

Bước build `terrain.mesh` (EP-WLD-04, MOD-WLD-07, PSC-WLD-07, DTO-WLD-10; T-0010). Bước node theo IF-CLI-02: `step.json` trỏ `entry: dist/index.js`, bộ điều phối gọi `run(ctx)` trong tiến trình. **Cần `pnpm -r build` trước `engine build`.**

## Vào / ra

- Vào: `hf/` của `terrain.erode` (DTO-WLD-02), `/world.json/zones` (đa giác zone). `perZone: true`, mỗi lần chạy một zone.
- Ra trong `outDir`:
  - `chunks/<cx>_<cz>/lod{0..3}.glb`: chunk 64 m (lưới gốc 0), LOD bước `cellM·{1,2,4,8}`, skirt 2 m, `NORMAL`, `TEXCOORD_0 = (x, z)/4`, `TEXCOORD_1` = ô atlas.
  - `collider/height-lod1.r32` + `.meta.json`: lưới LOD1 (bước `cellM·2`) phủ các chunk của zone.
  - `lightmaps/uv2-atlas.json`: `{cols, chunkM, rects: {"cx_cz": [x, y, w, h]}}`.
- Chunk thuộc zone khi tâm chunk nằm trong đa giác zone.

## glb

`@gltf-transform/core` + `extensions` 4.5.1, `meshoptimizer` 1.2.0 (cùng họ với CLI `gltf-transform` 4.5.1). Lượng tử tự làm theo `KHR_mesh_quantization`: vị trí SHORT 14 bit với tỉ lệ node đồng đều, normal BYTE chuẩn hoá, UV1 UNSIGNED_SHORT chuẩn hoá, UV0 FLOAT. Nén `EXT_meshopt_compression` (phương thức QUANTIZE). Runtime cần `MeshoptDecoder` (three.js `GLTFLoader.setMeshoptDecoder`).

## Tham số (`step.json` `params`)

`chunkM` 64, `lodSteps` [1, 2, 4, 8], `skirtM` 2, `uvTiling` 4, `quantBits` 14. Đổi tham số thì `inputHash` đổi, nên bước build lại.

## Mã

- `src/heightfield.ts`: đọc bundle, lấy mẫu song tuyến (khớp `engine/build/py/heightfield/io.py`).
- `src/chunker.ts`: chia chunk, điểm trong đa giác, atlas.
- `src/grid-mesh.ts`: lưới + normal sai phân trung tâm + skirt hướng ra ngoài.
- `src/glb.ts`: lượng tử + ghi glb. `src/index.ts`: `run(ctx)`, collider, atlas.
- Test: `src/terrain-mesh.test.ts` (Vitest gốc).

## Chưa có

`collider/bvh.bin` (three-mesh-bvh, phiếu runtime E2); simplify có khoá biên (đang dùng nhánh bước lưới của PSC-WLD-07).
