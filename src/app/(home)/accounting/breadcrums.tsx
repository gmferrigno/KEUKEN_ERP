'use client';

import { Button } from 'devextreme-react/button';
import { useState } from 'react';
import AddNewAccount from './components/actions/addNewAccount';
import AddTransaction from './components/actions/addTransaction';
import { useAccountBreadcrumbs } from './hooks/useAccountBreadcrumbs';

interface IBreadcrumbsProps {
    currentPath: string;
    onNavigate: (newPath: string | null) => void;
}

const Breadcrumbs = ({ currentPath, onNavigate }: IBreadcrumbsProps) => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);

    const breadcrumbItems = useAccountBreadcrumbs(currentPath);
    const currentAccount = breadcrumbItems[breadcrumbItems.length - 1] ?? null;

    return (
        <>
            <nav className="flex justify-between items-center flex-wrap gap-y-2 gap-x-1 p-2 bg-primary-500 backdrop-blur-md border border-primary-500/10 rounded-dx">
                <div className='w-full flex items-center justify-between'>
                    <div className='flex items-center flex-wrap'>
                        {}
                        <div
                            className="flex items-center gap-2 cursor-pointer group transition-all"
                            onClick={() => onNavigate(null)}
                        >
                            <div className={`size-8 flex items-center justify-center rounded-dx border transition-all duration-300 ${breadcrumbItems.length === 0
                                ? 'bg-focus-500 border-focus-500 shadow-xs shadow-black/20'
                                : 'bg-primary-900/50 border-primary-500/20 group-hover:bg-focus-500/10 group-hover:text-focus-100 group-hover:border-focus-500/30'
                                }`}>
                                <i className={`dx-icon-home text-base ${breadcrumbItems.length === 0 ? '!text-variant' : '!text-main'}`}></i>
                            </div>
                            <span className={`text-sm font-medium transition-colors ${breadcrumbItems.length === 0 ? 'text-focus-100' : ''
                                }`}>
                                Libro
                            </span>
                        </div>


                        {breadcrumbItems.map((account, index) => {
                            const isLast = index === breadcrumbItems.length - 1;
                            return (
                                <div
                                    key={account.id}
                                    className="flex items-center gap-1 animate-in fade-in slide-in-from-left-4 duration-500"
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    <div className="flex items-center justify-center w-6">
                                        <i className="dx-icon-chevronright text-[10px]"></i>
                                    </div>

                                    <div
                                        className={`flex items-center px-3 py-1.5 rounded-dx cursor-pointer transition-all duration-300 border ${isLast
                                            ? 'bg-focus-500/10 border-focus-500/30 text-focus-100 shadow-sm'
                                            : 'bg-transparent border-transparent hover:bg-main/5'
                                            }`}
                                        onClick={() => onNavigate(account.id)}
                                    >
                                        <span className="text-xs font-bold whitespace-nowrap tracking-tight">
                                            {account.name}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex items-center ml-2 gap-2">
                        <Button
                            text="Registrar Asiento"
                            icon="money"
                            type="default"
                            onClick={() => setIsAddTransactionOpen(true)}
                            className="!text-variant [&_.dx-icon]:!text-variant"
                        />
                        <div className="relative group inline-block">
                            <Button
                                text="Agregar Cuenta"
                                icon="add"
                                type="default"
                                stylingMode="contained"
                                onClick={() => setIsAddModalOpen(true)}
                                className="!text-variant [&_.dx-icon]:!text-variant"
                                disabled={currentAccount?.status === 'active'}
                            />
                        </div>
                    </div>
                </div>
            </nav >
            <AddNewAccount
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                parentId={currentPath}
            />
            <AddTransaction
                visible={isAddTransactionOpen}
                onClose={() => setIsAddTransactionOpen(false)}
                accountId={currentAccount?.id || ''}
                accountName={currentAccount?.name || ''}
            />
        </>
    );
};

export default Breadcrumbs;
