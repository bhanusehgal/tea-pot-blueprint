from __future__ import annotations

import math
from copy import deepcopy

from .models import BOMItem, Blueprint, Dimensions, MaterialSuggestion

US_CUP_TO_ML = 236.588


DEFAULT_MATERIALS = [
    MaterialSuggestion(
        part_key="body_shell",
        part_name="Lower vessel body shell",
        recommended="Stainless Steel 304 (0.9 mm)",
        alternatives=["Stainless Steel 316L (0.9 mm)", "Stainless Steel 430 (1.0 mm)"],
        selected="Stainless Steel 304 (0.9 mm)",
        confidence=0.86,
        notes="Deep draw + spin formed shell.",
    ),
    MaterialSuggestion(
        part_key="curved_head",
        part_name="Curved upper head / funnel section",
        recommended="Stainless Steel 304 (0.9 mm)",
        alternatives=["Stainless Steel 316L (0.9 mm)", "Stainless Steel 430 (1.0 mm)"],
        selected="Stainless Steel 304 (0.9 mm)",
        confidence=0.83,
        notes="Curved lip and neck transition.",
    ),
    MaterialSuggestion(
        part_key="handle",
        part_name="External handle",
        recommended="Glass-filled Nylon 66, heat-resistant",
        alternatives=["Bakelite / Phenolic resin", "Stainless handle + silicone sleeve"],
        selected="Glass-filled Nylon 66, heat-resistant",
        confidence=0.72,
        notes="Thermal isolation and grip safety.",
    ),
    MaterialSuggestion(
        part_key="insert_filter",
        part_name="Center insert / filter collar",
        recommended="Stainless Steel 304 + 80 mesh screen",
        alternatives=["Stainless Steel 316L + 100 mesh screen", "Perforated stainless disc"],
        selected="Stainless Steel 304 + 80 mesh screen",
        confidence=0.79,
        notes="Leaf control during pour.",
    ),
    MaterialSuggestion(
        part_key="gasket",
        part_name="Sealing ring / gasket",
        recommended="Food-grade Silicone (Shore A 50-60)",
        alternatives=["EPDM food-grade", "Fluorosilicone (premium)"],
        selected="Food-grade Silicone (Shore A 50-60)",
        confidence=0.69,
        notes="Upper/lower section seal.",
    ),
    MaterialSuggestion(
        part_key="base_cap",
        part_name="Bottom cap / base ring",
        recommended="Stainless Steel 304 (1.0 mm)",
        alternatives=["Stainless Steel 430 (1.0 mm)", "Stainless Steel 316L (1.0 mm)"],
        selected="Stainless Steel 304 (1.0 mm)",
        confidence=0.75,
        notes="Base reinforcement.",
    ),
]


def cups_to_ml(cups: float) -> float:
    return cups * US_CUP_TO_ML


def _frustum_volume_mm3(r1: float, r2: float, h: float) -> float:
    return math.pi * h * (r1 * r1 + r1 * r2 + r2 * r2) / 3.0


def estimate_capacity_ml(dim: Dimensions) -> float:
    t = dim.wall_thickness_mm
    body_h = dim.body_height_mm

    r_bottom = max((dim.body_bottom_diameter_mm * 0.5) - t, 1.0)
    r_max = max((dim.body_max_diameter_mm * 0.5) - t, 1.0)
    r_neck = max((dim.neck_diameter_mm * 0.5) - t, 1.0)
    r_head = max((dim.head_top_diameter_mm * 0.5) - t, 1.0)

    body_segments = [
        (r_bottom, r_max, body_h * 0.30),
        (r_max, r_max * 0.98, body_h * 0.38),
        (r_max * 0.98, r_neck, body_h * 0.32),
    ]

    head_h = max(dim.head_height_mm - dim.head_neck_overlap_mm, 8.0)
    head_segments = [
        (r_neck, r_neck * 1.18, head_h * 0.45),
        (r_neck * 1.18, r_head, head_h * 0.55),
    ]

    total_mm3 = 0.0
    for r1, r2, h in body_segments + head_segments:
        total_mm3 += _frustum_volume_mm3(r1, r2, h)

    # Reduce by center filter intrusion estimate.
    insert_r = max((dim.insert_outer_diameter_mm * 0.5) - t, 1.0)
    insert_h = max(dim.insert_height_mm, 1.0)
    intrusion_mm3 = math.pi * insert_r * insert_r * insert_h

    capacity_ml = (total_mm3 - intrusion_mm3) / 1000.0
    return round(max(capacity_ml, 100.0), 1)


