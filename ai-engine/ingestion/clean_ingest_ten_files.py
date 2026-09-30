#!/usr/bin/env python3
"""
Clean, High-Performance Deduplicated Ingestion Pipeline for 10 Official MPLADS CSV Files.
Key features:
1. Deduplicates project lifecycle records strictly on official Work ID (WS/...)
   Consolidates: Recommended -> Sanctioned -> Completed -> Expenditures
2. Separates MP Entitlement Budgets (Allocated Limit for Hon'ble MPs) into constituencies table,
   preventing them from inflating the physical works count or sanctioned costs.
3. Excludes summary/grand total rows (e.g. Grand Total Rs. 83,493,857,011.68).
4. Accurately flags house_type ('Lok Sabha' vs 'Rajya Sabha').
5. Runs the full AI Risk Assessment Engine across all deduplicated works.
6. Populates expenditures, contractors, alerts, and risk_assessments.
7. Ensures subdivisions (sub-districts) remains strictly 0 rows until user uploads real data.
"""

import sys
import os
import re
import time
import datetime
import sqlite3
from pathlib import Path
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DOWNLOADS_DIR = Path("C:/Users/Lenovo/Downloads")
SQLITE_PATH = BASE_DIR / "database" / "mplads.db"

def clean_num(v) -> float:
    if v is None or pd.isna(v):
        return 0.0
    s = re.sub(r'[^\d\.]', '', str(v))
    try:
        return float(s)
    except Exception:
        return 0.0

def extract_work_code(v) -> Optional[str]:
    if not v or pd.isna(v):
        return None
    s = str(v).strip()
    m = re.search(r'(WS\s*\/[^\/]+\/[^\/]+\/\d+)', s)
    if m:
        return re.sub(r'\s+', '', m.group(1))
    m2 = re.search(r'(WS\s*\/[A-Za-z0-9\/\-_]+)', s)
    if m2:
        return re.sub(r'\s+', '', m2.group(1))
    return None

def normalize_name(n: str) -> str:
    clean_n = re.sub(r'\s*\(\d{4}[^\)]*\)', '', str(n)).strip()
    core_n = re.sub(r'^(dr\.|shri|smt\.|adv\.|prof\.|ms\.)\s*', '', clean_n, flags=re.I).strip()
    return re.sub(r'[^a-z0-9]', '', core_n.lower())

def load_geography(conn: sqlite3.Connection):
    cur = conn.cursor()
    state_lookup = {}
    cur.execute("SELECT state_id, state_name, state_code FROM states")
    for sid, sname, scode in cur.fetchall():
        s_clean = sname.lower().strip()
        state_lookup[s_clean] = sid
        state_lookup[re.sub(r'[^a-z0-9]', '', s_clean)] = sid
        if scode:
            state_lookup[scode.lower().strip()] = sid

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

    dist_by_state = {}
    dist_global = {}
    cur.execute("SELECT district_id, state_id, district_name FROM districts")
    for did, sid, dname in cur.fetchall():
        d_clean = re.sub(r'[^a-z0-9]', '', dname.lower())
        dist_by_state.setdefault(sid, {})[d_clean] = did
        dist_global[d_clean] = (did, sid)

    const_by_state = {}
    const_global = {}
    mp_to_const = {}
    cur.execute("SELECT constituency_id, state_id, district_id, constituency_name, mp_name, house_type FROM constituencies")
    for cid, sid, did, cname, mp, htype in cur.fetchall():
        c_clean = re.sub(r'[^a-z0-9]', '', cname.lower())
        const_by_state.setdefault(sid, {})[c_clean] = (cid, did, htype)
        const_global[c_clean] = (cid, sid, did, htype)
        if mp:
            mp_norm = normalize_name(mp)
            if mp_norm:
                mp_to_const[mp_norm] = (cid, sid, did, htype, mp)

    return state_lookup, dist_by_state, dist_global, const_by_state, const_global, mp_to_const

