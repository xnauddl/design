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
    FLOAT: /* @__PURE__ */ new Set(["ALL_SCOPES", "GAP", "WIDTH_HEIGHT", "CORNER_RADIUS", "FONT_SIZE", "LINE_HEIGHT", "LETTER_SPACING", "FONT_WEIGHT", "EFFECT_FLOAT", "OPACITY"]),
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
  function add(acc, token, source) {
    const k = keyOf(token.category, token.value, token.unit);
    const existing = acc.map.get(k);
    if (existing) {
      if (!existing.sources.includes(source)) existing.sources.push(source);
    } else {
      acc.map.set(k, __spreadProps(__spreadValues({}, token), { sources: [source] }));
    }
  }
  function collectPaints(acc, paints2, source) {
    if (paints2 === figma.mixed || !Array.isArray(paints2)) return;
    for (const p of paints2) {
      if (p.visible === false) continue;
      if (p.type === "SOLID") {
        const hex = rgbToHex(p.color);
        add(acc, { name: colorTokenName(hex), category: "color", value: hex }, source);
        if (p.opacity != null && p.opacity < 1) {
          const o = round(p.opacity);
          add(acc, { name: numberTokenName("opacity", o), category: "opacity", value: o }, "opacity");
        }
      } else if (p.type.startsWith("GRADIENT") || p.type === "IMAGE" || p.type === "VIDEO") {
        acc.warnings.add("\uADF8\uB77C\uB514\uC5B8\uD2B8/\uC774\uBBF8\uC9C0 \uCC44\uC6C0\uC740 \uBCC0\uC218 \uBC14\uC778\uB529 \uBD88\uAC00 \u2014 \uC2A4\uD0B5\uD588\uC2B5\uB2C8\uB2E4.");
      }
    }
  }
  function collectText(acc, node) {
    if (node.fontSize !== figma.mixed) {
      const v = round(node.fontSize);
      add(acc, { name: numberTokenName("font-size", v), category: "fontSize", value: v }, "fontSize");
    }
    if (node.fontName !== figma.mixed) {
      const fam = node.fontName.family;
      add(acc, { name: `font-family/${fam}`, category: "fontFamily", value: fam }, "fontFamily");
    }
    if (node.lineHeight !== figma.mixed && node.lineHeight.unit !== "AUTO") {
      const lh = node.lineHeight;
      const unit = lh.unit === "PERCENT" ? "percent" : "px";
      const v = round(lh.value);
      add(acc, { name: numberTokenName("line-height", v), category: "lineHeight", value: v, unit }, "lineHeight");
    }
    if (node.letterSpacing !== figma.mixed) {
      const ls = node.letterSpacing;
      const v = round(ls.value);
      if (v !== 0) {
        const unit = ls.unit === "PERCENT" ? "percent" : "px";
        add(acc, { name: numberTokenName("letter-spacing", v), category: "letterSpacing", value: v, unit }, "letterSpacing");
      }
    }
  }
  function collectSpacing(acc, node) {
    if (node.layoutMode === "NONE") return;
    const gaps = [node.itemSpacing, node.paddingLeft, node.paddingRight, node.paddingTop, node.paddingBottom];
    if (typeof node.counterAxisSpacing === "number") gaps.push(node.counterAxisSpacing);
    for (const g of gaps) {
      if (typeof g === "number" && g > 0) {
        const v = round(g);
        add(acc, { name: numberTokenName("spacing", v), category: "gap", value: v }, "gap");
      }
    }
  }
  function collectSize(acc, node) {
    if (node.type !== "FRAME" && node.type !== "COMPONENT" && node.type !== "INSTANCE") return;
    for (const v of [round(node.width), round(node.height)]) {
      if (v > 0) add(acc, { name: numberTokenName("size", v), category: "size", value: v }, "size");
    }
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
        add(acc, { name: numberTokenName("radius", v), category: "radius", value: v }, "radius");
      }
    }
  }
  function collectEffects(acc, node) {
    var _a;
    if (!("effects" in node)) return;
    for (const e of node.effects) {
      if (e.visible === false) continue;
      if (e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW") {
        const hex = rgbToHex(e.color);
        add(acc, { name: colorTokenName(hex), category: "effectColor", value: hex }, "effectColor");
        for (const [g, val] of [
          ["shadow-blur", e.radius],
          ["shadow-spread", (_a = e.spread) != null ? _a : 0],
          ["shadow-x", e.offset.x],
          ["shadow-y", e.offset.y]
        ]) {
          const v = round(val);
          add(acc, { name: numberTokenName(g, v), category: "effectFloat", value: v }, "effectFloat");
        }
      } else if (e.type === "LAYER_BLUR" || e.type === "BACKGROUND_BLUR") {
        const v = round(e.radius);
        add(acc, { name: numberTokenName("blur", v), category: "effectFloat", value: v }, "effectFloat");
      }
    }
  }
  function walk(acc, node) {
    if ("fills" in node) collectPaints(acc, node.fills, "fill");
    if ("strokes" in node) collectPaints(acc, node.strokes, "stroke");
    if (node.type === "TEXT") collectText(acc, node);
    if (node.type === "FRAME" || node.type === "COMPONENT" || node.type === "INSTANCE") {
      collectSpacing(acc, node);
    }
    collectSize(acc, node);
    collectRadius(acc, node);
    collectEffects(acc, node);
    if ("children" in node) for (const child of node.children) walk(acc, child);
  }
  function extractFromSelection(selection2) {
    const acc = { map: /* @__PURE__ */ new Map(), warnings: /* @__PURE__ */ new Set() };
    for (const node of selection2) walk(acc, node);
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
  async function resolveGlobalCollection() {
    var _a;
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    return (_a = cols.find((c) => c.name === GLOBAL)) != null ? _a : figma.variables.createVariableCollection(GLOBAL);
  }
  async function createTokens(tokens, base) {
    const globalCol = await resolveGlobalCollection();
    const gMode = globalCol.defaultModeId;
    const idx = await buildVarIndex();
    const summary = { created: 0, updated: 0, globals: 0 };
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
    }
    return summary;
  }
  async function previewCreateTokens(tokens) {
    var _a, _b;
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const gId = (_b = (_a = cols.find((c) => c.name === GLOBAL)) == null ? void 0 : _a.id) != null ? _b : "#G";
    const existing = /* @__PURE__ */ new Set();
    for (const v of await figma.variables.getLocalVariablesAsync()) existing.add(vkey(v.variableCollectionId, v.name));
    const summary = { created: 0, updated: 0, globals: 0 };
    const seen = /* @__PURE__ */ new Set();
    for (const t of tokens) {
      const k = vkey(gId, t.name);
      summary.globals++;
      if (seen.has(k)) {
        summary.updated++;
        continue;
      }
      seen.add(k);
      summary[existing.has(k) ? "updated" : "created"]++;
    }
    return summary;
  }
  function setGlobalLiteral(v, modeId, t, type, base) {
    if (type === "COLOR") {
      const { r, g, b } = hexToRgb(String(t.value));
      v.setValueForMode(modeId, { r, g, b, a: 1 });
    } else if (type === "STRING") {
      v.setValueForMode(modeId, String(t.value));
    } else {
      const num = t.unit && t.unit !== "px" && typeof t.value === "number" ? toPx(t.value, t.unit, { base, fontSize: base }) : Number(t.value);
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
      const lh = t.lineHeight;
      if (lh !== figma.mixed && lh.unit !== "AUTO") {
        lineHeight = lh.unit === "PERCENT" ? roundN(fontSize * lh.value / 100) : roundN(lh.value);
      }
      let letterSpacing = 0;
      const ls = t.letterSpacing;
      if (ls !== figma.mixed && ls.unit === "PIXELS") letterSpacing = roundN(ls.value);
      samples.push({ fontSize, lineHeight, letterSpacing, family, style, layerName: t.name });
    }
    return { samples, warnings: [...warnings] };
  }
  async function createSemanticTextStyles(specs, apply, nodes) {
    var _a;
    const res = { created: 0, updated: 0, bound: 0, applied: 0, missing: [] };
    if (!specs.length) return res;
    const tokens = [];
    const seen = /* @__PURE__ */ new Set();
    const pushTok = (t) => {
      if (!seen.has(t.name)) {
        seen.add(t.name);
        tokens.push(t);
      }
    };
    for (const s of specs) {
      pushTok({ name: numberTokenName("font-size", s.fontSize), category: "fontSize", value: s.fontSize, sources: ["fontSize"] });
      if (s.lineHeight > 0)
        pushTok({ name: numberTokenName("line-height", s.lineHeight), category: "lineHeight", value: s.lineHeight, unit: "px", sources: ["lineHeight"] });
    }
    await createTokens(tokens, 16);
    const aliasMap = {};
    for (const s of specs) {
      aliasMap[`font-size/${s.name}`] = numberTokenName("font-size", s.fontSize);
      if (s.lineHeight > 0) aliasMap[`line-height/${s.name}`] = numberTokenName("line-height", s.lineHeight);
    }
    await createSemanticAliases(aliasMap);
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const semId = (_a = cols.find((c) => c.name === SEMANTIC)) == null ? void 0 : _a.id;
    const semByName = /* @__PURE__ */ new Map();
    if (semId) {
      for (const v of await figma.variables.getLocalVariablesAsync())
        if (v.variableCollectionId === semId) semByName.set(v.name, v);
    }
    const existing = await figma.getLocalTextStylesAsync();
    const styleByName = new Map(existing.map((s) => [s.name, s]));
    for (const spec of specs) {
      let style = styleByName.get(spec.name);
      const created = !style;
      if (!style) {
        style = figma.createTextStyle();
        style.name = spec.name;
      }
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
      style.lineHeight = spec.lineHeight > 0 ? { value: spec.lineHeight, unit: "PIXELS" } : { unit: "AUTO" };
      if (spec.letterSpacing) style.letterSpacing = { value: spec.letterSpacing, unit: "PIXELS" };
      const fsVar = semByName.get(`font-size/${spec.name}`);
      if (fsVar) {
        style.setBoundVariable("fontSize", fsVar);
        res.bound++;
      } else res.missing.push(`font-size/${spec.name}`);
      if (spec.lineHeight > 0) {
        const lhVar = semByName.get(`line-height/${spec.name}`);
        if (lhVar) {
          style.setBoundVariable("lineHeight", lhVar);
          res.bound++;
        } else res.missing.push(`line-height/${spec.name}`);
      }
      res[created ? "created" : "updated"]++;
      styleByName.set(spec.name, style);
    }
    if (apply) {
      const texts = [];
      for (const n of nodes) walkText(n, texts);
      for (const t of texts) {
        if (t.fontSize === figma.mixed || t.fontName === figma.mixed) continue;
        const fontSize = roundN(t.fontSize);
        const { family, style } = t.fontName;
        const spec = specs.find((s) => s.fontSize === fontSize && s.family === family && s.style === style);
        if (!spec) continue;
        const ts = styleByName.get(spec.name);
        if (!ts) continue;
        try {
          await figma.loadFontAsync(t.fontName);
          await t.setTextStyleIdAsync(ts.id);
          res.applied++;
        } catch (e) {
        }
      }
    }
    return res;
  }

  // src/lib/textStyles.ts
  var RAMP_NAMES = ["display", "h1", "h2", "h3", "title", "body", "caption", "overline"];
  var sigKey = (s) => `${s.fontSize}|${s.lineHeight}|${s.letterSpacing}|${s.family}|${s.style}`;
  function clusterTextStyles(samples) {
    const map = /* @__PURE__ */ new Map();
    for (const s of samples) {
      const k = sigKey(s);
      const ex = map.get(k);
      if (ex) ex.count++;
      else
        map.set(k, {
          fontSize: s.fontSize,
          lineHeight: s.lineHeight,
          letterSpacing: s.letterSpacing,
          family: s.family,
          style: s.style,
          count: 1,
          sample: s.layerName
        });
    }
    return [...map.values()];
  }
  function nameTextStyles(clusters) {
    const sorted = [...clusters].sort(
      (a, b) => b.fontSize - a.fontSize || b.count - a.count || b.lineHeight - a.lineHeight
    );
    return sorted.map((c, i) => ({
      name: i < RAMP_NAMES.length ? RAMP_NAMES[i] : `text-${i + 1}`,
      fontSize: c.fontSize,
      lineHeight: c.lineHeight,
      letterSpacing: c.letterSpacing,
      family: c.family,
      style: c.style
    }));
  }

  // src/lib/bind.ts
  var TIER = { [COMPONENT]: 3, [SEMANTIC]: 2, [GLOBAL]: 1 };
  function addColorCand(preview, node, field, index, hex, e) {
    preview == null ? void 0 : preview.candidates.push({ nodeId: node.id, field, index, currentValue: hex, variableId: e.variable.id, variableName: e.variable.name, tier: e.tier });
  }
  function addFloatCand(preview, node, field, value, e) {
    preview == null ? void 0 : preview.candidates.push({ nodeId: node.id, field, currentValue: String(value), variableId: e.variable.id, variableName: e.variable.name, tier: e.tier, distance: e.num != null ? Math.abs(e.num - value) : void 0 });
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
  function countNodes(sel) {
    let n = 0;
    const stack = sel.slice();
    while (stack.length) {
      const x = stack.pop();
      n++;
      if ("children" in x) for (const c of x.children) stack.push(c);
    }
    return n;
  }
  function note(res, key) {
    var _a;
    res.reasons[key] = ((_a = res.reasons[key]) != null ? _a : 0) + 1;
  }
  function skip(res, key) {
    res.skipped++;
    note(res, key);
  }
  async function bindSelection(selection2, tolerance, limits = {}, apply = true, hooks = {}) {
    var _a, _b, _c;
    const entries = await buildIndex();
    const res = { bound: 0, skipped: 0, flags: [], reasons: {} };
    const flagSet = /* @__PURE__ */ new Set();
    const budget = {
      nodes: (_a = limits.maxNodes) != null ? _a : Infinity,
      maxBindings: (_b = limits.maxBindings) != null ? _b : Infinity,
      limited: false
    };
    const prog = { done: 0, total: hooks.onProgress ? countNodes(selection2) : 0, every: 50 };
    const preview = apply ? null : { candidates: [], nodeIndex: [] };
    for (const node of selection2) {
      await walk2(node, entries, tolerance, res, flagSet, budget, apply, hooks, prog, preview, 0, null);
      if (res.cancelled) break;
    }
    if (budget.limited) res.limited = true;
    res.flags = [...flagSet];
    if (preview) {
      res.candidates = preview.candidates;
      res.nodes = pruneToAffected(preview.nodeIndex, preview.candidates);
    }
    (_c = hooks.onProgress) == null ? void 0 : _c.call(hooks, prog.done, prog.total);
    return res;
  }
  async function buildIndex() {
    var _a;
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
      const e = { variable: v, tier, type: v.resolvedType };
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
  function matchColor(entries, hex) {
    for (const e of entries) if (e.colorHex === hex) return e;
    return null;
  }
  function matchFloat(entries, value, tol) {
    let best = null;
    let bestDist = Infinity;
    for (const e of entries) {
      if (e.num == null) continue;
      const dist = Math.abs(e.num - value);
      if (dist > tol) continue;
      if (dist < bestDist || dist === bestDist && best !== null && best.tier < e.tier) {
        best = e;
        bestDist = dist;
      }
    }
    return best;
  }
  async function walk2(node, entries, tol, res, flags, budget, apply, hooks, prog, preview, depth, parentId) {
    var _a;
    if (res.cancelled) return;
    if (budget.nodes <= 0 || res.bound >= budget.maxBindings) {
      budget.limited = true;
      return;
    }
    budget.nodes--;
    preview == null ? void 0 : preview.nodeIndex.push({ id: node.id, name: node.name, type: node.type, depth, parentId });
    bindPaints(node, entries, res, apply, preview);
    bindFrame(node, entries, tol, res, flags, apply, preview);
    bindRadius(node, entries, tol, res, apply, preview);
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
    if ("children" in node)
      for (const c of node.children) {
        await walk2(c, entries, tol, res, flags, budget, apply, hooks, prog, preview, depth + 1, node.id);
        if (res.cancelled) return;
      }
  }
  function bindPaints(node, entries, res, apply, preview) {
    for (const key of ["fills", "strokes"]) {
      if (!(key in node)) continue;
      const paints2 = node[key];
      if (paints2 === figma.mixed || !Array.isArray(paints2)) continue;
      let changed = false;
      const next = paints2.map((p, i) => {
        if (p.type !== "SOLID") return p;
        const hex = rgbToHex(p.color);
        const e = matchColor(entries, hex);
        if (!e) {
          skip(res, "no-match");
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
      if (changed && apply) {
        try {
          node[key] = next;
        } catch (e) {
          note(res, "error");
        }
      }
    }
  }
  function bindFrame(node, entries, tol, res, flags, apply, preview) {
    if (node.type !== "FRAME" && node.type !== "COMPONENT" && node.type !== "INSTANCE") return;
    if (node.layoutSizingHorizontal === "FIXED") tryBind(node, "width", node.width, entries, tol, res, apply, preview);
    else if (node.layoutSizingHorizontal === "HUG" || node.layoutSizingHorizontal === "FILL") {
      flags.add("\uC77C\uBD80 \uD06C\uAE30\uB294 HUG/FILL\uC774\uB77C width/height \uBC14\uC778\uB529\uC744 \uAC74\uB108\uB700(Fixed \uD544\uC694).");
      note(res, "hug-fill");
    }
    if (node.layoutSizingVertical === "FIXED") tryBind(node, "height", node.height, entries, tol, res, apply, preview);
    if (node.layoutMode === "NONE") {
      flags.add("\uC624\uD1A0\uB808\uC774\uC544\uC6C3\uC774 \uC544\uB2CC \uD504\uB808\uC784\uC740 padding/gap \uBC14\uC778\uB529 \uBD88\uAC00.");
      note(res, "no-autolayout");
      return;
    }
    tryBind(node, "itemSpacing", node.itemSpacing, entries, tol, res, apply, preview);
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
  function bindEffects(node, entries, res, apply, preview) {
    if (!("effects" in node)) return;
    let changed = false;
    const next = node.effects.map((e, i) => {
      if (e.type !== "DROP_SHADOW" && e.type !== "INNER_SHADOW") return e;
      const hex = rgbToHex(e.color);
      const ent = matchColor(entries, hex);
      if (!ent) {
        skip(res, "no-match");
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
    if (changed && apply) {
      try {
        node.effects = next;
      } catch (e) {
        note(res, "error");
      }
    }
  }
  async function bindText(node, entries, tol, res, apply, preview) {
    if (node.type !== "TEXT") return;
    if (node.fontName === figma.mixed) return;
    try {
      await figma.loadFontAsync(node.fontName);
    } catch (e) {
      note(res, "font");
      return;
    }
    if (node.fontSize !== figma.mixed) tryBindText(node, "fontSize", node.fontSize, entries, tol, res, apply, preview);
    if (node.lineHeight !== figma.mixed && node.lineHeight.unit === "PIXELS") {
      tryBindText(node, "lineHeight", node.lineHeight.value, entries, tol, res, apply, preview);
    }
    if (node.letterSpacing !== figma.mixed && node.letterSpacing.unit === "PIXELS") {
      tryBindText(node, "letterSpacing", node.letterSpacing.value, entries, tol, res, apply, preview);
    }
  }
  function tryBindText(node, field, value, entries, tol, res, apply, preview) {
    const e = matchFloat(entries, value, tol);
    const len = node.characters.length;
    if (len === 0) {
      skip(res, "empty-text");
      return;
    }
    if (!e) {
      skip(res, "no-match");
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
      skip(res, "error");
    }
  }
  function tryBind(node, field, value, entries, tol, res, apply, preview) {
    const e = matchFloat(entries, value, tol);
    if (!e) {
      skip(res, "no-match");
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
      skip(res, "error");
    }
  }

  // src/lib/naming.ts
  var ROLE_VOCAB = [
    // 구조
    "container",
    "wrapper",
    "content",
    "group",
    // 영역
    "header",
    "body",
    "footer",
    "leading",
    "trailing",
    // 요소
    "icon",
    "image",
    "background",
    "swatch",
    "border",
    "divider",
    "badge",
    "avatar",
    // 시맨틱(영역/컴포넌트) — 인식·정리 + 일부 구조 추론
    "nav",
    "hero",
    "main",
    "sidebar",
    "section",
    "button",
    "card",
    "list",
    "item",
    "field",
    "tab",
    "chip",
    "label",
    "title"
  ];
  var ROLE_SET = new Set(ROLE_VOCAB);
  function isKnownRole(seg) {
    return ROLE_SET.has(seg);
  }
  function kebab(input) {
    return input.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/[\s_/]+/g, "-").replace(/[^a-zA-Z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
  }
  function layerNameFromRole(ancestorName, role, opts = {}) {
    const ctx = ancestorName ? kebab(ancestorName) : "";
    const parts = limitDepth([...ctx ? ctx.split("-") : [], kebab(role)], opts.maxDepth);
    return parts.filter(Boolean).join("-");
  }
  function limitDepth(segs, maxDepth = 3) {
    if (segs.length <= maxDepth) return segs;
    return segs.slice(segs.length - maxDepth);
  }
  var DEFAULT_NAME_RE = /^(Frame|Group|Rectangle|Ellipse|Line|Polygon|Star|Vector|Component|Instance|Slice|Section|Union|Subtract|Intersect|Exclude|Mask|Arrow)( \d+)?( copy( \d+)?)?$/;
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
  var LEAF_ROLE = {
    background: "background",
    bg: "background",
    fill: "background",
    surface: "background",
    swatch: "swatch",
    sample: "swatch",
    border: "border",
    stroke: "border",
    outline: "border",
    icon: "icon",
    glyph: "icon",
    divider: "divider",
    separator: "divider",
    rule: "divider",
    image: "image",
    img: "image",
    picture: "image",
    thumbnail: "image",
    avatar: "avatar",
    badge: "badge",
    dot: "badge",
    indicator: "badge"
  };
  function parseTokenName(tokenName) {
    var _a;
    const segs = tokenName.split("/").map((s) => s.trim()).filter(Boolean);
    if (!segs.length) return { roleLeaf: null, context: null, primitive: false };
    if (PRIMITIVE_NS.has(kebab(segs[0]))) return { roleLeaf: null, context: null, primitive: true };
    const roleLeaf = (_a = LEAF_ROLE[kebab(segs[segs.length - 1])]) != null ? _a : null;
    const ctxSegs = roleLeaf ? segs.slice(0, -1) : segs;
    const context = ctxSegs.length ? ctxSegs.map(kebab).filter(Boolean).join("-") : null;
    return { roleLeaf, context, primitive: false };
  }
  var UNIT_WORDS = /* @__PURE__ */ new Set(["percent", "px", "em", "rem", "ratio", "pt"]);
  function isTokenValue(v) {
    if (/^[0-9a-f]{6}$/.test(v)) return true;
    return v.split("-").every((s) => /^\d+$/.test(s) || UNIT_WORDS.has(s));
  }
  var GENERIC_ROLES = /* @__PURE__ */ new Set(["frame", "container", "wrapper", "content", "group", "section", "body", "main", "shape"]);
  function pickScope(name) {
    const segs = kebab(name).split("-").filter((s) => s && !/^\d+$/.test(s) && !UNIT_WORDS.has(s) && !/^[0-9a-f]{6}$/.test(s) && !GENERIC_ROLES.has(s));
    if (!segs.length) return null;
    const known = segs.filter(isKnownRole);
    return known.length ? known[known.length - 1] : segs[segs.length - 1];
  }
  function isTokenEchoName(name) {
    const n = name.trim().toLowerCase();
    for (const ns of PRIMITIVE_NS) {
      if (n.startsWith(ns + "-")) {
        const value = n.slice(ns.length + 1);
        if (value && isTokenValue(value)) return true;
      }
    }
    return false;
  }

  // src/lib/rename.ts
  async function renameSelection(selection2, opts) {
    const col = { changes: [], nodes: [] };
    await recurse(selection2, null, opts, col, 0, null, null);
    return { changes: col.changes, nodes: col.nodes, applied: opts.apply };
  }
  async function recurse(nodes, ancestorName, opts, col, depth, parentLayout, parentId) {
    const total = nodes.length;
    for (let i = 0; i < total; i++) {
      const node = nodes[i];
      const before = node.name;
      const pos = { index: i, total, parentLayout, depth };
      const decided = await decide(node, ancestorName, pos, opts);
      let contextForChildren = before;
      let after;
      if (!decided.skip && decided.name) {
        contextForChildren = decided.name;
        if (decided.name !== before) {
          after = decided.name;
          col.changes.push({ id: node.id, before, after });
          if (opts.apply) node.name = after;
        }
      }
      col.nodes.push({ id: node.id, name: before, type: node.type, depth, parentId, after });
      if ("children" in node && node.type !== "INSTANCE") {
        await recurse(node.children, contextForChildren, opts, col, depth + 1, layoutOf(node), node.id);
      }
    }
  }
  async function decide(node, ancestorName, pos, opts) {
    var _a;
    if (node.type === "COMPONENT" || node.type === "COMPONENT_SET") return { skip: true };
    if (node.type === "TEXT") return { skip: true };
    if (node.type === "INSTANCE") return { skip: true };
    if (node.locked) return { skip: true };
    if (pos.depth === 0 && isContainerType(node)) return { skip: true };
    if (!isDefaultName(node.name) && !isTokenEchoName(node.name)) return { skip: true };
    const token = await primaryToken(node);
    const role = resolveRole(node, token, pos);
    let scope = (_a = ancestorName ? pickScope(ancestorName) : null) != null ? _a : (token == null ? void 0 : token.context) ? pickScope(token.context) : null;
    if (scope === role) scope = null;
    return { skip: false, name: layerNameFromRole(scope, role, { maxDepth: opts.maxDepth }) };
  }
  function resolveRole(node, token, pos) {
    if (isButtonLike(node)) return "button";
    const region = regionRole(node, pos);
    if (region) return region;
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
        const count = "children" in node ? node.children.length : 0;
        if (count === 0) {
          if (hasImageFill(node)) return "image";
          if (hasColorFill(node)) return "swatch";
          return "container";
        }
        return count === 1 ? "wrapper" : "container";
      }
      default:
        return kebab(node.type);
    }
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
        if (v) return parseTokenName(v.name);
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
  function regionRole(node, pos) {
    if (pos.depth !== 1 || pos.parentLayout !== "vertical" || pos.total < 2) return null;
    if (!isContainerType(node)) return null;
    if (pos.index === 0) return "header";
    if (pos.index === pos.total - 1) return "footer";
    return null;
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
        return { ok: true, value: input };
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

  // src/lib/themeGen.ts
  function darkValueForLight(hex) {
    const lch = hexToOklch(hex);
    return oklchToHex(clampToGamut({ l: 1 - lch.l, c: lch.c, h: lch.h }));
  }
  function darkGlobalName(lightName) {
    return `dark/${lightName}`;
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
        return dimension(token, opts);
      default:
        return String(token.value);
    }
  }
  var cssVar = (name) => `--${kebab(name)}`;
  function cssDeclValue(token, value, aliasOf, opts) {
    if (aliasOf) return `var(${cssVar(aliasOf)})`;
    return value === void 0 ? cssLiteral(token, opts) : cssLiteral(__spreadProps(__spreadValues({}, token), { value, description: void 0 }), opts);
  }
  function toCss(tokens, opts) {
    var _a, _b;
    const root = [":root {"];
    for (const t of tokens) {
      if (t.aliasOf) {
        root.push(`  ${cssVar(t.name)}: var(${cssVar(t.aliasOf)});`);
      } else {
        root.push(`  ${cssVar(t.name)}: ${cssLiteral(t, opts)};`);
        if (t.kind === "fontWeight" && splitWeightStyle(t.value).italic) {
          root.push(`  ${cssVar(t.name)}-style: italic;`);
        }
      }
    }
    root.push("}");
    const blocks = [root.join("\n")];
    const themeOrder = [];
    for (const t of tokens) for (const th of (_a = t.themes) != null ? _a : []) if (!themeOrder.includes(th.theme)) themeOrder.push(th.theme);
    for (const theme of themeOrder) {
      const lines = [`[data-theme="${kebab(theme)}"] {`];
      for (const t of tokens) {
        const tv = ((_b = t.themes) != null ? _b : []).find((x) => x.theme === theme);
        if (!tv) continue;
        lines.push(`  ${cssVar(t.name)}: ${cssDeclValue(t, tv.value, tv.aliasOf, opts)};`);
      }
      lines.push("}");
      blocks.push(lines.join("\n"));
    }
    return blocks.join("\n\n");
  }
  var W3C_TYPE = {
    color: "color",
    fontSize: "dimension",
    spacing: "dimension",
    radius: "dimension",
    size: "dimension",
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

  // src/lib/components.ts
  var STATES = /* @__PURE__ */ new Set(["default", "hover", "pressed", "focus", "active", "disabled", "selected", "loading"]);
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
  function inferProp(value) {
    const v = value.toLowerCase();
    if (STATES.has(v)) return "state";
    if (SIZES.has(v)) return "size";
    if (TYPES.has(v)) return "type";
    return null;
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
      const prop = inferProp(seg);
      if (prop && !(prop in props)) props[prop] = seg;
      else {
        const key = unknown === 0 ? "variant" : `variant-${unknown + 1}`;
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
    const uniq = (base) => {
      let n = base || "prop";
      let i = 2;
      while (taken.has(n)) n = `${base || "prop"}-${i++}`;
      taken.add(n);
      return n;
    };
    for (const l of layers) {
      if (l.name.trim().endsWith("?")) {
        out.push({ propName: uniq(kebab(l.name.replace(/\?+$/, "")) || "show"), type: "BOOLEAN", layerName: l.name, field: "visible" });
      } else if (l.type === "TEXT") {
        out.push({ propName: uniq(kebab(l.name) || "text"), type: "TEXT", layerName: l.name, field: "characters" });
      } else if (l.type === "INSTANCE") {
        out.push({ propName: uniq(kebab(l.name) || "swap"), type: "INSTANCE_SWAP", layerName: l.name, field: "mainComponent" });
      }
    }
    return out;
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
  function classifyVariants(names) {
    var _a, _b;
    const byBase = /* @__PURE__ */ new Map();
    for (const name of names) {
      const p = parseVariantName(name);
      if (!p.base) continue;
      const list = (_a = byBase.get(p.base)) != null ? _a : [];
      list.push({ name, props: p.props });
      byBase.set(p.base, list);
    }
    const groups = [];
    const singles = [];
    for (const [base, parsed] of byBase) {
      const withProps = parsed.filter((p) => Object.keys(p.props).length > 0);
      if (withProps.length < 2) {
        for (const p of parsed) singles.push(p.name);
        continue;
      }
      const members = withProps.map((p) => ({
        name: p.name,
        props: p.props,
        variant: formatVariant(p.props)
      }));
      const properties = {};
      for (const m of members) {
        for (const [k, v] of Object.entries(m.props)) {
          const arr = (_b = properties[k]) != null ? _b : properties[k] = [];
          if (!arr.includes(v)) arr.push(v);
        }
      }
      for (const k of Object.keys(properties)) properties[k].sort();
      const keySig = (p) => Object.keys(p).sort().join(",");
      const sigs = new Set(members.map((m) => keySig(m.props)));
      let missing = [];
      if (sigs.size === 1) {
        const existing = new Set(members.map((m) => m.variant));
        missing = cartesian(properties).map(formatVariant).filter((v) => !existing.has(v));
      }
      groups.push({ base, properties, members, missing });
    }
    return { groups, singles };
  }
  function componentEligible(node) {
    return (node.type === "FRAME" || node.type === "GROUP") && !node.locked;
  }
  function scanComponentCandidates(selection2) {
    var _a, _b;
    const all = [];
    const visit = (n, depth, parentId) => {
      all.push({ id: n.id, name: n.name, type: n.type, depth, parentId, eligible: componentEligible(n) });
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

  // src/lib/entitlements.ts
  var TIERS = ["free", "pro", "team"];
  var TIER_RANK = { free: 0, pro: 1, team: 2 };
  var FEATURE_MIN_TIER = {
    unlimited: "pro",
    components: "pro",
    publish: "pro",
    multiMode: "pro",
    aiNaming: "pro",
    teamPresets: "team"
  };
  function hasEntitlement(tier, feature) {
    return TIER_RANK[tier] >= TIER_RANK[FEATURE_MIN_TIER[feature]];
  }
  var FREE_LIMITS = { nodes: 50, tokens: 100, bindings: 200 };
  var UNLIMITED = { nodes: Infinity, tokens: Infinity, bindings: Infinity };
  function limitsForTier(tier) {
    return hasEntitlement(tier, "unlimited") ? UNLIMITED : FREE_LIMITS;
  }
  function clampCount(requested, limit) {
    const allowed = Math.min(requested, limit);
    return { allowed, limited: requested > limit, overflow: Math.max(0, requested - allowed) };
  }
  function isTier(v) {
    return typeof v === "string" && TIERS.includes(v);
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
    return { key, tier: v.tier, expiresAt: v.expiresAt, lastVerified: now };
  }

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
    return { tier: "free", source: "none" };
  }
  var currentTier = () => effective().tier;
  function postLicense(note2) {
    const e = effective();
    post({
      type: "LICENSE_STATUS",
      tier: e.tier,
      unlimited: hasEntitlement(e.tier, "unlimited"),
      source: e.source,
      status: e.status,
      expiresAt: e.expiresAt,
      note: note2
    });
  }
  async function loadLicense() {
    try {
      const dt = await figma.clientStorage.getAsync(DEV_TIER_KEY);
      if (isTier(dt)) devTier = dt;
      const c = await figma.clientStorage.getAsync(CACHE_KEY);
      if (c && typeof c.key === "string" && isTier(c.tier) && typeof c.expiresAt === "number" && typeof c.lastVerified === "number") cache = c;
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
      post({ type: "PREREQ_STATE", hasGlobal, hasBindable });
    } catch (e) {
    }
  }
  function requireTeam() {
    if (hasEntitlement(currentTier(), "teamPresets")) return true;
    post({ type: "PREMIUM_REQUIRED", feature: "teamPresets", message: "\uD300 \uACF5\uC720 \uD504\uB9AC\uC14B/\uC774\uB825\uC740 Team \uC694\uAE08\uC81C \uAE30\uB2A5\uC785\uB2C8\uB2E4." });
    return false;
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
  function requirePro() {
    if (hasEntitlement(currentTier(), "components")) return true;
    post({ type: "PREMIUM_REQUIRED", feature: "components", message: "\uCEF4\uD3EC\uB10C\uD2B8 \uB4F1\uB85D\xB7\uBCA0\uB9AC\uC5B8\uD2B8 \uBD84\uB958\uB294 Pro \uC694\uAE08\uC81C \uAE30\uB2A5\uC785\uB2C8\uB2E4." });
    return false;
  }
  var TEXT_BIND_FIELDS = /* @__PURE__ */ new Set(["fontSize", "lineHeight", "letterSpacing"]);
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
        const paints2 = sn[item.field];
        if (paints2 === figma.mixed || !Array.isArray(paints2)) return false;
        const i = (_a = item.index) != null ? _a : 0;
        const p = paints2[i];
        if (!p || p.type !== "SOLID") return false;
        const arr = paints2.slice();
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
    if (hasEntitlement(currentTier(), "components")) return true;
    post({ type: "PREMIUM_REQUIRED", feature: "textStyles", message: "\uD14D\uC2A4\uD2B8 \uC2A4\uD0C0\uC77C \uB4F1\uB85D\uC740 Pro \uC694\uAE08\uC81C \uAE30\uB2A5\uC785\uB2C8\uB2E4." });
    return false;
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
    if (sc.includes("LINE_HEIGHT")) return "lineHeight";
    if (sc.includes("LETTER_SPACING")) return "letterSpacing";
    if (sc.includes("OPACITY")) return "opacity";
    if (sc.includes("FONT_WEIGHT")) return "fontWeight";
    if (sc.includes("FONT_FAMILY")) return "fontFamily";
    const n = v.name;
    if (n.startsWith("line-height")) return "lineHeight";
    if (n.startsWith("letter-spacing")) return "letterSpacing";
    if (n.startsWith("font-size")) return "fontSize";
    if (n.startsWith("spacing")) return "spacing";
    if (n.startsWith("radius")) return "radius";
    if (n.startsWith("size")) return "size";
    if (n.includes("font") && n.includes("weight")) return "fontWeight";
    if (n.includes("font") && n.includes("family")) return "fontFamily";
    if (n.includes("opacity")) return "opacity";
    return "other";
  }
  var EDITABLE_COLLECTIONS = /* @__PURE__ */ new Set([GLOBAL, SEMANTIC, COMPONENT]);
  var errMsg = (e) => e instanceof Error ? e.message : String(e);
  function toValueCell(type, raw, nameById) {
    if (raw && typeof raw === "object" && "type" in raw && raw.type === "VARIABLE_ALIAS") {
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
          if (raw && typeof raw === "object" && "type" in raw && raw.type === "VARIABLE_ALIAS") {
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
      return { type: "EDIT_VARIABLE_RESULT", id, ok: false, error: errMsg(e) };
    }
    const all = await figma.variables.getLocalVariablesAsync();
    const nameById = new Map(all.map((x) => [x.id, x.name]));
    return { type: "EDIT_VARIABLE_RESULT", id, ok: true, var: toVarInfo(v, col, nameById) };
  }
  var USAGE_SCAN_CAP = 5e3;
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
  function collectBoundNodes(varId) {
    const nodes = [];
    const stack = [...figma.currentPage.children];
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
  async function generateDarkMode(collectionId, fromModeId, toModeId) {
    var _a;
    let created = 0;
    let realiased = 0;
    let skipped = 0;
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const semanticCol = cols.find((c) => c.id === collectionId);
    if (!semanticCol) return { type: "DARK_MODE_RESULT", created, realiased, skipped };
    const globalCol = (_a = cols.find((c) => c.name === GLOBAL)) != null ? _a : figma.variables.createVariableCollection(GLOBAL);
    const gMode = globalCol.defaultModeId;
    const allVars = await figma.variables.getLocalVariablesAsync();
    const byId = new Map(allVars.map((v) => [v.id, v]));
    const globalByName = new Map(allVars.filter((v) => v.variableCollectionId === globalCol.id).map((v) => [v.name, v]));
    for (const v of allVars) {
      if (v.variableCollectionId !== semanticCol.id || v.resolvedType !== "COLOR") continue;
      const fromRaw = v.valuesByMode[fromModeId];
      if (!(fromRaw && typeof fromRaw === "object" && "type" in fromRaw && fromRaw.type === "VARIABLE_ALIAS")) {
        skipped++;
        continue;
      }
      const lightGlobal = byId.get(fromRaw.id);
      const lightRaw = lightGlobal == null ? void 0 : lightGlobal.valuesByMode[gMode];
      if (!lightGlobal || !(lightRaw && typeof lightRaw === "object" && "r" in lightRaw)) {
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
    return { type: "DARK_MODE_RESULT", created, realiased, skipped };
  }
  loadLicense().then(() => {
    postLicense();
    if (cache && evaluateLicense(cache, Date.now()).stale) post({ type: "REQUEST_VERIFY", key: cache.key });
  });
  var SCAN_CAP = 1500;
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
      scanned++;
      if (isBindableCandidate(n)) bindable++;
      if ("children" in n) for (const c of n.children) stack.push(c);
    }
    post({ type: "SELECTION_STATE", count: sel.length, scanned, bindable, capped });
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
    var _a, _b;
    try {
      switch (msg.type) {
        case "EXTRACT": {
          const sel = selection();
          const { tokens, warnings } = extractFromSelection(sel);
          post({ type: "EXTRACT_RESULT", tokens, warnings, selection: sel.length });
          break;
        }
        case "CREATE_TOKENS": {
          const limit = limitsForTier(currentTier()).tokens;
          const c = clampCount(msg.tokens.length, limit);
          const slice = msg.tokens.slice(0, c.allowed);
          const s = msg.preview ? await previewCreateTokens(slice) : await createTokens(slice, msg.base);
          const pruned = !msg.preview && msg.replacePalette ? await prunePaletteColors(msg.tokens.map((t) => t.name)) : 0;
          let summary = `Global ${s.globals}\uAC1C (\uC0DD\uC131 ${s.created} / \uAC31\uC2E0 ${s.updated}) \xB7 Semantic\uC740 \uC2DC\uB9E8\uD2F1 \uB9E4\uD551 \uB2E8\uACC4\uC5D0\uC11C`;
          if (pruned) summary += ` \xB7 \uC774\uC804 \uC0C9 ${pruned}\uAC1C \uC815\uB9AC`;
          if (c.limited) summary += ` \xB7 \u26A0 ${msg.tokens.length}\uAC1C \uC911 ${c.allowed}\uAC1C\uB9CC \uC801\uC6A9(Free \uD55C\uB3C4 ${limit}) \u2014 \uC5C5\uADF8\uB808\uC774\uB4DC \uD544\uC694`;
          post({ type: "CREATE_RESULT", created: s.created, updated: s.updated, summary, limited: c.limited, preview: msg.preview });
          if (!msg.preview) {
            commitUndo(figma);
            await postPrereq();
          }
          break;
        }
        case "APPLY": {
          const lim = limitsForTier(currentTier());
          bindCancel = false;
          const r = await bindSelection(
            selection(),
            msg.tolerance,
            { maxNodes: lim.nodes, maxBindings: lim.bindings },
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
            limited: !!r.limited,
            preview: msg.preview,
            cancelled: r.cancelled,
            candidates: r.candidates,
            // #6: 미리보기 후보(dry-run만)
            nodes: r.nodes
            // #13: 미리보기 트리 맥락
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
          for (const { id, after } of msg.items) {
            const node = await figma.getNodeByIdAsync(id);
            if (!node || !("name" in node)) continue;
            const before = node.name;
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
          const s = await createSemanticAliases(msg.map);
          post({ type: "SEMANTICS_RESULT", created: s.created, updated: s.updated, aliased: s.aliased, missing: s.missing });
          commitUndo(figma);
          await postPrereq();
          break;
        }
        case "SCAN_TEXT_STYLES": {
          const { samples, warnings } = scanTextStyles(selection());
          const styles = nameTextStyles(clusterTextStyles(samples));
          post({ type: "TEXT_STYLE_CANDIDATES", styles, warnings });
          break;
        }
        case "CREATE_TEXT_STYLES": {
          if (!requireTextStyles()) break;
          const r = await createSemanticTextStyles(msg.styles, msg.apply, selection());
          post({ type: "TEXT_STYLES_RESULT", created: r.created, updated: r.updated, bound: r.bound, applied: r.applied, missing: r.missing });
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
            post({ type: "EDIT_VARIABLE_RESULT", id: msg.id, ok: false, error: errMsg(e) });
          }
          break;
        }
        case "GET_VARIABLE_USAGE": {
          const { nodes, capped } = collectBoundNodes(msg.id);
          const aliasedBy = findAliasReferers(msg.id, await collectVars());
          post({ type: "VARIABLE_USAGE", id: msg.id, nodes, aliasedBy, capped });
          break;
        }
        case "GENERATE_DARK_MODE": {
          const r = await generateDarkMode(msg.collectionId, msg.fromModeId, msg.toModeId);
          post(r);
          if (r.created || r.realiased) {
            commitUndo(figma);
            await postPrereq();
          }
          post({ type: "VARIABLES", vars: await collectVars() });
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
          cache = null;
          try {
            await figma.clientStorage.deleteAsync(CACHE_KEY);
          } catch (e) {
          }
          postLicense("\uB77C\uC774\uC120\uC2A4 \uD0A4 \uC81C\uAC70\uB428");
          break;
        }
        case "GET_PRESETS": {
          if (!requireTeam()) break;
          post({ type: "PRESETS", presets });
          break;
        }
        case "SAVE_PRESET": {
          if (!requireTeam()) break;
          presets = upsertPreset(presets, msg.preset);
          await savePresets();
          post({ type: "PRESETS", presets });
          break;
        }
        case "DELETE_PRESET": {
          if (!requireTeam()) break;
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
            const themes = [];
            for (const m of col.modes) {
              if (m.modeId === col.defaultModeId) continue;
              const mraw = v.valuesByMode[m.modeId];
              const tv = { theme: m.name };
              if (mraw && typeof mraw === "object" && "type" in mraw && mraw.type === "VARIABLE_ALIAS") {
                const target = nameById.get(mraw.id);
                if (!target) continue;
                tv.aliasOf = target;
              } else if (v.resolvedType === "COLOR" && mraw && typeof mraw === "object" && "r" in mraw) {
                tv.value = rgbToHex(mraw);
              } else if (mraw !== void 0) {
                tv.value = mraw;
              } else {
                continue;
              }
              themes.push(tv);
            }
            if (themes.length) t.themes = themes;
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
          if (!requirePro()) break;
          post({ type: "COMPONENT_CANDIDATES", nodes: scanComponentCandidates(selection()) });
          break;
        }
        case "REGISTER_COMPONENTS": {
          if (!requirePro()) break;
          let registered = 0;
          let skipped = 0;
          let targets;
          if (msg.nodeIds && msg.nodeIds.length) {
            targets = [];
            for (const id of msg.nodeIds) {
              const n = await figma.getNodeByIdAsync(id);
              if (n && "type" in n) targets.push(n);
              else skipped++;
            }
          } else {
            targets = [...selection()];
          }
          for (const node of targets) {
            if (node.type === "COMPONENT" || node.type === "COMPONENT_SET") {
              skipped++;
              continue;
            }
            if (node.type === "INSTANCE" || node.type === "TEXT" || node.locked) {
              skipped++;
              continue;
            }
            if (node.type !== "FRAME" && node.type !== "GROUP") {
              skipped++;
              continue;
            }
            try {
              figma.createComponentFromNode(node);
              registered++;
            } catch (e) {
              skipped++;
            }
          }
          post({ type: "COMPONENTS_RESULT", registered, skipped });
          if (registered) commitUndo(figma);
          break;
        }
        case "CLASSIFY_VARIANTS": {
          if (!requirePro()) break;
          const comps = selection().filter((n) => n.type === "COMPONENT");
          const byName = /* @__PURE__ */ new Map();
          for (const c of comps) if (!byName.has(c.name)) byName.set(c.name, c);
          const result = classifyVariants(comps.map((c) => c.name));
          let sets = 0;
          const missing = [];
          for (const g of result.groups) {
            const nodes = g.members.map((m) => byName.get(m.name)).filter((n) => {
              var _a2;
              return !!n && ((_a2 = n.parent) == null ? void 0 : _a2.type) !== "COMPONENT_SET";
            });
            if (nodes.length < 2) continue;
            try {
              const parent = (_a = nodes[0].parent) != null ? _a : figma.currentPage;
              const set = figma.combineAsVariants(nodes, parent);
              set.name = g.base;
              for (const m of g.members) {
                const node = byName.get(m.name);
                if (node) node.name = m.variant;
              }
              arrangeSet(set);
              sets++;
              if (g.missing.length) missing.push(`${g.base}: ${g.missing.join(" / ")}`);
            } catch (e) {
            }
          }
          post({ type: "VARIANTS_RESULT", sets, missing, singles: result.singles });
          if (sets) commitUndo(figma);
          break;
        }
        case "GENERATE_MISSING_VARIANTS": {
          if (!requirePro()) break;
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
        case "EXPOSE_PROPERTIES": {
          if (!requirePro()) break;
          let created = 0;
          const props = [];
          for (const node of selection()) {
            if (node.type !== "COMPONENT") continue;
            const layers = node.findAll(() => true);
            const plan = inferComponentProperties(layers.map((l) => ({ name: l.name, type: l.type })));
            for (const p of plan) {
              const target = layers.find((l) => l.name === p.layerName);
              if (!target) continue;
              try {
                let def = "";
                if (p.type === "TEXT") def = target.type === "TEXT" ? target.characters : "";
                else if (p.type === "BOOLEAN") def = target.visible;
                else def = target.type === "INSTANCE" && target.mainComponent ? target.mainComponent.key || target.mainComponent.id : "";
                const id = node.addComponentProperty(p.propName, p.type, def);
                const refs = __spreadValues({}, (_b = target.componentPropertyReferences) != null ? _b : {});
                refs[p.field] = id;
                target.componentPropertyReferences = refs;
                created++;
                props.push(`${p.propName}:${p.type}`);
              } catch (e) {
              }
            }
          }
          post({ type: "PROPERTIES_RESULT", created, props });
          if (created) commitUndo(figma);
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
