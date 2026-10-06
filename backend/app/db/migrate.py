"""Minimal additive auto-migration for the SQLite dev database.

SQLAlchemy's Base.metadata.create_all() only creates tables that don't exist yet -
it never ALTERs an existing table to add a new column. For a real deployment you'd
use Alembic; for this dev-focused SQLite setup we just add any missing columns
listed below at startup, so an existing privedge.db from an earlier version keeps
working instead of crashing with "no such column".
"""
from sqlalchemy import text
from sqlalchemy.engine import Engine

# table -> [(column_name, column_ddl_type), ...]
NEW_COLUMNS: dict[str, list[tuple[str, str]]] = {
    "users": [("last_active_at", "DATETIME")],
    "messages": [("caption", "TEXT"), ("attachment_name", "VARCHAR(255)")],
}


def run(engine: Engine) -> None:
    with engine.connect() as conn:
        existing_tables = {r[0] for r in conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))}
        for table, columns in NEW_COLUMNS.items():
            if table not in existing_tables:
                continue  # create_all() will create the whole table fresh, including the new column
            have = {row[1] for row in conn.execute(text(f"PRAGMA table_info({table})"))}
            for name, ddl_type in columns:
                if name not in have:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl_type}"))
        conn.commit()
