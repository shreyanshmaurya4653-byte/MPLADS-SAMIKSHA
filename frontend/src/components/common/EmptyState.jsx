import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './Button';
import { useLanguage } from '../../hooks/useLanguage';

export function EmptyState({
  title = 'No records found',
  description = 'Try adjusting your filters or search term.',
  icon: Icon = Inbox,
  actionText,
  onAction
}) {
  const { tr } = useLanguage();

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl border border-dashed border-slate-200">
      <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-3">
        <Icon size={24} />
      </div>
      <h4 className="text-sm font-bold text-slate-800 mb-1">{tr(title)}</h4>
      <p className="text-xs text-slate-500 max-w-sm mb-4">{tr(description)}</p>
      {actionText && onAction && (
        <Button size="sm" variant="secondary" onClick={onAction}>
          {tr(actionText)}
        </Button>
      )}
    </div>
  );
}
