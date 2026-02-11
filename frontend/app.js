import * as THREE from "/assets/vendor/three/three.module.js";
import { OrbitControls } from "/assets/vendor/three/OrbitControls.js";

const state = {
  blueprint: null,
  analysis: null,
  images: [],
  localMode: false,
  backendChecked: false,
  prototypeUrl: "",
  teapotGroup: null,
  recomputeTimer: null,
  playgroundTimer: null,
  playground: {
    baseDims: null,
    values: {
      bodyCurve: 0,
      headFlare: 0,
      height: 0,
      neck: 0,
      handle: 0,
      base: 0,
    },
    lockCapacity: true,
  },
  three: {
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    detachState: {
      distancePct: 38,
      bottom: false,
      flare: false,
      gasket: false,
      strainer: false,
    },
    flareState: {
      sizePct: 100,
      curvaturePct: 100,
      lastAppliedSizePct: 100,
    },
    materialState: {
      preset: "custom",
      primaryColor: "#c9d0d4",
      metalness: 0,
      roughness: 0.22,
    },
  },
};

const dimensionMeta = [
  { key: "body_height_mm", label: "Body Height", step: 0.1, min: 20 },
  { key: "body_max_diameter_mm", label: "Body Max Diameter", step: 0.1, min: 20 },
  { key: "body_bottom_diameter_mm", label: "Body Bottom Diameter", step: 0.1, min: 20 },
  { key: "neck_diameter_mm", label: "Neck Diameter", step: 0.1, min: 20 },
  { key: "head_height_mm", label: "Curved Head Height", step: 0.1, min: 10 },
  { key: "head_top_diameter_mm", label: "Head Top Diameter", step: 0.1, min: 20 },
  { key: "head_neck_overlap_mm", label: "Head/Body Overlap", step: 0.1, min: 0 },
  { key: "handle_length_mm", label: "Handle Length", step: 0.1, min: 20 },
  { key: "handle_drop_mm", label: "Handle Drop", step: 0.1, min: 10 },
  { key: "handle_offset_mm", label: "Handle Offset", step: 0.1, min: 1 },
  { key: "handle_thickness_mm", label: "Handle Thickness", step: 0.1, min: 2 },
  { key: "insert_outer_diameter_mm", label: "Insert Outer Diameter", step: 0.1, min: 10 },
  { key: "insert_inner_diameter_mm", label: "Insert Inner Diameter", step: 0.1, min: 8 },
  { key: "insert_height_mm", label: "Insert Height", step: 0.1, min: 5 },
  { key: "gasket_cross_section_mm", label: "Gasket Cross Section", step: 0.1, min: 1 },
  { key: "wall_thickness_mm", label: "Wall Thickness", step: 0.05, min: 0.2 },
  { key: "manufacturing_tolerance_mm", label: "Tolerance", step: 0.01, min: 0.01 },
  { key: "base_cap_height_mm", label: "Base Cap Height", step: 0.1, min: 1 },
  { key: "base_cap_diameter_mm", label: "Base Cap Diameter", step: 0.1, min: 10 },
  { key: "overall_height_mm", label: "Overall Height (Computed)", readOnly: true },
  { key: "estimated_capacity_ml", label: "Estimated Capacity (Computed)", readOnly: true },
  { key: "capacity_target_ml", label: "Target Capacity (Computed)", readOnly: true },
];

const capacityScaleKeys = [
  "wall_thickness_mm",
  "body_height_mm",
  "body_max_diameter_mm",
  "body_bottom_diameter_mm",
  "neck_diameter_mm",
  "head_height_mm",
  "head_top_diameter_mm",
  "head_neck_overlap_mm",
  "handle_length_mm",
  "handle_drop_mm",
  "handle_offset_mm",
  "handle_thickness_mm",
  "insert_outer_diameter_mm",
  "insert_inner_diameter_mm",
  "insert_height_mm",
  "gasket_cross_section_mm",
  "base_cap_height_mm",
  "base_cap_diameter_mm",
];

const localImageNames = [
  "Screenshot 2026-02-09 224903.png",
  "Screenshot 2026-02-09 224934.png",
  "Screenshot 2026-02-09 224951.png",
  "Screenshot 2026-02-09 225006.png",
  "Screenshot 2026-02-09 225020.png",
  "Screenshot 2026-02-09 225036.png",
  "Screenshot 2026-02-09 225219.png",
  "Screenshot 2026-02-09 225243.png",
  "Screenshot 2026-02-09 225304.png",
];

const THREE_MATERIAL_PRESETS = {
  "stainless-brushed": {
    primaryColor: "#c9d0d4",
    accentColor: "#9ca9af",
    handleColor: "#14181c",
    gasketColor: "#214b3f",
    metalness: 0.86,
    roughness: 0.22,
    accentMetalness: 0.78,
    accentRoughness: 0.35,
    handleMetalness: 0.12,
    handleRoughness: 0.86,
  },
  "stainless-polished": {
    primaryColor: "#d8dee1",
    accentColor: "#b9c5ca",
    handleColor: "#1f2328",
    gasketColor: "#1f4d40",
    metalness: 0.95,
    roughness: 0.12,
    accentMetalness: 0.88,
    accentRoughness: 0.2,
    handleMetalness: 0.16,
    handleRoughness: 0.72,
  },
  "stainless-dark": {
    primaryColor: "#7f8f97",
    accentColor: "#697980",
    handleColor: "#111418",
    gasketColor: "#1a4338",
    metalness: 0.8,
    roughness: 0.42,
    accentMetalness: 0.75,
    accentRoughness: 0.5,
    handleMetalness: 0.08,
    handleRoughness: 0.9,
  },
  copper: {
    primaryColor: "#bc7846",
    accentColor: "#9c5e34",
    handleColor: "#20242a",
    gasketColor: "#4d3528",
    metalness: 0.92,
    roughness: 0.24,
    accentMetalness: 0.85,
    accentRoughness: 0.3,
    handleMetalness: 0.18,
    handleRoughness: 0.76,
  },
  "ceramic-white": {
    primaryColor: "#f1f4f6",
    accentColor: "#dfe5e8",
    handleColor: "#30353b",
    gasketColor: "#8f9ca5",
    metalness: 0.08,
    roughness: 0.56,
    accentMetalness: 0.08,
    accentRoughness: 0.64,
    handleMetalness: 0.1,
    handleRoughness: 0.82,
  },
  "matte-black": {
    primaryColor: "#242a2f",
    accentColor: "#1a1f24",
    handleColor: "#171b20",
    gasketColor: "#2b343a",
    metalness: 0.14,
    roughness: 0.86,
    accentMetalness: 0.12,
    accentRoughness: 0.9,
    handleMetalness: 0.08,
    handleRoughness: 0.92,
  },
  "anodized-blue": {
    primaryColor: "#3e6f8f",
    accentColor: "#2f566e",
    handleColor: "#16232e",
    gasketColor: "#2c3f4a",
    metalness: 0.65,
    roughness: 0.32,
    accentMetalness: 0.6,
    accentRoughness: 0.4,
    handleMetalness: 0.12,
    handleRoughness: 0.84,
  },
};

const els = {
  cupsInput: document.getElementById("cupsInput"),
  loadDefaultBtn: document.getElementById("loadDefaultBtn"),
  analyzeBtn: document.getElementById("analyzeBtn"),
  applyAnalysisBtn: document.getElementById("applyAnalysisBtn"),
  imageCountBadge: document.getElementById("imageCountBadge"),
  imageStrip: document.getElementById("imageStrip"),
  analysisSummary: document.getElementById("analysisSummary"),
  partsList: document.getElementById("partsList"),
  dimensionsTable: document.getElementById("dimensionsTable"),
  materialsTable: document.getElementById("materialsTable"),
  bomTable: document.getElementById("bomTable"),
  threeCanvas: document.getElementById("threeCanvas"),
  blueprintSvg: document.getElementById("blueprintSvg"),
  capacityLabel: document.getElementById("capacityLabel"),
  statusBox: document.getElementById("statusBox"),
  generatePrototypeBtn: document.getElementById("generatePrototypeBtn"),
  prototypeImage: document.getElementById("prototypeImage"),
  prototypeMeta: document.getElementById("prototypeMeta"),
  threeAutoRotate: document.getElementById("threeAutoRotate"),
  threeMaterialPreset: document.getElementById("threeMaterialPreset"),
  threePrimaryColor: document.getElementById("threePrimaryColor"),
  threeMetalness: document.getElementById("threeMetalness"),
  threeRoughness: document.getElementById("threeRoughness"),
  threeMetalnessVal: document.getElementById("threeMetalnessVal"),
  threeRoughnessVal: document.getElementById("threeRoughnessVal"),
  threeHeadFlareSize: document.getElementById("threeHeadFlareSize"),
  threeHeadFlareSizeVal: document.getElementById("threeHeadFlareSizeVal"),
  threeHeadCurvature: document.getElementById("threeHeadCurvature"),
  threeHeadCurvatureVal: document.getElementById("threeHeadCurvatureVal"),
  threeDetachDistance: document.getElementById("threeDetachDistance"),
  threeDetachDistanceVal: document.getElementById("threeDetachDistanceVal"),
  detachBottomToggle: document.getElementById("detachBottomToggle"),
  detachFlareToggle: document.getElementById("detachFlareToggle"),
  detachGasketToggle: document.getElementById("detachGasketToggle"),
  detachStrainerToggle: document.getElementById("detachStrainerToggle"),
  shapeBodyCurve: document.getElementById("shapeBodyCurve"),
  shapeHeadFlare: document.getElementById("shapeHeadFlare"),
  shapeHeight: document.getElementById("shapeHeight"),
  shapeNeck: document.getElementById("shapeNeck"),
  shapeHandle: document.getElementById("shapeHandle"),
  shapeBase: document.getElementById("shapeBase"),
  shapeBodyCurveVal: document.getElementById("shapeBodyCurveVal"),
  shapeHeadFlareVal: document.getElementById("shapeHeadFlareVal"),
  shapeHeightVal: document.getElementById("shapeHeightVal"),
  shapeNeckVal: document.getElementById("shapeNeckVal"),
  shapeHandleVal: document.getElementById("shapeHandleVal"),
  shapeBaseVal: document.getElementById("shapeBaseVal"),
  shapeLockCapacity: document.getElementById("shapeLockCapacity"),
  shapeResetBtn: document.getElementById("shapeResetBtn"),
  shapeSetBaseBtn: document.getElementById("shapeSetBaseBtn"),
  shapeApplyBtn: document.getElementById("shapeApplyBtn"),
  partsPrintSvg: document.getElementById("partsPrintSvg"),
};

function mmToIn(mm) {
  return mm / 25.4;
}

function formatNumber(value, digits = 1) {
  if (!Number.isFinite(value)) {
    return "--";
  }
  return value.toFixed(digits);
}

