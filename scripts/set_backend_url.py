from __future__ import annotations

import sys
from pathlib import Path


PLACEHOLDER = "https://REPLACE_WITH_RENDER_BACKEND_URL"


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python scripts/set_backend_url.py https://your-backend.onrender.com")
        return 1

    backend_url = sys.argv[1].rstrip("/")
    if not backend_url.startswith("http://") and not backend_url.startswith("https://"):
        print("Error: backend URL must start with http:// or https://")
        return 1

    config_path = Path("netlify.toml")
    if not config_path.exists():
        print("Error: netlify.toml not found")
        return 1

    content = config_path.read_text(encoding="ascii")
    if PLACEHOLDER not in content:
        print("Placeholder not found; no change made.")
        return 0

    content = content.replace(PLACEHOLDER, backend_url)
    config_path.write_text(content, encoding="ascii")
    print(f"Updated {config_path} with backend URL: {backend_url}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
