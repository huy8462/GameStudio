// Tiện ích văn bản tiếng Việt cho intake: chuẩn hoá (PSC-INT-11: NFC, gộp khoảng trắng), tìm cụm từ theo ranh giới từ,
// tách câu, slug bỏ dấu (PSC-INT-03 uniqueSlug), đếm từ (PSC-INT-05).

export const norm = (s: string): string => s.normalize('NFC').replace(/\s+/gu, ' ').trim();
const lower = (s: string): string => norm(s).toLocaleLowerCase('vi');

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Vị trí các lần xuất hiện cụm `phrase` trong `text` theo ranh giới từ Unicode, GIỮ DẤU.
 * Không so sau bỏ dấu như PSC-INT-10 ghi: bỏ dấu làm "săn" trùng "sân", "sạn" (vd "5 con gà ở sân").
 */
export function findPhrase(text: string, phrase: string): number[] {
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${escape(lower(phrase))}(?![\\p{L}\\p{N}])`, 'gu');
  return [...lower(text).matchAll(re)].map((m) => m.index);
}

export const hasPhrase = (text: string, phrase: string): boolean => findPhrase(text, phrase).length > 0;

/** Câu chứa vị trí `at` (tách theo . ! ? xuống dòng), trả nguyên văn đã chuẩn hoá. */
export function sentenceAt(text: string, at: number): string {
  const t = norm(text);
  const start = Math.max(t.lastIndexOf('.', at - 1), t.lastIndexOf('!', at - 1), t.lastIndexOf('?', at - 1)) + 1;
  const ends = ['.', '!', '?'].map((c) => t.indexOf(c, at)).filter((i) => i >= 0);
  const end = ends.length > 0 ? Math.min(...ends) + 1 : t.length;
  return t.slice(start, end).trim();
}

/** Chuỗi con sau chuẩn hoá NFC + gộp khoảng trắng, không phân biệt hoa thường (PSC-INT-11). */
export const containsNorm = (haystack: string, needle: string): boolean =>
  needle.trim() !== '' && lower(haystack).includes(lower(needle));

/** Bỏ dấu tiếng Việt, a-z0-9-, tối đa 48 ký tự (PSC-INT-03). */
export function slugify(s: string): string {
  const base = s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '');
  return /^[a-z0-9]/.test(base) ? base : `game-${base}`.replace(/-+$/g, '') || 'game';
}

/** Slug chưa dùng: trùng thì thêm -2, -3… */
export function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
}

export const wordCount = (s: string): number => s.split(/\s+/u).filter(Boolean).length;
