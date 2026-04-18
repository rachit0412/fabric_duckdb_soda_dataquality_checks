import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    """Application configuration from environment variables."""
    
    # App
    APP_NAME: str = "Data Quality Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://postgres:test123@localhost:5432/data_quality"
    )
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10
    
    # API
    API_HOST: str = "0.0.0.0"
    API_PORT: int = int(os.getenv("API_PORT", "8000"))
    CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:3002", 
        "http://localhost:3010",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:3010",
        "http://127.0.0.1:8080",
    ]
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key-change-in-prod")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Jobs
    JOB_TIMEOUT_SECONDS: int = 300
    JOB_MAX_RETRIES: int = 3
    WORKER_ENABLED: bool = os.getenv("WORKER_ENABLED", "true").lower() == "true"
    WORKER_POLL_INTERVAL_SECONDS: int = 5
    
    # Profiling
    PROFILE_SAMPLE_SIZE: int = 10000  # Sample for large datasets
    PROFILE_TIMEOUT_SECONDS: int = 30
    
    # Data Sources (secrets)
    POSTGRES_HOST: Optional[str] = os.getenv("POSTGRES_HOST")
    POSTGRES_PORT: int = int(os.getenv("POSTGRES_PORT", "5432"))
    POSTGRES_USER: Optional[str] = os.getenv("POSTGRES_USER")
    POSTGRES_PASSWORD: Optional[str] = os.getenv("POSTGRES_PASSWORD")
    
    BIGQUERY_PROJECT_ID: Optional[str] = os.getenv("BIGQUERY_PROJECT_ID")
    BIGQUERY_CREDENTIALS_PATH: Optional[str] = os.getenv("BIGQUERY_CREDENTIALS_PATH")
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    class Config:
        env_file = ".env"

settings = Settings()
