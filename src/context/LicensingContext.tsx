import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Runtime licensing / entitlements. The remediation capabilities are add-on
// modules on top of the MVP (discovery, visibility, posture). They are OFF by
// default, so the base product shows no Remediation menu. Enabling a module in
// Platform Core -> License Management flips it on here, and the sidebar reveals
// it live -- the land-and-expand story, in one prototype.

export type LicenseModule = "clm" | "ssh" | "secrets" | "ai" | "quantum";

const KEY = "trustplatform.licensing.v1";

const DEFAULTS: Record<LicenseModule, boolean> = {
  clm: false,
  ssh: false,
  secrets: false,
  ai: false,
  quantum: false,
};

function load(): Record<LicenseModule, boolean> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

interface LicensingContextType {
  licensed: Record<LicenseModule, boolean>;
  isLicensed: (m: LicenseModule) => boolean;
  setLicensed: (m: LicenseModule, on: boolean) => void;
  anyRemediation: boolean;
}

const LicensingContext = createContext<LicensingContextType>({
  licensed: DEFAULTS,
  isLicensed: () => false,
  setLicensed: () => {},
  anyRemediation: false,
});

export const useLicensing = () => useContext(LicensingContext);

export const LicensingProvider = ({ children }: { children: ReactNode }) => {
  const [licensed, setLicensedState] = useState<Record<LicenseModule, boolean>>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(licensed));
    } catch {
      /* noop */
    }
  }, [licensed]);

  const setLicensed = (m: LicenseModule, on: boolean) => setLicensedState((prev) => ({ ...prev, [m]: on }));

  const isLicensed = (m: LicenseModule) => !!licensed[m];

  const anyRemediation = licensed.clm || licensed.ssh || licensed.secrets || licensed.ai;

  return (
    <LicensingContext.Provider value={{ licensed, isLicensed, setLicensed, anyRemediation }}>
      {children}
    </LicensingContext.Provider>
  );
};