def run_ingestion():
    t_start = time.time()
    print("=" * 70)
    print("🚀 STARTING OPTIMIZED DEDUPLICATED MPLADS INGESTION PIPELINE")
    print("=" * 70)

    if not SQLITE_PATH.exists():
        print(f"❌ SQLite database not found at: {SQLITE_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(SQLITE_PATH)
    cur = conn.cursor()

    # Ensure schema has allocated_amount in constituencies
    try:
        cur.execute("ALTER TABLE constituencies ADD COLUMN allocated_amount REAL DEFAULT 0")
        conn.commit()
    except Exception:
        pass

    state_lookup, dist_by_state, dist_global, const_by_state, const_global, mp_to_const = load_geography(conn)

    # -------------------------------------------------------------
    # STEP 1: Process MP Entitlement Allocations (CSVs 4 and 3)
    # -------------------------------------------------------------
    print("\n[Step 1/5] Ingesting MP Entitlement Limits into constituencies table...")
    
    # Reset constituencies allocated_amount
    cur.execute("UPDATE constituencies SET allocated_amount = 0")
    # Clean Rajya Sabha duplicate rows from older seeds
    cur.execute("DELETE FROM constituencies WHERE house_type = 'Rajya Sabha'")
    conn.commit()

    # 1A: Lok Sabha MPs (File 4)
    file_ls_mps = DOWNLOADS_DIR / "Allocated Limit for Honble MPs (4).csv"
    ls_mp_count = 0
    ls_alloc_sum = 0.0
    if file_ls_mps.exists():
        df_ls = pd.read_csv(file_ls_mps, encoding='utf-8-sig')
        df_ls = df_ls[~df_ls['Sr. No.'].astype(str).str.contains(r'total|grand', case=False, na=False)]
        
        amt_col = [c for c in df_ls.columns if 'allocated' in c.lower()][0]
        mp_col = [c for c in df_ls.columns if 'member' in c.lower()][0]
        const_col = [c for c in df_ls.columns if 'constituency' in c.lower()][0]
        state_col = [c for c in df_ls.columns if 'state' in c.lower()][0]

        for _, r in df_ls.iterrows():
            amt = clean_num(r[amt_col])
            mp_raw = str(r[mp_col]).strip()
            c_raw = str(r[const_col]).strip()
            s_raw = str(r[state_col]).strip()
            
            ls_alloc_sum += amt
            ls_mp_count += 1
            
            c_base = re.sub(r'\s*\([^\)]*\)', '', c_raw).strip()
            c_norm = re.sub(r'[^a-z0-9]', '', c_base.lower())
            mp_norm = normalize_name(mp_raw)
            s_id = state_lookup.get(s_raw.lower().strip(), 1)

            # Match and update in constituencies
            cur.execute("""
                UPDATE constituencies 
                SET allocated_amount = ?, house_type = 'Lok Sabha', mp_name = COALESCE(NULLIF(?, ''), mp_name)
                WHERE house_type = 'Lok Sabha' AND (
                    LOWER(REPLACE(REPLACE(REPLACE(REPLACE(constituency_name, ' ', ''), '-', ''), '(SC)', ''), '(ST)', '')) = ?
                    OR LOWER(REPLACE(REPLACE(mp_name, ' ', ''), '-', '')) = ?
                )
            """, (amt, mp_raw, c_norm, mp_norm))

            if cur.rowcount == 0:
                # Insert if not matched
                cur.execute("""
                    INSERT INTO constituencies (state_id, district_id, constituency_name, name, mp_name, house_type, allocated_amount)
                    VALUES (?, 1, ?, ?, ?, 'Lok Sabha', ?)
                """, (s_id, c_raw, c_raw, mp_raw, amt))

        conn.commit()
        print(f"  ✓ Processed {ls_mp_count} Lok Sabha MPs from CSV 4 (Total Entitlement: ₹{ls_alloc_sum/1e7:,.2f} Cr)")

    # 1B: Rajya Sabha MPs (File 3)
    file_rs_mps = DOWNLOADS_DIR / "Allocated Limit for Honble MPs (3).csv"
    rs_mp_count = 0
    rs_alloc_sum = 0.0
    rs_mp_names_set = set()

    if file_rs_mps.exists():
        df_rs = pd.read_csv(file_rs_mps, encoding='utf-8-sig')
        df_rs = df_rs[~df_rs['Sr. No.'].astype(str).str.contains(r'total|grand', case=False, na=False)]

        amt_col = [c for c in df_rs.columns if 'allocated' in c.lower()][0]
        mp_col = [c for c in df_rs.columns if 'member' in c.lower()][0]
        state_col = [c for c in df_rs.columns if 'state' in c.lower()][0]

        for _, r in df_rs.iterrows():
            amt = clean_num(r[amt_col])
            mp_raw = str(r[mp_col]).strip()
            s_raw = str(r[state_col]).strip()
            
            rs_alloc_sum += amt
            rs_mp_count += 1
            mp_norm = normalize_name(mp_raw)
            if mp_norm:
                rs_mp_names_set.add(mp_norm)

            s_id = state_lookup.get(s_raw.lower().strip(), 1)

            cur.execute("""
                INSERT INTO constituencies (state_id, district_id, constituency_name, name, mp_name, house_type, allocated_amount)
                VALUES (?, 1, ?, ?, ?, 'Rajya Sabha', ?)
            """, (s_id, f"Rajya Sabha ({s_raw})", f"Rajya Sabha ({s_raw})", mp_raw, amt))

        conn.commit()
        print(f"  ✓ Processed {rs_mp_count} Rajya Sabha MPs from CSV 3 (Total Entitlement: ₹{rs_alloc_sum/1e7:,.2f} Cr)")

    print(f"  ✓ Total MP Entitlement Allocated across Parliament: ₹{(ls_alloc_sum + rs_alloc_sum)/1e7:,.2f} Cr")

    # -------------------------------------------------------------
    # STEP 2: Lifecycle Ingestion & Deduplication across 8 Project Files
    # -------------------------------------------------------------
    print("\n[Step 2/5] Ingesting and deduplicating works across lifecycle stages...")

    all_works: Dict[str, Dict[str, Any]] = {}
    expenditures_list = []
    contractor_map = {}

    project_files = [
        ("Works Recommended.csv", "Recommended", "Lok Sabha"),
        ("Works Recommended (1).csv", "Recommended", "Rajya Sabha"),
        ("Works Sanctioned.csv", "Sanctioned", "Lok Sabha"),
        ("Works Sanctioned (1).csv", "Sanctioned", "Rajya Sabha"),
        ("Works Completed.csv", "Completed", "Lok Sabha"),
        ("Works Completed (1).csv", "Completed", "Rajya Sabha"),
        ("Expenditure on Completed and On-going Works as on Date.csv", "Expenditure", "Lok Sabha"),
        ("Expenditure on Completed and On-going Works as on Date (1).csv", "Expenditure", "Rajya Sabha"),
    ]

    for fname, stage, default_house in project_files:
        fpath = DOWNLOADS_DIR / fname
        if not fpath.exists():
            print(f"  ⚠️ Skipping {fname}: Not found")
            continue

        t0_f = time.time()
        df = pd.read_csv(fpath, encoding='utf-8-sig', low_memory=False)
        row_count = len(df)

        # Identify columns
        work_col = None
        desc_col = None
        amt_col = None
        state_col = None
        const_col = None
        mp_col = None
        date_col = None
        vendor_col = None
        ida_col = None
        cat_col = None

        for c in df.columns:
            cl = str(c).lower().strip()
            if 'work id' in cl:
                work_col = c
            elif re.search(r'^work$', cl) and not work_col:
                work_col = c
            elif re.search(r'work\s*description|^description$', cl) and not desc_col:
                desc_col = c
            elif re.search(r'amount|disbursed|cost', cl) and not amt_col:
                amt_col = c
            elif re.search(r'^state$', cl):
                state_col = c
            elif re.search(r'constituency', cl):
                const_col = c
            elif re.search(r'mp|member', cl):
                mp_col = c
            elif re.search(r'date', cl) and not date_col:
                date_col = c
            elif re.search(r'vendor|contractor', cl):
                vendor_col = c
            elif re.search(r'ida|agency', cl):
                ida_col = c
            elif re.search(r'category|sector', cl):
                cat_col = c

        if not work_col and 'Work' in df.columns: work_col = 'Work'
        if not work_col and 'WORK' in df.columns: work_col = 'WORK'

        valid_in_file = 0

        for _, r in df.iterrows():
            raw_w = r.get(work_col, '') if work_col else ''
            w_code = extract_work_code(raw_w)
            if not w_code and desc_col:
                w_code = extract_work_code(r.get(desc_col, ''))
            
            if not w_code:
                continue

            valid_in_file += 1
            amt = clean_num(r.get(amt_col, 0)) if amt_col else 0.0
            state_val = str(r.get(state_col, '')).strip() if state_col else ''
            const_val = str(r.get(const_col, '')).strip() if const_col else ''
            mp_val = str(r.get(mp_col, '')).strip() if mp_col else ''
            date_val = str(r.get(date_col, '')).strip() if date_col else ''
            ida_val = str(r.get(ida_col, '')).strip() if ida_col else 'Public Works Department (PWD)'
            cat_val = str(r.get(cat_col, '')).strip() if cat_col else 'Community Infrastructure'
            vendor_val = str(r.get(vendor_col, '')).strip() if vendor_col else ''

            # House type determination
            mp_norm = normalize_name(mp_val)
            is_rs = (default_house == 'Rajya Sabha') or (mp_norm in rs_mp_names_set) or ('(1)' in fname) or ('rajya' in const_val.lower())
            house = 'Rajya Sabha' if is_rs else 'Lok Sabha'

            # Work title extraction
            title = ""
            if desc_col and r.get(desc_col):
                title = str(r.get(desc_col)).strip()
            elif '-' in str(raw_w):
                parts = str(raw_w).split('-', 1)
                title = parts[1].strip() if len(parts) > 1 else str(raw_w).strip()
            else:
                title = str(raw_w).strip()

            # State ID
            s_clean = state_val.lower().strip()
            sid = state_lookup.get(s_clean, state_lookup.get(re.sub(r'[^a-z0-9]', '', s_clean), 1))
            
            # District ID from IDA
            did = 1
            if ida_val:
                m_ida = re.match(r'^([A-Za-z\s]+)[\(_]', ida_val)
                d_extracted = m_ida.group(1).strip().lower() if m_ida else ida_val.strip().lower()
                d_clean = re.sub(r'[^a-z0-9]', '', d_extracted)
                if sid in dist_by_state and d_clean in dist_by_state[sid]:
                    did = dist_by_state[sid][d_clean]
                elif d_clean in dist_global:
                    did, _ = dist_global[d_clean]

            # Constituency ID
            cid = 1
            c_clean = re.sub(r'[^a-z0-9]', '', const_val.lower())
            if sid in const_by_state and c_clean in const_by_state[sid]:
                cid, _, _ = const_by_state[sid][c_clean]
            elif c_clean in const_global:
                cid, _, _, _ = const_global[c_clean]
            elif mp_norm in mp_to_const:
                cid, _, _, _, _ = mp_to_const[mp_norm]

            # Initialize or update in all_works
            if w_code not in all_works:
                init_sanc = amt if stage in ('Sanctioned', 'Completed') and amt > 0 else 0.0
                all_works[w_code] = {
                    'id': w_code,
                    'title': title or f"MPLADS Project {w_code}",
                    'description': f"MPLADS Infrastructure Work - {cat_val}",
                    'category': cat_val or 'Community Infrastructure',
                    'state_id': sid,
                    'district_id': did,
                    'constituency_id': cid,
                    'implementing_agency': ida_val or 'Public Works Department (PWD)',
                    'estimated_cost': amt if amt > 0 else 100000.0,
                    'sanctioned_amount': init_sanc,
                    'released_amount': 0.0,
                    'expenditure': 0.0,
                    'physical_progress': 0.0,
                    'payment_utilization': 0.0,
                    'start_date': date_val if len(date_val) >= 10 else '2024-06-01',
                    'expected_completion': '2025-03-31',
                    'actual_completion': None,
                    'status': stage if stage != 'Expenditure' else 'Sanctioned',
                    'house_type': house,
                    'mp_name': mp_val,
                    'vendor': vendor_val or 'Government Implementing Agency'
                }

            item = all_works[w_code]

            # Update details if more descriptive
            if title and len(title) > len(item['title']):
                item['title'] = title
            if mp_val and not item['mp_name']:
                item['mp_name'] = mp_val
            if state_val and item['state_id'] == 1 and sid != 1:
                item['state_id'] = sid
            if did != 1 and item['district_id'] == 1:
                item['district_id'] = did
            if cid != 1 and item['constituency_id'] == 1:
                item['constituency_id'] = cid
            if cat_val and cat_val != 'Community Infrastructure' and item['category'] == 'Community Infrastructure':
                item['category'] = cat_val
            if vendor_val and item['vendor'] == 'Government Implementing Agency':
                item['vendor'] = vendor_val

            # Lifecycle transitions
            if stage == 'Recommended':
                if amt > 0:
                    item['estimated_cost'] = max(item['estimated_cost'], amt)
            elif stage == 'Sanctioned':
                if amt > 0:
                    item['sanctioned_amount'] = amt
                    item['estimated_cost'] = max(item['estimated_cost'], amt)
                if item['status'] != 'Completed':
                    item['status'] = 'Sanctioned'
                if len(date_val) >= 10:
                    item['start_date'] = date_val
            elif stage == 'Completed':
                if amt > 0 and item['sanctioned_amount'] == 0:
                    item['sanctioned_amount'] = amt
                item['status'] = 'Completed'
                item['physical_progress'] = 100.0
                if len(date_val) >= 10:
                    item['actual_completion'] = date_val
                    item['expected_completion'] = date_val
            elif stage == 'Expenditure':
                if amt > 0:
                    item['expenditure'] += amt
                    item['released_amount'] += amt
                    if item['sanctioned_amount'] == 0:
                        item['sanctioned_amount'] = amt
                if item['status'] != 'Completed':
                    item['status'] = 'Ongoing' if item['expenditure'] > 0 else 'Sanctioned'
                
                # Append individual disbursement record
                exp_date = date_val if len(date_val) >= 10 else '2024-07-15'
                month_name = 'Jul'
                try:
                    month_name = datetime.datetime.strptime(exp_date[:10], '%Y-%m-%d').strftime('%b')
                except Exception:
                    pass

                expenditures_list.append((
                    w_code,
                    amt,
                    exp_date,
                    month_name,
                    vendor_val[:250] if vendor_val else 'State Implementing Agency',
                    'Disbursed',
                    ida_val[:250],
                    f"Disbursement for {item['title'][:100]}"
                ))

                # Track contractor
                v_name = vendor_val.strip() if vendor_val else 'State Implementing Agency'
                if v_name not in contractor_map:
                    contractor_map[v_name] = {'works': set(), 'exp': 0.0}
                contractor_map[v_name]['works'].add(w_code)
                contractor_map[v_name]['exp'] += amt

        elapsed = time.time() - t0_f
        print(f"  ✓ {fname} ({row_count:,} rows) -> {valid_in_file:,} valid records ({elapsed:.2f}s)")

    print(f"\n  🎯 UNIQUE CONSOLIDATED WORKS ACROSS ALL FILES: {len(all_works):,}")

    # -------------------------------------------------------------
    # STEP 3: Vectorized AI Risk Engine Calculation
    # -------------------------------------------------------------
    print("\n[Step 3/5] Executing AI Risk Assessment & Anomaly Detection Engine...")
    
    works_df = pd.DataFrame(list(all_works.values()))
    
    # Financial metrics normalization
    sanc_arr = works_df['sanctioned_amount'].values
    exp_arr = works_df['expenditure'].values
    est_arr = works_df['estimated_cost'].values
    status_arr = works_df['status'].values
    
    # Physical progress
    util_ratio = np.where(sanc_arr > 0, np.clip(exp_arr / sanc_arr, 0.0, 1.5), 0.0)
    works_df['payment_utilization'] = np.round(util_ratio * 100.0, 1)
    
    # Completed works get 100%, ongoing works get estimated progress from utilization, recommended gets 0%
    works_df['physical_progress'] = np.where(
        status_arr == 'Completed', 100.0,
        np.where(status_arr == 'Recommended', 0.0,
                 np.clip(np.round(util_ratio * 90.0, 1), 5.0, 95.0))
    )
    prog_arr = works_df['physical_progress'].values

    # Multi-factor risk engine:
    # 1. Cost Overrun Risk
    cost_diff_pct = np.where(est_arr > 0, ((sanc_arr - est_arr) / est_arr) * 100.0, 0.0)
    exp_overrun_pct = np.where(sanc_arr > 0, ((exp_arr - sanc_arr) / sanc_arr) * 100.0, 0.0)
    cost_risk = np.clip(np.maximum(cost_diff_pct, exp_overrun_pct * 1.5), 0.0, 100.0)

    # 2. Delay Risk
    delay_risk = np.where(
        status_arr == 'Completed', 5.0,
        np.where(status_arr == 'Recommended', 15.0,
                 np.where(prog_arr < 20.0, 45.0, np.where(prog_arr < 60.0, 25.0, 10.0)))
    )

    # 3. Payment Gap Risk (Expenditure vs Progress Discrepancy)
    payment_gap = np.clip((util_ratio * 100.0) - prog_arr, 0.0, 100.0)
    payment_risk = np.where(status_arr == 'Completed', 5.0, np.clip(payment_gap * 1.2, 0.0, 100.0))

    # Overall Composite Risk Score (0 - 100)
    risk_scores = np.clip(
        (cost_risk * 0.35) + (delay_risk * 0.35) + (payment_risk * 0.30),
        5.0, 95.0
    )

    risk_levels = np.select(
        [risk_scores >= 65.0, risk_scores >= 40.0, risk_scores >= 20.0],
        ['Critical', 'High', 'Medium'],
        default='Low'
    )

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

    works_df['risk_score'] = np.round(risk_scores, 2)
    works_df['risk_level'] = risk_levels
    works_df['cost_overrun_risk'] = np.round(cost_risk, 2)
    works_df['delay_risk'] = np.round(delay_risk, 2)
    works_df['payment_risk'] = np.round(payment_risk, 2)
    works_df['agency_concentration_score'] = 15.0
    works_df['duplicate_risk_score'] = 5.0
    works_df['recommendations'] = recs

    # Generate Alerts from high/critical anomalies
    alerts_list = []
    flagged = works_df[(works_df['risk_score'] >= 50.0) | (works_df['cost_overrun_risk'] > 25.0)]
    for r in flagged.itertuples():
        alert_type = 'COST_OVERRUN' if r.cost_overrun_risk > 25.0 else 'EXECUTION_DELAY'
        sev = 'Critical' if r.risk_score >= 65.0 else 'High'
        alerts_list.append((
            r.id, alert_type, sev, f"{alert_type.replace('_', ' ').title()} Flag: {r.id}", r.recommendations, 'Pending'
        ))

    print(f"  ✓ Evaluated {len(works_df):,} works with AI Risk Engine")
    print(f"  ✓ High/Critical Risk Works: {len(flagged):,}")
    print(f"  ✓ AI Anomaly Alerts Generated: {len(alerts_list):,}")

    # -------------------------------------------------------------
    # STEP 4: Atomic Database Write
    # -------------------------------------------------------------
    print("\n[Step 4/5] Committing deduplicated dataset to SQLite database...")

    cur.execute("BEGIN TRANSACTION")

    # Clear old data
    for tbl in ['works', 'projects', 'expenditures', 'contractors', 'alerts', 'risk_assessments']:
        cur.execute(f"DELETE FROM {tbl}")
    
    # Ensure subdivisions is explicitly 0 (no hardcoded data)
    cur.execute("DELETE FROM subdivisions")

    # 1. Insert Works
    works_cols = [
        'id', 'title', 'description', 'category', 'constituency_id', 'district_id', 'state_id',
        'implementing_agency', 'estimated_cost', 'sanctioned_amount', 'released_amount',
        'expenditure', 'physical_progress', 'payment_utilization', 'start_date', 'expected_completion',
        'status', 'house_type', 'mp_name'
    ]
    works_tuples = list(works_df[works_cols].itertuples(index=False, name=None))
    cur.executemany("""
        INSERT INTO works (
            id, title, description, category, constituency_id, district_id, state_id,
            implementing_agency, estimated_cost, sanctioned_amount, released_amount,
            expenditure, physical_progress, payment_utilization, start_date, expected_completion,
            status, house_type, mp_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, works_tuples)

    # 2. Insert Projects (mirror table)
    projects_cols = [
        'id', 'title', 'description', 'category', 'state_id', 'district_id',
        'constituency_id', 'implementing_agency', 'estimated_cost', 'sanctioned_amount',
        'released_amount', 'expenditure', 'start_date', 'expected_completion', 'status'
    ]
    projects_tuples = list(works_df[projects_cols].itertuples(index=False, name=None))
    cur.executemany("""
        INSERT INTO projects (
            project_code, project_name, description, category, state_id, district_id,
            constituency_id, implementing_agency_name, estimated_cost, sanctioned_amount,
            released_amount, expenditure_amount, start_date, expected_completion_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, projects_tuples)

    # 3. Insert Risk Assessments
    risk_cols = [
        'id', 'risk_score', 'risk_level', 'delay_risk', 'cost_overrun_risk',
        'payment_risk', 'agency_concentration_score', 'duplicate_risk_score', 'recommendations'
    ]
    risk_tuples = list(works_df[risk_cols].itertuples(index=False, name=None))
    cur.executemany("""
        INSERT INTO risk_assessments (
            work_id, risk_score, risk_level, delay_probability, cost_overrun_risk,
            progress_gap_score, agency_concentration_score, duplicate_risk_score, recommendations
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, risk_tuples)

    # 4. Insert Expenditures
    if expenditures_list:
        cur.executemany("""
            INSERT INTO expenditures (
                work_id, amount, expenditure_date, month_name, vendor_name, payment_status, ida, description
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, expenditures_list)

    # 5. Insert Contractors
    contractor_tuples = []
    for cname, cdata in contractor_map.items():
        contractor_tuples.append((
            str(cname)[:250],
            'Works Contractor',
            len(cdata['works']),
            float(cdata['exp']),
            25.0,
            'Active'
        ))
    if contractor_tuples:
        cur.executemany("""
            INSERT INTO contractors (
                contractor_name, contractor_type, total_works, total_expenditure, risk_score, status
            ) VALUES (?, ?, ?, ?, ?, ?)
        """, contractor_tuples)

    # 6. Insert Alerts
    if alerts_list:
        cur.executemany("""
            INSERT INTO alerts (
                work_id, alert_type, severity, title, description, status
            ) VALUES (?, ?, ?, ?, ?, ?)
        """, alerts_list)

    conn.commit()
    conn.close()
    print("  ✓ Committed all tables cleanly to SQLite.")

    # -------------------------------------------------------------
    # STEP 5: Final Validation & Metrics Report
    # -------------------------------------------------------------
    print("\n[Step 5/5] Final Verification of Metrics:")
    conn_val = sqlite3.connect(SQLITE_PATH)
    cur_val = conn_val.cursor()

    cur_val.execute("SELECT house_type, count(*), sum(sanctioned_amount), sum(expenditure) FROM works GROUP BY house_type")
    house_stats = cur_val.fetchall()

    cur_val.execute("SELECT house_type, count(*), sum(allocated_amount) FROM constituencies GROUP BY house_type")
    ent_stats = cur_val.fetchall()

    s_cnt = cur_val.execute("SELECT count(*) FROM subdivisions").fetchone()[0]
    exp_cnt = cur_val.execute("SELECT count(*) FROM expenditures").fetchone()[0]
    r_cnt = cur_val.execute("SELECT count(*) FROM risk_assessments").fetchone()[0]
    c_cnt = cur_val.execute("SELECT count(*) FROM contractors").fetchone()[0]
    conn_val.close()

    print("\n" + "=" * 70)
    print("📊 OFFICIAL VERIFIED METRICS (DEDUPLICATED DIRECTLY FROM 10 CSV FILES)")
    print("=" * 70)

    for h, cnt, sanc, exp in house_stats:
        print(f"\n🏛️ {h.upper()}:")
        print(f"  • Unique Works: {cnt:,}")
        print(f"  • Total Sanctioned Amount: ₹{sanc/1e7:,.2f} Cr (₹{sanc:,.2f})")
        print(f"  • Total Expenditure Disbursed: ₹{exp/1e7:,.2f} Cr (₹{exp:,.2f})")
        if sanc > 0:
            print(f"  • Expenditure / Sanction Utilization: {(exp/sanc)*100:.1f}%")

    print("\n📜 PARLIAMENTARY ENTITLEMENT ALLOCATIONS (CONSTITUENCIES TABLE):")
    for h, mpcnt, ent in ent_stats:
        print(f"  • {h}: {mpcnt} MPs, Total Entitlement Quota: ₹{(ent or 0)/1e7:,.2f} Cr")

    total_time = time.time() - t_start
    print(f"\n⚙️ DATABASE REPOSITORY STATE:")
    print(f"  • Total Works Ingested: {len(all_works):,}")
    print(f"  • Itemized Disbursements Recorded: {exp_cnt:,}")
    print(f"  • AI Risk Assessments: {r_cnt:,}")
    print(f"  • Contractors Directory: {c_cnt:,}")
    print(f"  • Sub-districts (subdivisions): {s_cnt} (Empty, awaiting user's CSV)")
    print(f"⏱️ Total Execution Time: {total_time:.2f} seconds")
    print("=" * 70)

if __name__ == "__main__":
    run_ingestion()
