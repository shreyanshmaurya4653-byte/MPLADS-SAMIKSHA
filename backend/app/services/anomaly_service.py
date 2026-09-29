"""
MPLADS AI Engine: Multi-Pillar Problem Statement Anomaly Analysis Service
Computes granular analytics across:
1. Expenditure Patterns
2. Fund Utilization
3. Cost Estimates
4. Work Execution
5. Project Similarity & Duplication
"""
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from ..models.work import Work
from ..models.alert import Alert
from .similarity_service import get_all_duplicate_pairs

def get_problem_statement_anomalies(db: Session, current_user: Dict[str, Any] = None) -> Dict[str, Any]:
    works = db.query(Work).all()
    alerts = db.query(Alert).all()
    
    total_works = len(works)
    if total_works == 0:
        return {}

    # ==========================================
    # 1. EXPENDITURE PATTERNS ANOMALY ANALYSIS
    # ==========================================
    total_expenditure = sum(w.expenditure or 0.0 for w in works)
    avg_expenditure = total_expenditure / max(1, total_works)
    
    # Identify expenditure spikes (works where expenditure significantly outpaces normal ratios)
    expenditure_spikes = []
    agency_expenditure = {}
    
    for w in works:
        sanctioned = float(w.sanctioned_amount or 1.0)
        exp = float(w.expenditure or 0.0)
        ratio = (exp / sanctioned) * 100.0
        
        # Track agency outlays
        agency = w.implementing_agency or "Unknown Agency"
        agency_expenditure[agency] = agency_expenditure.get(agency, 0.0) + exp

        # A spike is flagged if expenditure exceeds sanctioned ceiling or surges above normal rate
        if exp > sanctioned:
            spike_pct = round(((exp - sanctioned) / sanctioned) * 100.0, 1)
            expenditure_spikes.append({
                "work_id": w.id,
                "title": w.title,
                "implementing_agency": w.implementing_agency,
                "category": w.category,
                "sanctioned_amount": sanctioned,
                "expenditure": exp,
                "spike_percentage": spike_pct,
                "deviation_amount": exp - sanctioned,
                "status": w.status,
                "anomaly_type": "EXPENDITURE_SPIKE",
                "severity": "Critical" if spike_pct >= 50.0 else "High",
                "audit_note": f"Expenditure exceeds sanctioned ceiling by ₹{(exp - sanctioned)/100000:.1f} Lakhs (+{spike_pct}%)."
            })

    expenditure_spikes = sorted(expenditure_spikes, key=lambda x: x["spike_percentage"], reverse=True)

    # Agency concentration metrics
    top_agencies = [
        {"agency": k, "total_expenditure": v, "share_pct": round((v / max(1.0, total_expenditure)) * 100.0, 1)}
        for k, v in sorted(agency_expenditure.items(), key=lambda x: x[1], reverse=True)
    ]

    expenditure_patterns = {
        "total_expenditure": total_expenditure,
        "average_expenditure": round(avg_expenditure, 2),
        "total_spikes_flagged": len(expenditure_spikes),
        "spike_rate_pct": round((len(expenditure_spikes) / max(1, total_works)) * 100.0, 1),
        "flagged_spikes": expenditure_spikes,
        "agency_concentration": top_agencies,
        "audit_summary": f"Detected {len(expenditure_spikes)} expenditure surges exceeding statutory sanctioned thresholds, with top agency absorbing {top_agencies[0]['share_pct'] if top_agencies else 0}% of all disbursements."
    }

    # ==========================================
    # 2. FUND UTILIZATION ANOMALY ANALYSIS
    # ==========================================
    total_sanctioned = sum(w.sanctioned_amount or 0.0 for w in works)
    total_released = sum(w.released_amount or w.sanctioned_amount or 0.0 for w in works)
    total_unspent = max(0.0, total_released - total_expenditure)
    overall_utilization_rate = round((total_expenditure / max(1.0, total_released)) * 100.0, 1)

    # Idle / Stagnant Funds: Released >= sanctioned but physical progress < 30% or status delayed
    idle_fund_works = []
    category_utilization = {}

    for w in works:
        rel = float(w.released_amount or w.sanctioned_amount or 0.0)
        exp = float(w.expenditure or 0.0)
        prog = float(w.physical_progress or 0.0)
        unspent = max(0.0, rel - exp)

        # Category utilization breakdown
        cat = w.category or "General"
        if cat not in category_utilization:
            category_utilization[cat] = {"sanctioned": 0.0, "released": 0.0, "expenditure": 0.0, "count": 0}
        category_utilization[cat]["sanctioned"] += float(w.sanctioned_amount or 0.0)
        category_utilization[cat]["released"] += rel
        category_utilization[cat]["expenditure"] += exp
        category_utilization[cat]["count"] += 1

        # Flag idle funds: high release, low utilization
        if rel >= 500000.0 and exp / max(1.0, rel) < 0.60 and prog < 50.0:
            idle_fund_works.append({
                "work_id": w.id,
                "title": w.title,
                "category": w.category,
                "implementing_agency": w.implementing_agency,
                "released_amount": rel,
                "expenditure": exp,
                "unspent_balance": unspent,
                "physical_progress": prog,
                "utilization_pct": round((exp / max(1.0, rel)) * 100.0, 1),
                "status": w.status,
                "audit_note": f"₹{unspent/100000:.1f} Lakhs lying unutilized with only {prog}% progress."
            })

    category_summary = [
        {
            "category": k,
            "total_sanctioned": v["sanctioned"],
            "total_expenditure": v["expenditure"],
            "utilization_rate": round((v["expenditure"] / max(1.0, v["released"])) * 100.0, 1),
            "project_count": v["count"]
        }
        for k, v in category_utilization.items()
    ]

    fund_utilization = {
        "total_sanctioned": total_sanctioned,
        "total_released": total_released,
        "total_utilized": total_expenditure,
        "total_unspent_balance": total_unspent,
        "overall_utilization_rate": overall_utilization_rate,
        "idle_projects_count": len(idle_fund_works),
        "idle_projects": sorted(idle_fund_works, key=lambda x: x["unspent_balance"], reverse=True),
        "sector_utilization": sorted(category_summary, key=lambda x: x["utilization_rate"], reverse=True),
        "audit_summary": f"Scheme fund utilization rate stands at {overall_utilization_rate}%, with ₹{total_unspent/10000000:.2f} Cr remaining unutilized across active project accounts."
    }

    # ==========================================
    # 3. COST ESTIMATES ANOMALY ANALYSIS
    # ==========================================
    total_estimated = sum(w.estimated_cost or w.sanctioned_amount or 0.0 for w in works)
    cost_overrun_works = []
    total_overrun_amount = 0.0

    for w in works:
        est = float(w.estimated_cost or w.sanctioned_amount or 0.0)
        sanc = float(w.sanctioned_amount or est or 1.0)
        exp = float(w.expenditure or 0.0)

        # Detect cost overrun beyond sanctioned budget
        if exp > sanc:
            overrun_amount = exp - sanc
            total_overrun_amount += overrun_amount
            pct = round((overrun_amount / sanc) * 100.0, 1)
            cost_overrun_works.append({
                "work_id": w.id,
                "title": w.title,
                "category": w.category,
                "implementing_agency": w.implementing_agency,
                "estimated_cost": est,
                "sanctioned_amount": sanc,
                "actual_expenditure": exp,
                "overrun_amount": overrun_amount,
                "overrun_pct": pct,
                "variance_estimate_vs_actual": round(((exp - est) / max(1.0, est)) * 100.0, 1),
                "audit_note": f"Cost deviation of +{pct}% (₹{overrun_amount/100000:.1f} Lakhs above ceiling). Breaches Schedule of Rates (SoR)."
            })

    cost_estimates = {
        "total_estimated_cost": total_estimated,
        "total_sanctioned_budget": total_sanctioned,
        "total_overrun_amount": total_overrun_amount,
        "overrun_project_count": len(cost_overrun_works),
        "overrun_rate_pct": round((len(cost_overrun_works) / max(1, total_works)) * 100.0, 1),
        "flagged_overruns": sorted(cost_overrun_works, key=lambda x: x["overrun_amount"], reverse=True),
        "audit_summary": f"Identified {len(cost_overrun_works)} works with severe cost inflation amounting to ₹{total_overrun_amount/100000:.2f} Lakhs beyond government sanctioned caps."
    }

    # ==========================================
    # 4. WORK EXECUTION ANOMALY ANALYSIS
    # ==========================================
    avg_physical_progress = round(sum(w.physical_progress or 0.0 for w in works) / max(1, total_works), 1)
    progress_payment_mismatches = []
    delayed_works = []

    for w in works:
        prog = float(w.physical_progress or 0.0)
        pay_util = float(w.payment_utilization or (float(w.expenditure or 0.0) / max(1.0, float(w.sanctioned_amount or 1.0)) * 100.0))
        gap = round(pay_util - prog, 1)

        # Payment outrunning physical execution by >= 20%
        if gap >= 20.0:
            progress_payment_mismatches.append({
                "work_id": w.id,
                "title": w.title,
                "category": w.category,
                "implementing_agency": w.implementing_agency,
                "physical_progress": prog,
                "payment_utilization": pay_util,
                "mismatch_gap": gap,
                "status": w.status,
                "severity": "Critical" if gap >= 35.0 else "High",
                "audit_note": f"Payment utilization ({pay_util:.0f}%) exceeds on-ground physical completion ({prog:.0f}%) by {gap:.0f}%."
            })

        # Milestone delay tracking
        if w.status == "Delayed":
            delayed_works.append({
                "work_id": w.id,
                "title": w.title,
                "category": w.category,
                "implementing_agency": w.implementing_agency,
                "physical_progress": prog,
                "start_date": str(w.start_date) if w.start_date else None,
                "expected_completion": str(w.expected_completion) if w.expected_completion else None,
                "audit_note": f"Project stalled behind statutory timeline with {prog}% physical execution."
            })

    work_execution = {
        "average_physical_progress": avg_physical_progress,
        "mismatch_count": len(progress_payment_mismatches),
        "delayed_count": len(delayed_works),
        "delayed_rate_pct": round((len(delayed_works) / max(1, total_works)) * 100.0, 1),
        "progress_payment_mismatches": sorted(progress_payment_mismatches, key=lambda x: x["mismatch_gap"], reverse=True),
        "delayed_projects": delayed_works,
        "audit_summary": f"{len(progress_payment_mismatches)} works display high-risk progress-to-payment divergence where contractors received large disbursements without corresponding field milestones."
    }

    # ==========================================
    # 5. PROJECT SIMILARITY & DUPLICATE ANALYSIS
    # ==========================================
    duplicate_pairs = get_all_duplicate_pairs(db, min_threshold=45.0)
    high_risk_dups = [p for p in duplicate_pairs if p["similarity"]["risk_level"] == "High"]

    project_similarity = {
        "total_pairs_flagged": len(duplicate_pairs),
        "high_risk_duplicate_count": len(high_risk_dups),
        "pairs": duplicate_pairs,
        "audit_summary": f"Detected {len(duplicate_pairs)} project clusters exhibiting substantial lexical, geospatial, or scope overlap requiring physical verification against double-claiming."
    }

    return {
        "timestamp": "2026-09-20T19:25:00Z",
        "total_assessed_works": total_works,
        "expenditure_patterns": expenditure_patterns,
        "fund_utilization": fund_utilization,
        "cost_estimates": cost_estimates,
        "work_execution": work_execution,
        "project_similarity": project_similarity
    }
