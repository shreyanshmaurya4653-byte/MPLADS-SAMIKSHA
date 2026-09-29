"""
MPLADS AI Engine: Similarity & Duplicate Detection Service
Performs pair-wise and target-based lexical, geospatial, and administrative similarity audits.
"""
import re
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from ..models.work import Work

def tokenize_and_clean(text: str) -> List[str]:
    if not text:
        return []
    tokens = re.findall(r'\b[a-zA-Z0-9]+\b', text.lower())
    stopwords = {"and", "the", "of", "in", "for", "to", "a", "an", "on", "at", "by", "with", "ward", "sector", "phase"}
    return [t for t in tokens if t not in stopwords and len(t) > 1]

def compute_jaccard_similarity(text_a: str, text_b: str) -> float:
    set_a = set(tokenize_and_clean(text_a))
    set_b = set(tokenize_and_clean(text_b))
    if not set_a or not set_b:
        return 0.0
    return round(len(set_a.intersection(set_b)) / len(set_a.union(set_b)), 3)

def compute_detailed_similarity(work_a: Dict[str, Any], work_b: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes a multi-dimensional similarity audit between two projects:
    1. Title & Scope Lexical Overlap (Jaccard + Token Cosine) - 45%
    2. Category & Sector Match - 20%
    3. Implementing Agency Match - 15%
    4. Cost Estimate Proximity - 10%
    5. Territorial / Administrative Jurisdiction Proximity - 10%
    """
    # 1. Text similarity
    title_sim = compute_jaccard_similarity(work_a.get("title", ""), work_b.get("title", "")) * 100.0
    desc_sim = compute_jaccard_similarity(work_a.get("description", ""), work_b.get("description", "")) * 100.0
    text_sim = round((title_sim * 0.7) + (desc_sim * 0.3), 1)

    # 2. Category match
    cat_match = work_a.get("category") == work_b.get("category")
    cat_score = 100.0 if cat_match else 0.0

    # 3. Agency match
    agency_a = (work_a.get("implementing_agency") or "").strip().lower()
    agency_b = (work_b.get("implementing_agency") or "").strip().lower()
    agency_match = bool(agency_a and agency_b and agency_a == agency_b)
    agency_score = 100.0 if agency_match else 0.0

    # 4. Cost proximity
    cost_a = float(work_a.get("sanctioned_amount") or work_a.get("estimated_cost") or 0.0)
    cost_b = float(work_b.get("sanctioned_amount") or work_b.get("estimated_cost") or 0.0)
    cost_variance_pct = 0.0
    if max(cost_a, cost_b) > 0:
        cost_variance_pct = round(abs(cost_a - cost_b) / max(cost_a, cost_b) * 100.0, 1)
        cost_sim = max(0.0, 100.0 - (cost_variance_pct * 1.5))
    else:
        cost_sim = 50.0

    # 5. Jurisdiction proximity (constituency & district)
    same_constituency = work_a.get("constituency_id") is not None and work_a.get("constituency_id") == work_b.get("constituency_id")
    same_district = work_a.get("district_id") is not None and work_a.get("district_id") == work_b.get("district_id")
    if same_constituency:
        jurisdiction_sim = 100.0
    elif same_district:
        jurisdiction_sim = 60.0
    else:
        jurisdiction_sim = 20.0

    # Composite score
    composite = (
        (text_sim * 0.45) +
        (cat_score * 0.20) +
        (agency_score * 0.15) +
        (cost_sim * 0.10) +
        (jurisdiction_sim * 0.10)
    )
    composite = round(min(100.0, max(0.0, composite)), 1)

    # Risk tier & Recommendation
    if composite >= 75.0:
        risk_level = "High"
        recommendation = "Severe duplicate risk! Highly similar scope and executing agency. On-site verification mandatory before sanctioning additional funds."
    elif composite >= 50.0:
        risk_level = "Medium"
        recommendation = "Moderate project overlap. Review detailed project estimates and verify GIS coordinates to rule out duplicate asset creation."
    else:
        risk_level = "Low"
        recommendation = "Distinct project profile. Nominal overlap consistent with standard civic infrastructure norms."

    return {
        "composite_similarity": composite,
        "risk_level": risk_level,
        "text_similarity": text_sim,
        "category_match": cat_match,
        "agency_match": agency_match,
        "cost_similarity": round(cost_sim, 1),
        "cost_variance_pct": cost_variance_pct,
        "jurisdiction_similarity": jurisdiction_sim,
        "recommendation": recommendation,
        "shared_attributes": [
            f"Category: {work_a.get('category')}" if cat_match else "Different categories",
            f"Agency: {work_a.get('implementing_agency')}" if agency_match else "Different agencies",
            f"Cost Variance: {cost_variance_pct}%"
        ]
    }

def get_all_duplicate_pairs(db: Session, min_threshold: float = 40.0) -> List[Dict[str, Any]]:
    """Scans all works in the database to identify duplicate and high-similarity pairs."""
    works = db.query(Work).all()
    pairs = []

    work_dicts = [
        {
            "id": w.id,
            "title": w.title,
            "description": w.description,
            "category": w.category,
            "implementing_agency": w.implementing_agency,
            "sanctioned_amount": w.sanctioned_amount,
            "estimated_cost": w.estimated_cost,
            "expenditure": w.expenditure,
            "status": w.status,
            "constituency_id": w.constituency_id,
            "district_id": w.district_id
        }
        for w in works
    ]

    for i in range(len(work_dicts)):
        for j in range(i + 1, len(work_dicts)):
            w1 = work_dicts[i]
            w2 = work_dicts[j]
            sim = compute_detailed_similarity(w1, w2)
            if sim["composite_similarity"] >= min_threshold:
                pairs.append({
                    "work_a": w1,
                    "work_b": w2,
                    "similarity": sim
                })

    return sorted(pairs, key=lambda x: x["similarity"]["composite_similarity"], reverse=True)

def get_work_similarities(db: Session, work_id: str) -> List[Dict[str, Any]]:
    """Returns all candidate matches for a single project sorted by similarity."""
    target = db.query(Work).filter(Work.id == work_id).first()
    if not target:
        return []

    target_dict = {
        "id": target.id,
        "title": target.title,
        "description": target.description,
        "category": target.category,
        "implementing_agency": target.implementing_agency,
        "sanctioned_amount": target.sanctioned_amount,
        "estimated_cost": target.estimated_cost,
        "expenditure": target.expenditure,
        "status": target.status,
        "constituency_id": target.constituency_id,
        "district_id": target.district_id
    }

    candidates = db.query(Work).filter(Work.id != work_id).all()
    results = []

    for c in candidates:
        c_dict = {
            "id": c.id,
            "title": c.title,
            "description": c.description,
            "category": c.category,
            "implementing_agency": c.implementing_agency,
            "sanctioned_amount": c.sanctioned_amount,
            "estimated_cost": c.estimated_cost,
            "expenditure": c.expenditure,
            "status": c.status,
            "constituency_id": c.constituency_id,
            "district_id": c.district_id
        }
        sim = compute_detailed_similarity(target_dict, c_dict)
        results.append({
            "candidate": c_dict,
            "similarity": sim
        })

    return sorted(results, key=lambda x: x["similarity"]["composite_similarity"], reverse=True)
