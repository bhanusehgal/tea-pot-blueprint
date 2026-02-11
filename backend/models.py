from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class Dimensions(BaseModel):
    cups_target: float = Field(default=4.0, ge=1.0, le=12.0)
    capacity_target_ml: float = Field(default=946.0, ge=100.0)
    estimated_capacity_ml: float = Field(default=980.0, ge=100.0)

    wall_thickness_mm: float = Field(default=0.9, ge=0.4, le=3.0)
    manufacturing_tolerance_mm: float = Field(default=0.25, ge=0.05, le=1.0)

    body_height_mm: float = Field(default=125.0, ge=50.0)
    body_max_diameter_mm: float = Field(default=116.0, ge=60.0)
    body_bottom_diameter_mm: float = Field(default=90.0, ge=40.0)
    neck_diameter_mm: float = Field(default=84.0, ge=40.0)

    head_height_mm: float = Field(default=58.0, ge=20.0)
    head_top_diameter_mm: float = Field(default=150.0, ge=60.0)
    head_neck_overlap_mm: float = Field(default=10.0, ge=0.0)

    handle_length_mm: float = Field(default=92.0, ge=40.0)
    handle_drop_mm: float = Field(default=66.0, ge=20.0)
    handle_offset_mm: float = Field(default=20.0, ge=5.0)
    handle_thickness_mm: float = Field(default=14.0, ge=6.0)

    insert_outer_diameter_mm: float = Field(default=56.0, ge=20.0)
    insert_inner_diameter_mm: float = Field(default=36.0, ge=10.0)
    insert_height_mm: float = Field(default=26.0, ge=8.0)

    gasket_cross_section_mm: float = Field(default=3.0, ge=1.0)
    base_cap_height_mm: float = Field(default=6.0, ge=2.0)
    base_cap_diameter_mm: float = Field(default=88.0, ge=30.0)

    overall_height_mm: float = Field(default=173.0, ge=50.0)


class MaterialSuggestion(BaseModel):
    part_key: str
    part_name: str
    recommended: str
    alternatives: list[str] = Field(default_factory=list)
    selected: str | None = None
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    notes: str = ""


class BOMItem(BaseModel):
    part_key: str
    part_name: str
    material: str
    process: str
    thickness_mm: float = Field(default=0.0, ge=0.0)
    quantity: int = Field(default=1, ge=1)
    mass_estimate_g: float = Field(default=0.0, ge=0.0)
    notes: str = ""


class Blueprint(BaseModel):
    title: str = "Curved-Head Teapot Blueprint"
    design_version: str = "v1"
    units: str = "mm"
    dimensions: Dimensions
    materials: list[MaterialSuggestion] = Field(default_factory=list)
    bom: list[BOMItem] = Field(default_factory=list)
    analysis_notes: list[str] = Field(default_factory=list)


class ImageAnalysisMetrics(BaseModel):
    image_count: int
    metallic_ratio: float
    dark_ratio: float
    green_ratio: float
    specular_ratio: float


class DetectedPart(BaseModel):
    part_key: str
    part_name: str
    confidence: float = Field(ge=0.0, le=1.0)
    evidence: str


class ImageAnalysisResult(BaseModel):
    metrics: ImageAnalysisMetrics
    detected_parts: list[DetectedPart]
    material_suggestions: list[MaterialSuggestion]
    notes: list[str] = Field(default_factory=list)


class ExportRequest(BaseModel):
    blueprint: Blueprint
    options: dict[str, Any] = Field(default_factory=dict)
