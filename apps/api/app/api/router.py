from fastapi import APIRouter

from app.api.routes import dashboard, deals, leads, system, tasks

api_router = APIRouter()
api_router.include_router(system.router)
api_router.include_router(dashboard.router)
api_router.include_router(leads.router)
api_router.include_router(deals.router)
api_router.include_router(tasks.router)
