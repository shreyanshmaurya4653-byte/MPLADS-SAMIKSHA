import sys
import os
import json
import time
import argparse

# Add root of ai-engine to sys.path
sys.path.append(os.path.dirname(__file__))

from preprocessing.load_data import load_data_from_db
from preprocessing.clean_data import clean_financial_records
from preprocessing.transform_data import compute_duration_metrics
from risk_engine.risk_scoring import calculate_composite_risk, BatchRiskEngine
from risk_engine.risk_classification import classify_risk_tier
from risk_engine.risk_explanation import generate_risk_explanations

def execute_pipeline(db_path: str = "database/mplads.db", limit: int = 150, offset: int = 0):
    print("=" * 65)
    print("   Running Optimized MPLADS Machine Learning Anomaly Pipeline   ")
    print("=" * 65)

    start_t0 = time.time()
    raw_works = load_data_from_db(db_path, limit=limit, offset=offset)
    if not raw_works:
        print(f"No records found in database at {db_path}.")
        return []

    cleaned_works = clean_financial_records(raw_works)
    processed_works = [compute_duration_metrics(w) for w in cleaned_works]

    t_prep = time.time() - start_t0
    print(f"Loaded and preprocessed {len(processed_works)} works in {t_prep:.2f}s.\n")

    # Initialize batch risk engine with inverted candidate index
    t_index_start = time.time()
    engine = BatchRiskEngine(processed_works)
    t_index = time.time() - t_index_start

    results = []
    t_assess_start = time.time()
    for work in processed_works:
        risk_data = engine.assess_work(work)
        tier = classify_risk_tier(risk_data["risk_score"])
        explanations = generate_risk_explanations(work, risk_data)

        summary = {
            "id": work["id"],
            "title": work["title"],
            "risk_score": risk_data["risk_score"],
            "risk_level": tier,
            "cost_risk": risk_data["cost_risk"],
            "delay_risk": risk_data["delay_risk"],
            "anomalies": risk_data["anomalies"],
            "explanations": explanations
        }
        results.append(summary)

        print(f"[{summary['risk_level'].upper():6}] {summary['id']:8} - {summary['title'][:32]:32} | Score: {summary['risk_score']:4.1f} | Anomalies: {summary['anomalies']}")

    total_time = time.time() - start_t0
    assess_time = time.time() - t_assess_start
    throughput = len(processed_works) / max(0.001, assess_time)

    print("\n" + "=" * 65)
    print(f"   Pipeline Completed: {len(results)} works assessed in {total_time:.2f}s ({throughput:.0f} works/sec)   ")
    print("=" * 65)
    return results

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MPLADS AI Anomaly Detection Pipeline")
    parser.add_argument("--limit", type=int, default=150, help="Number of works to assess (default: 150)")
    parser.add_argument("--offset", type=int, default=0, help="Offset for pagination (default: 0)")
    parser.add_argument("--db", type=str, default="database/mplads.db", help="Path to database")
    args = parser.parse_args()

    execute_pipeline(db_path=args.db, limit=args.limit, offset=args.offset)

