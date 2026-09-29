def format_currency_inr(amount: float) -> str:
    """Formats numeric amount into Indian Currency notation (Crores, Lakhs, Thousands)."""
    if amount is None:
        return "₹0"
    if amount >= 10000000:
        return f"₹{amount / 10000000:.2f} Cr"
    elif amount >= 100000:
        return f"₹{amount / 100000:.2f} Lakh"
    return f"₹{amount:,.0f}"

def calculate_utilization_ratio(expenditure: float, sanctioned: float) -> float:
    if not sanctioned or sanctioned <= 0:
        return 0.0
    return round((expenditure / sanctioned) * 100.0, 2)