def _scale_dimensions(dim: Dimensions, linear_scale: float) -> Dimensions:
    scaled = dim.model_copy(deep=True)
    linear_fields = [
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
    ]

    for field in linear_fields:
        value = getattr(scaled, field)
        setattr(scaled, field, round(value * linear_scale, 2))

    scaled.overall_height_mm = round(
        scaled.body_height_mm + scaled.head_height_mm - scaled.head_neck_overlap_mm,
        2,
    )
    return scaled


def create_default_dimensions(cups: float = 4.0) -> Dimensions:
    base = Dimensions()
    target_ml = cups_to_ml(cups)
    base_estimated_ml = estimate_capacity_ml(base)
    scale = (target_ml / base_estimated_ml) ** (1.0 / 3.0)
    scaled = _scale_dimensions(base, scale)
    scaled.cups_target = round(cups, 2)
    scaled.capacity_target_ml = round(target_ml, 1)
    scaled.estimated_capacity_ml = estimate_capacity_ml(scaled)
    return scaled


def _find_density_g_cm3(material_name: str) -> float:
    text = material_name.lower()
    if "316" in text or "304" in text or "430" in text or "stainless" in text:
        return 7.9
    if "nylon" in text:
        return 1.35
    if "bakelite" in text or "phenolic" in text:
        return 1.30
    if "silicone" in text:
        return 1.15
    if "epdm" in text:
        return 0.95
    return 1.10


def _materials_by_key(materials: list[MaterialSuggestion]) -> dict[str, str]:
    out: dict[str, str] = {}
    for m in materials:
        out[m.part_key] = (m.selected or m.recommended).strip()
    return out


def _surface_area_frustum(r1: float, r2: float, h: float) -> float:
    slant = math.sqrt((r1 - r2) ** 2 + h * h)
    return math.pi * (r1 + r2) * slant


def generate_bom(dim: Dimensions, materials: list[MaterialSuggestion]) -> list[BOMItem]:
    mats = _materials_by_key(materials)
    t = dim.wall_thickness_mm

    r_bottom = dim.body_bottom_diameter_mm * 0.5
    r_max = dim.body_max_diameter_mm * 0.5
    r_neck = dim.neck_diameter_mm * 0.5
    r_head = dim.head_top_diameter_mm * 0.5

    body_area = (
        _surface_area_frustum(r_bottom, r_max, dim.body_height_mm * 0.30)
        + _surface_area_frustum(r_max, r_max * 0.98, dim.body_height_mm * 0.38)
        + _surface_area_frustum(r_max * 0.98, r_neck, dim.body_height_mm * 0.32)
    )

    head_h = max(dim.head_height_mm - dim.head_neck_overlap_mm, 8.0)
    head_area = (
        _surface_area_frustum(r_neck, r_neck * 1.18, head_h * 0.45)
        + _surface_area_frustum(r_neck * 1.18, r_head, head_h * 0.55)
    )

    insert_ring_area = (
        math.pi * (dim.insert_outer_diameter_mm**2 - dim.insert_inner_diameter_mm**2) / 4.0
    )
    insert_wall_area = (
        math.pi * dim.insert_outer_diameter_mm * dim.insert_height_mm
    )
    insert_area = insert_ring_area + insert_wall_area

    base_disc_area = math.pi * (dim.base_cap_diameter_mm**2) / 4.0

    handle_len = dim.handle_length_mm * 1.25
    handle_area = math.pi * dim.handle_thickness_mm * handle_len

    gasket_major_r = dim.neck_diameter_mm * 0.5
    gasket_minor_r = max(dim.gasket_cross_section_mm * 0.5, 0.5)
    gasket_vol_mm3 = 2.0 * math.pi * math.pi * gasket_major_r * (gasket_minor_r**2)

    def mass_from_shell(area_mm2: float, thickness_mm: float, material: str) -> float:
        density = _find_density_g_cm3(material)
        volume_mm3 = area_mm2 * thickness_mm
        return round((volume_mm3 / 1000.0) * density, 1)

    def mass_from_volume(volume_mm3: float, material: str) -> float:
        density = _find_density_g_cm3(material)
        return round((volume_mm3 / 1000.0) * density, 1)

    body_mat = mats.get("body_shell", "Stainless Steel 304 (0.9 mm)")
    head_mat = mats.get("curved_head", "Stainless Steel 304 (0.9 mm)")
    handle_mat = mats.get("handle", "Glass-filled Nylon 66")
    insert_mat = mats.get("insert_filter", "Stainless Steel 304 + 80 mesh screen")
    gasket_mat = mats.get("gasket", "Food-grade Silicone")
    base_mat = mats.get("base_cap", "Stainless Steel 304 (1.0 mm)")

    return [
        BOMItem(
            part_key="body_shell",
            part_name="Lower vessel body shell",
            material=body_mat,
            process="Deep draw + neck reduction + brushing",
            thickness_mm=round(t, 2),
            quantity=1,
            mass_estimate_g=mass_from_shell(body_area, t, body_mat),
            notes="TIG seam only if split blank is used.",
        ),
        BOMItem(
            part_key="curved_head",
            part_name="Curved upper head / funnel section",
            material=head_mat,
            process="Spin forming + lip trim",
            thickness_mm=round(t, 2),
            quantity=1,
            mass_estimate_g=mass_from_shell(head_area, t, head_mat),
            notes="Interference-fit at neck with gasket.",
        ),
        BOMItem(
            part_key="insert_filter",
            part_name="Center insert / filter collar",
            material=insert_mat,
            process="Stamp + draw + mesh spot weld",
            thickness_mm=round(max(t * 0.8, 0.6), 2),
            quantity=1,
            mass_estimate_g=mass_from_shell(insert_area, max(t * 0.8, 0.6), insert_mat),
            notes="Inner opening sized for pour stability.",
        ),
        BOMItem(
            part_key="handle",
            part_name="External handle",
            material=handle_mat,
            process="Injection mold + fastener insert",
            thickness_mm=round(dim.handle_thickness_mm, 2),
            quantity=1,
            mass_estimate_g=mass_from_shell(handle_area, dim.handle_thickness_mm * 0.35, handle_mat),
            notes="Thermal isolation target < 45C at grip.",
        ),
        BOMItem(
            part_key="gasket",
            part_name="Sealing ring / gasket",
            material=gasket_mat,
            process="Compression mold",
            thickness_mm=round(dim.gasket_cross_section_mm, 2),
            quantity=1,
            mass_estimate_g=mass_from_volume(gasket_vol_mm3, gasket_mat),
            notes="Food-contact compliant elastomer required.",
        ),
        BOMItem(
            part_key="base_cap",
            part_name="Bottom cap / base ring",
            material=base_mat,
            process="Stamp + trim",
            thickness_mm=round(max(t, 1.0), 2),
            quantity=1,
            mass_estimate_g=mass_from_shell(base_disc_area, max(t, 1.0), base_mat),
            notes="Protective and structural base reinforcement.",
        ),
    ]


