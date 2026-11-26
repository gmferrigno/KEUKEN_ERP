import ModuleAccessLayout from '@/components/ModuleAccessLayout';
import type { ReactNode } from 'react';
import { UsersUiBridge } from './UsersUiBridge';

export default function UsersLayout({ children }: { children: ReactNode }) {
    return (
        <ModuleAccessLayout module="core">
            <UsersUiBridge>{children}</UsersUiBridge>
        </ModuleAccessLayout>
    );
}
