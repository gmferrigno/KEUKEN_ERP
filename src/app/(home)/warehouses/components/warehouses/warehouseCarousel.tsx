"use client";
import { IWarehouse } from "@repo/api-contracts/erp";
import { ScrollView } from "devextreme-react";
import WarehouseCreation from "./actions/creation";
import WarehouseCard from "./warehouseCard";

interface WarehouseCarouselProps {
    warehouses: IWarehouse[];
    selectedWarehouseId?: string;
    fetchWarehouses: () => Promise<void>;
    disabled?: boolean;
}

const WarehouseCarousel = ({ warehouses, selectedWarehouseId, fetchWarehouses, disabled }: WarehouseCarouselProps) => {
    return (
        <div className="w-full flex items-center gap-x-1.5 h-fit">
            <WarehouseCreation onSuccess={fetchWarehouses} disabled={disabled} />
            <div className="flex-1 min-w-0">
                <ScrollView
                    direction="horizontal"
                    showScrollbar="onHover"
                    useNative={false}
                    scrollByContent={false}
                    bounceEnabled={false}
                    width="100%"
                >
                    <div className="flex flex-nowrap gap-x-1.5">
                        {warehouses.map((warehouse) => (
                            <WarehouseCard key={warehouse.id} {...warehouse} isSelected={warehouse.id === selectedWarehouseId} fetchWarehouses={fetchWarehouses} />
                        ))}
                    </div>
                </ScrollView>
            </div>
        </div>
    );
};

export default WarehouseCarousel;
