import React from 'react';
import { Link } from 'react-router-dom';
import { AlertOctagon, Home } from 'lucide-react';
import { Button } from '../components/common/Button';

export function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
        <AlertOctagon size={32} />
      </div>
      <h2 className="text-2xl font-black text-slate-900 mb-1">Page Not Found</h2>
      <p className="text-xs text-slate-400 max-w-sm mb-6">
        The requested portal view does not exist or has been reassigned to a different administrative tier.
      </p>
      <Link to="/dashboard">
        <Button variant="primary" icon={Home}>
          Return to Dashboard
        </Button>
      </Link>
    </div>
  );
}
