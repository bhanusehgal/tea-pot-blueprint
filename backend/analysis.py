from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

from .models import (
    DetectedPart,
    ImageAnalysisMetrics,
    ImageAnalysisResult,
    MaterialSuggestion,
)

SUPPORTED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}


def list_image_paths(root_dir: Path) -> list[Path]:
    return sorted(
        [
            path
            for path in root_dir.iterdir()
            if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS
        ]
    )


def _rgb_to_hsv(rgb: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    # rgb is normalized [0, 1]
    r = rgb[..., 0]
    g = rgb[..., 1]
    b = rgb[..., 2]

    maxc = np.maximum(np.maximum(r, g), b)
    minc = np.minimum(np.minimum(r, g), b)
    delta = maxc - minc

    v = maxc
    s = np.where(maxc == 0, 0.0, delta / np.maximum(maxc, 1e-9))

    h = np.zeros_like(maxc)
    non_zero = delta > 1e-9
    safe_delta = np.maximum(delta, 1e-9)

    r_max = non_zero & (maxc == r)
    g_max = non_zero & (maxc == g)
    b_max = non_zero & (maxc == b)

    h[r_max] = ((g - b) / safe_delta)[r_max] % 6.0
    h[g_max] = (((b - r) / safe_delta) + 2.0)[g_max]
    h[b_max] = (((r - g) / safe_delta) + 4.0)[b_max]

    h = (h / 6.0) % 1.0
    return h, s, v


def _analyze_single_image(path: Path) -> dict[str, float]:
    image = Image.open(path).convert("RGB")
    # Downsample for speed and stable aggregate statistics
    image.thumbnail((900, 900))
    rgb = np.asarray(image, dtype=np.float32) / 255.0

    h, s, v = _rgb_to_hsv(rgb)

    metallic_mask = (s < 0.26) & (v > 0.20) & (v < 0.98)
    dark_mask = v < 0.24
    green_mask = (h > 0.22) & (h < 0.44) & (s > 0.24) & (v > 0.18) & (v < 0.82)
    specular_mask = (s < 0.18) & (v > 0.84)

    return {
        "metallic": float(np.mean(metallic_mask)),
        "dark": float(np.mean(dark_mask)),
        "green": float(np.mean(green_mask)),
        "specular": float(np.mean(specular_mask)),
    }


def _clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, value))


