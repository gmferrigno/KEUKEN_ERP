'use client';

import { Form, SimpleItem, Label, GroupItem } from 'devextreme-react/form';
import { Button } from '@repo/devextreme';
import { Popup, Position, ToolbarItem } from 'devextreme-react/popup';
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { IFCurrency, IFCompanyCreate } from '@repo/api-contracts/erp';

interface CompanyCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onHidden?: () => void;
    currencies: IFCurrency[];
    onSave: (values: IFCompanyCreate) => Promise<void>;
}

const emptyCreationData: IFCompanyCreate = {
    code: '',
    name: '',
    taxId: '',
    currencyId: '',
};

function CompanyCreationModal({
    isOpen,
    onClose,
    onHidden,
    currencies,
    onSave,
}: CompanyCreationModalProps) {
    const formRef = useRef<any>(null);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<IFCompanyCreate>(() => ({ ...emptyCreationData }));

    useEffect(() => {
        if (isOpen) {
            setFormData({ ...emptyCreationData });
            const formInstance = formRef.current?.instance();
            if (formInstance) {
                if (typeof formInstance.resetValues === 'function') {
                    formInstance.resetValues();
                }
                formInstance.option('formData', { ...emptyCreationData });
            }
        }
    }, [isOpen]);

    const handleHidden = useCallback(() => {
        setFormData({ ...emptyCreationData });
        setLoading(false);
        onHidden?.();
    }, [onHidden]);

    const handleSubmit = async () => {
        const formInstance = formRef.current?.instance();
        const validation = formInstance?.validate();
        if (!validation?.isValid) return;

        setLoading(true);
        try {
            const currentData = formInstance?.option('formData') ?? formData;
            await onSave(currentData);
        } finally {
            setLoading(false);
        }
    };

    const currencyDisplayExpr = useCallback((item: any) => {
        if (!item) return '';
        const symbolOrCode = item.isoCode || item.symbol || '';
        return symbolOrCode ? `${item.name} (${symbolOrCode})` : item.name;
    }, []);

    const formContent = useMemo(() => {
        return (
            <Form
                key={isOpen ? 'create-active' : 'create-idle'}
                ref={formRef}
                formData={formData}
                labelLocation="top"
            >
                <GroupItem colCount={2}>
                    <SimpleItem
                        dataField="code"
                        editorType="dxTextBox"
                        editorOptions={{
                            stylingMode: 'filled',
                            placeholder: 'Ej. EMP-01',
                        }}
                        isRequired={true}
                        validationRules={[
                            { type: 'required', message: 'El código de empresa es obligatorio' },
                        ]}
                    >
                        <Label text="Código de Empresa" />
                    </SimpleItem>

                    <SimpleItem
                        dataField="name"
                        editorType="dxTextBox"
                        editorOptions={{
                            stylingMode: 'filled',
                            placeholder: 'Nombre o razón social',
                        }}
                        isRequired={true}
                        validationRules={[
                            { type: 'required', message: 'El nombre es obligatorio' },
                        ]}
                    >
                        <Label text="Nombre / Razón Social" />
                    </SimpleItem>

                    <SimpleItem
                        dataField="taxId"
                        editorType="dxTextBox"
                        editorOptions={{
                            stylingMode: 'filled',
                            placeholder: 'Ej. 30-12345678-9',
                        }}
                    >
                        <Label text="CUIT / Identificación Fiscal" />
                    </SimpleItem>

                    <SimpleItem
                        dataField="currencyId"
                        editorType="dxSelectBox"
                        editorOptions={{
                            dataSource: currencies,
                            valueExpr: 'id',
                            displayExpr: currencyDisplayExpr,
                            searchEnabled: true,
                            showClearButton: true,
                            stylingMode: 'filled',
                            placeholder: 'Seleccione una moneda...',
                        }}
                    >
                        <Label text="Moneda Principal" />
                    </SimpleItem>
                </GroupItem>
            </Form>
        );
    }, [isOpen, formData, currencies, currencyDisplayExpr]);

    return (
        <Popup
            visible={isOpen}
            onHiding={onClose}
            onHidden={handleHidden}
            dragEnabled={false}
            hideOnOutsideClick={true}
            showCloseButton={true}
            showTitle={true}
            title="Nueva Empresa"
            width={580}
            height="auto"
            maxHeight="90vh"
            animation={{
                show: { type: 'fade', duration: 150, from: 0, to: 1 },
                hide: { type: 'fade', duration: 150, from: 1, to: 0 },
            }}
        >
            <Position at="center" my="center" of="window" />

            <div className="w-full flex flex-col gap-4 p-4">
                {formContent}
            </div>

            <ToolbarItem toolbar="bottom" location="after">
                <Button
                    text="Cancelar"
                    onClick={onClose}
                    disabled={loading}
                    stylingMode="text"
                    className="!rounded-dx !bg-main/10"
                />
            </ToolbarItem>
            <ToolbarItem toolbar="bottom" location="after">
                <Button
                    text="Guardar"
                    type="default"
                    stylingMode="contained"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="!bg-focus-300 shadow-lg shadow-black/20 !text-variant"
                />
            </ToolbarItem>
        </Popup>
    );
}

export default React.memo(CompanyCreationModal);
