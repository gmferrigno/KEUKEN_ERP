'use client';

import { createContext, ReactNode, useContext, useState } from 'react';

interface CompanyContextType {
    companyId: string;
    setCompanyId: (id: string) => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider = ({ children }: { children: ReactNode }) => {
    const [companyId, setCompanyId] = useState<string>("019c7bb9-8c60-79fb-8563-8de329549beb");

    return (
        <CompanyContext.Provider value={{ companyId, setCompanyId }}>
            {children}
        </CompanyContext.Provider>
    );
};

export const useCompany = () => {
    const context = useContext(CompanyContext);
    if (context === undefined) {
        throw new Error('useCompany must be used within a CompanyProvider');
    }
    return context;
};
