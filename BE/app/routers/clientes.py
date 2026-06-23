from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User

router = APIRouter(prefix="/api/admin/clientes", tags=["clientes"])

@router.get("/")
def get_clients(db: Session = Depends(get_db)):
    users = db.query(User).filter(User.role == "CLIENT").all()
    result = []
    for u in users:
        result.append({
            "id_usuario": u.id,
            "nombre": u.name,
            "correo": u.email,
            "telefono": u.phone,
            "estado": "activo" if u.is_active else "inactivo",
            "fecha_registro": u.created_at.strftime("%Y-%m-%d") if u.created_at else "",
            "total_reservas": 0  # Se puede calcular si es necesario
        })
    return result

@router.put("/{user_id}/estado")
def toggle_client_status(user_id: int, payload: dict = Body(...), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    estado = payload.get("estado")
    if estado == "activo":
        user.is_active = True
    elif estado == "inactivo":
        user.is_active = False
    else:
        raise HTTPException(status_code=400, detail="Estado inválido")
        
    db.commit()
    return {"message": "Estado actualizado correctamente", "estado": "activo" if user.is_active else "inactivo"}

@router.put("/{user_id}")
def update_client(user_id: int, payload: dict = Body(...), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    nombre = payload.get("nombre")
    correo = payload.get("correo")
    telefono = payload.get("telefono")
    
    if nombre:
        user.name = nombre
    if correo:
        existing = db.query(User).filter(User.email.ilike(correo), User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="El correo ya está en uso por otro usuario")
        user.email = correo
    if telefono is not None:
        user.phone = telefono
        
    db.commit()
    db.refresh(user)
    return {
        "id_usuario": user.id,
        "nombre": user.name,
        "correo": user.email,
        "telefono": user.phone,
        "estado": "activo" if user.is_active else "inactivo",
        "fecha_registro": user.created_at.strftime("%Y-%m-%d") if user.created_at else "",
        "total_reservas": 0
    }
