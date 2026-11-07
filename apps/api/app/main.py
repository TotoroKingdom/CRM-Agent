from fastapi import FastAPI

from app.api.errors import install_exception_handlers
from app.api.router import api_router

app = FastAPI(
    title="CrossFlow CRM API",
    version="0.1.0",
    description="Local-only CRM API compatible with the legacy Next.js handlers.",
)

install_exception_handlers(app)
app.include_router(api_router)
