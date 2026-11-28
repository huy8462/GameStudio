// T-0019 (CFG-CHR-06, MOD-CHR-18): thông số tác nhân NavMesh theo họ và hằng số dựng NavMesh.
// Người lấy theo player.json mặc định (SCH-CHR-01: r 0,3 m, cao 1,7 m, dốc 40°, bậc 0,35 m); ba họ thú là đề xuất
// của T-0019 tới khi có family.json (IF-CHR-03 agent {radius, height, maxSlope, maxClimb}).

export type AgentTypeId = 'nguoi' | 'thu4_nho' | 'thu4_lon' | 'gia_cam';

export interface AgentTypeSpec {
  agentType: AgentTypeId;
  /** m */
  radius: number;
  /** m */
  height: number;
  /** độ */
  maxSlope: number;
  /** m */
  maxClimb: number;
}

/** Thứ tự cố định = AgentType của player C# (Nguoi, Thu4Nho, Thu4Lon, GiaCam). */
export const AGENT_TYPES: readonly AgentTypeSpec[] = [
  { agentType: 'nguoi', radius: 0.3, height: 1.7, maxSlope: 40, maxClimb: 0.35 },
  { agentType: 'thu4_nho', radius: 0.25, height: 0.6, maxSlope: 45, maxClimb: 0.3 },
  { agentType: 'thu4_lon', radius: 0.6, height: 1.6, maxSlope: 35, maxClimb: 0.4 },
  { agentType: 'gia_cam', radius: 0.15, height: 0.4, maxSlope: 40, maxClimb: 0.2 },
];

/** CFG-CHR-06: voxel 0,2 m, ô 64 m (trùng lưới chunk địa hình). */
export const NAV_DEFAULTS = { voxelSize: 0.2, tileSize: 64 } as const;
