'use client';

import { Button } from '@repo/devextreme';
import { Popup, Position, ToolbarItem } from "devextreme-react/popup";
import { TextBox } from "devextreme-react/text-box";
import { useEffect, useState } from "react";

interface RoleDeleteModalProps {
    visible: boolean;
    onHiding: () => void;
    onConfirm: () => void;
    roleName: string;
}

const RoleDeleteModal = ({ visible, onHiding, onConfirm, roleName }: RoleDeleteModalProps) => {
    const [inputValue, setInputValue] = useState("");

    useEffect(() => {
        if (!visible) {
            setInputValue("");
        }
    }, [visible]);

    const handleCancel = () => {
        onHiding();
    }

    const handleConfirm = () => {
        if (inputValue === roleName) {
            onConfirm();
            onHiding();
        }
    };

    const isMatch = inputValue === roleName;

    return (
        <Popup
            visible={visible}
            onHiding={handleCancel}
            dragEnabled={false}
            hideOnOutsideClick={true}
            showCloseButton={true}
            showTitle={true}
            title="Confirmar Eliminación"
            width="450"
            height="auto"
        >
            <Position at="center" my="center" />

            <div className="p-4 flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                    <h3 className="font-semibold text-lg">¿Esta seguro de eliminar el rol "{roleName}"?</h3>
                </div>


                <p className="text-sm ">
                    Por favor, escribe <span className="!text-focus-300 select-none underline">{roleName}</span> para confirmar:
                </p>
                <TextBox
                    value={inputValue}
                    valueChangeEvent="keyup"
                    onValueChanged={(e) => setInputValue(e.value)}
                    placeholder="Nombre de la clave..."
                    stylingMode="filled"
                    elementAttr={{ class: "!bg-primary-900 !rounded-dx border h-10" }}
                />

            </div>

            <ToolbarItem
                toolbar="bottom"
                location="after"
            >
                <Button
                    text="Cancelar"
                    onClick={handleCancel}
                    stylingMode="text"
                />
            </ToolbarItem>

            <ToolbarItem
                toolbar="bottom"
                location="after"
            >
                <Button
                    text="Eliminar Permanentemente"
                    type="danger"
                    stylingMode="contained"
                    onClick={handleConfirm}
                    disabled={!isMatch}
                    className="!rounded-dx"
                />
            </ToolbarItem>
        </Popup>
    );
};

export default RoleDeleteModal;
