from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # SQLite по умолчанию — работает без Docker и PostgreSQL
    database_url: str = "sqlite+aiosqlite:///./foxstoria.db"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: str = (
        "http://localhost:3000,http://127.0.0.1:3000,"
        "http://localhost:8000,http://127.0.0.1:8000,"
        "http://localhost:8770,http://127.0.0.1:8770,"
        "http://localhost:8771,http://127.0.0.1:8771,"
        "null"
    )


settings = Settings()
