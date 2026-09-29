import React from 'react';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';

export function Loader({ text = 'Loading data...', className = '' }) {
  const { tr } = useLanguage();
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
      <p className="text-sm font-medium text-slate-500">{tr(text)}</p>
    </div>
  );
}