function setStatus(message, type = "") {
  els.statusBox.textContent = message;
  els.statusBox.classList.remove("ok", "warn");
  if (type) {
    els.statusBox.classList.add(type);
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value) {
  return clamp(Number(value), 0, 1);
}

function lerp(a, b, t) {
  return a + ((b - a) * t);
}

function smoothstep01(t) {
  const x = clamp(Number(t), 0, 1);
  return x * x * (3 - (2 * x));
}

function cloneDimensions(dim) {
  return JSON.parse(JSON.stringify(dim));
}

function setSliderValue(el, value) {
  if (!el) {
    return;
  }
  el.value = String(value);
}

function normalizeHexColor(value, fallback = "#c9d0d4") {
  const raw = String(value || "").trim();
  const prefixed = raw.startsWith("#") ? raw : `#${raw}`;
  if (/^#[0-9a-fA-F]{6}$/.test(prefixed)) {
    return prefixed.toLowerCase();
  }
  return fallback;
}

function getThreeMaterialPreset(presetKey) {
  return THREE_MATERIAL_PRESETS[presetKey] || THREE_MATERIAL_PRESETS["stainless-brushed"];
}

function shadeHexColor(hex, multiplier) {
  const color = new THREE.Color(normalizeHexColor(hex));
  color.multiplyScalar(clamp(Number(multiplier), 0.2, 1.6));
  return `#${color.getHexString()}`;
}

function updateThreeMaterialValueLabels() {
  if (!els.threeMetalnessVal || !els.threeRoughnessVal) {
    return;
  }
  const material = state.three.materialState;
  els.threeMetalnessVal.textContent = `${Math.round(clamp01(material.metalness) * 100)}%`;
  els.threeRoughnessVal.textContent = `${Math.round(clamp01(material.roughness) * 100)}%`;
}

function syncThreeMaterialInputs() {
  const material = state.three.materialState;
  if (els.threeMaterialPreset) {
    els.threeMaterialPreset.value = material.preset;
  }
  if (els.threePrimaryColor) {
    els.threePrimaryColor.value = normalizeHexColor(material.primaryColor);
  }
  if (els.threeMetalness) {
    els.threeMetalness.value = String(Math.round(clamp01(material.metalness) * 100));
  }
  if (els.threeRoughness) {
    els.threeRoughness.value = String(Math.round(clamp01(material.roughness) * 100));
  }
  updateThreeMaterialValueLabels();
}

function syncThreeDetachInputs() {
  const detach = state.three.detachState;
  if (els.threeDetachDistance) {
    els.threeDetachDistance.value = String(detach.distancePct);
  }
  if (els.threeDetachDistanceVal) {
    els.threeDetachDistanceVal.textContent = `${detach.distancePct}%`;
  }
  if (els.detachBottomToggle) {
    els.detachBottomToggle.checked = Boolean(detach.bottom);
  }
  if (els.detachFlareToggle) {
    els.detachFlareToggle.checked = Boolean(detach.flare);
  }
  if (els.detachGasketToggle) {
    els.detachGasketToggle.checked = Boolean(detach.gasket);
  }
  if (els.detachStrainerToggle) {
    els.detachStrainerToggle.checked = Boolean(detach.strainer);
  }
}

function syncThreeFlareInputs() {
  const flare = state.three.flareState;
  if (els.threeHeadFlareSize) {
    els.threeHeadFlareSize.value = String(flare.sizePct);
  }
  if (els.threeHeadFlareSizeVal) {
    els.threeHeadFlareSizeVal.textContent = `${flare.sizePct}%`;
  }
  if (els.threeHeadCurvature) {
    els.threeHeadCurvature.value = String(flare.curvaturePct);
  }
  if (els.threeHeadCurvatureVal) {
    els.threeHeadCurvatureVal.textContent = `${flare.curvaturePct}%`;
  }
}

function resetThreeFormControls() {
  state.three.detachState = {
    distancePct: 38,
    bottom: false,
    flare: false,
    gasket: false,
    strainer: false,
  };
  state.three.flareState = {
    sizePct: 100,
    curvaturePct: 100,
    lastAppliedSizePct: 100,
  };
  syncThreeDetachInputs();
  syncThreeFlareInputs();
}

function getHeadCurvatureScale() {
  const pct = Number(state.three.flareState.curvaturePct || 100);
  return clamp(pct / 100, 0.4, 1.7);
}

function getExplodeDistanceMm(dim) {
  const pct = clamp(Number(state.three.detachState.distancePct || 0), 0, 100);
  const ref = Math.max(Number(dim.overall_height_mm), Number(dim.head_top_diameter_mm), 80);
  return (pct / 100) * (ref * 0.55);
}

function getPartOffsetVector(dim, partKey) {
  const detach = state.three.detachState;
  const distance = getExplodeDistanceMm(dim);
  if (distance <= 0) {
    return new THREE.Vector3(0, 0, 0);
  }
  if (partKey === "bottom" && detach.bottom) {
    return new THREE.Vector3(0, -distance * 0.68, 0);
  }
  if (partKey === "flare" && detach.flare) {
    return new THREE.Vector3(0, distance * 0.58, 0);
  }
  if (partKey === "gasket" && detach.gasket) {
    return new THREE.Vector3(distance * 0.22, distance * 0.74, 0);
  }
  if (partKey === "strainer" && detach.strainer) {
    return new THREE.Vector3(-distance * 0.18, distance * 0.82, 0);
  }
  return new THREE.Vector3(0, 0, 0);
}

function applyHeadFlareSizeRatio(ratio) {
  if (!state.blueprint?.dimensions || !Number.isFinite(ratio)) {
    return;
  }
  const dim = state.blueprint.dimensions;
  dim.head_top_diameter_mm = clamp(Number(dim.head_top_diameter_mm) * ratio, Number(dim.neck_diameter_mm) + 8, 260);
  dim.head_height_mm = clamp(Number(dim.head_height_mm) * (1 + ((ratio - 1) * 0.72)), 20, 180);
  dim.head_neck_overlap_mm = clamp(Number(dim.head_neck_overlap_mm), 2, dim.head_height_mm * 0.5);
  dim.overall_height_mm = Number((
    Number(dim.body_height_mm)
    + Number(dim.head_height_mm)
    - Number(dim.head_neck_overlap_mm)
  ).toFixed(2));
}

function applyThreeMaterialPreset(presetKey, rerender = true) {
  if (presetKey === "custom") {
    state.three.materialState.preset = "custom";
    state.three.materialState.primaryColor = normalizeHexColor(state.three.materialState.primaryColor);
    state.three.materialState.metalness = clamp01(state.three.materialState.metalness);
    state.three.materialState.roughness = clamp01(state.three.materialState.roughness);
    syncThreeMaterialInputs();
    if (rerender && state.blueprint) {
      renderThreeModel();
    }
    return;
  }

  const resolvedKey = (presetKey in THREE_MATERIAL_PRESETS) ? presetKey : "stainless-brushed";
  const preset = getThreeMaterialPreset(resolvedKey);
  state.three.materialState.preset = resolvedKey;
  state.three.materialState.primaryColor = normalizeHexColor(preset.primaryColor);
  state.three.materialState.metalness = clamp01(preset.metalness);
  state.three.materialState.roughness = clamp01(preset.roughness);
  syncThreeMaterialInputs();
  if (rerender && state.blueprint) {
    renderThreeModel();
  }
}

function markThreeMaterialCustom() {
  state.three.materialState.preset = "custom";
  if (els.threeMaterialPreset) {
    els.threeMaterialPreset.value = "custom";
  }
}

function resolveThreeMaterialPalette() {
  const material = state.three.materialState;
  const preset = getThreeMaterialPreset(material.preset);
  const primaryColor = normalizeHexColor(material.primaryColor, preset.primaryColor);
  const accentColor = normalizeHexColor(
    material.preset === "custom" ? shadeHexColor(primaryColor, 0.79) : preset.accentColor,
    shadeHexColor(primaryColor, 0.79),
  );
  const handleColor = normalizeHexColor(preset.handleColor, "#14181c");
  const gasketColor = normalizeHexColor(preset.gasketColor, "#214b3f");
  return {
    primaryColor,
    accentColor,
    handleColor,
    gasketColor,
    metalness: clamp01(material.metalness),
    roughness: clamp01(material.roughness),
    accentMetalness: clamp01(preset.accentMetalness ?? (material.metalness * 0.88)),
    accentRoughness: clamp01(preset.accentRoughness ?? (material.roughness + 0.1)),
    handleMetalness: clamp01(preset.handleMetalness ?? 0.12),
    handleRoughness: clamp01(preset.handleRoughness ?? 0.86),
  };
}

function buildBodyProfilePoints(dim, sampleCount = 34) {
  const bodyH = Number(dim.body_height_mm);
  const rBottom = Number(dim.body_bottom_diameter_mm) * 0.5;
  const rMax = Number(dim.body_max_diameter_mm) * 0.5;
  const rNeck = Number(dim.neck_diameter_mm) * 0.5;
  const bulgeY = bodyH * 0.42;
  const points = [];

  for (let i = 0; i <= sampleCount; i += 1) {
    const y = (bodyH * i) / sampleCount;
    let r = rBottom;
    if (y <= bulgeY) {
      const t = smoothstep01(y / Math.max(bulgeY, 1));
      const softBulge = Math.sin(Math.PI * t) * (rMax - rBottom) * 0.06;
      r = lerp(rBottom, rMax, t) + softBulge;
    } else {
      const t = smoothstep01((y - bulgeY) / Math.max(bodyH - bulgeY, 1));
      const shoulder = Math.sin(Math.PI * t) * (rMax - rNeck) * 0.05;
      r = lerp(rMax, rNeck, t) + (shoulder * (1 - (t * 0.5)));
    }
    points.push([Math.max(r, 4), y]);
  }
  return points;
}

function buildHeadProfilePoints(dim, sampleCount = 24, startY = null, options = {}) {
  const bodyH = Number(dim.body_height_mm);
  const overallH = Number(dim.overall_height_mm);
  const overlap = Number(dim.head_neck_overlap_mm);
  const rNeck = Number(dim.neck_diameter_mm) * 0.5;
  const rHead = Number(dim.head_top_diameter_mm) * 0.5;
  const curvatureScale = clamp(Number(options.curvatureScale ?? getHeadCurvatureScale()), 0.4, 1.7);
  const defaultStart = bodyH - overlap;
  const start = clamp(Number.isFinite(startY) ? startY : defaultStart, 0, overallH - 1);
  const span = Math.max(overallH - start, 1);
  const points = [];

  for (let i = 0; i <= sampleCount; i += 1) {
    const t = smoothstep01(i / sampleCount);
    const curvedT = clamp(Math.pow(t, 1 / curvatureScale), 0, 1);
    const y = start + (span * t);
    const flare = Math.sin(Math.PI * curvedT) * (rHead - rNeck) * (0.1 * curvatureScale);
    const r = lerp(rNeck, rHead, curvedT) + (flare * (1 - (curvedT * 0.35)));
    points.push([Math.max(r, 4), y]);
  }
  return points;
}

function buildOuterProfilePoints(dim, bodySamples = 34, headSamples = 24, options = {}) {
  const body = buildBodyProfilePoints(dim, bodySamples);
  const head = buildHeadProfilePoints(dim, headSamples, Number(dim.body_height_mm), options);
  return [...body, ...head.slice(1)];
}

function toLatheProfile(points) {
  return points.map(([radius, y]) => new THREE.Vector2(Math.max(radius, 1), y));
}

function getProfileOptions() {
  return {
    curvatureScale: getHeadCurvatureScale(),
  };
}

function updatePlaygroundValueLabels() {
  if (!els.shapeBodyCurveVal) {
    return;
  }
  const v = state.playground.values;
  els.shapeBodyCurveVal.textContent = `${v.bodyCurve}%`;
  els.shapeHeadFlareVal.textContent = `${v.headFlare}%`;
  els.shapeHeightVal.textContent = `${v.height}%`;
  els.shapeNeckVal.textContent = `${v.neck}%`;
  els.shapeHandleVal.textContent = `${v.handle}%`;
  els.shapeBaseVal.textContent = `${v.base}%`;
}

function setPlaygroundDefaults() {
  state.playground.values = {
    bodyCurve: 0,
    headFlare: 0,
    height: 0,
    neck: 0,
    handle: 0,
    base: 0,
  };
  setSliderValue(els.shapeBodyCurve, 0);
  setSliderValue(els.shapeHeadFlare, 0);
  setSliderValue(els.shapeHeight, 0);
  setSliderValue(els.shapeNeck, 0);
  setSliderValue(els.shapeHandle, 0);
  setSliderValue(els.shapeBase, 0);
  if (els.shapeLockCapacity) {
    els.shapeLockCapacity.checked = true;
  }
  state.playground.lockCapacity = true;
  updatePlaygroundValueLabels();
}

function capturePlaygroundBase() {
  if (!state.blueprint?.dimensions) {
    return;
  }
  state.playground.baseDims = cloneDimensions(state.blueprint.dimensions);
}

function initPlaygroundFromBlueprint() {
  capturePlaygroundBase();
  setPlaygroundDefaults();
}

const US_CUP_TO_ML = 236.588;

function cupsToMl(cups) {
  return cups * US_CUP_TO_ML;
}

function baseDimensions() {
  return {
    cups_target: 4.0,
    capacity_target_ml: 946.0,
    estimated_capacity_ml: 980.0,
    wall_thickness_mm: 0.9,
    manufacturing_tolerance_mm: 0.25,
    body_height_mm: 125.0,
    body_max_diameter_mm: 116.0,
    body_bottom_diameter_mm: 90.0,
    neck_diameter_mm: 84.0,
    head_height_mm: 58.0,
    head_top_diameter_mm: 150.0,
    head_neck_overlap_mm: 10.0,
    handle_length_mm: 92.0,
    handle_drop_mm: 66.0,
    handle_offset_mm: 20.0,
    handle_thickness_mm: 14.0,
    insert_outer_diameter_mm: 56.0,
    insert_inner_diameter_mm: 36.0,
    insert_height_mm: 26.0,
    gasket_cross_section_mm: 3.0,
    base_cap_height_mm: 6.0,
    base_cap_diameter_mm: 88.0,
    overall_height_mm: 173.0,
  };
}

function frustumVolumeMm3(r1, r2, h) {
  return Math.PI * h * (r1 * r1 + r1 * r2 + r2 * r2) / 3.0;
}

function estimateCapacityMl(dim) {
  const t = Number(dim.wall_thickness_mm);
  const bodyH = Number(dim.body_height_mm);
  const rBottom = Math.max((Number(dim.body_bottom_diameter_mm) * 0.5) - t, 1.0);
  const rMax = Math.max((Number(dim.body_max_diameter_mm) * 0.5) - t, 1.0);
  const rNeck = Math.max((Number(dim.neck_diameter_mm) * 0.5) - t, 1.0);
  const rHead = Math.max((Number(dim.head_top_diameter_mm) * 0.5) - t, 1.0);

  const bodySegments = [
    [rBottom, rMax, bodyH * 0.30],
    [rMax, rMax * 0.98, bodyH * 0.38],
    [rMax * 0.98, rNeck, bodyH * 0.32],
  ];

  const headH = Math.max(Number(dim.head_height_mm) - Number(dim.head_neck_overlap_mm), 8.0);
  const headSegments = [
    [rNeck, rNeck * 1.18, headH * 0.45],
    [rNeck * 1.18, rHead, headH * 0.55],
  ];

  let totalMm3 = 0;
  [...bodySegments, ...headSegments].forEach(([a, b, h]) => {
    totalMm3 += frustumVolumeMm3(a, b, h);
  });

  const insertR = Math.max((Number(dim.insert_outer_diameter_mm) * 0.5) - t, 1.0);
  const insertH = Math.max(Number(dim.insert_height_mm), 1.0);
  const intrusion = Math.PI * insertR * insertR * insertH;

  return Math.max((totalMm3 - intrusion) / 1000.0, 100.0);
}

function scaleDimensions(dim, scale) {
  const scaled = JSON.parse(JSON.stringify(dim));
  const keys = [
    "wall_thickness_mm",
    "body_height_mm",
    "body_max_diameter_mm",
    "body_bottom_diameter_mm",
    "neck_diameter_mm",
    "head_height_mm",
    "head_top_diameter_mm",
    "head_neck_overlap_mm",
    "handle_length_mm",
    "handle_drop_mm",
    "handle_offset_mm",
    "handle_thickness_mm",
    "insert_outer_diameter_mm",
    "insert_inner_diameter_mm",
    "insert_height_mm",
    "gasket_cross_section_mm",
    "base_cap_height_mm",
    "base_cap_diameter_mm",
    "manufacturing_tolerance_mm",
  ];

  keys.forEach((k) => {
    scaled[k] = Number((Number(scaled[k]) * scale).toFixed(2));
  });
  scaled.overall_height_mm = Number((scaled.body_height_mm + scaled.head_height_mm - scaled.head_neck_overlap_mm).toFixed(2));
  return scaled;
}

function createDefaultDimensions(cups = 4.0) {
  const base = baseDimensions();
  const targetMl = cupsToMl(cups);
  const baseEstimated = estimateCapacityMl(base);
  const scale = Math.pow(targetMl / baseEstimated, 1.0 / 3.0);
  const scaled = scaleDimensions(base, scale);
  scaled.cups_target = Number(cups.toFixed(2));
  scaled.capacity_target_ml = Number(targetMl.toFixed(1));
  scaled.estimated_capacity_ml = Number(estimateCapacityMl(scaled).toFixed(1));
  return scaled;
}

function defaultMaterials() {
  return [
    {
      part_key: "body_shell",
      part_name: "Lower vessel body shell",
      recommended: "Stainless Steel 304 (0.9 mm)",
      alternatives: ["Stainless Steel 316L (0.9 mm)", "Stainless Steel 430 (1.0 mm)"],
      selected: "Stainless Steel 304 (0.9 mm)",
      confidence: 0.86,
      notes: "Deep draw + spin formed shell.",
    },
    {
      part_key: "curved_head",
      part_name: "Curved upper head / funnel section",
      recommended: "Stainless Steel 304 (0.9 mm)",
      alternatives: ["Stainless Steel 316L (0.9 mm)", "Stainless Steel 430 (1.0 mm)"],
      selected: "Stainless Steel 304 (0.9 mm)",
      confidence: 0.82,
      notes: "Curved lip and neck transition.",
    },
    {
      part_key: "handle",
      part_name: "External handle",
      recommended: "Glass-filled Nylon 66, heat-resistant",
      alternatives: ["Bakelite / Phenolic resin", "Stainless handle + silicone sleeve"],
      selected: "Glass-filled Nylon 66, heat-resistant",
      confidence: 0.61,
      notes: "Thermal isolation and grip safety.",
    },
    {
      part_key: "insert_filter",
      part_name: "Center insert / filter collar",
      recommended: "Stainless Steel 304 + 80 mesh screen",
      alternatives: ["Stainless Steel 316L + 100 mesh screen", "Perforated stainless disc"],
      selected: "Stainless Steel 304 + 80 mesh screen",
      confidence: 0.79,
      notes: "Leaf control during pour.",
    },
    {
      part_key: "gasket",
      part_name: "Sealing ring / gasket",
      recommended: "Food-grade Silicone (Shore A 50-60)",
      alternatives: ["EPDM food-grade", "Fluorosilicone (premium)"],
      selected: "Food-grade Silicone (Shore A 50-60)",
      confidence: 0.66,
      notes: "Upper/lower section seal.",
    },
    {
      part_key: "base_cap",
      part_name: "Bottom cap / base ring",
      recommended: "Stainless Steel 304 (1.0 mm)",
      alternatives: ["Stainless Steel 430 (1.0 mm)", "Stainless Steel 316L (1.0 mm)"],
      selected: "Stainless Steel 304 (1.0 mm)",
      confidence: 0.75,
      notes: "Base reinforcement.",
    },
  ];
}

function materialByKey(materials) {
  const out = {};
  materials.forEach((m) => {
    out[m.part_key] = (m.selected || m.recommended || "").trim();
  });
  return out;
}

function materialDensity(name) {
  const text = String(name || "").toLowerCase();
  if (text.includes("stainless") || text.includes("304") || text.includes("316") || text.includes("430")) {
    return 7.9;
  }
  if (text.includes("nylon")) {
    return 1.35;
  }
  if (text.includes("bakelite") || text.includes("phenolic")) {
    return 1.3;
  }
  if (text.includes("silicone")) {
    return 1.15;
  }
  if (text.includes("epdm")) {
    return 0.95;
  }
  return 1.1;
}

function frustumSurfaceArea(r1, r2, h) {
  const slant = Math.sqrt((r1 - r2) ** 2 + h * h);
  return Math.PI * (r1 + r2) * slant;
}

function massFromShell(areaMm2, thicknessMm, materialName) {
  const density = materialDensity(materialName);
  const volMm3 = areaMm2 * thicknessMm;
  return (volMm3 / 1000.0) * density;
}

function massFromVolume(volumeMm3, materialName) {
  const density = materialDensity(materialName);
  return (volumeMm3 / 1000.0) * density;
}

function generateBom(dim, materials) {
  const mats = materialByKey(materials);
  const t = Number(dim.wall_thickness_mm);
  const rBottom = Number(dim.body_bottom_diameter_mm) * 0.5;
  const rMax = Number(dim.body_max_diameter_mm) * 0.5;
  const rNeck = Number(dim.neck_diameter_mm) * 0.5;

  const bodyArea = (
    frustumSurfaceArea(rBottom, rMax, Number(dim.body_height_mm) * 0.30)
    + frustumSurfaceArea(rMax, rMax * 0.98, Number(dim.body_height_mm) * 0.38)
    + frustumSurfaceArea(rMax * 0.98, rNeck, Number(dim.body_height_mm) * 0.32)
  );

  const headH = Math.max(Number(dim.head_height_mm) - Number(dim.head_neck_overlap_mm), 8.0);
  const rHead = Number(dim.head_top_diameter_mm) * 0.5;
  const headArea = (
    frustumSurfaceArea(rNeck, rNeck * 1.18, headH * 0.45)
    + frustumSurfaceArea(rNeck * 1.18, rHead, headH * 0.55)
  );

  const insertRingArea = Math.PI * ((Number(dim.insert_outer_diameter_mm) ** 2) - (Number(dim.insert_inner_diameter_mm) ** 2)) / 4.0;
  const insertWallArea = Math.PI * Number(dim.insert_outer_diameter_mm) * Number(dim.insert_height_mm);
  const insertArea = insertRingArea + insertWallArea;

  const baseDiscArea = Math.PI * (Number(dim.base_cap_diameter_mm) ** 2) / 4.0;
  const handleLen = Number(dim.handle_length_mm) * 1.25;
  const handleArea = Math.PI * Number(dim.handle_thickness_mm) * handleLen;

  const gasketMajor = Number(dim.neck_diameter_mm) * 0.5;
  const gasketMinor = Math.max(Number(dim.gasket_cross_section_mm) * 0.5, 0.5);
  const gasketVol = 2.0 * Math.PI * Math.PI * gasketMajor * (gasketMinor ** 2);

  const bodyMat = mats.body_shell || "Stainless Steel 304 (0.9 mm)";
  const headMat = mats.curved_head || "Stainless Steel 304 (0.9 mm)";
  const handleMat = mats.handle || "Glass-filled Nylon 66";
  const insertMat = mats.insert_filter || "Stainless Steel 304 + 80 mesh screen";
  const gasketMat = mats.gasket || "Food-grade Silicone";
  const baseMat = mats.base_cap || "Stainless Steel 304 (1.0 mm)";

  return [
    {
      part_key: "body_shell",
      part_name: "Lower vessel body shell",
      material: bodyMat,
      process: "Deep draw + neck reduction + brushing",
      thickness_mm: Number(t.toFixed(2)),
      quantity: 1,
      mass_estimate_g: Number(massFromShell(bodyArea, t, bodyMat).toFixed(1)),
      notes: "TIG seam only if split blank is used.",
    },
    {
      part_key: "curved_head",
      part_name: "Curved upper head / funnel section",
      material: headMat,
      process: "Spin forming + lip trim",
      thickness_mm: Number(t.toFixed(2)),
      quantity: 1,
      mass_estimate_g: Number(massFromShell(headArea, t, headMat).toFixed(1)),
      notes: "Interference-fit at neck with gasket.",
    },
    {
      part_key: "insert_filter",
      part_name: "Center insert / filter collar",
      material: insertMat,
      process: "Stamp + draw + mesh spot weld",
      thickness_mm: Number(Math.max(t * 0.8, 0.6).toFixed(2)),
      quantity: 1,
      mass_estimate_g: Number(massFromShell(insertArea, Math.max(t * 0.8, 0.6), insertMat).toFixed(1)),
      notes: "Inner opening sized for pour stability.",
    },
    {
      part_key: "handle",
      part_name: "External handle",
      material: handleMat,
      process: "Injection mold + fastener insert",
      thickness_mm: Number(Number(dim.handle_thickness_mm).toFixed(2)),
      quantity: 1,
      mass_estimate_g: Number(massFromShell(handleArea, Number(dim.handle_thickness_mm) * 0.35, handleMat).toFixed(1)),
      notes: "Thermal isolation target < 45C at grip.",
    },
    {
      part_key: "gasket",
      part_name: "Sealing ring / gasket",
      material: gasketMat,
      process: "Compression mold",
      thickness_mm: Number(Number(dim.gasket_cross_section_mm).toFixed(2)),
      quantity: 1,
      mass_estimate_g: Number(massFromVolume(gasketVol, gasketMat).toFixed(1)),
      notes: "Food-contact compliant elastomer required.",
    },
    {
      part_key: "base_cap",
      part_name: "Bottom cap / base ring",
      material: baseMat,
      process: "Stamp + trim",
      thickness_mm: Number(Math.max(t, 1.0).toFixed(2)),
      quantity: 1,
      mass_estimate_g: Number(massFromShell(baseDiscArea, Math.max(t, 1.0), baseMat).toFixed(1)),
      notes: "Protective and structural base reinforcement.",
    },
  ];
}

function mergeMaterialsLocal(materials) {
  const defaults = defaultMaterials();
  if (!materials || !Array.isArray(materials) || materials.length === 0) {
    return defaults;
  }

  const defaultMap = {};
  defaults.forEach((m) => {
    defaultMap[m.part_key] = m;
  });

  const merged = [];
  const seen = new Set();
  materials.forEach((m) => {
    seen.add(m.part_key);
    const base = defaultMap[m.part_key];
    if (!base) {
      merged.push(m);
      return;
    }
    merged.push({
      ...base,
      recommended: m.recommended || base.recommended,
      alternatives: m.alternatives?.length ? m.alternatives : base.alternatives,
      selected: m.selected || m.recommended || base.selected,
      confidence: Number.isFinite(m.confidence) ? m.confidence : base.confidence,
      notes: m.notes || base.notes,
    });
  });

  defaults.forEach((m) => {
    if (!seen.has(m.part_key)) {
      merged.push(m);
    }
  });
  return merged;
}

function defaultAnalysis() {
  const materials = defaultMaterials();
  const parts = materials.map((m) => ({
    part_key: m.part_key,
    part_name: m.part_name,
    confidence: m.confidence,
    evidence: "Detected from repeated geometry and finish cues in the provided image set.",
  }));

  return {
    metrics: {
      image_count: localImageNames.length,
      metallic_ratio: 0.44,
      dark_ratio: 0.19,
      green_ratio: 0.04,
      specular_ratio: 0.27,
    },
    detected_parts: parts,
    material_suggestions: materials,
    notes: [
      "Images indicate a multi-part stainless vessel with a separate curved upper head.",
      "Material suggestions are generated from reflectivity, color distribution, and repeated part visibility.",
      "For stainless manufacturing, 304 is selected as baseline; 316L remains optional for higher corrosion resistance.",
    ],
  };
}

function buildDefaultBlueprintLocal(cups = 4.0) {
  const analysis = defaultAnalysis();
  const dimensions = createDefaultDimensions(cups);
  const materials = mergeMaterialsLocal(analysis.material_suggestions);
  const bom = generateBom(dimensions, materials);
  return {
    title: "Curved-Head Teapot Blueprint",
    design_version: "v1",
    units: "mm",
    dimensions,
    materials,
    bom,
    analysis_notes: analysis.notes,
  };
}

function recomputeBlueprintLocal(blueprint) {
  const next = JSON.parse(JSON.stringify(blueprint));
  next.dimensions.overall_height_mm = Number((
    Number(next.dimensions.body_height_mm)
    + Number(next.dimensions.head_height_mm)
    - Number(next.dimensions.head_neck_overlap_mm)
  ).toFixed(2));
  next.dimensions.estimated_capacity_ml = Number(estimateCapacityMl(next.dimensions).toFixed(1));
  next.materials = mergeMaterialsLocal(next.materials);
  next.bom = generateBom(next.dimensions, next.materials);
  return next;
}

function localImagesPayload() {
  return {
    files: localImageNames.map((name) => ({
      name,
      url: `/${encodeURIComponent(name)}`,
      size_bytes: "0",
    })),
  };
}

async function maybeEnableLocalMode() {
  if (state.backendChecked) {
    return;
  }
  state.backendChecked = true;
  try {
    const response = await fetch("/api/health", { method: "GET" });
    if (!response.ok) {
      throw new Error("backend unavailable");
    }
    state.localMode = false;
    setStatus("Connected to backend service.", "ok");
  } catch {
    state.localMode = true;
    setStatus("Running in free static mode (no paid backend).", "warn");
  }
}

async function apiGet(path) {
  if (state.localMode) {
    if (path.startsWith("/api/images")) {
      return localImagesPayload();
    }
    if (path.startsWith("/api/blueprint/default")) {
      const url = new URL(path, window.location.origin);
      const cups = Number.parseFloat(url.searchParams.get("cups") || "4") || 4;
      return {
        blueprint: buildDefaultBlueprintLocal(cups),
        analysis: defaultAnalysis(),
      };
    }
    if (path.startsWith("/api/health")) {
      return { status: "ok-local" };
    }
    throw new Error(`Local mode route not implemented for GET ${path}`);
  }

  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`GET ${path} failed: ${response.status}`);
  }
  return response.json();
}

