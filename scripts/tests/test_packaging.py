"""Gói skill: 2 skill gốc còn giữ, 6 skill Three.js đã bỏ (T-0024, CR-02/ADR-036), không có tệp rác."""

from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[2]
SKILLS = ROOT / ".claude" / "skills"
# GameStudio: giữ 2 skill gốc (ảnh, âm thanh); 6 skill gắn Three.js thay bằng engine-unity-* (T-0024).
UPSTREAM_NAMES = {"threejs-image-generator", "threejs-audio-generator"}
REMOVED = {
    "threejs-3d-generator", "threejs-game-director", "threejs-gameplay-systems", "threejs-aaa-graphics-builder",
    "threejs-game-ui-designer", "threejs-debug-profiler", "threejs-qa-release",
}
NOISE = {".DS_Store", "__pycache__", "node_modules", "dist", "artifacts", "test-results"}


class PackagingTests(unittest.TestCase):
    def test_upstream_skills_present_and_removed_absent(self):
        found = {entry.parent.name for entry in SKILLS.glob("*/SKILL.md")}
        self.assertTrue(UPSTREAM_NAMES <= found, UPSTREAM_NAMES - found)
        self.assertEqual(set(), found & REMOVED)
        self.assertEqual(set(), {n for n in found - UPSTREAM_NAMES if not n.startswith("engine-")})

    def test_no_generated_noise_in_package(self):
        self.assertEqual([], [str(path.relative_to(SKILLS)) for path in SKILLS.rglob("*") if path.name in NOISE])


if __name__ == "__main__":
    unittest.main()