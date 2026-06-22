# 라이선스 검증 Worker (Cloudflare Workers · 무료)

LemonSqueezy 라이선스 키를 검증하고 **ES256 서명 JWT**를 발급한다. 플러그인은 공개키로
토큰을 검증하고 캐시한다(오프라인 grace). 고정비 ~$0(무료 티어), 별도 DB 불필요.

## 1. 서명 키쌍 생성
```
node scripts/gen-license-keys.mjs
```
- 출력된 **public JWK** → `src/lib/licenseConfig.ts`의 `LICENSE_PUBLIC_JWK`에 붙여넣기.
- 출력된 **private JWK** → 아래 Worker secret으로 주입(절대 커밋 금지).

## 2. LemonSqueezy
- 스토어 생성 → **구독(연) 제품** 추가 → **License keys 활성화**, **Activation limit = 1**.
- 결제 페이지(체크아웃) URL → `licenseConfig.ts`의 `PURCHASE_URL`.
- Customer Portal URL → `PORTAL_URL`.

## 3. 배포
```
cd workers/verify
npx wrangler secret put LICENSE_PRIVATE_JWK   # 1)의 private JWK(JSON 한 줄)
npx wrangler secret put ADMIN_KEYS            # (선택) 오너 관리자 키, 쉼표 구분
npx wrangler deploy
```
- `wrangler.toml`의 `LICENSE_ISS`/`LICENSE_AUD`는 `licenseConfig.ts`와 **일치**시킬 것.

## 4. 플러그인 연결
- 배포 후 `*.workers.dev` URL을 `licenseConfig.ts`의 `VERIFY_URL`과
  `manifest.json`의 `networkAccess.allowedDomains`에 반영.

## 5. 테스트
- LemonSqueezy **test mode** 키로 검증 흐름 확인.
- 또는 `ADMIN_KEYS`에 넣은 오너 키로 즉시 `paid` 토큰 발급(스모크 테스트).

## API
`POST /verify` body `{ "key": "...", "instanceName": "..."? }`
→ 성공 `{ "token": "<JWT>" }` · 실패 `{ "valid": false, "error": "..." }`

> ⚠️ 기기 1대(activation limit=1): 기기 교체 시 LS에서 기존 instance 해제 후 재활성화.