async function apiPost(path, body = null) {
  if (state.localMode) {
    if (path.startsWith("/api/analyze")) {
      return {
        ok: true,
        json: async () => defaultAnalysis(),
      };
    }
    if (path.startsWith("/api/blueprint/recompute")) {
      return {
        ok: true,
        json: async () => ({ blueprint: recomputeBlueprintLocal(body) }),
      };
    }
    throw new Error(`Local mode route not implemented for POST ${path}`);
  }

  const response = await fetch(path, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`POST ${path} failed: ${response.status} ${text}`);
  }
  return response;
}

function renderImages() {
  els.imageStrip.innerHTML = "";
  els.imageCountBadge.textContent = `${state.images.length} files`;

  if (!state.images.length) {
    els.imageStrip.innerHTML = "<div class='part-evidence'>No source images found.</div>";
    return;
  }

  for (const file of state.images) {
    const card = document.createElement("div");
    card.className = "image-thumb";

    const img = document.createElement("img");
    img.src = file.url;
    img.alt = file.name;

    const caption = document.createElement("div");
    caption.className = "name";
    caption.title = file.name;
    caption.textContent = file.name;

    card.appendChild(img);
    card.appendChild(caption);
    els.imageStrip.appendChild(card);
  }
}

function renderAnalysis() {
  const analysis = state.analysis;
  if (!analysis) {
    els.analysisSummary.textContent = "Run image analysis to detect parts and materials.";
    els.partsList.innerHTML = "";
    return;
  }

  const m = analysis.metrics;
  els.analysisSummary.innerHTML = [
    `<strong>Images:</strong> ${m.image_count}`,
    `<strong>Metallic:</strong> ${(m.metallic_ratio * 100).toFixed(1)}%`,
    `<strong>Dark Components:</strong> ${(m.dark_ratio * 100).toFixed(1)}%`,
    `<strong>Gasket Color Signal:</strong> ${(m.green_ratio * 100).toFixed(1)}%`,
  ].join(" | ");

  els.partsList.innerHTML = "";
  for (const part of analysis.detected_parts || []) {
    const row = document.createElement("div");
    row.className = "part-row";

    const top = document.createElement("div");
    top.className = "part-top";
    const name = document.createElement("div");
    name.className = "part-name";
    name.textContent = part.part_name;

    const confidence = document.createElement("div");
    confidence.className = "part-confidence";
    confidence.textContent = `${(part.confidence * 100).toFixed(0)}%`;

    top.appendChild(name);
    top.appendChild(confidence);

    const evidence = document.createElement("div");
    evidence.className = "part-evidence";
    evidence.textContent = part.evidence;

    row.appendChild(top);
    row.appendChild(evidence);
    els.partsList.appendChild(row);
  }
}

