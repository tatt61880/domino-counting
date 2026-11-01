import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const distDir = process.argv[2] || 'dist';
const extsToHash = new Set(['.js', '.mjs', '.css']);

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function sha16(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
}

// すでにハッシュ付きの名前なら二重ハッシュしない
function alreadyHasHash(fileBase, ext) {
  const re = new RegExp(`\\.[0-9a-f]{16}\\${ext}$`, 'i');
  return re.test(fileBase + ext);
}

// dist配下の絶対パスをWeb用の相対パスへ変換
function toWebPath(absPath) {
  const rel = path.relative(distDir, absPath);
  return rel.split(path.sep).join('/');
}

function processHtml(filePath, mapping) {
  let html = fs.readFileSync(filePath, 'utf8');

  // src/href の値だけを置換
  html = html.replace(
    /\b(src|href)\s*=\s*(["'])([^"']+)\2/gi,
    (m, attr, quote, url) => {
      const [base, tail = ''] = url.split(/(?=[?#])/);
      const replaced = mapping.get(base) || base;
      return `${attr}=${quote}${replaced}${tail}${quote}`;
    }
  );

  fs.writeFileSync(filePath, html, 'utf8');
}

function main() {
  const files = walk(distDir);
  const mapping = new Map();
  const hashed = new Map();
  const visiting = new Set();

  function hashAsset(abs) {
    if (hashed.has(abs)) return hashed.get(abs);

    const ext = path.extname(abs).toLowerCase();
    const base = path.basename(abs, ext);

    if (alreadyHasHash(base, ext)) return abs;
    if (visiting.has(abs)) {
      throw new Error(`Circular worker dependency: ${abs}`);
    }

    visiting.add(abs);
    let buf = fs.readFileSync(abs);

    if (ext === '.js' || ext === '.mjs') {
      // WorkerのURLは文書基準、importScriptsのURLはWorker基準。
      // 依存先を先に処理し、参照を書き換えてから呼び出し元をハッシュ化。
      const source = buf
        .toString('utf8')
        .replace(
          /(\bnew Worker\(\s*|\b(?:self\.)?importScripts\(\s*)(['"])([^'"]+)\2/g,
          (match, prefix, quote, url) => {
            if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|\/)/i.test(url)) {
              return match;
            }

            const split = url.search(/[?#]/);
            const pathname = split < 0 ? url : url.slice(0, split);
            const tail = split < 0 ? '' : url.slice(split);
            const resolveDir = prefix.includes('importScripts')
              ? path.dirname(abs)
              : path.resolve(distDir);
            const dependency = path.resolve(resolveDir, pathname);

            if (
              !extsToHash.has(path.extname(dependency).toLowerCase()) ||
              !fs.existsSync(dependency)
            ) {
              throw new Error(`Missing worker dependency: ${url} in ${abs}`);
            }

            const renamed = hashAsset(dependency);
            const relative = path
              .relative(resolveDir, renamed)
              .split(path.sep)
              .join('/');

            return `${prefix}${quote}./${relative}${tail}${quote}`;
          }
        );

      buf = Buffer.from(source);
    }

    const newAbs = path.join(path.dirname(abs), `${base}.${sha16(buf)}${ext}`);

    fs.writeFileSync(newAbs, buf);
    fs.unlinkSync(abs);
    hashed.set(abs, newAbs);
    visiting.delete(abs);

    const oldWeb = toWebPath(abs);
    const newWeb = toWebPath(newAbs);

    mapping.set(oldWeb, newWeb);
    mapping.set('./' + oldWeb, './' + newWeb);
    mapping.set('/' + oldWeb, '/' + newWeb);

    return newAbs;
  }

  for (const file of files) {
    const abs = path.resolve(file);
    if (extsToHash.has(path.extname(abs).toLowerCase())) {
      hashAsset(abs);
    }
  }

  // HTMLの参照を書き換える
  for (const abs of walk(distDir)) {
    if (abs.toLowerCase().endsWith('.html')) {
      processHtml(abs, mapping);
    }
  }

  console.log(`hashed files: ${mapping.size / 3} (html rewrite done)`);
}

main();
