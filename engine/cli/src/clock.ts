// Đồng hồ hệ thống: điểm tiêm Clock duy nhất của CLI (DDD-00 §2.4). Thư viện engine nhận Clock qua tham số.
import type { Clock } from './orchestrator/types.js';

export const systemClock: Clock = {
  // eslint-disable-next-line no-restricted-properties -- điểm tiêm Clock thật, chỉ dùng ở lệnh CLI (DDD-00 §2.4)
  now: () => Date.now(),
};
