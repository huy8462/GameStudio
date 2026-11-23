// Mã thoát CLI (SRS-04 §7.2, DDD-00 §5.2).
export const EXIT = {
  OK: 0,
  WARN: 1,
  FAIL: 2,
  NEEDS_CONFIRM: 3,
  DATA: 4,
  ENVIRONMENT: 5, // ERR-WLD-07; ERR-DEV-04, 05
  EXTERNAL: 6,
  UNCAUGHT: 10,
} as const;

export type ExitCode = (typeof EXIT)[keyof typeof EXIT];
