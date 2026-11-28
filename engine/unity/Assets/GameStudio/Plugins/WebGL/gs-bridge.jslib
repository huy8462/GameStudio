// T-0022 (MOD-RTM-01, MOD-RTM-13, MOD-RTM-16 phần gs-bridge; IF-RTM-01; EP-RTM-01): cầu JS giữa player và trang nạp.
// Tiến độ và trạng thái ra trang bằng CustomEvent; kết quả ?perf=1 ra window.__GS_PERF__ và console "GS_PERF".
mergeInto(LibraryManager.library, {
  GsNowMs: function () {
    // performance.now() tính từ navigationStart nên dùng trực tiếp làm thời gian tải.
    return performance.now();
  },
  GsQuery: function () {
    return stringToNewUTF8(window.location.search || '');
  },
  GsProgress: function (phasePtr, loaded, total) {
    var detail = { phase: UTF8ToString(phasePtr), loaded: loaded, total: total };
    window.dispatchEvent(new CustomEvent('gs:progress', { detail: detail }));
  },
  GsState: function (statePtr, messagePtr) {
    var detail = { state: UTF8ToString(statePtr), message: UTF8ToString(messagePtr) };
    window.__GS_STATE__ = detail.state;
    window.dispatchEvent(new CustomEvent('gs:state', { detail: detail }));
  },
  GsPerfReport: function (ptr) {
    var json = UTF8ToString(ptr);
    console.log('GS_PERF ' + json);
    window.__GS_PERF__ = JSON.parse(json);
    window.dispatchEvent(new CustomEvent('gs:perf', { detail: json }));
  }
});
