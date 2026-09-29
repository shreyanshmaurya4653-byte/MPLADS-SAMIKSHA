# Database Migrations

This directory manages database schema migrations using Alembic for SQLAlchemy.

## Quickstart

To generate a new migration:
```bash
cd backend
alembic revision --autogenerate -m "Add new audit column"
```

To apply migrations:
```bash
alembic upgrade head
```

To rollback a migration:
```bash
alembic downgrade -1
```
