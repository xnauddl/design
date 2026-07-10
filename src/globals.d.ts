/* 빌드 타임 상수(esbuild define). 개발 빌드에서만 true.
   true일 때만 개발용 티어 강제 토글(SET_LICENSE)이 활성 — 배포 빌드 백도어 차단. */
declare const __DEV__: boolean;
