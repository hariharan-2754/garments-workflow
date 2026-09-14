from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional

class Settings(BaseSettings):
    mongo_url: Optional[str] = Field(default=None, validation_alias="MONGO_URL")
    mongodb_uri: Optional[str] = Field(default=None, validation_alias="MONGODB_URI")
    mongo_db_name: str = Field(default="garmentflow", validation_alias="MONGO_DB_NAME")
    jwt_secret: str = Field(default="your-super-secret-jwt-key-change-this-in-production-minimum-32-chars", validation_alias="JWT_SECRET")
    jwt_algorithm: str = Field(default="HS256", validation_alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(default=1440, validation_alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    upload_dir: str = Field(default="uploads", validation_alias="UPLOAD_DIR")
    allowed_origins: str = Field(
        default="http://localhost:8080,http://localhost:5500,http://127.0.0.1:5500,http://127.0.0.1:8080,http://localhost:8000,http://127.0.0.1:8000,https://garments-workflow.vercel.app",
        validation_alias="ALLOWED_ORIGINS"
    )

    @property
    def get_mongo_url(self) -> str:
        return self.mongodb_uri or self.mongo_url or ""

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

