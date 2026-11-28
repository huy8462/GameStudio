// T-0027 (TST-GEN-02, TST-RTM-03; RR-CR02-04): đường dẫn tới vector chung ngoài Assets.
// Test EditMode đọc thẳng engine/shared/** từ gốc repo (Assets/../../..), không chép bản sao vào Assets:
// một nguồn sự thật duy nhất cho TS, Python và C#, không lệch khi sinh lại vector.
using System.IO;
using UnityEngine;

namespace GameStudio.Tests
{
    static class VectorPath
    {
        /// <summary>Đọc tệp văn bản theo đường dẫn tương đối từ gốc repo, ví dụ "engine/shared/rng/vectors.json".</summary>
        public static string Read(string repoRelative)
        {
            string p = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "..", "..", repoRelative));
            return File.ReadAllText(p);
        }
    }
}
