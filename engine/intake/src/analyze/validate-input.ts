// Kiểm đầu vào (PSC-INT-01 validateInput, CFG-INT-04; ERR-INT-01 chặn, ERR-INT-02 bỏ ảnh + cảnh báo).
import { IMAGE_MIMES, LIMITS } from '../config.js';
import type { IntakeImage, IntakeInput, Result } from '../types.js';
import { err } from '../types.js';

export interface CheckedInput {
  description: string;
  images: IntakeImage[];
  warnings: string[];
}

export function validateInput(input: IntakeInput): Result<CheckedInput> {
  const description = input.description.normalize('NFC').trim();
  const n = [...description].length;
  if (n < LIMITS.minChars || n > LIMITS.maxChars) {
    return err('ERR-INT-01', `Mô tả cần từ ${LIMITS.minChars} đến ${LIMITS.maxChars.toLocaleString('vi')} ký tự.`, {
      length: n,
    });
  }
  const warnings: string[] = [];
  const images: IntakeImage[] = [];
  for (const img of input.images ?? []) {
    let why: string | undefined;
    if (!(IMAGE_MIMES as readonly string[]).includes(img.mime)) why = `định dạng ${img.mime} không hỗ trợ`;
    else if (img.bytes.byteLength > LIMITS.maxImageBytes) why = 'quá 10 MB';
    else if (images.length >= LIMITS.maxImages) why = `quá ${LIMITS.maxImages} ảnh`;
    if (why) warnings.push(`ERR-INT-02 Ảnh ${img.name} không dùng được: ${why}.`);
    else images.push(img);
  }
  return { ok: true, value: { description, images, warnings } };
}
