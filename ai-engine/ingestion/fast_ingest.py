#!/usr/bin/env python3
"""
MPLADS AI Monitoring - High-Performance NumPy & Pandas Data Ingestion & Relational Intelligence Engine
SIH26102 Compliance: Multi-Table Ingestion across Works, Projects, Expenditures, Contractors, Risk Assessments & Alerts.
Supports: CSV, TSV, XLSX, XLS, JSON, TXT.
"""
import sys
import os
import json
import time
import re
import argparse
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import datetime

# Load environment variables
env_path = Path(__file__).resolve().parent.parent.parent / "backend" / ".env"
if env_path.exists():
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip("'\""))

import numpy as np
import pandas as pd
import sqlite3

try:
    import psycopg2
    from psycopg2.extras import execute_values
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False


def clean_currency_series(series: pd.Series) -> pd.Series:
    """Vectorized currency cleaner handling INR, Lakhs, Crores, commas, and suffixes."""
    s = series.astype(str).str.strip().str.lower()

    # Multipliers
    is_crore = s.str.contains(r'cr|crore', regex=True)
    is_lakh = s.str.contains(r'lakh|lac', regex=True)
    is_k = s.str.contains(r'\bk\b|thousand', regex=True)
    is_m = s.str.contains(r'\bm\b|million', regex=True)

    # Clean non-numeric characters except dot
    clean_nums = s.str.replace(r'[^\d\.]', '', regex=True)
    nums = pd.to_numeric(clean_nums, errors='coerce').fillna(0.0)

    # Apply multipliers
    nums = np.where(is_crore, nums * 10000000.0, nums)
    nums = np.where(is_lakh, nums * 100000.0, nums)
    nums = np.where(is_k, nums * 1000.0, nums)
    nums = np.where(is_m, nums * 1000000.0, nums)

    return pd.Series(nums, index=series.index)


def load_file_to_dataframe(file_path: str) -> pd.DataFrame:
    """Reads any supported format into a pandas DataFrame; handles CSV, Excel, TSV, JSON."""
    ext = os.path.splitext(file_path)[1].lower()

    if ext in ['.xlsx', '.xls']:
        df = pd.read_excel(file_path, engine='openpyxl')
    elif ext in ['.tsv', '.txt']:
        try:
            df = pd.read_csv(file_path, sep='\t', low_memory=False)
            if len(df.columns) <= 1:
                df = pd.read_csv(file_path, sep=r'\t|\|', engine='python')
        except Exception:
            df = pd.read_csv(file_path, sep=None, engine='python')
    elif ext == '.json':
        df = pd.read_json(file_path)
    else:
        try:
            df = pd.read_csv(file_path, low_memory=False, encoding='utf-8-sig')
        except UnicodeDecodeError:
            try:
                df = pd.read_csv(file_path, low_memory=False, encoding='utf-8')
            except UnicodeDecodeError:
                try:
                    df = pd.read_csv(file_path, low_memory=False, encoding='cp1252')
                except UnicodeDecodeError:
                    df = pd.read_csv(file_path, low_memory=False, encoding='latin1')

    return df


def find_column(df: pd.DataFrame, patterns: List[str], default_val: Any = None) -> pd.Series:
    """Finds a column in the DataFrame matching any regex pattern (case-insensitive)."""
    for col in df.columns:
        col_str = str(col).strip().lower()
        for p in patterns:
            if re.search(p, col_str):
                return df[col]
    return pd.Series(default_val, index=df.index)


