/**
 * Must load after axios, before config_api.js — rewrites CDN API to same-origin /managements/ proxy.
 */
(function () {
  const host = location.hostname;
  if (/^sanpham\.starglobal3d\.(vn|com)$/i.test(host)) return;
  if (typeof axios === 'undefined') return;

  const CDN_HOSTS = ['sanpham.starglobal3d.vn', 'sanpham.starglobal3d.com'];

  /** Only rewrite /managements/ API paths — leave tour XML/assets on CDN (krpano XHR). */
  function rewriteApiUrl(url) {
    if (typeof url !== 'string') return url;
    for (const h of CDN_HOSTS) {
      for (const scheme of ['https://', 'http://']) {
        const prefix = `${scheme}${h}`;
        if (url.startsWith(prefix)) {
          const path = url.slice(prefix.length);
          if (path.startsWith('/managements/')) return path;
          return url;
        }
      }
    }
    return url;
  }

  function patchInstance(instance) {
    if (!instance || instance._localAxiosPatched) return instance;
    instance._localAxiosPatched = true;
    if (instance.defaults?.baseURL) {
      instance.defaults.baseURL = rewriteApiUrl(instance.defaults.baseURL);
    }
    instance.interceptors.request.use((config) => {
      if (config.baseURL) config.baseURL = rewriteApiUrl(config.baseURL);
      if (config.url) config.url = rewriteApiUrl(config.url);
      return config;
    });
    return instance;
  }

  patchInstance(axios);

  const origCreate = axios.create.bind(axios);
  axios.create = function (config) {
    const cfg = config ? { ...config } : {};
    if (cfg.baseURL) cfg.baseURL = rewriteApiUrl(cfg.baseURL);
    return patchInstance(origCreate(cfg));
  };
  axios.create._localAxiosPatched = true;
})();