function renderDimensions() {
  if (!state.blueprint) {
    els.dimensionsTable.innerHTML = "";
    return;
  }

  const dim = state.blueprint.dimensions;
  els.dimensionsTable.innerHTML = "";

  for (const meta of dimensionMeta) {
    if (!(meta.key in dim)) {
      continue;
    }

    const row = document.createElement("div");
    row.className = "dim-row";

    const top = document.createElement("div");
    top.className = "dim-top";

    const name = document.createElement("div");
    name.className = "dim-name";
    name.textContent = meta.label;

    const mmValue = Number(dim[meta.key]);
    const unit = document.createElement("div");
    unit.className = "dim-unit";

    if (meta.key.includes("capacity") || meta.key.includes("cups")) {
      if (meta.key.includes("cups")) {
        unit.textContent = `${formatNumber(mmValue, 2)} cups`;
      } else {
        unit.textContent = `${formatNumber(mmValue, 1)} ml`;
      }
    } else {
      unit.textContent = `${formatNumber(mmValue, 1)} mm / ${formatNumber(mmToIn(mmValue), 2)} in`;
    }

    top.appendChild(name);
    top.appendChild(unit);

    const controls = document.createElement("div");
    controls.className = "dim-controls";

    const input = document.createElement("input");
    input.type = "number";
    input.step = String(meta.step ?? 0.1);
    input.min = String(meta.min ?? 0);
    input.value = Number.isFinite(mmValue) ? String(mmValue) : "0";

    if (meta.readOnly) {
      input.disabled = true;
    }

    input.addEventListener("change", () => {
      const num = Number.parseFloat(input.value);
      if (!Number.isFinite(num)) {
        return;
      }
      dim[meta.key] = num;
      queueRecompute();
    });

    const hint = document.createElement("div");
    hint.className = "part-evidence";
    hint.textContent = meta.readOnly ? "Calculated from current geometry." : "Editable";

    controls.appendChild(input);
    controls.appendChild(hint);

    row.appendChild(top);
    row.appendChild(controls);

    els.dimensionsTable.appendChild(row);
  }
}

function renderMaterials() {
  if (!state.blueprint) {
    els.materialsTable.innerHTML = "";
    return;
  }

  els.materialsTable.innerHTML = "";

  for (const material of state.blueprint.materials || []) {
    const row = document.createElement("div");
    row.className = "material-row";

    const top = document.createElement("div");
    top.className = "material-top";

    const name = document.createElement("div");
    name.className = "material-name";
    name.textContent = material.part_name;

    const confidence = document.createElement("div");
    confidence.className = "material-confidence";
    confidence.textContent = `Confidence ${(material.confidence * 100).toFixed(0)}%`;

    top.appendChild(name);
    top.appendChild(confidence);

    const controls = document.createElement("div");
    controls.className = "material-controls";

    const select = document.createElement("select");
    const choices = [material.selected, material.recommended, ...(material.alternatives || [])]
      .filter((value, index, self) => value && self.indexOf(value) === index);

    for (const choice of choices) {
      const option = document.createElement("option");
      option.value = choice;
      option.textContent = choice;
      if (choice === material.selected) {
        option.selected = true;
      }
      select.appendChild(option);
    }

    select.addEventListener("change", () => {
      material.selected = select.value;
      queueRecompute();
    });

    const custom = document.createElement("input");
    custom.type = "text";
    custom.placeholder = "Custom material (optional)";
    custom.value = material.selected || "";
    custom.addEventListener("change", () => {
      if (custom.value.trim()) {
        material.selected = custom.value.trim();
        if (![...select.options].some((o) => o.value === material.selected)) {
          const option = document.createElement("option");
          option.value = material.selected;
          option.textContent = material.selected;
          option.selected = true;
          select.appendChild(option);
        }
        select.value = material.selected;
        queueRecompute();
      }
    });

    const notes = document.createElement("div");
    notes.className = "material-notes";
    notes.textContent = material.notes || "";

    controls.appendChild(select);
    controls.appendChild(custom);

    row.appendChild(top);
    row.appendChild(controls);
    row.appendChild(notes);

    els.materialsTable.appendChild(row);
  }
}

function renderBom() {
  if (!state.blueprint) {
    els.bomTable.innerHTML = "";
    return;
  }

  els.bomTable.innerHTML = "";

  for (const item of state.blueprint.bom || []) {
    const row = document.createElement("div");
    row.className = "bom-row";

    const top = document.createElement("div");
    top.className = "bom-top";

    const name = document.createElement("div");
    name.className = "bom-name";
    name.textContent = item.part_name;

    const meta = document.createElement("div");
    meta.className = "bom-meta";
    meta.textContent = `${item.quantity}x | ${formatNumber(item.thickness_mm, 2)} mm | ${formatNumber(item.mass_estimate_g, 1)} g`;

    const notes = document.createElement("div");
    notes.className = "bom-notes";
    notes.textContent = `${item.material} | ${item.process}`;

    top.appendChild(name);
    top.appendChild(meta);

    row.appendChild(top);
    row.appendChild(notes);

    els.bomTable.appendChild(row);
  }
}

function createBlueprintSvgElement(name, attrs = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
  return el;
}

function drawBlueprint() {
  const svg = els.blueprintSvg;
  svg.innerHTML = "";

  if (!state.blueprint) {
    return;
  }

  const dim = state.blueprint.dimensions;

  const grid = createBlueprintSvgElement("rect", {
    x: "0",
    y: "0",
    width: "1000",
    height: "470",
    fill: "#fff",
  });
  svg.appendChild(grid);

  for (let x = 20; x <= 980; x += 20) {
    const line = createBlueprintSvgElement("line", {
      x1: x,
      y1: 20,
      x2: x,
      y2: 450,
      stroke: x % 100 === 0 ? "#d6e0e5" : "#edf2f4",
      "stroke-width": x % 100 === 0 ? "1" : "0.7",
    });
    svg.appendChild(line);
  }
  for (let y = 20; y <= 450; y += 20) {
    const line = createBlueprintSvgElement("line", {
      x1: 20,
      y1: y,
      x2: 980,
      y2: y,
      stroke: y % 100 === 0 ? "#d6e0e5" : "#edf2f4",
      "stroke-width": y % 100 === 0 ? "1" : "0.7",
    });
    svg.appendChild(line);
  }

  const maxW = Math.max(dim.head_top_diameter_mm, dim.body_max_diameter_mm);
  const scale = Math.min(2.0, 300 / maxW);

  const sideOx = 260;
  const sideOy = 400;

  const overallH = dim.overall_height_mm;

  const rBottom = dim.body_bottom_diameter_mm * 0.5;
  const rMax = dim.body_max_diameter_mm * 0.5;
  const rNeck = dim.neck_diameter_mm * 0.5;
  const rHead = dim.head_top_diameter_mm * 0.5;
  const sideProfile = buildOuterProfilePoints(dim, 42, 30, getProfileOptions());

  const mapSide = (xMm, yMm) => [sideOx + xMm * scale, sideOy - yMm * scale];

  let pathData = "";
  sideProfile.forEach((point, index) => {
    const [x, y] = mapSide(point[0], point[1]);
    pathData += `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)} `;
  });
  const left = [...sideProfile].reverse().map((point) => [-point[0], point[1]]);
  left.forEach((point) => {
    const [x, y] = mapSide(point[0], point[1]);
    pathData += `L${x.toFixed(2)} ${y.toFixed(2)} `;
  });
  pathData += "Z";

  const bodyPath = createBlueprintSvgElement("path", {
    d: pathData,
    fill: "rgba(15,116,140,0.06)",
    stroke: "#0d5162",
    "stroke-width": "2",
  });
  svg.appendChild(bodyPath);

  const centerline = createBlueprintSvgElement("line", {
    x1: sideOx,
    y1: sideOy + 14,
    x2: sideOx,
    y2: sideOy - overallH * scale - 14,
    stroke: "#5c7380",
    "stroke-dasharray": "5 4",
    "stroke-width": "1.3",
  });
  svg.appendChild(centerline);

  const addText = (x, y, text, color = "#1d3b46") => {
    const t = createBlueprintSvgElement("text", {
      x: String(x),
      y: String(y),
      fill: color,
      "font-size": "13",
      "font-family": "IBM Plex Mono, Consolas, monospace",
    });
    t.textContent = text;
    svg.appendChild(t);
  };

  const dimLine = (x1, y1, x2, y2, label) => {
    const line = createBlueprintSvgElement("line", {
      x1: String(x1),
      y1: String(y1),
      x2: String(x2),
      y2: String(y2),
      stroke: "#1a4a59",
      "stroke-width": "1.2",
    });
    svg.appendChild(line);

    const tick1 = createBlueprintSvgElement("line", {
      x1: String(x1 - 4),
      y1: String(y1 - 4),
      x2: String(x1 + 4),
      y2: String(y1 + 4),
      stroke: "#1a4a59",
      "stroke-width": "1.2",
    });
    const tick2 = createBlueprintSvgElement("line", {
      x1: String(x2 - 4),
      y1: String(y2 - 4),
      x2: String(x2 + 4),
      y2: String(y2 + 4),
      stroke: "#1a4a59",
      "stroke-width": "1.2",
    });
    svg.appendChild(tick1);
    svg.appendChild(tick2);

    const tx = (x1 + x2) * 0.5 + 6;
    const ty = (y1 + y2) * 0.5 - 6;
    addText(tx, ty, label, "#0e596d");
  };

  const ohYTop = sideOy - overallH * scale;
  dimLine(sideOx - rHead * scale - 45, sideOy, sideOx - rHead * scale - 45, ohYTop, `${formatNumber(overallH, 1)} mm`);
  dimLine(sideOx - rMax * scale, sideOy + 26, sideOx + rMax * scale, sideOy + 26, `${formatNumber(dim.body_max_diameter_mm, 1)} mm`);
  dimLine(sideOx - rHead * scale, ohYTop - 22, sideOx + rHead * scale, ohYTop - 22, `${formatNumber(dim.head_top_diameter_mm, 1)} mm`);

  const topCx = 760;
  const topCy = 220;
  const drawCircle = (radiusMm, stroke, fill = "none") => {
    const c = createBlueprintSvgElement("circle", {
      cx: String(topCx),
      cy: String(topCy),
      r: String(radiusMm * scale),
      stroke,
      fill,
      "stroke-width": "1.8",
    });
    svg.appendChild(c);
  };

  drawCircle(rHead, "#0d5162", "rgba(15,116,140,0.05)");
  drawCircle(rNeck, "#375e6c");
  drawCircle(dim.insert_outer_diameter_mm * 0.5, "#507584");
  drawCircle(dim.insert_inner_diameter_mm * 0.5, "#6f8f9a");

  addText(676, 56, "SIDE VIEW", "#0f3f4e");
  addText(708, 402, "TOP VIEW", "#0f3f4e");
  addText(42, 42, "Blueprint Units: mm (inches shown in editable panel)", "#235767");
}

