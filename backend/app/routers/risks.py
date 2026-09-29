from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from ..core.database import get_db
from ..core.dependencies import get_current_user
from ..services.risk_service import get_risk_overview, get_work_risk_dossier
from ..services.anomaly_service import get_problem_statement_anomalies
from ..services.similarity_service import (
    get_all_duplicate_pairs,
    get_work_similarities,
    compute_detailed_similarity
)
from ..models.work import Work

router = APIRouter(prefix="/risks", tags=["Risk Intelligence"])

@router.get("/overview")
def risk_overview(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_risk_overview(db, current_user)

@router.get("/anomalies/breakdown")
def problem_statement_anomalies(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Returns granular anomaly analytics on every part mentioned in the problem statement:
    1. Expenditure Patterns (spikes, velocity, agency concentration)
    2. Fund Utilization (idle balances, unspent funds, sectoral efficiency)
    3. Cost Estimates (overruns, SoR variances, estimate deviations)
    4. Work Execution (payment vs physical progress mismatches, milestone delays)
    5. Project Similarity & Duplication
    """
    return get_problem_statement_anomalies(db, current_user)

@router.get("/similarity/all-pairs")
def all_similarity_pairs(min_threshold: float = 40.0, db: Session = Depends(get_db)):
    """Returns all identified similar or duplicate work clusters across the scheme."""
    return get_all_duplicate_pairs(db, min_threshold)

@router.get("/similarity/work/{work_id}")
def work_similarities(work_id: str, db: Session = Depends(get_db)):
    """Returns candidate similar projects for a specific work with similarity breakdown."""
    return get_work_similarities(db, work_id)

@router.get("/similarity/compare")
def compare_two_projects(work_a: str = Query(...), work_b: str = Query(...), db: Session = Depends(get_db)):
    """Runs a side-by-side AI similarity and duplicate audit between any two projects."""
    w1 = db.query(Work).filter(Work.id == work_a).first()
    w2 = db.query(Work).filter(Work.id == work_b).first()
    if not w1 or not w2:
        raise HTTPException(status_code=404, detail="One or both project IDs could not be found.")

    d1 = {
        "id": w1.id, "title": w1.title, "description": w1.description,
        "category": w1.category, "implementing_agency": w1.implementing_agency,
        "sanctioned_amount": w1.sanctioned_amount, "estimated_cost": w1.estimated_cost,
        "expenditure": w1.expenditure, "status": w1.status,
        "constituency_id": w1.constituency_id, "district_id": w1.district_id
    }
    d2 = {
        "id": w2.id, "title": w2.title, "description": w2.description,
        "category": w2.category, "implementing_agency": w2.implementing_agency,
        "sanctioned_amount": w2.sanctioned_amount, "estimated_cost": w2.estimated_cost,
        "expenditure": w2.expenditure, "status": w2.status,
        "constituency_id": w2.constituency_id, "district_id": w2.district_id
    }

    audit = compute_detailed_similarity(d1, d2)
    return {
        "project_a": d1,
        "project_b": d2,
        "similarity_audit": audit
    }

@router.get("/work/{work_id}")
def work_risk_details(work_id: str, db: Session = Depends(get_db)):
    dossier = get_work_risk_dossier(db, work_id)
    if not dossier:
        raise HTTPException(status_code=404, detail="Work risk assessment not found")
    return dossier

@router.get("/contractors/performance")
def get_contractors_performance(db: Session = Depends(get_db)):
    """Returns contractor risk and performance metrics from the contractor_performance and contractors tables."""
    from sqlalchemy import text
    rows = db.execute(text("""
        SELECT 
            cp.performance_id,
            cp.contractor_id,
            c.contractor_name,
            c.contractor_type,
            c.registration_number,
            c.pan_number,
            c.status as contractor_status,
            cp.project_id,
            p.project_name,
            cp.completion_status,
            cp.delay_days,
            cp.quality_score,
            cp.performance_score,
            cp.cost_variance_percentage,
            cp.cancelled,
            cp.compliance_issues,
            cp.remarks,
            cp.evaluation_date
        FROM contractor_performance cp
        JOIN contractors c ON cp.contractor_id = c.contractor_id
        LEFT JOIN projects p ON cp.project_id = p.project_id
        ORDER BY cp.performance_score ASC
    """)).mappings().all()
    return [dict(r) for r in rows]

@router.get("/compliance/results")
def get_compliance_results(db: Session = Depends(get_db)):
    """Returns MPLADS statutory guidelines compliance audit findings."""
    from sqlalchemy import text
    rows = db.execute(text("""
        SELECT 
            cr.compliance_id,
            cr.project_id,
            p.project_name,
            p.project_code,
            cr.rule_name,
            cr.rule_category,
            cr.status,
            cr.deviation_notes,
            cr.severity,
            cr.checked_at
        FROM compliance_results cr
        LEFT JOIN projects p ON cr.project_id = p.project_id
        ORDER BY CASE cr.status WHEN 'FAIL' THEN 1 WHEN 'WARNING' THEN 2 ELSE 3 END
    """)).mappings().all()
    return [dict(r) for r in rows]

@router.get("/models/runs")
def get_model_runs(db: Session = Depends(get_db)):
    """Returns AI/ML model execution history and metrics."""
    from sqlalchemy import text
    import json
    rows = db.execute(text("""
        SELECT 
            run_id,
            model_name,
            model_type,
            model_version,
            parameters,
            metrics,
            run_status,
            started_at,
            finished_at
        FROM model_runs
        ORDER BY run_id DESC
    """)).mappings().all()
    results = []
    for r in rows:
        d = dict(r)
        if isinstance(d.get("parameters"), str):
            try:
                d["parameters"] = json.loads(d["parameters"])
            except Exception:
                pass
        if isinstance(d.get("metrics"), str):
            try:
                d["metrics"] = json.loads(d["metrics"])
            except Exception:
                pass
        results.append(d)
    return results

@router.get("/database/tables-summary")
def get_database_tables_summary(db: Session = Depends(get_db)):
    """Returns all 28 tables and their live record count in the MPLADS AI monitoring database."""
    from sqlalchemy import text
    tables_order = [
        ("roles", "Master user access roles with hierarchical permissions"),
        ("permissions", "Granular functional permissions and action capabilities"),
        ("role_permissions", "Mapping matrix of roles to permissions"),
        ("states", "State-level administrative jurisdictions"),
        ("districts", "District administrative collectorate units"),
        ("constituencies", "Parliamentary constituencies and MP tenure details"),
        ("departments", "Nodal departments and infrastructure wings"),
        ("implementing_agencies", "Executing agencies, ULBs, and engineering departments"),
        ("users", "System operators, MPs, collectors, nodal officers, admins"),
        ("projects", "Complete master project catalog with financial and physical progress"),
        ("works", "Backward-compatible project view for existing services"),
        ("sanctions", "Administrative, financial, and technical sanctions"),
        ("contractors", "Registered vendors, Class A contractors, and EPC firms"),
        ("contractor_performance", "Contractor ratings, delay records, quality, and variance"),
        ("expenditures", "Disbursed financial outlays and billing vouchers"),
        ("payments", "Direct RTGS/NEFT payment transactions and statuses"),
        ("progress_updates", "Field engineering inspection logs and physical progress"),
        ("assets", "Geotagged physical community assets and maintenance logs"),
        ("documents", "DPRs, sanction letters, contractor bills, audit reports"),
        ("data_sources", "External integrations (MoSPI Core, PFMS, GeM, Bhuvan ISRO)"),
        ("data_ingestion_logs", "Automated sync batches and ETL records"),
        ("anomalies", "Detected irregularities across 4 problem statement pillars"),
        ("duplicate_matches", "TF-IDF and semantic similarity duplicate work pairs"),
        ("risk_results", "Multi-factor ML risk evaluations and sub-scores"),
        ("risk_assessments", "Constituency risk dossiers and recommendations"),
        ("compliance_results", "Statutory guidelines checklist and non-compliance flags"),
        ("model_runs", "Machine learning execution registry, hyperparameters, metrics"),
        ("alerts", "Real-time automated warnings and escalation triggers"),
        ("verification_cases", "Investigation cases assigned to field vigilance officers"),
        ("audit_logs", "Immutable tamper-evident user activity and change ledger")
    ]
    summary = []
    for tbl, desc in tables_order:
        try:
            cnt = db.execute(text(f"SELECT COUNT(*) FROM {tbl}")).scalar()
            summary.append({
                "table_name": tbl,
                "description": desc,
                "record_count": cnt,
                "status": "ACTIVE"
            })
        except Exception:
            pass
    return {
        "total_tables": len(summary),
        "tables": summary
    }
