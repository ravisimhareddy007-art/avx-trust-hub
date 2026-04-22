import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Page =
  | 'remediation-objects'
  | 'remediation-clm'
  | 'remediation-ssh'
  | 'remediation-ai'
  | 'remediation-secrets'
  | string;

export const remediationPages: Page[] = [
  'remediation-objects',
  'remediation-clm',
  'remediation-ssh',
  'remediation-ai',
  'remediation-secrets',
];

interface NavigationContextType {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  filters: Record<string, string>;
  setFilters: (f: Record<string, string>) => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  drawerContent: any;
  setDrawerContent: (content: any) => void;
}

const NavigationContext = createContext<NavigationContextType>({
  currentPage: 'dashboards',
  setCurrentPage: () => {},
  filters: {},
  setFilters: () => {},
  drawerOpen: false,
  setDrawerOpen: () => {},
  drawerContent: null,
  setDrawerContent: () => {},
});

export const useNav = () => useContext(NavigationContext);

export const NavigationProvider = ({ children }: { children: ReactNode }) => {
  const [currentPage, setCurrentPage] = useState<Page>('dashboards');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerContent, setDrawerContent] = useState<any>(null);

  return (
    <NavigationContext.Provider value={{
      currentPage, setCurrentPage, filters, setFilters,
      drawerOpen, setDrawerOpen, drawerContent, setDrawerContent,
    }}>
      {children}
    </NavigationContext.Provider>
  );
};
