import re
from typing import Dict, List, Any


def clean_text(text: str) -> str:
    """
    Cleans and normalizes text such as tender titles and descriptions.

    The purpose is to make two pieces of text easier to compare.
    For example:

        "Road Construction, Phase-1!"
    
    becomes:

        "road construction phase 1"

    This is useful for duplicate detection and text similarity.
    """

    # If the value is None, empty, or otherwise evaluates to False,
    # return an empty string instead of trying to process it.
    #
    # Example:
    #     clean_text(None) -> ""
    #     clean_text("")   -> ""
    if not text:
        return ""

    # Convert the complete text to lowercase.
    #
    # This makes comparison case-insensitive.
    #
    # Example:
    #     "Tender Road Construction"
    # becomes:
    #     "tender road construction"
    text = text.lower()

    # Remove punctuation and special characters.
    #
    # [^\w\s] means:
    #     \w -> letters, numbers and underscore
    #     \s -> whitespace
    #     ^  -> NOT
    #
    # Therefore, anything that is NOT a word character or whitespace
    # is replaced with a space.
    #
    # Example:
    #     "Road-Construction, Phase #1!"
    # becomes approximately:
    #     "road construction  phase  1 "
    text = re.sub(r"[^\w\s]", " ", text)

    # Replace multiple spaces/tabs/newlines with a single space.
    #
    # Example:
    #     "road    construction\nphase"
    # becomes:
    #     "road construction phase"
    text = re.sub(r"\s+", " ", text)

    # Remove unnecessary spaces from the beginning and end.
    #
    # Example:
    #     "  road construction  "
    # becomes:
    #     "road construction"
    text = text.strip()

    # Return the final cleaned text.
    return text


def clean_financial_records(
    records: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Cleans financial/project records before they are inserted into
    the database or passed to the risk/anomaly detection system.

    Input:
        A list containing multiple dictionaries.

    Example:

        [
            {
                "estimated_cost": "500000",
                "sanctioned_amount": "450000",
                "released_amount": None,
                "expenditure": "200000",
                "physical_progress": 40,
                "payment_utilization": "44.4"
            }
        ]

    Output:

        [
            {
                "estimated_cost": 500000.0,
                "sanctioned_amount": 450000.0,
                "released_amount": 0.0,
                "expenditure": 200000.0,
                "physical_progress": 40.0,
                "payment_utilization": 44.4
            }
        ]
    """

    # Create an empty list.
    #
    # We will put each cleaned record into this list.
    cleaned = []

    # Process every record one by one.
    #
    # "r" represents the current record.
    #
    # Example:
    # records = [record1, record2, record3]
    #
    # The loop processes:
    # record1 -> r
    # record2 -> r
    # record3 -> r
    for r in records:

        # Create a copy of the current dictionary.
        #
        # We use dict(r) so that we don't directly modify the
        # original record provided by the caller.
        rec = dict(r)

        # ---------------------------------------------------------
        # ESTIMATED COST
        # ---------------------------------------------------------

        # Get the estimated cost from the record.
        #
        # If the value is missing or None, use 0.
        #
        # float() converts the value into a decimal number.
        #
        # Examples:
        #     "500000" -> 500000.0
        #     500000   -> 500000.0
        #     None     -> 0.0
        rec["estimated_cost"] = float(
            rec.get("estimated_cost") or 0.0
        )

        # ---------------------------------------------------------
        # SANCTIONED AMOUNT
        # ---------------------------------------------------------

        # Convert sanctioned amount into a floating-point number.
        #
        # Missing/None values are converted to 0.0.
        rec["sanctioned_amount"] = float(
            rec.get("sanctioned_amount") or 0.0
        )

        # ---------------------------------------------------------
        # RELEASED AMOUNT
        # ---------------------------------------------------------

        # Convert the released amount into float.
        #
        # Example:
        #     "250000" -> 250000.0
        #     None     -> 0.0
        rec["released_amount"] = float(
            rec.get("released_amount") or 0.0
        )

        # ---------------------------------------------------------
        # EXPENDITURE
        # ---------------------------------------------------------

        # Convert expenditure into float.
        #
        # This ensures that calculations can be performed later.
        #
        # For example:
        #
        # expenditure / sanctioned_amount
        #
        # would work correctly with numerical values.
        rec["expenditure"] = float(
            rec.get("expenditure") or 0.0
        )

        # ---------------------------------------------------------
        # PHYSICAL PROGRESS
        # ---------------------------------------------------------

        # Convert physical progress into a floating-point number.
        #
        # Physical progress should normally be between:
        #
        #     0%  and 100%
        #
        # However, bad data might contain:
        #
        #     -20
        #     150
        #     200
        #
        # We therefore restrict the value to the valid range.
        progress = float(
            rec.get("physical_progress") or 0.0
        )

        # max(0.0, progress)
        #
        # prevents the value from going below 0.
        #
        # Example:
        #     max(0, -20) -> 0
        #
        # min(100.0, ...)
        #
        # prevents the value from going above 100.
        #
        # Example:
        #     min(100, 150) -> 100
        #
        # Therefore:
        #
        #     -20 -> 0
        #      40 -> 40
        #     150 -> 100
        rec["physical_progress"] = max(
            0.0,
            min(100.0, progress)
        )

        # ---------------------------------------------------------
        # PAYMENT UTILIZATION
        # ---------------------------------------------------------

        # Convert payment utilization into a float.
        #
        # Example:
        #     "75.5" -> 75.5
        #
        # Missing values become 0.0.
        rec["payment_utilization"] = float(
            rec.get("payment_utilization") or 0.0
        )

        # Add the cleaned record to our output list.
        cleaned.append(rec)

    # After all records have been processed,
    # return the complete cleaned list.
    return cleaned