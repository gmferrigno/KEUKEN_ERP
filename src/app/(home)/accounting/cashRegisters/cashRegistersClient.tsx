"use client";

import { useRecovery, RECOVERY_ENTITIES } from "@repo/recovery";
import { commonService } from "@repo/erp-services/common.service";
import {
  AccessGate,
  useAccess,
  useGridColumns,
  type IAccessGridColumn,
} from "@repo/access";
import { cashRegistersService } from "@repo/erp-services/accountant/cashRegisters.service";
import { IFCashRegister, IFCashRegisterType } from "@repo/api-contracts/erp";
import { GenericDataGrid } from '@repo/devextreme';
import { useAuth } from "@/contexts/AuthContext";
import { createGridStateStorage } from "@/lib/storage/gridStateStorage";
import CustomStore from "devextreme/data/custom_store";
import notify from "devextreme/ui/notify";
import { useEffect, useMemo, useRef, useState } from "react";
import CashRegisterModal from "./components/actions/cashRegisterModal";
import CashRegisterSettlementModal from "./components/actions/cashRegisterSettlementModal";

const { customLoad, customSave } = createGridStateStorage({
  gridId: "cash-registers-grid",
});

const CashRegistersClient = () => {
  const { isRecoveryMode, canRestore, recoveryVisibility } = useRecovery();
  const { token, currentCompany, isSuperAdmin } = useAuth();
  const { canAccess } = useAccess();

  const canModify = canAccess("treasury.cashRegisters.modify");
  const canSettle = canAccess("treasury.cashRegisters.settlement");

  const gridRef = useRef<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [selectedRegister, setSelectedRegister] =
    useState<IFCashRegister | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [allRegisters, setAllRegisters] = useState<IFCashRegister[]>([]);
  const [registerTypes, setRegisterTypes] = useState<IFCashRegisterType[]>([]);

  // Refetch reactivo cuando cambia el switch de RecoveryMode o RecoveryVisibility
  useEffect(() => {
    setRefreshVersion((prev) => prev + 1);
    if (gridRef.current?.instance?.refresh) {
      gridRef.current.instance.refresh();
    } else if (gridRef.current?.refresh) {
      gridRef.current.refresh();
    }
  }, [isRecoveryMode, recoveryVisibility]);

  useEffect(() => {
    const fetchAllRegisters = async () => {
      if (!currentCompany?.id) return;
      try {
        const response = await cashRegistersService.getAll(
          token,
          currentCompany.id,
        );
        setAllRegisters(response.items);
      } catch (error) {
        console.error("Error loading registers for lookup:", error);
      }
    };
    fetchAllRegisters();
  }, [token, currentCompany?.id, refreshVersion]);

  useEffect(() => {
    const fetchRegisterTypes = async () => {
      if (!token) return;
      try {
        const response = await cashRegistersService.getTypes(token);
        setRegisterTypes(response);
      } catch (error) {
        console.error("Error loading register types:", error);
      }
    };
    fetchRegisterTypes();
  }, [token]);

  const dataSource = useMemo(() => {
    return new CustomStore({
      key: "id",
      load: async () => {
        if (!currentCompany?.id) {
          return {
            data: [],
            totalCount: 0,
          };
        }
        try {
          const response = await cashRegistersService.getAll(
            token,
            currentCompany.id,
          );
          return {
            data: response.items,
            totalCount: response.metadata.totalItems,
          };
        } catch (error: any) {
          console.error("Error loading cash registers:", error);
          notify(error?.message || "Error al cargar las cajas registradoras", "error", 3000);
          return {
            data: [],
            totalCount: 0,
          };
        }
      },
    });
  }, [refreshVersion, token, currentCompany?.id, isRecoveryMode, recoveryVisibility]);

  const handleRowRemoved = async (e: any) => {
    try {
      const data = e.data || e;
      await cashRegistersService.delete(data.id, token, currentCompany?.id);
      setRefreshVersion((prev) => prev + 1);
      if (gridRef.current?.instance?.refresh) {
        gridRef.current.instance.refresh();
      } else if (gridRef.current?.refresh) {
        gridRef.current.refresh();
      }
      notify("Caja registradora eliminada exitosamente", "success", 3000);
    } catch (error: any) {
      console.error("Error deleting cash register:", error);
      notify(error?.message || "Error al eliminar la caja registradora", "error", 3000);
    }
  };

  const handleRestore = async (data: any) => {
    if (!currentCompany?.id) {
      notify("No hay una empresa activa seleccionada", "error", 3000);
      return;
    }
    try {
      await commonService.restore(RECOVERY_ENTITIES.CASH_REGISTER.schema, RECOVERY_ENTITIES.CASH_REGISTER.table, data.id, token);
      setRefreshVersion((prev) => prev + 1);
      if (gridRef.current?.instance?.refresh) {
        gridRef.current.instance.refresh();
      } else if (gridRef.current?.refresh) {
        gridRef.current.refresh();
      }
      notify("Caja registradora restaurada exitosamente", "success", 3000);
    } catch (error: any) {
      console.error("Error al restaurar caja registradora:", error);
      notify(error?.message || "Error al restaurar el registro", "error", 3000);
    }
  };

  const actions = useMemo(
    () => [
      {
        icon: "money",
        hint: "Rendir caja",
        onClick: (data: any) => {
          setSelectedRegister(data);
          setIsSettlementModalOpen(true);
        },
        visible: (e: any) => !isRecoveryMode && canSettle,
      },
      {
        icon: "edit",
        hint: "Editar",
        onClick: (data: any) => {
          setSelectedRegister(data);
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
      },
    ],
    [canModify, canSettle, isSuperAdmin, isRecoveryMode, token, currentCompany?.id]
  );

  const baseColumns: IAccessGridColumn[] = useMemo(() => {
    const cols: IAccessGridColumn[] = [
      {
        dataField: "id",
        caption: "ID",
        allowEditing: false,
        visible: false,
      },
      {
        dataField: "name",
        caption: "Nombre de la Caja",
        allowSorting: true,
        validationRules: [
          { type: "required", message: "El nombre es obligatorio" },
        ],
      },
      {
        dataField: "registerType",
        caption: "Tipo de Caja",
        allowSorting: true,
        validationRules: [
          { type: "required", message: "El tipo de caja es obligatorio" },
        ],
        lookup: {
          dataSource: registerTypes,
          valueExpr: "id",
          displayExpr: "name",
        },
      },
      {
        dataField: "parentCashRegisterId",
        caption: "Caja Padre",
        capability: "treasury.cashRegisters.hierarchy",
        lookup: {
          dataSource: allRegisters,
          valueExpr: "id",
          displayExpr: "name",
        },
      },
      {
        dataField: "active",
        caption: "Activo",
        dataType: "boolean",
        width: 120,
      },
    ];

    if (isRecoveryMode) {
      cols.push(
        {
          dataField: "deletedAt",
          caption: "Fecha Eliminación",
          dataType: "datetime",
          format: "dd/MM/yyyy HH:mm",
          width: 160,
        },
        {
          dataField: "deletedByName",
          caption: "Eliminado Por",
          width: 150,
        }
      );
    }

    return cols;
  }, [registerTypes, allRegisters, isRecoveryMode]);

  const columns = useGridColumns(baseColumns);

  return (
    <div className="flex flex-col w-full min-w-full h-full rounded-dx font-sans overflow-hidden">
      <div className="w-full h-full flex flex-col">
        <div className="w-full flex-1 min-h-0">
          <GenericDataGrid
            recoveryVisibility={recoveryVisibility}
            ref={gridRef}
            gridId="cash-registers-grid"
            keyExpr="id"
            dataSource={dataSource}
            remoteOperations={false}
            columns={columns}
            actions={actions}
            columnDefaults={{
              allowFiltering: true,
              allowHeaderFiltering: true,
            }}
            allowColumnReordering={true}
            allowColumnResizing={true}
            showBorders={true}
            rowAlternationEnabled={true}
            hoverStateEnabled={true}
            paging={{
              enabled: true,
              pageSize: 20,
              pageSizes: [10, 20, 50, 100],
            }}
            sorting={{ mode: "multiple" }}
            filterRow={true}
            headerFilter={true}
            filterPanel={true}
            grouping={{ autoExpandAll: false, contextMenuEnabled: true }}
            groupPanel={true}
            searchPanel={{
              visible: true,
              width: 350,
              placeholder: "Buscar cajas...",
              highlightSearchText: true,
            }}
            noDataText="No se encontraron cajas registradoras registradas para esta empresa"
            selection={{ mode: "none" }}
            editing={{
              allowAdding: isRecoveryMode ? false : canModify,
              allowUpdating: false,
              allowDeleting: false,
              useIcons: true,
              onAdd: () => {
                setSelectedRegister(null);
                setIsModalOpen(true);
              },
            }}
            export={{
              enabled: true,
              fileName: "Cajas_Registradoras",
              allowExportSelectedData: true,
              formats: ["xlsx"],
            }}
            columnChooser={true}
            columnFixing={true}
            summary={{
              totalItems: [
                {
                  column: "name",
                  summaryType: "count",
                  displayFormat: "Total: {0} cajas",
                },
              ],
            }}
            stateStoring={{
              enabled: true,
              type: "custom",
              storageKey: "cash-registers-grid",
              savingTimeout: 1000,
              customLoad,
              customSave,
            }}
            scrolling={{ mode: "standard" }}
            onRowRemoved={handleRowRemoved}
          />
        </div>
      </div>
      <AccessGate capability="treasury.cashRegisters.modify" fallback={null}>
        <CashRegisterModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedRegister(null);
          }}
          onSuccess={() => {
            setRefreshVersion((prev) => prev + 1);
          }}
          initialData={selectedRegister}
          registerTypes={registerTypes}
        />
      </AccessGate>
      <AccessGate capability="treasury.cashRegisters.settlement" fallback={null}>
        <CashRegisterSettlementModal
          isOpen={isSettlementModalOpen}
          onClose={() => {
            setIsSettlementModalOpen(false);
            setSelectedRegister(null);
          }}
          onSuccess={() => {
            setRefreshVersion((prev) => prev + 1);
          }}
          register={selectedRegister}
        />
      </AccessGate>
    </div>
  );
};

export default CashRegistersClient;