def load_geographic_masters(sqlite_path: Path):
    """Loads all 36 States, 787 Districts, and 788 Constituencies into fast in-memory hash maps."""
    state_lookup = {}
    dist_by_state = {}
    dist_global = {}
    const_by_state = {}
    const_global = {}
    mp_to_info = {}

    if not sqlite_path.exists():
        return state_lookup, dist_by_state, dist_global, const_by_state, const_global, mp_to_info

    try:
        conn = sqlite3.connect(sqlite_path)
        cur = conn.cursor()

        # 1. States
        cur.execute('SELECT state_id, state_name, state_code FROM states')
        for sid, sname, scode in cur.fetchall():
            s_clean = sname.lower().strip()
            state_lookup[s_clean] = sid
            clean_alnum = re.sub(r'[^a-z0-9]', '', s_clean)
            state_lookup[clean_alnum] = sid
            if scode:
                state_lookup[scode.lower().strip()] = sid

        # State alias normalization dictionary
        aliases = {
            'uttar pradesh': 26, 'up': 26, 'uttarpradesh': 26,
            'delhi': 32, 'nct of delhi': 32, 'national capital territory of delhi': 32,
            'jammu & kashmir': 33, 'jammu and kashmir': 33, 'j&k': 33,
            'odisha': 19, 'orissa': 19,
            'andaman & nicobar': 29, 'andaman and nicobar islands': 29, 'andaman & nicobar islands': 29,
            'dadra & nagar haveli': 31, 'dadra and nagar haveli': 31, 'daman and diu': 31,
            'dadra and nagar haveli and daman and diu': 31,
            'uttarakhand': 27, 'uttaranchal': 27, 'uk': 27,
            'telangana': 24, 'andhra pradesh': 1, 'ap': 1,
            'tamil nadu': 23, 'tn': 23, 'tamilnadu': 23,
            'maharashtra': 14, 'mh': 14,
            'west bengal': 28, 'wb': 28, 'westbengal': 28,
            'madhya pradesh': 13, 'mp': 13, 'madhyapradesh': 13,
            'karnataka': 11, 'ka': 11, 'kerala': 12, 'kl': 12,
            'gujarat': 7, 'gj': 7, 'rajasthan': 21, 'rj': 21,
            'bihar': 4, 'br': 4, 'punjab': 20, 'pb': 20,
            'haryana': 8, 'hr': 8, 'assam': 3, 'as': 3,
            'jharkhand': 10, 'chhattisgarh': 5, 'cg': 5,
            'himachal pradesh': 9, 'hp': 9, 'goa': 6,
            'manipur': 15, 'meghalaya': 16, 'mizoram': 17, 'nagaland': 18,
            'sikkim': 22, 'tripura': 25, 'ladakh': 34, 'chandigarh': 30,
            'puducherry': 36, 'pondicherry': 36, 'lakshadweep': 35
        }
        state_lookup.update(aliases)

        # 2. Districts
        cur.execute('SELECT district_id, state_id, district_name FROM districts')
        for did, sid, dname in cur.fetchall():
            d_clean = re.sub(r'[^a-z0-9]', '', dname.lower())
            dist_by_state.setdefault(sid, {})[d_clean] = did
            dist_global[d_clean] = (did, sid)

        # 3. Constituencies
        cur.execute('SELECT constituency_id, state_id, district_id, constituency_name, mp_name, house_type FROM constituencies')
        for cid, sid, did, cname, mpname, htype in cur.fetchall():
            c_clean = re.sub(r'[^a-z0-9]', '', cname.lower())
            const_by_state.setdefault(sid, {})[c_clean] = (cid, did, htype)
            const_global[c_clean] = (cid, sid, did, htype)
            if mpname:
                mp_clean = re.sub(r'[^a-z0-9]', '', mpname.lower())
                mp_to_info[mp_clean] = (cid, sid, did, htype, mpname)

        conn.close()
    except Exception as e:
        print(f"Master loading warning: {e}", file=sys.stderr)

    # 4. Load verified Rajya Sabha MPs from CSV 3
    rs_mp_set = set()
    rs_csv_path = Path("C:/Users/Lenovo/Downloads/Allocated Limit for Honble MPs (3).csv")
    if rs_csv_path.exists():
        try:
            rs_df = pd.read_csv(rs_csv_path, encoding='utf-8-sig')
            for raw_n in rs_df.get("Hon'ble Members of Parliament", []):
                clean_n = re.sub(r'\s*\(\d{4}[^\)]*\)', '', str(raw_n)).strip()
                core_n = re.sub(r'^(dr\.|shri|smt\.|adv\.|prof\.|ms\.)\s*', '', clean_n, flags=re.I).strip()
                norm_n = re.sub(r'[^a-z0-9]', '', core_n.lower())
                if norm_n:
                    rs_mp_set.add(norm_n)
        except Exception:
            pass

    return state_lookup, dist_by_state, dist_global, const_by_state, const_global, mp_to_info, rs_mp_set


