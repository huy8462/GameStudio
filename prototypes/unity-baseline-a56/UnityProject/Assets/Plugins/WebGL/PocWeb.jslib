// POC-U1 (CR-02, ADR-036; FR-QA-07): cầu JS cho lớp đo ?perf=1 của player Unity Web.
// performance.now() tính từ navigationStart nên dùng trực tiếp làm thời gian tải.
mergeInto(LibraryManager.library, {
  PocNowMs: function () {
    return performance.now();
  },
  PocQuery: function () {
    return stringToNewUTF8(window.location.search || '');
  },
  PocGpu: function () {
    try {
      var gl = (typeof GLctx !== 'undefined' && GLctx) || null;
      if (!gl) return stringToNewUTF8('');
      var ext = gl.getExtension('WEBGL_debug_renderer_info');
      var s = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      return stringToNewUTF8(String(s || ''));
    } catch (e) {
      return stringToNewUTF8('');
    }
  },
  PocDevice: function () {
    var c = document.querySelector('#unity-canvas');
    var o = {
      ua: navigator.userAgent,
      deviceDpr: window.devicePixelRatio,
      renderDpr: window.__POC_DPR__ || null,
      canvas: c ? c.width + 'x' + c.height : '',
      css: c ? c.clientWidth + 'x' + c.clientHeight : '',
      screen: screen.width + 'x' + screen.height,
      deviceMemory: navigator.deviceMemory || null,
      wasmHeapMB: (typeof HEAP8 !== 'undefined' && HEAP8) ? Math.round(HEAP8.length / 1048576) : null,
      jsHeapMB: (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null)
    };
    return stringToNewUTF8(JSON.stringify(o));
  },
  PocReport: function (ptr) {
    var json = UTF8ToString(ptr);
    console.log('POC_PERF ' + json);
    window.__POC_PERF__ = JSON.parse(json);
    if (window.__pocShowResult) window.__pocShowResult(json);
  }
});
