/**
 * Trích URL path từ Tour360.xml (Panotour / krpano).
 */
export function pathsFromTour360Xml(xml, basePath = '/Tour360data') {
  const paths = new Set();
  const tileSize = 512;

  for (const f of [
    'Tour360_skin.xml',
    'Tour360_core.xml',
    'Tour360_messages_vi.xml',
    'Tour360_messages_en.xml',
    'Tour360_vr.xml',
  ]) {
    paths.add(`${basePath}/${f}`);
  }

  const sceneBlocks = xml.split(/<scene name="/).slice(1);
  for (const block of sceneBlocks) {
    const dirM =
      block.match(/%FIRSTXML%\/([^/"']+)\/thumbnail\.jpg/i) ||
      block.match(/thumburl="%FIRSTXML%\/([^"]+)"/i);
    if (!dirM) continue;
    const dir = dirM[1].replace(/\/thumbnail\.jpg$/i, '');
    paths.add(`${basePath}/${dir}/thumbnail.jpg`);
    paths.add(`${basePath}/${dir}/preview.jpg`);

    for (const lm of block.matchAll(
      /<level tiledimagewidth="(\d+)"[^>]*>([\s\S]*?)<\/level>/g
    )) {
      const w = Number(lm[1]);
      const n = Math.ceil(w / tileSize);
      const faces = [...lm[2].matchAll(/url="([^"]*)\/(\d+)\/(\d+)\/%v_%u\.jpg"/g)];
      for (const [, prefix, face, levelNum] of faces) {
        const root = prefix.startsWith(basePath)
          ? prefix
          : `${basePath}/${prefix.replace(/^\/+/, '')}`;
        for (let v = 0; v < n; v++) {
          for (let u = 0; u < n; u++) {
            paths.add(`${root}/${face}/${levelNum}/${v}_${u}.jpg`);
          }
        }
      }
    }
  }

  for (const m of xml.matchAll(/url="([^"]+)"/g)) {
    let u = m[1].replace(/%FIRSTXML%/g, basePath);
    if (u.includes('%') || /^https?:/i.test(u)) continue;
    if (!/\.(jpg|jpeg|png|gif|swf|js|xml|mp3|m4a|cur|woff2?)$/i.test(u)) continue;
    if (!u.startsWith('/')) u = `${basePath}/${u.replace(/^\/+/, '')}`;
    paths.add(u);
  }

  return [...paths];
}

export function pathsFromIndexHtml(html, basePath = '/Tour360data') {
  const paths = new Set();
  for (const m of html.matchAll(
    /(?:href|src|data-thumb)=["']((?:Tour360data|apple-touch|favicon)[^"']+)["']/gi
  )) {
    let p = m[1];
    if (p.startsWith('Tour360data')) p = '/' + p;
    paths.add(p);
  }
  for (const m of html.matchAll(/url\((Tour360data\/[^)]+)\)/gi)) {
    paths.add('/' + m[1]);
  }
  return [...paths];
}
