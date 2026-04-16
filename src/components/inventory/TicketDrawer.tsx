import React, { useState } from 'react';
import { Drawer } from '@/components/shared/UIComponents';
import { toast } from 'sonner';
import { Ticket, Calendar, User, AlertTriangle } from 'lucide-react';

interface TicketDrawerProps {
  open: boolean;
  onClose: () => void;
  context?: {
    objectName?: string;
    objectType?: string;
    algorithm?: string;
    status?: string;
    daysToExpiry?: number;
    environment?: string;
    suggestedAction?: string;
  };
}

const ticketTypes = ['Renewal', 'Rotation', 'Ownership Assignment', 'PQC Migration', 'Compliance Remediation', 'Custom'];

function deriveSuggestedAction(ctx: TicketDrawerProps['context']): { type: string; title: string; description: string; priority: string } {
  if (!ctx) return { type: 'Custom', title: '', description: '', priority: 'Medium' };
  const { status, daysToExpiry, algorithm, objectName, objectType, environment } = ctx;

  if (status === 'Expired' || (daysToExpiry !== undefined && daysToExpiry >= 0 && daysToExpiry <= 7)) {
    return {
      type: 'Renewal',
      title: `Renew ${objectName || 'certificate'} — expiring in ${daysToExpiry}d`,
      description: `${objectType || 'Certificate'} "${objectName}" in ${environment || 'Production'} expires in ${daysToExpiry} days. Immediate renewal required to prevent service disruption. Algorithm: ${algorithm || 'Unknown'}.`,
      priority: 'Critical',
    };
  }
  if (algorithm?.includes('RSA-2048') || algorithm?.includes('SHA-1')) {
    return {
      type: 'PQC Migration',
      title: `Migrate ${objectName || 'object'} from ${algorithm} — quantum-vulnerable`,
      description: `${objectType || 'Object'} "${objectName}" uses ${algorithm}, which is quantum-vulnerable per NIST guidance. Plan migration to ML-DSA or equivalent PQC algorithm. Environment: ${environment || 'Unknown'}.`,
      priority: 'High',
    };
  }
  if (status === 'Orphaned') {
    return {
      type: 'Ownership Assignment',
      title: `Assign owner for orphaned ${objectType?.toLowerCase() || 'object'} — ${objectName}`,
      description: `${objectType || 'Object'} "${objectName}" has no assigned owner and has been flagged as orphaned. Assign to the appropriate team and enforce rotation policy.`,
      priority: 'High',
    };
  }
  return {
    type: ctx.suggestedAction ? 'Compliance Remediation' : 'Custom',
    title: ctx.suggestedAction ? `${ctx.suggestedAction} — ${objectName}` : `Action required: ${objectName}`,
    description: `${objectType || 'Object'} "${objectName}" requires attention. Environment: ${environment || 'Unknown'}. Algorithm: ${algorithm || 'N/A'}.`,
    priority: 'Medium',
  };
}

export default function TicketDrawer({ open, onClose, context }: TicketDrawerProps) {
  const derived = deriveSuggestedAction(context);
  const [ticketType, setTicketType] = useState(derived.type);
  const [title, setTitle] = useState(derived.title);
  const [description, setDescription] = useState(derived.description);
  const [assignee, setAssignee] = useState('');
  const [priority, setPriority] = useState(derived.priority);
  const [dueDate, setDueDate] = useState('');

  // Reset form when context changes
  React.useEffect(() => {
    const d = deriveSuggestedAction(context);
    setTicketType(d.type);
    setTitle(d.title);
    setDescription(d.description);
    setPriority(d.priority);
  }, [context?.objectName]);

  const handleSave = () => {
    toast.success(`Ticket created: ${title}`, { description: 'Track in Ticket Management →', action: { label: 'View', onClick: () => {} } });
    onClose();
  };

  const priorityColors: Record<string, string> = {
    Critical: 'bg-coral/10 text-coral border-coral/30',
    High: 'bg-amber/10 text-amber border-amber/30',
    Medium: 'bg-purple/10 text-purple border-purple/30',
    Low: 'bg-teal/10 text-teal border-teal/30',
  };

  return (
    <Drawer open={open} onClose={onClose} title="Create Ticket">
      <div className="space-y-4">
        {/* Context banner */}
        {context?.objectName && (
          <div className="bg-secondary/50 rounded-lg p-3 flex items-center gap-2 text-xs">
            <Ticket className="w-4 h-4 text-teal flex-shrink-0" />
            <div>
              <span className="text-muted-foreground">Creating ticket for: </span>
              <span className="font-medium text-foreground">{context.objectName}</span>
              <span className="text-muted-foreground"> · {context.objectType} · {context.environment}</span>
            </div>
          </div>
        )}

        {/* Ticket type */}
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Ticket Type</label>
          <div className="flex flex-wrap gap-1.5">
            {ticketTypes.map(t => (
              <button key={t} onClick={() => setTicketType(t)}
                className={`px-2.5 py-1.5 rounded text-[10px] font-medium border transition-colors ${ticketType === t ? 'border-teal bg-teal/10 text-teal' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            className="w-full px-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal" />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
            className="w-full px-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal resize-none" />
        </div>

        {/* Priority + Assignee row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Priority</label>
            <div className="flex gap-1">
              {['Critical', 'High', 'Medium', 'Low'].map(p => (
                <button key={p} onClick={() => setPriority(p)}
                  className={`flex-1 px-1.5 py-1.5 rounded text-[10px] font-medium border transition-colors ${priority === p ? priorityColors[p] : 'border-border text-muted-foreground'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Assignee</label>
            <select value={assignee} onChange={e => setAssignee(e.target.value)}
              className="w-full px-3 py-2 bg-muted border border-border rounded text-xs text-foreground">
              <option value="">Select assignee...</option>
              <option>Sarah Chen</option>
              <option>Mike Rodriguez</option>
              <option>Lisa Park</option>
              <option>James Wilson</option>
              <option>Platform Team</option>
              <option>Security Team</option>
              <option>DevOps</option>
            </select>
          </div>
        </div>

        {/* Due date */}
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Due Date</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
            className="w-full px-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal" />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-xs rounded-lg border border-border hover:bg-secondary">Cancel</button>
          <button onClick={handleSave} className="flex-1 px-4 py-2 text-xs rounded-lg bg-teal text-primary-foreground hover:opacity-90 font-medium">Create Ticket</button>
        </div>
      </div>
    </Drawer>
  );
}