def merge_materials(
    incoming: list[MaterialSuggestion] | None,
) -> list[MaterialSuggestion]:
    if not incoming:
        return deepcopy(DEFAULT_MATERIALS)

    defaults = {mat.part_key: mat for mat in DEFAULT_MATERIALS}
    merged: list[MaterialSuggestion] = []
    seen: set[str] = set()

    for item in incoming:
        seen.add(item.part_key)
        base = defaults.get(item.part_key)
        if base is None:
            merged.append(item)
            continue

        merged_item = base.model_copy(deep=True)
        merged_item.recommended = item.recommended or base.recommended
        merged_item.alternatives = item.alternatives or base.alternatives
        merged_item.selected = item.selected or item.recommended or base.selected
        merged_item.confidence = item.confidence
        merged_item.notes = item.notes or base.notes
        merged.append(merged_item)

    for key, value in defaults.items():
        if key not in seen:
            merged.append(value.model_copy(deep=True))

    return merged


def build_blueprint(
    cups: float = 4.0,
    material_suggestions: list[MaterialSuggestion] | None = None,
    analysis_notes: list[str] | None = None,
) -> Blueprint:
    dim = create_default_dimensions(cups=cups)
    materials = merge_materials(material_suggestions)
    bom = generate_bom(dim, materials)

    return Blueprint(
        dimensions=dim,
        materials=materials,
        bom=bom,
        analysis_notes=analysis_notes or [],
    )


def refresh_blueprint(blueprint: Blueprint) -> Blueprint:
    updated = blueprint.model_copy(deep=True)
    updated.dimensions.overall_height_mm = round(
        updated.dimensions.body_height_mm
        + updated.dimensions.head_height_mm
        - updated.dimensions.head_neck_overlap_mm,
        2,
    )
    updated.dimensions.estimated_capacity_ml = estimate_capacity_ml(updated.dimensions)
    updated.materials = merge_materials(updated.materials)
    updated.bom = generate_bom(updated.dimensions, updated.materials)
    return updated
