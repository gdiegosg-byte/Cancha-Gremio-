import bcrypt
from app.database import SessionLocal
from app.models.user import User

# Crear sesión
db = SessionLocal()

try:
    # Crear usuario admin
    admin = db.query(User).filter(User.email.ilike("admin@example.com")).first()
    
    if admin:
        print(f"⚠ Usuario admin ya existe")
    else:
        hashed = bcrypt.hashpw("admin123".encode(), bcrypt.gensalt()).decode()
        new_admin = User(
            name="Admin User",
            email="admin@example.com",
            phone="3001112222",
            password=hashed,
            role="ADMIN",
            is_active=True
        )
        db.add(new_admin)
        db.commit()
        print(f"✓ Usuario admin creado")
    
    print("\n✅ Done!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    db.rollback()
finally:
    db.close()
