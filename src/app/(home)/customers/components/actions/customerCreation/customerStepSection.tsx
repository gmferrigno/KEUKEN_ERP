"use client";

import { RefObject, useEffect, useRef } from "react";
import Form, { Item } from "devextreme-react/form";
import { statesService } from "@repo/erp-services/location_services/states.service";
import { citiesService } from "@repo/erp-services/location_services/cities.service";
import { localizationService } from "@repo/erp-services/localization.service";

export interface CustomerStepSectionProps {
    formRef: RefObject<any>;
    formData: any;
    countries: any[];
    selectedCountryCode: string;
    setSelectedCountryCode: (code: string) => void;
    canUseTaxAuthoritySchemes: boolean;
    token: string | null | undefined;
    /** Cuando el paso está activo (vuelta desde dirección), rehidrata selects. */
    isActive: boolean;
}

const CustomerStepSection = ({
    formRef,
    formData,
    countries,
    selectedCountryCode,
    setSelectedCountryCode,
    canUseTaxAuthoritySchemes,
    token,
    isActive,
}: CustomerStepSectionProps) => {
    const hasCountry = Boolean(selectedCountryCode);

    const initialStatesRef = useRef<any[]>([]);
    const initialCitiesRef = useRef<any[]>([]);
    const initialIvaRef = useRef<any[]>([]);
    const stateEditorRef = useRef<any>(null);
    const cityEditorRef = useRef<any>(null);
    const ivaEditorRef = useRef<any>(null);

    const loadIvaSchemesForCountry = (countryCode: string) => {
        if (!token || !canUseTaxAuthoritySchemes || !countryCode) {
            ivaEditorRef.current?.option("dataSource", []);
            ivaEditorRef.current?.option("disabled", true);
            return;
        }
        localizationService
            .getTaxAuthoritySchemes(countryCode, token, undefined, "iva_condition")
            .then((res) => {
                initialIvaRef.current = res || [];
                ivaEditorRef.current?.option("dataSource", initialIvaRef.current);
                ivaEditorRef.current?.option("disabled", false);
            })
            .catch(() => {
                initialIvaRef.current = [];
                ivaEditorRef.current?.option("dataSource", []);
                ivaEditorRef.current?.option("disabled", true);
            });
    };

    // Al volver al paso Cliente, rehidratar selects de provincia/ciudad/IVA.
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

        if (canUseTaxAuthoritySchemes) {
            localizationService
                .getTaxAuthoritySchemes(countryCode, token, undefined, "iva_condition")
                .then((res) => {
                    if (cancelled) return;
                    initialIvaRef.current = res || [];
                    ivaEditorRef.current?.option("dataSource", initialIvaRef.current);
                    ivaEditorRef.current?.option("disabled", false);
                });
        }

        return () => {
            cancelled = true;
        };
    }, [
        isActive,
        token,
        formData.countryIsoCode,
        formData.stateCode,
        canUseTaxAuthoritySchemes,
        setSelectedCountryCode,
    ]);

    return (
        <Form
            ref={formRef}
            formData={formData}
            labelLocation="top"
            showValidationSummary={true}
            colCount={2}
        >
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
                isRequired={true}
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
                        formRef.current
                            ?.instance()
                            .updateData("taxData.ivaCondition", "");

                        stateEditorRef.current?.option("dataSource", []);
                        stateEditorRef.current?.option("disabled", true);
                        cityEditorRef.current?.option("dataSource", []);
                        cityEditorRef.current?.option("disabled", true);
                        ivaEditorRef.current?.option("dataSource", []);
                        ivaEditorRef.current?.option("disabled", true);

                        if (!nextCountry) return;

                        statesService.getAll(token!, nextCountry).then((res) => {
                            stateEditorRef.current?.option("dataSource", res.items);
                            stateEditorRef.current?.option("disabled", false);
                        });
                        loadIvaSchemesForCountry(nextCountry);
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
                dataField="minDaysToExpiryOrder"
                editorType="dxNumberBox"
                label={{ text: "Días mín. venc. Orden" }}
            />
            <Item
                dataField="minDaysToExpiryReception"
                editorType="dxNumberBox"
                label={{ text: "Días mín. venc. Recepción" }}
            />
            <Item
                dataField="taxId"
                editorType="dxTextBox"
                isRequired={hasCountry}
                visible={hasCountry}
                colSpan={canUseTaxAuthoritySchemes ? 1 : 2}
                label={{ text: "Identificación Fiscal" }}
            />
            <Item
                dataField="taxData.ivaCondition"
                editorType="dxSelectBox"
                visible={hasCountry && canUseTaxAuthoritySchemes}
                label={{ text: "Condición IVA" }}
                editorOptions={{
                    onInitialized: (e: any) => {
                        ivaEditorRef.current = e.component;
                        if (selectedCountryCode) {
                            e.component.option({
                                dataSource: initialIvaRef.current,
                                disabled: false,
                            });
                        }
                    },
                    dataSource: initialIvaRef.current,
                    valueExpr: "schemeCode",
                    displayExpr: "localName",
                    searchEnabled: true,
                    placeholder: "Seleccione la condición IVA...",
                    disabled: !hasCountry,
                }}
            />
        </Form>
    );
};

export default CustomerStepSection;
