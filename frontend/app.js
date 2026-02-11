import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/controls/OrbitControls.js";

const state = {
  blueprint: null,
  analysis: null,
  images: [],
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

function cloneDimensions(dim) {
  return JSON.parse(JSON.stringify(dim));
}

function setSliderValue(el, value) {
  if (!el) {
    return;
  }
  el.value = String(value);
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

async function apiGet(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`GET ${path} failed: ${response.status}`);
  }
  return response.json();
}

async function apiPost(path, body = null) {
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

  const bodyH = dim.body_height_mm;
  const overallH = dim.overall_height_mm;

  const rBottom = dim.body_bottom_diameter_mm * 0.5;
  const rMax = dim.body_max_diameter_mm * 0.5;
  const rNeck = dim.neck_diameter_mm * 0.5;
  const rHead = dim.head_top_diameter_mm * 0.5;

  const right = [
    [rBottom, 0],
    [rMax, bodyH * 0.3],
    [rMax * 0.98, bodyH * 0.68],
    [rNeck, bodyH],
    [rNeck * 1.18, bodyH + (overallH - bodyH) * 0.45],
    [rHead, overallH],
  ];

  const mapSide = (xMm, yMm) => [sideOx + xMm * scale, sideOy - yMm * scale];

  let pathData = "";
  right.forEach((point, index) => {
    const [x, y] = mapSide(point[0], point[1]);
    pathData += `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)} `;
  });
  const left = [...right].reverse().map((point) => [-point[0], point[1]]);
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

function buildTeapotGroup(dim) {
  const group = new THREE.Group();

  const steel = new THREE.MeshStandardMaterial({
    color: 0xc9d0d4,
    metalness: 0.86,
    roughness: 0.22,
    envMapIntensity: 1.0,
  });

  const steelDark = new THREE.MeshStandardMaterial({
    color: 0x9ca9af,
    metalness: 0.75,
    roughness: 0.34,
  });

  const handleMat = new THREE.MeshStandardMaterial({
    color: 0x14181c,
    metalness: 0.12,
    roughness: 0.86,
  });

  const gasketMat = new THREE.MeshStandardMaterial({
    color: 0x214b3f,
    metalness: 0.05,
    roughness: 0.88,
  });

  const bodyH = dim.body_height_mm;
  const overallH = dim.overall_height_mm;

  const rBottom = dim.body_bottom_diameter_mm * 0.5;
  const rMax = dim.body_max_diameter_mm * 0.5;
  const rNeck = dim.neck_diameter_mm * 0.5;
  const rHead = dim.head_top_diameter_mm * 0.5;

  const bodyProfile = [
    new THREE.Vector2(rBottom, 0),
    new THREE.Vector2(rMax, bodyH * 0.3),
    new THREE.Vector2(rMax * 0.98, bodyH * 0.68),
    new THREE.Vector2(rNeck, bodyH),
  ];

  const bodyGeo = new THREE.LatheGeometry(bodyProfile, 72);
  const bodyMesh = new THREE.Mesh(bodyGeo, steel);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  group.add(bodyMesh);

  const headStart = bodyH - dim.head_neck_overlap_mm;
  const headProfile = [
    new THREE.Vector2(rNeck, headStart),
    new THREE.Vector2(rNeck * 1.18, headStart + (overallH - headStart) * 0.45),
    new THREE.Vector2(rHead, overallH),
  ];
  const headGeo = new THREE.LatheGeometry(headProfile, 72);
  const headMesh = new THREE.Mesh(headGeo, steel);
  headMesh.castShadow = true;
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
  group.add(gasketMesh);

  const baseGeo = new THREE.CylinderGeometry(
    dim.base_cap_diameter_mm * 0.5,
    dim.base_cap_diameter_mm * 0.5,
    dim.base_cap_height_mm,
    60,
  );
  const baseMesh = new THREE.Mesh(baseGeo, steelDark);
  baseMesh.position.y = dim.base_cap_height_mm * 0.5;
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
  group.add(handleMesh);

  const centeringBox = new THREE.Box3().setFromObject(group);
  const center = centeringBox.getCenter(new THREE.Vector3());
  group.position.sub(center);
  group.position.y += centeringBox.getSize(new THREE.Vector3()).y * 0.45;

  return group;
}

function renderThreeModel() {
  if (!state.three.scene || !state.blueprint) {
    return;
  }

  if (state.teapotGroup) {
    state.three.scene.remove(state.teapotGroup);
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

async function generatePrototype() {
  setStatus("Generating prototype v1 board...", "");
  if (!state.blueprint) {
    setStatus("Load a blueprint first.", "warn");
    return;
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

  try {
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
  initThree();
  bindEvents();

  try {
    await loadImages();
    await loadDefaultBlueprint();
  } catch (error) {
    setStatus(`Initialization failed: ${error.message}`, "warn");
  }
}

bootstrap();
