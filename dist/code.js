"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __objRest = (source, exclude) => {
    var target = {};
    for (var prop in source)
      if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0)
        target[prop] = source[prop];
    if (source != null && __getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(source)) {
        if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop))
          target[prop] = source[prop];
      }
    return target;
  };

  // src/shared/messages.ts
  function post(msg) {
    figma.ui.postMessage(msg);
  }

  // src/lib/i18n.ts
  var STRINGS = {
    // 공통 진행/상태
    "common.applyingVars": "\uBCC0\uC218\uC5D0 \uC801\uC6A9 \uC911\u2026",
    "common.exporting": "\uB0B4\uBCF4\uB0B4\uB294 \uC911\u2026",
    "common.verifying": "\uAC80\uC99D \uC911\u2026",
    "common.running": "\uC2E4\uD589 \uC911\u2026",
    // 팔레트
    "palette.invalidHex": "\uBE0C\uB79C\uB4DC\uC0C9\uC744 #RRGGBB \uD615\uC2DD\uC73C\uB85C \uC785\uB825\uD558\uC138\uC694.",
    "palette.invalidHex2": "\uBCF4\uC870\uC0C9\uC744 #RRGGBB \uD615\uC2DD\uC73C\uB85C \uC785\uB825\uD558\uC138\uC694.",
    "palette.summary": "{count}\uACC4\uC5F4 \xB7 {tokens}\uC0C9 \uC0DD\uC131",
    // 추출 / 토큰 생성
    "create.preview": "\uBBF8\uB9AC\uBCF4\uAE30 \u2014 {summary} \xB7 \u2018\uC801\uC6A9\u2019\uC73C\uB85C \uBC18\uC601",
    "create.colorsDone": "\uC0C9 \uBCC0\uC218 {count}\uAC1C \uC774\uBBF8 \uC0DD\uC131\uB428 \xB7 \uC5EC\uAE30\uC120 \uC0C9 \uC678\uB9CC",
    "color.summary": "\uC0C9 {count}\uAC1C \xB7 Semantic \uC9C0\uC815 {roles} \xB7 \uBCC0\uC218\uD654 \uB300\uAE30",
    "color.needColors": "\uBA3C\uC800 \u2018\uC120\uD0DD\uC5D0\uC11C \uCD94\uCD9C\u2019\uC774\uB098 \u2018\uD314\uB808\uD2B8 \uC0DD\uC131\u2019\uC73C\uB85C \uC0C9\uC744 \uBAA8\uC544 \uC8FC\uC138\uC694",
    "color.fileVars": "\uD30C\uC77C\uC5D0 \uC0C9 \uBCC0\uC218 {n}\uAC1C \xB7 Semantic {roles}\uAC1C \u2014 \u2018\uC120\uD0DD\uC5D0\uC11C \uCD94\uCD9C\u2019\uC744 \uB204\uB974\uBA74 \uD604\uC7AC \uD654\uBA74\uC758 \uC0C9\uC744 \uC77D\uC5B4\uC694",
    "create.fileVars": "\uD30C\uC77C\uC5D0 \uAC04\uACA9\xB7\uD06C\uAE30\xB7\uD3F0\uD2B8 \uBCC0\uC218 {n}\uAC1C \u2014 \u2018\uBBF8\uB9AC\uBCF4\uAE30\u2019\uB97C \uB204\uB974\uBA74 \uD604\uC7AC \uD654\uBA74\uC758 \uAC12\uC744 \uC77D\uC5B4\uC694",
    // 지나친 이유조차 없는 빈손 — 버튼이 고장 난 것처럼 보이지 않게 최소한의 말은 한다.
    "color.extractEmpty": "\uACE0\uB97C \uAC12\uC744 \uCC3E\uC9C0 \uBABB\uD588\uC5B4\uC694 \u2014 \uC0C9\xB7\uC5EC\uBC31\xB7\uD06C\uAE30\uAC00 \uC788\uB294 \uD504\uB808\uC784\uC774\uB098 \uB808\uC774\uC5B4\uB97C \uC120\uD0DD\uD558\uC138\uC694.",
    "create.baseChanged": "base {base}px\uB85C \uB2E4\uC2DC \uACC4\uC0B0 \uC911\u2026",
    // 시맨틱 매핑
    "semantic.formatHint": "\uB9E4\uD551\uC744 \uD55C \uC904\uC5D0 \u201CSemantic = Global\uBCC0\uC218\uC774\uB984\u201D \uD615\uC2DD\uC73C\uB85C \uC785\uB825\uD558\uC138\uC694.",
    "semantic.result": "\uC2DC\uB9E8\uD2F1 {aliased}\uAC1C \uBCC4\uCE6D (\uC0DD\uC131 {created} / \uAC31\uC2E0 {updated})",
    "semantic.missing": " \xB7 \uB204\uB77D: {names}",
    // 바인딩(적용)
    "apply.cancelRequested": "\uCDE8\uC18C\uD558\uB294 \uC911\u2026",
    // 연결 목록의 속성 이름 — API 필드명 대신 디자인 말(원래 이름은 툴팁으로).
    "bind.layerSelectTip": "\uB204\uB974\uBA74 \uCE94\uBC84\uC2A4\uC5D0\uC11C \uC774 \uB808\uC774\uC5B4\uB97C \uC120\uD0DD\uD574\uC694",
    // 리네임
    "rename.none": "\uBC14\uAFC0 \uC774\uB984\uC774 \uC5C6\uC5B4\uC694",
    // 마법사
    // 다크 테마 생성
    "dark.title": "\uB2E4\uD06C \uBAA8\uB4DC",
    "dark.hint": "Global \uC0C9\uC758 \uBC1D\uAE30\uB97C \uB4A4\uC9D1\uC5B4 Dark \uCE78\uC5D0 \uCC44\uC6CC\uC694",
    "dark.hintTip": "\uC0C9\uC0C1 \xB7 \uCC44\uB3C4\uB294 \uADF8\uB300\uB85C \uB450\uACE0 \uBC1D\uAE30\uB9CC \uB4A4\uC9D1\uC5B4\uC694. \uD50C\uB7EC\uADF8\uC778 Global\uC758 \uC0C9\uB9CC \uCC44\uC6B0\uACE0, \uC9C1\uC811 \uB9CC\uB4E0 \uBCC0\uC218 \xB7 \uB2E4\uB978 \uBCC0\uC218\uB97C \uAC00\uB9AC\uD0A4\uB294 \uBCC0\uC218 \xB7 \uC9C1\uC811 \uACE0\uCE5C Dark \uCE78\uC740 \uADF8\uB300\uB85C \uB46C\uC694.",
    "dark.genBtn": "\uB2E4\uD06C \uB9CC\uB4E4\uAE30",
    // 내보내기
    "export.saved": "{format} \u2014 {file}\uB85C \uC800\uC7A5\uD588\uC5B4\uC694.",
    "export.empty": "\uB0B4\uBCF4\uB0BC \uBCC0\uC218\uAC00 \uC5C6\uC5B4\uC694. \uBA3C\uC800 \uD1A0\uD070\uC744 \uB9CC\uB4DC\uC138\uC694.",
    "export.clash": "Global\uACFC \uC774\uB984\uC774 \uAC19\uC740 Semantic {n}\uAC1C\uB294 Global \uAC12\uB9CC \uB0C8\uC5B4\uC694: {names}",
    "export.dupGlobal": 'Global\uB07C\uB9AC \uC774\uB984\uC774 \uAC19\uC740 {n}\uAC1C\uB294 "{col}" \uAC83\uB9CC \uB0C8\uC5B4\uC694: {names}',
    "export.dupGlobalMixed": "Global\uB07C\uB9AC \uC774\uB984\uC774 \uAC19\uC740 {n}\uAC1C\uB294 \uC55E \uCEEC\uB809\uC158 \uAC83\uB9CC \uB0C8\uC5B4\uC694: {names}",
    // 라이선스
    "license.needKey": "\uB77C\uC774\uC120\uC2A4 \uD0A4\uB97C \uC785\uB825\uD558\uC138\uC694.",
    // 유료 게이팅
    // 마법사 단계 라벨(WIZARD_STEPS id 기준) + 건너뜀 사유
    "wizard.step.create": "\uB9CC\uB4E4\uAE30",
    "wizard.step.dark": "\uB2E4\uD06C \uBAA8\uB4DC",
    "wizard.step.textStyles": "\uD14D\uC2A4\uD2B8 \uC2A4\uD0C0\uC77C",
    "wizard.step.bind": "\uC5F0\uACB0",
    "wizard.step.rename": "\uC774\uB984 \uC815\uB9AC",
    // 역할 매핑 단계 — 쓰임 역할은 만들기 단계가 이미 만들었을 때(§2.12 12.10).
    // 바인딩 스킵 사유(라벨 맵)
    "reason.no-match": "\uB9E4\uCE6D \uC5C6\uC74C",
    "reason.already-bound": "\uC774\uBBF8 \uC5F0\uACB0\uB428",
    "reason.styled": "\uC2A4\uD0C0\uC77C \uC0AC\uC6A9 \uC911",
    "reason.deleted-var": "\uC0AD\uC81C\uB41C \uBCC0\uC218\uC5D0 \uC5F0\uACB0\uB428",
    "reason.changed": "\uADF8 \uC0AC\uC774 \uBC14\uB01C",
    "reason.empty-text": "\uBE48 \uD14D\uC2A4\uD2B8",
    "reason.error": "\uC5F0\uACB0 \uC2E4\uD328",
    "reason.hug-fill": "HUG/FILL",
    "reason.no-autolayout": "\uC624\uD1A0\uB808\uC774\uC544\uC6C3 \uC544\uB2D8",
    "reason.size-free-layout": "\uC790\uC720 \uBC30\uCE58(\uD06C\uAE30 \uC81C\uC678)",
    "reason.size-fraction": "\uC18C\uC218 \uD06C\uAE30(\uC815\uD655 \uC77C\uCE58\uB9CC)",
    "reason.hidden": "\uC228\uAE34 \uB808\uC774\uC5B4",
    "reason.instance-children": "\uC778\uC2A4\uD134\uC2A4 \uB0B4\uBD80",
    "reason.library-main": "\uB77C\uC774\uBE0C\uB7EC\uB9AC \uCEF4\uD3EC\uB10C\uD2B8",
    "reason.font": "\uD3F0\uD2B8 \uBBF8\uB85C\uB4DC",
    "reason.space-between": "\uC0AC\uC774 \uAC04\uACA9 \uC790\uB3D9",
    "reason.fraction": "\uC18C\uC218 \uAC12(\uC815\uC218\uB9CC)",
    // 마법사 시퀀서 단계 결과
    "wizard.seq.stoppedPrev": "\uC774\uC804 \uB2E8\uACC4 \uC911\uB2E8\uC73C\uB85C \uAC74\uB108\uB700",
    "wizard.seq.createDone": "\uC0DD\uC131 {created} \xB7 \uAC31\uC2E0 {updated}",
    "wizard.seq.dark": "\uB2E4\uD06C \uAC12 {filled}\uAC1C \uCC44\uC6C0",
    "wizard.seq.darkModeCreated": " \xB7 \uB2E4\uD06C \uBAA8\uB4DC \uCD94\uAC00",
    "wizard.seq.darkKept": " \xB7 \uC9C1\uC811 \uACE0\uCE5C \uC0C9 {n}\uAC1C\uB294 \uADF8\uB300\uB85C",
    "wizard.seq.darkUpToDate": "Dark \uCE78\uC774 \uBAA8\uB450 \uCC44\uC6CC\uC838 \uC788\uC74C",
    "wizard.seq.darkMigrate": "\uB2E4\uD06C \uAD6C\uC870\uB97C \uC62E\uACA8\uC57C \uD574\uC694 \u2014 \uD14C\uB9C8 \uD654\uBA74\uC5D0\uC11C [\uB2E4\uD06C \uB9CC\uB4E4\uAE30]\uB97C \uB20C\uB7EC \uC8FC\uC138\uC694",
    "wizard.seq.darkNoTarget": "\uD50C\uB7EC\uADF8\uC778 Global\uC774 \uC5C6\uC5B4 \uAC74\uB108\uB700 \u2014 \uBA3C\uC800 \uD1A0\uD070\uC744 \uB9CC\uB4DC\uC138\uC694",
    "wizard.seq.darkNothing": "\uCC44\uC6B8 \uC0C9\uC774 \uC5C6\uC74C \u2014 \uD50C\uB7EC\uADF8\uC778 Global\uC5D0 \uAC12\uC744 \uB123\uC740 \uC0C9 \uBCC0\uC218\uAC00 \uD544\uC694\uD574\uC694",
    "wizard.seq.textStyles": "\uC2A4\uD0C0\uC77C \uC0DD\uC131 {created} \xB7 \uAC31\uC2E0 {updated}",
    "wizard.seq.textStylesLinked": " \xB7 \uAE00\uC790 {a}\uAC1C\uC5D0 \uC5F0\uACB0",
    "wizard.seq.textStylesMissing": " \xB7 \uC54C\uB9BC {k}\uAC1C",
    "wizard.seq.renameDone": "{count}\uAC1C \uC774\uB984 \uC801\uC6A9",
    "wizard.seq.bindDone": "{n}\uACF3 \uC5F0\uACB0",
    "wizard.seq.bindRoles": " \xB7 \uC0C8 Semantic {k}\uAC1C",
    "wizard.seq.bindTs": " \xB7 Text Style {t}\uACF3",
    "wizard.seq.bindTsOnly": "Text Style {t}\uACF3 \uC5F0\uACB0",
    "wizard.seq.bindNoneOn": "\uC5F0\uACB0\uD560 \uCF20 \uAC12\uC774 \uC5C6\uC5B4\uC694",
    "wizard.seq.bindTsFail": " \xB7 \uD14D\uC2A4\uD2B8 \uC2A4\uD0C0\uC77C \uC5F0\uACB0 \uBABB \uD568",
    "wizard.seq.bindNone": "\uC5F0\uACB0 0\uACF3 \u2014 \uBCC0\uC218\uC640 \uAC12\uC774 \uAC19\uC740 \uACF3\uC774 \uC5C6\uC5B4\uC694",
    "wizard.seq.bindAllBound": "\uC5F0\uACB0 0\uACF3 \u2014 \uC774\uBBF8 \uBAA8\uB450 \uC5F0\uACB0\uB3FC \uC788\uC5B4\uC694",
    "wizard.seq.bindAllOff": "\uC5F0\uACB0 0\uACF3 \u2014 \uB0A8\uC740 \uACF3\uC740 \uB048 \uAC12\uC774\uC5D0\uC694",
    "wizard.seq.bindNoTier": "\uC5F0\uACB0 0\uACF3 \u2014 \uACC4\uCE35\uC73C\uB85C \uC4F8 \uBCC0\uC218\uAC00 \uC5C6\uC5B4\uC694",
    // 마법사 완료 요약(summarize, wizard.ts)
    /* ---------- 정적 HTML 라벨(ui.html, data-i18n[-html]) ---------- */
    "common.cancel": "\uCDE8\uC18C",
    "v4.colEmpty": "\uC774 \uCEEC\uB809\uC158\uC5D4 \uBCC0\uC218\uAC00 \uC5C6\uC5B4\uC694",
    "apply.done": "\uB808\uC774\uC5B4 {n}\uAC1C\uC5D0 {name} \uC5F0\uACB0",
    "apply.skipped": " \xB7 {m}\uAC1C\uB294 \uB9DE\uC9C0 \uC54A\uC544 \uAC74\uB108\uB700",
    "apply.undo": " \xB7 \u2318Z\uB85C \uB418\uB3CC\uB9AC\uAE30",
    "apply.none": "\uC120\uD0DD\uD55C \uB808\uC774\uC5B4\uC5D0 {name}\uC744 \uBD99\uC77C \uACF3\uC774 \uC5C6\uC5B4\uC694",
    "apply.otherKind": "\uC774 \uBCC0\uC218\uB294 \uBD99\uC77C \uC18D\uC131\uC744 \uC815\uD560 \uC218 \uC5C6\uC5B4\uC694",
    "apply.failed": "\uC5F0\uACB0\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694",
    "apply.elsewhere": "\uB2E4\uB978 \uACF3\uC5D0 \uC5F0\uACB0",
    "apply.notInScope": "\uC774 \uBCC0\uC218\uC758 \uC6A9\uB3C4\uC5D0 \uC5C6\uC5B4\uC694",
    "apply.t.fill": "\uCC44\uC6C0",
    "apply.t.stroke": "\uC120 \uC0C9",
    "apply.t.text": "\uAE00\uC790 \uC0C9",
    "apply.t.shadow": "\uADF8\uB9BC\uC790 \uC0C9",
    "apply.t.gap": "\uAC04\uACA9",
    "apply.t.padding": "\uC548\uCABD \uC5EC\uBC31(4\uBC29\uD5A5)",
    "apply.t.padding-top": "\uC704",
    "apply.t.padding-bottom": "\uC544\uB798",
    "apply.t.padding-left": "\uC67C\uCABD",
    "apply.t.padding-right": "\uC624\uB978\uCABD",
    "apply.t.radius": "\uBAA8\uC11C\uB9AC 4\uACF3",
    "apply.t.radius-tl": "\uC67C\uCABD \uC704",
    "apply.t.radius-tr": "\uC624\uB978\uCABD \uC704",
    "apply.t.radius-bl": "\uC67C\uCABD \uC544\uB798",
    "apply.t.radius-br": "\uC624\uB978\uCABD \uC544\uB798",
    "apply.reason.no-scope": "\uC6A9\uB3C4\uC5D0 \uB9DE\uB294 \uC18D\uC131\uC774 \uC5C6\uC74C",
    "apply.reason.no-prop": "\uADF8 \uC18D\uC131\uC774 \uC5C6\uB294 \uB808\uC774\uC5B4",
    "apply.reason.not-autolayout": "\uC624\uD1A0 \uB808\uC774\uC544\uC6C3 \uC544\uB2D8",
    "apply.reason.no-stroke": "\uBCF4\uC774\uB294 \uC120 \uC5C6\uC74C",
    "apply.reason.no-shadow": "\uADF8\uB9BC\uC790 \uC5C6\uC74C",
    "apply.reason.font": "\uAE00\uAF34\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD568",
    "apply.reason.empty-text": "\uBE48 \uAE00\uC790",
    "apply.reason.other-kind": "\uBD99\uC77C \uC18D\uC131\uC744 \uC815\uD560 \uC218 \uC5C6\uC74C",
    "apply.reason.error": "\uD53C\uADF8\uB9C8\uAC00 \uAC70\uC808\uD568",
    "vm.duplicate": "\uBCF5\uC81C",
    "vm.delete": "\uC0AD\uC81C",
    "vm.copiedShort": "\uBCF5\uC0AC\uB428",
    "vm.copyFailedShort": "\uBCF5\uC0AC \uBABB \uD568",
    "list.colorGrid": "\uC0C9 \uACA9\uC790\uB85C \uBCF4\uAE30",
    "list.colorList": "\uC0C9 \uBAA9\uB85D\uC73C\uB85C \uBCF4\uAE30",
    "list.addNew": "\uC0C8 \uBCC0\uC218",
    "list.addFromSel": "\uC120\uD0DD\uC5D0\uC11C \uBCC0\uC218 \uB9CC\uB4E4\uAE30\u2026",
    "list.addDark": "\uB2E4\uD06C \uBAA8\uB4DC \uB9CC\uB4E4\uAE30\u2026",
    "list.addTextStyles": "\uD14D\uC2A4\uD2B8 \uC2A4\uD0C0\uC77C \uB9CC\uB4E4\uAE30\u2026",
    "newVar.type": "\uD0C0\uC785",
    "newVar.tColor": "\uC0C9",
    "newVar.tNumber": "\uC22B\uC790",
    "newVar.tString": "\uAE00\uC790",
    "newVar.tBool": "\uCC38\uAC70\uC9D3",
    "newVar.create": "\uB9CC\uB4E4\uAE30",
    "newVar.creating": "\uB9CC\uB4DC\uB294 \uC911\u2026",
    "newVar.created": "\uBCC0\uC218\uB97C \uB9CC\uB4E4\uC5C8\uC5B4\uC694 \xB7 \u2318Z\uB85C \uB418\uB3CC\uB9AC\uAE30",
    "newVar.failed": "\uB9CC\uB4E4\uC9C0 \uBABB\uD588\uC5B4\uC694",
    "newVar.dupFailed": "\uBCF5\uC81C\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694",
    "newVar.newCollection": "Variables (\uC0C8\uB85C \uB9CC\uB4E6)",
    "del.title": "{name} \uBCC0\uC218\uB97C \uC9C0\uC6B8\uAE4C\uC694?",
    "del.aliases": "\uC774 \uBCC0\uC218\uB97C \uAC00\uB9AC\uD0A4\uB294 \uBCC0\uC218 {m}\uAC1C\uB294 '\uC0AD\uC81C\uB41C \uBCC0\uC218'\uB97C \uAC00\uB9AC\uD0A4\uAC8C \uB3FC\uC694",
    "del.layers": "\uC5F0\uACB0\uB41C \uB808\uC774\uC5B4 \xB7 \uC2A4\uD0C0\uC77C\uC740 '\uC0AD\uC81C\uB41C \uBCC0\uC218'\uAC00 \uB3FC\uC694",
    "del.confirm": "\uC0AD\uC81C",
    "del.done": "\uBCC0\uC218\uB97C \uC9C0\uC6E0\uC5B4\uC694 \xB7 \u2318Z\uB85C \uB418\uB3CC\uB9AC\uAE30",
    "del.failed": "\uC9C0\uC6B0\uC9C0 \uBABB\uD588\uC5B4\uC694",
    "detail.selectAll": "\uBAA8\uB450 \uC120\uD0DD",
    "detail.usesNoSel": "\uB808\uC774\uC5B4\uB97C \uC120\uD0DD\uD558\uBA74 \uADF8 \uC548\uC5D0\uC11C \uCC3E\uC544\uC694",
    "edit.goTarget": "\uAC00\uB9AC\uD0A4\uB294 \uBCC0\uC218\uB85C",
    "edit.pickShowOther": "\uC6A9\uB3C4\uAC00 \uB2E4\uB978 \uBCC0\uC218\uB3C4 \uBCF4\uAE30 ({n}\uAC1C)",
    "edit.pickShowFit": "\uC6A9\uB3C4\uAC00 \uB9DE\uB294 \uBCC0\uC218\uB9CC \uBCF4\uAE30",
    "edit.pickOtherScope": "\uC6A9\uB3C4 \uB2E4\uB984",
    "op.applyVar": "\uD074\uB9AD \uC5F0\uACB0",
    "op.createVar": "\uC0C8 \uBCC0\uC218",
    "op.dupVar": "\uBCF5\uC81C",
    "op.delVar": "\uC0AD\uC81C",
    "create.sumManual": " \xB7 \uC9C1\uC811 \uB9CC\uB4E0 \uBCC0\uC218\uB77C \uAC74\uB108\uB700 {n}",
    "common.close": "\uB2EB\uAE30",
    // 변수 관리(넓은 화면)
    "vm.search": "\uBCC0\uC218 \uAC80\uC0C9",
    "vm.copyName": "\uC774\uB984 \uBCF5\uC0AC",
    "vm.copyCss": "CSS \uBCC0\uC218\uBA85 \uBCF5\uC0AC",
    "vm.detail": "\uC0C1\uC138",
    // 변수 고치기(§4.4 고치기, PR 3.5)
    "edit.name": "\uC774\uB984",
    "edit.nameAria": "\uC774\uB984(\uC804\uCCB4 \uACBD\uB85C)",
    "edit.valueAria": "{mode} \uAC12",
    "edit.save": "\uC800\uC7A5",
    "edit.savingBtn": "\uC800\uC7A5 \uC911\u2026",
    "edit.saving": "\uC800\uC7A5 \uC911\uC774\uC5D0\uC694",
    "edit.noChange": "\uACE0\uCE5C \uAC83\uC774 \uC5C6\uC5B4\uC694",
    "edit.checkInput": "\uC785\uB825\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694",
    "edit.deleted": "\uBCC0\uC218\uAC00 \uC0AD\uC81C\uB410\uC5B4\uC694",
    "edit.conflict": "\uB2E4\uB978 \uACF3\uC5D0\uC11C \uBC14\uB00C\uC5C8\uC5B4\uC694 \xB7 \uB2EB\uACE0 \uB2E4\uC2DC \uC5F4\uC5B4 \uC8FC\uC138\uC694",
    "edit.maybeSaved": "\uC800\uC7A5\uB410\uC744 \uC218 \uC788\uC5B4\uC694 \xB7 \uB2EB\uACE0 \uB2E4\uC2DC \uC5F4\uC5B4 \uC8FC\uC138\uC694",
    "edit.partial": "\uC77C\uBD80\uB9CC \uC800\uC7A5\uB410\uC5B4\uC694",
    "edit.closedMissing": "{name}\uC740 \uC9C0\uAE08 \uBAA9\uB85D\uC5D0 \uBCF4\uC774\uC9C0 \uC54A\uC544\uC694",
    "edit.closedPartialMissing": "\uC77C\uBD80\uB9CC \uC800\uC7A5\uB410\uC5B4\uC694 \xB7 {name}\uC740 \uC9C0\uAE08 \uBAA9\uB85D\uC5D0 \uBCF4\uC774\uC9C0 \uC54A\uC544\uC694",
    "edit.nameEmptySeg": "\uC774\uB984\uC758 '/' \uC0AC\uC774\uAC00 \uBE44\uC5B4 \uC788\uC5B4\uC694",
    "edit.nameDup": "\uC774 \uCEEC\uB809\uC158\uC5D0 \uAC19\uC740 \uC774\uB984\uC774 \uC788\uC5B4\uC694",
    "edit.nameRejected": "\uD53C\uADF8\uB9C8\uAC00 \uC774 \uC774\uB984\uC744 \uBC1B\uC9C0 \uC54A\uC544\uC694",
    "edit.valueRejected": "\uD53C\uADF8\uB9C8\uAC00 \uC774 \uAC12\uC744 \uBC1B\uC9C0 \uC54A\uC544\uC694",
    "edit.saveFailed": "\uC800\uC7A5\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694",
    "edit.errColor": "#RRGGBB \uD615\uC2DD\uC73C\uB85C \uC801\uC5B4 \uC8FC\uC138\uC694",
    "edit.errNumber": "\uC22B\uC790\uB97C \uC801\uC5B4 \uC8FC\uC138\uC694",
    "edit.errNeedValue": "\uAC12\uC744 \uC801\uC5B4 \uC8FC\uC138\uC694",
    "edit.targetDeleted": "\uAC00\uB9AC\uD0A4\uB358 \uBCC0\uC218\uAC00 \uC0AD\uC81C\uB410\uC5B4\uC694",
    "edit.deletedTarget": "(\uC0AD\uC81C\uB41C \uBCC0\uC218)",
    "edit.changesHead": "\uC800\uC7A5\uD558\uBA74 \uBC14\uB00C\uB294 \uAC83",
    "edit.groupMove": "\uADF8\uB8F9 \uC774\uB3D9: {from} \u2192 {to}",
    "edit.newGroup": "(\uC0C8 \uADF8\uB8F9)",
    "edit.groupEmptied": "\xB7 {group} \uADF8\uB8F9\uC740 \uBE44\uC5B4\uC11C \uC0AC\uB77C\uC838\uC694",
    "edit.cssLabel": "CSS:",
    "edit.cssClash": "\xB7 {name}\uACFC CSS \uC774\uB984\uC774 \uAC19\uC544\uC838\uC694",
    "edit.pickAria": "{mode} \uBCC4\uCE6D \uACE0\uB974\uAE30",
    "edit.pickSearch": "\uBCC0\uC218 \uC774\uB984\uC73C\uB85C \uCC3E\uAE30",
    "edit.writeValue": "\uAC12\uC73C\uB85C \uC801\uAE30",
    "edit.pickGlobal": "Global\uC740 \uB2E4\uB978 \uBCC0\uC218\uB97C \uAC00\uB9AC\uD0A4\uC9C0 \uC54A\uC544\uC694",
    "edit.pickAllTiers": "\uACC4\uCE35\uC774 \uC5C6\uB294 \uCEEC\uB809\uC158\uC774\uB77C \uBAA8\uB4E0 \uBCC0\uC218\uB97C \uBCF4\uC5EC\uC694",
    "edit.pickNoLib": "\uB77C\uC774\uBE0C\uB7EC\uB9AC \uBCC0\uC218\uB294 \uB300\uC0C1\uC73C\uB85C \uACE0\uB97C \uC218 \uC5C6\uC5B4\uC694",
    "edit.pickOutOfRules": "\uC9C0\uAE08 \uB300\uC0C1\uC740 \uADDC\uCE59 \uBC16\uC774\uB77C \uB2E4\uC2DC \uACE0\uB97C \uC218 \uC5C6\uC5B4\uC694 \xB7 \uADF8\uB300\uB85C \uB450\uBA74 \uBC14\uB00C\uC9C0 \uC54A\uC544\uC694",
    "edit.pickNoMatch": "\uB9DE\uB294 \uBCC0\uC218\uAC00 \uC5C6\uC5B4\uC694",
    "edit.confirm": "\uACE0\uCE5C \uB0B4\uC6A9\uC744 \uBC84\uB9B4\uAE4C\uC694?",
    "edit.discard": "\uBC84\uB9AC\uAE30",
    "edit.keep": "\uACC4\uC18D \uACE0\uCE58\uAE30",
    "vm.noTier": "\uACC4\uCE35 \uC544\uB2D8",
    "vm.tierWhyOwned": "\uD50C\uB7EC\uADF8\uC778 \uCEEC\uB809\uC158",
    "vm.tierWhyEmpty": "\uD310\uB2E8\uD560 \uBCC0\uC218 \uC5C6\uC74C \xB7 \uACC4\uCE35 \uC544\uB2D8",
    "vm.tierWhyName": "\uC774\uB984 \xB7 Component",
    "vm.tierWhyAlias": "\uBCC4\uCE6D {a}/{n} \xB7 {tier}",
    "vm.tierWhyDirect": "\uC9C1\uC811 \uAC12 {d}/{n} \xB7 Global",
    "vm.dCollection": "\uCEEC\uB809\uC158",
    "vm.dScopes": "\uC6A9\uB3C4",
    "vm.dDesc": "\uC124\uBA85",
    "vm.dNoUses": "\uC120\uD0DD \uC548\uC5D0\uC11C\uB294 \uC4F0\uC774\uC9C0 \uC54A\uC544\uC694.",
    // 탭
    // IA v3 레이어 › 연결(§4.6)
    // 단계 표시 · 버튼(§4.6 그림 개편 — "찾기"는 이전의 "미리보기")
    "bind.link": "\uC5F0\uACB0",
    "bind.linkN": "{n}\uACF3 \uC5F0\uACB0",
    "bind.finding": "\uCC3E\uB294 \uC911\u2026",
    "bind.needOn": "\uC5F0\uACB0\uD560 \uBCC0\uC218\uB97C \uCF1C\uC138\uC694",
    // 빈 상태(목록 자리)
    // 배지 줄
    // 트리 목록(IA v4 §2.7)
    "tree.count": "{n}\uAC1C",
    "tree.places": "{n}\uACF3",
    "tree.expand": "\uD3BC\uCE58\uAE30",
    "tree.collapse": "\uC811\uAE30",
    "tree.headAria": "{name} \uBAA8\uB450 \uCF1C\uACE0 \uB044\uAE30",
    "v4.bindTop": "\uCF20 \uACF3\uB9CC \uC5F0\uACB0\uD574\uC694",
    "bind.allOn": "\uBAA8\uB450 \uCF1C\uAE30",
    "bind.allOff": "\uBAA8\uB450 \uB044\uAE30",
    // 변수 카드 "값 → 변수"
    "bind.count": "{k}\uACF3",
    "bind.switchAria": "{name} \uC5F0\uACB0",
    // 연결 후 결과 카드
    "bind.candChanged": "\uD6C4\uBCF4\uAC00 \uBC14\uB00C\uC5C8\uC5B4\uC694 \xB7 {a}\uACF3 \uCD94\uAC00 \xB7 {b}\uACF3 \uC81C\uC678",
    "bind.noTier": "\uBCC0\uC218\uB294 \uC788\uC9C0\uB9CC \uACC4\uCE35\uC73C\uB85C \uC4F8 \uCEEC\uB809\uC158\uC774 \uC5C6\uC5B4\uC694",
    "tsSkip.hasStyle": "\uC774\uBBF8 \uC2A4\uD0C0\uC77C \uC788\uC74C",
    "tsSkip.noStyle": "\uAC19\uC740 \uC2A4\uD0C0\uC77C \uC5C6\uC74C",
    "tsSkip.ambiguous": "\uAC19\uC740 \uBAA8\uC591 \uC2A4\uD0C0\uC77C\uC774 \uB458 \uC774\uC0C1",
    "tsSkip.mixed": "\uC11C\uC2DD\uC774 \uC11E\uC784",
    "tsSkip.instance": "\uC778\uC2A4\uD134\uC2A4 \uC548\uCABD",
    // IA v3 변수 탭(§4.2~§4.4)
    "var.loading": "\uBCC0\uC218 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\u2026",
    "wizard.toBind": "\uC5F0\uACB0\uD558\uAE30 \u2192",
    "list.addTip": "\uCD94\uAC00",
    "list.moreTip": "\uB354 \uBCF4\uAE30",
    "list.modeTip": "\uBAA8\uB4DC",
    "list.modeDefault": "\uAE30\uBCF8 \uBAA8\uB4DC",
    "list.big": "\uC120\uD0DD\uC774 \uCEE4\uC11C \uC790\uB3D9\uC73C\uB85C \uC77D\uC9C0 \uC54A\uC544\uC694",
    "list.read": "\uC77D\uAE30",
    "list.sideColAria": "{name}, \uACC4\uCE35 {badge}, {num}",
    "list.noGroup": "(\uADF8\uB8F9 \uC5C6\uC74C)",
    "list.rebase": "\uAE30\uC900 \uBC14\uAFB8\uAE30",
    "list.noMatch": "'{q}'\uC640 \uB9DE\uB294 \uBCC0\uC218\uAC00 \uC5C6\uC5B4\uC694",
    "list.searchClear": "\uAC80\uC0C9 \uC9C0\uC6B0\uAE30",
    "list.libVar": "\uB77C\uC774\uBE0C\uB7EC\uB9AC \uBCC0\uC218\uC608\uC694 \xB7 \uC6D0\uBCF8 \uD30C\uC77C\uC5D0\uC11C \uAD00\uB9AC\uD574\uC694",
    "list.jumped": "{name}(\uC73C)\uB85C \uC62E\uACBC\uC5B4\uC694",
    "list.undo": "\u2190 \uB418\uB3CC\uB9AC\uAE30",
    "select.capped": "\uB808\uC774\uC5B4 {found}\uAC1C\uB9CC \uC120\uD0DD\uD588\uC5B4\uC694(\uC804\uCCB4 {requested}\uAC1C)",
    "select.none": "\uC120\uD0DD\uD560 \uB808\uC774\uC5B4\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC5B4\uC694 \u2014 \uC0AD\uC81C\uB410\uAC70\uB098 \uB2E4\uB978 \uD398\uC774\uC9C0\uC608\uC694",
    "select.partial": "\uB808\uC774\uC5B4 {found}\uAC1C \uC120\uD0DD \u2014 {missing}\uAC1C\uB294 \uC0AD\uC81C\uB410\uAC70\uB098 \uB2E4\uB978 \uD398\uC774\uC9C0\uC608\uC694",
    "list.dUses": "\uC4F0\uC778 \uACF3",
    "list.detailBig": "\uC120\uD0DD\uC774 \uCEE4\uC11C \uC790\uB3D9\uC73C\uB85C \uCC3E\uC9C0 \uC54A\uC544\uC694",
    "list.find": "\uCC3E\uAE30",
    "list.usesMore": "\uC678 {n}\uAC1C",
    "list.menuExport": "\uCF54\uB4DC\uB85C \uB0B4\uBCF4\uB0B4\uAE30\u2026",
    "list.menuExpandAll": "\uC0AC\uC774\uB4DC\uBC14 \uBAA8\uB450 \uD3BC\uCE58\uAE30",
    "list.menuCollapseAll": "\uC0AC\uC774\uB4DC\uBC14 \uBAA8\uB450 \uC811\uAE30",
    "tab.variables": "\uBCC0\uC218",
    "tab.select": "\uC120\uD0DD",
    // IA v4 선택 탭(§4.1)
    "v4.selMany": "{name} \uC678 {k}\uAC1C",
    "v4.baseDiff": "\uC9C0\uAE08 \uC120\uD0DD\uACFC \uB2EC\uB77C\uC694",
    "v4.loading": "\uBD88\uB7EC\uC624\uB294 \uC911\u2026",
    "v4.noSel": "\uB514\uC790\uC778\uC5D0\uC11C \uB808\uC774\uC5B4\uB97C \uC120\uD0DD\uD558\uC138\uC694",
    "v4.noVarsFile": "\uC774 \uD30C\uC77C\uC5D4 \uC544\uC9C1 \uBCC0\uC218\uAC00 \uC5C6\uC5B4\uC694",
    "v4.reading": "\uC120\uD0DD\uC744 \uC77D\uB294 \uC911\u2026",
    "v4.libOnly": "\uB77C\uC774\uBE0C\uB7EC\uB9AC \uBCC0\uC218\uB9CC \uC368\uC694 \xB7 \uC5F0\uACB0\uC740 \uD53C\uADF8\uB9C8 \uC624\uB978\uCABD \uD328\uB110\uC5D0\uC11C \uD574\uC694",
    "v4.libSame": "\uB77C\uC774\uBE0C\uB7EC\uB9AC\uC5D0 \uAC19\uC740 \uAC12 {k}\uACF3 \u2014 \uC624\uB978\uCABD \uD328\uB110\uC5D0\uC11C \uC5F0\uACB0\uD574\uC694",
    // 문구 임시 — UX 라이팅 단계에서 확정(2026-11-19 사용자, IA v4 §4.1 상태 5)
    "v4.makeArrow": "\uBCC0\uC218 \uB9CC\uB4E4\uAE30 \u2192",
    "v4.find0": "\uBCC0\uC218 \uC5C6\uB294 \uAC12",
    "v4.findN": "\uBCC0\uC218 \uC5C6\uB294 \uAC12 {n}\uACF3",
    "v4.findTip": "\uC778\uC2A4\uD134\uC2A4 \uC548\uCABD \xB7 \uC228\uAE34 \uB808\uC774\uC5B4 \uC81C\uC678 \u2014 \uC778\uC2A4\uD134\uC2A4\uC758 \uBA54\uC778 \uCEF4\uD3EC\uB10C\uD2B8\uB294 \uD3EC\uD568",
    "v4.mainsLine": "\uC120\uD0DD \uBC16 \uBA54\uC778 \uCEF4\uD3EC\uB10C\uD2B8 {c}\uAC1C\uB3C4 \uD568\uAED8 \uC5F0\uACB0\uD574\uC694",
    "v4.mainsMore": "\uC678 {n}\uAC1C",
    "v4.allBoundMains": "\uBA54\uC778 \uCEF4\uD3EC\uB10C\uD2B8 {c}\uAC1C\uB3C4 \uD568\uAED8 \uC5F0\uACB0\uD588\uC5B4\uC694",
    "v4.linkN": "{n}\uACF3 \uC5F0\uACB0",
    "v4.noVarPlaces": "\uC0C8\uB85C \uB9CC\uB4E4 \uAC12 {k}\uACF3",
    "v4.scopePlaces": "\uC6A9\uB3C4 \uB9DE\uCD9C \uAC12 {u}\uACF3",
    "v4.scopePlacesTip": "\uAC19\uC740 \uAC12\uC758 \uBCC0\uC218\uAC00 \uC788\uC9C0\uB9CC \uC774 \uC790\uB9AC \uC6A9\uB3C4\uAC00 \uAEBC\uC838 \uC788\uC5B4\uC694 \u2014 [\uBCC0\uC218 \uB9CC\uB4E4\uAE30]\uAC00 \uC6A9\uB3C4\uB97C \uB354\uD574 \uC5F0\uACB0\uD574\uC694",
    "v4.allBound": "\u2713 \uCC3E\uC740 \uAC12\uC740 \uBAA8\uB450 \uC5F0\uACB0\uB3FC \uC788\uC5B4\uC694",
    "v4.allLinked": "\u2713 \uC5F0\uACB0\uD560 \uACF3\uC740 \uBAA8\uB450 \uC5F0\uACB0\uB410\uC5B4\uC694",
    "v4.nothingToLink": "\uC5F0\uACB0\uD560 \uC218 \uC788\uB294 \uAC12\uC774 \uC5C6\uC5B4\uC694",
    "v4.fixPlacesChip": "\uC190\uBCFC \uACF3 {s}\uACF3",
    "v4.skipFixHead": "\uC190\uBCFC \uC218 \uC788\uB294 \uACF3",
    "v4.skipKeepHead": "\uADF8\uB300\uB85C \uB46C\uB3C4 \uB418\uB294 \uACF3",
    "v4.skippedTitle": "\uAC74\uB108\uB6F4 \uACF3",
    "v4.layerCount": "\uB808\uC774\uC5B4 {n}\uAC1C",
    "reasonHelp.fraction": "\uC815\uC218\uB85C \uB9DE\uCD94\uBA74 \uB2E4\uC74C\uC5D0 \uC5F0\uACB0\uB3FC\uC694",
    "reasonHelp.size-fraction": "\uD06C\uAE30\uB97C \uC815\uC218\uB85C \uB9DE\uCD94\uBA74 \uC5F0\uACB0\uB3FC\uC694",
    "reasonHelp.deleted-var": "\uCCAB \uD654\uBA74 [\uC5F0\uACB0 \uD480\uAE30]\uB85C \uC815\uB9AC\uD574\uC694",
    "reasonHelp.styled": "\uC2A4\uD0C0\uC77C\uB85C \uC774\uBBF8 \uC5F0\uACB0\uB3FC \uC788\uC5B4\uC694",
    "reasonHelp.space-between": "\uD53C\uADF8\uB9C8\uAC00 \uACC4\uC0B0\uD558\uB294 \uAC04\uACA9\uC774\uC5D0\uC694",
    "reasonHelp.hug-fill": "\uC790\uB3D9 \uD06C\uAE30\uB77C \uBCC0\uC218\uB97C \uBD99\uC774\uC9C0 \uC54A\uC544\uC694",
    "reasonHelp.empty-text": "\uBE48 \uAE00\uC790\uC608\uC694",
    "reasonHelp.instance-children": "\uCEF4\uD3EC\uB10C\uD2B8 \uC6D0\uBCF8\uC5D0\uC11C \uC5F0\uACB0\uD574\uC694",
    "reasonHelp.library-main": "\uB77C\uC774\uBE0C\uB7EC\uB9AC \uCEF4\uD3EC\uB10C\uD2B8\uB77C \uC774 \uD30C\uC77C\uC5D0\uC11C \uC5F0\uACB0\uD560 \uC218 \uC5C6\uC5B4\uC694",
    "reasonHelp.hidden": "\uC228\uAE34 \uB808\uC774\uC5B4\uC608\uC694",
    "reasonHelp.no-autolayout": "\uC5EC\uBC31 \xB7 \uAC04\uACA9\uC774 \uC5C6\uB294 \uB808\uC774\uC5B4\uC608\uC694",
    "reasonHelp.size-free-layout": "\uC790\uC720 \uBC30\uCE58\uB77C \uD06C\uAE30\uB97C \uBD99\uC774\uC9C0 \uC54A\uC544\uC694",
    "reasonHelp.font": "\uC774 \uCEF4\uD4E8\uD130\uC5D0 \uC5C6\uB294 \uAE00\uAF34\uC774\uC5D0\uC694",
    "bind.skippedPlacesChip": "\uAC74\uB108\uB6F4 \uACF3",
    "bind.skipSelectBtn": "\uC120\uD0DD \u203A",
    "v4.bindListAria": "\uC5F0\uACB0\uD560 \uBCC0\uC218",
    "v4.linked": "\u{1F517} {n}\uACF3 \uC5F0\uACB0 \xB7 \u2318Z\uB85C \uB418\uB3CC\uB9AC\uAE30",
    "v4.linkedSkipped": " \xB7 \uAC74\uB108\uB700 {m}",
    "v4.tsPlaces": "Text Style {t}\uACF3",
    "v4.readCancelled": "\uC77D\uAE30\uB97C \uCDE8\uC18C\uD588\uC5B4\uC694",
    "v4.reread": "\uB2E4\uC2DC \uC77D\uAE30",
    "v4.fixPlaces": "\uC190\uBCFC \uACF3 {s}\uACF3",
    "v4.view": "\uBCF4\uAE30",
    "v4.usesTitle0": "\uC4F0\uB294 \uBCC0\uC218",
    "v4.usesN": "\uC4F0\uB294 \uBCC0\uC218 {n}\uAC1C",
    "v4.usesTip": "\uC778\uC2A4\uD134\uC2A4 \uC548\uCABD \uD3EC\uD568",
    "v4.noTierName": "\uACC4\uCE35 \uC5C6\uC74C",
    "v4.libName": "\uB77C\uC774\uBE0C\uB7EC\uB9AC",
    "v4.places": "{n}\uACF3",
    "v4.deletedN": "\uC0AD\uC81C\uB41C \uBCC0\uC218 {n}\uACF3",
    "v4.select": "\uC120\uD0DD",
    "v4.unbind": "\uC5F0\uACB0 \uD480\uAE30",
    "v4.unbound": "\uC0AD\uC81C\uB41C \uBCC0\uC218 \uC5F0\uACB0 {k}\uACF3\uC744 \uD480\uC5C8\uC5B4\uC694 \xB7 \u2318Z\uB85C \uB418\uB3CC\uB9AC\uAE30",
    "v4.unboundFailed": " \xB7 {m}\uACF3\uC740 \uD480\uC9C0 \uBABB\uD588\uC5B4\uC694",
    "v4.unbindFail.font": "\uAE00\uAF34\uC744 \uBD88\uB7EC\uC62C \uC218 \uC5C6\uC74C",
    "v4.unbindFail.error": "\uC624\uB958",
    "v4.tidy": "\uD560 \uC77C",
    "v4.rename": "\uC774\uB984 \uC815\uB9AC",
    "v4.back": "\uB3CC\uC544\uAC00\uAE30",
    "v4.backHome": "\u2190 \uB3CC\uC544\uAC00\uAE30",
    "v4.subBind": "\uC5F0\uACB0",
    "v4.subMake": "\uAC12\uC744 \uC9C1\uC811 \uACE0\uB974\uAE30",
    "v4.varEmpty": "\uC544\uC9C1 \uBCC0\uC218\uAC00 \uC5C6\uC5B4\uC694",
    "v4.makeFromSel": "\uC120\uD0DD\uC5D0\uC11C \uBCC0\uC218 \uB9CC\uB4E4\uAE30",
    "tab.settings": "\uC124\uC815",
    // 최소화(IA v3 §4.9)
    "ui.minimize": "\uCD5C\uC18C\uD654",
    "ui.expand": "\uD3BC\uCE58\uAE30",
    "ui.expandBusy": "\uD3BC\uCE58\uAE30 \xB7 \uC791\uC5C5 \uC911",
    "ui.expandFail": "\uD3BC\uCE58\uAE30 \xB7 \uC2E4\uD328\uD55C \uC791\uC5C5 \uC788\uC74C",
    // 선택 표시줄(§4.1)
    "sel.unnamed": "(\uC774\uB984 \uC5C6\uC74C)",
    // 변수 만들기 화면(IA v4 §4.3)
    "make.title": "\uBCC0\uC218 \uB9CC\uB4E4\uAE30",
    "make.subRight": "\uC5D0\uC11C \uCC3E\uC740 \uAC12",
    "make.top": "\uCF20 \uAC12\uB9CC \uB9CC\uB4E4\uAC70\uB098 \uC788\uB294 \uBCC0\uC218\uC5D0 \uC5F0\uACB0\uD574\uC694",
    "make.freeBox": "\uBB34\uB8CC: Global \uBCC0\uC218\uB9CC",
    "make.freeBoxPaid": "Semantic \xB7 \uD14D\uC2A4\uD2B8 \uC2A4\uD0C0\uC77C \xB7 \uB2E4\uD06C \uBAA8\uB4DC",
    "make.freeSemTop": "\u{1F512} Semantic\uC740 \uC720\uB8CC\uC608\uC694",
    "make.globalN": "Global {g}\uAC1C",
    // 무료 규칙(IA v4 §4.9 F2 · §4.3a F8)
    "paid.semantic": "Semantic \uBCC0\uC218\uB294 \uC720\uB8CC\uC608\uC694",
    // 선택 탭 만들기 카드(IA v4 §4.1 "만들기 카드" — 상태 6)
    "mkc.subFree": "\uCC3E\uC740 \uAC12\uC73C\uB85C Global \uBCC0\uC218\uB97C \uB9CC\uB4E4\uC5B4\uC694 \xB7 \uAC1C\uC218 \uC81C\uD55C\uC740 \uC5C6\uC5B4\uC694",
    "mkc.subPaid": "\uCC3E\uC740 \uAC12\uC73C\uB85C Global \xB7 Semantic \uBCC0\uC218\uB97C \uB9CC\uB4E4\uACE0 \uC5F0\uACB0\uD574\uC694",
    "mkc.label": "{name}\uC5D0\uC11C \uB9CE\uC774 \uC4F4 \uAC12",
    "mkc.make": "\uFF0B \uB9CC\uB4E4\uAE30",
    "mkc.makeAria": "{name} \uB9CC\uB4E4\uAE30",
    "mkc.made": "\u2713 \uB9CC\uB4E6",
    "mkc.created": "Global \uBCC0\uC218 {n}\uAC1C\uB97C \uB9CC\uB4E4\uC5C8\uC5B4\uC694 \xB7 \u2318Z\uB85C \uB418\uB3CC\uB9AC\uAE30",
    "mkc.more": "\uC678 {k}\uAC1C \uBCF4\uAE30",
    "mkc.makeAll": "Global {g}\uAC1C \uBAA8\uB450 \uB9CC\uB4E4\uAE30",
    "mkc.goGR": "Global {g} \xB7 Semantic {r} \uB9CC\uB4E4\uAE30 \u2192",
    "mkc.goG": "Global {g}\uAC1C \uB9CC\uB4E4\uAE30 \u2192",
    "mkc.lockFull": "\u{1F512} Semantic {r}\uAC1C \xB7 \uD14D\uC2A4\uD2B8 \uC2A4\uD0C0\uC77C \xB7 \uB2E4\uD06C \uBAA8\uB4DC",
    "mkc.lockNoSem": "\u{1F512} \uD14D\uC2A4\uD2B8 \uC2A4\uD0C0\uC77C \xB7 \uB2E4\uD06C \uBAA8\uB4DC",
    "mkc.lockAfter": "\u{1F512} Semantic {r}\uAC1C",
    "mkc.titleMade": "Global \uBCC0\uC218 {c}\uAC1C\uB97C \uB9CC\uB4E4\uC5C8\uC5B4\uC694",
    "mkc.titleLib": "\uBCC0\uC218\uAC00 \uC548 \uBD99\uC740 \uAC12 {n}\uACF3",
    // 문구 임시 — UX 라이팅 단계에서 확정(2026-11-19 사용자, IA v4 §4.1 상태 5)
    "mkc.subAfter": "\uAC19\uC740 \uAC12\uC744 \uC4F0\uB294 \uB808\uC774\uC5B4\uC5D0 \uC5F0\uACB0\uD574\uC694 \xB7 Semantic \uBCC0\uC218\uB294 \uC720\uB8CC\uC608\uC694",
    "mkc.link": "{o}\uACF3 \uC5F0\uACB0 \u2192",
    "mkc.noDefault": "\uAE30\uBCF8\uC73C\uB85C \uB9CC\uB4E4 \uAC12\uC774 \uC5C6\uC5B4\uC694",
    "mkc.readFailed": "\uC120\uD0DD\uC744 \uC77D\uC9C0 \uBABB\uD588\uC5B4\uC694",
    "op.makeCard": "\uBCC0\uC218 \uB9CC\uB4E4\uAE30",
    "make.license": "\uB77C\uC774\uC120\uC2A4 \u2192",
    "make.tabsAria": "\uB9CC\uB4E4 \uAC83",
    "make.semTop": "\uCF20 Global\uC744 \uB530\uB77C \uD568\uAED8 \uB9CC\uB4E4\uC5B4\uC694",
    "make.tsTop": "\uCF20 \uC2A4\uD0C0\uC77C\uB9CC \uB4F1\uB85D\uD574\uC694",
    "make.semNone": "\uCF20 Global\uC774 \uC5C6\uC5B4 \uB9CC\uB4E4 Semantic\uC774 \uC5C6\uC5B4\uC694",
    "make.semZero": "\uB9CC\uB4E4 Semantic\uC774 \uC5C6\uC5B4\uC694",
    "make.more": "\uACA9\uC790 \uC815\uB9AC \xB7 \uD14C\uB9C8 \xB7 \uD0C0\uC774\uD3EC\uAE4C\uC9C0 \uACE0\uB974\uB824\uBA74",
    "make.pick": "\uAC12\uC744 \uC9C1\uC811 \uACE0\uB974\uAE30 \u2192",
    "make.after": "\uB9CC\uB4E0 \uB4A4",
    "make.optLink": "\uBC14\uB85C \uC5F0\uACB0",
    "make.optRename": "\uC774\uB984 \uC815\uB9AC",
    "make.optDark": "\uB2E4\uD06C \uBAA8\uB4DC",
    "common.paidTag": "\uC720\uB8CC",
    "make.run": "\uBCC0\uC218 \uB9CC\uB4E4\uAE30",
    "make.runN": "\uBCC0\uC218 {g}\uAC1C \uB9CC\uB4E4\uAE30",
    "make.runStyles": "\uC2A4\uD0C0\uC77C {t}\uAC1C \uB9CC\uB4E4\uAE30",
    "make.needOn": "\uB9CC\uB4E4 \uAC12\uC744 \uCF1C \uC8FC\uC138\uC694",
    "make.counting": "\uC138\uB294 \uC911\u2026",
    "make.countGR": "Global {g}\uAC1C \xB7 Semantic {r}\uAC1C",
    "make.countStyles": " \xB7 \uC2A4\uD0C0\uC77C {t}\uAC1C",
    "make.layers": "Layer {n}",
    "make.tagHas": "\uC788\uC74C",
    "make.tagHasTip": "\uAC19\uC740 \uC774\uB984 \uBCC0\uC218\uAC00 \uC788\uC5B4 \uAC12\uB9CC \uB9DE\uCDB0\uC694",
    "make.tagReuse": "\uC788\uB294 \uBCC0\uC218",
    "make.tagReuseTip": "\uAC12\uC774 \uAC19\uC740 \uBCC0\uC218\uAC00 \uC788\uC5B4 \uC0C8\uB85C \uB9CC\uB4E4\uC9C0 \uC54A\uACE0 \uADF8\uAC83\uC744 \uC368\uC694",
    "make.tagReuseScope": "\uC788\uB294 \uBCC0\uC218 \xB7 \uC6A9\uB3C4 \uB354\uD568",
    "make.tagReuseScopeTip": "\uAC12\uC774 \uAC19\uC740 \uBCC0\uC218\uAC00 \uC788\uC5B4 \uC0C8\uB85C \uB9CC\uB4E4\uC9C0 \uC54A\uACE0, \uC774 \uC790\uB9AC \uC6A9\uB3C4\uB97C \uB354\uD574 \uC368\uC694",
    "make.tagManual": "\uC9C1\uC811 \uB9CC\uB4E0 \uBCC0\uC218",
    "make.tagManualTip": "\uC9C1\uC811 \uB9CC\uB4E0 \uBCC0\uC218\uB77C \uB36E\uC5B4\uC4F0\uC9C0 \uC54A\uC544\uC694",
    "make.rowAria": "{name} \uB9CC\uB4E4\uAE30",
    "make.semNote": "\uB808\uC774\uC5B4\uC5D0\uB294 Semantic\uC774 \uBD99\uC5B4\uC694 \xB7 Global\uC744 \uB044\uBA74 \uADF8 Semantic\uB3C4 \uBE60\uC838\uC694",
    "make.tsNote": "\uC774\uB984\uC744 \uB354\uBE14\uD074\uB9AD\uD558\uBA74 \uACE0\uCE60 \uC218 \uC788\uC5B4\uC694 \xB7 \uC2A4\uD0C0\uC77C\uC5D0 \uC4F8 \uAE00\uC790 \uD06C\uAE30 \xB7 \uC904 \uB192\uC774 \xB7 \uC790\uAC04 \uBCC0\uC218\uB3C4 \uD568\uAED8 \uB9CC\uB4E4\uC5B4\uC694",
    "make.tsDup": "\uC2A4\uD0C0\uC77C \uC774\uB984\uC774 \uACB9\uCCD0\uC694",
    "make.tsExists": "\uC774\uBBF8 \uC788\uB294 \uC2A4\uD0C0\uC77C \uC774\uB984\uC774\uC5D0\uC694",
    "make.tsHasTip": "\uAC19\uC740 \uAC12\uC758 \uC2A4\uD0C0\uC77C\uC774 \uC788\uC5B4 \uC774\uB984\uB9CC \uB9DE\uCDB0\uC694",
    "make.tsEditAria": "\uC2A4\uD0C0\uC77C \uC774\uB984",
    "make.zero": "\uC774 \uC120\uD0DD\uC5D0\uC11C \uCC3E\uC740 \uAC12\uC774 \uC5C6\uC5B4\uC694",
    "make.runLocked": "\uB9CC\uB4DC\uB294 \uB3D9\uC548\uC740 \uBC14\uAFC0 \uC218 \uC5C6\uC5B4\uC694",
    "make.partialTitle": "\uC77C\uBD80 \uB2E8\uACC4\uAC00 \uB05D\uB098\uC9C0 \uC54A\uC558\uC5B4\uC694",
    "make.partialKept": "\uB9CC\uB4E0 \uBCC0\uC218\uB294 \uB0A8\uC544 \uC788\uC5B4\uC694 \xB7 \uBCC0\uC218 \uD0ED\uC5D0\uC11C \uBCFC \uC218 \uC788\uC5B4\uC694",
    "make.partialStatus": "\uBCC0\uC218 \uB9CC\uB4E4\uAE30 \uC77C\uBD80 \uC2E4\uD328",
    "make.stepOf": "{i}/{n}\uB2E8\uACC4",
    "make.stepOff": "\uAED0\uC74C",
    "make.run.create": "\uB9CC\uB4DC\uB294 \uC911\u2026",
    "make.run.dark": "\uB2E4\uD06C \uBAA8\uB4DC \uB9CC\uB4DC\uB294 \uC911\u2026",
    "make.run.textStyles": "\uD14D\uC2A4\uD2B8 \uC2A4\uD0C0\uC77C \uB4F1\uB85D\uD558\uB294 \uC911\u2026",
    "make.run.bind": "\uC5F0\uACB0\uD558\uB294 \uC911\u2026",
    "make.run.rename": "\uC774\uB984 \uBC14\uAFB8\uB294 \uC911\u2026",
    "make.cancelled": "\uCDE8\uC18C\uD588\uC5B4\uC694",
    "make.cancelledUpTo": "\uCDE8\uC18C\uD588\uC5B4\uC694 \xB7 {step}\uAE4C\uC9C0 \uB410\uC5B4\uC694",
    "make.done.create": "Global {g}\uAC1C \xB7 Semantic {r}\uAC1C",
    "make.done.dark": "\uB2E4\uD06C {k}\uAC1C",
    "make.done.styles": "\uD14D\uC2A4\uD2B8 \uC2A4\uD0C0\uC77C {s}\uAC1C",
    "make.done.missing": "\uC54C\uB9BC {k}\uAC1C",
    "make.done.stylesLinked": "\uD14D\uC2A4\uD2B8 \uC2A4\uD0C0\uC77C {s}\uAC1C(\uAE00\uC790 {a}\uAC1C)",
    "make.done.bind": "{n}\uACF3 \uC5F0\uACB0",
    "make.done.rename": "\uC774\uB984 {c}\uAC1C \uC815\uB9AC",
    "make.done.manual": "\uC9C1\uC811 \uB9CC\uB4E0 \uBCC0\uC218\uB77C \uAC74\uB108\uB700 {m}",
    "make.done.notLinked": "\uC5F0\uACB0\uC740 \uC544\uC9C1 \uC548 \uD588\uC5B4\uC694",
    "common.view": "\uBCF4\uAE30",
    "textStyle.linkNow": "\uB808\uC774\uC5B4\uC5D0 \uBC14\uB85C \uC5F0\uACB0",
    "textStyle.linkNeedScan": "\uB808\uC774\uC5B4\uB97C \uC120\uD0DD\uD558\uACE0 \uC2A4\uCE94\uD558\uBA74 \uBC14\uB85C \uBD99\uC77C \uC218 \uC788\uC5B4\uC694",
    "textStyle.linkedN": " \xB7 \uAE00\uC790 {a}\uAC1C\uC5D0 \uBD99\uC784",
    "textStyle.linkSkipped": " \xB7 \uBABB \uBD99\uC778 \uAE00\uC790 {k}\uAC1C",
    "make.noSel": "\uB808\uC774\uC5B4\uB97C \uC120\uD0DD\uD558\uBA74 \uADF8 \uC548\uC758 \uAC12\uC73C\uB85C \uB9CC\uB4E4\uC5B4\uC694",
    // 공통 상태 줄(§4.1·§2.3)
    "status.paid": "\uC720\uB8CC \uAE30\uB2A5\uC774\uC5D0\uC694 \xB7 \uC124\uC815 \u203A \uB77C\uC774\uC120\uC2A4\uC5D0\uC11C \uD480 \uC218 \uC788\uC5B4\uC694",
    "status.paidAction": "\uB77C\uC774\uC120\uC2A4 \u2192",
    "lock.tipSuffix": "\uC720\uB8CC \uAE30\uB2A5 \xB7 \uC124\uC815 \u203A \uB77C\uC774\uC120\uC2A4",
    "status.noSelection": "\uC120\uD0DD\uC774 \uC5C6\uC5B4\uC694 \u2014 \uCE94\uBC84\uC2A4\uC5D0\uC11C \uB808\uC774\uC5B4\uB97C \uC120\uD0DD\uD558\uC138\uC694",
    "status.failed": "{op} \uC2E4\uD328",
    "status.view": "\uBCF4\uAE30",
    // 작업 이름 — 최소화 중 실패 안내("{op} 실패 · [보기]")
    "op.extract": "\uCD94\uCD9C",
    "op.create": "\uD1A0\uD070 \uB9CC\uB4E4\uAE30",
    "op.semantics": "Semantic \uB9E4\uD551",
    "op.dark": "\uB2E4\uD06C \uB9CC\uB4E4\uAE30",
    "op.textScan": "\uD14D\uC2A4\uD2B8 \uC2A4\uCE94",
    "op.textStyles": "\uD14D\uC2A4\uD2B8 \uC2A4\uD0C0\uC77C \uB4F1\uB85D",
    "op.bind": "\uC5F0\uACB0",
    "op.rename": "\uC774\uB984 \uC815\uB9AC",
    "op.export": "\uB0B4\uBCF4\uB0B4\uAE30",
    "op.unbind": "\uC0AD\uC81C\uB41C \uBCC0\uC218 \uC5F0\uACB0 \uD480\uAE30",
    "op.wizard": "\uD55C \uBC88\uC5D0 \uC815\uB9AC",
    // 변수 탭 하위 화면(PR 1 중간 상태)
    // 단계 레일(#5) — 만들기 4단계 · 적용 3단계
    "rail.color": "\uC0C9",
    "rail.colorSub": "\uCD94\uCD9C\xB7\uBCC0\uC218",
    "rail.token": "\uD1A0\uD070",
    "rail.tokenSub": "\uAC04\uACA9\xB7\uD06C\uAE30",
    "rail.theme": "\uD14C\uB9C8",
    "rail.themeSub": "\uB2E4\uD06C \uBAA8\uB4DC",
    "rail.type": "\uD0C0\uC774\uD3EC",
    "rail.typeSub": "\uD14D\uC2A4\uD2B8 \uC2A4\uD0C0\uC77C",
    "rail.next": "\uB2E4\uC74C \u2192",
    // 플러그인 설정(#19) — 설정 탭에만
    "settings.title": "\uAE30\uBCF8\uAC12",
    "settings.hint": "\uB9CC\uB4E4\uAE30 \xB7 \uC5F0\uACB0 \xB7 \uC774\uB984 \uC815\uB9AC\uC5D0 \uC4F0\uB294 \uAC12\uC774\uC5D0\uC694",
    "settings.base": "\uAE30\uC900 \uD06C\uAE30",
    "settings.depth": "\uC774\uB984 \uC815\uB9AC \uAE4A\uC774",
    // 수동·폴백 행의 값 입력 칸 툴팁(칸이 좁아 라벨 대신 툴팁으로 설명한다).
    "ts.family": "\uD3F0\uD2B8 \uC774\uB984 \u2014 \uC774 \uC774\uB984 \uADF8\uB300\uB85C \uC2A4\uD0C0\uC77C\uC5D0 \uC368\uC694",
    "ts.size": "\uAE00\uC790 \uD06C\uAE30(px)",
    "ts.lineHeight": "\uD589\uAC04(px) \xB7 0\uC774\uBA74 AUTO",
    "ts.letterSpacing": "\uC790\uAC04(px) \xB7 \uC74C\uC218\uB3C4 \uB3FC\uC694",
    "ts.weight": "\uAD75\uAE30 \u2014 Regular \xB7 Medium \xB7 SemiBold \xB7 Bold \uCC98\uB7FC Figma\uAC00 \uC4F0\uB294 \uC774\uB984",
    "settings.grid": "\uC5EC\uBC31 \uACA9\uC790",
    "settings.gridTip": "\uC5EC\uBC31 \uD1A0\uD070\uC744 \uAC12\uC744 \uC9C1\uC811 \uACE0\uB974\uAE30 \u203A \uD1A0\uD070\uC5D0\uC11C \uC774 \uACA9\uC790\uB85C \uBAA8\uC544\uC694. \uC608: 8\uC774\uBA74 13\xB715\uAC00 16\uC73C\uB85C. \uC62E\uAE34 \uAC12\uC758 \uBCC0\uC218\uB294 \uC6D0\uB798 \uB808\uC774\uC5B4\uC5D0 \uC5F0\uACB0\uB418\uC9C0 \uC54A\uC544\uC694.",
    // 격자로 옮긴 값이 허용오차 밖이면 스냅은 되고 연결만 실패한다 — 실제로 옮겼을 때만 붙이는 꼬리.
    "create.snapNoBind": " \xB7 \uACA9\uC790\uB85C \uC62E\uAE34 {k}\uAC1C \uAC12\uC740 \uC6D0\uB798 \uB808\uC774\uC5B4\uC640 \uB2EC\uB77C \uC5F0\uACB0\uB418\uC9C0 \uC54A\uC544\uC694",
    // 격자는 설정에서 고르는 값이라 스냅은 정책이 아니라 선택이다 — 색 정리와 같은 되돌리기.
    "create.tidyUndo": "\uB418\uB3CC\uB9AC\uAE30",
    // 마법사 카드
    // 칩의 「변수연결」과 체크박스의 「역할 매핑」을 가르는 범례 — 붙여 쓴 「변수연결」은
    // 파이프 칩(wizard.step.bind) 표기 그대로다(적용 탭 카드 제목은 띄어 쓴 「변수 연결」).
    // 공통(정적 라벨)
    "prereq.gotoCreate": "\uD1A0\uD070 \uB9CC\uB4E4\uAE30\uB85C \u2192",
    // 온보딩 / 가이드
    // 첫 실행 배너(온보딩 흡수)
    // 진행(파이프라인 카드)
    // 브랜드 팔레트
    "color.title": "\uC0C9",
    "color.scope": "\uBCC0\uC218\uD654",
    "color.listHint": "\uCD94\uCD9C\xB7\uC815\uB9AC\uB41C \uC0C9 \xB7 Global = hue \uC774\uB984 \xB7 Semantic = \uC4F0\uC784 \uC774\uB984",
    "color.makeVars": "\uC0C9 \uBCC0\uC218 \uB9CC\uB4E4\uAE30",
    "palette.brand2": "\uBCF4\uC870\uC0C9",
    "palette.harmony": "\uD558\uBAA8\uB2C8",
    "palette.neutral": "\uC911\uB9BD",
    "palette.status": "\uC0C1\uD0DC",
    "palette.gen": "\uD314\uB808\uD2B8 \uC0DD\uC131",
    "palette.run": "\uD314\uB808\uD2B8 \uB9CC\uB4E4\uAE30",
    "palette.harmonyTip": "\uBCF4\uC870\uC0C9\uC744 \uCF1C\uBA74 \uACE0\uB97C \uC218 \uC788\uC5B4\uC694",
    // 하모니 선택지 — 보조색을 브랜드색에서 몇 도 돌려 뽑을지.
    "harmony.complementary": "\uBCF4\uC0C9",
    "harmony.analogous": "\uC720\uC0AC",
    "harmony.triadic": "\uC0BC\uAC01",
    "harmony.split": "\uBD84\uD560\uBCF4\uC0C9",
    "harmony.tetradic": "\uC0AC\uAC01",
    // 추출
    "extract.scanBtn": "\uC120\uD0DD\uC5D0\uC11C \uCD94\uCD9C",
    // 색 정리(추출 카드에 흡수)
    "colorTidy.hint": "\uC0C9\uC744 \uBF51\uAC70\uB098 \uD314\uB808\uD2B8\uB97C \uB9CC\uB4E0 \uB4A4 Semantic\uC744 \uC815\uD558\uACE0 \uBCC0\uC218\uB85C \uB9CC\uB4E4\uC5B4\uC694",
    "colorTidy.hintTip": "\uCD94\uCD9C\uD55C \uC0C9\uC740 \uC804\uBD80 \uBCC0\uC218\uAC00 \uB3FC\uC694. Global \uC774\uB984\uC740 hue \uD328\uBC00\uB9AC(color/blue/500 \xB7 \uAC19\uC740 \uB2E8\uACC4\uBA74 -2, -3), \uC4F0\uC784 \uC774\uB984\uC740 Semantic\uC73C\uB85C \uBD99\uC5B4\uC694.",
    // 토큰 생성
    "create.title": "\uAC04\uACA9\xB7\uD06C\uAE30 \uD1A0\uD070",
    "create.scopeHint": "\uC5EC\uBC31\xB7\uD06C\uAE30\xB7\uD3F0\uD2B8\xB7\uD6A8\uACFC\uB9CC \uB2E4\uB904\uC694. \uC0C9\uC740 \uC774\uC804 \uB2E8\uACC4\uC5D0\uC11C \uC774\uBBF8 \uB9CC\uB4E4\uC5C8\uC5B4\uC694",
    "create.selectAll": "\uC804\uCCB4",
    "create.dropOnce": "1\xD7 \uD574\uC81C",
    "create.dropOnceTip": "\uD55C \uB808\uC774\uC5B4\uC5D0\uC11C\uB9CC \uC4F0\uC778 \uAC12(1\xD7)\uC758 \uCCB4\uD06C\uB97C \uD480\uC5B4\uC694 \u2014 \uB300\uAC1C \uC77C\uD68C\uC131\uC774\uB77C \uD1A0\uD070\uC73C\uB85C \uB0A8\uAE38 \uD544\uC694\uAC00 \uC801\uC5B4\uC694",
    "create.previewBtn": "\uBBF8\uB9AC\uBCF4\uAE30",
    "create.apply": "\uC801\uC6A9",
    // 토큰 행 — 체크박스·등장 횟수(N×)는 라벨을 놓을 자리가 없어 툴팁으로만 뜻을 밝힌다.
    "create.rowCheckTip": "\uC0DD\uC131 \uB300\uC0C1",
    "create.rowCountTip": "\uC774 \uAC12\uC744 \uC4F0\uB294 \uB808\uC774\uC5B4 {count}\uAC1C",
    // 시맨틱 매핑 카드
    "semantic.title": "Semantic \uB9E4\uD551 (\uC4F0\uC784 \uC774\uB984 \u2192 Global)",
    "semantic.formatLabel": "\uD615\uC2DD: <code>Semantic = Global\uBCC0\uC218\uC774\uB984</code>",
    "semantic.aliasBtn": "\uC2DC\uB9E8\uD2F1 \uBCC4\uCE6D \uC0DD\uC131",
    // 텍스트 스타일
    "textStyle.title": "\uD14D\uC2A4\uD2B8 \uC2A4\uD0C0\uC77C",
    "textStyle.hint": "\uC2A4\uCE94 \uD6C4 \uC774\uB984\uC744 \uB2E4\uB4EC\uACE0 \uB4F1\uB85D\uD558\uC138\uC694. \uCF1C \uB450\uBA74 \uB4F1\uB85D\uD558\uBA74\uC11C \uC120\uD0DD\uD55C \uAE00\uC790\uC5D0 \uBC14\uB85C \uBD99\uC5EC\uC694",
    "textStyle.scanBtn": "\uC2A4\uCE94",
    // 스캔의 옵션이 아니라 스캔 뒤에 누르는 동작(결정 2026-08-06) — 라벨도 「~으로」가 아니라 「~ 채우기」로,
    // 지금 무슨 일이 일어나는지를 적는다.
    "textStyle.rowLabelBtn": "\uC67C\uCABD \uAE00\uC790\uB85C \uC774\uB984 \uCC44\uC6B0\uAE30",
    "textStyle.rowLabelTip": "\uAC19\uC740 \uAC00\uB85C \uC904\uC758 \uC67C\uCABD \uD14D\uC2A4\uD2B8\uB97C \uB77C\uBCA8(\uC774\uB984)\uC73C\uB85C, \uD070 \uD14D\uC2A4\uD2B8\uB97C \uD45C\uBCF8\uC73C\uB85C \uBD10\uC694. \uC9DD\uC744 \uBABB \uCC3E\uC740 \uD589\uC740 KRDS \uC774\uB984(heading/large\u2026) \uADF8\uB300\uB85C \uB46C\uC694.",
    "textStyle.registerBtn": "\uB4F1\uB85D",
    // 스타일 행의 이름 칸 — 파랑(등록됨) / 앰버(신규)로 갈리는 뜻을 툴팁이 말한다.
    "textStyle.namePlaceholder": "\uC2A4\uD0C0\uC77C \uC774\uB984",
    "textStyle.nameBoundTip": "\uC774\uBBF8 \uB4F1\uB85D\uB41C \uC2A4\uD0C0\uC77C\uC774\uC5D0\uC694. \uC774\uB984\uC744 \uBC14\uAFB8\uBA74 \uC774 \uC2A4\uD0C0\uC77C\uC758 \uC774\uB984\uB9CC \uBC14\uB00C\uC5B4\uC694(\uC0C8\uB85C \uB9CC\uB4E4\uC9C0 \uC54A\uC74C).",
    "textStyle.nameNewTip": "\uC0C8 \uC2A4\uD0C0\uC77C\uB85C \uB4F1\uB85D\uB3FC\uC694(\uC544\uC9C1 \uB4F1\uB85D \uC548 \uB41C \uAE00\uC790).",
    // ×N 배지 — 1개면 그 글자로 이동, 여럿이면 전부 선택.
    // 적용(바인딩)
    "bind.nothing": "\uC5F0\uACB0\uD560 \uACF3\uC774 \uC5C6\uC5B4\uC694",
    "bind.skipCappedTip": " \xB7 \uBAA9\uB85D\uC740 {shown}\uAC1C\uAE4C\uC9C0",
    // 스킵 칩 툴팁 — 사유 건수(속성 단위)와 레이어 수가 다를 수 있어 레이어 쪽을 따로 밝힌다.
    "bind.skipChipTip": "\uB808\uC774\uC5B4 {count}\uAC1C \uC120\uD0DD \u2014 {names}",
    "bind.skipChipTipMore": "\uB808\uC774\uC5B4 {count}\uAC1C \uC120\uD0DD \u2014 {names} \uC678",
    // 색 역할(Semantic) 어휘 — 드롭다운은 `한글 · role`로 병기한다(와이어).
    // 키의 `-`는 역할 이름의 `/`(surface/muted)를 대신한다 — 점 표기 키와 섞이지 않게.
    // 키 = `color/` 접두사를 뗀 역할 경로의 `/`→`-` (color/background/brand-bold → background-brand-bold).
    "role.none": "Semantic \uC5C6\uC74C",
    "role.background-default": "\uBA74",
    "role.background-subtle": "\uC605\uC740 \uBA74",
    "role.background-inverse": "\uBC18\uC804 \uBA74",
    "role.background-brand": "\uC8FC\uC0C9 \uBA74",
    "role.background-brand-bold": "\uC9C4\uD55C \uC8FC\uC0C9 \uBA74",
    "role.background-brand-subtle": "\uC605\uC740 \uC8FC\uC0C9 \uBA74",
    "role.background-accent": "\uAC15\uC870 \uBA74",
    "role.background-success": "\uC131\uACF5 \uBA74",
    "role.background-warning": "\uC8FC\uC758 \uBA74",
    "role.background-danger": "\uC624\uB958 \uBA74",
    "role.background-info": "\uC548\uB0B4 \uBA74",
    "role.text-default": "\uAE00\uC790",
    "role.text-subtle": "\uC605\uC740 \uAE00\uC790",
    "role.text-inverse": "\uBC18\uC804 \uAE00\uC790",
    "role.text-brand": "\uC8FC\uC0C9 \uAE00\uC790",
    "role.text-success": "\uC131\uACF5 \uAE00\uC790",
    "role.text-warning": "\uC8FC\uC758 \uAE00\uC790",
    "role.text-danger": "\uC624\uB958 \uAE00\uC790",
    "role.text-info": "\uC548\uB0B4 \uAE00\uC790",
    "role.border-default": "\uD14C\uB450\uB9AC",
    "role.border-bold": "\uC9C4\uD55C \uD14C\uB450\uB9AC",
    "role.border-brand": "\uC8FC\uC0C9 \uD14C\uB450\uB9AC",
    "role.border-danger": "\uC624\uB958 \uD14C\uB450\uB9AC",
    "role.icon-default": "\uC544\uC774\uCF58",
    "role.icon-subtle": "\uC605\uC740 \uC544\uC774\uCF58",
    "role.icon-brand": "\uC8FC\uC0C9 \uC544\uC774\uCF58",
    // 리네임
    // 이름 정리 화면(IA v4 §4.4)
    "rename.top": "\uCF20 \uC774\uB984\uB9CC \uBC14\uAFD4\uC694",
    "rename.treeAria": "\uBC14\uAFC0 \uC774\uB984",
    "rename.footNote": "\uB808\uC774\uC5B4 \uC774\uB984\uB9CC \uBC14\uB00C\uC5B4\uC694 \xB7 \u2318Z\uB85C \uB418\uB3CC\uB9B4 \uC218 \uC788\uC5B4\uC694",
    "rename.applyBtn": "\uC774\uB984 \uBC14\uAFB8\uAE30",
    "rename.applyN": "{k}\uAC1C \uC774\uB984 \uBC14\uAFB8\uAE30",
    "rename.switchAria": "{name}(\uC73C)\uB85C \uBC14\uAFB8\uAE30",
    "rename.needOn": "\uBC14\uAFC0 \uC774\uB984\uC744 \uCF1C \uC8FC\uC138\uC694",
    "rename.doneStatus": "\uC774\uB984 {k}\uAC1C \uBC14\uAFC8 \xB7 \u2318Z\uB85C \uB418\uB3CC\uB9AC\uAE30",
    "rename.subRight": "\uBC14\uAFC0 \uC774\uB984 {n}\uAC1C",
    // 이름을 지키는 사유(#7b) — 미리보기의 흐린 행에 붙는다. 키는 KeepReason과 1:1.
    // 내보내기
    "export.title": "\uCF54\uB4DC\uB85C \uB0B4\uBCF4\uB0B4\uAE30",
    "export.hint": "\uB204\uB974\uBA74 \uBC14\uB85C \uCF54\uB4DC \uD30C\uC77C\uB85C \uC800\uC7A5\uB3FC\uC694",
    "export.runBtn": "\uB0B4\uBCF4\uB0B4\uAE30",
    // 셀렉트는 값이 곧 라벨이라 머리말이 없다 — 무엇을 고르는 칸인지는 툴팁이 맡는다.
    "export.formatTip": "\uB0B4\uBCF4\uB0BC \uCF54\uB4DC \uD615\uC2DD",
    "export.fmtW3c": "W3C \uD1A0\uD070 JSON",
    "export.fmtCss": "CSS \uBCC0\uC218",
    "export.fontUnitTip": "\uD3F0\uD2B8 \uD06C\uAE30 \uB2E8\uC704 \u2014 rem\uC740 \uAE30\uC900 \uD06C\uAE30\uB85C \uB098\uB220\uC694",
    // 요금제 / 라이선스
    "license.title": "\uB77C\uC774\uC120\uC2A4",
    "license.keyPlaceholder": "\uB77C\uC774\uC120\uC2A4 \uD0A4 \uC785\uB825",
    "license.verify": "\uAC80\uC99D",
    "license.clear": "\uD574\uC81C",
    "license.clearTip": "\uC774 \uAE30\uAE30\uC758 \uD65C\uC131\uD654\uB97C \uBC18\uB0A9\uD574\uC694. \uC0C8 \uAE30\uAE30\uC5D0\uC11C \uAC19\uC740 \uD0A4\uB97C \uB2E4\uC2DC \uAC80\uC99D\uD558\uBA74 \uB3FC\uC694.",
    "license.hint": "\uC720\uB8CC\uB97C \uC4F0\uBA74 \u{1F512} \uC7A0\uAE34 \uAE30\uB2A5\uC774 \uD480\uB824\uC694",
    // 한 버튼이 티어에 따라 갈린다(결정 2026-08-06) — 라벨은 두 목적지를 함께 적는다.
    "license.manage": "\uAD6C\uB3C5 \uAD00\uB9AC \u2197",
    "license.manageTip": "\uACB0\uC81C \uC218\uB2E8 \xB7 \uAE30\uAE30 \uD65C\uC131\uD654\uB97C \uAD00\uB9AC\uD558\uB294 \uD398\uC774\uC9C0\uB97C \uC5F4\uC5B4\uC694",
    "license.buy": "\uC720\uB8CC \uAD6C\uB9E4\uD558\uAE30 \u2197",
    "license.buyTip": "\uACB0\uC81C \uD398\uC774\uC9C0\uB97C \uC5F4\uC5B4\uC694",
    "license.linkPending": "\uAD6C\uB3C5 \uAD00\uB9AC \uD398\uC774\uC9C0\uB294 \uC544\uC9C1 \uC900\uBE44 \uC911\uC774\uC5D0\uC694",
    "license.devTier": "\uAC1C\uBC1C\uC6A9 \uAC15\uC81C \uD2F0\uC5B4",
    "license.devTierNote": "(\uAC80\uC99D\uB41C \uD0A4\uAC00 \uC5C6\uC744 \uB54C\uB9CC \uC801\uC6A9)",
    // PR 4 — 코드에 직접 쓰던 문구를 옮김(docs/pr4-copy-table.md). 조각을 받는 자리는 {…Part}
    // 공통 · 접근성 이름
    "tab.listAria": "\uC791\uC5C5 \uD0ED",
    "rail.makeAria": "\uB9CC\uB4E4\uAE30 \uB2E8\uACC4",
    "list.sideAria": "\uBCC0\uC218 \uCEEC\uB809\uC158",
    "list.gridAria": "\uBCC0\uC218 \uBAA9\uB85D",
    "common.retry": "\uB2E4\uC2DC \uC2DC\uB3C4",
    // 레이어 › 연결
    "bind.linking": "\uC5F0\uACB0 \uC911\u2026",
    "bind.progressOf": "{done} / {total} \uCC98\uB9AC \uC911\u2026 ({pct}%)",
    "bind.progressCount": "{done}\uAC1C \uCC98\uB9AC \uC911\u2026",
    // 레이어 › 연결 — 찾기 · 연결의 수(2026-11-05, pr4-copy-table.md 11)
    // 새 역할(§2.12, §4.6)
    "bind.newRole": "N",
    "bind.newRoleAria": "\uC0C8 Semantic",
    "bind.newRoleTip": "{global}\uC744 \uAC00\uB9AC\uCF1C\uC694",
    "bind.linkingOf": "\uC5F0\uACB0 \uC911\u2026 {done} / {total}",
    "bind.waitLink": "\uC5F0\uACB0\uC774 \uB05D\uB098\uBA74 \uB2E4\uC2DC \uD574 \uC8FC\uC138\uC694",
    "bind.waitOp": "{op} \uC791\uC5C5\uC774 \uB05D\uB098\uBA74 \uB2E4\uC2DC \uD574 \uC8FC\uC138\uC694",
    "bind.skipSelected": "{reason} \uB808\uC774\uC5B4 {n}\uAC1C \uC120\uD0DD",
    // 레이어 › 이름
    // 만들기 › 색 · 토큰
    "create.hintPreview": "\u2018\uBBF8\uB9AC\uBCF4\uAE30\u2019\uB97C \uB204\uB974\uC138\uC694.",
    "create.hintNoSel": "\uB808\uC774\uC5B4\uB97C \uBA3C\uC800 \uC120\uD0DD\uD558\uC138\uC694.",
    "create.hintReveal": "\u2018\uBBF8\uB9AC\uBCF4\uAE30\u2019\uB97C \uB204\uB974\uBA74 \uB9CC\uB4E4 \uD1A0\uD070\uC774 \uBCF4\uC5EC\uC694",
    "create.onlyColors": "\uC0C9 \uC678 \uD1A0\uD070\uC774 \uC5C6\uC5B4\uC694(\uC0C9\uB9CC \uBF51\uC558\uC5B4\uC694)",
    "create.count": "\uD6C4\uBCF4 {sel}/{total}",
    "create.tidyMerged": " \xB7 \uAC19\uC740 \uCE78 {n}\uAC1C \uBCD1\uD569",
    // 만들기 결과 · 미리보기 꼬리 — 새로 만든(만들) 쓰임 역할 수(§2.12 12.10).
    "create.sumRoles": " \xB7 Semantic {n}\uAC1C",
    "create.tidySummary": "\uC5EC\uBC31 {before} \u2192 {after}\uAC1C ({grid}px \uACA9\uC790\uB85C {n}\uAC1C \uC774\uB3D9{mergedPart}){gapPart}",
    "create.tidyUndone": "\uACA9\uC790 \uC815\uB9AC\uB97C \uB418\uB3CC\uB838\uC5B4\uC694 \u2014 \u2018\uBBF8\uB9AC\uBCF4\uAE30\u2019\uB97C \uB2E4\uC2DC \uB204\uB974\uBA74 \uB610 \uC815\uB9AC\uD574\uC694",
    "create.onceOff": "1\xD7 \uD1A0\uD070 {n}\uAC1C \uD574\uC81C",
    "create.onceNone": "1\xD7 \uD1A0\uD070\uC774 \uC5C6\uC5B4\uC694",
    "color.selInfo": "\uC120\uD0DD {n}\uAC1C \xB7 \uC0C9 {c} \xB7 \uADF8 \uC678 {o}",
    "palette.lowChroma": "\uBE0C\uB79C\uB4DC\uC0C9\uC758 \uCC44\uB3C4\uAC00 \uB108\uBB34 \uB0AE\uC544 hue\uAC00 \uD754\uB4E4\uB824\uC694 \u2014 \uC911\uB9BD(neutral) \uC2A4\uCF00\uC77C\uC744 \uAD8C\uD574\uC694",
    "create.sumGlobals": "Global {n}\uAC1C (\uC0DD\uC131 {c} / \uAC31\uC2E0 {u})",
    "create.sumPruned": " \xB7 \uC774\uC804 \uC0C9 {n}\uAC1C \uC815\uB9AC",
    "create.sumBase": " \xB7 base {base}px \uD658\uC0B0 {n}\uAC1C({examples}{morePart})",
    "create.sumBaseMore": " \uC678",
    "extract.skipHidden": "\uC228\uAE34 \uB808\uC774\uC5B4\uB294 \uD654\uBA74\uC5D0 \uC5C6\uB294 \uAC12\uC774\uB77C \uAC74\uB108\uB6F0\uC5C8\uC5B4\uC694 \u2014 \uBCF4\uC774\uAC8C \uD55C \uB4A4 \uB2E4\uC2DC \uCD94\uCD9C\uD558\uC138\uC694.",
    "extract.skipInstance": "\uC778\uC2A4\uD134\uC2A4 \uC548\uCABD\uC740 \uB9C8\uC2A4\uD130 \uBCF5\uC0AC\uBCF8\uC774\uB77C \uAC74\uB108\uB6F0\uC5C8\uC5B4\uC694 \u2014 \uAC12\uC774 \uD544\uC694\uD558\uBA74 \uCEF4\uD3EC\uB10C\uD2B8\uB97C \uC120\uD0DD\uD574 \uCD94\uCD9C\uD558\uC138\uC694.",
    "extract.skipGradient": "\uADF8\uB77C\uB514\uC5B8\uD2B8\xB7\uC774\uBBF8\uC9C0 \uCC44\uC6C0\uC740 \uBCC0\uC218\uB85C \uBB36\uC744 \uC218 \uC5C6\uC5B4 \uAC74\uB108\uB6F0\uC5C8\uC5B4\uC694.",
    "extract.skipFraction": "\uC18C\uC218 \uAC12(26.67px \uB4F1)\uC740 \uCC99\uB3C4\uAC00 \uC544\uB2C8\uB77C \uC2A4\uCF00\uC77C \uC794\uAC12\uC774\uB77C \uD1A0\uD070\uC5D0\uC11C \uBE90\uC5B4\uC694.",
    // 만들기 › 테마(역할 매핑 · 다크)
    "semantic.needGlobal": "\uBA3C\uC800 \uD1A0\uD070 \uB9CC\uB4E4\uAE30\uC5D0\uC11C Global \uBCC0\uC218\uB97C \uB9CC\uB4DC\uC138\uC694.",
    "dark.prereqLoading": "\uBCC0\uC218 \uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uB294 \uC911\u2026",
    "dark.prereqNoVars": "\uBA3C\uC800 \uD1A0\uD070 \uB9CC\uB4E4\uAE30\uC5D0\uC11C \uBCC0\uC218\uB97C \uB9CC\uB4DC\uC138\uC694.",
    "dark.running": "\uB2E4\uD06C \uBAA8\uB4DC\uB97C \uB9CC\uB4E4\uACE0 \uAC12\uC744 \uCC44\uC6B0\uB294 \uC911\u2026",
    "dark.modeAddedShort": "\uB2E4\uD06C \uBAA8\uB4DC \uCD94\uAC00 \xB7 ",
    // 다크 결과 · 띠 · 옮기기(ia-v3 13.7 D-T1 · A.25 — 임시 문구, UX 라이팅 단계에서 확정)
    "dark.doneFill": "{modePart}Global \uC0C9 {n}\uAC1C\uC758 Dark \uCE78\uC744 \uCC44\uC6E0\uC5B4\uC694{keptPart}",
    "dark.keptPart": " \xB7 \uC9C1\uC811 \uACE0\uCE5C \uC0C9 {k}\uAC1C\uB294 \uADF8\uB300\uB85C \uB480\uC5B4\uC694",
    "dark.upToDate": "Dark \uCE78\uC774 \uBAA8\uB450 \uCC44\uC6CC\uC838 \uC788\uC5B4\uC694{keptPart}",
    "dark.nothing": "\uCC44\uC6B8 \uC0C9\uC774 \uC5C6\uC5B4\uC694 \u2014 \uD50C\uB7EC\uADF8\uC778 Global\uC5D0 \uAC12\uC744 \uB123\uC740 \uC0C9 \uBCC0\uC218\uAC00 \uD544\uC694\uD574\uC694",
    "dark.unfilled": "Dark \uAC12\uC774 \uC5C6\uB294 \uC0C9 {n}\uAC1C \u2014 [\uB2E4\uD06C \uB9CC\uB4E4\uAE30]\uB85C \uCC44\uC6CC\uC694",
    "dark.needMigrate": "\uB2E4\uD06C\uAC00 Semantic \uBAA8\uB4DC\uC5D0 \uC788\uC5B4\uC694 \u2014 [\uB2E4\uD06C \uB9CC\uB4E4\uAE30]\uB97C \uB204\uB974\uBA74 Global\uB85C \uC62E\uACA8\uC694",
    "dark.needMigrateManual": "\uB2E4\uD06C\uAC00 Semantic \uBAA8\uB4DC\uC5D0 \uC788\uC5B4\uC694 \u2014 Semantic \uBAA8\uB4DC\uAC00 3\uAC1C \uC774\uC0C1\uC774\uB77C \uC62E\uAE38 \uC218 \uC5C6\uC5B4\uC694. \uD53C\uADF8\uB9C8\uC5D0\uC11C \uBAA8\uB4DC\uB97C 2\uAC1C\uB85C \uC904\uC5EC \uC8FC\uC138\uC694",
    "dark.migrateTitle": "\uB2E4\uD06C \uAD6C\uC870\uB97C \uC62E\uAE38\uAE4C\uC694?",
    "dark.migrateBody": "\uC9C0\uAE08 \uB2E4\uD06C\uB294 Semantic \uBAA8\uB4DC\uC5D0 \uC788\uC5B4\uC694. Global \uC0C9\uC758 Dark \uCE78\uC73C\uB85C \uC62E\uAE30\uACE0, Semantic\uC758 {mode} \uBAA8\uB4DC\uC640 \uC4F0\uC9C0 \uC54A\uAC8C \uB41C dark/ \uC0C9 {n}\uAC1C\uB97C \uC9C0\uC6CC\uC694. \u2318Z \uD55C \uBC88\uC73C\uB85C \uB418\uB3CC\uB9B4 \uC218 \uC788\uC5B4\uC694.",
    "dark.migrateBodyNoDel": "\uC9C0\uAE08 \uB2E4\uD06C\uB294 Semantic \uBAA8\uB4DC\uC5D0 \uC788\uC5B4\uC694. Global \uC0C9\uC758 Dark \uCE78\uC73C\uB85C \uC62E\uAE30\uACE0, Semantic\uC758 {mode} \uBAA8\uB4DC\uB97C \uC9C0\uC6CC\uC694. \u2318Z \uD55C \uBC88\uC73C\uB85C \uB418\uB3CC\uB9B4 \uC218 \uC788\uC5B4\uC694.",
    "dark.migrateGo": "\uC62E\uAE30\uACE0 \uB2E4\uD06C \uB9CC\uB4E4\uAE30",
    "dark.migrated": "\uB2E4\uD06C \uAD6C\uC870\uB97C \uC62E\uACBC\uC5B4\uC694(\uC62E\uAE34 \uC0C9 {a}\uAC1C{splitPart}{failPart}) \xB7 ",
    "dark.migratedSplit": " \xB7 \uAC12\uC774 \uAC08\uB9B0 \uC0C9 {b}\uAC1C",
    "dark.migratedFail": " \xB7 \uC62E\uAE30\uC9C0 \uBABB\uD55C \uC5ED\uD560 {c}\uAC1C",
    "dark.migratedSplitTip": "\uAC12\uC774 \uAC08\uB9B0 \uC0C9 \u2014 \uAC00\uC7A5 \uB9CE\uC774 \uC4F4 \uAC12\uC73C\uB85C \uC62E\uACBC\uC5B4\uC694:",
    "dark.migratedFailTip": "\uC62E\uAE30\uC9C0 \uBABB\uD55C \uC5ED\uD560 \u2014 Dark\uC5D0\uC11C \uBC14\uB00C\uC9C0 \uC54A\uC544\uC694:",
    "dark.migratedDelTip": "\uC9C0\uC6B4 dark/ \uC0C9 {n}\uAC1C",
    "dark.errMigrateModes": "Semantic\uC5D0 \uBAA8\uB4DC\uAC00 3\uAC1C \uC774\uC0C1\uC774\uB77C \uC62E\uAE30\uC9C0 \uBABB\uD588\uC5B4\uC694 \u2014 \uD53C\uADF8\uB9C8\uC5D0\uC11C \uBAA8\uB4DC\uB97C 2\uAC1C\uB85C \uC904\uC778 \uB4A4 \uB2E4\uC2DC \uB20C\uB7EC \uC8FC\uC138\uC694",
    "dark.errNoCol": "\uCEEC\uB809\uC158\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC5B4\uC694.",
    "dark.errAddMode": "\uB2E4\uD06C \uBAA8\uB4DC\uB97C \uCD94\uAC00\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694 \u2014 {why}",
    "dark.errAddModePlan": "\uD50C\uB79C\uC5D0\uC11C \uBAA8\uB4DC\uB97C \uB354 \uB9CC\uB4E4 \uC218 \uC5C6\uC744 \uC218 \uC788\uC5B4\uC694.",
    "dark.errSameMode": "Global \uAE30\uBCF8 \uBAA8\uB4DC \uC774\uB984\uC774 Dark\uC608\uC694 \u2014 \uD53C\uADF8\uB9C8\uC5D0\uC11C \uAE30\uBCF8 \uBAA8\uB4DC \uC774\uB984\uC744 Light \uB4F1\uC73C\uB85C \uBC14\uAFD4 \uC8FC\uC138\uC694",
    // 만들기 › 타이포(텍스트 스타일)
    "textStyle.rowDelete": "\uC0AD\uC81C",
    "textStyle.scanSummary": "\uC2E0\uADDC {a} \xB7 \uB4F1\uB85D\uB428 {b}",
    "textStyle.scanLhPct": " \xB7 \uD589\uAC04% {n}",
    "textStyle.scanLsPct": " \xB7 \uC790\uAC04% {n}",
    "textStyle.renaming": "\uC67C\uCABD \uAE00\uC790\uB85C \uC774\uB984\uC744 \uB2E4\uC2DC \uB9E4\uAE30\uB294 \uC911\u2026",
    "textStyle.needSpecs": "\uBA3C\uC800 \u2018\uC2A4\uCE94\u2019\uC73C\uB85C \uC2A4\uD0C0\uC77C\uC744 \uC77D\uC5B4 \uC8FC\uC138\uC694",
    "textStyle.nameSplit": " \xB7 \uC67C\uCABD \uAE00\uC790 {a} \xB7 KRDS \uC774\uB984 {b}",
    // 안 쓰는 변수 찾기(docs/unused-vars.md)
    "unused.menu": "\uC548 \uC4F0\uB294 \uBCC0\uC218 \uCC3E\uAE30\u2026",
    "unused.noVars": "\uB85C\uCEEC \uBCC0\uC218\uAC00 \uC5C6\uC5B4\uC694",
    "unused.title": "\uC548 \uC4F0\uB294 \uBCC0\uC218 \uCC3E\uAE30",
    "unused.titleN": "\uC548 \uC4F0\uB294 \uBCC0\uC218 {n}\uAC1C",
    "unused.loading": "\uD398\uC774\uC9C0\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\u2026",
    "unused.reading": "\uD30C\uC77C\uC744 \uC77D\uB294 \uC911\u2026 {done} / {total} \uD398\uC774\uC9C0",
    "unused.checking": "\uC9C0\uC6B0\uAE30 \uC804\uC5D0 \uD655\uC778\uD558\uB294 \uC911\u2026 {done} / {total} \uD398\uC774\uC9C0",
    "unused.summary": "\uD398\uC774\uC9C0 {p}\uAC1C \xB7 \uB808\uC774\uC5B4 {l}\uAC1C\uB97C \uC77D\uC5C8\uC5B4\uC694",
    "unused.libNote": "\uB2E4\uB978 \uD30C\uC77C\uC5D0\uC11C \uC4F0\uB294 \uBCC0\uC218\uB294 \uD655\uC778\uD558\uC9C0 \uBABB\uD574\uC694",
    "unused.none": "\uC548 \uC4F0\uB294 \uBCC0\uC218\uAC00 \uC5C6\uC5B4\uC694",
    "unused.top": "\uCF20 \uBCC0\uC218\uB9CC \uC9C0\uC6CC\uC694",
    "unused.chainTag": "\uC548 \uC4F0\uB294 \uBCC0\uC218\uB9CC \uAC00\uB9AC\uD0B4",
    "unused.chainTip": "\uC774\uAC83\uC744 \uAC00\uB9AC\uD0A4\uB294 \uBCC0\uC218 {m}\uAC1C\uB3C4 \uC548 \uC4F0\uC5EC\uC694 \u2014 \uADF8 \uBCC0\uC218\uB97C \uB0A8\uAE30\uACE0 \uC774\uAC83\uB9CC \uC9C0\uC6B0\uBA74 \uADF8 \uBCC0\uC218\uB294 '\uC0AD\uC81C\uB41C \uBCC0\uC218'\uB97C \uAC00\uB9AC\uCF1C\uC694",
    "unused.keepWarn": "\uB0A8\uAE30\uB294 \uBCC0\uC218 {m}\uAC1C\uAC00 '\uC0AD\uC81C\uB41C \uBCC0\uC218'\uB97C \uAC00\uB9AC\uD0A4\uAC8C \uB3FC\uC694",
    "unused.deleteBtn": "\uC120\uD0DD\uD55C {k}\uAC1C \uC9C0\uC6B0\uAE30",
    "unused.deleteNeed": "\uC9C0\uC6B8 \uBCC0\uC218\uB97C \uCF1C \uC8FC\uC138\uC694",
    "unused.readFail": "\uD30C\uC77C\uC744 \uC77D\uC9C0 \uBABB\uD588\uC5B4\uC694",
    "unused.deleted": "\uBCC0\uC218 {d}\uAC1C\uB97C \uC9C0\uC6E0\uC5B4\uC694 \xB7 \u2318Z\uB85C \uB418\uB3CC\uB9AC\uAE30",
    "unused.deletedNone": "\uC9C0\uC6B4 \uBCC0\uC218\uAC00 \uC5C6\uC5B4\uC694",
    "unused.skippedTail": " \xB7 \uAC74\uB108\uB700 {s}",
    "unused.skippedTip": "\uC77D\uC740 \uB4A4 \uC4F0\uC774\uAE30 \uC2DC\uC791\uD588\uAC70\uB098(\uC4F0\uB294 \uBCC0\uC218\uAC00 \uAC00\uB9AC\uD0A4\uB294 \uACBD\uC6B0 \uD3EC\uD568) \uC774\uBBF8 \uC9C0\uC6CC\uC84C\uC5B4\uC694",
    "unused.failedTail": " \xB7 \uBABB \uC9C0\uC6C0 {f}",
    "unused.deleteFail": "\uC548 \uC4F0\uB294 \uBCC0\uC218\uB97C \uC9C0\uC6B0\uC9C0 \uBABB\uD588\uC5B4\uC694",
    "op.deleteUnused": "\uC548 \uC4F0\uB294 \uBCC0\uC218 \uC9C0\uC6B0\uAE30",
    "textStyle.missRoleStuck": "{name}: Semantic \uBCC0\uC218 \uC774\uB984\uC744 \uB418\uB3CC\uB9AC\uC9C0 \uBABB\uD588\uC5B4\uC694 \u2014 {vars}",
    "textStyle.fallbackRamp": "\uC120\uD0DD\uC5D0\uC11C \uD14D\uC2A4\uD2B8\uB97C \uBABB \uCC3E\uC544 \uAE30\uBCF8 \uB7A8\uD504\uB85C \uCC44\uC6E0\uC5B4\uC694. \uD3F0\uD2B8\xB7\uAC12\uC744 \uC870\uC815\uD558\uC138\uC694",
    "textStyle.registered": "\uD14D\uC2A4\uD2B8 \uC2A4\uD0C0\uC77C {n}\uAC1C (\uC0DD\uC131 {c} / \uAC31\uC2E0 {u}) \xB7 \uC5F0\uACB0 {b}",
    "textStyle.missingN": " \xB7 \uC54C\uB9BC {k}\uAC1C",
    "textStyle.needScan": "\uBA3C\uC800 \uC2A4\uCE94\uD558\uC138\uC694 \u2014 \uC774\uB984\uC744 \uB2E4\uC2DC \uB9E4\uAE38 \uD45C\uBCF8\uC774 \uC5C6\uC5B4\uC694.",
    "textStyle.warnMixed": "\uBD80\uBD84 \uC11C\uC2DD(\uD63C\uD569) \uD14D\uC2A4\uD2B8\uB294 \uAC74\uB108\uB6F0\uC5C8\uC5B4\uC694.",
    "textStyle.missRename": "\uC774\uB984 \uCDA9\uB3CC '{from}'\u2192'{to}' \u2014 \uAC19\uC740 \uC774\uB984 \uC2A4\uD0C0\uC77C\uC774 \uC788\uC5B4 \uC774\uB984\uC744 \uBC14\uAFB8\uC9C0 \uC54A\uC558\uC5B4\uC694",
    "textStyle.noteLhPx": "{name}: \uC5ED\uD560\uB9C8\uB2E4 \uD589\uAC04 \uC6D0\uBCF8\uC774 \uB2EC\uB77C px\uB85C \uAE30\uB85D(\uC6D0\uBCF8 \uD45C\uAE30 \uC0DD\uB7B5)",
    "textStyle.noteLsPx": "{name}: \uC5ED\uD560\uB9C8\uB2E4 \uC790\uAC04 \uC6D0\uBCF8\uC774 \uB2EC\uB77C px\uB85C \uAE30\uB85D(\uC6D0\uBCF8 \uD45C\uAE30 \uC0DD\uB7B5)",
    "textStyle.missStyle": "{name}: \uD3F0\uD2B8 {style}\u2192Regular",
    "textStyle.missFamily": "{name}: \uD3F0\uD2B8 '{family}' \uC5C6\uC74C",
    "textStyle.missFontKeep": "{name}: \uAE00\uAF34 '{font}'\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD574 \uAC12 \xB7 \uBCC0\uC218 \uC5F0\uACB0\uC744 \uAC74\uB108\uB6F0\uC5C8\uC5B4\uC694",
    "textStyle.missError": "{name}: \uB05D\uAE4C\uC9C0 \uB9CC\uB4E4\uC9C0 \uBABB\uD588\uC5B4\uC694(\uC77C\uBD80 \uAC12\uB9CC \uB4E4\uC5B4\uAC14\uC744 \uC218 \uC788\uC5B4\uC694) \u2014 {error}",
    "textStyle.missVar": "{name}: \uBCC0\uC218 '{var}'\uC774 \uC5C6\uC5B4 \uC5F0\uACB0\uD558\uC9C0 \uC54A\uC558\uC5B4\uC694",
    "textStyle.missDecimal": "{name}: \uAE00\uC790 \uD06C\uAE30\uAC00 \uC18C\uC218\uB77C \uB9CC\uB4E4\uC9C0 \uC54A\uC558\uC5B4\uC694({size}px)",
    "textStyle.decimalRow": "\uAE00\uC790 \uD06C\uAE30\uAC00 \uC18C\uC218\uB77C \uB9CC\uB4E4\uC9C0 \uC54A\uC544\uC694",
    "textStyle.noRegistrable": "\uB9CC\uB4E4 \uC218 \uC788\uB294 \uC2A4\uD0C0\uC77C\uC774 \uC5C6\uC5B4\uC694 \u2014 \uAE00\uC790 \uD06C\uAE30\uAC00 \uBAA8\uB450 \uC18C\uC218\uC608\uC694",
    "textStyle.noteKeepLh": "{name}: \uD589\uAC04 \uBCC0\uC218 \uC5F0\uACB0\uC744 \uC9C0\uCF30\uC5B4\uC694 \u2014 {n}% \uAD50\uC815 \uBCF4\uB958",
    "textStyle.noteKeepLs": "{name}: \uC790\uAC04 \uBCC0\uC218 \uC5F0\uACB0\uC744 \uC9C0\uCF30\uC5B4\uC694 \u2014 {n}% \uAD50\uC815 \uBCF4\uB958",
    "textStyle.noteLhPct": "{role}: \uD589\uAC04 {n}% \uC720\uC9C0 \u2014 \uBCC0\uC218 \uC5F0\uACB0 \uC548 \uD568",
    "textStyle.noteLsPct": "{role}: \uC790\uAC04 {n}% \uC720\uC9C0 \u2014 \uBCC0\uC218 \uC5F0\uACB0 \uC548 \uD568",
    // 설정 › 라이선스
    "license.priceHint": "\uBB34\uB8CC \xB7 \uC720\uB8CC \uC5F0 $39 \xB7 \uAE30\uAE30 1\uB300",
    "license.setupHint": "\uBC30\uD3EC \uC804\uC774\uB77C \uD0A4 \uAC80\uC99D\xB7\uAD6C\uB3C5 \uB9C1\uD06C\uB294 \uC544\uC9C1 \uB3D9\uC791\uD558\uC9C0 \uC54A\uC544\uC694",
    // “현재” 줄 — FREE / PAID는 그대로(§2.9 예외)
    "license.current": "\uD604\uC7AC: {tier} ({source}){expPart}",
    "license.srcKey": "\uB77C\uC774\uC120\uC2A4 \uD0A4{statusPart}",
    "license.srcKeyStatus": " \xB7 {status}",
    "license.status.active": "\uC0AC\uC6A9 \uC911",
    "license.status.grace": "\uC720\uC608 \uAE30\uAC04",
    "license.status.expired": "\uB9CC\uB8CC",
    "license.srcDev": "\uAC1C\uBC1C\uC6A9 \uAC15\uC81C",
    "license.srcNone": "\uC5C6\uC74C",
    "license.expires": " \xB7 \uB9CC\uB8CC {date}",
    // 알림(code.ts postLicense) — 상태 줄
    "license.noteApplied": "\uB77C\uC774\uC120\uC2A4\uB97C \uC801\uC6A9\uD588\uC5B4\uC694",
    "license.noteGrace": "\uC624\uD504\uB77C\uC778\uC774\uC5D0\uC694 \u2014 \uC774 \uAE30\uAE30\uC5D0 \uC800\uC7A5\uB41C \uB77C\uC774\uC120\uC2A4\uB85C \uACC4\uC18D \uC368\uC694",
    "license.noteOffline": "\uC624\uD504\uB77C\uC778\uC774\uC5D0\uC694 \u2014 \uD0A4\uB97C \uD655\uC778\uD560 \uC218 \uC5C6\uC5B4\uC694",
    "license.verifyFailed": "\uD0A4\uB97C \uD655\uC778\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694 \u2014 \uD0A4\uB97C \uB2E4\uC2DC \uD655\uC778\uD574 \uC8FC\uC138\uC694",
    "license.noteCleared": "\uB77C\uC774\uC120\uC2A4 \uD0A4\uB97C \uC9C0\uC6E0\uC5B4\uC694",
    // 서버가 code로 알려 준 사유 — 상태 줄(결정 5-(b))
    "license.err.server.expired": "\uAD6C\uB3C5\uC774 \uB05D\uB0AC\uC5B4\uC694 \u2014 \uACB0\uC81C \xB7 \uAD6C\uB3C5 \uAD00\uB9AC\uC5D0\uC11C \uAC31\uC2E0\uD558\uC138\uC694",
    "license.err.server.invalid": "\uD0A4\uAC00 \uB9DE\uC9C0 \uC54A\uC544\uC694 \u2014 \uD0A4\uB97C \uB2E4\uC2DC \uD655\uC778\uD558\uC138\uC694",
    "license.err.server.limit": "\uAE30\uAE30 \uD65C\uC131\uD654 \uD55C\uB3C4\uB97C \uB118\uC5C8\uC5B4\uC694 \u2014 \uB2E4\uB978 \uAE30\uAE30\uC5D0\uC11C [\uD574\uC81C]\uD55C \uB4A4 \uB2E4\uC2DC \uAC80\uC99D\uD558\uC138\uC694",
    "license.err.server.server": "\uAC80\uC99D \uC11C\uBC84\uC5D0 \uBB38\uC81C\uAC00 \uC788\uC5B4\uC694 \u2014 \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694",
    // 플러그인 쪽 기술 사유 — 툴팁(noteTip)에만
    "license.err.badBody": "\uC751\uB2F5 \uBCF8\uBB38\uC744 \uD574\uC11D\uD560 \uC218 \uC5C6\uC5B4\uC694",
    "license.err.noToken": "\uC11C\uBA85 \uD1A0\uD070\uC774 \uC5C6\uB294 \uC751\uB2F5",
    "license.err.b64Len": "\uC798\uBABB\uB41C base64url \uAE38\uC774",
    "license.err.b64Char": "\uC798\uBABB\uB41C base64url \uBB38\uC790",
    "license.err.notJwt": "JWT \uD615\uC2DD \uC544\uB2D8(\uC810 3\uBD84\uD560 \uD544\uC694)",
    "license.err.noExp": "exp \uD074\uB808\uC784 \uC5C6\uC74C",
    "license.err.expired": "\uD1A0\uD070 \uB9CC\uB8CC\uB428",
    "license.err.notYet": "\uC544\uC9C1 \uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 \uD1A0\uD070(nbf)",
    "license.err.iss": "\uBC1C\uAE09\uC790(iss) \uBD88\uC77C\uCE58",
    "license.err.aud": "\uB300\uC0C1(aud) \uBD88\uC77C\uCE58",
    "license.err.tier": "\uC54C \uC218 \uC5C6\uB294 \uD2F0\uC5B4",
    "license.err.decode": "\uD1A0\uD070 \uB514\uCF54\uB4DC \uC2E4\uD328",
    "license.err.alg": "\uC11C\uBA85 \uC54C\uACE0\uB9AC\uC998 \uC5C6\uC74C(alg=none \uAC70\uBD80)",
    "license.err.sig": "\uC11C\uBA85 \uAC80\uC99D \uC2E4\uD328",
    // 오류 설명(errors.ts explainError) — 설명 · 할 일
    "err.font": "\uAE00\uAF34\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694.",
    "err.fontAction": "\uADF8 \uD3F0\uD2B8\uB97C \uC124\uCE58\xB7\uD65C\uC131\uD654\uD55C \uB4A4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694.",
    "err.scope": "\uBCC0\uC218 \uC2A4\uCF54\uD504\uAC00 \uB9DE\uC9C0 \uC54A\uC544\uC694.",
    "err.scopeAction": "\u2018\uD1A0\uD070 \uB9CC\uB4E4\uAE30\u2019\uB97C \uB2E4\uC2DC \uC2E4\uD589\uD574 \uC2A4\uCF54\uD504\uB97C \uAC31\uC2E0\uD558\uC138\uC694.",
    "err.prop": "\uC18D\uC131 \uAC12\uC774 \uB9DE\uC9C0 \uC54A\uC544\uC694(\uC608: \uBC1C\uD589 \uC548 \uD55C \uCEF4\uD3EC\uB10C\uD2B8).",
    "err.propAction": "\uCEF4\uD3EC\uB10C\uD2B8\uB97C \uBC1C\uD589\uD558\uAC70\uB098 \uB300\uC0C1 \uB808\uC774\uC5B4\uB97C \uD655\uC778\uD558\uC138\uC694.",
    "err.readonly": "\uD3B8\uC9D1 \uAD8C\uD55C\uC774 \uC5C6\uAC70\uB098 \uC77D\uAE30 \uC804\uC6A9 \uD30C\uC77C\uC774\uC5D0\uC694.",
    "err.readonlyAction": "\uD3B8\uC9D1 \uAC00\uB2A5\uD55C \uD30C\uC77C\uC5D0\uC11C \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694.",
    "err.network": "\uB124\uD2B8\uC6CC\uD06C \uC624\uB958\uAC00 \uB0AC\uC5B4\uC694.",
    "err.networkAction": "\uC5F0\uACB0\uC744 \uD655\uC778\uD558\uACE0 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694.",
    "err.storage": "\uB85C\uCEEC \uC800\uC7A5\uC18C\uC5D0 \uC811\uADFC\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694.",
    "err.storageAction": "\uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694.",
    "err.unknown": "\uC54C \uC218 \uC5C6\uB294 \uC624\uB958",
    "err.unknownAction": "\uC120\uD0DD\uC744 \uD655\uC778\uD558\uACE0 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694.",
    "err.badHex": "\uC798\uBABB\uB41C hex: {value}"
    // 접근성 · 국제화
  };
  function t(key, vars) {
    var _a;
    const tpl = (_a = STRINGS[key]) != null ? _a : key;
    if (!vars) return tpl;
    return tpl.replace(/\{(\w+)\}/g, (_, k) => k in vars ? String(vars[k]) : `{${k}}`);
  }

  // src/lib/nodePaint.ts
  var VECTOR_TYPES = /* @__PURE__ */ new Set(["VECTOR", "BOOLEAN_OPERATION", "STAR", "POLYGON", "LINE"]);
  function paintsOf(node, field) {
    if (node == null || typeof node !== "object" || !(field in node)) return null;
    const p = node[field];
    return Array.isArray(p) ? p : null;
  }
  function hasVisibleFill(node) {
    const f = paintsOf(node, "fills");
    return !!f && f.some((p) => p.visible !== false);
  }
  function hasImageFill(node) {
    const f = paintsOf(node, "fills");
    return !!f && f.some((p) => p.visible !== false && p.type === "IMAGE");
  }
  function hasColorFill(node) {
    const f = paintsOf(node, "fills");
    return !!f && f.some((p) => p.visible !== false && p.type !== "IMAGE");
  }
  function hasVisibleStroke(node) {
    const s = paintsOf(node, "strokes");
    return !!s && s.some((p) => p.visible !== false);
  }

  // src/lib/tokens.ts
  var clamp01 = (n) => Math.min(1, Math.max(0, n));
  var to255 = (c) => Math.round(clamp01(c) * 255);
  function rgbToHex(rgb) {
    const h = (c) => to255(c).toString(16).padStart(2, "0");
    return `#${h(rgb.r)}${h(rgb.g)}${h(rgb.b)}`.toLowerCase();
  }
  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) throw new Error(t("err.badHex", { value: hex }));
    const n = parseInt(m[1], 16);
    return { r: (n >> 16 & 255) / 255, g: (n >> 8 & 255) / 255, b: (n & 255) / 255 };
  }
  function roundAlpha(a) {
    return Math.round(clamp01(a != null ? a : 1) * 100) / 100;
  }
  function colorKey(hex, alpha) {
    const a = roundAlpha(alpha);
    return a === 1 ? hex.toLowerCase() : `${hex.toLowerCase()}@${a}`;
  }
  function exportColorHex(c) {
    var _a;
    const a = Math.round(clamp01((_a = c.a) != null ? _a : 1) * 255);
    return a >= 255 ? rgbToHex(c) : `${rgbToHex(c)}${a.toString(16).padStart(2, "0")}`;
  }
  function alphaPct(alpha) {
    return Math.round(alpha * 100);
  }
  function resolvedTypeFor(category) {
    switch (category) {
      case "color":
      case "effectColor":
        return "COLOR";
      case "fontFamily":
        return "STRING";
      default:
        return "FLOAT";
    }
  }
  function resolvedTypeForToken(t2) {
    return resolvedTypeFor(t2.category);
  }
  function unitDescription(t2) {
    if ((t2.category === "lineHeight" || t2.category === "letterSpacing") && t2.unit && t2.unit !== "px" && typeof t2.value === "number") {
      return stringValueForUnit(t2.value, t2.unit);
    }
    return void 0;
  }
  function pxConversions(tokens, base) {
    var _a;
    const out = [];
    for (const t2 of tokens) {
      if (!t2.unit || t2.unit === "px" || typeof t2.value !== "number") continue;
      out.push({
        name: t2.name,
        from: stringValueForUnit(t2.value, t2.unit),
        // 토큰이 자기 폰트 크기를 알고 있으면 그것으로 환산(없으면 base) — setGlobalLiteral과 같은 규칙.
        to: toPx(t2.value, t2.unit, { base, fontSize: (_a = t2.fontSize) != null ? _a : base })
      });
    }
    return out;
  }
  function stringValueForUnit(value, unit) {
    switch (unit) {
      case "percent":
        return `${value}%`;
      case "em":
        return `${value}em`;
      case "rem":
        return `${value}rem`;
      case "ratio":
        return `${value}`;
      case "px":
        return `${value}px`;
    }
  }
  function scopesFor(source) {
    switch (source) {
      case "fill":
        return ["ALL_FILLS"];
      case "stroke":
        return ["STROKE_COLOR"];
      case "strokeWidth":
        return ["STROKE_FLOAT"];
      case "effectColor":
        return ["EFFECT_COLOR"];
      case "gap":
        return ["GAP"];
      case "size":
        return ["WIDTH_HEIGHT"];
      case "radius":
        return ["CORNER_RADIUS"];
      case "fontSize":
        return ["FONT_SIZE"];
      case "lineHeight":
        return ["LINE_HEIGHT"];
      case "letterSpacing":
        return ["LETTER_SPACING"];
      case "fontFamily":
        return ["FONT_FAMILY"];
      case "fontWeight":
        return ["FONT_WEIGHT"];
      case "effectFloat":
        return ["EFFECT_FLOAT"];
      case "opacity":
        return ["OPACITY"];
    }
  }
  function scopesForSources(sources) {
    const set = /* @__PURE__ */ new Set();
    for (const s of sources) for (const sc of scopesFor(s)) set.add(sc);
    return [...set];
  }
  var VALID_SCOPES = {
    COLOR: /* @__PURE__ */ new Set(["ALL_SCOPES", "ALL_FILLS", "FRAME_FILL", "SHAPE_FILL", "TEXT_FILL", "STROKE_COLOR", "EFFECT_COLOR"]),
    FLOAT: /* @__PURE__ */ new Set(["ALL_SCOPES", "GAP", "WIDTH_HEIGHT", "CORNER_RADIUS", "STROKE_FLOAT", "FONT_SIZE", "LINE_HEIGHT", "LETTER_SPACING", "FONT_WEIGHT", "EFFECT_FLOAT", "OPACITY"]),
    STRING: /* @__PURE__ */ new Set(["ALL_SCOPES", "FONT_FAMILY"]),
    BOOLEAN: /* @__PURE__ */ new Set(["ALL_SCOPES"])
  };
  function scopesForType(scopes, type) {
    const ok = VALID_SCOPES[type];
    return scopes.filter((s) => ok.has(s));
  }
  function scopeForSemanticRole(role) {
    const segs = role.toLowerCase().split("/");
    const prop = segs[0] === "color" && segs.length >= 2 ? segs[1] : segs[0];
    if (segs[0] !== "color") {
      switch (segs[0]) {
        case "spacing":
          return ["GAP"];
        case "radius":
          return ["CORNER_RADIUS"];
        case "stroke-width":
          return ["STROKE_FLOAT"];
        case "size":
          return ["WIDTH_HEIGHT"];
        case "opacity":
          return ["OPACITY"];
      }
    }
    switch (prop) {
      case "text":
        return ["TEXT_FILL"];
      case "border":
        return ["STROKE_COLOR"];
      case "icon":
        return ["SHAPE_FILL", "STROKE_COLOR"];
      case "shadow":
        return segs[0] === "color" ? ["EFFECT_COLOR"] : void 0;
      case "surface":
      case "background":
        return ["FRAME_FILL", "SHAPE_FILL"];
      default:
        return void 0;
    }
  }
  function toPx(value, unit, opts = {}) {
    var _a, _b;
    const base = (_a = opts.base) != null ? _a : 16;
    const fontSize = (_b = opts.fontSize) != null ? _b : base;
    switch (unit) {
      case "px":
        return value;
      case "rem":
        return value * base;
      case "em":
        return value * fontSize;
      case "percent":
        return fontSize * value / 100;
      case "ratio":
        return fontSize * value;
    }
  }
  function colorTokenName(hex) {
    return `color/${hex.replace("#", "").toLowerCase()}`;
  }
  function numberTokenName(group, value) {
    const v = Number.isInteger(value) ? String(value) : String(value).replace(".", "_");
    return `${group}/${v}`;
  }

  // src/lib/color.ts
  var mod360 = (h) => (h % 360 + 360) % 360;
  function srgbToLinear(c) {
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  function linearToSrgb(c) {
    return c <= 31308e-7 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  }
  function linearRgbToOklab(r, g, b) {
    const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
    const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
    const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
    const l_ = Math.cbrt(l);
    const m_ = Math.cbrt(m);
    const s_ = Math.cbrt(s);
    return {
      L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
      a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
      b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_
    };
  }
  function oklabToLinearRgb(lab) {
    const l_ = lab.L + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
    const m_ = lab.L - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
    const s_ = lab.L - 0.0894841775 * lab.a - 1.291485548 * lab.b;
    const l = l_ ** 3;
    const m = m_ ** 3;
    const s = s_ ** 3;
    return {
      r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
    };
  }
  function oklabToOklch(lab) {
    const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
    const h = c < 1e-7 ? 0 : mod360(Math.atan2(lab.b, lab.a) * 180 / Math.PI);
    return { l: lab.L, c, h };
  }
  function oklchToOklab(lch) {
    const hr = lch.h * Math.PI / 180;
    return { L: lch.l, a: lch.c * Math.cos(hr), b: lch.c * Math.sin(hr) };
  }
  function rgbToOklch(rgb) {
    return oklabToOklch(linearRgbToOklab(srgbToLinear(rgb.r), srgbToLinear(rgb.g), srgbToLinear(rgb.b)));
  }
  function oklchToRgb(lch) {
    const lin = oklabToLinearRgb(oklchToOklab(lch));
    return { r: clamp01(linearToSrgb(lin.r)), g: clamp01(linearToSrgb(lin.g)), b: clamp01(linearToSrgb(lin.b)) };
  }
  function hexToOklch(hex) {
    return rgbToOklch(hexToRgb(hex));
  }
  function oklchToHex(lch) {
    return rgbToHex(oklchToRgb(lch));
  }
  function inGamut(lch) {
    const lin = oklabToLinearRgb(oklchToOklab(lch));
    const eps = 1e-4;
    return lin.r >= -eps && lin.r <= 1 + eps && lin.g >= -eps && lin.g <= 1 + eps && lin.b >= -eps && lin.b <= 1 + eps;
  }
  function clampToGamut(lch) {
    if (inGamut(lch)) return lch;
    let lo = 0;
    let hi = lch.c;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut({ l: lch.l, c: mid, h: lch.h })) lo = mid;
      else hi = mid;
    }
    return { l: lch.l, c: lo, h: lch.h };
  }

  // src/lib/colorName.ts
  var STEP_LIST = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  var STEP_L = STEP_LIST.map((_, i) => 0.97 + (0.16 - 0.97) * (i / (STEP_LIST.length - 1)));
  var ACHROMATIC_C = 0.03;
  var HUE_CENTERS = [
    { name: "red", h: 25 },
    { name: "orange", h: 65 },
    { name: "yellow", h: 100 },
    { name: "green", h: 145 },
    { name: "teal", h: 190 },
    { name: "blue", h: 250 },
    { name: "indigo", h: 285 },
    { name: "purple", h: 320 },
    { name: "pink", h: 355 }
  ];
  var HUE_FAMILIES = [...HUE_CENTERS.map((c) => c.name), "gray"];
  function angularDist(a, b) {
    const d = Math.abs(((a - b) % 360 + 360) % 360);
    return Math.min(d, 360 - d);
  }
  function hueName(h) {
    let best = HUE_CENTERS[0];
    let bestD = Infinity;
    for (const c of HUE_CENTERS) {
      const d = angularDist(h, c.h);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    return best.name;
  }
  function stepForL(l) {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < STEP_LIST.length; i++) {
      const d = Math.abs(STEP_L[i] - l);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return STEP_LIST[best];
  }
  function classifyColor(hex) {
    const o = hexToOklch(hex);
    const achromatic = o.c < ACHROMATIC_C;
    if (achromatic && o.l >= 0.985) return { family: "gray", step: 0, achromatic };
    if (achromatic && o.l <= 0.05) return { family: "gray", step: 1e3, achromatic };
    return { family: achromatic ? "gray" : hueName(o.h), step: stepForL(o.l), achromatic };
  }
  function stepRefL(step) {
    if (step === 0) return 1;
    if (step === 1e3) return 0;
    const i = STEP_LIST.indexOf(step);
    if (i >= 0) return STEP_L[i];
    for (let k = 0; k < STEP_LIST.length - 1; k++) if ((STEP_LIST[k] + STEP_LIST[k + 1]) / 2 === step) return (STEP_L[k] + STEP_L[k + 1]) / 2;
    return NaN;
  }
  function midSteps(step) {
    const i = STEP_LIST.indexOf(step);
    if (i < 0) return { lighter: null, darker: null };
    return { lighter: i > 0 ? (STEP_LIST[i - 1] + step) / 2 : null, darker: i < STEP_LIST.length - 1 ? (step + STEP_LIST[i + 1]) / 2 : null };
  }
  var STEP_SET = /* @__PURE__ */ new Set([0, 1e3, ...STEP_LIST]);
  var COLOR_NAME_RE = /^color\/([a-z]+)\/(\d+)((?:-[a-z0-9]+)*)$/;
  function isExtractOnlyColorName(name) {
    const m = COLOR_NAME_RE.exec(name);
    if (!m) return false;
    if (!STEP_SET.has(Number(m[2]))) return true;
    return m[3].split("-").filter(Boolean).some((p) => /^\d+$/.test(p));
  }
  function resolveGlobalNames(reqs, file) {
    var _a, _b;
    const out = /* @__PURE__ */ new Map();
    const memo = /* @__PURE__ */ new Map();
    const reserved = /* @__PURE__ */ new Map();
    for (const r of reqs) reserved.set(r.name, /* @__PURE__ */ new Set([...(_a = reserved.get(r.name)) != null ? _a : [], r.key]));
    const assigned = /* @__PURE__ */ new Map();
    const hexBase = /* @__PURE__ */ new Map();
    const free = (name, key) => {
      if (file.has(name)) return false;
      const a = assigned.get(name);
      if (a != null && a !== key) return false;
      const rs = reserved.get(name);
      return !rs || rs.size === 1 && rs.has(key) || [...rs].every((k) => k === key);
    };
    const nextN = (base, key) => {
      for (let i = 2; ; i++) if (free(`${base}-${i}`, key)) return `${base}-${i}`;
    };
    const fileNames = [...file.keys()].sort();
    for (const r of reqs) {
      const mk = `${r.name}\0${r.key}`;
      const hit = memo.get(mk);
      if (hit) {
        out.set(r.name, hit);
        continue;
      }
      let res;
      if (((_b = file.get(r.name)) == null ? void 0 : _b.key) === r.key) res = { name: r.name, reuse: true };
      else if (r.hex) {
        const fam = classifyColor(r.hex).family;
        const n = fileNames.find((x) => {
          var _a2, _b2;
          return ((_a2 = file.get(x)) == null ? void 0 : _a2.key) === r.key && ((_b2 = COLOR_NAME_RE.exec(x)) == null ? void 0 : _b2[1]) === fam && isExtractOnlyColorName(x);
        });
        if (n) res = { name: n, reuse: true };
      }
      if (!res) {
        if (!r.hex) res = { name: free(r.name, r.key) ? r.name : nextN(r.name, r.key), reuse: false };
        else {
          const hex = r.hex;
          const a = r.alphaPct != null && r.alphaPct < 100 ? r.alphaPct : void 0;
          let base = hexBase.get(hex);
          if (!base) {
            const orig = r.name.replace(/-a\d+(-\d+)?$/, "");
            base = baseFor(orig, hex, r.key, file, free, nextN, a != null);
            hexBase.set(hex, base);
          }
          const want = a != null ? `${base}-a${a}` : base;
          res = { name: free(want, r.key) ? want : nextN(want, r.key), reuse: false };
        }
      }
      if (!res.reuse) assigned.set(res.name, r.key);
      if (res.reuse && r.hex && !(r.alphaPct != null && r.alphaPct < 100)) hexBase.set(r.hex, res.name);
      memo.set(mk, res);
      out.set(r.name, res);
    }
    return out;
  }
  function baseFor(orig, hex, key, file, free, nextN, translucent) {
    const f = file.get(orig);
    if (f ? !!f.hex && f.hex === hex : free(orig, key) || translucent) return orig;
    const m = COLOR_NAME_RE.exec(orig);
    if (!m) return orig;
    const fam = m[1];
    const step = Number(m[2]);
    const stepName = `color/${fam}/${step}`;
    const plain = m[3] === "";
    if (plain && STEP_LIST.includes(step)) {
      const ownerL = (f == null ? void 0 : f.hex) ? hexToOklch(f.hex).l : stepRefL(step);
      const side = hexToOklch(hex).l > ownerL ? "lighter" : "darker";
      const mid = midSteps(step)[side];
      if (mid != null && !file.has(`color/${fam}/${mid}`) && free(`color/${fam}/${mid}`, key)) return `color/${fam}/${mid}`;
    }
    if (plain && STEP_SET.has(step)) return nextN(stepName, key);
    const c = classifyColor(hex);
    return nextN(`color/${c.family}/${c.step}`, key);
  }

  // src/lib/palette.ts
  var STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  var LOW_CHROMA = 0.03;
  function isPaletteColorName(name) {
    if (!name.startsWith("color/")) return false;
    const parts = name.split("/");
    if (parts.length !== 3) return false;
    const base = parts[1].replace(/-\d+$/, "");
    if (!HUE_FAMILIES.includes(base)) return false;
    return /^\d+$/.test(parts[2]) && STEPS.includes(Number(parts[2]));
  }
  function paletteFamilyOf(name) {
    if (!isPaletteColorName(name)) return null;
    return name.split("/")[1];
  }

  // src/lib/usageRoles.ts
  var STRUCTURAL = /* @__PURE__ */ new Set(["container", "wrapper", "stack-x", "stack-y", "shape", "group", "content", "body", "row", "text-group", "media"]);
  function pickOwner(dsRole, highConfidence, known) {
    if (dsRole && known(dsRole) && !STRUCTURAL.has(dsRole)) return dsRole;
    return highConfidence != null ? highConfidence : void 0;
  }
  function composeName(group, prop) {
    return prop ? `${group}/${prop}` : `${group}/default`;
  }
  var PILL_RADIUS = 9999;
  function isPillRadius(v, width, height) {
    const short = Math.min(width, height);
    return v > 0 && Number.isFinite(short) && v >= short / 2;
  }
  function pillCorners(values, width, height) {
    return values.map((v) => isPillRadius(v, width, height) ? PILL_RADIUS : v);
  }
  var near = (a, b) => Math.abs(a - b) < 5e-3;
  function paddingProp(field, p) {
    if (near(p.left, p.right) && near(p.top, p.bottom) && near(p.left, p.top)) return "padding";
    if (field === "paddingLeft" || field === "paddingRight") return near(p.left, p.right) ? "padding-x" : field === "paddingLeft" ? "padding-left" : "padding-right";
    return near(p.top, p.bottom) ? "padding-y" : field === "paddingTop" ? "padding-top" : "padding-bottom";
  }
  var CORNER_SUFFIX = {
    topLeftRadius: "top-left",
    topRightRadius: "top-right",
    bottomLeftRadius: "bottom-left",
    bottomRightRadius: "bottom-right"
  };
  var SIDE_SUFFIX = {
    strokeTopWeight: "top",
    strokeRightWeight: "right",
    strokeBottomWeight: "bottom",
    strokeLeftWeight: "left"
  };
  function allSame(values) {
    const live = values.filter((v) => v > 0);
    return live.every((v) => near(v, live[0]));
  }
  function radiusName(field, corners) {
    var _a;
    if (allSame(corners)) {
      const live = corners.filter((v) => v > 0);
      return live.length && near(live[0], PILL_RADIUS) ? "radius/full" : composeName("radius", void 0);
    }
    return `radius/${(_a = CORNER_SUFFIX[field]) != null ? _a : "default"}`;
  }
  function strokeName(field, sides) {
    var _a;
    if (field === "strokeWeight" || allSame(sides)) return composeName("stroke-width", void 0);
    return `stroke-width/${(_a = SIDE_SUFFIX[field]) != null ? _a : "default"}`;
  }
  function simpleNumericName(field, sizeKind) {
    switch (field) {
      case "itemSpacing":
        return composeName("spacing", "gap");
      case "counterAxisSpacing":
      case "gridRowGap":
        return composeName("spacing", "row-gap");
      case "gridColumnGap":
        return composeName("spacing", "column-gap");
      case "opacity":
        return composeName("opacity", void 0);
      case "width":
      case "height":
        return sizeKind ? `size/${sizeKind}` : null;
      default:
        return null;
    }
  }
  var TEXT_GROUP = {
    fontSize: "font-size",
    lineHeight: "line-height",
    letterSpacing: "letter-spacing",
    fontFamily: "font-family"
  };
  function textUsageName(field) {
    const g = TEXT_GROUP[field];
    return g ? `${g}/text` : null;
  }
  function colorUse(nodeType, field, insideIconFrame) {
    if (field === "effects") return "shadow";
    if (nodeType === "TEXT" && field === "fills") return "text";
    if (VECTOR_TYPES.has(nodeType)) return "icon";
    if (insideIconFrame && (nodeType === "RECTANGLE" || nodeType === "ELLIPSE")) return "icon";
    return field === "fills" ? "background" : "border";
  }
  function bgKindOf(hex) {
    const o = hexToOklch(hex);
    if (o.c >= LOW_CHROMA) return "chroma";
    return o.l < 0.5 ? "dark" : "light";
  }
  function colorSlotKey(hex, bg, alpha) {
    const k = colorKey(hex, alpha);
    return bg ? `${k}|${bg}` : k;
  }
  var INVERSE_USES = /* @__PURE__ */ new Set(["text", "icon", "border"]);
  var byCountThenHex = (a, b) => b.count - a.count || (a.hex < b.hex ? -1 : a.hex > b.hex ? 1 : 0);
  function colorRoleRef(colors, existingDefaultHex, use) {
    var _a, _b;
    if (existingDefaultHex) return existingDefaultHex.split("@")[0].toLowerCase();
    const totals = /* @__PURE__ */ new Map();
    const opaque = /* @__PURE__ */ new Set();
    for (const c of colors) {
      const hex = c.hex.toLowerCase();
      totals.set(hex, ((_a = totals.get(hex)) != null ? _a : 0) + c.count);
      if (c.alpha == null || c.alpha >= 1) opaque.add(hex);
    }
    const all = [...totals].map(([hex, count]) => ({ hex, count }));
    if (use === "background" || use === "text" || use === "icon") {
      const neutral = all.filter((x) => opaque.has(x.hex) && hexToOklch(x.hex).c < LOW_CHROMA);
      if (neutral.length) {
        const sign = use === "background" ? -1 : 1;
        return neutral.sort((a, b) => sign * (lOf(a.hex) - lOf(b.hex)) || byCountThenHex(a, b))[0].hex;
      }
    }
    return (_b = all.sort(byCountThenHex)[0]) == null ? void 0 : _b.hex;
  }
  function colorRoleBases(colors, existingDefaultHex, use) {
    const out = /* @__PURE__ */ new Map();
    const refHex = colorRoleRef(colors, existingDefaultHex, use);
    if (!refHex) return out;
    const ref = hexToOklch(refHex);
    const refDark = ref.l < 0.35;
    const refExtreme = refDark || ref.l >= 0.85;
    const sameSide = ref.l < 0.5 ? "dark" : "light";
    const inverseUse = use == null || INVERSE_USES.has(use);
    for (const c of colors) {
      const hex = c.hex.toLowerCase();
      const key = colorSlotKey(hex, c.bg, c.alpha);
      if (hex === refHex) {
        out.set(key, "default");
        continue;
      }
      const o = hexToOklch(hex);
      const opposite = refDark ? o.l >= 0.85 : o.l < 0.35;
      if (inverseUse && refExtreme && opposite && c.bg && (c.bg === "chroma" || c.bg === sameSide)) {
        out.set(key, "inverse");
        continue;
      }
      if (o.c >= LOW_CHROMA) {
        out.set(key, "brand");
        continue;
      }
      out.set(key, o.l > ref.l ? "subtle" : "strong");
    }
    return out;
  }
  function nameKindOf(base, value) {
    if (base.startsWith("color/")) {
      const last = base.slice(base.lastIndexOf("/") + 1);
      if (last === "brand") return "chroma";
      if (last === "subtle" || last === "strong") return "ladder";
      if (last === "inverse") return "inverse";
      return "default";
    }
    if (base === "radius/full") return "plain";
    if (value === "" || Number.isNaN(Number(value))) return "plain";
    return base.startsWith("line-height/") || base.startsWith("letter-spacing/") ? "leading" : "number";
  }
  var SIZE_SMALL = ["sm", "xs", "2xs"];
  var SIZE_LARGE = ["lg", "xl", "2xl"];
  var TIGHT = ["tight", "tighter", "tightest"];
  var LOOSE = ["loose", "looser", "loosest"];
  var isDefaultTail = (base) => base.endsWith("/default");
  var tailName = (base, word) => isDefaultTail(base) ? `${base.slice(0, base.lastIndexOf("/"))}/${word}` : `${base}-${word}`;
  var LIGHTER = ["subtle", "subtler", "subtlest"];
  var DARKER = ["strong", "stronger", "strongest"];
  var LADDER_WORDS = [...LIGHTER, ...DARKER];
  var FAMILIES = ["red", "orange", "yellow", "green", "teal", "blue", "indigo", "purple", "pink"];
  var esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  function familyRe(base, kind) {
    const lad = LADDER_WORDS.join("|");
    const tail = `(?:-(?:${lad})|-a\\d+)?(?:-\\d+)?$`;
    switch (kind) {
      case "number":
      case "leading": {
        const words = (kind === "leading" ? [...TIGHT, ...LOOSE] : [...SIZE_SMALL, ...SIZE_LARGE]).join("|");
        if (isDefaultTail(base)) return new RegExp(`^${esc(base.slice(0, base.lastIndexOf("/")))}/(?:default|${words})(?:-\\d+)?$`);
        return new RegExp(`^${esc(base)}(?:-(?:${words}))?(?:-\\d+)?$`);
      }
      case "plain":
        return new RegExp(`^${esc(base)}(?:-\\d+)?$`);
      case "default":
        return new RegExp(`^${esc(base)}${tail}`);
      case "inverse":
        return new RegExp(`^${esc(base)}(?:-(?:${lad}))?${tail}`);
      case "chroma":
        return new RegExp(`^${esc(base)}(?:-(?:${FAMILIES.join("|")})(?:-(?:${lad}))?|-(?:${lad}))?${tail}`);
      case "ladder": {
        const i = base.lastIndexOf("/");
        const words = base.slice(i + 1) === "strong" ? DARKER : LIGHTER;
        return new RegExp(`^${esc(base.slice(0, i))}/(?:${words.join("|")})${tail}`);
      }
    }
  }
  function familyRank(name, base) {
    if (name === base) return [0, 0, ""];
    const m = /-(\d+)$/.exec(name);
    return m ? [2, Number(m[1]), name] : [1, 0, name];
  }
  function byFamilyOrder(base) {
    return (a, b) => {
      const x = familyRank(a, base);
      const y = familyRank(b, base);
      return x[0] - y[0] || x[1] - y[1] || (x[2] < y[2] ? -1 : x[2] > y[2] ? 1 : 0);
    };
  }
  var hexOfKey = (v) => v.split("@")[0].toLowerCase();
  var alphaOfKey = (v) => v.includes("@") ? Number(v.split("@")[1]) : void 0;
  var lOf = (hex) => hexToOklch(hex).l;
  var famOf = (hex) => classifyColor(hex).family;
  var cmpStr = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  function assignNames(requests, existing, opts = {}) {
    var _a, _b, _c;
    const out = /* @__PURE__ */ new Map();
    const groups = /* @__PURE__ */ new Map();
    for (const r of requests) {
      let g = groups.get(r.base);
      if (!g) groups.set(r.base, g = { kind: (_a = r.kind) != null ? _a : nameKindOf(r.base, r.value), refHex: r.refHex, values: /* @__PURE__ */ new Map() });
      if (r.refHex && !g.refHex) g.refHex = r.refHex;
      g.values.set(r.value, ((_b = g.values.get(r.value)) != null ? _b : 0) + r.count);
    }
    const taken = new Map([...existing].map(([n, v]) => [n, typeof v === "string" ? v ? [v] : [] : v]));
    const canReuse = (_c = opts.canReuse) != null ? _c : () => true;
    for (const [base, g] of groups) {
      const fam = familyRe(base, g.kind);
      const left = [];
      for (const value of g.values.keys()) {
        if (opts.reuse !== false) {
          const names = [...taken].filter(([n, v]) => fam.test(n) && v.includes(value) && canReuse(n, value, base)).map(([n]) => n).sort(byFamilyOrder(base));
          if (names.length) {
            out.set(`${base}\0${value}`, names[0]);
            continue;
          }
        }
        left.push(value);
      }
      if (!left.length) continue;
      const assign = (value, name) => {
        out.set(`${base}\0${value}`, name);
        const arr = taken.get(name);
        taken.set(name, arr ? [...arr, value] : [value]);
      };
      const fallback = (name) => {
        for (let i = 2; ; i++) if (!taken.has(`${name}-${i}`)) return `${name}-${i}`;
      };
      if (g.kind === "number" || g.kind === "leading") assignNumbers(base, g.kind, g.values, left, taken, assign, fallback);
      else if (g.kind === "plain") {
        for (const value of sortByCount(left, g.values)) assign(value, taken.has(base) ? fallback(base) : base);
      } else assignColors(base, g.kind, g.refHex, g.values, left, taken, assign, fallback);
    }
    return out;
  }
  function sortByCount(values, counts) {
    return [...values].sort((a, b) => {
      var _a, _b;
      return ((_a = counts.get(b)) != null ? _a : 0) - ((_b = counts.get(a)) != null ? _b : 0) || cmpValue(a, b);
    });
  }
  function holderValue(taken, name) {
    const v = taken.get(name);
    return v && v.length ? v[0] : void 0;
  }
  function assignNumbers(base, kind, counts, left, taken, assign, fallback) {
    let rest = sortByCount(left, counts);
    let ref;
    const held = holderValue(taken, base);
    if (held != null && !Number.isNaN(Number(held))) ref = Number(held);
    else {
      const first = rest[0];
      rest = rest.slice(1);
      ref = Number(first);
      assign(first, taken.has(base) ? fallback(base) : base);
    }
    const side = (vals, words) => {
      const sorted = [...vals].sort((a, b) => Math.abs(Number(a) - ref) - Math.abs(Number(b) - ref) || Number(a) - Number(b));
      for (const v of sorted) {
        const free = words.map((w) => tailName(base, w)).find((n) => !taken.has(n));
        assign(v, free != null ? free : fallback(tailName(base, words[words.length - 1])));
      }
    };
    const same = rest.filter((v) => Math.abs(Number(v) - ref) < 5e-3);
    for (const v of same) assign(v, fallback(base));
    const lead = kind === "leading";
    side(rest.filter((v) => Number(v) < ref - 49e-4), lead ? TIGHT : SIZE_SMALL);
    side(rest.filter((v) => Number(v) > ref + 49e-4), lead ? LOOSE : SIZE_LARGE);
  }
  function assignColors(base, kind, refHex, counts, left, taken, assign, fallback) {
    var _a, _b, _c, _d, _e;
    const slotOf = /* @__PURE__ */ new Map();
    const slotAssigned = /* @__PURE__ */ new Set();
    const slotOwner = /* @__PURE__ */ new Map();
    const slotFree = (name, hex) => {
      const own = slotOwner.get(name);
      if (own) return own === hex;
      const v = taken.get(name);
      if (!v) return true;
      return v.length > 0 && v.every((x) => hexOfKey(x) === hex);
    };
    const setSlot = (hex, name) => {
      slotOf.set(hex, name);
      slotOwner.set(name, hex);
    };
    const hexCount = /* @__PURE__ */ new Map();
    for (const v of left) hexCount.set(hexOfKey(v), ((_a = hexCount.get(hexOfKey(v))) != null ? _a : 0) + ((_b = counts.get(v)) != null ? _b : 0));
    const hexes = [...hexCount.keys()].sort((a, b) => {
      var _a2, _b2;
      return ((_a2 = hexCount.get(b)) != null ? _a2 : 0) - ((_b2 = hexCount.get(a)) != null ? _b2 : 0) || cmpStr(a, b);
    });
    const fellBack = /* @__PURE__ */ new Set();
    const pick = (hex, cands) => {
      const free = cands.find((n) => slotFree(n, hex));
      if (!free) fellBack.add(hex);
      setSlot(hex, free != null ? free : cands[cands.length - 1]);
    };
    const ladderSide = (list, refL, prefix) => {
      const lighter = list.filter((h) => lOf(h) > refL).sort((a, b) => Math.abs(lOf(a) - refL) - Math.abs(lOf(b) - refL) || cmpStr(a, b));
      const darker = list.filter((h) => lOf(h) <= refL).sort((a, b) => Math.abs(lOf(a) - refL) - Math.abs(lOf(b) - refL) || cmpStr(a, b));
      for (const h of lighter) pick(h, LIGHTER.map((w) => `${prefix}-${w}`));
      for (const h of darker) pick(h, DARKER.map((w) => `${prefix}-${w}`));
    };
    if (kind === "ladder") {
      const i = base.lastIndexOf("/");
      const words = base.slice(i + 1) === "strong" ? DARKER : LIGHTER;
      const refL = refHex ? lOf(refHex) : 0;
      const sorted = [...hexes].sort((a, b) => Math.abs(lOf(a) - refL) - Math.abs(lOf(b) - refL) || cmpStr(a, b));
      for (const h of sorted) pick(h, words.map((w) => `${base.slice(0, i)}/${w}`));
    } else if (kind === "default") {
      for (const h of hexes) pick(h, [base]);
    } else {
      const held = holderValue(taken, base);
      let rest = hexes;
      let refH;
      if (held) refH = hexOfKey(held);
      else {
        refH = hexes[0];
        rest = hexes.slice(1);
        pick(refH, [base]);
      }
      if (kind === "inverse") ladderSide(rest.filter((h) => h !== refH), lOf(refH), base);
      else {
        const refFam = famOf(refH);
        ladderSide(rest.filter((h) => h !== refH && famOf(h) === refFam), lOf(refH), base);
        const byFam = /* @__PURE__ */ new Map();
        for (const h of rest) {
          if (h === refH || famOf(h) === refFam) continue;
          const f = famOf(h);
          byFam.set(f, [...(_c = byFam.get(f)) != null ? _c : [], h]);
        }
        for (const [f, list] of byFam) {
          const famName = `${base}-${f}`;
          const famHeld = holderValue(taken, famName);
          let famRef;
          let others = list;
          if (famHeld) famRef = hexOfKey(famHeld);
          else {
            famRef = list[0];
            others = list.slice(1);
            pick(famRef, [famName]);
          }
          ladderSide(others.filter((h) => h !== famRef), lOf(famRef), famName);
        }
      }
      if (held && rest.includes(refH) && !slotOf.has(refH)) setSlot(refH, base);
    }
    const alphaOf = (v) => {
      var _a2;
      return (_a2 = alphaOfKey(v)) != null ? _a2 : 1;
    };
    const byHex = /* @__PURE__ */ new Map();
    for (const v of left) byHex.set(hexOfKey(v), [...(_d = byHex.get(hexOfKey(v))) != null ? _d : [], v]);
    const nameFree = (n, hex) => !taken.has(n) && (!slotOwner.has(n) || slotOwner.get(n) === hex);
    for (const [hex, vals] of byHex) {
      const slot = (_e = slotOf.get(hex)) != null ? _e : base;
      const fb = fellBack.has(hex);
      const order = [...vals].sort((a, b) => {
        var _a2, _b2;
        return ((_a2 = counts.get(b)) != null ? _a2 : 0) - ((_b2 = counts.get(a)) != null ? _b2 : 0) || alphaOf(b) - alphaOf(a) || cmpValue(a, b);
      });
      const fileVals = !fb ? taken.get(slot) : void 0;
      const held = fileVals && fileVals.length && fileVals.every((x) => hexOfKey(x) === hex) && !slotAssigned.has(slot) ? fileVals[0] : void 0;
      let refA;
      let rest = order;
      if (held != null) refA = alphaOf(held);
      else {
        const first = order[0];
        rest = order.slice(1);
        refA = alphaOf(first);
        assign(first, fb || taken.has(slot) ? fallback(slot) : slot);
        slotAssigned.add(slot);
      }
      const side = (list, words) => {
        const sorted = [...list].sort((a, b) => Math.abs(alphaOf(a) - refA) - Math.abs(alphaOf(b) - refA) || alphaOf(a) - alphaOf(b));
        sorted.forEach((v, i) => {
          const cands = words.map((w) => `${slot}-${w}`);
          if (fb) {
            assign(v, fallback(cands[Math.min(i, cands.length - 1)]));
            return;
          }
          const free = cands.find((n) => nameFree(n, hex));
          assign(v, free != null ? free : fallback(cands[cands.length - 1]));
        });
      };
      for (const v of rest.filter((x) => Math.abs(alphaOf(x) - refA) < 5e-3)) assign(v, fallback(slot));
      side(rest.filter((x) => alphaOf(x) < refA - 49e-4), LIGHTER);
      side(rest.filter((x) => alphaOf(x) > refA + 49e-4), DARKER);
    }
  }
  function cmpValue(a, b) {
    const na = Number(a);
    const nb = Number(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a < b ? -1 : a > b ? 1 : 0;
  }
  var OLD_LADDER = /^(spacing|radius|size|stroke-width)\/(none|3xs|2xs|xs|sm|md|lg|xl|2xl|3xl|4xl|full|thin|thick)(-\d+)?$/;
  var OLD_COLOR = /* @__PURE__ */ new Set(["color/background/default", "color/text/default", "color/border/default", "color/background/brand"]);
  function isOldPluginName(name) {
    return OLD_LADDER.test(name) || OLD_COLOR.has(name);
  }
  function valueKey(v) {
    return typeof v === "number" ? String(Math.round(v * 100) / 100) : v.toLowerCase();
  }
  var AUTO_ROLE_KEY = "dsl.autoRole";
  var TEXT_STEP_KEY = "dsl.textStep";

  // src/lib/tiers.ts
  var TIER_NUM = { global: 1, semantic: 2, component: 3 };
  var CANONICAL_NAME = { global: "Global", semantic: "Semantic" };
  function hasComponentWord(name) {
    return /\bcomponents?\b/i.test(name);
  }
  function judgeUserTier(name, collectionId, samples) {
    let counted = 0;
    let alias = 0;
    for (const s of samples) {
      if (s.alias && s.targetCollection === collectionId) continue;
      counted++;
      if (s.alias) alias++;
    }
    if (counted === 0) return { tier: 0, why: { kind: "empty", alias, counted } };
    if (hasComponentWord(name)) return { tier: 3, why: { kind: "name", alias, counted } };
    const tier = 5 * alias >= 4 * counted ? 2 : 5 * alias <= counted ? 1 : 0;
    return { tier, why: { kind: "ratio", alias, counted } };
  }
  function pickOwned(cols, marker) {
    var _a;
    const out = { global: void 0, semantic: void 0 };
    for (const role of ["global", "semantic"]) {
      out[role] = (_a = cols.find((c) => marker(c) === role)) != null ? _a : cols.find((c) => !marker(c) && c.name === CANONICAL_NAME[role]);
    }
    return out;
  }

  // src/lib/collectionRoles.ts
  var OWNED_KEY = "dsl.owned";
  function ownedMarker(c) {
    try {
      const fn = c.getPluginData;
      return typeof fn === "function" ? fn.call(c, OWNED_KEY) || "" : "";
    } catch (e) {
      return "";
    }
  }
  function ownedCollections(cols) {
    return pickOwned(cols, ownedMarker);
  }
  function ownedCollection(cols, role) {
    return ownedCollections(cols)[role];
  }
  function ensureOwnedCollection(cols, role) {
    var _a;
    const found = ownedCollection(cols, role);
    const col = found != null ? found : figma.variables.createVariableCollection(CANONICAL_NAME[role]);
    if (ownedMarker(col) !== role) {
      try {
        (_a = col.setPluginData) == null ? void 0 : _a.call(col, OWNED_KEY, role);
      } catch (e) {
      }
    }
    return col;
  }
  function samplesByCollection(cols, vars) {
    var _a, _b, _c;
    const modeOf = new Map(cols.map((c) => [c.id, c.defaultModeId]));
    const colOfVar = new Map(vars.map((v) => [v.id, v.variableCollectionId]));
    const out = /* @__PURE__ */ new Map();
    for (const v of vars) {
      const raw = (_b = v.valuesByMode) == null ? void 0 : _b[(_a = modeOf.get(v.variableCollectionId)) != null ? _a : ""];
      const isAlias2 = !!raw && typeof raw === "object" && raw.type === "VARIABLE_ALIAS";
      const s = isAlias2 ? { alias: true, targetCollection: (_c = colOfVar.get(raw.id)) != null ? _c : null } : { alias: false };
      const arr = out.get(v.variableCollectionId);
      if (arr) arr.push(s);
      else out.set(v.variableCollectionId, [s]);
    }
    return out;
  }
  function collectionTierInfo(cols, vars) {
    var _a;
    const owned = ownedCollections(cols);
    const samples = samplesByCollection(cols, vars);
    const out = /* @__PURE__ */ new Map();
    for (const c of cols) {
      const role = owned.global === c ? "global" : owned.semantic === c ? "semantic" : null;
      out.set(c.id, role ? { tier: TIER_NUM[role], why: { kind: "owned" } } : judgeUserTier(c.name, c.id, (_a = samples.get(c.id)) != null ? _a : []));
    }
    return out;
  }
  function collectionTiers(cols, vars) {
    return new Map([...collectionTierInfo(cols, vars)].map(([id, i]) => [id, i.tier]));
  }
  function ownedIds(cols) {
    var _a, _b;
    const o = ownedCollections(cols);
    return new Set([(_a = o.global) == null ? void 0 : _a.id, (_b = o.semantic) == null ? void 0 : _b.id].filter((x) => !!x));
  }

  // src/lib/scopes.ts
  var FIELD_SCOPE = {
    width: "WIDTH_HEIGHT",
    height: "WIDTH_HEIGHT",
    itemSpacing: "GAP",
    counterAxisSpacing: "GAP",
    gridRowGap: "GAP",
    gridColumnGap: "GAP",
    paddingLeft: "GAP",
    paddingRight: "GAP",
    paddingTop: "GAP",
    paddingBottom: "GAP",
    topLeftRadius: "CORNER_RADIUS",
    topRightRadius: "CORNER_RADIUS",
    bottomLeftRadius: "CORNER_RADIUS",
    bottomRightRadius: "CORNER_RADIUS",
    strokeWeight: "STROKE_FLOAT",
    strokeTopWeight: "STROKE_FLOAT",
    strokeRightWeight: "STROKE_FLOAT",
    strokeBottomWeight: "STROKE_FLOAT",
    strokeLeftWeight: "STROKE_FLOAT",
    fontSize: "FONT_SIZE",
    lineHeight: "LINE_HEIGHT",
    letterSpacing: "LETTER_SPACING",
    opacity: "OPACITY"
  };
  var STROKE_SCOPES = ["STROKE_COLOR"];
  var FRAME_LIKE = /* @__PURE__ */ new Set(["FRAME", "COMPONENT", "COMPONENT_SET", "INSTANCE", "SECTION"]);
  var TEXT_FILLS = ["ALL_FILLS", "TEXT_FILL"];
  var FRAME_FILLS = ["ALL_FILLS", "FRAME_FILL"];
  var SHAPE_FILLS = ["ALL_FILLS", "SHAPE_FILL"];
  function fillScopesFor(nodeType) {
    if (nodeType === "TEXT") return TEXT_FILLS;
    if (FRAME_LIKE.has(nodeType)) return FRAME_FILLS;
    return SHAPE_FILLS;
  }
  var EFFECT_SCOPES = ["EFFECT_COLOR"];

  // src/lib/naming.ts
  var EMITTED_ROLES = [
    // 구조 폴백(역할을 못 정했을 때)
    "container",
    "wrapper",
    "stack-x",
    // 가로 오토레이아웃 묶음(ia-v3 §2.12 12.12 N-D6) — container처럼 맥락 없음 · 맥락 통과
    "stack-y",
    // 세로 오토레이아웃 묶음
    "shape",
    // HTML 랜드마크
    "header",
    "footer",
    "main",
    "aside",
    "nav",
    "section",
    "hero",
    // 본문 첫 블록(큰 제목 + 이미지) — section보다 구체적
    "logo",
    // 헤더 첫 자리의 작은 묶음(마크·워드마크)
    "actions",
    // 헤더 끝의 링크/버튼 2~3개(Sign in · Sign up)
    "article",
    "figure",
    // 역할 세분화 1차(ia-v4 §4.4 B1–B3) — 폴백 자리에서만, 자식에게는 맥락을 통과시킨다
    "row",
    // 이름표 글자 + 값 한 줄
    "text-group",
    // 글자만 2개 이상
    "media",
    // 사진(+ 작은 아이콘)만 담은 상자
    // 이름 힌트로만 붙는 역할(ia-v4 §4.4 "이름 힌트" · B.28) — 구조 판정은 없다
    "breadcrumb",
    "tabs",
    "tab",
    // 컴포넌트
    "button",
    "chip",
    "card",
    "table",
    "list",
    "item",
    "field",
    "input",
    "modal",
    "overlay",
    "progress",
    "indicator",
    // 요소
    "icon",
    "image",
    "thumbnail",
    "background",
    "swatch",
    "border",
    "divider",
    "badge",
    "status",
    "avatar"
  ];
  var RECOGNIZED_ROLES = [
    "content",
    "group",
    "body",
    "leading",
    "trailing",
    "sidebar",
    "sheet",
    "drawer",
    "dialog",
    "popup",
    "label",
    "title"
  ];
  var ROLE_VOCAB = [...EMITTED_ROLES, ...RECOGNIZED_ROLES];
  var ROLE_KEY = "dsRole";
  var NAME_KEY = "dsNameKey";
  function nameKeyFor(name, stored) {
    if (!stored || !name) return void 0;
    return stored.length > name.length + 1 && stored.endsWith("-" + name) ? stored : void 0;
  }
  var ROLE_SET = new Set(ROLE_VOCAB);
  function isKnownRole(seg) {
    return ROLE_SET.has(seg);
  }
  var REFINED_ROLES = /* @__PURE__ */ new Set(["row", "text-group", "media"]);
  function isScopeRole(seg) {
    return ROLE_SET.has(seg) && !REFINED_ROLES.has(seg);
  }
  function kebab(input) {
    return input.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/[\s/]+/g, "-").replace(/_/g, (_m, i, s) => /\d/.test(s[i - 1] || "") && /\d/.test(s[i + 1] || "") ? "_" : "-").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
  }
  function layerNameFromRole(ancestorName, role, opts = {}) {
    const ctx = ancestorName ? kebab(ancestorName) : "";
    const parts = limitDepth([...ctx ? ctx.split("-") : [], kebab(role)], opts.maxDepth);
    return parts.filter(Boolean).join("-");
  }
  function limitDepth(segs, maxDepth = 8) {
    if (segs.length <= maxDepth) return segs;
    return segs.slice(segs.length - maxDepth);
  }
  var DEFAULT_NAME_RE = /^(Frame|Group|Rectangle|Ellipse|Line|Polygon|Star|Vector|Component|Instance|Slice|Section|Union|Subtract|Intersect|Exclude|Mask|Arrow)( ?\d+)?( copy( \d+)?)?$/;
  function isDefaultName(name) {
    const n = name.trim();
    if (!n) return true;
    return DEFAULT_NAME_RE.test(n);
  }
  var PRIMITIVE_NS = /* @__PURE__ */ new Set([
    "color",
    "colour",
    "spacing",
    "space",
    "gap",
    "padding",
    "size",
    "sizing",
    "radius",
    "border-radius",
    "opacity",
    "font",
    "font-size",
    "font-weight",
    "line-height",
    "letter-spacing",
    "number",
    "dimension",
    "width",
    "height",
    "elevation",
    "shadow",
    "z"
  ]);
  var LEAF_ROLE = /* @__PURE__ */ new Map([
    ["background", "background"],
    ["bg", "background"],
    ["fill", "background"],
    ["surface", "background"],
    ["swatch", "swatch"],
    ["sample", "swatch"],
    ["border", "border"],
    ["stroke", "border"],
    ["outline", "border"],
    ["icon", "icon"],
    ["glyph", "icon"],
    ["divider", "divider"],
    ["separator", "divider"],
    ["rule", "divider"],
    ["image", "image"],
    ["img", "image"],
    ["picture", "image"],
    ["thumbnail", "thumbnail"],
    ["thumb", "thumbnail"],
    ["avatar", "avatar"],
    ["badge", "badge"],
    ["dot", "badge"],
    ["status", "status"],
    ["indicator", "indicator"],
    ["progress", "progress"],
    ["overlay", "overlay"],
    ["scrim", "overlay"],
    ["backdrop", "overlay"],
    ["input", "input"]
  ]);
  function parseTokenName(tokenName) {
    var _a;
    const segs = tokenName.split("/").map((s) => s.trim()).filter(Boolean);
    if (!segs.length) return { roleLeaf: null, context: null, primitive: false };
    if (PRIMITIVE_NS.has(kebab(segs[0]))) return { roleLeaf: null, context: null, primitive: true };
    const roleLeaf = (_a = LEAF_ROLE.get(kebab(segs[segs.length - 1]))) != null ? _a : null;
    const ctxSegs = roleLeaf ? segs.slice(0, -1) : segs;
    const context = ctxSegs.length ? ctxSegs.map(kebab).filter(Boolean).join("-") : null;
    return { roleLeaf, context, primitive: false };
  }
  var UNIT_WORDS = /* @__PURE__ */ new Set(["percent", "px", "em", "rem", "ratio", "pt"]);
  var GENERIC_ROLES = /* @__PURE__ */ new Set(["frame", "container", "wrapper", "stack-x", "stack-y", "content", "group", "section", "body", "main", "shape"]);
  var STRUCT_FALLBACK_WHOLE = /* @__PURE__ */ new Set(["container", "wrapper", "stack-x", "stack-y"]);
  function pickScope(name) {
    if (STRUCT_FALLBACK_WHOLE.has(kebab(name).replace(/(?:-\d+)+$/, ""))) return null;
    const segs = kebab(name).split("-").filter((s) => s && !/^\d+$/.test(s) && !UNIT_WORDS.has(s) && !/^[0-9a-f]{6}$/.test(s) && !GENERIC_ROLES.has(s));
    if (!segs.length) return null;
    const known = segs.filter(isScopeRole);
    return known.length ? known[known.length - 1] : segs[segs.length - 1];
  }

  // src/lib/varKind.ts
  var FIRST_FLOAT = {
    spacing: "gap",
    radius: "radius",
    size: "size",
    "stroke-width": "stroke",
    opacity: "opacity",
    "font-size": "text",
    "line-height": "text",
    "letter-spacing": "text"
  };
  var DIRS = ["top", "right", "bottom", "left"];
  var CORNERS = ["top-left", "top-right", "bottom-left", "bottom-right"];
  function lastFloatKind(seg) {
    if (["gap", "row-gap", "column-gap", "spacing", "padding", "padding-x", "padding-y"].includes(seg)) return "gap";
    if (DIRS.some((d) => seg === `padding-${d}`)) return "gap";
    if (seg === "radius" || CORNERS.some((c) => seg === `radius-${c}`)) return "radius";
    if (["size", "width", "height"].includes(seg)) return "size";
    if (seg === "stroke-width" || DIRS.some((d) => seg === `stroke-width-${d}`)) return "stroke";
    if (seg === "opacity") return "opacity";
    if (["font-size", "line-height", "letter-spacing"].includes(seg)) return "text";
    return null;
  }
  var SCOPE_KIND = {
    GAP: "gap",
    CORNER_RADIUS: "radius",
    WIDTH_HEIGHT: "size",
    STROKE_FLOAT: "stroke",
    OPACITY: "opacity",
    FONT_SIZE: "text",
    LINE_HEIGHT: "text",
    LETTER_SPACING: "text",
    FONT_FAMILY: "text"
  };
  function varKind(v) {
    var _a, _b, _c;
    if (v.type === "COLOR") return "color";
    if (v.type === "BOOLEAN") return "other";
    const segs = v.name.split("/").map((s) => s.trim().toLowerCase());
    const first = (_a = segs[0]) != null ? _a : "";
    const last = (_b = segs[segs.length - 1]) != null ? _b : "";
    if (v.type === "FLOAT" && FIRST_FLOAT[first]) return FIRST_FLOAT[first];
    if (v.type === "STRING" && first === "font-family") return "text";
    if (v.type === "FLOAT") {
      const k = lastFloatKind(last);
      if (k) return k;
    }
    if (v.type === "STRING" && last === "font-family") return "text";
    if (v.type === "FLOAT" || v.type === "STRING") {
      const kinds = new Set(((_c = v.scopes) != null ? _c : []).map((s) => SCOPE_KIND[s]).filter(Boolean));
      if (kinds.size === 1) return [...kinds][0];
    }
    return "other";
  }
  var FILL_SUB = ["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL"];
  function expand(scopes) {
    const out = /* @__PURE__ */ new Set();
    for (const s of scopes) {
      if (s === "ALL_FILLS") FILL_SUB.forEach((x) => out.add(x));
      else out.add(s);
    }
    return out;
  }
  var APPLY_TARGETS = {
    color: ["fill", "stroke", "text", "shadow"],
    gap: ["gap", "padding", "padding-top", "padding-bottom", "padding-left", "padding-right"],
    radius: ["radius", "radius-tl", "radius-tr", "radius-bl", "radius-br"]
  };
  var TARGET_SCOPES = {
    fill: ["FRAME_FILL", "SHAPE_FILL"],
    text: ["TEXT_FILL"],
    stroke: ["STROKE_COLOR"],
    shadow: ["EFFECT_COLOR"],
    gap: ["GAP"],
    padding: ["GAP"],
    "padding-top": ["GAP"],
    "padding-right": ["GAP"],
    "padding-bottom": ["GAP"],
    "padding-left": ["GAP"],
    radius: ["CORNER_RADIUS"],
    "radius-tl": ["CORNER_RADIUS"],
    "radius-tr": ["CORNER_RADIUS"],
    "radius-bl": ["CORNER_RADIUS"],
    "radius-br": ["CORNER_RADIUS"]
  };
  function targetAllowed(scopes, target) {
    if (scopes.includes("ALL_SCOPES")) return true;
    const ex = expand(scopes);
    return TARGET_SCOPES[target].some((s) => ex.has(s));
  }
  var MANUAL_KEY = "dsl.manual";
  function duplicateName(name, taken) {
    const base = `${name}-copy`;
    if (!taken.has(base)) return base;
    for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
  }

  // src/lib/selCards.ts
  var PADDING = /* @__PURE__ */ new Set(["paddingLeft", "paddingRight", "paddingTop", "paddingBottom"]);
  var RADIUS = /* @__PURE__ */ new Set(["cornerRadius", "topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]);
  var STROKE = /* @__PURE__ */ new Set(["strokeWeight", "strokeTopWeight", "strokeRightWeight", "strokeBottomWeight", "strokeLeftWeight"]);
  var TEXT = /* @__PURE__ */ new Set(["fontSize", "lineHeight", "letterSpacing", "fontFamily"]);
  var COLOR = /* @__PURE__ */ new Set(["fills", "strokes", "effects"]);
  function fieldKind(field) {
    if (!field) return "other";
    if (field === "itemSpacing" || field === "counterAxisSpacing" || PADDING.has(field) || field.startsWith("grid")) return "gap";
    if (RADIUS.has(field)) return "radius";
    if (field === "width" || field === "height") return "size";
    if (STROKE.has(field)) return "stroke";
    if (field === "opacity") return "opacity";
    if (COLOR.has(field)) return "color";
    if (TEXT.has(field)) return "text";
    return "other";
  }

  // src/lib/bind.ts
  var round2 = (n) => Math.round(n * 100) / 100;
  function sameNumber(a, b) {
    return round2(a) === round2(b);
  }
  var SKIP_PREVIEW_CAP = 200;
  function capSkipsByReason(skips, cap) {
    if (skips.length <= cap) return skips;
    const byReason = /* @__PURE__ */ new Map();
    for (const s of skips) {
      const list = byReason.get(s.reason);
      if (list) list.push(s);
      else byReason.set(s.reason, [s]);
    }
    const queues = [...byReason.values()];
    const out = [];
    for (let i = 0; out.length < cap; i++) {
      let progressed = false;
      for (const q of queues) {
        if (i >= q.length) continue;
        out.push(q[i]);
        progressed = true;
        if (out.length === cap) break;
      }
      if (!progressed) break;
    }
    return out;
  }
  function pruneToAffected(nodeIndex, candidates, skips) {
    var _a, _b, _c, _d;
    const byId = new Map(nodeIndex.map((n) => [n.id, n]));
    const seeds = [...candidates.map((c) => c.nodeId), ...skips.map((s) => s.nodeId)];
    const keep = new Set(seeds);
    for (const id of seeds) {
      let p = (_b = (_a = byId.get(id)) == null ? void 0 : _a.parentId) != null ? _b : null;
      while (p && !keep.has(p)) {
        keep.add(p);
        p = (_d = (_c = byId.get(p)) == null ? void 0 : _c.parentId) != null ? _d : null;
      }
    }
    return nodeIndex.filter((n) => keep.has(n.id));
  }
  var liveVarIds = /* @__PURE__ */ new Set();
  function isAlias(x) {
    return !!x && typeof x === "object" && x.type === "VARIABLE_ALIAS";
  }
  function isLiveAlias(x) {
    return isAlias(x) && liveVarIds.has(x.id);
  }
  async function collectLiveVarIds(selection2, local, deep = true) {
    var _a, _b, _c;
    const seen = /* @__PURE__ */ new Set();
    const stack = selection2.slice();
    const take = (raw) => {
      if (!raw) return;
      for (const a of Array.isArray(raw) ? raw : [raw]) if (isAlias(a)) seen.add(a.id);
    };
    while (stack.length) {
      const n = stack.pop();
      const bv = n.boundVariables;
      if (bv) for (const v of Object.values(bv)) take(v);
      for (const key of ["fills", "strokes"]) {
        const ps = n[key];
        if (Array.isArray(ps)) for (const p of ps) take((_a = p.boundVariables) == null ? void 0 : _a.color);
      }
      const ef = n.effects;
      if (Array.isArray(ef)) for (const e of ef) take((_b = e.boundVariables) == null ? void 0 : _b.color);
      if (deep && "children" in n) for (const c of n.children) stack.push(c);
    }
    const live = new Set(local);
    for (const id of seen) {
      if (live.has(id)) continue;
      try {
        if ((_c = await figma.variables.getVariableByIdAsync(id)) == null ? void 0 : _c.remote) live.add(id);
      } catch (e) {
      }
    }
    return live;
  }
  function aliasesState(list) {
    const aliases = list.filter(isAlias);
    if (!aliases.length) return "none";
    return aliases.some((a) => !isLiveAlias(a)) ? "deleted" : "bound";
  }
  function nodeFieldState(node, field) {
    const bv = node.boundVariables;
    const entry = bv == null ? void 0 : bv[field];
    if (!entry) {
      if (field === "strokeWeight") {
        const sides = STROKE_SIDE_FIELDS.map((f) => bv == null ? void 0 : bv[f]).filter((x) => !!x);
        if (sides.length) return aliasesState(sides);
      }
      return "none";
    }
    return aliasesState(Array.isArray(entry) ? entry : [entry]);
  }
  var STROKE_SIDE_FIELDS = ["strokeTopWeight", "strokeRightWeight", "strokeBottomWeight", "strokeLeftWeight"];
  function colorState(x, node, field, index) {
    var _a;
    const own = (_a = x.boundVariables) == null ? void 0 : _a.color;
    const bv = node.boundVariables;
    const arr = bv == null ? void 0 : bv[field];
    return aliasesState([own, Array.isArray(arr) ? arr[index] : void 0]);
  }
  function textFieldState(node, field) {
    const fromBv = nodeFieldState(node, field);
    if (fromBv !== "none") return fromBv;
    const len = node.characters.length;
    const getRange = node.getRangeBoundVariable;
    if (len === 0 || typeof getRange !== "function") return "none";
    const full = getRange.call(node, 0, len, field);
    if (full === figma.mixed) return "bound";
    return aliasesState([full]);
  }
  function hasStyleId(node, key) {
    const v = node[key];
    if (v === figma.mixed) return true;
    return typeof v === "string" && v !== "";
  }
  var TEXT_RANGE_FIELDS = ["fontSize", "lineHeight", "letterSpacing", "fontFamily"];
  var STYLE_KEY_OF = { fills: "fillStyleId", strokes: "strokeStyleId", effects: "effectStyleId" };
  function stateReason(s) {
    return s === "bound" ? "already-bound" : s === "deleted" ? "deleted-var" : null;
  }
  function aspectLocked(n) {
    const x = n;
    if ("targetAspectRatio" in x) return x.targetAspectRatio != null;
    return x.constrainProportions === true;
  }
  function lockedSizeState(n) {
    const w = nodeFieldState(n, "width");
    const h = nodeFieldState(n, "height");
    if (w === "deleted" || h === "deleted") return { state: "deleted", field: w === "deleted" ? "width" : "height" };
    if (w === "bound" || h === "bound") return { state: "bound", field: w === "bound" ? "width" : "height" };
    return { state: "none", field: "width" };
  }
  function lockedAxis(n) {
    const x = n;
    return x.layoutSizingHorizontal === "FIXED" ? "width" : x.layoutSizingVertical === "FIXED" ? "height" : null;
  }
  function isEffectivelyVisible(node) {
    let p = node;
    while (p) {
      if ("visible" in p && p.visible === false) return false;
      p = p.parent;
    }
    return true;
  }
  var pageOf = (n) => {
    let p = n;
    while (p && p.type !== "PAGE") p = p.parent;
    return p != null ? p : null;
  };
  async function collectLocalMains(roots) {
    var _a;
    const out = { units: [], mainOf: /* @__PURE__ */ new Map(), remote: /* @__PURE__ */ new Set(), hiddenMains: [] };
    const rootIds = new Set(roots.map((r) => r.id));
    const inRoots = (n) => {
      let p = n;
      while (p) {
        if (rootIds.has(p.id)) return true;
        p = p.parent;
      }
      return false;
    };
    const seenUnits = /* @__PURE__ */ new Set();
    const seenNodes = /* @__PURE__ */ new Set();
    const queue = roots.filter((r) => isEffectivelyVisible(r));
    while (queue.length) {
      const n = queue.shift();
      if (seenNodes.has(n.id)) continue;
      seenNodes.add(n.id);
      if (n.visible === false) continue;
      if (n.type === "INSTANCE") {
        let main = null;
        try {
          main = await n.getMainComponentAsync();
        } catch (e) {
          main = null;
        }
        if (!main) continue;
        if (main.remote) {
          out.remote.add(n.id);
          continue;
        }
        const parent = main.parent;
        const unit = parent && parent.type === "COMPONENT_SET" ? parent : main;
        const unitVisible = isEffectivelyVisible(unit);
        if (unitVisible && isEffectivelyVisible(main)) out.mainOf.set(n.id, main);
        if (seenUnits.has(unit.id)) continue;
        seenUnits.add(unit.id);
        if (inRoots(unit)) continue;
        if (!unitVisible) {
          out.hiddenMains.push(unit);
          continue;
        }
        const page = pageOf(unit);
        if (page && page !== figma.currentPage) {
          try {
            await page.loadAsync();
          } catch (e) {
          }
        }
        const unitRoots = unit.type === "COMPONENT_SET" ? unit.children.filter((c) => c.type === "COMPONENT") : [unit];
        out.units.push({ id: unit.id, name: unit.name, page: (_a = page == null ? void 0 : page.name) != null ? _a : "", roots: [...unitRoots] });
        for (const r of unitRoots) queue.push(r);
        continue;
      }
      if ("children" in n) for (const c of n.children) queue.push(c);
    }
    return out;
  }
  function countNodes(sel, units = []) {
    let n = 0;
    const visited = /* @__PURE__ */ new Set();
    const count = (roots) => {
      const stack = roots.slice().reverse();
      while (stack.length) {
        const x = stack.pop();
        if (visited.has(x.id)) continue;
        visited.add(x.id);
        if (x.visible === false) continue;
        n++;
        if (x.type === "INSTANCE") continue;
        if ("children" in x) for (const c of x.children) stack.push(c);
      }
    };
    count(sel);
    for (const u of units) count(u.roots);
    return n;
  }
  function sameAsMain(inst, main, field, index) {
    const a = inst[field];
    const b = main[field];
    if (a === void 0 && b === void 0) return false;
    const pick = (v) => index != null && Array.isArray(v) ? v[index] : v;
    try {
      return JSON.stringify(pick(a)) === JSON.stringify(pick(b));
    } catch (e) {
      return false;
    }
  }
  var placeFilter = null;
  function note(res, key, node, preview, field) {
    var _a, _b, _c, _d, _e;
    if (node && field && (placeFilter == null ? void 0 : placeFilter(node, field))) return;
    res.reasons[key] = ((_a = res.reasons[key]) != null ? _a : 0) + 1;
    const kind = fieldKind(field);
    const byKind = (_d = (_c = (_b = res.counts) != null ? _b : res.counts = {})[key]) != null ? _d : _c[key] = {};
    byKind[kind] = ((_e = byKind[kind]) != null ? _e : 0) + 1;
    if (!node || !preview) return;
    const k = `${node.id}|${key}`;
    if (preview.skipSeen.has(k)) return;
    preview.skipSeen.add(k);
    preview.skips.push({ nodeId: node.id, name: node.name, type: node.type, reason: key, field });
  }
  function skip(res, key, node, preview, field) {
    res.skipped++;
    note(res, key, node, preview, field);
  }
  function onlyMatch(only, s) {
    const key = s.allowed.join("|");
    const v = slotValue(s);
    return only.some((it) => {
      if (!it.groups.includes(key)) return false;
      if (s.kind === "color") return typeof it.value === "string" && colorKey(it.value, it.alpha) === v;
      if (typeof v === "number") return typeof it.value === "number" && sameNumber(it.value, v);
      return it.value === v;
    });
  }
  function dsRoleOwner(node) {
    const fn = node.getPluginData;
    let role;
    try {
      role = typeof fn === "function" ? fn.call(node, ROLE_KEY) || void 0 : void 0;
    } catch (e) {
      role = void 0;
    }
    return pickOwner(role, void 0, isKnownRole);
  }
  async function bindSelection(selection2, apply = true, hooks = {}, opts = {}) {
    var _a, _b, _c, _d, _e;
    const index = await buildIndex();
    const mains = await collectLocalMains(selection2);
    const mainRoots = mains.units.flatMap((u) => u.roots);
    liveVarIds = await collectLiveVarIds([...selection2, ...mainRoots], new Set((await figma.variables.getLocalVariablesAsync()).map((v) => v.id)));
    const res = { bound: 0, skipped: 0, reasons: {} };
    const prog = { done: 0, total: hooks.onProgress ? countNodes(selection2, mains.units) : 0, every: 50 };
    const preview = { candidates: [], nodeIndex: [], skips: [], skipSeen: /* @__PURE__ */ new Set() };
    const ctx = {
      index,
      res,
      preview,
      slots: [],
      skipText: opts.skipTextStyleNode,
      noNewRoles: !!opts.noNewRoles,
      mainOf: mains.mainOf,
      remote: mains.remote,
      visited: /* @__PURE__ */ new Set()
    };
    for (const node of selection2) {
      if (!isEffectivelyVisible(node)) {
        note(res, "hidden", node, preview);
        continue;
      }
      await walk(node, ctx, hooks, prog, 0, null);
      if (res.cancelled) break;
    }
    for (const u of mains.hiddenMains) note(res, "hidden", u, preview);
    for (const u of mains.units) {
      if (res.cancelled) break;
      ctx.mainId = u.id;
      for (const r of u.roots) {
        await walk(r, ctx, hooks, prog, 0, null);
        if (res.cancelled) break;
      }
    }
    ctx.mainId = void 0;
    if (mains.units.length) res.mains = mains.units.map((u) => ({ id: u.id, name: u.name, page: u.page }));
    if (opts.only) {
      const only = opts.only;
      const off = (_a = opts.off) != null ? _a : [];
      let offN = 0;
      ctx.slots = ctx.slots.filter((s) => {
        if (onlyMatch(only, s)) return true;
        if (off.length && onlyMatch(off, s)) offN++;
        return false;
      });
      if (offN) res.reasons["make-off"] = ((_b = res.reasons["make-off"]) != null ? _b : 0) + offN;
    }
    resolveSlots(ctx);
    if (apply && preview.candidates.length) {
      const known = /* @__PURE__ */ new Map();
      for (const s of ctx.slots) known.set(s.node.id, s.node);
      const r = await bindSelectedItems(
        preview.candidates.map((c) => __spreadValues(__spreadValues(__spreadValues({ nodeId: c.nodeId, field: c.field, index: c.index, variableId: c.variableId, newRole: c.newRole }, c.mainId ? { mainId: c.mainId } : {}), c.pillFrom != null ? { pillFrom: c.pillFrom } : {}), c.scopeAdd ? { scopeAdd: c.scopeAdd } : {})),
        {},
        known
        // 찾기에서 본 레이어 그대로(다시 찾지 않는다)
      );
      res.bound = r.bound;
      res.skipped += r.skipped;
      for (const [k, v] of Object.entries(r.reasons)) res.reasons[k] = ((_c = res.reasons[k]) != null ? _c : 0) + v;
      res.newRoles = r.newRoles;
      if (r.mainsBound.length) res.mainsBound = r.mainsBound;
      for (const c of preview.candidates) {
        const id = c.newRole ? r.createdIds[c.newRole.name] : void 0;
        if (id) c.variableId = id;
      }
    }
    {
      res.candidates = preview.candidates;
      const skips = capSkipsByReason(preview.skips, SKIP_PREVIEW_CAP);
      res.nodes = pruneToAffected(preview.nodeIndex, res.candidates, skips);
      res.skips = skips;
      const layers = {};
      for (const s of preview.skips) layers[s.reason] = ((_d = layers[s.reason]) != null ? _d : 0) + 1;
      res.skipLayers = layers;
    }
    (_e = hooks.onProgress) == null ? void 0 : _e.call(hooks, prog.done, prog.total);
    return res;
  }
  async function buildIndex() {
    var _a, _b, _c, _d;
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const modeOf = new Map(cols.map((c) => [c.id, c.defaultModeId]));
    const vars = await figma.variables.getLocalVariablesAsync();
    const tierOf = collectionTiers(cols, vars);
    const owned = ownedIds(cols);
    const colIdx = new Map(cols.map((c, i) => [c.id, i]));
    const globalNames = new Set(vars.filter((v) => tierOf.get(v.variableCollectionId) === 1).map((v) => v.name));
    const entries = [];
    const semNames = /* @__PURE__ */ new Map();
    const addSem = (name, key) => {
      const arr = semNames.get(name);
      if (!arr) semNames.set(name, key ? [key] : []);
      else if (key && !arr.includes(key)) arr.push(key);
    };
    for (const v of vars) {
      const tier = (_a = tierOf.get(v.variableCollectionId)) != null ? _a : 0;
      if (tier < 1) continue;
      const val = await resolveValue(v, modeOf);
      if (tier === 2) addSem(v.name, "");
      if (val == null) continue;
      const raw = v.valuesByMode[(_b = modeOf.get(v.variableCollectionId)) != null ? _b : ""];
      const direct = !(raw && typeof raw === "object" && "type" in raw && raw.type === "VARIABLE_ALIAS");
      const e = {
        variable: v,
        tier,
        type: v.resolvedType,
        scopes: (_c = v.scopes) != null ? _c : ["ALL_SCOPES"],
        user: !owned.has(v.variableCollectionId),
        colIdx: (_d = colIdx.get(v.variableCollectionId)) != null ? _d : 0,
        direct
      };
      if (tier === 2 && globalNames.has(v.name)) e.mirror = true;
      if (tier === 2 && readAutoRole(v)) e.auto = true;
      if (tier === 1 && readFlag(v, MANUAL_KEY)) e.manual = true;
      if (v.resolvedType === "COLOR" && isRGB(val)) {
        e.colorHex = rgbToHex(val);
        e.colorAlpha = roundAlpha(val.a);
        e.colorKey = colorKey(e.colorHex, e.colorAlpha);
      } else if (v.resolvedType === "FLOAT" && typeof val === "number") e.num = val;
      else if (v.resolvedType === "STRING" && typeof val === "string") e.str = val;
      if (tier === 2) addSem(v.name, entryKey(e));
      entries.push(e);
    }
    entries.sort((a, b) => b.tier - a.tier);
    return { entries, semNames, byId: new Map(entries.map((e) => [e.variable.id, e])) };
  }
  function readFlag(v, key) {
    const fn = v.getPluginData;
    try {
      return typeof fn === "function" && fn.call(v, key) === "1";
    } catch (e) {
      return false;
    }
  }
  function readAutoRole(v) {
    const fn = v.getPluginData;
    try {
      return typeof fn === "function" && fn.call(v, AUTO_ROLE_KEY) === "1";
    } catch (e) {
      return false;
    }
  }
  function entryKey(e) {
    if (e.colorKey) return valueKey(e.colorKey);
    if (e.num != null) return valueKey(e.num);
    if (e.str != null) return valueKey(e.str);
    return "";
  }
  async function resolveValue(v, modeOf) {
    let cur = v;
    for (let i = 0; i < 12 && cur; i++) {
      const mode = modeOf.get(cur.variableCollectionId);
      const val = mode ? cur.valuesByMode[mode] : void 0;
      if (val && typeof val === "object" && "type" in val && val.type === "VARIABLE_ALIAS") {
        cur = await figma.variables.getVariableByIdAsync(val.id);
      } else {
        return val;
      }
    }
    return void 0;
  }
  function itemAlpha(x) {
    var _a;
    return roundAlpha(x.type === "SOLID" ? x.opacity : (_a = x.color) == null ? void 0 : _a.a);
  }
  function isRGB(v) {
    return typeof v === "object" && v !== null && "r" in v && "g" in v && "b" in v;
  }
  function scopeOk(scopes, allowed) {
    return scopes.includes("ALL_SCOPES") || allowed.some((s) => scopes.includes(s));
  }
  var PART_FILLS = ["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL"];
  function mergeScopes(current, add2, type) {
    if (current.includes("ALL_SCOPES")) return [...current];
    const set = /* @__PURE__ */ new Set([...current, ...add2]);
    if (set.has("ALL_FILLS")) for (const p of PART_FILLS) set.delete(p);
    return scopesForType([...set], type);
  }
  function addVariableScope(v, scope) {
    var _a;
    const cur = (_a = v.scopes) != null ? _a : ["ALL_SCOPES"];
    if (cur.includes("ALL_SCOPES") || cur.includes(scope)) return;
    v.scopes = mergeScopes(cur, [scope], v.resolvedType);
  }
  var DROP = "drop";
  var isFrac = (v) => Math.abs(v - Math.round(v)) >= 5e-3;
  var numReason = (v, dropAtOrBelowZero = true) => dropAtOrBelowZero && v <= 0 ? DROP : isFrac(v) ? "fraction" : "no-match";
  function sameValueEntries(ctx, s, value = s.value, anyScope = false) {
    return ctx.index.entries.filter((e) => {
      if (!anyScope && !scopeOk(e.scopes, s.allowed)) return false;
      if (s.kind === "color") return e.colorKey === value;
      if (typeof value === "number") return e.num != null && sameNumber(e.num, value);
      return e.str != null && e.str === value;
    });
  }
  var byName = (a, b) => a.variable.name < b.variable.name ? -1 : a.variable.name > b.variable.name ? 1 : Number(b.user) - Number(a.user) || a.colIdx - b.colIdx;
  var byUserThenName = (a, b) => Number(b.user) - Number(a.user) || byName(a, b);
  var firstInFamily = (list, base) => {
    const ord = byFamilyOrder(base);
    return [...list].sort((a, b) => ord(a.variable.name, b.variable.name) || Number(b.user) - Number(a.user) || a.colIdx - b.colIdx)[0];
  };
  function pickDesigned(cands, kind) {
    var _a;
    const comp = cands.find((e) => e.tier === 3);
    if (comp) return comp;
    if (kind === "text") return null;
    return (_a = cands.filter((e) => e.tier === 2 && !e.auto && !e.mirror && !isOldPluginName(e.variable.name)).sort(byName)[0]) != null ? _a : null;
  }
  function resolveSlots(ctx) {
    var _a, _b, _c;
    const { res, preview } = ctx;
    const pending = [];
    const colorLeft = [];
    const emit = (s, e, viaPill = false, scopeAdd) => {
      res.bound++;
      const c = candOf(s, e.variable.id, e.variable.name, e.tier, entryDisplay(e, s), entryAlpha(e), viaPill, e.type);
      if (scopeAdd) c.scopeAdd = scopeAdd;
      preview.candidates.push(c);
    };
    const globalFor = (cands) => {
      var _a2;
      return (_a2 = cands.filter((e) => e.tier === 1 && e.direct).sort(byUserThenName)[0]) != null ? _a2 : null;
    };
    for (const s of ctx.slots) {
      const cands = sameValueEntries(ctx, s);
      const d = pickDesigned(cands, s.kind);
      if (d) {
        emit(s, d);
        continue;
      }
      if (s.kind === "color") {
        colorLeft.push({ slot: s, cands });
        continue;
      }
      const viaPill = s.pill != null;
      const cands2 = viaPill ? sameValueEntries(ctx, s, s.pill) : cands;
      const group = s.usage.split("/")[0];
      const two = s.kind === "text" ? cands2.filter((e) => e.tier === 2 && !e.mirror && e.variable.name.startsWith(`${group}/`)).sort(byName)[0] : firstInFamily(cands2.filter((e) => e.tier === 2 && !e.mirror && familyRe(s.usage, nameKindOf(s.usage, valueKey(slotValue(s)))).test(e.variable.name)), s.usage);
      if (two) {
        emit(s, two, viaPill);
        continue;
      }
      pending.push({ slot: s, base: s.usage, global: globalFor(cands2) });
    }
    const byUse = /* @__PURE__ */ new Map();
    for (const x of colorLeft) {
      const arr = byUse.get(x.slot.usage);
      if (arr) arr.push(x);
      else byUse.set(x.slot.usage, [x]);
    }
    for (const [use, list] of byUse) {
      const counts = /* @__PURE__ */ new Map();
      for (const x of list) {
        const k = colorSlotKey(x.slot.display, x.slot.bg, x.slot.alpha);
        const c = counts.get(k);
        if (c) c.count++;
        else counts.set(k, __spreadValues({ hex: x.slot.display, count: 1, bg: x.slot.bg }, x.slot.alpha != null ? { alpha: x.slot.alpha } : {}));
      }
      const def = ctx.index.entries.filter((e) => e.tier === 2 && e.variable.name === `color/${use}/default` && e.colorHex).sort(byName)[0];
      const bases = colorRoleBases([...counts.values()], def == null ? void 0 : def.colorHex, use);
      const refHex = colorRoleRef([...counts.values()], def == null ? void 0 : def.colorHex, use);
      for (const x of list) {
        const base = `color/${use}/${(_a = bases.get(colorSlotKey(x.slot.display, x.slot.bg, x.slot.alpha))) != null ? _a : "default"}`;
        const fam = familyRe(base, nameKindOf(base, valueKey(x.slot.value)));
        const two = firstInFamily(x.cands.filter((e) => e.tier === 2 && !e.mirror && fam.test(e.variable.name)), base);
        if (two) {
          emit(x.slot, two);
          continue;
        }
        pending.push({ slot: x.slot, base, global: globalFor(x.cands), refHex });
      }
    }
    const ownedSame = (s) => s.kind === "color" && s.noMatchReason === "no-match" ? sameValueEntries(ctx, s, s.value, true).filter((e) => e.tier === 1 && e.direct && !e.user).sort(byUserThenName) : [];
    const addScope = /* @__PURE__ */ new Map();
    const live = pending.filter((p) => {
      if (p.global) return true;
      const own = ownedSame(p.slot);
      if (own.length) {
        const pick = ctx.noNewRoles ? own.find((e) => !e.manual) : void 0;
        if (pick) {
          p.global = pick;
          addScope.set(p, p.slot.allowed[0]);
          return true;
        }
        skip(res, "scope-add", p.slot.node, preview, p.slot.field);
        return false;
      }
      if (p.slot.noMatchReason !== DROP) skip(res, p.slot.noMatchReason, p.slot.node, preview, p.slot.field);
      return false;
    });
    if (ctx.noNewRoles) {
      for (const p of live) emit(p.slot, p.global, p.slot.pill != null, addScope.get(p));
      return;
    }
    const names = assignNames(
      live.map((p) => __spreadValues({ base: p.base, value: valueKey(slotValue(p.slot)), count: 1 }, p.refHex ? { refHex: p.refHex } : {})),
      ctx.index.semNames,
      { reuse: false }
    );
    const roleOf = /* @__PURE__ */ new Map();
    for (const p of live) {
      const name = (_b = names.get(`${p.base}\0${valueKey(slotValue(p.slot))}`)) != null ? _b : p.base;
      let spec = roleOf.get(name);
      if (!spec) {
        const g2 = p.global;
        const scopes = (_c = scopeForSemanticRole(name)) != null ? _c : g2.scopes;
        spec = { name, globalId: g2.variable.id, scopes, globalName: g2.variable.name };
        roleOf.set(name, spec);
      }
      res.bound++;
      const g = p.global;
      preview.candidates.push(__spreadProps(__spreadValues({}, candOf(p.slot, `new:${name}`, name, 2, entryDisplay(g, p.slot), entryAlpha(g), p.slot.pill != null, g.type)), {
        // 타입 = 가리킬 Global(TR-18)
        newRole: { name: spec.name, globalId: spec.globalId, scopes: spec.scopes },
        newRoleGlobalName: spec.globalName
      }));
    }
  }
  var slotValue = (s) => {
    var _a;
    return (_a = s.pill) != null ? _a : s.value;
  };
  function candOf(s, variableId, variableName, tier, variableValue, variableAlpha, viaPill = false, resolvedType) {
    return __spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadProps(__spreadValues(__spreadProps(__spreadValues({
      nodeId: s.node.id,
      field: s.field
    }, s.index != null ? { index: s.index } : {}), {
      currentValue: s.display
    }), s.alpha != null ? { currentAlpha: s.alpha } : {}), {
      variableId,
      variableName,
      tier,
      variableValue
    }), resolvedType ? { resolvedType } : {}), variableAlpha != null ? { variableAlpha } : {}), s.mainId ? { mainId: s.mainId } : {}), viaPill && typeof s.value === "number" ? { pillFrom: s.value } : {});
  }
  function entryAlpha(e) {
    return e.colorAlpha != null && e.colorAlpha !== 1 ? e.colorAlpha : void 0;
  }
  function entryDisplay(e, s) {
    var _a;
    if (e.colorHex) return e.colorHex;
    if (e.num != null) return String(round2(e.num));
    return (_a = e.str) != null ? _a : s.display;
  }
  var numAllowed = (field) => {
    const scope = FIELD_SCOPE[field];
    return scope ? [scope] : ["ALL_SCOPES"];
  };
  async function walk(node, ctx, hooks, prog, depth, parentId) {
    var _a, _b, _c;
    const { res, preview } = ctx;
    if (res.cancelled) return;
    if (ctx.visited) {
      if (ctx.visited.has(node.id)) return;
      ctx.visited.add(node.id);
    }
    if (node.visible === false) {
      note(res, "hidden", node, preview);
      return;
    }
    preview.nodeIndex.push({ id: node.id, name: node.name, type: node.type, depth, parentId });
    const slotsBefore = ctx.slots.length;
    const main = node.type === "INSTANCE" ? (_a = ctx.mainOf) == null ? void 0 : _a.get(node.id) : void 0;
    const prevFilter = placeFilter;
    if (main) placeFilter = (n, field) => n === node && !!field && sameAsMain(node, main, field);
    try {
      bindPaints(node, ctx);
      bindFrame(node, ctx);
      bindRadius(node, ctx);
      bindStroke(node, ctx);
      bindOpacity(node, ctx);
      bindEffects(node, ctx);
      await bindText(node, ctx);
    } finally {
      placeFilter = prevFilter;
    }
    if (main) {
      const kept = ctx.slots.slice(slotsBefore).filter((sl) => !sameAsMain(node, main, sl.field, sl.index));
      ctx.slots.length = slotsBefore;
      ctx.slots.push(...kept);
    }
    if (ctx.mainId) for (let i = slotsBefore; i < ctx.slots.length; i++) ctx.slots[i].mainId = ctx.mainId;
    prog.done++;
    if (hooks.onProgress && prog.done % prog.every === 0) {
      hooks.onProgress(prog.done, prog.total);
      if (hooks.yieldToEvents) await hooks.yieldToEvents();
      if ((_b = hooks.shouldCancel) == null ? void 0 : _b.call(hooks)) {
        res.cancelled = true;
        return;
      }
    }
    if (node.type === "INSTANCE") {
      if ((_c = ctx.remote) == null ? void 0 : _c.has(node.id)) note(res, "library-main", node, preview);
      else if (node.children.length) {
        note(res, "instance-children", node, preview);
      }
      return;
    }
    if ("children" in node)
      for (const c of node.children) {
        await walk(c, ctx, hooks, prog, depth + 1, node.id);
        if (res.cancelled) return;
      }
  }
  function bindPaints(node, ctx) {
    const { res, preview } = ctx;
    for (const key of ["fills", "strokes"]) {
      if (!(key in node)) continue;
      const paints2 = node[key];
      if (paints2 === figma.mixed || !Array.isArray(paints2)) continue;
      if (!paints2.some((p) => p.type === "SOLID")) continue;
      if (hasStyleId(node, STYLE_KEY_OF[key])) {
        note(res, "styled", node, preview, key);
        continue;
      }
      const allowed = key === "fills" ? fillScopesFor(node.type) : STROKE_SCOPES;
      let use;
      let bg = null;
      paints2.forEach((p, i) => {
        if (p.type !== "SOLID") return;
        if (p.visible === false) return;
        const st = stateReason(colorState(p, node, key, i));
        if (st) {
          note(res, st, node, preview, key);
          return;
        }
        const alpha = itemAlpha(p);
        if (alpha === 0) return;
        const hex = rgbToHex(p.color);
        use != null ? use : use = colorUse(node.type, key, isInsideIconFrame(node));
        if (bg === null) {
          const bgHex = use === "text" || use === "icon" || use === "border" ? backgroundOf(node) : void 0;
          bg = bgHex ? bgKindOf(bgHex) : void 0;
        }
        ctx.slots.push(__spreadProps(__spreadValues(__spreadProps(__spreadValues({ node, field: key, index: i, kind: "color", value: colorKey(hex, alpha), display: hex }, alpha !== 1 ? { alpha } : {}), { allowed, usage: use }), bg ? { bg } : {}), { noMatchReason: "no-match" }));
      });
    }
  }
  function bindFrame(node, ctx) {
    const { res, preview } = ctx;
    if (node.type !== "FRAME" && node.type !== "COMPONENT" && node.type !== "INSTANCE") return;
    const kind = iconOrAvatarKind(node);
    if (kind) {
      if (inAutoLayoutFlow(node)) {
        const bindAxis = (sizing, field, v) => {
          if (sizing !== "FIXED") {
            note(res, "hug-fill", node, preview, field);
            return;
          }
          const fraction = Math.abs(v - Math.round(v)) >= 5e-3;
          tryBind(ctx, node, field, v, `size/${kind}`, fraction ? "size-fraction" : void 0);
        };
        if (aspectLocked(node)) {
          const ls = lockedSizeState(node);
          const st = stateReason(ls.state);
          if (st) note(res, st, node, preview, ls.field);
          else {
            const axis = lockedAxis(node);
            if (!axis) note(res, "hug-fill", node, preview, "width");
            else bindAxis("FIXED", axis, axis === "width" ? node.width : node.height);
          }
        } else {
          bindAxis(node.layoutSizingHorizontal, "width", node.width);
          bindAxis(node.layoutSizingVertical, "height", node.height);
        }
      } else {
        note(res, "size-free-layout", node, preview);
      }
    }
    if (node.layoutMode === "NONE") {
      note(res, "no-autolayout", node, preview);
      return;
    }
    if (node.layoutMode === "GRID") {
      tryBind(ctx, node, "gridRowGap", node.gridRowGap, simpleNumericName("gridRowGap"), numReason(node.gridRowGap));
      tryBind(ctx, node, "gridColumnGap", node.gridColumnGap, simpleNumericName("gridColumnGap"), numReason(node.gridColumnGap));
    } else {
      for (const f of ["itemSpacing", "counterAxisSpacing"]) {
        const v = node[f];
        if (typeof v !== "number") continue;
        const gs = gapSkip(node, f);
        if (gs === "no-wrap") continue;
        if (gs === "space-between") {
          if (v > 0) note(res, "space-between", node, preview, f);
        } else tryBind(ctx, node, f, v, simpleNumericName(f), numReason(v));
      }
    }
    const pad = { left: node.paddingLeft, right: node.paddingRight, top: node.paddingTop, bottom: node.paddingBottom };
    for (const f of ["paddingLeft", "paddingRight", "paddingTop", "paddingBottom"]) {
      tryBind(ctx, node, f, node[f], composeName("spacing", paddingProp(f, pad)), numReason(node[f]));
    }
  }
  function bindRadius(node, ctx) {
    if (!("cornerRadius" in node)) return;
    const r = node.cornerRadius;
    const corners = ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"];
    const values = corners.map((c) => r !== figma.mixed && typeof r === "number" ? r : Number(node[c]) || 0);
    if (r !== figma.mixed && !(typeof r === "number" && r > 0)) return;
    const { width, height } = node;
    const named = pillCorners(values, width, height);
    corners.forEach((c, i) => {
      if (values[i] > 0) tryBind(ctx, node, c, values[i], radiusName(c, named), numReason(values[i]), named[i] !== values[i] ? PILL_RADIUS : void 0);
    });
  }
  function bindOpacity(node, ctx) {
    if (!("opacity" in node)) return;
    const o = node.opacity;
    if (typeof o !== "number" || o >= 1 || o <= 0) return;
    tryBind(ctx, node, "opacity", o, simpleNumericName("opacity"));
  }
  function bindStroke(node, ctx) {
    const { res, preview } = ctx;
    if (!("strokes" in node) || !("strokeWeight" in node)) return;
    const strokes = node.strokes;
    if (strokes === figma.mixed || !Array.isArray(strokes) || !strokes.some((p) => p.visible !== false)) return;
    const w = node.strokeWeight;
    const sides = ["strokeTopWeight", "strokeRightWeight", "strokeBottomWeight", "strokeLeftWeight"];
    const sideValues = sides.map((sd) => Number(node[sd]) || 0);
    const one = (field, v) => {
      if (!(v > 0)) return;
      const st = stateReason(nodeFieldState(node, field));
      if (st) {
        note(res, st, node, preview, field);
        return;
      }
      if (Math.abs(v - Math.round(v)) >= 5e-3) {
        note(res, "fraction", node, preview, field);
        return;
      }
      tryBind(ctx, node, field, v, strokeName(field, sideValues));
    };
    if (w !== figma.mixed && typeof w === "number") {
      one("strokeWeight", w);
      return;
    }
    sides.forEach((sd, i) => one(sd, sideValues[i]));
  }
  function bindEffects(node, ctx) {
    const { res, preview } = ctx;
    if (!("effects" in node)) return;
    const effects = node.effects;
    if (!effects.some((e) => e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW")) return;
    if (hasStyleId(node, "effectStyleId")) {
      note(res, "styled", node, preview, "effects");
      return;
    }
    effects.forEach((e, i) => {
      if (e.type !== "DROP_SHADOW" && e.type !== "INNER_SHADOW") return;
      if (e.visible === false) return;
      const st = stateReason(colorState(e, node, "effects", i));
      if (st) {
        note(res, st, node, preview, "effects");
        return;
      }
      const alpha = itemAlpha(e);
      if (alpha === 0) return;
      const hex = rgbToHex(e.color);
      ctx.slots.push(__spreadProps(__spreadValues({ node, field: "effects", index: i, kind: "color", value: colorKey(hex, alpha), display: hex }, alpha !== 1 ? { alpha } : {}), { allowed: EFFECT_SCOPES, usage: "shadow", noMatchReason: "no-match" }));
    });
  }
  async function bindText(node, ctx) {
    var _a;
    const { res, preview } = ctx;
    if (node.type !== "TEXT") return;
    if (node.fontName === figma.mixed) return;
    if ((_a = ctx.skipText) == null ? void 0 : _a.call(ctx, node)) return;
    if (hasStyleId(node, "textStyleId")) {
      if (node.fontSize !== figma.mixed) note(res, "styled", node, preview, "fontSize");
      if (node.lineHeight !== figma.mixed && node.lineHeight.unit === "PIXELS" && node.lineHeight.value > 0) note(res, "styled", node, preview, "lineHeight");
      if (node.letterSpacing !== figma.mixed && node.letterSpacing.unit === "PIXELS" && node.letterSpacing.value !== 0) note(res, "styled", node, preview, "letterSpacing");
      const fam2 = node.fontName.family;
      if (ctx.index.entries.some((e) => e.str === fam2 && scopeOk(e.scopes, ["FONT_FAMILY"]))) note(res, "styled", node, preview, "fontFamily");
      return;
    }
    try {
      await figma.loadFontAsync(node.fontName);
    } catch (e) {
      note(res, "font", node, preview);
      return;
    }
    if (node.fontSize !== figma.mixed) tryBindText(ctx, node, "fontSize", node.fontSize);
    if (node.lineHeight !== figma.mixed && node.lineHeight.unit === "PIXELS") tryBindText(ctx, node, "lineHeight", node.lineHeight.value);
    if (node.letterSpacing !== figma.mixed && node.letterSpacing.unit === "PIXELS") tryBindText(ctx, node, "letterSpacing", node.letterSpacing.value);
    if (node.characters.length === 0) return;
    const fam = node.fontName.family;
    const st = stateReason(textFieldState(node, "fontFamily"));
    if (st) {
      note(res, st, node, preview, "fontFamily");
      return;
    }
    if (!ctx.index.entries.some((e) => e.str === fam && scopeOk(e.scopes, ["FONT_FAMILY"]))) return;
    ctx.slots.push({ node, field: "fontFamily", kind: "text", value: fam, display: fam, allowed: ["FONT_FAMILY"], usage: textUsageName("fontFamily"), noMatchReason: "no-match" });
  }
  function tryBindText(ctx, node, field, value) {
    const { res, preview } = ctx;
    const drop = field === "lineHeight" && value <= 0 || field === "letterSpacing" && value === 0;
    const reason = drop ? DROP : isFrac(value) ? "fraction" : "no-match";
    if (node.characters.length === 0) {
      if (drop) return;
      skip(res, "empty-text", node, preview, field);
      return;
    }
    const st = stateReason(textFieldState(node, field));
    if (st) {
      note(res, st, node, preview, field);
      return;
    }
    ctx.slots.push({ node, field, kind: "text", value, display: String(value), allowed: [FIELD_SCOPE[field]], usage: textUsageName(field), noMatchReason: reason });
  }
  function tryBind(ctx, node, field, value, usage, noMatchReason = "no-match", pill) {
    const allowed = numAllowed(field);
    const st = stateReason(nodeFieldState(node, field));
    if (st) {
      note(ctx.res, st, node, ctx.preview, field);
      return;
    }
    ctx.slots.push(__spreadValues({ node, field, kind: "num", value, display: String(value), allowed, usage, noMatchReason }, pill != null ? { pill } : {}));
  }
  var LINK_CHUNK = 300;
  async function bindSelectedItems(items, hooks = {}, known) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const res = { bound: 0, skipped: 0, reasons: {} };
    const preview = { candidates: [], nodeIndex: [], skips: [], skipSeen: /* @__PURE__ */ new Set() };
    const fail = (key, node, field) => {
      var _a2;
      if (node) skip(res, key, node, preview, field);
      else {
        res.skipped++;
        res.reasons[key] = ((_a2 = res.reasons[key]) != null ? _a2 : 0) + 1;
      }
    };
    const mainsBound = /* @__PURE__ */ new Set();
    const created = /* @__PURE__ */ new Map();
    const createdIds = {};
    const ensureRole = async (spec, global) => {
      var _a2;
      const have = created.get(spec.name);
      if (have) return have;
      const v = await createRole(spec, global);
      created.set(spec.name, v);
      createdIds[spec.name] = v.id;
      (_a2 = hooks.onCreated) == null ? void 0 : _a2.call(hooks, created.size);
      return v;
    };
    for (let start = 0; start < items.length; start += LINK_CHUNK) {
      const chunk = items.slice(start, start + LINK_CHUNK);
      const cols = await figma.variables.getLocalVariableCollectionsAsync();
      const modeOf = new Map(cols.map((c) => [c.id, c.defaultModeId]));
      const localIds = new Set((await figma.variables.getLocalVariablesAsync()).map((v) => v.id));
      const nodes = /* @__PURE__ */ new Map();
      for (const it of chunk) {
        if (nodes.has(it.nodeId)) continue;
        const k = known == null ? void 0 : known.get(it.nodeId);
        if (k) {
          nodes.set(it.nodeId, k);
          continue;
        }
        const n = await figma.getNodeByIdAsync(it.nodeId);
        nodes.set(it.nodeId, n && "type" in n && n.type !== "PAGE" && n.type !== "DOCUMENT" ? n : null);
      }
      const roots = [...nodes.values()].filter((n) => !!n);
      liveVarIds = await collectLiveVarIds(roots, localIds, false);
      const valueCache = /* @__PURE__ */ new Map();
      const variableOf = async (id) => {
        var _a2;
        if (valueCache.has(id)) return (_a2 = valueCache.get(id)) != null ? _a2 : null;
        const v = await figma.variables.getVariableByIdAsync(id);
        const entry = v ? { variable: v, value: await resolveValue(v, modeOf) } : null;
        valueCache.set(id, entry);
        return entry;
      };
      const sizeTargetCache = /* @__PURE__ */ new Map();
      const isSizeTarget = (n) => {
        let v = sizeTargetCache.get(n);
        if (v === void 0) sizeTargetCache.set(n, v = isIconOrAvatar(n));
        return v;
      };
      const changedPaints = /* @__PURE__ */ new Map();
      for (const it of chunk) {
        const node = (_a = nodes.get(it.nodeId)) != null ? _a : null;
        const vv = await variableOf(it.newRole ? it.newRole.globalId : it.variableId);
        if (!node || !vv) {
          fail("changed", node, it.field);
          continue;
        }
        const { value } = vv;
        const scopesOf = () => {
          var _a2;
          return it.newRole ? it.newRole.scopes : (_a2 = vv.variable.scopes) != null ? _a2 : ["ALL_SCOPES"];
        };
        const target = async () => it.newRole ? ensureRole(it.newRole, vv.variable) : vv.variable;
        try {
          if (it.field === "fills" || it.field === "strokes" || it.field === "effects") {
            const key = it.field;
            if (hasStyleId(node, STYLE_KEY_OF[key])) {
              fail("styled", node, key);
              continue;
            }
            const pending = (_c = (_b = changedPaints.get(node)) == null ? void 0 : _b.get(key)) == null ? void 0 : _c.arr;
            const list = pending != null ? pending : node[key];
            const i = (_d = it.index) != null ? _d : 0;
            const x = Array.isArray(list) ? list[i] : void 0;
            const isColorItem = !!x && (key === "effects" ? x.type === "DROP_SHADOW" || x.type === "INNER_SHADOW" : x.type === "SOLID");
            if (!Array.isArray(list) || !x || !isColorItem) {
              fail("changed", node, key);
              continue;
            }
            const st2 = stateReason(colorState(x, node, key, i));
            if (st2) {
              fail(st2, node, key);
              continue;
            }
            const hex = rgbToHex(x.color);
            const alpha = itemAlpha(x);
            const allowed = key === "fills" ? fillScopesFor(node.type) : key === "strokes" ? STROKE_SCOPES : EFFECT_SCOPES;
            const scopeAdd = !it.newRole && it.scopeAdd ? it.scopeAdd : void 0;
            if (alpha === 0 || vv.variable.resolvedType !== "COLOR" || !value || !isRGB(value) || rgbToHex(value) !== hex || roundAlpha(value.a) !== alpha || !scopeAdd && !scopeOk(scopesOf(), allowed)) {
              fail("changed", node, key);
              continue;
            }
            if (scopeAdd) addVariableScope(vv.variable, scopeAdd);
            const variable = await target();
            const arr = list.slice();
            arr[i] = key === "effects" ? figma.variables.setBoundVariableForEffect(x, "color", variable) : figma.variables.setBoundVariableForPaint(x, "color", variable);
            let m = changedPaints.get(node);
            if (!m) changedPaints.set(node, m = /* @__PURE__ */ new Map());
            const w = m.get(key);
            if (w) {
              w.arr = arr;
              w.fields++;
              if (it.mainId) w.mains.push(it.mainId);
            } else m.set(key, { arr, fields: 1, mains: it.mainId ? [it.mainId] : [] });
            continue;
          }
          if (TEXT_RANGE_FIELDS.includes(it.field)) {
            const field = it.field;
            if (node.type !== "TEXT") {
              fail("changed", node, field);
              continue;
            }
            if (hasStyleId(node, "textStyleId")) {
              fail("styled", node, field);
              continue;
            }
            const st2 = stateReason(textFieldState(node, field));
            if (st2) {
              fail(st2, node, field);
              continue;
            }
            if (node.characters.length === 0 || node.fontName === figma.mixed || !textValueEqual(node, field, value)) {
              fail("changed", node, field);
              continue;
            }
            await figma.loadFontAsync(node.fontName);
            node.setRangeBoundVariable(0, node.characters.length, field, await target());
            res.bound++;
            if (it.mainId) mainsBound.add(it.mainId);
            (_e = hooks.onBound) == null ? void 0 : _e.call(hooks, res.bound);
            continue;
          }
          const gap = gapSkip(node, it.field);
          if (gap) {
            fail(gap === "no-wrap" ? "changed" : "space-between", node, it.field);
            continue;
          }
          if ((it.field === "width" || it.field === "height") && !isSizeTarget(node)) {
            fail("changed", node, it.field);
            continue;
          }
          if ((it.field === "width" || it.field === "height") && aspectLocked(node)) {
            const ls = stateReason(lockedSizeState(node).state);
            if (ls) {
              fail(ls, node, it.field);
              continue;
            }
            if (lockedAxis(node) !== it.field) {
              fail("changed", node, it.field);
              continue;
            }
          }
          const st = stateReason(nodeFieldState(node, it.field));
          if (st) {
            fail(st, node, it.field);
            continue;
          }
          const cur = node[it.field];
          const pillOk = () => {
            const { width, height } = node;
            return it.pillFrom != null && typeof cur === "number" && typeof value === "number" && sameNumber(value, PILL_RADIUS) && sameNumber(cur, it.pillFrom) && isPillRadius(cur, width, height);
          };
          const pill = it.pillFrom != null;
          if (pill ? !pillOk() : typeof cur !== "number" || typeof value !== "number" || !sameNumber(cur, value)) {
            fail("changed", node, it.field);
            continue;
          }
          const tv = await target();
          if (pill) node[it.field] = PILL_RADIUS;
          node.setBoundVariable(it.field, tv);
          res.bound++;
          if (it.mainId) mainsBound.add(it.mainId);
          (_f = hooks.onBound) == null ? void 0 : _f.call(hooks, res.bound);
        } catch (e) {
          fail("error", node, it.field);
        }
      }
      for (const [node, m] of changedPaints) {
        for (const [key, w] of m) {
          try {
            node[key] = w.arr;
            res.bound += w.fields;
            for (const id of w.mains) mainsBound.add(id);
            (_g = hooks.onBound) == null ? void 0 : _g.call(hooks, res.bound);
          } catch (e) {
            for (let k = 0; k < w.fields; k++) fail("error", node, key);
          }
        }
      }
      changedPaints.clear();
      const done = Math.min(start + LINK_CHUNK, items.length);
      (_h = hooks.onProgress) == null ? void 0 : _h.call(hooks, done, items.length);
      if (hooks.yieldToEvents) await hooks.yieldToEvents();
    }
    const skips = capSkipsByReason(preview.skips, SKIP_PREVIEW_CAP);
    return { bound: res.bound, skipped: res.skipped, reasons: res.reasons, skips, newRoles: created.size, createdIds, mainsBound: [...mainsBound] };
  }
  async function createRole(spec, global) {
    var _a;
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const all = await figma.variables.getLocalVariablesAsync();
    const tiers = collectionTiers(cols, all);
    const col = ensureOwnedCollection(cols, "semantic");
    const semCols = new Map(cols.filter((c) => tiers.get(c.id) === 2).map((c) => [c.id, c]));
    semCols.set(col.id, col);
    const inCol = all.filter((v2) => semCols.has(v2.variableCollectionId));
    const pointsAtGlobal = (v2) => {
      var _a2;
      return v2.resolvedType === global.resolvedType && ((_a2 = semCols.get(v2.variableCollectionId)) != null ? _a2 : col).modes.every((m) => {
        const val = v2.valuesByMode[m.modeId];
        return !!val && typeof val === "object" && val.type === "VARIABLE_ALIAS" && val.id === global.id;
      });
    };
    const re = new RegExp(`^${spec.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:-\\d+)?$`);
    const globalNames = new Set(all.filter((v2) => tiers.get(v2.variableCollectionId) === 1).map((v2) => v2.name));
    const covers = (v2) => {
      var _a2;
      const sc = (_a2 = v2.scopes) != null ? _a2 : [];
      return sc.includes("ALL_SCOPES") || spec.scopes.every((x) => sc.includes(x));
    };
    const same = inCol.filter((v2) => re.test(v2.name) && pointsAtGlobal(v2) && covers(v2) && !globalNames.has(v2.name)).sort((a, b) => a.name.length - b.name.length || (a.name < b.name ? -1 : 1))[0];
    if (same) return same;
    const names = new Set(inCol.map((v2) => v2.name));
    let name = spec.name;
    for (let i = 2; names.has(name); i++) name = `${spec.name}-${i}`;
    const v = figma.variables.createVariable(name, col, global.resolvedType);
    for (const m of col.modes) v.setValueForMode(m.modeId, figma.variables.createVariableAlias(global));
    const scopes = scopesForType(spec.scopes, global.resolvedType);
    if (scopes.length) v.scopes = scopes;
    try {
      (_a = v.setPluginData) == null ? void 0 : _a.call(v, AUTO_ROLE_KEY, "1");
    } catch (e) {
    }
    return v;
  }
  function textValueEqual(node, field, value) {
    if (field === "fontFamily") return node.fontName !== figma.mixed && typeof value === "string" && node.fontName.family === value;
    if (typeof value !== "number") return false;
    if (field === "fontSize") return node.fontSize !== figma.mixed && sameNumber(node.fontSize, value);
    if (field === "lineHeight") {
      const lh = node.lineHeight;
      return lh !== figma.mixed && lh.unit === "PIXELS" && sameNumber(lh.value, value);
    }
    if (field === "letterSpacing") {
      const ls = node.letterSpacing;
      return ls !== figma.mixed && ls.unit === "PIXELS" && sameNumber(ls.value, value);
    }
    return false;
  }
  function boundVariableIds(node) {
    var _a, _b, _c, _d, _e;
    const out = [];
    const aliasIds = (raw) => {
      if (!raw) return [];
      const arr = Array.isArray(raw) ? raw : [raw];
      return arr.map((a) => a && typeof a === "object" && "id" in a ? a.id : void 0).filter((x) => !!x);
    };
    for (const key of ["fills", "strokes"]) {
      const ps = node[key];
      if (!Array.isArray(ps)) continue;
      for (const p of ps) {
        const id = (_b = (_a = p.boundVariables) == null ? void 0 : _a.color) == null ? void 0 : _b.id;
        if (id) out.push(id);
      }
    }
    const effects = node.effects;
    if (Array.isArray(effects)) {
      for (const e of effects) {
        const id = (_d = (_c = e.boundVariables) == null ? void 0 : _c.color) == null ? void 0 : _d.id;
        if (id) out.push(id);
      }
    }
    const bv = (_e = node.boundVariables) != null ? _e : {};
    for (const [field, raw] of Object.entries(bv)) {
      if (field === "fills" || field === "strokes" || field === "effects" || field === "componentProperties" || field === "textRangeFills") continue;
      out.push(...aliasIds(raw));
    }
    return out;
  }
  function walkVisibleDeep(roots, visit) {
    let scanned = 0;
    const stack = [];
    for (const r of roots) if (isEffectivelyVisible(r)) stack.push(r);
    while (stack.length) {
      const n = stack.pop();
      if (n.visible === false) continue;
      scanned++;
      visit(n);
      if ("children" in n) for (const c of n.children) stack.push(c);
    }
    return scanned;
  }
  function countUsage(roots) {
    const usage = /* @__PURE__ */ new Map();
    const nodesById = /* @__PURE__ */ new Map();
    const scanned = walkVisibleDeep(roots, (n) => {
      var _a, _b;
      const ids = boundVariableIds(n);
      if (!ids.length) return;
      const seen = /* @__PURE__ */ new Set();
      for (const id of ids) {
        const u = (_a = usage.get(id)) != null ? _a : { places: 0, layers: 0 };
        u.places++;
        if (!seen.has(id)) {
          u.layers++;
          seen.add(id);
          const list = (_b = nodesById.get(id)) != null ? _b : [];
          list.push(n.id);
          nodesById.set(id, list);
        }
        usage.set(id, u);
      }
    });
    return { usage, nodesById, scanned };
  }
  function findUsers(roots, varIds) {
    const nodes = [];
    let places = 0;
    walkVisibleDeep(roots, (n) => {
      const hits = boundVariableIds(n).filter((id) => varIds.has(id)).length;
      if (!hits) return;
      places += hits;
      nodes.push(n);
    });
    return { nodes, places };
  }
  var RANGE_FIELDS = /* @__PURE__ */ new Set(["fontSize", "lineHeight", "letterSpacing", "fontFamily", "fontWeight", "fontStyle", "paragraphSpacing", "paragraphIndent"]);
  var UNBIND_SKIP_FIELDS = /* @__PURE__ */ new Set(["fills", "strokes", "effects", "componentProperties", "textRangeFills", "layoutGrids"]);
  var aliasOf = (raw) => raw && typeof raw === "object" && "id" in raw ? raw.id : void 0;
  function deletedBindings(node, deletedIds) {
    var _a, _b;
    const out = [];
    if (!deletedIds.size) return out;
    for (const field of ["fills", "strokes"]) {
      const ps = node[field];
      if (!Array.isArray(ps)) continue;
      ps.forEach((p, index) => {
        var _a2, _b2;
        const id = (_b2 = (_a2 = p.boundVariables) == null ? void 0 : _a2.color) == null ? void 0 : _b2.id;
        if (id && deletedIds.has(id)) out.push({ kind: "paint", field, index });
      });
    }
    const effects = node.effects;
    if (Array.isArray(effects)) {
      effects.forEach((e, index) => {
        var _a2, _b2;
        const id = (_b2 = (_a2 = e.boundVariables) == null ? void 0 : _a2.color) == null ? void 0 : _b2.id;
        if (id && deletedIds.has(id)) out.push({ kind: "effect", index });
      });
    }
    const bv = (_a = node.boundVariables) != null ? _a : {};
    for (const [field, raw] of Object.entries(bv)) {
      if (UNBIND_SKIP_FIELDS.has(field)) continue;
      if (Array.isArray(raw)) {
        if (!raw.some((a) => {
          const id2 = aliasOf(a);
          return !!id2 && deletedIds.has(id2);
        })) continue;
        if (node.type === "TEXT" && RANGE_FIELDS.has(field)) {
          const segs = node.getStyledTextSegments([field, "boundVariables"]);
          for (const seg of segs) {
            const id2 = aliasOf((_b = seg.boundVariables) == null ? void 0 : _b[field]);
            if (id2 && deletedIds.has(id2)) out.push({ kind: "range", field, start: seg.start, end: seg.end });
          }
        }
        continue;
      }
      const id = aliasOf(raw);
      if (id && deletedIds.has(id)) out.push({ kind: "field", field });
    }
    return out;
  }
  async function unbindDeleted(roots, deletedIds) {
    var _a, _b;
    let unbound = 0;
    let failed = 0;
    const failReasons = {};
    const fail = (key, n) => {
      var _a2;
      failed += n;
      failReasons[key] = ((_a2 = failReasons[key]) != null ? _a2 : 0) + n;
    };
    const targets = [];
    walkVisibleDeep(roots, (n) => {
      const places = deletedBindings(n, deletedIds);
      if (places.length) targets.push({ node: n, places });
    });
    for (const { node, places } of targets) {
      const needsFont = node.type === "TEXT" && places.some((p) => p.kind === "range" || p.kind === "field" && p.field === "characters");
      if (needsFont) {
        try {
          const t2 = node;
          const fonts = t2.characters.length ? t2.getRangeAllFontNames(0, t2.characters.length) : [t2.fontName];
          for (const f of fonts) await figma.loadFontAsync(f);
        } catch (e) {
          const n = places.filter((p) => p.kind === "range" || p.kind === "field" && p.field === "characters").length;
          fail("font", n);
          places.splice(0, places.length, ...places.filter((p) => !(p.kind === "range" || p.kind === "field" && p.field === "characters")));
        }
      }
      for (const field of ["fills", "strokes"]) {
        const idx = places.filter((p) => p.kind === "paint" && p.field === field).map((p) => p.index);
        if (!idx.length) continue;
        try {
          const paints2 = ((_a = node[field]) != null ? _a : []).slice();
          for (const i of idx) paints2[i] = figma.variables.setBoundVariableForPaint(paints2[i], "color", null);
          node[field] = paints2;
          unbound += idx.length;
        } catch (e) {
          fail("error", idx.length);
        }
      }
      const effIdx = places.filter((p) => p.kind === "effect").map((p) => p.index);
      if (effIdx.length) {
        try {
          const effs = ((_b = node.effects) != null ? _b : []).slice();
          for (const i of effIdx) effs[i] = figma.variables.setBoundVariableForEffect(effs[i], "color", null);
          node.effects = effs;
          unbound += effIdx.length;
        } catch (e) {
          fail("error", effIdx.length);
        }
      }
      for (const p of places) {
        try {
          if (p.kind === "range") {
            node.setRangeBoundVariable(p.start, p.end, p.field, null);
            unbound++;
          } else if (p.kind === "field") {
            node.setBoundVariable(p.field, null);
            unbound++;
          }
        } catch (e) {
          fail("error", 1);
        }
      }
    }
    return { unbound, failed, failReasons };
  }
  function countDeleted(roots, deletedIds) {
    let count = 0;
    const nodeIds = [];
    walkVisibleDeep(roots, (n) => {
      const k = deletedBindings(n, deletedIds).length;
      if (!k) return;
      count += k;
      nodeIds.push(n.id);
    });
    return { count, nodeIds };
  }

  // src/lib/extract.ts
  var SKIP_HIDDEN = t("extract.skipHidden");
  var SKIP_INSTANCE = t("extract.skipInstance");
  var SKIP_GRADIENT = t("extract.skipGradient");
  var round = (n, p = 2) => Math.round(n * 10 ** p) / 10 ** p;
  var SKIP_FRACTION = t("extract.skipFraction");
  function onScale(acc, v, step = 1) {
    const ok = Math.abs(v / step - Math.round(v / step)) < 1e-6;
    if (!ok) acc.skipped.add(SKIP_FRACTION);
    return ok;
  }
  function keyOf(category, value, unit, alpha) {
    return `${category}|${value}|${unit != null ? unit : ""}|${alpha != null ? alpha : 1}`;
  }
  function colorToken(category, hex, alpha) {
    return alpha < 1 ? { name: `${colorTokenName(hex)}-a${alphaPct(alpha)}`, category, value: hex, alpha } : { name: colorTokenName(hex), category, value: hex };
  }
  var scopeKey = (allowed) => allowed.join("|");
  var isFree = (st) => st === "none";
  var fieldPlace = (node, field, places = 1) => ({ key: scopeKey(numAllowed(field)), free: isFree(nodeFieldState(node, field)) ? places : 0 });
  function add(acc, token, source, nodeId, use, bg, place) {
    var _a, _b, _c, _d;
    const k = keyOf(token.category, token.value, token.unit, token.alpha);
    let existing = acc.map.get(k);
    if (existing) {
      if (!existing.sources.includes(source)) existing.sources.push(source);
      if (acc.lastNode.get(k) !== nodeId) existing.count = ((_a = existing.count) != null ? _a : 1) + 1;
    } else {
      existing = __spreadProps(__spreadValues({}, token), { sources: [source], count: 1 });
      acc.map.set(k, existing);
    }
    acc.lastNode.set(k, nodeId);
    if (place) {
      const fb = (_b = existing.freeBy) != null ? _b : existing.freeBy = {};
      if (place.free > 0) fb[place.key] = ((_c = fb[place.key]) != null ? _c : 0) + place.free;
    }
    if (use) {
      const uses = (_d = existing.uses) != null ? _d : existing.uses = [];
      const u = uses.find((x) => x.name === use && x.bg === bg);
      if (u) u.count++;
      else uses.push(bg ? { name: use, count: 1, bg } : { name: use, count: 1 });
    }
  }
  function backgroundOf(node) {
    var _a;
    let p = node.parent;
    while (p && p.type !== "PAGE" && p.type !== "DOCUMENT") {
      const fills = p.fills;
      if (Array.isArray(fills)) {
        const vis = fills.filter((f) => f.visible !== false && f.opacity !== 0);
        if (vis.length) {
          const top = vis[vis.length - 1];
          if (top.type === "SOLID" && ((_a = top.opacity) != null ? _a : 1) >= 1) return rgbToHex(top.color);
          return void 0;
        }
      }
      p = p.parent;
    }
    return void 0;
  }
  function collectPaints(acc, node, paints2, source) {
    const nodeId = node.id;
    if (paints2 === figma.mixed || !Array.isArray(paints2)) return;
    const key = scopeKey(source === "fill" ? fillScopesFor(node.type) : STROKE_SCOPES);
    for (let i = 0; i < paints2.length; i++) {
      const p = paints2[i];
      if (p.visible === false) continue;
      if (p.type !== "SOLID") {
        acc.skipped.add(SKIP_GRADIENT);
        continue;
      }
      const alpha = roundAlpha(p.opacity);
      if (alpha === 0) continue;
      const hex = rgbToHex(p.color);
      const cu = colorUse(node.type, source === "fill" ? "fills" : "strokes", isInsideIconFrame(node));
      const bgHex = cu === "text" || cu === "icon" || cu === "border" ? backgroundOf(node) : void 0;
      const free = isFree(colorState(p, node, source === "fill" ? "fills" : "strokes", i)) ? 1 : 0;
      add(acc, colorToken("color", hex, alpha), source, nodeId, `color/${cu}`, bgHex ? bgKindOf(bgHex) : void 0, { key, free });
    }
  }
  function collectText(acc, node) {
    if (node.fontSize !== figma.mixed) {
      const v = round(node.fontSize);
      if (onScale(acc, v)) add(acc, { name: numberTokenName("font-size", v), category: "fontSize", value: v }, "fontSize", node.id);
    }
    if (node.fontName !== figma.mixed) {
      const fam = node.fontName.family;
      add(acc, { name: `font-family/${fam}`, category: "fontFamily", value: fam }, "fontFamily", node.id);
    }
    if (node.lineHeight !== figma.mixed && node.lineHeight.unit === "PIXELS") {
      const v = round(node.lineHeight.value);
      const unit = "px";
      if (v > 0 && onScale(acc, v)) add(acc, { name: numberTokenName("line-height", v), category: "lineHeight", value: v, unit }, "lineHeight", node.id);
    }
    if (node.letterSpacing !== figma.mixed && node.letterSpacing.unit === "PIXELS") {
      const v = round(node.letterSpacing.value);
      const unit = "px";
      if (v !== 0 && onScale(acc, v)) add(acc, { name: numberTokenName("letter-spacing", v), category: "letterSpacing", value: v, unit }, "letterSpacing", node.id);
    }
  }
  function gapSkip(node, field) {
    const n = node;
    if (field === "itemSpacing") return n.primaryAxisAlignItems === "SPACE_BETWEEN" ? "space-between" : null;
    if (field === "counterAxisSpacing") {
      if (n.layoutWrap !== "WRAP") return "no-wrap";
      return n.counterAxisAlignContent === "SPACE_BETWEEN" ? "space-between" : null;
    }
    return null;
  }
  function collectSpacing(acc, node) {
    if (node.layoutMode === "NONE") return;
    const pad = { left: node.paddingLeft, right: node.paddingRight, top: node.paddingTop, bottom: node.paddingBottom };
    const gaps = ["paddingLeft", "paddingRight", "paddingTop", "paddingBottom"].map((f) => [
      node[f],
      composeName("spacing", paddingProp(f, pad)),
      f
    ]);
    if (node.layoutMode === "GRID") {
      gaps.push([node.gridRowGap, simpleNumericName("gridRowGap"), "gridRowGap"], [node.gridColumnGap, simpleNumericName("gridColumnGap"), "gridColumnGap"]);
    } else {
      if (!gapSkip(node, "itemSpacing")) gaps.push([node.itemSpacing, simpleNumericName("itemSpacing"), "itemSpacing"]);
      if (typeof node.counterAxisSpacing === "number" && !gapSkip(node, "counterAxisSpacing")) gaps.push([node.counterAxisSpacing, simpleNumericName("counterAxisSpacing"), "counterAxisSpacing"]);
    }
    for (const [g, use, field] of gaps) {
      if (typeof g === "number" && g > 0) {
        const v = round(g);
        if (onScale(acc, v)) add(acc, { name: numberTokenName("spacing", v), category: "gap", value: v }, "gap", node.id, use, void 0, fieldPlace(node, field));
      }
    }
  }
  function iconVectorCount(children, visible = true) {
    let vectors = 0;
    for (const c of children) {
      if (hasImageFill(c)) return -1;
      const shown = visible && c.visible !== false;
      if (VECTOR_TYPES.has(c.type)) {
        if (shown) vectors++;
        continue;
      }
      if (c.type === "ELLIPSE" || c.type === "RECTANGLE") continue;
      if (c.type === "GROUP" || c.type === "FRAME" || c.type === "INSTANCE") {
        const n = iconVectorCount("children" in c ? c.children : [], shown);
        if (n < 0) return -1;
        vectors += n;
        continue;
      }
      return -1;
    }
    return vectors;
  }
  function isSmallSquare(node) {
    if (node.type !== "FRAME" && node.type !== "COMPONENT" && node.type !== "INSTANCE") return false;
    const w = round(node.width);
    return w > 0 && w === round(node.height) && w <= 64;
  }
  function isIconSelf(node) {
    return !hasImageFill(node) && iconVectorCount("children" in node ? node.children : []) > 0;
  }
  function isAvatarSelf(node) {
    const w = round(node.width);
    const r = node.cornerRadius;
    let radii = [];
    if (r === figma.mixed) {
      for (const corner of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) {
        const cv = node[corner];
        radii.push(typeof cv === "number" ? cv : 0);
      }
    } else if (typeof r === "number") radii = [r];
    if (radii.length > 0 && radii.every((cv) => round(cv) >= w / 2)) {
      const imageWithin = (n, depth) => {
        if (hasImageFill(n)) return true;
        if (depth >= 2 || !("children" in n)) return false;
        return n.children.some((c) => c.visible !== false && imageWithin(c, depth + 1));
      };
      if (imageWithin(node, 0)) return true;
    }
    const children = "children" in node ? node.children : [];
    return children.some(
      (c) => c.visible !== false && c.type === "ELLIPSE" && hasImageFill(c) && Math.abs(c.width - node.width) <= 0.5 && Math.abs(c.height - node.height) <= 0.5
    );
  }
  function hasIconAncestor(node) {
    for (let p = node.parent; p && p.type !== "PAGE" && p.type !== "DOCUMENT"; p = p.parent) {
      if (isSmallSquare(p) && isIconSelf(p)) return true;
    }
    return false;
  }
  function isIconOrAvatar(node) {
    if (!isSmallSquare(node)) return false;
    if (!isIconSelf(node) && !isAvatarSelf(node)) return false;
    return !hasIconAncestor(node);
  }
  function inAutoLayoutFlow(node) {
    if ("layoutPositioning" in node && node.layoutPositioning === "ABSOLUTE") return false;
    const parent = node.parent;
    return node.layoutMode !== "NONE" || parent != null && "layoutMode" in parent && parent.layoutMode !== "NONE";
  }
  function iconOrAvatarKind(node) {
    if (!isIconOrAvatar(node)) return null;
    return isIconSelf(node) ? "icon" : "avatar";
  }
  function isInsideIconFrame(node) {
    for (let p = node.parent; p && p.type !== "PAGE" && p.type !== "DOCUMENT"; p = p.parent) {
      if (isSmallSquare(p) && isIconSelf(p)) return true;
    }
    return false;
  }
  function collectSize(acc, node) {
    if (!isIconOrAvatar(node)) return;
    if (!inAutoLayoutFlow(node)) return;
    const locked = aspectLocked(node);
    let lockedTaken = false;
    const addSize = (v, field) => {
      const rv = round(v);
      if (!(rv > 0 && Number.isInteger(rv))) return;
      let place;
      if (!locked) place = fieldPlace(node, field);
      else {
        place = { key: scopeKey(numAllowed(field)), free: !lockedTaken && isFree(lockedSizeState(node).state) ? 1 : 0 };
        lockedTaken = true;
      }
      add(acc, { name: numberTokenName("size", rv), category: "size", value: rv }, "size", node.id, `size/${isIconSelf(node) ? "icon" : "avatar"}`, void 0, place);
    };
    if (node.layoutSizingHorizontal === "FIXED") addSize(node.width, "width");
    if (node.layoutSizingVertical === "FIXED") addSize(node.height, "height");
  }
  function collectRadius(acc, node) {
    if (!("cornerRadius" in node)) return;
    const r = node.cornerRadius;
    const corners = ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"];
    if (r !== figma.mixed && typeof r !== "number") return;
    const values = corners.map((c) => r !== figma.mixed ? r : Number(node[c]) || 0);
    const { width, height } = node;
    const named = pillCorners(values, width, height);
    const list = r === figma.mixed ? corners.map((c, i) => [c, named[i]]) : [[corners[0], named[0]]];
    for (const [c, rv] of list) {
      if (rv > 0) {
        const v = round(rv);
        const place = r === figma.mixed ? fieldPlace(node, c) : { key: scopeKey(numAllowed(c)), free: corners.filter((cc) => isFree(nodeFieldState(node, cc))).length };
        if (onScale(acc, v)) add(acc, { name: numberTokenName("radius", v), category: "radius", value: v }, "radius", node.id, radiusName(c, named), void 0, place);
      }
    }
  }
  function collectStroke(acc, node) {
    if (!("strokes" in node) || !("strokeWeight" in node)) return;
    const strokes = node.strokes;
    if (strokes === figma.mixed || !Array.isArray(strokes) || !strokes.some((p) => p.visible !== false)) return;
    const w = node.strokeWeight;
    const sides = ["strokeTopWeight", "strokeRightWeight", "strokeBottomWeight", "strokeLeftWeight"];
    const sideValues = sides.map((sd) => Number(node[sd]) || 0);
    const widths = [];
    if (w === figma.mixed) sides.forEach((sd, i) => widths.push([sd, sideValues[i]]));
    else if (typeof w === "number") widths.push(["strokeWeight", w]);
    for (const [field, wv] of widths) {
      if (wv > 0) {
        const v = round(wv);
        if (onScale(acc, v)) add(acc, { name: numberTokenName("stroke-width", v), category: "strokeWidth", value: v }, "strokeWidth", node.id, strokeName(field, sideValues), void 0, fieldPlace(node, field));
      }
    }
  }
  function collectOpacity(acc, node) {
    if (!("opacity" in node)) return;
    const o = node.opacity;
    if (typeof o !== "number" || o >= 1 || o <= 0) return;
    const v = round(o);
    add(acc, { name: numberTokenName("opacity", v), category: "opacity", value: v }, "opacity", node.id, simpleNumericName("opacity"), void 0, fieldPlace(node, "opacity"));
  }
  function collectEffects(acc, node) {
    var _a;
    if (!("effects" in node)) return;
    const effects = node.effects;
    for (let i = 0; i < effects.length; i++) {
      const e = effects[i];
      if (e.visible === false) continue;
      if (e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW") {
        const alpha = roundAlpha(e.color.a);
        if (alpha === 0) continue;
        const hex = rgbToHex(e.color);
        const free = isFree(colorState(e, node, "effects", i)) ? 1 : 0;
        add(acc, colorToken("effectColor", hex, alpha), "effectColor", node.id, "color/shadow", void 0, { key: scopeKey(EFFECT_SCOPES), free });
        for (const [g, val] of [
          ["shadow-blur", e.radius],
          ["shadow-spread", (_a = e.spread) != null ? _a : 0],
          ["shadow-x", e.offset.x],
          ["shadow-y", e.offset.y]
        ]) {
          const v = round(val);
          if (onScale(acc, v)) add(acc, { name: numberTokenName(g, v), category: "effectFloat", value: v }, "effectFloat", node.id);
        }
      } else if (e.type === "LAYER_BLUR" || e.type === "BACKGROUND_BLUR") {
        const v = round(e.radius);
        if (onScale(acc, v)) add(acc, { name: numberTokenName("blur", v), category: "effectFloat", value: v }, "effectFloat", node.id);
      }
    }
  }
  function walk2(acc, node) {
    var _a;
    if (node.visible === false) {
      acc.skipped.add(SKIP_HIDDEN);
      return;
    }
    if ("fills" in node) collectPaints(acc, node, node.fills, "fill");
    if ("strokes" in node) collectPaints(acc, node, node.strokes, "stroke");
    if (node.type === "TEXT") collectText(acc, node);
    if (node.type === "FRAME" || node.type === "COMPONENT" || node.type === "INSTANCE") {
      collectSpacing(acc, node);
    }
    collectSize(acc, node);
    collectRadius(acc, node);
    collectStroke(acc, node);
    collectOpacity(acc, node);
    collectEffects(acc, node);
    if (node.type === "INSTANCE") {
      if ("children" in node && node.children.length && !((_a = acc.covered) == null ? void 0 : _a.has(node.id))) acc.skipped.add(SKIP_INSTANCE);
      return;
    }
    if ("children" in node) for (const child of node.children) walk2(acc, child);
  }
  function isEffectivelyVisible2(node) {
    let p = node;
    while (p) {
      if ("visible" in p && p.visible === false) return false;
      p = p.parent;
    }
    return true;
  }
  function extractFromSelection(selection2, coveredInstances) {
    const acc = { map: /* @__PURE__ */ new Map(), warnings: /* @__PURE__ */ new Set(), lastNode: /* @__PURE__ */ new Map(), skipped: /* @__PURE__ */ new Set(), covered: coveredInstances };
    for (const node of selection2) {
      if (!isEffectivelyVisible2(node)) {
        acc.skipped.add(SKIP_HIDDEN);
        continue;
      }
      walk2(acc, node);
    }
    const tokens = [...acc.map.values()].sort((a, b) => a.name.localeCompare(b.name));
    const warnings = tokens.length ? [...acc.warnings] : [...acc.warnings, ...acc.skipped];
    return { tokens, warnings };
  }

  // src/lib/errors.ts
  function explainError(raw) {
    const s = (raw || "").toLowerCase();
    if (/font|loadfontasync|has not been loaded/.test(s))
      return { message: t("err.font"), action: t("err.fontAction"), retryable: true };
    if (/invalid scope|scope/.test(s))
      return { message: t("err.scope"), action: t("err.scopeAction"), retryable: true };
    if (/incompatible|property value/.test(s))
      return { message: t("err.prop"), action: t("err.propAction"), retryable: false };
    if (/read[- ]?only|permission|not allowed|cannot edit/.test(s))
      return { message: t("err.readonly"), action: t("err.readonlyAction"), retryable: false };
    if (/network|fetch|timeout|offline/.test(s))
      return { message: t("err.network"), action: t("err.networkAction"), retryable: true };
    if (/storage|quota|exceeded/.test(s))
      return { message: t("err.storage"), action: t("err.storageAction"), retryable: true };
    return { message: raw || t("err.unknown"), action: t("err.unknownAction"), retryable: true };
  }

  // src/lib/exporters.ts
  var WEIGHT_NAMES = {
    thin: 100,
    hairline: 100,
    extralight: 200,
    ultralight: 200,
    light: 300,
    regular: 400,
    normal: 400,
    medium: 500,
    semibold: 600,
    demibold: 600,
    bold: 700,
    extrabold: 800,
    ultrabold: 800,
    black: 900,
    heavy: 900
  };
  function splitWeightStyle(value) {
    var _a;
    if (typeof value === "number") return { weight: value, italic: false };
    const s = String(value);
    const italic = /italic|oblique/i.test(s);
    const cleaned = s.replace(/italic|oblique/gi, "").replace(/[\s_-]/g, "").toLowerCase();
    const weight = (_a = WEIGHT_NAMES[cleaned]) != null ? _a : Number(cleaned) || 400;
    return { weight, italic };
  }
  function dimension(token, opts) {
    const n = Number(token.value);
    if (token.kind === "fontSize" && opts.fontSizeUnit === "rem") {
      const r = n / opts.base;
      return `${Number(r.toFixed(4))}rem`;
    }
    return `${n}px`;
  }
  function cssLiteral(token, opts) {
    var _a;
    switch (token.kind) {
      case "color":
        return String(token.value);
      case "fontFamily":
        return String(token.value);
      case "opacity":
        return String(token.value);
      case "lineHeight":
      case "letterSpacing":
        return (_a = token.description) != null ? _a : `${Number(token.value)}px`;
      case "fontWeight":
        return String(splitWeightStyle(token.value).weight);
      case "fontSize":
      case "spacing":
      case "radius":
      case "size":
      case "strokeWidth":
      case "effectFloat":
        return dimension(token, opts);
      default:
        return String(token.value);
    }
  }
  var cssVar = (name) => `--${kebab(name)}`;
  function tokenCssLines(t2, opts) {
    if (t2.aliasOf) return [`  ${cssVar(t2.name)}: var(${cssVar(t2.aliasOf)});`];
    const out = [`  ${cssVar(t2.name)}: ${cssLiteral(t2, opts)};`];
    if (t2.kind === "fontWeight" && splitWeightStyle(t2.value).italic) {
      out.push(`  ${cssVar(t2.name)}-style: italic;`);
    }
    return out;
  }
  var CSS_RULE = "=".repeat(74);
  var cssBlockHead = (title) => [`/* ${CSS_RULE}`, `   ${title}`, `   ${CSS_RULE} */`];
  var CSS_HEAD = {
    Global: "GLOBAL (Primitive) \u2014 raw values. Do not use directly in components.",
    Semantic: "SEMANTIC \u2014 UI roles mapped to Global. Use these in components.",
    textStyles: "TEXT STYLES"
  };
  var CSS_GROUP_ORDER = ["Color", "Typography", "Spacing", "Radius", "Size", "Stroke", "Opacity", "Other"];
  var CSS_GROUP_OF = {
    color: "Color",
    fontSize: "Typography",
    lineHeight: "Typography",
    letterSpacing: "Typography",
    fontFamily: "Typography",
    fontWeight: "Typography",
    spacing: "Spacing",
    radius: "Radius",
    size: "Size",
    strokeWidth: "Stroke",
    opacity: "Opacity",
    effectFloat: "Other",
    other: "Other"
  };
  var byName2 = (a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
  function groupBody(mine, opts) {
    const body = [];
    for (const g of CSS_GROUP_ORDER) {
      const inGroup = mine.filter((t2) => {
        var _a;
        return ((_a = CSS_GROUP_OF[t2.kind]) != null ? _a : "Other") === g;
      }).sort(byName2);
      if (!inGroup.length) continue;
      if (body.length) body.push("");
      body.push(`  /* ${g} */`);
      for (const t2 of inGroup) body.push(...tokenCssLines(t2, opts));
    }
    return body;
  }
  function tierBlock(tokens, tier, opts) {
    const mine = tokens.filter((t2) => t2.collection === tier);
    if (!mine.length) return null;
    return [...cssBlockHead(CSS_HEAD[tier]), ":root {", ...groupBody(mine, opts), "}"];
  }
  var TIER_UPPER = { Global: "GLOBAL", Semantic: "SEMANTIC" };
  var cssAttr = (v) => v.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  function modeBlock(base, mode, tier, opts) {
    const byId = new Map(mode.tokens.filter((t2) => t2.id !== void 0).map((t2) => [t2.id, t2]));
    const changed = [];
    for (const b of base) {
      if (b.collection !== tier || b.id === void 0) continue;
      const m = byId.get(b.id);
      if (!m) continue;
      if (tokenCssLines(m, opts).join("\n") !== tokenCssLines(b, opts).join("\n")) changed.push(m);
    }
    if (!changed.length) return null;
    const title = `${TIER_UPPER[tier]} \u2014 ${mode.titles[tier].replace(/\*\//g, "*\\/")} mode (only values that differ)`;
    return [...cssBlockHead(title), `[data-theme="${cssAttr(mode.key)}"] {`, ...groupBody(changed, opts), "}"];
  }
  function toCss(tokens, opts, textStyles, modes) {
    const blocks = [];
    for (const tier of ["Global", "Semantic"]) {
      const b = tierBlock(tokens, tier, opts);
      if (!b) continue;
      blocks.push(b);
      for (const m of modes) {
        const mb = modeBlock(tokens, m, tier, opts);
        if (mb) blocks.push(mb);
      }
    }
    if (textStyles.length) {
      const sorted = [...textStyles].sort(byName2);
      blocks.push([...cssBlockHead(CSS_HEAD.textStyles), ":root {", ...textStylesToCss(sorted, opts), "}"]);
    }
    if (!blocks.length) return ":root {\n}";
    return blocks.map((b) => b.join("\n")).join("\n\n");
  }
  var W3C_TYPE = {
    color: "color",
    fontSize: "dimension",
    spacing: "dimension",
    radius: "dimension",
    size: "dimension",
    strokeWidth: "dimension",
    effectFloat: "dimension",
    fontFamily: "fontFamily",
    fontWeight: "fontWeight",
    opacity: "number",
    lineHeight: "lineHeight",
    // 비표준(DTCG 미정의) — 단위 보존 위해 문자열 값
    letterSpacing: "letterSpacing"
    // 비표준
  };
  var w3cRef = (name) => `{${name.split("/").filter(Boolean).join(".")}}`;
  function w3cValue(token, opts) {
    var _a, _b;
    if (token.aliasOf) return w3cRef(token.aliasOf);
    switch (token.kind) {
      case "color":
      case "fontFamily":
        return String(token.value);
      case "lineHeight":
      case "letterSpacing":
        return (_a = token.description) != null ? _a : `${Number(token.value)}px`;
      case "opacity":
        return Number(token.value);
      case "fontWeight":
        return splitWeightStyle(token.value).weight;
      case "fontSize":
      case "spacing":
      case "radius":
      case "size":
      case "strokeWidth":
      case "effectFloat":
        return dimension(token, opts);
      default:
        return (_b = token.value) != null ? _b : "";
    }
  }
  function toW3C(tokens, opts) {
    var _a;
    const root = {};
    for (const t2 of tokens) {
      const segs = t2.name.split("/").filter(Boolean);
      let node = root;
      for (let i = 0; i < segs.length - 1; i++) {
        const key = segs[i];
        if (!node[key] || "$value" in node[key]) node[key] = (_a = node[key]) != null ? _a : {};
        node = node[key];
      }
      const leaf = { $value: w3cValue(t2, opts) };
      const ty = W3C_TYPE[t2.kind];
      if (ty) leaf.$type = ty;
      node[segs[segs.length - 1]] = leaf;
      if (!t2.aliasOf && t2.kind === "fontWeight" && splitWeightStyle(t2.value).italic) {
        node[`${segs[segs.length - 1]}-style`] = { $type: "fontStyle", $value: "italic" };
      }
    }
    return JSON.stringify(root, null, 2);
  }
  function dedupeByName(tokens) {
    const seen = /* @__PURE__ */ new Map();
    for (const t2 of tokens) {
      const prev = seen.get(t2.name);
      if (!prev || prev.collection === "Semantic" && t2.collection === "Global") seen.set(t2.name, t2);
    }
    return [...seen.values()];
  }
  var ALIAS_READ_LIMIT = 12;
  function resolveExportTokens(vars) {
    return resolveWith(vars, (v) => v);
  }
  function exportModeKey(name) {
    return name.trim().toLowerCase().replace(/\s+/g, "-");
  }
  function resolveExportModes(vars, cols) {
    var _a;
    const modeOfKey = /* @__PURE__ */ new Map();
    const keys = [];
    const titles = /* @__PURE__ */ new Map();
    for (const c of cols) {
      const def = c.modes.find((m) => m.modeId === c.defaultModeId);
      const defKey = def ? exportModeKey(def.name) : "";
      const mine = /* @__PURE__ */ new Map();
      for (const m of c.modes) {
        if (m.modeId === c.defaultModeId) continue;
        const k = exportModeKey(m.name);
        if (!k || k === defKey || mine.has(k)) continue;
        mine.set(k, m.modeId);
        if (!keys.includes(k)) keys.push(k);
        const ti = (_a = titles.get(k)) != null ? _a : {};
        if (ti.any === void 0) ti.any = m.name;
        if (c.tier === 1 && ti.Global === void 0) ti.Global = m.name;
        if (c.tier === 2 && ti.Semantic === void 0) ti.Semantic = m.name;
        titles.set(k, ti);
      }
      modeOfKey.set(c.id, mine);
    }
    keys.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
    return keys.map((k) => {
      var _a2, _b, _c, _d, _e;
      const ti = (_a2 = titles.get(k)) != null ? _a2 : {};
      const tokens = resolveWith(vars, (v) => {
        var _a3, _b2;
        const mid = v.collectionId !== void 0 ? (_a3 = modeOfKey.get(v.collectionId)) == null ? void 0 : _a3.get(k) : void 0;
        const mv = mid !== void 0 ? (_b2 = v.modeValues) == null ? void 0 : _b2[mid] : void 0;
        return mv ? __spreadProps(__spreadValues({}, v), { alias: mv.alias, value: mv.value }) : v;
      });
      return { key: k, titles: { Global: (_c = (_b = ti.Global) != null ? _b : ti.any) != null ? _c : k, Semantic: (_e = (_d = ti.Semantic) != null ? _d : ti.any) != null ? _e : k }, tokens };
    });
  }
  function resolveWith(vars, read) {
    const byId = new Map(vars.map((v) => [v.id, v]));
    const ok = passing(vars, byId);
    const winner = winnersOf(ok);
    const survivors = new Set([...winner.values()].map((v) => v.id));
    const resolveOne = (v, prime) => {
      const tok = { id: v.id, name: v.name, collection: v.tier === 1 ? "Global" : "Semantic", type: v.type, kind: v.kind };
      let cur = read(v);
      while (cur.alias !== void 0) {
        const next = byId.get(cur.alias);
        let point = survivors.has(next.id);
        if (!point && prime && next.tier === 1) {
          const s = winner.get(next.name);
          if (s && s.id !== next.id && s.tier === 1 && reaches(s, read, byId)) point = sameOutput(resolveOne(next, false), resolveOne(s, false));
        }
        if (point) {
          tok.aliasOf = next.name;
          if (v.description) tok.description = v.description;
          return tok;
        }
        cur = read(next);
      }
      tok.value = cur.value;
      if (cur.description) tok.description = cur.description;
      return tok;
    };
    const out = [];
    const primed = /* @__PURE__ */ new Map();
    for (const v of ok) {
      if (!reaches(v, read, byId)) continue;
      const tok = resolveOne(v, true);
      const plain = resolveOne(v, false);
      if (tok.aliasOf !== void 0 && plain.aliasOf !== tok.aliasOf) primed.set(tok, v);
      out.push(tok);
    }
    const outOf = /* @__PURE__ */ new Map();
    for (const tk of out) {
      const w = winner.get(tk.name);
      if (w && w.id === tk.id) outOf.set(tk.name, tk);
    }
    for (const start of out) {
      const path = [];
      let cur = start;
      while (cur && cur.aliasOf !== void 0 && !path.includes(cur)) {
        path.push(cur);
        cur = outOf.get(cur.aliasOf);
      }
      if (!cur || !path.includes(cur)) continue;
      for (const tk of path.slice(path.indexOf(cur))) {
        const v = primed.get(tk);
        if (!v) continue;
        const plain = resolveOne(v, false);
        delete tk.aliasOf;
        delete tk.description;
        Object.assign(tk, plain);
        primed.delete(tk);
      }
    }
    return out;
  }
  function sameOutput(a, b) {
    if (a.aliasOf !== void 0 || b.aliasOf !== void 0) return a.aliasOf !== void 0 && a.aliasOf === b.aliasOf;
    return a.value === b.value && a.description === b.description && a.kind === b.kind;
  }
  function reaches(start, rd, byId) {
    const seen = /* @__PURE__ */ new Set([start.id]);
    let cur = rd(start);
    for (let reads = 1; cur.alias !== void 0; reads++) {
      if (reads >= ALIAS_READ_LIMIT) return false;
      const next = byId.get(cur.alias);
      if (!next || seen.has(next.id)) return false;
      seen.add(next.id);
      cur = rd(next);
    }
    return true;
  }
  function passing(vars, byId) {
    return vars.filter((v) => (v.tier === 1 || v.tier === 2) && reaches(v, (x) => x, byId));
  }
  function winnersOf(ok) {
    const winner = /* @__PURE__ */ new Map();
    for (const v of ok) {
      const prev = winner.get(v.name);
      if (!prev || prev.tier === 2 && v.tier === 1) winner.set(v.name, v);
    }
    return winner;
  }
  var byCode = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  function exportGlobalDupes(vars) {
    const byId = new Map(vars.map((v) => [v.id, v]));
    const first = /* @__PURE__ */ new Map();
    const dup = /* @__PURE__ */ new Set();
    for (const v of passing(vars, byId)) {
      if (v.tier !== 1) continue;
      const prev = first.get(v.name);
      if (!prev) first.set(v.name, v);
      else if (prev.id !== v.id) dup.add(v.name);
    }
    const names = [...dup].sort(byCode);
    const cols = new Set(names.map((n) => {
      var _a;
      return (_a = first.get(n)) == null ? void 0 : _a.collectionName;
    }));
    const only = cols.size === 1 ? [...cols][0] : void 0;
    return only ? { names, from: only } : { names };
  }
  function exportClashes(tokens, modes = []) {
    if (modes.length) return [...new Set([tokens, ...modes.map((m) => m.tokens)].flatMap((l) => exportClashes(l)))].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
    const globalOf = /* @__PURE__ */ new Map();
    for (const tk of tokens) if (tk.collection === "Global" && !globalOf.has(tk.name)) globalOf.set(tk.name, tk);
    const out = /* @__PURE__ */ new Set();
    for (const s of tokens) {
      if (s.collection !== "Semantic") continue;
      const g = globalOf.get(s.name);
      if (!g) continue;
      const mirror = s.aliasOf === s.name || (s.aliasOf !== void 0 && g.aliasOf !== void 0 ? s.aliasOf === g.aliasOf : s.aliasOf === void 0 && g.aliasOf === void 0 && s.value === g.value && s.description === g.description && s.kind === g.kind);
      if (!mirror) out.add(s.name);
    }
    return [...out].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  }
  var TYPO_PREFIX = "typography";
  var pct = (n) => `${Number(n.toFixed(2))}%`;
  var lineHeightStr = (lh) => lh.unit === "auto" ? "normal" : lh.unit === "percent" ? pct(lh.value) : `${Number(lh.value.toFixed(2))}px`;
  var letterSpacingStr = (ls) => ls.unit === "percent" ? pct(ls.value) : `${Number(ls.value.toFixed(2))}px`;
  var fontSizeStr = (px, opts) => opts.fontSizeUnit === "rem" ? `${Number((px / opts.base).toFixed(4))}rem` : `${px}px`;
  function textStylesToCss(styles, opts) {
    const lines = [];
    for (const st of styles) {
      const base = cssVar(`${TYPO_PREFIX}/${st.name}`);
      const { weight, italic } = splitWeightStyle(st.fontStyle);
      lines.push(`  ${base}-font-family: ${st.fontFamily};`);
      lines.push(`  ${base}-font-size: ${fontSizeStr(st.fontSize, opts)};`);
      lines.push(`  ${base}-font-weight: ${weight};`);
      if (italic) lines.push(`  ${base}-font-style: italic;`);
      lines.push(`  ${base}-line-height: ${lineHeightStr(st.lineHeight)};`);
      lines.push(`  ${base}-letter-spacing: ${letterSpacingStr(st.letterSpacing)};`);
    }
    return lines;
  }
  function textStylesToW3C(styles, opts, root) {
    var _a;
    for (const st of styles) {
      const segs = [TYPO_PREFIX, ...st.name.split("/").filter(Boolean)];
      let node = root;
      for (let i = 0; i < segs.length - 1; i++) {
        const key = segs[i];
        if (!node[key] || "$value" in node[key]) node[key] = (_a = node[key]) != null ? _a : {};
        node = node[key];
      }
      const { weight, italic } = splitWeightStyle(st.fontStyle);
      const value = {
        fontFamily: st.fontFamily,
        fontSize: fontSizeStr(st.fontSize, opts),
        fontWeight: weight,
        lineHeight: lineHeightStr(st.lineHeight),
        // DTCG는 number(배율)를 권하지만 원본 %를 그대로 보존(2026-10-28 결정)
        letterSpacing: letterSpacingStr(st.letterSpacing)
      };
      if (italic) value.fontStyle = "italic";
      node[segs[segs.length - 1]] = { $type: "typography", $value: value };
    }
  }
  function exportTokens(tokens, opts, textStyles = [], modes = []) {
    const list = dedupeByName(tokens);
    if (opts.format === "css") return toCss(list, opts, textStyles, modes);
    const root = JSON.parse(toW3C(list, opts));
    textStylesToW3C(textStyles, opts, root);
    return JSON.stringify(root, null, 2);
  }

  // src/lib/krdsType.ts
  var KRDS_STEPS = {
    display: [
      { step: "large", ref: 60, min: 52 },
      { step: "medium", ref: 44, min: -Infinity }
    ],
    heading: [
      { step: "xlarge", ref: 40, min: 36 },
      { step: "large", ref: 32, min: 28 },
      { step: "medium", ref: 24, min: 21.5 },
      { step: "small", ref: 19, min: 18 },
      // 16 미만은 heading이 되지 않는다(§3.2 — 2026-11-19 T4) — KRDS xxsmall(15)은 단계로 두지 않는다.
      { step: "xsmall", ref: 17, min: -Infinity }
    ],
    body: [
      { step: "large", ref: 19, min: 18 },
      { step: "medium", ref: 17, min: 16 },
      { step: "small", ref: 15, min: 14 },
      { step: "xsmall", ref: 13, min: -Infinity }
    ],
    label: [
      { step: "large", ref: 19, min: 18 },
      { step: "medium", ref: 17, min: 16 },
      { step: "small", ref: 15, min: 14 },
      { step: "xsmall", ref: 13, min: -Infinity }
    ]
  };
  function round1(n) {
    const r = Math.sign(n) * Math.round(Math.abs(n) * 10) / 10;
    return r === 0 ? 0 : r;
  }
  function krdsNum(n) {
    return String(round1(n)).replace("-", "m").replace(".", "_");
  }
  var WIDTH_OPTICAL_RE = /(?:semi|extra|ultra)?[\s_-]*(?:condensed|narrow|compressed|expanded|extended|wide|display|text|caption|micro)/gi;
  function weightOf(style) {
    const stripped = String(style != null ? style : "").replace(WIDTH_OPTICAL_RE, " ");
    const r = splitWeightStyle(stripped);
    const weight = Number.isFinite(r.weight) && r.weight >= 1 && r.weight <= 1e3 ? r.weight : 400;
    return { weight, italic: r.italic };
  }
  function lineHeightPct(i) {
    if (!i.lineHeight) return "auto";
    const p = i.lineHeightPercent ? i.lineHeightPercent : i.fontSize ? i.lineHeight / i.fontSize * 100 : 0;
    return Math.round(p);
  }
  var LABEL_TOKENS = /* @__PURE__ */ new Set(["label", "button", "btn", "chip", "input", "field"]);
  var HEADING_BY_SIZE = 21.5;
  var HEADING_BOLD_MIN = 16;
  function krdsCategory(input, path = "scan") {
    var _a, _b, _c;
    if (path === "scan") {
      const ui = (_a = input.uiCount) != null ? _a : 0;
      if (ui > 0 && ui * 2 >= ((_b = input.count) != null ? _b : 0)) return "label";
    } else {
      const tokens = String((_c = input.name) != null ? _c : "").split(/[/\-_\s]+/).map((t2) => t2.toLowerCase());
      if (tokens.some((t2) => LABEL_TOKENS.has(t2))) return "label";
    }
    const { weight } = weightOf(input.style);
    const size = round1(input.fontSize);
    if (weight >= 600 && size >= 42) return "display";
    if (size >= HEADING_BY_SIZE) return "heading";
    if (weight >= 600 && size >= HEADING_BOLD_MIN) return "heading";
    return "body";
  }
  function krdsStepDef(category, size) {
    var _a;
    const d = round1(size);
    const steps = KRDS_STEPS[category];
    return (_a = steps.find((s) => d >= s.min)) != null ? _a : steps[steps.length - 1];
  }
  var cmpStr2 = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  var slug = (s) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  var sigOf = (i) => `${i.fontSize}|${i.lineHeight}|${i.letterSpacing}|${i.family}|${i.style}`;
  function groupBy(items, key) {
    const m = /* @__PURE__ */ new Map();
    for (const it of items) {
      const k = key(it);
      const l = m.get(k);
      if (l) l.push(it);
      else m.set(k, [it]);
    }
    return [...m.values()];
  }
  var cmpLast = (a, b) => {
    var _a, _b, _c, _d;
    return b.count - a.count || cmpStr2(sigOf(a.input), sigOf(b.input)) || cmpStr2((_a = a.input.name) != null ? _a : "", (_b = b.input.name) != null ? _b : "") || cmpStr2((_c = a.input.id) != null ? _c : "", (_d = b.input.id) != null ? _d : "") || a.idx - b.idx;
  };
  var weightKey = (w) => `${w.weight}${w.italic ? "i" : ""}`;
  var lhTail = (lh) => lh === "auto" ? "-auto" : lh === 150 ? "" : `-${lh}`;
  function nameKrdsStyles(inputs, opts = {}) {
    var _a, _b, _c, _d;
    const path = (_a = opts.path) != null ? _a : "scan";
    const anchored = (_b = opts.anchored) != null ? _b : /* @__PURE__ */ new Map();
    const out = inputs.map((_, i) => {
      var _a2;
      return (_a2 = anchored.get(i)) != null ? _a2 : "";
    });
    const works = [];
    inputs.forEach((input, idx) => {
      if (anchored.has(idx)) return;
      const cat = krdsCategory(input, path);
      const size = round1(input.fontSize);
      const w = weightOf(input.style);
      works.push({
        idx,
        input,
        cat,
        step: krdsStepDef(cat, size),
        size,
        weight: w.weight,
        italic: w.italic,
        lh: lineHeightPct(input),
        ls: round1(input.letterSpacing || 0),
        count: input.count || 0,
        base: "",
        lastTail: "",
        name: ""
      });
    });
    const sizeKey = /* @__PURE__ */ new Map();
    for (const g of groupBy(works, (w) => `${w.cat}/${w.step.step}`)) {
      const sizes = groupBy(g, (w) => String(w.size));
      const ref = g[0].step.ref;
      const ranked = sizes.map((ws) => ({ size: ws[0].size, ws, used: ws.reduce((s, w) => s + w.count, 0) })).sort((a, b) => Math.abs(a.size - ref) - Math.abs(b.size - ref) || b.used - a.used || b.size - a.size);
      ranked.forEach((r, i) => {
        for (const w of r.ws) sizeKey.set(w, `${w.cat}/${w.step.step}${i === 0 ? "" : `-${krdsNum(w.size)}`}`);
      });
    }
    for (const g of groupBy(works, (w) => sizeKey.get(w))) {
      const heavy = g[0].cat === "display" || g[0].cat === "heading";
      const def = heavy ? 700 : 400;
      const inDefault = (w) => heavy ? w.weight >= 600 : w.weight <= 500;
      const weights = groupBy(g, weightKey).filter((ws) => inDefault(ws[0])).map((ws) => ({ w: ws[0], used: ws.reduce((s, x) => s + x.count, 0) })).sort(
        (a, b) => b.used - a.used || Math.abs(a.w.weight - def) - Math.abs(b.w.weight - def) || Number(a.w.italic) - Number(b.w.italic) || a.w.weight - b.w.weight
      );
      const winner = weights.length ? weightKey(weights[0].w) : null;
      for (const w of g) {
        const wt = weightKey(w) === winner ? "" : `-w${weightKey(w)}`;
        w.base = `${sizeKey.get(w)}${wt}${lhTail(w.lh)}`;
        w.name = w.base;
      }
    }
    for (const g of groupBy(works, (w) => w.name)) {
      const byLs = groupBy(g, (w) => String(w.ls));
      if (byLs.length < 2) continue;
      const ranked = byLs.map((ws) => ({ ls: ws[0].ls, ws, used: ws.reduce((s, w) => s + w.count, 0) })).sort(
        (a, b) => Number(b.ls === 0) - Number(a.ls === 0) || b.used - a.used || Math.abs(a.ls) - Math.abs(b.ls) || a.ls - b.ls
      );
      ranked.forEach((r, i) => {
        if (i === 0) return;
        for (const w of r.ws) {
          w.lastTail += `-ls${krdsNum(w.ls)}`;
          w.name = w.base + w.lastTail;
        }
      });
    }
    for (const g of groupBy(works, (w) => w.name)) {
      const byFam = groupBy(g, (w) => w.input.family);
      if (byFam.length < 2) continue;
      const ranked = byFam.map((ws) => ({ fam: ws[0].input.family, ws, used: ws.reduce((s, w) => s + w.count, 0) })).sort((a, b) => b.used - a.used || cmpStr2(a.fam, b.fam));
      ranked.forEach((r, i) => {
        if (i === 0) return;
        for (const w of r.ws) {
          w.lastTail += `-${slug(w.input.family) || "font"}`;
          w.name = w.base + w.lastTail;
        }
      });
    }
    for (const g of groupBy(works, (w) => w.name)) {
      if (g.length < 2) continue;
      [...g].sort(cmpLast).forEach((w, i) => {
        if (i > 0) w.name = `${w.name}-${i + 1}`;
      });
    }
    const taken = new Set((_c = opts.reserved) != null ? _c : []);
    for (const n of anchored.values()) taken.add(n);
    const forced = [];
    const claimed = /* @__PURE__ */ new Set();
    for (const w of works) {
      if (taken.has(w.name) || claimed.has(w.name)) forced.push(w);
      else claimed.add(w.name);
    }
    for (const n of claimed) taken.add(n);
    for (const w of [...forced].sort(cmpLast)) {
      const wt = `-w${weightKey(w)}`;
      const lh = w.lh === "auto" ? "-auto" : `-${w.lh}`;
      const name = `${w.cat}/${w.step.step}-${krdsNum(w.size)}${wt}${lh}${w.lastTail}`;
      let final = name;
      for (let k = 2; taken.has(final); k++) final = `${name}-${k}`;
      taken.add(final);
      w.name = final;
    }
    for (const w of works) out[w.idx] = w.name;
    if (opts.steps) {
      opts.steps.length = inputs.length;
      for (let i = 0; i < inputs.length; i++) opts.steps[i] = "";
      for (const w of works) opts.steps[w.idx] = (_d = sizeKey.get(w)) != null ? _d : "";
    }
    return out;
  }

  // src/lib/textStyles.ts
  function tsSig(s) {
    return `${s.fontSize}|${s.lineHeight}|${s.letterSpacing}|${s.family}|${s.style}`;
  }
  var sigKey = tsSig;
  function clusterTextStyles(samples) {
    var _a;
    const map = /* @__PURE__ */ new Map();
    const ids = /* @__PURE__ */ new Map();
    for (const s of samples) {
      const k = sigKey(s);
      const ex = map.get(k);
      if (ex) {
        ex.count++;
        if (s.uiRole === true) ex.uiCount++;
        if (!ex.lineHeightPercent && s.lineHeightPercent) ex.lineHeightPercent = s.lineHeightPercent;
        if (!ex.letterSpacingPercent && s.letterSpacingPercent) ex.letterSpacingPercent = s.letterSpacingPercent;
      } else {
        map.set(k, {
          fontSize: s.fontSize,
          lineHeight: s.lineHeight,
          lineHeightPercent: s.lineHeightPercent,
          letterSpacing: s.letterSpacing,
          letterSpacingPercent: (_a = s.letterSpacingPercent) != null ? _a : 0,
          family: s.family,
          style: s.style,
          count: 1,
          uiCount: s.uiRole === true ? 1 : 0,
          sample: s.layerName,
          nodeIds: [],
          styleIds: []
        });
        ids.set(k, /* @__PURE__ */ new Set());
      }
      if (s.id) map.get(k).nodeIds.push(s.id);
      if (s.styleId) ids.get(k).add(s.styleId);
    }
    for (const [k, c] of map) c.styleIds = [...ids.get(k)];
    return [...map.values()];
  }
  function isIntegerSize(v) {
    const r = Math.round(v * 100) / 100;
    return Math.abs(r - Math.round(r)) < 1e-6;
  }
  function anchorOfFor(existing) {
    const nameById = /* @__PURE__ */ new Map();
    const sigById = /* @__PURE__ */ new Map();
    const idBySig = /* @__PURE__ */ new Map();
    for (const e of existing != null ? existing : []) {
      nameById.set(e.id, e.name);
      const k = sigKey(e);
      sigById.set(e.id, k);
      idBySig.set(k, idBySig.has(k) ? null : e.id);
    }
    return (c) => {
      if (!existing) return void 0;
      if (c.styleIds.length === 1) {
        const id = c.styleIds[0];
        if (nameById.has(id) && sigById.get(id) === sigKey(c)) return id;
      }
      const sigId = idBySig.get(sigKey(c));
      return sigId && nameById.has(sigId) ? sigId : void 0;
    };
  }
  function splitDecimalClusters(clusters, existing) {
    const anchorOf = anchorOfFor(existing);
    const rest = [];
    const decimalRows = [];
    for (const c of clusters) (isIntegerSize(c.fontSize) || anchorOf(c) ? rest : decimalRows).push(c);
    decimalRows.sort((a, b) => b.fontSize - a.fontSize || b.count - a.count || b.lineHeight - a.lineHeight);
    return { rest, decimalRows };
  }
  function nameTextStyles(clusters, existing) {
    const nameById = /* @__PURE__ */ new Map();
    for (const e of existing != null ? existing : []) nameById.set(e.id, e.name);
    const existingById = new Map((existing != null ? existing : []).map((e) => [e.id, e]));
    const boundIdOf = anchorOfFor(existing);
    const ordered = [...clusters].sort(
      (a, b) => b.fontSize - a.fontSize || b.count - a.count || b.lineHeight - a.lineHeight
    );
    const boundIds = ordered.map(boundIdOf);
    const anchored = /* @__PURE__ */ new Map();
    boundIds.forEach((id, i) => {
      if (id) anchored.set(i, nameById.get(id));
    });
    const anchoredNames = new Set(anchored.values());
    const reserved = new Set((existing != null ? existing : []).map((e) => e.name).filter((n) => !anchoredNames.has(n)));
    const inputs = ordered.map((c) => {
      var _a;
      return {
        fontSize: c.fontSize,
        lineHeight: c.lineHeight,
        lineHeightPercent: c.lineHeightPercent,
        letterSpacing: c.letterSpacing,
        family: c.family,
        style: c.style,
        count: c.count,
        uiCount: (_a = c.uiCount) != null ? _a : 0
      };
    });
    const steps = [];
    const names = nameKrdsStyles(inputs, { reserved, anchored, path: "scan", steps });
    return ordered.map((c, i) => {
      var _a, _b, _c;
      const boundId = boundIds[i];
      const ex = boundId ? existingById.get(boundId) : void 0;
      const lineHeightPercent = c.lineHeightPercent || (ex == null ? void 0 : ex.lineHeightPercent) || 0;
      const letterSpacingPercent = ((_a = c.letterSpacingPercent) != null ? _a : 0) !== 0 ? c.letterSpacingPercent : (_b = ex == null ? void 0 : ex.letterSpacingPercent) != null ? _b : 0;
      return __spreadValues(__spreadProps(__spreadValues(__spreadValues(__spreadValues(__spreadValues({
        name: names[i],
        fontSize: c.fontSize,
        lineHeight: c.lineHeight,
        letterSpacing: c.letterSpacing,
        family: c.family,
        style: c.style
      }, lineHeightPercent ? { lineHeightPercent } : {}), letterSpacingPercent !== 0 ? { letterSpacingPercent } : {}), boundId ? { boundStyleId: boundId } : {}), !boundId && steps[i] ? { step: steps[i] } : {}), {
        count: c.count
      }), ((_c = c.nodeIds) == null ? void 0 : _c.length) ? { nodeIds: c.nodeIds } : {});
    });
  }
  var LABEL_RAMP_RE = /^(display|heading|body|label|h[1-6]|title|caption|overline)(\/\S+)?$/i;
  function isRowLabelNameLike(characters) {
    const t2 = characters.trim();
    if (!t2 || t2.includes("\n")) return false;
    if (t2.length <= 24) return true;
    return LABEL_RAMP_RE.test(t2);
  }
  function pairHorizontalRowLabel(row) {
    var _a, _b, _c, _d, _e, _f, _g;
    if (row.length < 2) return null;
    const byIndex = [...row].sort((a, b) => {
      var _a2, _b2;
      return ((_a2 = a.indexInParent) != null ? _a2 : 0) - ((_b2 = b.indexInParent) != null ? _b2 : 0);
    });
    const pool = isRowLabelNameLike((_a = byIndex[0].characters) != null ? _a : "") ? byIndex.slice(1) : byIndex;
    let specimen = pool[0];
    for (let i = 1; i < pool.length; i++) {
      const s = pool[i];
      const si = (_b = s.indexInParent) != null ? _b : 0;
      const pi = (_c = specimen.indexInParent) != null ? _c : 0;
      if (s.fontSize > specimen.fontSize || s.fontSize === specimen.fontSize && si > pi) {
        specimen = s;
      }
    }
    const specIdx = (_d = specimen.indexInParent) != null ? _d : 0;
    const left = row.filter((s) => {
      var _a2;
      return ((_a2 = s.indexInParent) != null ? _a2 : 0) < specIdx;
    });
    if (!left.length) return null;
    const cands = [];
    for (const s of left) {
      const nameLike = isRowLabelNameLike((_e = s.characters) != null ? _e : "");
      const smaller = s.fontSize < specimen.fontSize;
      if (!nameLike && !smaller) continue;
      const idx = (_f = s.indexInParent) != null ? _f : 0;
      let score = 1e3 - idx;
      if (nameLike) score += 100;
      if (smaller) score += 50;
      cands.push({ s, score });
    }
    if (!cands.length) return null;
    cands.sort((a, b) => b.score - a.score);
    if (cands.length > 1 && cands[0].score === cands[1].score) return null;
    const label = cands[0].s;
    const labelName = ((_g = label.characters) != null ? _g : "").trim();
    if (!labelName) return null;
    return { label, specimen, labelName };
  }
  function nameTextStylesWithRowLabels(samples, existing) {
    var _a;
    const excludeIds = /* @__PURE__ */ new Set();
    const labelBySig = /* @__PURE__ */ new Map();
    const byRow = /* @__PURE__ */ new Map();
    for (const s of samples) {
      if (!s.rowId || s.id == null || s.indexInParent == null) continue;
      const list = (_a = byRow.get(s.rowId)) != null ? _a : [];
      list.push(s);
      byRow.set(s.rowId, list);
    }
    for (const row of byRow.values()) {
      if (row.length < 2) continue;
      const pair = pairHorizontalRowLabel(row);
      if (!pair || !pair.specimen.id) continue;
      const k = sigKey(pair.specimen);
      if (!labelBySig.has(k)) labelBySig.set(k, pair.labelName);
      for (const s of row) {
        if (!s.id || s.id === pair.specimen.id) continue;
        excludeIds.add(s.id);
      }
    }
    const forCluster = samples.filter((s) => !s.id || !excludeIds.has(s.id));
    const { rest, decimalRows } = splitDecimalClusters(clusterTextStyles(forCluster), existing);
    const styles = nameTextStyles(rest, existing);
    const used = /* @__PURE__ */ new Set();
    const unique = (n) => {
      const base = n || "text";
      if (!used.has(base)) {
        used.add(base);
        return base;
      }
      let i = 2;
      while (used.has(`${base}-${i}`)) i++;
      const u = `${base}-${i}`;
      used.add(u);
      return u;
    };
    for (const e of existing != null ? existing : []) used.add(e.name);
    for (const s of styles) {
      if (s.boundStyleId) used.add(s.name);
    }
    let labeled = 0;
    let fallback = 0;
    for (const style of styles) {
      if (style.boundStyleId) continue;
      const label = labelBySig.get(sigKey(style));
      if (label) {
        style.name = unique(label);
        delete style.step;
        labeled++;
      }
    }
    for (const style of styles) {
      if (style.boundStyleId) continue;
      if (labelBySig.has(sigKey(style))) continue;
      style.name = unique(style.name);
      fallback++;
    }
    return { styles, decimalRows, labeled, fallback };
  }

  // src/lib/variables.ts
  function isManualVar(v) {
    try {
      const fn = v.getPluginData;
      return typeof fn === "function" && fn.call(v, MANUAL_KEY) === "1";
    } catch (e) {
      return false;
    }
  }
  var vkey = (collectionId, name) => `${collectionId}\0${name}`;
  async function buildVarIndex() {
    const idx = /* @__PURE__ */ new Map();
    for (const v of await figma.variables.getLocalVariablesAsync()) {
      idx.set(vkey(v.variableCollectionId, v.name), v);
    }
    return idx;
  }
  function upsertVariable(name, collection, type, idx) {
    const k = vkey(collection.id, name);
    const existing = idx.get(k);
    if (existing) return { variable: existing, created: false };
    const variable = figma.variables.createVariable(name, collection, type);
    idx.set(k, variable);
    return { variable, created: true };
  }
  var REUSE_MAP_KEY = "dsl.reuseMap";
  function literalOf(t2, type, base) {
    var _a;
    if (type === "COLOR") return colorKey(String(t2.value), t2.alpha);
    if (type === "STRING") return String(t2.value);
    return t2.unit && t2.unit !== "px" && typeof t2.value === "number" ? toPx(t2.value, t2.unit, { base, fontSize: (_a = t2.fontSize) != null ? _a : base }) : Number(t2.value);
  }
  function directValue(v, modeOf) {
    var _a;
    const raw = v.valuesByMode[(_a = modeOf.get(v.variableCollectionId)) != null ? _a : ""];
    if (raw == null || typeof raw === "object" && raw.type === "VARIABLE_ALIAS") return void 0;
    return raw;
  }
  function sameLiteral(raw, lit, type) {
    if (raw == null) return false;
    if (type === "COLOR") {
      if (typeof raw !== "object" || !("r" in raw)) return false;
      return colorKey(rgbToHex(raw), raw.a) === lit;
    }
    if (type === "STRING") return typeof raw === "string" && raw === lit;
    return typeof raw === "number" && Math.round(raw * 100) === Math.round(Number(lit) * 100);
  }
  async function pickReusable(tokens, base) {
    const out = /* @__PURE__ */ new Map();
    const withUses = tokens.filter((t2) => {
      var _a;
      return (_a = t2.uses) == null ? void 0 : _a.length;
    });
    if (!withUses.length) return out;
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const vars = await figma.variables.getLocalVariablesAsync();
    const tiers = collectionTiers(cols, vars);
    const owned = ownedIds(cols);
    const colIdx = new Map(cols.map((c, i) => [c.id, i]));
    const modeOf = new Map(cols.map((c) => [c.id, c.defaultModeId]));
    const userGlobals = vars.filter((v) => tiers.get(v.variableCollectionId) === 1 && !owned.has(v.variableCollectionId)).sort((a, b) => {
      var _a, _b;
      return ((_a = colIdx.get(a.variableCollectionId)) != null ? _a : 0) - ((_b = colIdx.get(b.variableCollectionId)) != null ? _b : 0) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    });
    for (const t2 of withUses) {
      const type = resolvedTypeForToken(t2);
      const lit = literalOf(t2, type, base);
      const allowed = scopesForType(scopesForSources(t2.sources), type);
      const hit = userGlobals.find((v) => {
        var _a;
        if (v.resolvedType !== type) return false;
        const sc = (_a = v.scopes) != null ? _a : [];
        if (!sc.includes("ALL_SCOPES") && !allowed.some((x) => sc.includes(x))) return false;
        return sameLiteral(directValue(v, modeOf), lit, type);
      });
      if (hit) out.set(t2.name, hit);
    }
    return out;
  }
  function readReuseMap() {
    var _a, _b;
    try {
      const raw = (_b = (_a = figma.root) == null ? void 0 : _a.getPluginData) == null ? void 0 : _b.call(_a, REUSE_MAP_KEY);
      const o = raw ? JSON.parse(raw) : {};
      return o && typeof o === "object" && !Array.isArray(o) ? o : {};
    } catch (e) {
      return {};
    }
  }
  function writeReuseMap(map) {
    var _a, _b;
    try {
      (_b = (_a = figma.root) == null ? void 0 : _a.setPluginData) == null ? void 0 : _b.call(_a, REUSE_MAP_KEY, JSON.stringify(map));
    } catch (e) {
    }
  }
  function fileGlobalsOf(col, vars) {
    const out = /* @__PURE__ */ new Map();
    if (!col) return out;
    const mode = col.defaultModeId;
    for (const v of vars) {
      if (v.variableCollectionId !== col.id) continue;
      const raw = v.valuesByMode[mode];
      if (raw && typeof raw === "object" && "r" in raw) {
        const hex = rgbToHex(raw);
        out.set(v.name, { key: colorKey(hex, raw.a), hex });
      } else if (typeof raw === "number") out.set(v.name, { key: valueKey(raw) });
      else if (typeof raw === "string") out.set(v.name, { key: raw });
      else out.set(v.name, { key: null, hex: null });
    }
    return out;
  }
  function resolveUsesNames(tokens, skip2, base, file) {
    var _a;
    const reqs = [];
    for (const t2 of tokens) {
      if (!((_a = t2.uses) == null ? void 0 : _a.length) || skip2.has(t2.name)) continue;
      const type = resolvedTypeForToken(t2);
      const lit = literalOf(t2, type, base);
      if (type === "COLOR") {
        const hex = String(t2.value).toLowerCase();
        reqs.push(__spreadValues({ name: t2.name, key: String(lit), hex }, t2.alpha != null && t2.alpha < 1 ? { alphaPct: alphaPct(t2.alpha) } : {}));
      } else reqs.push({ name: t2.name, key: typeof lit === "number" ? valueKey(lit) : String(lit) });
    }
    return resolveGlobalNames(reqs, file);
  }
  async function createTokens(tokens, base) {
    const reuse = await pickReusable(tokens, base);
    const summary = { created: 0, updated: 0, globals: 0, semantics: 0, conversions: pxConversions(tokens, base), globalOf: /* @__PURE__ */ new Map(), skippedManual: 0, skippedManualNames: /* @__PURE__ */ new Set(), finalName: /* @__PURE__ */ new Map() };
    const reuseMap = readReuseMap();
    const toCreate = tokens.filter((t2) => !reuse.has(t2.name));
    for (const [name, v] of reuse) {
      summary.globalOf.set(name, v.id);
      reuseMap[name] = v.id;
    }
    if (toCreate.length) {
      const globalCol = ensureOwnedCollection(await figma.variables.getLocalVariableCollectionsAsync(), "global");
      const gMode = globalCol.defaultModeId;
      const idx = await buildVarIndex();
      const named = resolveUsesNames(toCreate, reuse, base, fileGlobalsOf(globalCol, [...idx.values()]));
      const touched = /* @__PURE__ */ new Set();
      for (const t2 of toCreate) {
        const type = resolvedTypeForToken(t2);
        const nm = named.get(t2.name);
        if (nm) {
          summary.finalName.set(t2.name, nm.name);
          const g2 = upsertVariable(nm.name, globalCol, type, idx);
          const key2 = vkey(globalCol.id, nm.name);
          const scopes2 = scopesForType(scopesForSources(t2.sources), type);
          summary.globalOf.set(t2.name, g2.variable.id);
          delete reuseMap[t2.name];
          if (nm.reuse) {
            g2.variable.scopes = mergeScopes(g2.variable.scopes, scopes2, type);
            touched.add(key2);
            continue;
          }
          if (g2.created) {
            summary.created++;
            summary.globals++;
            setGlobalLiteral(g2.variable, globalCol, true, t2, type, base);
            g2.variable.hiddenFromPublishing = true;
            const desc2 = unitDescription(t2);
            if (desc2) g2.variable.description = desc2;
          }
          g2.variable.scopes = touched.has(key2) ? scopesForType([.../* @__PURE__ */ new Set([...g2.variable.scopes, ...scopes2])], type) : scopes2;
          touched.add(key2);
          continue;
        }
        const mine = idx.get(vkey(globalCol.id, t2.name));
        if (mine && isManualVar(mine)) {
          if (!summary.skippedManualNames.has(t2.name) && mine.resolvedType === type && sameLiteral(mine.valuesByMode[gMode], literalOf(t2, type, base), type)) {
            summary.globalOf.set(t2.name, mine.id);
            delete reuseMap[t2.name];
          } else if (!summary.skippedManualNames.has(t2.name)) {
            summary.globalOf.delete(t2.name);
            summary.skippedManualNames.add(t2.name);
            summary.skippedManual++;
          }
          continue;
        }
        const g = upsertVariable(t2.name, globalCol, type, idx);
        summary[g.created ? "created" : "updated"]++;
        summary.globals++;
        summary.globalOf.set(t2.name, g.variable.id);
        delete reuseMap[t2.name];
        setGlobalLiteral(g.variable, globalCol, g.created, t2, type, base);
        const scopes = scopesForType(scopesForSources(t2.sources), type);
        const key = vkey(globalCol.id, t2.name);
        const merged = touched.has(key) ? scopesForType([.../* @__PURE__ */ new Set([...g.variable.scopes, ...scopes])], type) : scopes;
        touched.add(key);
        g.variable.scopes = merged;
        g.variable.hiddenFromPublishing = true;
        const desc = unitDescription(t2);
        if (desc) g.variable.description = desc;
      }
    }
    writeReuseMap(reuseMap);
    return summary;
  }
  async function previewCreateTokens(tokens, base) {
    var _a, _b, _c;
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const gId = (_b = (_a = ownedCollection(cols, "global")) == null ? void 0 : _a.id) != null ? _b : "#G";
    const reuse = await pickReusable(tokens, base);
    const existing = /* @__PURE__ */ new Set();
    for (const v of await figma.variables.getLocalVariablesAsync()) existing.add(vkey(v.variableCollectionId, v.name));
    const states = /* @__PURE__ */ new Map();
    const summary = { created: 0, updated: 0, globals: 0, semantics: 0, conversions: pxConversions(tokens, base), globalOf: /* @__PURE__ */ new Map(), skippedManual: 0, skippedManualNames: /* @__PURE__ */ new Set(), tokenStates: states, finalName: /* @__PURE__ */ new Map() };
    const setState = (name, st) => {
      if (!states.has(name)) states.set(name, st);
    };
    const seen = /* @__PURE__ */ new Set();
    const tally = (colId, name, kind) => {
      const k = vkey(colId, name);
      summary[kind]++;
      if (seen.has(k)) {
        summary.updated++;
        return;
      }
      seen.add(k);
      summary[existing.has(k) ? "updated" : "created"]++;
    };
    const gCol = cols.find((c) => c.id === gId);
    const manualByName = /* @__PURE__ */ new Map();
    if (gCol) {
      for (const v of await figma.variables.getLocalVariablesAsync()) if (v.variableCollectionId === gId && isManualVar(v)) manualByName.set(v.name, v);
    }
    const allVars = await figma.variables.getLocalVariablesAsync();
    const named = resolveUsesNames(tokens, reuse, base, fileGlobalsOf(gCol, allVars));
    for (const t2 of tokens) {
      const r = reuse.get(t2.name);
      if (r) {
        summary.globalOf.set(t2.name, r.id);
        setState(t2.name, { state: "reuse", varName: r.name });
        continue;
      }
      const nm = named.get(t2.name);
      if (nm) {
        summary.finalName.set(t2.name, nm.name);
        if (nm.reuse) {
          const v = allVars.find((x) => x.variableCollectionId === gId && x.name === nm.name);
          if (v) summary.globalOf.set(t2.name, v.id);
          const type = resolvedTypeForToken(t2);
          const need = scopesForType(scopesForSources(t2.sources), type);
          const cur = (_c = v == null ? void 0 : v.scopes) != null ? _c : [];
          const scopeAdd = !!v && !cur.includes("ALL_SCOPES") && need.some((x) => !cur.includes(x) && !(cur.includes("ALL_FILLS") && ["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL"].includes(x)));
          setState(t2.name, scopeAdd ? { state: "reuse", varName: nm.name, scopeAdd: true } : { state: "reuse", varName: nm.name });
          continue;
        }
        setState(t2.name, nm.name !== t2.name ? { state: "new", varName: nm.name } : { state: "new" });
        tally(gId, nm.name, "globals");
        continue;
      }
      const mine = manualByName.get(t2.name);
      if (mine && gCol) {
        const type = resolvedTypeForToken(t2);
        if (!summary.skippedManualNames.has(t2.name) && mine.resolvedType === type && sameLiteral(mine.valuesByMode[gCol.defaultModeId], literalOf(t2, type, base), type)) {
          summary.globalOf.set(t2.name, mine.id);
          setState(t2.name, { state: "reuse", varName: mine.name });
        } else if (!summary.skippedManualNames.has(t2.name)) {
          summary.globalOf.delete(t2.name);
          summary.skippedManualNames.add(t2.name);
          summary.skippedManual++;
          states.set(t2.name, { state: "manual" });
        }
        continue;
      }
      setState(t2.name, { state: existing.has(vkey(gId, t2.name)) ? "update" : "new" });
      tally(gId, t2.name, "globals");
    }
    return summary;
  }
  async function createUsageRoles(tokens, preview = false, globalOf, rowsOut, finalName) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i;
    const withUses = tokens.filter((t2) => {
      var _a2;
      return (_a2 = t2.uses) == null ? void 0 : _a2.length;
    });
    if (!withUses.length) return 0;
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const vars = await figma.variables.getLocalVariablesAsync();
    const tiers = collectionTiers(cols, vars);
    const owned = ownedIds(cols);
    const byId = new Map(vars.map((v) => [v.id, v]));
    const modeOf = new Map(cols.map((c) => [c.id, c.defaultModeId]));
    const resolve = (v) => {
      var _a2;
      let cur = v;
      for (let i = 0; i < 12 && cur; i++) {
        const val = cur.valuesByMode[(_a2 = modeOf.get(cur.variableCollectionId)) != null ? _a2 : ""];
        if (val && typeof val === "object" && val.type === "VARIABLE_ALIAS") cur = byId.get(val.id);
        else return val;
      }
      return void 0;
    };
    const keyOfValue = (val) => {
      if (val == null) return "";
      if (typeof val === "object" && "r" in val) return colorKey(rgbToHex(val), val.a);
      return typeof val === "number" || typeof val === "string" ? valueKey(val) : "";
    };
    const colIdx = new Map(cols.map((c, i) => [c.id, i]));
    const rank = (id) => {
      var _a2;
      return (owned.has(id) ? 1e6 : 0) + ((_a2 = colIdx.get(id)) != null ? _a2 : 0);
    };
    const existing = /* @__PURE__ */ new Map();
    const semByName = /* @__PURE__ */ new Map();
    for (const v of vars.filter((x) => tiers.get(x.variableCollectionId) === 2).sort((a, b) => rank(a.variableCollectionId) - rank(b.variableCollectionId))) {
      const k = keyOfValue(resolve(v));
      const arr = existing.get(v.name);
      if (!arr) existing.set(v.name, k ? [k] : []);
      else if (k && !arr.includes(k)) arr.push(k);
      semByName.set(v.name, [...(_a = semByName.get(v.name)) != null ? _a : [], { key: k, v }]);
    }
    const globalNames = new Set(vars.filter((x) => tiers.get(x.variableCollectionId) === 1).map((x) => x.name));
    const canReuse = (name, value, base) => {
      var _a2;
      if (globalNames.has(name)) return false;
      const need = scopeForSemanticRole(base);
      return ((_a2 = semByName.get(name)) != null ? _a2 : []).some(({ key, v }) => {
        var _a3;
        if (key !== value) return false;
        if (!need) return true;
        const sc = (_a3 = v.scopes) != null ? _a3 : [];
        return sc.includes("ALL_SCOPES") || need.every((x) => sc.includes(x));
      });
    };
    const pluginGlobal = ownedCollection(cols, "global");
    const globalFor = (t2) => {
      var _a2;
      const id = globalOf == null ? void 0 : globalOf.get(t2.name);
      if (id) return byId.get(id);
      const nm = (_a2 = finalName == null ? void 0 : finalName.get(t2.name)) != null ? _a2 : t2.name;
      return pluginGlobal ? vars.find((v) => v.variableCollectionId === pluginGlobal.id && v.name === nm) : void 0;
    };
    const reqs = [];
    const colorUses = /* @__PURE__ */ new Map();
    for (const t2 of withUses) {
      for (const u of (_b = t2.uses) != null ? _b : []) {
        if (u.name.startsWith("color/")) {
          const arr = (_c = colorUses.get(u.name)) != null ? _c : [];
          arr.push({ token: t2, count: u.count, bg: u.bg });
          colorUses.set(u.name, arr);
        } else reqs.push({ base: u.name, value: valueKey(t2.value), count: u.count, token: t2 });
      }
    }
    for (const [use, list] of colorUses) {
      const defKey = (_d = existing.get(`${use}/default`)) == null ? void 0 : _d[0];
      const bases = colorRoleBases(
        list.map((x) => ({ hex: String(x.token.value), count: x.count, bg: x.bg, alpha: x.token.alpha })),
        defKey || void 0,
        // 색 값 키여도 colorRoleBases가 hex만 본다
        use.slice("color/".length)
      );
      const refHex = colorRoleRef(
        list.map((x) => ({ hex: String(x.token.value), count: x.count, bg: x.bg, alpha: x.token.alpha })),
        defKey || void 0,
        use.slice("color/".length)
        // 쓰임별 기준값(12.12 N-D4)
      );
      for (const x of list) {
        const hex = String(x.token.value).toLowerCase();
        reqs.push(__spreadValues({ base: `${use}/${(_e = bases.get(colorSlotKey(hex, x.bg, x.token.alpha))) != null ? _e : "default"}`, value: colorKey(hex, x.token.alpha), count: x.count, token: x.token }, refHex ? { refHex } : {}));
      }
    }
    const names = assignNames(reqs, existing, { canReuse });
    const toMake = /* @__PURE__ */ new Map();
    for (const r of reqs) {
      const name = (_f = names.get(`${r.base}\0${r.value}`)) != null ? _f : r.base;
      if (existing.has(name) || toMake.has(name)) continue;
      toMake.set(name, r.token);
    }
    if (preview) {
      if (rowsOut) {
        for (const [name, t2] of toMake) {
          const id = globalOf == null ? void 0 : globalOf.get(t2.name);
          rowsOut.push({ name, global: id && ((_g = byId.get(id)) == null ? void 0 : _g.name) || (finalName == null ? void 0 : finalName.get(t2.name)) || t2.name, token: t2.name });
        }
      }
      return toMake.size;
    }
    if (!toMake.size) return 0;
    const col = ensureOwnedCollection(cols, "semantic");
    let made = 0;
    for (const [name, t2] of toMake) {
      const g = globalFor(t2);
      if (!g) continue;
      const v = figma.variables.createVariable(name, col, g.resolvedType);
      for (const m of col.modes) v.setValueForMode(m.modeId, figma.variables.createVariableAlias(g));
      v.scopes = scopesForType((_h = scopeForSemanticRole(name)) != null ? _h : g.scopes, g.resolvedType);
      try {
        (_i = v.setPluginData) == null ? void 0 : _i.call(v, AUTO_ROLE_KEY, "1");
      } catch (e) {
      }
      made++;
    }
    return made;
  }
  function setGlobalLiteral(v, col, created, t2, type, base) {
    const modeIds = created ? col.modes.map((m) => m.modeId) : [col.defaultModeId];
    for (const modeId of modeIds) setGlobalLiteralFor(v, modeId, t2, type, base);
  }
  function setGlobalLiteralFor(v, modeId, t2, type, base) {
    var _a, _b;
    if (type === "COLOR") {
      const { r, g, b } = hexToRgb(String(t2.value));
      v.setValueForMode(modeId, { r, g, b, a: (_a = t2.alpha) != null ? _a : 1 });
    } else if (type === "STRING") {
      v.setValueForMode(modeId, String(t2.value));
    } else {
      const num = t2.unit && t2.unit !== "px" && typeof t2.value === "number" ? toPx(t2.value, t2.unit, { base, fontSize: (_b = t2.fontSize) != null ? _b : base }) : Number(t2.value);
      v.setValueForMode(modeId, num);
    }
  }
  async function prunePaletteColors(keep, opts = {}) {
    var _a;
    const keepSet = new Set(keep);
    const keepFamilies = new Set(keep.map(paletteFamilyOf).filter((f) => f !== null));
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const palIds = opts.globalOnly ? new Set([(_a = ownedCollection(cols, "global")) == null ? void 0 : _a.id].filter((x) => !!x)) : ownedIds(cols);
    let removed = 0;
    for (const v of await figma.variables.getLocalVariablesAsync()) {
      if (!palIds.has(v.variableCollectionId)) continue;
      if (isManualVar(v)) continue;
      const fam = paletteFamilyOf(v.name);
      if (fam && keepFamilies.has(fam) && !keepSet.has(v.name)) {
        v.remove();
        removed++;
      }
    }
    return removed;
  }
  async function createSemanticAliases(map) {
    var _a, _b, _c, _d;
    const summary = { created: 0, updated: 0, aliased: 0, missing: [], skippedManual: 0 };
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const vars = await figma.variables.getLocalVariablesAsync();
    const tiers = collectionTiers(cols, vars);
    const modeOf = new Map(cols.map((c) => [c.id, c.defaultModeId]));
    const pluginGlobalId = (_a = ownedCollection(cols, "global")) == null ? void 0 : _a.id;
    const colIdx = new Map(cols.map((c, i) => [c.id, i]));
    const globals = vars.filter((v) => tiers.get(v.variableCollectionId) === 1 && directValue(v, modeOf) !== void 0).sort((a, b) => {
      var _a2, _b2;
      return Number(b.variableCollectionId === pluginGlobalId) - Number(a.variableCollectionId === pluginGlobalId) || ((_a2 = colIdx.get(a.variableCollectionId)) != null ? _a2 : 0) - ((_b2 = colIdx.get(b.variableCollectionId)) != null ? _b2 : 0);
    });
    const byName3 = /* @__PURE__ */ new Map();
    for (const v of globals) if (!byName3.has(v.name)) byName3.set(v.name, v);
    const okIds = new Map(globals.map((v) => [v.id, v]));
    const reuseMap = readReuseMap();
    let semanticCol;
    let idx;
    for (const [semName, globalName] of Object.entries(map)) {
      const g = (_c = byName3.get(globalName)) != null ? _c : okIds.get((_b = reuseMap[globalName]) != null ? _b : "");
      if (!g) {
        summary.missing.push(globalName);
        continue;
      }
      if (!semanticCol || !idx) {
        semanticCol = ensureOwnedCollection(cols, "semantic");
        idx = await buildVarIndex();
      }
      const sMode = semanticCol.defaultModeId;
      const mine = idx.get(vkey(semanticCol.id, semName));
      if (mine && isManualVar(mine)) {
        summary.skippedManual++;
        continue;
      }
      const u = upsertVariable(semName, semanticCol, g.resolvedType, idx);
      u.variable.setValueForMode(sMode, figma.variables.createVariableAlias(g));
      u.variable.scopes = scopesForType((_d = scopeForSemanticRole(semName)) != null ? _d : g.scopes, g.resolvedType);
      summary[u.created ? "created" : "updated"]++;
      summary.aliased++;
    }
    return summary;
  }
  var roundN = (n, p = 2) => Math.round(n * 10 ** p) / 10 ** p;
  function walkText(node, out, instanceOut) {
    if (node.visible === false) return;
    if (node.type === "TEXT") out.push(node);
    else if (instanceOut && node.type === "INSTANCE") walkText(node, instanceOut);
    else if ("children" in node) for (const c of node.children) walkText(c, out, instanceOut);
  }
  function measureLineHeight(fontSize, lh) {
    if (lh === figma.mixed || !lh || lh.unit === "AUTO") return { px: 0, pct: 0 };
    const unit = String(lh.unit).toUpperCase();
    if (unit === "PERCENT") {
      return { px: roundN(fontSize * lh.value / 100), pct: roundN(lh.value) };
    }
    const v = roundN(lh.value);
    if (unit === "PIXELS" && fontSize > 0) {
      const pxRatio = v / fontSize;
      const plausibleAsPx = pxRatio >= 0.8 && pxRatio <= 3;
      const plausibleAsPct = v >= 100 && v <= 300;
      if (!plausibleAsPx && plausibleAsPct) return { px: roundN(fontSize * v / 100), pct: v };
    }
    return { px: v, pct: 0 };
  }
  function measureLetterSpacing(fontSize, ls) {
    if (ls === figma.mixed || !ls) return { px: 0, pct: 0 };
    const unit = String(ls.unit).toUpperCase();
    if (unit === "PERCENT") {
      return { px: roundN(fontSize * ls.value / 100), pct: roundN(ls.value) };
    }
    const px = roundN(ls.value);
    if (unit === "PIXELS" && fontSize > 0 && px !== 0) {
      const authoredPx = Math.abs(px * 2 - Math.round(px * 2)) < 1e-9;
      const pct2 = roundN(px / fontSize * 100);
      const back = roundN(fontSize * pct2 / 100);
      const common = pct2 === Math.trunc(pct2) && Math.abs(pct2) >= 1 && Math.abs(pct2) <= 10;
      if (!authoredPx && common && Math.abs(back - px) <= 0.011) return { px: back, pct: pct2 };
    }
    return { px, pct: 0 };
  }
  function readNodeTypography(t2) {
    if (t2.fontSize === figma.mixed || t2.fontName === figma.mixed) return null;
    return {
      fontSize: t2.fontSize,
      family: t2.fontName.family,
      style: t2.fontName.style,
      lineHeight: t2.lineHeight,
      letterSpacing: t2.letterSpacing
    };
  }
  async function percentFromVariableDescription(varId, cache2) {
    var _a;
    let id = varId;
    const seen = /* @__PURE__ */ new Set();
    while (id && !seen.has(id)) {
      seen.add(id);
      let v = cache2.get(id);
      if (v === void 0) {
        v = await figma.variables.getVariableByIdAsync(id);
        cache2.set(id, v);
      }
      if (!v) return void 0;
      const desc = ((_a = v.description) != null ? _a : "").trim();
      const m = /^(-?\d+(?:\.\d+)?)%$/.exec(desc);
      if (m) return roundN(Number(m[1]));
      const modeIds = Object.keys(v.valuesByMode);
      const raw = modeIds.length ? v.valuesByMode[modeIds[0]] : void 0;
      if (raw && typeof raw === "object" && raw.type === "VARIABLE_ALIAS") {
        id = raw.id;
        continue;
      }
      return void 0;
    }
    return void 0;
  }
  async function percentFromNodeBinding(t2, field, cache2) {
    var _a;
    const entry = (_a = t2.boundVariables) == null ? void 0 : _a[field];
    if (!entry) return void 0;
    const alias = Array.isArray(entry) ? entry[0] : entry;
    if (!(alias == null ? void 0 : alias.id)) return void 0;
    return percentFromVariableDescription(alias.id, cache2);
  }
  var UI_ROLES = /* @__PURE__ */ new Set(["button", "chip", "input", "field"]);
  function inUiRole(node, cache2) {
    let cur = node.parent;
    while (cur && cur.type !== "PAGE" && cur.type !== "DOCUMENT") {
      let role;
      if (cache2.has(cur)) role = cache2.get(cur);
      else {
        role = dsRoleOwner(cur);
        cache2.set(cur, role);
      }
      if (role) return UI_ROLES.has(role);
      cur = cur.parent;
    }
    return false;
  }
  async function scanTextStyles(nodes) {
    const texts = [];
    for (const n of nodes) walkText(n, texts);
    const samples = [];
    const warnings = /* @__PURE__ */ new Set();
    const styleCache = /* @__PURE__ */ new Map();
    const varCache = /* @__PURE__ */ new Map();
    const styleOf = async (id) => {
      var _a;
      if (styleCache.has(id)) return (_a = styleCache.get(id)) != null ? _a : null;
      const raw = await figma.getStyleByIdAsync(id);
      const st = raw && raw.type === "TEXT" ? raw : null;
      styleCache.set(id, st);
      return st;
    };
    const ownerCache = /* @__PURE__ */ new Map();
    for (const node of texts) {
      const typo = readNodeTypography(node);
      if (!typo) {
        warnings.add(t("textStyle.warnMixed"));
        continue;
      }
      const fontSize = roundN(typo.fontSize);
      const { family, style } = { family: typo.family, style: typo.style };
      const lhMeas = measureLineHeight(fontSize, typo.lineHeight);
      let lineHeight = lhMeas.px;
      let lineHeightPercent = lhMeas.pct;
      const lsMeas = measureLetterSpacing(fontSize, typo.letterSpacing);
      let letterSpacing = lsMeas.px;
      let letterSpacingPercent = lsMeas.pct;
      if (lineHeightPercent === 0) {
        const fromVar = await percentFromNodeBinding(node, "lineHeight", varCache);
        if (fromVar !== void 0 && fromVar > 0) {
          lineHeightPercent = fromVar;
          lineHeight = roundN(fontSize * fromVar / 100);
        }
      }
      if (letterSpacingPercent === 0) {
        const fromVar = await percentFromNodeBinding(node, "letterSpacing", varCache);
        if (fromVar !== void 0 && fromVar !== 0) {
          letterSpacingPercent = fromVar;
          letterSpacing = roundN(fontSize * fromVar / 100);
        }
      }
      const sid = node.textStyleId;
      const styleId = sid === figma.mixed ? "" : sid;
      if (styleId) {
        const st = await styleOf(styleId);
        if (st) {
          const stLh = measureLineHeight(fontSize, st.lineHeight);
          const stLs = measureLetterSpacing(fontSize, st.letterSpacing);
          if (lineHeightPercent === 0 && stLh.pct > 0) {
            lineHeightPercent = stLh.pct;
            lineHeight = stLh.px;
          }
          if (letterSpacingPercent === 0 && stLs.pct !== 0) {
            letterSpacingPercent = stLs.pct;
            letterSpacing = stLs.px;
          }
        }
      }
      let characters = "";
      try {
        characters = node.characters;
      } catch (e) {
        characters = "";
      }
      let rowId;
      let indexInParent;
      const parent = node.parent;
      if (parent && "layoutMode" in parent && parent.layoutMode === "HORIZONTAL" && "children" in parent) {
        rowId = parent.id;
        indexInParent = parent.children.indexOf(node);
        if (indexInParent < 0) indexInParent = void 0;
      }
      samples.push({
        fontSize,
        lineHeight,
        lineHeightPercent,
        letterSpacing,
        letterSpacingPercent,
        family,
        style,
        layerName: node.name,
        styleId,
        characters,
        id: node.id,
        rowId,
        indexInParent,
        uiRole: inUiRole(node, ownerCache)
      });
    }
    return { samples, warnings: [...warnings] };
  }
  function lhPxOf(fontSize, lh) {
    if (lh === figma.mixed || lh.unit === "AUTO") return 0;
    return lh.unit === "PERCENT" ? roundN(fontSize * lh.value / 100) : roundN(lh.value);
  }
  function lhPctOf(lh) {
    if (lh === figma.mixed || lh.unit !== "PERCENT") return 0;
    return roundN(lh.value);
  }
  function lsPxOf(fontSize, ls) {
    if (ls === figma.mixed) return 0;
    return ls.unit === "PERCENT" ? roundN(fontSize * ls.value / 100) : roundN(ls.value);
  }
  function lsPctOf(ls) {
    if (ls === figma.mixed || ls.unit !== "PERCENT") return 0;
    return roundN(ls.value);
  }
  async function scanExistingTextStyles() {
    return (await figma.getLocalTextStylesAsync()).map(existingOf);
  }
  function existingOf(s) {
    const fontSize = roundN(s.fontSize);
    const lineHeightPercent = lhPctOf(s.lineHeight);
    const letterSpacingPercent = lsPctOf(s.letterSpacing);
    return __spreadValues(__spreadValues({
      id: s.id,
      name: s.name,
      fontSize,
      // 등록된 스타일은 사실이라 원값으로 잰다(applyExistingTextStyles의 인덱스와 같은 이유).
      // 스캔이 %로 등록해 둔 스타일은 lhPxOf가 %→px로 환산하므로 클러스터 측정값과 그대로 만난다.
      lineHeight: lhPxOf(fontSize, s.lineHeight),
      letterSpacing: lsPxOf(fontSize, s.letterSpacing),
      family: s.fontName.family,
      style: s.fontName.style
    }, lineHeightPercent ? { lineHeightPercent } : {}), letterSpacingPercent !== 0 ? { letterSpacingPercent } : {});
  }
  async function globalFamilyVars() {
    var _a;
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const vars = await figma.variables.getLocalVariablesAsync();
    const tiers = collectionTiers(cols, vars);
    const pluginGlobalId = (_a = ownedCollection(cols, "global")) == null ? void 0 : _a.id;
    const modeOf = new Map(cols.map((c) => [c.id, c.defaultModeId]));
    const list = vars.filter((v) => v.resolvedType === "STRING" && tiers.get(v.variableCollectionId) === 1).sort((a, b) => {
      const pa = a.variableCollectionId === pluginGlobalId ? 0 : 1;
      const pb = b.variableCollectionId === pluginGlobalId ? 0 : 1;
      return pa - pb || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    });
    return (family) => list.find((v) => directValue(v, modeOf) === family);
  }
  function textStepOf(v) {
    const fn = v == null ? void 0 : v.getPluginData;
    try {
      return typeof fn === "function" ? fn.call(v, TEXT_STEP_KEY) || "" : "";
    } catch (e) {
      return "";
    }
  }
  async function styleBoundVar(st, field) {
    var _a;
    const a = (_a = st.boundVariables) == null ? void 0 : _a[field];
    if (!a || typeof a !== "object" || !a.id) return null;
    try {
      return await figma.variables.getVariableByIdAsync(a.id);
    } catch (e) {
      return null;
    }
  }
  async function readSemanticIndex() {
    var _a;
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const vars = await figma.variables.getLocalVariablesAsync();
    const tiers = collectionTiers(cols, vars);
    const owned = ownedIds(cols);
    const varById = new Map(vars.map((v) => [v.id, v]));
    const modeOf = new Map(cols.map((c) => [c.id, c.defaultModeId]));
    const resolve = (v) => {
      var _a2;
      let cur = v;
      for (let i = 0; i < 12 && cur; i++) {
        const val = cur.valuesByMode[(_a2 = modeOf.get(cur.variableCollectionId)) != null ? _a2 : ""];
        if (val && typeof val === "object" && val.type === "VARIABLE_ALIAS") cur = varById.get(val.id);
        else return val;
      }
      return void 0;
    };
    const colIdx = new Map(cols.map((c, i) => [c.id, i]));
    const rank = (id) => {
      var _a2;
      return (owned.has(id) ? 1e6 : 0) + ((_a2 = colIdx.get(id)) != null ? _a2 : 0);
    };
    const existing = /* @__PURE__ */ new Map();
    const byName3 = /* @__PURE__ */ new Map();
    for (const v of vars.filter((x) => tiers.get(x.variableCollectionId) === 2).sort((a, b) => rank(a.variableCollectionId) - rank(b.variableCollectionId))) {
      const val = resolve(v);
      const k = typeof val === "number" || typeof val === "string" ? valueKey(val) : "";
      const arr = existing.get(v.name);
      if (!arr) existing.set(v.name, k ? [k] : []);
      else if (k && !arr.includes(k)) arr.push(k);
      byName3.set(v.name, [...(_a = byName3.get(v.name)) != null ? _a : [], { key: k, v }]);
    }
    const globalNames = new Set(vars.filter((x) => tiers.get(x.variableCollectionId) === 1).map((x) => x.name));
    return { cols, existing, byName: byName3, globalNames };
  }
  async function placeTextRoleVars(reqs, globalOf) {
    if (!reqs.length) return [];
    const idx = await readSemanticIndex();
    const stepBases = new Set(reqs.filter((r) => r.step).map((r) => r.base));
    const canReuse = (name, value, base) => {
      var _a;
      if (idx.globalNames.has(name)) return false;
      const step = stepBases.has(base);
      if (!step && name !== base) return false;
      const need = scopeForSemanticRole(base);
      return ((_a = idx.byName.get(name)) != null ? _a : []).some(({ key, v }) => {
        var _a2;
        return key === value && (!step || !!textStepOf(v)) && (!need || ((_a2 = v.scopes) != null ? _a2 : []).includes("ALL_SCOPES") || need.every((x) => {
          var _a3;
          return ((_a3 = v.scopes) != null ? _a3 : []).includes(x);
        }));
      });
    };
    const names = assignNames(reqs.map((r) => ({ base: r.base, value: valueKey(r.value), count: 1 })), idx.existing, { canReuse });
    let col;
    const made = /* @__PURE__ */ new Map();
    return reqs.map((r) => {
      var _a, _b, _c, _d, _e, _f;
      const value = valueKey(r.value);
      const name = (_a = names.get(`${r.base}\0${value}`)) != null ? _a : r.base;
      if (idx.existing.has(name)) {
        const hit = ((_b = idx.byName.get(name)) != null ? _b : []).find(({ key, v: v2 }) => key === value && (!r.step || !!textStepOf(v2)));
        return { name, v: (_c = hit == null ? void 0 : hit.v) != null ? _c : null };
      }
      if (made.has(name)) return { name, v: (_d = made.get(name)) != null ? _d : null };
      const g = globalOf(r.token);
      if (!g) {
        made.set(name, null);
        return { name, v: null };
      }
      col != null ? col : col = ensureOwnedCollection(idx.cols, "semantic");
      const v = figma.variables.createVariable(name, col, g.resolvedType);
      for (const m of col.modes) v.setValueForMode(m.modeId, figma.variables.createVariableAlias(g));
      v.scopes = scopesForType((_e = scopeForSemanticRole(name)) != null ? _e : g.scopes, g.resolvedType);
      if (r.step) {
        try {
          (_f = v.setPluginData) == null ? void 0 : _f.call(v, TEXT_STEP_KEY, r.step);
        } catch (e) {
        }
      }
      made.set(name, v);
      return { name, v };
    });
  }
  async function createSemanticTextStyles(allSpecs) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o;
    const res = { created: 0, updated: 0, bound: 0, applied: 0, missing: [], notes: [], styleIds: [] };
    if (!allSpecs.length) return res;
    const existing = await figma.getLocalTextStylesAsync();
    const styleById = new Map(existing.map((s) => [s.id, s]));
    const styleByName = new Map(existing.map((s) => [s.name, s]));
    const anchoredStyle = (spec) => spec.boundStyleId ? styleById.get(spec.boundStyleId) : void 0;
    const specs = [];
    for (const spec of allSpecs) {
      if (!anchoredStyle(spec) && !isIntegerSize(spec.fontSize)) {
        res.missing.push(t("textStyle.missDecimal", { name: spec.name, size: roundN(spec.fontSize) }));
        continue;
      }
      specs.push(spec);
    }
    const decimalAnchor = (st) => !!st && !isIntegerSize(roundN(st.fontSize));
    const renameBlocked = /* @__PURE__ */ new Set();
    const roleRenames = [];
    const roleSpecs = [];
    for (const spec of specs) {
      const st = anchoredStyle(spec);
      if (!st || st.name === spec.name) continue;
      const occupant = styleByName.get(spec.name);
      if (occupant && occupant.id !== st.id) {
        renameBlocked.add(spec.boundStyleId);
        res.missing.push(t("textStyle.missRename", { from: st.name, to: spec.name }));
        continue;
      }
      const fsBound = await styleBoundVar(st, "fontSize");
      if (!fsBound || textStepOf(fsBound) || fsBound.name !== `font-size/${st.name}`) continue;
      roleRenames.push({ from: st.name, to: spec.name });
      roleSpecs.push(spec);
    }
    const roleMoved = roleRenames.length ? (await renameTextRoleVars(roleRenames)).moved : [];
    const tokens = [];
    const seen = /* @__PURE__ */ new Set();
    const pushTok = (t2) => {
      if (!seen.has(t2.name)) {
        seen.add(t2.name);
        tokens.push(t2);
      }
    };
    const lhTokens = /* @__PURE__ */ new Map();
    const pushLineHeightTok = (name, px, pct2, fontSize) => {
      const prev = lhTokens.get(name);
      if (!prev) {
        const t2 = pct2 > 0 ? { name, category: "lineHeight", value: pct2, unit: "percent", fontSize, sources: ["lineHeight"] } : { name, category: "lineHeight", value: px, unit: "px", sources: ["lineHeight"] };
        lhTokens.set(name, t2);
        pushTok(t2);
        return;
      }
      const prevPct = prev.unit === "percent" ? Number(prev.value) : 0;
      if (prevPct === pct2 && (pct2 === 0 || prev.fontSize === fontSize)) return;
      prev.value = px;
      prev.unit = "px";
      prev.fontSize = void 0;
      res.notes.push(t("textStyle.noteLhPx", { name }));
    };
    const lsTokens = /* @__PURE__ */ new Map();
    const pushLetterSpacingTok = (name, px, pct2, fontSize) => {
      const prev = lsTokens.get(name);
      if (!prev) {
        const t2 = pct2 !== 0 ? { name, category: "letterSpacing", value: pct2, unit: "percent", fontSize, sources: ["letterSpacing"] } : { name, category: "letterSpacing", value: px, unit: "px", sources: ["letterSpacing"] };
        lsTokens.set(name, t2);
        pushTok(t2);
        return;
      }
      const prevPct = prev.unit === "percent" ? Number(prev.value) : 0;
      if (prevPct === pct2 && (pct2 === 0 || prev.fontSize === fontSize)) return;
      prev.value = px;
      prev.unit = "px";
      prev.fontSize = void 0;
      res.notes.push(t("textStyle.noteLsPx", { name }));
    };
    const roleReqs = [];
    const pushAlias = (spec, role, step, fontSize, lineHeight, letterSpacing, lineHeightPercent = 0, letterSpacingPercent = 0) => {
      const fsTok = numberTokenName("font-size", fontSize);
      pushTok({ name: fsTok, category: "fontSize", value: fontSize, sources: ["fontSize"] });
      roleReqs.push({ spec, cat: "font-size", req: __spreadValues({ base: `font-size/${role}`, value: fontSize, token: fsTok }, step ? { step } : {}) });
      if (lineHeight > 0 && lineHeightPercent === 0 && Number.isInteger(lineHeight)) {
        const lhName = numberTokenName("line-height", lineHeight);
        pushLineHeightTok(lhName, lineHeight, 0, fontSize);
        roleReqs.push({ spec, cat: "line-height", req: __spreadValues({ base: `line-height/${role}`, value: lineHeight, token: lhName }, step ? { step } : {}) });
      }
      if (letterSpacing !== 0 && letterSpacingPercent === 0 && Number.isInteger(letterSpacing)) {
        const lsName = numberTokenName("letter-spacing", letterSpacing);
        pushLetterSpacingTok(lsName, letterSpacing, 0, fontSize);
        roleReqs.push({ spec, cat: "letter-spacing", req: __spreadValues({ base: `letter-spacing/${role}`, value: letterSpacing, token: lsName }, step ? { step } : {}) });
      }
    };
    const finalOf = /* @__PURE__ */ new Map();
    for (const s of specs) {
      if (anchoredStyle(s)) continue;
      pushAlias(s, (_a = s.step) != null ? _a : s.name, s.step, s.fontSize, s.lineHeight, s.letterSpacing, (_b = s.lineHeightPercent) != null ? _b : 0, (_c = s.letterSpacingPercent) != null ? _c : 0);
    }
    {
      const cols0 = await figma.variables.getLocalVariableCollectionsAsync();
      const semId0 = (_d = ownedCollection(cols0, "semantic")) == null ? void 0 : _d.id;
      const semNames = /* @__PURE__ */ new Set();
      if (semId0) {
        for (const v of await figma.variables.getLocalVariablesAsync())
          if (v.variableCollectionId === semId0) semNames.add(v.name);
      }
      for (const s of specs) {
        const st = anchoredStyle(s);
        if (!st) continue;
        const fsBound = await styleBoundVar(st, "fontSize");
        if (fsBound && textStepOf(fsBound)) {
          const lhBound = await styleBoundVar(st, "lineHeight");
          const lsBound = await styleBoundVar(st, "letterSpacing");
          finalOf.set(s, __spreadValues(__spreadValues({ "font-size": fsBound.name }, lhBound ? { "line-height": lhBound.name } : {}), lsBound ? { "letter-spacing": lsBound.name } : {}));
          continue;
        }
        if (semNames.has(`font-size/${s.name}`)) continue;
        if (decimalAnchor(st)) continue;
        const fontSize = roundN(st.fontSize);
        pushAlias(s, s.name, void 0, fontSize, lhPxOf(fontSize, st.lineHeight), lsPxOf(fontSize, st.letterSpacing), lhPctOf(st.lineHeight), lsPctOf(st.letterSpacing));
      }
    }
    const made = tokens.length ? await createTokens(tokens, 16) : null;
    const varOfName = /* @__PURE__ */ new Map();
    if (roleReqs.length) {
      const allVars = new Map((await figma.variables.getLocalVariablesAsync()).map((v) => [v.id, v]));
      const placed = await placeTextRoleVars(
        roleReqs.map((r) => r.req),
        (token) => {
          const id = made == null ? void 0 : made.globalOf.get(token);
          return id ? allVars.get(id) : void 0;
        }
      );
      roleReqs.forEach((r, i) => {
        var _a2;
        const p = placed[i];
        finalOf.set(r.spec, __spreadProps(__spreadValues({}, (_a2 = finalOf.get(r.spec)) != null ? _a2 : {}), { [r.cat]: p.name }));
        if (p.v) varOfName.set(p.name, p.v);
      });
    }
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const semId = (_e = ownedCollection(cols, "semantic")) == null ? void 0 : _e.id;
    const semByName = /* @__PURE__ */ new Map();
    if (semId) {
      for (const v of await figma.variables.getLocalVariablesAsync())
        if (v.variableCollectionId === semId) semByName.set(v.name, v);
    }
    const familyVarFor = await globalFamilyVars();
    const roleVar = (name) => {
      var _a2;
      return (_a2 = varOfName.get(name)) != null ? _a2 : semByName.get(name);
    };
    for (const spec of specs) {
      const anchored = anchoredStyle(spec);
      if (anchored && spec.boundStyleId && renameBlocked.has(spec.boundStyleId)) {
        continue;
      }
      let style = anchored != null ? anchored : styleByName.get(spec.name);
      const created = !style;
      const isRename = !!anchored;
      const setName = (st) => {
        if (st.name === spec.name) return;
        styleByName.delete(st.name);
        st.name = spec.name;
      };
      try {
        let loaded = null;
        if (!isRename) {
          const wanted = { family: spec.family, style: spec.style };
          try {
            await figma.loadFontAsync(wanted);
            loaded = wanted;
          } catch (e) {
            try {
              const fb = { family: spec.family, style: "Regular" };
              await figma.loadFontAsync(fb);
              loaded = fb;
              res.missing.push(t("textStyle.missStyle", { name: spec.name, style: spec.style }));
            } catch (e2) {
              res.missing.push(t("textStyle.missFamily", { name: spec.name, family: spec.family }));
              continue;
            }
          }
        } else {
          const fn = style.fontName;
          try {
            await figma.loadFontAsync(fn);
          } catch (e) {
            setName(style);
            res.missing.push(t("textStyle.missFontKeep", { name: spec.name, font: `${fn.family} ${fn.style}` }));
            styleByName.set(spec.name, style);
            continue;
          }
        }
        if (!style) style = figma.createTextStyle();
        setName(style);
        const lhPct = (_f = spec.lineHeightPercent) != null ? _f : 0;
        const lsPct = (_g = spec.letterSpacingPercent) != null ? _g : 0;
        if (!isRename && loaded) {
          style.fontName = loaded;
          style.fontSize = spec.fontSize;
          style.lineHeight = spec.lineHeight > 0 ? lhPct > 0 ? { value: lhPct, unit: "PERCENT" } : { value: spec.lineHeight, unit: "PIXELS" } : { unit: "AUTO" };
          style.letterSpacing = lsPct !== 0 ? { value: lsPct, unit: "PERCENT" } : { value: spec.letterSpacing, unit: "PIXELS" };
        } else if (lhPct > 0 || lsPct !== 0) {
          if (lhPct > 0) {
            if ((_h = style.boundVariables) == null ? void 0 : _h.lineHeight) res.notes.push(t("textStyle.noteKeepLh", { name: spec.name, n: lhPct }));
            else style.lineHeight = { value: lhPct, unit: "PERCENT" };
          }
          if (lsPct !== 0) {
            if ((_i = style.boundVariables) == null ? void 0 : _i.letterSpacing) res.notes.push(t("textStyle.noteKeepLs", { name: spec.name, n: lsPct }));
            else style.letterSpacing = { value: lsPct, unit: "PERCENT" };
          }
        }
        const bindRole = style.name;
        const fin = (_j = finalOf.get(spec)) != null ? _j : {};
        const fsName = (_k = fin["font-size"]) != null ? _k : `font-size/${bindRole}`;
        const fsVar = roleVar(fsName);
        if (fsVar) {
          style.setBoundVariable("fontSize", fsVar);
          res.bound++;
        } else if (!(isRename && decimalAnchor(style))) res.missing.push(t("textStyle.missVar", { name: bindRole, var: fsName }));
        if (spec.lineHeight > 0 || isRename) {
          const pctNow = lhPctOf(style.lineHeight);
          if (pctNow > 0) {
            if ((_l = style.boundVariables) == null ? void 0 : _l.lineHeight) style.setBoundVariable("lineHeight", null);
            res.notes.push(t("textStyle.noteLhPct", { role: bindRole, n: pctNow }));
          } else {
            const lhName = (_m = fin["line-height"]) != null ? _m : `line-height/${bindRole}`;
            const lhVar = roleVar(lhName);
            if (lhVar) {
              style.setBoundVariable("lineHeight", lhVar);
              res.bound++;
            } else if (spec.lineHeight > 0 && Number.isInteger(spec.lineHeight) && !(isRename && decimalAnchor(style))) res.missing.push(t("textStyle.missVar", { name: bindRole, var: lhName }));
          }
        }
        if (spec.letterSpacing !== 0 || isRename) {
          const lsPctNow = lsPctOf(style.letterSpacing);
          if (lsPctNow !== 0) {
            if ((_n = style.boundVariables) == null ? void 0 : _n.letterSpacing) style.setBoundVariable("letterSpacing", null);
            res.notes.push(t("textStyle.noteLsPct", { role: bindRole, n: lsPctNow }));
          } else {
            const lsName = (_o = fin["letter-spacing"]) != null ? _o : `letter-spacing/${bindRole}`;
            const lsVar = roleVar(lsName);
            if (lsVar) {
              style.setBoundVariable("letterSpacing", lsVar);
              res.bound++;
            } else if (spec.letterSpacing !== 0 && Number.isInteger(spec.letterSpacing) && !(isRename && decimalAnchor(style))) res.missing.push(t("textStyle.missVar", { name: bindRole, var: lsName }));
          }
        }
        const famVar = familyVarFor(style.fontName.family);
        if (famVar) {
          style.setBoundVariable("fontFamily", famVar);
          res.bound++;
        }
        res[created ? "created" : "updated"]++;
        if (!res.styleIds.includes(style.id)) res.styleIds.push(style.id);
        styleByName.set(style.name, style);
      } catch (e) {
        res.missing.push(t("textStyle.missError", { name: spec.name, error: explainError(e instanceof Error ? e.message : String(e)).message }));
        if (style) styleByName.set(style.name, style);
      }
    }
    for (let i = 0; i < roleSpecs.length; i++) {
      const spec = roleSpecs[i];
      const st = anchoredStyle(spec);
      const ids = new Set(roleMoved.filter((m) => m.pair === i).map((m) => m.id));
      if (!st || !ids.size || st.name === spec.name) continue;
      const orig = roleRenames[i].from;
      await renameTextRoleVars([{ from: spec.name, to: orig }], { onlyIds: ids });
      const want = new Set(ROLE_VAR_CATS.map((c) => `${c}/${orig}`));
      const stuck = [];
      for (const id of ids) {
        const v = await figma.variables.getVariableByIdAsync(id);
        if (v && !want.has(v.name)) stuck.push(v.name);
      }
      if (stuck.length) res.missing.push(t("textStyle.missRoleStuck", { name: st.name, vars: stuck.join(", ") }));
    }
    return res;
  }
  var ROLE_VAR_CATS = ["font-size", "line-height", "letter-spacing"];
  function finalNameTaken(cands, others) {
    var _a;
    const out = /* @__PURE__ */ new Set();
    for (; ; ) {
      const count = /* @__PURE__ */ new Map();
      const add2 = (n) => {
        var _a2;
        return void count.set(n, ((_a2 = count.get(n)) != null ? _a2 : 0) + 1);
      };
      for (const n of others) add2(n);
      for (const c of cands) add2(out.has(c.key) ? c.from : c.to);
      let grew = false;
      for (const c of cands)
        if (!out.has(c.key) && ((_a = count.get(c.to)) != null ? _a : 0) > 1) {
          out.add(c.key);
          grew = true;
        }
      if (!grew) return out;
    }
  }
  function twoPhaseRename(jobs) {
    const trySet = (j, name) => {
      try {
        j.set(name);
        return true;
      } catch (e) {
        return false;
      }
    };
    const status = /* @__PURE__ */ new Map();
    const failed = /* @__PURE__ */ new Set();
    for (const j of jobs) if (!trySet(j, j.tmp)) failed.add(j.key);
    for (const j of jobs) if (!failed.has(j.key) && !trySet(j, j.to)) failed.add(j.key);
    for (const j of jobs) status.set(j.key, "renamed");
    if (!failed.size) return status;
    const back = new Set(failed);
    for (let grew = true; grew; ) {
      grew = false;
      const reclaim = new Set(jobs.filter((j) => back.has(j.key)).map((j) => j.from));
      for (const j of jobs)
        if (!back.has(j.key) && reclaim.has(j.to)) {
          back.add(j.key);
          grew = true;
        }
    }
    const backJobs = jobs.filter((j) => back.has(j.key));
    const cur = (j) => {
      try {
        return j.get();
      } catch (e) {
        return "";
      }
    };
    for (const j of backJobs) if (cur(j) !== j.from) trySet(j, j.tmp);
    for (const j of backJobs) if (cur(j) !== j.from) trySet(j, j.from);
    for (const j of backJobs) status.set(j.key, cur(j) !== j.from ? "error-stuck" : failed.has(j.key) ? "error" : "error-chain");
    return status;
  }
  var varTmpName = (id) => `__dsl_tmp_${id.replace(/[^A-Za-z0-9_-]/g, "_")}`;
  async function renameTextRoleVars(pairs, opts = {}) {
    var _a;
    const res = { renamed: 0, taken: 0, error: 0, stuck: [], moved: [] };
    if (!pairs.length) return res;
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const semId = (_a = ownedCollection(cols, "semantic")) == null ? void 0 : _a.id;
    if (!semId) return res;
    const vars = (await figma.variables.getLocalVariablesAsync()).filter((v) => v.variableCollectionId === semId);
    const byName3 = /* @__PURE__ */ new Map();
    for (const v of vars) if (!byName3.has(v.name)) byName3.set(v.name, v);
    const cands = [];
    const picked = /* @__PURE__ */ new Set();
    pairs.forEach((p, pair) => {
      if (p.from === p.to) return;
      for (const cat of ROLE_VAR_CATS) {
        const v = byName3.get(`${cat}/${p.from}`);
        if (!v || picked.has(v.id) || isManualVar(v) || textStepOf(v) || opts.onlyIds && !opts.onlyIds.has(v.id)) continue;
        picked.add(v.id);
        cands.push({ key: v.id, from: v.name, to: `${cat}/${p.to}`, v, pair });
      }
    });
    if (!cands.length) return res;
    const taken = finalNameTaken(cands, vars.filter((v) => !picked.has(v.id)).map((v) => v.name));
    res.taken = taken.size;
    const live = cands.filter((c) => !taken.has(c.key));
    const status = twoPhaseRename(
      live.map((c) => ({
        key: c.key,
        from: c.from,
        to: c.to,
        tmp: varTmpName(c.v.id),
        get: () => c.v.name,
        set: (n) => {
          c.v.name = n;
        }
      }))
    );
    for (const c of live) {
      const st = status.get(c.key);
      if (st === "renamed") {
        res.renamed++;
        res.moved.push({ id: c.v.id, pair: c.pair });
      } else {
        res.error++;
        if (st === "error-stuck") res.stuck.push(c.v.name);
      }
    }
    return res;
  }
  function typoKey(t2) {
    var _a, _b, _c, _d;
    const fontSize = roundN(t2.fontSize);
    const lh = t2.lineHeight !== figma.mixed && t2.lineHeight && t2.lineHeight.unit === "AUTO" ? "auto" : String(lhPxOf(fontSize, t2.lineHeight));
    return [
      fontSize,
      lh,
      lsPxOf(fontSize, t2.letterSpacing),
      t2.fontName.family,
      t2.fontName.style,
      (_a = t2.textCase) != null ? _a : "ORIGINAL",
      (_b = t2.textDecoration) != null ? _b : "NONE",
      roundN((_c = t2.paragraphSpacing) != null ? _c : 0),
      roundN((_d = t2.paragraphIndent) != null ? _d : 0)
    ].join("|");
  }
  function isMixedTypography(t2) {
    return t2.fontSize === figma.mixed || t2.fontName === figma.mixed || t2.lineHeight === figma.mixed || t2.letterSpacing === figma.mixed || t2.textCase === figma.mixed || t2.textDecoration === figma.mixed;
  }
  var STYLE_TEXT_VAR_FIELDS = ["fontFamily", "fontSize", "fontStyle", "fontWeight", "letterSpacing", "lineHeight", "paragraphSpacing", "paragraphIndent"];
  function unbindStyleTextVars(t2) {
    var _a;
    const bv = t2.boundVariables;
    if (!bv) return;
    const len = typeof t2.characters === "string" ? t2.characters.length : 0;
    const node = t2;
    for (const f of STYLE_TEXT_VAR_FIELDS) {
      const e = bv[f];
      if (!(Array.isArray(e) ? e.length > 0 : !!e)) continue;
      if (len > 0 && node.setRangeBoundVariable) node.setRangeBoundVariable(0, len, f, null);
      try {
        (_a = node.setBoundVariable) == null ? void 0 : _a.call(node, f, null);
      } catch (e2) {
      }
    }
  }
  async function loadTextFonts(t2, loaded) {
    const len = typeof t2.characters === "string" ? t2.characters.length : 0;
    const fonts = len > 0 && typeof t2.getRangeAllFontNames === "function" ? t2.getRangeAllFontNames(0, len) : t2.fontName !== figma.mixed ? [t2.fontName] : [];
    for (const fn of fonts) {
      const k = `${fn.family} ${fn.style}`;
      if (loaded.has(k)) continue;
      await figma.loadFontAsync(fn);
      loaded.add(k);
    }
  }
  async function attachTextStyle(t2, styleId, loaded) {
    await loadTextFonts(t2, loaded);
    unbindStyleTextVars(t2);
    await t2.setTextStyleIdAsync(styleId);
  }
  function hasTextStyle(t2) {
    const id = t2.textStyleId;
    return id === figma.mixed || typeof id === "string" && id !== "";
  }
  function insideInstance(node) {
    for (let p = node.parent; p; p = p.parent) if (p.type === "INSTANCE") return true;
    return false;
  }
  async function textStyleIndex() {
    const styleByKey = /* @__PURE__ */ new Map();
    for (const s of await figma.getLocalTextStylesAsync()) {
      const k = typoKey(s);
      styleByKey.set(k, styleByKey.has(k) ? null : s);
    }
    return styleByKey;
  }
  function planTexts(nodes) {
    const texts = [];
    const inInstance = [];
    for (const n of nodes) {
      if (insideInstance(n)) walkText(n, inInstance);
      else walkText(n, texts, inInstance);
    }
    return { texts, inInstance };
  }
  function textStyleFor(t2, styleByKey) {
    if (hasTextStyle(t2)) return "hasStyle";
    if (isMixedTypography(t2)) return "mixed";
    const hit = styleByKey.get(typoKey(t2));
    if (hit === void 0) return "noStyle";
    if (hit === null) return "ambiguous";
    return hit;
  }
  async function planExistingTextStyles(nodes) {
    var _a;
    const skipReasons = { hasStyle: 0, noStyle: 0, ambiguous: 0, mixed: 0, instance: 0 };
    const styleByKey = await textStyleIndex();
    const { texts, inInstance } = planTexts(nodes);
    skipReasons.instance += inInstance.length;
    const rows = /* @__PURE__ */ new Map();
    for (const t2 of texts) {
      const r = textStyleFor(t2, styleByKey);
      if (typeof r === "string") {
        skipReasons[r]++;
        continue;
      }
      const row = (_a = rows.get(r.id)) != null ? _a : { styleId: r.id, name: r.name, nodeIds: [] };
      row.nodeIds.push(t2.id);
      rows.set(r.id, row);
    }
    return { rows: [...rows.values()], skipReasons };
  }
  async function applyTextStyleRows(rows) {
    var _a;
    const skipReasons = { hasStyle: 0, noStyle: 0, ambiguous: 0, mixed: 0, instance: 0 };
    const res = { applied: 0, skipped: 0, skipReasons };
    const styleByKey = await textStyleIndex();
    const loaded = /* @__PURE__ */ new Set();
    for (const row of rows) {
      for (const id of row.nodeIds) {
        const t2 = await figma.getNodeByIdAsync(id).catch(() => null);
        if (!t2 || t2.type !== "TEXT") {
          skipReasons.noStyle++;
          res.skipped++;
          continue;
        }
        const r = textStyleFor(t2, styleByKey);
        if (typeof r === "string" || r.id !== row.styleId) {
          skipReasons[typeof r === "string" ? r : "noStyle"]++;
          res.skipped++;
          continue;
        }
        try {
          await attachTextStyle(t2, r.id, loaded);
          res.applied++;
          ((_a = res.appliedIds) != null ? _a : res.appliedIds = []).push(id);
        } catch (e) {
        }
      }
    }
    return res;
  }
  async function textStyleCandidateTest() {
    const styleByKey = await textStyleIndex();
    return (t2) => !insideInstance(t2) && typeof textStyleFor(t2, styleByKey) !== "string";
  }
  async function applyRegisteredTextStyles(roots, styleIds) {
    var _a, _b, _c;
    const applyReasons = { hasStyle: 0, instance: 0, ambiguous: 0 };
    const out = { applied: 0, applySkipped: 0, applyReasons };
    if (!styleIds.length) return out;
    const ids = new Set(styleIds);
    const idByKey = /* @__PURE__ */ new Map();
    for (const st of await figma.getLocalTextStylesAsync()) if (ids.has(st.id)) idByKey.set(typoKey(st), st.id);
    if (!idByKey.size) return out;
    const keyOf2 = (t2) => isMixedTypography(t2) ? void 0 : typoKey(t2);
    const plan = planTexts(roots);
    const skipped = (k) => {
      applyReasons[k]++;
      out.applySkipped++;
    };
    for (const t2 of plan.inInstance) if (idByKey.has((_a = keyOf2(t2)) != null ? _a : "\0")) skipped("instance");
    const rows = /* @__PURE__ */ new Map();
    const styleByKey = await textStyleIndex();
    for (const t2 of plan.texts) {
      const k = keyOf2(t2);
      if (k === void 0 || !idByKey.has(k)) continue;
      const r = textStyleFor(t2, styleByKey);
      if (r === "hasStyle") {
        if (t2.textStyleId !== idByKey.get(k)) skipped("hasStyle");
        continue;
      }
      if (r === "ambiguous") {
        skipped("ambiguous");
        continue;
      }
      if (typeof r === "string" || !ids.has(r.id)) continue;
      const arr = (_b = rows.get(r.id)) != null ? _b : [];
      arr.push(t2.id);
      rows.set(r.id, arr);
    }
    if (rows.size) {
      const r = await applyTextStyleRows([...rows].map(([styleId, nodeIds]) => ({ styleId, nodeIds })));
      out.applied = r.applied;
      if ((_c = r.appliedIds) == null ? void 0 : _c.length) out.appliedIds = r.appliedIds;
    }
    return out;
  }
  var VarNameError = class extends Error {
  };
  var VarGoneError = class extends Error {
  };
  var USER_COLLECTION_NAME = "Variables";
  async function editValueToFigma(ev) {
    if (ev.kind === "color") return __spreadProps(__spreadValues({}, hexToRgb(ev.hex)), { a: Math.max(0, Math.min(1, ev.alpha)) });
    if (ev.kind === "number") return ev.value;
    if (ev.kind === "string") return ev.text;
    if (ev.kind === "bool") return ev.value;
    const target = await figma.variables.getVariableByIdAsync(ev.targetId).catch(() => null);
    if (!target) throw new Error("alias target not found");
    return figma.variables.createVariableAlias(target);
  }
  function markManual(v) {
    var _a;
    try {
      (_a = v.setPluginData) == null ? void 0 : _a.call(v, MANUAL_KEY, "1");
    } catch (e) {
    }
  }
  function dropQuietly(x) {
    var _a;
    try {
      (_a = x == null ? void 0 : x.remove) == null ? void 0 : _a.call(x);
    } catch (e) {
    }
  }
  async function createManualVariable(input) {
    var _a, _b;
    let col;
    let newCollection = false;
    if (input.collectionId) {
      col = (await figma.variables.getLocalVariableCollectionsAsync()).find((c) => c.id === input.collectionId);
      if (!col) throw new VarGoneError("collection not found");
    } else {
      col = figma.variables.createVariableCollection(USER_COLLECTION_NAME);
      newCollection = true;
    }
    let v;
    try {
      v = figma.variables.createVariable(input.name, col, input.varType);
    } catch (e) {
      if (newCollection) dropQuietly(col);
      throw new VarNameError(e instanceof Error ? e.message : String(e));
    }
    try {
      const def = col.defaultModeId;
      const defVal = (_a = input.values[def]) != null ? _a : input.values["*"];
      if (!defVal) throw new Error("default mode value required");
      for (const m of col.modes) {
        const ev = m.modeId === def ? defVal : (_b = input.values[m.modeId]) != null ? _b : defVal;
        v.setValueForMode(m.modeId, await editValueToFigma(ev));
      }
      if (input.scopes) v.scopes = input.scopes;
      markManual(v);
    } catch (e) {
      dropQuietly(v);
      if (newCollection) dropQuietly(col);
      throw e;
    }
    return { variable: v, newCollection };
  }
  async function duplicateVariable(id) {
    var _a, _b, _c;
    const src = await figma.variables.getVariableByIdAsync(id).catch(() => null);
    if (!src || src.remote) throw new VarGoneError("variable not found");
    const col = (await figma.variables.getLocalVariableCollectionsAsync()).find((c) => c.id === src.variableCollectionId);
    if (!col) throw new VarGoneError("collection not found");
    const taken = new Set((await figma.variables.getLocalVariablesAsync()).filter((v) => v.variableCollectionId === col.id).map((v) => v.name));
    const nv = figma.variables.createVariable(duplicateName(src.name, taken), col, src.resolvedType);
    try {
      for (const [modeId, raw] of Object.entries(src.valuesByMode)) {
        if (raw === void 0 || raw === null) continue;
        const val = typeof raw === "object" && raw.type === "VARIABLE_ALIAS" ? { type: "VARIABLE_ALIAS", id: raw.id } : raw;
        nv.setValueForMode(modeId, val);
      }
      nv.scopes = [...(_a = src.scopes) != null ? _a : []];
      nv.description = (_b = src.description) != null ? _b : "";
      nv.hiddenFromPublishing = !!src.hiddenFromPublishing;
      const cs = (_c = src.codeSyntax) != null ? _c : {};
      for (const [platform, value] of Object.entries(cs)) {
        if (value) nv.setVariableCodeSyntax(platform, value);
      }
      markManual(nv);
    } catch (e) {
      dropQuietly(nv);
      throw e;
    }
    return nv;
  }
  async function deleteVariable(id) {
    const v = await figma.variables.getVariableByIdAsync(id).catch(() => null);
    if (!v || v.remote) throw new VarGoneError("variable not found");
    const name = v.name;
    v.remove();
    return name;
  }

  // src/lib/applyVar.ts
  var allows = (scopes, need) => scopes.includes("ALL_SCOPES") || need.some((s) => scopes.includes(s));
  var visibleSolidIdx = (list) => {
    if (!Array.isArray(list)) return -1;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      if (p && p.type === "SOLID" && p.visible !== false) return i;
    }
    return -1;
  };
  var hasVisible = (list) => Array.isArray(list) && list.some((p) => p && p.visible !== false);
  var newSolid = () => ({ type: "SOLID", color: { r: 0, g: 0, b: 0 }, opacity: 1, visible: true, blendMode: "NORMAL" });
  async function detachStyle(node, field) {
    const n = node;
    if (!(field in n) || !n[field] || typeof n[field] !== "string") return;
    const setter = `set${field[0].toUpperCase()}${field.slice(1)}Async`;
    try {
      const fn = n[setter];
      if (typeof fn === "function") await fn.call(n, "");
      else n[field] = "";
    } catch (e) {
    }
  }
  function fillProp(textOnly) {
    return {
      scopeOk: (scopes, node) => allows(scopes, fillScopesFor(node.type)),
      check(node, create) {
        if (textOnly ? node.type !== "TEXT" : node.type === "TEXT") return "no-prop";
        if (node.type === "GROUP" || node.type === "SLICE" || !("fills" in node)) return "no-prop";
        if (create) return null;
        const fills = node.fills;
        return visibleSolidIdx(fills) >= 0 ? null : "no-prop";
      },
      async run(node, v) {
        const n = node;
        await detachStyle(node, "fillStyleId");
        const fills = n.fills;
        if (!Array.isArray(fills)) {
          n.fills = [figma.variables.setBoundVariableForPaint(newSolid(), "color", v)];
          return null;
        }
        const arr = fills.slice();
        const i = visibleSolidIdx(arr);
        if (i >= 0) arr[i] = figma.variables.setBoundVariableForPaint(arr[i], "color", v);
        else arr.push(figma.variables.setBoundVariableForPaint(newSolid(), "color", v));
        n.fills = arr;
        return null;
      }
    };
  }
  var strokeColorProp = {
    scopeOk: (scopes) => allows(scopes, ["STROKE_COLOR"]),
    check(node, create) {
      if (node.type === "GROUP" || node.type === "SLICE" || !("strokes" in node)) return "no-prop";
      if (create) return null;
      return visibleSolidIdx(node.strokes) >= 0 ? null : "no-stroke";
    },
    async run(node, v) {
      const n = node;
      await detachStyle(node, "strokeStyleId");
      const strokes = Array.isArray(n.strokes) ? n.strokes.slice() : [];
      const hadVisible = hasVisible(strokes);
      const i = visibleSolidIdx(strokes);
      if (i >= 0) strokes[i] = figma.variables.setBoundVariableForPaint(strokes[i], "color", v);
      else strokes.push(figma.variables.setBoundVariableForPaint(newSolid(), "color", v));
      n.strokes = strokes;
      if (!hadVisible) {
        try {
          n.strokeWeight = 1;
          n.strokeAlign = "INSIDE";
        } catch (e) {
        }
      }
      return null;
    }
  };
  var shadowProp = {
    scopeOk: (scopes) => allows(scopes, ["EFFECT_COLOR"]),
    check(node) {
      if (!("effects" in node)) return "no-shadow";
      return shadowIdx(node.effects) >= 0 ? null : "no-shadow";
    },
    async run(node, v) {
      const n = node;
      await detachStyle(node, "effectStyleId");
      const effs = n.effects.slice();
      const i = shadowIdx(effs);
      effs[i] = figma.variables.setBoundVariableForEffect(effs[i], "color", v);
      n.effects = effs;
      return null;
    }
  };
  function shadowIdx(list) {
    if (!Array.isArray(list)) return -1;
    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i];
      if (e && (e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW") && e.visible !== false) return i;
    }
    return -1;
  }
  function bindFields(node, fields, v) {
    const n = node;
    for (const f of fields) n.setBoundVariable(f, v);
  }
  var isAutoLayout = (node) => {
    const m = node.layoutMode;
    return m === "HORIZONTAL" || m === "VERTICAL";
  };
  function gapProp(fields) {
    return {
      scopeOk: (scopes) => allows(scopes, ["GAP"]),
      check: (node) => isAutoLayout(node) ? null : "not-autolayout",
      async run(node, v) {
        bindFields(node, fields(node), v);
        return null;
      }
    };
  }
  var CORNER_FIELD = { "top-left": "topLeftRadius", "top-right": "topRightRadius", "bottom-left": "bottomLeftRadius", "bottom-right": "bottomRightRadius" };
  var ALL_CORNERS = ["topLeftRadius", "topRightRadius", "bottomRightRadius", "bottomLeftRadius"];
  function radiusProp(fields) {
    return {
      scopeOk: (scopes) => allows(scopes, ["CORNER_RADIUS"]),
      check: (node) => node.type !== "TEXT" && "topLeftRadius" in node ? null : "no-prop",
      async run(node, v) {
        bindFields(node, fields, v);
        return null;
      }
    };
  }
  function sizeProp(fields) {
    return {
      scopeOk: (scopes) => allows(scopes, ["WIDTH_HEIGHT"]),
      check: (node) => node.type === "TEXT" || node.type === "GROUP" || !("width" in node) ? "no-prop" : null,
      async run(node, v) {
        const n = node;
        for (const f of fields) {
          const key = f === "width" ? "layoutSizingHorizontal" : "layoutSizingVertical";
          if (key in n && (n[key] === "HUG" || n[key] === "FILL")) {
            try {
              n[key] = "FIXED";
            } catch (e) {
            }
          }
        }
        bindFields(node, fields, v);
        return null;
      }
    };
  }
  var SIDE_WEIGHT = { top: "strokeTopWeight", right: "strokeRightWeight", bottom: "strokeBottomWeight", left: "strokeLeftWeight" };
  function strokeWeightProp(field) {
    return {
      scopeOk: (scopes) => allows(scopes, ["STROKE_FLOAT"]),
      check(node) {
        if (!(field in node)) return "no-prop";
        return hasVisible(node.strokes) ? null : "no-stroke";
      },
      async run(node, v) {
        bindFields(node, [field], v);
        return null;
      }
    };
  }
  var opacityProp = {
    scopeOk: (scopes) => allows(scopes, ["OPACITY"]),
    check: (node) => "opacity" in node ? null : "no-prop",
    async run(node, v) {
      bindFields(node, ["opacity"], v);
      return null;
    }
  };
  var TEXT_FIELD_SCOPE = { fontSize: "FONT_SIZE", lineHeight: "LINE_HEIGHT", letterSpacing: "LETTER_SPACING", fontFamily: "FONT_FAMILY" };
  async function valueFor(v, node) {
    var _a;
    try {
      const fn = v.resolveForConsumer;
      if (typeof fn === "function") return fn.call(v, node).value;
    } catch (e) {
    }
    let cur = v;
    for (let i = 0; i < 12 && cur; i++) {
      const raw = Object.values((_a = cur.valuesByMode) != null ? _a : {})[0];
      if (raw && typeof raw === "object" && raw.type === "VARIABLE_ALIAS") {
        cur = await figma.variables.getVariableByIdAsync(raw.id).catch(() => null);
      } else return raw;
    }
    return void 0;
  }
  function textProp(field) {
    return {
      scopeOk: (scopes) => allows(scopes, [TEXT_FIELD_SCOPE[field]]),
      check(node) {
        if (node.type !== "TEXT") return "no-prop";
        return node.characters.length ? null : "empty-text";
      },
      async run(node, v) {
        const tn = node;
        const len = tn.characters.length;
        let fonts;
        try {
          fonts = typeof tn.getRangeAllFontNames === "function" ? tn.getRangeAllFontNames(0, len) : [tn.fontName];
          for (const f of fonts) await figma.loadFontAsync(f);
        } catch (e) {
          return "font";
        }
        if (field === "fontFamily") {
          const family = await valueFor(v, node);
          if (typeof family !== "string") return "font";
          try {
            for (const f of fonts) await figma.loadFontAsync({ family, style: f.style });
          } catch (e) {
            return "font";
          }
        }
        tn.setRangeBoundVariable(0, len, field, v);
        return null;
      }
    };
  }
  var DIRS2 = ["top", "right", "bottom", "left"];
  var PADDING2 = {
    padding: ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"],
    "padding-x": ["paddingLeft", "paddingRight"],
    "padding-y": ["paddingTop", "paddingBottom"],
    "padding-top": ["paddingTop"],
    "padding-right": ["paddingRight"],
    "padding-bottom": ["paddingBottom"],
    "padding-left": ["paddingLeft"]
  };
  var wraps = (node) => node.layoutWrap === "WRAP";
  function lastSeg(name) {
    var _a;
    const segs = name.split("/").map((s) => s.trim().toLowerCase());
    return (_a = segs[segs.length - 1]) != null ? _a : "";
  }
  function textFieldOf(name, scopes) {
    const segs = name.split("/").map((s) => s.trim().toLowerCase());
    const byName3 = { "font-size": "fontSize", "line-height": "lineHeight", "letter-spacing": "letterSpacing", "font-family": "fontFamily" };
    for (const s of [segs[segs.length - 1], segs[0]]) if (s && byName3[s]) return byName3[s];
    const byScope = { FONT_SIZE: "fontSize", LINE_HEIGHT: "lineHeight", LETTER_SPACING: "letterSpacing", FONT_FAMILY: "fontFamily" };
    for (const s of scopes) if (byScope[s]) return byScope[s];
    return null;
  }
  function propsFor(kind, v, node) {
    var _a;
    const last = lastSeg(v.name);
    switch (kind) {
      case "color":
        return [fillProp(node.type === "TEXT"), strokeColorProp, shadowProp];
      case "gap": {
        if (PADDING2[last]) {
          const f = PADDING2[last];
          return [gapProp(() => f)];
        }
        if (last === "row-gap") return [gapProp((n) => [wraps(n) ? "counterAxisSpacing" : "itemSpacing"])];
        return [gapProp(() => ["itemSpacing"])];
      }
      case "radius": {
        const corner = Object.keys(CORNER_FIELD).find((c) => last === `radius-${c}`);
        return [radiusProp(corner ? [CORNER_FIELD[corner]] : ALL_CORNERS)];
      }
      case "size":
        return [sizeProp(last === "width" ? ["width"] : last === "height" ? ["height"] : ["width", "height"])];
      case "stroke": {
        const dir = DIRS2.find((d) => last.endsWith(`-${d}`));
        return [strokeWeightProp(dir ? SIDE_WEIGHT[dir] : "strokeWeight")];
      }
      case "opacity":
        return [opacityProp];
      case "text": {
        const f = textFieldOf(v.name, (_a = v.scopes) != null ? _a : []);
        return f ? [textProp(f)] : [];
      }
      default:
        return [];
    }
  }
  function propForTarget(kind, target) {
    var _a;
    if (!((_a = APPLY_TARGETS[kind]) != null ? _a : []).includes(target)) return null;
    switch (target) {
      case "fill":
        return fillProp(false);
      case "text":
        return fillProp(true);
      case "stroke":
        return strokeColorProp;
      case "shadow":
        return shadowProp;
      case "gap":
        return gapProp(() => ["itemSpacing"]);
      case "radius":
        return radiusProp(ALL_CORNERS);
      case "radius-tl":
        return radiusProp(["topLeftRadius"]);
      case "radius-tr":
        return radiusProp(["topRightRadius"]);
      case "radius-bl":
        return radiusProp(["bottomLeftRadius"]);
      case "radius-br":
        return radiusProp(["bottomRightRadius"]);
      default:
        return PADDING2[target] ? gapProp(() => PADDING2[target]) : null;
    }
  }
  async function applyVariableToNodes(nodes, variable, target) {
    var _a;
    const res = { applied: 0, skipped: 0, skipReasons: {} };
    const skip2 = (r) => {
      var _a2;
      res.skipped++;
      res.skipReasons[r] = ((_a2 = res.skipReasons[r]) != null ? _a2 : 0) + 1;
    };
    const scopes = (_a = variable.scopes) != null ? _a : [];
    const kind = varKind({ name: variable.name, type: variable.resolvedType, scopes });
    for (const node of nodes) {
      try {
        if (kind === "other") {
          skip2("other-kind");
          continue;
        }
        if (target) {
          const p = propForTarget(kind, target);
          if (!p) {
            skip2("no-prop");
            continue;
          }
          if (!targetAllowed(scopes, target)) {
            skip2("no-scope");
            continue;
          }
          const why = p.check(node, true);
          if (why) {
            skip2(why);
            continue;
          }
          if (!p.scopeOk(scopes, node)) {
            skip2("no-scope");
            continue;
          }
          const r2 = await p.run(node, variable, true);
          if (r2) skip2(r2);
          else res.applied++;
          continue;
        }
        const list = propsFor(kind, variable, node);
        let firstWhy = null;
        let chosen = null;
        for (let i = 0; i < list.length; i++) {
          const p = list[i];
          if (!p.scopeOk(scopes, node)) continue;
          const create = i === 0;
          const why = p.check(node, create);
          if (!why) {
            chosen = { p, create };
            break;
          }
          firstWhy != null ? firstWhy : firstWhy = why;
        }
        if (!chosen) {
          skip2(firstWhy != null ? firstWhy : "no-scope");
          continue;
        }
        const r = await chosen.p.run(node, variable, chosen.create);
        if (r) skip2(r);
        else res.applied++;
      } catch (e) {
        skip2("error");
      }
    }
    return res;
  }

  // src/lib/unusedVars.ts
  function judgeUnused(vars, roots) {
    var _a, _b;
    const byId = new Map(vars.map((v) => [v.id, v]));
    const used = /* @__PURE__ */ new Set();
    const stack = [...roots].filter((id) => byId.has(id));
    while (stack.length) {
      const id = stack.pop();
      if (used.has(id)) continue;
      used.add(id);
      for (const t2 of (_b = (_a = byId.get(id)) == null ? void 0 : _a.targets) != null ? _b : []) if (byId.has(t2) && !used.has(t2)) stack.push(t2);
    }
    const pointed = /* @__PURE__ */ new Set();
    for (const v of vars) for (const t2 of v.targets) if (t2 !== v.id) pointed.add(t2);
    const out = /* @__PURE__ */ new Map();
    for (const v of vars) if (!used.has(v.id)) out.set(v.id, pointed.has(v.id) ? "chain" : "none");
    return out;
  }
  function collectAliasIds(value, into, seen = /* @__PURE__ */ new Set()) {
    if (!value || typeof value !== "object") return;
    if (seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      for (const x of value) collectAliasIds(x, into, seen);
      return;
    }
    const o = value;
    if (o.type === "VARIABLE_ALIAS" && typeof o.id === "string") into.add(o.id);
    if (typeof o.variableId === "string") into.add(o.variableId);
    for (const k of Object.keys(o)) {
      let v;
      try {
        v = o[k];
      } catch (e) {
        continue;
      }
      if (v && typeof v === "object") collectAliasIds(v, into, seen);
    }
  }
  var NODE_PROPS = ["boundVariables", "fills", "strokes", "effects", "layoutGrids", "reactions", "componentProperties"];
  function readProp(node, key) {
    try {
      const v = node[key];
      return typeof v === "symbol" ? void 0 : v;
    } catch (e) {
      return void 0;
    }
  }
  function collectNodeIds(node, into) {
    var _a;
    for (const k of NODE_PROPS) collectAliasIds(readProp(node, k), into);
    const isSet = node.type === "COMPONENT_SET";
    const isLoneComp = node.type === "COMPONENT" && ((_a = node.parent) == null ? void 0 : _a.type) !== "COMPONENT_SET";
    if (isSet || isLoneComp) collectAliasIds(readProp(node, "componentPropertyDefinitions"), into);
  }
  var YIELD_EVERY = 2e3;
  var yieldNow = () => new Promise((r) => setTimeout(r, 0));
  function varNodesOf(vars) {
    return vars.map((v) => {
      const t2 = /* @__PURE__ */ new Set();
      collectAliasIds(v.valuesByMode, t2);
      return { id: v.id, targets: [...t2] };
    });
  }
  async function scanUnusedVariables(hooks = {}) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m;
    (_a = hooks.onProgress) == null ? void 0 : _a.call(hooks, 0, 0);
    await figma.loadAllPagesAsync();
    if ((_b = hooks.cancelled) == null ? void 0 : _b.call(hooks)) return { items: [], pages: 0, layers: 0, cancelled: true };
    const roots = /* @__PURE__ */ new Set();
    const pages = figma.root.children;
    let layers = 0;
    let sinceYield = 0;
    for (let i = 0; i < pages.length; i++) {
      const stack = [...pages[i].children];
      while (stack.length) {
        const n = stack.pop();
        layers++;
        collectNodeIds(n, roots);
        const kids = readProp(n, "children");
        if (Array.isArray(kids)) for (const c of kids) stack.push(c);
        if (++sinceYield >= YIELD_EVERY) {
          sinceYield = 0;
          await yieldNow();
          if ((_c = hooks.cancelled) == null ? void 0 : _c.call(hooks)) return { items: [], pages: i, layers, cancelled: true };
        }
      }
      (_d = hooks.onProgress) == null ? void 0 : _d.call(hooks, i + 1, pages.length);
      await yieldNow();
      if ((_e = hooks.cancelled) == null ? void 0 : _e.call(hooks)) return { items: [], pages: i + 1, layers, cancelled: true };
    }
    const styleLists = await Promise.all([
      (_g = (_f = figma.getLocalPaintStylesAsync) == null ? void 0 : _f.call(figma)) != null ? _g : [],
      (_i = (_h = figma.getLocalTextStylesAsync) == null ? void 0 : _h.call(figma)) != null ? _i : [],
      (_k = (_j = figma.getLocalEffectStylesAsync) == null ? void 0 : _j.call(figma)) != null ? _k : [],
      (_m = (_l = figma.getLocalGridStylesAsync) == null ? void 0 : _l.call(figma)) != null ? _m : []
    ]);
    for (const list of styleLists) {
      for (const st of list) {
        for (const k of ["boundVariables", "paints", "effects", "layoutGrids"]) collectAliasIds(readProp(st, k), roots);
      }
    }
    const vars = await figma.variables.getLocalVariablesAsync();
    const kinds = judgeUnused(varNodesOf(vars), roots);
    const items = vars.filter((v) => kinds.has(v.id)).map((v) => ({ id: v.id, kind: kinds.get(v.id) }));
    return { items, pages: pages.length, layers, cancelled: false };
  }
  async function deleteUnusedVariables(ids, hooks = {}) {
    const again = await scanUnusedVariables(hooks);
    if (again.cancelled) return { deleted: 0, skipped: 0, failed: 0, cancelled: true };
    const still = new Set(again.items.map((x) => x.id));
    let deleted = 0;
    let skipped = 0;
    let failed = 0;
    for (const id of new Set(ids)) {
      if (!still.has(id)) {
        skipped++;
        continue;
      }
      try {
        const v = await figma.variables.getVariableByIdAsync(id);
        if (!v) {
          skipped++;
          continue;
        }
        v.remove();
        deleted++;
      } catch (e) {
        failed++;
      }
    }
    return { deleted, skipped, failed, cancelled: false };
  }

  // src/lib/componentLike.ts
  function dims(node) {
    const w = node.width;
    const h = node.height;
    if (typeof w !== "number" || typeof h !== "number") return null;
    return { w, h };
  }
  function isIconLike(n) {
    if (VECTOR_TYPES.has(n.type) || n.iconFrame) return true;
    if (n.type !== "FRAME" && n.type !== "GROUP") return false;
    const d = dims(n);
    if (!d || d.w > 96 || d.h > 96) return false;
    let vectors = 0;
    const ok = (x) => {
      var _a;
      return ((_a = x.children) != null ? _a : []).every((c) => {
        if (VECTOR_TYPES.has(c.type)) {
          vectors++;
          return true;
        }
        if (c.type === "ELLIPSE" || c.type === "RECTANGLE") return !hasImageFill(c);
        if (c.type === "FRAME" || c.type === "GROUP") return !hasImageFill(c) && ok(c);
        return false;
      });
    };
    return ok(n) && vectors > 0;
  }
  function isIconFrame(n) {
    if (n.type !== "FRAME" && n.type !== "GROUP") return false;
    if (n.iconFrame) return true;
    if (hasImageFill(n)) return false;
    return isIconLike(n);
  }
  function shortOneLine(t2) {
    const c = t2.characters;
    if (typeof c !== "string") return false;
    return !/[\n\r\u2028]/.test(c) && c.trim().length > 0 && c.trim().length <= 24;
  }

  // src/lib/rename.ts
  async function renameSelection(selection2, opts) {
    const col = { changes: [], nodes: [] };
    const safeOpts = __spreadProps(__spreadValues({}, opts), { maxDepth: normalizeMaxDepth(opts.maxDepth) });
    await recurse(selection2, null, safeOpts, col, 0, null, null, null, null, 0, null, null);
    return { changes: col.changes, nodes: col.nodes, applied: opts.apply };
  }
  function normalizeMaxDepth(v) {
    return Number.isFinite(v) ? Math.max(1, Math.round(v)) : 8;
  }
  async function recurse(nodes, ancestorName, opts, col, depth, parentLayout, parentId, parentRole, parentDims, ctxDepth, rootPrefix, parentNode) {
    var _a, _b, _c;
    const total = nodes.length;
    const slotOf = /* @__PURE__ */ new Map();
    let slots = 0;
    for (let i = 0; i < total; i++) if (isLandmarkCandidate(nodes[i])) slotOf.set(i, slots++);
    const overlayAt = findOverlayIndex(nodes, parentDims);
    const hasAvatarSibling = nodes.some((n) => n.type === "ELLIPSE" && hasImageFill(n));
    for (let i = 0; i < total; i++) {
      const node = nodes[i];
      const before = node.name;
      const d = dims2(node);
      const widthFrac = d != null && parentDims && parentDims.w > 0 ? d.w / parentDims.w : null;
      const heightFrac = d != null && parentDims && parentDims.h > 0 ? d.h / parentDims.h : null;
      const pos = {
        index: i,
        total,
        parentLayout,
        depth,
        widthFrac,
        heightFrac,
        parentDims,
        regionIndex: (_a = slotOf.get(i)) != null ? _a : -1,
        regionTotal: slots,
        isOverlay: i === overlayAt,
        afterOverlay: overlayAt >= 0 && i > overlayAt,
        hasAvatarSibling,
        ctxDepth,
        parentNode,
        siblings: nodes,
        rootPrefix
      };
      const decided = await decide(node, ancestorName, pos, opts, parentRole);
      let contextForChildren = before;
      let ctxDepthForChildren = 0;
      let after;
      let nameKey;
      let prefixForChildren = rootPrefix;
      if (depth === 0) {
        const sc = decided.keep === "root" ? pickScope(before) : null;
        prefixForChildren = sc && !isScopeRole(sc) ? sc : null;
      }
      if (!decided.skip && decided.name) {
        const visible = decided.keepName ? decided.name : stripRootPrefix(decided.name, rootPrefix, decided.role);
        if (visible !== decided.name) nameKey = decided.name;
        if (decided.keepKey) nameKey = nameKeyFor(before, readPluginKey(node, NAME_KEY));
        if (visible !== before) {
          after = visible;
          col.changes.push(__spreadValues({ id: node.id, before, after }, nameKey ? { nameKey } : {}));
          if (opts.apply) node.name = after;
        }
        if (opts.apply && decided.role) writeRole(node, decided.role);
        if (opts.apply) writeNameKey(node, nameKey != null ? nameKey : null);
        contextForChildren = (_b = decided.ctxName) != null ? _b : decided.passthrough ? ancestorName : decided.name;
        if (decided.passthrough) ctxDepthForChildren = ctxDepth + 1;
      }
      col.nodes.push(__spreadValues({ id: node.id, name: before, type: node.type, depth, parentId, after, keep: decided.keep, role: decided.role }, nameKey ? { nameKey } : {}));
      if ("children" in node && !isSkippedSubtree(node) && !isIconFrameNode(node)) {
        const childDims = decided.passthrough ? parentDims : dims2(node);
        await recurse(node.children, contextForChildren, opts, col, depth + 1, layoutOf(node), node.id, (_c = decided.role) != null ? _c : null, childDims, ctxDepthForChildren, prefixForChildren, node);
      }
    }
  }
  async function decide(node, ancestorName, pos, opts, parentRole) {
    var _a;
    if (node.type === "COMPONENT" || node.type === "COMPONENT_SET") return { skip: true, keep: "component" };
    if (node.type === "TEXT") return { skip: true, keep: "text" };
    if (node.type === "INSTANCE") return { skip: true, keep: "instance" };
    if (node.locked) return { skip: true, keep: "locked" };
    if (pos.depth === 0 && isContainerType(node)) {
      const hc = highConfidenceRole(node);
      if (!hc) return { skip: true, keep: "root" };
      let hcScope = ancestorName ? pickScope(ancestorName) : null;
      if (hcScope === hc) hcScope = null;
      return { skip: false, role: hc, name: layerNameFromRole(hcScope, hc, { maxDepth: opts.maxDepth }) };
    }
    const token = await primaryToken(node);
    const ctxScope = (_a = ancestorName ? pickScope(ancestorName) : null) != null ? _a : (token == null ? void 0 : token.context) ? pickScope(token.context) : null;
    const role = resolveRole(node, token, pos, parentRole, ctxScope);
    if (isContainerType(node) && !isIconFrameNode(node)) {
      const h = hintRole(node, pos.rootPrefix);
      if (h && (role === h || HINT_WEAK_ROLES.has(role))) {
        return { skip: false, role: h, name: node.name, keepName: true, keepKey: true, ctxName: h };
      }
    }
    if (PASSTHROUGH_ROLES.has(role)) return { skip: false, role, name: role, passthrough: true };
    if (role === "icon" && isIconFrameNode(node) && !isMeaninglessIconName(node, pos.rootPrefix)) {
      return { skip: false, role, name: node.name, keepName: true };
    }
    const scope = ctxScope === role ? null : ctxScope;
    const name = layerNameFromRole(scope, role, { maxDepth: opts.maxDepth });
    if (REFINED_PASSTHROUGH.has(role)) return { skip: false, role, name, passthrough: true };
    return { skip: false, role, name };
  }
  function writeRole(node, role) {
    const fn = node.setPluginData;
    if (typeof fn !== "function") return false;
    try {
      const read = node.getPluginData;
      if (typeof read === "function" && read.call(node, ROLE_KEY) === role) return false;
      fn.call(node, ROLE_KEY, role);
      return true;
    } catch (e) {
      return false;
    }
  }
  function stripRootPrefix(name, prefix, role) {
    if (role && name === role) return name;
    return prefix && name.startsWith(prefix + "-") && name.length > prefix.length + 1 ? name.slice(prefix.length + 1) : name;
  }
  function writeNameKey(node, key) {
    const n = node;
    if (typeof n.setPluginData !== "function") return false;
    try {
      const cur = typeof n.getPluginData === "function" ? n.getPluginData.call(node, NAME_KEY) : "";
      const next = key != null ? key : "";
      if (cur === next) return false;
      n.setPluginData.call(node, NAME_KEY, next);
      return true;
    } catch (e) {
      return false;
    }
  }
  function writeRoleFromName(node, name) {
    const toks = kebab(name).split("-").filter(Boolean);
    const two = toks.length >= 2 ? toks.slice(-2).join("-") : "";
    if (two && isKnownRole(two)) return writeRole(node, two);
    const role = toks[toks.length - 1];
    return role && isKnownRole(role) ? writeRole(node, role) : false;
  }
  var PASSTHROUGH_ROLES = /* @__PURE__ */ new Set(["container", "wrapper", "stack-x", "stack-y"]);
  var REFINED_PASSTHROUGH = /* @__PURE__ */ new Set(["row", "text-group", "media"]);
  var PAINT_ROLES = /* @__PURE__ */ new Set(["background", "border", "surface"]);
  var hasChildren = (node) => "children" in node && node.children.length > 0;
  function resolveRole(node, token, pos, parentRole, ctxScope) {
    if (pos.isOverlay) return "overlay";
    if (isModalLike(node, pos, ctxScope)) return "modal";
    if (ctxScope === "progress" && isBarFill(node)) return "indicator";
    if (ctxScope === "tab" && (node.type === "FRAME" || node.type === "RECTANGLE") && isThinColorStrip(node)) return "indicator";
    if (ctxScope === "field" && isInputBox(node)) return "input";
    if (isButtonLike(node)) return isChipLike(node) ? "chip" : "button";
    if (isNavLike(node, pos.depth, ctxScope)) return "nav";
    if (isLogoLike(node, pos, ctxScope)) return "logo";
    if (isActionsLike(node, pos, ctxScope)) return "actions";
    if (isStatusDot(node, pos)) return "status";
    if (isThumbnail(node, pos, ctxScope)) return "thumbnail";
    if (parentRole !== "list" && parentRole !== "nav" && !atRegionSlot(node, pos, ctxScope, parentRole) && isTextButtonLike(node)) return "button";
    if (isIconFrameNode(node)) return "icon";
    if ((token == null ? void 0 : token.roleLeaf) && !(hasChildren(node) && PAINT_ROLES.has(token.roleLeaf))) return token.roleLeaf;
    switch (node.type) {
      case "VECTOR":
      case "BOOLEAN_OPERATION":
      case "STAR":
      case "POLYGON":
        return "icon";
      case "LINE":
        return "divider";
      case "RECTANGLE":
      case "ELLIPSE": {
        if (isThin(node)) return "divider";
        if (hasImageFill(node)) return node.type === "ELLIPSE" ? "avatar" : "image";
        if (hasVisibleFill(node)) return "background";
        if (hasVisibleStroke(node)) return "border";
        return "shape";
      }
      case "FRAME":
      case "GROUP":
      case "SECTION": {
        const kids = "children" in node ? node.children : [];
        if (kids.length === 0) {
          if (hasImageFill(node)) return "image";
          if (hasColorFill(node)) return node.type === "FRAME" && isThinStrip(node) ? "divider" : "swatch";
          const emptyRegion = regionRole(node, pos, ctxScope, parentRole);
          if (emptyRegion) return emptyRegion;
          return "container";
        }
        if (isProgressLike(node, kids)) return "progress";
        if (isCardLike(node, kids)) return parentRole === "list" ? "article" : "card";
        if (isFigureLike(node, kids)) return "figure";
        if (isFieldLike(node, kids)) return "field";
        if (isListLike(node, kids)) return "list";
        if (parentRole === "list" || parentRole === "nav") return "item";
        if (parentRole === "main" && pos.regionIndex === 0 && pos.parentLayout === "vertical") return "hero";
        const region = regionRole(node, pos, ctxScope, parentRole);
        if (region) return region;
        if (isPageSection(pos, ctxScope)) return "section";
        if (node.type !== "SECTION") {
          if (isRowLike(node, kids)) return "row";
          if (isTextGroupLike(node, kids)) return "text-group";
          if (isMediaLike(kids)) return "media";
        }
        if (kids.length === 1) return "wrapper";
        const lm = node.layoutMode;
        return lm === "HORIZONTAL" ? "stack-x" : lm === "VERTICAL" ? "stack-y" : "container";
      }
      default:
        return kebab(node.type);
    }
  }
  function highConfidenceRole(node) {
    if (isButtonLike(node)) return isChipLike(node) ? "chip" : "button";
    if (isNavLike(node, 0)) return "nav";
    if ("children" in node && isContainerType(node)) {
      const kids = node.children;
      if (kids.length) {
        if (isProgressLike(node, kids)) return "progress";
        if (isCardLike(node, kids)) return "card";
        if (isFigureLike(node, kids)) return "figure";
        if (isFieldLike(node, kids)) return "field";
        if (isListLike(node, kids)) return "list";
      }
    }
    return null;
  }
  var FIELD_ORDER = [
    "fills",
    "strokes",
    "width",
    "height",
    "topLeftRadius",
    "itemSpacing",
    "paddingLeft",
    "paddingTop"
  ];
  async function primaryToken(node) {
    const bv = node.boundVariables;
    if (!bv) return null;
    for (const field of FIELD_ORDER) {
      const id = firstAliasId(bv[field]);
      if (id) {
        const v = await figma.variables.getVariableByIdAsync(id);
        if (v) {
          const token = parseTokenName(v.name);
          if (!token.primitive) return token;
        }
      }
    }
    return null;
  }
  function firstAliasId(entry) {
    var _a;
    if (!entry) return void 0;
    if (Array.isArray(entry)) return (_a = entry[0]) == null ? void 0 : _a.id;
    return entry.id;
  }
  function dims2(node) {
    if (!("width" in node) || !("height" in node)) return null;
    const w = node.width;
    const h = node.height;
    if (typeof w !== "number" || typeof h !== "number") return null;
    return { w, h };
  }
  function isThin(node) {
    const d = dims2(node);
    if (!d) return false;
    const min = Math.min(d.w, d.h);
    const max = Math.max(d.w, d.h);
    if (min <= 0) return false;
    return min <= 2 || max / min >= 25;
  }
  function isThinStrip(node) {
    const d = dims2(node);
    return !!d && isThin(node) && Math.min(d.w, d.h) <= 4;
  }
  function isThinColorStrip(node) {
    if ("children" in node && node.children.length > 0) return false;
    if (hasImageFill(node) || !hasColorFill(node)) return false;
    return isThinStrip(node);
  }
  function paints(node, field) {
    if (!(field in node)) return null;
    const p = node[field];
    return Array.isArray(p) ? p : null;
  }
  function layoutOf(node) {
    if (!("layoutMode" in node)) return null;
    const m = node.layoutMode;
    return m === "VERTICAL" ? "vertical" : m === "HORIZONTAL" ? "horizontal" : null;
  }
  function isContainerType(node) {
    return node.type === "FRAME" || node.type === "GROUP" || node.type === "SECTION";
  }
  function isSkippedSubtree(node) {
    return node.type === "INSTANCE" || node.type === "COMPONENT" || node.type === "COMPONENT_SET" || node.locked;
  }
  function isLandmarkCandidate(node) {
    if (!isContainerType(node)) return false;
    if (node.locked) return false;
    return node.visible !== false;
  }
  function isPageSplit(pos) {
    const p = pos.parentDims;
    return !!p && p.w >= 768 && p.h >= 400;
  }
  function isPageParent(pos, ctxScope) {
    if (ctxScope && isScopeRole(ctxScope)) return false;
    const p = pos.parentDims;
    if (!p || p.w <= 0 || p.h <= 0) return true;
    return isPageSized(p);
  }
  function isPageSized(p) {
    if (!p || p.w <= 0 || p.h <= 0) return false;
    if (p.w < 768) return p.h >= 700 && p.h >= p.w;
    return p.h >= 800;
  }
  function regionRole(node, pos, ctxScope, parentRole) {
    const underMain = parentRole === "main";
    if (pos.depth !== 1 && !underMain || !isContainerType(node)) return null;
    if (pos.regionIndex < 0) return null;
    if (pos.parentLayout === "horizontal") {
      if (!isPageParent(pos, ctxScope)) return null;
      if (!isPageSplit(pos)) return null;
      return pos.widthFrac != null && pos.widthFrac <= 0.35 ? "aside" : null;
    }
    if (pos.parentLayout !== "vertical" || pos.regionTotal < 2) return null;
    if (!isPageParent(pos, ctxScope)) return null;
    const tall = pos.heightFrac != null && pos.heightFrac > 0.5;
    if (pos.regionIndex === 0 && !underMain) return tall ? "main" : "header";
    if (pos.regionIndex === pos.regionTotal - 1) return tall ? "main" : "footer";
    if (underMain) return "section";
    if (pos.regionTotal === 3) return "main";
    return null;
  }
  function isPageSection(pos, ctxScope) {
    return pos.depth === 1 && pos.parentLayout === "vertical" && pos.regionIndex > 0 && pos.regionTotal > 3 && pos.regionIndex < pos.regionTotal - 1 && isPageParent(pos, ctxScope);
  }
  function isButtonLike(node) {
    if (node.type !== "FRAME") return false;
    if (layoutOf(node) === null) return false;
    if (!(cornerRadiusOf(node) > 0)) return false;
    if (!hasVisibleFill(node) && !hasVisibleStroke(node)) return false;
    if (!hasDirectText(node)) return false;
    const d = dims2(node);
    if (d && d.h > 80) return false;
    return true;
  }
  function cornerRadiusOf(node) {
    const r = node.cornerRadius;
    if (typeof r === "number") return r;
    const tl = node.topLeftRadius;
    return typeof tl === "number" ? tl : 0;
  }
  function hasDirectText(node) {
    return "children" in node && node.children.some((c) => c.type === "TEXT");
  }
  function isChipLike(node) {
    const d = dims2(node);
    if (!d || d.h > 28) return false;
    return cornerRadiusOf(node) >= d.h / 2 - 1;
  }
  function hasDropShadow(node) {
    const eff = node.effects;
    return Array.isArray(eff) && eff.some((e) => e.visible !== false && e.type === "DROP_SHADOW");
  }
  function isCardLike(node, kids) {
    if (node.type !== "FRAME") return false;
    if (kids.length < 2) return false;
    if (!hasVisibleFill(node) && !hasVisibleStroke(node)) return false;
    return cornerRadiusOf(node) > 0 || hasDropShadow(node);
  }
  var LIST_ITEM_TYPES = /* @__PURE__ */ new Set(["FRAME", "GROUP", "INSTANCE", "COMPONENT", "RECTANGLE", "ELLIPSE"]);
  function isListLike(node, kids) {
    var _a;
    if (node.type !== "FRAME") return false;
    if (layoutOf(node) === null) return false;
    if (kids.length < 3) return false;
    const counts = /* @__PURE__ */ new Map();
    for (const k of kids) counts.set(k.type, ((_a = counts.get(k.type)) != null ? _a : 0) + 1);
    let domType = null;
    let domCount = 0;
    for (const [t2, c] of counts) if (c > domCount) {
      domCount = c;
      domType = t2;
    }
    if (!domType || domCount / kids.length < 0.8) return false;
    if (!LIST_ITEM_TYPES.has(domType)) return false;
    if (isSectionStack(kids)) return false;
    return dimsSimilar(kids);
  }
  function isSectionStack(kids) {
    return kids.every((k) => {
      const d = dims2(k);
      return !!d && d.w >= 768 && d.h >= 400;
    });
  }
  function dimsSimilar(kids) {
    const ws = [];
    const hs = [];
    for (const k of kids) {
      const d = dims2(k);
      if (!d) return false;
      ws.push(d.w);
      hs.push(d.h);
    }
    return ratioWithin(ws, 1.5) && ratioWithin(hs, 1.25);
  }
  function ratioWithin(xs, max) {
    const mn = Math.min(...xs);
    const mx = Math.max(...xs);
    if (mn <= 0) return false;
    return mx / mn <= max;
  }
  function isVisible(node) {
    return node.visible !== false;
  }
  function isFieldLike(node, kids) {
    if (node.type !== "FRAME") return false;
    if (layoutOf(node) !== "vertical") return false;
    const shown = kids.filter(isVisible);
    if (shown.length < 2 || shown.length > 4) return false;
    const hasLabel = shown.some((k) => k.type === "TEXT" && shortOneLine(k));
    const hasInput = shown.some(isInputBox);
    const shortBlocks = shown.every((k) => {
      var _a, _b;
      return k.type === "TEXT" || ((_b = (_a = dims2(k)) == null ? void 0 : _a.h) != null ? _b : Infinity) <= 72;
    });
    return hasLabel && hasInput && shortBlocks;
  }
  function isInputBox(node) {
    if (node.type !== "FRAME" && node.type !== "RECTANGLE") return false;
    if (hasImageFill(node)) return false;
    if (!hasVisibleStroke(node) && !hasColorFill(node)) return false;
    const d = dims2(node);
    if (!d || d.h <= 0 || d.h > 72) return false;
    return d.w >= d.h * 2;
  }
  function isNavLike(node, depth, ctxScope = null) {
    if (node.type !== "FRAME") return false;
    if (layoutOf(node) !== "horizontal") return false;
    if (depth > 1 && ctxScope !== "header") return false;
    if (cornerRadiusOf(node) > 0 && (hasVisibleFill(node) || hasVisibleStroke(node))) return false;
    const kids = node.children;
    if (kids.length < 3) return false;
    const d = dims2(node);
    if (d && d.h > 80) return false;
    return kids.every((k) => k.type === "TEXT" || k.type === "FRAME" && hasDirectText(k));
  }
  function isLogoLike(node, pos, ctxScope) {
    if (ctxScope !== "header" || pos.ctxDepth > 1) return false;
    if (!isContainerType(node) || !("children" in node) || node.children.length === 0) return false;
    if (pos.parentLayout === "vertical") return false;
    const d = dims2(node);
    if (!d || d.h > 80 || d.w > 320) return false;
    const box = boxIn(node, pos);
    const pw = parentWidth(pos);
    if (!box || pw == null) return false;
    for (const s of pos.siblings) {
      if (s === node || !isVisible(s)) continue;
      const sb = boxIn(s, pos);
      if (!sb) return false;
      if (sb.x < box.x - 1) return false;
    }
    if (box.x + box.w / 2 > pw / 3) return false;
    return countVisibleTexts(node, 2) < 2;
  }
  function parentWidth(pos) {
    const w = pos.parentNode ? pos.parentNode.width : void 0;
    return typeof w === "number" && w > 0 ? w : null;
  }
  function boxIn(node, pos) {
    const x = node.x;
    const w = node.width;
    if (typeof x !== "number" || typeof w !== "number") return null;
    let ox = 0;
    if (pos.parentNode && pos.parentNode.type === "GROUP") {
      const px = pos.parentNode.x;
      if (typeof px !== "number") return null;
      ox = px;
    }
    return { x: x - ox, w };
  }
  function countVisibleTexts(node, limit) {
    let n = 0;
    const walk3 = (x) => {
      if (n >= limit || !isVisible(x)) return;
      if (x.type === "TEXT") {
        n++;
        return;
      }
      if ("children" in x) for (const c of x.children) walk3(c);
    };
    if ("children" in node) for (const c of node.children) walk3(c);
    return n;
  }
  function isActionsLike(node, pos, ctxScope) {
    if (ctxScope !== "header" || pos.ctxDepth > 1) return false;
    if (node.type !== "FRAME" || layoutOf(node) !== "horizontal") return false;
    if (pos.total < 2) return false;
    const box = boxIn(node, pos);
    if (!box || parentWidth(pos) == null) return false;
    for (const s of pos.siblings) {
      if (s === node || !isVisible(s)) continue;
      const sb = boxIn(s, pos);
      if (!sb) return false;
      if (sb.x + sb.w > box.x + box.w + 1) return false;
    }
    const kids = node.children;
    if (kids.length < 2 || kids.length > 3) return false;
    const d = dims2(node);
    if (d && d.h > 80) return false;
    return kids.every((k) => k.type === "TEXT" || k.type === "FRAME" && (isButtonLike(k) || hasDirectText(k)));
  }
  function isFigureLike(node, kids) {
    if (node.type !== "FRAME") return false;
    if (kids.length < 2 || kids.length > 3) return false;
    const hasImg = kids.some((k) => hasImageFill(k));
    const hasCaption = kids.some((k) => k.type === "TEXT");
    return hasImg && hasCaption;
  }
  function isScrimPaint(node) {
    const f = paints(node, "fills");
    if (!f) return false;
    const solid = f.filter((p) => p.visible !== false && p.type === "SOLID");
    if (!solid.length) return false;
    const o = node.opacity;
    if (typeof o === "number" && o < 1) return true;
    return solid.some((p) => typeof p.opacity === "number" && p.opacity < 1);
  }
  function coversParent(node, parentDims) {
    if (!parentDims || parentDims.w <= 0 || parentDims.h <= 0) return false;
    const d = dims2(node);
    if (!d) return false;
    return d.w / parentDims.w >= 0.95 && d.h / parentDims.h >= 0.95;
  }
  function isScrimLike(node, parentDims) {
    if (node.type !== "FRAME" && node.type !== "RECTANGLE") return false;
    if (!coversParent(node, parentDims)) return false;
    return isScrimPaint(node);
  }
  function isInsetPanel(node, parentDims) {
    if (!parentDims || parentDims.w <= 0 || parentDims.h <= 0) return false;
    const d = dims2(node);
    return !!d && d.w / parentDims.w <= 0.9 && d.h / parentDims.h <= 0.9;
  }
  function isPanelLike(node, parentDims) {
    if (!isContainerType(node)) return false;
    if (!("children" in node) || node.children.length === 0) return false;
    if (!hasVisibleFill(node) && !hasVisibleStroke(node)) return false;
    return isInsetPanel(node, parentDims);
  }
  function findOverlayIndex(nodes, parentDims) {
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (!isScrimLike(n, parentDims)) continue;
      for (let j = i + 1; j < nodes.length; j++) if (isPanelLike(nodes[j], parentDims)) return i;
      if ("children" in n && n.children.some((k) => isPanelLike(k, dims2(n)))) return i;
    }
    return -1;
  }
  function isModalLike(node, pos, ctxScope) {
    if (!pos.afterOverlay && ctxScope !== "overlay") return false;
    return isPanelLike(node, pos.parentDims);
  }
  function isProgressLike(node, kids) {
    if (node.type !== "FRAME") return false;
    if (kids.length < 1 || kids.length > 2) return false;
    if (kids.some((k) => k.type === "TEXT")) return false;
    const d = dims2(node);
    if (!d || d.h < 4 || d.h > 24) return false;
    if (d.w < d.h * 4) return false;
    if (cornerRadiusOf(node) * 2 < d.h) return false;
    if (!hasVisibleFill(node) && !hasVisibleStroke(node)) return false;
    return kids.some((k) => {
      const kd = dims2(k);
      return !!kd && kd.w > 0 && kd.w < d.w && kd.h <= d.h + 1 && hasColorFill(k);
    });
  }
  function isBarFill(node) {
    if (node.type !== "RECTANGLE" && node.type !== "FRAME") return false;
    if ("children" in node && node.children.length > 0) return false;
    if (hasImageFill(node) || !hasColorFill(node)) return false;
    const d = dims2(node);
    return !!d && d.h > 0 && d.h <= 24 && d.w >= d.h * 2;
  }
  var THUMB_CONTEXTS = /* @__PURE__ */ new Set(["card", "article", "item", "list", "figure"]);
  function isThumbnail(node, pos, ctxScope) {
    if (!ctxScope || !THUMB_CONTEXTS.has(ctxScope)) return false;
    if (node.type === "ELLIPSE") return false;
    if (!hasImageFill(node)) return false;
    const d = dims2(node);
    if (!d) return false;
    if (Math.max(d.w, d.h) <= 96) return true;
    const p = pos.parentDims;
    return !!p && p.w > 0 && p.h > 0 && d.w * d.h / (p.w * p.h) <= 0.35;
  }
  function isStatusDot(node, pos) {
    if (!pos.hasAvatarSibling) return false;
    if (node.type !== "ELLIPSE" && node.type !== "RECTANGLE" && node.type !== "FRAME") return false;
    if (hasImageFill(node) || !hasColorFill(node)) return false;
    const d = dims2(node);
    if (!d || d.w <= 0 || d.h <= 0) return false;
    if (Math.max(d.w, d.h) > 16) return false;
    return node.type === "ELLIPSE" || cornerRadiusOf(node) >= Math.min(d.w, d.h) / 2 - 1;
  }
  var ICONISH_VECTORS = /* @__PURE__ */ new Set(["VECTOR", "BOOLEAN_OPERATION", "STAR", "POLYGON"]);
  function isIconFrameNode(node) {
    if (node.type !== "FRAME" && node.type !== "GROUP") return false;
    if (!isIconFrame(node)) return false;
    const hasRealVector = (x) => "children" in x && x.children.some((c) => VECTOR_TYPES.has(c.type) && c.type !== "LINE" || hasRealVector(c));
    return hasRealVector(node);
  }
  function isIconish(node) {
    if (ICONISH_VECTORS.has(node.type)) return true;
    if (isIconFrameNode(node)) return true;
    if (node.type === "INSTANCE") {
      const d = dims2(node);
      return !!d && d.w <= 48 && d.h <= 48;
    }
    return false;
  }
  var EMITTED = new Set(EMITTED_ROLES);
  var STRUCT_FALLBACK_NAMES = /* @__PURE__ */ new Set(["container", "wrapper", "stack-x", "stack-y", "shape"]);
  function isMeaninglessIconName(node, rootPrefix) {
    const name = node.name;
    if (isDefaultName(name)) return true;
    if (STRUCT_FALLBACK_NAMES.has(name)) return true;
    const toks = kebab(name).split("-").filter(Boolean);
    if (toks.length === 1 && toks[0] === "icon") return true;
    const role = readPluginKey(node, ROLE_KEY);
    return !!role && namedByPlugin(name, role, rootPrefix);
  }
  function readPluginKey(node, key) {
    try {
      const fn = node.getPluginData;
      return typeof fn === "function" ? fn.call(node, key) || "" : "";
    } catch (e) {
      return "";
    }
  }
  function namedByPlugin(name, role, rootPrefix) {
    const toks = kebab(name).split("-").filter(Boolean);
    const rt = kebab(role).split("-").filter(Boolean);
    if (!rt.length || toks.length < rt.length) return false;
    if (toks.slice(toks.length - rt.length).join("-") !== rt.join("-")) return false;
    const head = toks.slice(0, toks.length - rt.length);
    return head.every((t2, i) => EMITTED.has(t2) || i === 0 && rootPrefix != null && t2 === rootPrefix);
  }
  var HINT_EN = {
    gnb: "nav",
    lnb: "nav",
    snb: "nav",
    nav: "nav",
    navigation: "nav",
    navbar: "nav",
    menubar: "nav",
    breadcrumb: "breadcrumb",
    breadcrumbs: "breadcrumb",
    tabs: "tabs",
    tabbar: "tabs",
    tablist: "tabs",
    tabmenu: "tabs",
    tabgroup: "tabs",
    tab: "tab",
    divider: "divider",
    separator: "divider",
    button: "button",
    btn: "button",
    cta: "button"
  };
  var ko = (hex) => hex.split(" ").map((c) => String.fromCharCode(parseInt(c, 16))).join("");
  var TAB_KO = ko("D0ED");
  var HINT_KO = [
    [ko("B0B4 BE44"), "nav"],
    // 내비
    [ko("B124 BE44"), "nav"],
    // 네비
    [ko("B124 BE44 AC8C C774 C158"), "nav"],
    // 네비게이션
    [ko("B0B4 BE44 AC8C C774 C158"), "nav"],
    // 내비게이션
    [ko("ACBD B85C"), "breadcrumb"],
    // 경로
    [ko("D0ED BA54 B274"), "tabs"],
    // 탭메뉴
    [ko("D0ED"), "tab"],
    // 탭
    [ko("AD6C BD84 C120"), "divider"],
    // 구분선
    [ko("BC84 D2BC"), "button"]
    // 버튼
  ].sort((a, b) => b[0].length - a[0].length);
  var NAV_EN = new Set(Object.keys(HINT_EN).filter((k) => HINT_EN[k] === "nav"));
  var NAV_KO = HINT_KO.filter(([, r]) => r === "nav").map(([w]) => w);
  var NEUTRAL_TAILS = /* @__PURE__ */ new Set(["menu", "bar", "area", "wrap", "box"]);
  var KO_TAILS = /* @__PURE__ */ new Set([ko("BA54 B274"), ko("C601 C5ED"), ko("BC14")]);
  var HANGUL = /[\u1100-\u11FF\u3131-\u318E\uAC00-\uD7A3]/;
  var NON_WORD = /[^0-9A-Za-z\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF\u1100-\u11FF\u3040-\u30FF\u3131-\u318E\u4E00-\u9FFF\uAC00-\uD7A3]+/;
  var HINT_WEAK_ROLES = /* @__PURE__ */ new Set(["container", "wrapper", "stack-x", "stack-y", "section", "row", "text-group", "media", "swatch", "item"]);
  function nameHintRole(name) {
    var _a;
    const segs = name.split(NON_WORD).filter(Boolean);
    const lastSeg2 = (_a = segs[segs.length - 1]) != null ? _a : "";
    if (!HANGUL.test(lastSeg2)) {
      const w = kebab(name).split("-").filter(Boolean);
      while (w.length && /^[\d_]+$/.test(w[w.length - 1])) w.pop();
      const last = w[w.length - 1];
      if (last) {
        if (HINT_EN[last]) return HINT_EN[last];
        const prev = w[w.length - 2];
        if (prev && NEUTRAL_TAILS.has(last) && NAV_EN.has(prev)) return "nav";
        if (prev === "tab" && (NEUTRAL_TAILS.has(last) || last === "list" || last === "group")) return "tabs";
      }
    }
    return koreanHint(segs);
  }
  function koreanHint(segs) {
    const last = segs[segs.length - 1];
    if (!last) return null;
    for (const [word, role] of HINT_KO) if (last.endsWith(word)) return role;
    if (KO_TAILS.has(last) && segs.length >= 2) {
      const prev = segs[segs.length - 2];
      if (HANGUL.test(prev)) {
        if (NAV_KO.some((k) => prev.endsWith(k))) return "nav";
        if (prev.endsWith(TAB_KO)) return "tabs";
      } else {
        const p = prev.toLowerCase();
        if (NAV_EN.has(p)) return "nav";
        if (p === "tab") return "tabs";
      }
    }
    return null;
  }
  function hintRole(node, rootPrefix) {
    const h = nameHintRole(node.name);
    if (!h) return null;
    const stored = readPluginKey(node, ROLE_KEY);
    if (stored && stored !== h && namedByPlugin(node.name, stored, rootPrefix)) return null;
    return h;
  }
  function atRegionSlot(node, pos, ctxScope, parentRole) {
    if (!isContainerType(node)) return false;
    if (parentRole === "main" && pos.regionIndex === 0 && pos.parentLayout === "vertical") return true;
    if (regionRole(node, pos, ctxScope, parentRole)) return true;
    return isPageSection(pos, ctxScope);
  }
  function isTextButtonLike(node) {
    if (node.type !== "FRAME" || layoutOf(node) === null) return false;
    const d = dims2(node);
    if (!d || d.h > 64 || d.w > 400) return false;
    const kids = node.children;
    const texts = kids.filter((k) => k.type === "TEXT" && isVisible(k));
    if (texts.length !== 1 || !shortOneLine(texts[0])) return false;
    const others = kids.filter((k) => k !== texts[0]);
    if (!others.every((k) => isIconish(k))) return false;
    if (others.length > 0) return true;
    if (hasVisibleFill(node) || hasVisibleStroke(node)) return true;
    const pl = node.paddingLeft;
    const pr = node.paddingRight;
    return typeof pl === "number" && typeof pr === "number" && pl >= 4 && pr >= 4;
  }
  var DIGITS_ONLY = /^[\d\s/]+$/;
  var isDigitsText = (t2) => typeof t2.characters === "string" && DIGITS_ONLY.test(t2.characters);
  function sameLine(a, b) {
    const ay = a.y, by = b.y;
    const da = dims2(a), db = dims2(b);
    if (typeof ay !== "number" || typeof by !== "number" || !da || !db) return false;
    return Math.max(ay, by) < Math.min(ay + da.h, by + db.h);
  }
  function xOf(n) {
    const x = n.x;
    return typeof x === "number" ? x : 0;
  }
  function sideBySide(node, items) {
    if (layoutOf(node) === "horizontal") return true;
    if (layoutOf(node) === "vertical") return false;
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) if (!sameLine(items[i], items[j])) return false;
    return true;
  }
  function isRowLike(node, kids) {
    const shown = kids.filter(isVisible);
    if (shown.length !== 2) return false;
    const d = dims2(node);
    if (!d || d.h > 64 || d.w < d.h * 2.5) return false;
    if (!sideBySide(node, shown)) return false;
    const [left, right] = xOf(shown[0]) <= xOf(shown[1]) ? [shown[0], shown[1]] : [shown[1], shown[0]];
    if (left.type !== "TEXT" || !shortOneLine(left)) return false;
    if (right.type === "TEXT") {
      if (isDigitsText(left) && isDigitsText(right)) return false;
      return true;
    }
    if (right.type !== "INSTANCE" && right.type !== "FRAME" && right.type !== "GROUP") return false;
    const n = countVisibleTexts(right, 3);
    return n >= 1 && n <= 2;
  }
  function isTextGroupLike(node, kids) {
    const shown = kids.filter(isVisible);
    if (shown.length < 2 || !shown.every((k) => k.type === "TEXT")) return false;
    if (shown.length >= 3 && sideBySide(node, shown)) return false;
    if (shown.every(isDigitsText)) return false;
    return true;
  }
  function isMediaLike(kids) {
    const shown = kids.filter(isVisible);
    const isPhoto = (k) => hasImageFill(k) && (k.type === "RECTANGLE" || k.type === "FRAME" && !k.children.some(isVisible));
    if (!shown.some(isPhoto)) return false;
    return shown.every((k) => isPhoto(k) || isIconish(k));
  }

  // src/lib/themeGen.ts
  var DARK_L_MIN = 0.18;
  var DARK_L_MAX = 0.97;
  function darkValueForLight(hex) {
    const lch = hexToOklch(hex);
    const l = DARK_L_MIN + (1 - lch.l) * (DARK_L_MAX - DARK_L_MIN);
    return oklchToHex(clampToGamut({ l, c: lch.c, h: lch.h }));
  }
  var DARK_PREFIX = "dark/";
  function isDarkGlobalName(name) {
    return name.startsWith(DARK_PREFIX);
  }

  // src/lib/themeApply.ts
  var DARK_MODE_NAME = "Dark";
  var DARK_FILL_KEY = "dsl.darkFill";
  var MAX_ALIAS_HOPS = 8;
  function isVariableAlias(raw) {
    return !!raw && typeof raw === "object" && "type" in raw && raw.type === "VARIABLE_ALIAS";
  }
  function isColor(raw) {
    return !!raw && typeof raw === "object" && "r" in raw && "g" in raw && "b" in raw;
  }
  function hex8(raw) {
    if (!isColor(raw)) return null;
    const h = (c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, "0");
    const a = typeof raw.a === "number" ? raw.a : 1;
    return `#${h(raw.r)}${h(raw.g)}${h(raw.b)}${h(a)}`.toUpperCase();
  }
  function cellKey(raw) {
    if (isVariableAlias(raw)) return `alias:${raw.id}`;
    return hex8(raw);
  }
  function rgbaOfHex8(h) {
    const n = parseInt(h.slice(1, 7), 16);
    const a = parseInt(h.slice(7, 9), 16);
    return { r: (n >> 16 & 255) / 255, g: (n >> 8 & 255) / 255, b: (n & 255) / 255, a: a / 255 };
  }
  function findModeByName(modes, name, exceptModeId) {
    const key = name.trim().toLowerCase();
    return modes.find((m) => m.modeId !== exceptModeId && m.name.trim().toLowerCase() === key);
  }
  function ensureDarkMode(collection) {
    const existing = findModeByName(collection.modes, DARK_MODE_NAME, collection.defaultModeId);
    if (existing) return { modeId: existing.modeId, created: false };
    const modeId = collection.addMode(DARK_MODE_NAME);
    return { modeId, created: true };
  }
  function oldDarkMode(semantic) {
    return semantic ? findModeByName(semantic.modes, DARK_MODE_NAME, semantic.defaultModeId) : void 0;
  }
  function readDarkFill(v) {
    try {
      const fn = v.getPluginData;
      const raw = typeof fn === "function" ? fn.call(v, DARK_FILL_KEY) : "";
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (e) {
      return {};
    }
  }
  function writeDarkFill(v, rec) {
    var _a;
    (_a = v.setPluginData) == null ? void 0 : _a.call(v, DARK_FILL_KEY, JSON.stringify(rec));
  }
  function darkTargets(global, vars, fromModeId) {
    return vars.filter(
      (v) => v.variableCollectionId === global.id && v.resolvedType === "COLOR" && !isManualVar(v) && !isDarkGlobalName(v.name) && isColor(v.valuesByMode[fromModeId])
    );
  }
  function countDarkUnfilled(cols, vars) {
    const global = ownedCollection(cols, "global");
    if (!global || global.modes.length < 2) return 0;
    const modeIds = new Set(global.modes.map((m) => m.modeId));
    let n = 0;
    for (const v of darkTargets(global, vars, global.defaultModeId)) {
      const rec = readDarkFill(v);
      const filled = Object.entries(rec).some(([to, e]) => {
        if (!modeIds.has(to) || !e) return false;
        if (e.by === "user") return true;
        return e.by === "calc" && e.f === global.defaultModeId && hex8(v.valuesByMode[e.f]) === e.l;
      });
      if (!filled) n++;
    }
    return n;
  }
  function darkPrereq(cols, vars) {
    var _a, _b;
    const global = ownedCollection(cols, "global");
    const semantic = ownedCollection(cols, "semantic");
    const darkOld = !!oldDarkMode(semantic);
    return {
      hasDarkMode: ((_a = global == null ? void 0 : global.modes.length) != null ? _a : 0) > 1 || darkOld,
      darkUnfilled: countDarkUnfilled(cols, vars),
      darkOld,
      // 옛 구조인데 Semantic 모드가 셋 이상 — 옮기기를 거절하는 경우(띠 dark.needMigrateManual).
      darkOldManual: darkOld && ((_b = semantic == null ? void 0 : semantic.modes.length) != null ? _b : 0) >= 3
    };
  }
  function resolveColor(raw, byId, defOf) {
    var _a;
    let cur = raw;
    const seen = /* @__PURE__ */ new Set();
    for (let hop = 0; hop <= MAX_ALIAS_HOPS; hop++) {
      if (isColor(cur)) return { r: cur.r, g: cur.g, b: cur.b, a: typeof cur.a === "number" ? cur.a : 1 };
      if (!isVariableAlias(cur) || hop === MAX_ALIAS_HOPS || seen.has(cur.id)) return null;
      seen.add(cur.id);
      const tv = byId.get(cur.id);
      if (!tv) return null;
      cur = tv.valuesByMode[(_a = defOf.get(tv.variableCollectionId)) != null ? _a : ""];
    }
    return null;
  }
  function unusedDarkCopies(global, cols, vars, skip2) {
    var _a;
    const modesOf = new Map(cols.map((c) => [c.id, c.modes.map((m) => m.modeId)]));
    const referenced = /* @__PURE__ */ new Set();
    for (const v of vars) {
      for (const m of (_a = modesOf.get(v.variableCollectionId)) != null ? _a : []) {
        if (skip2 && v.variableCollectionId === skip2.collectionId && m === skip2.modeId) continue;
        const raw = v.valuesByMode[m];
        if (isVariableAlias(raw)) referenced.add(raw.id);
      }
    }
    return vars.filter((v) => v.variableCollectionId === global.id && isDarkGlobalName(v.name) && !isManualVar(v) && !referenced.has(v.id));
  }
  var CHANGED_FLAG = "__darkChanged";
  function darkChangedBeforeError(e) {
    return !!e && typeof e === "object" && e[CHANGED_FLAG] === true;
  }
  async function generateDarkMode(migrate) {
    var _a, _b, _c, _d;
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const global = ownedCollection(cols, "global");
    if (!global) return { filled: 0, kept: 0, targets: 0, error: t("dark.errNoCol") };
    const semantic = ownedCollection(cols, "semantic");
    const oldMode = oldDarkMode(semantic);
    if (oldMode && semantic && semantic.modes.length >= 3) return { filled: 0, kept: 0, targets: 0, error: t("dark.errMigrateModes") };
    const from = global.defaultModeId;
    const defMode = global.modes.find((m) => m.modeId === from);
    if (defMode && findModeByName([defMode], DARK_MODE_NAME) && !findModeByName(global.modes, DARK_MODE_NAME, from)) {
      return { filled: 0, kept: 0, targets: 0, error: t("dark.errSameMode") };
    }
    let vars = await figma.variables.getLocalVariablesAsync();
    if (oldMode && semantic && !migrate) {
      const removeDark = unusedDarkCopies(global, cols, vars, { collectionId: semantic.id, modeId: oldMode.modeId }).length;
      return { filled: 0, kept: 0, targets: 0, needMigrate: { removeDark, mode: oldMode.name } };
    }
    const doMigrate = !!(oldMode && semantic);
    const byId = new Map(vars.map((v) => [v.id, v]));
    const defOf = new Map(cols.map((c) => [c.id, c.defaultModeId]));
    const cand = /* @__PURE__ */ new Map();
    const failedNames = [];
    if (doMigrate && semantic && oldMode) {
      for (const s of vars) {
        if (s.variableCollectionId !== semantic.id || s.resolvedType !== "COLOR") continue;
        const L = s.valuesByMode[semantic.defaultModeId];
        const D = s.valuesByMode[oldMode.modeId];
        if (D === void 0 || D === null) continue;
        if (isVariableAlias(L) && isVariableAlias(D) && L.id === D.id) continue;
        if (!isVariableAlias(L) && !isVariableAlias(D) && hex8(L) !== null && hex8(L) === hex8(D)) continue;
        if (!isVariableAlias(L)) {
          const dh = hex8(resolveColor(D, byId, defOf));
          if (dh !== null && hex8(L) !== null && dh === hex8(L)) continue;
          failedNames.push(s.name);
          continue;
        }
        const x = byId.get(L.id);
        if (!x || x.variableCollectionId !== global.id || x.resolvedType !== "COLOR" || isManualVar(x) || !isColor(x.valuesByMode[from])) {
          failedNames.push(s.name);
          continue;
        }
        const col = resolveColor(D, byId, defOf);
        const h = col ? hex8(col) : null;
        if (!h) {
          failedNames.push(s.name);
          continue;
        }
        const arr = (_a = cand.get(x.id)) != null ? _a : [];
        arr.push({ hex: h, sem: s.name });
        cand.set(x.id, arr);
      }
    }
    const pick = /* @__PURE__ */ new Map();
    const splitNames = [];
    for (const [xid, arr] of cand) {
      const counts = /* @__PURE__ */ new Map();
      for (const c of arr) counts.set(c.hex, ((_b = counts.get(c.hex)) != null ? _b : 0) + 1);
      const max = Math.max(...counts.values());
      const sorted = arr.slice().sort((a, b) => a.sem < b.sem ? -1 : a.sem > b.sem ? 1 : 0);
      const chosen = sorted.find((c) => counts.get(c.hex) === max).hex;
      pick.set(xid, chosen);
      if (counts.size > 1) splitNames.push(byId.get(xid).name);
    }
    let to;
    let modeCreated = false;
    try {
      ensureOwnedCollection(cols, "global");
      const ensured = ensureDarkMode(global);
      to = ensured.modeId;
      modeCreated = ensured.created;
    } catch (e) {
      const why = e instanceof Error ? e.message : String(e);
      return { filled: 0, kept: 0, targets: 0, error: t("dark.errAddMode", { why: why || t("dark.errAddModePlan") }) };
    }
    let changed = modeCreated;
    try {
      vars = await figma.variables.getLocalVariablesAsync();
      const modeIds = new Set(global.modes.map((m) => m.modeId));
      const written = /* @__PURE__ */ new Set();
      for (const [xid, h] of pick) {
        const x = byId.get(xid);
        const prev = readDarkFill(x)[to];
        if ((prev == null ? void 0 : prev.by) === "user" && prev.d !== h) continue;
        x.setValueForMode(to, rgbaOfHex8(h));
        const rec = pruneRecord(readDarkFill(x), modeIds);
        rec[to] = { f: from, l: (_c = hex8(x.valuesByMode[from])) != null ? _c : "", d: (_d = hex8(x.valuesByMode[to])) != null ? _d : h, by: "user" };
        writeDarkFill(x, rec);
        written.add(xid);
        changed = true;
      }
      let removedDark = 0;
      if (doMigrate && semantic && oldMode) {
        semantic.removeMode(oldMode.modeId);
        changed = true;
        const colsNow = await figma.variables.getLocalVariableCollectionsAsync();
        const varsNow = await figma.variables.getLocalVariablesAsync();
        for (const d of unusedDarkCopies(global, colsNow, varsNow)) {
          d.remove();
          removedDark++;
        }
        vars = await figma.variables.getLocalVariablesAsync();
      }
      let filled = 0;
      let kept = 0;
      const targets = darkTargets(global, vars, from);
      const fromHexOf = (v) => hex8(v.valuesByMode[from]);
      const writeCalc = (v, rec) => {
        var _a2;
        const light = v.valuesByMode[from];
        const la = typeof light.a === "number" ? light.a : 1;
        v.setValueForMode(to, __spreadProps(__spreadValues({}, hexToRgb(darkValueForLight(rgbToHex(light)))), { a: la }));
        rec[to] = { f: from, l: fromHexOf(v), d: (_a2 = hex8(v.valuesByMode[to])) != null ? _a2 : "", by: "calc" };
        writeDarkFill(v, rec);
        filled++;
        changed = true;
      };
      for (const v of targets) {
        if (written.has(v.id)) continue;
        const rec = pruneRecord(readDarkFill(v), modeIds);
        const darkRaw = v.valuesByMode[to];
        const entry = rec[to];
        if (modeCreated || darkRaw === void 0 || darkRaw === null) {
          writeCalc(v, rec);
          continue;
        }
        const darkNow = cellKey(darkRaw);
        if (entry && entry.by === "user") {
          kept++;
          continue;
        }
        if (entry && entry.by === "calc") {
          if (darkNow !== entry.d) {
            rec[to] = { f: from, l: fromHexOf(v), d: darkNow != null ? darkNow : "", by: "user" };
            writeDarkFill(v, rec);
            changed = true;
            kept++;
            continue;
          }
          const fStale = !modeIds.has(entry.f) || hex8(v.valuesByMode[entry.f]) !== entry.l || from !== entry.f;
          if (fStale) writeCalc(v, rec);
          continue;
        }
        if (darkNow === fromHexOf(v)) writeCalc(v, rec);
        else {
          rec[to] = { f: from, l: fromHexOf(v), d: darkNow != null ? darkNow : "", by: "user" };
          writeDarkFill(v, rec);
          changed = true;
          kept++;
        }
      }
      const moved = written.size;
      const splitWritten = splitNames.filter((n) => vars.some((v) => written.has(v.id) && v.name === n));
      if (modeCreated && filled === 0 && moved === 0) {
        try {
          global.removeMode(to);
          modeCreated = false;
        } catch (e) {
        }
      }
      const out = { filled, kept, targets: targets.length, changed };
      if (modeCreated) out.modeCreated = true;
      if (doMigrate) out.migrated = { moved, split: splitWritten.length, failed: failedNames.length, splitNames: splitWritten, failedNames, removedDark };
      return out;
    } catch (e) {
      if (changed && e && typeof e === "object") e[CHANGED_FLAG] = true;
      throw e;
    }
  }
  function pruneRecord(rec, modeIds) {
    const out = {};
    for (const [k, e] of Object.entries(rec)) if (modeIds.has(k) && e && typeof e === "object") out[k] = e;
    return out;
  }

  // src/lib/entitlements.ts
  function normalizeLegacyTier(v) {
    if (v === "free" || v === "paid") return v;
    if (v === "pro" || v === "team") return "paid";
    return null;
  }

  // src/lib/license.ts
  var REVERIFY_MS = 24 * 60 * 60 * 1e3;
  var GRACE_MS = 14 * 24 * 60 * 60 * 1e3;
  function evaluateLicense(cache2, now) {
    if (!cache2) return { tier: "free", status: "none", stale: false };
    if (now > cache2.expiresAt) return { tier: "free", status: "expired", stale: true };
    const age = now - cache2.lastVerified;
    if (age <= REVERIFY_MS) return { tier: cache2.tier, status: "active", stale: false };
    if (age <= GRACE_MS) return { tier: cache2.tier, status: "grace", stale: true };
    return { tier: "free", status: "expired", stale: true };
  }
  var VERIFY_ERR_CODES = ["expired", "limit", "invalid", "server"];
  function isVerifyErrCode(v) {
    return typeof v === "string" && VERIFY_ERR_CODES.includes(v);
  }
  function cacheFromVerify(key, v, now) {
    const cache2 = { key, tier: v.tier, expiresAt: v.expiresAt, lastVerified: now };
    if (v.instanceId) cache2.instanceId = v.instanceId;
    return cache2;
  }
  function normalizeLicenseCache(raw) {
    if (!raw || typeof raw !== "object") return null;
    const o = raw;
    if (typeof o.key !== "string") return null;
    const tier = normalizeLegacyTier(o.tier);
    if (!tier) return null;
    if (typeof o.expiresAt !== "number" || typeof o.lastVerified !== "number") return null;
    const cache2 = { key: o.key, tier, expiresAt: o.expiresAt, lastVerified: o.lastVerified };
    if (typeof o.instanceId === "string" && o.instanceId) cache2.instanceId = o.instanceId;
    return cache2;
  }

  // src/lib/licenseConfig.ts
  var PURCHASE_URL = "https://example.lemonsqueezy.com/buy/PLACEHOLDER";
  var PORTAL_URL = "https://app.lemonsqueezy.com/my-orders";

  // src/lib/undo.ts
  function commitUndo(f) {
    if (typeof f.commitUndo === "function") f.commitUndo();
  }

  // src/lib/uiSize.ts
  var UI_WIDTH = 560;
  var UI_WIDTHS = { default: UI_WIDTH, mini: 140 };
  var UI_HEIGHT = { default: 510, mini: 104 };
  var UI_SIZE_KEY = "dsl.uiSize";
  function normalizeUiSize(v) {
    return v === "mini" ? "mini" : "default";
  }
  function uiWidth(mode) {
    return UI_WIDTHS[mode];
  }
  function uiHeight(mode) {
    return UI_HEIGHT[mode];
  }

  // src/lib/varTable.ts
  var NO_GROUP = t("list.noGroup");
  function cellKey2(c) {
    var _a;
    if (!c) return "";
    switch (c.kind) {
      case "color":
        return `c:${c.hex.toUpperCase()}:${Math.round(((_a = c.alpha) != null ? _a : 1) * 255)}`;
      case "number":
        return `n:${Number("value" in c ? c.value : c.text)}`;
      case "string":
        return `s:${c.text}`;
      case "bool":
        return `b:${"value" in c ? String(c.value) : c.text}`;
      case "alias":
        return `a:${"targetId" in c ? c.targetId : c.aliasId}`;
    }
  }
  var sameCell = (a, b) => cellKey2(a) === cellKey2(b);

  // src/code.ts
  figma.showUI(__html__, { width: UI_WIDTH, height: uiHeight("default"), themeColors: true });
  figma.clientStorage.deleteAsync(UI_SIZE_KEY).catch(() => {
  });
  var selection = () => figma.currentPage.selection;
  var DEV_TIER_KEY = "dsl.devTier";
  var CACHE_KEY = "dsl.licenseCache";
  var SETTINGS_KEY = "dsl.settings";
  var SETTINGS_DEFAULT = { base: 16, maxDepth: 8, grid: 8 };
  var devTier = "free";
  var cache = null;
  var bindCancel = false;
  var unusedCancel = false;
  var bindFindTurn = 0;
  var bindChain = Promise.resolve();
  function acquireBind() {
    const prev = bindChain;
    let release = () => {
    };
    bindChain = new Promise((res) => release = res);
    return prev.then(() => release);
  }
  var bindLinkRunning = false;
  var lastTextSamples = [];
  function effective() {
    if (cache) {
      const ev = evaluateLicense(cache, Date.now());
      return { tier: ev.tier, source: "key", status: ev.status, expiresAt: cache.expiresAt };
    }
    if (devTier !== "free") return { tier: devTier, source: "dev" };
    if (false) return { tier: "free", source: "dev" };
    return { tier: "free", source: "none" };
  }
  var currentTier = () => effective().tier;
  async function withLocalMains(sel) {
    const mains = await collectLocalMains(sel);
    const unitRoots = mains.units.flatMap((u) => u.roots);
    if (!unitRoots.length) return { mains, roots: [...sel], unitOf: /* @__PURE__ */ new Map() };
    const rootIds = new Set(unitRoots.map((r) => r.id));
    const insideUnit = (n) => {
      for (let p = n; p; p = p.parent) if (rootIds.has(p.id)) return true;
      return false;
    };
    const unitOf = /* @__PURE__ */ new Map();
    for (const u of mains.units) {
      const stack = [...u.roots];
      while (stack.length) {
        const n = stack.pop();
        if (!unitOf.has(n.id)) unitOf.set(n.id, u.id);
        if ("children" in n) for (const c of n.children) stack.push(c);
      }
    }
    return { mains, roots: [...sel.filter((r) => !insideUnit(r)), ...unitRoots], unitOf };
  }
  var unitsOfIds = (ids, unitOf) => {
    const out = [];
    for (const id of ids != null ? ids : []) {
      const u = unitOf.get(id);
      if (u && !out.includes(u)) out.push(u);
    }
    return out;
  };
  var isPaid = () => currentTier() === "paid";
  async function paidSemanticTarget(collectionId) {
    var _a;
    if (isPaid() || !collectionId) return false;
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    return ((_a = ownedCollection(cols, "semantic")) == null ? void 0 : _a.id) === collectionId;
  }
  function requirePaid(feature) {
    if (isPaid()) return true;
    post({ type: "PREMIUM_REQUIRED", feature });
    return false;
  }
  function postLicense(note2) {
    const e = effective();
    post({
      type: "LICENSE_STATUS",
      tier: e.tier,
      unlimited: e.tier === "paid",
      // Free/Paid 2티어 — 유료면 모든 기능 해금
      source: e.source,
      status: e.status,
      expiresAt: e.expiresAt,
      note: note2 == null ? void 0 : note2.text,
      noteKind: note2 == null ? void 0 : note2.kind,
      noteTip: note2 == null ? void 0 : note2.tip
    });
  }
  async function loadLicense() {
    try {
      const dt = await figma.clientStorage.getAsync(DEV_TIER_KEY);
      if (false) devTier = dt;
      const raw = await figma.clientStorage.getAsync(CACHE_KEY);
      const normalized = normalizeLicenseCache(raw);
      if (normalized) {
        cache = normalized;
        const legacyTier = raw && typeof raw === "object" && (raw.tier === "pro" || raw.tier === "team");
        if (legacyTier) {
          try {
            await figma.clientStorage.setAsync(CACHE_KEY, normalized);
          } catch (e) {
          }
        }
      }
    } catch (e) {
    }
  }
  async function postPrereq() {
    try {
      const cols = await figma.variables.getLocalVariableCollectionsAsync();
      const vars = await figma.variables.getLocalVariablesAsync();
      const tiers = collectionTiers(cols, vars);
      const globalIds = new Set(cols.filter((c) => tiers.get(c.id) === 1).map((c) => c.id));
      const bindableIds = new Set(cols.filter((c) => {
        var _a;
        return ((_a = tiers.get(c.id)) != null ? _a : 0) > 0;
      }).map((c) => c.id));
      const globals = vars.filter((v) => globalIds.has(v.variableCollectionId));
      const hasGlobal = globals.length > 0;
      const hasBindable = vars.some((v) => bindableIds.has(v.variableCollectionId));
      const { darkUnfilled, darkOld, darkOldManual } = darkPrereq(cols, vars);
      const tierVarList = vars.filter((v) => bindableIds.has(v.variableCollectionId));
      const tierVars = tierVarList.length;
      const tierColorVars = tierVarList.filter((v) => v.resolvedType === "COLOR").length;
      const otherVars = vars.length - tierVars;
      post({ type: "PREREQ_STATE", hasGlobal, hasBindable, tierVars, tierColorVars, otherVars, darkUnfilled, darkOld, darkOldManual });
    } catch (e) {
    }
  }
  function errText(e) {
    return e instanceof Error ? e.message : String(e);
  }
  function toVarInfo(v, col, tier, owned) {
    const modes = col.modes.map((m) => ({ modeId: m.modeId, name: m.name }));
    return __spreadProps(__spreadValues({ id: v.id, name: v.name, collectionId: col.id, collection: col.name, tier }, owned ? { owned } : {}), { modes });
  }
  function tableCell(raw, aliasInfo) {
    var _a;
    if (raw === void 0 || raw === null) return void 0;
    if (typeof raw === "object" && "type" in raw && raw.type === "VARIABLE_ALIAS") {
      const id = raw.id;
      const info = aliasInfo(id);
      if (info.name !== null && !info.remote) return { kind: "alias", aliasId: id, aliasName: info.name };
      return { kind: "alias", aliasId: id, aliasName: (_a = info.name) != null ? _a : t("edit.deletedTarget"), remote: info.name ? true : void 0 };
    }
    if (typeof raw === "object" && "r" in raw) {
      const a = "a" in raw && typeof raw.a === "number" ? Math.round(raw.a * 255) / 255 : 1;
      return a < 1 ? { kind: "color", hex: rgbToHex(raw), alpha: a } : { kind: "color", hex: rgbToHex(raw) };
    }
    if (typeof raw === "number") return { kind: "number", text: String(Math.round(raw * 1e3) / 1e3) };
    if (typeof raw === "boolean") return { kind: "bool", text: raw ? "true" : "false" };
    return { kind: "string", text: String(raw) };
  }
  async function collectVarTable() {
    var _a, _b;
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const all = await figma.variables.getLocalVariablesAsync();
    const tierInfo = collectionTierInfo(cols, all);
    const nameById = new Map(all.map((v) => [v.id, v.name]));
    const colById = new Map(cols.map((c) => [c.id, c]));
    const remoteName = /* @__PURE__ */ new Map();
    for (const v of all) {
      for (const raw of Object.values(v.valuesByMode)) {
        if (raw && typeof raw === "object" && "type" in raw && raw.type === "VARIABLE_ALIAS") {
          const id = raw.id;
          if (nameById.has(id) || remoteName.has(id)) continue;
          const rv = await figma.variables.getVariableByIdAsync(id).catch(() => null);
          remoteName.set(id, (rv == null ? void 0 : rv.remote) ? rv.name : null);
        }
      }
    }
    const cell = (raw) => tableCell(raw, (id) => {
      const local = nameById.get(id);
      if (local !== void 0) return { name: local, remote: false };
      const rn = remoteName.get(id);
      return { name: rn != null ? rn : null, remote: !!rn };
    });
    const vars = [];
    for (const v of all) {
      const col = colById.get(v.variableCollectionId);
      if (!col) continue;
      const values = {};
      for (const m of col.modes) {
        const c = cell(v.valuesByMode[m.modeId]);
        if (c) values[m.modeId] = c;
      }
      vars.push({ id: v.id, name: v.name, collectionId: col.id, type: v.resolvedType, values, scopes: [...(_a = v.scopes) != null ? _a : []], description: (_b = v.description) != null ? _b : "" });
    }
    const collections = cols.map((c) => {
      var _a2, _b2, _c;
      return {
        id: c.id,
        name: c.name,
        tier: (_b2 = (_a2 = tierInfo.get(c.id)) == null ? void 0 : _a2.tier) != null ? _b2 : 0,
        modes: c.modes.map((m) => ({ modeId: m.modeId, name: m.name })),
        defaultModeId: c.defaultModeId,
        tierWhy: (_c = tierInfo.get(c.id)) == null ? void 0 : _c.why
      };
    });
    return { collections, vars };
  }
  async function resolveRoots(nodeIds) {
    if (!nodeIds || !nodeIds.length) return selection().slice();
    const out = [];
    for (const id of nodeIds) {
      const n = await figma.getNodeByIdAsync(id).catch(() => null);
      if (n && n.type !== "PAGE" && n.type !== "DOCUMENT" && n.parent) out.push(n);
    }
    return out;
  }
  async function libCell(raw) {
    let info = { name: null, remote: false };
    if (raw && typeof raw === "object" && "type" in raw && raw.type === "VARIABLE_ALIAS") {
      const t2 = await figma.variables.getVariableByIdAsync(raw.id).catch(() => null);
      info = { name: t2 ? t2.name : null, remote: !!(t2 == null ? void 0 : t2.remote) };
    }
    return tableCell(raw, () => info);
  }
  async function updateVariable(msg) {
    var _a;
    const done = (applied2, error) => {
      if (applied2.length) commitUndo(figma);
      post({ type: "VARIABLE_UPDATED", reqId: msg.reqId, ok: !error, applied: applied2, error });
    };
    const v = await figma.variables.getVariableByIdAsync(msg.id).catch(() => null);
    if (!v || v.remote) return done([], { code: "deleted" });
    if (v.name !== msg.base.name) return done([], { code: "conflict" });
    for (const [modeId, b] of Object.entries(msg.base.values)) {
      const now = await libCell(v.valuesByMode[modeId]);
      if (!sameCell(now, b)) return done([], { code: "conflict" });
    }
    const applied = [];
    if (msg.name !== void 0 && msg.name !== v.name) {
      try {
        v.name = msg.name;
        applied.push("name");
      } catch (e) {
        return done(applied, { code: "name", message: errText(e) });
      }
    }
    for (const [modeId, ev] of Object.entries((_a = msg.values) != null ? _a : {})) {
      try {
        v.setValueForMode(modeId, await editValueToFigma(ev));
        applied.push(modeId);
      } catch (e) {
        return done(applied, { code: "value", modeId, message: errText(e) });
      }
    }
    done(applied);
  }
  async function manualVariableOp(msg) {
    const fail = (message, code) => post(__spreadValues({ type: "ERROR", message, op: msg.type, reqId: msg.reqId }, code ? { code } : {}));
    try {
      if (msg.type === "DELETE_VARIABLE") {
        await deleteVariable(msg.id);
        commitUndo(figma);
        post({ type: "VARIABLE_DELETED", reqId: msg.reqId, id: msg.id });
      } else {
        if (msg.type === "CREATE_VARIABLE") {
          if (await paidSemanticTarget(msg.collectionId)) return fail("semantic collection is paid", "paid");
          const { variable } = await createManualVariable({ collectionId: msg.collectionId, name: msg.name, varType: msg.varType, values: msg.values, scopes: msg.scopes });
          commitUndo(figma);
          post({ type: "VARIABLE_CREATED", reqId: msg.reqId, id: variable.id });
        } else {
          const src = await figma.variables.getVariableByIdAsync(msg.id);
          if (src && await paidSemanticTarget(src.variableCollectionId)) return fail("semantic collection is paid", "paid");
          const nv = await duplicateVariable(msg.id);
          commitUndo(figma);
          post({ type: "VARIABLE_DUPLICATED", reqId: msg.reqId, newId: nv.id });
        }
      }
    } catch (e) {
      if (e instanceof VarNameError) return fail(e.message, "name");
      if (e instanceof VarGoneError) return fail(e.message, "deleted");
      return fail(errText(e));
    }
    await postPrereq();
  }
  async function deletedVarIds(roots) {
    const { usage } = countUsage(roots);
    const local = new Set((await figma.variables.getLocalVariablesAsync()).map((v) => v.id));
    const out = /* @__PURE__ */ new Set();
    for (const id of usage.keys()) {
      if (local.has(id)) continue;
      const v = await figma.variables.getVariableByIdAsync(id).catch(() => null);
      if (!(v == null ? void 0 : v.remote)) out.add(id);
    }
    return out;
  }
  async function collectUsage(nodeIds) {
    var _a, _b, _c;
    const roots = await resolveRoots(nodeIds);
    const { usage, scanned } = countUsage(roots);
    const local = new Set((await figma.variables.getLocalVariablesAsync()).map((v) => v.id));
    const out = {};
    const libraryVars = [];
    const deletedIds = /* @__PURE__ */ new Set();
    for (const [id, u] of usage) {
      if (local.has(id)) {
        out[id] = u;
        continue;
      }
      const v = await figma.variables.getVariableByIdAsync(id).catch(() => null);
      if (!(v == null ? void 0 : v.remote)) {
        deletedIds.add(id);
        continue;
      }
      out[id] = u;
      const col = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId).catch(() => null);
      const modeId = (_a = col == null ? void 0 : col.defaultModeId) != null ? _a : Object.keys(v.valuesByMode)[0];
      libraryVars.push({ id: v.id, name: v.name, collection: (_b = col == null ? void 0 : col.name) != null ? _b : "", type: v.resolvedType, value: await libCell(modeId ? v.valuesByMode[modeId] : void 0), aliasTargets: [], scopes: [...(_c = v.scopes) != null ? _c : []] });
    }
    return { usage: out, libraryVars, deleted: countDeleted(roots, deletedIds), scanned };
  }
  async function collectVars() {
    var _a;
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const colById = new Map(cols.map((c) => [c.id, c]));
    const vars = await figma.variables.getLocalVariablesAsync();
    const tiers = collectionTiers(cols, vars);
    const owned = ownedCollections(cols);
    const out = [];
    for (const v of vars) {
      const col = colById.get(v.variableCollectionId);
      const tier = col ? (_a = tiers.get(col.id)) != null ? _a : 0 : 0;
      if (!col || !tier) continue;
      out.push(toVarInfo(v, col, tier, owned.global === col ? "global" : owned.semantic === col ? "semantic" : void 0));
    }
    out.sort((a, b) => a.collection.localeCompare(b.collection) || a.name.localeCompare(b.name));
    return out;
  }
  function requireTextStyles() {
    return requirePaid("textStyles");
  }
  function kindOf(v) {
    if (v.resolvedType === "COLOR") return "color";
    const sc = v.scopes;
    if (sc.includes("FONT_SIZE")) return "fontSize";
    if (sc.includes("GAP")) return "spacing";
    if (sc.includes("CORNER_RADIUS")) return "radius";
    if (sc.includes("WIDTH_HEIGHT")) return "size";
    if (sc.includes("STROKE_FLOAT")) return "strokeWidth";
    if (sc.includes("LINE_HEIGHT")) return "lineHeight";
    if (sc.includes("LETTER_SPACING")) return "letterSpacing";
    if (sc.includes("OPACITY")) return "opacity";
    if (sc.includes("EFFECT_FLOAT")) return "effectFloat";
    if (sc.includes("FONT_WEIGHT")) return "fontWeight";
    if (sc.includes("FONT_FAMILY")) return "fontFamily";
    const n = v.name;
    if (n.startsWith("line-height")) return "lineHeight";
    if (n.startsWith("letter-spacing")) return "letterSpacing";
    if (n.startsWith("font-size")) return "fontSize";
    if (n.startsWith("spacing")) return "spacing";
    if (n.startsWith("radius")) return "radius";
    if (n.startsWith("stroke-width")) return "strokeWidth";
    if (n.startsWith("shadow-") || n.startsWith("blur")) return "effectFloat";
    if (n.startsWith("size")) return "size";
    if (n.includes("font") && n.includes("weight")) return "fontWeight";
    if (n.includes("font") && n.includes("family")) return "fontFamily";
    if (n.includes("opacity")) return "opacity";
    return "other";
  }
  loadLicense().then(() => {
    postLicense();
    if (cache && cache.instanceId && evaluateLicense(cache, Date.now()).stale) {
      post({ type: "REQUEST_VERIFY", key: cache.key, instanceId: cache.instanceId });
    }
  });
  var SCAN_CAP = 1500;
  var SELECT_CAP = 200;
  function isBindableCandidate(n) {
    const fills = n.fills;
    const hasFills = Array.isArray(fills) && fills.some((p) => p.type === "SOLID" && p.visible !== false);
    const strokes = n.strokes;
    const hasStrokes = Array.isArray(strokes) && strokes.length > 0;
    const r = n.cornerRadius;
    const hasRadius = typeof r === "number" && r > 0;
    const hasFont = typeof n.fontSize === "number";
    const lm = n.layoutMode;
    const hasGap = !!lm && lm !== "NONE" && typeof n.itemSpacing === "number";
    return hasFills || hasStrokes || hasRadius || hasFont || hasGap;
  }
  var selfSelect = false;
  function postSelection() {
    var _a, _b;
    const sel = selection();
    let scanned = 0;
    let bindable = 0;
    let capped = false;
    const stack = sel.slice();
    while (stack.length) {
      if (scanned >= SCAN_CAP) {
        capped = true;
        break;
      }
      const n = stack.pop();
      if (n.visible === false) continue;
      scanned++;
      if (isBindableCandidate(n)) bindable++;
      if (n.type === "INSTANCE") continue;
      if ("children" in n) for (const c of n.children) stack.push(c);
    }
    const firstName = (_b = (_a = sel[0]) == null ? void 0 : _a.name) != null ? _b : "";
    const ids = sel.map((n) => n.id);
    post({ type: "SELECTION_STATE", count: sel.length, scanned, bindable, capped, selfSelect, firstName, ids });
    selfSelect = false;
  }
  figma.on("selectionchange", postSelection);
  figma.ui.onmessage = async (msg) => {
    var _a, _b, _c, _d;
    try {
      switch (msg.type) {
        case "EXTRACT": {
          const sel = await resolveRoots(msg.nodeIds);
          const wm = await withLocalMains(sel);
          const { tokens, warnings } = extractFromSelection(wm.roots, new Set(wm.mains.mainOf.keys()));
          post(__spreadValues({ type: "EXTRACT_RESULT", tokens, warnings, selection: sel.length }, msg.reqId != null ? { reqId: msg.reqId } : {}));
          break;
        }
        case "CREATE_TOKENS": {
          if (!msg.preview && !msg.globalOnly && !requirePaid("tokens")) break;
          const s = msg.preview ? await previewCreateTokens(msg.tokens, msg.base) : await createTokens(msg.tokens, msg.base);
          const roleTokens = s.skippedManual ? msg.tokens.filter((x) => !s.skippedManualNames.has(x.name)) : msg.tokens;
          const roleRows = [];
          const roles = msg.globalOnly ? 0 : await createUsageRoles(roleTokens, !!msg.preview, s.globalOf, msg.preview ? roleRows : void 0, s.finalName);
          const pruned = !msg.preview && msg.replacePalette ? await prunePaletteColors(msg.tokens.map((t2) => t2.name), { globalOnly: !isPaid() }) : 0;
          let summary = t("create.sumGlobals", { n: s.globals, c: s.created, u: s.updated });
          if (roles) summary += t("create.sumRoles", { n: roles });
          if (pruned) summary += t("create.sumPruned", { n: pruned });
          if (s.conversions.length) {
            const px = (n) => String(Math.round(n * 100) / 100);
            const ex = s.conversions.slice(0, 2).map((c) => `${c.from}\u2192${px(c.to)}px`).join(", ");
            const morePart = s.conversions.length > 2 ? t("create.sumBaseMore") : "";
            summary += t("create.sumBase", { base: msg.base, n: s.conversions.length, examples: ex, morePart });
          }
          if (s.skippedManual) summary += t("create.sumManual", { n: s.skippedManual });
          const tokenStates = msg.preview && s.tokenStates ? Object.fromEntries(s.tokenStates) : void 0;
          post(__spreadValues(__spreadValues(__spreadValues({
            type: "CREATE_RESULT",
            created: s.created,
            updated: s.updated,
            summary,
            preview: msg.preview,
            roles
          }, s.skippedManual ? { skippedManual: s.skippedManual } : {}), msg.reqId != null ? { reqId: msg.reqId } : {}), msg.preview ? { tokenStates: tokenStates != null ? tokenStates : {}, roleRows } : {}));
          if (!msg.preview) {
            commitUndo(figma);
            await postPrereq();
          }
          break;
        }
        case "APPLY": {
          const myTurn = msg.preview ? ++bindFindTurn : bindFindTurn;
          if (!bindLinkRunning) bindCancel = true;
          const release = await acquireBind();
          if (msg.preview && myTurn !== bindFindTurn) {
            release();
            break;
          }
          bindCancel = false;
          bindLinkRunning = !msg.preview;
          try {
            const sel = await resolveRoots(msg.nodeIds);
            const r = await bindSelection(
              sel,
              !msg.preview,
              {
                onProgress: (done, total) => post({ type: "PROGRESS", op: "bind", done, total }),
                shouldCancel: () => bindCancel,
                yieldToEvents: () => new Promise((resolve) => setTimeout(resolve, 0))
              },
              __spreadValues(__spreadValues(__spreadValues(__spreadValues({}, msg.skipTextStyleNodes && !msg.preview ? { skipTextStyleNode: await textStyleCandidateTest() } : {}), isPaid() ? {} : { noNewRoles: true }), msg.only && !msg.preview ? { only: msg.only } : {}), msg.only && ((_a = msg.off) == null ? void 0 : _a.length) && !msg.preview ? { off: msg.off } : {})
            );
            post(__spreadValues(__spreadValues({
              type: "APPLY_RESULT",
              bound: r.bound,
              skipped: r.skipped,
              reasons: r.reasons,
              preview: msg.preview,
              cancelled: r.cancelled,
              candidates: r.candidates,
              // #6: 미리보기 후보(dry-run만)
              nodes: r.nodes,
              // #13: 미리보기 트리 맥락
              skips: r.skips,
              // 사유별 건너뛴 레이어(늘 · 상한까지)
              skipLayers: r.skipLayers,
              // 사유별 레이어 수(상한 전) — 건너뛴 곳 목록의 "레이어 {n}개"(미리보기에서 쓴다)
              reqId: msg.reqId,
              // UI가 낡은 응답을 가려낸다
              newRoles: r.newRoles,
              counts: r.counts
            }, r.mains ? { mains: r.mains } : {}), r.mainsBound ? { mainsBound: r.mainsBound } : {}));
            if (!msg.preview) {
              commitUndo(figma);
              selfSelect = true;
              postSelection();
            }
          } finally {
            bindLinkRunning = false;
            release();
          }
          break;
        }
        case "UNBIND_DELETED": {
          const roots = await resolveRoots(msg.nodeIds);
          const deletedIds = await deletedVarIds(roots);
          const r = await unbindDeleted(roots, deletedIds);
          if (r.unbound) commitUndo(figma);
          post(__spreadValues({ type: "DELETED_UNBOUND", reqId: msg.reqId }, r));
          if (r.unbound) await postPrereq();
          break;
        }
        case "SCAN_USAGE": {
          post(__spreadValues({ type: "USAGE_RESULT", reqId: msg.reqId }, await collectUsage(msg.nodeIds)));
          break;
        }
        case "FIND_VAR_USERS": {
          const r = findUsers(await resolveRoots(msg.nodeIds), new Set(msg.varIds));
          post({ type: "VAR_USERS", reqId: msg.reqId, layers: r.nodes.slice(0, msg.limit).map((n) => ({ id: n.id, name: n.name })), totalLayers: r.nodes.length, places: r.places });
          break;
        }
        case "SELECT_VAR_USERS": {
          const r = findUsers(await resolveRoots(msg.nodeIds), new Set(msg.varIds));
          const pick = r.nodes.slice(0, SELECT_CAP);
          if (pick.length) {
            const cur = figma.currentPage.selection;
            if (pick.length !== cur.length || pick.some((n, i) => cur[i] !== n)) selfSelect = true;
            figma.currentPage.selection = pick;
            figma.viewport.scrollAndZoomIntoView(pick);
          }
          post({ type: "SELECT_RESULT", found: pick.length, requested: r.nodes.length, capped: r.nodes.length > SELECT_CAP });
          break;
        }
        case "CANCEL": {
          if (msg.op === "unused") {
            unusedCancel = true;
            break;
          }
          if (bindLinkRunning) break;
          bindCancel = true;
          break;
        }
        case "SELECT_NODES": {
          const ids = msg.ids.slice(0, SELECT_CAP);
          const found = [];
          for (const id of ids) {
            const n = await figma.getNodeByIdAsync(id);
            if (n && n.type !== "PAGE" && n.type !== "DOCUMENT" && n.parent) found.push(n);
          }
          const onPage = found.filter((n) => {
            for (let p = n; p; p = p.parent) if (p.id === figma.currentPage.id) return true;
            return false;
          });
          if (onPage.length) {
            const cur = figma.currentPage.selection;
            if (onPage.length !== cur.length || onPage.some((n, i) => cur[i] !== n)) selfSelect = true;
            figma.currentPage.selection = onPage;
            figma.viewport.scrollAndZoomIntoView(onPage);
          }
          post({ type: "SELECT_RESULT", found: onPage.length, requested: msg.ids.length, capped: msg.ids.length > SELECT_CAP });
          break;
        }
        case "APPLY_SELECTED": {
          let written = 0;
          let made = 0;
          let committed = false;
          if (!bindLinkRunning) bindCancel = true;
          const releaseLink = await acquireBind();
          bindCancel = false;
          bindLinkRunning = true;
          try {
            const ts = ((_b = msg.textStyles) == null ? void 0 : _b.length) ? await applyTextStyleRows(msg.textStyles) : null;
            if (ts == null ? void 0 : ts.applied) written += ts.applied;
            const r = await bindSelectedItems(msg.items, {
              onProgress: (done, total) => post({ type: "PROGRESS", op: "link", done, total }),
              yieldToEvents: () => new Promise((resolve) => setTimeout(resolve, 0)),
              onBound: (n) => {
                var _a2;
                written = ((_a2 = ts == null ? void 0 : ts.applied) != null ? _a2 : 0) + n;
              },
              onCreated: (n) => {
                made = n;
              }
            });
            const mainsBound = [...r.mainsBound];
            if (((_c = ts == null ? void 0 : ts.appliedIds) == null ? void 0 : _c.length) && msg.textStyles) {
              const mainOfText = /* @__PURE__ */ new Map();
              for (const row of msg.textStyles) row.nodeIds.forEach((id, i) => {
                var _a2;
                const m = (_a2 = row.mainIds) == null ? void 0 : _a2[i];
                if (m) mainOfText.set(id, m);
              });
              for (const id of ts.appliedIds) {
                const m = mainOfText.get(id);
                if (m && !mainsBound.includes(m)) mainsBound.push(m);
              }
            }
            post(__spreadValues(__spreadValues({ type: "APPLY_RESULT", bound: r.bound, skipped: r.skipped, reasons: r.reasons, skips: r.skips, reqId: msg.reqId, newRoles: r.newRoles }, ts ? { textStylesApplied: ts.applied, textStylesSkipped: ts.skipped } : {}), mainsBound.length ? { mainsBound } : {}));
            if (r.bound || r.newRoles || (ts == null ? void 0 : ts.applied)) {
              commitUndo(figma);
              committed = true;
              selfSelect = true;
              postSelection();
            }
          } finally {
            if ((written > 0 || made > 0) && !committed) commitUndo(figma);
            bindLinkRunning = false;
            releaseLink();
          }
          break;
        }
        case "RENAME": {
          const r = await renameSelection(await resolveRoots(msg.nodeIds), { apply: msg.apply, maxDepth: msg.maxDepth });
          post(__spreadValues({ type: "RENAME_RESULT", changes: r.changes, nodes: r.nodes, applied: r.applied }, msg.reqId != null ? { reqId: msg.reqId } : {}));
          if (r.applied && r.changes.length) {
            commitUndo(figma);
          }
          if (r.applied) {
            selfSelect = true;
            postSelection();
          }
          break;
        }
        case "RENAME_APPLY": {
          const changes = [];
          let roleWrites = 0;
          for (const { id, before: expectedBefore, after, role, nameKey } of msg.items) {
            const node = await figma.getNodeByIdAsync(id);
            if (!node || !("name" in node)) continue;
            const before = node.name;
            if (before !== expectedBefore) continue;
            if (before !== after) node.name = after;
            if (role ? writeRole(node, role) : writeRoleFromName(node, after)) {
              roleWrites++;
            }
            if (writeNameKey(node, nameKey != null ? nameKey : null)) roleWrites++;
            if (before === after) continue;
            changes.push({ id, before, after });
          }
          post(__spreadValues({ type: "RENAME_RESULT", changes, nodes: [], applied: true }, msg.reqId != null ? { reqId: msg.reqId } : {}));
          selfSelect = true;
          postSelection();
          if (changes.length || roleWrites) {
            commitUndo(figma);
          }
          break;
        }
        case "CREATE_SEMANTICS": {
          if (!requirePaid("semantics")) break;
          const s = await createSemanticAliases(msg.map);
          post(__spreadValues({ type: "SEMANTICS_RESULT", created: s.created, updated: s.updated, aliased: s.aliased, missing: s.missing }, s.skippedManual ? { skippedManual: s.skippedManual } : {}));
          commitUndo(figma);
          await postPrereq();
          break;
        }
        case "SCAN_TEXT_STYLES": {
          if (!requirePaid("textStyles")) break;
          const { samples, warnings } = await scanTextStyles((await withLocalMains(await resolveRoots(msg.nodeIds))).roots);
          if (msg.reqId == null) lastTextSamples = samples;
          const existing = await scanExistingTextStyles();
          const { rest, decimalRows } = splitDecimalClusters(clusterTextStyles(samples), existing);
          const styles = nameTextStyles(rest, existing);
          const existingSigs = existing.map((e) => ({ name: e.name, sig: tsSig(e) }));
          if (msg.reqId != null) {
            post({ type: "TEXT_STYLE_CANDIDATES", styles, decimalRows, warnings, reqId: msg.reqId, existing: existingSigs });
          } else post({ type: "TEXT_STYLE_CANDIDATES", styles, decimalRows, warnings, existing: existingSigs });
          break;
        }
        case "NAME_TEXT_STYLES_BY_ROW": {
          if (!requirePaid("textStyles")) break;
          if (!lastTextSamples.length) {
            post({ type: "ERROR", message: t("textStyle.needScan"), op: "NAME_TEXT_STYLES_BY_ROW" });
            break;
          }
          const existing = await scanExistingTextStyles();
          const r = nameTextStylesWithRowLabels(lastTextSamples, existing);
          post({ type: "TEXT_STYLE_CANDIDATES", styles: r.styles, decimalRows: r.decimalRows, warnings: [], labeled: r.labeled, fallback: r.fallback });
          break;
        }
        case "CREATE_TEXT_STYLES": {
          if (!requireTextStyles()) break;
          const r = await createSemanticTextStyles(msg.styles);
          const wm = msg.applyTo ? await withLocalMains(await resolveRoots(msg.applyTo)) : null;
          const ap = wm ? await applyRegisteredTextStyles(wm.roots, r.styleIds) : null;
          const mainsApplied = wm && ap ? unitsOfIds(ap.appliedIds, wm.unitOf) : [];
          post(__spreadValues(__spreadValues(__spreadValues({
            type: "TEXT_STYLES_RESULT",
            created: r.created,
            updated: r.updated,
            bound: r.bound,
            missing: r.missing,
            notes: r.notes
          }, msg.reqId != null ? { reqId: msg.reqId } : {}), ap ? { applied: ap.applied, applySkipped: ap.applySkipped, applyReasons: ap.applyReasons } : {}), mainsApplied.length ? { mainsApplied } : {}));
          commitUndo(figma);
          await postPrereq();
          break;
        }
        case "PREVIEW_TEXT_STYLES": {
          const wm = await withLocalMains(await resolveRoots(msg.nodeIds));
          const r = await planExistingTextStyles(wm.roots);
          const rows = wm.unitOf.size ? r.rows.map((row) => __spreadProps(__spreadValues({}, row), { mainIds: row.nodeIds.map((id) => {
            var _a2;
            return (_a2 = wm.unitOf.get(id)) != null ? _a2 : null;
          }) })) : r.rows;
          post({ type: "TEXT_STYLES_PREVIEW", reqId: msg.reqId, rows, skipReasons: r.skipReasons });
          break;
        }
        case "GET_COLLECTIONS": {
          const cols = await figma.variables.getLocalVariableCollectionsAsync();
          post({ type: "COLLECTIONS", collections: cols.map((c) => ({ id: c.id, name: c.name })) });
          postSelection();
          break;
        }
        case "GET_PREREQ": {
          await postPrereq();
          break;
        }
        case "GET_LICENSE": {
          postLicense();
          break;
        }
        case "SET_LICENSE": {
          if (true) break;
          devTier = msg.tier;
          try {
            await figma.clientStorage.setAsync(DEV_TIER_KEY, devTier);
          } catch (e) {
          }
          postLicense();
          break;
        }
        case "LICENSE_VERIFIED": {
          if (msg.result.ok) {
            const prev = cache;
            if (prev == null ? void 0 : prev.instanceId) {
              const keyChanged = prev.key !== msg.key;
              const instChanged = !!msg.result.instanceId && prev.instanceId !== msg.result.instanceId;
              if (keyChanged || instChanged) {
                post({ type: "REQUEST_DEACTIVATE", key: prev.key, instanceId: prev.instanceId });
              }
            }
            cache = cacheFromVerify(msg.key, msg.result, Date.now());
            try {
              await figma.clientStorage.setAsync(CACHE_KEY, cache);
            } catch (e) {
            }
            postLicense({ text: t("license.noteApplied"), kind: "ok" });
          } else if (msg.result.offline) {
            postLicense({ text: t(cache ? "license.noteGrace" : "license.noteOffline"), kind: "warn" });
          } else {
            const { code, error } = msg.result;
            postLicense({
              text: isVerifyErrCode(code) ? t(`license.err.server.${code}`) : t("license.verifyFailed"),
              kind: "warn",
              tip: error || void 0
            });
          }
          break;
        }
        case "CLEAR_LICENSE": {
          if ((cache == null ? void 0 : cache.key) && cache.instanceId) {
            post({ type: "REQUEST_DEACTIVATE", key: cache.key, instanceId: cache.instanceId });
          }
          cache = null;
          try {
            await figma.clientStorage.deleteAsync(CACHE_KEY);
          } catch (e) {
          }
          postLicense({ text: t("license.noteCleared"), kind: "ok" });
          break;
        }
        case "OPEN_LICENSE_LINK": {
          figma.openExternal(msg.target === "purchase" ? PURCHASE_URL : PORTAL_URL);
          break;
        }
        case "EXPORT": {
          const cols = await figma.variables.getLocalVariableCollectionsAsync();
          const colById = new Map(cols.map((c) => [c.id, c]));
          const vars = await figma.variables.getLocalVariablesAsync();
          const tiers = collectionTiers(cols, vars);
          const owned = ownedIds(cols);
          const colIdx = new Map(cols.map((c, i) => [c.id, i]));
          const rank = (id) => {
            var _a2;
            return (owned.has(id) ? 1e6 : 0) + ((_a2 = colIdx.get(id)) != null ? _a2 : 0);
          };
          const inputs = [];
          for (const v of [...vars].sort((a, b) => rank(a.variableCollectionId) - rank(b.variableCollectionId))) {
            const col = colById.get(v.variableCollectionId);
            if (!col) continue;
            const read = (raw) => {
              if (raw && typeof raw === "object" && "type" in raw && raw.type === "VARIABLE_ALIAS") return { alias: raw.id };
              if (v.resolvedType === "COLOR" && raw && typeof raw === "object" && "r" in raw) return { value: exportColorHex(raw) };
              return { value: raw };
            };
            const inp = __spreadValues({ id: v.id, name: v.name, tier: (_d = tiers.get(col.id)) != null ? _d : 0, type: v.resolvedType, kind: kindOf(v), collectionId: col.id, collectionName: col.name }, read(v.valuesByMode[col.defaultModeId]));
            if (v.description) inp.description = v.description;
            const others = col.modes.filter((m) => m.modeId !== col.defaultModeId);
            if (others.length) inp.modeValues = Object.fromEntries(others.map((m) => [m.modeId, read(v.valuesByMode[m.modeId])]));
            inputs.push(inp);
          }
          const tokens = resolveExportTokens(inputs);
          const modeCols = [...cols].sort((a, b) => rank(a.id) - rank(b.id)).map((c) => {
            var _a2;
            return { id: c.id, tier: (_a2 = tiers.get(c.id)) != null ? _a2 : 0, defaultModeId: c.defaultModeId, modes: c.modes };
          });
          const modes = resolveExportModes(inputs, modeCols);
          tokens.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
          const styles = (await figma.getLocalTextStylesAsync()).map((st) => ({
            name: st.name,
            fontFamily: st.fontName.family,
            fontStyle: st.fontName.style,
            fontSize: st.fontSize,
            lineHeight: st.lineHeight.unit === "AUTO" ? { unit: "auto", value: 0 } : { unit: st.lineHeight.unit === "PERCENT" ? "percent" : "px", value: st.lineHeight.value },
            letterSpacing: { unit: st.letterSpacing.unit === "PERCENT" ? "percent" : "px", value: st.letterSpacing.value }
          }));
          styles.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
          const content = exportTokens(tokens, {
            format: msg.format,
            fontSizeUnit: msg.fontSizeUnit,
            base: msg.base
          }, styles, modes);
          const dupes = exportGlobalDupes(inputs);
          post(__spreadValues({ type: "EXPORT_RESULT", format: msg.format, content, clashes: exportClashes(tokens, modes), globalDupes: dupes.names }, dupes.from !== void 0 ? { globalDupesFrom: dupes.from } : {}));
          break;
        }
        case "GET_VAR_TABLE": {
          post(__spreadValues({ type: "VAR_TABLE" }, await collectVarTable()));
          break;
        }
        case "UPDATE_VARIABLE": {
          await updateVariable(msg);
          break;
        }
        case "APPLY_VARIABLE": {
          const v = await figma.variables.getVariableByIdAsync(msg.id).catch(() => null);
          if (!v) {
            post({ type: "ERROR", message: "variable not found", op: msg.type, reqId: msg.reqId, code: "deleted" });
            break;
          }
          const r = await applyVariableToNodes(selection().slice(), v, msg.target);
          if (r.applied) commitUndo(figma);
          post({ type: "VARIABLE_APPLIED", reqId: msg.reqId, applied: r.applied, skipped: r.skipped, skipReasons: r.skipReasons, name: v.name });
          break;
        }
        case "CREATE_VARIABLE":
        case "DUPLICATE_VARIABLE":
        case "DELETE_VARIABLE": {
          await manualVariableOp(msg);
          break;
        }
        case "SCAN_UNUSED_VARS": {
          unusedCancel = false;
          const r = await scanUnusedVariables({ onProgress: (done, total) => post({ type: "PROGRESS", op: "unused", done, total }), cancelled: () => unusedCancel });
          post(__spreadValues({ type: "UNUSED_VARS", reqId: msg.reqId, items: r.items, pages: r.pages, layers: r.layers }, r.cancelled ? { cancelled: true } : {}));
          break;
        }
        case "DELETE_VARIABLES": {
          unusedCancel = false;
          const r = await deleteUnusedVariables(msg.ids, { onProgress: (done, total) => post({ type: "PROGRESS", op: "unused-delete", done, total }), cancelled: () => unusedCancel });
          if (r.deleted > 0) commitUndo(figma);
          post(__spreadValues({ type: "VARIABLES_DELETED", reqId: msg.reqId, deleted: r.deleted, skipped: r.skipped, failed: r.failed }, r.cancelled ? { cancelled: true } : {}));
          if (r.deleted > 0) await postPrereq();
          break;
        }
        case "SET_UI_SIZE": {
          const mode = normalizeUiSize(msg.mode);
          figma.ui.resize(uiWidth(mode), uiHeight(mode));
          post({ type: "UI_SIZE", mode });
          break;
        }
        case "GET_SETTINGS": {
          let s = SETTINGS_DEFAULT;
          try {
            const raw = await figma.clientStorage.getAsync(SETTINGS_KEY);
            if (raw && typeof raw === "object") {
              const o = raw;
              s = {
                base: typeof o.base === "number" && isFinite(o.base) && o.base > 0 ? o.base : SETTINGS_DEFAULT.base,
                maxDepth: typeof o.maxDepth === "number" && isFinite(o.maxDepth) && o.maxDepth >= 1 ? Math.round(o.maxDepth) : SETTINGS_DEFAULT.maxDepth,
                grid: typeof o.grid === "number" && isFinite(o.grid) && o.grid >= 1 ? Math.round(o.grid) : SETTINGS_DEFAULT.grid
              };
            }
          } catch (e) {
          }
          post({ type: "SETTINGS", base: s.base, maxDepth: s.maxDepth, grid: s.grid });
          break;
        }
        case "SET_SETTINGS": {
          try {
            await figma.clientStorage.setAsync(SETTINGS_KEY, { base: msg.base, maxDepth: msg.maxDepth, grid: msg.grid });
          } catch (e) {
          }
          break;
        }
        case "GET_VARIABLES": {
          post({ type: "VARIABLES", vars: await collectVars() });
          break;
        }
        case "GENERATE_DARK_MODE": {
          if (!requirePaid("tokens")) break;
          let res;
          try {
            res = await generateDarkMode(msg.migrate === true);
          } catch (e) {
            if (darkChangedBeforeError(e)) {
              commitUndo(figma);
              await postPrereq();
              post({ type: "VARIABLES", vars: await collectVars() });
            }
            throw e;
          }
          const _e = res, { changed } = _e, r = __objRest(_e, ["changed"]);
          post(__spreadValues({ type: "DARK_MODE_RESULT" }, r));
          if (changed) {
            commitUndo(figma);
            await postPrereq();
          }
          if (!r.needMigrate) post({ type: "VARIABLES", vars: await collectVars() });
          break;
        }
      }
    } catch (err) {
      post({ type: "ERROR", message: err instanceof Error ? err.message : String(err), op: msg == null ? void 0 : msg.type, reqId: msg == null ? void 0 : msg.reqId });
    }
  };
})();