function drawPartPrints() {
  const svg = els.partsPrintSvg;
  if (!svg) {
    return;
  }
  svg.innerHTML = "";
  if (!state.blueprint) {
    return;
  }

  const dim = state.blueprint.dimensions;
  const panels = {
    bottom: { x: 24, y: 30, w: 308, h: 288 },
    flare: { x: 346, y: 30, w: 308, h: 288 },
    rings: { x: 668, y: 30, w: 308, h: 288 },
  };

  const bg = createBlueprintSvgElement("rect", {
    x: "0",
    y: "0",
    width: "1000",
    height: "340",
    fill: "#fff",
  });
  svg.appendChild(bg);

  for (let x = 20; x <= 980; x += 20) {
    svg.appendChild(createBlueprintSvgElement("line", {
      x1: x,
      y1: 20,
      x2: x,
      y2: 320,
      stroke: x % 100 === 0 ? "#dde5ea" : "#eef3f5",
      "stroke-width": x % 100 === 0 ? "1" : "0.7",
    }));
  }
  for (let y = 20; y <= 320; y += 20) {
    svg.appendChild(createBlueprintSvgElement("line", {
      x1: 20,
      y1: y,
      x2: 980,
      y2: y,
      stroke: y % 100 === 0 ? "#dde5ea" : "#eef3f5",
      "stroke-width": y % 100 === 0 ? "1" : "0.7",
    }));
  }

  const addText = (x, y, text, size = 12, color = "#1d3b46") => {
    const t = createBlueprintSvgElement("text", {
      x: String(x),
      y: String(y),
      fill: color,
      "font-size": String(size),
      "font-family": "IBM Plex Mono, Consolas, monospace",
    });
    t.textContent = text;
    svg.appendChild(t);
  };

  const addDimLine = (x1, y1, x2, y2, label) => {
    svg.appendChild(createBlueprintSvgElement("line", {
      x1: String(x1),
      y1: String(y1),
      x2: String(x2),
      y2: String(y2),
      stroke: "#1a4a59",
      "stroke-width": "1.1",
    }));
    svg.appendChild(createBlueprintSvgElement("line", {
      x1: String(x1 - 3),
      y1: String(y1 - 3),
      x2: String(x1 + 3),
      y2: String(y1 + 3),
      stroke: "#1a4a59",
      "stroke-width": "1.1",
    }));
    svg.appendChild(createBlueprintSvgElement("line", {
      x1: String(x2 - 3),
      y1: String(y2 - 3),
      x2: String(x2 + 3),
      y2: String(y2 + 3),
      stroke: "#1a4a59",
      "stroke-width": "1.1",
    }));
    addText(((x1 + x2) * 0.5) + 4, ((y1 + y2) * 0.5) - 6, label, 11, "#0d5366");
  };

  Object.values(panels).forEach((p) => {
    svg.appendChild(createBlueprintSvgElement("rect", {
      x: String(p.x),
      y: String(p.y),
      width: String(p.w),
      height: String(p.h),
      fill: "rgba(245,249,251,0.4)",
      stroke: "#c4d2da",
      "stroke-width": "1.1",
      rx: "10",
      ry: "10",
    }));
  });

  const bodyProfile = buildBodyProfilePoints(dim, 34);
  const maxBodyR = Math.max(...bodyProfile.map((p) => p[0]), 10);
  const bodyScale = Math.min((panels.bottom.w * 0.42) / maxBodyR, (panels.bottom.h * 0.78) / dim.body_height_mm);
  const bodyOx = panels.bottom.x + (panels.bottom.w * 0.5);
  const bodyOy = panels.bottom.y + (panels.bottom.h * 0.86);
  let bodyPath = "";
  bodyProfile.forEach((point, index) => {
    const x = bodyOx + (point[0] * bodyScale);
    const y = bodyOy - (point[1] * bodyScale);
    bodyPath += `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)} `;
  });
  [...bodyProfile].reverse().forEach((point) => {
    const x = bodyOx - (point[0] * bodyScale);
    const y = bodyOy - (point[1] * bodyScale);
    bodyPath += `L${x.toFixed(2)} ${y.toFixed(2)} `;
  });
  bodyPath += "Z";
  svg.appendChild(createBlueprintSvgElement("path", {
    d: bodyPath,
    fill: "rgba(15,116,140,0.08)",
    stroke: "#0d5162",
    "stroke-width": "1.7",
  }));
  addText(panels.bottom.x + 12, panels.bottom.y + 20, "BOTTOM VESSEL", 12, "#0d4252");
  addDimLine(
    bodyOx - (maxBodyR * bodyScale) - 24,
    bodyOy,
    bodyOx - (maxBodyR * bodyScale) - 24,
    bodyOy - (dim.body_height_mm * bodyScale),
    `${formatNumber(dim.body_height_mm, 1)} mm`,
  );
  addDimLine(
    bodyOx - ((dim.body_max_diameter_mm * 0.5) * bodyScale),
    bodyOy + 18,
    bodyOx + ((dim.body_max_diameter_mm * 0.5) * bodyScale),
    bodyOy + 18,
    `${formatNumber(dim.body_max_diameter_mm, 1)} mm`,
  );

  const headProfileAbs = buildHeadProfilePoints(
    dim,
    30,
    Number(dim.body_height_mm),
    getProfileOptions(),
  );
  const flareProfile = headProfileAbs.map(([r, y]) => [r, y - Number(dim.body_height_mm)]);
  const flareH = Math.max(Number(dim.head_height_mm), 1);
  const flareMaxR = Math.max(...flareProfile.map((p) => p[0]), 10);
  const flareScale = Math.min((panels.flare.w * 0.42) / flareMaxR, (panels.flare.h * 0.74) / flareH);
  const flareOx = panels.flare.x + (panels.flare.w * 0.5);
  const flareOy = panels.flare.y + (panels.flare.h * 0.86);
  let flarePath = "";
  flareProfile.forEach((point, index) => {
    const x = flareOx + (point[0] * flareScale);
    const y = flareOy - (point[1] * flareScale);
    flarePath += `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)} `;
  });
  [...flareProfile].reverse().forEach((point) => {
    const x = flareOx - (point[0] * flareScale);
    const y = flareOy - (point[1] * flareScale);
    flarePath += `L${x.toFixed(2)} ${y.toFixed(2)} `;
  });
  flarePath += "Z";
  svg.appendChild(createBlueprintSvgElement("path", {
    d: flarePath,
    fill: "rgba(15,116,140,0.08)",
    stroke: "#0d5162",
    "stroke-width": "1.7",
  }));
  addText(panels.flare.x + 12, panels.flare.y + 20, "HEAD FLARE", 12, "#0d4252");
  addDimLine(
    flareOx - ((dim.neck_diameter_mm * 0.5) * flareScale),
    flareOy + 18,
    flareOx + ((dim.neck_diameter_mm * 0.5) * flareScale),
    flareOy + 18,
    `${formatNumber(dim.neck_diameter_mm, 1)} mm neck`,
  );
  addDimLine(
    flareOx - ((dim.head_top_diameter_mm * 0.5) * flareScale),
    flareOy - (flareH * flareScale) - 14,
    flareOx + ((dim.head_top_diameter_mm * 0.5) * flareScale),
    flareOy - (flareH * flareScale) - 14,
    `${formatNumber(dim.head_top_diameter_mm, 1)} mm`,
  );
  addText(
    panels.flare.x + 12,
    panels.flare.y + panels.flare.h - 12,
    `Curvature ${formatNumber(getHeadCurvatureScale() * 100, 0)}%`,
    11,
    "#2f5b6a",
  );

  const ringsCenterX = panels.rings.x + (panels.rings.w * 0.5);
  const gasketCy = panels.rings.y + 102;
  const strainerCy = panels.rings.y + 214;
  const ringScale = Math.min(
    (panels.rings.w * 0.34) / Math.max(dim.neck_diameter_mm * 0.5, dim.insert_outer_diameter_mm * 0.5),
    1.8,
  );

  const gasketOuterR = (dim.neck_diameter_mm * 0.5 + dim.gasket_cross_section_mm) * ringScale;
  const gasketInnerR = Math.max((dim.neck_diameter_mm * 0.5 - dim.gasket_cross_section_mm) * ringScale, 4);
  svg.appendChild(createBlueprintSvgElement("circle", {
    cx: String(ringsCenterX),
    cy: String(gasketCy),
    r: gasketOuterR.toFixed(2),
    fill: "rgba(15,116,140,0.05)",
    stroke: "#0d5162",
    "stroke-width": "1.6",
  }));
  svg.appendChild(createBlueprintSvgElement("circle", {
    cx: String(ringsCenterX),
    cy: String(gasketCy),
    r: gasketInnerR.toFixed(2),
    fill: "#fff",
    stroke: "#0d5162",
    "stroke-width": "1.4",
  }));

  const strainerOuterR = (dim.insert_outer_diameter_mm * 0.5) * ringScale;
  const strainerInnerR = (dim.insert_inner_diameter_mm * 0.5) * ringScale;
  svg.appendChild(createBlueprintSvgElement("circle", {
    cx: String(ringsCenterX),
    cy: String(strainerCy),
    r: strainerOuterR.toFixed(2),
    fill: "rgba(15,116,140,0.05)",
    stroke: "#0d5162",
    "stroke-width": "1.6",
  }));
  svg.appendChild(createBlueprintSvgElement("circle", {
    cx: String(ringsCenterX),
    cy: String(strainerCy),
    r: strainerInnerR.toFixed(2),
    fill: "#fff",
    stroke: "#0d5162",
    "stroke-width": "1.4",
  }));

  addText(panels.rings.x + 12, panels.rings.y + 20, "GASKET + STRAINER", 12, "#0d4252");
  addText(panels.rings.x + 20, panels.rings.y + 132, `Gasket OD: ${formatNumber((gasketOuterR * 2) / ringScale, 1)} mm`, 11, "#2f5b6a");
  addText(panels.rings.x + 20, panels.rings.y + 248, `Strainer OD: ${formatNumber(dim.insert_outer_diameter_mm, 1)} mm`, 11, "#2f5b6a");
  addText(panels.rings.x + 20, panels.rings.y + 266, `Strainer ID: ${formatNumber(dim.insert_inner_diameter_mm, 1)} mm`, 11, "#2f5b6a");

  addText(28, 18, "DETACHED PART PRINTS - mm", 12, "#1d4d5c");
}

