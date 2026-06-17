from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.event import Event
from app.schemas.event import EventCreate, EventResponse
from datetime import datetime

router = APIRouter(prefix="/eventos", tags=["eventos"])

@router.get("/")
def get_events(db: Session = Depends(get_db)):
    events = db.query(Event).filter(Event.event_type != "MAINTENANCE").all()
    # Map to frontend structure
    result = []
    for ev in events:
        start_str = ev.start_time.strftime("%H:%M") if ev.start_time else "00:00"
        end_str = ev.end_time.strftime("%H:%M") if ev.end_time else "00:00"
        fecha_str = ev.start_time.strftime("%Y-%m-%d") if ev.start_time else ""
        
        # Determine human readable type for frontend
        t = "torneo"
        if ev.event_type == "TOURNAMENT":
            t = "torneo"
        elif ev.event_type == "LEAGUE":
            t = "liga"
        elif ev.event_type == "SPECIAL":
            t = "evento_especial"
            
        result.append({
            "id": str(ev.id),
            "titulo": ev.name,
            "descripcion": ev.description,
            "tipo": t,
            "fecha": fecha_str,
            "horaInicio": start_str,
            "horaFin": end_str,
            "cupos": 10,
            "cuposOcupados": 0,
            "precio": 0,
            "activo": True
        })
    return result

@router.post("/", status_code=201)
def create_event(data: EventCreate, db: Session = Depends(get_db)):
    db_event = Event(
        field_id=data.field_id,
        name=data.name,
        description=data.description,
        start_time=data.start_time,
        end_time=data.end_time,
        event_type=data.event_type
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event
