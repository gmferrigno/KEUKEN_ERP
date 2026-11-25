'use client';


import { useRecovery, RECOVERY_ENTITIES } from "@repo/recovery";
import { commonService } from "@repo/erp-services/common.service";
import PERMISSIONS_CONSTANTS from "@repo/access";
import { canDo } from "@repo/access";
import { paymentTermsService } from "@repo/erp-services/payments_services/paymentTerms.service";
import { IFPaymentTerm } from "@repo/api-contracts/erp";
import { GenericDataGrid, IGenericDataGridColumn } from '@repo/devextreme';
import { useAuth } from "@/contexts/AuthContext";
import { createGridStateStorage } from "@/lib/storage/gridStateStorage";
import CustomStore from "devextreme/data/custom_store";
import { CheckBox } from 'devextreme-react/check-box';
import notify from "devextreme/ui/notify";
import { useEffect, useMemo, useRef, useState } from "react";
import PaymentTermCreationModal from "../components/actions/paymentTermCreation";

const { customLoad, customSave } = createGridStateStorage({ gridId: 'payment-terms-grid' });

const PaymentTermsClient = () => {
    const { isRecoveryMode, canRestore, recoveryVisibility } = useRecovery();
    const { token, currentCompany, permissions, loading, isSuperAdmin } = useAuth();
    const gridRef = useRef<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPaymentTerm, setSelectedPaymentTerm] = useState<IFPaymentTerm | null>(null);
    const [refreshVersion, setRefreshVersion] = useState(0);

    // Refetch reactivo cuando cambia el switch de RecoveryMode o RecoveryVisibility
    useEffect(() => {
        setRefreshVersion(prev => prev + 1);
        if (gridRef.current?.instance?.refresh) {
            gridRef.current.instance.refresh();
        } else if (gridRef.current?.refresh) {
            gridRef.current.refresh();
        }
    }, [isRecoveryMode, recoveryVisibility]);

    const canView = useMemo(() => {
        return permissions ? canDo('view', ['paymentTerms'], permissions) : false;
    }, [permissions]);

    const canModify = useMemo(() => {
        return permissions ? canDo('modify', PERMISSIONS_CONSTANTS.modifyPaymentTerms, permissions) : false;
    }, [permissions]);

    const dataSource = useMemo(() => {
        return new CustomStore({
            key: 'id',
            load: async (loadOptions) => {
                try {
                    const response = await paymentTermsService.getAll(token, currentCompany?.id);
                    return {
                        data: response.items,
                        totalCount: response.metadata.totalItems
                    };
                } catch (error: any) {
                    console.error('Error loading payment terms:', error);
                    const errorMessage = error instanceof Error && error.message 
                        ? error.message 
                        : 'Error al cargar las condiciones de pago';
                    notify(errorMessage, 'error', 3000);
                    return {
                        data: [],
                        totalCount: 0
                    };
                }
            }
        });
    }, [refreshVersion, token, currentCompany?.id, isRecoveryMode, recoveryVisibility]);

    const handleRowRemoved = async (e: any) => {
        try {
            const data = e.data || e;
            await paymentTermsService.delete(data.id, token, currentCompany?.id);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("Condición de pago eliminada exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error deleting payment term:", error);
            const errorMessage = error instanceof Error && error.message 
                ? error.message 
                : "Error al eliminar la condición de pago";
            notify(errorMessage, "error", 3000);
        }
    };

    const handleRestore = async (data: any) => {
        if (!currentCompany?.id) {
            notify("No hay una empresa activa seleccionada", "error", 3000);
            return;
        }
        try {
            await commonService.restore(RECOVERY_ENTITIES.ACCOUNT_PAYMENT_TERM.schema, RECOVERY_ENTITIES.ACCOUNT_PAYMENT_TERM.table, data.id, token);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("Condición de pago restaurada exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error al restaurar condición de pago:", error);
            notify(error?.message || "Error al restaurar el registro", "error", 3000);
        }
    };

    const actions = useMemo(() => [
        {
            icon: "edit",
            hint: "Editar",
            onClick: (data: any) => {
                setSelectedPaymentTerm(data);
                setIsModalOpen(true);
            },
            visible: (e: any) => !isRecoveryMode && canModify,
        },
        {
            icon: "trash",
            hint: "Eliminar",
            onClick: (data: any) => handleRowRemoved(data),
            visible: (e: any) => !isRecoveryMode && canModify,
        },
        {
            icon: "revert",
            hint: "Restaurar",
            onClick: (data: any) => handleRestore(data),
            visible: (e: any) => isRecoveryMode && canRestore,
        }
    ], [canModify, isSuperAdmin, isRecoveryMode, token, currentCompany?.id]);

    const columns: IGenericDataGridColumn[] = useMemo(() => {
        const cols: IGenericDataGridColumn[] = [
            {
                dataField: 'id',
                caption: 'ID',
                allowEditing: false,
                visible: false,
            },
            {
                dataField: 'name',
                caption: 'Nombre',
                allowSorting: true,
                validationRules: [{ type: 'required', message: 'El nombre es obligatorio' }],
            },
            {
                dataField: 'netDays',
                caption: 'Días Netos',
                dataType: 'number',
                width: 120,
                validationRules: [{ type: 'required', message: 'Los días netos son obligatorios' }],
            },
            {
                dataField: 'allowedPaymentMethods',
                caption: 'Métodos Permitidos',
                calculateDisplayValue: (rowData: IFPaymentTerm) => {
                    return rowData.allowedPaymentMethods?.map(m => m.name).join(', ') || 'Todos';
                },
                allowFiltering: false,
                allowSorting: false,
            },
            {
                dataField: 'active',
                caption: 'Activo',
                width: 100,
                alignment: 'center',
                cellRender: (cellData: any) => (
                    <div className="flex justify-center items-center h-full">
                        <CheckBox value={cellData.value} readOnly />
                    </div>
                )
            }
        ];

        if (isRecoveryMode) {
            cols.push(
                {
                    dataField: 'deletedAt',
                    caption: 'Fecha Eliminación',
                    dataType: 'datetime',
                    format: 'dd/MM/yyyy HH:mm',
                    width: 160,
                },
                {
                    dataField: 'deletedByName',
                    caption: 'Eliminado Por',
                    width: 150,
                }
            );
        }

        return cols;
    }, [isRecoveryMode]);

    if (loading) {
        return null;
    }

    if (permissions && !canView) {
        return (
            <div className="flex flex-col items-center justify-center h-full w-full gap-y-5">
                <i className="dx-icon-eyeclose !text-[200px] !text-focus-500/20" />
                <p className="text-2xl font-bold text-main/60">No tienes permiso para acceder a esta página</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full min-w-full h-full rounded-dx font-sans overflow-hidden">
            <div className="w-full h-full flex flex-col">
                <div className="w-full flex-1 min-h-0">
                    <GenericDataGrid
                            recoveryVisibility={recoveryVisibility}
                        ref={gridRef}
                        gridId="payment-terms-grid"
                        keyExpr="id"
                        dataSource={dataSource}
                        remoteOperations={false}
                        columns={columns}
                        actions={actions}
                        columnDefaults={{ allowFiltering: true, allowHeaderFiltering: true }}
                        allowColumnReordering={true}
                        allowColumnResizing={true}
                        showBorders={true}
                        rowAlternationEnabled={true}
                        hoverStateEnabled={true}
                        paging={{ enabled: true, pageSize: 20, pageSizes: [10, 20, 50, 100] }}
                        sorting={{ mode: 'multiple' }}
                        filterRow={true}
                        headerFilter={true}
                        filterPanel={true}
                        grouping={{ autoExpandAll: false, contextMenuEnabled: true }}
                        groupPanel={true}
                        searchPanel={{
                            visible: true,
                            width: 350,
                            placeholder: 'Buscar condiciones...',
                            highlightSearchText: true
                        }}
                        selection={{ mode: 'none' }}
                        editing={{
                            allowAdding: isRecoveryMode ? false : canModify,
                            allowUpdating: false,
                            allowDeleting: false,
                            useIcons: true,
                            onAdd: () => {
                                setSelectedPaymentTerm(null);
                                setIsModalOpen(true);
                            }
                        }}
                        export={{
                            enabled: true,
                            fileName: 'Condiciones_Pago',
                            allowExportSelectedData: true,
                            formats: ['xlsx']
                        }}
                        columnChooser={true}
                        columnFixing={true}
                        summary={{
                            totalItems: [
                                {
                                    column: 'id',
                                    summaryType: 'count',
                                    displayFormat: 'Total: {0} condiciones'
                                },
                            ],
                        }}
                        stateStoring={{
                            enabled: true,
                            type: 'custom',
                            storageKey: 'payment-terms-grid',
                            savingTimeout: 1000,
                            customLoad,
                            customSave,
                        }}
                        scrolling={{ mode: 'standard' }}
                        onRowRemoved={handleRowRemoved}
                    />
                </div>
            </div>
            <PaymentTermCreationModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedPaymentTerm(null);
                }}
                onSuccess={() => {
                    setRefreshVersion(prev => prev + 1);
                }}
                initialData={selectedPaymentTerm}
            />
        </div>
    );
};

export default PaymentTermsClient;
