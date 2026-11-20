'use client';

import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import CustomStore from 'devextreme/data/custom_store';
import notify from 'devextreme/ui/notify';
import { custom } from 'devextreme/ui/dialog';
import { GenericDataGrid, IGenericDataGridColumn } from '@repo/devextreme';
import { IFCompany, IFCurrency, IFCompanyCreate, IFCompanyUpdate } from '@repo/api-contracts/erp';
import { companiesService } from '@repo/erp-services/companies.service';
import { currenciesService } from '@repo/erp-services/payments_services/currencies.service';
import { useAuth } from '@/contexts/AuthContext';
import { canDo } from "@repo/access";
import { createGridStateStorage } from '@/lib/storage/gridStateStorage';
import { createGridPrinter } from '@/lib/printer/gridPrinter';
import CompanyCreationModal from './components/companyCreationModal';
import CompanyEditModal from './components/companyEditModal';
import CompanyUsersModal from './components/companyUsersModal';

const { customLoad, customSave } = createGridStateStorage({ gridId: 'companies-grid' });
const { onPrint } = createGridPrinter({ gridId: 'companies-grid', title: 'Empresas', printerTemplate: 'grid' });

const COLUMN_DEFAULTS = { allowFiltering: true, allowHeaderFiltering: true };
const SORTING_CONFIG = { mode: 'multiple' as const };
const GROUPING_CONFIG = { autoExpandAll: false, contextMenuEnabled: true };
const SEARCH_PANEL_CONFIG = {
    visible: true,
    width: 300,
    placeholder: 'Buscar empresas...',
    highlightSearchText: true,
};
const SUMMARY_CONFIG = {
    totalItems: [
        { column: 'name', summaryType: 'count' as const, displayFormat: 'Total: {0} empresas' },
    ],
};
const EXPORT_CONFIG = {
    enabled: true,
    fileName: 'Empresas',
    allowExportSelectedData: true,
    formats: ['xlsx'],
};
const SCROLLING_CONFIG = { mode: 'virtual' as const, showScrollbar: 'always' as const };
const SELECTION_CONFIG = { mode: 'none' as const };
const PAGING_CONFIG = { enabled: false };

const StatusCell = (data: any) => {
    const isActive = data.value ?? true;
    const dotColor = isActive ? 'bg-success' : 'bg-main/30';
    const label = isActive ? 'Activa' : 'Inactiva';

    return (
        <div className="flex items-center justify-center gap-1.5">
            <span className={`size-1.5 rounded-full shrink-0 ${dotColor}`} />
            <span className="text-xs text-main font-medium">{label}</span>
        </div>
    );
};

const TaxIdCell = (data: any) => (
    <span className="font-mono text-xs text-main/80">
        {data.value ? data.value : '-'}
    </span>
);

