#!/usr/bin/env node
/* 개발용 Paid 라이선스 검증 스텁.
   JWT/Cloudflare 없이 평문 paid 응답을 돌려준다(플러그인 parseVerifyResponse 경로).

   Figma는 allowedDomains에 127.0.0.1을 거부한다 → localhost + devAllowedDomains 사용.

   사용:
     node scripts/dev-license-server.mjs              # 서버만
     node scripts/dev-license-server.mjs --apply      # VERIFY_URL·manifest 로컬로 맞추고 서버 기동
     node scripts/dev-license-server.mjs --restore    # 설정 원복

   플러그인에 붙여넣을 키: DEV-PAID-LOCAL
*/
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.DEV_LICENSE_PORT || 8787);
// Figma allowedDomains/devAllowedDomains는 localhost만 허용(127.0.0.1 거부).
const HOST = process.env.DEV_LICENSE_HOST || 'localhost';
const KEY = 'DEV-PAID-LOCAL';
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const VERIFY_LOCAL = `http://${HOST}:${PORT}/verify`;
const ORIGIN_LOCAL = `http://${HOST}:${PORT}`;

const CONFIG = path.join(ROOT, 'src/lib/licenseConfig.ts');
const MANIFEST = path.join(ROOT, 'manifest.json');
const BACKUP = path.join(ROOT, '.license-dev-backup.json');

const args = new Set(process.argv.slice(2));

function isLocalDevUrl(u) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(String(u));
}

function applyLocalConfig() {
  const config = fs.readFileSync(CONFIG, 'utf8');
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  if (!fs.existsSync(BACKUP)) {
    const verifyMatch = config.match(/export const VERIFY_URL = '([^']*)'/);
    fs.writeFileSync(
      BACKUP,
      JSON.stringify(
        {
          verifyUrl: verifyMatch?.[1] ?? null,
          allowedDomains: manifest.networkAccess?.allowedDomains ?? [],
          devAllowedDomains: manifest.networkAccess?.devAllowedDomains ?? [],
        },
        null,
        2,
      ),
    );
  }
  const nextConfig = config.replace(
    /export const VERIFY_URL = '[^']*'/,
    `export const VERIFY_URL = '${VERIFY_LOCAL}'`,
  );
  if (nextConfig === config && !config.includes(VERIFY_LOCAL)) {
    throw new Error('licenseConfig.ts VERIFY_URL 교체 실패');
  }
  fs.writeFileSync(CONFIG, nextConfig);

  // 프로덕션 도메인만 allowedDomains에 유지. 로컬은 devAllowedDomains로.
  const allowed = (manifest.networkAccess?.allowedDomains ?? []).filter((d) => !isLocalDevUrl(d));
  const devAllowed = new Set(
    (manifest.networkAccess?.devAllowedDomains ?? []).filter((d) => !isLocalDevUrl(d) || d === ORIGIN_LOCAL),
  );
  devAllowed.add(ORIGIN_LOCAL);
  manifest.networkAccess = {
    ...manifest.networkAccess,
    allowedDomains: allowed.length ? allowed : ['https://license.example.com'],
    devAllowedDomains: [...devAllowed],
  };
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`✓ VERIFY_URL → ${VERIFY_LOCAL}`);
  console.log(`✓ devAllowedDomains += ${ORIGIN_LOCAL}`);
  console.log('  → npm run build 후 플러그인 리로드');
}

function restoreConfig() {
  if (!fs.existsSync(BACKUP)) {
    console.error('백업 없음(.license-dev-backup.json). --apply 한 적이 없거나 이미 원복됨.');
    process.exit(1);
  }
  const bak = JSON.parse(fs.readFileSync(BACKUP, 'utf8'));
  let config = fs.readFileSync(CONFIG, 'utf8');
  if (bak.verifyUrl) {
    config = config.replace(/export const VERIFY_URL = '[^']*'/, `export const VERIFY_URL = '${bak.verifyUrl}'`);
    fs.writeFileSync(CONFIG, config);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const net = { ...manifest.networkAccess, allowedDomains: bak.allowedDomains };
  if (bak.devAllowedDomains?.length) net.devAllowedDomains = bak.devAllowedDomains;
  else delete net.devAllowedDomains;
  manifest.networkAccess = net;
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  fs.unlinkSync(BACKUP);
  console.log('✓ licenseConfig / manifest 원복됨. npm run build 후 리로드.');
}

if (args.has('--restore')) {
  restoreConfig();
  process.exit(0);
}

if (args.has('--apply')) applyLocalConfig();

const server = http.createServer(async (req, res) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    res.end();
    return;
  }
  if (req.method !== 'POST' || (req.url !== '/verify' && req.url !== '/')) {
    res.writeHead(404, { 'Content-Type': 'application/json', ...cors });
    res.end(JSON.stringify({ valid: false, error: 'POST /verify 만 허용' }));
    return;
  }
  let body = '';
  for await (const chunk of req) body += chunk;
  let key = '';
  try {
    key = String(JSON.parse(body || '{}').key || '').trim();
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json', ...cors });
    res.end(JSON.stringify({ valid: false, error: '잘못된 요청 본문' }));
    return;
  }
  if (key !== KEY) {
    res.writeHead(200, { 'Content-Type': 'application/json', ...cors });
    res.end(JSON.stringify({ valid: false, error: '유효하지 않은 개발 키' }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'application/json', ...cors });
  res.end(
    JSON.stringify({
      valid: true,
      tier: 'paid',
      expiresAt: Date.now() + YEAR_MS,
    }),
  );
});

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('개발용 Paid 라이선스 서버');
  console.log(`  URL : ${VERIFY_LOCAL}`);
  console.log(`  키  : ${KEY}`);
  console.log('');
  console.log('플러그인 → 라이선스 키에 위 키를 넣고 「검증」');
  if (!args.has('--apply')) {
    console.log(`설정이 아직이면: node scripts/dev-license-server.mjs --apply`);
  }
});
