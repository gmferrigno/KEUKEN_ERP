"use client";


import { useRecovery, RECOVERY_ENTITIES } from "@repo/recovery";
import { commonService } from "@repo/erp-services/common.service";
import PERMISSIONS_CONSTANTS from "@repo/access";
import { canDo } from "@repo/access";

import { useAuth } from "@/contexts/AuthContext";
import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { GenericDataGrid, HeaderSelectBox, IGenericDataGridColumn } from '@repo/devextreme';
import GenericEmpty from "@/components/GenericEmpty";
import CustomStore from "devextreme/data/custom_store";
import CheckBox from "devextreme-react/check-box";
import notify from "devextreme/ui/notify";
import { createGridStateStorage } from "@/lib/storage/gridStateStorage";
import { serialNumbersService } from "@repo/erp-services/serialNumbers.service";
import { itemsService } from "@repo/erp-services/product_services/items.service";
import { IFOptionItem } from "@repo/api-contracts/erp";
import { SERIAL_NUMBER_STATES } from "@/app/lib/constants/common.constants";
import SerialNumberModal from "./components/actions/serialNumberModal";
import { purgeWithDryRunConfirm } from "@/app/lib/utils/purgeConfirm";

const { customLoad, customSave } = createGridStateStorage({
  gridId: "serial-numbers-grid",
});

