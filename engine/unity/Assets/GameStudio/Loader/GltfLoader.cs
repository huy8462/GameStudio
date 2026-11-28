// T-0022 (MOD-RTM-05; POC-U1): nạp glb bằng glTFast (Meshopt giải nén qua gói meshopt.decompress).
// Khung dùng một vật liệu cố định cho mọi mesh (như POC) tới khi có bước materials.
using System.Threading.Tasks;
using GLTFast;
using GLTFast.Logging;
using GLTFast.Materials;
using UnityEngine;

namespace GameStudio
{
    public static class GltfLoader
    {
        sealed class FixedMaterial : IMaterialGenerator
        {
            readonly Material m;
            public FixedMaterial(Material m) { this.m = m; }
            public Material GetDefaultMaterial(bool pointsSupport = false) => m;
            public Material GenerateMaterial(GLTFast.Schema.MaterialBase gltfMaterial, IGltfReadable gltf, bool pointsSupport = false) => m;
            public void SetLogger(ICodeLogger logger) { }
        }

        /// <summary>Tải url và dựng cảnh 0 dưới parent. Trả false khi tải hoặc dựng lỗi.</summary>
        public static async Task<bool> Load(string url, Transform parent, Material material)
        {
            var import = new GltfImport(null, null, new FixedMaterial(material));
            if (!await import.Load(url)) return false;
            // Chỉ số cảnh ghi tường minh: glb của terrain.mesh hiện chưa đặt "scene" mặc định (packager sẽ đặt).
            return await import.InstantiateSceneAsync(parent, 0);
        }
    }
}
