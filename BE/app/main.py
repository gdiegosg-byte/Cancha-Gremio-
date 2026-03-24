# ¿Qué? Punto de entrada principal de la aplicación FastAPI
# ¿Para qué? Inicializa el servidor y registra todos los routers
# ¿Impacto? Sin este archivo el servidor no puede arrancar
from app.routers import auth
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Cancha Gremio API",
    description="Sistema de reservas para cancha sintética",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])

@app.get("/")
def read_root():
    return {"message": "Cancha Gremio API funcionando correctamente"}

@app.get("/api/v1/health")
def health_check():
    return {"status": "ok"}
