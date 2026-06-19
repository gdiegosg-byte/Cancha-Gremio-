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

@router.put("/{event_id}")
def update_event(event_id: int, payload: dict, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
        
    name = payload.get("titulo") or payload.get("name")
    description = payload.get("descripcion") or payload.get("description")
    event_type = payload.get("tipo") or payload.get("event_type")
    
    if event_type:
        if event_type == "torneo":
            event.event_type = "TOURNAMENT"
        elif event_type == "liga":
            event.event_type = "LEAGUE"
        elif event_type == "evento_especial":
            event.event_type = "SPECIAL"
        else:
            event.event_type = event_type
            
    if name:
        event.name = name
    if description is not None:
        event.description = description
        
    start_time = payload.get("start_time")
    end_time = payload.get("end_time")
    if start_time:
        event.start_time = datetime.fromisoformat(start_time.replace("Z", ""))
    if end_time:
        event.end_time = datetime.fromisoformat(end_time.replace("Z", ""))
        
    db.commit()
    db.refresh(event)
    return event

@router.delete("/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
        
    db.delete(event)
    db.commit()
    return {"message": "Evento eliminado correctamente"}
