from fastapi import FastAPI

app = FastAPI(
    title="CrossFlow CRM API",
    version="0.1.0",
    description="Local-only CRM API compatible with the legacy Next.js handlers.",
)


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok"}
