"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useAccess } from "@repo/access";
import { Button } from "@repo/devextreme";
import { Popup, Position, ToolbarItem } from "devextreme-react/popup";
import Stepper from "devextreme-react/stepper";
import notify from "devextreme/ui/notify";
import { useEffect, useMemo, useRef, useState } from "react";
import { countriesService } from "@repo/erp-services/location_services/countries.service";
import { AddressModalHandle } from "../../addresses/components/actions/addressModal";
import {
    resolveDeferredDeliveryLinks,
    validateCustomerAddressTypeRules,
} from "../../addresses/addressTypeRules";
import AddressStepSection from "./customerCreation/addressStepSection";
import CustomerStepSection from "./customerCreation/customerStepSection";
import {
    CUSTOMER_CODE_PREFIX,
    CUSTOMER_WIZARD_STEPS,
} from "./customerCreation/customerWizard.constants";
import {
    buildFirstAddressSeed,
    fetchSuggestedCustomerCode,
    resolveInheritedLocation,
} from "./customerCreation/customerWizard.helpers";
import type {
    AddressInitialLocation,
    CustomerCreationWizardProps,
    IFCustomerAddressCreate,
    IFCustomerCreate,
    PendingAddress,
} from "./customerCreation/customerWizard.types";
import { submitCustomerCreation } from "./customerCreation/submitCustomerCreation";

