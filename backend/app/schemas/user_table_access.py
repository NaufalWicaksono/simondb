from typing import List
from pydantic import BaseModel


class GrantAccessRequest(BaseModel):
    schema_name: str = "main"
    table_name: str


class BatchAccessRequest(BaseModel):
    tables: List[str]


class UserAccessResponse(BaseModel):
    user_id: int
    tables: List[str]