function buildTeapotGroup(dim) {
  const group = new THREE.Group();
  const palette = resolveThreeMaterialPalette();

  const steel = new THREE.MeshStandardMaterial({
    color: new THREE.Color(palette.primaryColor),
    metalness: palette.metalness,
    roughness: palette.roughness,
    envMapIntensity: 1.0,
  });

  const steelDark = new THREE.MeshStandardMaterial({
    color: new THREE.Color(palette.accentColor),
    metalness: palette.accentMetalness,
    roughness: palette.accentRoughness,
    envMapIntensity: 0.9,
  });

  const handleMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(palette.handleColor),
    metalness: palette.handleMetalness,
    roughness: palette.handleRoughness,
  });

  const gasketMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(palette.gasketColor),
    metalness: 0.05,
    roughness: 0.88,
  });

  const bodyH = dim.body_height_mm;
  const overallH = dim.overall_height_mm;
  const profileOptions = getProfileOptions();

  const rHead = dim.head_top_diameter_mm * 0.5;
  const rNeck = dim.neck_diameter_mm * 0.5;

  const bodyProfile = toLatheProfile(buildBodyProfilePoints(dim, 52));
  const bodyGeo = new THREE.LatheGeometry(bodyProfile, 96);
  const bodyMesh = new THREE.Mesh(bodyGeo, steel);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  bodyMesh.name = "body_shell";
  group.add(bodyMesh);

  const headStart = bodyH - dim.head_neck_overlap_mm;
  const headProfile = toLatheProfile(buildHeadProfilePoints(dim, 34, headStart, profileOptions));
  const headGeo = new THREE.LatheGeometry(headProfile, 96);
  const headMesh = new THREE.Mesh(headGeo, steel);
  headMesh.castShadow = true;
  headMesh.name = "curved_head";
  group.add(headMesh);

  const insertOuter = dim.insert_outer_diameter_mm * 0.5;
  const insertInner = dim.insert_inner_diameter_mm * 0.5;
  const insertH = dim.insert_height_mm;

  const insertProfile = [
    new THREE.Vector2(insertOuter, overallH),
    new THREE.Vector2(insertOuter, overallH - insertH),
    new THREE.Vector2(insertInner, overallH - insertH),
    new THREE.Vector2(insertInner, overallH),
  ];
  const insertGeo = new THREE.LatheGeometry(insertProfile, 64);
  const insertMesh = new THREE.Mesh(insertGeo, steelDark);
  insertMesh.name = "insert_filter";
  group.add(insertMesh);

  const gasketGeo = new THREE.TorusGeometry(
    rNeck,
    Math.max(dim.gasket_cross_section_mm * 0.5, 1),
    16,
    90,
  );
  const gasketMesh = new THREE.Mesh(gasketGeo, gasketMat);
  gasketMesh.rotation.x = Math.PI / 2;
  gasketMesh.position.y = bodyH + 1;
  gasketMesh.name = "gasket";
  group.add(gasketMesh);

  const baseGeo = new THREE.CylinderGeometry(
    dim.base_cap_diameter_mm * 0.5,
    dim.base_cap_diameter_mm * 0.5,
    dim.base_cap_height_mm,
    60,
  );
  const baseMesh = new THREE.Mesh(baseGeo, steelDark);
  baseMesh.position.y = dim.base_cap_height_mm * 0.5;
  baseMesh.name = "base_cap";
  group.add(baseMesh);

  const anchorX = rHead + dim.handle_offset_mm;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(anchorX, overallH * 0.84, 0),
    new THREE.Vector3(anchorX + dim.handle_length_mm * 0.45, overallH * 0.72, 0),
    new THREE.Vector3(anchorX + dim.handle_length_mm * 0.38, overallH * 0.46, 0),
    new THREE.Vector3(
      anchorX + dim.handle_length_mm * 0.12,
      overallH * 0.34 - dim.handle_drop_mm * 0.08,
      0,
    ),
  ]);

  const handleGeo = new THREE.TubeGeometry(
    curve,
    48,
    Math.max(dim.handle_thickness_mm * 0.5, 2),
    16,
    false,
  );
  const handleMesh = new THREE.Mesh(handleGeo, handleMat);
  handleMesh.castShadow = true;
  handleMesh.name = "handle";
  group.add(handleMesh);

  const bottomOffset = getPartOffsetVector(dim, "bottom");
  const flareOffset = getPartOffsetVector(dim, "flare");
  const gasketOffset = getPartOffsetVector(dim, "gasket");
  const strainerOffset = getPartOffsetVector(dim, "strainer");

  bodyMesh.position.add(bottomOffset);
  baseMesh.position.add(bottomOffset);
  headMesh.position.add(flareOffset);
  handleMesh.position.add(flareOffset);
  gasketMesh.position.add(gasketOffset);
  insertMesh.position.add(strainerOffset);

  const centeringBox = new THREE.Box3().setFromObject(group);
  const center = centeringBox.getCenter(new THREE.Vector3());
  group.position.sub(center);
  group.position.y += centeringBox.getSize(new THREE.Vector3()).y * 0.45;

  return group;
}

function disposeObject3D(object) {
  if (!object) {
    return;
  }
  object.traverse((child) => {
    if (!child.isMesh) {
      return;
    }
    if (child.geometry?.dispose) {
      child.geometry.dispose();
    }
    if (Array.isArray(child.material)) {
      child.material.forEach((material) => {
        if (material?.dispose) {
          material.dispose();
        }
      });
      return;
    }
    if (child.material?.dispose) {
      child.material.dispose();
    }
  });
}

function renderThreeModel() {
  if (!state.three.scene || !state.blueprint) {
    return;
  }

  if (state.teapotGroup) {
    state.three.scene.remove(state.teapotGroup);
    disposeObject3D(state.teapotGroup);
  }

  state.teapotGroup = buildTeapotGroup(state.blueprint.dimensions);
  state.three.scene.add(state.teapotGroup);
}

function initThree() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeaf0f3);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 5000);
  camera.position.set(190, 120, 235);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  els.threeCanvas.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = true;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 0.9;
  controls.target.set(0, 44, 0);

  const hemi = new THREE.HemisphereLight(0xf1f7fa, 0x8ba0ab, 0.95);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 0.95);
  key.position.set(180, 250, 110);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x9fd0e0, 0.55);
  fill.position.set(-160, 90, -120);
  scene.add(fill);

  const grid = new THREE.GridHelper(400, 26, 0x8ea0a9, 0xc8d2d7);
  grid.position.y = -4;
  scene.add(grid);

  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(500, 500),
    new THREE.ShadowMaterial({ opacity: 0.14 }),
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -3.9;
  plane.receiveShadow = true;
  scene.add(plane);

  state.three.scene = scene;
  state.three.camera = camera;
  state.three.renderer = renderer;
  state.three.controls = controls;
  syncThreeMaterialInputs();
  syncThreeDetachInputs();
  syncThreeFlareInputs();

  const resize = () => {
    const width = els.threeCanvas.clientWidth;
    const height = els.threeCanvas.clientHeight;
    renderer.setSize(width, height);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  };

  resize();
  window.addEventListener("resize", resize);

  const animate = () => {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  };
  animate();
}

function renderAll() {
  renderAnalysis();
  renderDimensions();
  renderMaterials();
  renderBom();
  drawBlueprint();
  drawPartPrints();
  renderThreeModel();

  if (state.blueprint) {
    const d = state.blueprint.dimensions;
    const cups = d.estimated_capacity_ml / 236.588;
    els.capacityLabel.textContent = `Capacity: ${formatNumber(d.estimated_capacity_ml, 1)} ml / ${formatNumber(cups, 2)} cups`;
    els.cupsInput.value = String(d.cups_target);
  }
}

async function recomputeBlueprint(statusMessage = "Blueprint recomputed.") {
  if (!state.blueprint) {
    return;
  }
  const response = await apiPost("/api/blueprint/recompute", state.blueprint);
  const data = await response.json();
  state.blueprint = data.blueprint;
  renderAll();
  if (statusMessage) {
    setStatus(statusMessage, "ok");
  }
}

function queueRecompute(immediate = false) {
  if (!state.blueprint) {
    return;
  }

  if (state.recomputeTimer) {
    window.clearTimeout(state.recomputeTimer);
    state.recomputeTimer = null;
  }

  const run = async () => {
    try {
      await recomputeBlueprint("Blueprint recomputed.");
    } catch (error) {
      setStatus(`Recompute error: ${error.message}`, "warn");
    }
  };

  if (immediate) {
    run();
  } else {
    state.recomputeTimer = window.setTimeout(run, 360);
  }
}

async function loadImages() {
  const data = await apiGet("/api/images");
  state.images = data.files || [];
  renderImages();
}

async function loadDefaultBlueprint() {
  const cups = Number.parseFloat(els.cupsInput.value) || 4;
  setStatus("Loading baseline blueprint...", "");

  const payload = await apiGet(`/api/blueprint/default?cups=${encodeURIComponent(cups)}`);
  state.blueprint = payload.blueprint;
  state.analysis = payload.analysis;
  initPlaygroundFromBlueprint();
  resetThreeFormControls();
  renderAll();
  await generatePrototype();
  setStatus("Blueprint baseline loaded from image analysis.", "ok");
}

async function analyzeOnly() {
  setStatus("Analyzing source images...", "");
  const response = await apiPost("/api/analyze");
  state.analysis = await response.json();
  renderAnalysis();
  setStatus("Image analysis complete.", "ok");
}

function applyAnalysisMaterials() {
  if (!state.analysis || !state.blueprint) {
    setStatus("Run analysis first.", "warn");
    return;
  }

  if (!state.analysis.material_suggestions?.length) {
    setStatus("No material suggestions available.", "warn");
    return;
  }

  state.blueprint.materials = state.analysis.material_suggestions;
  queueRecompute(true);
  generatePrototype();
}

function readPlaygroundValuesFromInputs() {
  state.playground.values.bodyCurve = Number.parseInt(els.shapeBodyCurve.value, 10) || 0;
  state.playground.values.headFlare = Number.parseInt(els.shapeHeadFlare.value, 10) || 0;
  state.playground.values.height = Number.parseInt(els.shapeHeight.value, 10) || 0;
  state.playground.values.neck = Number.parseInt(els.shapeNeck.value, 10) || 0;
  state.playground.values.handle = Number.parseInt(els.shapeHandle.value, 10) || 0;
  state.playground.values.base = Number.parseInt(els.shapeBase.value, 10) || 0;
  state.playground.lockCapacity = Boolean(els.shapeLockCapacity.checked);
  updatePlaygroundValueLabels();
}

function applyPlaygroundMorphToDimensions() {
  if (!state.blueprint || !state.playground.baseDims) {
    return;
  }

  const base = state.playground.baseDims;
  const morphed = cloneDimensions(base);
  const v = state.playground.values;

  const curve = v.bodyCurve / 100.0;
  const flare = v.headFlare / 100.0;
  const height = v.height / 100.0;
  const neck = v.neck / 100.0;
  const handle = v.handle / 100.0;
  const baseStability = v.base / 100.0;

  morphed.body_max_diameter_mm = base.body_max_diameter_mm * (1 + 0.24 * curve);
  morphed.body_bottom_diameter_mm = base.body_bottom_diameter_mm * (1 + 0.12 * curve);
  morphed.neck_diameter_mm = base.neck_diameter_mm * (1 - 0.08 * curve);

  morphed.head_top_diameter_mm = base.head_top_diameter_mm * (1 + 0.30 * flare);
  morphed.head_height_mm = base.head_height_mm * (1 + 0.16 * flare);
  morphed.head_neck_overlap_mm = base.head_neck_overlap_mm * (1 + 0.08 * flare);

  morphed.body_height_mm = base.body_height_mm * (1 + 0.30 * height);
  morphed.head_height_mm *= 1 + 0.22 * height;
  morphed.handle_drop_mm = base.handle_drop_mm * (1 + 0.24 * height);

  morphed.neck_diameter_mm *= 1 - 0.30 * neck;
  morphed.insert_outer_diameter_mm = base.insert_outer_diameter_mm * (1 - 0.20 * neck);
  morphed.insert_inner_diameter_mm = base.insert_inner_diameter_mm * (1 - 0.14 * neck);

  morphed.handle_length_mm = base.handle_length_mm * (1 + 0.46 * handle);
  morphed.handle_offset_mm = base.handle_offset_mm * (1 + 0.34 * handle);
  morphed.handle_thickness_mm = base.handle_thickness_mm * (1 + 0.16 * handle);
  morphed.handle_drop_mm *= 1 + 0.16 * handle;

  morphed.body_bottom_diameter_mm *= 1 + 0.26 * baseStability;
  morphed.base_cap_diameter_mm = base.base_cap_diameter_mm * (1 + 0.30 * baseStability);
  morphed.base_cap_height_mm = base.base_cap_height_mm * (1 + 0.22 * baseStability);

  morphed.wall_thickness_mm = clamp(morphed.wall_thickness_mm, 0.4, 2.2);
  morphed.body_height_mm = clamp(morphed.body_height_mm, 60, 280);
  morphed.head_height_mm = clamp(morphed.head_height_mm, 24, 130);
  morphed.body_bottom_diameter_mm = clamp(morphed.body_bottom_diameter_mm, 55, 180);
  morphed.body_max_diameter_mm = clamp(morphed.body_max_diameter_mm, 65, 210);
  morphed.neck_diameter_mm = clamp(morphed.neck_diameter_mm, 45, morphed.body_max_diameter_mm * 0.92);
  morphed.head_top_diameter_mm = clamp(
    morphed.head_top_diameter_mm,
    Math.max(morphed.neck_diameter_mm + 12, 70),
    240,
  );
  morphed.insert_outer_diameter_mm = clamp(
    morphed.insert_outer_diameter_mm,
    26,
    morphed.neck_diameter_mm - 6,
  );
  morphed.insert_inner_diameter_mm = clamp(
    morphed.insert_inner_diameter_mm,
    12,
    morphed.insert_outer_diameter_mm - 6,
  );
  morphed.base_cap_diameter_mm = clamp(
    morphed.base_cap_diameter_mm,
    55,
    morphed.body_bottom_diameter_mm + 18,
  );
  morphed.handle_length_mm = clamp(morphed.handle_length_mm, 45, 190);
  morphed.handle_offset_mm = clamp(morphed.handle_offset_mm, 8, 80);
  morphed.handle_drop_mm = clamp(morphed.handle_drop_mm, 28, 160);
  morphed.handle_thickness_mm = clamp(morphed.handle_thickness_mm, 8, 34);
  morphed.head_neck_overlap_mm = clamp(
    morphed.head_neck_overlap_mm,
    2,
    Math.min(22, morphed.head_height_mm * 0.45),
  );
  morphed.base_cap_height_mm = clamp(morphed.base_cap_height_mm, 2, 20);
  morphed.insert_height_mm = clamp(morphed.insert_height_mm, 12, 60);

  state.blueprint.dimensions = morphed;
}

