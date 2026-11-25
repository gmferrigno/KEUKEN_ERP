'use client';

import { customerAddressesService } from "@repo/erp-services/partners/customerAddresses.service";
import { customersService } from "@repo/erp-services/partners/customers.service";
import { countriesService } from "@repo/erp-services/location_services/countries.service";
import { statesService } from "@repo/erp-services/location_services/states.service";
import { citiesService } from "@repo/erp-services/location_services/cities.service";
import {
    IFCommercialPlatform,
    IFCustomerAddress,
    IFCustomerAddressCreate,
    IFCustomerAddressUpdate,
    IFOptionItem,
} from "@repo/api-contracts/erp";
import { commercialPlatformsService } from "@repo/erp-services/partners/commercialPlatforms.service";
import { priceListsService } from "@repo/erp-services/priceLists/priceLists.service";
import { paymentTermsService } from "@repo/erp-services/payments_services/paymentTerms.service";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@repo/devextreme";
import { Popup, Position, ToolbarItem } from "devextreme-react/popup";
import Form, { GroupItem, Item } from "devextreme-react/form";
import LoadIndicator from "devextreme-react/load-indicator";
import notify from "devextreme/ui/notify";
import CustomStore from "devextreme/data/custom_store";
import {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from "react";
import { validateCustomerAddressTypeRules } from "../../addressTypeRules";
import AddressLocationPicker from "./addressLocationPicker";

export type AddressInitialLocation = {
    countryId?: string | null;
    stateId?: string | null;
    cityId?: string | null;
    zip?: string | null;
};

interface AddressModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    addressId?: string | null;
    customerId?: string | null;
    /** Datos de la fila del grid (fallback mientras carga GET by id / si falla el fetch). */
    initialData?: IFCustomerAddress | null;
    /** Renderiza solo el formulario (sin Popup/toolbar). Para wizards. */
    embedded?: boolean;
    /** Tipos iniciales al crear (p. ej. primera dirección del cliente). */
    defaultType?: string[];
    /** País/provincia/ciudad precargados (p. ej. heredados del cliente). */
    initialLocation?: AddressInitialLocation | null;
    /** Datos iniciales de un borrador (p. ej. editar dirección pendiente en wizard). */
    seedData?: Partial<IFCustomerAddressCreate> | null;
    /** Opciones extra de entrega (p. ej. direcciones pendientes del wizard). */
    extraDeliveryOptions?: { id: string; label: string }[];
    /** Notifica cambios de tipo (wizard: aviso de entrega faltante). */
    onTypesChange?: (types: string[]) => void;
}

export type AddressModalHandle = {
    submit: () => Promise<boolean>;
    /** Valida y devuelve el payload de creación sin llamar a la API. */
    getValidatedCreateData: () => Promise<IFCustomerAddressCreate | null>;
    /** True si el formulario no tiene datos relevantes cargados. */
    isBlank: () => boolean;
};

const ADDRESS_TYPES = [
    { id: "sales", label: "Ventas" },
    { id: "delivery", label: "Entrega" },
    { id: "invoice", label: "Facturación" },
    { id: "other", label: "Otro" },
];

const emptyForm = {
    customerId: "",
    name: "",
    code: "",
    type: ["delivery"] as string[],
    street: "",
    countryId: null as string | null,
    stateId: null as string | null,
    cityId: null as string | null,
    zip: "",
    geoLat: null as number | null,
    geoLon: null as number | null,
    active: true,
    deliveryAddressId: null as string | null,
    accountId: null as string | null,
    creditLimit: null as string | number | null,
    pricelistId: null as string | null,
    paymentTermId: null as string | null,
    salesChannelId: null as string | null,
    commercialPlatformId: null as string | null,
};

const mapAddressToForm = (address: IFCustomerAddress) => ({
    customerId: address.customerId,
    name: address.name || "",
    code: address.code || "",
    type: address.type?.length ? address.type : ["delivery"],
    street: address.street || "",
    countryId: address.countryId,
    stateId: address.stateId,
    cityId: address.cityId,
    zip: address.zip || "",
    geoLat: address.geoLat,
    geoLon: address.geoLon,
    active: address.active ?? true,
    deliveryAddressId: address.deliveryAddressId ?? null,
    accountId: address.accountId ?? null,
    creditLimit: address.creditLimit ?? null,
    pricelistId: address.pricelistId ?? null,
    paymentTermId: address.paymentTermId ?? null,
    salesChannelId: address.salesChannelId ?? null,
    commercialPlatformId: address.commercialPlatformId ?? null,
});

