# Import the OS module to access environment variables and file paths.
import os
# Import List from typing to type-hint lists of allowed origins.
from typing import List

# Try to use the newer Pydantic settings base class for environment management.
try:
    # Import BaseSettings from pydantic-settings when available.
    from pydantic_settings import BaseSettings
except ImportError:
    # Fall back to the older Pydantic v1 BaseSettings if the new package is missing.
    try:
        # Import BaseSettings from pydantic.v1 for compatibility.
        from pydantic.v1 import BaseSettings
    except ImportError:
        # Create a minimal fallback BaseSettings class if neither package is installed.
        class BaseSettings:
            # Initialize the object with keyword arguments and assign them as attributes.
            def __init__(self, **kwargs):
                # Loop through every provided setting name and value.
                for k, v in kwargs.items():
                    # Store each setting on the instance.
                    setattr(self, k, v)

# Define the application settings object used throughout the backend.
class Settings(BaseSettings):
    # Set the display name of the API service.
    PROJECT_NAME: str = "MPLADS AI Monitoring API"
    # Set the API version prefix used for routes.
    API_V1_STR: str = "/api/v1"
    # Retrieve the JWT secret key from the environment or use the default development key.
    SECRET_KEY: str = os.getenv("SECRET_KEY", "mplads-super-secure-secret-key-change-in-production-2026")
    # Set the JWT signing algorithm.
    ALGORITHM: str = "HS256"
    # Set the number of minutes before an access token expires.
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours

    # Resolve to database/mplads.db at the repository root when no DATABASE_URL is provided.
    DATABASE_URL: str = os.getenv(
        # Read the database URL from the environment variable if it exists.
        "DATABASE_URL",
        # Build a SQLite database path relative to this config file's location.
        f"sqlite:///{os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'database', 'mplads.db'))}"
    )

    # Allow the frontend URLs that are permitted to access the API via CORS.
    CORS_ORIGINS: List[str] = [
        # Frontend dev server on localhost.
        "http://localhost:5173",
        # Frontend dev server on 127.0.0.1.
        "http://127.0.0.1:5173",
        # Development frontend on port 3000.
        "http://localhost:3000",
        # Alternative local IP address for the frontend.
        "http://127.0.0.1:3000"
    ]

# Create a singleton settings instance for the rest of the project to use.
settings = Settings()
