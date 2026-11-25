'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Popup, Position, ToolbarItem } from 'devextreme-react/popup';
import Form, { GroupItem, SimpleItem } from 'devextreme-react/form';
import notify from 'devextreme/ui/notify';
import { Button } from '@repo/devextreme';
import { useAuth } from '@/contexts/AuthContext';
import { priceListsService } from '@repo/erp-services/priceLists/priceLists.service';
import { currenciesService } from '@repo/erp-services/payments_services/currencies.service';
import { listTypesService } from '@repo/erp-services/priceLists/listTypes.service';
import { PRICE_LIST_STATES, PRICE_LIST_POPULATE_MODES, FIELD_LIMITS } from '@/app/lib/constants/common.constants';
import { IFListType } from "@repo/api-contracts/erp";
import { IFPriceListCreate } from "@repo/api-contracts/erp";
import { IFOptionItem } from "@repo/api-contracts/erp";

interface AddNewPriceListProps {
    isOpen: boolean;
    onClose: () => void;
    onHidden?: () => void;
    onSuccess: () => void;
}

export default function AddNewPriceList({ isOpen, onClose, onHidden, onSuccess }: AddNewPriceListProps) {
    const { token, currentCompany } = useAuth();
    const formRef = useRef<any>(null);
    const [loading, setLoading] = useState(false);

    const [listTypes, setListTypes] = useState<IFListType[]>([]);
    const [currencies, setCurrencies] = useState<any[]>([]);
    const [sourcePricelists, setSourcePricelists] = useState<IFOptionItem[]>([]);
    const [showSourceSelect, setShowSourceSelect] = useState(false);

    const [formData, setFormData] = useState<IFPriceListCreate>({
        companyId: currentCompany?.id || '',
        name: '',
        pricelistTypeId: '',
        currencyId: currentCompany?.currencyId || '',
        state: 'draft',
        defaultMarginOverCostPct: 0,
        populateMode: 'empty',
        sourcePricelistId: '',
    });

    useEffect(() => {
        if (isOpen) {
            const nextData: IFPriceListCreate = {
                companyId: currentCompany?.id || '',
                name: '',
                pricelistTypeId: '',
                currencyId: currentCompany?.currencyId || '',
                state: 'draft',
                defaultMarginOverCostPct: 0,
                populateMode: 'empty',
                sourcePricelistId: '',
            };
            setFormData(nextData);
            setShowSourceSelect(false);

            setTimeout(() => {
                const formInstance = formRef.current?.instance();
                if (formInstance) {
                    formInstance.option("formData", nextData);
                    if (typeof formInstance.reset === "function") {
                        formInstance.reset();
                    }
                    formInstance.option("formData", nextData);
                }
            }, 0);
        }
    }, [isOpen, currentCompany?.id, currentCompany?.currencyId]);

    // Cargar monedas al abrir el modal
    useEffect(() => {
        const fetchCurrencies = async () => {
            if (!isOpen || !token) return;
            try {
                const res = await currenciesService.getAll(token);
                setCurrencies(res?.items || []);
            } catch (err) {
                console.error("Error loading currencies:", err);
            }
        };
        fetchCurrencies();
    }, [isOpen, token]);

    // Cargar listas de precios origen para clonar/copiar
    const fetchSourcePricelists = useCallback(async (selectedCompanyId: string) => {
        if (!token || !selectedCompanyId) {
            setSourcePricelists([]);
            return;
        }
        try {
            const res = await priceListsService.getOptions({ companyId: selectedCompanyId, limit: 100 }, token);
            setSourcePricelists(res?.items || []);
        } catch (err) {
            console.error("Error loading source price lists:", err);
        }
    }, [token]);

    // Cargar tipos de lista cuando cambie la compañía en formData o al abrir
    const handleCompanyChange = useCallback(async (selectedCompanyId: string) => {
        if (!token || !selectedCompanyId) {
            setListTypes([]);
            return;
        }
        try {
            const res = await listTypesService.getAll(token, selectedCompanyId);
            setListTypes(res?.items || []);
        } catch (err) {
            console.error("Error loading list types:", err);
        }
    }, [token]);

    useEffect(() => {
        if (isOpen && formData.companyId) {
            handleCompanyChange(formData.companyId);
            fetchSourcePricelists(formData.companyId);
        }
    }, [isOpen, formData.companyId, handleCompanyChange, fetchSourcePricelists]);

    const handleSubmit = useCallback(async () => {
        const formInstance = formRef.current?.instance();
        const result = formInstance?.validate();

        if (!result?.isValid) return;

        if (!token) {
            notify('Error de autenticación', 'error', 3000);
            return;
        }

        const currentFormData = formInstance?.option("formData") || formData;
        const isCopyMode = currentFormData.populateMode === 'copy_rules' || currentFormData.populateMode === 'copy_rules_remargin';

        setLoading(true);
        try {
            const payload: IFPriceListCreate = {
                companyId: currentFormData.companyId,
                name: currentFormData.name,
                pricelistTypeId: currentFormData.pricelistTypeId,
                currencyId: currentFormData.currencyId,
                state: currentFormData.state || 'draft',
                defaultMarginOverCostPct: Number(currentFormData.defaultMarginOverCostPct) || 0,
                populateMode: currentFormData.populateMode || 'empty',
                ...(isCopyMode && currentFormData.sourcePricelistId ? { sourcePricelistId: currentFormData.sourcePricelistId } : {}),
            };

            await priceListsService.create(payload, token);
            notify('Lista de precios creada exitosamente', 'success', 3000);
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            const errorMessage = error instanceof Error && error.message
                ? error.message
                : 'Error al crear la lista de precios';
            notify(errorMessage, 'error', 3000);
        } finally {
            setLoading(false);
        }
    }, [formData, token, onSuccess, onClose]);

    return (
        <Popup
            visible={isOpen}
            onHiding={onClose}
            onHidden={onHidden}
            onShown={(e) => {
                e.component.repaint();
            }}
            dragEnabled={false}
            hideOnOutsideClick={true}
            showCloseButton={true}
            showTitle={true}
            title="Crear Nueva Lista de Precios"
            width={600}
            height="auto"
        >
            <Position at="center" my="center" />
            <div className="p-4">
                <Form
                    ref={formRef}
                    formData={formData}
                    labelLocation="top"
                    onFieldDataChanged={(e) => {
                        if (e.dataField === "populateMode") {
                            const isCopy = e.value === "copy_rules" || e.value === "copy_rules_remargin";
                            setShowSourceSelect(isCopy);
                            if (!isCopy) {
                                const formInstance = formRef.current?.instance();
                                if (formInstance) {
                                    formInstance.updateData("sourcePricelistId", undefined);
                                }
                            }
                        }
                    }}
                >
                    <GroupItem colCount={2}>
                        <SimpleItem
                            dataField="companyId"
                            label={{ text: "Compañía" }}
                            editorType="dxSelectBox"
                            editorOptions={{
                                items: currentCompany ? [currentCompany] : [],
                                valueExpr: "id",
                                displayExpr: "name",
                                readOnly: true,
                                stylingMode: "filled",
                            }}
                            validationRules={[{ type: 'required', message: "La compañía es obligatoria" }]}
                        />
                        <SimpleItem
                            dataField="name"
                            label={{ text: "Nombre" }}
                            editorType="dxTextBox"
                            editorOptions={{
                                placeholder: "Ej: Lista Mayorista 2026",
                                valueChangeEvent: "blur",
                                stylingMode: "filled",
                                maxLength: FIELD_LIMITS.stringLong,
                            }}
                            validationRules={[
                                { type: 'required', message: "El nombre es obligatorio" },
                                { type: 'stringLength', max: FIELD_LIMITS.stringLong, message: `El nombre no puede superar los ${FIELD_LIMITS.stringLong} caracteres` }
                            ]}
                        />
                        <SimpleItem
                            dataField="pricelistTypeId"
                            label={{ text: "Tipo de Lista" }}
                            editorType="dxSelectBox"
                            editorOptions={{
                                items: listTypes,
                                valueExpr: "id",
                                displayExpr: "name",
                                placeholder: "Seleccione...",
                                searchEnabled: true,
                                stylingMode: "filled",
                            }}
                            validationRules={[{ type: 'required', message: "El tipo de lista es obligatorio" }]}
                        />
                        <SimpleItem
                            dataField="currencyId"
                            label={{ text: "Moneda" }}
                            editorType="dxSelectBox"
                            editorOptions={{
                                items: currencies,
                                valueExpr: "id",
                                displayExpr: "name",
                                placeholder: "Seleccione...",
                                searchEnabled: true,
                                stylingMode: "filled",
                            }}
                            validationRules={[{ type: 'required', message: "La moneda es obligatoria" }]}
                        />
                        <SimpleItem
                            dataField="state"
                            label={{ text: "Estado" }}
                            editorType="dxSelectBox"
                            editorOptions={{
                                items: PRICE_LIST_STATES,
                                valueExpr: "value",
                                displayExpr: "label",
                                stylingMode: "filled",
                            }}
                        />
                        <SimpleItem
                            dataField="defaultMarginOverCostPct"
                            label={{ text: "Margen por Defecto (%)" }}
                            editorType="dxNumberBox"
                            editorOptions={{
                                showSpinButtons: true,
                                stylingMode: "filled",
                                min: 0,
                            }}
                        />
                        <SimpleItem
                            dataField="populateMode"
                            label={{ text: "Modo de Población" }}
                            editorType="dxSelectBox"
                            colSpan={2}
                            editorOptions={{
                                items: PRICE_LIST_POPULATE_MODES,
                                valueExpr: "value",
                                displayExpr: "label",
                                stylingMode: "filled",
                            }}
                        />
                        {showSourceSelect && (
                            <SimpleItem
                                dataField="sourcePricelistId"
                                label={{ text: "Lista de Precios Origen" }}
                                editorType="dxSelectBox"
                                colSpan={2}
                                editorOptions={{
                                    items: sourcePricelists,
                                    valueExpr: "id",
                                    displayExpr: "label",
                                    placeholder: "Seleccione la lista de precios origen...",
                                    searchEnabled: true,
                                    stylingMode: "filled",
                                }}
                                validationRules={[{ type: 'required', message: "La lista de precios origen es obligatoria" }]}
                            />
                        )}
                    </GroupItem>
                </Form>
            </div>

            <ToolbarItem toolbar="bottom" location="after">
                <Button
                    text="Cancelar"
                    onClick={onClose}
                    disabled={loading}
                    stylingMode="text"
                    className="!bg-main/10"
                />
            </ToolbarItem>
            <ToolbarItem toolbar="bottom" location="after">
                <Button
                    text={loading ? "Creando..." : "Crear Lista de Precios"}
                    type="default"
                    stylingMode="contained"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="!bg-focus-300 !text-variant"
                />
            </ToolbarItem>
        </Popup>
    );
}
