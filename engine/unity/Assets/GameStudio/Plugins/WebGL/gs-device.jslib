// T-0022 (MOD-RTM-07, PSC-RTM-01; DTO-RTM-08 device): thông tin thiết bị để chọn tier và ghi vào mẫu đo.
mergeInto(LibraryManager.library, {
  GsDeviceInfo: function () {
    var gpu = '';
    try {
      var gl = (typeof GLctx !== 'undefined' && GLctx) || null;
      if (gl) {
        var ext = gl.getExtension('WEBGL_debug_renderer_info');
        gpu = String((ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) || '');
      }
    } catch (e) {}
    var saved = null;
    try {
      saved = window.localStorage.getItem('gs.tier');
    } catch (e) {}
    var dpr = window.devicePixelRatio || 1;
    var c = document.querySelector('#unity-canvas');
    var o = {
      gpu: gpu,
      deviceMemory: navigator.deviceMemory || 4,
      cores: navigator.hardwareConcurrency || 4,
      screenPx: Math.min(screen.width, screen.height) * dpr,
      saved: saved,
      queryTier: new URLSearchParams(window.location.search).get('tier'),
      ua: navigator.userAgent,
      deviceDpr: dpr,
      renderDpr: window.__GS_DPR__ || null,
      canvas: c ? c.width + 'x' + c.height : '',
      screen: screen.width + 'x' + screen.height,
      wasmHeapMB: typeof HEAP8 !== 'undefined' && HEAP8 ? Math.round(HEAP8.length / 1048576) : null
    };
    return stringToNewUTF8(JSON.stringify(o));
  }
});