def process_and_ingest(
    file_path: str,
    default_state_id: int = 1,
    default_district_id: int = 1,
    default_constituency_id: int = 1,
    user_role: str = "District",
    creator_email: str = "admin@mplads.gov.in",
    batch_size: int = 5000
) -> Dict[str, Any]:
    t0 = time.time()

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Uploaded file not found at: {file_path}")

    # 1. Load File using Pandas
    df_raw = load_file_to_dataframe(file_path)
    total_raw_rows = len(df_raw)

    if total_raw_rows == 0:
        return {
            "success": False,
            "error": "The uploaded file is empty.",
            "total_rows_read": 0,
            "valid_works_ingested": 0
        }

    # 2. Preload Master Geographic Tables from SQLite
    sqlite_path = Path(__file__).resolve().parent.parent.parent / "database" / "mplads.db"
    state_lookup, dist_by_state, dist_global, const_by_state, const_global, mp_to_info, rs_mp_set = load_geographic_masters(sqlite_path)

    # 3. Identify Columns with Vectorized Pattern Matching
    work_id_series = find_column(df_raw, [r'work\s*id', r'^id$', r'project\s*code', r'work\s*code'], None)
    title_series = find_column(df_raw, [r'work\s*description', r'^title$', r'work\s*title', r'project\s*name', r'work\s*name', r'^work$', r'name', r'description'], '')
    cat_series = find_column(df_raw, [r'category', r'sector', r'work\s*category', r'type'], 'Community Infrastructure')
    mp_series = find_column(df_raw, [r'mp\s*name', r'hon.*member', r'^mp$', r'member'], '')
    house_series = find_column(df_raw, [r'house', r'house_type', r'parliament_house'], '')
    state_series = find_column(df_raw, [r'state\s*name', r'state/ut', r'^state$', r'state_id'], None)
    const_series = find_column(df_raw, [r'constituency', r'constituency\s*name', r'^pc$', r'constituency_id'], None)
    ida_series = find_column(df_raw, [r'^ida$', r'district\s*name', r'^district$', r'agency', r'implementing\s*agency', r'dept'], 'Public Works Department (PWD)')
    vendor_series = find_column(df_raw, [r'vendor', r'contractor', r'supplier'], None)
    
    # Financial columns
    sanc_series = find_column(df_raw, [r'sanctioned\s*amount', r'sanction\s*amount', r'recommended\s*amount', r'allocated\s*amount', r'allocated\s*limit', r'amount\s*disbursed', r'approved\s*amount', r'final\s*amount', r'sanc_amount', r'^sanctioned$', r'^sanction$', r'^amount$', r'^cost$'], 0.0)
    exp_series = find_column(df_raw, [r'expenditure\s*amount', r'total\s*expenditure', r'disbursed\s*amount', r'^expenditure$', r'spent', r'utilized', r'disbursed'], 0.0)
    est_series = find_column(df_raw, [r'estimated\s*cost', r'estimate\s*cost', r'^estimated$', r'^estimate$', r'est_cost'], 0.0)
    progress_series = find_column(df_raw, [r'physical\s*progress', r'progress', r'completion_%', r'completion\s*rate', r'^%$'], 0.0)
    
    # Dates and status
    date_series = find_column(df_raw, [r'sanction\s*date', r'recommended\s*date', r'completion\s*date', r'start_date', r'expenditure\s*date', r'date'], '2024-06-01')
    status_series = find_column(df_raw, [r'work\s*status', r'payment\s*status', r'^status$', r'stage'], '')

    # 4. Handle MP Allocation Limit tables where no explicit project title column exists
    title_str = title_series.astype(str).str.strip().str.replace(r'^["\']+|["\']+$', '', regex=True)
    if (title_str == '').all() or (title_str.str.len() < 3).all():
        mp_str = mp_series.astype(str).str.strip().replace('nan', '')
        const_str = const_series.astype(str).str.strip().replace('nan', '') if const_series is not None else pd.Series('', index=df_raw.index)
        state_str = state_series.astype(str).str.strip().replace('nan', '') if state_series is not None else pd.Series('', index=df_raw.index)
        
        has_mp_or_const = (mp_str != '') | (const_str != '')
        if has_mp_or_const.any():
            title_str = pd.Series(
                "MPLADS Scheme Allocation: " + np.where(mp_str != '', mp_str + " ", "") + "(" + np.where(const_str != '', const_str, state_str) + ")",
                index=df_raw.index
            )
            cat_series = pd.Series('Constituency Allocation', index=df_raw.index)

    # Title must be at least 3 chars
    cond_length = title_str.str.len() >= 3
    # Must NOT be a subtotal / grand total / page marker
    cond_no_totals = ~title_str.str.contains(r'total|sub\s*total|grand\s*total|page\s+\d+|brought\s*forward|carry\s*forward', case=False, regex=True, na=False)
    # Must NOT be pure symbols or punctuation
    cond_not_symbols = ~title_str.str.match(r'^[\s\d\.\-\*#_:=]+$', na=False)
    # Must NOT be duplicate header row
    cond_not_headers = ~title_str.str.match(r'^(title|work\s*title|project\s*title|work\s*description|sl\s*no|item|description|amount)$', case=False, na=False)

    valid_mask = cond_length & cond_no_totals & cond_not_symbols & cond_not_headers
    valid_count = int(np.sum(valid_mask))
    waste_count = total_raw_rows - valid_count

    if valid_count == 0:
        return {
            "success": False,
            "error": "No valid work items found. All rows were filtered as headers, summaries, or blank entries.",
            "total_rows_read": total_raw_rows,
            "waste_rows_filtered": waste_count,
            "valid_works_ingested": 0
        }

    # Filter to valid dataframe
    df = pd.DataFrame(index=df_raw.index[valid_mask])
    df['title'] = title_str[valid_mask]
    
    # Extract / Clean Amounts
    sanc_cleaned = clean_currency_series(sanc_series[valid_mask])
    exp_cleaned = clean_currency_series(exp_series[valid_mask])
    est_cleaned = clean_currency_series(est_series[valid_mask])

    # If estimated cost is 0, estimate based on sanction or expenditure
    est_cleaned = np.where(est_cleaned <= 0, np.maximum(sanc_cleaned, exp_cleaned), est_cleaned)
    sanc_cleaned = np.where(sanc_cleaned <= 0, np.maximum(est_cleaned, exp_cleaned), sanc_cleaned)
    # Infer dataset profile from columns or file name
    has_completed_indicator = (
        'completed' in file_path.lower() or 
        any('completed' in str(c).lower() for c in df_raw.columns) or
        any('final' in str(c).lower() for c in df_raw.columns)
    )
    has_recommend_indicator = (
        'recommend' in file_path.lower() or 
        any('recommend' in str(c).lower() for c in df_raw.columns)
    )
    has_exp_indicator = (
        'expenditure' in file_path.lower() or 
        any('expenditure' in str(c).lower() for c in df_raw.columns)
    )

    if has_completed_indicator:
        default_status = 'Completed'
        exp_cleaned = np.where(exp_cleaned <= 0, sanc_cleaned, exp_cleaned)
    elif has_recommend_indicator:
        default_status = 'Sanctioned'
    elif has_exp_indicator:
        default_status = 'Ongoing'
    else:
        default_status = 'Sanctioned'

    df['sanctioned_amount'] = sanc_cleaned
    df['estimated_cost'] = est_cleaned
    df['expenditure'] = exp_cleaned
    df['released_amount'] = np.where(exp_cleaned > 0, np.maximum(exp_cleaned, sanc_cleaned * 0.8), sanc_cleaned * 0.5)

    # 5. Intelligent Multi-Tier State, District, Constituency & MP Name Mapping
    raw_states = state_series[valid_mask].astype(str).str.lower().str.strip() if state_series is not None else pd.Series('', index=df.index)
    raw_consts = const_series[valid_mask].astype(str).str.lower().str.strip() if const_series is not None else pd.Series('', index=df.index)
    raw_mps = mp_series[valid_mask].astype(str).str.strip()
    raw_houses = house_series[valid_mask].astype(str).str.lower().str.strip()
    raw_idas = ida_series[valid_mask].astype(str).str.strip()

    # Pre-allocate arrays for fast vector mapping
    n = len(df)
    state_ids = np.full(n, default_state_id, dtype=int)
    district_ids = np.full(n, default_district_id, dtype=int)
    const_ids = np.full(n, default_constituency_id, dtype=int)
    house_types = np.full(n, 'Lok Sabha', dtype=object)
    mp_names = np.full(n, '', dtype=object)
    district_names_parsed = np.full(n, '', dtype=object)

    # Fast iteration through arrays for accurate relational resolution
    raw_states_arr = raw_states.values
    raw_consts_arr = raw_consts.values
    raw_mps_arr = raw_mps.values
    raw_houses_arr = raw_houses.values
    raw_idas_arr = raw_idas.values

    for i in range(n):
        s_val = raw_states_arr[i]
        c_val = raw_consts_arr[i]
        m_val = raw_mps_arr[i]
        h_val = raw_houses_arr[i]
        ida_val = raw_idas_arr[i]

        sid = None
        did = None
        # Determine Parliamentary House (Lok Sabha vs Rajya Sabha)
        is_rs_mp = False
        if m_val and m_val != 'nan':
            core_m = re.sub(r'^(dr\.|shri|smt\.|adv\.|prof\.|ms\.)\s*', '', str(m_val), flags=re.I).strip()
            m_clean = re.sub(r'[^a-z0-9]', '', core_m.lower())
            if m_clean in rs_mp_set:
                is_rs_mp = True
            else:
                for k in rs_mp_set:
                    if len(k) > 6 and (k in m_clean or m_clean in k):
                        is_rs_mp = True
                        break

        htype = 'Rajya Sabha' if (is_rs_mp or 'rajya' in h_val or 'rajya' in c_val or 'limit for honble mps (3)' in file_path.lower()) else 'Lok Sabha'
        m_resolved = m_val if m_val and m_val.lower() != 'nan' else None

        # 1. Resolve State
        if s_val and s_val != 'nan' and s_val != 'none':
            s_clean = re.sub(r'[^a-z0-9]', '', s_val)
            if s_val in state_lookup:
                sid = state_lookup[s_val]
            elif s_clean in state_lookup:
                sid = state_lookup[s_clean]

        # 2. Extract District Name from IDA (e.g. "GHAZIABAD(DISTRICT MAGISTRATE...)" -> "ghaziabad")
        dist_extracted = ""
        if ida_val and ida_val != 'nan':
            m_ida = re.match(r'^([A-Za-z\s]+)[\(_]', ida_val)
            if m_ida:
                dist_extracted = m_ida.group(1).strip().lower()
            else:
                dist_extracted = ida_val.strip().lower()
        district_names_parsed[i] = dist_extracted.title() if dist_extracted else "Central District"

        # 3. Match Constituency & District
        c_clean = re.sub(r'[^a-z0-9]', '', c_val) if c_val and c_val != 'nan' else ""
        d_clean = re.sub(r'[^a-z0-9]', '', dist_extracted) if dist_extracted else ""

        # If MP Name is provided, check if we have them in the directory
        if m_val:
            m_clean = re.sub(r'[^a-z0-9]', '', m_val.lower())
            if m_clean in mp_to_info:
                cid, sid_from_mp, did_from_mp, htype_mp, full_mp = mp_to_info[m_clean]
                if sid is None:
                    sid = sid_from_mp
                if did is None:
                    did = did_from_mp
                htype = htype_mp
                m_resolved = full_mp

        # Match Constituency within State
        if sid and sid in const_by_state and c_clean in const_by_state[sid]:
            cid, did_from_c, htype_from_c = const_by_state[sid][c_clean]
            if did is None and did_from_c:
                did = did_from_c
            if htype_from_c:
                htype = htype_from_c
        elif c_clean in const_global:
            cid, sid_from_c, did_from_c, htype_from_c = const_global[c_clean]
            if sid is None:
                sid = sid_from_c
            if did is None and did_from_c:
                did = did_from_c
            if htype_from_c:
                htype = htype_from_c

        # Match District within State
        if sid and sid in dist_by_state and d_clean in dist_by_state[sid]:
            did = dist_by_state[sid][d_clean]
        elif d_clean in dist_global:
            did_g, sid_g = dist_global[d_clean]
            if did is None:
                did = did_g
            if sid is None:
                sid = sid_g

        # Fallbacks to ensure valid relational IDs
        state_ids[i] = sid if sid is not None else default_state_id
        district_ids[i] = did if did is not None else default_district_id
        const_ids[i] = cid if cid is not None else default_constituency_id
        house_types[i] = htype
        mp_names[i] = m_resolved

    df['state_id'] = state_ids
    df['district_id'] = district_ids
    df['constituency_id'] = const_ids
    df['house_type'] = house_types
    df['mp_name'] = mp_names
    df['implementing_agency'] = raw_idas.replace('', 'Public Works Department (PWD)')
    df['vendor'] = vendor_series[valid_mask].astype(str).str.strip().replace('', 'Government Implementing Agency')

    # Categories & Status
    df['category'] = cat_series[valid_mask].astype(str).str.strip().replace('', 'Community Infrastructure').replace('nan', 'Community Infrastructure')
    
    # Physical progress & status normalization
    raw_status_clean = status_series[valid_mask].astype(str).str.strip()
    raw_status_clean = np.where((raw_status_clean == '') | (raw_status_clean == 'nan'), default_status, raw_status_clean)
    df['status'] = np.where(
        pd.Series(raw_status_clean).str.contains('complete', case=False, na=False), 'Completed',
        np.where(
            pd.Series(raw_status_clean).str.contains('success', case=False, na=False), 'Completed',
            np.where(
                pd.Series(raw_status_clean).str.contains('progress', case=False, na=False), 'Ongoing',
                np.where(
                    pd.Series(raw_status_clean).str.contains('delay', case=False, na=False), 'Delayed',
                    'Sanctioned'
                )
            )
        )
    )

    prog_numeric = pd.to_numeric(progress_series[valid_mask].astype(str).str.replace(r'[^\d\.]', '', regex=True), errors='coerce').fillna(0.0)
    df['physical_progress'] = np.where(df['status'] == 'Completed', 100.0, prog_numeric.clip(0.0, 100.0))

    # Dates
    raw_dates = date_series[valid_mask].astype(str).str.strip()
    cleaned_dates = []
    for d_str in raw_dates:
        d_match = re.search(r'(\d{4}-\d{2}-\d{2})', d_str)
        if d_match:
            cleaned_dates.append(d_match.group(1))
        else:
            cleaned_dates.append('2024-06-01')
    df['start_date'] = cleaned_dates
    df['expected_completion'] = '2024-12-31'

    # 6. Advanced Vectorized Multi-Factor AI Risk Engine
    sanc_arr = df['sanctioned_amount'].values
    est_arr = df['estimated_cost'].values
    exp_arr = df['expenditure'].values
    prog_arr = df['physical_progress'].values
    status_arr = df['status'].values

    # Factor 1: Cost Overrun / Escalation Risk (0 - 100)
    cost_diff_pct = np.where(est_arr > 0, ((sanc_arr - est_arr) / est_arr) * 100.0, 0.0)
    exp_overrun_pct = np.where(sanc_arr > 0, ((exp_arr - sanc_arr) / sanc_arr) * 100.0, 0.0)
    cost_risk = np.clip(np.maximum(cost_diff_pct, exp_overrun_pct * 1.5), 0.0, 100.0)

    # Factor 2: Milestone Execution Delay Risk (0 - 100)
    delay_risk = np.where(
        status_arr == 'Delayed', 85.0,
        np.where(
            status_arr == 'Completed', 5.0,
            np.where(prog_arr < 20.0, 45.0, np.where(prog_arr < 60.0, 25.0, 10.0))
        )
    )

    # Factor 3: Payment vs Physical Progress Divergence Risk (0 - 100)
    payment_ratio = np.where(sanc_arr > 0, np.clip((exp_arr / sanc_arr) * 100.0, 0.0, 100.0), 0.0)
    progress_gap = np.clip(payment_ratio - prog_arr, 0.0, 100.0)
    payment_risk = np.where(progress_gap >= 25.0, 75.0, progress_gap * 1.5)

    # Factor 4: Vendor Concentration Risk
    # Fast vectorized frequency count of vendors
    vendor_counts = df['vendor'].value_counts()
    vendor_freq = df['vendor'].map(vendor_counts).fillna(1).values
    vendor_risk = np.where(vendor_freq > 20, 60.0, np.where(vendor_freq > 8, 35.0, 10.0))

    # Factor 5: Duplicate / Split-Work Risk (Threshold evasion under ₹50 Lakhs or ₹10 Lakhs)
    duplicate_risk = np.where((sanc_arr >= 490000) & (sanc_arr <= 500000), 40.0, 5.0)

    # Composite AI Risk Score (Vectorized Weighted Sum, 0 - 100)
    risk_scores = np.clip(
        0.35 * cost_risk + 0.30 * delay_risk + 0.20 * payment_risk + 0.10 * vendor_risk + 0.05 * duplicate_risk,
        5.0, 95.0
    )

    # Risk Tier Classification
    risk_levels = np.select(
        [risk_scores >= 65.0, risk_scores >= 40.0, risk_scores >= 20.0],
        ['Critical', 'High', 'Medium'],
        default='Low'
    )

    df['cost_overrun_risk'] = np.round(cost_risk, 2)
    df['delay_risk'] = np.round(delay_risk, 2)
    df['payment_risk'] = np.round(payment_risk, 2)
    df['agency_concentration_score'] = np.round(vendor_risk, 2)
    df['duplicate_risk_score'] = np.round(duplicate_risk, 2)
    df['risk_score'] = np.round(risk_scores, 2)
    df['risk_level'] = risk_levels

    # Actionable Administrative Recommendations
    recs = np.where(
        risk_scores >= 65.0,
        "Critical Milestone Audit: Disproportionate payment disbursement vs. physical milestone progress. Withhold tranche release pending on-ground physical inspection.",
        np.where(
            cost_risk > 30.0,
            "Fiscal Escalation Alert: Sanctioned expenditure exceeds standard state baseline. Audit itemized bill of quantities.",
            np.where(
                delay_risk > 40.0,
                "Execution Delay Alert: Physical milestone velocity lag observed. Mobilize district engineering inspection team.",
                "Normal Operating Range: Work progressing in compliance with approved scheme operational guidelines."
            )
        )
    )
    df['recommendations'] = recs

    # Generate sequential unique Work IDs (e.g. W10001 or provided Work ID)
    if work_id_series is not None and not work_id_series.isna().all():
        raw_ids = work_id_series[valid_mask].astype(str).str.strip()
        ids = [f"W{r}" if not r.startswith(('W', 'P')) else r for r in raw_ids]
    else:
        # Check if raw 'work' or 'title' contains standard official MPLADS work code (e.g. WS/ MP620/2024-2025/133166)
        raw_work_col = find_column(df_raw, [r'^work$'], None)
        source_series = raw_work_col[valid_mask] if raw_work_col is not None else df['title'].values
        extracted_codes = []
        has_ws_codes = False
        for s in source_series:
            m = re.search(r'(WS\s*\/[^\/]+\/[^\/]+\/\d+)', str(s))
            if m:
                extracted_codes.append(re.sub(r'\s+', '', m.group(1)))
                has_ws_codes = True
            else:
                extracted_codes.append(None)
        
        start_num = 1000
        if sqlite_path.exists():
            try:
                c_temp = sqlite3.connect(sqlite_path)
                m_val = c_temp.cursor().execute("SELECT max(CAST(SUBSTR(id, 2) AS INTEGER)) FROM works WHERE id LIKE 'W%'").fetchone()
                if m_val and m_val[0]:
                    start_num = int(m_val[0])
                c_temp.close()
            except Exception:
                pass

        if has_ws_codes:
            ids = [code if code is not None else f"W{start_num + i + 1}" for i, code in enumerate(extracted_codes)]
        else:
            ids = [f"W{start_num + i + 1}" for i in range(len(df))]
    df['id'] = ids
    df['description'] = df['category'].apply(lambda c: f"Development infrastructure work under {c}")

    # 7. Prepare Multi-Table Data Tuples for Vectorized Persistence

    # Table 1: works
    df['payment_utilization'] = payment_ratio
    works_cols = [
        'id', 'title', 'description', 'category', 'constituency_id', 'district_id', 'state_id',
        'implementing_agency', 'estimated_cost', 'sanctioned_amount', 'released_amount',
        'expenditure', 'physical_progress', 'payment_utilization', 'start_date', 'expected_completion',
        'status', 'house_type', 'mp_name'
    ]
    works_tuples = list(df[works_cols].itertuples(index=False, name=None))

    # Table 2: projects
    df['creator_uuid'] = None
    projects_cols = [
        'id', 'title', 'description', 'category', 'state_id', 'district_id',
        'constituency_id', 'implementing_agency', 'estimated_cost', 'sanctioned_amount',
        'released_amount', 'expenditure', 'start_date', 'expected_completion', 'status', 'creator_uuid'
    ]
    projects_tuples = list(df[projects_cols].itertuples(index=False, name=None))

    # Table 3: risk_assessments
    risks_cols = [
        'id', 'risk_score', 'risk_level', 'delay_risk', 'cost_overrun_risk',
        'payment_risk', 'agency_concentration_score', 'duplicate_risk_score', 'recommendations'
    ]
    risks_tuples = list(df[risks_cols].itertuples(index=False, name=None))

    # Table 4: expenditures (disbursement transaction logs)
    # Extract month name (Jan, Feb, Mar...)
    month_names = []
    for d_val in df['start_date']:
        try:
            dt = datetime.datetime.strptime(d_val, "%Y-%m-%d")
            month_names.append(dt.strftime("%b"))
        except Exception:
            month_names.append("Jun")
    df['month_name'] = month_names

    exp_tuples = []
    for row in df.itertuples():
        if row.expenditure > 0:
            exp_tuples.append((
                row.id,
                float(row.expenditure),
                row.start_date,
                row.month_name,
                str(row.vendor)[:255],
                'Disbursed' if row.status == 'Completed' else 'Payment In-Progress',
                str(row.implementing_agency)[:255],
                f"Expenditure disbursement for {row.title[:100]}"
            ))

    # Table 5: contractors (aggregated unique vendor directory)
    vendor_grouped = df.groupby('vendor').agg(
        total_works=('id', 'count'),
        total_exp=('expenditure', 'sum'),
        avg_risk=('risk_score', 'mean')
    ).reset_index()
    contractor_tuples = []
    for v_row in vendor_grouped.itertuples():
        contractor_tuples.append((
            str(v_row.vendor)[:300],
            'Works Contractor',
            int(v_row.total_works),
            float(v_row.total_exp),
            round(float(v_row.avg_risk), 2),
            'Active'
        ))

    # Table 6: alerts (actionable notifications generated from high/critical anomalies)
    high_critical_df = df[(df['risk_score'] >= 35.0) | (df['status'] == 'Delayed') | (df['cost_overrun_risk'] > 20.0)]
    alert_tuples = []
    for a_row in high_critical_df.itertuples():
        alert_type = (
            'COST_OVERRUN' if a_row.cost_overrun_risk > 25.0 else
            ('EXECUTION_DELAY' if a_row.delay_risk > 30.0 or a_row.status == 'Delayed' else
             ('VENDOR_CONCENTRATION' if a_row.agency_concentration_score > 30.0 else 'PAYMENT_GAP'))
        )
        severity = 'Critical' if a_row.risk_score >= 60.0 else 'High'
        title = f"{alert_type.replace('_', ' ').title()} Flag: {a_row.id}"
        desc = a_row.recommendations
        alert_tuples.append((
            a_row.id, alert_type, severity, title, desc, 'Pending'
        ))

    # 8. Fast Multi-Table Bulk Persistence to SQLite Cache (< 1.5s for 40k rows)
    if sqlite_path.exists():
        conn_sq = sqlite3.connect(sqlite_path)
        cur_sq = conn_sq.cursor()
        cur_sq.execute("BEGIN TRANSACTION")

        # 1. Works
        cur_sq.executemany("""
            INSERT OR REPLACE INTO works (
                id, title, description, category, constituency_id, district_id, state_id,
                implementing_agency, estimated_cost, sanctioned_amount, released_amount,
                expenditure, physical_progress, payment_utilization, start_date, expected_completion,
                status, house_type, mp_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, works_tuples)

        # 2. Projects
        cur_sq.executemany("""
            INSERT OR REPLACE INTO projects (
                project_code, project_name, description, category, state_id, district_id,
                constituency_id, implementing_agency_name, estimated_cost, sanctioned_amount,
                released_amount, expenditure_amount, start_date,
                expected_completion_date, status, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, projects_tuples)

        # 3. Risk Assessments
        cur_sq.executemany("""
            INSERT OR REPLACE INTO risk_assessments (
                work_id, risk_score, risk_level, delay_probability, cost_overrun_risk,
                progress_gap_score, agency_concentration_score, duplicate_risk_score, recommendations
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, risks_tuples)

        # 4. Expenditures
        if exp_tuples:
            cur_sq.executemany("""
                INSERT INTO expenditures (
                    work_id, amount, expenditure_date, month_name, vendor_name, payment_status, ida, description
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, exp_tuples)

        # 5. Contractors
        if contractor_tuples:
            cur_sq.executemany("""
                INSERT INTO contractors (
                    contractor_name, contractor_type, total_works, total_expenditure, risk_score, status
                ) VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT (contractor_name) DO UPDATE SET
                    total_works = total_works + EXCLUDED.total_works,
                    total_expenditure = total_expenditure + EXCLUDED.total_expenditure,
                    risk_score = (risk_score + EXCLUDED.risk_score) / 2.0
            """, contractor_tuples)

        # 6. Alerts
        if alert_tuples:
            cur_sq.executemany("""
                INSERT INTO alerts (
                    work_id, alert_type, severity, title, description, status
                ) VALUES (?, ?, ?, ?, ?, ?)
            """, alert_tuples)

        conn_sq.commit()
        conn_sq.close()

    # 9. High-Speed Bulk Persistence to Supabase PostgreSQL (execute_values)
    database_url = os.environ.get("DATABASE_URL")
    supabase_synced = False
    supabase_error = None

    if HAS_PSYCOPG2 and database_url:
        try:
            import socket
            from urllib.parse import urlparse
            p_url = urlparse(database_url)
            hostaddr = None
            if p_url.hostname:
                try:
                    hostaddr = socket.gethostbyname(p_url.hostname)
                except Exception:
                    pass

            connect_kwargs = {"sslmode": "require", "connect_timeout": 15}
            if hostaddr:
                connect_kwargs["hostaddr"] = hostaddr

            conn_pg = psycopg2.connect(database_url, **connect_kwargs)
            conn_pg.autocommit = False
            cur_pg = conn_pg.cursor()

            # 1. Works
            insert_works_sql = """
                INSERT INTO public.works (
                    id, title, description, category, constituency_id, district_id, state_id,
                    implementing_agency, estimated_cost, sanctioned_amount, released_amount,
                    expenditure, physical_progress, payment_utilization, start_date, expected_completion,
                    status, house_type, mp_name
                ) VALUES %s
                ON CONFLICT (id) DO UPDATE SET
                    title = EXCLUDED.title,
                    state_id = EXCLUDED.state_id,
                    district_id = EXCLUDED.district_id,
                    constituency_id = EXCLUDED.constituency_id,
                    sanctioned_amount = EXCLUDED.sanctioned_amount,
                    expenditure = EXCLUDED.expenditure,
                    physical_progress = EXCLUDED.physical_progress,
                    house_type = EXCLUDED.house_type,
                    mp_name = EXCLUDED.mp_name;
            """
            execute_values(cur_pg, insert_works_sql, works_tuples, page_size=2500)

            # 2. Risk Assessments
            insert_risks_sql = """
                INSERT INTO public.risk_assessments (
                    work_id, risk_score, risk_level, delay_probability, cost_overrun_risk,
                    progress_gap_score, agency_concentration_score, duplicate_risk_score, recommendations
                ) VALUES %s
                ON CONFLICT (work_id) DO UPDATE SET
                    risk_score = EXCLUDED.risk_score,
                    risk_level = EXCLUDED.risk_level,
                    recommendations = EXCLUDED.recommendations;
            """
            execute_values(cur_pg, insert_risks_sql, risks_tuples, page_size=2500)

            # 4. Expenditures
            if exp_tuples:
                insert_exp_sql = """
                    INSERT INTO public.expenditures (
                        work_id, amount, expenditure_date, month_name, vendor_name, payment_status, ida, description
                    ) VALUES %s
                """
                execute_values(cur_pg, insert_exp_sql, exp_tuples, page_size=batch_size)

            # 5. Alerts
            if alert_tuples:
                insert_alerts_sql = """
                    INSERT INTO public.alerts (
                        work_id, alert_type, severity, title, description, status
                    ) VALUES %s
                """
                execute_values(cur_pg, insert_alerts_sql, alert_tuples, page_size=batch_size)

            conn_pg.commit()
            conn_pg.close()
            supabase_synced = True
        except Exception as e:
            supabase_error = str(e)
            try:
                conn_pg.rollback()
                conn_pg.close()
            except Exception:
                pass

    duration = time.time() - t0
    rows_per_sec = int(valid_count / max(duration, 0.001))

    # Calculate State Distribution for Immediate Verification
    state_counts = df['state_id'].value_counts().to_dict()
    states_represented = len(state_counts)

    # Sample ingested items for quick UI feedback
    sample_records = df[['id', 'title', 'category', 'sanctioned_amount', 'risk_score', 'risk_level', 'house_type']].head(5).to_dict(orient='records')

    return {
        "success": True,
        "total_rows_read": total_raw_rows,
        "valid_works_ingested": valid_count,
        "waste_rows_filtered": waste_count,
        "states_represented": states_represented,
        "expenditures_recorded": len(exp_tuples),
        "contractors_recorded": len(contractor_tuples),
        "alerts_generated": len(alert_tuples),
        "duration_seconds": round(duration, 3),
        "rows_per_second": rows_per_sec,
        "engine": "NumPy & Pandas Vectorized High-Speed Relational Engine",
        "supabase_synced": supabase_synced,
        "supabase_error": supabase_error,
        "sample_works": sample_records,
        "message": f"Successfully ingested {valid_count:,} works across {states_represented} states in {duration:.2f}s ({rows_per_sec:,} rows/sec). Recorded {len(exp_tuples):,} expenditures and {len(alert_tuples):,} AI alerts."
    }


def main():
    parser = argparse.ArgumentParser(description="MPLADS High-Speed Relational Data Ingestion Engine")
    parser.add_argument("--file", required=True, help="Path to data file (CSV, TSV, XLSX, XLS, JSON)")
    parser.add_argument("--state-id", type=int, default=1, help="Default State ID fallback")
    parser.add_argument("--district-id", type=int, default=1, help="Default District ID fallback")
    parser.add_argument("--constituency-id", type=int, default=1, help="Default Constituency ID fallback")
    parser.add_argument("--user-role", default="District", help="User role executing upload")
    parser.add_argument("--creator", default="admin@mplads.gov.in", help="Creator user email")
    parser.add_argument("--batch-size", type=int, default=5000, help="DB chunk size")

    args = parser.parse_args()

    try:
        result = process_and_ingest(
            file_path=args.file,
            default_state_id=args.state_id,
            default_district_id=args.district_id,
            default_constituency_id=args.constituency_id,
            user_role=args.user_role,
            creator_email=args.creator,
            batch_size=args.batch_size
        )
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e),
            "traceback": repr(e)
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()