const CustomerCreationWizard = ({
    isOpen,
    onClose,
    onSuccess,
}: CustomerCreationWizardProps) => {
    const { token, currentCompany } = useAuth();
    const { canAccess } = useAccess();
    const canUseTaxAuthoritySchemes = canAccess("billing.taxAuthoritySchemes.lookup");

    const [currentStep, setCurrentStep] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [selectedCountryCode, setSelectedCountryCode] = useState("");
    const [customerDraft, setCustomerDraft] = useState<IFCustomerCreate | null>(null);
    const [inheritedLocation, setInheritedLocation] = useState<AddressInitialLocation | null>(
        null
    );
    const [pendingAddresses, setPendingAddresses] = useState<PendingAddress[]>([]);
    const [editingAddressKey, setEditingAddressKey] = useState<string | null>(null);
    const [addressSeed, setAddressSeed] = useState<IFCustomerAddressCreate | null>(null);
    const [addressFormKey, setAddressFormKey] = useState(0);
    const [countries, setCountries] = useState<any[]>([]);

    const isEditingAddress = Boolean(editingAddressKey);

    const formRef = useRef<any>(null);
    const addressFormRef = useRef<AddressModalHandle>(null);

    /** Primera dirección: nombre "Sucursal {cliente}" + tipos por default. */
    const effectiveAddressSeed = useMemo(() => {
        if (addressSeed) return addressSeed;
        if (pendingAddresses.length === 0 && !editingAddressKey && customerDraft?.name) {
            return buildFirstAddressSeed(customerDraft.name) as IFCustomerAddressCreate;
        }
        return null;
    }, [addressSeed, pendingAddresses.length, editingAddressKey, customerDraft?.name]);

    /** Entregas pendientes → opciones del select "Dirección de entrega". */
    const pendingDeliveryOptions = useMemo(
        () =>
            pendingAddresses
                .filter((address) => address.type?.includes("delivery"))
                .map((address) => ({
                    id: address._key,
                    label: address.code
                        ? `${address.name} (${address.code})`
                        : address.street
                          ? `${address.name} — ${address.street}`
                          : address.name,
                })),
        [pendingAddresses]
    );

    useEffect(() => {
        if (!token) return;
        countriesService
            .getAll(token)
            .then((res) => setCountries(res.items))
            .catch(() => setCountries([]));
    }, [token]);

    useEffect(() => {
        if (!isOpen) return;

        let cancelled = false;

        setCurrentStep(0);
        setCustomerDraft(null);
        setInheritedLocation(null);
        setPendingAddresses([]);
        setEditingAddressKey(null);
        setAddressSeed(null);
        setAddressFormKey(0);
        setSelectedCountryCode("");
        setFormData({
            companyId: currentCompany?.id || "",
            code: "",
            taxData: { ivaCondition: "" },
        });

        const loadSuggestedCode = async () => {
            if (!token || !currentCompany?.id) return;
            try {
                const nextCode = await fetchSuggestedCustomerCode(token, currentCompany.id);
                if (cancelled) return;
                setFormData((prev) => ({
                    ...prev,
                    companyId: currentCompany.id,
                    code: nextCode,
                }));
                formRef.current?.instance()?.updateData("code", nextCode);
            } catch (error) {
                console.error("Error suggesting next customer code:", error);
                if (cancelled) return;
                const fallback = `${CUSTOMER_CODE_PREFIX}001`;
                setFormData((prev) => ({
                    ...prev,
                    code: fallback,
                }));
                formRef.current?.instance()?.updateData("code", fallback);
            }
        };

        void loadSuggestedCode();

        return () => {
            cancelled = true;
        };
    }, [isOpen, currentCompany?.id, token]);

    const resetAndClose = () => {
        setCurrentStep(0);
        setCustomerDraft(null);
        setInheritedLocation(null);
        setPendingAddresses([]);
        setEditingAddressKey(null);
        setAddressSeed(null);
        setAddressFormKey(0);
        setSelectedCountryCode("");
        setFormData({});
        onClose();
    };

    const resetAddressForm = (seed: IFCustomerAddressCreate | null = null) => {
        setAddressSeed(seed);
        setAddressFormKey((k) => k + 1);
    };

    const readCustomerForm = () => ({
        ...formData,
        ...(formRef.current?.instance()?.option("formData") || {}),
    });

    const handleNext = async () => {
        if (currentStep !== 0) return;

        const validation = formRef.current?.instance().validate();
        if (!validation?.isValid) {
            notify("Por favor complete los campos requeridos", "warning", 3000);
            return;
        }

        const current = readCustomerForm();
        const draft: IFCustomerCreate = {
            code: current.code,
            companyId: current.companyId || currentCompany?.id || "",
            name: current.name,
            email: current.email,
            taxId: current.taxId,
            countryIsoCode: current.countryIsoCode,
            stateCode: current.stateCode,
            cityCode: current.cityCode,
            minDaysToExpiryOrder: current.minDaysToExpiryOrder,
            minDaysToExpiryReception: current.minDaysToExpiryReception,
            taxData: current.taxData,
        };

        setIsLoading(true);
        try {
            const location = await resolveInheritedLocation(
                { ...draft, zip: current.zip || "" },
                token,
                countries
            );
            setCustomerDraft(draft);
            setInheritedLocation(location);
            setFormData(current);
            setSelectedCountryCode(current.countryIsoCode || "");
            setCurrentStep(1);
        } finally {
            setIsLoading(false);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) setCurrentStep(currentStep - 1);
    };

    const handleAddOrUpdateAddress = async () => {
        const data = await addressFormRef.current?.getValidatedCreateData();
        if (!data) return;

        // En draft solo bloqueamos factura duplicada; ventas↔entrega se valida al Finalizar.
        const nextSet = [
            ...pendingAddresses.map(({ _key, ...rest }) => rest),
            data,
        ];
        const ruleError = validateCustomerAddressTypeRules(nextSet, { mode: "draft" });
        if (ruleError) {
            notify(ruleError, "warning", 4500);
            return;
        }

        if (editingAddressKey) {
            setPendingAddresses((prev) => [
                ...prev,
                { ...data, _key: editingAddressKey },
            ]);
            setEditingAddressKey(null);
            resetAddressForm(null);
            notify("Dirección actualizada", "success", 2500);
            return;
        }

        const needsDeferredDelivery =
            data.type?.includes("sales") &&
            !data.type?.includes("delivery") &&
            !data.deliveryAddressId;

        setPendingAddresses((prev) => [
            ...prev,
            { ...data, _key: `${Date.now()}-${prev.length}` },
        ]);
        resetAddressForm(null);
        notify(
            needsDeferredDelivery
                ? "Dirección agregada. Cargue una de Entrega; se vinculará al finalizar si hay una sola."
                : "Dirección agregada. Puede cargar otra.",
            "success",
            3500
        );
    };

    const handleEditPendingAddress = async (address: PendingAddress) => {
        const formBlank = addressFormRef.current?.isBlank() ?? true;
        if (!formBlank) {
            const current = await addressFormRef.current?.getValidatedCreateData();
            if (!current) {
                notify(
                    "Complete o limpie el formulario actual antes de editar otra dirección",
                    "warning",
                    3500
                );
                return;
            }
            const parkedKey = editingAddressKey || `${Date.now()}-draft`;
            const nextSet = [
                ...pendingAddresses
                    .filter((a) => a._key !== address._key)
                    .map(({ _key, ...rest }) => rest),
                current,
            ];
            const ruleError = validateCustomerAddressTypeRules(nextSet, {
                mode: "draft",
            });
            if (ruleError) {
                notify(ruleError, "warning", 4500);
                return;
            }
            setPendingAddresses((prev) => [
                ...prev.filter((a) => a._key !== address._key),
                {
                    ...current,
                    _key: parkedKey,
                },
            ]);
        } else {
            setPendingAddresses((prev) => prev.filter((a) => a._key !== address._key));
        }

        const { _key, ...seed } = address;
        setEditingAddressKey(_key);
        resetAddressForm(seed);
    };

    const handleCancelEditAddress = () => {
        if (!editingAddressKey || !addressSeed) {
            setEditingAddressKey(null);
            resetAddressForm(null);
            return;
        }
        setPendingAddresses((prev) => [
            ...prev,
            { ...addressSeed, _key: editingAddressKey },
        ]);
        setEditingAddressKey(null);
        resetAddressForm(null);
    };

    const handleRemovePendingAddress = (key: string) => {
        setPendingAddresses((prev) => prev.filter((a) => a._key !== key));
    };

    const handleFinish = async () => {
        if (!token) return;

        if (!customerDraft) {
            notify("Complete primero los datos del cliente", "warning", 3000);
            setCurrentStep(0);
            return;
        }

        const formBlank = addressFormRef.current?.isBlank() ?? true;
        let currentAddress: IFCustomerAddressCreate | null = null;

        if (!formBlank) {
            currentAddress =
                (await addressFormRef.current?.getValidatedCreateData()) ?? null;
            if (!currentAddress) return;
        }

        const rawAddresses = [
            ...pendingAddresses,
            ...(currentAddress
                ? [{ ...currentAddress, _key: `current-${Date.now()}` }]
                : []),
        ];

        if (rawAddresses.length === 0) {
            notify(
                "Debe cargar al menos una dirección para crear el cliente",
                "warning",
                3500
            );
            return;
        }

        // Una sola entrega → auto-vincula Ventas que aún no tienen deliveryAddressId.
        const addressesToCreate = resolveDeferredDeliveryLinks(rawAddresses);

        const ruleError = validateCustomerAddressTypeRules(addressesToCreate, {
            mode: "strict",
        });
        if (ruleError) {
            notify(ruleError, "warning", 4500);
            return;
        }

        setIsLoading(true);
        try {
            let result;
            try {
                result = await submitCustomerCreation({
                    customerDraft,
                    addresses: addressesToCreate,
                    token,
                    companyId: currentCompany?.id,
                });
            } catch (error) {
                console.error("Error creating customer:", error);
                notify(
                    error instanceof Error
                        ? error.message
                        : "Error al crear el cliente",
                    "error",
                    4000
                );
                return;
            }

            onSuccess();

            const { createdAddressCount, failedAddresses } = result;

            if (failedAddresses.length === 0) {
                notify(
                    addressesToCreate.length > 1
                        ? `Cliente creado con ${createdAddressCount} direcciones`
                        : "Cliente y dirección creados exitosamente",
                    "success",
                    3000
                );
                resetAndClose();
                return;
            }

            const failedNames = failedAddresses.map((item) => item.name).join(", ");
            if (createdAddressCount > 0) {
                notify(
                    `Cliente creado. ${createdAddressCount} dirección(es) OK; fallaron: ${failedNames}. Complete las faltantes desde Direcciones.`,
                    "warning",
                    6000
                );
            } else {
                notify(
                    `Cliente creado, pero no se pudo crear ninguna dirección (${failedNames}). Agréguelas desde Direcciones.`,
                    "error",
                    6000
                );
            }
            resetAndClose();
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Popup
            visible={isOpen}
            onHiding={resetAndClose}
            dragEnabled={false}
            hideOnOutsideClick={false}
            showCloseButton={true}
            showTitle={true}
            title="Nuevo Cliente"
            width={780}
            height={720}
            className="custom-popup"
            deferRendering={false}
            onShown={(e) => {
                e.component.repaint();
            }}
        >
            <Position at="center" my="center" />

            {isLoading && (
                <div className="absolute inset-0 z-50 pointer-events-auto select-none flex flex-col items-center justify-center p-6 bg-primary-0/75 backdrop-blur-[2px]">
                    <div className="w-full max-w-md p-4 rounded-dx bg-primary-0/40 border border-focus-100/40 shadow-sm">
                        <div className="mb-3 border-b border-main/10 pb-2.5">
                            <h3 className="text-base font-bold text-dx-primary leading-tight">
                                {currentStep === 0
                                    ? "Preparando datos"
                                    : "Creando cliente y direcciones"}
                            </h3>
                        </div>
                        <div className="flex items-start gap-3">
                            <div
                                className="mt-0.5 w-8 h-8 shrink-0 rounded-full border-2 border-focus-300/25 border-t-focus-300 animate-spin"
                                aria-hidden
                            />
                            <p className="text-xs text-main/70 leading-snug">
                                No cierre esta ventana mientras se procesan los datos.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {!isLoading && (
                <>
                    <ToolbarItem toolbar="bottom" location="after">
                        <Button
                            text="Cancelar"
                            onClick={resetAndClose}
                            stylingMode="text"
                            className="!rounded-dx !bg-main/10"
                        />
                    </ToolbarItem>

                    {currentStep > 0 && (
                        <ToolbarItem toolbar="bottom" location="after">
                            <Button
                                text="Atrás"
                                icon="arrowleft"
                                onClick={handleBack}
                                stylingMode="outlined"
                            />
                        </ToolbarItem>
                    )}

                    {currentStep === 1 && isEditingAddress && (
                        <ToolbarItem toolbar="bottom" location="after">
                            <Button
                                text="Cancelar edición"
                                onClick={handleCancelEditAddress}
                                stylingMode="text"
                            />
                        </ToolbarItem>
                    )}

                    {currentStep === 1 && (
                        <ToolbarItem toolbar="bottom" location="after">
                            <Button
                                text={
                                    isEditingAddress
                                        ? "Guardar cambios"
                                        : "Agregar otra dirección"
                                }
                                onClick={() => {
                                    void handleAddOrUpdateAddress();
                                }}
                                stylingMode="outlined"
                            />
                        </ToolbarItem>
                    )}

                    {currentStep === 0 ? (
                        <ToolbarItem toolbar="bottom" location="after">
                            <Button
                                text="Siguiente"
                                type="default"
                                stylingMode="contained"
                                onClick={() => {
                                    void handleNext();
                                }}
                                className="!bg-focus-300 shadow-lg shadow-black/20 !text-variant"
                            />
                        </ToolbarItem>
                    ) : (
                        <ToolbarItem toolbar="bottom" location="after">
                            <Button
                                text="Finalizar"
                                type="default"
                                stylingMode="contained"
                                onClick={() => {
                                    void handleFinish();
                                }}
                                className="!bg-focus-300 shadow-lg shadow-black/20 !text-variant"
                            />
                        </ToolbarItem>
                    )}
                </>
            )}

            <div className="sticky top-[0px] py-3 z-20 bg-primary-0/95 backdrop-blur-md border-b border-main/10 mb-4 pb-3">
                <Stepper
                    items={CUSTOMER_WIZARD_STEPS}
                    selectedIndex={currentStep}
                    focusStateEnabled={false}
                    className="pointer-events-none max-w-xl mx-auto"
                />
            </div>

            <div
                className="pb-4 px-2 overflow-y-auto custom-scrollbar"
                style={{ height: "calc(100% - 90px)" }}
            >
                {currentStep === 0 && (
                    <CustomerStepSection
                        formRef={formRef}
                        formData={formData}
                        countries={countries}
                        selectedCountryCode={selectedCountryCode}
                        setSelectedCountryCode={setSelectedCountryCode}
                        canUseTaxAuthoritySchemes={canUseTaxAuthoritySchemes}
                        token={token}
                        isActive={currentStep === 0}
                    />
                )}

                {currentStep === 1 && customerDraft && (
                    <AddressStepSection
                        customerName={customerDraft.name}
                        pendingAddresses={pendingAddresses}
                        isEditingAddress={isEditingAddress}
                        addressFormRef={addressFormRef}
                        addressFormKey={addressFormKey}
                        inheritedLocation={inheritedLocation}
                        seedData={effectiveAddressSeed}
                        extraDeliveryOptions={pendingDeliveryOptions}
                        onEdit={(address) => {
                            void handleEditPendingAddress(address);
                        }}
                        onRemove={handleRemovePendingAddress}
                        onAddAddress={() => {
                            void handleAddOrUpdateAddress();
                        }}
                    />
                )}
            </div>
        </Popup>
    );
};

export default CustomerCreationWizard;
