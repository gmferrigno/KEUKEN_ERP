"use client";

import PERMISSIONS_CONSTANTS from "@repo/access";
import { canDo } from "@repo/access";
import { useAuth } from "@/contexts/AuthContext";
import { DropDownButton } from "devextreme-react/drop-down-button";
import Link from "next/link";
import { useMemo, useState } from "react";
import { IWarehouse } from "@repo/api-contracts/erp";
import WarehouseDeletion from "./actions/deletion";
import WarehouseEdition from "./actions/edition";

const WarehouseCard = (item: IWarehouse & { isSelected?: boolean, fetchWarehouses: () => Promise<void> }) => {
    const { fetchWarehouses } = item;
    const [isEditionVisible, setEditionVisible] = useState(false);
    const [isDeletionVisible, setDeletionVisible] = useState(false);

    const { permissions } = useAuth();

    const handleEdit = () => {
        setEditionVisible(true);
    };

    const handleDelete = () => {
        setDeletionVisible(true);
    };

    const handleClone = () => {
        console.log("Acción: Clonar depósito", item.title);
    };

    const ActionIcon = (isSelected: boolean) => (
        <i className={`dx-icon-mediumiconslayout !text-sm !leading-none flex items-center justify-center h-full w-full ${isSelected ? '!text-variant' : '!text-main'}`} />
    );

    const canModify = useMemo(() => {
        return permissions ? canDo('modify', PERMISSIONS_CONSTANTS.modifyWarehouses, permissions) : false;
    }, [permissions]);

    const actionItems = [
        ...(canModify ? [{ id: 'edit', text: 'Editar', icon: 'edit', onClick: handleEdit }] : []),
        ...(canModify ? [{ id: 'delete', text: 'Eliminar', icon: 'trash', onClick: handleDelete }] : []),
        ...(canModify ? [{ id: 'clone', text: 'Clonar', icon: 'copy', onClick: handleClone }] : [])
    ];

    return (
        <div
            className={`h-9 select-none max-w-[11rem] flex-shrink-0 rounded-dx border pl-2.5 pr-1 flex items-center gap-1 transition-all duration-300 group ${
                item.isSelected
                    ? 'bg-focus-500 border-focus-300 shadow-sm'
                    : 'bg-primary-500 border-primary-950 hover:border-primary-900/50 hover:shadow-sm'
            }`}
        >
            <Link
                href={`/warehouses?warehouseId=${item.id}`}
                className="h-full min-w-0 flex-1 flex items-center gap-1.5"
            >
                <i
                    className={`dx-icon-${item.icon ?? 'home'} size-7 shrink-0 flex items-center justify-center text-sm leading-none ${
                        item.isSelected ? '!text-variant' : '!text-main'
                    }`}
                />

                <span
                    className={`text-xs font-bold leading-none truncate min-w-0 ${
                        item.isSelected ? 'text-variant' : 'text-main'
                    }`}
                >
                    {item.title}
                </span>
            </Link>

            {canModify && (
                <div className="relative z-10 shrink-0 flex items-center justify-center">
                    <DropDownButton
                        component={() => ActionIcon(!!item.isSelected)}
                        showArrowIcon={false}
                        stylingMode="text"
                        hoverStateEnabled={false}
                        focusStateEnabled={false}
                        useSelectMode={false}
                        dropDownOptions={{
                            width: 140,
                            wrapperAttr: {
                                class: "popup-menu-container"
                            }
                        }}
                        items={actionItems}
                        onItemClick={(e) => e.itemData?.onClick?.()}
                    />
                </div>
            )}

            <WarehouseEdition
                visible={isEditionVisible}
                onHiding={() => setEditionVisible(false)}
                warehouse={item}
                onSuccess={fetchWarehouses}
            />

            <WarehouseDeletion
                visible={isDeletionVisible}
                onHiding={() => setDeletionVisible(false)}
                warehouse={item}
                onSuccess={fetchWarehouses}
            />
        </div>
    );
};

export default WarehouseCard;