const SerialNumbersClient = () => {
  const { isRecoveryMode, canRestore, canPurge, recoveryVisibility } = useRecovery();
  const { token, currentCompany, permissions, loading, isSuperAdmin, includeInactive } = useAuth();
  const gridRef = useRef<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [items, setItems] = useState<IFOptionItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);

  const canView = useMemo(() => {
    if (isSuperAdmin) return true;
    return permissions ? canDo('view', ['stock'], permissions) : false;
  }, [permissions, isSuperAdmin]);

  const canModify = useMemo(() => {
    if (isSuperAdmin) return true;
    return permissions ? canDo('modify', PERMISSIONS_CONSTANTS.modifyStock, permissions) : false;
  }, [permissions, isSuperAdmin]);

  useEffect(() => {
    setRefreshVersion(prev => prev + 1);
    if (gridRef.current?.instance?.refresh) {
      gridRef.current.instance.refresh();
    } else if (gridRef.current?.refresh) {
      gridRef.current.refresh();
    }
  }, [isRecoveryMode, recoveryVisibility, includeInactive]);

  useEffect(() => {
    const fetchItems = async () => {
      if (!token || !currentCompany?.id) return;
      try {
        const response = await itemsService.getAll(currentCompany.id, { limit: 1000, offset: 0 }, token);
        const serializableItems = response.items
          .filter(item => item.isSerializable)
          .map(item => ({ id: item.id, label: `${item.sku} - ${item.itemName}` }));
        setItems(serializableItems);
      } catch (error) {
        console.error("Error fetching items:", error);
        notify("Error al cargar los artículos", "error", 3000);
      }
    };
    fetchItems();
  }, [token, currentCompany?.id]);

  const dataSource = useMemo(() => {
    return new CustomStore({
      key: "id",
      load: async () => {
        if (!selectedItemId) {
          return { data: [], totalCount: 0 };
        }
        try {
          const response = await serialNumbersService.getAll(selectedItemId, token, currentCompany?.id);
          return {
            data: response.items,
            totalCount: response.metadata.totalItems,
          };
        } catch (error: any) {
          console.error("Error al cargar serial numbers:", error);
          const errorMessage = error instanceof Error && error.message ? error.message : "Error al cargar serial numbers";
          notify(errorMessage, "error", 3000);
          return { data: [], totalCount: 0 };
        }
      },
    });
  }, [token, currentCompany?.id, selectedItemId, refreshVersion, isRecoveryMode, recoveryVisibility, includeInactive]);

  const handleRowRemoved = useCallback(async (data: any) => {
    try {
      const targetData = data.data || data;
      await serialNumbersService.delete(targetData.id, token, currentCompany?.id);
      setRefreshVersion(prev => prev + 1);
      if (gridRef.current?.instance?.refresh) {
        gridRef.current.instance.refresh();
      } else if (gridRef.current?.refresh) {
        gridRef.current.refresh();
      }
      notify("Número de serie eliminado", "success", 3000);
    } catch (error: any) {
      console.error("Error al eliminar número de serie:", error);
      const errorMessage = error instanceof Error && error.message ? error.message : "Error al eliminar número de serie";
      notify(errorMessage, "error", 3000);
    }
  }, [token, currentCompany?.id]);

  const handleRestore = useCallback(async (data: any) => {
    try {
      await commonService.restore(RECOVERY_ENTITIES.SERIAL_NUMBER.schema, RECOVERY_ENTITIES.SERIAL_NUMBER.table, data.id, token);
      setRefreshVersion(prev => prev + 1);
      if (gridRef.current?.instance?.refresh) {
        gridRef.current.instance.refresh();
      } else if (gridRef.current?.refresh) {
        gridRef.current.refresh();
      }
      notify("Número de serie restaurado exitosamente", "success", 3000);
    } catch (error: any) {
      console.error("Error al restaurar número de serie:", error);
      notify(error?.message || "Error al restaurar el registro", "error", 3000);
    }
  }, [token]);

  const handlePurge = useCallback(async (data: any) => {
    const ok = await purgeWithDryRunConfirm({
      schema: RECOVERY_ENTITIES.SERIAL_NUMBER.schema,
      table: RECOVERY_ENTITIES.SERIAL_NUMBER.table,
      id: data.id,
      token,
      label: data.serialNumber || data.id,
    });
    if (!ok) return;
    setRefreshVersion((prev) => prev + 1);
    gridRef.current?.instance?.refresh?.() ?? gridRef.current?.refresh?.();
  }, [token]);

  const actions = useMemo(() => [
    {
      icon: "edit",
      hint: "Editar",
      onClick: (data: any) => {
        setSelectedItem(data);
        setIsModalOpen(true);
      },
      visible: (e: any) => !isRecoveryMode && (e.active ?? true) && canModify,
    },
    {
      icon: "trash",
      hint: "Eliminar",
      onClick: (data: any) => handleRowRemoved(data),
      visible: (e: any) => !isRecoveryMode && (e.active ?? true) && canModify,
    },
    {
      icon: "revert",
      hint: "Restaurar",
      onClick: (data: any) => handleRestore(data),
      visible: (e: any) =>
        isRecoveryMode
          ? canRestore
          : !(e.active ?? true) && canRestore,
    },
    {
      icon: "clearsquare",
      hint: "Purge (irreversible)",
      onClick: (data: any) => handlePurge(data),
      visible: () => isRecoveryMode && canPurge,
    },
  ], [canModify, canRestore, canPurge, isRecoveryMode, handleRestore, handlePurge, handleRowRemoved]);

  const columns: IGenericDataGridColumn[] = useMemo(() => {
    const cols: IGenericDataGridColumn[] = [
      { dataField: "id", caption: "ID", visible: false },
      { dataField: "serialNumber", caption: "Serial Number", allowSorting: true },
      { dataField: "itemId", caption: "Item ID", visible: false },
      { dataField: "batchId", caption: "Batch ID", visible: false },
      { dataField: "notes", caption: "Notas" },
      {
        dataField: "state",
        caption: "Estado",
        allowSorting: true,
        lookup: {
          dataSource: SERIAL_NUMBER_STATES,
          valueExpr: "value",
          displayExpr: "label",
        },
      },
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
  }, [isRecoveryMode, includeInactive]);

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
    <div className="flex flex-col w-full h-full rounded-dx font-sans overflow-hidden">
      <div className="w-full h-full flex flex-col gap-y-2">
        <div className="w-full flex flex-col items-end justify-between">
          <div className="flex w-full items-center">
            <div className="w-full">
              <HeaderSelectBox
                dataSource={items}
                valueExpr="id"
                displayExpr="label"
                value={selectedItemId}
                onValueChanged={(e) => setSelectedItemId(e.value)}
                placeholder="Seleccione un artículo..."
                searchEnabled={true}
                showClearButton={true}
                stylingMode="filled"
              />
            </div>
          </div>
        </div>

        <div className="w-full flex-1 min-h-0 flex flex-col">
          {selectedItemId ? (
            <GenericDataGrid
                            recoveryVisibility={recoveryVisibility}
              ref={gridRef}
              gridId="serial-numbers-grid"
              keyExpr="id"
              dataSource={dataSource}
              remoteOperations={true}
              columns={columns}
              actions={actions}
              noDataText="No se encontraron números de serie para este artículo"
              editing={{
                allowAdding: isRecoveryMode ? false : canModify,
                allowUpdating: false,
                allowDeleting: false,
                useIcons: true,
                onAdd: () => {
                  setSelectedItem(null);
                  setIsModalOpen(true);
                },
              }}
              stateStoring={{
                enabled: true,
                type: "custom",
                storageKey: "serial-numbers-grid",
                customLoad,
                customSave,
              }}
            />
          ) : (
            <GenericEmpty
              title="Sin artículo seleccionado"
              description="Por favor, seleccione un artículo en el desplegable superior para ver y gestionar sus números de serie."
            />
          )}
        </div>
      </div>
      <SerialNumberModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
        }}
        onHidden={() => {
          setSelectedItem(null);
        }}
        onSuccess={() => {
          setRefreshVersion(prev => prev + 1);
          if (gridRef.current?.instance?.refresh) {
            gridRef.current.instance.refresh();
          } else if (gridRef.current?.refresh) {
            gridRef.current.refresh();
          }
        }}
        initialData={selectedItem}
        defaultItemId={selectedItemId}
      />
    </div>
  );
};

export default SerialNumbersClient;
