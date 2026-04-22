import React, { useMemo, useState } from 'react';
import { Info, RefreshCw, Search, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { mockAssets } from '@/data/mockData';

const allCerts = mockAssets.filter((a) => a.type.includes('Certificate'));

const CIPHER_ROWS = [
  { name: 'TLS_AKE_WITH_AES_256_GCM_SHA384', protocol: 'TLSv1.3', endpoints: 847, strength: 'Strong' },
  { name: 'TLS_AKE_WITH_AES_128_GCM_SHA256', protocol: 'TLSv1.3', endpoints: 623, strength: 'Strong' },
  { name: 'TLS_ECDHE_RSA_WITH_AES_256_GCM', protocol: 'TLSv1.2', endpoints: 412, strength: 'Strong' },
  { name: 'TLS_ECDHE_RSA_WITH_AES_128_GCM', protocol: 'TLSv1.2', endpoints: 334, strength: 'Strong' },
  { name: 'TLS_RSA_WITH_AES_256_CBC_SHA256', protocol: 'TLSv1.2', endpoints: 189, strength: 'Weak' },
  { name: 'TLS_RSA_WITH_AES_128_CBC_SHA', protocol: 'TLSv1.2', endpoints: 156, strength: 'Weak' },
  { name: 'TLS_RSA_WITH_RC4_128_SHA', protocol: 'TLSv1.0', endpoints: 67, strength: 'Deprecated' },
  { name: 'TLS_RSA_WITH_3DES_EDE_CBC_SHA', protocol: 'TLSv1.0', endpoints: 45, strength: 'Deprecated' },
  { name: 'TLS_ECDHE_ECDSA_WITH_AES_256_GCM', protocol: 'TLSv1.3', endpoints: 234, strength: 'Strong' },
  { name: 'TLS_DHE_RSA_WITH_AES_256_GCM_SHA384', protocol: 'TLSv1.2', endpoints: 123, strength: 'Strong' },
] as const;

type CipherSuiteTableProps = {
  openModal?: (title: string, certs: any[]) => void;
};

function getStrengthBadge(strength: string) {
  if (strength === 'Strong') return 'bg-teal/15 text-teal';
  if (strength === 'Weak') return 'bg-amber/15 text-amber';
  if (strength === 'Deprecated') return 'bg-coral/15 text-coral';
  return 'bg-secondary text-muted-foreground';
}

export default function CipherSuiteTable({ openModal }: CipherSuiteTableProps) {
  const [query, setQuery] = useState('');

  const rows = useMemo(
    () => CIPHER_ROWS.filter((row) => row.name.toLowerCase().includes(query.toLowerCase())),
    [query]
  );

  const openEndpoints = (name: string, endpoints: number) => {
    if (endpoints === 0) {
      toast.info('No certificates in this category');
      return;
    }
    openModal?.('Cipher Suite: ' + name, allCerts.slice(0, endpoints > allCerts.length ? allCerts.length : endpoints));
  };

  const openWeakCipher = (name: string) => {
    const certs = allCerts.filter((a) => a.policyViolations > 0);
    if (!certs.length) {
      toast.info('No certificates in this category');
      return;
    }
    openModal?.('Weak/Deprecated Cipher: ' + name, certs);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Cipher Suite</h3>
          <button type="button" className="text-muted-foreground transition-colors hover:text-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>1 to 25 of 87</span>
            <button type="button" onClick={() => toast.success('Cipher suite table refreshed')} className="transition-colors hover:text-foreground">
              <RefreshCw className="h-3 w-3" />
            </button>
            <Info className="h-3 w-3" />
          </div>
          <label className="relative block w-56">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search cipher suite"
              className="w-full rounded-lg border border-border bg-secondary/30 py-1.5 pl-8 pr-3 text-xs text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 font-medium">Name</th>
              <th className="py-2 font-medium">Protocol Version</th>
              <th className="py-2 font-medium">Endpoint counts</th>
              <th className="py-2 font-medium">Strength</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const weakRow = row.strength === 'Weak' || row.strength === 'Deprecated';
              return (
                <tr key={row.name} className="border-b border-border last:border-0 hover:bg-secondary/30">
                  <td className="max-w-[320px] py-2 pr-3 font-mono text-xs text-foreground truncate">
                    {weakRow ? (
                      <button type="button" onClick={() => openWeakCipher(row.name)} className="max-w-full truncate text-left text-foreground transition-colors hover:text-teal">
                        {row.name}
                      </button>
                    ) : (
                      row.name
                    )}
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground">{row.protocol}</td>
                  <td className="py-2 pr-3">
                    <button type="button" onClick={() => openEndpoints(row.name, row.endpoints)} className="text-teal transition-colors hover:text-teal/80">
                      {row.endpoints.toLocaleString()}
                    </button>
                  </td>
                  <td className="py-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${getStrengthBadge(row.strength)}`}>
                      {row.strength}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
