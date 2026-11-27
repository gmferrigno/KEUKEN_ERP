'use client';

import { useEffect, useMemo, useState } from "react";
import { HeaderSelectBox } from "@repo/devextreme";
import notify from "devextreme/ui/notify";
import { LIST_TYPE_OPERATION_OPTIONS } from "@/app/lib/constants/priceList.constants";
import { listTypesService } from "@repo/erp-services/priceLists/listTypes.service";
import { priceListsService } from "@repo/erp-services/priceLists/priceLists.service";
import { IFListType } from "@repo/api-contracts/erp";
import { IFPriceList } from "@repo/api-contracts/erp";

const ALL_VALUE = "ALL";

interface TableHeaderProps {
    selectedPriceListId: string | null;
    onPriceListChange: (id: string | null) => void;
    disabled?: boolean;
    token: string | null;
    companyId: string | undefined;
    queryId?: string | null;
    onResetSelection?: () => void;
}

export default function TableHeader({
    selectedPriceListId,
    onPriceListChange,
    disabled = false,
    token,
    companyId,
    queryId,
    onResetSelection
}: TableHeaderProps) {
    const [selectedOperation, setSelectedOperation] = useState<string>(ALL_VALUE);
    const [selectedListTypeId, setSelectedListTypeId] = useState<string>(ALL_VALUE);

    const [listTypes, setListTypes] = useState<IFListType[]>([]);
    const [priceLists, setPriceLists] = useState<IFPriceList[]>([]);

    const [isLoadingListTypes, setIsLoadingListTypes] = useState<boolean>(false);
    const [isLoadingPriceLists, setIsLoadingPriceLists] = useState<boolean>(false);

    const operationOptions = useMemo(() => [
        { id: ALL_VALUE, name: "Todas" },
        ...LIST_TYPE_OPERATION_OPTIONS
    ], []);

    const listTypeOptions = useMemo(() => [
        { id: ALL_VALUE, name: "Todos" },
        ...listTypes
    ], [listTypes]);

    useEffect(() => {
        const fetchListTypes = async () => {
            if (!token || !companyId) return;
            setIsLoadingListTypes(true);
            try {
                const opParam = selectedOperation === ALL_VALUE ? null : selectedOperation;
                const res = await listTypesService.getAll(
                    token,
                    companyId,
                    100,
                    0,
                    opParam
                );
                setListTypes(res.items);
            } catch (err: any) {
                console.error("Error al obtener tipos de lista:", err);
                notify("No se pudieron obtener los tipos de listas", "error", 3000);
            } finally {
                setIsLoadingListTypes(false);
            }
        };
        fetchListTypes();
    }, [token, companyId, selectedOperation]);

    useEffect(() => {
        const fetchPriceLists = async () => {
            if (!token || !companyId) return;
            setIsLoadingPriceLists(true);
            try {
                const typeParam = selectedListTypeId === ALL_VALUE ? null : selectedListTypeId;
                const opParam = selectedOperation === ALL_VALUE ? null : selectedOperation;
                const res = await priceListsService.getAll(
                    token,
                    companyId,
                    100,
                    0,
                    {
                        pricelistTypeId: typeParam,
                        operation: opParam
                    }
                );
                setPriceLists(res.items);

                if (queryId && res.items.some(item => item.id === queryId)) {
                    onPriceListChange(queryId);
                }
            } catch (err: any) {
                console.error("Error al obtener listas de precios:", err);
                notify("No se pudieron obtener las listas de precios", "error", 3000);
            } finally {
                setIsLoadingPriceLists(false);
            }
        };
        fetchPriceLists();
    }, [token, companyId, selectedListTypeId, selectedOperation]);

    const handleOperationChange = (e: any) => {
        const value = e.value || ALL_VALUE;
        setSelectedOperation(value);
        setSelectedListTypeId(ALL_VALUE);
        onPriceListChange(null);
        if (onResetSelection) onResetSelection();
    };

    const handleListTypeChange = (e: any) => {
        const value = e.value || ALL_VALUE;
        setSelectedListTypeId(value);
        onPriceListChange(null);
        if (onResetSelection) onResetSelection();
    };

    const handlePriceListChange = (e: any) => {
        const value = e.value as string | null;
        onPriceListChange(value || null);
        if (onResetSelection) onResetSelection();
    };

    return (
        <div className="w-full bg-main/5 border border-main/10 rounded-dx p-4 flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-main/70">
                        Operación
                    </label>
                    <HeaderSelectBox
                        dataSource={operationOptions}
                        valueExpr="id"
                        displayExpr="name"
                        value={selectedOperation}
                        onValueChanged={handleOperationChange}
                        placeholder="Todas"
                        searchEnabled={true}
                        showClearButton={false}
                        stylingMode="filled"
                        disabled={disabled}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-main/70">
                        Tipo de Lista
                    </label>
                    <HeaderSelectBox
                        dataSource={listTypeOptions}
                        valueExpr="id"
                        displayExpr="name"
                        value={selectedListTypeId}
                        onValueChanged={handleListTypeChange}
                        placeholder="Todos"
                        searchEnabled={true}
                        showClearButton={false}
                        stylingMode="filled"
                        disabled={disabled || isLoadingListTypes}
                    />
                </div>
            </div>
            <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-main/70">
                    Lista de Precios
                </label>
                <HeaderSelectBox
                    dataSource={priceLists}
                    valueExpr="id"
                    displayExpr="name"
                    value={selectedPriceListId}
                    onValueChanged={handlePriceListChange}
                    placeholder="Seleccione una lista de precios..."
                    searchEnabled={true}
                    showClearButton={true}
                    stylingMode="filled"
                    disabled={disabled || isLoadingPriceLists}
                />
            </div>
        </div>
    );
}