export default function CompaniesClient() {
    const gridRef = useRef<any>(null);
    const { token, permissions, isSuperAdmin } = useAuth();

    const [refreshVersion, setRefreshVersion] = useState(0);
    const [currencies, setCurrencies] = useState<IFCurrency[]>([]);

    // Modals state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<IFCompany | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const [selectedCompanyForUsers, setSelectedCompanyForUsers] = useState<IFCompany | null>(null);
    const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);

    // Permissions evaluation
    const canModify = useMemo(() => {
        return Boolean(isSuperAdmin || (permissions && canDo('modify', ['companies'], permissions)));
    }, [isSuperAdmin, permissions]);

    // Contract gate: Crear empresa requiere common:companies:write + is_superadmin
    const canCreate = useMemo(() => {
        return Boolean(isSuperAdmin && canModify);
    }, [isSuperAdmin, canModify]);

    // Fetch currencies for lookup
    useEffect(() => {
        let isMounted = true;
        const loadCurrencies = async () => {
            if (!token) return;
            try {
                const response = await currenciesService.getAll(token);
                if (isMounted) {
                    setCurrencies(response.items || []);
                }
            } catch (err) {
                console.error('Error al cargar lista de monedas:', err);
            }
        };
        loadCurrencies();
        return () => {
            isMounted = false;
        };
    }, [token]);

    const currencyMap = useMemo(() => {
        return new Map(currencies.map((c) => [c.id, c]));
    }, [currencies]);

    const columns: IGenericDataGridColumn[] = useMemo(() => [
        {
            dataField: 'id',
            caption: 'ID',
            visible: false,
            allowEditing: false,
        },
        {
            dataField: 'name',
            caption: 'Nombre / Razón Social',
            allowSorting: true,
            allowFiltering: true,
            validationRules: [{ type: 'required', message: 'El nombre es obligatorio' }],
        },
        {
            dataField: 'taxId',
            caption: 'CUIT / Identificación Fiscal',
            allowSorting: true,
            allowFiltering: true,
            cellRender: TaxIdCell,
        },
        {
            dataField: 'currencyId',
            caption: 'Moneda Principal',
            allowSorting: true,
            allowFiltering: true,
            lookup: {
                dataSource: currencies,
                valueExpr: 'id',
                displayExpr: 'name',
            },
            cellRender: (data: any) => {
                const currency = currencyMap.get(data.value);
                if (!currency) return <span className="text-main/40 text-xs">-</span>;
                const codeOrSymbol = currency.isoCode || currency.symbol || '';
                return (
                    <span className="text-xs text-main">
                        {currency.name} {codeOrSymbol ? `(${codeOrSymbol})` : ''}
                    </span>
                );
            },
        },
        {
            dataField: 'active',
            caption: 'Estado',
            width: 120,
            alignment: 'center',
            allowGrouping: true,
            allowHeaderFiltering: true,
            cellRender: StatusCell,
            lookup: {
                dataSource: [
                    { id: true, name: 'Activa' },
                    { id: false, name: 'Inactiva' },
                ],
                valueExpr: 'id',
                displayExpr: 'name',
            },
        },
    ], [currencies, currencyMap]);

    const dataSource = useMemo(() => {
        return new CustomStore({
            key: 'virtualId',
            load: async () => {
                if (!token) return { data: [], totalCount: 0 };
                try {
                    const response = await companiesService.getAll({ limit: 5000, offset: 0 }, token);
                    const itemsWithId = (response.items || []).map((item) => ({
                        ...item,
                        virtualId: `${item.id}`,
                    }));

                    return {
                        data: itemsWithId,
                        totalCount: response.metadata?.totalItems ?? itemsWithId.length,
                    };
                } catch (error: any) {
                    console.error('Error loading companies:', error);
                    const errorMessage =
                        error instanceof Error && error.message
                            ? error.message
                            : 'Error al cargar las empresas';
                    notify(errorMessage, 'error', 3000);
                    return {
                        data: [],
                        totalCount: 0,
                    };
                }
            },
        });
    }, [refreshVersion, token]);

    const handleCreateCompany = async (values: IFCompanyCreate) => {
        if (!token) return;

        try {
            await companiesService.create(values, token);
            notify('Empresa creada exitosamente', 'success', 3000);
            setRefreshVersion((v) => v + 1);
            setIsCreateModalOpen(false);
        } catch (error: any) {
            console.error('Error al crear empresa:', error);
            const errorMessage =
                error instanceof Error && error.message
                    ? error.message
                    : 'Error al crear la empresa';
            notify(errorMessage, 'error', 3000);
            throw error;
        }
    };

    const handleUpdateCompany = async (values: IFCompanyUpdate) => {
        if (!token || !selectedCompany) return;

        try {
            await companiesService.update(selectedCompany.id, values, token);
            notify('Empresa actualizada exitosamente', 'success', 3000);
            setRefreshVersion((v) => v + 1);
            setIsEditModalOpen(false);
        } catch (error: any) {
            console.error('Error al actualizar empresa:', error);
            const errorMessage =
                error instanceof Error && error.message
                    ? error.message
                    : 'Error al actualizar la empresa';
            notify(errorMessage, 'error', 3000);
            throw error;
        }
    };

    const handleDeleteCompany = useCallback(async (company: IFCompany) => {
        if (!token) return;

        const confirmDialog = custom({
            title: 'Confirmar eliminación',
            messageHtml: `<div class="p-2">¿Está seguro de que desea eliminar la empresa <b>${company.name}</b>?<br/><span class="text-xs text-main/60">Esta acción aplicará un borrado lógico (soft-delete).</span></div>`,
            buttons: [
                {
                    text: 'Cancelar',
                    stylingMode: 'text',
                    onClick: () => false,
                },
                {
                    text: 'Eliminar',
                    type: 'danger',
                    stylingMode: 'contained',
                    onClick: () => true,
                },
            ],
        });

        const confirmed = await confirmDialog.show();
        if (confirmed) {
            try {
                await companiesService.delete(company.id, token);
                notify('Empresa eliminada exitosamente', 'success', 3000);
                setRefreshVersion((v) => v + 1);
            } catch (error: any) {
                console.error('Error al eliminar empresa:', error);
                const errorMessage =
                    error instanceof Error && error.message
                        ? error.message
                        : 'Error al eliminar la empresa';
                notify(errorMessage, 'error', 3000);
            }
        }
    }, [token]);

    const handleAddCompany = useCallback(() => {
        setIsCreateModalOpen(true);
    }, []);

    const handleEditCompany = useCallback((data: IFCompany) => {
        setSelectedCompany(data);
        setIsEditModalOpen(true);
    }, []);

    const handleManageUsers = useCallback((data: IFCompany) => {
        setSelectedCompanyForUsers(data);
        setIsUsersModalOpen(true);
    }, []);

    const gridEditing = useMemo(() => ({
        allowAdding: canCreate,
        allowUpdating: false,
        allowDeleting: false,
        useIcons: true,
        onAdd: handleAddCompany,
    }), [canCreate, handleAddCompany]);

    const gridActions = useMemo(() => [
        {
            icon: 'preferences',
            hint: 'Ver / Editar Empresa',
            onClick: handleEditCompany,
        },
        {
            icon: 'group',
            hint: 'Gestionar Usuarios',
            onClick: handleManageUsers,
        },
        ...(canModify
            ? [
                {
                    icon: 'trash',
                    hint: 'Eliminar Empresa',
                    onClick: handleDeleteCompany,
                },
            ]
            : []),
    ], [canModify, handleEditCompany, handleManageUsers, handleDeleteCompany]);

    return (
        <div className="flex flex-col w-full min-w-full h-full bg-dx-primary/10 rounded-dx font-sans overflow-hidden">
            <div className="w-full h-full flex flex-col gap-2">
                <GenericDataGrid
                    ref={gridRef}
                    gridId="companies-grid"
                    keyExpr="id"
                    dataSource={dataSource}
                    columns={columns}
                    columnDefaults={COLUMN_DEFAULTS}
                    allowColumnReordering={true}
                    remoteOperations={false}
                    allowColumnResizing={true}
                    showBorders={true}
                    rowAlternationEnabled={true}
                    hoverStateEnabled={true}
                    paging={PAGING_CONFIG}
                    sorting={SORTING_CONFIG}
                    filterRow={true}
                    headerFilter={true}
                    filterPanel={false}
                    grouping={GROUPING_CONFIG}
                    groupPanel={false}
                    searchPanel={SEARCH_PANEL_CONFIG}
                    selection={SELECTION_CONFIG}
                    editing={gridEditing}
                    export={EXPORT_CONFIG}
                    columnChooser={true}
                    columnFixing={true}
                    summary={SUMMARY_CONFIG}
                    actions={gridActions}
                    stateStoring={{
                        enabled: true,
                        type: 'custom',
                        storageKey: 'companies-grid',
                        savingTimeout: 1000,
                        customLoad,
                        customSave,
                    }}
                    scrolling={SCROLLING_CONFIG}
                    print={{ enabled: true, onPrint }}
                />
            </div>

            {/* Modal de Creación de Empresa */}
            <CompanyCreationModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                currencies={currencies}
                onSave={handleCreateCompany}
            />

            {/* Modal de Edición de Empresa */}
            <CompanyEditModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onHidden={() => setSelectedCompany(null)}
                company={selectedCompany}
                currencies={currencies}
                onSave={handleUpdateCompany}
            />

            {/* Modal de Asignación de Usuarios a la Empresa */}
            <CompanyUsersModal
                isOpen={isUsersModalOpen}
                onClose={() => setIsUsersModalOpen(false)}
                onHidden={() => setSelectedCompanyForUsers(null)}
                company={selectedCompanyForUsers}
                onSuccess={() => setRefreshVersion((v) => v + 1)}
            />
        </div>
    );
}