const AddressModal = forwardRef<AddressModalHandle, AddressModalProps>(function AddressModal(
    {
        isOpen,
        onClose,
        onSuccess,
        addressId,
        customerId,
        initialData,
        embedded = false,
        defaultType,
        initialLocation = null,
        seedData = null,
        extraDeliveryOptions = [],
        onTypesChange,
    },
    ref
) {
    const { token, currentCompany } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);
    const [formData, setFormData] = useState({ ...emptyForm });
    const [countries, setCountries] = useState<any[]>([]);
    const [priceListOptions, setPriceListOptions] = useState<IFOptionItem[]>([]);
    const [paymentTermOptions, setPaymentTermOptions] = useState<IFOptionItem[]>([]);
    const [commercialPlatformOptions, setCommercialPlatformOptions] = useState<
        IFCommercialPlatform[]
    >([]);
    /** Coords para el mapa (fuera del Form para no remount/scroll). */
    const [mapCoords, setMapCoords] = useState<{
        lat: number | null;
        lng: number | null;
    }>({ lat: null, lng: null });
    const formRef = useRef<any>(null);
    const countriesRef = useRef<any[]>([]);
    // Refs (no useState): setState en el cascada re-renderiza el Form con formData
    // viejo y el SelectBox pierde la selección (mismo patrón que customerModal).
    const statesRef = useRef<any[]>([]);
    const citiesRef = useRef<any[]>([]);
    const apiDeliveryAddressesRef = useRef<{ id: string; label: string }[]>([]);
    const deliveryAddressesRef = useRef<{ id: string; label: string }[]>([]);
    const stateEditorRef = useRef<any>(null);
    const cityEditorRef = useRef<any>(null);
    const deliveryAddressEditorRef = useRef<any>(null);
    const customersCache = useRef<{ id: string; label: string; code?: string | null }[]>([]);
    const extraDeliveryOptionsRef = useRef(extraDeliveryOptions);
    extraDeliveryOptionsRef.current = extraDeliveryOptions;
    const onTypesChangeRef = useRef(onTypesChange);
    onTypesChangeRef.current = onTypesChange;

    const isEdit = Boolean(addressId);
    const lockCustomer = Boolean(customerId) || embedded;
    const createDefaultTypeKey = (defaultType?.length ? defaultType : emptyForm.type).join(",");
    const createDefaultType = useMemo(
        () => (defaultType?.length ? [...defaultType] : [...emptyForm.type]),
        [createDefaultTypeKey]
    );

    const mapDeliveryAddressOption = (address: IFCustomerAddress) => ({
        id: address.id,
        label: address.code
            ? `${address.name} (${address.code})`
            : address.street
                ? `${address.name} — ${address.street}`
                : address.name,
    });

    /** Ventas exige dirección de entrega, salvo que esta misma dirección también sea de entrega. */
    const needsExternalDeliveryAddress = (types: string[] | null | undefined) =>
        Array.isArray(types) &&
        types.includes("sales") &&
        !types.includes("delivery");

    const mergeDeliveryOptions = (
        apiOptions: { id: string; label: string }[] = apiDeliveryAddressesRef.current
    ) => {
        const extras = extraDeliveryOptionsRef.current || [];
        const extraIds = new Set(extras.map((item) => item.id));
        return [...extras, ...apiOptions.filter((item) => !extraIds.has(item.id))];
    };

    const refreshDeliveryOptions = (types?: string[] | null) => {
        const currentTypes =
            types ??
            formRef.current?.instance()?.option("formData")?.type ??
            formData.type;
        syncDeliveryAddressRequirement(currentTypes);
    };

    const syncDeliveryAddressRequirement = (types: string[] | null | undefined) => {
        const nextTypes = Array.isArray(types) ? types : [];
        onTypesChangeRef.current?.(nextTypes);

        const needsDelivery = needsExternalDeliveryAddress(nextTypes);
        const options = mergeDeliveryOptions();
        deliveryAddressesRef.current = options;
        const form = formRef.current?.instance();
        if (!needsDelivery) {
            form?.updateData("deliveryAddressId", null);
        }
        // Obligatorio solo si hay opciones para elegir. Sin entregas aún (wizard),
        // se permite diferir el vínculo y validar el set al finalizar.
        const canSelectDelivery = needsDelivery && options.length > 0;
        // No usar visible:false: el TagBox a veces no trae e.event y el campo
        // nunca se monta / no reaparece. Mejor siempre visible + disabled/required.
        form?.itemOption("deliveryAddressId", "isRequired", canSelectDelivery);
        deliveryAddressEditorRef.current?.option({
            dataSource: options,
            disabled: !needsDelivery,
            placeholder:
                needsDelivery && options.length === 0
                    ? "Primero agregue una dirección de entrega"
                    : "Seleccione una dirección de entrega...",
            noDataText: "No hay direcciones de entrega. Agrégue una y vuelva a editar si hace falta.",
        });
    };

    const loadDeliveryAddresses = async (targetCustomerId?: string | null) => {
        apiDeliveryAddressesRef.current = [];
        deliveryAddressesRef.current = mergeDeliveryOptions([]);
        deliveryAddressEditorRef.current?.option("dataSource", deliveryAddressesRef.current);

        if (!token || !targetCustomerId) {
            refreshDeliveryOptions();
            return;
        }

        try {
            const response = await customerAddressesService.getByCustomer(
                targetCustomerId,
                token,
                currentCompany?.id,
                { limit: 200, offset: 0 }
            );
            const options = (response.items || [])
                .filter((address) => address.type?.includes("delivery"))
                .filter((address) => !addressId || address.id !== addressId)
                .map(mapDeliveryAddressOption);

            apiDeliveryAddressesRef.current = options;
            refreshDeliveryOptions();
        } catch (error) {
            console.error("Error loading delivery addresses:", error);
            apiDeliveryAddressesRef.current = [];
            refreshDeliveryOptions();
        }
    };

    const customersDataSource = useMemo(() => {
        return new CustomStore({
            key: "id",
            load: async (loadOptions: any) => {
                if (!token || !currentCompany?.id) {
                    return { data: [], totalCount: 0 };
                }
                try {
                    const response = await customersService.getOptions(
                        {
                            limit: 50,
                            offset: loadOptions.skip || 0,
                            q: loadOptions.searchValue || undefined,
                            companyId: currentCompany.id,
                            active: true,
                        },
                        token
                    );
                    response.items.forEach((item) => {
                        if (!customersCache.current.find((c) => c.id === item.id)) {
                            customersCache.current.push(item);
                        }
                    });
                    return {
                        data: response.items,
                        totalCount: response.metadata.totalItems,
                    };
                } catch {
                    return { data: [], totalCount: 0 };
                }
            },
            byKey: async (key: string) => {
                if (!key) return null;
                const found = customersCache.current.find((c) => c.id === key);
                if (found) return found;
                try {
                    const customer = await customersService.getById(key, token!, currentCompany?.id);
                    const option = {
                        id: customer.id,
                        label: customer.name,
                        code: customer.code,
                    };
                    customersCache.current.push(option);
                    return option;
                } catch {
                    return { id: key, label: key };
                }
            },
        });
    }, [token, currentCompany?.id]);

    useEffect(() => {
        if (!token) return;
        countriesService
            .getAll(token, false, true)
            .then((res) => {
                const items = res.items || [];
                countriesRef.current = items;
                setCountries(items);
            })
            .catch(() => {
                countriesRef.current = [];
                setCountries([]);
            });
    }, [token]);

    useEffect(() => {
        if (!isOpen || !token || !currentCompany?.id) {
            setPriceListOptions([]);
            setPaymentTermOptions([]);
            setCommercialPlatformOptions([]);
            return;
        }

        let cancelled = false;

        priceListsService
            .getOptions({ companyId: currentCompany.id, limit: 200 }, token)
            .then((res) => {
                if (!cancelled) setPriceListOptions(res?.items || []);
            })
            .catch((error) => {
                console.error("Error loading price lists:", error);
                if (!cancelled) setPriceListOptions([]);
            });

        paymentTermsService
            .getOptions({ companyId: currentCompany.id, limit: 200 }, token)
            .then((res) => {
                if (!cancelled) setPaymentTermOptions(res?.items || []);
            })
            .catch((error) => {
                console.error("Error loading payment terms:", error);
                if (!cancelled) setPaymentTermOptions([]);
            });

        commercialPlatformsService
            .getAll(
                { companyId: currentCompany.id, limit: 200, offset: 0, active: true },
                token
            )
            .then((res) => {
                if (!cancelled) setCommercialPlatformOptions(res?.items || []);
            })
            .catch((error) => {
                console.error("Error loading commercial platforms:", error);
                if (!cancelled) setCommercialPlatformOptions([]);
            });

        return () => {
            cancelled = true;
        };
    }, [isOpen, token, currentCompany?.id]);

    const ensureCountries = async (): Promise<any[]> => {
        if (countriesRef.current.length) return countriesRef.current;
        if (!token) return [];
        try {
            const res = await countriesService.getAll(token, false, true);
            const items = res.items || [];
            countriesRef.current = items;
            setCountries(items);
            return items;
        } catch {
            countriesRef.current = [];
            setCountries([]);
            return [];
        }
    };

    const loadLocationCascade = async (countryId?: string | null, stateId?: string | null) => {
        statesRef.current = [];
        citiesRef.current = [];

        if (!token || !countryId) return;

        const countryList = await ensureCountries();
        const country =
            countryList.find((c) => c.id === countryId) ||
            (await countriesService
                .getAll(token, false, true)
                .then((r) => r.items.find((c) => c.id === countryId)));

        if (!country?.code) return;

        const statesRes = await statesService.getAll(token, country.code, false, true).catch(() => ({ items: [] }));
        statesRef.current = statesRes.items || [];

        if (stateId) {
            const citiesRes = await citiesService.getAll(token, stateId, false, true).catch(() => ({ items: [] }));
            citiesRef.current = citiesRes.items || [];
        }
    };

    useEffect(() => {
        if (!isOpen || !token) {
            setIsHydrated(false);
            return;
        }

        let cancelled = false;

        const hydrate = async () => {
            setIsHydrated(false);
            setIsLoading(true);

            try {
                if (isEdit && addressId) {
                    const targetCustomerId =
                        customerId || initialData?.customerId || null;

                    let address: IFCustomerAddress | null = null;

                    if (targetCustomerId) {
                        try {
                            address = await customerAddressesService.getById(
                                targetCustomerId,
                                addressId,
                                token,
                                currentCompany?.id
                            );
                        } catch (error) {
                            console.error(
                                "Error fetching address by id, falling back to grid row:",
                                error
                            );
                        }
                    }

                    if (!address && initialData) {
                        address = initialData;
                    }

                    if (!address) {
                        notify(
                            "No se pudo cargar la dirección para editar",
                            "error",
                            3500
                        );
                        onClose();
                        return;
                    }

                    if (cancelled) return;

                    await ensureCountries();
                    await loadLocationCascade(address.countryId, address.stateId);
                    if (cancelled) return;
                    setFormData(mapAddressToForm(address));
                    await loadDeliveryAddresses(address.customerId);
                    if (cancelled) return;
                    setIsHydrated(true);
                    return;
                }

                statesRef.current = [];
                citiesRef.current = [];
                apiDeliveryAddressesRef.current = [];
                deliveryAddressesRef.current = mergeDeliveryOptions([]);
                const initialType = [...createDefaultType];
                const location = initialLocation || {};
                const seed = seedData || {};
                const nextForm = {
                    ...emptyForm,
                    customerId: customerId || "",
                    type: seed.type?.length ? [...seed.type] : initialType,
                    name: seed.name ?? "",
                    code: seed.code ?? "",
                    street: seed.street ?? "",
                    countryId: seed.countryId ?? location.countryId ?? null,
                    stateId: seed.stateId ?? location.stateId ?? null,
                    cityId: seed.cityId ?? location.cityId ?? null,
                    zip: seed.zip ?? location.zip ?? "",
                    geoLat: seed.geoLat ?? null,
                    geoLon: seed.geoLon ?? null,
                    active: seed.active ?? true,
                    deliveryAddressId: seed.deliveryAddressId ?? null,
                    accountId: seed.accountId ?? null,
                    creditLimit: seed.creditLimit ?? null,
                    pricelistId: seed.pricelistId ?? null,
                    paymentTermId: seed.paymentTermId ?? null,
                    salesChannelId: seed.salesChannelId ?? null,
                    commercialPlatformId: seed.commercialPlatformId ?? null,
                };

                // Países + cascada listos ANTES de montar el Form, para no flash vacío → precargado.
                await ensureCountries();
                if (nextForm.countryId) {
                    await loadLocationCascade(nextForm.countryId, nextForm.stateId);
                }

                if (cancelled) return;
                setFormData(nextForm);

                // Con o sin customerId: mergea extras del wizard + API si hay cliente.
                await loadDeliveryAddresses(customerId || null);
                if (cancelled) return;
                setIsHydrated(true);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        hydrate();
        return () => {
            cancelled = true;
        };
    }, [isOpen, addressId, customerId, token, isEdit, initialData, createDefaultType, initialLocation, seedData]);

    // Aplicar dataSources cuando el Form ya montó editores (después de isHydrated).
    useEffect(() => {
        if (!isOpen || !isHydrated) return;

        const types =
            formRef.current?.instance()?.option("formData")?.type ?? formData.type;

        const frame = requestAnimationFrame(() => {
            stateEditorRef.current?.option("dataSource", statesRef.current);
            stateEditorRef.current?.option("disabled", !formData.countryId);
            cityEditorRef.current?.option("dataSource", citiesRef.current);
            cityEditorRef.current?.option("disabled", !formData.stateId);
            syncDeliveryAddressRequirement(types);
        });

        return () => cancelAnimationFrame(frame);
    }, [isOpen, isHydrated, formData.countryId, formData.stateId, formData.type]);

    // Actualizar opciones / required de entrega cuando cambian las pendientes del wizard.
    useEffect(() => {
        if (!isOpen || !isHydrated) return;
        const types =
            formRef.current?.instance()?.option("formData")?.type ?? formData.type;
        syncDeliveryAddressRequirement(types);
    }, [isOpen, isHydrated, extraDeliveryOptions]);

    const readCurrentFormData = () => ({
        ...formData,
        ...(formRef.current?.instance()?.option("formData") || {}),
    });

    const buildCreatePayload = (
        currentData: ReturnType<typeof readCurrentFormData>,
        options?: {
            requireCustomerId?: boolean;
            /** Wizard: permite Ventas sin deliveryAddressId si aún no hay entregas. */
            allowDeferredDeliveryLink?: boolean;
        }
    ): IFCustomerAddressCreate | null => {
        const requireCustomerId = options?.requireCustomerId ?? true;
        const allowDeferredDeliveryLink = options?.allowDeferredDeliveryLink ?? false;

        const validation = formRef.current?.instance().validate();
        if (!validation?.isValid) {
            notify("Por favor complete los campos requeridos", "warning", 3000);
            return null;
        }

        if (requireCustomerId && !currentData.customerId) {
            notify("Seleccione un cliente", "warning", 3000);
            return null;
        }

        if (!currentData.type?.length) {
            notify("Seleccione al menos un tipo de dirección", "warning", 3000);
            return null;
        }

        const requiresDeliveryAddress = needsExternalDeliveryAddress(currentData.type);
        const deliveryOptions = mergeDeliveryOptions();
        if (requiresDeliveryAddress && !currentData.deliveryAddressId) {
            const canDefer =
                allowDeferredDeliveryLink && deliveryOptions.length === 0;
            if (!canDefer) {
                notify(
                    deliveryOptions.length === 0
                        ? "Si el tipo incluye Ventas (sin Entrega), debe indicar la dirección de entrega"
                        : "Seleccione la dirección de entrega para esta dirección de Ventas",
                    "warning",
                    3500
                );
                return null;
            }
        }

        const deliveryAddressId = requiresDeliveryAddress
            ? currentData.deliveryAddressId
            : null;

        return {
            name: currentData.name,
            code: currentData.code || null,
            type: currentData.type,
            street: currentData.street || null,
            countryId: currentData.countryId,
            stateId: currentData.stateId,
            cityId: currentData.cityId,
            zip: currentData.zip || null,
            geoLat: currentData.geoLat,
            geoLon: currentData.geoLon,
            active: currentData.active,
            deliveryAddressId,
            accountId: currentData.accountId,
            creditLimit: currentData.creditLimit,
            pricelistId: currentData.pricelistId,
            paymentTermId: currentData.paymentTermId,
            salesChannelId: currentData.salesChannelId,
            commercialPlatformId: currentData.commercialPlatformId,
        };
    };

    const validateAgainstExistingAddresses = async (
        payload: IFCustomerAddressCreate,
        targetCustomerId: string
    ): Promise<boolean> => {
        if (!token) return false;

        try {
            const response = await customerAddressesService.getByCustomer(
                targetCustomerId,
                token,
                currentCompany?.id,
                { limit: 200, offset: 0 }
            );
            const others = (response.items || [])
                .filter((address) => !addressId || address.id !== addressId)
                .map((address) => ({
                    name: address.name,
                    type: address.type,
                    deliveryAddressId: address.deliveryAddressId,
                }));

            const ruleError = validateCustomerAddressTypeRules([
                ...others,
                {
                    name: payload.name,
                    type: payload.type,
                    deliveryAddressId: payload.deliveryAddressId,
                },
            ]);

            if (ruleError) {
                notify(ruleError, "warning", 4500);
                return false;
            }
            return true;
        } catch (error) {
            console.error("Error validating address type rules:", error);
            notify("No se pudieron validar las reglas de tipo de dirección", "error", 3000);
            return false;
        }
    };

    const getValidatedCreateData = async (): Promise<IFCustomerAddressCreate | null> => {
        const currentData = readCurrentFormData();
        // Reglas de conjunto (entrega↔factura / sales→delivery) las valida el wizard.
        // allowDeferredDeliveryLink: en el wizard se puede cargar Ventas antes que Entrega.
        return buildCreatePayload(currentData, {
            requireCustomerId: false,
            allowDeferredDeliveryLink: embedded,
        });
    };

    const isBlank = () => {
        const currentData = readCurrentFormData();
        return (
            !String(currentData.name || "").trim() &&
            !String(currentData.street || "").trim() &&
            !String(currentData.code || "").trim()
        );
    };

    const handleSave = async (): Promise<boolean> => {
        if (!token) return false;

        const currentData = readCurrentFormData();
        const createData = buildCreatePayload(currentData, { requireCustomerId: true });
        if (!createData) return false;

        const okRules = await validateAgainstExistingAddresses(
            createData,
            currentData.customerId
        );
        if (!okRules) return false;

        setIsLoading(true);
        try {
            if (isEdit && addressId) {
                const updateData: IFCustomerAddressUpdate = { ...createData };
                await customerAddressesService.update(
                    currentData.customerId,
                    addressId,
                    updateData,
                    token,
                    currentCompany?.id
                );
                notify("Dirección actualizada exitosamente", "success", 3000);
            } else {
                await customerAddressesService.create(
                    currentData.customerId,
                    createData,
                    token,
                    currentCompany?.id
                );
                notify("Dirección creada exitosamente", "success", 3000);
            }
            onSuccess();
            if (!embedded) onClose();
            return true;
        } catch (error) {
            console.error("Error saving address:", error);
            notify(
                error instanceof Error ? error.message : "Error al guardar dirección",
                "error",
                3000
            );
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    useImperativeHandle(ref, () => ({
        submit: handleSave,
        getValidatedCreateData,
        isBlank,
    }));

    const handleLocationChange = useCallback(
        (
            coords: { lat: number; lng: number },
            options?: { commit?: boolean }
        ) => {
            const form = formRef.current?.instance();
            form?.updateData("geoLat", coords.lat);
            form?.updateData("geoLon", coords.lng);
            // El mapa está fuera del Form: setState en commit es seguro y evita
            // que al re-mostrar el mapa el pin vuelva a la posición inicial.
            if (options?.commit !== false) {
                setMapCoords({ lat: coords.lat, lng: coords.lng });
            }
        },
        []
    );

    const syncSecondaryFormField = useCallback((e: any) => {
        if (!e?.dataField) return;
        formRef.current?.instance()?.updateData(e.dataField, e.value);
    }, []);

    // Sync mapa cuando hidrata el form (seed / edit / location heredada).
    useEffect(() => {
        if (!isHydrated) return;
        setMapCoords({
            lat: formData.geoLat ?? null,
            lng: formData.geoLon ?? null,
        });
    }, [isHydrated, formData.geoLat, formData.geoLon]);

    const formContent = (
            <div className={embedded ? "flex flex-col gap-4" : "flex flex-col gap-4 p-4 h-full overflow-y-auto custom-scrollbar"}>
                {!isHydrated ? (
                    <div className="flex flex-1 min-h-[320px] w-full flex-col items-center justify-center gap-3 text-main/60">
                        <LoadIndicator visible height={36} width={36} />
                        <span className="text-sm text-center">
                            {isEdit
                                ? "Cargando datos de la dirección..."
                                : "Preparando formulario..."}
                        </span>
                    </div>
                ) : (
                    <>
                    <Form
                        ref={formRef}
                        formData={formData}
                        labelLocation="top"
                        showValidationSummary={true}
                        colCount={2}
                    >
                        <GroupItem caption="Datos principales" colCount={2} colSpan={2}>
                            <Item
                                dataField="customerId"
                                editorType="dxSelectBox"
                                isRequired={true}
                                colSpan={2}
                                visible={!embedded}
                                label={{ text: "Cliente" }}
                                editorOptions={{
                                    dataSource: customersDataSource,
                                    valueExpr: "id",
                                    displayExpr: "label",
                                    searchEnabled: true,
                                    disabled: isEdit || lockCustomer,
                                    placeholder: "Seleccione un cliente...",
                                    onValueChanged: (e: any) => {
                                        if (!e.event) return;
                                        formRef.current?.instance().updateData("deliveryAddressId", null);
                                        void loadDeliveryAddresses(e.value);
                                        const types =
                                            formRef.current?.instance()?.option("formData")?.type;
                                        syncDeliveryAddressRequirement(types);
                                    },
                                }}
                            />
                            <Item
                                dataField="name"
                                editorType="dxTextBox"
                                isRequired={true}
                                label={{ text: "Nombre" }}
                            />
                            <Item
                                dataField="code"
                                editorType="dxTextBox"
                                label={{ text: "Código PDV" }}
                            />
                            <Item
                                dataField="type"
                                editorType="dxTagBox"
                                isRequired={true}
                                colSpan={2}
                                label={{ text: "Tipo" }}
                                editorOptions={{
                                    dataSource: ADDRESS_TYPES,
                                    valueExpr: "id",
                                    displayExpr: "label",
                                    showSelectionControls: true,
                                    searchEnabled: false,
                                    placeholder: "Seleccione tipos...",
                                    onValueChanged: (e: any) => {
                                        // TagBox no siempre envía e.event; sincronizar siempre.
                                        syncDeliveryAddressRequirement(e.value);
                                    },
                                }}
                            />
                            <Item
                                dataField="street"
                                editorType="dxTextBox"
                                colSpan={2}
                                label={{ text: "Calle" }}
                            />
                            <Item
                                dataField="countryId"
                                editorType="dxSelectBox"
                                label={{ text: "País" }}
                                editorOptions={{
                                    dataSource: countries,
                                    valueExpr: "id",
                                    displayExpr: "name",
                                    searchEnabled: true,
                                    placeholder: "Seleccione un país...",
                                    onValueChanged: (e: any) => {
                                        if (!e.event) return;
                                        formRef.current?.instance().updateData("stateId", null);
                                        formRef.current?.instance().updateData("cityId", null);
                                        statesRef.current = [];
                                        citiesRef.current = [];
                                        stateEditorRef.current?.option("dataSource", []);
                                        stateEditorRef.current?.option("disabled", true);
                                        cityEditorRef.current?.option("dataSource", []);
                                        cityEditorRef.current?.option("disabled", true);

                                        if (!e.value || !token) return;
                                        const country = countries.find((c) => c.id === e.value);
                                        if (!country?.code) return;
                                        statesService.getAll(token, country.code, false, true).then((res) => {
                                            statesRef.current = res.items || [];
                                            stateEditorRef.current?.option("dataSource", statesRef.current);
                                            stateEditorRef.current?.option("disabled", false);
                                        });
                                    },
                                }}
                            />
                            <Item
                                dataField="stateId"
                                editorType="dxSelectBox"
                                label={{ text: "Provincia" }}
                                editorOptions={{
                                    onInitialized: (e: any) => {
                                        stateEditorRef.current = e.component;
                                    },
                                    dataSource: statesRef.current,
                                    valueExpr: "id",
                                    displayExpr: "name",
                                    searchEnabled: true,
                                    placeholder: "Seleccione una provincia...",
                                    disabled: !formData.countryId,
                                    onValueChanged: (e: any) => {
                                        if (!e.event) return;
                                        formRef.current?.instance().updateData("cityId", null);
                                        citiesRef.current = [];
                                        cityEditorRef.current?.option("dataSource", []);
                                        cityEditorRef.current?.option("disabled", true);
                                        if (!e.value || !token) return;
                                        citiesService.getAll(token, e.value, false, true).then((res) => {
                                            citiesRef.current = res.items || [];
                                            cityEditorRef.current?.option("dataSource", citiesRef.current);
                                            cityEditorRef.current?.option("disabled", false);
                                        });
                                    },
                                }}
                            />
                            <Item
                                dataField="cityId"
                                editorType="dxSelectBox"
                                label={{ text: "Ciudad" }}
                                editorOptions={{
                                    onInitialized: (e: any) => {
                                        cityEditorRef.current = e.component;
                                    },
                                    dataSource: citiesRef.current,
                                    valueExpr: "id",
                                    displayExpr: "name",
                                    searchEnabled: true,
                                    placeholder: "Seleccione una ciudad...",
                                    disabled: !formData.stateId,
                                }}
                            />
                            <Item dataField="zip" editorType="dxTextBox" label={{ text: "Código postal" }} />
                            <Item
                                dataField="geoLat"
                                editorType="dxNumberBox"
                                label={{ text: "Latitud" }}
                                editorOptions={{
                                    showSpinButtons: false,
                                    format: "#0.######",
                                    step: 0,
                                    onValueChanged: (e: any) => {
                                        if (!e.event) return;
                                        const formLon =
                                            formRef.current
                                                ?.instance()
                                                ?.option("formData")?.geoLon ??
                                            null;
                                        setMapCoords({
                                            lat: e.value ?? null,
                                            lng: formLon,
                                        });
                                    },
                                }}
                            />
                            <Item
                                dataField="geoLon"
                                editorType="dxNumberBox"
                                label={{ text: "Longitud" }}
                                editorOptions={{
                                    showSpinButtons: false,
                                    format: "#0.######",
                                    step: 0,
                                    onValueChanged: (e: any) => {
                                        if (!e.event) return;
                                        const formLat =
                                            formRef.current
                                                ?.instance()
                                                ?.option("formData")?.geoLat ??
                                            null;
                                        setMapCoords({
                                            lat: formLat,
                                            lng: e.value ?? null,
                                        });
                                    },
                                }}
                            />
                        </GroupItem>
                    </Form>

                    <AddressLocationPicker
                        latitude={mapCoords.lat}
                        longitude={mapCoords.lng}
                        onChange={handleLocationChange}
                        defaultOpen={true}
                    />

                    <Form
                        formData={formData}
                        labelLocation="top"
                        colCount={2}
                        onFieldDataChanged={syncSecondaryFormField}
                    >
                        <GroupItem colCount={2} colSpan={2}>
                            <Item
                                dataField="active"
                                editorType="dxCheckBox"
                                label={{ text: "Activo", location: "right" }}
                            />
                        </GroupItem>

                        <GroupItem caption="Overrides comerciales" colCount={2} colSpan={2}>
                            <Item
                                dataField="deliveryAddressId"
                                editorType="dxSelectBox"
                                colSpan={2}
                                isRequired={false}
                                label={{ text: "Dirección de entrega" }}
                                helpText="Obligatorio si el tipo incluye Ventas y no Entrega. Solo lista direcciones de entrega del cliente."
                                editorOptions={{
                                    onInitialized: (e: any) => {
                                        deliveryAddressEditorRef.current = e.component;
                                        const types =
                                            formRef.current?.instance()?.option("formData")?.type
                                            ?? formData.type;
                                        const needsDelivery =
                                            Array.isArray(types) && types.includes("sales");
                                        e.component.option({
                                            dataSource: deliveryAddressesRef.current,
                                            disabled: !needsDelivery,
                                        });
                                    },
                                    dataSource: deliveryAddressesRef.current,
                                    valueExpr: "id",
                                    displayExpr: "label",
                                    searchEnabled: true,
                                    showClearButton: true,
                                    placeholder: "Seleccione una dirección de entrega...",
                                    noDataText: "No hay direcciones de entrega para este cliente",
                                    disabled: true,
                                }}
                            />
                            <Item
                                dataField="accountId"
                                editorType="dxTextBox"
                                label={{ text: "Cuenta corriente (ID)" }}
                            />
                            <Item
                                dataField="creditLimit"
                                editorType="dxNumberBox"
                                label={{ text: "Límite de crédito" }}
                            />
                            <Item
                                dataField="pricelistId"
                                editorType="dxSelectBox"
                                label={{ text: "Lista de precios" }}
                                editorOptions={{
                                    dataSource: priceListOptions,
                                    valueExpr: "id",
                                    displayExpr: (item: IFOptionItem) =>
                                        item
                                            ? item.code
                                                ? `${item.code} — ${item.label}`
                                                : item.label
                                            : "",
                                    searchEnabled: true,
                                    showClearButton: true,
                                    placeholder: "Seleccione una lista de precios...",
                                    noDataText: "No hay listas de precios para esta compañía",
                                }}
                            />
                            <Item
                                dataField="paymentTermId"
                                editorType="dxSelectBox"
                                label={{ text: "Condición de pago" }}
                                editorOptions={{
                                    dataSource: paymentTermOptions,
                                    valueExpr: "id",
                                    displayExpr: (item: IFOptionItem) =>
                                        item
                                            ? item.code
                                                ? `${item.code} — ${item.label}`
                                                : item.label
                                            : "",
                                    searchEnabled: true,
                                    showClearButton: true,
                                    placeholder: "Seleccione una condición de pago...",
                                    noDataText:
                                        "No hay condiciones de pago para esta compañía",
                                }}
                            />
                            <Item
                                dataField="salesChannelId"
                                editorType="dxTextBox"
                                label={{ text: "Canal de venta (ID)" }}
                            />
                            <Item
                                dataField="commercialPlatformId"
                                editorType="dxSelectBox"
                                colSpan={2}
                                label={{ text: "Plataforma comercial" }}
                                editorOptions={{
                                    dataSource: commercialPlatformOptions,
                                    valueExpr: "id",
                                    displayExpr: (item: IFCommercialPlatform) =>
                                        item
                                            ? item.code
                                                ? `${item.code} — ${item.name}`
                                                : item.name
                                            : "",
                                    searchEnabled: true,
                                    showClearButton: true,
                                    placeholder: "Seleccione una plataforma comercial...",
                                    noDataText:
                                        "No hay plataformas comerciales para esta compañía",
                                }}
                            />
                        </GroupItem>
                    </Form>
                    </>
                )}
            </div>
    );

    if (embedded) {
        if (!isOpen) return null;
        return formContent;
    }

    return (
        <Popup
            visible={isOpen}
            onHiding={onClose}
            onHidden={() => {
                setFormData({ ...emptyForm });
                setMapCoords({ lat: null, lng: null });
                statesRef.current = [];
                citiesRef.current = [];
                deliveryAddressesRef.current = [];
                formRef.current?.instance()?.resetValues?.();
            }}
            dragEnabled={false}
            hideOnOutsideClick={true}
            showCloseButton={true}
            showTitle={true}
            title={isEdit ? "Editar Dirección" : "Nueva Dirección"}
            width={720}
            height={620}
            className="custom-popup"
            deferRendering={false}
            onShown={(e) => {
                e.component.repaint();
            }}
        >
            <Position at="center" my="center" />
            {formContent}
            <ToolbarItem toolbar="bottom" location="after">
                <Button
                    text="Cancelar"
                    onClick={onClose}
                    disabled={isLoading || !isHydrated}
                    stylingMode="text"
                    className="!rounded-dx !bg-main/10"
                />
            </ToolbarItem>
            <ToolbarItem toolbar="bottom" location="after">
                <Button
                    type="default"
                    text="Guardar"
                    stylingMode="contained"
                    onClick={() => {
                        void handleSave();
                    }}
                    disabled={isLoading || !isHydrated}
                    className="!bg-focus-300 shadow-lg shadow-black/20 !text-variant"
                />
            </ToolbarItem>
        </Popup>
    );
});

export default AddressModal;
