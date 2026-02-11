# Curved Head Teapot Blueprint Tool

This project builds an editable manufacturing-style teapot blueprint from the image set in the project root.

## What It Does

- Reads all local image files in the folder (`.png/.jpg/.jpeg/.webp/.bmp`).
- Runs backend image analysis to suggest:
  - Stainless steel body/head materials
  - Handle material
  - Gasket material
  - Part breakdown confidence
- Generates a 4-cup baseline teapot (`4 US cups = ~946 ml`) with editable dimensions.
- Shows:
  - 3D interactive model (rotate, zoom, pan)
  - 2D blueprint view
  - Editable materials
  - Manufacturing BOM
- Exports:
  - `JSON` (design data)
  - `DXF` (AutoCAD-ready 2D drawing)
  - `OBJ` (Blender-ready 3D mesh)
  - `PPTX` (presentation sharing)

## Run

1. Install Python dependencies:

```powershell
python -m pip install -r requirements.txt
```

2. Start the app:

```powershell
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

3. Open:

- `http://127.0.0.1:8000`

## Notes

- All exports are also saved to the local `exports/` folder.
- Source images are expected in the project root folder.
- For stainless-steel manufacturing, default baseline is `304` with alternatives (including `316L`).
- 4-cup baseline was tuned to `~946 ml` and cross-checked against common market references:
  - Forlife Stump Teapot 32 oz (946 ml): https://www.forlifedesignusa.com/products/stump-teapot-32-oz
  - Le Creuset Classic Teapot 1.3L (about 4 cups): https://www.lecreuset.co.za/stoneware-classic-teapot-rhone-1.3l/70702139490000.html

## Deployment Files Included

- `render.yaml`: backend deploy spec (Render web service)
- `runtime.txt`: Python runtime pin (`3.12.7`)
- `netlify.toml`: static frontend deploy + proxy `/api/*` to backend
- `scripts/set_backend_url.py`: replace backend URL placeholder in `netlify.toml`

## Deployment Flow (Render + Netlify)

1. Deploy backend on Render using this repo and `render.yaml`.
2. Copy backend URL (for example `https://teapot-backend.onrender.com`).
3. Update Netlify proxy target:

```powershell
python scripts/set_backend_url.py https://teapot-backend.onrender.com
```

4. Commit and push.
5. Deploy frontend on Netlify with publish directory `.` and no build command.
