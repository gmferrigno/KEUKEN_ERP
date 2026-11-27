'use client';

import { AccessGate, type TFProductModuleCode } from '@repo/access';
import type { ReactNode } from 'react';

interface ModuleAccessLayoutProps {
    module: TFProductModuleCode;
    children: ReactNode;
}


export default function ModuleAccessLayout({ module, children }: ModuleAccessLayoutProps) {
    return <AccessGate module={module}>{children}</AccessGate>;
}
