// T-0022 (MOD-RTM-05; POC-U1): nạp texture KTX2 bằng KTX for Unity (tự chọn đích chuyển mã theo thiết bị).
using System.Threading.Tasks;
using KtxUnity;
using Unity.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace GameStudio
{
    public static class Ktx2Loader
    {
        /// <summary>Trả null khi tải hoặc chuyển mã lỗi. linear = true cho map không phải màu (normal, ORM).</summary>
        public static async Task<Texture2D> Load(string url, bool linear = false)
        {
            using var req = UnityWebRequest.Get(url);
            await req.SendWebRequest();
            if (req.result != UnityWebRequest.Result.Success) return null;
            using var data = new NativeArray<byte>(req.downloadHandler.data, Allocator.Persistent);
            var ktx = new KtxTexture();
            var r = await ktx.LoadFromBytes(data.AsReadOnly(), linear);
            return r.texture;
        }
    }
}
