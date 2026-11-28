"""Bước materials (T-0025; DDD-03 MOD-AST-11, 12, PSC-AST-09, 10; FR-AST-14, 15, 18; SRS-04 bảng bước). Toàn game.

Vật liệu thủ tục: công thức (params.materials, ghi đè/thêm bằng games/<id>/assets/materials/*.json) → numpy →
materials/<id>/{baseColor,normal,orm[,height]}.png + material.json (DTO-AST-06) + provenance.json (generator).
HDRI: tệp CC0 games/<id>/assets/hdri/<id>.hdr (kèm <id>.provenance.json do engine asset import ghi) hoặc bầu trời
thủ tục (params.hdri) → hdri/<id>/{env.ktx2 (GGX theo mip, RGBM), sky.ktx2 (RGBM), sh.json, preview.png}.
Nén KTX2 cho map vật liệu và hạ theo tier thuộc packager (PSC-CLI-02 bước 5).
Chạy: uv run python -I main.py --ctx ctx.json.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess  # noqa: S404 (gọi ktx đã ghim trong tools/versions.json)
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "py"))

import gsio  # noqa: E402

gsio.single_thread_env()

import numpy as np  # noqa: E402

from gsrng import derive_seed  # noqa: E402
from hdri import cube, prefilter, rgbe, sky  # noqa: E402
from heightfield.png import write_png  # noqa: E402
from texproc.graph import RecipeError, build_maps, material_json, seam_delta  # noqa: E402

# {size?, hdri?: {khoá: giá trị cho mọi HDRI}}: game nhỏ hoặc test hạ độ phân giải
SETTINGS = "assets/materials/_settings.json"
SEAM_MAX = 1.5  # chênh mép ≤ 1,5 lần chênh hai cột liền kề (liền mép theo cấu tạo; kiểm phòng lỗi)


def ktx_cube(ktx: str, tmp: Path, name: str, mips: list[Any], out: Path) -> None:
    """Ghi PNG RGBM theo thứ tự mức → mặt rồi `ktx create --cubemap` (UASTC, một luồng: tất định)."""
    files: list[str] = []
    for m, level in enumerate(mips):
        for f, face in enumerate(cube.FACES):
            p = tmp / f"{name}-m{m}-{face}.png"
            write_png(p, prefilter.rgbm(level[f]))
            files.append(str(p))
    out.parent.mkdir(parents=True, exist_ok=True)
    args = [ktx, "create", "--format", "R8G8B8A8_UNORM", "--assign-tf", "linear", "--cubemap"]
    args += ["--levels", str(len(mips)), "--encode", "uastc", "--uastc-quality", "2", "--zstd", "18"]
    args += ["--threads", "1", *files, str(out)]
    r = subprocess.run(args, capture_output=True, text=True, check=False)  # noqa: S603
    if r.returncode != 0:
        raise gsio.StepFail(f"ktx create lỗi ({r.returncode}): {r.stderr.strip()[:300]}", 5)


def load_recipes(ctx: dict[str, Any]) -> list[dict[str, Any]]:
    by_id: dict[str, dict[str, Any]] = {r["id"]: r for r in ctx["inputs"]["params"].get("materials", [])}
    for rel in sorted(ctx["inputs"]["files"]):
        if rel.startswith("assets/materials/") and rel.endswith(".json") and rel != SETTINGS:
            r = json.loads((Path(ctx["gameDir"]) / rel).read_text(encoding="utf-8"))
            by_id[str(r.get("id"))] = r
    return [by_id[k] for k in sorted(by_id)]


def do_material(r: dict[str, Any], palette: dict[str, str], seed: int, size: int, out: Path) -> dict[str, Any]:
    mseed = derive_seed(seed, r["id"])
    maps = build_maps(r, palette, mseed, int(r.get("size", size)))
    d = out / "materials" / r["id"]
    write_png(d / "baseColor.png", maps.base_color)
    write_png(d / "normal.png", maps.normal)
    write_png(d / "orm.png", maps.orm)
    if maps.height is not None:
        write_png(d / "height.png", maps.height)
    gsio.write_json(d / "material.json", material_json(r, maps))
    gsio.write_json(
        d / "provenance.json",
        {
            "schema": "provenance/1",
            "type": "generator",
            "assetId": f"material-{r['id']}",
            "version": 1,
            "family": "texproc",
            "generatorVersion": "1",
            "recipeHash": "sha256:" + hashlib.sha256(json.dumps(r, sort_keys=True).encode()).hexdigest(),
            "seed": mseed,
        },
    )
    return {"id": r["id"], "seam": round(seam_delta(maps.base_color), 3)}


def do_hdri(spec: dict[str, Any], ctx: dict[str, Any], ktx: str, out: Path) -> dict[str, Any]:
    hid = spec["id"]
    src_rel = f"assets/hdri/{hid}.hdr"
    if src_rel in ctx["inputs"]["files"]:
        img = rgbe.read_hdr(Path(ctx["gameDir"]) / src_rel).astype(np.float64)
        width = int(spec.get("equirectWidth", 2048))  # FR-AST-18: Thấp/Vừa 2K; bản 4K cho Cao/Tối đa do packager
        while img.shape[1] > width:
            img = cube.downsample2(img)
        source = "cc0"
    else:
        w = int(spec.get("equirectWidth", 1024))
        img = sky.procedural_sky(w, w // 2, spec.get("sky") or {})
        source = "procedural"
    face, mips, samples = int(spec.get("face", 128)), int(spec.get("mips", 6)), int(spec.get("samples", 128))
    env = prefilter.prefilter(img, face, mips, samples)
    skyface = int(spec.get("skyFace", 256))
    sky_cube = prefilter.prefilter_level(cube.pyramid(img), skyface, 0.0, 1)
    d = out / "hdri" / hid
    tmp = Path(ctx["tmpDir"]) / f"hdri-{hid}"
    tmp.mkdir(parents=True, exist_ok=True)
    ktx_cube(ktx, tmp, "env", env, d / "env.ktx2")
    ktx_cube(ktx, tmp, "sky", [sky_cube], d / "sky.ktx2")
    small = img
    while small.shape[1] > 512:
        small = cube.downsample2(small)
    write_png(d / "preview.png", prefilter.tonemap_preview(small))
    gsio.write_json(
        d / "sh.json",
        {
            "schema": "hdri-sh/1",
            "id": hid,
            "basis": list(prefilter.SH_BASIS),
            "kind": "radiance",
            "coefficients": prefilter.sh9(env[0]),
            "env": {
                "file": "env.ktx2",
                "face": face,
                "mips": mips,
                "encoding": "rgbm",
                "rgbmRange": prefilter.RGBM_RANGE,
            },
            "sky": {"file": "sky.ktx2", "face": skyface, "encoding": "rgbm", "rgbmRange": prefilter.RGBM_RANGE},
            "source": source,
        },
    )
    return {"id": hid, "source": source}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ctx", required=True)
    ctx = gsio.load_ctx(ap.parse_args().ctx)
    out = Path(ctx["outDir"])
    p = dict(ctx["inputs"]["params"])
    if SETTINGS in ctx["inputs"]["files"]:
        st = json.loads((Path(ctx["gameDir"]) / SETTINGS).read_text(encoding="utf-8"))
        p["size"] = int(st.get("size", p.get("size", 2048)))
        p["hdriOverride"] = st.get("hdri") or {}
        p["hdri"] = [{**h, **p["hdriOverride"]} for h in p.get("hdri", [])]
    colors = ctx["inputs"]["data"].get("/palette.json/colors") or []
    palette = {str(c["id"]): str(c["hex"]) for c in colors if isinstance(c, dict)}
    seed = int(ctx["seed"])
    warnings: list[str] = []
    try:
        recipes = load_recipes(ctx)
        mats = []
        for i, r in enumerate(recipes):
            gsio.progress(5 + 60 * i / max(len(recipes), 1), f"vật liệu {r['id']}")
            m = do_material(r, palette, seed, int(p.get("size", 2048)), out)
            if m["seam"] > SEAM_MAX:
                warnings.append(f"{m['id']}: mép chưa liền (tỉ lệ {m['seam']})")
            mats.append(m)
        ktx = (ctx.get("toolVersions") or {}).get("ktxPath") or "ktx"
        hdris = []
        specs = {h["id"]: h for h in p.get("hdri", [])}
        for rel in ctx["inputs"]["files"]:
            if rel.startswith("assets/hdri/") and rel.endswith(".hdr"):
                hid = Path(rel).stem
                specs.setdefault(hid, {"id": hid, **p.get("hdriOverride", {})})
                if f"assets/hdri/{hid}.provenance.json" not in ctx["inputs"]["files"]:
                    warnings.append(f"HDRI {hid}: thiếu {hid}.provenance.json (FR-AST-29)")
        for i, hid in enumerate(sorted(specs)):
            gsio.progress(65 + 30 * i / max(len(specs), 1), f"HDRI {hid}")
            hdris.append(do_hdri(specs[hid], ctx, ktx, out))
    except (RecipeError, rgbe.HdrError, KeyError) as e:
        gsio.log_error(f"materials: {e}")
        return 4
    except gsio.StepFail as e:
        gsio.log_error(str(e))
        return e.exit_code
    index = {
        "schema": "materials/1",
        "materials": [
            {"id": m["id"], "ref": f"asset:{m['id']}@1", "dir": f"materials/{m['id']}", "source": "procedural"}
            for m in mats
        ],
        "hdri": [{"id": h["id"], "dir": f"hdri/{h['id']}", "source": h["source"]} for h in hdris],
    }
    gsio.write_json(out / "materials.json", index)
    gsio.write_partial_report(
        out,
        metrics={"materials": len(mats), "hdri": len(hdris)},
        warnings=warnings,
        artifacts=["materials.json"],
        summary=f"materials: {len(mats)} vật liệu, {len(hdris)} HDRI",
    )
    gsio.progress(100, "xong")
    return 0


if __name__ == "__main__":
    sys.exit(main())
