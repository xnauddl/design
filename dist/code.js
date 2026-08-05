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

  // src/lib/tokens.ts
  var clamp01 = (n) => Math.min(1, Math.max(0, n));
  var to255 = (c) => Math.round(clamp01(c) * 255);
  function rgbToHex(rgb) {
    const h = (c) => to255(c).toString(16).padStart(2, "0");
    return `#${h(rgb.r)}${h(rgb.g)}${h(rgb.b)}`.toLowerCase();
  }
  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) throw new Error(`\uC798\uBABB\uB41C hex: ${hex}`);
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
  function resolvedTypeForToken(t) {
    return resolvedTypeFor(t.category);
  }
  function unitDescription(t) {
    if ((t.category === "lineHeight" || t.category === "letterSpacing") && t.unit && t.unit !== "px" && typeof t.value === "number") {
      return stringValueForUnit(t.value, t.unit);
    }
    return void 0;
  }
  function pxConversions(tokens, base) {
    var _a;
    const out = [];
    for (const t of tokens) {
      if (!t.unit || t.unit === "px" || typeof t.value !== "number") continue;
      out.push({
        name: t.name,
        from: stringValueForUnit(t.value, t.unit),
        // 토큰이 자기 폰트 크기를 알고 있으면 그것으로 환산(없으면 base) — setGlobalLiteral과 같은 규칙.
        to: toPx(t.value, t.unit, { base, fontSize: (_a = t.fontSize) != null ? _a : base })
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
    switch (role.split("/")[0].toLowerCase()) {
      case "text":
        return ["TEXT_FILL"];
      case "border":
        return ["STROKE_COLOR"];
      case "surface":
      case "background":
        return ["FRAME_FILL"];
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
  var round = (n, p = 2) => Math.round(n * 10 ** p) / 10 ** p;
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
      if (p.type === "SOLID") {
        const hex = rgbToHex(p.color);
        add(acc, { name: colorTokenName(hex), category: "color", value: hex }, source, nodeId);
        if (p.opacity != null && p.opacity < 1) {
          const o = round(p.opacity);
          add(acc, { name: numberTokenName("opacity", o), category: "opacity", value: o }, "opacity", node.id);
        }
      } else if (p.type.startsWith("GRADIENT") || p.type === "IMAGE" || p.type === "VIDEO") {
        acc.warnings.add("\uADF8\uB77C\uB514\uC5B8\uD2B8/\uC774\uBBF8\uC9C0 \uCC44\uC6C0\uC740 \uBCC0\uC218 \uBC14\uC778\uB529 \uBD88\uAC00 \u2014 \uC2A4\uD0B5\uD588\uC2B5\uB2C8\uB2E4.");
      }
    }
  }
  function collectText(acc, node) {
    if (node.fontSize !== figma.mixed) {
      const v = round(node.fontSize);
      add(acc, { name: numberTokenName("font-size", v), category: "fontSize", value: v }, "fontSize", node.id);
    }
    if (node.fontName !== figma.mixed) {
      const fam = node.fontName.family;
      add(acc, { name: `font-family/${fam}`, category: "fontFamily", value: fam }, "fontFamily", node.id);
    }
    if (node.lineHeight !== figma.mixed && node.lineHeight.unit !== "AUTO") {
      const lh = node.lineHeight;
      const unit = lh.unit === "PERCENT" ? "percent" : "px";
      const v = round(lh.value);
      add(acc, { name: numberTokenName("line-height", v), category: "lineHeight", value: v, unit }, "lineHeight", node.id);
    }
    if (node.letterSpacing !== figma.mixed) {
      const ls = node.letterSpacing;
      const unit = ls.unit === "PERCENT" ? "percent" : "px";
      const v = round(ls.value);
      add(acc, { name: numberTokenName("letter-spacing", v), category: "letterSpacing", value: v, unit }, "letterSpacing", node.id);
    }
  }
  function collectSpacing(acc, node) {
    if (node.layoutMode === "NONE") return;
    const gaps = [node.paddingLeft, node.paddingRight, node.paddingTop, node.paddingBottom];
    if (node.layoutMode === "GRID") {
      gaps.push(node.gridRowGap, node.gridColumnGap);
    } else {
      gaps.push(node.itemSpacing);
      if (typeof node.counterAxisSpacing === "number") gaps.push(node.counterAxisSpacing);
    }
    for (const g of gaps) {
      if (typeof g === "number" && g > 0) {
        const v = round(g);
        add(acc, { name: numberTokenName("spacing", v), category: "gap", value: v }, "gap", node.id);
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
        add(acc, { name: numberTokenName("radius", v), category: "radius", value: v }, "radius", node.id);
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
        add(acc, { name: numberTokenName("stroke-width", v), category: "strokeWidth", value: v }, "strokeWidth", node.id);
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
          add(acc, { name: numberTokenName(g, v), category: "effectFloat", value: v }, "effectFloat", node.id);
        }
      } else if (e.type === "LAYER_BLUR" || e.type === "BACKGROUND_BLUR") {
        const v = round(e.radius);
        add(acc, { name: numberTokenName("blur", v), category: "effectFloat", value: v }, "effectFloat", node.id);
      }
    }
  }
  function walk(acc, node) {
    if (node.visible === false) {
      acc.warnings.add("\uC228\uAE34 \uB808\uC774\uC5B4\uB294 \uD1A0\uD070 \uD6C4\uBCF4\uC5D0\uC11C \uC81C\uC678\uD588\uC2B5\uB2C8\uB2E4.");
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
      if (node.children.length) acc.warnings.add("\uC778\uC2A4\uD134\uC2A4 \uB0B4\uBD80\uB294 \uB9C8\uC2A4\uD130 \uBCF5\uC0AC\uBCF8\uC774\uB77C \uAC74\uB108\uB6F0\uC5C8\uC2B5\uB2C8\uB2E4 \u2014 \uAC12\uC774 \uD544\uC694\uD558\uBA74 \uCEF4\uD3EC\uB10C\uD2B8\uB97C \uC120\uD0DD\uD574 \uCD94\uCD9C\uD558\uC138\uC694.");
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
    const acc = { map: /* @__PURE__ */ new Map(), warnings: /* @__PURE__ */ new Set(), lastNode: /* @__PURE__ */ new Map() };
    for (const node of selection2) {
      if (!isEffectivelyVisible(node)) {
        acc.warnings.add("\uC228\uAE34 \uB808\uC774\uC5B4\uB294 \uD1A0\uD070 \uD6C4\uBCF4\uC5D0\uC11C \uC81C\uC678\uD588\uC2B5\uB2C8\uB2E4.");
        continue;
      }
      walk(acc, node);
    }
    const tokens = [...acc.map.values()].sort((a, b) => a.name.localeCompare(b.name));
    return { tokens, warnings: [...acc.warnings] };
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
  function relativeLuminance(rgb) {
    const r = srgbToLinear(rgb.r);
    const g = srgbToLinear(rgb.g);
    const b = srgbToLinear(rgb.b);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function contrastRatio(a, b) {
    const la = relativeLuminance(a);
    const lb = relativeLuminance(b);
    const hi = Math.max(la, lb);
    const lo = Math.min(la, lb);
    return (hi + 0.05) / (lo + 0.05);
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

  // src/lib/variables.ts
  var GLOBAL = "Global";
  var SEMANTIC = "Semantic";
  var COMPONENT = "Component";
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
    var _a, _b;
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const globalCol = (_a = cols.find((c) => c.name === GLOBAL)) != null ? _a : figma.variables.createVariableCollection(GLOBAL);
    const semanticCol = (_b = cols.find((c) => c.name === SEMANTIC)) != null ? _b : figma.variables.createVariableCollection(SEMANTIC);
    return { globalCol, semanticCol };
  }
  async function createTokens(tokens, base) {
    const { globalCol, semanticCol } = await resolveCollections();
    const gMode = globalCol.defaultModeId;
    const sMode = semanticCol.defaultModeId;
    const idx = await buildVarIndex();
    const summary = { created: 0, updated: 0, globals: 0, semantics: 0, conversions: pxConversions(tokens, base) };
    for (const t of tokens) {
      const type = resolvedTypeForToken(t);
      const g = upsertVariable(t.name, globalCol, type, idx);
      summary[g.created ? "created" : "updated"]++;
      summary.globals++;
      setGlobalLiteral(g.variable, gMode, t, type, base);
      g.variable.scopes = scopesForType(scopesForSources(t.sources), type);
      g.variable.hiddenFromPublishing = true;
      const desc = unitDescription(t);
      if (desc) g.variable.description = desc;
      const s = upsertVariable(t.name, semanticCol, type, idx);
      s.variable.setValueForMode(sMode, figma.variables.createVariableAlias(g.variable));
      s.variable.scopes = scopesForType(scopesForSources(t.sources), type);
      summary[s.created ? "created" : "updated"]++;
      summary.semantics++;
    }
    return summary;
  }
  async function previewCreateTokens(tokens, base) {
    var _a, _b, _c, _d;
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const gId = (_b = (_a = cols.find((c) => c.name === GLOBAL)) == null ? void 0 : _a.id) != null ? _b : "#G";
    const sId = (_d = (_c = cols.find((c) => c.name === SEMANTIC)) == null ? void 0 : _c.id) != null ? _d : "#S";
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
    for (const t of tokens) {
      tally(gId, t.name, "globals");
      tally(sId, t.name, "semantics");
    }
    return summary;
  }
  function setGlobalLiteral(v, modeId, t, type, base) {
    var _a;
    if (type === "COLOR") {
      const { r, g, b } = hexToRgb(String(t.value));
      v.setValueForMode(modeId, { r, g, b, a: 1 });
    } else if (type === "STRING") {
      v.setValueForMode(modeId, String(t.value));
    } else {
      const num = t.unit && t.unit !== "px" && typeof t.value === "number" ? toPx(t.value, t.unit, { base, fontSize: (_a = t.fontSize) != null ? _a : base }) : Number(t.value);
      v.setValueForMode(modeId, num);
    }
  }
  async function prunePaletteColors(keep) {
    const keepSet = new Set(keep);
    const keepFamilies = new Set(keep.map(paletteFamilyOf).filter((f) => f !== null));
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const palIds = new Set(cols.filter((c) => c.name === GLOBAL || c.name === SEMANTIC).map((c) => c.id));
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
    var _a, _b;
    const summary = { created: 0, updated: 0, aliased: 0, missing: [] };
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const globalCol = cols.find((c) => c.name === GLOBAL);
    if (!globalCol) {
      summary.missing = Object.values(map);
      return summary;
    }
    const semanticCol = (_a = cols.find((c) => c.name === SEMANTIC)) != null ? _a : figma.variables.createVariableCollection(SEMANTIC);
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
      u.variable.scopes = scopesForType((_b = scopeForSemanticRole(semName)) != null ? _b : g.scopes, g.resolvedType);
      summary[u.created ? "created" : "updated"]++;
      summary.aliased++;
    }
    return summary;
  }
  var roundN = (n, p = 2) => Math.round(n * 10 ** p) / 10 ** p;
  function walkText(node, out) {
    if (node.visible === false) return;
    if (node.type === "TEXT") out.push(node);
    else if ("children" in node) for (const c of node.children) walkText(c, out);
  }
  function scanTextStyles(nodes) {
    const texts = [];
    for (const n of nodes) walkText(n, texts);
    const samples = [];
    const warnings = /* @__PURE__ */ new Set();
    for (const t of texts) {
      if (t.fontSize === figma.mixed || t.fontName === figma.mixed) {
        warnings.add("\uBD80\uBD84 \uC11C\uC2DD(\uD63C\uD569) \uD14D\uC2A4\uD2B8\uB294 \uC2A4\uD0B5\uD588\uC2B5\uB2C8\uB2E4.");
        continue;
      }
      const fontSize = roundN(t.fontSize);
      const { family, style } = t.fontName;
      let lineHeight = 0;
      let lineHeightPercent = 0;
      const lh = t.lineHeight;
      if (lh !== figma.mixed && lh.unit !== "AUTO") {
        lineHeight = lh.unit === "PERCENT" ? roundN(fontSize * lh.value / 100) : roundN(lh.value);
        if (lh.unit === "PERCENT") lineHeightPercent = roundN(lh.value);
      }
      let letterSpacing = 0;
      const ls = t.letterSpacing;
      if (ls !== figma.mixed) letterSpacing = ls.unit === "PERCENT" ? roundN(fontSize * ls.value / 100) : roundN(ls.value);
      const sid = t.textStyleId;
      const styleId = sid === figma.mixed ? "" : sid;
      let characters = "";
      try {
        characters = t.characters;
      } catch (e) {
        characters = "";
      }
      let rowId;
      let indexInParent;
      const parent = t.parent;
      if (parent && "layoutMode" in parent && parent.layoutMode === "HORIZONTAL" && "children" in parent) {
        rowId = parent.id;
        indexInParent = parent.children.indexOf(t);
        if (indexInParent < 0) indexInParent = void 0;
      }
      samples.push({
        fontSize,
        lineHeight,
        lineHeightPercent,
        letterSpacing,
        family,
        style,
        layerName: t.name,
        styleId,
        characters,
        id: t.id,
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
  async function scanExistingTextStyles() {
    const out = [];
    for (const s of await figma.getLocalTextStylesAsync()) {
      const fontSize = roundN(s.fontSize);
      out.push({
        id: s.id,
        name: s.name,
        fontSize,
        lineHeight: lhPxOf(fontSize, s.lineHeight),
        letterSpacing: lsPxOf(fontSize, s.letterSpacing),
        family: s.fontName.family,
        style: s.fontName.style
      });
    }
    return out;
  }
  async function createSemanticTextStyles(specs, apply, nodes) {
    var _a, _b, _c, _d, _e;
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
        res.missing.push(`\uC774\uB984 \uCDA9\uB3CC '${st.name}'\u2192'${spec.name}' \u2014 \uC774\uBBF8 \uAC19\uC740 \uC774\uB984 \uC2A4\uD0C0\uC77C\uC774 \uC788\uC5B4 rename \uBCF4\uB958`);
        continue;
      }
      roleRenames.push({ from: st.name, to: spec.name });
    }
    if (roleRenames.length) {
      const cols0 = await figma.variables.getLocalVariableCollectionsAsync();
      const semId0 = (_a = cols0.find((c) => c.name === SEMANTIC)) == null ? void 0 : _a.id;
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
    const pushTok = (t) => {
      if (!seen.has(t.name)) {
        seen.add(t.name);
        tokens.push(t);
      }
    };
    const aliasMap = {};
    const lhTokens = /* @__PURE__ */ new Map();
    const pushLineHeightTok = (name, px, pct, fontSize) => {
      const prev = lhTokens.get(name);
      if (!prev) {
        const t = pct > 0 ? { name, category: "lineHeight", value: pct, unit: "percent", fontSize, sources: ["lineHeight"] } : { name, category: "lineHeight", value: px, unit: "px", sources: ["lineHeight"] };
        lhTokens.set(name, t);
        pushTok(t);
        return;
      }
      const prevPct = prev.unit === "percent" ? Number(prev.value) : 0;
      if (prevPct === pct && (pct === 0 || prev.fontSize === fontSize)) return;
      prev.value = px;
      prev.unit = "px";
      prev.fontSize = void 0;
      res.notes.push(`${name}: \uC5ED\uD560\uB9C8\uB2E4 \uD589\uAC04 \uC6D0\uBCF8\uC774 \uB2EC\uB77C px\uB85C \uAE30\uB85D(\uC6D0\uBCF8 \uD45C\uAE30 \uC0DD\uB7B5)`);
    };
    const pushAlias = (role, fontSize, lineHeight, letterSpacing, lineHeightPercent = 0) => {
      pushTok({ name: numberTokenName("font-size", fontSize), category: "fontSize", value: fontSize, sources: ["fontSize"] });
      aliasMap[`font-size/${role}`] = numberTokenName("font-size", fontSize);
      if (lineHeight > 0) {
        const lhName = numberTokenName("line-height", lineHeight);
        pushLineHeightTok(lhName, lineHeight, lineHeightPercent, fontSize);
        aliasMap[`line-height/${role}`] = lhName;
      }
      if (letterSpacing !== 0) {
        pushTok({ name: numberTokenName("letter-spacing", letterSpacing), category: "letterSpacing", value: letterSpacing, unit: "px", sources: ["letterSpacing"] });
        aliasMap[`letter-spacing/${role}`] = numberTokenName("letter-spacing", letterSpacing);
      }
    };
    for (const s of specs) {
      if (anchoredStyle(s)) continue;
      pushAlias(s.name, s.fontSize, s.lineHeight, s.letterSpacing, (_b = s.lineHeightPercent) != null ? _b : 0);
    }
    {
      const cols0 = await figma.variables.getLocalVariableCollectionsAsync();
      const semId0 = (_c = cols0.find((c) => c.name === SEMANTIC)) == null ? void 0 : _c.id;
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
        pushAlias(s.name, fontSize, lhPxOf(fontSize, st.lineHeight), lsPxOf(fontSize, st.letterSpacing), lhPctOf(st.lineHeight));
      }
    }
    if (tokens.length) await createTokens(tokens, 16);
    if (Object.keys(aliasMap).length) await createSemanticAliases(aliasMap);
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const semId = (_d = cols.find((c) => c.name === SEMANTIC)) == null ? void 0 : _d.id;
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
            res.missing.push(`${spec.name}: \uD3F0\uD2B8 ${spec.style}\u2192Regular`);
          } catch (e2) {
            res.missing.push(`${spec.name}: \uD3F0\uD2B8 '${spec.family}' \uC5C6\uC74C`);
            continue;
          }
        }
        style.fontName = loaded;
        style.fontSize = spec.fontSize;
        const pct = (_e = spec.lineHeightPercent) != null ? _e : 0;
        style.lineHeight = spec.lineHeight > 0 ? pct > 0 ? { value: pct, unit: "PERCENT" } : { value: spec.lineHeight, unit: "PIXELS" } : { unit: "AUTO" };
        style.letterSpacing = { value: spec.letterSpacing, unit: "PIXELS" };
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
          res.notes.push(`${bindRole}: \uD589\uAC04 ${pctNow}% \uC720\uC9C0 \u2014 \uBCC0\uC218 \uBC14\uC778\uB529 \uC0DD\uB7B5`);
        } else {
          const lhVar = semByName.get(`line-height/${bindRole}`);
          if (lhVar) {
            style.setBoundVariable("lineHeight", lhVar);
            res.bound++;
          } else if (spec.lineHeight > 0) res.missing.push(`line-height/${bindRole}`);
        }
      }
      if (spec.letterSpacing !== 0 || isRename) {
        const lsVar = semByName.get(`letter-spacing/${bindRole}`);
        if (lsVar) {
          style.setBoundVariable("letterSpacing", lsVar);
          res.bound++;
        } else if (spec.letterSpacing !== 0) res.missing.push(`letter-spacing/${bindRole}`);
      }
      res[created ? "created" : "updated"]++;
      styleByName.set(style.name, style);
    }
    if (apply) {
      const texts = [];
      for (const n of nodes) walkText(n, texts);
      const loaded = /* @__PURE__ */ new Set();
      const ensureFont = async (fn) => {
        const k = `${fn.family} ${fn.style}`;
        if (loaded.has(k)) return;
        await figma.loadFontAsync(fn);
        loaded.add(k);
      };
      let matched = 0;
      for (const t of texts) {
        if (t.fontSize === figma.mixed || t.fontName === figma.mixed) continue;
        const fontSize = roundN(t.fontSize);
        const fn = t.fontName;
        const lhPx = lhPxOf(fontSize, t.lineHeight);
        const lsPx = lsPxOf(fontSize, t.letterSpacing);
        const spec = specs.find(
          (s) => s.fontSize === fontSize && s.family === fn.family && s.style === fn.style && s.lineHeight === lhPx && s.letterSpacing === lsPx
        );
        if (!spec) continue;
        const ts = styleByName.get(spec.name);
        if (!ts) continue;
        matched++;
        try {
          await ensureFont(fn);
          await t.setTextStyleIdAsync(ts.id);
          res.applied++;
        } catch (e) {
          res.missing.push(`\uC801\uC6A9 \uC2E4\uD328 '${t.name}'(\uD3F0\uD2B8 \uB85C\uB4DC \uBD88\uAC00)`);
        }
      }
      if (texts.length === 0) res.missing.push("\uC801\uC6A9 \uB300\uC0C1 \uC5C6\uC74C \u2014 \uC120\uD0DD\uC5D0 \uD14D\uC2A4\uD2B8 \uB178\uB4DC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4(\uB4F1\uB85D \uD6C4 \uC120\uD0DD\uC774 \uD480\uB838\uC744 \uC218 \uC788\uC74C)");
      else if (matched === 0) res.missing.push("\uC801\uC6A9 \uB9E4\uCE6D 0 \u2014 \uC120\uD0DD\uC774 \uC2A4\uCE94\uACFC \uB2E4\uB974\uAC70\uB098 \uD3F0\uD2B8\xB7\uD06C\uAE30\xB7\uAD75\uAE30\xB7\uD589\uAC04\xB7\uC790\uAC04 \uBD88\uC77C\uCE58");
    }
    return res;
  }
  async function applyExistingTextStyles(nodes) {
    const res = { created: 0, updated: 0, bound: 0, applied: 0, missing: [], notes: [] };
    const styleBySig = /* @__PURE__ */ new Map();
    for (const s of await figma.getLocalTextStylesAsync()) {
      const fontSize = roundN(s.fontSize);
      const k = `${fontSize}|${lhPxOf(fontSize, s.lineHeight)}|${lsPxOf(fontSize, s.letterSpacing)}|${s.fontName.family}|${s.fontName.style}`;
      styleBySig.set(k, styleBySig.has(k) ? null : s);
    }
    const texts = [];
    for (const n of nodes) walkText(n, texts);
    const loaded = /* @__PURE__ */ new Set();
    const ensureFont = async (fn) => {
      const k = `${fn.family} ${fn.style}`;
      if (loaded.has(k)) return;
      await figma.loadFontAsync(fn);
      loaded.add(k);
    };
    const unregistered = /* @__PURE__ */ new Set();
    let ambiguous = 0;
    for (const t of texts) {
      if (t.fontSize === figma.mixed || t.fontName === figma.mixed) continue;
      const fontSize = roundN(t.fontSize);
      const fn = t.fontName;
      const k = `${fontSize}|${lhPxOf(fontSize, t.lineHeight)}|${lsPxOf(fontSize, t.letterSpacing)}|${fn.family}|${fn.style}`;
      const hit = styleBySig.get(k);
      if (hit === void 0) {
        unregistered.add(`${fn.family} ${fn.style} ${fontSize}`);
        continue;
      }
      if (hit === null) {
        ambiguous++;
        continue;
      }
      try {
        await ensureFont(fn);
        await t.setTextStyleIdAsync(hit.id);
        res.applied++;
      } catch (e) {
        res.missing.push(`\uC801\uC6A9 \uC2E4\uD328 '${t.name}'(\uD3F0\uD2B8 \uB85C\uB4DC \uBD88\uAC00)`);
      }
    }
    if (texts.length === 0) res.missing.push("\uC801\uC6A9 \uB300\uC0C1 \uC5C6\uC74C \u2014 \uC120\uD0DD\uC5D0 \uD14D\uC2A4\uD2B8 \uB178\uB4DC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4");
    if (unregistered.size) res.missing.push(`\uBBF8\uB4F1\uB85D ${unregistered.size}\uC885 \u2014 \uBA3C\uC800 \uB4F1\uB85D \uD544\uC694: ${[...unregistered].join(", ")}`);
    if (ambiguous) res.missing.push(`\uBAA8\uD638 ${ambiguous}\uAC1C \u2014 \uAC19\uC740 \uD0C0\uC774\uD3EC\uC758 \uC2A4\uD0C0\uC77C\uC774 \uC5EC\uB7EC \uAC1C\uB77C \uC790\uB3D9 \uC801\uC6A9 \uBCF4\uB958`);
    return res;
  }

  // src/lib/textStyles.ts
  var RAMP_NAMES = ["display", "h1", "h2", "h3", "title", "body", "caption", "overline"];
  var sigKey = (s) => `${s.fontSize}|${s.lineHeight}|${s.letterSpacing}|${s.family}|${s.style}`;
  function clusterTextStyles(samples) {
    const map = /* @__PURE__ */ new Map();
    const ids = /* @__PURE__ */ new Map();
    for (const s of samples) {
      const k = sigKey(s);
      const ex = map.get(k);
      if (ex) {
        ex.count++;
        if (!ex.lineHeightPercent && s.lineHeightPercent) ex.lineHeightPercent = s.lineHeightPercent;
      } else {
        map.set(k, {
          fontSize: s.fontSize,
          lineHeight: s.lineHeight,
          lineHeightPercent: s.lineHeightPercent,
          letterSpacing: s.letterSpacing,
          family: s.family,
          style: s.style,
          count: 1,
          sample: s.layerName,
          styleIds: []
        });
        ids.set(k, /* @__PURE__ */ new Set());
      }
      if (s.styleId) ids.get(k).add(s.styleId);
    }
    for (const [k, c] of map) c.styleIds = [...ids.get(k)];
    return [...map.values()];
  }
  var slug = (s) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  function nameTextStyles(clusters, existing) {
    const nameById = /* @__PURE__ */ new Map();
    const sigById = /* @__PURE__ */ new Map();
    const idBySig = /* @__PURE__ */ new Map();
    for (const e of existing != null ? existing : []) {
      nameById.set(e.id, e.name);
      const k = sigKey(e);
      sigById.set(e.id, k);
      idBySig.set(k, idBySig.has(k) ? null : e.id);
    }
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
        specs.push(__spreadValues(__spreadValues({
          name,
          fontSize: c.fontSize,
          lineHeight: c.lineHeight,
          letterSpacing: c.letterSpacing,
          family: c.family,
          style: c.style
        }, c.lineHeightPercent ? { lineHeightPercent: c.lineHeightPercent } : {}), boundId ? { boundStyleId: boundId } : {}));
      }
    }
    return specs;
  }
  var LABEL_RAMP_RE = /^(display|h[1-6]|title|body|caption|overline)(\/\S+)?$/i;
  function isRowLabelNameLike(characters) {
    const t = characters.trim();
    if (!t || t.includes("\n")) return false;
    if (t.length <= 24) return true;
    return LABEL_RAMP_RE.test(t);
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

  // src/lib/bind.ts
  var TIER = { [COMPONENT]: 3, [SEMANTIC]: 2, [GLOBAL]: 1 };
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
  var OPACITY_TOL = 5e-3;
  function addColorCand(preview, node, field, index, hex, e) {
    preview == null ? void 0 : preview.candidates.push({ nodeId: node.id, field, index, currentValue: hex, variableId: e.variable.id, variableName: e.variable.name, tier: e.tier });
  }
  function addFloatCand(preview, node, field, value, e) {
    preview == null ? void 0 : preview.candidates.push({ nodeId: node.id, field, currentValue: String(value), variableId: e.variable.id, variableName: e.variable.name, tier: e.tier, distance: e.num != null ? Math.abs(e.num - value) : void 0 });
  }
  function addStrCand(preview, node, field, value, e) {
    preview == null ? void 0 : preview.candidates.push({ nodeId: node.id, field, currentValue: value, variableId: e.variable.id, variableName: e.variable.name, tier: e.tier });
  }
  function pruneToAffected(nodeIndex, candidates) {
    var _a, _b, _c, _d;
    const byId = new Map(nodeIndex.map((n) => [n.id, n]));
    const keep = new Set(candidates.map((c) => c.nodeId));
    for (const c of candidates) {
      let p = (_b = (_a = byId.get(c.nodeId)) == null ? void 0 : _a.parentId) != null ? _b : null;
      while (p && !keep.has(p)) {
        keep.add(p);
        p = (_d = (_c = byId.get(p)) == null ? void 0 : _c.parentId) != null ? _d : null;
      }
    }
    return nodeIndex.filter((n) => keep.has(n.id));
  }
  function isNodeFieldBound(node, field) {
    const bv = node.boundVariables;
    const entry = bv == null ? void 0 : bv[field];
    if (!entry) return false;
    return Array.isArray(entry) ? entry.length > 0 : true;
  }
  function isColorBound(x) {
    var _a;
    return !!((_a = x.boundVariables) == null ? void 0 : _a.color);
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
  async function bindSelection(selection2, tolerance, apply = true, hooks = {}) {
    var _a;
    const entries = await buildIndex();
    const res = { bound: 0, skipped: 0, flags: [], reasons: {} };
    const flagSet = /* @__PURE__ */ new Set();
    const prog = { done: 0, total: hooks.onProgress ? countNodes(selection2) : 0, every: 50 };
    const preview = apply ? null : { candidates: [], nodeIndex: [], skips: [], skipSeen: /* @__PURE__ */ new Set() };
    for (const node of selection2) {
      if (!isEffectivelyVisible2(node)) {
        flagSet.add("\uC228\uAE34 \uB808\uC774\uC5B4\uB294 \uBC14\uC778\uB529\uC5D0\uC11C \uC81C\uC678\uD588\uC2B5\uB2C8\uB2E4.");
        note(res, "hidden", node, preview);
        continue;
      }
      await walk2(node, entries, tolerance, res, flagSet, apply, hooks, prog, preview, 0, null);
      if (res.cancelled) break;
    }
    res.flags = [...flagSet];
    if (preview) {
      res.candidates = preview.candidates;
      res.nodes = pruneToAffected(preview.nodeIndex, preview.candidates);
      res.skips = preview.skips;
    }
    (_a = hooks.onProgress) == null ? void 0 : _a.call(hooks, prog.done, prog.total);
    return res;
  }
  async function buildIndex() {
    var _a, _b;
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const modeOf = new Map(cols.map((c) => [c.id, c.defaultModeId]));
    const tierOf = new Map(cols.map((c) => {
      var _a2;
      return [c.id, (_a2 = TIER[c.name]) != null ? _a2 : 0];
    }));
    const vars = await figma.variables.getLocalVariablesAsync();
    const entries = [];
    for (const v of vars) {
      const tier = (_a = tierOf.get(v.variableCollectionId)) != null ? _a : 0;
      if (tier < 2) continue;
      const val = await resolveValue(v, modeOf);
      if (val == null) continue;
      const e = { variable: v, tier, type: v.resolvedType, scopes: (_b = v.scopes) != null ? _b : ["ALL_SCOPES"] };
      if (v.resolvedType === "COLOR" && isRGB(val)) e.colorHex = rgbToHex(val);
      else if (v.resolvedType === "FLOAT" && typeof val === "number") e.num = val;
      else if (v.resolvedType === "STRING" && typeof val === "string") e.str = val;
      entries.push(e);
    }
    entries.sort((a, b) => b.tier - a.tier);
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
  function isRGB(v) {
    return typeof v === "object" && v !== null && "r" in v && "g" in v && "b" in v;
  }
  var FILL_SCOPES = ["ALL_FILLS", "FRAME_FILL", "SHAPE_FILL", "TEXT_FILL"];
  var STROKE_SCOPES = ["STROKE_COLOR"];
  var EFFECT_SCOPES = ["EFFECT_COLOR"];
  function colorScopeOk(e, allowed) {
    return e.scopes.includes("ALL_SCOPES") || allowed.some((s) => e.scopes.includes(s));
  }
  function matchColor(entries, hex, allowed) {
    for (const e of entries) if (e.colorHex === hex && colorScopeOk(e, allowed)) return e;
    return null;
  }
  function matchFloat(entries, value, tol, scope) {
    let best = null;
    let bestDist = Infinity;
    for (const e of entries) {
      if (e.num == null) continue;
      if (scope && !e.scopes.includes("ALL_SCOPES") && !e.scopes.includes(scope)) continue;
      const dist = Math.abs(e.num - value);
      if (dist > tol) continue;
      if (dist < bestDist || dist === bestDist && best !== null && best.tier < e.tier) {
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
  async function walk2(node, entries, tol, res, flags, apply, hooks, prog, preview, depth, parentId) {
    var _a;
    if (res.cancelled) return;
    if (node.visible === false) {
      flags.add("\uC228\uAE34 \uB808\uC774\uC5B4\uB294 \uBC14\uC778\uB529\uC5D0\uC11C \uC81C\uC678\uD588\uC2B5\uB2C8\uB2E4.");
      note(res, "hidden", node, preview);
      return;
    }
    preview == null ? void 0 : preview.nodeIndex.push({ id: node.id, name: node.name, type: node.type, depth, parentId });
    bindPaints(node, entries, res, apply, preview);
    bindFrame(node, entries, tol, res, flags, apply, preview);
    bindRadius(node, entries, tol, res, apply, preview);
    bindStroke(node, entries, tol, res, apply, preview);
    bindOpacity(node, entries, tol, res, apply, preview);
    bindEffects(node, entries, res, apply, preview);
    await bindText(node, entries, tol, res, apply, preview);
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
        flags.add("\uC778\uC2A4\uD134\uC2A4 \uB0B4\uBD80\uB294 \uC624\uBC84\uB77C\uC774\uB4DC\uAC00 \uB418\uBBC0\uB85C \uAC74\uB108\uB6F0\uC5C8\uC2B5\uB2C8\uB2E4 \u2014 \uCEF4\uD3EC\uB10C\uD2B8 \uC6D0\uBCF8\uC5D0\uC11C \uBC14\uC778\uB529\uD558\uC138\uC694.");
        note(res, "instance-children", node, preview);
      }
      return;
    }
    if ("children" in node)
      for (const c of node.children) {
        await walk2(c, entries, tol, res, flags, apply, hooks, prog, preview, depth + 1, node.id);
        if (res.cancelled) return;
      }
  }
  function bindPaints(node, entries, res, apply, preview) {
    for (const key of ["fills", "strokes"]) {
      if (!(key in node)) continue;
      const paints3 = node[key];
      if (paints3 === figma.mixed || !Array.isArray(paints3)) continue;
      const allowed = key === "fills" ? FILL_SCOPES : STROKE_SCOPES;
      let changed = false;
      const next = paints3.map((p, i) => {
        if (p.type !== "SOLID") return p;
        if (isColorBound(p)) {
          note(res, "already-bound", node, preview, key);
          return p;
        }
        const hex = rgbToHex(p.color);
        const e = matchColor(entries, hex, allowed);
        if (!e) {
          skip(res, "no-match", node, preview, key);
          return p;
        }
        res.bound++;
        if (!apply) {
          addColorCand(preview, node, key, i, hex, e);
          return p;
        }
        changed = true;
        return figma.variables.setBoundVariableForPaint(p, "color", e.variable);
      });
      if (changed && apply) node[key] = next;
    }
  }
  function bindFrame(node, entries, tol, res, flags, apply, preview) {
    if (node.type !== "FRAME" && node.type !== "COMPONENT" && node.type !== "INSTANCE") return;
    const parent = node.parent;
    const absolute = "layoutPositioning" in node && node.layoutPositioning === "ABSOLUTE";
    const inAutoLayout = !absolute && (node.layoutMode !== "NONE" || parent != null && "layoutMode" in parent && parent.layoutMode !== "NONE");
    if (inAutoLayout) {
      const bindAxis = (sizing, field, v) => {
        if (sizing !== "FIXED") {
          flags.add("\uC77C\uBD80 \uD06C\uAE30\uB294 HUG/FILL\uC774\uB77C width/height \uBC14\uC778\uB529\uC744 \uAC74\uB108\uB700(Fixed \uD544\uC694).");
          note(res, "hug-fill", node, preview, field);
          return;
        }
        const fraction = Math.abs(v - Math.round(v)) >= 5e-3;
        tryBind(node, field, v, entries, fraction ? 0 : tol, res, apply, preview, fraction ? "size-fraction" : void 0);
      };
      bindAxis(node.layoutSizingHorizontal, "width", node.width);
      bindAxis(node.layoutSizingVertical, "height", node.height);
    } else {
      flags.add("\uC790\uC720 \uBC30\uCE58(\uC624\uD1A0\uB808\uC774\uC544\uC6C3 \uBC16) \uD504\uB808\uC784\uC740 \uD06C\uAE30 \uBC14\uC778\uB529\uC5D0\uC11C \uC81C\uC678\uD588\uC2B5\uB2C8\uB2E4.");
      note(res, "size-free-layout", node, preview);
    }
    if (node.layoutMode === "NONE") {
      flags.add("\uC624\uD1A0\uB808\uC774\uC544\uC6C3\uC774 \uC544\uB2CC \uD504\uB808\uC784\uC740 padding/gap \uBC14\uC778\uB529 \uBD88\uAC00.");
      note(res, "no-autolayout", node, preview);
      return;
    }
    if (node.layoutMode === "GRID") {
      tryBind(node, "gridRowGap", node.gridRowGap, entries, tol, res, apply, preview);
      tryBind(node, "gridColumnGap", node.gridColumnGap, entries, tol, res, apply, preview);
    } else {
      tryBind(node, "itemSpacing", node.itemSpacing, entries, tol, res, apply, preview);
      if (typeof node.counterAxisSpacing === "number") tryBind(node, "counterAxisSpacing", node.counterAxisSpacing, entries, tol, res, apply, preview);
    }
    tryBind(node, "paddingLeft", node.paddingLeft, entries, tol, res, apply, preview);
    tryBind(node, "paddingRight", node.paddingRight, entries, tol, res, apply, preview);
    tryBind(node, "paddingTop", node.paddingTop, entries, tol, res, apply, preview);
    tryBind(node, "paddingBottom", node.paddingBottom, entries, tol, res, apply, preview);
  }
  function bindRadius(node, entries, tol, res, apply, preview) {
    if (!("cornerRadius" in node)) return;
    const r = node.cornerRadius;
    const corners = ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"];
    if (r !== figma.mixed && typeof r === "number" && r > 0) {
      for (const c of corners) tryBind(node, c, r, entries, tol, res, apply, preview);
    } else if (r === figma.mixed) {
      for (const c of corners) {
        const cv = node[c];
        if (typeof cv === "number" && cv > 0) tryBind(node, c, cv, entries, tol, res, apply, preview);
      }
    }
  }
  function bindOpacity(node, entries, tol, res, apply, preview) {
    if (!("opacity" in node)) return;
    const o = node.opacity;
    if (typeof o !== "number" || o >= 1 || o <= 0) return;
    tryBind(node, "opacity", o, entries, Math.min(tol, OPACITY_TOL), res, apply, preview);
  }
  function bindStroke(node, entries, tol, res, apply, preview) {
    if (!("strokes" in node) || !("strokeWeight" in node)) return;
    const strokes = node.strokes;
    if (strokes === figma.mixed || !Array.isArray(strokes) || !strokes.some((p) => p.visible !== false)) return;
    const w = node.strokeWeight;
    if (w !== figma.mixed && typeof w === "number") {
      if (w > 0) tryBind(node, "strokeWeight", w, entries, tol, res, apply, preview);
      return;
    }
    for (const side of ["strokeTopWeight", "strokeRightWeight", "strokeBottomWeight", "strokeLeftWeight"]) {
      const sv = node[side];
      if (typeof sv === "number" && sv > 0) tryBind(node, side, sv, entries, tol, res, apply, preview);
    }
  }
  function bindEffects(node, entries, res, apply, preview) {
    if (!("effects" in node)) return;
    let changed = false;
    const next = node.effects.map((e, i) => {
      if (e.type !== "DROP_SHADOW" && e.type !== "INNER_SHADOW") return e;
      if (isColorBound(e)) {
        note(res, "already-bound", node, preview, "effects");
        return e;
      }
      const hex = rgbToHex(e.color);
      const ent = matchColor(entries, hex, EFFECT_SCOPES);
      if (!ent) {
        skip(res, "no-match", node, preview, "effects");
        return e;
      }
      res.bound++;
      if (!apply) {
        addColorCand(preview, node, "effects", i, hex, ent);
        return e;
      }
      changed = true;
      return figma.variables.setBoundVariableForEffect(e, "color", ent.variable);
    });
    if (changed && apply) node.effects = next;
  }
  async function bindText(node, entries, tol, res, apply, preview) {
    if (node.type !== "TEXT") return;
    if (node.fontName === figma.mixed) return;
    try {
      await figma.loadFontAsync(node.fontName);
    } catch (e) {
      note(res, "font", node, preview);
      return;
    }
    if (node.fontSize !== figma.mixed) tryBindText(node, "fontSize", node.fontSize, entries, tol, res, apply, preview);
    if (node.lineHeight !== figma.mixed && node.lineHeight.unit === "PIXELS") {
      tryBindText(node, "lineHeight", node.lineHeight.value, entries, tol, res, apply, preview);
    }
    if (node.letterSpacing !== figma.mixed && node.letterSpacing.unit === "PIXELS") {
      tryBindText(node, "letterSpacing", node.letterSpacing.value, entries, tol, res, apply, preview);
    }
    if (isNodeFieldBound(node, "fontFamily")) {
      note(res, "already-bound", node, preview, "fontFamily");
      return;
    }
    const fe = matchString(entries, node.fontName.family, "FONT_FAMILY");
    if (fe && node.characters.length > 0) {
      if (!apply) {
        res.bound++;
        addStrCand(preview, node, "fontFamily", node.fontName.family, fe);
      } else {
        try {
          node.setRangeBoundVariable(0, node.characters.length, "fontFamily", fe.variable);
          res.bound++;
        } catch (e) {
          skip(res, "error", node, preview, "fontFamily");
        }
      }
    }
  }
  function tryBindText(node, field, value, entries, tol, res, apply, preview) {
    if (isNodeFieldBound(node, field)) {
      note(res, "already-bound", node, preview, field);
      return;
    }
    const e = matchFloat(entries, value, tol, FIELD_SCOPE[field]);
    const len = node.characters.length;
    if (len === 0) {
      skip(res, "empty-text", node, preview, field);
      return;
    }
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
      node.setRangeBoundVariable(0, len, field, e.variable);
      res.bound++;
    } catch (e2) {
      skip(res, "error", node, preview, field);
    }
  }
  function tryBind(node, field, value, entries, tol, res, apply, preview, noMatchReason = "no-match") {
    if (isNodeFieldBound(node, field)) {
      note(res, "already-bound", node, preview, field);
      return;
    }
    const e = matchFloat(entries, value, tol, FIELD_SCOPE[field]);
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
    } catch (e2) {
      skip(res, "error", node, preview, field);
    }
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
    "hero",
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
    const out = tokens.map((t) => {
      var _a;
      const w = (_a = ABBR[t]) != null ? _a : t;
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
    await recurse(selection2, null, safeOpts, col, 0, null, null, null, null);
    return { changes: col.changes, nodes: col.nodes, applied: opts.apply };
  }
  function normalizeMaxDepth(v) {
    return Number.isFinite(v) ? Math.max(1, Math.round(v)) : 8;
  }
  async function recurse(nodes, ancestorName, opts, col, depth, parentLayout, parentId, parentRole, parentDims) {
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
      const w = (_a = dims(node)) == null ? void 0 : _a.w;
      const widthFrac = w != null && parentDims && parentDims.w > 0 ? w / parentDims.w : null;
      const pos = {
        index: i,
        total,
        parentLayout,
        depth,
        widthFrac,
        parentDims,
        regionIndex: (_b = slotOf.get(i)) != null ? _b : -1,
        regionTotal: slots,
        isOverlay: i === overlayAt,
        afterOverlay: overlayAt >= 0 && i > overlayAt,
        hasAvatarSibling
      };
      const decided = await decide(node, ancestorName, pos, opts, parentRole);
      let contextForChildren = before;
      let after;
      if (!decided.skip && decided.name) {
        if (decided.name !== before) {
          after = decided.name;
          col.changes.push({ id: node.id, before, after });
          if (opts.apply) node.name = after;
        }
        if (opts.apply && decided.role) writeRole(node, decided.role);
        contextForChildren = decided.passthrough ? ancestorName : decided.name;
      }
      col.nodes.push({ id: node.id, name: before, type: node.type, depth, parentId, after });
      if ("children" in node && !isSkippedSubtree(node)) {
        const childDims = decided.passthrough ? parentDims : dims(node);
        await recurse(node.children, contextForChildren, opts, col, depth + 1, layoutOf(node), node.id, (_c = decided.role) != null ? _c : null, childDims);
      }
    }
  }
  async function decide(node, ancestorName, pos, opts, parentRole) {
    var _a;
    if (node.type === "COMPONENT" || node.type === "COMPONENT_SET") return { skip: true };
    if (node.type === "TEXT") return { skip: true };
    if (node.type === "INSTANCE") return { skip: true };
    if (node.locked) return { skip: true };
    if (pos.depth === 0 && isContainerType(node)) {
      const hc = highConfidenceRole(node);
      if (!hc) return { skip: true };
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
    if (typeof fn !== "function") return;
    try {
      fn.call(node, ROLE_KEY, role);
    } catch (e) {
    }
  }
  var PASSTHROUGH_ROLES = /* @__PURE__ */ new Set(["container", "wrapper"]);
  function resolveRole(node, token, pos, parentRole, ctxScope) {
    if (pos.isOverlay) return "overlay";
    if (isModalLike(node, pos, ctxScope)) return "modal";
    if (ctxScope === "progress" && isBarFill(node)) return "indicator";
    if (ctxScope === "field" && isInputBox(node)) return "input";
    if (isButtonLike(node)) return isChipLike(node) ? "chip" : "button";
    if (isNavLike(node, pos.depth)) return "nav";
    if (isStatusDot(node, pos)) return "status";
    if (isThumbnail(node, pos, ctxScope)) return "thumbnail";
    if (token == null ? void 0 : token.roleLeaf) return token.roleLeaf;
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
          const emptyRegion = regionRole(node, pos, ctxScope);
          if (emptyRegion) return emptyRegion;
          return "container";
        }
        if (isProgressLike(node, kids)) return "progress";
        if (isCardLike(node, kids)) return parentRole === "list" ? "article" : "card";
        if (isFigureLike(node, kids)) return "figure";
        if (isFieldLike(node, kids)) return "field";
        if (isListLike(node, kids)) return "list";
        if (parentRole === "list" || parentRole === "nav") return "item";
        const region = regionRole(node, pos, ctxScope);
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
    if (p.w < 768) return p.h >= 700 && p.h >= p.w;
    return p.h >= 800;
  }
  function regionRole(node, pos, ctxScope) {
    if (pos.depth !== 1 || !isContainerType(node)) return null;
    if (pos.regionIndex < 0) return null;
    if (pos.parentLayout === "horizontal") {
      if (!isPageParent(pos, ctxScope)) return null;
      if (!isPageSplit(pos)) return null;
      return pos.widthFrac != null && pos.widthFrac <= 0.35 ? "aside" : null;
    }
    if (pos.parentLayout !== "vertical" || pos.regionTotal < 2) return null;
    if (!isPageParent(pos, ctxScope)) return null;
    if (pos.regionIndex === 0) return "header";
    if (pos.regionIndex === pos.regionTotal - 1) return "footer";
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
    for (const [t, c] of counts) if (c > domCount) {
      domCount = c;
      domType = t;
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
  function isNavLike(node, depth) {
    if (node.type !== "FRAME") return false;
    if (layoutOf(node) !== "horizontal") return false;
    if (depth > 1) return false;
    if (cornerRadiusOf(node) > 0 && (hasVisibleFill(node) || hasVisibleStroke(node))) return false;
    const kids = node.children;
    if (kids.length < 3) return false;
    const d = dims(node);
    if (d && d.h > 80) return false;
    return kids.every((k) => k.type === "TEXT" || k.type === "FRAME" && hasDirectText(k));
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
    for (const t of tokens) {
      if (t.aliasOf) {
        lines.push(`  ${cssVar(t.name)}: var(${cssVar(t.aliasOf)});`);
      } else {
        lines.push(`  ${cssVar(t.name)}: ${cssLiteral(t, opts)};`);
        if (t.kind === "fontWeight" && splitWeightStyle(t.value).italic) {
          lines.push(`  ${cssVar(t.name)}-style: italic;`);
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
    for (const t of tokens) {
      const segs = t.name.split("/").filter(Boolean);
      let node = root;
      for (let i = 0; i < segs.length - 1; i++) {
        const key = segs[i];
        if (!node[key] || "$value" in node[key]) node[key] = (_a = node[key]) != null ? _a : {};
        node = node[key];
      }
      const leaf = { $value: w3cValue(t, opts) };
      const ty = W3C_TYPE[t.kind];
      if (ty) leaf.$type = ty;
      node[segs[segs.length - 1]] = leaf;
      if (!t.aliasOf && t.kind === "fontWeight" && splitWeightStyle(t.value).italic) {
        node[`${segs[segs.length - 1]}-style`] = { $type: "fontStyle", $value: "italic" };
      }
    }
    return JSON.stringify(root, null, 2);
  }
  function dedupeByName(tokens) {
    const seen = /* @__PURE__ */ new Map();
    for (const t of tokens) {
      const prev = seen.get(t.name);
      if (!prev || prev.collection === "Semantic" && t.collection === "Global") seen.set(t.name, t);
    }
    return [...seen.values()];
  }
  function exportTokens(tokens, opts) {
    const list = dedupeByName(tokens);
    return opts.format === "css" ? toCss(list, opts) : toW3C(list, opts);
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
    for (const [t, c] of counts) if (c > domCount) {
      domCount = c;
      domType = t;
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
    for (const t of kebab(name).split("-").filter(Boolean)) {
      const w = nounWord(t);
      if (COMPONENT_NOUNS.has(w)) found = pascalCase(w);
    }
    return found;
  }
  function extractNameProps(name) {
    const props = {};
    for (const t of kebab(name).split("-").filter(Boolean)) {
      if (COMPONENT_NOUNS.has(nounWord(t))) continue;
      if (BOOLEANS.has(t)) {
        const bk = capitalize(t);
        if (!(bk in props)) props[bk] = "true";
        continue;
      }
      const p = inferProp(t);
      if (p && !(p in props)) props[p] = t;
    }
    return props;
  }
  function distinguishingTokens(name) {
    return kebab(name).split("-").filter(Boolean).filter((t) => {
      if (COMPONENT_NOUNS.has(nounWord(t))) return false;
      if (BOOLEANS.has(t)) return false;
      if (inferProp(t)) return false;
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
    if (titles.some((t) => t.length !== titleCount) || metas.some((m) => m.length !== metaCount)) return [];
    const aroundRep = (arr) => {
      if (repIdx === 0) return arr;
      return [arr[repIdx], ...arr.filter((_, i) => i !== repIdx)];
    };
    for (let ti = 0; ti < titleCount; ti++) {
      const repTitle = titles[repIdx][ti];
      const nodes = aroundRep(titles.map((t) => t[ti].node));
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
      out[p.propName] = structPropValue(target, p.type);
    }
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
  function shouldCollapseToProperties(members) {
    if (members.length < 2) return false;
    if (members.every((m) => highConfidenceComponentRole(m) === "heading")) {
      return shouldCollapseHeadingMembers(members);
    }
    const base = members[0];
    for (let i = 1; i < members.length; i++) {
      const d = diffForCollapse(base, members[i]);
      if (d.struct) return false;
      if (d.size && !d.prop) return false;
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
      if (d.size && !d.prop) return false;
    }
    return true;
  }
  function diffHeadingPair(a, b, slotsA, slotsB) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t;
    let prop = false;
    let struct = false;
    let size = false;
    if (((_a = a.layoutMode) != null ? _a : "NONE") !== ((_b = b.layoutMode) != null ? _b : "NONE")) struct = true;
    if (((_c = a.fillHex) != null ? _c : null) !== ((_d = b.fillHex) != null ? _d : null)) struct = true;
    if (((_e = a.paddingTop) != null ? _e : 0) !== ((_f = b.paddingTop) != null ? _f : 0) || ((_g = a.paddingRight) != null ? _g : 0) !== ((_h = b.paddingRight) != null ? _h : 0) || ((_i = a.paddingBottom) != null ? _i : 0) !== ((_j = b.paddingBottom) != null ? _j : 0) || ((_k = a.paddingLeft) != null ? _k : 0) !== ((_l = b.paddingLeft) != null ? _l : 0) || ((_m = a.itemSpacing) != null ? _m : 0) !== ((_n = b.itemSpacing) != null ? _n : 0) || ((_o = a.counterAxisSpacing) != null ? _o : 0) !== ((_p = b.counterAxisSpacing) != null ? _p : 0)) {
      struct = true;
    }
    if (((_q = a.width) != null ? _q : 0) !== ((_r = b.width) != null ? _r : 0) || ((_s = a.height) != null ? _s : 0) !== ((_t = b.height) != null ? _t : 0)) size = true;
    if (struct) return { prop, struct, size };
    const kind = (s, k) => s.filter((x) => x.kind === k);
    const titlesA = kind(slotsA, "title");
    const titlesB = kind(slotsB, "title");
    for (let i = 0; i < titlesA.length; i++) {
      const d = diffForCollapse(titlesA[i].node, titlesB[i].node);
      if (d.struct) return { prop: true, struct: true, size };
      if (d.prop) prop = true;
      if (d.size) size = true;
    }
    const metasA = kind(slotsA, "meta");
    const metasB = kind(slotsB, "meta");
    for (let i = 0; i < metasA.length; i++) {
      const d = diffForCollapse(metasA[i].node, metasB[i].node);
      if (d.struct) return { prop, struct: true, size };
      if (d.prop) prop = true;
      if (d.size) size = true;
    }
    const actionsA = kind(slotsA, "action");
    const actionsB = kind(slotsB, "action");
    const n = Math.max(actionsA.length, actionsB.length);
    if (actionsA.length !== actionsB.length) prop = true;
    for (let i = 0; i < n; i++) {
      if (i >= actionsA.length || i >= actionsB.length) continue;
      const d = diffForCollapse(actionsA[i].node, actionsB[i].node);
      if (d.struct) return { prop, struct: true, size };
      if (d.prop) prop = true;
    }
    return { prop, struct, size };
  }
  function diffForCollapse(a, b) {
    let prop = false;
    let struct = false;
    let size = false;
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
      if (x.name !== y.name) {
        struct = true;
        return;
      }
      const xv = x.visible !== false;
      const yv = y.visible !== false;
      if (xv !== yv) {
        if (x.name.trim().endsWith("?")) prop = true;
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
    return { prop, struct, size };
  }
  function exactNameKey(name) {
    return name.trim().toLowerCase().replace(/\s+/g, " ");
  }
  function groupByExactName(children) {
    const map = /* @__PURE__ */ new Map();
    const order = [];
    for (const c of children) {
      const k = exactNameKey(c.name);
      if (!k) continue;
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
      const usable = tokens.every((t) => t.length > 0) && new Set(tokens).size === members.length;
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
  function resolveGroupNames(groups) {
    const base = groups.map(componentBaseName);
    const collides = new Set(base.filter((n, i) => base.indexOf(n) !== i));
    const taken = /* @__PURE__ */ new Set();
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

  // src/lib/contrast.ts
  function isLargeText(fontSizePx, bold) {
    if (fontSizePx >= 24) return true;
    return bold && fontSizePx >= 18.66;
  }
  function requiredRatio(level, large) {
    if (level === "AAA") return large ? 4.5 : 7;
    return large ? 3 : 4.5;
  }
  var round2 = (n) => Math.round(n * 100) / 100;
  var clamp012 = (n) => Math.min(1, Math.max(0, n));
  function adjustLForContrast(srcHex, otherHex, required) {
    const src = hexToOklch(srcHex);
    const otherRgb = hexToRgb(otherHex);
    const at = (L) => {
      const hex = oklchToHex(clampToGamut({ l: clamp012(L), c: src.c, h: src.h }));
      return { hex, ratio: contrastRatio(hexToRgb(hex), otherRgb) };
    };
    if (at(src.l).ratio >= required) return srcHex;
    const solve = (toL) => {
      if (at(toL).ratio < required) return { ok: false, L: toL, hex: at(toL).hex };
      let lo = src.l;
      let hi = toL;
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        if (at(mid).ratio >= required) hi = mid;
        else lo = mid;
      }
      return { ok: true, L: hi, hex: at(hi).hex };
    };
    const dark = solve(0);
    const light = solve(1);
    const ok = [dark, light].filter((c) => c.ok).sort((a, b) => Math.abs(a.L - src.l) - Math.abs(b.L - src.l));
    if (ok.length) return ok[0].hex;
    return at(0).ratio >= at(1).ratio ? at(0).hex : at(1).hex;
  }
  function suggestContrastFix(fg, bg, required) {
    return {
      suggestedFg: adjustLForContrast(fg, bg, required),
      // 텍스트색 명도 조정(국소·파급 적음)
      suggestedBg: adjustLForContrast(bg, fg, required)
      // 배경색 명도 조정(옵션)
    };
  }
  function evaluateSample(s, level) {
    const large = isLargeText(s.fontSize, s.bold);
    const required = requiredRatio(level, large);
    const ratio = round2(contrastRatio(hexToRgb(s.fg), hexToRgb(s.bg)));
    const pass = ratio >= required;
    const f = { id: s.id, name: s.name, fg: s.fg, bg: s.bg, bgId: s.bgId, ratio, required, large, pass };
    if (!pass) {
      const fix = suggestContrastFix(s.fg, s.bg, required);
      f.suggestedFg = fix.suggestedFg;
      f.suggestedBg = fix.suggestedBg;
    }
    return f;
  }
  function checkContrast(samples, level) {
    const findings = samples.map((s) => evaluateSample(s, level));
    findings.sort((a, b) => Number(a.pass) - Number(b.pass) || a.ratio - b.ratio);
    const failed = findings.reduce((n, f) => n + (f.pass ? 0 : 1), 0);
    return { level, checked: findings.length, passed: findings.length - failed, failed, findings };
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
      return __spreadProps(__spreadValues({}, empty), { excluded: frames.map((f) => ({ id: f.id, name: f.name, reason: "\uD504\uB808\uC784\uC774 2\uAC1C \uC774\uC0C1 \uD544\uC694" })) });
    }
    const bySig = /* @__PURE__ */ new Map();
    for (const f of frames) {
      const sig = frameShapeSignature(f);
      ((_a = bySig.get(sig)) != null ? _a : bySig.set(sig, []).get(sig)).push(f);
    }
    let best = [];
    for (const group of bySig.values()) if (group.length > best.length) best = group;
    const excluded = frames.filter((f) => !best.includes(f)).map((f) => ({ id: f.id, name: f.name, reason: "\uAD6C\uC870 \uBD88\uC77C\uCE58" }));
    if (best.length < 2) {
      return __spreadProps(__spreadValues({}, empty), { excluded: frames.map((f) => ({ id: f.id, name: f.name, reason: "\uB3D9\uC77C \uAD6C\uC870 \uD504\uB808\uC784 2\uAC1C \uBBF8\uB9CC" })) });
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
    const memberSet = new Set(aligned.memberIds);
    for (const n of members) {
      if (n.id === master.id) continue;
      if (!memberSet.has(n.id)) continue;
      const leaves = treeById.get(n.id);
      if (!leaves) continue;
      try {
        const inst = comp.createInstance();
        inst.x = n.x;
        inst.y = n.y;
        try {
          inst.resize(n.width, n.height);
        } catch (e) {
        }
        if (n.parent) n.parent.appendChild(inst);
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
      }
    }
    const warnings = aligned.excluded.map((e) => `${e.name}: ${e.reason}`);
    for (const name of kept) warnings.push(`${name}: \uC18D\uC131 \uC624\uBC84\uB77C\uC774\uB4DC \uC2E4\uD328 \u2014 \uC6D0\uBCF8\uC744 \uADF8\uB300\uB85C \uB450\uC5C8\uC2B5\uB2C8\uB2E4.`);
    return { master: comp.name, properties, instances, images, warnings };
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
  function isVariableAlias(raw) {
    return !!raw && typeof raw === "object" && "type" in raw && raw.type === "VARIABLE_ALIAS";
  }
  async function generateDarkMode(collectionId, fromModeId, toModeId) {
    var _a;
    let created = 0;
    let realiased = 0;
    let skipped = 0;
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const semanticCol = cols.find((c) => c.id === collectionId);
    if (!semanticCol) return { created, realiased, skipped };
    const globalCol = (_a = cols.find((c) => c.name === GLOBAL)) != null ? _a : figma.variables.createVariableCollection(GLOBAL);
    const gMode = globalCol.defaultModeId;
    const allVars = await figma.variables.getLocalVariablesAsync();
    const byId = new Map(allVars.map((v) => [v.id, v]));
    const globalByName = new Map(allVars.filter((v) => v.variableCollectionId === globalCol.id).map((v) => [v.name, v]));
    for (const v of allVars) {
      if (v.variableCollectionId !== semanticCol.id || v.resolvedType !== "COLOR") continue;
      const fromRaw = v.valuesByMode[fromModeId];
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
      v.setValueForMode(toModeId, figma.variables.createVariableAlias(dark));
      realiased++;
    }
    return { created, realiased, skipped };
  }

  // src/lib/variableEdit.ts
  function parseVarValue(type, input) {
    const s = input.trim();
    switch (type) {
      case "COLOR": {
        if (!/^#?[0-9a-f]{6}$/i.test(s)) return { ok: false, error: "\uC0C9\uC740 #RRGGBB \uD615\uC2DD\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4." };
        return { ok: true, value: hexToRgb(s) };
      }
      case "FLOAT": {
        const n = Number(s);
        if (s === "" || !Number.isFinite(n)) return { ok: false, error: "\uC22B\uC790\uB97C \uC785\uB825\uD558\uC138\uC694." };
        return { ok: true, value: n };
      }
      case "STRING": {
        if (s === "") return { ok: false, error: "\uBE48 \uBB38\uC790\uC5F4\uC740 \uD5C8\uC6A9\uB418\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4." };
        return { ok: true, value: s };
      }
      case "BOOLEAN": {
        const v = s.toLowerCase();
        if (v === "true") return { ok: true, value: true };
        if (v === "false") return { ok: true, value: false };
        return { ok: false, error: "true \uB610\uB294 false\uB97C \uC785\uB825\uD558\uC138\uC694." };
      }
    }
  }
  function sanitizeScopes(scopes, type) {
    return [...new Set(scopesForType(scopes, type))];
  }
  function aliasSelfReference(sourceId, targetId) {
    return sourceId === targetId;
  }
  function findAliasReferers(varId, vars) {
    const out = [];
    for (const v of vars) {
      if (v.id === varId) continue;
      for (const cell of Object.values(v.values)) {
        if (cell.kind === "alias" && cell.aliasId === varId) {
          out.push({ id: v.id, name: v.name });
          break;
        }
      }
    }
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

  // src/lib/presets.ts
  function upsertPreset(list, p) {
    return [p, ...list.filter((x) => x.name !== p.name)];
  }

  // src/lib/undo.ts
  function commitUndo(f) {
    if (typeof f.commitUndo === "function") f.commitUndo();
  }

  // src/code.ts
  var UI_SIZE_KEY = "dsl.uiSize";
  var UI_MIN = { w: 360, h: 480 };
  var UI_MAX = { w: 900, h: 1200 };
  var UI_DEFAULT = { w: 460, h: 660 };
  var clampSize = (w, h) => ({
    w: Math.round(Math.min(UI_MAX.w, Math.max(UI_MIN.w, w))),
    h: Math.round(Math.min(UI_MAX.h, Math.max(UI_MIN.h, h)))
  });
  figma.showUI(__html__, { width: UI_DEFAULT.w, height: UI_DEFAULT.h, themeColors: true });
  figma.clientStorage.getAsync(UI_SIZE_KEY).then((s) => {
    const v = s;
    if (v && typeof v.w === "number" && typeof v.h === "number") {
      const c = clampSize(v.w, v.h);
      figma.ui.resize(c.w, c.h);
    }
  }).catch(() => {
  });
  var selection = () => figma.currentPage.selection;
  var DEV_TIER_KEY = "dsl.devTier";
  var CACHE_KEY = "dsl.licenseCache";
  var PRESETS_KEY = "dsl.presets";
  var devTier = "free";
  var cache = null;
  var presets = [];
  var bindCancel = false;
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
  function requirePaid(feature, message) {
    if (isPaid()) return true;
    post({ type: "PREMIUM_REQUIRED", feature, message });
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
      note: note2
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
      const ps = await figma.clientStorage.getAsync(PRESETS_KEY);
      if (Array.isArray(ps)) presets = ps;
    } catch (e) {
    }
  }
  async function postPrereq() {
    try {
      const cols = await figma.variables.getLocalVariableCollectionsAsync();
      const globalIds = new Set(cols.filter((c) => c.name === GLOBAL).map((c) => c.id));
      const bindableIds = new Set(cols.filter((c) => c.name === SEMANTIC || c.name === COMPONENT).map((c) => c.id));
      const vars = await figma.variables.getLocalVariablesAsync();
      const hasGlobal = vars.some((v) => globalIds.has(v.variableCollectionId));
      const hasBindable = vars.some((v) => bindableIds.has(v.variableCollectionId));
      const hasTextStyles = (await figma.getLocalTextStylesAsync()).length > 0;
      post({ type: "PREREQ_STATE", hasGlobal, hasBindable, hasTextStyles });
    } catch (e) {
    }
  }
  function requirePresets() {
    return requirePaid("presets", "\uACF5\uC720 \uD504\uB9AC\uC14B\uC740 Paid \uAE30\uB2A5\uC785\uB2C8\uB2E4.");
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
  var EDITABLE_COLLECTIONS = /* @__PURE__ */ new Set([GLOBAL, SEMANTIC, COMPONENT]);
  var USAGE_SCAN_CAP = 5e3;
  function isVariableAlias2(raw) {
    return !!raw && typeof raw === "object" && "type" in raw && raw.type === "VARIABLE_ALIAS";
  }
  function toValueCell(type, raw, nameById) {
    if (isVariableAlias2(raw)) {
      const aliasId = raw.id;
      const aliasName = nameById.get(aliasId);
      return { kind: "alias", display: aliasName != null ? aliasName : "(\uC54C \uC218 \uC5C6\uC74C)", aliasId, aliasName };
    }
    if (type === "COLOR" && raw && typeof raw === "object" && "r" in raw) {
      return { kind: "literal", display: rgbToHex(raw) };
    }
    if (raw === void 0) return { kind: "literal", display: "" };
    return { kind: "literal", display: String(raw) };
  }
  function toVarInfo(v, col, nameById) {
    var _a;
    const modes = col.modes.map((m) => ({ modeId: m.modeId, name: m.name }));
    const values = {};
    for (const m of col.modes) values[m.modeId] = toValueCell(v.resolvedType, v.valuesByMode[m.modeId], nameById);
    return {
      id: v.id,
      name: v.name,
      collectionId: col.id,
      collection: col.name,
      type: v.resolvedType,
      description: (_a = v.description) != null ? _a : "",
      scopes: v.scopes,
      hidden: v.hiddenFromPublishing,
      modes,
      defaultModeId: col.defaultModeId,
      values
    };
  }
  async function collectVars() {
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const colById = new Map(cols.map((c) => [c.id, c]));
    const vars = await figma.variables.getLocalVariablesAsync();
    const nameById = new Map(vars.map((v) => [v.id, v.name]));
    const out = [];
    for (const v of vars) {
      const col = colById.get(v.variableCollectionId);
      if (!col || !EDITABLE_COLLECTIONS.has(col.name)) continue;
      out.push(toVarInfo(v, col, nameById));
    }
    out.sort((a, b) => a.collection.localeCompare(b.collection) || a.name.localeCompare(b.name));
    return out;
  }
  async function aliasWouldCycle(sourceId, target) {
    const seen = /* @__PURE__ */ new Set();
    let frontier = [target];
    while (frontier.length) {
      const next = [];
      for (const cur of frontier) {
        if (cur.id === sourceId) return true;
        if (seen.has(cur.id)) continue;
        seen.add(cur.id);
        for (const modeId of Object.keys(cur.valuesByMode)) {
          const raw = cur.valuesByMode[modeId];
          if (isVariableAlias2(raw)) {
            const nv = await figma.variables.getVariableByIdAsync(raw.id);
            if (nv) next.push(nv);
          }
        }
      }
      frontier = next;
    }
    return false;
  }
  async function applyVarValue(v, col, value) {
    const modeId = value.modeId || col.defaultModeId;
    if (!col.modes.some((m) => m.modeId === modeId)) return "\uB300\uC0C1 \uBAA8\uB4DC\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.";
    if (value.aliasId !== void 0) {
      if (aliasSelfReference(v.id, value.aliasId)) return "\uBCC0\uC218\uB97C \uC790\uAE30 \uC790\uC2E0\uC5D0 \uBCC4\uCE6D\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.";
      const target = await figma.variables.getVariableByIdAsync(value.aliasId);
      if (!target) return "\uBCC4\uCE6D \uB300\uC0C1\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.";
      if (target.resolvedType !== v.resolvedType) return "\uBCC4\uCE6D \uB300\uC0C1\uC758 \uD0C0\uC785\uC774 \uB2E4\uB985\uB2C8\uB2E4.";
      if (await aliasWouldCycle(v.id, target)) return "\uBCC4\uCE6D\uC774 \uC21C\uD658 \uCC38\uC870\uB97C \uB9CC\uB4ED\uB2C8\uB2E4.";
      v.setValueForMode(modeId, figma.variables.createVariableAlias(target));
      return null;
    }
    if (value.literal !== void 0) {
      const p = parseVarValue(v.resolvedType, value.literal);
      if (!p.ok) return p.error;
      v.setValueForMode(modeId, p.value);
      return null;
    }
    return null;
  }
  async function editVariable(id, patch) {
    const v = await figma.variables.getVariableByIdAsync(id);
    if (!v) return { type: "EDIT_VARIABLE_RESULT", id, ok: false, error: "\uBCC0\uC218\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." };
    const col = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
    if (!col || !EDITABLE_COLLECTIONS.has(col.name)) return { type: "EDIT_VARIABLE_RESULT", id, ok: false, error: "\uD3B8\uC9D1 \uB300\uC0C1\uC774 \uC544\uB2CC \uCEEC\uB809\uC158\uC785\uB2C8\uB2E4." };
    try {
      if (patch.name !== void 0) {
        const nm = patch.name.trim();
        if (!nm) return { type: "EDIT_VARIABLE_RESULT", id, ok: false, error: "\uC774\uB984\uC744 \uC785\uB825\uD558\uC138\uC694." };
        v.name = nm;
      }
      if (patch.description !== void 0) v.description = patch.description;
      if (patch.hidden !== void 0) v.hiddenFromPublishing = patch.hidden;
      if (patch.scopes) v.scopes = sanitizeScopes(patch.scopes, v.resolvedType);
      if (patch.value) {
        const err = await applyVarValue(v, col, patch.value);
        if (err) return { type: "EDIT_VARIABLE_RESULT", id, ok: false, error: err };
      }
    } catch (e) {
      return { type: "EDIT_VARIABLE_RESULT", id, ok: false, error: errText(e) };
    }
    const all = await figma.variables.getLocalVariablesAsync();
    const nameById = new Map(all.map((x) => [x.id, x.name]));
    return { type: "EDIT_VARIABLE_RESULT", id, ok: true, var: toVarInfo(v, col, nameById) };
  }
  function nodeBindsVar(node, varId) {
    const bv = node.boundVariables;
    if (!bv) return false;
    const hits = (a) => !!a && typeof a === "object" && a.id === varId;
    for (const key of Object.keys(bv)) {
      const entry = bv[key];
      if (Array.isArray(entry)) {
        if (entry.some(hits)) return true;
      } else if (entry && typeof entry === "object") {
        if (hits(entry)) return true;
        for (const v of Object.values(entry)) if (hits(v)) return true;
      }
    }
    return false;
  }
  async function collectBoundNodes(varId) {
    await figma.loadAllPagesAsync();
    const nodes = [];
    const stack = [];
    for (const page of figma.root.children) stack.push(...page.children);
    let scanned = 0;
    let capped = false;
    while (stack.length) {
      if (scanned >= USAGE_SCAN_CAP) {
        capped = true;
        break;
      }
      const n = stack.pop();
      scanned++;
      if (nodeBindsVar(n, varId)) nodes.push({ id: n.id, name: n.name });
      if ("children" in n) for (const c of n.children) stack.push(c);
    }
    return { nodes, capped };
  }
  function pageOf(node) {
    let n = node;
    while (n && n.type !== "PAGE") n = n.parent;
    return n && n.type === "PAGE" ? n : null;
  }
  function requireComponents() {
    return requirePaid("components", "\uCEF4\uD3EC\uB10C\uD2B8 \uB4F1\uB85D\xB7\uBCA0\uB9AC\uC5B8\uD2B8 \uBD84\uB958\uB294 Paid \uAE30\uB2A5\uC785\uB2C8\uB2E4.");
  }
  var TEXT_BIND_FIELDS = /* @__PURE__ */ new Set(["fontSize", "lineHeight", "letterSpacing", "fontFamily"]);
  async function applySelectedBinding(item) {
    var _a, _b;
    const node = await figma.getNodeByIdAsync(item.nodeId);
    if (!node || !("type" in node)) return false;
    const variable = await figma.variables.getVariableByIdAsync(item.variableId);
    if (!variable) return false;
    const sn = node;
    try {
      if (item.field === "fills" || item.field === "strokes") {
        if (!(item.field in sn)) return false;
        const paints3 = sn[item.field];
        if (paints3 === figma.mixed || !Array.isArray(paints3)) return false;
        const i = (_a = item.index) != null ? _a : 0;
        const p = paints3[i];
        if (!p || p.type !== "SOLID") return false;
        const arr = paints3.slice();
        arr[i] = figma.variables.setBoundVariableForPaint(p, "color", variable);
        sn[item.field] = arr;
        return true;
      }
      if (item.field === "effects") {
        if (!("effects" in sn)) return false;
        const effects = sn.effects;
        const i = (_b = item.index) != null ? _b : 0;
        const e = effects[i];
        if (!e || e.type !== "DROP_SHADOW" && e.type !== "INNER_SHADOW") return false;
        const arr = effects.slice();
        arr[i] = figma.variables.setBoundVariableForEffect(e, "color", variable);
        sn.effects = arr;
        return true;
      }
      if (TEXT_BIND_FIELDS.has(item.field)) {
        if (sn.type !== "TEXT" || sn.fontName === figma.mixed) return false;
        await figma.loadFontAsync(sn.fontName);
        const len = sn.characters.length;
        if (len === 0) return false;
        sn.setRangeBoundVariable(0, len, item.field, variable);
        return true;
      }
      sn.setBoundVariable(item.field, variable);
      return true;
    } catch (e) {
      return false;
    }
  }
  function requireTextStyles() {
    return requirePaid("textStyles", "\uD14D\uC2A4\uD2B8 \uC2A4\uD0C0\uC77C \uB4F1\uB85D\uC740 Paid \uAE30\uB2A5\uC785\uB2C8\uB2E4.");
  }
  async function savePresets() {
    try {
      await figma.clientStorage.setAsync(PRESETS_KEY, presets);
    } catch (e) {
    }
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
    post({ type: "SELECTION_STATE", count: sel.length, scanned, bindable, capped, selfSelect });
    selfSelect = false;
  }
  figma.on("selectionchange", postSelection);
  var CONTRAST_SCAN_CAP = 2e3;
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
  function propIdsByName(container) {
    const map = /* @__PURE__ */ new Map();
    const defs = container.componentPropertyDefinitions;
    if (!defs) return map;
    for (const [id, def] of Object.entries(defs)) {
      if (def && typeof def === "object" && "name" in def && typeof def.name === "string") {
        map.set(def.name, id);
      }
    }
    return map;
  }
  function applyInstancePropValues(inst, ids, values) {
    const payload = {};
    for (const [name, val] of Object.entries(values)) {
      const id = ids.get(name);
      if (id != null) payload[id] = val;
    }
    if (Object.keys(payload).length) {
      try {
        inst.setProperties(payload);
      } catch (e) {
      }
    }
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
  function effectiveBg(node) {
    let cur = node.parent;
    while (cur && cur.type !== "PAGE" && cur.type !== "DOCUMENT") {
      const hex = solidFillHex(cur);
      if (hex) return { hex, id: cur.id };
      cur = cur.parent;
    }
    return null;
  }
  function collectContrastSamples(sel) {
    const samples = [];
    const skipped = {};
    const note2 = (k) => {
      var _a;
      skipped[k] = ((_a = skipped[k]) != null ? _a : 0) + 1;
    };
    const stack = sel.slice();
    let scanned = 0;
    while (stack.length) {
      if (scanned >= CONTRAST_SCAN_CAP) {
        note2("capped");
        break;
      }
      const n = stack.pop();
      scanned++;
      if (n.type === "TEXT" && n.visible) {
        const fg = solidFillHex(n);
        if (!fg) note2("no-fill");
        else {
          const bg = effectiveBg(n);
          if (!bg) note2("no-bg");
          else {
            const fontSize = typeof n.fontSize === "number" ? n.fontSize : 16;
            const bold = typeof n.fontWeight === "number" ? n.fontWeight >= 700 : false;
            samples.push({ id: n.id, name: n.name, fg, bg: bg.hex, bgId: bg.id, fontSize, bold });
          }
        }
      }
      if ("children" in n) for (const c of n.children) stack.push(c);
    }
    return { samples, skipped };
  }
  figma.ui.onmessage = async (msg) => {
    var _a, _b, _c, _d, _e, _f, _g;
    try {
      switch (msg.type) {
        case "EXTRACT": {
          const sel = selection();
          const { tokens, warnings } = extractFromSelection(sel);
          post({ type: "EXTRACT_RESULT", tokens, warnings, selection: sel.length });
          break;
        }
        case "CREATE_TOKENS": {
          if (!msg.preview && !requirePaid("tokens", "\uD1A0\uD070(\uBCC0\uC218) \uC0DD\uC131\uC740 Paid \uAE30\uB2A5\uC785\uB2C8\uB2E4. \uBBF8\uB9AC\uBCF4\uAE30\uB294 \uBB34\uB8CC\uB85C \uC81C\uACF5\uB429\uB2C8\uB2E4.")) break;
          const s = msg.preview ? await previewCreateTokens(msg.tokens, msg.base) : await createTokens(msg.tokens, msg.base);
          const pruned = !msg.preview && msg.replacePalette ? await prunePaletteColors(msg.tokens.map((t) => t.name)) : 0;
          let summary = `Global ${s.globals}\uAC1C \xB7 Semantic ${s.semantics}\uAC1C (\uC0DD\uC131 ${s.created} / \uAC31\uC2E0 ${s.updated})`;
          if (pruned) summary += ` \xB7 \uC774\uC804 \uC0C9 ${pruned}\uAC1C \uC815\uB9AC`;
          if (s.conversions.length) {
            const px = (n) => String(Math.round(n * 100) / 100);
            const ex = s.conversions.slice(0, 2).map((c) => `${c.from}\u2192${px(c.to)}px`).join(", ");
            summary += ` \xB7 base ${msg.base}px \uD658\uC0B0 ${s.conversions.length}\uAC1C(${ex}${s.conversions.length > 2 ? " \uC678" : ""})`;
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
            msg.tolerance,
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
            flags: r.flags,
            reasons: r.reasons,
            preview: msg.preview,
            cancelled: r.cancelled,
            candidates: r.candidates,
            // #6: 미리보기 후보(dry-run만)
            nodes: r.nodes,
            // #13: 미리보기 트리 맥락
            skips: r.skips
            // 사유별 건너뛴 레이어(dry-run만)
          });
          if (!msg.preview) {
            commitUndo(figma);
          }
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
          let bound = 0;
          let skipped = 0;
          for (const item of msg.items) {
            if (await applySelectedBinding(item)) bound++;
            else skipped++;
          }
          post({ type: "APPLY_RESULT", bound, skipped, flags: [], reasons: {} });
          if (bound) {
            commitUndo(figma);
          }
          break;
        }
        case "RENAME": {
          const r = await renameSelection(selection(), { apply: msg.apply, maxDepth: msg.maxDepth });
          post({ type: "RENAME_RESULT", changes: r.changes, nodes: r.nodes, applied: r.applied });
          if (r.applied && r.changes.length) {
            commitUndo(figma);
          }
          break;
        }
        case "RENAME_APPLY": {
          const changes = [];
          for (const { id, before: expectedBefore, after } of msg.items) {
            const node = await figma.getNodeByIdAsync(id);
            if (!node || !("name" in node)) continue;
            const before = node.name;
            if (before !== expectedBefore) continue;
            if (before === after) continue;
            node.name = after;
            changes.push({ id, before, after });
          }
          post({ type: "RENAME_RESULT", changes, nodes: [], applied: true });
          if (changes.length) {
            commitUndo(figma);
          }
          break;
        }
        case "CREATE_SEMANTICS": {
          if (!requirePaid("semantics", "\uC2DC\uB9E8\uD2F1 \uB9E4\uD551\uC740 Paid \uAE30\uB2A5\uC785\uB2C8\uB2E4.")) break;
          const s = await createSemanticAliases(msg.map);
          post({ type: "SEMANTICS_RESULT", created: s.created, updated: s.updated, aliased: s.aliased, missing: s.missing });
          commitUndo(figma);
          await postPrereq();
          break;
        }
        case "SCAN_TEXT_STYLES": {
          const { samples, warnings } = scanTextStyles(selection());
          const existing = await scanExistingTextStyles();
          if (msg.useRowLabels) {
            const r = nameTextStylesWithRowLabels(samples, existing);
            post({
              type: "TEXT_STYLE_CANDIDATES",
              styles: r.styles,
              warnings,
              labeled: r.labeled,
              fallback: r.fallback
            });
          } else {
            const styles = nameTextStyles(clusterTextStyles(samples), existing);
            post({ type: "TEXT_STYLE_CANDIDATES", styles, warnings });
          }
          break;
        }
        case "CREATE_TEXT_STYLES": {
          if (!requireTextStyles()) break;
          const r = await createSemanticTextStyles(msg.styles, msg.apply, selection());
          post({ type: "TEXT_STYLES_RESULT", created: r.created, updated: r.updated, bound: r.bound, applied: r.applied, missing: r.missing, notes: r.notes });
          commitUndo(figma);
          await postPrereq();
          break;
        }
        case "APPLY_TEXT_STYLES": {
          if (!requireTextStyles()) break;
          const r = await applyExistingTextStyles(selection());
          post({ type: "TEXT_STYLES_APPLIED", applied: r.applied, missing: r.missing });
          commitUndo(figma);
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
        case "GET_GLOBAL_COLORS": {
          const cols = await figma.variables.getLocalVariableCollectionsAsync();
          const globalCol = cols.find((c) => c.name === GLOBAL);
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
        case "RESIZE": {
          const c = clampSize(msg.width, msg.height);
          figma.ui.resize(c.w, c.h);
          if (msg.commit) void figma.clientStorage.setAsync(UI_SIZE_KEY, { w: c.w, h: c.h }).catch(() => {
          });
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
            postLicense("\uB77C\uC774\uC120\uC2A4 \uC801\uC6A9\uB428");
          } else if (msg.result.offline) {
            postLicense(
              cache ? "\uC624\uD504\uB77C\uC778 \u2014 \uCE90\uC2DC\uB41C \uB77C\uC774\uC120\uC2A4\uB85C \uB3D9\uC791(grace)." : "\uC624\uD504\uB77C\uC778 \u2014 \uD0A4\uB97C \uD655\uC778\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."
            );
          } else {
            postLicense(`\uAC80\uC99D \uC2E4\uD328: ${msg.result.error}`);
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
          postLicense("\uB77C\uC774\uC120\uC2A4 \uD0A4 \uC81C\uAC70\uB428");
          break;
        }
        case "OPEN_LICENSE_LINK": {
          figma.openExternal(msg.target === "purchase" ? PURCHASE_URL : PORTAL_URL);
          break;
        }
        case "GET_PRESETS": {
          if (!requirePresets()) break;
          post({ type: "PRESETS", presets });
          break;
        }
        case "SAVE_PRESET": {
          if (!requirePresets()) break;
          presets = upsertPreset(presets, msg.preset);
          await savePresets();
          post({ type: "PRESETS", presets });
          break;
        }
        case "DELETE_PRESET": {
          if (!requirePresets()) break;
          presets = presets.filter((p) => p.name !== msg.name);
          await savePresets();
          post({ type: "PRESETS", presets });
          break;
        }
        case "EXPORT": {
          const cols = await figma.variables.getLocalVariableCollectionsAsync();
          const colById = new Map(cols.map((c) => [c.id, c]));
          const vars = await figma.variables.getLocalVariablesAsync();
          const nameById = new Map(vars.map((v) => [v.id, v.name]));
          const tokens = [];
          for (const v of vars) {
            const col = colById.get(v.variableCollectionId);
            if (!col || col.name !== GLOBAL && col.name !== SEMANTIC) continue;
            const raw = v.valuesByMode[col.defaultModeId];
            const t = {
              name: v.name,
              collection: col.name,
              type: v.resolvedType,
              kind: kindOf(v)
            };
            if (v.description) t.description = v.description;
            if (raw && typeof raw === "object" && "type" in raw && raw.type === "VARIABLE_ALIAS") {
              const target = nameById.get(raw.id);
              if (!target) continue;
              t.aliasOf = target;
            } else if (v.resolvedType === "COLOR" && raw && typeof raw === "object" && "r" in raw) {
              t.value = rgbToHex(raw);
            } else {
              t.value = raw;
            }
            tokens.push(t);
          }
          tokens.sort((a, b) => a.name.localeCompare(b.name));
          const content = exportTokens(tokens, {
            format: msg.format,
            fontSizeUnit: msg.fontSizeUnit,
            base: msg.base
          });
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
            const preview = /* @__PURE__ */ new Map();
            for (const g of groups) {
              if (g.members.length < 2) {
                if (g.members[0]) preview.set(g.members[0].id, { single: pascalCase(g.members[0].name) });
                continue;
              }
              if (shouldCollapseToProperties(g.members)) {
                const name = pascalCase(commonBaseName(g.members.map((m) => m.name)) || g.members[0].name);
                for (const m of g.members) preview.set(m.id, { single: name, propsOnly: true });
                continue;
              }
              const base = commonBaseName(g.members.map((m) => m.name));
              for (const d of deriveVariants(g.members)) preview.set(d.id, { group: base, variant: d.variant });
            }
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
          const captureOrigin = (n) => {
            const parent = n.parent;
            const hasKids = !!parent && "children" in parent;
            const idx = hasKids ? parent.children.indexOf(n) : -1;
            const al = !!parent && "layoutMode" in parent && parent.layoutMode !== "NONE";
            return { parent: hasKids ? parent : null, index: idx, x: n.x, y: n.y, autolayout: al };
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
            for (const { inst, o } of places) {
              if (!o.parent) {
                skipped++;
                continue;
              }
              try {
                const len = o.parent.children.length;
                o.parent.insertChild(Math.min(Math.max(0, o.index), len), inst);
                if (!o.autolayout) {
                  inst.x = o.x;
                  inst.y = o.y;
                }
              } catch (e) {
                skipped++;
                failures.push(`\uC778\uC2A4\uD134\uC2A4 \uBC30\uCE58 \uC2E4\uD328: ${errText(e)}`);
              }
            }
          };
          const placeSingle = (comp, o, name) => {
            try {
              comp.name = name;
            } catch (e) {
            }
            placeOnPage(comp);
            singles.push(comp.name);
            containers.push({ container: comp, scopes: [comp] });
            try {
              restore([{ inst: comp.createInstance(), o }]);
            } catch (e) {
              failures.push(`\uC778\uC2A4\uD134\uC2A4 \uC2E4\uD328(${comp.name}): ${errText(e)}`);
            }
          };
          const groupNames = resolveGroupNames(groups.map((g) => g.members));
          for (let gi = 0; gi < groups.length; gi++) {
            const g = groups[gi];
            const setName = groupNames[gi];
            if (g.members.length === 1) {
              const node = byId.get(g.members[0].id);
              if (!node) continue;
              const o = captureOrigin(node);
              try {
                const comp = figma.createComponentFromNode(node);
                registered++;
                placeSingle(comp, o, setName);
              } catch (e) {
                skipped++;
                failures.push(`\uB2E8\uB3C5 \uB4F1\uB85D \uC2E4\uD328(${g.members[0].name}): ${errText(e)}`);
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
                  const o = captureOrigin(live[0]);
                  try {
                    const comp = figma.createComponentFromNode(live[0]);
                    registered++;
                    placeSingle(comp, o, setName || pascalCase(live[0].name));
                  } catch (e) {
                    skipped++;
                    failures.push(`\uC18D\uC131\uC811\uD798 \uB4F1\uB85D \uC2E4\uD328(${setName}): ${errText(e)}`);
                  }
                }
                continue;
              }
              const structs = live.map(toStructNode);
              const plan = inferVaryingComponentProperties(structs);
              const snapshots = [];
              const made2 = [];
              const madeFromLive = [];
              for (let i = 0; i < live.length; i++) {
                const n = live[i];
                const snap = { o: captureOrigin(n), vals: propValuesFromNode(n, plan) };
                try {
                  made2.push(figma.createComponentFromNode(n));
                  snapshots.push(snap);
                  madeFromLive.push(i);
                } catch (e) {
                  skipped++;
                  failures.push(`\uC18D\uC131\uC811\uD798 \uCEF4\uD3EC\uB10C\uD2B8\uD654 \uC2E4\uD328(${n.name}): ${errText(e)}`);
                }
              }
              if (!made2.length) continue;
              const preferLive = pickCollapseMasterIndex(structs);
              let masterMade = madeFromLive.indexOf(preferLive);
              if (masterMade < 0) masterMade = 0;
              const master = made2[masterMade];
              for (let i = 0; i < made2.length; i++) {
                if (i === masterMade) continue;
                try {
                  made2[i].remove();
                } catch (e) {
                }
              }
              try {
                master.name = setName || pascalCase((_d = (_c = live[preferLive]) == null ? void 0 : _c.name) != null ? _d : live[0].name);
              } catch (e) {
              }
              placeOnPage(master);
              singles.push(master.name);
              registered++;
              let collapsedExposed = 0;
              try {
                collapsedExposed = exposePropertiesFromPlan(master, [master], plan).length;
              } catch (e) {
                failures.push(`\uC18D\uC131 \uB178\uCD9C \uC2E4\uD328(${master.name}): ${errText(e)}`);
              }
              exposedEarly += collapsedExposed;
              const ids = propIdsByName(master);
              const places2 = [];
              for (const snap of snapshots) {
                try {
                  const inst = master.createInstance();
                  applyInstancePropValues(inst, ids, snap.vals);
                  places2.push({ inst, o: snap.o });
                } catch (e) {
                  failures.push(`\uC778\uC2A4\uD134\uC2A4 \uC2E4\uD328(${master.name}): ${errText(e)}`);
                }
              }
              restore(places2);
              continue;
            }
            const variantById = new Map(deriveVariants(g.members).map((d) => [d.id, d.variant]));
            const made = [];
            for (const m of g.members) {
              const node = byId.get(m.id);
              if (!node) continue;
              const o = captureOrigin(node);
              try {
                made.push({ comp: figma.createComponentFromNode(node), variant: (_e = variantById.get(m.id)) != null ? _e : "", o });
                registered++;
              } catch (e) {
                skipped++;
                failures.push(`\uCEF4\uD3EC\uB10C\uD2B8\uD654 \uC2E4\uD328(${m.name}): ${errText(e)}`);
              }
            }
            if (made.length < 2) {
              for (const x of made) placeSingle(x.comp, x.o, setName);
              continue;
            }
            let set;
            try {
              const home = (_f = pageOf(made[0].comp)) != null ? _f : figma.currentPage;
              set = figma.combineAsVariants(made.map((x) => x.comp), home);
            } catch (e) {
              failures.push(`\uACB0\uD569 \uC2E4\uD328(${setName}): ${errText(e)}`);
              for (const x of made) placeSingle(x.comp, x.o, setName);
              continue;
            }
            set.name = setName;
            for (const x of made) if (x.variant) x.comp.name = x.variant;
            page.appendChild(set);
            try {
              arrangeSet(set);
            } catch (e) {
              failures.push(`\uC815\uB82C \uC2E4\uD328(${set.name}): ${errText(e)}`);
            }
            set.x = cursorX;
            set.y = 0;
            cursorX += set.width + 48;
            sets++;
            containers.push({ container: set, scopes: made.map((x) => x.comp) });
            const places = [];
            for (const x of made) {
              try {
                places.push({ inst: x.comp.createInstance(), o: x.o });
              } catch (e) {
                failures.push(`\uC778\uC2A4\uD134\uC2A4 \uC2E4\uD328(${x.variant}): ${errText(e)}`);
              }
            }
            restore(places);
          }
          let exposed = exposedEarly;
          for (const c of containers) {
            try {
              exposed += exposeProperties(c.container, c.scopes).length;
            } catch (e) {
              failures.push(`\uC18D\uC131 \uB178\uCD9C \uC2E4\uD328: ${errText(e)}`);
            }
          }
          post({ type: "COMPONENTS_RESULT", registered, skipped, sets, singles, exposed, missing: [], failures });
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
          const groupNames = resolveGroupNames(groups.map((g) => g.members));
          for (let gi = 0; gi < groups.length; gi++) {
            const g = groups[gi];
            const nodes = g.members.map((m) => byId.get(m.id)).filter((n) => !!n);
            if (nodes.length < 2) {
              if (nodes[0]) singles.push(nodes[0].name);
              continue;
            }
            const variantById = new Map(deriveVariants(g.members).map((d) => [d.id, d.variant]));
            try {
              const parent = (_g = nodes[0].parent) != null ? _g : figma.currentPage;
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
                failures.push(`\uC815\uB82C \uC2E4\uD328(${set.name}): ${errText(e)}`);
              }
              const childNames = set.children.filter((c) => c.type === "COMPONENT").map((c) => c.name);
              const miss = missingVariants(childNames);
              if (miss.length) missing.push(`${set.name}: ${miss.join(" / ")}`);
              sets++;
            } catch (e) {
              failures.push(`\uACB0\uD569 \uC2E4\uD328(${groupNames[gi]}): ${errText(e)}`);
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
        case "GET_VARIABLES": {
          post({ type: "VARIABLES", vars: await collectVars() });
          break;
        }
        case "EDIT_VARIABLE": {
          const res = await editVariable(msg.id, msg.patch);
          post(res);
          if (res.ok) {
            commitUndo(figma);
            await postPrereq();
          }
          break;
        }
        case "DELETE_VARIABLE": {
          const v = await figma.variables.getVariableByIdAsync(msg.id);
          if (!v) {
            post({ type: "EDIT_VARIABLE_RESULT", id: msg.id, ok: false, error: "\uBCC0\uC218\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." });
            break;
          }
          const col = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
          if (!col || !EDITABLE_COLLECTIONS.has(col.name)) {
            post({ type: "EDIT_VARIABLE_RESULT", id: msg.id, ok: false, error: "\uD3B8\uC9D1 \uB300\uC0C1\uC774 \uC544\uB2CC \uCEEC\uB809\uC158\uC785\uB2C8\uB2E4." });
            break;
          }
          try {
            v.remove();
            commitUndo(figma);
            await postPrereq();
            post({ type: "EDIT_VARIABLE_RESULT", id: msg.id, ok: true, deleted: true });
          } catch (e) {
            post({ type: "EDIT_VARIABLE_RESULT", id: msg.id, ok: false, error: errText(e) });
          }
          break;
        }
        case "GET_VARIABLE_USAGE": {
          const { nodes, capped } = await collectBoundNodes(msg.id);
          const aliasedBy = findAliasReferers(msg.id, await collectVars());
          post({ type: "VARIABLE_USAGE", id: msg.id, nodes, aliasedBy, capped });
          break;
        }
        case "GENERATE_DARK_MODE": {
          if (!requirePaid("tokens", "\uB2E4\uD06C \uD14C\uB9C8 \uC0DD\uC131\uC740 Paid \uAE30\uB2A5\uC785\uB2C8\uB2E4.")) break;
          const r = await generateDarkMode(msg.collectionId, msg.fromModeId, msg.toModeId);
          post(__spreadValues({ type: "DARK_MODE_RESULT" }, r));
          if (r.created || r.realiased) {
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
          if (!requirePaid("components", "\uB2EE\uC740 \uD504\uB808\uC784 \uCEF4\uD3EC\uB10C\uD2B8\uD654\uB294 Paid \uAE30\uB2A5\uC785\uB2C8\uB2E4. \uC2A4\uCE94\xB7\uBBF8\uB9AC\uBCF4\uAE30\uB294 \uBB34\uB8CC\uC785\uB2C8\uB2E4.")) break;
          const master = await figma.getNodeByIdAsync(msg.masterId);
          if (!master || master.type !== "FRAME" && master.type !== "GROUP") {
            post({ type: "COMPONENTIZE_RESULT", master: "", properties: 0, instances: 0, images: 0, warnings: ["\uB9C8\uC2A4\uD130 \uD504\uB808\uC784\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."] });
            break;
          }
          const memberNodes = [];
          for (const id of msg.frameIds) {
            const n = await figma.getNodeByIdAsync(id);
            if (n && "type" in n) memberNodes.push(n);
          }
          if (memberNodes.length < 2) {
            post({ type: "COMPONENTIZE_RESULT", master: "", properties: 0, instances: 0, images: 0, warnings: ["\uB300\uC0C1 \uD504\uB808\uC784\uC774 2\uAC1C \uBBF8\uB9CC\uC785\uB2C8\uB2E4. \uB2E4\uC2DC \uC2A4\uCE94\uD558\uC138\uC694."] });
            break;
          }
          const r = await componentizeSimilar(master, memberNodes);
          post({ type: "COMPONENTIZE_RESULT", master: r.master, properties: r.properties, instances: r.instances, images: r.images, warnings: r.warnings });
          if (r.instances) commitUndo(figma);
          break;
        }
        case "CHECK_CONTRAST": {
          const { samples, skipped } = collectContrastSamples(selection());
          const report = checkContrast(samples, msg.level);
          post({
            type: "CONTRAST_RESULT",
            level: report.level,
            checked: report.checked,
            passed: report.passed,
            failed: report.failed,
            findings: report.findings,
            skipped
          });
          break;
        }
        case "APPLY_CONTRAST_FIX": {
          const node = await figma.getNodeByIdAsync(msg.nodeId);
          if (node && "fills" in node) {
            const fills = node.fills;
            if (Array.isArray(fills)) {
              const i = fills.findIndex((p) => {
                var _a2;
                return p.type === "SOLID" && p.visible !== false && ((_a2 = p.opacity) != null ? _a2 : 1) > 0;
              });
              if (i >= 0) {
                const next = fills.slice();
                next[i] = __spreadProps(__spreadValues({}, next[i]), { color: hexToRgb(msg.hex) });
                node.fills = next;
                commitUndo(figma);
              }
            }
          }
          break;
        }
      }
    } catch (err) {
      post({ type: "ERROR", message: err instanceof Error ? err.message : String(err), op: msg == null ? void 0 : msg.type });
    }
  };
})();
