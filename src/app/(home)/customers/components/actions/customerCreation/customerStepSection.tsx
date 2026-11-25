"use client";

import { RefObject, useEffect, useMemo, useRef, useState } from "react";
import Form, { Item } from "devextreme-react/form";
import type { IFAccount, IFOptionItem } from "@repo/api-contracts/erp";
import { statesService } from "@repo/erp-services/location_services/states.service";
import { citiesService } from "@repo/erp-services/location_services/cities.service";
import { fiscalPositionsService } from "@repo/erp-services/accountant/fiscalPositions.service";
import { accountsService } from "@repo/erp-services/accountant/accounts.service";
import { paymentTermsService } from "@repo/erp-services/payments_services/paymentTerms.service";

export interface CustomerStepSectionProps {
    formRef: RefObject<any>;
    formData: any;
    countries: any[];
    selectedCountryCode: string;
    setSelectedCountryCode: (code: string) => void;
    companyId?: string | null;
    companyName?: string | null;
    token: string | null | undefined;
    isActive: boolean;
}

const optionDisplay = (item: IFOptionItem | null | undefined) =>
    item ? (item.code ? `${item.code} — ${item.label}` : item.label) : "";

const CustomerStepSection = ({
    formRef,
    formData,
    countries,
    selectedCountryCode,
    setSelectedCountryCode,
    companyId,
    companyName,
    token,
    isActive,
}: CustomerStepSectionProps) => {
    const hasCountry = Boolean(selectedCountryCode);

    const initialStatesRef = useRef<any[]>([]);
    const initialCitiesRef = useRef<any[]>([]);
    const initialFiscalRef = useRef<any[]>([]);
    const stateEditorRef = useRef<any>(null);
    const cityEditorRef = useRef<any>(null);
    const fiscalEditorRef = useRef<any>(null);

    const [paymentTermOptions, setPaymentTermOptions] = useState<IFOptionItem[]>([]);
    const [glAccounts, setGlAccounts] = useState<IFAccount[]>([]);

    const glAccountOptions = useMemo(
        () =>
            glAccounts.map((acc) => ({
                id: acc.id,
                displayLabel: `${acc.code} — ${acc.name}`,
            })),
        [glAccounts]
    );

    const loadFiscalPositions = () => {
        if (!token || !companyId) {
            fiscalEditorRef.current?.option("dataSource", []);
            fiscalEditorRef.current?.option("disabled", true);
            return;
        }
        fiscalPositionsService
            .getAll(token, companyId)
            .then((res) => {
                initialFiscalRef.current = (res.items || []).filter((p) => p.active);
                fiscalEditorRef.current?.option("dataSource", initialFiscalRef.current);
                fiscalEditorRef.current?.option("disabled", false);
            })
            .catch(() => {
                initialFiscalRef.current = [];
                fiscalEditorRef.current?.option("dataSource", []);
                fiscalEditorRef.current?.option("disabled", true);
            });
    };

    const loadContractOptionals = () => {
        if (!token || !companyId) {
            setPaymentTermOptions([]);
            setGlAccounts([]);
            return;
        }

        paymentTermsService
            .getOptions({ companyId, limit: 200 }, token)
            .then((res) => setPaymentTermOptions(res?.items || []))
            .catch(() => setPaymentTermOptions([]));

        accountsService
            .getAll(token, companyId, { limit: 500, chart_status: "active" })
            .then((res) => setGlAccounts(res?.items || []))
            .catch(() => setGlAccounts([]));
    };

    useEffect(() => {
        if (!isActive || !token || !formData.countryIsoCode) return;

        let cancelled = false;
        const countryCode = formData.countryIsoCode;
        const stateCode = formData.stateCode;
        setSelectedCountryCode(countryCode);

        statesService.getAll(token, countryCode).then((res) => {
            if (cancelled) return;
            initialStatesRef.current = res.items || [];
            stateEditorRef.current?.option("dataSource", initialStatesRef.current);
            stateEditorRef.current?.option("disabled", false);

            const stateObj = initialStatesRef.current.find((s: any) => s.code === stateCode);
            if (!stateObj) return;

            citiesService.getAll(token, stateObj.id).then((citiesRes) => {
                if (cancelled) return;
                initialCitiesRef.current = citiesRes.items || [];
                cityEditorRef.current?.option("dataSource", initialCitiesRef.current);
                cityEditorRef.current?.option("disabled", false);
            });
        });

        if (companyId) {
            fiscalPositionsService
                .getAll(token, companyId)
                .then((res) => {
                    if (cancelled) return;
                    initialFiscalRef.current = (res.items || []).filter((p) => p.active);
                    fiscalEditorRef.current?.option("dataSource", initialFiscalRef.current);
                    fiscalEditorRef.current?.option("disabled", false);
                });
        }

        return () => {
            cancelled = true;
        };
    }, [
        isActive,
        token,
        companyId,
        formData.countryIsoCode,
        formData.stateCode,
        setSelectedCountryCode,
    ]);

    useEffect(() => {
        if (!isActive) return;
        loadFiscalPositions();
        loadContractOptionals();
    }, [isActive, token, companyId]);

    return (
        <Form
            ref={formRef}
            formData={formData}
            labelLocation="top"
            showValidationSummary={true}
            colCount={2}
        >
            <Item
                dataField="companyId"
                editorType="dxTextBox"
                isRequired={true}
                label={{
                    text: companyName
                        ? `Compañía — ${companyName}`
                        : "Compañía (ID)",
                }}
                editorOptions={{
                    readOnly: true,
                }}
            />
            <Item
                dataField="code"
                editorType="dxTextBox"
                isRequired={true}
                label={{ text: "Código" }}
            />
            <Item
                dataField="name"
                editorType="dxTextBox"
                isRequired={true}
                label={{ text: "Nombre / Razón Social" }}
            />
            <Item
                dataField="email"
                editorType="dxTextBox"
                label={{ text: "Email" }}
            />
            <Item
                dataField="countryIsoCode"
                editorType="dxSelectBox"
                isRequired={true}
                label={{ text: "País" }}
                editorOptions={{
                    dataSource: countries,
                    valueExpr: "code",
                    displayExpr: "name",
                    searchEnabled: true,
                    placeholder: "Seleccione un país...",
                    onValueChanged: (e: any) => {
                        if (!e.event) return;

                        const nextCountry = e.value || "";
                        setSelectedCountryCode(nextCountry);

                        formRef.current?.instance().updateData("stateCode", "");
                        formRef.current?.instance().updateData("cityCode", "");
                        formRef.current?.instance().updateData("taxId", "");

                        stateEditorRef.current?.option("dataSource", []);
                        stateEditorRef.current?.option("disabled", true);
                        cityEditorRef.current?.option("dataSource", []);
                        cityEditorRef.current?.option("disabled", true);

                        if (!nextCountry) return;

                        statesService.getAll(token!, nextCountry).then((res) => {
                            stateEditorRef.current?.option("dataSource", res.items);
                            stateEditorRef.current?.option("disabled", false);
                        });
                    },
                }}
            />
            <Item
                dataField="stateCode"
                editorType="dxSelectBox"
                isRequired={true}
                label={{ text: "Estado/Provincia" }}
                editorOptions={{
                    onInitialized: (e: any) => {
                        stateEditorRef.current = e.component;
                    },
                    dataSource: initialStatesRef.current,
                    valueExpr: "code",
                    displayExpr: "name",
                    searchEnabled: true,
                    placeholder: "Seleccione una provincia...",
                    disabled: !hasCountry,
                    onValueChanged: (e: any) => {
                        if (!e.event) return;
                        formRef.current?.instance().updateData("cityCode", "");
                        cityEditorRef.current?.option("dataSource", []);
                        cityEditorRef.current?.option("disabled", true);

                        if (!e.value) return;
                        const statesArray =
                            stateEditorRef.current?.option("dataSource") ||
                            initialStatesRef.current;
                        const stateObj = statesArray.find(
                            (s: any) => s.code === e.value
                        );
                        if (!stateObj) return;
                        citiesService.getAll(token!, stateObj.id).then((res) => {
                            cityEditorRef.current?.option("dataSource", res.items);
                            cityEditorRef.current?.option("disabled", false);
                        });
                    },
                }}
            />
            <Item
                dataField="cityCode"
                editorType="dxSelectBox"
                isRequired={true}
                label={{ text: "Ciudad" }}
                editorOptions={{
                    onInitialized: (e: any) => {
                        cityEditorRef.current = e.component;
                    },
                    dataSource: initialCitiesRef.current,
                    valueExpr: "code",
                    displayExpr: "name",
                    searchEnabled: true,
                    placeholder: "Seleccione una ciudad...",
                    disabled: true,
                }}
            />
            <Item
                dataField="zip"
                editorType="dxTextBox"
                label={{ text: "Código postal" }}
            />
            <Item
                dataField="taxId"
                editorType="dxTextBox"
                isRequired={hasCountry}
                visible={hasCountry}
                label={{ text: "Identificación Fiscal" }}
            />
            <Item
                dataField="fiscalPositionId"
                editorType="dxSelectBox"
                isRequired={true}
                label={{ text: "Condición IVA" }}
                editorOptions={{
                    onInitialized: (e: any) => {
                        fiscalEditorRef.current = e.component;
                        if (initialFiscalRef.current.length) {
                            e.component.option({
                                dataSource: initialFiscalRef.current,
                                disabled: false,
                            });
                        }
                    },
                    dataSource: initialFiscalRef.current,
                    valueExpr: "id",
                    displayExpr: "name",
                    searchEnabled: true,
                    placeholder: "Seleccione la condición IVA...",
                    disabled: !companyId,
                }}
            />
            <Item
                dataField="taxData.iibb"
                editorType="dxTextBox"
                label={{ text: "IIBB (tax_data)" }}
                editorOptions={{
                    placeholder: "Ej. 901-999999-9",
                }}
            />
            <Item
                dataField="creditLimit"
                editorType="dxNumberBox"
                label={{ text: "Límite de crédito" }}
                editorOptions={{
                    showClearButton: true,
                    min: 0,
                }}
            />
            <Item
                dataField="paymentTermId"
                editorType="dxSelectBox"
                label={{ text: "Condición de pago" }}
                editorOptions={{
                    dataSource: paymentTermOptions,
                    valueExpr: "id",
                    displayExpr: optionDisplay,
                    searchEnabled: true,
                    showClearButton: true,
                    placeholder: "Seleccione una condición de pago...",
                    noDataText: "No hay condiciones de pago para esta compañía",
                }}
            />
            <Item
                dataField="accountDebitId"
                editorType="dxSelectBox"
                label={{ text: "Cuenta débito (GL)" }}
                editorOptions={{
                    dataSource: glAccountOptions,
                    valueExpr: "id",
                    displayExpr: "displayLabel",
                    searchEnabled: true,
                    showClearButton: true,
                    placeholder: "Seleccionar cuenta de débito...",
                }}
            />
            <Item
                dataField="accountCreditId"
                editorType="dxSelectBox"
                label={{ text: "Cuenta crédito (GL)" }}
                editorOptions={{
                    dataSource: glAccountOptions,
                    valueExpr: "id",
                    displayExpr: "displayLabel",
                    searchEnabled: true,
                    showClearButton: true,
                    placeholder: "Seleccionar cuenta de crédito...",
                }}
            />
            <Item
                dataField="accountId"
                editorType="dxTextBox"
                label={{ text: "Cuenta corriente auxiliar (ID)" }}
                editorOptions={{
                    placeholder: "UUID de accounting.account",
                }}
            />
            <Item
                dataField="minDaysToExpiryOrder"
                editorType="dxNumberBox"
                label={{ text: "Días mín. venc. Orden" }}
            />
            <Item
                dataField="minDaysToExpiryReception"
                editorType="dxNumberBox"
                label={{ text: "Días mín. venc. Recepción" }}
            />
        </Form>
    );
};

export default CustomerStepSection;
