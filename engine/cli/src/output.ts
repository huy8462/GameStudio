// Đầu ra CLI (DDD-00 §2.3): `--json` in đúng một dòng JSON ở stdout; dòng cho người đọc ra stderr.
export function printJson(value: unknown): void {
  process.stdout.write(JSON.stringify(value) + '\n');
}

export function printHuman(line: string): void {
  process.stderr.write(line + '\n');
}
