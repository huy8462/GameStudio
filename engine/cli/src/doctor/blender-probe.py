"""Đầu dò Blender cho `engine doctor` (ALG-DEV-06, PSC-DEV-06, ADR-034).

Chạy bên trong Blender (Python nhúng 3.13), chỉ dùng thư viện chuẩn và bpy:
    blender -b --factory-startup --python-exit-code 1 --python blender-probe.py -- --modules a,b
In đúng một dòng `GSPROBE <json>` ra stdout. Không đọc biến môi trường, không ghi tệp,
không lưu cấu hình (enable với default_set=False, persistent=False).
"""

import hashlib
import json
import sys
import tomllib
from pathlib import Path

import addon_utils  # type: ignore[import-not-found]
import bpy  # type: ignore[import-not-found]


def dir_sha256(root: Path) -> str:
    """SHA-256 ổn định của một thư mục: sắp theo đường dẫn tương đối (byte UTF-8), bỏ __pycache__."""
    files = [p for p in root.rglob("*") if p.is_file() and "__pycache__" not in p.parts and p.suffix != ".pyc"]
    files.sort(key=lambda p: p.relative_to(root).as_posix().encode("utf-8"))
    h = hashlib.sha256()
    for p in files:
        rel = p.relative_to(root).as_posix().encode("utf-8")
        h.update(rel + b"\0" + hashlib.sha256(p.read_bytes()).hexdigest().encode("ascii") + b"\n")
    return h.hexdigest()


def probe_addon(module: str) -> dict[str, object]:
    found = next((m for m in addon_utils.modules(refresh=False) if m.__name__ == module), None)
    if found is None or not getattr(found, "__file__", None):
        return {"module": module, "found": False}
    root = Path(found.__file__).parent
    manifest = root / "blender_manifest.toml"
    version = None
    if manifest.is_file():
        version = tomllib.loads(manifest.read_text(encoding="utf-8")).get("version")
    try:
        loadable = addon_utils.enable(module, default_set=False, persistent=False) is not None
    except Exception:  # noqa: BLE001 - mọi lỗi nạp add-on đều là "không nạp được"
        loadable = False
    return {"module": module, "found": True, "version": version, "loadable": loadable, "sha256": dir_sha256(root)}


def main() -> None:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    modules: list[str] = []
    if "--modules" in argv:
        modules = [m for m in argv[argv.index("--modules") + 1].split(",") if m]
    addon_utils.modules(refresh=True)
    out = {
        "version": ".".join(str(n) for n in bpy.app.version),
        "versionString": bpy.app.version_string,
        "python": sys.version.split()[0],
        "addons": [probe_addon(m) for m in modules],
    }
    print("GSPROBE " + json.dumps(out, ensure_ascii=True), flush=True)


main()
