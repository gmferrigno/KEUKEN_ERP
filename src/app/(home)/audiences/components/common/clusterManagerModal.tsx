'use client';

import { useAuth } from "@/contexts/AuthContext";
import { Button, SelectBox } from '@repo/devextreme';
import Form, { GroupItem, SimpleItem } from "devextreme-react/form";
import { Popup, Position, ToolbarItem } from "devextreme-react/popup";
import notify from "devextreme/ui/notify";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ClusterEntityType,
    IClusterItemOption,
    ManagerMode,
    ClusterKindOption
} from "@repo/api-contracts/erp";
import { CLUSTER_KIND_OPTIONS } from "@/app/lib/constants/audiences.constants";
import { getClusterStrategy } from "../strategy/strategyResolver";
import { ClusterRuleBuilder } from "./clusterRuleBuilder";

export interface ClusterManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    onHidden?: () => void;
    selectedIds?: string[];
    entityType: ClusterEntityType;
    existingClusterOnly?: boolean;
}

interface NewClusterFormData {
    code: string;
    name: string;
    description: string;
    kind: ClusterKindOption;
}

const emptyFormData: NewClusterFormData = {
    code: "",
    name: "",
    description: "",
    kind: "static",
};

export const ClusterManagerModal = ({
    isOpen,
    onClose,
    onSuccess,
    onHidden,
    selectedIds = [],
    entityType = 'customer',
    existingClusterOnly = false,
}: ClusterManagerModalProps) => {
    const { token, currentCompany } = useAuth();
    const hasSelectedMembers = Boolean(selectedIds && selectedIds.length > 0);
    const memberCount = selectedIds?.length || 0;

    const formRef = useRef<any>(null);

    const [mode, setMode] = useState<ManagerMode>(existingClusterOnly ? 'existing' : (hasSelectedMembers ? 'existing' : 'new'));
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [clusters, setClusters] = useState<IClusterItemOption[]>([]);
    const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);

    const [formData, setFormData] = useState<NewClusterFormData>(emptyFormData);
    const [kind, setKind] = useState<ClusterKindOption>('static');
    const [ruleSet, setRuleSet] = useState<any>(null);
    const [isFormValid, setIsFormValid] = useState<boolean>(false);

    const strategy = useMemo(() => getClusterStrategy(entityType), [entityType]);

    const handleHidden = useCallback(() => {
        setMode(existingClusterOnly ? 'existing' : (hasSelectedMembers ? 'existing' : 'new'));
        setFormData({ ...emptyFormData });
        setKind('static');
        setSelectedClusterId(null);
        setRuleSet(null);
        setIsFormValid(false);
        setIsSubmitting(false);
        setIsLoading(false);
        if (onHidden) {
            onHidden();
        }
    }, [hasSelectedMembers, onHidden, existingClusterOnly]);

    useEffect(() => {
        if (!isOpen) return;

        setMode(existingClusterOnly ? 'existing' : (hasSelectedMembers ? 'existing' : 'new'));
        setFormData({ ...emptyFormData });
        setKind('static');
        setRuleSet(strategy.getDefaultRuleSet());
        setIsFormValid(false);

        setTimeout(() => {
            const formInstance = formRef.current?.instance();
            if (formInstance) {
                formInstance.option("formData", { ...emptyFormData });
                if (typeof formInstance.reset === 'function') {
                    formInstance.reset();
                }
                formInstance.option("formData", { ...emptyFormData });
            }
        }, 0);

        if (!token) return;

        if (hasSelectedMembers) {
            let isMounted = true;
            const loadClusters = async () => {
                setIsLoading(true);
                try {
                    const data = await strategy.getClusterOptions(token, currentCompany?.id);
                    if (!isMounted) return;
                    setClusters(data);
                    if (data.length > 0) {
                        setSelectedClusterId(data[0].id);
                    } else {
                        setSelectedClusterId(null);
                    }
                } catch (error: any) {
                    console.error("Error al cargar el clúster:", error);
                    notify("Error al cargar la lista de clústeres", "error", 3000);
                } finally {
                    if (isMounted) {
                        setIsLoading(false);
                    }
                }
            };

            loadClusters();

            return () => {
                isMounted = false;
            };
        }
    }, [isOpen, token, currentCompany?.id, strategy, hasSelectedMembers]);

    const handleSubmit = async () => {
        if (mode === 'existing') {
            if (!hasSelectedMembers) {
                notify(`No hay ${strategy.entityLabel.plural} seleccionados para agregar`, "warning", 3000);
                return;
            }
            if (!selectedClusterId) {
                notify("Selecciona un clúster para continuar", "warning", 3000);
                return;
            }

            setIsSubmitting(true);
            try {
                const res = await strategy.addMembers(selectedClusterId, selectedIds, token, currentCompany?.id);
                notify(res.detail || `${memberCount} ${strategy.entityLabel.plural} agregados al clúster correctamente`, "success", 3000);
                if (onSuccess) {
                    onSuccess();
                }
                onClose();
            } catch (error: any) {
                console.error("Error al agrupar en el clúster:", error);
                const errorMessage = error instanceof Error && error.message ? error.message : "Error al procesar la solicitud";
                notify(errorMessage, "error", 3000);
            } finally {
                setIsSubmitting(false);
            }
        } else {
            const formInstance = formRef.current?.instance();
            const currentData: NewClusterFormData = formInstance ? formInstance.option("formData") : formData;

            const code = currentData?.code?.trim();
            const name = currentData?.name?.trim();
            const clusterKind = currentData?.kind || kind || 'static';

            if (!code) {
                notify("El código del clúster es obligatorio", "warning", 3000);
                return;
            }
            if (!name) {
                notify("El nombre del clúster es obligatorio", "warning", 3000);
                return;
            }

            if (clusterKind !== 'static') {
                const validation = strategy.validateRuleSet(ruleSet || strategy.getDefaultRuleSet());
                if (!validation.isValid) {
                    notify(validation.errorMessage || "Las reglas configuradas no son válidas", "warning", 3000);
                    return;
                }
            }

            setIsSubmitting(true);
            try {
                const res = await strategy.createAndAddMembers(
                    {
                        code: code.toUpperCase(),
                        name: name,
                        description: currentData?.description?.trim() || undefined,
                        kind: clusterKind,
                        ruleSet: clusterKind !== 'static' ? (ruleSet || strategy.getDefaultRuleSet()) : undefined,
                    },
                    selectedIds || [],
                    token,
                    currentCompany?.id
                );
                notify(
                    res.detail ||
                    (hasSelectedMembers
                        ? `El clúster se creó y ${memberCount} ${strategy.entityLabel.plural} se agregaron exitosamente`
                        : `El clúster de ${strategy.entityLabel.plural} se creó exitosamente`),
                    "success",
                    3000
                );

                if (onSuccess) {
                    onSuccess();
                }
                onClose();
            } catch (error: any) {
                console.error("Error al crear el clúster:", error);
                const errorMessage = error instanceof Error && error.message ? error.message : "Error al procesar la solicitud";
                notify(errorMessage, "error", 3000);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    useEffect(() => {
        const instance = formRef.current?.instance();
        if (instance) {
            instance.getEditor("code")?.option("disabled", isSubmitting);
            instance.getEditor("name")?.option("disabled", isSubmitting);
            instance.getEditor("kind")?.option("disabled", isSubmitting);
            instance.getEditor("description")?.option("disabled", isSubmitting);
        }
    }, [isSubmitting]);

    const formContent = useMemo(() => (
        <Form
            ref={formRef}
            formData={formData}
            labelLocation="top"
            showColonAfterLabel={false}
            onFieldDataChanged={(e) => {
                if (e.dataField === "kind") {
                    setKind(e.value);
                }
                const currentData = e.component.option("formData");
                const isValid = Boolean(currentData?.code?.trim() && currentData?.name?.trim() && currentData?.kind);
                setIsFormValid((prev) => {
                    if (prev !== isValid) return isValid;
                    return prev;
                });
            }}
        >
            <GroupItem colCount={2}>
                <SimpleItem
                    dataField="code"
                    label={{ text: "Código del Clúster *" }}
                    editorType="dxTextBox"
                    editorOptions={{
                        stylingMode: "filled",
                        placeholder: "Ej: KIOSCOS-VIP, PROMO-VERANO",
                    }}
                />
                <SimpleItem
                    dataField="kind"
                    label={{ text: "Tipo de Clúster" }}
                    editorType="dxSelectBox"
                    editorOptions={{
                        items: CLUSTER_KIND_OPTIONS,
                        valueExpr: "id",
                        displayExpr: "name",
                        stylingMode: "filled"
                    }}
                />
            </GroupItem>

            <GroupItem colCount={1}>
                <SimpleItem
                    dataField="name"
                    label={{ text: "Nombre del Clúster *" }}
                    editorType="dxTextBox"
                    editorOptions={{
                        stylingMode: "filled",
                        placeholder: "Ej: Kioscos de alto volumen",
                    }}
                />
            </GroupItem>

            <GroupItem colCount={1}>
                <SimpleItem
                    dataField="description"
                    label={{ text: "Descripción (Opcional)" }}
                    editorType="dxTextBox"
                    editorOptions={{
                        stylingMode: "filled",
                        placeholder: "Propósito comercial de este clúster",
                    }}
                />
            </GroupItem>
        </Form>
    ), [formData]);

    const modalTitle = hasSelectedMembers ? strategy.managerTitle : `Nuevo ${strategy.clusterEntityLabel}`;
    const modalSubtitle = hasSelectedMembers
        ? strategy.managerSubtitle
        : `Define los datos requeridos para registrar un nuevo clúster de ${strategy.entityLabel.plural}.`;

    const isDynamicOrHybrid = kind === 'dynamic' || kind === 'hybrid';

    return (
        <Popup
            visible={isOpen}
            onHiding={onClose}
            onHidden={handleHidden}
            dragEnabled={false}
            hideOnOutsideClick={true}
            showCloseButton={true}
            showTitle={true}
            title={modalTitle}
            width={mode === 'new' && isDynamicOrHybrid ? 760 : 540}
            height="auto"
            maxHeight="90vh"
            className="custom-popup"
            onShown={(e) => {
                e.component.repaint();
            }}
        >
            <Position at="center" my="center" />
            <div className="flex flex-col gap-4 p-4 max-h-[75vh] overflow-y-auto">
                <p className="text-xs text-main/70">
                    {modalSubtitle}
                </p>

                {hasSelectedMembers && (
                    <>

                        <div className="bg-focus-500/10 border border-focus-500/50 p-3 rounded-dx text-xs text-main flex items-center justify-between">
                            <span>{strategy.entityLabel.plural} seleccionados a agrupar:</span>
                            <span className="font-bold text-sm bg-focus-500/20 text-focus-300 px-2.5 py-0.5 rounded-full">
                                {memberCount}
                            </span>
                        </div>


                        {!existingClusterOnly && (
                            <div className="flex border border-main/10 rounded-dx overflow-hidden p-1 bg-main/5 flex-shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setMode('existing')}
                                    className={`flex-1 flex items-center justify-center whitespace-nowrap gap-2 py-2 px-3 text-xs font-semibold rounded-dx transition-all ${mode === 'existing'
                                        ? 'bg-focus-300 text-variant shadow-md font-bold'
                                        : 'text-main/70 hover:text-main hover:bg-main/5'
                                        }`}
                                >
                                    <i className="dx-icon-group" />
                                    Clúster Existente
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMode('new')}
                                    className={`flex-1 flex items-center justify-center whitespace-nowrap gap-2 py-2 px-3 text-xs font-semibold rounded-dx transition-all ${mode === 'new'
                                        ? 'bg-focus-300 text-variant shadow-md font-bold'
                                        : 'text-main/70 hover:text-main hover:bg-main/5'
                                        }`}
                                >
                                    <i className="dx-icon-add" />
                                    Crear Nuevo Clúster
                                </button>
                            </div>
                        )}
                    </>
                )}


                {mode === 'existing' ? (
                    <div className="flex flex-col gap-1.5 mt-1">
                        <label className="text-xs font-semibold text-main/80">
                            Seleccionar Clúster ({strategy.entityLabel.plural})
                        </label>
                        <SelectBox
                            items={clusters}
                            valueExpr="id"
                            displayExpr={(item: IClusterItemOption) => {
                                if (!item) return "";
                                const code = item.code ? ` (${item.code})` : "";
                                const count = item.memberCount !== undefined ? ` - ${item.memberCount} miembros` : "";
                                return `${item.name || ""}${code}${count}`;
                            }}
                            value={selectedClusterId}
                            onValueChanged={(e) => setSelectedClusterId(e.value)}
                            placeholder={isLoading ? "Cargando clústeres..." : "Buscar o seleccionar clúster..."}
                            disabled={isLoading || isSubmitting}
                            searchEnabled={true}
                            showClearButton={false}
                            stylingMode="filled"
                        />
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 mt-1">
                        {formContent}


                        {isDynamicOrHybrid && (
                            <div className="border-t border-main/10 pt-3 mt-1">
                                <ClusterRuleBuilder
                                    entityType={entityType}
                                    value={ruleSet}
                                    onChange={setRuleSet}
                                    disabled={isSubmitting}
                                    isPreviewDisabled={!isFormValid}
                                    companyId={currentCompany?.id}
                                    token={token}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>


            <ToolbarItem toolbar="bottom" location="after">
                <Button
                    text="Cancelar"
                    onClick={onClose}
                    disabled={isSubmitting}
                    stylingMode="text"
                    className="!rounded-dx !bg-main/10"
                />
            </ToolbarItem>
            <ToolbarItem toolbar="bottom" location="after">
                <Button
                    type="default"
                    text={
                        isSubmitting
                            ? "Procesando..."
                            : mode === 'existing'
                                ? "Confirmar Agrupamiento"
                                : hasSelectedMembers
                                    ? "Crear y Agrupar"
                                    : "Crear Clúster"
                    }
                    stylingMode="contained"
                    onClick={handleSubmit}
                    disabled={isSubmitting || (mode === 'existing' && (isLoading || !selectedClusterId)) || (mode === 'new' && !isFormValid)}
                    className="!bg-focus-300 shadow-lg shadow-black/20 !text-variant"
                />
            </ToolbarItem>
        </Popup>
    );
};

export default ClusterManagerModal;