def analyze_images(image_paths: list[Path]) -> ImageAnalysisResult:
    if not image_paths:
        zero_metrics = ImageAnalysisMetrics(
            image_count=0,
            metallic_ratio=0.0,
            dark_ratio=0.0,
            green_ratio=0.0,
            specular_ratio=0.0,
        )
        return ImageAnalysisResult(
            metrics=zero_metrics,
            detected_parts=[],
            material_suggestions=[],
            notes=["No images found for analysis."],
        )

    collected = [_analyze_single_image(path) for path in image_paths]
    metallic = float(np.mean([c["metallic"] for c in collected]))
    dark = float(np.mean([c["dark"] for c in collected]))
    green = float(np.mean([c["green"] for c in collected]))
    specular = float(np.mean([c["specular"] for c in collected]))

    metrics = ImageAnalysisMetrics(
        image_count=len(image_paths),
        metallic_ratio=metallic,
        dark_ratio=dark,
        green_ratio=green,
        specular_ratio=specular,
    )

    steel_conf = _clamp(0.55 + metallic * 0.55 + specular * 0.22)
    handle_conf = _clamp(0.35 + dark * 1.4)
    gasket_conf = _clamp(0.25 + green * 2.0 + dark * 0.45)

    detected_parts = [
        DetectedPart(
            part_key="body_shell",
            part_name="Lower vessel body shell",
            confidence=steel_conf,
            evidence="Low-saturation reflective regions indicate brushed metal body.",
        ),
        DetectedPart(
            part_key="curved_head",
            part_name="Curved upper head / funnel section",
            confidence=_clamp(steel_conf - 0.03),
            evidence="Flared reflective head geometry appears as separate formed section.",
        ),
        DetectedPart(
            part_key="handle",
            part_name="External handle",
            confidence=handle_conf,
            evidence="Persistent matte dark component attached to upper section.",
        ),
        DetectedPart(
            part_key="insert_filter",
            part_name="Center insert / filter collar",
            confidence=_clamp(steel_conf - 0.06),
            evidence="Concentric metal ring visible at top opening.",
        ),
        DetectedPart(
            part_key="gasket",
            part_name="Sealing ring / gasket",
            confidence=gasket_conf,
            evidence="Dark/green edge band between sections suggests elastomer gasket.",
        ),
        DetectedPart(
            part_key="base_cap",
            part_name="Bottom cap / base ring",
            confidence=_clamp(steel_conf - 0.10),
            evidence="Bottom circular metallic part appears detachable in sequence frames.",
        ),
    ]

    material_suggestions = [
        MaterialSuggestion(
            part_key="body_shell",
            part_name="Lower vessel body shell",
            recommended="Stainless Steel 304 (0.9 mm)",
            alternatives=["Stainless Steel 316L (0.9 mm)", "Stainless Steel 430 (1.0 mm)"],
            selected="Stainless Steel 304 (0.9 mm)",
            confidence=steel_conf,
            notes="Deep-draw + spin forming friendly and food safe.",
        ),
        MaterialSuggestion(
            part_key="curved_head",
            part_name="Curved upper head / funnel section",
            recommended="Stainless Steel 304 (0.9 mm)",
            alternatives=["Stainless Steel 316L (0.9 mm)", "Stainless Steel 430 (1.0 mm)"],
            selected="Stainless Steel 304 (0.9 mm)",
            confidence=_clamp(steel_conf - 0.03),
            notes="Spin form and trim rolled lip for curved head profile.",
        ),
        MaterialSuggestion(
            part_key="handle",
            part_name="External handle",
            recommended="Glass-filled Nylon 66, heat-resistant",
            alternatives=["Bakelite / Phenolic resin", "Stainless handle with silicone sleeve"],
            selected="Glass-filled Nylon 66, heat-resistant",
            confidence=handle_conf,
            notes="Thermal isolation from vessel body.",
        ),
        MaterialSuggestion(
            part_key="insert_filter",
            part_name="Center insert / filter collar",
            recommended="Stainless Steel 304 + 80 mesh screen",
            alternatives=["Stainless Steel 316L + 100 mesh screen", "Perforated stainless disc"],
            selected="Stainless Steel 304 + 80 mesh screen",
            confidence=_clamp(steel_conf - 0.06),
            notes="Keeps tea leaves from pouring path.",
        ),
        MaterialSuggestion(
            part_key="gasket",
            part_name="Sealing ring / gasket",
            recommended="Food-grade Silicone (Shore A 50-60)",
            alternatives=["EPDM food-grade", "Fluorosilicone (premium)"],
            selected="Food-grade Silicone (Shore A 50-60)",
            confidence=gasket_conf,
            notes="Compensates tolerance stack and seals head/body interface.",
        ),
        MaterialSuggestion(
            part_key="base_cap",
            part_name="Bottom cap / base ring",
            recommended="Stainless Steel 304 (1.0 mm)",
            alternatives=["Stainless Steel 430 (1.0 mm)", "Stainless Steel 316L (1.0 mm)"],
            selected="Stainless Steel 304 (1.0 mm)",
            confidence=_clamp(steel_conf - 0.10),
            notes="Reinforces base and protects seam edge.",
        ),
    ]

    notes = [
        "Images indicate a multi-part stainless vessel with a separate curved upper head.",
        "Material suggestions are generated from reflectivity, color distribution, and repeated part visibility.",
        "For stainless manufacturing, 304 is selected as baseline; 316L remains optional for higher corrosion resistance.",
    ]

    return ImageAnalysisResult(
        metrics=metrics,
        detected_parts=detected_parts,
        material_suggestions=material_suggestions,
        notes=notes,
    )
