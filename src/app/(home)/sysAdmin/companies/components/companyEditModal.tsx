'use client';

import { Form, SimpleItem, Label, GroupItem } from 'devextreme-react/form';
import { Button } from '@repo/devextreme';
import { Popup, Position, ToolbarItem } from 'devextreme-react/popup';
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { IFCurrency, IFCompany, IFCompanyUpdate } from '@repo/api-contracts/erp';

interface CompanyEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onHidden?: () => void;
    company: IFCompany | null;
    currencies: IFCurrency[];
    onSave: (values: IFCompanyUpdate) => Promise<void>;
}

const emptyEditData: IFCompanyUpdate & { id?: string; active?: boolean } = {
    id: '',
    name: '',
    taxId: '',
    currencyId: '',
    active: true,
};

function CompanyEditModal({
    isOpen,
    onClose,
    onHidden,
    company,
    currencies,
    onSave,
}: CompanyEditModalProps) {
    const formRef = useRef<any>(null);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<any>(() => ({ ...emptyEditData }));

    useEffect(() => {
        if (isOpen && company) {
            const nextData = {
                id: company.id,
                name: company.name || '',
                taxId: company.taxId || '',
                currencyId: company.currencyId || '',
                active: company.active ?? true,
            };
            setFormData(nextData);

            const formInstance = formRef.current?.instance();
            if (formInstance) {
                formInstance.option('formData', nextData);
            }
        }
    }, [isOpen, company]);

    const handleHidden = useCallback(() => {
        setFormData({ ...emptyEditData });
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
            await onSave({
                name: currentData.name,
                taxId: currentData.taxId || undefined,
                currencyId: currentData.currencyId || undefined,
            });
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
                key={company?.id || 'empty-company'}
                ref={formRef}
                formData={formData}
                labelLocation="top"
            >
                <GroupItem colCount={2}>
                    <SimpleItem
                        dataField="id"
                        editorOptions={{
                            stylingMode: 'filled',
                            readOnly: true,
                        }}
                    >
                        <Label text="ID" />
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
    }, [company?.id, formData, currencies, currencyDisplayExpr]);

    return (
        <Popup
            visible={isOpen}
            onHiding={onClose}
            onHidden={handleHidden}
            dragEnabled={false}
            hideOnOutsideClick={true}
            showCloseButton={true}
            showTitle={true}
            title="Detalle de Empresa"
            width={600}
            height="auto"
            maxHeight="90vh"
            animation={{
                show: { type: 'fade', duration: 150, from: 0, to: 1 },
                hide: { type: 'fade', duration: 150, from: 1, to: 0 },
            }}
        >
            <Position at="center" my="center" of="window" />

            <div className="w-full flex flex-col gap-4 p-3">
                {company && (
                    <div className="relative flex items-center gap-4 p-4 rounded-dx bg-linear-to-r from-primary-900/60 to-primary-900/20 border border-primary-500/10 shadow-sm overflow-hidden mb-2">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-focus-500/80" />

                        {/* Avatar con dot de estado Activo/Inactivo con tooltip */}
                        <div className="relative shrink-0">
                            <div className="w-12 h-12 rounded-full bg-focus-100 flex items-center justify-center text-focus-500 text-xl font-bold border border-focus-300 shadow-sm">
                                {company.name ? company.name[0].toUpperCase() : 'E'}
                            </div>
                            <span
                                title={company.active ? 'Activa' : 'Inactiva'}
                                className={`absolute bottom-0 right-0 size-3.5 rounded-full ring-2 ring-primary-900 transition-colors ${
                                    company.active ? 'bg-success' : 'bg-main/30'
                                }`}
                            />
                        </div>

                        <div className="flex flex-col min-w-0 flex-1">
                            <h3 className="text-lg font-bold text-main truncate leading-tight">
                                {company.name}
                            </h3>
                            <p className="text-main/70 text-sm truncate">
                                {company.taxId ? `CUIT: ${company.taxId}` : 'Sin CUIT asignado'}
                            </p>
                        </div>
                    </div>
                )}

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

export default React.memo(CompanyEditModal);
