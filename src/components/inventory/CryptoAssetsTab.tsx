import React, { useState, useMemo } from 'react';
import { Network, Package, ChevronRight, X, ShieldAlert, Server, Ticket, ArrowUpRight, AlertTriangle } from 'lucide-react';
import { mockProtocols, mockLibraries, ProtocolAsset, LibraryAsset, StackSeverity, CipherSuite } from '@/data/cryptoStackMockData';
import { mockITAssets } from '@/data/inventoryMockData';

const SEV_TEXT: Record<StackSeverity, string> = {
  Critical: 'text-coral', High: 'text-coral', Medium: 'text-amber', Low: 'text-teal',
};
const SEV_DOT: Record<StackSeverity, string> = {
  Critical: 'bg-coral', High: 'bg-coral', Medium: 'bg-amber', Low: 'bg-teal',
};
const crsColor = (n: number) => n >= 80 ? 'text-coral bg-coral/12' : n >= 60 ? 'text-coral bg-coral/10' : n >= 30 ? 'text-amber bg-amber/12' : 'text-teal bg-teal/12';
const suiteColor: Record<CipherSuite['strength'], string> = {
  Strong: 'text-teal', Weak: 'text-amber', Insecure: 'text-coral',
};

const assetByFqdn = (fqdn: string) => mockITAssets.find(a => a.name === fqdn);

function SevTag({ s }: { s: StackSeverity }) {
  return <span className="inline-flex items-center gap-1.5"><span className={`w-1.5 h-1.5 rounded-full ${SEV_DOT[s]}`} /><span className={`text-[10px] font-semibold uppercase tracking-wide ${SEV_TEXT[s]}`}>{s}</span></span>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{title}</span>
        <div className="flex-1 h-px bg-border" />
      </div>
      {children}
    </div>
  );
}

