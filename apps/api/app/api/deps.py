from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.crm import CrmService


def get_service(session: Annotated[Session, Depends(get_db)]) -> CrmService:
    return CrmService(session)
