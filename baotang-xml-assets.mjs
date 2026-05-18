/**
 * Trích đường dẫn asset từ XML tour (url="" và set(layer…url,%FIRSTXML%/…)).
 */
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

const SKIP_PATH_RE = /graphics\/textfield\.swf$/i;

export async function pathsFromXmlAssets(dir, baseUrlPath) {
  const paths = new Set();
  let files;
  try {
    files = await readdir(dir, { recursive: true });
  } catch {
    return [];
  }

  const addAssetPath = (raw) => {
    let u = raw.replace(/%FIRSTXML%/g, baseUrlPath).replace(/^\.\//, '');
    if (!u || u.includes('%') || /^https?:/i.test(u)) return;
    if (!/\.(png|jpg|jpeg|gif|swf|js|xml|mp3)$/i.test(u)) return;
    if (u.startsWith(baseUrlPath)) u = '/' + u;
    else if (!u.startsWith('/')) u = '/' + baseUrlPath + '/' + u.replace(/^\/+/, '');
    if (!u.startsWith('/')) u = '/' + u;
    if (SKIP_PATH_RE.test(u)) return;
    paths.add(u);
  };

  for (const f of files) {
    if (!String(f).endsWith('.xml')) continue;
    const text = await readFile(join(dir, f), 'utf8');
    for (const m of text.matchAll(/url="([^"]+)"/g)) addAssetPath(m[1]);
    for (const m of text.matchAll(
      /%FIRSTXML%\/((?:skin|plugins)[^"'\s%)]+\.(?:png|jpg|jpeg|gif|swf|js))/gi
    )) {
      addAssetPath(`${baseUrlPath}/${m[1]}`);
    }
  }
  return [...paths];
}
