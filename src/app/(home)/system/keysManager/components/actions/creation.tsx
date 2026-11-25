'use client';

import { Button } from '@repo/devextreme';
import { Popup, Position, ToolbarItem } from "devextreme-react/popup";
import { TextBox } from "devextreme-react/text-box";
import { NumberBox, TagBox } from "devextreme-react";
import { useState } from "react";
import { IFApiKeyCreate } from "@repo/api-contracts/erp";

interface RoleCreationModalProps {
    visible: boolean;
    onHiding: () => void;
    onSave: (payload: IFApiKeyCreate) => void;
    availableScopes?: string[];
}

const RoleCreationModal = ({
    visible,
    onHiding,
    onSave,
    availableScopes = [],
}: RoleCreationModalProps) => {
    const [roleName, setRoleName] = useState("");
    const [scopes, setScopes] = useState<string[]>([]);
    const [expiresInDays, setExpiresInDays] = useState<number | undefined>();

    const reset = () => {
        setRoleName("");
        setScopes([]);
        setExpiresInDays(undefined);
    };

    const handleCancel = () => {
        reset();
        onHiding();
    };

    const handleSave = () => {
        if (roleName.trim()) {
            onSave({
                name: roleName.trim(),
                scopes,
                expiresInDays: expiresInDays && expiresInDays > 0 ? expiresInDays : null,
            });
            reset();
            onHiding();
        }
    };

    return (
        <Popup
            visible={visible}
            onHiding={handleCancel}
            dragEnabled={false}
            hideOnOutsideClick={true}
            showCloseButton={true}
            showTitle={true}
            title="Nueva Clave"
            width={480}
            height="auto"
        >
            <Position at="center" my="center" />

            <div className="p-4 flex flex-col gap-3">
                <TextBox
                    label="Nombre de la clave"
                    value={roleName}
                    valueChangeEvent="keyup"
                    onValueChanged={(e) => setRoleName(e.value)}
                    placeholder="Ej: Clave de API"
                    labelMode="outside"
                    stylingMode="filled"
                    elementAttr={{ class: "!bg-primary-900 !rounded-dx" }}
                />
                <TagBox
                    label="Scopes"
                    labelMode="outside"
                    items={availableScopes}
                    value={scopes}
                    onValueChanged={(e) => setScopes(e.value || [])}
                    acceptCustomValue
                    searchEnabled
                    showSelectionControls
                    stylingMode="filled"
                    placeholder="Seleccioná o escribí scopes"
                />
                <NumberBox
                    label="Expira en (días, opcional)"
                    labelMode="outside"
                    value={expiresInDays}
                    onValueChanged={(e) =>
                        setExpiresInDays(
                            e.value == null || e.value === "" ? undefined : Number(e.value)
                        )
                    }
                    min={1}
                    showClearButton
                    stylingMode="filled"
                />
            </div>

            <ToolbarItem toolbar="bottom" location="after">
                <Button text="Cancelar" onClick={onHiding} stylingMode="text" />
            </ToolbarItem>

            <ToolbarItem toolbar="bottom" location="after">
                <Button
                    text="Crear Clave"
                    type="default"
                    stylingMode="contained"
                    onClick={handleSave}
                    disabled={!roleName.trim()}
                    className="!bg-focus-300 !rounded-dx"
                />
            </ToolbarItem>
        </Popup>
    );
};

export default RoleCreationModal;