function applyUniformCapacityScale(factor) {
  const dim = state.blueprint?.dimensions;
  if (!dim || !Number.isFinite(factor)) {
    return;
  }
  for (const key of capacityScaleKeys) {
    if (!(key in dim)) {
      continue;
    }
    dim[key] = Number(dim[key]) * factor;
  }
}

async function applyPlaygroundMorph(maintainCapacity) {
  if (!state.blueprint || !state.playground.baseDims) {
    return;
  }
  readPlaygroundValuesFromInputs();
  applyPlaygroundMorphToDimensions();

  try {
    await recomputeBlueprint("Structure updated.");
    if (maintainCapacity && state.playground.lockCapacity) {
      const dim = state.blueprint.dimensions;
      const target = Number(dim.capacity_target_ml);
      const estimated = Number(dim.estimated_capacity_ml);
      if (Number.isFinite(target) && Number.isFinite(estimated) && estimated > 1) {
        const ratio = target / estimated;
        if (ratio > 0.3 && ratio < 2.5 && Math.abs(1 - ratio) > 0.015) {
          const factor = Math.cbrt(ratio);
          applyUniformCapacityScale(factor);
          await recomputeBlueprint("Structure updated with target capacity lock.");
        }
      }
    }
  } catch (error) {
    setStatus(`Structure update error: ${error.message}`, "warn");
  }
}

async function applyQuickShape(action) {
  if (!state.blueprint?.dimensions) {
    return;
  }

  const dim = state.blueprint.dimensions;
  const cups = Number(dim.cups_target || 4);

  const bump = (key, ratio) => {
    if (!(key in dim)) {
      return;
    }
    dim[key] = Number(dim[key]) * ratio;
  };

  switch (action) {
    case "wider":
      bump("body_max_diameter_mm", 1.08);
      bump("body_bottom_diameter_mm", 1.05);
      bump("neck_diameter_mm", 1.02);
      break;
    case "taller":
      bump("body_height_mm", 1.08);
      bump("head_height_mm", 1.05);
      bump("handle_drop_mm", 1.04);
      break;
    case "flare":
      bump("head_top_diameter_mm", 1.10);
      bump("head_height_mm", 1.04);
      break;
    case "neck":
      bump("neck_diameter_mm", 0.92);
      bump("insert_outer_diameter_mm", 0.95);
      break;
    case "handle":
      bump("handle_length_mm", 1.12);
      bump("handle_offset_mm", 1.07);
      bump("handle_thickness_mm", 1.03);
      break;
    case "reset":
      state.blueprint.dimensions = createDefaultDimensions(cups);
      initPlaygroundFromBlueprint();
      resetThreeFormControls();
      try {
        await recomputeBlueprint("3D shape reset.");
      } catch (error) {
        setStatus(`Quick shape error: ${error.message}`, "warn");
      }
      return;
    default:
      return;
  }

  dim.neck_diameter_mm = clamp(Number(dim.neck_diameter_mm), 40, Number(dim.body_max_diameter_mm) * 0.95);
  dim.head_top_diameter_mm = clamp(Number(dim.head_top_diameter_mm), Number(dim.neck_diameter_mm) + 10, 250);
  dim.body_bottom_diameter_mm = clamp(Number(dim.body_bottom_diameter_mm), 55, Number(dim.body_max_diameter_mm));
  dim.insert_outer_diameter_mm = clamp(
    Number(dim.insert_outer_diameter_mm),
    24,
    Number(dim.neck_diameter_mm) - 6,
  );
  dim.insert_inner_diameter_mm = clamp(
    Number(dim.insert_inner_diameter_mm),
    10,
    Number(dim.insert_outer_diameter_mm) - 6,
  );

  try {
    await recomputeBlueprint("3D shape updated.");
    capturePlaygroundBase();
  } catch (error) {
    setStatus(`Quick shape error: ${error.message}`, "warn");
  }
}

function queuePlaygroundMorph(maintainCapacity) {
  if (state.playgroundTimer) {
    window.clearTimeout(state.playgroundTimer);
    state.playgroundTimer = null;
  }

  state.playgroundTimer = window.setTimeout(() => {
    applyPlaygroundMorph(maintainCapacity);
  }, 200);
}

function resetPlaygroundMorph() {
  if (!state.blueprint || !state.playground.baseDims) {
    return;
  }
  setPlaygroundDefaults();
  state.blueprint.dimensions = cloneDimensions(state.playground.baseDims);
  queueRecompute(true);
}

function downloadBlob(blob, fileName) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

