from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    mongo_url: str = "mongodb://localhost:27017"
    mongo_db_name: str = "garmentflow"
    jwt_secret: str = "your-super-secret-jwt-key-change-this-in-production-minimum-32-chars"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    upload_dir: str = "uploads"
    allowed_origins: str = "http://localhost:8080,http://localhost:5500,http://127.0.0.1:5500,http://127.0.0.1:8080,http://localhost:8000,http://127.0.0.1:8000"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
