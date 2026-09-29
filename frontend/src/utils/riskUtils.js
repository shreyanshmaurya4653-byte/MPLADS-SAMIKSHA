import { RISK_LEVELS } from '../constants/riskLevels';

export function getRiskColor(score) {
  if (score >= 70) return RISK_LEVELS.HIGH.color;
  if (score >= 40) return RISK_LEVELS.MEDIUM.color;
  return RISK_LEVELS.LOW.color;
}

export function getRiskBadgeConfig(level) {
  const norm = (level || 'LOW').toUpperCase();
  return RISK_LEVELS[norm] || RISK_LEVELS.LOW;
}

export function getRiskGradient(score) {
  if (score >= 70) return 'from-rose-500 to-red-600';
  if (score >= 40) return 'from-amber-500 to-orange-600';
  return 'from-emerald-500 to-teal-600';
}
