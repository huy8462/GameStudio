// Ghi glb một chunk (PSC-WLD-07: Meshopt, lượng tử 14 bit vị trí) bằng @gltf-transform/core 4.5.1 + meshoptimizer 1.2.0.
// Lượng tử tự làm (KHR_mesh_quantization): vị trí SHORT với tỉ lệ ĐỒNG ĐỀU (normal không méo dưới phép biến đổi node),
// normal BYTE chuẩn hoá, UV2 UNSIGNED_SHORT chuẩn hoá, UV0 FLOAT (vượt [0,1]). Không có trường thời gian → byte tất định.
import { Document, NodeIO, type TypedArray } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { MeshoptEncoder } from 'meshoptimizer';

import type { MeshData } from './grid-mesh.js';

export interface Quantized {
  positions: Int16Array<ArrayBuffer>;
  translation: [number, number, number];
  scale: number;
}

/** Lượng tử vị trí về [0, 2^bits − 1] quanh góc nhỏ nhất, tỉ lệ đồng đều. */
export function quantizePositions(p: Float32Array, bits: number): Quantized {
  const max = (1 << bits) - 1;
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < p.length; i++) {
    const a = i % 3;
    const v = p[i] ?? 0;
    if (v < (lo[a] ?? 0)) lo[a] = v;
    if (v > (hi[a] ?? 0)) hi[a] = v;
  }
  const extent = Math.max((hi[0] ?? 0) - (lo[0] ?? 0), (hi[1] ?? 0) - (lo[1] ?? 0), (hi[2] ?? 0) - (lo[2] ?? 0), 1e-6);
  const scale = extent / max;
  const q = new Int16Array(p.length);
  for (let i = 0; i < p.length; i++) q[i] = Math.round(((p[i] ?? 0) - (lo[i % 3] ?? 0)) / scale);
  return { positions: q, translation: [lo[0] ?? 0, lo[1] ?? 0, lo[2] ?? 0], scale };
}

const toInt8 = (a: Float32Array): Int8Array<ArrayBuffer> =>
  Int8Array.from(a, (v) => Math.round(Math.max(-1, Math.min(1, v)) * 127));
const toU16 = (a: Float32Array): Uint16Array<ArrayBuffer> =>
  Uint16Array.from(a, (v) => Math.round(Math.max(0, Math.min(1, v)) * 65535));

let io: NodeIO | undefined;
async function getIO(): Promise<NodeIO> {
  if (!io) {
    await MeshoptEncoder.ready;
    io = new NodeIO()
      .registerExtensions([KHRMeshQuantization, EXTMeshoptCompression])
      .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
  }
  return io;
}

export async function chunkGlb(mesh: MeshData, name: string, bits: number): Promise<Uint8Array> {
  const doc = new Document();
  doc.createExtension(KHRMeshQuantization).setRequired(true);
  doc
    .createExtension(EXTMeshoptCompression)
    .setRequired(true)
    .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  const buf = doc.createBuffer();
  const q = quantizePositions(mesh.positions, bits);
  const acc = (type: 'VEC2' | 'VEC3' | 'SCALAR', arr: TypedArray) =>
    doc.createAccessor().setType(type).setArray(arr).setBuffer(buf);
  const prim = doc
    .createPrimitive()
    .setAttribute('POSITION', acc('VEC3', q.positions))
    .setAttribute('NORMAL', acc('VEC3', toInt8(mesh.normals)).setNormalized(true))
    .setAttribute('TEXCOORD_0', acc('VEC2', mesh.uv0))
    .setAttribute('TEXCOORD_1', acc('VEC2', toU16(mesh.uv2)).setNormalized(true))
    .setIndices(acc('SCALAR', mesh.indices));
  const node = doc
    .createNode(name)
    .setMesh(doc.createMesh(name).addPrimitive(prim))
    .setTranslation(q.translation)
    .setScale([q.scale, q.scale, q.scale]);
  doc.createScene('terrain').addChild(node);
  return (await getIO()).writeBinary(doc);
}
