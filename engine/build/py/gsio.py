"""Vào/ra chung cho bước build Python (IF-CLI-02, DTO-CLI-01, DDD-02 §3 mẫu `main.py`).

- `single_thread_env()`: gọi TRƯỚC `import numpy` để BLAS/OpenMP một luồng (rule engine-build: numpy một luồng).
- `load_ctx(path)`: đọc ctx.json do bộ điều phối ghi.
- `progress(pct, msg)`: in dòng `PROGRESS <0-100> <msg>` ra stdout (bộ điều phối đọc).
- `write_text`/`write_json`: ghi UTF-8 với `newline="\\n"` để byte giống nhau trên Windows và Linux (outputHash).
- `write_partial_report(out_dir, ...)`: `report.json` một phần (result, metrics, checks, warnings, artifacts, summary);
  bộ điều phối điền phần chung của `report/1`.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

THREAD_VARS = (
    "OMP_NUM_THREADS",
    "OPENBLAS_NUM_THREADS",
    "MKL_NUM_THREADS",
    "NUMEXPR_NUM_THREADS",
    "VECLIB_MAXIMUM_THREADS",
)


class StepFail(Exception):
    """Lỗi bước kèm mã thoát SRS-04 §7.2 (4 dữ liệu, 5 môi trường, 6 dịch vụ ngoài)."""

    def __init__(self, message: str, exit_code: int) -> None:
        super().__init__(message)
        self.exit_code = exit_code


def utf8_stdio() -> None:
    """stdout/stderr UTF-8 (dòng PROGRESS, log tiếng Việt). `python -I` bỏ qua PYTHONIOENCODING, và Windows mặc định cp1252."""
    for s in (sys.stdout, sys.stderr):
        reconf = getattr(s, "reconfigure", None)
        if callable(reconf):
            reconf(encoding="utf-8", newline="\n")


utf8_stdio()


def single_thread_env() -> None:
    for k in THREAD_VARS:
        os.environ[k] = "1"


def load_ctx(path: str | Path) -> dict[str, Any]:
    ctx: dict[str, Any] = json.loads(Path(path).read_text(encoding="utf-8"))
    return ctx


def progress(pct: float, msg: str) -> None:
    print(f"PROGRESS {max(0, min(100, round(pct)))} {msg}", flush=True)


def write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8", newline="\n")


def write_json(path: Path, value: Any) -> None:
    """JSON tất định: khoá sắp, thụt 2, xuống dòng cuối."""
    write_text(path, json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n")


def write_partial_report(  # noqa: PLR0913 (tham số keyword-only, khớp trường report/1)
    out_dir: Path,
    *,
    result: str = "pass",
    metrics: dict[str, float] | None = None,
    checks: list[dict[str, Any]] | None = None,
    warnings: list[str] | None = None,
    artifacts: list[str] | None = None,
    summary: str = "",
) -> None:
    write_json(
        out_dir / "report.json",
        {
            "result": result,
            "metrics": metrics or {},
            "checks": checks or [],
            "warnings": warnings or [],
            "artifacts": artifacts or [],
            "summary": summary,
        },
    )


def log_error(msg: str) -> None:
    """Log JSON một dòng ra stderr (rule engine-build)."""
    print(json.dumps({"level": "error", "msg": msg}, ensure_ascii=False), file=sys.stderr, flush=True)
