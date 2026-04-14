import React from 'react';
import { useNav } from '@/context/NavigationContext';
import { AlertTriangle } from 'lucide-react';

export default function QuantumBanner() {
  const { setCurrentPage } = useNav();
  return (
    <div className="h-8 bg-amber/10 border-t border-amber/20 flex items-center justify-center px-4 flex-shrink-0 quantum-pulse">
      <div className="flex items-center gap-2 text-xs text-amber">
        <AlertTriangle className="w-3 h-3" />
        <span>
          Quantum posture: 12,847 assets vulnerable to cryptographically relevant quantum attack — NIST 2030 deadline 1,361 days away —{' '}
          <button onClick={() => setCurrentPage('quantum')} className="underline font-medium hover:text-amber-light">
            View migration plan →
          </button>
        </span>
      </div>
    </div>
  );
}
