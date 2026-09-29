"""
MPLADS AI Engine: Data Ingestion & Loading Utilities
"""
import json
import sqlite3
from typing import Dict, List, Any, Optional
import os

def resolve_db_path(custom_path: Optional[str] = None) -> str:
    if custom_path and os.path.exists(custom_path):
        return custom_path
    
    # Try candidate locations
    candidates = [
        custom_path,
        "database/mplads.db",
        "../database/mplads.db",
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "database", "mplads.db")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "database", "mplads.db"))
    ]
    for c in candidates:
        if c and os.path.exists(c):
            return c
    return "database/mplads.db"

def load_data_from_db(db_path: Optional[str] = None, limit: Optional[int] = None, offset: int = 0) -> List[Dict[str, Any]]:
    """Loads works and related financial metrics from SQLite with optional paging."""
    actual_path = resolve_db_path(db_path)
    if not os.path.exists(actual_path):
        return []
    
    conn = sqlite3.connect(actual_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    query = """
    SELECT 
        w.id, w.title, w.description, w.category, 
        w.estimated_cost, w.sanctioned_amount, w.released_amount, 
        w.expenditure, w.physical_progress, w.payment_utilization,
        w.start_date, w.expected_completion, w.actual_completion, w.status,
        w.implementing_agency, w.constituency_id, w.district_id, w.state_id
    FROM works w
    """
    params = []
    if limit is not None and limit > 0:
        query += " LIMIT ? OFFSET ?"
        params.extend([int(limit), int(offset)])

    rows = cursor.execute(query, params).fetchall()
    conn.close()
    return [dict(row) for row in rows]


def load_sample_dataset() -> List[Dict[str, Any]]:
    sample_file = os.path.join(os.path.dirname(__file__), "..", "data", "sample", "works.json")
    if os.path.exists(sample_file):
        with open(sample_file, "r", encoding="utf-8") as f:
            return json.load(f)
    return []
