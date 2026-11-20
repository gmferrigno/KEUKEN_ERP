import ModuleAccessLayout from '@/components/ModuleAccessLayout';
import type { ReactNode } from 'react';

export default function CompaniesLayout({ children }: { children: ReactNode }) {
    return <ModuleAccessLayout module="core">{children}</ModuleAccessLayout>;
}
