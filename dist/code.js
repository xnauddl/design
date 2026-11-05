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
    "color.summary": "\uC0C9 {count}\uAC1C \xB7 \uC5ED\uD560 \uC9C0\uC815 {roles} \xB7 \uBCC0\uC218\uD654 \uB300\uAE30",
    "color.needColors": "\uBA3C\uC800 \u2018\uC120\uD0DD\uC5D0\uC11C \uCD94\uCD9C\u2019 \uB610\uB294 \u2018\uD314\uB808\uD2B8 \uC0DD\uC131\u2019\uC73C\uB85C \uC0C9\uC744 \uBAA8\uC73C\uC138\uC694.",
    "color.fileVars": "\uD30C\uC77C\uC5D0 \uC0C9 \uBCC0\uC218 {n}\uAC1C \xB7 \uC5ED\uD560 {roles}\uAC1C \u2014 \u2018\uC120\uD0DD\uC5D0\uC11C \uCD94\uCD9C\u2019\uC744 \uB204\uB974\uBA74 \uD604\uC7AC \uD654\uBA74\uC758 \uC0C9\uC744 \uC77D\uC5B4\uC694",
    "create.fileVars": "\uD30C\uC77C\uC5D0 \uAC04\uACA9\xB7\uD06C\uAE30\xB7\uD3F0\uD2B8 \uBCC0\uC218 {n}\uAC1C \u2014 \u2018\uBBF8\uB9AC\uBCF4\uAE30\u2019\uB97C \uB204\uB974\uBA74 \uD604\uC7AC \uD654\uBA74\uC758 \uAC12\uC744 \uC77D\uC5B4\uC694",
    // 지나친 이유조차 없는 빈손 — 버튼이 고장 난 것처럼 보이지 않게 최소한의 말은 한다.
    "color.extractEmpty": "\uACE0\uB97C \uAC12\uC744 \uCC3E\uC9C0 \uBABB\uD588\uC5B4\uC694 \u2014 \uC0C9\xB7\uC5EC\uBC31\xB7\uD06C\uAE30\uAC00 \uC788\uB294 \uD504\uB808\uC784\uC774\uB098 \uB808\uC774\uC5B4\uB97C \uC120\uD0DD\uD558\uC138\uC694.",
    "create.baseChanged": "base {base}px\uB85C \uB2E4\uC2DC \uACC4\uC0B0 \uC911\u2026",
    // 시맨틱 매핑
    "semantic.scanningGlobals": "\uAE30\uC874 \uC0C9 \uC2A4\uCE94 \uC911\u2026",
    "semantic.formatHint": "\uB9E4\uD551\uC744 \uD55C \uC904\uC5D0 \u201C\uC5ED\uD560 = Global\uBCC0\uC218\uC774\uB984\u201D \uD615\uC2DD\uC73C\uB85C \uC785\uB825\uD558\uC138\uC694.",
    "semantic.noGlobals": "\uAE30\uC874 Global \uC0C9 \uBCC0\uC218\uAC00 \uC5C6\uC5B4\uC694 \u2014 \uBA3C\uC800 \uD1A0\uD070\uC744 \uB9CC\uB4DC\uC138\uC694.",
    "semantic.suggested": "\uAE30\uC874 \uC0C9 {count}\uAC1C\uC5D0\uC11C \uC5ED\uD560 \uCD94\uCC9C \u2014 \uD655\uC778 \uD6C4 \u2018\uC2DC\uB9E8\uD2F1 \uBCC4\uCE6D \uC0DD\uC131\u2019.",
    "semantic.result": "\uC2DC\uB9E8\uD2F1 {aliased}\uAC1C \uBCC4\uCE6D (\uC0DD\uC131 {created} / \uAC31\uC2E0 {updated})",
    "semantic.missing": " \xB7 \uB204\uB77D: {names}",
    // 바인딩(적용)
    "apply.cancelRequested": "\uCDE8\uC18C\uD558\uB294 \uC911\u2026",
    "apply.cancelled": "\uCC3E\uAE30\uB97C \uCDE8\uC18C\uD588\uC5B4\uC694",
    "bind.filterPlaceholder": "\uBCC0\uC218 \uC774\uB984 \uD544\uD130",
    // 연결 목록의 속성 이름 — API 필드명 대신 디자인 말(원래 이름은 툴팁으로).
    "field.fills": "\uCC44\uC6C0 \uC0C9",
    "field.strokes": "\uC120 \uC0C9",
    "field.effects": "\uADF8\uB9BC\uC790 \uC0C9",
    "field.itemSpacing": "\uAC04\uACA9",
    "field.counterAxisSpacing": "\uC904 \uAC04\uACA9",
    "field.gridRowGap": "\uD589 \uAC04\uACA9",
    "field.gridColumnGap": "\uC5F4 \uAC04\uACA9",
    "field.padding": "\uC5EC\uBC31",
    "field.paddingX": "\uC88C\uC6B0 \uC5EC\uBC31",
    "field.paddingY": "\uC704\uC544\uB798 \uC5EC\uBC31",
    "field.paddingSome": "\uC5EC\uBC31 \uC77C\uBD80",
    "field.paddingTop": "\uC704 \uC5EC\uBC31",
    "field.paddingRight": "\uC624\uB978\uCABD \uC5EC\uBC31",
    "field.paddingBottom": "\uC544\uB798 \uC5EC\uBC31",
    "field.paddingLeft": "\uC67C\uCABD \uC5EC\uBC31",
    "field.radius": "\uBAA8\uC11C\uB9AC",
    "field.radiusSome": "\uBAA8\uC11C\uB9AC \uC77C\uBD80",
    "field.topLeftRadius": "\uC67C\uCABD \uC704 \uBAA8\uC11C\uB9AC",
    "field.topRightRadius": "\uC624\uB978\uCABD \uC704 \uBAA8\uC11C\uB9AC",
    "field.bottomRightRadius": "\uC624\uB978\uCABD \uC544\uB798 \uBAA8\uC11C\uB9AC",
    "field.bottomLeftRadius": "\uC67C\uCABD \uC544\uB798 \uBAA8\uC11C\uB9AC",
    "field.strokeWeight": "\uC120 \uB450\uAED8",
    "field.strokeSome": "\uC120 \uB450\uAED8 \uC77C\uBD80",
    "field.strokeTopWeight": "\uC704 \uC120 \uB450\uAED8",
    "field.strokeRightWeight": "\uC624\uB978\uCABD \uC120 \uB450\uAED8",
    "field.strokeBottomWeight": "\uC544\uB798 \uC120 \uB450\uAED8",
    "field.strokeLeftWeight": "\uC67C\uCABD \uC120 \uB450\uAED8",
    "field.width": "\uB108\uBE44",
    "field.height": "\uB192\uC774",
    "field.opacity": "\uBD88\uD22C\uBA85\uB3C4",
    "field.fontSize": "\uAE00\uC790 \uD06C\uAE30",
    "field.lineHeight": "\uD589\uAC04",
    "field.letterSpacing": "\uC790\uAC04",
    "field.fontFamily": "\uAE00\uAF34",
    "field.fontWeight": "\uAD75\uAE30",
    "bind.layerSelectTip": "\uB204\uB974\uBA74 \uCE94\uBC84\uC2A4\uC5D0\uC11C \uC774 \uB808\uC774\uC5B4\uB97C \uC120\uD0DD\uD574\uC694",
    // 리네임
    "rename.previewCount": "{total}\uAC1C \uBCC0\uACBD \uC608\uC815 \xB7 {sel}\uAC1C \uCCB4\uD06C \u2014 \u2018\uC774\uB984 \uC801\uC6A9\u2019",
    "rename.none": "\uBC14\uAFC0 \uC774\uB984\uC774 \uC5C6\uC5B4\uC694.",
    "rename.applied": "{count}\uAC1C \uC774\uB984 \uC801\uC6A9 \uC644\uB8CC.",
    // 컴포넌트 / 베리언트
    "component.scanning": "\uD6C4\uBCF4 \uC2A4\uCE94 \uC911\u2026",
    "component.registering": "\uCEF4\uD3EC\uB10C\uD2B8 \uB4F1\uB85D \uC911\u2026",
    "component.classifying": "\uBCA0\uB9AC\uC5B8\uD2B8 \uBD84\uB958 \uC911\u2026",
    "component.generating": "\uB204\uB77D \uC870\uD569 \uC0DD\uC131 \uC911\u2026",
    "component.noEligible": "\uC120\uD0DD \uC544\uB798\uC5D0 \uB4F1\uB85D\uD560 \uC218 \uC788\uB294 \uD504\uB808\uC784\uC774 \uC5C6\uC5B4\uC694.",
    "component.noEligibleShort": "\uB4F1\uB85D\uD560 \uC218 \uC788\uB294 \uD504\uB808\uC784\uC774 \uC5C6\uC5B4\uC694.",
    "component.noChecked": "\uCCB4\uD06C\uD55C \uD6C4\uBCF4\uAC00 \uC5C6\uC5B4\uC694 \u2014 \uBB36\uC744 \uD56D\uBAA9\uC744 \uCCB4\uD06C\uD558\uC138\uC694",
    "component.candidates": "\uB4F1\uB85D \uD6C4\uBCF4 {total}\uAC1C \xB7 {sel}\uAC1C \uCCB4\uD06C",
    "component.registered": "\uCEF4\uD3EC\uB10C\uD2B8 {registered} \xB7 \uBCA0\uB9AC\uC5B8\uD2B8 \uC138\uD2B8 {sets}{extraPart}",
    "component.variants": "\uBCA0\uB9AC\uC5B8\uD2B8 \uC138\uD2B8 {sets}\uAC1C \uC0DD\uC131{extraPart}",
    "component.generated": "\uB204\uB77D \uC870\uD569 {generated}\uAC1C \uC0DD\uC131(\uC138\uD2B8 {sets})",
    "component.placeFailed": " \xB7 \uC81C\uC790\uB9AC\uC5D0 \uBABB \uB454 {n}\uAC1C: {names}",
    "component.placeFailedMore": " \uC678",
    "common.beta": "\uBCA0\uD0C0",
    "layer.componentsBetaAria": "\uCEF4\uD3EC\uB10C\uD2B8 (\uBCA0\uD0C0)",
    "component.propFailed": " \xB7 \uC18D\uC131 \uAC12\uC744 \uBABB \uB123\uC740 {n}\uAC1C: {names}",
    "component.fillKept": " \xB7 \uCC44\uC6C0\xB7\uD06C\uAE30\uAC00 \uB2EC\uB77C \uAC74\uB108\uB6F4 {n}\uAC1C: {names}",
    "component.placeCloned": " \xB7 \uC81C\uC790\uB9AC\uC5D0 \uC778\uC2A4\uD134\uC2A4\uB97C \uBABB \uB123\uC5B4 \uBCF5\uC0AC\uBCF8\uC744 \uB454 {n}\uAC1C: {names}",
    // 마법사
    "wizard.needSelect": "\uBA3C\uC800 \uB808\uC774\uC5B4\uB97C \uC120\uD0DD\uD558\uC138\uC694 \u2014 \uC120\uD0DD\uC5D0\uC11C \uAC12\uC744 \uBF51\uC544\uC694",
    "wizard.result": "{state} \u2014 {summary}",
    "wizard.stopped": "\uC911\uB2E8",
    "wizard.completed": "\uC644\uB8CC",
    // 다크 테마 생성
    "dark.title": "\uB2E4\uD06C \uBAA8\uB4DC",
    "dark.hint": "\uB77C\uC774\uD2B8 \uC0C9\uC744 \uB4A4\uC9D1\uC5B4 \uB2E4\uD06C\uC5D0 \uCC44\uC6CC\uC694. \uBAA9\uB85D \uC774\uB984\uC740 Figma \uBCC0\uC218 \uCEEC\uB809\uC158\xB7\uBAA8\uB4DC\uC608\uC694",
    "dark.hintTip": "\uC0C9\uC0C1\xB7\uCC44\uB3C4\uB294 \uADF8\uB300\uB85C \uB450\uACE0 \uBA85\uB3C4\uB9CC \uB4A4\uC9D1\uC5B4\uC694. Semantic\uC774 Global\uC744 \uAC00\uB9AC\uD0A4\uB294 \uAC83\uB9CC \uB300\uC0C1\uC774\uACE0 \uAC12\uC744 \uC9C1\uC811 \uB123\uC740 \uAC74 \uAC74\uB108\uB6F0\uC5B4\uC694. \uB2E4\uD06C\uC6A9 \uC6D0\uC2DC\uC0C9\uC740 dark/\u2026\uB85C \uB530\uB85C \uB9CC\uB4E4\uC5B4\uC694.",
    "dark.collection": "\uC5ED\uD560 \uCEEC\uB809\uC158",
    "dark.fromMode": "\uB77C\uC774\uD2B8",
    "dark.toMode": "\uB2E4\uD06C",
    "dark.genBtn": "\uB2E4\uD06C \uB9CC\uB4E4\uAE30",
    // 아직 Dark 모드가 없을 때 '어두운 모드' 셀렉트에 끼우는 안내 옵션(값이 없어 전송되지 않는다).
    "dark.toPlaceholder": "Dark (\uC5C6\uC73C\uBA74 \uB9CC\uB4E4\uC5B4\uC694)",
    // 닮은 프레임 컴포넌트화
    "similar.scanBtn": "\uB2EE\uC740 \uC2A4\uCE94",
    "similar.componentizeBtn": "\uBB36\uAE30",
    // 내보내기
    "export.saved": "{format} \u2014 {file}\uB85C \uC800\uC7A5\uD588\uC5B4\uC694.",
    "export.empty": "\uB0B4\uBCF4\uB0BC \uBCC0\uC218\uAC00 \uC5C6\uC5B4\uC694. \uBA3C\uC800 \uD1A0\uD070\uC744 \uB9CC\uB4DC\uC138\uC694.",
    // 라이선스
    "license.needKey": "\uB77C\uC774\uC120\uC2A4 \uD0A4\uB97C \uC785\uB825\uD558\uC138\uC694.",
    // 유료 게이팅
    // 마법사 단계 라벨(WIZARD_STEPS id 기준) + 건너뜀 사유
    "wizard.step.extract": "\uCD94\uCD9C",
    "wizard.step.create": "\uD1A0\uD070",
    "wizard.step.semantics": "\uC5ED\uD560 \uB9E4\uD551",
    "wizard.step.dark": "\uB2E4\uD06C",
    "wizard.step.textStyles": "\uD14D\uC2A4\uD2B8 \uC2A4\uD0C0\uC77C",
    "wizard.step.rename": "\uC774\uB984",
    "wizard.step.componentize": "\uCEF4\uD3EC\uB10C\uD2B8",
    "wizard.rerun": "\uB2E4\uC2DC \uC2E4\uD589",
    "wizard.rerunHint": "\uC774\uBBF8 \uC815\uB9AC\uD55C \uC120\uD0DD\uC774\uC5D0\uC694 \u2014 \uB2E4\uC2DC \uC2E4\uD589\uD558\uBA74 \uBCC0\uC218\uB294 \uAC31\uC2E0\uB418\uACE0 \uC774\uB984\uC740 \uADF8\uB300\uB85C\uC608\uC694.",
    "wizard.skip.optionOff": "\uC635\uC158 \uAEBC\uC9D0",
    "wizard.skip.noMapping": "\uB9E4\uD551 \uC5C6\uC74C",
    "wizard.skip.paid": "\uC720\uB8CC \uAE30\uB2A5",
    "wizard.chip.paid": "\uC720\uB8CC \uAE30\uB2A5\uC774\uB77C \uC774\uBC88 \uC2E4\uD589\uC5D0\uC11C\uB294 \uAC74\uB108\uB6F0\uC5B4\uC694 \xB7 \uC124\uC815 \u203A \uB77C\uC774\uC120\uC2A4",
    "wizard.paidSkipped": " \xB7 \uC720\uB8CC \uAE30\uB2A5\uC774\uB77C \uAC74\uB108\uB700: {steps} \u2014 \uC0C8 \uBCC0\uC218\uB294 \uB9CC\uB4E4\uC9C0 \uC54A\uC558\uC5B4\uC694",
    // 진행 안내(파이프라인) 단계 상태
    "pipeline.stat.done": "\uC644\uB8CC",
    "pipeline.stat.ready": "\uC900\uBE44",
    "pipeline.stat.blocked": "\uC804\uC81C \uBBF8\uCDA9\uC871",
    "pipeline.stat.todo": "\uB9CC\uB4E4\uAE30",
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
    "reason.font": "\uD3F0\uD2B8 \uBBF8\uB85C\uB4DC",
    "reason.translucent": "\uBC18\uD22C\uBA85",
    "reason.space-between": "\uC0AC\uC774 \uAC04\uACA9 \uC790\uB3D9",
    "reason.fraction": "\uC18C\uC218 \uC120 \uB450\uAED8",
    // 마법사 시퀀서 단계 결과
    "wizard.seq.stoppedPrev": "\uC774\uC804 \uB2E8\uACC4 \uC911\uB2E8\uC73C\uB85C \uAC74\uB108\uB700",
    "wizard.seq.running": "\uC9C4\uD589 \uC911\u2026",
    "wizard.seq.noExtract": "\uBF51\uC740 \uAC12\uC774 \uC5C6\uC5B4\uC694 \u2014 \uC0C9\xB7\uD3F0\uD2B8\xB7\uAC04\uACA9\uC774 \uC788\uB294 \uB808\uC774\uC5B4\uB97C \uC120\uD0DD\uD558\uC138\uC694",
    "wizard.seq.extractDone": "{count}\uAC1C \uD6C4\uBCF4",
    "wizard.seq.createDone": "\uC0DD\uC131 {created} \xB7 \uAC31\uC2E0 {updated}",
    "wizard.seq.semantics": "\uBCC4\uCE6D {aliased}",
    "wizard.seq.semanticsMissing": " \xB7 \uB204\uB77D {n}",
    "wizard.seq.dark": "\uB2E4\uD06C {realiased}\uAC1C \uC5F0\uACB0",
    "wizard.seq.darkModeCreated": " \xB7 \uB2E4\uD06C \uBAA8\uB4DC \uCD94\uAC00",
    "wizard.seq.darkSkip": " \xB7 \uAC74\uB108\uB700 {n}(\uAC12\uC744 \uC9C1\uC811 \uB123\uC740 \uC0C9)",
    "wizard.seq.darkNoTarget": "\uBAA8\uB4DC\uAC00 \uC788\uB294 \uCEEC\uB809\uC158\uC774 \uC5C6\uC5B4 \uAC74\uB108\uB700 \u2014 \uBA3C\uC800 \uD1A0\uD070\uC744 \uB9CC\uB4DC\uC138\uC694",
    "wizard.seq.darkNothing": "\uCC44\uC6B8 \uC0C9\uC774 \uC5C6\uC74C \u2014 Global\uC744 \uAC00\uB9AC\uD0A4\uB294 \uC2DC\uB9E8\uD2F1 \uC0C9\uC774 \uD544\uC694\uD574\uC694",
    "wizard.seq.textStyles": "\uC2A4\uD0C0\uC77C \uC0DD\uC131 {created} \xB7 \uAC31\uC2E0 {updated}",
    "wizard.seq.textStylesNone": "\uC120\uD0DD\uC5D0 \uD14D\uC2A4\uD2B8\uAC00 \uC5C6\uC5B4 \uAC74\uB108\uB700",
    "wizard.seq.renameDone": "{count}\uAC1C \uC774\uB984 \uC801\uC6A9",
    "wizard.seq.componentize": "\uB4F1\uB85D {registered} \xB7 \uC138\uD2B8 {sets}",
    // 마법사 완료 요약(summarize, wizard.ts)
    "wizard.sum.tokens": "\uD1A0\uD070 {n}",
    "wizard.sum.dark": "\uB2E4\uD06C {n}",
    "wizard.sum.textStyles": "\uD14D\uC2A4\uD2B8 \uC2A4\uD0C0\uC77C {n}",
    "wizard.sum.renamed": "\uC774\uB984 {n}",
    "wizard.sum.components": "\uCEF4\uD3EC\uB10C\uD2B8 {n}",
    "wizard.sum.empty": "\uB05D\uB0B8 \uC791\uC5C5\uC774 \uC5C6\uC5B4\uC694",
    // 진행 안내 단계 라벨·안내
    "pipeline.step.colors": "\uC0C9 \uBCC0\uC218",
    "pipeline.step.tokens": "\uAC04\uACA9\xB7\uD06C\uAE30 \uD1A0\uD070",
    "pipeline.step.semantics": "\uC5ED\uD560 \uB9E4\uD551",
    "pipeline.step.bind": "\uBCC0\uC218 \uC5F0\uACB0",
    "pipeline.step.dark": "\uB2E4\uD06C \uBAA8\uB4DC",
    "pipeline.step.textStyles": "\uD14D\uC2A4\uD2B8 \uC2A4\uD0C0\uC77C",
    "pipeline.step.rename": "\uC774\uB984 \uC815\uB9AC",
    "pipeline.hint.needTokens": "\uD1A0\uD070\uC744 \uBA3C\uC800 \uB9CC\uB4DC\uC138\uC694",
    "pipeline.hint.needBindable": "\uC5F0\uACB0\uD560 \uBCC0\uC218\uB97C \uBA3C\uC800 \uB9CC\uB4DC\uC138\uC694",
    /* ---------- 정적 HTML 라벨(ui.html, data-i18n[-html]) ---------- */
    "common.cancel": "\uCDE8\uC18C",
    "common.close": "\uB2EB\uAE30",
    // 변수 관리(넓은 화면)
    "vm.search": "\uBCC0\uC218 \uAC80\uC0C9",
    "vm.uses": "{n}\uACF3",
    "vm.moreTip": "\uBA54\uB274 (\uC6B0\uD074\uB9AD\uACFC \uAC19\uC74C)",
    "vm.jumpAlias": "\uAC00\uB9AC\uD0A4\uB294 \uBCC0\uC218\uB85C \uC774\uB3D9",
    "vm.noVars": "\uC774 \uD30C\uC77C\uC5D0\uB294 \uBCC0\uC218\uAC00 \uC5C6\uC5B4\uC694.",
    "vm.copyName": "\uC774\uB984 \uBCF5\uC0AC",
    "vm.copyValue": "\uAC12 \uBCF5\uC0AC",
    "vm.copyCss": "CSS \uBCC0\uC218\uBA85 \uBCF5\uC0AC",
    "vm.whatName": "\uC774\uB984",
    "vm.whatValue": "\uAC12",
    "vm.whatCss": "CSS \uBCC0\uC218\uBA85",
    "vm.copied": "{what}\uC744(\uB97C) \uBCF5\uC0AC\uD588\uC5B4\uC694: {text}",
    "vm.copyFailed": "\uBCF5\uC0AC\uAC00 \uB9C9\uD614\uC5B4\uC694 \u2014 \uC9C1\uC811 \uBCF5\uC0AC\uD558\uC138\uC694: {text}",
    "vm.copyEmpty": "\uBCF5\uC0AC\uD560 \uAC12\uC774 \uC5C6\uC5B4\uC694.",
    "vm.selectLayers": "\uC0AC\uC6A9 \uB808\uC774\uC5B4 \uC120\uD0DD",
    "vm.detail": "\uC0C1\uC138",
    "vm.edit": "\uACE0\uCE58\uAE30\u2026",
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
    "edit.closedMissing": "{name} \uD589\uC740 \uC9C0\uAE08 \uACE0\uB978 \uBAA9\uB85D\uC5D0 \uC5C6\uC5B4\uC694",
    "edit.closedPartialMissing": "\uC77C\uBD80\uB9CC \uC800\uC7A5\uB410\uC5B4\uC694 \xB7 {name} \uD589\uC740 \uC9C0\uAE08 \uACE0\uB978 \uBAA9\uB85D\uC5D0 \uC5C6\uC5B4\uC694",
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
    "vm.dCollection": "\uCEEC\uB809\uC158",
    "vm.dScopes": "\uC6A9\uB3C4",
    "vm.dDesc": "\uC124\uBA85",
    "vm.dNoUses": "\uC120\uD0DD \uC548\uC5D0\uC11C\uB294 \uC4F0\uC774\uC9C0 \uC54A\uC544\uC694.",
    // 탭
    // IA v3 레이어 › 연결(§4.6)
    "bind.tsLabel": "\uD14D\uC2A4\uD2B8 \uC2A4\uD0C0\uC77C",
    // 단계 표시 · 버튼(§4.6 그림 개편 — "찾기"는 이전의 "미리보기")
    "bind.stepsAria": "\uC5F0\uACB0 \uB2E8\uACC4",
    "bind.find": "\uCC3E\uAE30",
    "bind.refind": "\uB2E4\uC2DC \uCC3E\uAE30",
    "bind.stepPick": "\uACE0\uB974\uAE30",
    "bind.link": "\uC5F0\uACB0",
    "bind.linkN": "{n}\uACF3 \uC5F0\uACB0",
    "bind.finding": "\uCC3E\uB294 \uC911\u2026",
    "bind.needFind": "\uBA3C\uC800 [\uCC3E\uAE30]\uB97C \uB204\uB974\uC138\uC694",
    "bind.needOn": "\uC5F0\uACB0\uD560 \uBCC0\uC218\uB97C \uCF1C\uC138\uC694",
    // 빈 상태(목록 자리)
    "bind.emptyIntro": "\uAC12\uC774 \uBCC0\uC218\uC640 \uAC19\uC740 \uACF3\uC744 \uCC3E\uC544 \uC5F0\uACB0\uD574\uC694",
    "bind.emptyNoSel": "\uCE94\uBC84\uC2A4\uC5D0\uC11C \uB808\uC774\uC5B4\uB97C \uC120\uD0DD\uD558\uC138\uC694",
    // 배지 줄
    "bind.found": "\uCC3E\uC74C {n}",
    "bind.foundTip": "{name}\uC5D0\uC11C \uBCC0\uC218\uC640 \uAC19\uC740 \uAC12 {n}\uACF3\uC744 \uCC3E\uC558\uC5B4\uC694 \xB7 \uC5F0\uACB0\uD558\uC9C0 \uC54A\uC744 \uBCC0\uC218\uB294 \uB044\uC138\uC694",
    "bind.skipAria": "\uAC74\uB108\uB700 {m}\uACF3 \uC0AC\uC720 \uBCF4\uAE30",
    "bind.allOn": "\uBAA8\uB450 \uCF1C\uAE30",
    "bind.allOff": "\uBAA8\uB450 \uB044\uAE30",
    "bind.filterBtn": "\uBCC0\uC218 \uC774\uB984 \uD544\uD130",
    // 변수 카드 "값 → 변수"
    "bind.cardTip": "{name}\uC744(\uB97C) \uC774 {k}\uACF3\uC5D0 \uC5F0\uACB0\uD574\uC694 \xB7 \uC77C\uBD80\uB9CC \uBE7C\uB824\uBA74 \uADF8 \uB808\uC774\uC5B4\uB97C \uBE80 \uB098\uBA38\uC9C0\uB97C \uC120\uD0DD\uD558\uACE0 \uB2E4\uC2DC \uCC3E\uAE30",
    "bind.offTip": "\uB044\uBA74 \uC774 {k}\uACF3\uC740 \uADF8\uB300\uB85C \uB46C\uC694",
    "bind.count": "{k}\uACF3",
    "bind.placesAria": "{name} {k}\uACF3",
    "bind.switchAria": "{name} \uC5F0\uACB0",
    // 연결 후 결과 카드
    "bind.doneCard": "{n}\uACF3 \uC5F0\uACB0\uB428",
    "bind.repreview": "\uB2E4\uC2DC \uCC3E\uAE30",
    "bind.toList": "\uBCC0\uC218 \uD0ED\uC5D0\uC11C \uBCF4\uAE30 \u2192",
    "bind.doneSkipped": " \xB7 \uAC74\uB108\uB700 {m}",
    "bind.candChanged": "\uD6C4\uBCF4\uAC00 \uBC14\uB00C\uC5C8\uC5B4\uC694 \xB7 {a}\uACF3 \uCD94\uAC00 \xB7 {b}\uACF3 \uC81C\uC678",
    "bind.otherSel": "\uB2E4\uB978 \uC120\uD0DD\uC5D0\uC11C \uB9CC\uB4E0 \uACB0\uACFC\uC608\uC694",
    "bind.maybeChanged": "\uD53C\uADF8\uB9C8\uC5D0\uC11C \uBC14\uB00C\uC5C8\uC744 \uC218 \uC788\uC5B4\uC694",
    "bind.selChanged": "\uC120\uD0DD\uC774 \uBC14\uB00C\uC5C8\uC5B4\uC694 \xB7 \uB2E4\uC2DC \uCC3E\uC544 \uC8FC\uC138\uC694",
    "bind.noLocalLib": "\uC774 \uD30C\uC77C\uC5D4 \uB85C\uCEEC \uBCC0\uC218\uAC00 \uC5C6\uC5B4\uC694 \xB7 \uB77C\uC774\uBE0C\uB7EC\uB9AC \uBCC0\uC218 \uC5F0\uACB0\uC740 \uD53C\uADF8\uB9C8 \uC624\uB978\uCABD \uD328\uB110\uC5D0\uC11C \uD574\uC694",
    "bind.noTier": "\uBCC0\uC218\uB294 \uC788\uC9C0\uB9CC \uACC4\uCE35\uC774 \uC9C0\uC815\uB418\uC9C0 \uC54A\uC558\uC5B4\uC694",
    "bind.gotoTiers": "\uACC4\uCE35 \uC9C0\uC815\uD558\uAE30 \u2192",
    "bind.noVarsPaid": "\uBA3C\uC800 \uD1A0\uD070 \uB9CC\uB4E4\uAE30\uC5D0\uC11C \uC5F0\uACB0\uD560 \uBCC0\uC218\uB97C \uB9CC\uB4DC\uC138\uC694.",
    "bind.noVarsFree": "\uC5F0\uACB0\uD560 \uBCC0\uC218\uAC00 \uC5C6\uC5B4\uC694 \xB7 \uBCC0\uC218 \uB9CC\uB4E4\uAE30\uB294 \uC720\uB8CC \uAE30\uB2A5\uC774\uC5D0\uC694",
    "bind.tsDone": "\u2713 \uD14D\uC2A4\uD2B8 {n}\uAC1C\uC5D0 \uC2A4\uD0C0\uC77C \uC5F0\uACB0",
    "tsSkip.hasStyle": "\uC774\uBBF8 \uC2A4\uD0C0\uC77C \uC788\uC74C",
    "tsSkip.noStyle": "\uAC19\uC740 \uC2A4\uD0C0\uC77C \uC5C6\uC74C",
    "tsSkip.ambiguous": "\uAC19\uC740 \uBAA8\uC591 \uC2A4\uD0C0\uC77C\uC774 \uB458 \uC774\uC0C1",
    "tsSkip.boundVars": "\uAE00\uC790 \uC18D\uC131\uC5D0 \uBCC0\uC218 \uC788\uC74C",
    "tsSkip.mixed": "\uC11C\uC2DD\uC774 \uC11E\uC784",
    "tsSkip.instance": "\uC778\uC2A4\uD134\uC2A4 \uC548\uCABD",
    "bind.tsNone": "\uB4F1\uB85D\uB41C \uD14D\uC2A4\uD2B8 \uC2A4\uD0C0\uC77C\uC774 \uC5C6\uC5B4\uC694 \xB7 \uD0C0\uC774\uD3EC\uC5D0\uC11C \uB4F1\uB85D \u2192(\uC720\uB8CC)",
    "bind.tsNoneText": "\uB4F1\uB85D\uB41C \uD14D\uC2A4\uD2B8 \uC2A4\uD0C0\uC77C\uC774 \uC5C6\uC5B4\uC694",
    "bind.tsGotoType": "\uD0C0\uC774\uD3EC\uC5D0\uC11C \uB4F1\uB85D \u2192(\uC720\uB8CC)",
    // IA v3 변수 탭(§4.2~§4.4)
    "var.loading": "\uBCC0\uC218 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\u2026",
    "start.head": "\uC544\uC9C1 \uB85C\uCEEC \uBCC0\uC218\uAC00 \uC5C6\uC5B4\uC694",
    "start.sub": "\uC120\uD0DD\uD55C \uD504\uB808\uC784\uC5D0\uC11C \uB9CC\uB4E4\uC5B4 \uBCF4\uC138\uC694",
    "start.freeNote": "\u24D8 \uBB34\uB8CC \uBC84\uC804\uC5D0\uC11C\uB294 \uBCC0\uC218\uB97C \uC0C8\uB85C \uB9CC\uB4E4 \uC218 \uC5C6\uC5B4\uC694",
    "start.freeNote2": "\uC774\uB984 \uC815\uB9AC\uC640 \uAE30\uC874 \uBCC0\uC218 \uC5F0\uACB0\uC740 \uBB34\uB8CC",
    "start.freeExtract": "(\uCD94\uCD9C\uAE4C\uC9C0 \uBB34\uB8CC)",
    "start.libNote": "\u24D8 \uB77C\uC774\uBE0C\uB7EC\uB9AC \uBCC0\uC218\uB294 \uC6D0\uBCF8 \uD30C\uC77C\uC5D0\uC11C \uAD00\uB9AC\uD574\uC694. \uAC19\uC740 \uBCC0\uC218\uB97C \uC5EC\uAE30\uC11C \uB610 \uB9CC\uB4E4 \uD544\uC694\uB294 \uC5C6\uC5B4\uC694.",
    "start.made": "\uBCC0\uC218 {n}\uAC1C\uB97C \uB9CC\uB4E4\uC5C8\uC5B4\uC694",
    "start.viewList": "\uBCC0\uC218 \uBAA9\uB85D \uBCF4\uAE30",
    "wizardCard.hintPaid": "\uC120\uD0DD\uD55C \uD504\uB808\uC784\uC758 \uC0C9\xB7\uAC04\uACA9\uC744 \uBCC0\uC218\uB85C \uB9CC\uB4E4\uC5B4\uC694. \uB808\uC774\uC5B4 \uC5F0\uACB0\uC740 \uB05D\uB09C \uB4A4 \uD655\uC778\uD558\uACE0 \uD574\uC694",
    "wizardCard.noSel": "\uB808\uC774\uC5B4\uB97C \uC120\uD0DD\uD558\uBA74 \uC2E4\uD589\uD560 \uC218 \uC788\uC5B4\uC694",
    "wizard.toBind": "\uB808\uC774\uC5B4 \u203A \uC5F0\uACB0\uC5D0\uC11C \uD655\uC778\uD558\uACE0 \uC5F0\uACB0\uD558\uAE30 \u2192",
    "wizard.seq.cancelSkipped": "\uCDE8\uC18C\uB85C \uAC74\uB108\uB700",
    "wizardCard.hintFree": "\uBB34\uB8CC \uBC84\uC804\uC5D0\uC11C\uB294 \uB808\uC774\uC5B4 \uC774\uB984\uB9CC \uC815\uB9AC\uB3FC\uC694. \uBCC0\uC218 \uB9CC\uB4E4\uAE30\uB294 \uC720\uB8CC\uC608\uC694",
    "wizardCard.runFree": "\uC774\uB984 \uC815\uB9AC \uC2E4\uD589",
    "wizard.freeSum": "\uB808\uC774\uC5B4 \uC774\uB984 {n}\uAC1C \uC815\uB9AC \xB7 \uBCC0\uC218\uB294 \uB9CC\uB4E4\uC9C0 \uC54A\uC558\uC5B4\uC694",
    "wizard.madeStatus": "\uBCC0\uC218 {n}\uAC1C \uC0DD\uC131",
    "list.readiness": "\uC900\uBE44 \uD604\uD669 {n}/{total} \u25BE",
    "list.findUnbound": "\uBCC0\uC218 \uC5C6\uB294 \uAC12 \uCC3E\uAE30 \u2192",
    "list.findUnboundTip": "\uC120\uD0DD\uC5D0\uC11C \uBCC0\uC218\uB85C \uBC14\uAFC0 \uC218 \uC788\uB294 \uC0C9\xB7\uAC04\uACA9\uC744 \uB808\uC774\uC5B4 \u203A \uC5F0\uACB0\uC5D0\uC11C \uCC3E\uC544\uC694",
    "list.addTip": "\uC120\uD0DD\uD55C \uD504\uB808\uC784\uC5D0\uC11C \uBCC0\uC218 \uB9CC\uB4E4\uAE30(\uC0C9\xB7\uD1A0\uD070\xB7\uD14C\uB9C8\xB7\uD0C0\uC774\uD3EC)",
    "list.moreTip": "\uB354 \uBCF4\uAE30",
    "list.refreshTip": "\uB2E4\uC2DC \uC77D\uAE30",
    "list.modeTip": "\uBAA8\uB4DC",
    "list.modeDefault": "\uAE30\uBCF8 \uBAA8\uB4DC",
    "list.searchTip": "\uAC80\uC0C9",
    "list.chipTip": "\uC120\uD0DD\uC5D0\uC11C \uC4F0\uB294 \uBCC0\uC218 {used}\uAC1C(\uC9C1\uC811 {direct} \xB7 \uAC04\uC811 {indirect}) / \uC804\uCCB4 {total}\uAC1C",
    "list.reading": "\uC120\uD0DD\uC5D0\uC11C \uC4F0\uB294 \uBCC0\uC218 \uC77D\uB294 \uC911\u2026",
    "list.refreshSame": "\uB2E4\uC2DC \uC77D\uC74C \xB7 \uBCC0\uACBD \uC5C6\uC74C",
    "list.refreshUsage": "\uB2E4\uC2DC \uC77D\uC74C \xB7 \uC0AC\uC6A9 \uC218\uAC00 \uBC14\uB010 \uBCC0\uC218 {n}\uAC1C",
    "list.refreshTable": "\uB2E4\uC2DC \uC77D\uC74C \xB7 \uBCC0\uC218 \uBAA9\uB85D\uC774 \uBC14\uB00C\uC5C8\uC5B4\uC694",
    "list.refreshCountSuffix": " \xB7 \uC0AC\uC6A9 \uC218\uAC00 \uBC14\uB010 \uBCC0\uC218 {n}\uAC1C",
    "list.big": "\uC120\uD0DD\uC774 \uCEE4\uC11C \uC790\uB3D9\uC73C\uB85C \uC77D\uC9C0 \uC54A\uC544\uC694",
    "list.read": "\uC77D\uAE30",
    "list.wizardWait": "\uB9C8\uBC95\uC0AC\uAC00 \uB05D\uB098\uBA74 \uC77D\uC5B4\uC694",
    "list.noneUsed": "\uC774 \uC120\uD0DD\uC740 \uB85C\uCEEC \uBCC0\uC218\uB97C \uC4F0\uC9C0 \uC54A\uC544\uC694",
    "list.selectHint": "\uB808\uC774\uC5B4\uB97C \uC120\uD0DD\uD558\uBA74 \uC4F0\uB294 \uBCC0\uC218\uAC00 \u2605 Inspect\uC5D0 \uBAA8\uC5EC\uC694",
    "list.inspect": "\u2605 Inspect",
    "list.inspectTip": "Inspect \u2014 \uC120\uD0DD\uC5D0\uC11C \uC4F0\uB294 \uBCC0\uC218",
    "list.inspectAria": "Inspect \u2014 \uC120\uD0DD\uC5D0\uC11C \uC4F0\uB294 \uBCC0\uC218, {n}\uAC1C",
    "list.inspectNoSel": "\uB808\uC774\uC5B4\uB97C \uC120\uD0DD\uD558\uBA74 \uC4F0\uB294 \uBCC0\uC218\uAC00 \uC5EC\uAE30\uC5D0 \uBAA8\uC5EC\uC694",
    "list.libItem": "\uB77C\uC774\uBE0C\uB7EC\uB9AC",
    "list.libItemAria": "\uB77C\uC774\uBE0C\uB7EC\uB9AC, \uC4F0\uB294 \uBCC0\uC218 {n}\uAC1C",
    "list.deletedItem": "\uC0AD\uC81C\uB41C \uBCC0\uC218",
    "list.deletedItemAria": "\uC0AD\uC81C\uB41C \uBCC0\uC218\uC5D0 \uC5F0\uACB0\uB41C \uACF3 {n}\uAC1C",
    "list.sideColAria": "{name}, \uACC4\uCE35 {badge}, {num}",
    "list.sideGrpAria": "{name}, {num}",
    "list.sideExpand": "\uD3BC\uCE58\uAE30",
    "list.sideCollapse": "\uC811\uAE30",
    "list.searchTitle": "'{q}' \uAC80\uC0C9 \uACB0\uACFC",
    "list.noGroup": "(\uADF8\uB8F9 \uC5C6\uC74C)",
    "list.totalTip": "\uC804\uCCB4 {total}\uAC1C",
    "list.baseDiff": "\uBAA9\uB85D \uAE30\uC900: {name} \xB7 \uC9C0\uAE08 \uC120\uD0DD\uACFC \uB2EC\uB77C\uC694 \xB7 ",
    "list.baseDiffNoSel": "\uBAA9\uB85D \uAE30\uC900: {name} \xB7 \uC9C0\uAE08 \uC120\uD0DD \uC5C6\uC74C \xB7 ",
    "list.baseMany": "\uB808\uC774\uC5B4 {m}\uAC1C",
    "list.rebase": "\uAE30\uC900 \uBC14\uAFB8\uAE30",
    "list.unused": "\uC548 \uC500",
    "list.indirect": "\u21B3",
    "list.indirectTip": "\uC9C1\uC811 \uBD99\uC5B4 \uC788\uC9C4 \uC54A\uACE0, {alias} \uAC19\uC740 \uBCC4\uCE6D\uC744 \uD1B5\uD574 \uC4F0\uC5EC\uC694",
    "list.usesTip": "\uB808\uC774\uC5B4 {k}\uAC1C \xB7 {n}\uACF3",
    "list.hiddenRow": "\uC120\uD0DD\uC5D0\uC11C \uC548 \uC4F0\uC5EC \uBAA9\uB85D\uC5D0\uC11C \uBE60\uC84C\uC5B4\uC694",
    "list.noMatch": "'{q}'\uC640 \uB9DE\uB294 \uBCC0\uC218\uAC00 \uC5C6\uC5B4\uC694",
    "list.searchClear": "\uAC80\uC0C9 \uC9C0\uC6B0\uAE30",
    "list.libSection": "LIB \xB7 \uC120\uD0DD\uC5D0\uC11C \uC4F0\uB294 \uAC83",
    "list.libVar": "\uB77C\uC774\uBE0C\uB7EC\uB9AC \uBCC0\uC218\uC608\uC694 \xB7 \uC6D0\uBCF8 \uD30C\uC77C\uC5D0\uC11C \uAD00\uB9AC\uD574\uC694",
    "list.libCollection": "\uB77C\uC774\uBE0C\uB7EC\uB9AC \xB7 {name}",
    "list.libManaged": "\uC6D0\uBCF8 \uD30C\uC77C\uC5D0\uC11C \uAD00\uB9AC\uD574\uC694",
    "list.deleted": "\uC0AD\uC81C\uB41C \uBCC0\uC218\uC5D0 \uC5F0\uACB0\uB41C \uACF3 {n}\uAC1C",
    "list.select": "\uC120\uD0DD",
    "list.jumped": "{name} \uD589\uC73C\uB85C \uC62E\uACBC\uC5B4\uC694",
    "list.undo": "\u2190 \uB418\uB3CC\uB9AC\uAE30",
    "list.selectFirstNote": "\uB808\uC774\uC5B4\uB97C \uC120\uD0DD\uD558\uBA74 \uADF8 \uC548\uC5D0\uC11C \uCC3E\uC544\uC694",
    "list.selectViaAlias": "\uBCC4\uCE6D\uC73C\uB85C \uC4F0\uB294 \uB808\uC774\uC5B4 \uC120\uD0DD",
    "select.capped": "\uB808\uC774\uC5B4 {found}\uAC1C\uB9CC \uC120\uD0DD\uD588\uC5B4\uC694(\uC804\uCCB4 {requested}\uAC1C)",
    "select.none": "\uC120\uD0DD\uD560 \uB808\uC774\uC5B4\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC5B4\uC694 \u2014 \uC0AD\uC81C\uB410\uAC70\uB098 \uB2E4\uB978 \uD398\uC774\uC9C0\uC608\uC694",
    "select.partial": "\uB808\uC774\uC5B4 {found}\uAC1C \uC120\uD0DD \u2014 {missing}\uAC1C\uB294 \uC0AD\uC81C\uB410\uAC70\uB098 \uB2E4\uB978 \uD398\uC774\uC9C0\uC608\uC694",
    "list.dValue": "\uAC12",
    "list.dUses": "\uC4F0\uC778 \uACF3",
    "list.detailBig": "\uC120\uD0DD\uC774 \uCEE4\uC11C \uC790\uB3D9\uC73C\uB85C \uCC3E\uC9C0 \uC54A\uC544\uC694",
    "list.find": "\uCC3E\uAE30",
    "list.usesHead": "\uB808\uC774\uC5B4 {k}\uAC1C \xB7 {n}\uACF3 \xB7 \uC778\uC2A4\uD134\uC2A4 \uC548\uCABD \uD3EC\uD568",
    "list.usesMore": "\uC678 {n}\uAC1C",
    "list.viaAlias": "\uBCC4\uCE6D\uC744 \uD1B5\uD574 \uC4F0\uC784: {names}",
    "list.menuTiers": "\uCEEC\uB809\uC158 \uACC4\uCE35 \uC9C0\uC815\u2026",
    "list.menuExport": "\uCF54\uB4DC\uB85C \uB0B4\uBCF4\uB0B4\uAE30\u2026",
    "list.menuExpandAll": "\uC0AC\uC774\uB4DC\uBC14 \uBAA8\uB450 \uD3BC\uCE58\uAE30",
    "list.menuCollapseAll": "\uC0AC\uC774\uB4DC\uBC14 \uBAA8\uB450 \uC811\uAE30",
    "list.semanticsNote": "\uC5ED\uD560 \uB9E4\uD551\uC740 \uD1A0\uD070\uC744 \uC801\uC6A9\uD560 \uB54C \uD568\uAED8 \uB9CC\uB4E4\uC5B4\uC838\uC694",
    "tab.variables": "\uBCC0\uC218",
    "tab.layer": "\uB808\uC774\uC5B4",
    "tab.settings": "\uC124\uC815",
    // 최소화(IA v3 §4.9)
    "ui.minimize": "\uCD5C\uC18C\uD654",
    "ui.expand": "\uD3BC\uCE58\uAE30",
    "ui.expandBusy": "\uD3BC\uCE58\uAE30 \xB7 \uC791\uC5C5 \uC911",
    "ui.expandFail": "\uD3BC\uCE58\uAE30 \xB7 \uC2E4\uD328\uD55C \uC791\uC5C5 \uC788\uC74C",
    // 선택 표시줄(§4.1)
    "sel.unnamed": "(\uC774\uB984 \uC5C6\uC74C)",
    "sel.noneHere": "\uC120\uD0DD\uC774 \uC5C6\uC5B4\uC694 \u2014 \uCE94\uBC84\uC2A4\uC5D0\uC11C \uB808\uC774\uC5B4\uB97C \uC120\uD0DD\uD558\uC138\uC694",
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
    "op.semantics": "\uC5ED\uD560 \uB9E4\uD551",
    "op.dark": "\uB2E4\uD06C \uB9CC\uB4E4\uAE30",
    "op.textScan": "\uD14D\uC2A4\uD2B8 \uC2A4\uCE94",
    "op.textStyles": "\uD14D\uC2A4\uD2B8 \uC2A4\uD0C0\uC77C \uB4F1\uB85D",
    "op.textApply": "\uD14D\uC2A4\uD2B8 \uC2A4\uD0C0\uC77C \uC5F0\uACB0",
    "op.bind": "\uC5F0\uACB0",
    "op.rename": "\uC774\uB984 \uC815\uB9AC",
    "op.components": "\uCEF4\uD3EC\uB10C\uD2B8",
    "op.export": "\uB0B4\uBCF4\uB0B4\uAE30",
    "op.roles": "\uACC4\uCE35 \uC9C0\uC815",
    "op.wizard": "\uD55C \uBC88\uC5D0 \uC815\uB9AC",
    // 변수 탭 하위 화면(PR 1 중간 상태)
    "var.goMake": "\uC0C9\uBD80\uD130 \uD558\uB098\uC529 \uB9CC\uB4E4\uAE30 \u2192",
    "make.back": "\u2190 \uB3CC\uC544\uAC00\uAE30",
    // 단계 레일(#5) — 만들기 4단계 · 적용 3단계
    "rail.color": "\uC0C9",
    "rail.colorSub": "\uCD94\uCD9C\xB7\uBCC0\uC218",
    "rail.token": "\uD1A0\uD070",
    "rail.tokenSub": "\uAC04\uACA9\xB7\uD06C\uAE30",
    "rail.theme": "\uD14C\uB9C8",
    "rail.themeSub": "\uB2E4\uD06C \uBAA8\uB4DC",
    "rail.type": "\uD0C0\uC774\uD3EC",
    "rail.typeSub": "\uD14D\uC2A4\uD2B8 \uC2A4\uD0C0\uC77C",
    "rail.bind": "\uC5F0\uACB0",
    "rail.rename": "\uC774\uB984",
    "rail.structure": "\uCEF4\uD3EC\uB10C\uD2B8",
    "rail.next": "\uB2E4\uC74C \u2192",
    // 플러그인 설정(#19) — 설정 탭에만
    "settings.title": "\uAE30\uBCF8\uAC12",
    "colRoles.title": "\uCEEC\uB809\uC158 \uACC4\uCE35",
    "colRoles.hint": "\uC774\uB984\uC774 Global\xB7Semantic\xB7Component\uAC00 \uC544\uB2CC \uCEEC\uB809\uC158\uB3C4 \uACC4\uCE35\uC73C\uB85C \uC4F0\uAC8C \uC9C0\uC815\uD574\uC694. \uD30C\uC77C\uC5D0 \uC800\uC7A5\uB3FC \uC774 \uD30C\uC77C\uC744 \uC5EC\uB294 \uBAA8\uB450\uC5D0\uAC8C \uC801\uC6A9\uB3FC\uC694",
    "colRoles.empty": "\uC774 \uD30C\uC77C\uC5D0\uB294 \uBCC0\uC218 \uCEEC\uB809\uC158\uC774 \uC5C6\uC5B4\uC694.",
    "colRoles.vars": "\uBCC0\uC218 {n}",
    "colRoles.auto": "\uC790\uB3D9 \u2014 {role}",
    "colRoles.autoNone": "\uC790\uB3D9 \u2014 \uACC4\uCE35 \uC544\uB2D8",
    "colRoles.none": "\uACC4\uCE35 \uC544\uB2D8",
    "colRoles.guess": "\uCD94\uCC9C: {role}",
    "colRoles.useGuess": "\uCD94\uCC9C\uB300\uB85C",
    "colRoles.saved": "{name} \u2192 {role}. \uC5F0\uACB0\xB7\uC5ED\uD560 \uCD94\uCC9C\xB7\uB0B4\uBCF4\uB0B4\uAE30\uAC00 \uC774 \uC9C0\uC815\uC744 \uB530\uB77C\uC694",
    "colRoles.dup": "{role}\uC740(\uB294) \uD55C \uCEEC\uB809\uC158\uB9CC \uB9E1\uC544\uC694 \u2014 {prev}\uC758 \uC9C0\uC815\uC740 \uD480\uC5C8\uC5B4\uC694.",
    "settings.hint": "\uB9CC\uB4E4\uAE30 \xB7 \uC5F0\uACB0 \xB7 \uC774\uB984 \uC815\uB9AC\uC5D0 \uC4F0\uB294 \uAC12\uC774\uC5D0\uC694",
    "settings.base": "\uAE30\uC900 \uD06C\uAE30",
    "settings.depth": "\uC774\uB984 \uC815\uB9AC \uAE4A\uC774",
    // 수동·폴백 행의 값 입력 칸 툴팁(칸이 좁아 라벨 대신 툴팁으로 설명한다).
    "ts.family": "\uD3F0\uD2B8 \uC774\uB984 \u2014 \uC774 \uC774\uB984 \uADF8\uB300\uB85C \uC2A4\uD0C0\uC77C\uC5D0 \uC368\uC694",
    "ts.size": "\uAE00\uC790 \uD06C\uAE30(px)",
    "ts.lineHeight": "\uD589\uAC04(px) \xB7 0\uC774\uBA74 AUTO",
    "ts.letterSpacing": "\uC790\uAC04(px) \xB7 \uC74C\uC218\uB3C4 \uB3FC\uC694",
    "ts.weight": "\uAD75\uAE30 \u2014 Regular \xB7 Medium \xB7 SemiBold \xB7 Bold \uCC98\uB7FC Figma\uAC00 \uC4F0\uB294 \uC774\uB984",
    "settings.grid": "\uC5EC\uBC31\xB7\uD06C\uAE30 \uACA9\uC790",
    "settings.gridTip": "\uC5EC\uBC31\xB7\uD06C\uAE30 \uD1A0\uD070\uC744 \uB9CC\uB4E4\uAE30\uC5D0\uC11C \uC774 \uACA9\uC790\uB85C \uBAA8\uC544\uC694. \uC608: 8\uC774\uBA74 13\xB715\uAC00 16\uC73C\uB85C. \uC62E\uAE34 \uAC12\uC758 \uBCC0\uC218\uB294 \uC6D0\uB798 \uB808\uC774\uC5B4\uC5D0 \uC5F0\uACB0\uB418\uC9C0 \uC54A\uC544\uC694.",
    // 격자로 옮긴 값이 허용오차 밖이면 스냅은 되고 연결만 실패한다 — 실제로 옮겼을 때만 붙이는 꼬리.
    "create.snapNoBind": " \xB7 \uACA9\uC790\uB85C \uC62E\uAE34 {k}\uAC1C \uAC12\uC740 \uC6D0\uB798 \uB808\uC774\uC5B4\uC640 \uB2EC\uB77C \uC5F0\uACB0\uB418\uC9C0 \uC54A\uC544\uC694",
    // 격자는 설정에서 고르는 값이라 스냅은 정책이 아니라 선택이다 — 색 정리와 같은 되돌리기.
    "create.tidyUndo": "\uB418\uB3CC\uB9AC\uAE30",
    // 마법사 카드
    "wizardCard.title": "\uD55C \uBC88\uC5D0 \uC815\uB9AC",
    "wizardCard.hint": "\uC120\uD0DD\uD55C \uD504\uB808\uC784\uC758 \uC0C9\xB7\uAC04\uACA9\uC744 \uBCC0\uC218\uB85C \uB9CC\uB4E4\uACE0 \uB808\uC774\uC5B4 \uC774\uB984\uC744 \uC815\uB9AC\uD574\uC694",
    "wizardCard.optSemantics": "\uC5ED\uD560 \uB9E4\uD551",
    "wizardCard.optDark": "\uB2E4\uD06C",
    "wizardCard.optTextStyles": "\uD14D\uC2A4\uD2B8 \uC2A4\uD0C0\uC77C",
    "wizardCard.optComponentize": "\uCEF4\uD3EC\uB10C\uD2B8",
    "wizardCard.run": "\uC804\uCCB4 \uC2E4\uD589",
    // 칩의 「변수연결」과 체크박스의 「역할 매핑」을 가르는 범례 — 붙여 쓴 「변수연결」은
    // 파이프 칩(wizard.step.bind) 표기 그대로다(적용 탭 카드 제목은 띄어 쓴 「변수 연결」).
    "wizardCard.legend": "\uC5ED\uD560 \uB9E4\uD551=\uC0C9 \uC5ED\uD560 \xB7 \uB2E4\uD06C=\uB77C\uC774\uD2B8\uC5D0\uC11C \uC5B4\uB450\uC6B4 \uAC12 \uCC44\uC6B0\uAE30",
    // 공통(정적 라벨)
    "common.selectAll": "\uC804\uCCB4",
    "prereq.gotoCreate": "\uD1A0\uD070 \uB9CC\uB4E4\uAE30\uB85C \u2192",
    // 온보딩 / 가이드
    // 첫 실행 배너(온보딩 흡수)
    // 진행(파이프라인 카드)
    // 브랜드 팔레트
    "color.title": "\uC0C9",
    "color.scope": "\uBCC0\uC218\uD654",
    "color.listHint": "\uCD94\uCD9C\xB7\uC815\uB9AC\uB41C \uC0C9 \xB7 Global = hue \xB7 Semantic = \uC5ED\uD560",
    "color.makeVars": "\uC0C9 \uBCC0\uC218 \uB9CC\uB4E4\uAE30",
    "palette.brand2": "\uBCF4\uC870\uC0C9",
    "palette.harmony": "\uD558\uBAA8\uB2C8",
    "palette.neutral": "\uC911\uB9BD",
    "palette.status": "\uC0C1\uD0DC",
    "palette.gen": "\uD314\uB808\uD2B8 \uC0DD\uC131",
    // 하모니 선택지 — 보조색을 브랜드색에서 몇 도 돌려 뽑을지.
    "harmony.complementary": "\uBCF4\uC0C9",
    "harmony.analogous": "\uC720\uC0AC",
    "harmony.triadic": "\uC0BC\uAC01",
    "harmony.split": "\uBD84\uD560\uBCF4\uC0C9",
    "harmony.tetradic": "\uC0AC\uAC01",
    // 추출
    "extract.scanBtn": "\uC120\uD0DD\uC5D0\uC11C \uCD94\uCD9C",
    // 색 정리(추출 카드에 흡수)
    "colorTidy.hint": "\uBF51\uAC70\uB098 \uD314\uB808\uD2B8\uB97C \uB9CC\uB4E0 \uB4A4, \uBAA9\uB85D\uC5D0\uC11C \uC5ED\uD560\uC744 \uC815\uD558\uACE0 \uBCC0\uC218\uB85C \uB9CC\uB4E4\uC5B4\uC694. \uBCF4\uC870\uC0C9\uC744 \uCF20 \uB4A4\uC5D0\uB9CC \uD558\uBAA8\uB2C8\uB97C \uACE0\uB97C \uC218 \uC788\uC5B4\uC694. \uCD94\uCD9C\uC740 \uBB34\uB8CC \xB7 \uD314\uB808\uD2B8\xB7\uBCC0\uC218\uD654\uB294 \uC720\uB8CC",
    "colorTidy.hintTip": "\uCD94\uCD9C\uD55C \uC0C9\uC740 \uC804\uBD80 \uBCC0\uC218\uAC00 \uB3FC\uC694. Global \uC774\uB984\uC740 hue \uD328\uBC00\uB9AC(color/blue/500 \xB7 \uAC19\uC740 \uB2E8\uACC4\uBA74 -2, -3), \uC5ED\uD560\uC740 Semantic\uC73C\uB85C \uBD99\uC5B4\uC694.",
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
    "semantic.title": "\uC2DC\uB9E8\uD2F1 \uB9E4\uD551 (\uC5ED\uD560 \u2192 \uD1A0\uD070)",
    "semantic.formatLabel": "\uD615\uC2DD: <code>\uC5ED\uD560 = Global\uBCC0\uC218\uC774\uB984</code>",
    "semantic.aliasBtn": "\uC2DC\uB9E8\uD2F1 \uBCC4\uCE6D \uC0DD\uC131",
    "semantic.scanBtn": "\uAE30\uC874 \uC0C9\uC5D0\uC11C \uCD94\uCC9C",
    // 텍스트 스타일
    "textStyle.title": "\uD14D\uC2A4\uD2B8 \uC2A4\uD0C0\uC77C",
    "textStyle.hint": "\uC2A4\uCE94 \uD6C4 \uC774\uB984\uC744 \uB2E4\uB4EC\uACE0 \uB4F1\uB85D\uD558\uC138\uC694. \uD654\uBA74 \uC5F0\uACB0\uC740 \uB808\uC774\uC5B4 \u203A \uC5F0\uACB0\uC5D0\uC11C",
    "textStyle.scanBtn": "\uC2A4\uCE94",
    "textStyle.addRow": "\uD589 \uCD94\uAC00",
    // 스캔의 옵션이 아니라 스캔 뒤에 누르는 동작(결정 2026-08-06) — 라벨도 「~으로」가 아니라 「~ 채우기」로,
    // 지금 무슨 일이 일어나는지를 적는다.
    "textStyle.rowLabelBtn": "\uC67C\uCABD \uAE00\uC790\uB85C \uC774\uB984 \uCC44\uC6B0\uAE30",
    "textStyle.rowLabelTip": "\uAC19\uC740 \uAC00\uB85C \uC904\uC758 \uC67C\uCABD \uD14D\uC2A4\uD2B8\uB97C \uB77C\uBCA8(\uC774\uB984)\uC73C\uB85C, \uD070 \uD14D\uC2A4\uD2B8\uB97C \uD45C\uBCF8\uC73C\uB85C \uBD10\uC694. \uC9DD\uC744 \uBABB \uCC3E\uC740 \uD589\uC740 \uD06C\uAE30 \uC21C \uC774\uB984(display/h1\u2026) \uADF8\uB300\uB85C \uB46C\uC694.",
    "textStyle.applyExistingBtn": "\uAE30\uC874 \uC2A4\uD0C0\uC77C \uC5F0\uACB0",
    "textStyle.applyExistingTip": "\uC120\uD0DD\uD55C \uAE00\uC790\uB97C \uC774\uBBF8 \uB9CC\uB4E0 \uAC19\uC740 \uC2A4\uD0C0\uC77C\uC5D0 \uC5F0\uACB0\uD574\uC694. \uC0C8\uB85C \uB9CC\uB4E4\uC9C0 \uC54A\uC544\uC694.",
    "textStyle.registerBtn": "\uB4F1\uB85D",
    // 스타일 행의 이름 칸 — 파랑(등록됨) / 앰버(신규)로 갈리는 뜻을 툴팁이 말한다.
    "textStyle.namePlaceholder": "\uC2A4\uD0C0\uC77C \uC774\uB984",
    "textStyle.nameBoundTip": "\uC774\uBBF8 \uB4F1\uB85D\uB41C \uC2A4\uD0C0\uC77C\uC774\uC5D0\uC694. \uC774\uB984\uC744 \uBC14\uAFB8\uBA74 \uC774 \uC2A4\uD0C0\uC77C\uC758 \uC774\uB984\uB9CC \uBC14\uB00C\uC5B4\uC694(\uC0C8\uB85C \uB9CC\uB4E4\uC9C0 \uC54A\uC74C).",
    "textStyle.nameNewTip": "\uC0C8 \uC2A4\uD0C0\uC77C\uB85C \uB4F1\uB85D\uB3FC\uC694(\uC544\uC9C1 \uB4F1\uB85D \uC548 \uB41C \uAE00\uC790).",
    // ×N 배지 — 1개면 그 글자로 이동, 여럿이면 전부 선택.
    "textStyle.badgeGoTip": "\uC774 \uAE00\uC790\uB85C \uC774\uB3D9",
    "textStyle.badgeSelectTip": "\uC774 \uC2A4\uD0C0\uC77C\uC744 \uC4F0\uB294 \uAE00\uC790 {count}\uAC1C \uC804\uCCB4 \uC120\uD0DD",
    // 적용(바인딩)
    "bind.nothing": "\uC5F0\uACB0\uD560 \uACF3\uC774 \uC5C6\uC5B4\uC694",
    "bind.skipTotal": "\uAC74\uB108\uB700 {m}",
    "bind.skipCappedTip": " \xB7 \uBAA9\uB85D\uC740 {shown}\uAC1C\uAE4C\uC9C0",
    "bind.descNone": "{name}\uC5D0\uC11C \uBCC0\uC218\uC640 \uAC19\uC740 \uAC12\uC744 \uCC3E\uC9C0 \uBABB\uD588\uC5B4\uC694",
    "bind.selMany": "\uB808\uC774\uC5B4 {k}\uAC1C",
    "bind.outside": "\uD544\uD130 \uBC16 {h}\uACF3 \uD3EC\uD568",
    "bind.placeCount": " \xB7 {k}\uACF3",
    "bind.layerTip": "\uCE94\uBC84\uC2A4\uC5D0\uC11C \uC120\uD0DD \xB7 \uC774 \uBAA9\uB85D\uC740 \uADF8\uB300\uB85C \uB46C\uC694",
    "bind.progress": "\uC9C4\uD589\uB960",
    // 스킵 칩 툴팁 — 사유 건수(속성 단위)와 레이어 수가 다를 수 있어 레이어 쪽을 따로 밝힌다.
    "bind.skipChipTip": "\uB808\uC774\uC5B4 {count}\uAC1C \uC120\uD0DD \u2014 {names}",
    "bind.skipChipTipMore": "\uB808\uC774\uC5B4 {count}\uAC1C \uC120\uD0DD \u2014 {names} \uC678",
    // 색 역할(Semantic) 어휘 — 드롭다운은 `한글 · role`로 병기한다(와이어).
    // 키의 `-`는 역할 이름의 `/`(surface/muted)를 대신한다 — 점 표기 키와 섞이지 않게.
    // 키 = `color/` 접두사를 뗀 역할 경로의 `/`→`-` (color/background/brand-bold → background-brand-bold).
    "role.none": "\uC5ED\uD560 \uC5C6\uC74C",
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
    "rename.title": "\uC774\uB984 \uC815\uB9AC",
    "rename.hint": "\uC5ED\uD560\uC5D0 \uB9DE\uB294 \uB808\uC774\uC5B4 \uC774\uB984\uC73C\uB85C \uBC14\uAFD4\uC694. \uCD5C\uC0C1\uC704\xB7\uC778\uC2A4\uD134\uC2A4 \uC774\uB984\uC740 \uADF8\uB300\uB85C \uB46C\uC694",
    "rename.preview": "\uBBF8\uB9AC\uBCF4\uAE30",
    "rename.apply": "\uC774\uB984 \uC801\uC6A9",
    // 이름을 지키는 사유(#7b) — 미리보기의 흐린 행에 붙는다. 키는 KeepReason과 1:1.
    "rename.keep.root": "\uB8E8\uD2B8 \uBCF4\uC874",
    "rename.keep.instance": "\uC778\uC2A4\uD134\uC2A4 \uBCF4\uC874",
    "rename.keep.component": "\uCEF4\uD3EC\uB10C\uD2B8 \uBCF4\uC874",
    "rename.keep.text": "\uD14D\uC2A4\uD2B8 \uBCF4\uC874",
    "rename.keep.locked": "\uC7A0\uAE34 \uB808\uC774\uC5B4",
    "rename.keep.meta": "\uC7A0\uAE08",
    "rename.hideKeep": "\uC7A0\uAE08 \uC81C\uC678",
    "rename.showKeep": "\uC7A0\uAE08 \uD45C\uC2DC",
    // 컴포넌트 / 베리언트
    "structure.title": "\uCEF4\uD3EC\uB10C\uD2B8",
    "structure.scope": "\uB2EE\uC740 \uD504\uB808\uC784",
    "structure.groupComp": "\uCEF4\uD3EC\uB10C\uD2B8 \uD6C4\uBCF4",
    "structure.groupSimilar": "\uB2EE\uC740 \uD504\uB808\uC784",
    "structure.groupVariant": "\uC120\uD0DD\uD55C \uCEF4\uD3EC\uB10C\uD2B8 \uC815\uB9AC",
    "component.hint": "\uC704\uB294 \uD6C4\uBCF4 \uB4F1\uB85D, \uC544\uB798\uB294 \uB2EE\uC740 \uD504\uB808\uC784 \uBB36\uAE30. \uB2EE\uC740 \uC2A4\uCE94\uC740 \uBB34\uB8CC",
    "component.scanBtn": "\uD6C4\uBCF4 \uC2A4\uCE94",
    "component.registerBtn": "\uB4F1\uB85D",
    "component.classifyBtn": "\uBCA0\uB9AC\uC5B8\uD2B8 \uBD84\uB958",
    "component.genMissingBtn": "\uB204\uB77D \uC870\uD569 \uC0DD\uC131",
    "component.scanHelp": "\uC120\uD0DD \uC544\uB798\uC5D0\uC11C \uBC84\uD2BC\xB7\uCE74\uB4DC \uAC19\uC740 \uACE0\uC2E0\uB8B0 \uAD6C\uC870 \uD6C4\uBCF4\uB97C \uCC3E\uC544\uC694. \uC228\uAE40\xB7\uBD80\uBAA8 \uCEE8\uD14C\uC774\uB108\uB294 \uBE7C\uC694.",
    "component.registerHelp": "\uCCB4\uD06C\uD55C \uD6C4\uBCF4\uB97C Components\uC5D0 \uB4F1\uB85D\uD558\uACE0 \uC790\uB9AC\uC5D4 \uC778\uC2A4\uD134\uC2A4\uB97C \uB0A8\uACA8\uC694. \uC6D0\uBCF8\uC758 \uC5F0\uACB0\uACFC \uAC12\uC740 \uB9C8\uC2A4\uD130\uB97C \uB530\uB77C\uC694.",
    "component.classifyHelp": "\uC774\uBBF8 \uB9CC\uB4E0 \uCEF4\uD3EC\uB10C\uD2B8\uB9CC \uAC19\uC740 \uC774\uB984\uB07C\uB9AC \uC138\uD2B8\uB85C \uB2E4\uC2DC \uBB36\uC5B4\uC694.",
    "component.genMissingHelp": "\uC120\uD0DD\uD55C \uC138\uD2B8\uC758 \uBE60\uC9C4 \uC18D\uC131 \uC870\uD569\uC744 \uCCAB \uBCA0\uB9AC\uC5B8\uD2B8 \uBCF5\uC81C\uB85C \uCC44\uC6CC\uC694.",
    "similar.scanHelp": "\uAD6C\uC870\uAC00 \uAC19\uACE0 \uB0B4\uC6A9\uB9CC \uB2E4\uB978 \uD504\uB808\uC784\uC744 \uBBF8\uB9AC \uBB36\uC5B4\uC694. \uD30C\uC77C\uC740 \uC548 \uBC14\uAFD4\uC694.",
    "similar.componentizeHelp": "\uB9C8\uC2A4\uD130\uB97C \uCEF4\uD3EC\uB10C\uD2B8\uB85C, \uB098\uBA38\uC9C0\uB294 \uC778\uC2A4\uD134\uC2A4\uB85C \uBC14\uAFD4\uC694. \uC6D0\uBCF8\uC758 \uC5F0\uACB0\uACFC \uAC12\uC740 \uB9C8\uC2A4\uD130\uB97C \uB530\uB77C\uC694.",
    "similar.needScan": "\uBA3C\uC800 \u2018\uB2EE\uC740 \uC2A4\uCE94\u2019\uC73C\uB85C \uBB36\uC744 \uD504\uB808\uC784\uACFC \uB9C8\uC2A4\uD130\uB97C \uACE0\uB974\uC138\uC694.",
    "similar.needScanAfterComp": "\u2018\uD6C4\uBCF4 \uC2A4\uCE94\u2019 \uACB0\uACFC\uB294 \u2018\uB4F1\uB85D\u2019\uC774 \uC368\uC694. \uBB36\uAE30\uB294 \u2018\uB2EE\uC740 \uC2A4\uCE94\u2019\uC744 \uBA3C\uC800 \uC2E4\uD589\uD558\uC138\uC694.",
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
    "license.manage": "\uACB0\uC81C \xB7 \uAD6C\uB3C5 \uAD00\uB9AC \u2197",
    "license.manageTip": "\uBB34\uB8CC\uBA74 \uACB0\uC81C \uD398\uC774\uC9C0\uB85C, \uAD6C\uB3C5 \uC911\uC774\uBA74 \uACB0\uC81C\uC218\uB2E8\xB7\uAE30\uAE30 \uD65C\uC131\uD654\uB97C \uAD00\uB9AC\uD558\uB294 \uD398\uC774\uC9C0\uB85C \uC5F4\uC5B4\uC694",
    "license.devTier": "\uAC1C\uBC1C\uC6A9 \uAC15\uC81C \uD2F0\uC5B4",
    "license.devTierNote": "(\uAC80\uC99D\uB41C \uD0A4\uAC00 \uC5C6\uC744 \uB54C\uB9CC \uC801\uC6A9)",
    // PR 4 — 코드에 직접 쓰던 문구를 옮김(docs/pr4-copy-table.md). 조각을 받는 자리는 {…Part}
    // 공통 · 접근성 이름
    "tab.listAria": "\uC791\uC5C5 \uD0ED",
    "rail.layerAria": "\uB808\uC774\uC5B4 \uC791\uC5C5",
    "rail.makeAria": "\uB9CC\uB4E4\uAE30 \uB2E8\uACC4",
    "list.sideAria": "\uBCC0\uC218 \uCEEC\uB809\uC158",
    "list.gridAria": "\uBCC0\uC218 \uBAA9\uB85D",
    "common.retry": "\uB2E4\uC2DC \uC2DC\uB3C4",
    // 레이어 › 연결
    "bind.linking": "\uC5F0\uACB0 \uC911\u2026",
    "bind.progressOf": "{done} / {total} \uCC98\uB9AC \uC911\u2026 ({pct}%)",
    "bind.progressCount": "{done}\uAC1C \uCC98\uB9AC \uC911\u2026",
    "bind.skipSelected": "{reason} \uB808\uC774\uC5B4 {n}\uAC1C \uC120\uD0DD",
    // 레이어 › 이름
    "rename.count": "\uD6C4\uBCF4 {total}",
    // 레이어 › 컴포넌트 — 등록 결과 꼬리 · 트리 배지 · 리포트
    "component.extraSkipped": " \xB7 \uAC74\uB108\uB700 {n}",
    "component.extraSingles": " \xB7 \uB2E8\uC77C {n}",
    "component.extraProps": " \xB7 \uC18D\uC131 {n}",
    "component.extraIcons": " \xB7 \uC544\uC774\uCF58 {n}",
    "component.extraMissing": " \xB7 \uBE48 \uC870\uD569 \uC788\uC74C",
    "component.tagAdded": "\uC0DD\uC131",
    "component.variantFallback": "\uBCA0\uB9AC\uC5B8\uD2B8",
    "component.badgeSet": "\uC138\uD2B8",
    "component.changeProps": "{name} \xB7 \uC18D\uC131",
    "component.badgeProps": "\uC18D\uC131",
    "component.nameFallback": "\uCEF4\uD3EC\uB10C\uD2B8",
    "component.badgeSingle": "\uB2E8\uB3C5",
    "component.count": "\uD6C4\uBCF4 {total}",
    "component.tagMissing": "\uBE48 \uC870\uD569",
    "component.headMissing": "\uBE48 \uC870\uD569(\uBBF8\uC0DD\uC131):",
    "component.tagIssue": "\uBB38\uC81C",
    "component.headIssue": "\uCC98\uB9AC \uC911 \uBB38\uC81C {n}\uAC74:",
    "component.tagCount": "{tag} {n}\uAC1C",
    // 컴포넌트 “처리 중 문제” 진단 — 내부 말(속성접힘 · 결합 · 정렬)은 그대로(결정 ⑨)
    "component.fail.copyPlaced": "\uC778\uC2A4\uD134\uC2A4 \uB300\uC2E0 \uBCF5\uC0AC\uBCF8\uC744 \uB480\uC5B4\uC694({label} \u2192 {name}){causePart}",
    "component.fail.nothingPlaced": "\uC81C\uC790\uB9AC\uC5D0 \uC544\uBB34\uAC83\uB3C4 \uB450\uC9C0 \uBABB\uD588\uC5B4\uC694({label} \u2192 {name}){causePart}",
    "component.fail.cause": " \u2014 {why}",
    "component.fail.instanceMake": "\uC778\uC2A4\uD134\uC2A4\uB97C \uB9CC\uB4E4\uC9C0 \uBABB\uD588\uC5B4\uC694: {error}",
    "component.fail.instancePlace": "\uC81C\uC790\uB9AC\uC5D0 \uC778\uC2A4\uD134\uC2A4\uB97C \uB123\uC9C0 \uBABB\uD588\uC5B4\uC694",
    "component.fail.propValue": "\uC18D\uC131 \uAC12\uC744 \uBABB \uB123\uC5B4 \uB9C8\uC2A4\uD130 \uAC12\uC73C\uB85C \uB480\uC5B4\uC694({name} \xB7 {prop})",
    "component.fail.fillKept": "\uCC44\uC6C0\xB7\uD06C\uAE30\uAC00 \uB2EC\uB77C \uBB36\uC9C0 \uC54A\uACE0 \uC6D0\uBCF8\uC744 \uB480\uC5B4\uC694({name}){causePart}",
    "component.fail.memberKept": "\uC81C\uC790\uB9AC\uC5D0 \uB123\uC9C0 \uBABB\uD574 \uC6D0\uBCF8\uC744 \uB480\uC5B4\uC694({name}){causePart}",
    // 속성 접힘 멤버 검사(§4.7 8번) 사유 — 위 두 줄의 {causePart}에 들어간다
    "component.fit.size": "\uD06C\uAE30 {w}\xD7{h} \u2260 {mw}\xD7{mh}",
    "component.fit.noPhoto": "\uC0AC\uC9C4 \uC790\uB9AC \uC5C6\uC74C({path})",
    "component.fit.self": "\uC790\uC2E0",
    "component.fit.photoDiff": "\uC0AC\uC9C4 \uB2E4\uB984({name})",
    "component.fit.photoSize": "\uC0AC\uC9C4 \uD06C\uAE30 {w}\xD7{h} \u2260 {mw}\xD7{mh}({name})",
    "component.fail.single": "\uB2E8\uB3C5 \uB4F1\uB85D \uC2E4\uD328({name}): {error}",
    "component.fail.propsRegister": "\uC18D\uC131\uC811\uD798 \uB4F1\uB85D \uC2E4\uD328({set}): {error}",
    "component.fail.iconFallback": "\uC544\uC774\uCF58\uC744 \uB9CC\uB4E4\uC9C0 \uBABB\uD574 \uC138\uD2B8\uB85C \uB4F1\uB85D\uD574\uC694({set})",
    "component.fail.propsComponentize": "\uC18D\uC131\uC811\uD798 \uCEF4\uD3EC\uB10C\uD2B8\uD654 \uC2E4\uD328({name}): {error}",
    "component.fail.expose": "\uC18D\uC131 \uB178\uCD9C \uC2E4\uD328({name}): {error}",
    "component.fail.exposeAll": "\uC18D\uC131 \uB178\uCD9C \uC2E4\uD328: {error}",
    "component.fail.componentize": "\uCEF4\uD3EC\uB10C\uD2B8\uD654 \uC2E4\uD328({name}): {error}",
    "component.fail.combine": "\uACB0\uD569 \uC2E4\uD328({set}): {error}",
    "component.fail.arrange": "\uC815\uB82C \uC2E4\uD328({set}): {error}",
    "component.fail.iconComponent": "\uC544\uC774\uCF58 \uCEF4\uD3EC\uB10C\uD2B8 \uC2E4\uD328({name}): {error}",
    "component.fail.iconSwap": "\uC544\uC774\uCF58 \uC790\uB9AC \uAD50\uCCB4 \uC2E4\uD328({layer})",
    "component.fail.iconSwapPlace": "\uC544\uC774\uCF58 \uC790\uB9AC \uAD50\uCCB4 \uC2E4\uD328({layer}): \uC81C\uC790\uB9AC\uC5D0 \uB123\uC9C0 \uBABB\uD588\uC5B4\uC694",
    "component.fail.iconSwapErr": "\uC544\uC774\uCF58 \uC790\uB9AC \uAD50\uCCB4 \uC2E4\uD328({layer}): {error}",
    "component.fail.photoNoSlot": "\uC0AC\uC9C4 \uC774\uC2DD \uC2E4\uD328({path}) \u2014 \uC790\uB9AC\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC5B4\uC694",
    "component.fail.photo": "\uC0AC\uC9C4 \uC774\uC2DD \uC2E4\uD328({path}): {error}",
    // 레이어 › 컴포넌트 — 닮은 프레임 묶기
    "similar.scanning": "\uB2EE\uC740 \uD504\uB808\uC784\uC744 \uCC3E\uB294 \uC911\u2026",
    "similar.componentizing": "\uCEF4\uD3EC\uB10C\uD2B8\uD654\uD558\uB294 \uC911\u2026",
    "similar.failed": "\uCEF4\uD3EC\uB10C\uD2B8\uD654\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694{warnPart}",
    "similar.failedWarn": " \u2014 {warning}",
    "similar.resMaster": "\uB9C8\uC2A4\uD130 {name}",
    "similar.resInstances": "\uC778\uC2A4\uD134\uC2A4 {n}\uAC1C",
    "similar.resProps": "\uC18D\uC131 {n}\uAC1C",
    "similar.resImages": "\uC774\uBBF8\uC9C0 {n}\uAC1C",
    "similar.resKept": " \xB7 \uB0A8\uACA8\uB454 \uAC83 {n}\uAC74: {warning}",
    "similar.metaText": "\uD14D\uC2A4\uD2B8 {filled}/{total}",
    "similar.metaImages": "\uC774\uBBF8\uC9C0 {n}",
    "similar.metaEmpty": "\uBE48 \uCE78 {n}",
    "similar.recommended": "\uCD94\uCC9C",
    "similar.count": "\uB2EE\uC740 {n}\uAC1C",
    "similar.needTwo": "\uAD6C\uC870\uAC00 \uAC19\uC740 \uD504\uB808\uC784\uC744 2\uAC1C \uC774\uC0C1 \uC120\uD0DD\uD558\uC138\uC694.",
    "similar.none": "\uCEF4\uD3EC\uB10C\uD2B8\uD654\uD560 \uD504\uB808\uC784\uC774 \uC5C6\uC5B4\uC694 \u2014 {why}",
    "similar.openText": "\uD14D\uC2A4\uD2B8 {n}",
    "similar.openSwap": "\uC544\uC774\uCF58 \uAD50\uCCB4 {n}",
    "similar.openImage": "\uC774\uBBF8\uC9C0 {n}",
    "similar.opened": "\uC18D\uC131\uC73C\uB85C \uC5F4\uB9BC: {list}",
    "similar.noVarying": "\uAC00\uBCC0 \uC704\uCE58\uAC00 \uC5C6\uC5B4 \uC18D\uC131\uC740 \uB9CC\uB4E4\uC9C0 \uC54A\uC544\uC694",
    "similar.excluded": " \xB7 \uC81C\uC678 {n}\uAC1C({why})",
    "similar.scanned": "\uB300\uC0C1 {n}\uAC1C \xB7 {openPart}{skipPart}",
    "similar.noMaster": "\uB9C8\uC2A4\uD130 \uD504\uB808\uC784\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC5B4\uC694.",
    "similar.tooFew": "\uB300\uC0C1 \uD504\uB808\uC784\uC774 2\uAC1C\uBCF4\uB2E4 \uC801\uC5B4\uC694. \uB2E4\uC2DC \uC2A4\uCE94\uD558\uC138\uC694.",
    "similar.overrideFail": "{name}: \uC18D\uC131 \uC624\uBC84\uB77C\uC774\uB4DC \uC2E4\uD328 \u2014 \uC6D0\uBCF8\uC744 \uADF8\uB300\uB85C \uB480\uC5B4\uC694",
    "similar.placeFail": "{name}: \uC81C\uC790\uB9AC\uC5D0 \uB458 \uC218 \uC5C6\uC5B4 \uC6D0\uBCF8\uC744 \uADF8\uB300\uB85C \uB480\uC5B4\uC694",
    "similar.why.needTwo": "\uD504\uB808\uC784\uC774 2\uAC1C \uC774\uC0C1 \uD544\uC694",
    "similar.why.mismatch": "\uAD6C\uC870 \uBD88\uC77C\uCE58",
    "similar.why.fewSame": "\uB3D9\uC77C \uAD6C\uC870 \uD504\uB808\uC784 2\uAC1C \uBBF8\uB9CC",
    // 만들기 › 색 · 토큰
    "create.hintPreview": "\u2018\uBBF8\uB9AC\uBCF4\uAE30\u2019\uB97C \uB204\uB974\uC138\uC694.",
    "create.hintNoSel": "\uB808\uC774\uC5B4\uB97C \uBA3C\uC800 \uC120\uD0DD\uD558\uC138\uC694.",
    "create.hintReveal": "\u2018\uBBF8\uB9AC\uBCF4\uAE30\u2019\uB97C \uB204\uB974\uBA74 \uB9CC\uB4E4 \uD1A0\uD070\uC774 \uBCF4\uC5EC\uC694",
    "create.onlyColors": "\uC0C9 \uC678 \uD1A0\uD070\uC774 \uC5C6\uC5B4\uC694(\uC0C9\uB9CC \uBF51\uC558\uC5B4\uC694)",
    "create.count": "\uD6C4\uBCF4 {sel}/{total}",
    "color.usedCount": " \xB7 {n}\xD7 \uC0AC\uC6A9",
    "create.tidyMerged": " \xB7 \uAC19\uC740 \uCE78 {n}\uAC1C \uBCD1\uD569",
    "create.tidySummary": "\uC5EC\uBC31\xB7\uD06C\uAE30 {before} \u2192 {after}\uAC1C ({grid}px \uACA9\uC790\uB85C {n}\uAC1C \uC774\uB3D9{mergedPart}){gapPart}",
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
    "dark.prereqNoModes": "\uBAA8\uB4DC\uAC00 \uC788\uB294 \uCEEC\uB809\uC158(\uBCF4\uD1B5 Semantic)\uC744 \uACE0\uB974\uC138\uC694.",
    "dark.prereqPick": "\uCEEC\uB809\uC158\uACFC \uB77C\uC774\uD2B8 \uBAA8\uB4DC\uB97C \uACE0\uB974\uC138\uC694.",
    "dark.running": "\uB2E4\uD06C \uBAA8\uB4DC\uB97C \uB9CC\uB4E4\uACE0 \uAC12\uC744 \uCC44\uC6B0\uB294 \uC911\u2026",
    "dark.whyNoGlobal": "Global\uC744 \uAC00\uB9AC\uD0A4\uB294 \uC0C9\uC774 \uC5C6\uC5B4\uC694(\uAC74\uB108\uB700 {n}\uAC1C)",
    "dark.whyNone": "\uB300\uC0C1 \uC0C9\uC774 \uC5C6\uC5B4\uC694",
    "dark.modeAdded": "\uB2E4\uD06C \uBAA8\uB4DC\uB294 \uCD94\uAC00\uD588\uC5B4\uC694. ",
    "dark.fillFailed": "{modePart}\uB2E4\uD06C \uAC12\uC744 \uCC44\uC6B0\uC9C0 \uBABB\uD588\uC5B4\uC694 \u2014 {why}",
    "dark.modeAddedShort": "\uB2E4\uD06C \uBAA8\uB4DC \uCD94\uAC00 \xB7 ",
    "dark.skippedDirect": " \xB7 \uAC74\uB108\uB700 {n}\uAC1C(\uAC12\uC744 \uC9C1\uC811 \uB123\uC740 \uC0C9)",
    "dark.done": "{modePart}\uB2E4\uD06C {n}\uAC1C \uC5F0\uACB0 \xB7 \uC0C8 dark/ \uC6D0\uC2DC\uC0C9 {c}\uAC1C{skipPart}",
    "dark.errNoCol": "\uCEEC\uB809\uC158\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC5B4\uC694.",
    "dark.errAddMode": "\uB2E4\uD06C \uBAA8\uB4DC\uB97C \uCD94\uAC00\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694 \u2014 {why}",
    "dark.errAddModePlan": "\uD50C\uB79C\uC5D0\uC11C \uBAA8\uB4DC\uB97C \uB354 \uB9CC\uB4E4 \uC218 \uC5C6\uC744 \uC218 \uC788\uC5B4\uC694.",
    "dark.errSameMode": "\uB77C\uC774\uD2B8\uC640 \uB2E4\uD06C\uAC00 \uAC19\uC740 \uBAA8\uB4DC\uC608\uC694 \u2014 \uB77C\uC774\uD2B8\uC5D0 \uB2E4\uB978 \uBAA8\uB4DC\uB97C \uACE0\uB974\uC138\uC694.",
    // 만들기 › 타이포(텍스트 스타일)
    "textStyle.rowDelete": "\uC0AD\uC81C",
    "textStyle.scanSummary": "\uC2E0\uADDC {a} \xB7 \uB4F1\uB85D\uB428 {b}",
    "textStyle.scanLhPct": " \xB7 \uD589\uAC04% {n}",
    "textStyle.scanLsPct": " \xB7 \uC790\uAC04% {n}",
    "textStyle.renaming": "\uC67C\uCABD \uAE00\uC790\uB85C \uC774\uB984\uC744 \uB2E4\uC2DC \uB9E4\uAE30\uB294 \uC911\u2026",
    "textStyle.needSpecs": "\uBA3C\uC800 \u2018\uC2A4\uCE94\u2019\uD558\uAC70\uB098 \u2018\uD589 \uCD94\uAC00\u2019\uB85C \uC2A4\uD0C0\uC77C\uC744 \uC815\uC758\uD558\uC138\uC694.",
    "textStyle.nameSplit": " \xB7 \uC67C\uCABD \uAE00\uC790 {a} \xB7 \uD06C\uAE30 \uC21C {b}",
    "textStyle.fallbackRamp": "\uC120\uD0DD\uC5D0\uC11C \uD14D\uC2A4\uD2B8\uB97C \uBABB \uCC3E\uC544 \uAE30\uBCF8 \uB7A8\uD504\uB85C \uCC44\uC6E0\uC5B4\uC694. \uD3F0\uD2B8\xB7\uAC12\uC744 \uC870\uC815\uD558\uC138\uC694",
    "textStyle.registered": "\uD14D\uC2A4\uD2B8 \uC2A4\uD0C0\uC77C {n}\uAC1C (\uC0DD\uC131 {c} / \uAC31\uC2E0 {u}) \xB7 \uC5F0\uACB0 {b}",
    "textStyle.unlinked": " \xB7 \uBBF8\uC5F0\uACB0: {names}",
    "textStyle.needScan": "\uBA3C\uC800 \uC2A4\uCE94\uD558\uC138\uC694 \u2014 \uC774\uB984\uC744 \uB2E4\uC2DC \uB9E4\uAE38 \uD45C\uBCF8\uC774 \uC5C6\uC5B4\uC694.",
    "textStyle.warnMixed": "\uBD80\uBD84 \uC11C\uC2DD(\uD63C\uD569) \uD14D\uC2A4\uD2B8\uB294 \uAC74\uB108\uB6F0\uC5C8\uC5B4\uC694.",
    "textStyle.missRename": "\uC774\uB984 \uCDA9\uB3CC '{from}'\u2192'{to}' \u2014 \uAC19\uC740 \uC774\uB984 \uC2A4\uD0C0\uC77C\uC774 \uC788\uC5B4 \uC774\uB984\uC744 \uBC14\uAFB8\uC9C0 \uC54A\uC558\uC5B4\uC694",
    "textStyle.noteLhPx": "{name}: \uC5ED\uD560\uB9C8\uB2E4 \uD589\uAC04 \uC6D0\uBCF8\uC774 \uB2EC\uB77C px\uB85C \uAE30\uB85D(\uC6D0\uBCF8 \uD45C\uAE30 \uC0DD\uB7B5)",
    "textStyle.noteLsPx": "{name}: \uC5ED\uD560\uB9C8\uB2E4 \uC790\uAC04 \uC6D0\uBCF8\uC774 \uB2EC\uB77C px\uB85C \uAE30\uB85D(\uC6D0\uBCF8 \uD45C\uAE30 \uC0DD\uB7B5)",
    "textStyle.missStyle": "{name}: \uD3F0\uD2B8 {style}\u2192Regular",
    "textStyle.missFamily": "{name}: \uD3F0\uD2B8 '{family}' \uC5C6\uC74C",
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
    switch (prop) {
      case "text":
        return ["TEXT_FILL"];
      case "border":
        return ["STROKE_COLOR"];
      case "icon":
        return ["SHAPE_FILL"];
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
  function keyOf(category, value, unit) {
    return `${category}|${value}|${unit != null ? unit : ""}`;
  }
  function add(acc, token, source, nodeId) {
    var _a;
    const k = keyOf(token.category, token.value, token.unit);
    const existing = acc.map.get(k);
    if (existing) {
      if (!existing.sources.includes(source)) existing.sources.push(source);
      if (acc.lastNode.get(k) !== nodeId) existing.count = ((_a = existing.count) != null ? _a : 1) + 1;
    } else {
      acc.map.set(k, __spreadProps(__spreadValues({}, token), { sources: [source], count: 1 }));
    }
    acc.lastNode.set(k, nodeId);
  }
  function collectPaints(acc, node, paints3, source) {
    const nodeId = node.id;
    if (paints3 === figma.mixed || !Array.isArray(paints3)) return;
    for (const p of paints3) {
      if (p.visible === false) continue;
      if (p.type !== "SOLID") {
        acc.skipped.add(SKIP_GRADIENT);
        continue;
      }
      const hex = rgbToHex(p.color);
      add(acc, { name: colorTokenName(hex), category: "color", value: hex }, source, nodeId);
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
    const gaps = [node.paddingLeft, node.paddingRight, node.paddingTop, node.paddingBottom];
    if (node.layoutMode === "GRID") {
      gaps.push(node.gridRowGap, node.gridColumnGap);
    } else {
      if (!gapSkip(node, "itemSpacing")) gaps.push(node.itemSpacing);
      if (typeof node.counterAxisSpacing === "number" && !gapSkip(node, "counterAxisSpacing")) gaps.push(node.counterAxisSpacing);
    }
    for (const g of gaps) {
      if (typeof g === "number" && g > 0) {
        const v = round(g);
        if (onScale(acc, v)) add(acc, { name: numberTokenName("spacing", v), category: "gap", value: v }, "gap", node.id);
      }
    }
  }
  function collectSize(acc, node) {
    if (node.type !== "FRAME" && node.type !== "COMPONENT" && node.type !== "INSTANCE") return;
    const parent = node.parent;
    const absolute = "layoutPositioning" in node && node.layoutPositioning === "ABSOLUTE";
    const inAutoLayout = !absolute && (node.layoutMode !== "NONE" || parent != null && "layoutMode" in parent && parent.layoutMode !== "NONE");
    if (!inAutoLayout) return;
    const addSize = (v) => {
      const rv = round(v);
      if (rv > 0 && Number.isInteger(rv)) add(acc, { name: numberTokenName("size", rv), category: "size", value: rv }, "size", node.id);
    };
    if (node.layoutSizingHorizontal === "FIXED") addSize(node.width);
    if (node.layoutSizingVertical === "FIXED") addSize(node.height);
  }
  function collectRadius(acc, node) {
    if (!("cornerRadius" in node)) return;
    const r = node.cornerRadius;
    const values = [];
    if (r === figma.mixed) {
      for (const corner of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) {
        const cv = node[corner];
        if (typeof cv === "number") values.push(cv);
      }
    } else if (typeof r === "number") {
      values.push(r);
    }
    for (const rv of values) {
      if (rv > 0) {
        const v = round(rv);
        if (onScale(acc, v)) add(acc, { name: numberTokenName("radius", v), category: "radius", value: v }, "radius", node.id);
      }
    }
  }
  function collectStroke(acc, node) {
    if (!("strokes" in node) || !("strokeWeight" in node)) return;
    const strokes = node.strokes;
    if (strokes === figma.mixed || !Array.isArray(strokes) || !strokes.some((p) => p.visible !== false)) return;
    const w = node.strokeWeight;
    const widths = [];
    if (w === figma.mixed) {
      for (const side of ["strokeTopWeight", "strokeRightWeight", "strokeBottomWeight", "strokeLeftWeight"]) {
        const sv = node[side];
        if (typeof sv === "number") widths.push(sv);
      }
    } else if (typeof w === "number") {
      widths.push(w);
    }
    for (const wv of widths) {
      if (wv > 0) {
        const v = round(wv);
        if (onScale(acc, v)) add(acc, { name: numberTokenName("stroke-width", v), category: "strokeWidth", value: v }, "strokeWidth", node.id);
      }
    }
  }
  function collectOpacity(acc, node) {
    if (!("opacity" in node)) return;
    const o = node.opacity;
    if (typeof o !== "number" || o >= 1 || o <= 0) return;
    const v = round(o);
    add(acc, { name: numberTokenName("opacity", v), category: "opacity", value: v }, "opacity", node.id);
  }
  function collectEffects(acc, node) {
    var _a;
    if (!("effects" in node)) return;
    for (const e of node.effects) {
      if (e.visible === false) continue;
      if (e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW") {
        const hex = rgbToHex(e.color);
        add(acc, { name: colorTokenName(hex), category: "effectColor", value: hex }, "effectColor", node.id);
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
  function walk(acc, node) {
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
      if ("children" in node && node.children.length) acc.skipped.add(SKIP_INSTANCE);
      return;
    }
    if ("children" in node) for (const child of node.children) walk(acc, child);
  }
  function isEffectivelyVisible(node) {
    let p = node;
    while (p) {
      if ("visible" in p && p.visible === false) return false;
      p = p.parent;
    }
    return true;
  }
  function extractFromSelection(selection2) {
    const acc = { map: /* @__PURE__ */ new Map(), warnings: /* @__PURE__ */ new Set(), lastNode: /* @__PURE__ */ new Map(), skipped: /* @__PURE__ */ new Set() };
    for (const node of selection2) {
      if (!isEffectivelyVisible(node)) {
        acc.skipped.add(SKIP_HIDDEN);
        continue;
      }
      walk(acc, node);
    }
    const tokens = [...acc.map.values()].sort((a, b) => a.name.localeCompare(b.name));
    const warnings = tokens.length ? [...acc.warnings] : [...acc.warnings, ...acc.skipped];
    return { tokens, warnings };
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

  // src/lib/palette.ts
  function isPaletteColorName(name) {
    if (!name.startsWith("color/")) return false;
    const parts = name.split("/");
    if (parts.length !== 3) return false;
    const base = parts[1].replace(/-\d+$/, "");
    return HUE_FAMILIES.includes(base);
  }
  function paletteFamilyOf(name) {
    if (!isPaletteColorName(name)) return null;
    return name.split("/")[1];
  }

  // src/lib/tiers.ts
  var TIER_ROLES = ["global", "semantic", "component"];
  var TIER_NUM = { global: 1, semantic: 2, component: 3 };
  var CANONICAL_NAME = { global: "Global", semantic: "Semantic", component: "Component" };
  var isRoleValue = (v) => v === "none" || TIER_ROLES.includes(v);
  function parseRoleMap(raw) {
    if (!raw) return {};
    try {
      const o = JSON.parse(raw);
      if (!o || typeof o !== "object" || Array.isArray(o)) return {};
      const out = {};
      for (const [k, v] of Object.entries(o)) if (isRoleValue(v)) out[k] = v;
      return out;
    } catch (e) {
      return {};
    }
  }
  function roleOfCollection(col, map) {
    var _a;
    const set = map[col.id];
    if (set) return set === "none" ? null : set;
    return (_a = TIER_ROLES.find((r) => CANONICAL_NAME[r] === col.name)) != null ? _a : null;
  }
  function tierOfCollection(col, map) {
    const r = roleOfCollection(col, map);
    return r ? TIER_NUM[r] : 0;
  }
  function pickCollection(cols, map, role) {
    var _a;
    return (_a = cols.find((c) => map[c.id] === role)) != null ? _a : cols.find((c) => !map[c.id] && c.name === CANONICAL_NAME[role]);
  }
  function assignRole(map, colId, role) {
    const out = {};
    for (const [k, v] of Object.entries(map)) {
      if (k === colId) continue;
      if (role && role !== "none" && v === role) continue;
      out[k] = v;
    }
    if (role) out[colId] = role;
    return out;
  }
  function guessRole(name) {
    const n = name.toLowerCase();
    if (/\bcomponents?\b/.test(n)) return "component";
    if (/semantic|alias|theme|role|system|^tokens?$/.test(n)) return "semantic";
    if (/global|primitive|core|base|palette|foundation|raw|ref(erence)?s?\b/.test(n)) return "global";
    return null;
  }

  // src/lib/collectionRoles.ts
  var ROLE_MAP_KEY = "dsl.collectionRoles";
  function readRoleMap() {
    var _a;
    try {
      const root = figma.root;
      return parseRoleMap((_a = root == null ? void 0 : root.getPluginData) == null ? void 0 : _a.call(root, ROLE_MAP_KEY));
    } catch (e) {
      return {};
    }
  }
  function writeRoleMap(map) {
    figma.root.setPluginData(ROLE_MAP_KEY, JSON.stringify(map));
  }
  function findCollection(cols, role) {
    return pickCollection(cols, readRoleMap(), role);
  }
  function ensureCollection(cols, role, name) {
    var _a;
    return (_a = findCollection(cols, role)) != null ? _a : figma.variables.createVariableCollection(name);
  }
  function collectionTiers(cols) {
    const map = readRoleMap();
    return new Map(cols.map((c) => [c.id, tierOfCollection(c, map)]));
  }

  // src/lib/variables.ts
  var GLOBAL = "Global";
  var SEMANTIC = "Semantic";
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
  async function resolveCollections() {
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const globalCol = ensureCollection(cols, "global", GLOBAL);
    const semanticCol = ensureCollection(cols, "semantic", SEMANTIC);
    return { globalCol, semanticCol };
  }
  async function createTokens(tokens, base) {
    const { globalCol } = await resolveCollections();
    const gMode = globalCol.defaultModeId;
    const idx = await buildVarIndex();
    const summary = { created: 0, updated: 0, globals: 0, semantics: 0, conversions: pxConversions(tokens, base) };
    const touched = /* @__PURE__ */ new Set();
    for (const t2 of tokens) {
      const type = resolvedTypeForToken(t2);
      const g = upsertVariable(t2.name, globalCol, type, idx);
      summary[g.created ? "created" : "updated"]++;
      summary.globals++;
      setGlobalLiteral(g.variable, gMode, t2, type, base);
      const scopes = scopesForType(scopesForSources(t2.sources), type);
      const key = vkey(globalCol.id, t2.name);
      const merged = touched.has(key) ? scopesForType([.../* @__PURE__ */ new Set([...g.variable.scopes, ...scopes])], type) : scopes;
      touched.add(key);
      g.variable.scopes = merged;
      g.variable.hiddenFromPublishing = true;
      const desc = unitDescription(t2);
      if (desc) g.variable.description = desc;
    }
    return summary;
  }
  async function previewCreateTokens(tokens, base) {
    var _a, _b;
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const gId = (_b = (_a = findCollection(cols, "global")) == null ? void 0 : _a.id) != null ? _b : "#G";
    const existing = /* @__PURE__ */ new Set();
    for (const v of await figma.variables.getLocalVariablesAsync()) existing.add(vkey(v.variableCollectionId, v.name));
    const summary = { created: 0, updated: 0, globals: 0, semantics: 0, conversions: pxConversions(tokens, base) };
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
    for (const t2 of tokens) tally(gId, t2.name, "globals");
    return summary;
  }
  function setGlobalLiteral(v, modeId, t2, type, base) {
    var _a;
    if (type === "COLOR") {
      const { r, g, b } = hexToRgb(String(t2.value));
      v.setValueForMode(modeId, { r, g, b, a: 1 });
    } else if (type === "STRING") {
      v.setValueForMode(modeId, String(t2.value));
    } else {
      const num = t2.unit && t2.unit !== "px" && typeof t2.value === "number" ? toPx(t2.value, t2.unit, { base, fontSize: (_a = t2.fontSize) != null ? _a : base }) : Number(t2.value);
      v.setValueForMode(modeId, num);
    }
  }
  async function prunePaletteColors(keep) {
    const keepSet = new Set(keep);
    const keepFamilies = new Set(keep.map(paletteFamilyOf).filter((f) => f !== null));
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const tiers = collectionTiers(cols);
    const palIds = new Set(cols.filter((c) => tiers.get(c.id) === 1 || tiers.get(c.id) === 2).map((c) => c.id));
    let removed = 0;
    for (const v of await figma.variables.getLocalVariablesAsync()) {
      if (!palIds.has(v.variableCollectionId)) continue;
      const fam = paletteFamilyOf(v.name);
      if (fam && keepFamilies.has(fam) && !keepSet.has(v.name)) {
        v.remove();
        removed++;
      }
    }
    return removed;
  }
  async function createSemanticAliases(map) {
    var _a;
    const summary = { created: 0, updated: 0, aliased: 0, missing: [] };
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const globalCol = findCollection(cols, "global");
    if (!globalCol) {
      summary.missing = Object.values(map);
      return summary;
    }
    const semanticCol = ensureCollection(cols, "semantic", SEMANTIC);
    const sMode = semanticCol.defaultModeId;
    const idx = await buildVarIndex();
    for (const [semName, globalName] of Object.entries(map)) {
      const g = idx.get(vkey(globalCol.id, globalName));
      if (!g) {
        summary.missing.push(globalName);
        continue;
      }
      const u = upsertVariable(semName, semanticCol, g.resolvedType, idx);
      u.variable.setValueForMode(sMode, figma.variables.createVariableAlias(g));
      u.variable.scopes = scopesForType((_a = scopeForSemanticRole(semName)) != null ? _a : g.scopes, g.resolvedType);
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
        indexInParent
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
    const out = [];
    for (const s of await figma.getLocalTextStylesAsync()) {
      const fontSize = roundN(s.fontSize);
      const lineHeightPercent = lhPctOf(s.lineHeight);
      const letterSpacingPercent = lsPctOf(s.letterSpacing);
      out.push(__spreadValues(__spreadValues({
        id: s.id,
        name: s.name,
        fontSize,
        // 등록된 스타일은 사실이라 원값으로 잰다(applyExistingTextStyles의 인덱스와 같은 이유).
        // 스캔이 %로 등록해 둔 스타일은 lhPxOf가 %→px로 환산하므로 클러스터 측정값과 그대로 만난다.
        lineHeight: lhPxOf(fontSize, s.lineHeight),
        letterSpacing: lsPxOf(fontSize, s.letterSpacing),
        family: s.fontName.family,
        style: s.fontName.style
      }, lineHeightPercent ? { lineHeightPercent } : {}), letterSpacingPercent !== 0 ? { letterSpacingPercent } : {}));
    }
    return out;
  }
  async function createSemanticTextStyles(specs) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
    const res = { created: 0, updated: 0, bound: 0, applied: 0, missing: [], notes: [] };
    if (!specs.length) return res;
    const existing = await figma.getLocalTextStylesAsync();
    const styleById = new Map(existing.map((s) => [s.id, s]));
    const styleByName = new Map(existing.map((s) => [s.name, s]));
    const anchoredStyle = (spec) => spec.boundStyleId ? styleById.get(spec.boundStyleId) : void 0;
    const renameBlocked = /* @__PURE__ */ new Set();
    const roleRenames = [];
    for (const spec of specs) {
      const st = anchoredStyle(spec);
      if (!st || st.name === spec.name) continue;
      const occupant = styleByName.get(spec.name);
      if (occupant && occupant.id !== st.id) {
        renameBlocked.add(spec.boundStyleId);
        res.missing.push(t("textStyle.missRename", { from: st.name, to: spec.name }));
        continue;
      }
      roleRenames.push({ from: st.name, to: spec.name });
    }
    if (roleRenames.length) {
      const cols0 = await figma.variables.getLocalVariableCollectionsAsync();
      const semId0 = (_a = findCollection(cols0, "semantic")) == null ? void 0 : _a.id;
      if (semId0) {
        const byName = /* @__PURE__ */ new Map();
        for (const v of await figma.variables.getLocalVariablesAsync())
          if (v.variableCollectionId === semId0) byName.set(v.name, v);
        for (const { from, to } of roleRenames)
          for (const cat of ["font-size", "line-height", "letter-spacing"]) {
            const v = byName.get(`${cat}/${from}`);
            if (v && !byName.has(`${cat}/${to}`)) {
              v.name = `${cat}/${to}`;
              byName.set(`${cat}/${to}`, v);
              byName.delete(`${cat}/${from}`);
            }
          }
      }
    }
    const tokens = [];
    const seen = /* @__PURE__ */ new Set();
    const pushTok = (t2) => {
      if (!seen.has(t2.name)) {
        seen.add(t2.name);
        tokens.push(t2);
      }
    };
    const aliasMap = {};
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
    const pushAlias = (role, fontSize, lineHeight, letterSpacing, lineHeightPercent = 0, letterSpacingPercent = 0) => {
      pushTok({ name: numberTokenName("font-size", fontSize), category: "fontSize", value: fontSize, sources: ["fontSize"] });
      aliasMap[`font-size/${role}`] = numberTokenName("font-size", fontSize);
      if (lineHeight > 0 && lineHeightPercent === 0 && Number.isInteger(lineHeight)) {
        const lhName = numberTokenName("line-height", lineHeight);
        pushLineHeightTok(lhName, lineHeight, 0, fontSize);
        aliasMap[`line-height/${role}`] = lhName;
      }
      if (letterSpacing !== 0 && letterSpacingPercent === 0 && Number.isInteger(letterSpacing)) {
        const lsName = numberTokenName("letter-spacing", letterSpacing);
        pushLetterSpacingTok(lsName, letterSpacing, 0, fontSize);
        aliasMap[`letter-spacing/${role}`] = lsName;
      }
    };
    for (const s of specs) {
      if (anchoredStyle(s)) continue;
      pushAlias(s.name, s.fontSize, s.lineHeight, s.letterSpacing, (_b = s.lineHeightPercent) != null ? _b : 0, (_c = s.letterSpacingPercent) != null ? _c : 0);
    }
    {
      const cols0 = await figma.variables.getLocalVariableCollectionsAsync();
      const semId0 = (_d = findCollection(cols0, "semantic")) == null ? void 0 : _d.id;
      const semNames = /* @__PURE__ */ new Set();
      if (semId0) {
        for (const v of await figma.variables.getLocalVariablesAsync())
          if (v.variableCollectionId === semId0) semNames.add(v.name);
      }
      for (const s of specs) {
        const st = anchoredStyle(s);
        if (!st) continue;
        if (semNames.has(`font-size/${s.name}`)) continue;
        const fontSize = roundN(st.fontSize);
        pushAlias(s.name, fontSize, lhPxOf(fontSize, st.lineHeight), lsPxOf(fontSize, st.letterSpacing), lhPctOf(st.lineHeight), lsPctOf(st.letterSpacing));
      }
    }
    if (tokens.length) await createTokens(tokens, 16);
    if (Object.keys(aliasMap).length) await createSemanticAliases(aliasMap);
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const semId = (_e = findCollection(cols, "semantic")) == null ? void 0 : _e.id;
    const semByName = /* @__PURE__ */ new Map();
    if (semId) {
      for (const v of await figma.variables.getLocalVariablesAsync())
        if (v.variableCollectionId === semId) semByName.set(v.name, v);
    }
    for (const spec of specs) {
      const anchored = anchoredStyle(spec);
      if (anchored && spec.boundStyleId && renameBlocked.has(spec.boundStyleId)) {
        continue;
      }
      let style = anchored;
      if (!style) style = styleByName.get(spec.name);
      const created = !style;
      const isRename = !!anchored;
      if (!style) style = figma.createTextStyle();
      if (style.name !== spec.name) {
        styleByName.delete(style.name);
        style.name = spec.name;
      }
      const lhPct = (_f = spec.lineHeightPercent) != null ? _f : 0;
      const lsPct = (_g = spec.letterSpacingPercent) != null ? _g : 0;
      if (!isRename) {
        const wanted = { family: spec.family, style: spec.style };
        let loaded;
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
      const fsVar = semByName.get(`font-size/${bindRole}`);
      if (fsVar) {
        style.setBoundVariable("fontSize", fsVar);
        res.bound++;
      } else res.missing.push(`font-size/${bindRole}`);
      if (spec.lineHeight > 0 || isRename) {
        const pctNow = lhPctOf(style.lineHeight);
        if (pctNow > 0) {
          if ((_j = style.boundVariables) == null ? void 0 : _j.lineHeight) style.setBoundVariable("lineHeight", null);
          res.notes.push(t("textStyle.noteLhPct", { role: bindRole, n: pctNow }));
        } else {
          const lhVar = semByName.get(`line-height/${bindRole}`);
          if (lhVar) {
            style.setBoundVariable("lineHeight", lhVar);
            res.bound++;
          } else if (spec.lineHeight > 0 && Number.isInteger(spec.lineHeight)) res.missing.push(`line-height/${bindRole}`);
        }
      }
      if (spec.letterSpacing !== 0 || isRename) {
        const lsPctNow = lsPctOf(style.letterSpacing);
        if (lsPctNow !== 0) {
          if ((_k = style.boundVariables) == null ? void 0 : _k.letterSpacing) style.setBoundVariable("letterSpacing", null);
          res.notes.push(t("textStyle.noteLsPct", { role: bindRole, n: lsPctNow }));
        } else {
          const lsVar = semByName.get(`letter-spacing/${bindRole}`);
          if (lsVar) {
            style.setBoundVariable("letterSpacing", lsVar);
            res.bound++;
          } else if (spec.letterSpacing !== 0 && Number.isInteger(spec.letterSpacing)) res.missing.push(`letter-spacing/${bindRole}`);
        }
      }
      res[created ? "created" : "updated"]++;
      styleByName.set(style.name, style);
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
  var TEXT_VAR_FIELDS = ["fontSize", "lineHeight", "letterSpacing", "fontFamily"];
  function hasTextVarBinding(t2) {
    const bv = t2.boundVariables;
    if (!bv) return false;
    return TEXT_VAR_FIELDS.some((f) => {
      const e = bv[f];
      return Array.isArray(e) ? e.length > 0 : !!e;
    });
  }
  function hasTextStyle(t2) {
    const id = t2.textStyleId;
    return id === figma.mixed || typeof id === "string" && id !== "";
  }
  function insideInstance(node) {
    for (let p = node.parent; p; p = p.parent) if (p.type === "INSTANCE") return true;
    return false;
  }
  async function applyExistingTextStyles(nodes) {
    const skipReasons = { hasStyle: 0, noStyle: 0, ambiguous: 0, boundVars: 0, mixed: 0, instance: 0 };
    const res = { applied: 0, skipped: 0, skipReasons };
    const skipText = (k) => {
      skipReasons[k]++;
      res.skipped++;
    };
    const styleByKey = /* @__PURE__ */ new Map();
    for (const s of await figma.getLocalTextStylesAsync()) {
      const k = typoKey(s);
      styleByKey.set(k, styleByKey.has(k) ? null : s);
    }
    const texts = [];
    const inInstance = [];
    for (const n of nodes) {
      if (insideInstance(n)) walkText(n, inInstance);
      else walkText(n, texts, inInstance);
    }
    for (let i = 0; i < inInstance.length; i++) skipText("instance");
    const loaded = /* @__PURE__ */ new Set();
    const ensureFont = async (fn) => {
      const k = `${fn.family} ${fn.style}`;
      if (loaded.has(k)) return;
      await figma.loadFontAsync(fn);
      loaded.add(k);
    };
    for (const t2 of texts) {
      if (hasTextStyle(t2)) {
        skipText("hasStyle");
        continue;
      }
      if (hasTextVarBinding(t2)) {
        skipText("boundVars");
        continue;
      }
      if (isMixedTypography(t2)) {
        skipText("mixed");
        continue;
      }
      const fn = t2.fontName;
      const hit = styleByKey.get(typoKey(t2));
      if (hit === void 0) {
        skipText("noStyle");
        continue;
      }
      if (hit === null) {
        skipText("ambiguous");
        continue;
      }
      try {
        await ensureFont(fn);
        await t2.setTextStyleIdAsync(hit.id);
        res.applied++;
      } catch (e) {
      }
    }
    return res;
  }

  // src/lib/textStyles.ts
  var RAMP_NAMES = ["display", "h1", "h2", "h3", "title", "body", "caption", "overline"];
  var sigKey = (s) => `${s.fontSize}|${s.lineHeight}|${s.letterSpacing}|${s.family}|${s.style}`;
  function clusterTextStyles(samples) {
    var _a;
    const map = /* @__PURE__ */ new Map();
    const ids = /* @__PURE__ */ new Map();
    for (const s of samples) {
      const k = sigKey(s);
      const ex = map.get(k);
      if (ex) {
        ex.count++;
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
  var slug = (s) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  function nameTextStyles(clusters, existing) {
    var _a, _b, _c;
    const nameById = /* @__PURE__ */ new Map();
    const sigById = /* @__PURE__ */ new Map();
    const idBySig = /* @__PURE__ */ new Map();
    for (const e of existing != null ? existing : []) {
      nameById.set(e.id, e.name);
      const k = sigKey(e);
      sigById.set(e.id, k);
      idBySig.set(k, idBySig.has(k) ? null : e.id);
    }
    const existingById = new Map((existing != null ? existing : []).map((e) => [e.id, e]));
    const boundIdOf = (c) => {
      if (!existing) return void 0;
      if (c.styleIds.length === 1) {
        const id = c.styleIds[0];
        if (nameById.has(id) && sigById.get(id) === sigKey(c)) return id;
      }
      const sigId = idBySig.get(sigKey(c));
      return sigId && nameById.has(sigId) ? sigId : void 0;
    };
    const sizesDesc = [...new Set(clusters.map((c) => c.fontSize))].sort((a, b) => b - a);
    const baseBySize = /* @__PURE__ */ new Map();
    sizesDesc.forEach((sz, i) => baseBySize.set(sz, i < RAMP_NAMES.length ? RAMP_NAMES[i] : `text-${i + 1}`));
    const used = /* @__PURE__ */ new Set();
    const unique = (n) => {
      if (!used.has(n)) {
        used.add(n);
        return n;
      }
      let k = 2;
      while (used.has(`${n}-${k}`)) k++;
      const u = `${n}-${k}`;
      used.add(u);
      return u;
    };
    for (const c of clusters) {
      const id = boundIdOf(c);
      if (id) used.add(nameById.get(id));
    }
    const specs = [];
    for (const sz of sizesDesc) {
      const base = baseBySize.get(sz);
      const group = clusters.filter((c) => c.fontSize === sz).sort((a, b) => b.count - a.count || b.lineHeight - a.lineHeight);
      const weightUnique = new Set(group.map((c) => slug(c.style))).size === group.length;
      for (const c of group) {
        const boundId = boundIdOf(c);
        const name = boundId ? nameById.get(boundId) : unique(group.length === 1 ? base : weightUnique ? `${base}/${slug(c.style)}` : `${base}/${slug(c.family)}-${slug(c.style)}`);
        const ex = boundId ? existingById.get(boundId) : void 0;
        const lineHeightPercent = c.lineHeightPercent || (ex == null ? void 0 : ex.lineHeightPercent) || 0;
        const letterSpacingPercent = ((_a = c.letterSpacingPercent) != null ? _a : 0) !== 0 ? c.letterSpacingPercent : (_b = ex == null ? void 0 : ex.letterSpacingPercent) != null ? _b : 0;
        specs.push(__spreadValues(__spreadProps(__spreadValues(__spreadValues(__spreadValues({
          name,
          fontSize: c.fontSize,
          lineHeight: c.lineHeight,
          letterSpacing: c.letterSpacing,
          family: c.family,
          style: c.style
        }, lineHeightPercent ? { lineHeightPercent } : {}), letterSpacingPercent !== 0 ? { letterSpacingPercent } : {}), boundId ? { boundStyleId: boundId } : {}), {
          count: c.count
        }), ((_c = c.nodeIds) == null ? void 0 : _c.length) ? { nodeIds: c.nodeIds } : {}));
      }
    }
    return specs;
  }
  var LABEL_RAMP_RE = /^(display|h[1-6]|title|body|caption|overline)(\/\S+)?$/i;
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
    const styles = nameTextStyles(clusterTextStyles(forCluster), existing);
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
        labeled++;
      }
    }
    for (const style of styles) {
      if (style.boundStyleId) continue;
      if (labelBySig.has(sigKey(style))) continue;
      style.name = unique(style.name);
      fallback++;
    }
    return { styles, labeled, fallback };
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
  var FILL_SCOPES = ["ALL_FILLS", "FRAME_FILL", "SHAPE_FILL", "TEXT_FILL"];
  var STROKE_SCOPES = ["STROKE_COLOR"];
  var EFFECT_SCOPES = ["EFFECT_COLOR"];

  // src/lib/bind.ts
  var round2 = (n) => Math.round(n * 100) / 100;
  function sameNumber(a, b) {
    return round2(a) === round2(b);
  }
  var SKIP_PREVIEW_CAP = 200;
  var RESULT_CAP = 600;
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
  function addColorCand(preview, node, field, index, hex, e) {
    preview == null ? void 0 : preview.candidates.push({ nodeId: node.id, field, index, currentValue: hex, variableId: e.variable.id, variableName: e.variable.name, tier: e.tier, variableValue: hex });
  }
  function addFloatCand(preview, node, field, value, e) {
    preview == null ? void 0 : preview.candidates.push(__spreadValues({ nodeId: node.id, field, currentValue: String(value), variableId: e.variable.id, variableName: e.variable.name, tier: e.tier }, e.num != null ? { variableValue: String(round2(e.num)) } : {}));
  }
  function addStrCand(preview, node, field, value, e) {
    preview == null ? void 0 : preview.candidates.push({ nodeId: node.id, field, currentValue: value, variableId: e.variable.id, variableName: e.variable.name, tier: e.tier, variableValue: value });
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
    var _a, _b;
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
        if (await figma.variables.getVariableByIdAsync(id)) live.add(id);
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
    if (!entry) return "none";
    return aliasesState(Array.isArray(entry) ? entry : [entry]);
  }
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
  function isEffectivelyVisible2(node) {
    let p = node;
    while (p) {
      if ("visible" in p && p.visible === false) return false;
      p = p.parent;
    }
    return true;
  }
  function countNodes(sel) {
    let n = 0;
    const stack = sel.slice();
    while (stack.length) {
      const x = stack.pop();
      if (x.visible === false) continue;
      n++;
      if (x.type === "INSTANCE") continue;
      if ("children" in x) for (const c of x.children) stack.push(c);
    }
    return n;
  }
  function note(res, key, node, preview, field) {
    var _a;
    res.reasons[key] = ((_a = res.reasons[key]) != null ? _a : 0) + 1;
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
  async function bindSelection(selection2, apply = true, hooks = {}) {
    var _a;
    const entries = await buildIndex();
    liveVarIds = await collectLiveVarIds(selection2, new Set((await figma.variables.getLocalVariablesAsync()).map((v) => v.id)));
    const res = { bound: 0, skipped: 0, reasons: {} };
    const prog = { done: 0, total: hooks.onProgress ? countNodes(selection2) : 0, every: 50 };
    const preview = { candidates: [], nodeIndex: [], skips: [], skipSeen: /* @__PURE__ */ new Set() };
    for (const node of selection2) {
      if (!isEffectivelyVisible2(node)) {
        note(res, "hidden", node, preview);
        continue;
      }
      await walk2(node, entries, res, apply, hooks, prog, preview, 0, null);
      if (res.cancelled) break;
    }
    {
      res.candidateTotal = preview.candidates.length;
      res.candidates = preview.candidates.slice(0, RESULT_CAP);
      const skips = capSkipsByReason(preview.skips, SKIP_PREVIEW_CAP);
      res.nodes = pruneToAffected(preview.nodeIndex, res.candidates, skips);
      res.skips = skips;
      res.skipTotal = preview.skips.length;
    }
    (_a = hooks.onProgress) == null ? void 0 : _a.call(hooks, prog.done, prog.total);
    return res;
  }
  async function buildIndex() {
    var _a, _b;
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const modeOf = new Map(cols.map((c) => [c.id, c.defaultModeId]));
    const tierOf = collectionTiers(cols);
    const vars = await figma.variables.getLocalVariablesAsync();
    const globalNames = new Set(
      vars.filter((v) => tierOf.get(v.variableCollectionId) === 1).map((v) => v.name)
    );
    const entries = [];
    for (const v of vars) {
      const tier = (_a = tierOf.get(v.variableCollectionId)) != null ? _a : 0;
      if (tier < 1) continue;
      const val = await resolveValue(v, modeOf);
      if (val == null) continue;
      const e = { variable: v, tier, type: v.resolvedType, scopes: (_b = v.scopes) != null ? _b : ["ALL_SCOPES"] };
      if (tier === 2 && globalNames.has(v.name)) e.mirror = true;
      if (v.resolvedType === "COLOR" && isRGB(val)) {
        if (isOpaqueColorValue(val)) e.colorHex = rgbToHex(val);
      } else if (v.resolvedType === "FLOAT" && typeof val === "number") e.num = val;
      else if (v.resolvedType === "STRING" && typeof val === "string") e.str = val;
      entries.push(e);
    }
    entries.sort((a, b) => {
      var _a2, _b2;
      return b.tier - a.tier || Number((_a2 = a.mirror) != null ? _a2 : false) - Number((_b2 = b.mirror) != null ? _b2 : false);
    });
    return entries;
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
  function isOpaqueColorValue(v) {
    const a = v.a;
    return typeof a !== "number" || a === 1;
  }
  function isTranslucentPaint(p) {
    return typeof p.opacity === "number" && p.opacity < 1;
  }
  function isTranslucentEffectColor(e) {
    const a = e.color.a;
    return typeof a === "number" && a < 1;
  }
  function isRGB(v) {
    return typeof v === "object" && v !== null && "r" in v && "g" in v && "b" in v;
  }
  function colorScopeOk(e, allowed) {
    return e.scopes.includes("ALL_SCOPES") || allowed.some((s) => e.scopes.includes(s));
  }
  function matchColor(entries, hex, allowed) {
    for (const e of entries) if (e.colorHex === hex && colorScopeOk(e, allowed)) return e;
    return null;
  }
  function matchFloat(entries, value, scope) {
    let best = null;
    let bestDist = Infinity;
    for (const e of entries) {
      if (e.num == null) continue;
      if (scope && !e.scopes.includes("ALL_SCOPES") && !e.scopes.includes(scope)) continue;
      if (!sameNumber(e.num, value)) continue;
      const dist = Math.abs(e.num - value);
      if (dist < bestDist || dist === bestDist && best !== null && (best.tier < e.tier || best.tier === e.tier && best.mirror && !e.mirror)) {
        best = e;
        bestDist = dist;
      }
    }
    return best;
  }
  function matchString(entries, str, scope) {
    for (const e of entries) {
      if (e.str !== str) continue;
      if (!e.scopes.includes("ALL_SCOPES") && !e.scopes.includes(scope)) continue;
      return e;
    }
    return null;
  }
  async function walk2(node, entries, res, apply, hooks, prog, preview, depth, parentId) {
    var _a;
    if (res.cancelled) return;
    if (node.visible === false) {
      note(res, "hidden", node, preview);
      return;
    }
    preview == null ? void 0 : preview.nodeIndex.push({ id: node.id, name: node.name, type: node.type, depth, parentId });
    bindPaints(node, entries, res, apply, preview);
    bindFrame(node, entries, res, apply, preview);
    bindRadius(node, entries, res, apply, preview);
    bindStroke(node, entries, res, apply, preview);
    bindOpacity(node, entries, res, apply, preview);
    bindEffects(node, entries, res, apply, preview);
    await bindText(node, entries, res, apply, preview);
    prog.done++;
    if (hooks.onProgress && prog.done % prog.every === 0) {
      hooks.onProgress(prog.done, prog.total);
      if (hooks.yieldToEvents) await hooks.yieldToEvents();
      if ((_a = hooks.shouldCancel) == null ? void 0 : _a.call(hooks)) {
        res.cancelled = true;
        return;
      }
    }
    if (node.type === "INSTANCE") {
      if (node.children.length) {
        note(res, "instance-children", node, preview);
      }
      return;
    }
    if ("children" in node)
      for (const c of node.children) {
        await walk2(c, entries, res, apply, hooks, prog, preview, depth + 1, node.id);
        if (res.cancelled) return;
      }
  }
  function bindPaints(node, entries, res, apply, preview) {
    for (const key of ["fills", "strokes"]) {
      if (!(key in node)) continue;
      const paints3 = node[key];
      if (paints3 === figma.mixed || !Array.isArray(paints3)) continue;
      if (!paints3.some((p) => p.type === "SOLID")) continue;
      if (hasStyleId(node, STYLE_KEY_OF[key])) {
        note(res, "styled", node, preview, key);
        continue;
      }
      const allowed = key === "fills" ? FILL_SCOPES : STROKE_SCOPES;
      let changed = false;
      const next = paints3.map((p, i) => {
        if (p.type !== "SOLID") return p;
        const st = stateReason(colorState(p, node, key, i));
        if (st) {
          note(res, st, node, preview, key);
          return p;
        }
        if (isTranslucentPaint(p)) {
          skip(res, "translucent", node, preview, key);
          return p;
        }
        const hex = rgbToHex(p.color);
        const e = matchColor(entries, hex, allowed);
        if (!e) {
          skip(res, "no-match", node, preview, key);
          return p;
        }
        res.bound++;
        addColorCand(preview, node, key, i, hex, e);
        if (!apply) return p;
        changed = true;
        return figma.variables.setBoundVariableForPaint(p, "color", e.variable);
      });
      if (changed && apply) node[key] = next;
    }
  }
  function bindFrame(node, entries, res, apply, preview) {
    if (node.type !== "FRAME" && node.type !== "COMPONENT" && node.type !== "INSTANCE") return;
    const parent = node.parent;
    const absolute = "layoutPositioning" in node && node.layoutPositioning === "ABSOLUTE";
    const inAutoLayout = !absolute && (node.layoutMode !== "NONE" || parent != null && "layoutMode" in parent && parent.layoutMode !== "NONE");
    if (inAutoLayout) {
      const bindAxis = (sizing, field, v) => {
        if (sizing !== "FIXED") {
          note(res, "hug-fill", node, preview, field);
          return;
        }
        const fraction = Math.abs(v - Math.round(v)) >= 5e-3;
        tryBind(node, field, v, entries, res, apply, preview, fraction ? "size-fraction" : void 0);
      };
      bindAxis(node.layoutSizingHorizontal, "width", node.width);
      bindAxis(node.layoutSizingVertical, "height", node.height);
    } else {
      note(res, "size-free-layout", node, preview);
    }
    if (node.layoutMode === "NONE") {
      note(res, "no-autolayout", node, preview);
      return;
    }
    if (node.layoutMode === "GRID") {
      tryBind(node, "gridRowGap", node.gridRowGap, entries, res, apply, preview);
      tryBind(node, "gridColumnGap", node.gridColumnGap, entries, res, apply, preview);
    } else {
      for (const f of ["itemSpacing", "counterAxisSpacing"]) {
        const v = node[f];
        if (typeof v !== "number") continue;
        const skip2 = gapSkip(node, f);
        if (skip2 === "no-wrap") continue;
        if (skip2 === "space-between") note(res, "space-between", node, preview, f);
        else tryBind(node, f, v, entries, res, apply, preview);
      }
    }
    tryBind(node, "paddingLeft", node.paddingLeft, entries, res, apply, preview);
    tryBind(node, "paddingRight", node.paddingRight, entries, res, apply, preview);
    tryBind(node, "paddingTop", node.paddingTop, entries, res, apply, preview);
    tryBind(node, "paddingBottom", node.paddingBottom, entries, res, apply, preview);
  }
  function bindRadius(node, entries, res, apply, preview) {
    if (!("cornerRadius" in node)) return;
    const r = node.cornerRadius;
    const corners = ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"];
    if (r !== figma.mixed && typeof r === "number" && r > 0) {
      for (const c of corners) tryBind(node, c, r, entries, res, apply, preview);
    } else if (r === figma.mixed) {
      for (const c of corners) {
        const cv = node[c];
        if (typeof cv === "number" && cv > 0) tryBind(node, c, cv, entries, res, apply, preview);
      }
    }
  }
  function bindOpacity(node, entries, res, apply, preview) {
    if (!("opacity" in node)) return;
    const o = node.opacity;
    if (typeof o !== "number" || o >= 1 || o <= 0) return;
    tryBind(node, "opacity", o, entries, res, apply, preview);
  }
  function bindStroke(node, entries, res, apply, preview) {
    if (!("strokes" in node) || !("strokeWeight" in node)) return;
    const strokes = node.strokes;
    if (strokes === figma.mixed || !Array.isArray(strokes) || !strokes.some((p) => p.visible !== false)) return;
    const w = node.strokeWeight;
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
      tryBind(node, field, v, entries, res, apply, preview);
    };
    if (w !== figma.mixed && typeof w === "number") {
      one("strokeWeight", w);
      return;
    }
    for (const side of ["strokeTopWeight", "strokeRightWeight", "strokeBottomWeight", "strokeLeftWeight"]) {
      const sv = node[side];
      if (typeof sv === "number") one(side, sv);
    }
  }
  function bindEffects(node, entries, res, apply, preview) {
    if (!("effects" in node)) return;
    const effects = node.effects;
    if (!effects.some((e) => e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW")) return;
    if (hasStyleId(node, "effectStyleId")) {
      note(res, "styled", node, preview, "effects");
      return;
    }
    let changed = false;
    const next = effects.map((e, i) => {
      if (e.type !== "DROP_SHADOW" && e.type !== "INNER_SHADOW") return e;
      const st = stateReason(colorState(e, node, "effects", i));
      if (st) {
        note(res, st, node, preview, "effects");
        return e;
      }
      if (isTranslucentEffectColor(e)) {
        skip(res, "translucent", node, preview, "effects");
        return e;
      }
      const hex = rgbToHex(e.color);
      const ent = matchColor(entries, hex, EFFECT_SCOPES);
      if (!ent) {
        skip(res, "no-match", node, preview, "effects");
        return e;
      }
      res.bound++;
      addColorCand(preview, node, "effects", i, hex, ent);
      if (!apply) return e;
      changed = true;
      return figma.variables.setBoundVariableForEffect(e, "color", ent.variable);
    });
    if (changed && apply) node.effects = next;
  }
  async function bindText(node, entries, res, apply, preview) {
    if (node.type !== "TEXT") return;
    if (node.fontName === figma.mixed) return;
    if (hasStyleId(node, "textStyleId")) {
      if (node.fontSize !== figma.mixed) note(res, "styled", node, preview, "fontSize");
      if (node.lineHeight !== figma.mixed && node.lineHeight.unit === "PIXELS") note(res, "styled", node, preview, "lineHeight");
      if (node.letterSpacing !== figma.mixed && node.letterSpacing.unit === "PIXELS") note(res, "styled", node, preview, "letterSpacing");
      if (matchString(entries, node.fontName.family, "FONT_FAMILY")) note(res, "styled", node, preview, "fontFamily");
      return;
    }
    try {
      await figma.loadFontAsync(node.fontName);
    } catch (e) {
      note(res, "font", node, preview);
      return;
    }
    if (node.fontSize !== figma.mixed) tryBindText(node, "fontSize", node.fontSize, entries, res, apply, preview);
    if (node.lineHeight !== figma.mixed && node.lineHeight.unit === "PIXELS") {
      tryBindText(node, "lineHeight", node.lineHeight.value, entries, res, apply, preview);
    }
    if (node.letterSpacing !== figma.mixed && node.letterSpacing.unit === "PIXELS") {
      tryBindText(node, "letterSpacing", node.letterSpacing.value, entries, res, apply, preview);
    }
    if (node.characters.length === 0) return;
    const st = stateReason(textFieldState(node, "fontFamily"));
    if (st) {
      note(res, st, node, preview, "fontFamily");
      return;
    }
    const fe = matchString(entries, node.fontName.family, "FONT_FAMILY");
    if (!fe) return;
    if (!apply) {
      res.bound++;
      addStrCand(preview, node, "fontFamily", node.fontName.family, fe);
      return;
    }
    try {
      node.setRangeBoundVariable(0, node.characters.length, "fontFamily", fe.variable);
      res.bound++;
      addStrCand(preview, node, "fontFamily", node.fontName.family, fe);
    } catch (e) {
      skip(res, "error", node, preview, "fontFamily");
    }
  }
  function tryBindText(node, field, value, entries, res, apply, preview) {
    if (node.characters.length === 0) {
      skip(res, "empty-text", node, preview, field);
      return;
    }
    const st = stateReason(textFieldState(node, field));
    if (st) {
      note(res, st, node, preview, field);
      return;
    }
    const e = matchFloat(entries, value, FIELD_SCOPE[field]);
    if (!e) {
      skip(res, "no-match", node, preview, field);
      return;
    }
    if (!apply) {
      res.bound++;
      addFloatCand(preview, node, field, value, e);
      return;
    }
    try {
      node.setRangeBoundVariable(0, node.characters.length, field, e.variable);
      res.bound++;
      addFloatCand(preview, node, field, value, e);
    } catch (e2) {
      skip(res, "error", node, preview, field);
    }
  }
  function tryBind(node, field, value, entries, res, apply, preview, noMatchReason = "no-match") {
    const st = stateReason(nodeFieldState(node, field));
    if (st) {
      note(res, st, node, preview, field);
      return;
    }
    const e = matchFloat(entries, value, FIELD_SCOPE[field]);
    if (!e) {
      skip(res, noMatchReason, node, preview, field);
      return;
    }
    if (!apply) {
      res.bound++;
      addFloatCand(preview, node, field, value, e);
      return;
    }
    try {
      node.setBoundVariable(field, e.variable);
      res.bound++;
      addFloatCand(preview, node, field, value, e);
    } catch (e2) {
      skip(res, "error", node, preview, field);
    }
  }
  async function bindSelectedItems(items) {
    var _a, _b, _c;
    const res = { bound: 0, skipped: 0, reasons: {} };
    const preview = { candidates: [], nodeIndex: [], skips: [], skipSeen: /* @__PURE__ */ new Set() };
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const modeOf = new Map(cols.map((c) => [c.id, c.defaultModeId]));
    const localIds = new Set((await figma.variables.getLocalVariablesAsync()).map((v) => v.id));
    const nodes = /* @__PURE__ */ new Map();
    for (const it of items) {
      if (nodes.has(it.nodeId)) continue;
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
    const changedPaints = /* @__PURE__ */ new Map();
    const fail = (key, node, field) => {
      var _a2;
      if (node) skip(res, key, node, preview, field);
      else {
        res.skipped++;
        res.reasons[key] = ((_a2 = res.reasons[key]) != null ? _a2 : 0) + 1;
      }
    };
    for (const it of items) {
      const node = (_a = nodes.get(it.nodeId)) != null ? _a : null;
      const vv = await variableOf(it.variableId);
      if (!node || !vv) {
        fail("changed", node, it.field);
        continue;
      }
      const { variable, value } = vv;
      try {
        if (it.field === "fills" || it.field === "strokes" || it.field === "effects") {
          const key = it.field;
          if (hasStyleId(node, STYLE_KEY_OF[key])) {
            fail("styled", node, key);
            continue;
          }
          const pending = (_b = changedPaints.get(node)) == null ? void 0 : _b.get(key);
          const list = pending != null ? pending : node[key];
          const i = (_c = it.index) != null ? _c : 0;
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
          const translucent = key === "effects" ? isTranslucentEffectColor(x) : isTranslucentPaint(x);
          const hex = rgbToHex(x.color);
          if (translucent || variable.resolvedType !== "COLOR" || !value || !isRGB(value) || !isOpaqueColorValue(value) || rgbToHex(value) !== hex) {
            fail("changed", node, key);
            continue;
          }
          const arr = list.slice();
          arr[i] = key === "effects" ? figma.variables.setBoundVariableForEffect(x, "color", variable) : figma.variables.setBoundVariableForPaint(x, "color", variable);
          let m = changedPaints.get(node);
          if (!m) changedPaints.set(node, m = /* @__PURE__ */ new Map());
          m.set(key, arr);
          res.bound++;
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
          node.setRangeBoundVariable(0, node.characters.length, field, variable);
          res.bound++;
          continue;
        }
        const gap = gapSkip(node, it.field);
        if (gap) {
          fail(gap === "no-wrap" ? "changed" : "space-between", node, it.field);
          continue;
        }
        const st = stateReason(nodeFieldState(node, it.field));
        if (st) {
          fail(st, node, it.field);
          continue;
        }
        const cur = node[it.field];
        if (typeof cur !== "number" || typeof value !== "number" || !sameNumber(cur, value)) {
          fail("changed", node, it.field);
          continue;
        }
        node.setBoundVariable(it.field, variable);
        res.bound++;
      } catch (e) {
        fail("error", node, it.field);
      }
    }
    for (const [node, m] of changedPaints) {
      for (const [key, arr] of m) {
        try {
          node[key] = arr;
        } catch (e) {
        }
      }
    }
    const skips = capSkipsByReason(preview.skips, SKIP_PREVIEW_CAP);
    return { bound: res.bound, skipped: res.skipped, reasons: res.reasons, skips, skipTotal: preview.skips.length };
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
    const aliasId = (raw) => {
      if (!raw) return void 0;
      const a = Array.isArray(raw) ? raw[0] : raw;
      return a && typeof a === "object" && "id" in a ? a.id : void 0;
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
      const id = aliasId(raw);
      if (id) out.push(id);
    }
    return out;
  }
  function walkVisibleDeep(roots, visit) {
    let scanned = 0;
    const stack = [];
    for (const r of roots) if (isEffectivelyVisible2(r)) stack.push(r);
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

  // src/lib/naming.ts
  var EMITTED_ROLES = [
    // 구조 폴백(역할을 못 정했을 때)
    "container",
    "wrapper",
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
    "tab",
    "label",
    "title"
  ];
  var ROLE_VOCAB = [...EMITTED_ROLES, ...RECOGNIZED_ROLES];
  var ROLE_KEY = "dsRole";
  var ROLE_SET = new Set(ROLE_VOCAB);
  function isKnownRole(seg) {
    return ROLE_SET.has(seg);
  }
  function kebab(input) {
    return input.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/[\s/]+/g, "-").replace(/_/g, (_m, i, s) => /\d/.test(s[i - 1] || "") && /\d/.test(s[i + 1] || "") ? "_" : "-").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
  }
  var ABBR = {
    btn: "button",
    img: "image",
    txt: "text",
    msg: "message",
    ico: "icon",
    pic: "picture",
    pwd: "password"
  };
  function pascalCase(input) {
    const tokens = kebab(input).split("-").filter(Boolean);
    const out = tokens.map((t2) => {
      var _a;
      const w = (_a = ABBR[t2]) != null ? _a : t2;
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join("");
    return out || input;
  }
  function capitalize(input) {
    return input ? input.charAt(0).toUpperCase() + input.slice(1) : input;
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
  var GENERIC_ROLES = /* @__PURE__ */ new Set(["frame", "container", "wrapper", "content", "group", "section", "body", "main", "shape"]);
  function pickScope(name) {
    const segs = kebab(name).split("-").filter((s) => s && !/^\d+$/.test(s) && !UNIT_WORDS.has(s) && !/^[0-9a-f]{6}$/.test(s) && !GENERIC_ROLES.has(s));
    if (!segs.length) return null;
    const known = segs.filter(isKnownRole);
    return known.length ? known[known.length - 1] : segs[segs.length - 1];
  }

  // src/lib/rename.ts
  async function renameSelection(selection2, opts) {
    const col = { changes: [], nodes: [] };
    const safeOpts = __spreadProps(__spreadValues({}, opts), { maxDepth: normalizeMaxDepth(opts.maxDepth) });
    await recurse(selection2, null, safeOpts, col, 0, null, null, null, null, 0);
    return { changes: col.changes, nodes: col.nodes, applied: opts.apply };
  }
  function normalizeMaxDepth(v) {
    return Number.isFinite(v) ? Math.max(1, Math.round(v)) : 8;
  }
  async function recurse(nodes, ancestorName, opts, col, depth, parentLayout, parentId, parentRole, parentDims, ctxDepth) {
    var _a, _b;
    const total = nodes.length;
    const slotOf = /* @__PURE__ */ new Map();
    let slots = 0;
    for (let i = 0; i < total; i++) if (isLandmarkCandidate(nodes[i])) slotOf.set(i, slots++);
    const overlayAt = findOverlayIndex(nodes, parentDims);
    const hasAvatarSibling = nodes.some((n) => n.type === "ELLIPSE" && hasImageFill(n));
    for (let i = 0; i < total; i++) {
      const node = nodes[i];
      const before = node.name;
      const d = dims(node);
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
        ctxDepth
      };
      const decided = await decide(node, ancestorName, pos, opts, parentRole);
      let contextForChildren = before;
      let ctxDepthForChildren = 0;
      let after;
      if (!decided.skip && decided.name) {
        if (decided.name !== before) {
          after = decided.name;
          col.changes.push({ id: node.id, before, after });
          if (opts.apply) node.name = after;
        }
        if (opts.apply && decided.role) writeRole(node, decided.role);
        contextForChildren = decided.passthrough ? ancestorName : decided.name;
        if (decided.passthrough) ctxDepthForChildren = ctxDepth + 1;
      }
      col.nodes.push({ id: node.id, name: before, type: node.type, depth, parentId, after, keep: decided.keep, role: decided.role });
      if ("children" in node && !isSkippedSubtree(node)) {
        const childDims = decided.passthrough ? parentDims : dims(node);
        await recurse(node.children, contextForChildren, opts, col, depth + 1, layoutOf(node), node.id, (_b = decided.role) != null ? _b : null, childDims, ctxDepthForChildren);
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
    if (PASSTHROUGH_ROLES.has(role)) return { skip: false, role, name: role, passthrough: true };
    const scope = ctxScope === role ? null : ctxScope;
    return { skip: false, role, name: layerNameFromRole(scope, role, { maxDepth: opts.maxDepth }) };
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
  function writeRoleFromName(node, name) {
    const toks = kebab(name).split("-").filter(Boolean);
    const role = toks[toks.length - 1];
    return role && isKnownRole(role) ? writeRole(node, role) : false;
  }
  var PASSTHROUGH_ROLES = /* @__PURE__ */ new Set(["container", "wrapper"]);
  var PAINT_ROLES = /* @__PURE__ */ new Set(["background", "border", "surface"]);
  var hasChildren = (node) => "children" in node && node.children.length > 0;
  function resolveRole(node, token, pos, parentRole, ctxScope) {
    if (pos.isOverlay) return "overlay";
    if (isModalLike(node, pos, ctxScope)) return "modal";
    if (ctxScope === "progress" && isBarFill(node)) return "indicator";
    if (ctxScope === "field" && isInputBox(node)) return "input";
    if (isButtonLike(node)) return isChipLike(node) ? "chip" : "button";
    if (isNavLike(node, pos.depth, ctxScope)) return "nav";
    if (isLogoLike(node, pos, ctxScope)) return "logo";
    if (isActionsLike(node, pos, ctxScope)) return "actions";
    if (isStatusDot(node, pos)) return "status";
    if (isThumbnail(node, pos, ctxScope)) return "thumbnail";
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
          if (hasColorFill(node)) return "swatch";
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
        return kids.length === 1 ? "wrapper" : "container";
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
  function dims(node) {
    if (!("width" in node) || !("height" in node)) return null;
    const w = node.width;
    const h = node.height;
    if (typeof w !== "number" || typeof h !== "number") return null;
    return { w, h };
  }
  function isThin(node) {
    const d = dims(node);
    if (!d) return false;
    const min = Math.min(d.w, d.h);
    const max = Math.max(d.w, d.h);
    if (min <= 0) return false;
    return min <= 2 || max / min >= 25;
  }
  function paints(node, field) {
    if (!(field in node)) return null;
    const p = node[field];
    return Array.isArray(p) ? p : null;
  }
  function hasVisibleFill(node) {
    const f = paints(node, "fills");
    return !!f && f.some((p) => p.visible !== false);
  }
  function hasImageFill(node) {
    const f = paints(node, "fills");
    return !!f && f.some((p) => p.visible !== false && p.type === "IMAGE");
  }
  function hasColorFill(node) {
    const f = paints(node, "fills");
    return !!f && f.some((p) => p.visible !== false && p.type !== "IMAGE");
  }
  function hasVisibleStroke(node) {
    const s = paints(node, "strokes");
    return !!s && s.some((p) => p.visible !== false);
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
    if (ctxScope && isKnownRole(ctxScope)) return false;
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
    const d = dims(node);
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
    const d = dims(node);
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
      const d = dims(k);
      return !!d && d.w >= 768 && d.h >= 400;
    });
  }
  function dimsSimilar(kids) {
    const ws = [];
    const hs = [];
    for (const k of kids) {
      const d = dims(k);
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
    const hasLabel = shown.some((k) => k.type === "TEXT");
    const hasInput = shown.some(isInputBox);
    return hasLabel && hasInput;
  }
  function isInputBox(node) {
    if (node.type !== "FRAME" && node.type !== "RECTANGLE") return false;
    if (hasImageFill(node)) return false;
    if (!hasVisibleStroke(node) && !hasColorFill(node)) return false;
    const d = dims(node);
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
    const d = dims(node);
    if (d && d.h > 80) return false;
    return kids.every((k) => k.type === "TEXT" || k.type === "FRAME" && hasDirectText(k));
  }
  function isLogoLike(node, pos, ctxScope) {
    if (ctxScope !== "header" || pos.ctxDepth > 1) return false;
    if (!isContainerType(node) || !("children" in node) || node.children.length === 0) return false;
    if (pos.index !== 0 || pos.parentLayout === "vertical") return false;
    const d = dims(node);
    if (!d || d.h > 80 || d.w > 320) return false;
    return true;
  }
  function isActionsLike(node, pos, ctxScope) {
    if (ctxScope !== "header" || pos.ctxDepth > 1) return false;
    if (node.type !== "FRAME" || layoutOf(node) !== "horizontal") return false;
    if (pos.total < 2 || pos.index !== pos.total - 1) return false;
    const kids = node.children;
    if (kids.length < 2 || kids.length > 3) return false;
    const d = dims(node);
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
    const d = dims(node);
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
    const d = dims(node);
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
      if ("children" in n && n.children.some((k) => isPanelLike(k, dims(n)))) return i;
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
    const d = dims(node);
    if (!d || d.h < 4 || d.h > 24) return false;
    if (d.w < d.h * 4) return false;
    if (cornerRadiusOf(node) * 2 < d.h) return false;
    if (!hasVisibleFill(node) && !hasVisibleStroke(node)) return false;
    return kids.some((k) => {
      const kd = dims(k);
      return !!kd && kd.w > 0 && kd.w < d.w && kd.h <= d.h + 1 && hasColorFill(k);
    });
  }
  function isBarFill(node) {
    if (node.type !== "RECTANGLE" && node.type !== "FRAME") return false;
    if ("children" in node && node.children.length > 0) return false;
    if (hasImageFill(node) || !hasColorFill(node)) return false;
    const d = dims(node);
    return !!d && d.h > 0 && d.h <= 24 && d.w >= d.h * 2;
  }
  var THUMB_CONTEXTS = /* @__PURE__ */ new Set(["card", "article", "item", "list", "figure"]);
  function isThumbnail(node, pos, ctxScope) {
    if (!ctxScope || !THUMB_CONTEXTS.has(ctxScope)) return false;
    if (node.type === "ELLIPSE") return false;
    if (!hasImageFill(node)) return false;
    const d = dims(node);
    if (!d) return false;
    if (Math.max(d.w, d.h) <= 96) return true;
    const p = pos.parentDims;
    return !!p && p.w > 0 && p.h > 0 && d.w * d.h / (p.w * p.h) <= 0.35;
  }
  function isStatusDot(node, pos) {
    if (!pos.hasAvatarSibling) return false;
    if (node.type !== "ELLIPSE" && node.type !== "RECTANGLE" && node.type !== "FRAME") return false;
    if (hasImageFill(node) || !hasColorFill(node)) return false;
    const d = dims(node);
    if (!d || d.w <= 0 || d.h <= 0) return false;
    if (Math.max(d.w, d.h) > 16) return false;
    return node.type === "ELLIPSE" || cornerRadiusOf(node) >= Math.min(d.w, d.h) / 2 - 1;
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
  function toCss(tokens, opts) {
    const lines = [":root {"];
    for (const t2 of tokens) {
      if (t2.aliasOf) {
        lines.push(`  ${cssVar(t2.name)}: var(${cssVar(t2.aliasOf)});`);
      } else {
        lines.push(`  ${cssVar(t2.name)}: ${cssLiteral(t2, opts)};`);
        if (t2.kind === "fontWeight" && splitWeightStyle(t2.value).italic) {
          lines.push(`  ${cssVar(t2.name)}-style: italic;`);
        }
      }
    }
    lines.push("}");
    return lines.join("\n");
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
  function exportTokens(tokens, opts, textStyles = []) {
    const list = dedupeByName(tokens);
    if (opts.format === "css") {
      const css = toCss(list, opts);
      if (!textStyles.length) return css;
      const body = css.slice(0, css.lastIndexOf("}"));
      return `${body}${textStylesToCss(textStyles, opts).join("\n")}
}`;
    }
    const root = JSON.parse(toW3C(list, opts));
    textStylesToW3C(textStyles, opts, root);
    return JSON.stringify(root, null, 2);
  }

  // src/lib/placement.ts
  var SIZING_KEYS = [
    "layoutAlign",
    "layoutGrow",
    "layoutSizingHorizontal",
    "layoutSizingVertical",
    "minWidth",
    "maxWidth",
    "minHeight",
    "maxHeight"
  ];
  function selfDeleting(parent) {
    return !!parent && (parent.type === "GROUP" || parent.type === "BOOLEAN_OPERATION");
  }
  function needsAnchor(parent) {
    return !!parent && parent.type === "GROUP";
  }
  function absOf(n) {
    const t2 = n.absoluteTransform;
    if (!t2 || !Array.isArray(t2) || !Array.isArray(t2[0]) || !Array.isArray(t2[1])) return null;
    const x = t2[0][2];
    const y = t2[1][2];
    return typeof x === "number" && typeof y === "number" ? { x, y } : null;
  }
  function isPlainTransform(n) {
    const t2 = n ? n.absoluteTransform : null;
    if (!t2 || !Array.isArray(t2)) return false;
    const eq = (a, b) => Math.abs(a - b) < 1e-6;
    return eq(t2[0][0], 1) && eq(t2[0][1], 0) && eq(t2[1][0], 0) && eq(t2[1][1], 1);
  }
  function sizingOf(n) {
    const out = {};
    const src = n;
    for (const k of SIZING_KEYS) {
      try {
        if (!(k in src)) continue;
        const v = src[k];
        if (v !== void 0) out[k] = v;
      } catch (e) {
      }
    }
    return out;
  }
  function applySizing(node, s) {
    const dst = node;
    const src = s;
    for (const k of SIZING_KEYS) {
      if (!(k in src)) continue;
      const v = src[k];
      try {
        if (!(k in dst) || dst[k] === v) continue;
        dst[k] = v;
      } catch (e) {
      }
    }
  }
  function captureOrigin(n, opts = {}) {
    var _a, _b;
    const p = n.parent;
    const parent = p && "children" in p ? p : null;
    const index = parent ? parent.children.indexOf(n) : -1;
    const autolayout = !!parent && "layoutMode" in parent && parent.layoutMode !== "NONE";
    const absolute = "layoutPositioning" in n && n.layoutPositioning === "ABSOLUTE";
    const constraints = "constraints" in n ? (_a = n.constraints) != null ? _a : null : null;
    const o = {
      name: n.name,
      parent,
      index,
      x: n.x,
      y: n.y,
      autolayout,
      absolute,
      constraints,
      sizing: sizingOf(n),
      abs: absOf(n),
      anchor: null
    };
    if (((_b = opts.anchor) != null ? _b : true) && parent && index >= 0 && needsAnchor(parent)) {
      let a = null;
      try {
        a = figma.createRectangle();
        a.name = "__dsl_anchor";
        try {
          a.resize(Math.max(0.01, n.width), Math.max(0.01, n.height));
        } catch (e) {
        }
        a.x = n.x;
        a.y = n.y;
        a.fills = [];
        a.strokes = [];
        parent.insertChild(index, a);
        o.anchor = a;
      } catch (e) {
        if (a) {
          try {
            if (!a.removed) a.remove();
          } catch (e2) {
          }
        }
      }
    }
    return o;
  }
  function releaseOrigin(o) {
    const a = o.anchor;
    o.anchor = null;
    if (!a) return;
    try {
      if (!a.removed) a.remove();
    } catch (e) {
    }
  }
  function tryPlace(node, o) {
    try {
      const parent = o.parent;
      if (!parent || parent.removed) throw new Error("parent gone");
      const kids = parent.children;
      const at = o.anchor && !o.anchor.removed ? kids.indexOf(o.anchor) : -1;
      const idx = at >= 0 ? at : Math.min(Math.max(0, o.index), kids.length);
      parent.insertChild(idx, node);
      if (node.parent !== parent) throw new Error("not inserted");
      if (o.autolayout && o.absolute && "layoutPositioning" in node) {
        try {
          node.layoutPositioning = "ABSOLUTE";
        } catch (e) {
        }
      }
      applySizing(node, o.sizing);
      if (!o.autolayout || o.absolute) {
        node.x = o.x;
        node.y = o.y;
        if (o.constraints && "constraints" in node) {
          try {
            node.constraints = o.constraints;
          } catch (e) {
          }
        }
        const now = absOf(node);
        if (o.abs && now && selfDeleting(parent) && isPlainTransform(parent)) {
          const dx = o.abs.x - now.x;
          const dy = o.abs.y - now.y;
          if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
            node.x += dx;
            node.y += dy;
          }
        }
      }
      return true;
    } catch (e) {
      try {
        node.remove();
      } catch (e2) {
      }
      return false;
    }
  }
  function placeAtOrigin(inst, o) {
    const ok = tryPlace(inst, o);
    releaseOrigin(o);
    return ok;
  }
  function fillOrigin(make, o, onError) {
    const errText2 = (e) => e instanceof Error ? e.message : String(e);
    try {
      let inst = null;
      try {
        inst = make();
      } catch (e) {
        onError == null ? void 0 : onError(t("component.fail.instanceMake", { error: errText2(e) }));
      }
      if (inst) {
        if (tryPlace(inst, o)) return "instance";
        onError == null ? void 0 : onError(t("component.fail.instancePlace"));
      }
      const detached = () => {
        let i = null;
        try {
          i = make();
          const f = i.detachInstance();
          try {
            f.name = o.name;
          } catch (e) {
          }
          return f;
        } catch (e) {
          if (i) {
            try {
              if (!i.removed) i.remove();
            } catch (e2) {
            }
          }
          return null;
        }
      };
      const frame = detached();
      if (!frame) return "failed";
      if (tryPlace(frame, o)) return "copy";
      const again = detached();
      if (!again) return "failed";
      const kids = "children" in again ? again.children : [];
      if (kids.length !== 1) {
        try {
          again.remove();
        } catch (e) {
        }
        return "failed";
      }
      const only = kids[0];
      try {
        const holder = again.parent;
        if (holder && "appendChild" in holder) holder.appendChild(only);
        try {
          only.name = o.name;
        } catch (e) {
        }
      } catch (e) {
      }
      try {
        if (!again.removed) again.remove();
      } catch (e) {
      }
      if (only.removed) return "failed";
      return tryPlace(only, o) ? "copy" : "failed";
    } finally {
      releaseOrigin(o);
    }
  }
  function tallyFill(t2, r, name, propStart) {
    if (r === "copy") t2.placeCloned.push(name);
    if (r !== "failed") return;
    t2.placeFailed.push(name);
    if (t2.propFailed.length > propStart) t2.propFailed.splice(propStart);
  }

  // src/lib/artwork.ts
  function nodeAtPath(root, path) {
    let cur = root;
    for (const seg of path.split("/").filter(Boolean)) {
      if (!("children" in cur)) return null;
      const i = Number(seg);
      if (!Number.isFinite(i)) return null;
      const kids = cur.children;
      if (!kids[i]) return null;
      cur = kids[i];
    }
    return cur;
  }
  function createIconRegistry(opts) {
    const byKey = /* @__PURE__ */ new Map();
    let made = 0;
    return {
      get: (vectorKey) => {
        var _a;
        return (_a = byKey.get(vectorKey)) != null ? _a : null;
      },
      created: () => made,
      ensure(vectorKey, node, baseName) {
        const hit = byKey.get(vectorKey);
        if (hit) return hit;
        try {
          const clone = node.clone();
          opts.page.appendChild(clone);
          const comp = figma.createComponentFromNode(clone);
          comp.name = opts.uniqueName(baseName);
          opts.place(comp);
          byKey.set(vectorKey, comp);
          made++;
          return comp;
        } catch (e) {
          opts.onFailure(t("component.fail.iconComponent", { name: baseName, error: e instanceof Error ? e.message : String(e) }));
          return null;
        }
      }
    };
  }
  function swapVectorSlots(master, slots) {
    const failures = [];
    for (const s of slots) {
      const target = nodeAtPath(master, s.layerPath);
      const parent = target == null ? void 0 : target.parent;
      if (!target || !s.icon || !parent || !("children" in parent)) {
        failures.push(t("component.fail.iconSwap", { layer: s.layerName }));
        continue;
      }
      let inst = null;
      try {
        const o = captureOrigin(target, { anchor: false });
        inst = s.icon.createInstance();
        inst.name = target.name;
        try {
          inst.resize(target.width, target.height);
        } catch (e) {
        }
        const placed = inst;
        inst = null;
        if (!placeAtOrigin(placed, o)) {
          failures.push(t("component.fail.iconSwapPlace", { layer: s.layerName }));
          continue;
        }
        target.remove();
      } catch (e) {
        if (inst) {
          try {
            if (!inst.removed) inst.remove();
          } catch (e2) {
          }
        }
        failures.push(t("component.fail.iconSwapErr", { layer: s.layerName, error: e instanceof Error ? e.message : String(e) }));
      }
    }
    return failures;
  }
  function joinPath(prefix, path) {
    if (!prefix) return path;
    return path ? `${prefix}/${path}` : prefix;
  }
  var FRAME_LIKE = /* @__PURE__ */ new Set(["FRAME", "COMPONENT", "COMPONENT_SET", "INSTANCE", "SECTION"]);
  function shapePrefix(master, rootType) {
    if (FRAME_LIKE.has(rootType)) return "";
    const kids = "children" in master ? master.children : [];
    return kids.length === 1 && kids[0].type === rootType ? "0" : "";
  }
  function imageHashOf(n) {
    var _a;
    const f = "fills" in n ? n.fills : null;
    if (!Array.isArray(f)) return void 0;
    const img = f.find((p) => p.type === "IMAGE" && p.visible !== false);
    return img ? (_a = img.imageHash) != null ? _a : "" : void 0;
  }
  var sameSize = (a, b) => Math.abs(Math.round(a * 100) - Math.round(b * 100)) < 1;
  function memberFitIssue(inst, member, prefix) {
    if (!sameSize(inst.width, member.width) || !sameSize(inst.height, member.height)) {
      return t("component.fit.size", { w: inst.width, h: inst.height, mw: member.width, mh: member.height });
    }
    let issue = null;
    const visit = (n, path) => {
      if (issue) return;
      const h = imageHashOf(n);
      if (h !== void 0) {
        const at = joinPath(prefix, path);
        const hit = nodeAtPath(inst, at);
        if (!hit) {
          issue = t("component.fit.noPhoto", { path: at || t("component.fit.self") });
          return;
        }
        if (imageHashOf(hit) !== h) {
          issue = t("component.fit.photoDiff", { name: n.name });
          return;
        }
        if (!sameSize(hit.width, n.width) || !sameSize(hit.height, n.height)) {
          issue = t("component.fit.photoSize", { w: hit.width, h: hit.height, mw: n.width, mh: n.height, name: n.name });
          return;
        }
      }
      if (n.type === "INSTANCE" || !("children" in n)) return;
      n.children.forEach((c, i) => visit(c, path ? `${path}/${i}` : String(i)));
    };
    visit(member, "");
    return issue;
  }
  function replaceMember(member, make, prefix) {
    let inst = null;
    try {
      inst = make();
    } catch (e) {
      return { result: "placeFailed", why: t("component.fail.instanceMake", { error: e instanceof Error ? e.message : String(e) }) };
    }
    try {
      if (!sameSize(inst.width, member.width) || !sameSize(inst.height, member.height)) {
        try {
          inst.resize(member.width, member.height);
        } catch (e) {
        }
      }
      const why = memberFitIssue(inst, member, prefix);
      if (why) {
        try {
          inst.remove();
        } catch (e) {
        }
        return { result: "mismatch", why };
      }
    } catch (e) {
      try {
        inst.remove();
      } catch (e2) {
      }
      return { result: "mismatch", why: e instanceof Error ? e.message : String(e) };
    }
    const o = captureOrigin(member, { anchor: false });
    if (!placeAtOrigin(inst, o)) {
      releaseOrigin(o);
      return { result: "placeFailed", why: t("component.fail.instancePlace") };
    }
    try {
      member.remove();
    } catch (e) {
    }
    return { result: "replaced" };
  }
  function propIdsByName(container) {
    const map = /* @__PURE__ */ new Map();
    let defs;
    try {
      defs = container.componentPropertyDefinitions;
    } catch (e) {
      return map;
    }
    if (!defs) return map;
    for (const key of Object.keys(defs)) {
      const name = key.replace(/#[^#]*$/, "");
      if (name && !map.has(name)) map.set(name, key);
    }
    return map;
  }
  function applyInstancePropValues(inst, ids, values) {
    var _a;
    const failed = [];
    const payload = {};
    const nameOf = /* @__PURE__ */ new Map();
    for (const [name, val] of Object.entries(values)) {
      const id = ids.get(name);
      if (id == null) {
        failed.push(name);
        continue;
      }
      payload[id] = val;
      nameOf.set(id, name);
    }
    if (!Object.keys(payload).length) return failed;
    try {
      inst.setProperties(payload);
      return failed;
    } catch (e) {
    }
    for (const [id, val] of Object.entries(payload)) {
      try {
        inst.setProperties({ [id]: val });
      } catch (e) {
        failed.push((_a = nameOf.get(id)) != null ? _a : id);
      }
    }
    return failed;
  }
  function transplantImageFills(inst, images) {
    let applied = 0;
    const failures = [];
    for (const [path, paints3] of Object.entries(images)) {
      const dst = nodeAtPath(inst, path);
      if (!dst || !("fills" in dst)) {
        failures.push(t("component.fail.photoNoSlot", { path }));
        continue;
      }
      try {
        dst.fills = paints3;
        applied++;
      } catch (e) {
        failures.push(t("component.fail.photo", { path, error: e instanceof Error ? e.message : String(e) }));
      }
    }
    return { applied, failures };
  }
  function ownLayers(root) {
    const out = [];
    const walk3 = (n) => {
      if (!("children" in n)) return;
      for (const c of n.children) {
        out.push(c);
        if (c.type !== "INSTANCE") walk3(c);
      }
    };
    walk3(root);
    return out;
  }
  async function snapshotOverrides(root, place, mainOf) {
    const out = [];
    const visit = async (n, depth) => {
      var _a;
      if (n.removed) return;
      if (n.type === "INSTANCE") {
        const items = [];
        for (const l of ownLayers(n)) {
          try {
            const item = { id: l.id, name: l.name, visible: l.visible };
            if (l.type === "TEXT") item.text = l.characters;
            if (l.type === "INSTANCE") item.swap = (_a = await mainOf(l)) == null ? void 0 : _a.id;
            items.push(item);
          } catch (e) {
          }
        }
        out.push({ instId: n.id, depth, place, items });
        depth++;
      }
      if ("children" in n) for (const c of n.children) await visit(c, depth);
    };
    await visit(root, 0);
    return out;
  }
  var propNameOf = (key) => key.replace(/#[^#]*$/, "") || key;
  async function restoreOverrides(snaps, getNode, mainOf, loadFont) {
    var _a, _b;
    const failedBy = /* @__PURE__ */ new Map();
    const fail = (place, what) => {
      var _a2;
      const list = (_a2 = failedBy.get(place)) != null ? _a2 : [];
      if (!list.includes(what)) list.push(what);
      failedBy.set(place, list);
    };
    const loadAll = async (node) => {
      const len = node.characters.length;
      const fonts = len ? node.getRangeAllFontNames(0, len) : typeof node.fontName === "symbol" ? [] : [node.fontName];
      for (const f of fonts) await loadFont(f);
    };
    const ordered = [...snaps].sort((a, b) => a.depth - b.depth);
    for (const snap of ordered) {
      const inst = await getNode(snap.instId);
      if (!inst || inst.removed || inst.type !== "INSTANCE") continue;
      const payload = {};
      const direct = [];
      for (const it of snap.items) {
        const node = await getNode(it.id);
        if (!node || node.removed) continue;
        const refs = (_a = node.componentPropertyReferences) != null ? _a : {};
        try {
          if (refs.visible && node.visible !== it.visible) payload[refs.visible] = it.visible;
          if (node.type === "INSTANCE" && it.swap && refs.mainComponent) {
            const cur = (_b = await mainOf(node)) == null ? void 0 : _b.id;
            if (cur !== it.swap) payload[refs.mainComponent] = it.swap;
          }
          if (node.type === "TEXT" && it.text !== void 0 && node.characters !== it.text) {
            try {
              await loadAll(node);
            } catch (e) {
              fail(snap.place, refs.characters ? propNameOf(refs.characters) : node.name);
              continue;
            }
            if (refs.characters) payload[refs.characters] = it.text;
            else direct.push({ node, text: it.text });
          }
        } catch (e) {
          fail(snap.place, it.name);
        }
      }
      const keys = Object.keys(payload);
      if (keys.length) {
        let ok = false;
        try {
          inst.setProperties(payload);
          ok = true;
        } catch (e) {
        }
        if (!ok) {
          for (const k of keys) {
            try {
              inst.setProperties({ [k]: payload[k] });
            } catch (e) {
              fail(snap.place, propNameOf(k));
            }
          }
        }
      }
      for (const d of direct) {
        try {
          d.node.characters = d.text;
        } catch (e) {
          fail(snap.place, d.node.name);
        }
      }
    }
    return failedBy;
  }

  // src/lib/roles.ts
  var TSHIRT = ["3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"];
  var TSHIRT_MID = TSHIRT.indexOf("md");
  function tshirtRoles(values) {
    const n = values.length;
    if (!n) return [];
    let start = TSHIRT_MID - Math.floor((n - 1) / 2);
    start = Math.max(0, Math.min(start, Math.max(0, TSHIRT.length - n)));
    return values.map((_, i) => {
      const idx = start + i;
      return idx < TSHIRT.length ? TSHIRT[idx] : `${TSHIRT[TSHIRT.length - 1]}-${idx - TSHIRT.length + 2}`;
    });
  }

  // src/lib/componentLike.ts
  function highConfidenceComponentRole(node) {
    var _a;
    if (isButtonLike2(node)) return isChipLike2(node) ? "chip" : "button";
    if (isNavLike2(node, 0)) return "nav";
    if (isContainerType2(node)) {
      const kids = (_a = node.children) != null ? _a : [];
      if (kids.length) {
        if (isProgressLike2(node, kids)) return "progress";
        if (isTableLike(node, kids)) return "table";
        if (isCardLike2(node, kids)) return "card";
        if (isFigureLike2(node, kids)) return "figure";
        if (isFieldLike2(node, kids)) return "field";
        if (isListLike2(node, kids)) return "list";
      }
    }
    if (isHeadingLike(node)) return "heading";
    return null;
  }
  function isHighConfidenceComponent(node) {
    return highConfidenceComponentRole(node) != null;
  }
  function dims2(node) {
    const w = node.width;
    const h = node.height;
    if (typeof w !== "number" || typeof h !== "number") return null;
    return { w, h };
  }
  function paints2(node, field) {
    const p = node[field];
    return Array.isArray(p) ? p : null;
  }
  function hasVisibleFill2(node) {
    const f = paints2(node, "fills");
    return !!f && f.some((p) => p.visible !== false);
  }
  function hasImageFill2(node) {
    const f = paints2(node, "fills");
    return !!f && f.some((p) => p.visible !== false && p.type === "IMAGE");
  }
  function hasColorFill2(node) {
    const f = paints2(node, "fills");
    return !!f && f.some((p) => p.visible !== false && p.type !== "IMAGE");
  }
  function hasVisibleStroke2(node) {
    const s = paints2(node, "strokes");
    return !!s && s.some((p) => p.visible !== false);
  }
  function layoutOf2(node) {
    const m = node.layoutMode;
    return m === "VERTICAL" ? "vertical" : m === "HORIZONTAL" ? "horizontal" : null;
  }
  function isContainerType2(node) {
    return node.type === "FRAME" || node.type === "GROUP" || node.type === "SECTION";
  }
  function cornerRadiusOf2(node) {
    const r = node.cornerRadius;
    if (typeof r === "number") return r;
    const tl = node.topLeftRadius;
    return typeof tl === "number" ? tl : 0;
  }
  function hasDirectText2(node) {
    var _a;
    return !!((_a = node.children) == null ? void 0 : _a.some((c) => c.type === "TEXT"));
  }
  function isVisible2(node) {
    return node.visible !== false;
  }
  function isButtonLike2(node) {
    if (node.type !== "FRAME") return false;
    if (layoutOf2(node) === null) return false;
    if (!(cornerRadiusOf2(node) > 0)) return false;
    if (!hasVisibleFill2(node) && !hasVisibleStroke2(node)) return false;
    if (!hasDirectText2(node)) return false;
    const d = dims2(node);
    if (d && d.h > 80) return false;
    return true;
  }
  function isChipLike2(node) {
    const d = dims2(node);
    if (!d || d.h > 28) return false;
    return cornerRadiusOf2(node) >= d.h / 2 - 1;
  }
  function hasDropShadow2(node) {
    const eff = node.effects;
    return Array.isArray(eff) && eff.some((e) => e.visible !== false && e.type === "DROP_SHADOW");
  }
  function isCardLike2(node, kids) {
    if (node.type !== "FRAME") return false;
    if (kids.length < 2) return false;
    if (!hasVisibleFill2(node) && !hasVisibleStroke2(node)) return false;
    return cornerRadiusOf2(node) > 0 || hasDropShadow2(node);
  }
  function rowCells(node) {
    var _a;
    if (node.type !== "FRAME" && node.type !== "COMPONENT" && node.type !== "INSTANCE") return null;
    if (layoutOf2(node) !== "horizontal") return null;
    const cells = ((_a = node.children) != null ? _a : []).filter(isVisible2);
    return cells.length >= 2 ? cells : null;
  }
  function hasTextWithin(node, depth = 2) {
    var _a;
    if (node.type === "TEXT") return true;
    if (depth <= 0) return false;
    return !!((_a = node.children) == null ? void 0 : _a.some((c) => hasTextWithin(c, depth - 1)));
  }
  function isTableLike(node, kids) {
    var _a, _b;
    if (node.type !== "FRAME") return false;
    const visible = kids.filter(isVisible2);
    if (node.layoutMode === "GRID") {
      const cols2 = (_a = node.gridColumnCount) != null ? _a : 0;
      const rows2 = (_b = node.gridRowCount) != null ? _b : 0;
      if (cols2 < 2 || rows2 < 2) return false;
      if (visible.length < cols2 * 2) return false;
      if (!visible.some((c) => hasTextWithin(c))) return false;
      const firstRow = visible.slice(0, cols2).map((c) => c.width);
      if (firstRow.every((w) => typeof w === "number") && ratioWithin2(firstRow, 1.05)) return false;
      return true;
    }
    if (layoutOf2(node) !== "vertical") return false;
    if (visible.length < 3) return false;
    const rows = visible.map(rowCells);
    if (rows.some((r) => r === null)) return false;
    const cellRows = rows.filter((r) => r !== null);
    const cols = cellRows[0].length;
    if (cols < 2) return false;
    if (!cellRows.every((r) => r.length === cols)) return false;
    if (!cellRows.some((r) => r.some((c) => hasTextWithin(c)))) return false;
    for (let i = 0; i < cols; i++) {
      const widths = cellRows.map((r) => r[i].width);
      if (!widths.every((w) => typeof w === "number")) return false;
      if (!ratioWithin2(widths, 1.1)) return false;
    }
    return true;
  }
  var LIST_ITEM_TYPES2 = /* @__PURE__ */ new Set(["FRAME", "GROUP", "INSTANCE", "COMPONENT", "RECTANGLE", "ELLIPSE"]);
  function isListLike2(node, kids) {
    var _a;
    if (node.type !== "FRAME") return false;
    if (layoutOf2(node) === null) return false;
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
    if (!LIST_ITEM_TYPES2.has(domType)) return false;
    if (isSectionStack2(kids)) return false;
    return dimsSimilar2(kids);
  }
  function isSectionStack2(kids) {
    return kids.every((k) => {
      const d = dims2(k);
      return !!d && d.w >= 768 && d.h >= 400;
    });
  }
  function dimsSimilar2(kids) {
    const ws = [];
    const hs = [];
    for (const k of kids) {
      const d = dims2(k);
      if (!d) return false;
      ws.push(d.w);
      hs.push(d.h);
    }
    return ratioWithin2(ws, 1.5) && ratioWithin2(hs, 1.25);
  }
  function ratioWithin2(xs, max) {
    const mn = Math.min(...xs);
    const mx = Math.max(...xs);
    if (mn <= 0) return false;
    return mx / mn <= max;
  }
  function isInputBox2(node) {
    if (node.type !== "FRAME" && node.type !== "RECTANGLE") return false;
    if (hasImageFill2(node)) return false;
    if (!hasVisibleStroke2(node) && !hasColorFill2(node)) return false;
    const d = dims2(node);
    if (!d || d.h <= 0 || d.h > 72) return false;
    return d.w >= d.h * 2;
  }
  function isFieldLike2(node, kids) {
    if (node.type !== "FRAME") return false;
    if (layoutOf2(node) !== "vertical") return false;
    const shown = kids.filter(isVisible2);
    if (shown.length < 2 || shown.length > 4) return false;
    const hasLabel = shown.some((k) => k.type === "TEXT");
    const hasInput = shown.some(isInputBox2);
    return hasLabel && hasInput;
  }
  function isNavLike2(node, depth) {
    var _a;
    if (node.type !== "FRAME") return false;
    if (layoutOf2(node) !== "horizontal") return false;
    if (depth > 1) return false;
    if (cornerRadiusOf2(node) > 0 && (hasVisibleFill2(node) || hasVisibleStroke2(node))) return false;
    const kids = (_a = node.children) != null ? _a : [];
    if (kids.length < 3) return false;
    const d = dims2(node);
    if (d && d.h > 80) return false;
    return kids.every((k) => k.type === "TEXT" || k.type === "FRAME" && hasDirectText2(k));
  }
  function isFigureLike2(node, kids) {
    if (node.type !== "FRAME") return false;
    if (kids.length < 2 || kids.length > 3) return false;
    const hasImg = kids.some((k) => hasImageFill2(k));
    const hasCaption = kids.some((k) => k.type === "TEXT");
    return hasImg && hasCaption;
  }
  function isProgressLike2(node, kids) {
    if (node.type !== "FRAME") return false;
    if (kids.length < 1 || kids.length > 2) return false;
    if (kids.some((k) => k.type === "TEXT")) return false;
    const d = dims2(node);
    if (!d || d.h < 4 || d.h > 24) return false;
    if (d.w < d.h * 4) return false;
    if (cornerRadiusOf2(node) * 2 < d.h) return false;
    if (!hasVisibleFill2(node) && !hasVisibleStroke2(node)) return false;
    return kids.some((k) => {
      const kd = dims2(k);
      return !!kd && kd.w > 0 && kd.w < d.w && kd.h <= d.h + 1 && hasColorFill2(k);
    });
  }
  function parseHeadingSlots(node) {
    var _a;
    if (node.type !== "FRAME") return null;
    if (layoutOf2(node) !== "horizontal") return null;
    const d = dims2(node);
    if (d && d.h > 96) return null;
    if (hasVisibleFill2(node) && cornerRadiusOf2(node) > 0) return null;
    if (hasVisibleFill2(node) && hasDropShadow2(node)) return null;
    const allKids = (_a = node.children) != null ? _a : [];
    const visible = allKids.map((k, childIndex) => ({ k, childIndex })).filter(({ k }) => isVisible2(k));
    if (visible.length < 1 || visible.length > 5) return null;
    if (visible.some(({ k }) => {
      const kd = dims2(k);
      return !!kd && kd.w >= 768 && kd.h >= 400;
    })) return null;
    const slots = [];
    let titles = 0;
    let actions = 0;
    let metas = 0;
    for (const { k, childIndex } of visible) {
      if (k.type === "INSTANCE" || k.type === "COMPONENT") {
        actions++;
        if (actions > 2) return null;
        slots.push({ kind: "action", node: k, childIndex });
        continue;
      }
      if (k.type === "TEXT" || isHeadingTitleWrapper(k)) {
        titles++;
        slots.push({ kind: "title", node: k, childIndex });
        continue;
      }
      if (isHeadingMetaSlot(k)) {
        metas++;
        if (metas > 1) return null;
        slots.push({ kind: "meta", node: k, childIndex });
        continue;
      }
      return null;
    }
    if (titles < 1) return null;
    return slots;
  }
  function isHeadingLike(node) {
    return parseHeadingSlots(node) != null;
  }
  function isHeadingTitleWrapper(node) {
    var _a;
    if (node.type !== "FRAME" && node.type !== "GROUP") return false;
    const kd = dims2(node);
    if (kd && kd.h > 64) return false;
    const kids = ((_a = node.children) != null ? _a : []).filter(isVisible2);
    return kids.length === 1 && kids[0].type === "TEXT";
  }
  function isHeadingMetaSlot(node) {
    var _a;
    if (node.type !== "FRAME" && node.type !== "GROUP") return false;
    if (layoutOf2(node) === "vertical") return false;
    const kd = dims2(node);
    if (kd && kd.h > 48) return false;
    const kids = ((_a = node.children) != null ? _a : []).filter(isVisible2);
    if (kids.length < 1 || kids.length > 4) return false;
    return kids.every(
      (k) => k.type === "TEXT" || isHeadingTitleWrapper(k)
    );
  }

  // src/lib/components.ts
  var STATES = /* @__PURE__ */ new Set(["default", "hover", "pressed", "focus", "active", "disabled", "loading"]);
  var SIZES = /* @__PURE__ */ new Set(["xs", "sm", "md", "lg", "xl", "xxl", "tiny", "small", "medium", "large", "huge"]);
  var TYPES = /* @__PURE__ */ new Set([
    "primary",
    "secondary",
    "tertiary",
    "ghost",
    "outline",
    "outlined",
    "filled",
    "text",
    "link",
    "danger",
    "warning",
    "success",
    "info",
    "accent",
    "brand",
    "neutral"
  ]);
  var BOOLEANS = /* @__PURE__ */ new Set(["selected"]);
  function inferProp(value) {
    const v = value.toLowerCase();
    if (STATES.has(v)) return "State";
    if (SIZES.has(v)) return "Size";
    if (TYPES.has(v)) return "Type";
    return null;
  }
  var COMPONENT_NOUNS = /* @__PURE__ */ new Set([
    "button",
    "link",
    "toggle",
    "switch",
    "checkbox",
    "radio",
    "slider",
    "input",
    "textfield",
    "field",
    "textarea",
    "select",
    "dropdown",
    "combobox",
    "search",
    "card",
    "panel",
    "modal",
    "dialog",
    "drawer",
    "sheet",
    "popover",
    "tooltip",
    "accordion",
    "tab",
    "tabs",
    "breadcrumb",
    "pagination",
    "navbar",
    "nav",
    "sidebar",
    "menu",
    "stepper",
    "avatar",
    "badge",
    "chip",
    "tag",
    "toast",
    "snackbar",
    "alert",
    "banner",
    "progress",
    "spinner",
    "skeleton",
    "table",
    "list",
    "item",
    "divider",
    "label",
    "tooltip",
    "header",
    "footer",
    // naming.ts EMITTED_ROLES 정합 — 리네임이 출력하는 요소 역할도 컴포넌트가 된다.
    // 없으면 `header-icon`의 머리명사가 `header`로 잡혀 역할이 사라지고 맥락이 이름이 된다.
    "icon",
    "image",
    "thumbnail",
    "status",
    "indicator",
    "overlay"
  ]);
  var NOUN_ABBR = { btn: "button", img: "image" };
  function nounWord(token) {
    var _a;
    return (_a = NOUN_ABBR[token]) != null ? _a : token;
  }
  function recognizeComponentName(name) {
    let found = null;
    for (const t2 of kebab(name).split("-").filter(Boolean)) {
      const w = nounWord(t2);
      if (COMPONENT_NOUNS.has(w)) found = pascalCase(w);
    }
    return found;
  }
  function extractNameProps(name) {
    const props = {};
    for (const t2 of kebab(name).split("-").filter(Boolean)) {
      if (COMPONENT_NOUNS.has(nounWord(t2))) continue;
      if (BOOLEANS.has(t2)) {
        const bk = capitalize(t2);
        if (!(bk in props)) props[bk] = "true";
        continue;
      }
      const p = inferProp(t2);
      if (p && !(p in props)) props[p] = t2;
    }
    return props;
  }
  function distinguishingTokens(name) {
    return kebab(name).split("-").filter(Boolean).filter((t2) => {
      if (COMPONENT_NOUNS.has(nounWord(t2))) return false;
      if (BOOLEANS.has(t2)) return false;
      if (inferProp(t2)) return false;
      return true;
    }).join("-");
  }
  function parseVariantName(name) {
    var _a;
    const trimmed = name.trim();
    const props = {};
    if (trimmed.includes("=")) {
      let base2 = "";
      for (const part of trimmed.split(",")) {
        const seg = part.trim();
        if (!seg) continue;
        const eq = seg.indexOf("=");
        if (eq >= 0) {
          const k = kebab(seg.slice(0, eq));
          const val = kebab(seg.slice(eq + 1));
          if (k && val) props[k] = val;
        } else if (!base2) {
          base2 = kebab(seg);
        }
      }
      return { base: base2, props };
    }
    const segs = trimmed.split("/").map((s) => kebab(s)).filter(Boolean);
    const base = (_a = segs[0]) != null ? _a : "";
    let unknown = 0;
    for (const seg of segs.slice(1)) {
      if (BOOLEANS.has(seg)) {
        const bk = capitalize(seg);
        if (!(bk in props)) {
          props[bk] = "true";
          continue;
        }
      }
      const prop = inferProp(seg);
      if (prop && !(prop in props)) props[prop] = seg;
      else {
        const key = unknown === 0 ? "Variant" : `Variant-${unknown + 1}`;
        props[key] = seg;
        unknown++;
      }
    }
    return { base, props };
  }
  function formatVariant(props) {
    return Object.keys(props).sort().map((k) => `${k}=${props[k]}`).join(", ");
  }
  function cartesian(props) {
    const keys = Object.keys(props).sort();
    let combos = [{}];
    for (const k of keys) {
      const next = [];
      for (const c of combos) for (const v of props[k]) next.push(__spreadProps(__spreadValues({}, c), { [k]: v }));
      combos = next;
    }
    return combos;
  }
  function inferComponentProperties(layers) {
    const out = [];
    const taken = /* @__PURE__ */ new Set();
    const seenTextContent = /* @__PURE__ */ new Set();
    const uniq = (base) => {
      let n = base || "Prop";
      let i = 2;
      while (taken.has(n)) n = `${base || "Prop"}-${i++}`;
      taken.add(n);
      return n;
    };
    for (const l of layers) {
      if (l.name.trim().endsWith("?")) {
        out.push({
          propName: uniq(pascalCase(l.name.replace(/\?+$/, "")) || "Show"),
          type: "BOOLEAN",
          layerName: l.name,
          layerPath: l.path,
          field: "visible"
        });
      } else if (l.type === "TEXT") {
        if (l.characters !== void 0) {
          const contentKey = `${l.name}\0${l.characters}`;
          if (seenTextContent.has(contentKey)) continue;
          seenTextContent.add(contentKey);
        }
        out.push({
          propName: uniq(pascalCase(l.name) || "Text"),
          type: "TEXT",
          layerName: l.name,
          layerPath: l.path,
          field: "characters"
        });
      } else if (l.type === "INSTANCE") {
        out.push({
          propName: uniq(pascalCase(l.name) || "Swap"),
          type: "INSTANCE_SWAP",
          layerName: l.name,
          layerPath: l.path,
          field: "mainComponent"
        });
      }
    }
    return out;
  }
  function textPropBaseName(node) {
    var _a;
    const n = node.name.trim();
    const c = (_a = node.characters) != null ? _a : "";
    if (!n || n === c || /^text(\s+\d+)?$/i.test(n)) return "Text";
    return pascalCase(n) || "Text";
  }
  function inferVaryingComponentProperties(members) {
    if (members.length < 2) return [];
    if (members.every((m) => highConfidenceComponentRole(m) === "heading")) {
      return inferVaryingHeadingProperties(members);
    }
    const out = [];
    const taken = /* @__PURE__ */ new Set();
    const uniq = (base) => {
      let n = base || "Prop";
      let i = 2;
      while (taken.has(n)) n = `${base || "Prop"}-${i++}`;
      taken.add(n);
      return n;
    };
    const visit = (nodes, path) => {
      var _a;
      const rep = nodes[0];
      if (!rep) return;
      if (path !== "") {
        if (rep.name.trim().endsWith("?")) {
          const vals = nodes.map((n2) => n2.visible !== false);
          if (new Set(vals).size > 1) {
            out.push({
              propName: uniq(pascalCase(rep.name.replace(/\?+$/, "")) || "Show"),
              type: "BOOLEAN",
              layerName: rep.name,
              layerPath: path,
              field: "visible"
            });
          }
        } else if (rep.type === "TEXT") {
          const vals = nodes.map((n2) => {
            var _a2;
            return (_a2 = n2.characters) != null ? _a2 : "";
          });
          if (new Set(vals).size > 1) {
            out.push({
              propName: uniq(textPropBaseName(rep)),
              type: "TEXT",
              layerName: rep.name,
              layerPath: path,
              field: "characters"
            });
          }
        } else if (rep.type === "INSTANCE") {
          const vals = nodes.map((n2) => {
            var _a2;
            return (_a2 = n2.mainComponentKey) != null ? _a2 : "";
          });
          if (new Set(vals).size > 1) {
            out.push({
              propName: uniq(pascalCase(rep.name) || "Swap"),
              type: "INSTANCE_SWAP",
              layerName: rep.name,
              layerPath: path,
              field: "mainComponent"
            });
          }
        } else if (VECTOR_TYPES.has(rep.type)) {
          const vals = nodes.map((n2) => {
            var _a2;
            return (_a2 = n2.vectorKey) != null ? _a2 : n2.name;
          });
          if (new Set(vals).size > 1) {
            out.push({
              propName: uniq(pascalCase(rep.name) || "Icon"),
              type: "INSTANCE_SWAP",
              layerName: rep.name,
              layerPath: path,
              field: "mainComponent",
              fromVector: true
            });
          }
        }
      }
      if (rep.type === "INSTANCE" || rep.type === "TEXT") return;
      const lens = nodes.map((n2) => {
        var _a2;
        return ((_a2 = n2.children) != null ? _a2 : []).length;
      });
      if (new Set(lens).size !== 1) return;
      const n = (_a = lens[0]) != null ? _a : 0;
      for (let i = 0; i < n; i++) {
        const kids = nodes.map((m) => {
          var _a2;
          return ((_a2 = m.children) != null ? _a2 : [])[i];
        }).filter((c) => !!c);
        if (kids.length !== nodes.length) return;
        visit(kids, path === "" ? String(i) : `${path}/${i}`);
      }
    };
    visit(members, "");
    return out;
  }
  function pickCollapseMasterIndex(members) {
    var _a, _b, _c, _d;
    if (members.length === 0) return 0;
    let best = 0;
    let bestActions = headingActionCount(members[0]);
    let bestKids = (_b = (_a = members[0].children) == null ? void 0 : _a.length) != null ? _b : 0;
    for (let i = 1; i < members.length; i++) {
      const a = headingActionCount(members[i]);
      const k = (_d = (_c = members[i].children) == null ? void 0 : _c.length) != null ? _d : 0;
      if (a > bestActions || a === bestActions && k > bestKids) {
        best = i;
        bestActions = a;
        bestKids = k;
      }
    }
    return best;
  }
  function headingActionCount(node) {
    const slots = parseHeadingSlots(node);
    if (!slots) return 0;
    return slots.filter((s) => s.kind === "action").length;
  }
  function inferVaryingHeadingProperties(members) {
    const bundles = members.map((m) => parseHeadingSlots(m));
    if (bundles.some((b) => !b)) return [];
    const repIdx = pickCollapseMasterIndex(members);
    const out = [];
    const taken = /* @__PURE__ */ new Set();
    const uniq = (base) => {
      let n = base || "Prop";
      let i = 2;
      while (taken.has(n)) n = `${base || "Prop"}-${i++}`;
      taken.add(n);
      return n;
    };
    const ofKind = (slots, kind) => slots.filter((s) => s.kind === kind);
    const titles = bundles.map((b) => ofKind(b, "title"));
    const metas = bundles.map((b) => ofKind(b, "meta"));
    const actions = bundles.map((b) => ofKind(b, "action"));
    const titleCount = titles[repIdx].length;
    const metaCount = metas[repIdx].length;
    if (titles.some((t2) => t2.length !== titleCount) || metas.some((m) => m.length !== metaCount)) return [];
    const aroundRep = (arr) => {
      if (repIdx === 0) return arr;
      return [arr[repIdx], ...arr.filter((_, i) => i !== repIdx)];
    };
    for (let ti = 0; ti < titleCount; ti++) {
      const repTitle = titles[repIdx][ti];
      const nodes = aroundRep(titles.map((t2) => t2[ti].node));
      collectVaryingUnder(nodes, String(repTitle.childIndex), {
        kind: "title",
        slotIndex: ti
      }, out, uniq);
    }
    for (let mi = 0; mi < metaCount; mi++) {
      const repMeta = metas[repIdx][mi];
      const nodes = aroundRep(metas.map((m) => m[mi].node));
      collectVaryingUnder(nodes, String(repMeta.childIndex), {
        kind: "meta",
        slotIndex: mi
      }, out, uniq);
    }
    const maxActions = Math.max(...actions.map((a) => a.length));
    for (let ai = 0; ai < maxActions; ai++) {
      const present = actions.map((a) => ai < a.length);
      const repAction = actions[repIdx][ai];
      if (!repAction) continue;
      const layerPath = String(repAction.childIndex);
      const layerName = repAction.node.name;
      if (present.some((p) => !p)) {
        if (metaCount < 1) continue;
        out.push({
          propName: uniq(pascalCase(layerName) || "Action"),
          type: "BOOLEAN",
          layerName,
          layerPath,
          field: "visible",
          headingSlot: { kind: "action", slotIndex: ai }
        });
      } else {
        const keys = actions.map((a) => {
          var _a;
          return (_a = a[ai].node.mainComponentKey) != null ? _a : "";
        });
        if (new Set(keys).size > 1) {
          out.push({
            propName: uniq(pascalCase(layerName) || "Swap"),
            type: "INSTANCE_SWAP",
            layerName,
            layerPath,
            field: "mainComponent",
            headingSlot: { kind: "action", slotIndex: ai }
          });
        }
      }
    }
    return out;
  }
  function collectVaryingUnder(nodes, path, heading, out, uniq) {
    var _a;
    const rep = nodes[0];
    if (!rep) return;
    if (path !== "" || heading.innerPath != null) {
      const effectivePath = path;
      if (rep.name.trim().endsWith("?")) {
        const vals = nodes.map((n2) => n2.visible !== false);
        if (new Set(vals).size > 1) {
          out.push({
            propName: uniq(pascalCase(rep.name.replace(/\?+$/, "")) || "Show"),
            type: "BOOLEAN",
            layerName: rep.name,
            layerPath: effectivePath,
            field: "visible",
            headingSlot: __spreadValues({}, heading)
          });
        }
      } else if (rep.type === "TEXT") {
        const vals = nodes.map((n2) => {
          var _a2;
          return (_a2 = n2.characters) != null ? _a2 : "";
        });
        if (new Set(vals).size > 1) {
          out.push({
            propName: uniq(textPropBaseName(rep)),
            type: "TEXT",
            layerName: rep.name,
            layerPath: effectivePath,
            field: "characters",
            headingSlot: __spreadValues({}, heading)
          });
        }
      } else if (rep.type === "INSTANCE") {
        const vals = nodes.map((n2) => {
          var _a2;
          return (_a2 = n2.mainComponentKey) != null ? _a2 : "";
        });
        if (new Set(vals).size > 1) {
          out.push({
            propName: uniq(pascalCase(rep.name) || "Swap"),
            type: "INSTANCE_SWAP",
            layerName: rep.name,
            layerPath: effectivePath,
            field: "mainComponent",
            headingSlot: __spreadValues({}, heading)
          });
        }
      }
    }
    if (rep.type === "INSTANCE" || rep.type === "TEXT") return;
    const lens = nodes.map((n2) => {
      var _a2;
      return ((_a2 = n2.children) != null ? _a2 : []).length;
    });
    if (new Set(lens).size !== 1) return;
    const n = (_a = lens[0]) != null ? _a : 0;
    for (let i = 0; i < n; i++) {
      const kids = nodes.map((m) => {
        var _a2;
        return ((_a2 = m.children) != null ? _a2 : [])[i];
      }).filter((c) => !!c);
      if (kids.length !== nodes.length) return;
      const childPath = path === "" ? String(i) : `${path}/${i}`;
      const inner = heading.innerPath == null ? String(i) : `${heading.innerPath}/${i}`;
      collectVaryingUnder(kids, childPath, __spreadProps(__spreadValues({}, heading), { innerPath: inner }), out, uniq);
    }
  }
  function propValuesFromStruct(root, plan) {
    var _a;
    const out = {};
    for (const p of plan) {
      if (p.headingSlot) {
        const v = readHeadingSlotProp(root, p);
        if (v !== void 0) out[p.propName] = v;
        continue;
      }
      const target = p.layerPath ? structAtPath(root, p.layerPath) : null;
      if (!target) {
        if (p.type === "BOOLEAN") out[p.propName] = false;
        continue;
      }
      out[p.propName] = p.fromVector ? (_a = target.vectorKey) != null ? _a : target.name : structPropValue(target, p.type);
    }
    return out;
  }
  function inferVaryingImageSlots(members) {
    if (members.length < 2) return [];
    const out = [];
    const visit = (nodes, path) => {
      var _a;
      const rep = nodes[0];
      if (!rep) return;
      if (rep.type === "INSTANCE") return;
      if (nodes.every((n) => n.imageHash !== void 0)) {
        if (new Set(nodes.map((n) => n.imageHash)).size > 1) out.push({ layerName: rep.name, layerPath: path });
      }
      const lens = nodes.map((n) => {
        var _a2;
        return ((_a2 = n.children) != null ? _a2 : []).length;
      });
      if (new Set(lens).size !== 1) return;
      for (let i = 0; i < ((_a = lens[0]) != null ? _a : 0); i++) {
        const kids = nodes.map((m) => {
          var _a2;
          return ((_a2 = m.children) != null ? _a2 : [])[i];
        }).filter((c) => !!c);
        if (kids.length !== nodes.length) return;
        visit(kids, path === "" ? String(i) : `${path}/${i}`);
      }
    };
    visit(members, "");
    return out;
  }
  function readHeadingSlotProp(root, p) {
    var _a;
    const hs = p.headingSlot;
    const slots = parseHeadingSlots(root);
    if (!slots) {
      return p.type === "BOOLEAN" ? false : void 0;
    }
    const ofKind = slots.filter((s) => s.kind === hs.kind);
    const slot = ofKind[hs.slotIndex];
    if (!slot) {
      return p.type === "BOOLEAN" ? false : void 0;
    }
    let node = slot.node;
    if (hs.innerPath) {
      const inner = structAtPath(node, hs.innerPath);
      if (!inner) return p.type === "BOOLEAN" ? false : void 0;
      node = inner;
    } else if (p.type === "TEXT" && node.type !== "TEXT") {
      const kid = ((_a = node.children) != null ? _a : []).find((c) => c.type === "TEXT");
      if (kid) node = kid;
    }
    return structPropValue(node, p.type);
  }
  function structAtPath(root, path) {
    var _a;
    let cur = root;
    for (const seg of path.split("/").filter(Boolean)) {
      const i = Number(seg);
      const kids = (_a = cur.children) != null ? _a : [];
      if (!Number.isInteger(i) || i < 0 || i >= kids.length) return null;
      cur = kids[i];
    }
    return cur;
  }
  function structPropValue(node, type) {
    var _a, _b;
    if (type === "BOOLEAN") return node.visible !== false;
    if (type === "TEXT") return (_a = node.characters) != null ? _a : "";
    return (_b = node.mainComponentKey) != null ? _b : "";
  }
  function variantGrid(names) {
    const parsed = names.map((n) => ({ name: n, props: parseVariantName(n).props }));
    const keys = [...new Set(parsed.flatMap((p) => Object.keys(p.props)))].sort();
    if (keys.length === 0) return parsed.map((p, i) => ({ name: p.name, row: 0, col: i }));
    if (keys.length <= 2) {
      const rowKey = keys.length === 2 ? keys[0] : null;
      const colKey = keys.length === 2 ? keys[1] : keys[0];
      const rowVals = rowKey ? [...new Set(parsed.map((p) => p.props[rowKey]).filter((v) => v != null))].sort() : [""];
      const colVals = [...new Set(parsed.map((p) => p.props[colKey]).filter((v) => v != null))].sort();
      return parsed.map((p) => ({
        name: p.name,
        row: rowKey ? Math.max(0, rowVals.indexOf(p.props[rowKey])) : 0,
        col: Math.max(0, colVals.indexOf(p.props[colKey]))
      }));
    }
    const cols = Math.ceil(Math.sqrt(parsed.length));
    return parsed.map((p, i) => ({ name: p.name, row: Math.floor(i / cols), col: i % cols }));
  }
  function missingVariants(variantNames) {
    var _a;
    const parsed = variantNames.map((n) => parseVariantName(n).props).filter((p) => Object.keys(p).length > 0);
    if (parsed.length < 2) return [];
    const keySig = (p) => Object.keys(p).sort().join(",");
    if (new Set(parsed.map(keySig)).size !== 1) return [];
    const properties = {};
    for (const p of parsed) {
      for (const [k, v] of Object.entries(p)) {
        const arr = (_a = properties[k]) != null ? _a : properties[k] = [];
        if (!arr.includes(v)) arr.push(v);
      }
    }
    for (const k of Object.keys(properties)) properties[k].sort();
    const existing = new Set(parsed.map(formatVariant));
    return cartesian(properties).map(formatVariant).filter((v) => !existing.has(v));
  }
  var COMPONENT_ROLES = /* @__PURE__ */ new Set(["icon", "image", "thumbnail", "avatar", "status", "badge", "divider"]);
  function componentEligible(node) {
    if (node.locked || node.visible === false) return false;
    if (node.type === "FRAME" || node.type === "GROUP") return isHighConfidenceComponent(node);
    return !!node.role && COMPONENT_ROLES.has(kebab(node.role));
  }
  function isClosedComponentSubtree(node) {
    return node.type === "INSTANCE" || node.type === "COMPONENT" || node.type === "COMPONENT_SET";
  }
  function scanComponentCandidates(selection2) {
    var _a, _b;
    const single = selection2.length === 1;
    const all = [];
    const visit = (n, depth, parentId) => {
      if (n.visible === false) return;
      const isContainerRoot = single && depth === 0;
      all.push({ id: n.id, name: n.name, type: n.type, depth, parentId, eligible: !isContainerRoot && componentEligible(n) });
      if (isClosedComponentSubtree(n)) return;
      if (n.children) for (const c of n.children) visit(c, depth + 1, n.id);
    };
    for (const n of selection2) visit(n, 0, null);
    const byId = new Map(all.map((c) => [c.id, c]));
    const keep = new Set(all.filter((c) => c.eligible).map((c) => c.id));
    for (const c of all) {
      if (!c.eligible) continue;
      let p = c.parentId;
      while (p && !keep.has(p)) {
        keep.add(p);
        p = (_b = (_a = byId.get(p)) == null ? void 0 : _a.parentId) != null ? _b : null;
      }
    }
    return all.filter((c) => keep.has(c.id));
  }
  var VECTOR_TYPES = /* @__PURE__ */ new Set(["VECTOR", "BOOLEAN_OPERATION", "STAR", "POLYGON", "LINE"]);
  function artworkKey(n) {
    var _a;
    if (VECTOR_TYPES.has(n.type)) return `v:${(_a = n.vectorKey) != null ? _a : n.name}`;
    if (n.imageHash !== void 0) return `i:${n.imageHash}`;
    if (n.fills && !Array.isArray(n.fills)) return `i:${n.name}`;
    if (Array.isArray(n.fills) && n.fills.some((p) => p.visible !== false && p.type === "IMAGE")) return `i:${n.name}`;
    return null;
  }
  function shouldCollapseToProperties(members) {
    if (members.length < 2) return false;
    if (members.every((m) => highConfidenceComponentRole(m) === "heading")) {
      return shouldCollapseHeadingMembers(members);
    }
    const base = members[0];
    for (let i = 1; i < members.length; i++) {
      const d = diffForCollapse(base, members[i]);
      if (d.struct) return false;
      if (d.size && !d.prop && !d.image && !d.swap) return false;
    }
    return true;
  }
  function shouldCollapseHeadingMembers(members) {
    const bundles = members.map((m) => parseHeadingSlots(m));
    if (bundles.some((b) => !b)) return false;
    const ofKind = (slots, kind) => slots.filter((s) => s.kind === kind);
    const titleNs = bundles.map((b) => ofKind(b, "title").length);
    const metaNs = bundles.map((b) => ofKind(b, "meta").length);
    const actionNs = bundles.map((b) => ofKind(b, "action").length);
    if (new Set(titleNs).size !== 1 || new Set(metaNs).size !== 1) return false;
    if (new Set(actionNs).size !== 1 && metaNs[0] < 1) return false;
    const base = members[0];
    for (let i = 1; i < members.length; i++) {
      const d = diffHeadingPair(base, members[i], bundles[0], bundles[i]);
      if (d.struct) return false;
      if (d.image || d.swap) return false;
      if (d.size && !d.prop) return false;
    }
    return true;
  }
  function diffHeadingPair(a, b, slotsA, slotsB) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t;
    let prop = false;
    let struct = false;
    let size = false;
    let image = false;
    let swap = false;
    if (((_a = a.layoutMode) != null ? _a : "NONE") !== ((_b = b.layoutMode) != null ? _b : "NONE")) struct = true;
    if (((_c = a.fillHex) != null ? _c : null) !== ((_d = b.fillHex) != null ? _d : null)) struct = true;
    if (((_e = a.paddingTop) != null ? _e : 0) !== ((_f = b.paddingTop) != null ? _f : 0) || ((_g = a.paddingRight) != null ? _g : 0) !== ((_h = b.paddingRight) != null ? _h : 0) || ((_i = a.paddingBottom) != null ? _i : 0) !== ((_j = b.paddingBottom) != null ? _j : 0) || ((_k = a.paddingLeft) != null ? _k : 0) !== ((_l = b.paddingLeft) != null ? _l : 0) || ((_m = a.itemSpacing) != null ? _m : 0) !== ((_n = b.itemSpacing) != null ? _n : 0) || ((_o = a.counterAxisSpacing) != null ? _o : 0) !== ((_p = b.counterAxisSpacing) != null ? _p : 0)) {
      struct = true;
    }
    if (((_q = a.width) != null ? _q : 0) !== ((_r = b.width) != null ? _r : 0) || ((_s = a.height) != null ? _s : 0) !== ((_t = b.height) != null ? _t : 0)) size = true;
    if (struct) return { prop, struct, size, image, swap };
    const kind = (s, k) => s.filter((x) => x.kind === k);
    const fold = (d) => {
      if (d.prop) prop = true;
      if (d.image) image = true;
      if (d.swap) swap = true;
    };
    const titlesA = kind(slotsA, "title");
    const titlesB = kind(slotsB, "title");
    for (let i = 0; i < titlesA.length; i++) {
      const d = diffForCollapse(titlesA[i].node, titlesB[i].node);
      if (d.struct) return { prop: true, struct: true, size, image, swap };
      fold(d);
      if (d.size) size = true;
    }
    const metasA = kind(slotsA, "meta");
    const metasB = kind(slotsB, "meta");
    for (let i = 0; i < metasA.length; i++) {
      const d = diffForCollapse(metasA[i].node, metasB[i].node);
      if (d.struct) return { prop, struct: true, size, image, swap };
      fold(d);
      if (d.size) size = true;
    }
    const actionsA = kind(slotsA, "action");
    const actionsB = kind(slotsB, "action");
    const n = Math.max(actionsA.length, actionsB.length);
    if (actionsA.length !== actionsB.length) prop = true;
    for (let i = 0; i < n; i++) {
      if (i >= actionsA.length || i >= actionsB.length) continue;
      const d = diffForCollapse(actionsA[i].node, actionsB[i].node);
      if (d.struct) return { prop, struct: true, size, image, swap };
      fold(d);
    }
    return { prop, struct, size, image, swap };
  }
  function diffForCollapse(a, b) {
    let prop = false;
    let struct = false;
    let size = false;
    let image = false;
    let swap = false;
    const walk3 = (x, y) => {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z;
      if (struct) return;
      if (x.type !== y.type) {
        struct = true;
        return;
      }
      if (x.type === "TEXT") {
        if (((_a = x.characters) != null ? _a : "") !== ((_b = y.characters) != null ? _b : "")) prop = true;
        return;
      }
      if (x.type === "INSTANCE") {
        if (((_c = x.mainComponentKey) != null ? _c : "") !== ((_d = y.mainComponentKey) != null ? _d : "")) prop = true;
        return;
      }
      const ka = artworkKey(x);
      const kb = artworkKey(y);
      if (ka !== kb) {
        if (ka == null || kb == null || ka[0] !== kb[0]) struct = true;
        else if (ka[0] === "i") image = true;
        else swap = true;
        if (struct) return;
      }
      const xv = x.visible !== false;
      const yv = y.visible !== false;
      if (xv !== yv) {
        if (x.name.trim().endsWith("?") || y.name.trim().endsWith("?")) prop = true;
        else struct = true;
      }
      if (((_e = x.layoutMode) != null ? _e : "NONE") !== ((_f = y.layoutMode) != null ? _f : "NONE")) struct = true;
      if (((_g = x.fillHex) != null ? _g : null) !== ((_h = y.fillHex) != null ? _h : null)) struct = true;
      if (((_i = x.paddingTop) != null ? _i : 0) !== ((_j = y.paddingTop) != null ? _j : 0) || ((_k = x.paddingRight) != null ? _k : 0) !== ((_l = y.paddingRight) != null ? _l : 0) || ((_m = x.paddingBottom) != null ? _m : 0) !== ((_n = y.paddingBottom) != null ? _n : 0) || ((_o = x.paddingLeft) != null ? _o : 0) !== ((_p = y.paddingLeft) != null ? _p : 0) || ((_q = x.itemSpacing) != null ? _q : 0) !== ((_r = y.itemSpacing) != null ? _r : 0) || ((_s = x.counterAxisSpacing) != null ? _s : 0) !== ((_t = y.counterAxisSpacing) != null ? _t : 0)) {
        struct = true;
      }
      const xw = (_u = x.width) != null ? _u : 0;
      const xh = (_v = x.height) != null ? _v : 0;
      const yw = (_w = y.width) != null ? _w : 0;
      const yh = (_x = y.height) != null ? _x : 0;
      if (xw !== yw || xh !== yh) size = true;
      const xc = (_y = x.children) != null ? _y : [];
      const yc = (_z = y.children) != null ? _z : [];
      if (xc.length !== yc.length) {
        struct = true;
        return;
      }
      for (let i = 0; i < xc.length; i++) walk3(xc[i], yc[i]);
    };
    walk3(a, b);
    return { prop, struct, size, image, swap };
  }
  function exactNameKey(name) {
    return name.trim().toLowerCase().replace(/\s+/g, " ");
  }
  var GENERIC_GROUP_NAMES = /* @__PURE__ */ new Set([
    "container",
    "wrapper",
    "content",
    "frame",
    "group",
    "section",
    "main",
    "header",
    "footer",
    "nav",
    "aside",
    "item",
    "list",
    "image",
    "icon",
    "background",
    "border",
    "shape",
    "text",
    "divider",
    "swatch",
    "figure"
  ]);
  function groupByExactName(children) {
    const map = /* @__PURE__ */ new Map();
    const order = [];
    for (const c of children) {
      const k = exactNameKey(c.name);
      if (!k) continue;
      if (GENERIC_GROUP_NAMES.has(k)) continue;
      if (!map.has(k)) {
        map.set(k, []);
        order.push(k);
      }
      map.get(k).push(c);
    }
    return order.map((k) => ({ key: k, members: map.get(k) }));
  }
  function colorAxisLabels(hexes) {
    const used = /* @__PURE__ */ new Set();
    const uniq = (base) => {
      let name = base;
      let i = 2;
      while (used.has(name)) name = `${base}-${i++}`;
      used.add(name);
      return name;
    };
    return hexes.map((hex) => {
      const { family, step, achromatic } = classifyColor(hex);
      return uniq(achromatic ? `gray-${step}` : family);
    });
  }
  function deriveVariants(members) {
    if (members.length <= 1) {
      return members.map((m) => ({ id: m.id, name: m.name, props: {}, variant: "" }));
    }
    const props = members.map((m) => extractNameProps(m.name));
    const nameDistinct = new Set(props.map(formatVariant)).size === members.length;
    if (!nameDistinct) {
      if (!props.some((p) => "Size" in p)) {
        const areas = members.map((m) => {
          var _a, _b;
          return ((_a = m.width) != null ? _a : 0) * ((_b = m.height) != null ? _b : 0);
        });
        const distinctAreas = [...new Set(areas)];
        if (distinctAreas.length > 1) {
          const sorted = [...distinctAreas].sort((a, b) => a - b);
          const grades = tshirtRoles(sorted);
          const byArea = new Map(sorted.map((a, i) => [a, grades[i]]));
          members.forEach((_, i) => {
            props[i].Size = byArea.get(areas[i]);
          });
        }
      }
      if (!props.some((p) => "Color" in p)) {
        const hexes = members.map((m) => {
          var _a;
          return (_a = m.fillHex) != null ? _a : null;
        });
        if (hexes.every((h) => h != null)) {
          const distinct = [...new Set(hexes)];
          if (distinct.length > 1) {
            const labels = colorAxisLabels(distinct);
            const byHex = new Map(distinct.map((h, i) => [h, labels[i]]));
            members.forEach((_, i) => {
              props[i].Color = byHex.get(hexes[i]);
            });
          }
        }
      }
    }
    const keys = [...new Set(props.flatMap((p) => Object.keys(p)))];
    if (keys.length) {
      for (const p of props) for (const k of keys) if (!(k in p)) p[k] = "default";
    }
    if (new Set(props.map(formatVariant)).size !== members.length) {
      const tokens = members.map((m) => distinguishingTokens(m.name));
      const usable = tokens.every((t2) => t2.length > 0) && new Set(tokens).size === members.length;
      members.forEach((_, i) => {
        props[i].Variant = usable ? tokens[i] : String(i + 1);
      });
    }
    return members.map((m, i) => ({ id: m.id, name: m.name, props: props[i], variant: formatVariant(props[i]) }));
  }
  function stripContextTokens(tokens) {
    const last = tokens.length - 1;
    if (last < 0) return tokens.slice();
    if (!COMPONENT_NOUNS.has(nounWord(tokens[last]))) return tokens.slice();
    let start = last;
    while (start > 0 && COMPONENT_NOUNS.has(nounWord(tokens[start - 1]))) start--;
    return tokens.slice(start);
  }
  function commonPrefixTokens(names) {
    if (!names.length) return [];
    const split = (s) => kebab(s).split("-").filter(Boolean);
    let prefix = split(names[0]);
    for (const n of names.slice(1)) {
      const toks = split(n);
      let i = 0;
      while (i < prefix.length && i < toks.length && prefix[i] === toks[i]) i++;
      prefix = prefix.slice(0, i);
      if (!prefix.length) break;
    }
    return prefix;
  }
  function commonBaseName(names) {
    var _a;
    if (!names.length) return "";
    const prefix = commonPrefixTokens(names);
    if (prefix.length) return pascalCase(stripContextTokens(prefix).join("-"));
    return (_a = recognizeComponentName(names[0])) != null ? _a : pascalCase(names[0]);
  }
  function trustedRole(members) {
    if (!members.length) return null;
    const role = members[0].role ? kebab(members[0].role) : "";
    if (!role) return null;
    for (const m of members) {
      if (!m.role || kebab(m.role) !== role) return null;
      const toks = kebab(m.name).split("-").filter(Boolean);
      if (toks[toks.length - 1] !== role) return null;
    }
    return role;
  }
  function componentBaseName(members) {
    const role = trustedRole(members);
    return role ? pascalCase(role) : commonBaseName(members.map((m) => m.name));
  }
  function contextualName(members) {
    const prefix = commonPrefixTokens(members.map((m) => m.name));
    return prefix.length ? pascalCase(prefix.join("-")) : commonBaseName(members.map((m) => m.name));
  }
  function resolveGroupNames(groups, existing = []) {
    const base = groups.map(componentBaseName);
    const existingSet = new Set(existing);
    const collides = new Set(base.filter((n, i) => base.indexOf(n) !== i || existingSet.has(n)));
    const taken = new Set(existing);
    return base.map((n, i) => {
      let name = collides.has(n) ? contextualName(groups[i]) : n;
      if (taken.has(name)) {
        let k = 2;
        while (taken.has(`${name}${k}`)) k++;
        name = `${name}${k}`;
      }
      taken.add(name);
      return name;
    });
  }

  // src/lib/similar.ts
  function flattenFrame(root) {
    const out = [];
    const visit = (node, prefix) => {
      var _a, _b;
      const seen = /* @__PURE__ */ new Map();
      for (const c of (_a = node.children) != null ? _a : []) {
        const n = ((_b = seen.get(c.name)) != null ? _b : 0) + 1;
        seen.set(c.name, n);
        const seg = n === 1 ? c.name : `${c.name}#${n}`;
        const path = prefix ? `${prefix}/${seg}` : seg;
        out.push({ id: c.id, path, type: c.type, characters: c.characters, componentKey: c.componentKey, hasImageFill: c.hasImageFill, imageHash: c.imageHash });
        visit(c, path);
      }
    };
    visit(root, "");
    return out;
  }
  var SEP = "\0";
  function frameShapeSignature(root) {
    return JSON.stringify(
      flattenFrame(root).map((e) => `${e.path}${SEP}${e.type}`).sort()
    );
  }
  var textOf = (e) => {
    var _a;
    return ((_a = e.characters) != null ? _a : "").trim();
  };
  function metaOf(frame) {
    const leaves = flattenFrame(frame);
    const texts = leaves.filter((l) => l.type === "TEXT");
    const textFilled = texts.filter((l) => textOf(l) !== "").length;
    const images = leaves.filter((l) => l.type === "INSTANCE" || l.hasImageFill).length;
    const emptyLayers = texts.length - textFilled;
    return {
      id: frame.id,
      name: frame.name,
      textFilled,
      textTotal: texts.length,
      images,
      emptyLayers,
      score: textFilled * 2 + images - emptyLayers
    };
  }
  function alignFrames(frames) {
    var _a;
    const empty = { memberIds: [], recommendedMasterId: null, metas: [], varying: [], imageVarying: [], excluded: [] };
    if (frames.length < 2) {
      return __spreadProps(__spreadValues({}, empty), { excluded: frames.map((f) => ({ id: f.id, name: f.name, reason: t("similar.why.needTwo") })) });
    }
    const bySig = /* @__PURE__ */ new Map();
    for (const f of frames) {
      const sig = frameShapeSignature(f);
      ((_a = bySig.get(sig)) != null ? _a : bySig.set(sig, []).get(sig)).push(f);
    }
    let best = [];
    for (const group of bySig.values()) if (group.length > best.length) best = group;
    const excluded = frames.filter((f) => !best.includes(f)).map((f) => ({ id: f.id, name: f.name, reason: t("similar.why.mismatch") }));
    if (best.length < 2) {
      return __spreadProps(__spreadValues({}, empty), { excluded: frames.map((f) => ({ id: f.id, name: f.name, reason: t("similar.why.fewSame") })) });
    }
    const flats = best.map((f) => flattenFrame(f));
    const paths = flats[0];
    const varying = [];
    const imageVarying = [];
    const at = (leaves, path) => leaves.find((l) => l.path === path);
    for (const entry of paths) {
      if (entry.hasImageFill) {
        const hashes = new Set(flats.map((f) => {
          var _a2, _b;
          return (_b = (_a2 = at(f, entry.path)) == null ? void 0 : _a2.imageHash) != null ? _b : "";
        }));
        if (hashes.size > 1) imageVarying.push(entry.path);
      }
      if (entry.type !== "TEXT" && entry.type !== "INSTANCE") continue;
      const valueAt = (leaves) => {
        var _a2;
        const e = at(leaves, entry.path);
        if (!e) return "";
        return entry.type === "TEXT" ? textOf(e) : (_a2 = e.componentKey) != null ? _a2 : "";
      };
      const distinct = new Set(flats.map(valueAt));
      if (distinct.size > 1) varying.push({ path: entry.path, type: entry.type === "TEXT" ? "TEXT" : "INSTANCE_SWAP" });
    }
    const metas = best.map(metaOf);
    const order = new Map(best.map((f, i) => [f.id, i]));
    metas.sort((a, b) => b.score - a.score || order.get(a.id) - order.get(b.id));
    const recommendedMasterId = metas.length ? metas[0].id : null;
    return {
      memberIds: best.map((f) => f.id),
      recommendedMasterId,
      metas,
      varying,
      imageVarying: [...new Set(imageVarying)],
      excluded
    };
  }
  var leafName = (path) => {
    var _a;
    const seg = (_a = path.split("/").pop()) != null ? _a : path;
    return kebab(seg.replace(/#\d+$/, ""));
  };
  function planContentProperties(varying) {
    const taken = /* @__PURE__ */ new Set();
    const uniq = (base) => {
      const b = base || "prop";
      let n = b;
      let i = 2;
      while (taken.has(n)) n = `${b}-${i++}`;
      taken.add(n);
      return n;
    };
    return varying.map((v) => ({
      propName: uniq(leafName(v.path) || (v.type === "TEXT" ? "text" : "swap")),
      type: v.type,
      path: v.path,
      field: v.type === "TEXT" ? "characters" : "mainComponent"
    }));
  }
  function overridesForFrame(frameLeaves, plan) {
    var _a, _b;
    const byPath = new Map(frameLeaves.map((l) => [l.path, l]));
    const out = {};
    for (const p of plan) {
      const e = byPath.get(p.path);
      if (!e) continue;
      const value = p.type === "TEXT" ? (_a = e.characters) != null ? _a : "" : (_b = e.componentKey) != null ? _b : "";
      if (value !== "") out[p.propName] = value;
    }
    return out;
  }

  // src/lib/similarApply.ts
  async function buildSimTree(node) {
    var _a;
    const out = { id: node.id, name: node.name, type: node.type };
    if (node.type === "TEXT") out.characters = typeof node.characters === "string" ? node.characters : "";
    if (node.type === "INSTANCE") {
      const mc = await node.getMainComponentAsync();
      if (mc) out.componentKey = mc.key || mc.id;
    }
    const fills = node.fills;
    if (Array.isArray(fills)) {
      const img = fills.find((p) => p.type === "IMAGE" && p.visible !== false);
      if (img) {
        out.hasImageFill = true;
        out.imageHash = (_a = img.imageHash) != null ? _a : void 0;
      }
    }
    if ("children" in node) {
      const kids = [];
      for (const c of node.children) kids.push(await buildSimTree(c));
      out.children = kids;
    }
    return out;
  }
  function figmaPathMap(root) {
    const map = /* @__PURE__ */ new Map();
    const visit = (node, prefix) => {
      var _a;
      if (!("children" in node)) return;
      const seen = /* @__PURE__ */ new Map();
      for (const c of node.children) {
        const n = ((_a = seen.get(c.name)) != null ? _a : 0) + 1;
        seen.set(c.name, n);
        const seg = n === 1 ? c.name : `${c.name}#${n}`;
        const path = prefix ? `${prefix}/${seg}` : seg;
        map.set(path, c);
        visit(c, path);
      }
    };
    visit(root, "");
    return map;
  }
  async function scanSimilar(frames) {
    const trees = [];
    for (const f of frames) trees.push(await buildSimTree(f));
    return alignFrames(trees);
  }
  async function componentizeSimilar(master, members) {
    var _a;
    const trees = [];
    for (const n of members) trees.push(await buildSimTree(n));
    const treeById = new Map(members.map((n, i) => [n.id, trees[i]]));
    const aligned = alignFrames(trees);
    const plan = planContentProperties(aligned.varying);
    const comp = figma.createComponentFromNode(master);
    const compPaths = figmaPathMap(comp);
    const propIdByPath = /* @__PURE__ */ new Map();
    let properties = 0;
    for (const p of plan) {
      const target = compPaths.get(p.path);
      if (!target) continue;
      try {
        let def = "";
        if (p.type === "TEXT") def = target.type === "TEXT" ? target.characters : "";
        else {
          const mc = target.type === "INSTANCE" ? await target.getMainComponentAsync() : null;
          def = mc ? mc.key || mc.id : "";
        }
        const id = comp.addComponentProperty(p.propName, p.type, def);
        const refs = __spreadValues({}, (_a = target.componentPropertyReferences) != null ? _a : {});
        refs[p.field] = id;
        target.componentPropertyReferences = refs;
        propIdByPath.set(p.path, id);
        properties++;
      } catch (e) {
      }
    }
    let instances = 0;
    let images = 0;
    const kept = [];
    const placeFailed = [];
    const memberSet = new Set(aligned.memberIds);
    for (const n of members) {
      if (n.id === master.id) continue;
      if (!memberSet.has(n.id)) continue;
      const leaves = treeById.get(n.id);
      if (!leaves) continue;
      let inst = null;
      try {
        inst = comp.createInstance();
        try {
          inst.resize(n.width, n.height);
        } catch (e) {
        }
        const origin = captureOrigin(n, { anchor: false });
        if (!placeAtOrigin(inst, origin)) {
          inst = null;
          placeFailed.push(n.name);
          continue;
        }
        releaseOrigin(origin);
        const ov = overridesForFrame(flattenFrame(leaves), plan);
        const props = {};
        for (const p of plan) {
          const v = ov[p.propName];
          const id = propIdByPath.get(p.path);
          if (v !== void 0 && id) props[id] = v;
        }
        if (Object.keys(props).length) {
          try {
            inst.setProperties(props);
          } catch (e) {
            inst.remove();
            kept.push(n.name);
            continue;
          }
        }
        if (aligned.imageVarying.length) {
          const srcPaths = figmaPathMap(n);
          const dstPaths = figmaPathMap(inst);
          for (const path of aligned.imageVarying) {
            const src = srcPaths.get(path);
            const dst = dstPaths.get(path);
            const f = src && "fills" in src ? src.fills : null;
            if (dst && "fills" in dst && Array.isArray(f)) {
              try {
                dst.fills = f;
                images++;
              } catch (e) {
              }
            }
          }
        }
        n.remove();
        instances++;
      } catch (e) {
        if (inst) {
          try {
            inst.remove();
          } catch (e2) {
          }
        }
      }
    }
    const warnings = aligned.excluded.map((e) => `${e.name}: ${e.reason}`);
    for (const name of kept) warnings.push(t("similar.overrideFail", { name }));
    for (const name of placeFailed) warnings.push(t("similar.placeFail", { name }));
    return { master: comp.name, properties, instances, images, warnings, placeFailed };
  }
  function componentizeResultMessage(r) {
    return {
      type: "COMPONENTIZE_RESULT",
      master: r.master,
      properties: r.properties,
      instances: r.instances,
      images: r.images,
      warnings: r.warnings,
      placeFailed: r.placeFailed
    };
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
  function darkGlobalName(lightName) {
    return isDarkGlobalName(lightName) ? lightName : `${DARK_PREFIX}${lightName}`;
  }

  // src/lib/themeApply.ts
  var DARK_MODE_NAME = "Dark";
  function isVariableAlias(raw) {
    return !!raw && typeof raw === "object" && "type" in raw && raw.type === "VARIABLE_ALIAS";
  }
  function findModeByName(modes, name) {
    const key = name.toLowerCase();
    return modes.find((m) => m.name.toLowerCase() === key);
  }
  function ensureDarkMode(collection) {
    const existing = findModeByName(collection.modes, DARK_MODE_NAME);
    if (existing) return { modeId: existing.modeId, created: false };
    const modeId = collection.addMode(DARK_MODE_NAME);
    return { modeId, created: true };
  }
  async function generateDarkMode(collectionId, fromModeId, toModeId) {
    var _a, _b;
    let created = 0;
    let realiased = 0;
    let skipped = 0;
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const semanticCol = cols.find((c) => c.id === collectionId);
    if (!semanticCol) return { created, realiased, skipped, error: t("dark.errNoCol") };
    let modeCreated = false;
    let to = toModeId;
    if (!to) {
      try {
        const ensured = ensureDarkMode(semanticCol);
        to = ensured.modeId;
        modeCreated = ensured.created;
      } catch (e) {
        const why = e instanceof Error ? e.message : String(e);
        return {
          created: 0,
          realiased: 0,
          skipped: 0,
          error: t("dark.errAddMode", { why: why || t("dark.errAddModePlan") })
        };
      }
    }
    let from = fromModeId;
    if (!from) {
      const def = semanticCol.defaultModeId;
      from = def === to ? (_b = (_a = semanticCol.modes.find((m) => m.modeId !== to)) == null ? void 0 : _a.modeId) != null ? _b : def : def;
    }
    if (from === to) {
      return __spreadProps(__spreadValues({
        created: 0,
        realiased: 0,
        skipped: 0
      }, modeCreated ? { modeCreated: true } : {}), {
        error: t("dark.errSameMode")
      });
    }
    const globalCol = ensureCollection(cols, "global", GLOBAL);
    const gMode = globalCol.defaultModeId;
    const allVars = await figma.variables.getLocalVariablesAsync();
    const byId = new Map(allVars.map((v) => [v.id, v]));
    const globalByName = new Map(allVars.filter((v) => v.variableCollectionId === globalCol.id).map((v) => [v.name, v]));
    for (const v of allVars) {
      if (v.variableCollectionId !== semanticCol.id || v.resolvedType !== "COLOR") continue;
      const fromRaw = v.valuesByMode[from];
      if (!isVariableAlias(fromRaw)) {
        skipped++;
        continue;
      }
      const lightGlobal = byId.get(fromRaw.id);
      const lightRaw = lightGlobal == null ? void 0 : lightGlobal.valuesByMode[gMode];
      if (!lightGlobal || !(lightRaw && typeof lightRaw === "object" && "r" in lightRaw)) {
        skipped++;
        continue;
      }
      if (isDarkGlobalName(lightGlobal.name)) {
        skipped++;
        continue;
      }
      const darkHex = darkValueForLight(rgbToHex(lightRaw));
      const dname = darkGlobalName(lightGlobal.name);
      let dark = globalByName.get(dname);
      if (!dark) {
        dark = figma.variables.createVariable(dname, globalCol, "COLOR");
        dark.scopes = lightGlobal.scopes;
        dark.hiddenFromPublishing = true;
        globalByName.set(dname, dark);
        created++;
      }
      dark.setValueForMode(gMode, hexToRgb(darkHex));
      v.setValueForMode(to, figma.variables.createVariableAlias(dark));
      realiased++;
    }
    if (modeCreated && realiased === 0) {
      try {
        semanticCol.removeMode(to);
        modeCreated = false;
      } catch (e) {
      }
    }
    return __spreadValues({ created, realiased, skipped }, modeCreated ? { modeCreated: true } : {});
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
  var UI_WIDTH = 400;
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
  function cellKey(c) {
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
  var sameCell = (a, b) => cellKey(a) === cellKey(b);

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
  var isPaid = () => currentTier() === "paid";
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
      const tiers = collectionTiers(cols);
      const globalIds = new Set(cols.filter((c) => tiers.get(c.id) === 1).map((c) => c.id));
      const bindableIds = new Set(cols.filter((c) => {
        var _a;
        return ((_a = tiers.get(c.id)) != null ? _a : 0) > 0;
      }).map((c) => c.id));
      const vars = await figma.variables.getLocalVariablesAsync();
      const globals = vars.filter((v) => globalIds.has(v.variableCollectionId));
      const hasColorVars = globals.some((v) => v.resolvedType === "COLOR");
      const hasScaleVars = globals.some((v) => v.resolvedType !== "COLOR");
      const hasGlobal = globals.length > 0;
      const hasBindable = vars.some((v) => bindableIds.has(v.variableCollectionId));
      const semanticIds = new Set(cols.filter((c) => {
        var _a;
        return ((_a = tiers.get(c.id)) != null ? _a : 0) >= 2;
      }).map((c) => c.id));
      const hasDarkMode = cols.some((c) => semanticIds.has(c.id) && c.modes.length > 1);
      const hasTextStyles = (await figma.getLocalTextStylesAsync()).length > 0;
      const hasSemanticRoles = vars.some((v) => semanticIds.has(v.variableCollectionId));
      const tierVarList = vars.filter((v) => bindableIds.has(v.variableCollectionId));
      const tierVars = tierVarList.length;
      const tierColorVars = tierVarList.filter((v) => v.resolvedType === "COLOR").length;
      const otherVars = vars.length - tierVars;
      post({ type: "PREREQ_STATE", hasColorVars, hasScaleVars, hasGlobal, hasBindable, hasDarkMode, hasTextStyles, hasSemanticRoles, tierVars, tierColorVars, otherVars });
    } catch (e) {
    }
  }
  function arrangeSet(set) {
    const children = set.children.filter((c) => c.type === "COMPONENT");
    if (!children.length) return;
    const cellW = Math.max(...children.map((c) => c.width));
    const cellH = Math.max(...children.map((c) => c.height));
    const gap = 16;
    const pad = 16;
    const pos = new Map(variantGrid(children.map((c) => c.name)).map((g) => [g.name, g]));
    let maxCol = 0;
    let maxRow = 0;
    for (const c of children) {
      const g = pos.get(c.name);
      if (!g) continue;
      c.x = pad + g.col * (cellW + gap);
      c.y = pad + g.row * (cellH + gap);
      maxCol = Math.max(maxCol, g.col);
      maxRow = Math.max(maxRow, g.row);
    }
    set.resizeWithoutConstraints(pad * 2 + (maxCol + 1) * cellW + maxCol * gap, pad * 2 + (maxRow + 1) * cellH + maxRow * gap);
  }
  async function ensureComponentsPage() {
    await figma.loadAllPagesAsync();
    const found = figma.root.children.find((p) => p.name === COMPONENTS_PAGE);
    if (found) return found;
    const page = figma.createPage();
    page.name = COMPONENTS_PAGE;
    return page;
  }
  var COMPONENTS_PAGE = "Components";
  function pageStartX(page) {
    const ch = page.children;
    return ch.length ? Math.max(...ch.map((n) => n.x + n.width)) + 48 : 0;
  }
  function errText(e) {
    return e instanceof Error ? e.message : String(e);
  }
  function toVarInfo(v, col, tier) {
    const modes = col.modes.map((m) => ({ modeId: m.modeId, name: m.name }));
    return { id: v.id, name: v.name, collectionId: col.id, collection: col.name, tier, modes };
  }
  async function collectionRoleInfos() {
    var _a;
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const map = readRoleMap();
    const count = /* @__PURE__ */ new Map();
    for (const v of await figma.variables.getLocalVariablesAsync()) count.set(v.variableCollectionId, ((_a = count.get(v.variableCollectionId)) != null ? _a : 0) + 1);
    return cols.map((c) => {
      var _a2, _b;
      return { id: c.id, name: c.name, vars: (_a2 = count.get(c.id)) != null ? _a2 : 0, set: (_b = map[c.id]) != null ? _b : null, role: roleOfCollection(c, map), guess: guessRole(c.name) };
    });
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
    const tiers = collectionTiers(cols);
    const all = await figma.variables.getLocalVariablesAsync();
    const nameById = new Map(all.map((v) => [v.id, v.name]));
    const colById = new Map(cols.map((c) => [c.id, c]));
    const remoteName = /* @__PURE__ */ new Map();
    for (const v of all) {
      for (const raw of Object.values(v.valuesByMode)) {
        if (raw && typeof raw === "object" && "type" in raw && raw.type === "VARIABLE_ALIAS") {
          const id = raw.id;
          if (nameById.has(id) || remoteName.has(id)) continue;
          const rv = await figma.variables.getVariableByIdAsync(id).catch(() => null);
          remoteName.set(id, rv ? rv.name : null);
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
    const roleMap = readRoleMap();
    const collections = cols.map((c) => {
      var _a2, _b2;
      return {
        id: c.id,
        name: c.name,
        tier: (_a2 = tiers.get(c.id)) != null ? _a2 : 0,
        modes: c.modes.map((m) => ({ modeId: m.modeId, name: m.name })),
        defaultModeId: c.defaultModeId,
        tierSet: (_b2 = roleMap[c.id]) != null ? _b2 : null
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
        let value;
        if (ev.kind === "color") value = __spreadProps(__spreadValues({}, hexToRgb(ev.hex)), { a: Math.max(0, Math.min(1, ev.alpha)) });
        else if (ev.kind === "number") value = ev.value;
        else if (ev.kind === "string") value = ev.text;
        else if (ev.kind === "bool") value = ev.value;
        else {
          const target = await figma.variables.getVariableByIdAsync(ev.targetId).catch(() => null);
          if (!target) throw new Error("alias target not found");
          value = figma.variables.createVariableAlias(target);
        }
        v.setValueForMode(modeId, value);
        applied.push(modeId);
      } catch (e) {
        return done(applied, { code: "value", modeId, message: errText(e) });
      }
    }
    done(applied);
  }
  async function collectUsage(nodeIds) {
    var _a;
    const roots = await resolveRoots(nodeIds);
    const { usage, nodesById, scanned } = countUsage(roots);
    const local = new Set((await figma.variables.getLocalVariablesAsync()).map((v) => v.id));
    const out = {};
    const libraryVars = [];
    const libSeen = /* @__PURE__ */ new Set();
    let deletedCount = 0;
    const deletedNodes = /* @__PURE__ */ new Set();
    const addLibrary = async (id, depth) => {
      var _a2, _b;
      if (libSeen.has(id)) return true;
      const v = await figma.variables.getVariableByIdAsync(id).catch(() => null);
      if (!v) return false;
      libSeen.add(id);
      const col = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId).catch(() => null);
      const modeId = (_a2 = col == null ? void 0 : col.defaultModeId) != null ? _a2 : Object.keys(v.valuesByMode)[0];
      const aliasTargets = [];
      for (const raw of Object.values(v.valuesByMode)) {
        if (raw && typeof raw === "object" && "type" in raw && raw.type === "VARIABLE_ALIAS") aliasTargets.push(raw.id);
      }
      libraryVars.push({ id: v.id, name: v.name, collection: (_b = col == null ? void 0 : col.name) != null ? _b : "", type: v.resolvedType, value: await libCell(modeId ? v.valuesByMode[modeId] : void 0), aliasTargets });
      if (depth < 5) {
        for (const t2 of aliasTargets) if (!local.has(t2)) await addLibrary(t2, depth + 1);
      }
      return true;
    };
    for (const [id, u] of usage) {
      if (local.has(id)) {
        out[id] = u;
        continue;
      }
      if (await addLibrary(id, 1)) {
        out[id] = u;
        continue;
      }
      deletedCount += u.places;
      for (const n of (_a = nodesById.get(id)) != null ? _a : []) deletedNodes.add(n);
    }
    const localVars = await figma.variables.getLocalVariablesAsync();
    for (const v of localVars) {
      if (!out[v.id]) continue;
      for (const raw of Object.values(v.valuesByMode)) {
        if (raw && typeof raw === "object" && "type" in raw && raw.type === "VARIABLE_ALIAS") {
          const t2 = raw.id;
          if (!local.has(t2)) await addLibrary(t2, 2);
        }
      }
    }
    return { usage: out, libraryVars, deleted: { count: deletedCount, nodeIds: [...deletedNodes] }, scanned };
  }
  async function collectVars() {
    var _a;
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const colById = new Map(cols.map((c) => [c.id, c]));
    const tiers = collectionTiers(cols);
    const vars = await figma.variables.getLocalVariablesAsync();
    const out = [];
    for (const v of vars) {
      const col = colById.get(v.variableCollectionId);
      const tier = col ? (_a = tiers.get(col.id)) != null ? _a : 0 : 0;
      if (!col || !tier) continue;
      out.push(toVarInfo(v, col, tier));
    }
    out.sort((a, b) => a.collection.localeCompare(b.collection) || a.name.localeCompare(b.name));
    return out;
  }
  function pageOf(node) {
    let n = node;
    while (n && n.type !== "PAGE") n = n.parent;
    return n && n.type === "PAGE" ? n : null;
  }
  function requireComponents() {
    return requirePaid("components");
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
  function hasAnyBinding(n) {
    const bv = n.boundVariables;
    if (bv && Object.keys(bv).length) return true;
    for (const key of ["fills", "strokes"]) {
      const ps = n[key];
      if (Array.isArray(ps) && ps.some((p) => {
        var _a;
        return !!((_a = p.boundVariables) == null ? void 0 : _a.color);
      })) return true;
    }
    return false;
  }
  var selfSelect = false;
  function postSelection() {
    var _a, _b;
    const sel = selection();
    let scanned = 0;
    let bindable = 0;
    let bound = 0;
    let renamed = 0;
    let capped = false;
    const comps = sel.filter((n) => {
      var _a2;
      return n.type === "COMPONENT" && ((_a2 = n.parent) == null ? void 0 : _a2.type) !== "COMPONENT_SET";
    }).length;
    const sets = sel.filter((n) => n.type === "COMPONENT_SET").length;
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
      if (hasAnyBinding(n)) bound++;
      if (readRole(n)) renamed++;
      if (n.type === "INSTANCE") continue;
      if ("children" in n) for (const c of n.children) stack.push(c);
    }
    const firstName = (_b = (_a = sel[0]) == null ? void 0 : _a.name) != null ? _b : "";
    const ids = sel.map((n) => n.id);
    post({ type: "SELECTION_STATE", count: sel.length, scanned, bindable, capped, comps, sets, selfSelect, bound, renamed, firstName, ids });
    selfSelect = false;
  }
  figma.on("selectionchange", postSelection);
  function solidFillHex(node) {
    var _a;
    const fills = node.fills;
    if (!Array.isArray(fills)) return null;
    for (const p of fills) {
      if (p.type === "SOLID" && p.visible !== false && ((_a = p.opacity) != null ? _a : 1) > 0) return rgbToHex(p.color);
    }
    return null;
  }
  function readRole(node) {
    const fn = node.getPluginData;
    if (typeof fn !== "function") return void 0;
    try {
      return fn.call(node, ROLE_KEY) || void 0;
    } catch (e) {
      return void 0;
    }
  }
  async function existingComponentNames(exclude) {
    try {
      await figma.loadAllPagesAsync();
      return figma.root.findAllWithCriteria({ types: ["COMPONENT", "COMPONENT_SET"] }).filter((n) => !(exclude == null ? void 0 : exclude.has(n.id))).map((n) => n.name);
    } catch (e) {
      return [];
    }
  }
  function paintsOf(v) {
    if (typeof v === "symbol") return v;
    if (!Array.isArray(v)) return void 0;
    return v.map((p) => ({
      visible: p.visible,
      type: p.type,
      opacity: p.opacity
    }));
  }
  function imageHashOf2(node) {
    var _a;
    const fills = node.fills;
    if (!Array.isArray(fills)) return void 0;
    const img = fills.find((p) => p.type === "IMAGE" && p.visible !== false);
    if (!img) return void 0;
    return (_a = img.imageHash) != null ? _a : "";
  }
  function fnv1a(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h.toString(36);
  }
  function vectorKeyOf(node) {
    var _a, _b, _c, _d;
    if (!VECTOR_TYPES2.has(node.type)) return void 0;
    try {
      const g = node;
      const parts = [];
      for (const p of (_a = g.fillGeometry) != null ? _a : []) parts.push((_b = p.data) != null ? _b : "");
      for (const p of (_c = g.strokeGeometry) != null ? _c : []) parts.push((_d = p.data) != null ? _d : "");
      return parts.length ? fnv1a(parts.join("|")) : `?${Math.round(node.width)}x${Math.round(node.height)}`;
    } catch (e) {
      return void 0;
    }
  }
  var VECTOR_TYPES2 = /* @__PURE__ */ new Set(["VECTOR", "BOOLEAN_OPERATION", "STAR", "POLYGON", "LINE"]);
  function toStructNode(node) {
    const a = node;
    const num = (v) => typeof v === "number" ? v : void 0;
    const kids = "children" in node ? node.children : [];
    let characters;
    let mainComponentKey;
    if (node.type === "TEXT") {
      try {
        characters = node.characters;
      } catch (e) {
        characters = "";
      }
    }
    if (node.type === "INSTANCE") {
      try {
        const main = node.mainComponent;
        mainComponentKey = main ? main.key || main.id : null;
      } catch (e) {
        mainComponentKey = null;
      }
    }
    return {
      id: node.id,
      name: node.name,
      type: node.type,
      imageHash: imageHashOf2(node),
      vectorKey: vectorKeyOf(node),
      locked: node.locked,
      visible: node.visible,
      width: num(a.width),
      height: num(a.height),
      paddingTop: num(a.paddingTop),
      paddingRight: num(a.paddingRight),
      paddingBottom: num(a.paddingBottom),
      paddingLeft: num(a.paddingLeft),
      itemSpacing: num(a.itemSpacing),
      counterAxisSpacing: num(a.counterAxisSpacing),
      layoutMode: typeof a.layoutMode === "string" ? a.layoutMode : void 0,
      fillHex: solidFillHex(node),
      // 고신뢰 역할 판정(카드·figure·button…)이 읽는 값들 — 여기서 빼면 `componentEligible`이
      // 채움도 모서리도 그림자도 없는 노드를 보게 되어 카드형 프레임이 후보에서 통째로 사라진다.
      // 페인트/이펙트는 판정에 필요한 필드만 얕게 복사한다(원본 배열은 트리 전체로 무겁다).
      cornerRadius: a.cornerRadius,
      topLeftRadius: num(a.topLeftRadius),
      opacity: num(a.opacity),
      gridRowCount: num(a.gridRowCount),
      gridColumnCount: num(a.gridColumnCount),
      fills: paintsOf(a.fills),
      strokes: paintsOf(a.strokes),
      effects: Array.isArray(a.effects) ? a.effects.map((e) => ({ visible: e.visible, type: e.type })) : void 0,
      characters,
      mainComponentKey,
      role: readRole(node),
      // INSTANCE 안은 자식 컴포넌트 소관 — 접힘 비교·속성 노출과 동일하게 펼치지 않음.
      children: node.type === "INSTANCE" ? [] : kids.map(toStructNode)
    };
  }
  function ownComponentLayersWithPath(root) {
    const out = [];
    const walk3 = (n, path) => {
      if (n !== root) out.push({ node: n, path });
      if (n.type === "INSTANCE") return;
      if (!("children" in n)) return;
      const kids = n.children;
      for (let i = 0; i < kids.length; i++) {
        walk3(kids[i], path === "" ? String(i) : `${path}/${i}`);
      }
    };
    walk3(root, "");
    return out;
  }
  function ownComponentLayers(root) {
    return ownComponentLayersWithPath(root).map((x) => x.node);
  }
  function structAtPathVectorKey(root, path) {
    var _a, _b;
    let cur = root;
    for (const seg of path.split("/").filter(Boolean)) {
      const kids = (_a = cur == null ? void 0 : cur.children) != null ? _a : [];
      cur = kids[Number(seg)];
      if (!cur) return null;
    }
    return (_b = cur == null ? void 0 : cur.vectorKey) != null ? _b : null;
  }
  function propDefaultFor(target, type) {
    if (type === "TEXT") return target.type === "TEXT" ? target.characters : "";
    if (type === "BOOLEAN") return target.visible;
    return target.type === "INSTANCE" && target.mainComponent ? target.mainComponent.key || target.mainComponent.id : "";
  }
  function isEffectivelyVisible3(node) {
    let p = node;
    while (p) {
      if ("visible" in p && p.visible === false) return false;
      p = p.parent;
    }
    return true;
  }
  function sceneComponentEligible(n) {
    if (!isEffectivelyVisible3(n)) return false;
    if (n.type === "FRAME" || n.type === "GROUP") return componentEligible(n);
    return componentEligible({ id: n.id, name: n.name, type: n.type, locked: n.locked, visible: n.visible, role: readRole(n) });
  }
  function resolvePropTarget(root, p) {
    var _a;
    if (p.layerPath != null && p.layerPath !== "") {
      return nodeAtPath(root, p.layerPath);
    }
    return (_a = ownComponentLayers(root).find((l) => l.name === p.layerName)) != null ? _a : null;
  }
  function propValuesFromNode(root, plan) {
    return propValuesFromStruct(toStructNode(root), plan);
  }
  function exposeProperties(container, scopes) {
    const rep = scopes[0];
    if (!rep) return [];
    const layered = ownComponentLayersWithPath(rep);
    const plan = inferComponentProperties(
      layered.map(({ node, path }) => ({
        name: node.name,
        type: node.type,
        path,
        characters: node.type === "TEXT" ? node.characters : void 0
      }))
    );
    return exposePropertiesFromPlan(container, scopes, plan);
  }
  function exposePropertiesFromPlan(container, scopes, plan) {
    var _a;
    const out = [];
    for (const p of plan) {
      const repTarget = resolvePropTarget(scopes[0], p);
      if (!repTarget) continue;
      try {
        const id = container.addComponentProperty(p.propName, p.type, propDefaultFor(repTarget, p.type));
        for (const scope of scopes) {
          const target = resolvePropTarget(scope, p);
          if (!target) continue;
          const refs = __spreadValues({}, (_a = target.componentPropertyReferences) != null ? _a : {});
          refs[p.field] = id;
          target.componentPropertyReferences = refs;
        }
        out.push(`${p.propName}:${p.type}`);
      } catch (e) {
      }
    }
    return out;
  }
  function isAncestorOf(a, b) {
    let p = b.parent;
    while (p) {
      if (p.id === a.id) return true;
      p = p.parent;
    }
    return false;
  }
  function groupForRegister(nodes) {
    const liveById = new Map(nodes.map((n) => [n.id, n]));
    return groupByExactName(nodes.map(toStructNode)).map((g) => {
      const live = g.members.map((m) => liveById.get(m.id)).filter((n) => !!n);
      const members = g.members.filter((m) => {
        const node = liveById.get(m.id);
        return node ? !live.some((o) => o.id !== node.id && isAncestorOf(node, o)) : false;
      });
      return { key: g.key, members };
    }).filter((g) => g.members.length > 0);
  }
  function orderInnerFirst(groups, byId) {
    const liveOf = (g) => g.members.map((m) => byId.get(m.id)).filter((n) => !!n);
    const docDepth = (n) => {
      let d = 0;
      let p = n.parent;
      while (p && p.type !== "PAGE" && p.type !== "DOCUMENT") {
        d++;
        p = p.parent;
      }
      return d;
    };
    const groupDepth = (g) => Math.max(0, ...liveOf(g).map(docDepth));
    const containsRemaining = (x, rest) => rest.some((y) => y !== x && liveOf(y).some((b) => liveOf(x).some((a) => a.id !== b.id && isAncestorOf(a, b))));
    const remaining = [...groups].sort((a, b) => groupDepth(b) - groupDepth(a));
    const out = [];
    while (remaining.length) {
      let idx = remaining.findIndex((x) => !containsRemaining(x, remaining));
      if (idx < 0) idx = 0;
      out.push(remaining.splice(idx, 1)[0]);
    }
    return out;
  }
  figma.ui.onmessage = async (msg) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
    try {
      switch (msg.type) {
        case "EXTRACT": {
          const sel = selection();
          const { tokens, warnings } = extractFromSelection(sel);
          post({ type: "EXTRACT_RESULT", tokens, warnings, selection: sel.length });
          break;
        }
        case "CREATE_TOKENS": {
          if (!msg.preview && !requirePaid("tokens")) break;
          const s = msg.preview ? await previewCreateTokens(msg.tokens, msg.base) : await createTokens(msg.tokens, msg.base);
          const pruned = !msg.preview && msg.replacePalette ? await prunePaletteColors(msg.tokens.map((t2) => t2.name)) : 0;
          let summary = t("create.sumGlobals", { n: s.globals, c: s.created, u: s.updated });
          if (pruned) summary += t("create.sumPruned", { n: pruned });
          if (s.conversions.length) {
            const px = (n) => String(Math.round(n * 100) / 100);
            const ex = s.conversions.slice(0, 2).map((c) => `${c.from}\u2192${px(c.to)}px`).join(", ");
            const morePart = s.conversions.length > 2 ? t("create.sumBaseMore") : "";
            summary += t("create.sumBase", { base: msg.base, n: s.conversions.length, examples: ex, morePart });
          }
          post({ type: "CREATE_RESULT", created: s.created, updated: s.updated, summary, preview: msg.preview });
          if (!msg.preview) {
            commitUndo(figma);
            await postPrereq();
          }
          break;
        }
        case "APPLY": {
          bindCancel = false;
          const r = await bindSelection(
            selection(),
            !msg.preview,
            {
              onProgress: (done, total) => post({ type: "PROGRESS", op: "bind", done, total }),
              shouldCancel: () => bindCancel,
              yieldToEvents: () => new Promise((resolve) => setTimeout(resolve, 0))
            }
          );
          post({
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
            // 사유별 건너뛴 레이어(dry-run만 · 상한까지)
            skipTotal: r.skipTotal,
            // 상한 전 실제 수 — 잘렸으면 UI가 알린다
            candidateTotal: r.candidateTotal,
            // 결과/미리보기 목록 상한 전 실제 수
            reqId: msg.reqId
            // UI가 낡은 응답을 가려낸다
          });
          if (!msg.preview) {
            commitUndo(figma);
            selfSelect = true;
            postSelection();
          }
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
          const r = await bindSelectedItems(msg.items);
          const bound = r.bound;
          post({ type: "APPLY_RESULT", bound, skipped: r.skipped, reasons: r.reasons, skips: r.skips, skipTotal: r.skipTotal, reqId: msg.reqId });
          if (bound) {
            commitUndo(figma);
            selfSelect = true;
            postSelection();
          }
          break;
        }
        case "RENAME": {
          const r = await renameSelection(selection(), { apply: msg.apply, maxDepth: msg.maxDepth });
          post({ type: "RENAME_RESULT", changes: r.changes, nodes: r.nodes, applied: r.applied });
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
          for (const { id, before: expectedBefore, after, role } of msg.items) {
            const node = await figma.getNodeByIdAsync(id);
            if (!node || !("name" in node)) continue;
            const before = node.name;
            if (before !== expectedBefore) continue;
            if (before !== after) node.name = after;
            if (role ? writeRole(node, role) : writeRoleFromName(node, after)) {
              roleWrites++;
            }
            if (before === after) continue;
            changes.push({ id, before, after });
          }
          post({ type: "RENAME_RESULT", changes, nodes: [], applied: true });
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
          post({ type: "SEMANTICS_RESULT", created: s.created, updated: s.updated, aliased: s.aliased, missing: s.missing });
          commitUndo(figma);
          await postPrereq();
          break;
        }
        case "SCAN_TEXT_STYLES": {
          if (!requirePaid("textStyles")) break;
          const { samples, warnings } = await scanTextStyles(selection());
          lastTextSamples = samples;
          const existing = await scanExistingTextStyles();
          const styles = nameTextStyles(clusterTextStyles(samples), existing);
          post({ type: "TEXT_STYLE_CANDIDATES", styles, warnings });
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
          post({ type: "TEXT_STYLE_CANDIDATES", styles: r.styles, warnings: [], labeled: r.labeled, fallback: r.fallback });
          break;
        }
        case "CREATE_TEXT_STYLES": {
          if (!requireTextStyles()) break;
          const r = await createSemanticTextStyles(msg.styles);
          post({ type: "TEXT_STYLES_RESULT", created: r.created, updated: r.updated, bound: r.bound, missing: r.missing, notes: r.notes });
          commitUndo(figma);
          await postPrereq();
          break;
        }
        case "APPLY_TEXT_STYLES": {
          const r = await applyExistingTextStyles(selection());
          post({ type: "TEXT_STYLES_APPLIED", applied: r.applied, skipped: r.skipped, skipReasons: r.skipReasons });
          commitUndo(figma);
          break;
        }
        case "GET_COLLECTIONS": {
          const cols = await figma.variables.getLocalVariableCollectionsAsync();
          post({ type: "COLLECTIONS", collections: cols.map((c) => ({ id: c.id, name: c.name })) });
          postSelection();
          break;
        }
        case "GET_COLLECTION_ROLES": {
          post({ type: "COLLECTION_ROLES", collections: await collectionRoleInfos() });
          break;
        }
        case "SET_COLLECTION_ROLE": {
          writeRoleMap(assignRole(readRoleMap(), msg.collectionId, msg.role));
          post({ type: "COLLECTION_ROLES", collections: await collectionRoleInfos() });
          await postPrereq();
          post({ type: "VARIABLES", vars: await collectVars() });
          break;
        }
        case "GET_PREREQ": {
          await postPrereq();
          break;
        }
        case "GET_GLOBAL_COLORS": {
          const cols = await figma.variables.getLocalVariableCollectionsAsync();
          const globalCol = findCollection(cols, "global");
          const colors = [];
          if (globalCol) {
            const mode = globalCol.defaultModeId;
            for (const v of await figma.variables.getLocalVariablesAsync()) {
              if (v.variableCollectionId !== globalCol.id || v.resolvedType !== "COLOR") continue;
              const raw = v.valuesByMode[mode];
              if (raw && typeof raw === "object" && "r" in raw) colors.push({ name: v.name, hex: rgbToHex(raw) });
            }
          }
          post({ type: "GLOBAL_COLORS", colors });
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
          const tiers = collectionTiers(cols);
          const vars = await figma.variables.getLocalVariablesAsync();
          const nameById = new Map(vars.map((v) => [v.id, v.name]));
          const tokens = [];
          for (const v of vars) {
            const col = colById.get(v.variableCollectionId);
            const tier = col ? tiers.get(col.id) : 0;
            if (!col || tier !== 1 && tier !== 2) continue;
            const raw = v.valuesByMode[col.defaultModeId];
            const t2 = {
              name: v.name,
              collection: tier === 1 ? "Global" : "Semantic",
              // 출력 그룹은 계층 이름(컬렉션 실제 이름과 무관)
              type: v.resolvedType,
              kind: kindOf(v)
            };
            if (v.description) t2.description = v.description;
            if (raw && typeof raw === "object" && "type" in raw && raw.type === "VARIABLE_ALIAS") {
              const target = nameById.get(raw.id);
              if (!target) continue;
              t2.aliasOf = target;
            } else if (v.resolvedType === "COLOR" && raw && typeof raw === "object" && "r" in raw) {
              t2.value = rgbToHex(raw);
            } else {
              t2.value = raw;
            }
            tokens.push(t2);
          }
          tokens.sort((a, b) => a.name.localeCompare(b.name));
          const styles = (await figma.getLocalTextStylesAsync()).map((st) => ({
            name: st.name,
            fontFamily: st.fontName.family,
            fontStyle: st.fontName.style,
            fontSize: st.fontSize,
            lineHeight: st.lineHeight.unit === "AUTO" ? { unit: "auto", value: 0 } : { unit: st.lineHeight.unit === "PERCENT" ? "percent" : "px", value: st.lineHeight.value },
            letterSpacing: { unit: st.letterSpacing.unit === "PERCENT" ? "percent" : "px", value: st.letterSpacing.value }
          }));
          styles.sort((a, b) => a.name.localeCompare(b.name));
          const content = exportTokens(tokens, {
            format: msg.format,
            fontSizeUnit: msg.fontSizeUnit,
            base: msg.base
          }, styles);
          post({ type: "EXPORT_RESULT", format: msg.format, content });
          break;
        }
        case "SCAN_COMPONENT_CANDIDATES": {
          if (!requireComponents()) break;
          const roots = selection().filter(isEffectivelyVisible3);
          const candidates = scanComponentCandidates(roots.map(toStructNode));
          const liveById = /* @__PURE__ */ new Map();
          const index = (n) => {
            if (n.visible === false) return;
            liveById.set(n.id, n);
            if (n.type === "INSTANCE" || n.type === "COMPONENT" || n.type === "COMPONENT_SET") return;
            if ("children" in n) for (const c of n.children) index(c);
          };
          for (const r of roots) index(r);
          const gated = candidates.map((c) => {
            const live = liveById.get(c.id);
            if (!live || !isEffectivelyVisible3(live)) return __spreadProps(__spreadValues({}, c), { eligible: false });
            return c;
          });
          const byCand = new Map(gated.map((c) => [c.id, c]));
          const keepIds = new Set(gated.filter((c) => c.eligible).map((c) => c.id));
          for (const c of gated) {
            if (!c.eligible) continue;
            let p = c.parentId;
            while (p && !keepIds.has(p)) {
              keepIds.add(p);
              p = (_b = (_a = byCand.get(p)) == null ? void 0 : _a.parentId) != null ? _b : null;
            }
          }
          const pruned = gated.filter((c) => keepIds.has(c.id));
          let nodes = pruned;
          try {
            const eligibleNodes = pruned.filter((c) => c.eligible).map((c) => liveById.get(c.id)).filter((n) => !!n);
            const groups = groupForRegister(eligibleNodes);
            const groupNames = resolveGroupNames(
              groups.map((g) => g.members),
              await existingComponentNames(new Set(eligibleNodes.map((n) => n.id)))
            );
            const preview = /* @__PURE__ */ new Map();
            groups.forEach((g, gi) => {
              const name = groupNames[gi];
              if (g.members.length < 2) {
                if (g.members[0]) preview.set(g.members[0].id, { single: name });
                return;
              }
              if (shouldCollapseToProperties(g.members)) {
                for (const m of g.members) preview.set(m.id, { single: name, propsOnly: true });
                return;
              }
              for (const d of deriveVariants(g.members)) preview.set(d.id, { group: name, variant: d.variant });
            });
            nodes = pruned.map((c) => {
              const p = preview.get(c.id);
              return p ? __spreadValues(__spreadValues({}, c), p) : c;
            });
          } catch (e) {
            console.warn("component preview label failed", e);
          }
          post({ type: "COMPONENT_CANDIDATES", nodes });
          break;
        }
        case "REGISTER_COMPONENTS": {
          if (!requireComponents()) break;
          await figma.loadAllPagesAsync();
          let registered = 0;
          let skipped = 0;
          const eligible = (n) => sceneComponentEligible(n);
          let targets;
          let setsOnly = false;
          if (msg.nodeIds && msg.nodeIds.length) {
            targets = [];
            for (const id of msg.nodeIds) {
              const n = await figma.getNodeByIdAsync(id);
              if (n && "type" in n) targets.push(n);
              else skipped++;
            }
          } else {
            const roots = [...selection()];
            const single = roots.length === 1;
            const collected = [];
            const walk3 = (n, depth) => {
              if (n.visible === false) return;
              const isContainerRoot = single && depth === 0;
              if (!isContainerRoot && eligible(n)) collected.push(n);
              if (n.type === "INSTANCE" || n.type === "COMPONENT" || n.type === "COMPONENT_SET") return;
              if ("children" in n) for (const c of n.children) walk3(c, depth + 1);
            };
            for (const r of roots) walk3(r, 0);
            targets = collected;
            setsOnly = true;
          }
          const valid = [];
          for (const n of targets) {
            if (eligible(n)) valid.push(n);
            else skipped++;
          }
          const byId = new Map(valid.map((n) => [n.id, n]));
          let groups = groupForRegister(valid);
          if (setsOnly) groups = groups.filter((g) => g.members.length >= 2);
          if (!groups.length) {
            post({ type: "COMPONENTS_RESULT", registered: 0, skipped, sets: 0, singles: [], missing: [], failures: [] });
            break;
          }
          groups = orderInnerFirst(groups, byId);
          const page = await ensureComponentsPage();
          let cursorX = pageStartX(page);
          let sets = 0;
          const singles = [];
          const failures = [];
          const containers = [];
          let exposedEarly = 0;
          const origins = [];
          const placeFailed = [];
          const placeCloned = [];
          const propFailed = [];
          const fillKept = [];
          const captureOrigin2 = (n) => {
            const o = captureOrigin(n);
            origins.push(o);
            return o;
          };
          const placeOnPage = (n) => {
            page.appendChild(n);
            n.x = cursorX;
            n.y = 0;
            cursorX += n.width + 48;
          };
          const restore = (places) => {
            places.sort((a, b) => {
              var _a2, _b2, _c2, _d2;
              const pa = (_b2 = (_a2 = a.o.parent) == null ? void 0 : _a2.id) != null ? _b2 : "";
              const pb = (_d2 = (_c2 = b.o.parent) == null ? void 0 : _c2.id) != null ? _d2 : "";
              return pa === pb ? a.o.index - b.o.index : pa < pb ? -1 : 1;
            });
            for (const { o, make, label } of places) {
              const why = [];
              const before = propFailed.length;
              const r = fillOrigin(make, o, (w) => why.push(w));
              tallyFill({ placeCloned, placeFailed, propFailed }, r, o.name, before);
              if (r === "instance") continue;
              const causePart = why.length ? t("component.fail.cause", { why: why.join(" \xB7 ") }) : "";
              if (r === "copy") failures.push(t("component.fail.copyPlaced", { label, name: o.name, causePart }));
              else failures.push(t("component.fail.nothingPlaced", { label, name: o.name, causePart }));
            }
          };
          const keepRoots = [];
          const instanceOf = (comp, name) => () => {
            const inst = comp.createInstance();
            keepRoots.push({ node: inst, name });
            return inst;
          };
          const placeSingle = (comp, o, name) => {
            try {
              comp.name = name;
            } catch (e) {
            }
            placeOnPage(comp);
            singles.push(comp.name);
            containers.push({ container: comp, scopes: [comp] });
            restore([{ o, make: instanceOf(comp, o.name), label: comp.name }]);
          };
          const existingNames = await existingComponentNames(new Set(valid.map((n) => n.id)));
          const resolved = resolveGroupNames(
            groups.map((g) => g.members),
            existingNames
          );
          const takenNames = /* @__PURE__ */ new Set([...existingNames, ...resolved]);
          const iconRegistry = createIconRegistry({
            page,
            place: placeOnPage,
            uniqueName: (base) => {
              const b = pascalCase(base) || "Icon";
              let n = b;
              let i = 2;
              while (takenNames.has(n)) n = `${b}${i++}`;
              takenNames.add(n);
              return n;
            },
            onFailure: (m) => failures.push(m)
          });
          const shownNames = (_c = msg.names) != null ? _c : {};
          const groupNames = groups.map((g, gi) => {
            const shown = g.members.map((m) => shownNames[m.id]).find((n) => !!n);
            return shown != null ? shown : resolved[gi];
          });
          try {
            for (let gi = 0; gi < groups.length; gi++) {
              const g = groups[gi];
              const setName = groupNames[gi];
              if (g.members.length === 1) {
                const node = byId.get(g.members[0].id);
                if (!node) continue;
                const o = captureOrigin2(node);
                try {
                  const comp = figma.createComponentFromNode(node);
                  registered++;
                  placeSingle(comp, o, setName);
                } catch (e) {
                  releaseOrigin(o);
                  skipped++;
                  failures.push(t("component.fail.single", { name: g.members[0].name, error: errText(e) }));
                }
                continue;
              }
              if (shouldCollapseToProperties(g.members)) {
                const live = [];
                for (const m of g.members) {
                  const n = byId.get(m.id);
                  if (n) live.push(n);
                }
                if (live.length < 2) {
                  if (live[0]) {
                    const o = captureOrigin2(live[0]);
                    try {
                      const comp = figma.createComponentFromNode(live[0]);
                      registered++;
                      placeSingle(comp, o, setName || pascalCase(live[0].name));
                    } catch (e) {
                      releaseOrigin(o);
                      skipped++;
                      failures.push(t("component.fail.propsRegister", { set: setName, error: errText(e) }));
                    }
                  }
                  continue;
                }
                const structs = live.map(toStructNode);
                const plan = inferVaryingComponentProperties(structs);
                const imageSlots = inferVaryingImageSlots(structs);
                const vectorPlans = plan.filter((p) => p.fromVector && p.layerPath != null);
                const imagesOf = (root) => {
                  const out = {};
                  for (const s of imageSlots) {
                    const n = nodeAtPath(root, s.layerPath);
                    const f = n && "fills" in n ? n.fills : null;
                    if (Array.isArray(f)) out[s.layerPath] = f;
                  }
                  return out;
                };
                let iconsReady = true;
                for (let i = 0; i < live.length; i++) {
                  for (const p of vectorPlans) {
                    const node = nodeAtPath(live[i], p.layerPath);
                    const key = structAtPathVectorKey(structs[i], p.layerPath);
                    const icon = node && key ? iconRegistry.ensure(key, node, p.layerName) : null;
                    if (!icon) iconsReady = false;
                  }
                }
                if (!iconsReady) {
                  failures.push(t("component.fail.iconFallback", { set: setName }));
                } else {
                  const snaps = live.map((n) => ({ n, vals: propValuesFromNode(n, plan), images: imagesOf(n) }));
                  const preferLive = pickCollapseMasterIndex(structs);
                  const masterSnap = (_d = snaps[preferLive]) != null ? _d : snaps[0];
                  const masterOrigin = captureOrigin2(masterSnap.n);
                  let master;
                  try {
                    master = figma.createComponentFromNode(masterSnap.n);
                  } catch (e) {
                    releaseOrigin(masterOrigin);
                    skipped++;
                    failures.push(t("component.fail.propsComponentize", { name: masterSnap.n.name, error: errText(e) }));
                    continue;
                  }
                  try {
                    master.name = setName || pascalCase(masterSnap.n.name);
                  } catch (e) {
                  }
                  const prefix = shapePrefix(master, (_f = (_e = structs[preferLive]) == null ? void 0 : _e.type) != null ? _f : "");
                  placeOnPage(master);
                  keepRoots.push({ node: master, name: master.name });
                  singles.push(master.name);
                  registered++;
                  failures.push(
                    ...swapVectorSlots(
                      master,
                      vectorPlans.map((p) => {
                        var _a2;
                        return {
                          layerName: p.layerName,
                          layerPath: joinPath(prefix, p.layerPath),
                          icon: iconRegistry.get(String((_a2 = masterSnap.vals[p.propName]) != null ? _a2 : ""))
                        };
                      })
                    )
                  );
                  let collapsedExposed = 0;
                  try {
                    collapsedExposed = exposePropertiesFromPlan(master, [master], plan).length;
                  } catch (e) {
                    failures.push(t("component.fail.expose", { name: master.name, error: errText(e) }));
                  }
                  exposedEarly += collapsedExposed;
                  const ids = propIdsByName(master);
                  const makerFor = (snap, name) => {
                    var _a2;
                    const vals = __spreadValues({}, snap.vals);
                    for (const p of vectorPlans) {
                      const icon = iconRegistry.get(String((_a2 = vals[p.propName]) != null ? _a2 : ""));
                      if (icon) vals[p.propName] = icon.key || icon.id;
                      else delete vals[p.propName];
                    }
                    const images = {};
                    for (const [path, paints3] of Object.entries(snap.images)) images[joinPath(prefix, path)] = paints3;
                    let noted = false;
                    return () => {
                      let inst = null;
                      try {
                        inst = master.createInstance();
                        keepRoots.push({ node: inst, name });
                        const badProps = applyInstancePropValues(inst, ids, vals);
                        const img = transplantImageFills(inst, images).failures;
                        if (!noted) {
                          noted = true;
                          for (const p of badProps) failures.push(t("component.fail.propValue", { name, prop: p }));
                          failures.push(...img.map((f) => `${name}: ${f}`));
                          if (badProps.length || img.length) propFailed.push(name);
                        }
                        return inst;
                      } catch (e) {
                        if (inst) {
                          try {
                            if (!inst.removed) inst.remove();
                          } catch (e2) {
                          }
                        }
                        throw e;
                      }
                    };
                  };
                  restore([{ o: masterOrigin, make: makerFor(masterSnap, masterOrigin.name), label: master.name }]);
                  for (const snap of snaps) {
                    if (snap === masterSnap) continue;
                    const name = snap.n.name;
                    const before = propFailed.length;
                    const r = replaceMember(snap.n, makerFor(snap, name), prefix);
                    if (r.result === "replaced") continue;
                    if (propFailed.length > before) propFailed.splice(before);
                    if (r.result === "mismatch") {
                      fillKept.push(name);
                      failures.push(t("component.fail.fillKept", { name, causePart: t("component.fail.cause", { why: (_g = r.why) != null ? _g : "" }) }));
                    } else {
                      placeFailed.push(name);
                      failures.push(t("component.fail.memberKept", { name, causePart: r.why ? t("component.fail.cause", { why: r.why }) : "" }));
                    }
                  }
                  continue;
                }
              }
              const variantById = new Map(deriveVariants(g.members).map((d) => [d.id, d.variant]));
              const made = [];
              for (const m of g.members) {
                const node = byId.get(m.id);
                if (!node) continue;
                const o = captureOrigin2(node);
                try {
                  made.push({ comp: figma.createComponentFromNode(node), variant: (_h = variantById.get(m.id)) != null ? _h : "", o });
                  registered++;
                } catch (e) {
                  releaseOrigin(o);
                  skipped++;
                  failures.push(t("component.fail.componentize", { name: m.name, error: errText(e) }));
                }
              }
              if (made.length < 2) {
                for (const x of made) placeSingle(x.comp, x.o, setName);
                continue;
              }
              let set;
              try {
                const home = (_i = pageOf(made[0].comp)) != null ? _i : figma.currentPage;
                set = figma.combineAsVariants(made.map((x) => x.comp), home);
              } catch (e) {
                failures.push(t("component.fail.combine", { set: setName, error: errText(e) }));
                for (const x of made) placeSingle(x.comp, x.o, setName);
                continue;
              }
              set.name = setName;
              for (const x of made) if (x.variant) x.comp.name = x.variant;
              page.appendChild(set);
              try {
                arrangeSet(set);
              } catch (e) {
                failures.push(t("component.fail.arrange", { set: set.name, error: errText(e) }));
              }
              set.x = cursorX;
              set.y = 0;
              cursorX += set.width + 48;
              sets++;
              containers.push({ container: set, scopes: made.map((x) => x.comp) });
              restore(made.map((x) => ({ o: x.o, make: instanceOf(x.comp, x.o.name), label: x.variant || set.name })));
            }
          } finally {
            for (const o of origins) releaseOrigin(o);
          }
          for (const c of containers) keepRoots.push({ node: c.container, name: c.container.name });
          const mainOf = (n) => n.getMainComponentAsync();
          const keepSnaps = [];
          const seen = /* @__PURE__ */ new Set();
          for (let k = 0; k < keepRoots.length; k++) {
            const { node } = keepRoots[k];
            if (node.removed) continue;
            try {
              for (const sn of await snapshotOverrides(node, k, mainOf)) if (!seen.has(sn.instId)) {
                seen.add(sn.instId);
                keepSnaps.push(sn);
              }
            } catch (e) {
            }
          }
          let exposed = exposedEarly;
          for (const c of containers) {
            try {
              exposed += exposeProperties(c.container, c.scopes).length;
            } catch (e) {
              failures.push(t("component.fail.exposeAll", { error: errText(e) }));
            }
          }
          const keepFailed = await restoreOverrides(keepSnaps, (id) => figma.getNodeByIdAsync(id), mainOf, (f) => figma.loadFontAsync(f));
          for (const [k, props] of keepFailed) {
            const name = keepRoots[k].name;
            for (const prop of props) failures.push(t("component.fail.propValue", { name, prop }));
            propFailed.push(name);
          }
          post({ type: "COMPONENTS_RESULT", registered, skipped, sets, singles, exposed, icons: iconRegistry.created(), missing: [], failures, placeFailed, placeCloned, propFailed, fillKept });
          if (registered || sets) commitUndo(figma);
          break;
        }
        case "CLASSIFY_VARIANTS": {
          if (!requireComponents()) break;
          const comps = selection().filter(
            (n) => {
              var _a2;
              return n.type === "COMPONENT" && ((_a2 = n.parent) == null ? void 0 : _a2.type) !== "COMPONENT_SET";
            }
          );
          const byId = new Map(comps.map((c) => [c.id, c]));
          const groups = groupByExactName(comps.map(toStructNode));
          let sets = 0;
          const missing = [];
          const singles = [];
          const failures = [];
          const groupNames = resolveGroupNames(
            groups.map((g) => g.members),
            await existingComponentNames(new Set(comps.map((c) => c.id)))
          );
          for (let gi = 0; gi < groups.length; gi++) {
            const g = groups[gi];
            const nodes = g.members.map((m) => byId.get(m.id)).filter((n) => !!n);
            if (nodes.length < 2) {
              if (nodes[0]) singles.push(nodes[0].name);
              continue;
            }
            const variantById = new Map(deriveVariants(g.members).map((d) => [d.id, d.variant]));
            try {
              const parent = (_j = nodes[0].parent) != null ? _j : figma.currentPage;
              const set = figma.combineAsVariants(nodes, parent);
              set.name = groupNames[gi];
              for (const m of g.members) {
                const node = byId.get(m.id);
                const v = variantById.get(m.id);
                if (node && v) node.name = v;
              }
              try {
                arrangeSet(set);
              } catch (e) {
                failures.push(t("component.fail.arrange", { set: set.name, error: errText(e) }));
              }
              const childNames = set.children.filter((c) => c.type === "COMPONENT").map((c) => c.name);
              const miss = missingVariants(childNames);
              if (miss.length) missing.push(`${set.name}: ${miss.join(" / ")}`);
              sets++;
            } catch (e) {
              failures.push(t("component.fail.combine", { set: groupNames[gi], error: errText(e) }));
            }
          }
          post({ type: "VARIANTS_RESULT", sets, missing, singles, failures });
          if (sets) commitUndo(figma);
          break;
        }
        case "GENERATE_MISSING_VARIANTS": {
          if (!requireComponents()) break;
          const sets = selection().filter((n) => n.type === "COMPONENT_SET");
          let generated = 0;
          const combos = [];
          for (const set of sets) {
            const children = set.children.filter((c) => c.type === "COMPONENT");
            if (!children.length) continue;
            const missing = missingVariants(children.map((c) => c.name));
            const src = children[0];
            for (const combo of missing) {
              try {
                const clone = src.clone();
                clone.name = combo;
                set.appendChild(clone);
                generated++;
                combos.push(`${set.name}: ${combo}`);
              } catch (e) {
              }
            }
            if (missing.length) arrangeSet(set);
          }
          post({ type: "GENERATE_RESULT", generated, sets: sets.length, combos });
          if (generated) commitUndo(figma);
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
          const r = await generateDarkMode(msg.collectionId, msg.fromModeId, msg.toModeId);
          post(__spreadValues({ type: "DARK_MODE_RESULT" }, r));
          if (r.created || r.realiased || r.modeCreated) {
            commitUndo(figma);
            await postPrereq();
          }
          post({ type: "VARIABLES", vars: await collectVars() });
          break;
        }
        case "SCAN_SIMILAR": {
          const frames = selection().filter((n) => n.type === "FRAME" || n.type === "GROUP" || n.type === "COMPONENT");
          const r = await scanSimilar(frames);
          post({
            type: "SIMILAR_CANDIDATES",
            metas: r.metas,
            recommendedMasterId: r.recommendedMasterId,
            varying: r.varying,
            imageVarying: r.imageVarying,
            excluded: r.excluded
          });
          break;
        }
        case "COMPONENTIZE_SIMILAR": {
          if (!requirePaid("components")) break;
          const master = await figma.getNodeByIdAsync(msg.masterId);
          if (!master || master.type !== "FRAME" && master.type !== "GROUP") {
            post({ type: "COMPONENTIZE_RESULT", master: "", properties: 0, instances: 0, images: 0, warnings: [t("similar.noMaster")], placeFailed: [] });
            break;
          }
          const memberNodes = [];
          for (const id of msg.frameIds) {
            const n = await figma.getNodeByIdAsync(id);
            if (n && "type" in n) memberNodes.push(n);
          }
          if (memberNodes.length < 2) {
            post({ type: "COMPONENTIZE_RESULT", master: "", properties: 0, instances: 0, images: 0, warnings: [t("similar.tooFew")], placeFailed: [] });
            break;
          }
          const r = await componentizeSimilar(master, memberNodes);
          post(componentizeResultMessage(r));
          if (r.instances) commitUndo(figma);
          break;
        }
      }
    } catch (err) {
      post({ type: "ERROR", message: err instanceof Error ? err.message : String(err), op: msg == null ? void 0 : msg.type });
    }
  };
})();
