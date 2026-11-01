#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
//  단일 파일 빌드: CSS·JS를 index.html 안에 인라인합니다.
//    node tools/build.js                 → dist/lantern-keeper.html (독립 실행 파일)
//    node tools/build.js --fragment out  → <html>/<head>/<body> 없이 본문만 (임베드용)
// ─────────────────────────────────────────────────────────────
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const fragment = args.includes('--fragment');
const outArg = args.filter((a) => !a.startsWith('--'))[0];
const out = outArg ? path.resolve(outArg) : path.join(ROOT, 'dist', fragment ? 'lantern-keeper.fragment.html' : 'lantern-keeper.html');

let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

html = html.replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g, (_, href) => `<style>\n${read(href)}\n</style>`);
const scripts = [];
html = html.replace(/<script src="(js\/[^"]+)"><\/script>\n?/g, (_, src) => { scripts.push(read(src)); return ''; });
// 하나의 스크립트로 합쳐 전역 const 들이 한 범위를 공유하도록
// 치환 문자열의 $$·$& 해석을 피하려고 함수 형태로 치환
html = html.replace('</body>', () => `<script>\n${scripts.join('\n;\n')}\n</script>\n</body>`);

if (fragment) {
  const head = html.match(/<head>([\s\S]*?)<\/head>/)[1]
    .replace(/<meta charset[^>]*>\s*/, '')
    .replace(/<meta name="viewport"[^>]*>\s*/, '');
  const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
  html = `${head.trim()}\n${body.trim()}\n`;
}

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`built ${path.relative(process.cwd(), out)} (${(html.length / 1024).toFixed(1)} KB)`);
