import { accountsService } from '@repo/erp-services/accountant/accounts.service';
import { journalsService } from '@repo/erp-services/accountant/journals.service';
import { IFAccountLinesList, IFAccountNode, IFAccountsTree } from "@repo/api-contracts/erp";
import { IFJournal } from "@repo/api-contracts/erp";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';



interface AccountsContextType {
    refreshVersion: number;
    triggerRefresh: () => void;
    accounts: IFAccountNode[];
    journals: IFJournal[];
    selectedAccount: string | null;
    setSelectedAccount: (accountId: string | null) => void;
    getAccountBranch: (id: string) => IFAccountNode[];
    getAccountById: (id: string) => IFAccountNode | undefined;
    getAccountChildren: (id: string | null) => IFAccountNode[];
    getAccountTransactions: (id: string, params?: Record<string, string>) => Promise<IFAccountLinesList>;
}



const AccountingContext = createContext<AccountsContextType | undefined>(undefined);

export const AccountingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { token, currentCompany } = useAuth();
    const [accounts, setAccounts] = useState<IFAccountNode[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
    const [refreshVersion, setRefreshVersion] = useState(0);
    const [journals, setJournals] = useState<IFJournal[]>([]);

    useEffect(() => {
        const fetchAccounts = async () => {
            if (!token || !currentCompany) return;
            try {
                const tree = await accountsService.getAllTree(token, currentCompany.id);

                const flattenAccountTree = (node: IFAccountsTree, parentId: string = '', parentName: string = ''): IFAccountNode[] => {
                    const isRoot = parentId === '';

                    const current: IFAccountNode = {
                        ...node,
                        parentId: parentId,
                        parentName: parentName,
                        isRoot: isRoot
                    };

                    const children = node.children ? node.children.flatMap(child => flattenAccountTree(child, node.id, node.name)) : [];

                    if (!node.id || node.id === '0' || node.name === 'root') {
                        return children.map(child => ({ ...child, isRoot: true, parentId: '', parentName: '' }));
                    }

                    return [current, ...children];
                };

                const flattened = tree.flatMap(t => flattenAccountTree(t));
                setAccounts(flattened);
            } catch (error) {
                console.error("Error fetching accounts tree:", error);
            }
        };

        const fetchJournals = async () => {
            if (!token || !currentCompany) return;
            try {
                const response = await journalsService.getAllJournals(token, currentCompany.id);
                setJournals(response.items);
            } catch (error) {
                console.error("Error fetching journals:", error);
            }
        };

        fetchAccounts();
        fetchJournals();
    }, [token, currentCompany, refreshVersion]);

    const triggerRefresh = useCallback(() => {
        setRefreshVersion(prev => prev + 1);
    }, []);

    const getAccountTransactions = useCallback(async (accountId: string, params: Record<string, string> = {}): Promise<IFAccountLinesList> => {
        if (!token || !currentCompany) return { items: [], total: 0, limit: 0, offset: 0, openingBalance: 0 };
        return await accountsService.getAccountLines(accountId, token, currentCompany.id, params);
    }, [token, currentCompany]);

    const processedAccounts = useMemo(() => {
        return accounts;
    }, [accounts]);

    const getAccountBranch = useCallback((id: string): IFAccountNode[] => {
        const rootAccount = processedAccounts.find(acc => acc.id === id);
        if (!rootAccount) return [];

        return processedAccounts.filter(acc =>
            acc.path === rootAccount.path ||
            acc.path.startsWith(rootAccount.path + '.')
        );
    }, [processedAccounts]);

    const getAccountById = (id: string) => {
        return processedAccounts.find(acc => acc.id === id);
    };

    const getAccountChildren = useCallback((id: string | null): IFAccountNode[] => {
        if (!id) return processedAccounts.filter(acc => acc.isRoot);
        return processedAccounts.filter(acc => acc.parentId === id);
    }, [processedAccounts]);

    const value = useMemo(() => ({
        refreshVersion,
        triggerRefresh,
        accounts: processedAccounts,
        journals: journals,
        selectedAccount,
        setSelectedAccount,
        getAccountBranch,
        getAccountById,
        getAccountChildren,
        getAccountTransactions
    }), [refreshVersion, triggerRefresh, processedAccounts, journals, selectedAccount, setSelectedAccount, getAccountBranch, getAccountChildren, getAccountTransactions]);

    return (
        <AccountingContext.Provider value={value}>
            {children}
        </AccountingContext.Provider>
    );
};

export const useAccounting = () => {
    const context = useContext(AccountingContext);
    if (context === undefined) {
        throw new Error('useAccounts must be used within a AccountsProvider');
    }
    return context;
};
