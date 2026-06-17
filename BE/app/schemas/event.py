from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class EventBase(BaseModel):
    field_id: int
    name: str
    description: Optional[str] = ""
    start_time: datetime
    end_time: datetime
    event_type: Optional[str] = "MAINTENANCE"

class EventCreate(EventBase):
    pass

class EventResponse(EventBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
