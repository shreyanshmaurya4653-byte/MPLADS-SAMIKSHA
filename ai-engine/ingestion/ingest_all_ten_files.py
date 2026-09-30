#!/usr/bin/env python3
"""
Orchestrator to ingest all 10 official MPLADS CSV files into SQLite and Supabase
Ensures zero hardcoded sub-districts, cleans old test data, and runs AI risk models across all files.
Consolidates lifecycle records by official Work ID (WS/...) and keeps MP entitlement limits in constituencies.
"""
import sys
import os
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

curr_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(curr_dir))

from clean_ingest_ten_files import run_ingestion

if __name__ == "__main__":
    run_ingestion()
