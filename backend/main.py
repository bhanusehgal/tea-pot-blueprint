from __future__ import annotations

from datetime import datetime
from pathlib import Path
from urllib.parse import quote

from fastapi import Body, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, Response
from fastapi.staticfiles import StaticFiles

from .analysis import SUPPORTED_EXTENSIONS, analyze_images, list_image_paths
from .blueprint import build_blueprint, refresh_blueprint
from .exporters import (
    export_dxf_bytes,
    export_json_bytes,
    export_obj_bytes,
    export_pptx_bytes,
)
from .models import Blueprint, ExportRequest
from .prototype import render_prototype_v1

ROOT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = ROOT_DIR / "frontend"
EXPORT_DIR = ROOT_DIR / "exports"

EXPORT_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Curved Head Teapot Blueprint Tool", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if FRONTEND_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR)), name="assets")


@app.get("/", response_class=HTMLResponse)
def index() -> FileResponse:
    file_path = FRONTEND_DIR / "index.html"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Frontend not found")
    return FileResponse(file_path)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/images")
def api_images() -> dict[str, list[dict[str, str]]]:
    paths = list_image_paths(ROOT_DIR)
    files = [
        {
            "name": path.name,
            "url": f"/api/image/{quote(path.name)}",
            "size_bytes": str(path.stat().st_size),
        }
        for path in paths
    ]
    return {"files": files}


@app.get("/api/image/{filename}")
def api_image(filename: str) -> FileResponse:
    safe_name = Path(filename).name
    path = ROOT_DIR / safe_name
    if not path.exists() or path.suffix.lower() not in SUPPORTED_EXTENSIONS:
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(path)


@app.post("/api/analyze")
def api_analyze() -> dict:
    image_paths = list_image_paths(ROOT_DIR)
    analysis = analyze_images(image_paths)
    return analysis.model_dump()


@app.get("/api/blueprint/default")
def api_blueprint_default(
    cups: float = Query(default=4.0, ge=1.0, le=12.0),
) -> dict:
    image_paths = list_image_paths(ROOT_DIR)
    analysis = analyze_images(image_paths)
    blueprint = build_blueprint(
        cups=cups,
        material_suggestions=analysis.material_suggestions,
        analysis_notes=analysis.notes,
    )
    return {
        "blueprint": blueprint.model_dump(),
        "analysis": analysis.model_dump(),
    }


@app.post("/api/blueprint/recompute")
def api_blueprint_recompute(blueprint: Blueprint) -> dict:
    updated = refresh_blueprint(blueprint)
    return {"blueprint": updated.model_dump()}


@app.post("/api/prototype/v1")
def api_prototype_v1(payload: dict | None = Body(default=None)) -> Response:
    blueprint_payload = payload.get("blueprint") if payload else None

    if blueprint_payload is None:
        image_paths = list_image_paths(ROOT_DIR)
        analysis = analyze_images(image_paths)
        blueprint = build_blueprint(
            cups=4.0,
            material_suggestions=analysis.material_suggestions,
            analysis_notes=analysis.notes,
        )
    else:
        blueprint = refresh_blueprint(Blueprint.model_validate(blueprint_payload))
        image_paths = list_image_paths(ROOT_DIR)

    data, saved_path = render_prototype_v1(
        blueprint=blueprint,
        image_paths=image_paths,
        save_dir=EXPORT_DIR,
    )

    headers = {
        "Content-Disposition": f'inline; filename="{saved_path.name}"',
        "X-Prototype-Path": str(saved_path),
    }
    return Response(content=data, media_type="image/png", headers=headers)


@app.post("/api/export/{file_format}")
def api_export(file_format: str, payload: ExportRequest) -> Response:
    blueprint = refresh_blueprint(payload.blueprint)

    file_format = file_format.lower().strip()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    base_name = f"teapot_blueprint_{timestamp}"

    if file_format == "json":
        data = export_json_bytes(blueprint)
        suffix = "json"
        media = "application/json"
    elif file_format == "dxf":
        data = export_dxf_bytes(blueprint)
        suffix = "dxf"
        media = "application/dxf"
    elif file_format == "obj":
        data = export_obj_bytes(blueprint)
        suffix = "obj"
        media = "text/plain"
    elif file_format == "pptx":
        data = export_pptx_bytes(blueprint)
        suffix = "pptx"
        media = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    else:
        raise HTTPException(
            status_code=400,
            detail="Unsupported format. Use json, dxf, obj, or pptx.",
        )

    file_name = f"{base_name}.{suffix}"
    saved_path = EXPORT_DIR / file_name
    saved_path.write_bytes(data)

    headers = {
        "Content-Disposition": f'attachment; filename="{file_name}"',
        "X-Export-Path": str(saved_path),
    }

    return Response(content=data, media_type=media, headers=headers)