function ProtocolPanel({ p, onClose, onCreateTicket }: { p: ProtocolAsset; onClose: () => void; onCreateTicket: (ctx: unknown) => void }) {
  const asset = assetByFqdn(p.fqdn);
  const accent = p.crs >= 80 ? 'hsl(16 72% 51%)' : p.crs >= 60 ? 'hsl(38 78% 51%)' : 'hsl(162 72% 42%)';
  return (
    <div className="w-[420px] flex-shrink-0 bg-card flex flex-col animate-in slide-in-from-right-2 duration-150" style={{ borderLeft: `3px solid ${accent}` }}>
      <div className="flex items-start gap-2 px-4 py-3 border-b border-border">
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-mono text-foreground truncate">{p.fqdn}:{p.port}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] font-semibold text-foreground">{p.protocol} {p.version.replace(p.protocol, '').trim() || p.version}</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded tabular-nums ${crsColor(p.crs)}`}>CRS {p.crs}</span>
            <SevTag s={p.severity} />
          </div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 space-y-4">
        <Section title="Negotiated cipher suites">
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1fr_auto] gap-2 px-2.5 py-1.5 bg-secondary/40 text-[9px] uppercase tracking-wide text-muted-foreground">
              <span>Suite · KEX · Auth · Enc · MAC</span><span>Strength</span>
            </div>
            {p.cipherSuites.map(c => (
              <div key={c.id} className="grid grid-cols-[1fr_auto] gap-2 px-2.5 py-2 border-t border-border/50">
                <div className="min-w-0">
                  <div className="text-[11px] font-mono text-foreground truncate">{c.name}</div>
                  <div className="text-[9.5px] text-muted-foreground">{c.kex} · {c.auth} · {c.enc} · {c.mac} · {c.id}</div>
                </div>
                <span className={`text-[10px] font-semibold ${suiteColor[c.strength]}`}>{c.strength}</span>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-muted-foreground mt-2">Key exchange: <span className="text-foreground">{p.kexStrength}</span></div>
        </Section>

        <Section title="Risk & policy">
          <div className="flex flex-wrap gap-1.5">
            {p.policyViolations.length === 0
              ? <span className="text-[10px] text-teal">No policy violations</span>
              : p.policyViolations.map(v => (
                <span key={v} className="inline-flex items-center gap-1 text-[10px] text-coral bg-coral/10 px-1.5 py-0.5 rounded"><ShieldAlert className="w-3 h-3" /> {v}</span>
              ))}
          </div>
        </Section>

        <Section title="Binding">
          {p.bound && asset ? (
            <div className="flex items-center gap-2 text-[11px]">
              <Server className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-foreground font-mono">{asset.name}</span>
              <span className="text-muted-foreground">· {asset.type} · {p.exposure}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[11px] text-amber">
              <AlertTriangle className="w-3.5 h-3.5" /> Unbound: host not in IT asset inventory (shadow host)
            </div>
          )}
        </Section>

        <Section title="Provenance">
          <div className="text-[10px] text-muted-foreground">Discovered by <span className="text-foreground">{p.discoverySource}</span> · last seen {p.lastSeen} · owner <span className="text-foreground">{p.owner}</span> · {p.team}</div>
        </Section>
      </div>

      <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border">
        <span className="text-[10px] text-muted-foreground flex-1">Raises one ticket for this endpoint, routed by team</span>
        <button onClick={() => onCreateTicket({ kind: 'protocol', object: p })} className="inline-flex items-center gap-1 text-[11px] font-medium px-3 py-1 rounded-md bg-teal text-primary-foreground hover:bg-teal-light"><Ticket className="w-3 h-3" /> Raise ticket</button>
      </div>
    </div>
  );
}

function LibraryPanel({ l, onClose, onCreateTicket }: { l: LibraryAsset; onClose: () => void; onCreateTicket: (ctx: unknown) => void }) {
  const accent = l.crs >= 80 ? 'hsl(16 72% 51%)' : l.crs >= 60 ? 'hsl(38 78% 51%)' : 'hsl(162 72% 42%)';
  return (
    <div className="w-[420px] flex-shrink-0 bg-card flex flex-col animate-in slide-in-from-right-2 duration-150" style={{ borderLeft: `3px solid ${accent}` }}>
      <div className="flex items-start gap-2 px-4 py-3 border-b border-border">
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-mono text-foreground truncate">{l.name} {l.version}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-muted-foreground">{l.provider}</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded tabular-nums ${crsColor(l.crs)}`}>CRS {l.crs}</span>
            <SevTag s={l.severity} />
          </div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 space-y-4">
        <Section title="Lifecycle">
          <div className="flex items-center gap-2 text-[11px]">
            <span className={l.eolStatus === 'End-of-Life' ? 'text-coral font-semibold' : l.eolStatus === 'Outdated' ? 'text-amber font-semibold' : 'text-teal font-semibold'}>{l.eolStatus}</span>
            <span className="text-muted-foreground">{l.eolDate !== 'Active' ? `since ${l.eolDate}` : ''} · recommended {l.latestSafe}</span>
          </div>
        </Section>

        <Section title={`Known vulnerabilities (${l.cveCount})`}>
          {l.cves.length === 0 ? <span className="text-[10px] text-teal">No known CVEs</span> : (
            <div className="space-y-1.5">
              {l.cves.map(c => (
                <div key={c.id} className="flex items-start gap-2">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded tabular-nums ${c.cvss >= 7 ? 'text-coral bg-coral/10' : 'text-amber bg-amber/10'}`}>{c.cvss.toFixed(1)}</span>
                  <div className="min-w-0"><div className="text-[11px] font-mono text-foreground">{c.id}</div><div className="text-[10px] text-muted-foreground">{c.title}</div></div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title={`Assets affected (${l.assetsAffected.length})`}>
          <div className="space-y-1">
            {l.assetsAffected.map(fqdn => {
              const a = assetByFqdn(fqdn);
              return (
                <div key={fqdn} className="flex items-center gap-2 text-[11px]">
                  <Server className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <span className="text-foreground font-mono truncate">{fqdn}</span>
                  {a && <span className="text-muted-foreground">· {a.type}</span>}
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="Implements">
          <div className="flex flex-wrap gap-1">
            {l.implementsList.map(i => <span key={i} className="text-[10px] text-muted-foreground bg-secondary/60 px-1.5 py-0.5 rounded">{i}</span>)}
          </div>
        </Section>

        <Section title="Reachability & policy">
          <div className="flex items-center gap-2 text-[11px] mb-1.5">
            <span className={l.inUse ? 'text-coral' : 'text-muted-foreground'}>{l.inUse ? 'Reached in production' : 'Dormant (not reached)'}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {l.policyViolations.length === 0 ? <span className="text-[10px] text-teal">No policy violations</span> : l.policyViolations.map(v => (
              <span key={v} className="inline-flex items-center gap-1 text-[10px] text-coral bg-coral/10 px-1.5 py-0.5 rounded"><ShieldAlert className="w-3 h-3" /> {v}</span>
            ))}
          </div>
        </Section>
      </div>

      <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border">
        <span className="text-[10px] text-muted-foreground flex-1">Upgrade tracked across {l.assetsAffected.length} host{l.assetsAffected.length === 1 ? '' : 's'}</span>
        <button onClick={() => onCreateTicket({ kind: 'library', object: l })} className="inline-flex items-center gap-1 text-[11px] font-medium px-3 py-1 rounded-md bg-teal text-primary-foreground hover:bg-teal-light"><Ticket className="w-3 h-3" /> Raise ticket</button>
      </div>
    </div>
  );
}

export default function CryptoAssetsTab({ onCreateTicket }: { onCreateTicket: (ctx: unknown) => void }) {
  const [view, setView] = useState<'protocols' | 'libraries'>('protocols');
  const [openProto, setOpenProto] = useState<string | null>(null);
  const [openLib, setOpenLib] = useState<string | null>(null);

  const protocols = useMemo(() => [...mockProtocols].sort((a, b) => b.crs - a.crs), []);
  const libraries = useMemo(() => [...mockLibraries].sort((a, b) => b.crs - a.crs), []);
  const drawerProto = openProto ? protocols.find(p => p.id === openProto) : null;
  const drawerLib = openLib ? libraries.find(l => l.id === openLib) : null;
  const dimmed = !!(drawerProto || drawerLib);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
        <div className="inline-flex rounded-lg border border-border overflow-hidden">
          <button onClick={() => { setView('protocols'); setOpenLib(null); }} className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 transition-colors ${view === 'protocols' ? 'bg-teal text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}><Network className="w-3.5 h-3.5" /> Protocols <span className="opacity-70">{protocols.length}</span></button>
          <button onClick={() => { setView('libraries'); setOpenProto(null); }} className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 transition-colors ${view === 'libraries' ? 'bg-teal text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}><Package className="w-3.5 h-3.5" /> Libraries <span className="opacity-70">{libraries.length}</span></button>
        </div>
        <span className="ml-auto text-[10px] text-muted-foreground">Discovered via Tenable, Qualys, and CBOM ingestion</span>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className={`flex-1 overflow-auto scrollbar-thin transition-opacity ${dimmed ? 'opacity-45' : ''}`}>
          {view === 'protocols' ? (
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-card z-[1]">
                <tr className="text-[9.5px] uppercase tracking-wide text-muted-foreground border-b border-border">
                  <th className="py-2 px-3 font-medium">Protocol / Version</th>
                  <th className="py-2 px-3 font-medium">Endpoint</th>
                  <th className="py-2 px-3 font-medium">Weakest cipher</th>
                  <th className="py-2 px-3 font-medium">Key exchange</th>
                  <th className="py-2 px-3 font-medium">Exposure</th>
                  <th className="py-2 px-3 font-medium text-center">CRS</th>
                  <th className="py-2 px-3 font-medium">Severity</th>
                  <th className="py-2 px-3 font-medium">Violations</th>
                  <th className="py-2 px-3 font-medium">Source</th>
                  <th className="py-2 px-2" />
                </tr>
              </thead>
              <tbody>
                {protocols.map(p => {
                  const weakest = [...p.cipherSuites].sort((a, b) => ({ Insecure: 0, Weak: 1, Strong: 2 })[a.strength] - ({ Insecure: 0, Weak: 1, Strong: 2 })[b.strength])[0];
                  return (
                    <tr key={p.id} onClick={() => setOpenProto(p.id)} className={`border-b border-border/40 hover:bg-secondary/30 cursor-pointer ${openProto === p.id ? 'bg-secondary/40' : ''}`}>
                      <td className="py-2.5 px-3"><span className="text-[12px] text-foreground font-medium">{p.protocol} {p.version.replace(p.protocol, '').trim() || p.version}</span></td>
                      <td className="py-2.5 px-3"><span className="text-[11px] font-mono text-muted-foreground">{p.fqdn}:{p.port}</span>{!p.bound && <span className="ml-1.5 text-[9px] text-amber">unbound</span>}</td>
                      <td className="py-2.5 px-3"><span className={`text-[11px] ${suiteColor[weakest.strength]}`}>{weakest.enc}</span></td>
                      <td className="py-2.5 px-3"><span className="text-[11px] text-muted-foreground">{p.kexStrength}</span></td>
                      <td className="py-2.5 px-3"><span className={`text-[11px] ${p.exposure === 'Internet-facing' ? 'text-coral' : 'text-muted-foreground'}`}>{p.exposure}</span></td>
                      <td className="py-2.5 px-3 text-center"><span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded tabular-nums ${crsColor(p.crs)}`}>{p.crs}</span></td>
                      <td className="py-2.5 px-3"><SevTag s={p.severity} /></td>
                      <td className="py-2.5 px-3"><span className="text-[11px] text-muted-foreground">{p.policyViolations.length || '0'}</span></td>
                      <td className="py-2.5 px-3"><span className="text-[10px] text-muted-foreground">{p.discoverySource}</span></td>
                      <td className="py-2.5 px-2"><ChevronRight className="w-3.5 h-3.5 text-muted-foreground" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-card z-[1]">
                <tr className="text-[9.5px] uppercase tracking-wide text-muted-foreground border-b border-border">
                  <th className="py-2 px-3 font-medium">Library / Version</th>
                  <th className="py-2 px-3 font-medium">Provider</th>
                  <th className="py-2 px-3 font-medium">EOL</th>
                  <th className="py-2 px-3 font-medium text-center">CVEs</th>
                  <th className="py-2 px-3 font-medium text-center">Assets</th>
                  <th className="py-2 px-3 font-medium">In use</th>
                  <th className="py-2 px-3 font-medium text-center">CRS</th>
                  <th className="py-2 px-3 font-medium">Severity</th>
                  <th className="py-2 px-3 font-medium">Source</th>
                  <th className="py-2 px-2" />
                </tr>
              </thead>
              <tbody>
                {libraries.map(l => (
                  <tr key={l.id} onClick={() => setOpenLib(l.id)} className={`border-b border-border/40 hover:bg-secondary/30 cursor-pointer ${openLib === l.id ? 'bg-secondary/40' : ''}`}>
                    <td className="py-2.5 px-3"><span className="text-[12px] text-foreground font-medium font-mono">{l.name} {l.version}</span></td>
                    <td className="py-2.5 px-3"><span className="text-[11px] text-muted-foreground">{l.provider}</span></td>
                    <td className="py-2.5 px-3"><span className={`text-[11px] ${l.eolStatus === 'End-of-Life' ? 'text-coral' : l.eolStatus === 'Outdated' ? 'text-amber' : 'text-teal'}`}>{l.eolStatus}</span></td>
                    <td className="py-2.5 px-3 text-center"><span className={`text-[11px] ${l.maxCvss >= 7 ? 'text-coral' : l.cveCount ? 'text-amber' : 'text-muted-foreground'}`}>{l.cveCount ? `${l.cveCount} · ${l.maxCvss.toFixed(1)}` : '0'}</span></td>
                    <td className="py-2.5 px-3 text-center"><span className="inline-flex items-center gap-1 text-[11px] text-foreground"><ArrowUpRight className="w-3 h-3 text-muted-foreground" />{l.assetsAffected.length}</span></td>
                    <td className="py-2.5 px-3"><span className={`text-[11px] ${l.inUse ? 'text-coral' : 'text-muted-foreground'}`}>{l.inUse ? 'In use' : 'Dormant'}</span></td>
                    <td className="py-2.5 px-3 text-center"><span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded tabular-nums ${crsColor(l.crs)}`}>{l.crs}</span></td>
                    <td className="py-2.5 px-3"><SevTag s={l.severity} /></td>
                    <td className="py-2.5 px-3"><span className="text-[10px] text-muted-foreground">{l.discoverySource}</span></td>
                    <td className="py-2.5 px-2"><ChevronRight className="w-3.5 h-3.5 text-muted-foreground" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {drawerProto && <ProtocolPanel p={drawerProto} onClose={() => setOpenProto(null)} onCreateTicket={onCreateTicket} />}
        {drawerLib && <LibraryPanel l={drawerLib} onClose={() => setOpenLib(null)} onCreateTicket={onCreateTicket} />}
      </div>
    </div>
  );
}
