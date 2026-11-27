'use client'

import { IFAccountNode } from "@repo/api-contracts/erp";
import { useAccounting } from '@/contexts/AccountingContext';
import { ScrollView } from 'devextreme-react';
import { ScrollViewRef } from 'devextreme-react/scroll-view';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import AccountTreeItem from './accountTreeItem';

const TreeView = ({ mirrored }: { mirrored?: boolean }) => {
    const { accounts } = useAccounting();
    const [collapsedAccounts, setCollapsedAccounts] = useState<Record<string, boolean>>({});
    const scrollRef = useRef<ScrollViewRef>(null);

    const router = useRouter();
    const searchParams = useSearchParams();
    const activePath = searchParams.get('path') || '';

    useEffect(() => {
        if (!activePath) return;

        const parts = activePath.split('.');
        setCollapsedAccounts(prev => {
            const newCollapsed = { ...prev };
            let currentPath = '';
            let changed = false;

            parts.forEach((part, index) => {
                if (index < parts.length - 1) {
                    currentPath = currentPath ? `${currentPath}.${part}` : part;
                    if (newCollapsed[currentPath] !== false) {
                        newCollapsed[currentPath] = false;
                        changed = true;
                    }
                }
            });

            return changed ? newCollapsed : prev;
        });
    }, [activePath]);
    const pathname = usePathname();

    const handleSelect = (account: IFAccountNode) => {
        const params = new URLSearchParams(searchParams.toString());
        if (activePath === account.id) {
            params.delete('path');
        } else {
            params.set('path', account.id);
        }
        router.push(`${pathname}?${params.toString()}`);
    };

    const childrenMap = useMemo(() => {
        const map = new Map<string, IFAccountNode[]>();
        accounts.forEach(acc => {
            if (acc.parentId) {
                if (!map.has(acc.parentId)) map.set(acc.parentId, []);
                map.get(acc.parentId)!.push(acc);
            }
        });
        return map;
    }, [accounts]);

    const rootAccounts = useMemo(() => accounts.filter(acc => acc.isRoot), [accounts]);

    return (
        <div className="h-full w-full flex flex-1 flex-col min-h-0 border border-primary-900 rounded-dx bg-primary-900">
            <div className='p-3 flex items-center'>
                <p className='font-bold text-md'>Árbol de Cuentas</p>
            </div>
            <ScrollView
                ref={scrollRef}
                direction="vertical"
                showScrollbar="onHover"
                useNative={false}
                scrollByContent={true}
                bounceEnabled={false}
                width="auto"
                height='100%'
                className="pb-5 bg-primary-950 rounded-b-dx"
            >
                <div className="flex flex-col gap-2 p-2">
                    {rootAccounts.length === 0 ? (
                        <p className="text-sm text-main/20 italic px-2 py-4 text-center bg-main/2 rounded-dx border border-dashed border-main/5">No hay cuentas cargadas</p>
                    ) : (
                        rootAccounts.map(account => (
                            <AccountTreeItem
                                key={account.id}
                                account={account}
                                childrenMap={childrenMap}
                                collapsedAccounts={collapsedAccounts}
                                setCollapsedAccounts={setCollapsedAccounts}
                                onSelect={handleSelect}
                                mirrored={mirrored}
                            />
                        ))
                    )}
                </div>
            </ScrollView>

        </div>
    );
};

export default TreeView;