async function svgElementToPngDataUrl(svgElement, width, height) {
  if (!svgElement) {
    throw new Error("SVG element is not available.");
  }
  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(svgElement);
  const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const objectUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to rasterize SVG for PPTX."));
      img.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function currentDetachSummary() {
  const detach = state.three.detachState;
  const enabled = [];
  if (detach.bottom) enabled.push("Bottom vessel");
  if (detach.flare) enabled.push("Head flare");
  if (detach.gasket) enabled.push("Gasket");
  if (detach.strainer) enabled.push("Strainer");
  if (!enabled.length) {
    return "None";
  }
  return enabled.join(", ");
}

async function exportPptxLocal(timestamp) {
  const PptxGenJS = window.PptxGenJS;
  if (!PptxGenJS) {
    throw new Error("PPTX library could not be loaded.");
  }
  if (!state.blueprint) {
    throw new Error("Load a blueprint before exporting.");
  }

  drawBlueprint();
  drawPartPrints();

  const blueprintPng = await svgElementToPngDataUrl(els.blueprintSvg, 1800, 840);
  const partsPng = await svgElementToPngDataUrl(els.partsPrintSvg, 1800, 620);
  const previewPng = state.three.renderer?.domElement?.toDataURL?.("image/png") || null;

  const dim = state.blueprint.dimensions;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Curved Head Teapot Blueprint Tool";
  pptx.subject = "Teapot manufacturing blueprint";
  pptx.title = "Curved Head Teapot Blueprint";

  const slide1 = pptx.addSlide();
  slide1.background = { color: "F5F9FB" };
  slide1.addText("Curved Head Teapot Blueprint", {
    x: 0.3, y: 0.2, w: 8.8, h: 0.35, bold: true, fontSize: 20, color: "124556",
  });
  slide1.addText(`Generated ${new Date().toISOString().slice(0, 19).replace("T", " ")}`, {
    x: 0.3, y: 0.56, w: 4.5, h: 0.22, fontSize: 10, color: "3B6170",
  });

  if (previewPng) {
    slide1.addImage({ data: previewPng, x: 0.3, y: 0.9, w: 5.9, h: 3.5 });
  }
  slide1.addImage({ data: blueprintPng, x: 6.3, y: 0.9, w: 6.7, h: 3.5 });

  slide1.addText(
    [
      `Overall Height: ${formatNumber(dim.overall_height_mm, 1)} mm (${formatNumber(mmToIn(dim.overall_height_mm), 2)} in)`,
      `Head Top Diameter: ${formatNumber(dim.head_top_diameter_mm, 1)} mm`,
      `Body Max Diameter: ${formatNumber(dim.body_max_diameter_mm, 1)} mm`,
      `Neck Diameter: ${formatNumber(dim.neck_diameter_mm, 1)} mm`,
      `Estimated Capacity: ${formatNumber(dim.estimated_capacity_ml, 1)} ml`,
      `Head Curvature: ${formatNumber(getHeadCurvatureScale() * 100, 0)}%`,
      `Detached Parts: ${currentDetachSummary()}`,
    ].join("\n"),
    {
      x: 0.3, y: 4.55, w: 6.2, h: 2.6, fontSize: 11, color: "1F4E5D",
      breakLine: true,
    },
  );

  slide1.addText(
    "Includes editable 3D exploded view with detachable bottom vessel, flare, gasket, and strainer.",
    {
      x: 6.6, y: 4.55, w: 6.5, h: 0.8, fontSize: 11, color: "1F4E5D", breakLine: true,
    },
  );

  const slide2 = pptx.addSlide();
  slide2.background = { color: "F5F9FB" };
  slide2.addText("Detached Part 2D Prints", {
    x: 0.3, y: 0.22, w: 6.4, h: 0.35, bold: true, fontSize: 20, color: "124556",
  });
  slide2.addImage({ data: partsPng, x: 0.3, y: 0.85, w: 12.7, h: 5.9 });

  await pptx.writeFile({ fileName: `teapot_blueprint_${timestamp}.pptx` });
}

function buildDxfLocal(blueprint) {
  const d = blueprint.dimensions;
  const lines = [];
  const push = (...parts) => lines.push(...parts);
  const addLine = (x1, y1, x2, y2, layer = "SIDE") => {
    push(
      "0", "LINE", "8", layer,
      "10", x1.toFixed(4), "20", y1.toFixed(4), "30", "0.0",
      "11", x2.toFixed(4), "21", y2.toFixed(4), "31", "0.0",
    );
  };
  const addCircle = (cx, cy, r, layer = "TOP") => {
    push(
      "0", "CIRCLE", "8", layer,
      "10", cx.toFixed(4), "20", cy.toFixed(4), "30", "0.0",
      "40", r.toFixed(4),
    );
  };

  const overallH = d.overall_height_mm;
  const rBottom = d.body_bottom_diameter_mm * 0.5;
  const rNeck = d.neck_diameter_mm * 0.5;
  const rHead = d.head_top_diameter_mm * 0.5;
  const p = buildOuterProfilePoints(d, 44, 30, getProfileOptions());
  for (let i = 0; i < p.length - 1; i += 1) {
    addLine(p[i][0], p[i][1], p[i + 1][0], p[i + 1][1], "SIDE");
    addLine(-p[i][0], p[i][1], -p[i + 1][0], p[i + 1][1], "SIDE");
  }
  addLine(0, -8, 0, overallH + 12, "CENTER");
  addLine(-rBottom, 0, rBottom, 0, "SIDE");
  addLine(-rHead, overallH, rHead, overallH, "SIDE");

  const cx = 280;
  const cy = overallH * 0.6;
  addCircle(cx, cy, rHead, "TOP");
  addCircle(cx, cy, rNeck, "TOP");
  addCircle(cx, cy, d.insert_outer_diameter_mm * 0.5, "TOP");
  addCircle(cx, cy, d.insert_inner_diameter_mm * 0.5, "TOP");

  const out = [
    "0", "SECTION", "2", "HEADER", "0", "ENDSEC",
    "0", "SECTION", "2", "TABLES", "0", "ENDSEC",
    "0", "SECTION", "2", "ENTITIES",
    ...lines,
    "0", "ENDSEC", "0", "EOF",
  ];
  return `${out.join("\n")}\n`;
}

function buildObjLocal(blueprint) {
  const d = blueprint.dimensions;
  const profile = buildOuterProfilePoints(d, 44, 30, getProfileOptions());
  const seg = 56;
  const verts = [];
  const faces = [];
  const rings = [];
  profile.forEach(([r, y]) => {
    const ring = [];
    for (let i = 0; i < seg; i += 1) {
      const t = (2 * Math.PI * i) / seg;
      const x = r * Math.cos(t);
      const z = r * Math.sin(t);
      verts.push([x, y, z]);
      ring.push(verts.length);
    }
    rings.push(ring);
  });
  for (let j = 0; j < rings.length - 1; j += 1) {
    const a = rings[j];
    const b = rings[j + 1];
    for (let i = 0; i < seg; i += 1) {
      const i2 = (i + 1) % seg;
      faces.push([a[i], b[i], b[i2]]);
      faces.push([a[i], b[i2], a[i2]]);
    }
  }
  const lines = ["# teapot local export", "o teapot"];
  verts.forEach(([x, y, z]) => lines.push(`v ${x.toFixed(6)} ${y.toFixed(6)} ${z.toFixed(6)}`));
  faces.forEach(([a, b, c]) => lines.push(`f ${a} ${b} ${c}`));
  return `${lines.join("\n")}\n`;
}

async function generatePrototypeLocalImage() {
  const canvas = document.createElement("canvas");
  canvas.width = 1500;
  canvas.height = 900;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#eef3f5";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#174f63";
  ctx.fillRect(0, 0, canvas.width, 120);
  ctx.fillStyle = "#edf5f7";
  ctx.font = "28px Space Grotesk, sans-serif";
  ctx.fillText("Curved-Head Teapot Prototype (Free Static Mode)", 24, 44);
  ctx.font = "16px Space Grotesk, sans-serif";
  ctx.fillText("Editable structure generated without paid backend hosting", 24, 74);

  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#b8cad2";
  ctx.lineWidth = 2;
  const left = { x: 20, y: 140, w: 440, h: 740 };
  ctx.fillRect(left.x, left.y, left.w, left.h);
  ctx.strokeRect(left.x, left.y, left.w, left.h);
  ctx.fillStyle = "#2e5c6c";
  ctx.font = "18px Space Grotesk, sans-serif";
  ctx.fillText("Reference Images", 36, 172);

  const thumbnails = state.images.slice(0, 6);
  let idx = 0;
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 2; c += 1) {
      if (idx >= thumbnails.length) break;
      const imgMeta = thumbnails[idx];
      const img = new Image();
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
        img.src = imgMeta.url;
      });
      const x = 36 + c * 206;
      const y = 190 + r * 165;
      if (img.width > 0 && img.height > 0) {
        ctx.drawImage(img, x, y, 190, 146);
      }
      ctx.strokeStyle = "#b8cad2";
      ctx.strokeRect(x, y, 190, 146);
      idx += 1;
    }
  }

  const right = { x: 480, y: 140, w: 1000, h: 740 };
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#b8cad2";
  ctx.fillRect(right.x, right.y, right.w, right.h);
  ctx.strokeRect(right.x, right.y, right.w, right.h);

  const dim = state.blueprint.dimensions;
  const ox = 840;
  const oy = 730;
  const scale = Math.min(2.0, 320 / Math.max(dim.head_top_diameter_mm, dim.body_max_diameter_mm));
  const prof = buildOuterProfilePoints(dim, 44, 30, getProfileOptions());
  const map = (x, y) => [ox + x * scale, oy - y * scale];
  ctx.beginPath();
  prof.forEach((p, i) => {
    const [x, y] = map(p[0], p[1]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  [...prof].reverse().forEach((p) => {
    const [x, y] = map(-p[0], p[1]);
    ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = "rgba(25,95,118,0.08)";
  ctx.strokeStyle = "#145b70";
  ctx.lineWidth = 3;
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#2e5c6c";
  ctx.font = "18px Space Grotesk, sans-serif";
  ctx.fillText("Prototype Geometry", 520, 180);
  ctx.font = "16px Space Grotesk, sans-serif";
  ctx.fillText(`Head Dia ${dim.head_top_diameter_mm.toFixed(1)} mm`, 760, 280);
  ctx.fillText(`Body Dia ${dim.body_max_diameter_mm.toFixed(1)} mm`, 760, 760);
  ctx.fillText(`Height ${dim.overall_height_mm.toFixed(1)} mm`, 640, 520);
  ctx.fillText(`Estimated ${dim.estimated_capacity_ml.toFixed(1)} ml`, 520, 220);

  return await new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

async function generatePrototype() {
  setStatus("Generating prototype v1 board...", "");
  if (!state.blueprint) {
    setStatus("Load a blueprint first.", "warn");
    return;
  }

  if (state.localMode) {
    try {
      const blob = await generatePrototypeLocalImage();
      if (state.prototypeUrl) {
        URL.revokeObjectURL(state.prototypeUrl);
      }
      state.prototypeUrl = URL.createObjectURL(blob);
      els.prototypeImage.src = state.prototypeUrl;
      els.prototypeMeta.textContent = "Prototype generated in-browser (free static mode).";
      setStatus("Prototype v1 generated (local mode).", "ok");
      return;
    } catch (error) {
      setStatus(`Prototype error: ${error.message}`, "warn");
      return;
    }
  }

  try {
    const response = await fetch("/api/prototype/v1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blueprint: state.blueprint }),
    });

    if (!response.ok) {
      throw new Error(`Prototype generation failed: ${response.status}`);
    }

    const blob = await response.blob();
    if (state.prototypeUrl) {
      URL.revokeObjectURL(state.prototypeUrl);
    }
    state.prototypeUrl = URL.createObjectURL(blob);
    els.prototypeImage.src = state.prototypeUrl;

    const path = response.headers.get("X-Prototype-Path") || "exports folder";
    els.prototypeMeta.textContent = `Prototype generated from image set. Saved at ${path}`;
    setStatus("Prototype v1 generated.", "ok");
  } catch (error) {
    setStatus(`Prototype error: ${error.message}`, "warn");
    els.prototypeMeta.textContent = "Prototype generation failed. Check backend logs.";
  }
}

async function exportBlueprint(format) {
  if (!state.blueprint) {
    setStatus("Load a blueprint first.", "warn");
    return;
  }

  setStatus(`Generating ${format.toUpperCase()} export...`, "");

  if (state.localMode) {
    try {
      const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
      if (format === "json") {
        const jsonText = JSON.stringify(state.blueprint, null, 2);
        downloadBlob(new Blob([jsonText], { type: "application/json" }), `teapot_blueprint_${timestamp}.json`);
        setStatus("Exported JSON (local mode).", "ok");
        return;
      }
      if (format === "dxf") {
        const dxfText = buildDxfLocal(state.blueprint);
        downloadBlob(new Blob([dxfText], { type: "application/dxf" }), `teapot_blueprint_${timestamp}.dxf`);
        setStatus("Exported DXF (local mode).", "ok");
        return;
      }
      if (format === "obj") {
        const objText = buildObjLocal(state.blueprint);
        downloadBlob(new Blob([objText], { type: "text/plain" }), `teapot_blueprint_${timestamp}.obj`);
        setStatus("Exported OBJ (local mode).", "ok");
        return;
      }
      if (format === "pptx") {
        await exportPptxLocal(timestamp);
        setStatus("Exported PPTX (local mode).", "ok");
        return;
      }
    } catch (error) {
      setStatus(`Export error: ${error.message}`, "warn");
      return;
    }
  }

  try {
    if (format === "pptx") {
      try {
        const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
        await exportPptxLocal(timestamp);
        setStatus("Exported PPTX from interactive blueprint.", "ok");
        return;
      } catch {
        // Fall back to backend route if frontend PPTX generation is unavailable.
      }
    }

    const response = await fetch(`/api/export/${format}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blueprint: state.blueprint, options: {} }),
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }

    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition") || "";
    const fileNameMatch = disposition.match(/filename=\"?([^\\\"]+)\"?/i);
    const fileName = fileNameMatch ? fileNameMatch[1] : `teapot_export.${format}`;

    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);

    const savedPath = response.headers.get("X-Export-Path") || "local export folder";
    setStatus(`Exported ${fileName}. Saved at ${savedPath}`, "ok");
  } catch (error) {
    setStatus(`Export error: ${error.message}`, "warn");
  }
}

function bindEvents() {
  els.loadDefaultBtn.addEventListener("click", () => {
    loadDefaultBlueprint().catch((error) => setStatus(error.message, "warn"));
  });

  els.analyzeBtn.addEventListener("click", () => {
    analyzeOnly().catch((error) => setStatus(error.message, "warn"));
  });

  els.applyAnalysisBtn.addEventListener("click", applyAnalysisMaterials);
  els.generatePrototypeBtn.addEventListener("click", () => {
    generatePrototype();
  });
  if (els.threeAutoRotate) {
    els.threeAutoRotate.addEventListener("change", () => {
      if (state.three.controls) {
        state.three.controls.autoRotate = Boolean(els.threeAutoRotate.checked);
      }
    });
  }

  if (els.threeMaterialPreset) {
    els.threeMaterialPreset.addEventListener("change", () => {
      const preset = els.threeMaterialPreset.value;
      if (preset === "custom") {
        markThreeMaterialCustom();
        syncThreeMaterialInputs();
        renderThreeModel();
        return;
      }
      applyThreeMaterialPreset(preset, true);
      setStatus(`3D material preset applied: ${preset}.`, "ok");
    });
  }

  const onCustomMaterialInput = () => {
    if (!els.threePrimaryColor || !els.threeMetalness || !els.threeRoughness) {
      return;
    }
    markThreeMaterialCustom();
    state.three.materialState.primaryColor = normalizeHexColor(
      els.threePrimaryColor.value,
      state.three.materialState.primaryColor,
    );
    state.three.materialState.metalness = clamp01((Number.parseFloat(els.threeMetalness.value) || 0) / 100);
    state.three.materialState.roughness = clamp01((Number.parseFloat(els.threeRoughness.value) || 0) / 100);
    updateThreeMaterialValueLabels();
    renderThreeModel();
  };

  if (els.threePrimaryColor) {
    els.threePrimaryColor.addEventListener("input", onCustomMaterialInput);
    els.threePrimaryColor.addEventListener("change", onCustomMaterialInput);
  }
  if (els.threeMetalness) {
    els.threeMetalness.addEventListener("input", onCustomMaterialInput);
    els.threeMetalness.addEventListener("change", onCustomMaterialInput);
  }
  if (els.threeRoughness) {
    els.threeRoughness.addEventListener("input", onCustomMaterialInput);
    els.threeRoughness.addEventListener("change", onCustomMaterialInput);
  }

  const onDetachControlInput = () => {
    state.three.detachState.distancePct = Number.parseInt(els.threeDetachDistance?.value || "0", 10) || 0;
    state.three.detachState.bottom = Boolean(els.detachBottomToggle?.checked);
    state.three.detachState.flare = Boolean(els.detachFlareToggle?.checked);
    state.three.detachState.gasket = Boolean(els.detachGasketToggle?.checked);
    state.three.detachState.strainer = Boolean(els.detachStrainerToggle?.checked);
    syncThreeDetachInputs();
    renderThreeModel();
  };

  [els.threeDetachDistance, els.detachBottomToggle, els.detachFlareToggle, els.detachGasketToggle, els.detachStrainerToggle]
    .filter(Boolean)
    .forEach((input) => {
      input.addEventListener("input", onDetachControlInput);
      input.addEventListener("change", onDetachControlInput);
    });

  const onHeadCurvatureInput = () => {
    state.three.flareState.curvaturePct = Number.parseInt(els.threeHeadCurvature?.value || "100", 10) || 100;
    syncThreeFlareInputs();
    drawBlueprint();
    drawPartPrints();
    renderThreeModel();
  };

  if (els.threeHeadCurvature) {
    els.threeHeadCurvature.addEventListener("input", onHeadCurvatureInput);
    els.threeHeadCurvature.addEventListener("change", onHeadCurvatureInput);
  }

  const onHeadSizeInput = (commit) => {
    if (!state.blueprint?.dimensions) {
      return;
    }
    const nextPct = Number.parseInt(els.threeHeadFlareSize?.value || "100", 10) || 100;
    const prevPct = Math.max(Number(state.three.flareState.lastAppliedSizePct || 100), 1);
    const ratio = clamp(nextPct / prevPct, 0.5, 1.7);
    state.three.flareState.sizePct = nextPct;
    state.three.flareState.lastAppliedSizePct = nextPct;
    applyHeadFlareSizeRatio(ratio);
    syncThreeFlareInputs();
    drawBlueprint();
    drawPartPrints();
    renderThreeModel();
    if (commit) {
      queueRecompute(true);
      return;
    }
    queueRecompute(false);
  };

  if (els.threeHeadFlareSize) {
    els.threeHeadFlareSize.addEventListener("input", () => onHeadSizeInput(false));
    els.threeHeadFlareSize.addEventListener("change", () => onHeadSizeInput(true));
  }

  document.querySelectorAll("[data-quick-shape]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.getAttribute("data-quick-shape");
      applyQuickShape(action);
    });
  });

  const sliderMap = [
    els.shapeBodyCurve,
    els.shapeHeadFlare,
    els.shapeHeight,
    els.shapeNeck,
    els.shapeHandle,
    els.shapeBase,
  ];

  sliderMap.filter(Boolean).forEach((slider) => {
    slider.addEventListener("input", () => {
      readPlaygroundValuesFromInputs();
      queuePlaygroundMorph(false);
    });
    slider.addEventListener("change", () => {
      readPlaygroundValuesFromInputs();
      queuePlaygroundMorph(true);
    });
  });

  els.shapeLockCapacity.addEventListener("change", () => {
    state.playground.lockCapacity = Boolean(els.shapeLockCapacity.checked);
  });

  els.shapeResetBtn.addEventListener("click", () => {
    resetPlaygroundMorph();
  });

  els.shapeSetBaseBtn.addEventListener("click", () => {
    capturePlaygroundBase();
    setPlaygroundDefaults();
    setStatus("Current geometry set as new structure baseline.", "ok");
  });

  els.shapeApplyBtn.addEventListener("click", async () => {
    await applyPlaygroundMorph(true);
    await generatePrototype();
  });

  document.querySelectorAll("[data-export]").forEach((button) => {
    button.addEventListener("click", () => {
      const format = button.getAttribute("data-export");
      exportBlueprint(format);
    });
  });
}

async function bootstrap() {
  applyThreeMaterialPreset(state.three.materialState.preset, false);
  resetThreeFormControls();
  initThree();
  bindEvents();

  try {
    await maybeEnableLocalMode();
    await loadImages();
    await loadDefaultBlueprint();
  } catch (error) {
    setStatus(`Initialization failed: ${error.message}`, "warn");
  }
}

bootstrap();
