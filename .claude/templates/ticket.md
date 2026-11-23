---
id: T-0000
title: <tiêu đề ngắn>
phase: E0
gate: G-E0
rigor: minimal
model:
  name: sonnet # opus | sonnet | haiku
  effort: medium # low | medium | high | xhigh
read:
  - <glob tệp được đọc>
write:
  - <glob tệp được sửa>
done:
  - <tiêu chí xong đo được>
evidence:
  - <báo cáo JSON, ảnh>
status: mo # mo | dang_lam | xong | huy
# tokens: điền bằng /handoff (token-meter)
---

# T-0000: <tiêu đề>

**Mô hình khuyến nghị:** Sonnet, effort medium (lý do ngắn).

## Mục tiêu

## Phạm vi

- Mã truy vết: FR-…, ALG-…, MOD-…

## Danh sách bắt buộc theo rigor

- minimal: báo cáo JSON, `/qa-light`, ảnh khi đổi hình.
- standard (nếu áp dụng): unit test cho logic mới, review bởi agent khác, ADR nếu đổi kiến trúc.
- Chạm `web/**` hoặc xác thực: rà soát bảo mật ngắn (10 câu).

## Ghi chú

## Sửa ngoài danh sách (lý do)
