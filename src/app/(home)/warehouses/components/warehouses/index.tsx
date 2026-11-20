'use client'

import { warehouseService } from "@repo/erp-services/warehouse/warehouse.service";
import { IWarehouse } from "@repo/api-contracts/erp";
import { mapWarehouseList } from "@repo/api-contracts/erp";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import FilteredWarehouses from "./filteredWarehouses";

interface WarehousesSectionProps {
    selectedWarehouseId?: string;
}

const WarehousesSection = ({ selectedWarehouseId }: WarehousesSectionProps) => {
    const { token, currentCompany } = useAuth();
    const [warehouses, setWarehouses] = useState<IWarehouse[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<boolean>(false);

    const fetchWarehouses = async () => {
        if (!token || !currentCompany?.id) return;
        setIsRefreshing(true);
        try {
            const response = await warehouseService.getAll(token, currentCompany.id);
            setWarehouses(mapWarehouseList(response.items));
            setError(false);
        } catch (err) {
            console.error("Error al cargar los almacenes:", err);
            setError(true);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        setWarehouses([]);
        setError(false);
        fetchWarehouses();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch al cambiar empresa / token
    }, [token, currentCompany?.id]);

    if (error) {
        return <div className="p-4 text-main">No se pudieron cargar los almacenes.</div>;
    }

    if (loading) {
        return (
            <div className="w-full flex items-center gap-x-1.5 h-fit">
                <div className="size-9 rounded-dx bg-primary-900/10 border border-primary-0/10 animate-pulse flex-shrink-0 flex items-center justify-center">
                    <div className="size-7 bg-primary-0/5 rounded-dx border border-primary-0/10"></div>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex flex-nowrap gap-x-1.5 overflow-hidden">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-9 w-36 max-w-[11rem] rounded-dx bg-primary-500 border border-primary-950 px-2.5 flex items-center gap-1.5 animate-pulse flex-shrink-0">
                                <div className="size-7 rounded-dx bg-focus-500/10 border border-focus-500/20"></div>
                                <div className="h-3 bg-main/10 rounded flex-1"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return <FilteredWarehouses warehouses={warehouses} selectedWarehouseId={selectedWarehouseId} fetchWarehouses={fetchWarehouses} isRefreshing={isRefreshing} />;
};

export default WarehousesSection;
