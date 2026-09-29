# Import the OS module so the app can work with file paths and directories.
import os
# Import SQLite support for local database access when SQLite is configured.
import sqlite3
# Import SQLAlchemy's engine creation helper for database connection setup.
from sqlalchemy import create_engine
# Import session management and the base model class used by ORM models.
from sqlalchemy.orm import sessionmaker, declarative_base
# Import the application settings object that contains the configured database URL.
from .config import settings

# Set SQLite-specific connection options for thread-safe multi-threaded use.
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

# Create the SQLAlchemy database engine using the configured database URL.
engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False
)

# Create a session factory bound to the database engine for database access.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
# Create the SQLAlchemy declarative base class for ORM model definitions.
Base = declarative_base()

# Define a dependency that yields a database session and closes it after use.
def get_db():
    # Create a new database session from the session factory.
    db = SessionLocal()
    try:
        # Yield the session so the caller can use it during a request.
        yield db
    finally:
        # Ensure the session is closed when the request lifecycle ends.
        db.close()

# Initialize database tables and load seed data when the database is empty.
def init_db():
    # Document the purpose of this function for maintainability.
    """Ensures database tables are initialized and seeds are applied if empty."""
    # Remove the SQLite prefix from the database URL so the file path can be used directly.
    db_file_path = settings.DATABASE_URL.replace("sqlite:///", "")
    # Ensure the directory containing the SQLite database exists before connecting.
    os.makedirs(os.path.dirname(os.path.abspath(db_file_path)), exist_ok=True)

    # Build the absolute path to the SQL schema file in the shared database folder.
    schema_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "database", "schema.sql"))
    # Build the absolute path to the SQL seed file used to populate lookup/default data.
    seed_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "database", "seed.sql"))

    # Only run SQLite initialization logic when the app is configured to use SQLite.
    if settings.DATABASE_URL.startswith("sqlite"):
        # Connect to the SQLite database file.
        conn = sqlite3.connect(db_file_path)
        # Create a cursor object to execute SQL statements.
        cursor = conn.cursor()

        # Check whether the users table exists before creating or seeding data.
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users';")
        # Store the result of the table existence check.
        has_table = cursor.fetchone()

        # Apply the schema if the file exists and the database has not been initialized yet.
        if os.path.exists(schema_path):
            # Open the schema file for reading.
            with open(schema_path, "r", encoding="utf-8") as f:
                # Read the contents of the schema file into memory.
                schema_sql = f.read()
                # Convert PostgreSQL-specific column syntax so the schema works in SQLite.
                clean_schema = schema_sql.replace("SERIAL PRIMARY KEY", "INTEGER PRIMARY KEY AUTOINCREMENT")
                # Replace PostgreSQL numeric types with SQLite-compatible numeric types.
                clean_schema = clean_schema.replace("NUMERIC(15, 2)", "REAL").replace("NUMERIC(5, 2)", "REAL")
                # Execute the cleaned schema statements on the SQLite database.
                cursor.executescript(clean_schema)

        # Count the number of user records already present in the database.
        cursor.execute("SELECT COUNT(*) FROM users;")
        # Fetch the user count from the result set.
        user_count = cursor.fetchone()[0]

        # Load seed data only when the users table is empty and a seed file exists.
        if user_count == 0 and os.path.exists(seed_path):
            # Open the seed file to read the SQL statements.
            with open(seed_path, "r", encoding="utf-8") as f:
                # Read the seed SQL into memory.
                seed_sql = f.read()
                # Remove PostgreSQL conflict clause syntax so SQLite can execute the seed statements.
                clean_seed = seed_sql.replace("ON CONFLICT (id) DO NOTHING", "")
                # Remove PostgreSQL conflict clause syntax for work_id conflicts.
                clean_seed = clean_seed.replace("ON CONFLICT (work_id) DO NOTHING", "")
                try:
                    # Execute the SQL seed file against the database.
                    cursor.executescript(clean_seed)
                except Exception as e:
                    # Print a warning if the seed script fails so initialization continues safely.
                    print(f"Warning during seed execution: {e}")

        # Save all changes made during initialization to the database.
        conn.commit()
        # Close the database connection after initialization is complete.
        conn.close()
