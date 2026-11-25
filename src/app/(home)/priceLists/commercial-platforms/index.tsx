"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useMemo, useRef, useState } from "react";
import { GenericDataGrid, IGenericDataGridColumn } from '@repo/devextreme';
import CustomStore from "devextreme/data/custom_store";
import { CheckBox } from 'devextreme-react/check-box';
import notify from "devextreme/ui/notify";
import { createGridStateStorage } from "@/lib/storage/gridStateStorage";
import { commercialPlatformsService } from "@repo/erp-services/partners/commercialPlatforms.service";
import CommercialPlatformModal from "./components/actions/commercialPlatformModal";
import { canDo } from "@repo/access";
import { mapCommercialCatalogError } from "@repo/erp-api-client";

const { customLoad, customSave } = createGridStateStorage({
  gridId: "commercial-platforms-grid",
});

const CommercialPlatformsClient = () => {
  const { token, currentCompany, permissions, loading, includeInactive, isSuperAdmin } = useAuth();
  const gridRef = useRef<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);

  const canView = useMemo(() => {
    if (isSuperAdmin) return true;
    return permissions ? canDo('view', ['commercialPriceLists'], permissions) : false;
  }, [permissions, isSuperAdmin]);

  const canModify = useMemo(() => {
    if (isSuperAdmin) return true;
    return permissions ? canDo('modify', ['commercialPriceLists'], permissions) : false;
  }, [permissions, isSuperAdmin]);

  const dataSource = useMemo(() => {
    return new CustomStore({
      key: "id",
      load: async (loadOptions: any) => {
        try {
          const params = {
            limit: loadOptions.take || 20,
            offset: loadOptions.skip || 0,
            companyId: currentCompany?.id || undefined,
            active: includeInactive ? undefined : true,
          };
          const response = await commercialPlatformsService.getAll(params, token);
          return {
            data: response.items,
            totalCount: response.metadata.totalItems,
          };
        } catch (error: any) {
          console.error("Error loading commercial platforms:", error);
          const errorMessage = error instanceof Error && error.message 
            ? error.message 
            : "Error al cargar plataformas comerciales";
          notify(errorMessage, "error", 3000);
          return { data: [], totalCount: 0 };
        }
      },
    });
  }, [refreshVersion, token, currentCompany?.id, includeInactive]);

  const handleRowRemoved = async (e: any) => {
    try {
      const data = e.data || e;
      await commercialPlatformsService.delete(
        data.id,
        token,
        currentCompany?.id
      );
      setRefreshVersion((prev) => prev + 1);
      if (gridRef.current?.instance?.refresh) {
        gridRef.current.instance.refresh();
      } else if (gridRef.current?.refresh) {
        gridRef.current.refresh();
      }
      notify("Plataforma comercial eliminada exitosamente", "success", 3000);
    } catch (error: any) {
      console.error("Error deleting commercial platform:", error);
      notify(mapCommercialCatalogError(error), "error", 4500);
    }
  };

  const actions = useMemo(() => [
    {
      icon: "edit",
      hint: "Editar",
      onClick: (data: any) => {
        setSelectedItem(data);
        setIsModalOpen(true);
      },
      visible: () => canModify,
    },
    {
      icon: "trash",
      hint: "Eliminar",
      onClick: (data: any) => handleRowRemoved(data),
      visible: (e: any) => e.active && canModify,
    },
  ], [canModify]);

  const columns: IGenericDataGridColumn[] = useMemo(() => [
    { dataField: "id", caption: "ID", visible: false },
    { dataField: "code", caption: "Código", allowSorting: true },
    { dataField: "name", caption: "Nombre", allowSorting: true },
    {
      dataField: "active",
      caption: "Activo",
      allowEditing: false,
      width: 100,
      alignment: "center",
      visible: includeInactive,
      cellRender: (cellData: any) => (
        <div className="flex justify-center items-center h-full">
          <CheckBox value={cellData.value} readOnly />
        </div>
      ),
    },
  ], [includeInactive]);

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
    <div className="flex flex-col w-full h-full rounded-dx">
      <GenericDataGrid
        ref={gridRef}
        gridId="commercial-platforms-grid"
        keyExpr="id"
        dataSource={dataSource}
        remoteOperations={true}
        columns={columns}
        actions={actions}
        editing={{
          allowAdding: canModify,
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
          storageKey: "commercial-platforms-grid",
          customLoad,
          customSave,
        }}
      />
      <CommercialPlatformModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
        }}
        onHidden={() => {
          setSelectedItem(null);
        }}
        onSuccess={() => {
          setRefreshVersion((prev) => prev + 1);
          if (gridRef.current?.instance?.refresh) {
            gridRef.current.instance.refresh();
          } else if (gridRef.current?.refresh) {
            gridRef.current.refresh();
          }
        }}
        initialData={selectedItem}
      />
    </div>
  );
};

export default CommercialPlatformsClient;
