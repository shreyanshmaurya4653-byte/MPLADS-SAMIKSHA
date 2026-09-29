export const RISK_LEVELS = {
  HIGH: {
    label: 'High Risk',
    color: '#ef4444',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    badge: 'bg-rose-100 text-rose-800'
  },
  MEDIUM: {
    label: 'Medium Risk',
    color: '#f59e0b',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-800'
  },
  LOW: {
    label: 'Low Risk',
    color: '#10b981',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-800'
  }
};

export const ANOMALY_TYPES = {
  COST_OVERRUN: {
    label: 'Cost Overrun',
    color: 'bg-red-100 text-red-700 border-red-200',
    description: 'Expenditure exceeds sanctioned ceiling.'
  },
  EXPENDITURE_SPIKE: {
    label: 'Expenditure Spike',
    color: 'bg-rose-100 text-rose-700 border-rose-200',
    description: 'Rapid disproportionate disbursement.'
  },
  PROGRESS_PAYMENT_MISMATCH: {
    label: 'Payment-Progress Mismatch',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    description: 'Disbursements outpace ground physical progress.'
  },
  POSSIBLE_DUPLICATE: {
    label: 'Possible Duplicate',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    description: 'High lexical and geospatial overlap with existing work.'
  },
  DELAY: {
    label: 'Execution Delay',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    description: 'Breached planned completion deadline.'
  }
};
