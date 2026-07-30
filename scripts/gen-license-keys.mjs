#!/usr/bin/env node
/* ES256(P-256) 라이선스 서명 키쌍 생성.
   - public JWK  → src/lib/licenseConfig.ts 의 LICENSE_PUBLIC_JWK 에 붙여넣기(플러그인 임베드).
   - private JWK → Cloudflare Worker secret LICENSE_PRIVATE_JWK 로 주입(절대 커밋 금지).
   사용: node scripts/gen-license-keys.mjs */
import { webcrypto as crypto } from 'node:crypto';

const { publicKey, privateKey } = await crypto.subtle.generateKey(
  { name: 'ECDSA', namedCurve: 'P-256' },
  true,
  ['sign', 'verify'],
);

const pub = await crypto.subtle.exportKey('jwk', publicKey);
const priv = await crypto.subtle.exportKey('jwk', privateKey);

// 플러그인에는 검증에 필요한 좌표만 임베드(키 타입/곡선/x/y).
const publicJwk = { kty: pub.kty, crv: pub.crv, x: pub.x, y: pub.y };

console.log('# 1) src/lib/licenseConfig.ts → LICENSE_PUBLIC_JWK 교체:');
console.log(`export const LICENSE_PUBLIC_JWK = ${JSON.stringify(publicJwk)};`);
console.log('\n# 2) Worker secret (커밋 금지):');
console.log('#   npx wrangler secret put LICENSE_PRIVATE_JWK  ↵  아래 한 줄 붙여넣기');
console.log(JSON.stringify(priv));
