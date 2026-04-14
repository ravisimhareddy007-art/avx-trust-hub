import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Persona = 'security-admin' | 'compliance-officer' | 'pki-engineer';

interface PersonaContextType {
  persona: Persona;
  setPersona: (p: Persona) => void;
  personaLabel: string;
}

const labels: Record<Persona, string> = {
  'security-admin': 'Security Admin',
  'compliance-officer': 'Compliance Officer',
  'pki-engineer': 'PKI Engineer',
};

const PersonaContext = createContext<PersonaContextType>({
  persona: 'security-admin',
  setPersona: () => {},
  personaLabel: 'Security Admin',
});

export const usePersona = () => useContext(PersonaContext);

export const PersonaProvider = ({ children }: { children: ReactNode }) => {
  const [persona, setPersona] = useState<Persona>('security-admin');
  return (
    <PersonaContext.Provider value={{ persona, setPersona, personaLabel: labels[persona] }}>
      {children}
    </PersonaContext.Provider>
  );
};
