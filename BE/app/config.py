# ¿Qué? Configuración centralizada usando Pydantic Settings
# ¿Para qué? Leer variables de entorno de forma tipada y validada
# ¿Impacto? Sin esto no hay forma segura de manejar credenciales

from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    debug: bool = False

    class Config:
        env_file = ".env"

settings = Settings()
