from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.event import Event
from app.schemas.maintenance import MaintenanceCreate
from datetime import datetime

router = APIRouter(prefix="/mantenimiento", tags=["mantenimiento"])

@router.get("/")
def get_maintenances(db: Session = Depends(get_db)):
    maintenances = db.query(Event).filter(Event.event_type == "MAINTENANCE").all()
    result = []
    for m in maintenances:
        start_str = m.start_time.strftime("%H:%M") if m.start_time else "00:00"
        end_str = m.end_time.strftime("%H:%M") if m.end_time else "00:00"
        fecha_str = m.start_time.strftime("%Y-%m-%d") if m.start_time else ""
        
        result.append({
            "id": str(m.id),
            "cancha": m.field_id,
            "fecha": fecha_str,
            "horaInicio": start_str,
            "horaFin": end_str,
            "descripcion": m.name + (" - " + m.description if m.description else ""),
            "proveedor": "Externo"
        })
    return result

@router.post("/", status_code=201)
def create_maintenance(data: MaintenanceCreate, db: Session = Depends(get_db)):
    try:
        start_dt = datetime.strptime(f"{data.fecha} {data.horaInicio}", "%Y-%m-%d %H:%M")
        end_dt = datetime.strptime(f"{data.fecha} {data.horaFin}", "%Y-%m-%d %H:%M")
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Formato de fecha u hora inválido")

    # Guardar en la tabla events
    db_maint = Event(
        field_id=data.cancha,
        name="Mantenimiento",
        description=data.descripcion + (f" (Proveedor: {data.proveedor})" if data.proveedor else ""),
        start_time=start_dt,
        end_time=end_dt,
        event_type="MAINTENANCE"
    )
    db.add(db_maint)
    db.commit()
    db.refresh(db_maint)
    
    return {
        "id": str(db_maint.id),
        "cancha": db_maint.field_id,
        "fecha": data.fecha,
        "horaInicio": data.horaInicio,
        "horaFin": data.horaFin,
        "descripcion": db_maint.description,
        "proveedor": data.proveedor
    }

@router.delete("/{maintenance_id}", status_code=204)
def delete_maintenance(maintenance_id: int, db: Session = Depends(get_db)):
    maint = db.query(Event).filter(Event.id == maintenance_id, Event.event_type == "MAINTENANCE").first()
    if not maint:
        raise HTTPException(status_code=404, detail="Mantenimiento no encontrado")
    db.delete(maint)
    db.commit()
    return None
