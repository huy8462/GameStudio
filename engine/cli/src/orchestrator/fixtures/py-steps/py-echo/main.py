"""Bước python mẫu (T-0005, IF-CLI-02): python -I main.py --ctx ctx.json.

params.mode: "ok" (mặc định), "exit4" (thoát 4, lỗi dữ liệu), "crash" (ngoại lệ), "sleep" (ngủ quá timeout).
"""

import argparse
import json
import sys
import time
from pathlib import Path


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ctx", required=True)
    ctx = json.loads(Path(ap.parse_args().ctx).read_text(encoding="utf-8"))
    mode = ctx["inputs"]["params"].get("mode", "ok")
    print("PROGRESS 10 doc ctx", flush=True)
    if mode == "exit4":
        print(json.dumps({"level": "error", "msg": "du lieu thieu"}), file=sys.stderr)
        return 4
    if mode == "crash":
        raise RuntimeError("loi thu")
    if mode == "sleep":
        time.sleep(30)
    out = Path(ctx["outDir"])
    title = ctx["inputs"]["data"].get("/game.json/title", "")
    # newline="\n": đầu ra giống byte trên Windows và Linux (outputHash tất định).
    (out / "echo.txt").write_text(f"{title} seed={ctx['seed']}\n", encoding="utf-8", newline="\n")
    report = {"result": "warn", "metrics": {"chars": len(title)}, "warnings": ["thu canh bao"], "summary": "py.echo"}
    (out / "report.json").write_text(json.dumps(report), encoding="utf-8", newline="\n")
    print("PROGRESS 100 xong", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
