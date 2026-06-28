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
`POST /verify` body `{ "key": "...", "instanceName": "..."?, "instanceId": "..."?, "action": "verify"|"deactivate"? }`

**검증(`action` 생략 또는 `"verify"`)**
→ 성공 `{ "token": "<JWT>", "instanceId": "..."? }` · 실패 `{ "valid": false, "error": "..." }`
- `instanceId` 없음 → **activate**(신규 기기 등록, `activation_limit`으로 기기 수 제한). 응답의 `instanceId`를 플러그인이 캐시에 보관.
- `instanceId` 있음 → 해당 기기로 **validate**(재검증). 실패하면 activate로 재등록(한도 적용).

**해제(`action: "deactivate"`)** body `{ "action": "deactivate", "key": "...", "instanceId": "..." }`
→ 성공 `{ "deactivated": true }` · 실패 `{ "deactivated": false, "error": "..." }`
- 이 기기의 활성화 슬롯을 LS에서 반납 → 같은/다른 기기에서 재활성화 가능. 플러그인 「해제」 버튼이 호출(best-effort).

- 모든 응답에 CORS 헤더(`Access-Control-Allow-Origin: *`)를 부여하고 `OPTIONS` 프리플라이트를 처리한다 — 플러그인 UI iframe에서 호출 가능.

> ⚠️ 기기 1대(activation limit=1): instance 없는 validate로 폴백하지 않으므로 한도가 실제로 적용된다. 「해제」가 LS 슬롯을 반납하므로 기기 교체도 플러그인 내에서 처리(포털 수동 해제는 폴백).
