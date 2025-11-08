from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings"""

    PROJECT_NAME: str = "Translator Backend"
    VERSION: str = "0.1.0"
    DESCRIPTION: str = "A modular FastAPI translator backend"

    OPENAI_API_KEY: str
    
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_JWT_SECRET: str

    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
