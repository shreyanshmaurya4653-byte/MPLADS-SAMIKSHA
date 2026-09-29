"""
MPLADS AI Engine: Data Transformation
"""
from datetime import datetime
from typing import Dict, List, Any

def parse_date(date_str: Any) -> datetime:
    """Fast, safe parsing for dates in YYYY-MM-DD format with microsecond savings."""
    if not date_str:
        return None
    s = str(date_str).split("T")[0].split(" ")[0].strip()
    if len(s) == 10 and s[4] == '-' and s[7] == '-':
        try:
            return datetime(int(s[0:4]), int(s[5:7]), int(s[8:10]))
        except ValueError:
            pass
    try:
        return datetime.strptime(s, "%Y-%m-%d")
    except Exception:
        return None

def compute_duration_metrics(record: Dict[str, Any]) -> Dict[str, Any]:
    """Calculates planned days, elapsed days, and delay days with fast short-circuiting."""
    if "planned_duration_days" in record and "delay_months" in record:
        return record

    start = parse_date(record.get("start_date"))
    expected = parse_date(record.get("expected_completion"))
    actual = parse_date(record.get("actual_completion"))
    now = datetime.now()

    rec = dict(record)
    if start and expected:
        planned_duration = max(1, (expected - start).days)
        target_end = actual if actual else now
        elapsed_duration = max(0, (target_end - start).days)
        delay_days = max(0, (target_end - expected).days)
    else:
        planned_duration = 180
        elapsed_duration = 0
        delay_days = 0

    rec["planned_duration_days"] = planned_duration
    rec["elapsed_duration_days"] = elapsed_duration
    rec["delay_days"] = delay_days
    rec["delay_months"] = round(delay_days / 30.0, 1)
    return rec

