import argparse
import json
from pathlib import Path

from app.main import app

DEFAULT_PATH = Path(__file__).resolve().parents[2] / "openapi.json"


def main() -> None:
    parser = argparse.ArgumentParser(description="Export the FastAPI OpenAPI contract")
    parser.add_argument("output", nargs="?", type=Path, default=DEFAULT_PATH)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(app.openapi(), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(args.output)


if __name__ == "__main__":
    main()
