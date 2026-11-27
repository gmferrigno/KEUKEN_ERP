'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@repo/devextreme';
import Form, { GroupItem, SimpleItem } from "devextreme-react/form";
import { Popup, Position, ToolbarItem } from "devextreme-react/popup";
import notify from "devextreme/ui/notify";
import { useAuth } from "@/contexts/AuthContext";
import { ClusterEntityType } from "@repo/api-contracts/erp";
import { REFRESH_MODE_OPTIONS } from "@/app/lib/constants/audiences.constants";
import { getClusterStrategy } from "../strategy/strategyResolver";
import { ClusterRuleBuilder } from "./clusterRuleBuilder";
import { IClusterCardData } from './clusterSummaryCard';

export interface ClusterDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    onHidden?: () => void;
    clusterId: string;
    entityType: ClusterEntityType;
    cluster?: IClusterCardData | null;
    mode?: 'view' | 'edit';
}

interface ClusterFormData {
    name: string;
    description: string;
    refreshMode: string;
    active: boolean;
}

const emptyFormData: ClusterFormData = {
    name: "",
    description: "",
    refreshMode: "manual",
    active: true,
};

export const ClusterDetailModal: React.FC<ClusterDetailModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    onHidden,
    clusterId,
    entityType,
    cluster: initialCluster,
    mode = 'view',
}) => {
    const { token, currentCompany } = useAuth();
    const strategy = useMemo(() => getClusterStrategy(entityType), [entityType]);
    const formRef = useRef<any>(null);

    const isReadOnly = mode === 'view';

    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState<ClusterFormData>(() => {
        return initialCluster ? {
            name: initialCluster.name || "",
            description: initialCluster.description || "",
            refreshMode: initialCluster.refreshMode || "manual",
            active: initialCluster.active ?? true,
        } : emptyFormData;
    });
    const [kind, setKind] = useState<string>(initialCluster?.kind || "static");
    const [ruleSet, setRuleSet] = useState<any>((initialCluster as any)?.ruleSet || null);

    useEffect(() => {
        if (!isOpen) return;

        const nextData: ClusterFormData = initialCluster ? {
            name: initialCluster.name || "",
            description: initialCluster.description || "",
            refreshMode: initialCluster.refreshMode || "manual",
            active: initialCluster.active ?? true,
        } : { ...emptyFormData };

        setFormData(nextData);
        const clusterKind = initialCluster?.kind || "static";
        setKind(clusterKind);

        const initialRules = (initialCluster as any)?.ruleSet || (initialCluster as any)?.rule_set || null;
        if (initialRules) {
            setRuleSet(initialRules);
        }

        setTimeout(() => {
            const formInstance = formRef.current?.instance();
            if (formInstance) {
                formInstance.option("formData", nextData);
                if (typeof formInstance.reset === 'function') {
                    formInstance.reset();
                }
                formInstance.option("formData", nextData);
            }
        }, 0);

        if (!clusterId || !token) return;

        let isMounted = true;
        const loadData = async () => {
            try {
                const data = await strategy.getById(clusterId, token, currentCompany?.id);
                if (!isMounted) return;

                if (data.ruleSet) {
                    setRuleSet(data.ruleSet);
                } else if (!initialRules) {
                    setRuleSet(strategy.getDefaultRuleSet());
                }
                if (data.kind) {
                    setKind(data.kind);
                }
            } catch (err) {
                console.error("Error al cargar el clúster para modal:", err);
                if (!isMounted) return;
                if (!initialRules) {
                    setRuleSet(strategy.getDefaultRuleSet());
                }
            }
        };

        loadData();

        return () => {
            isMounted = false;
        };
    }, [isOpen, clusterId, token, currentCompany?.id, strategy, initialCluster]);

    const handleHidden = useCallback(() => {
        setFormData(emptyFormData);
        setRuleSet(null);
        setIsLoading(false);
        setIsSubmitting(false);
        if (onHidden) {
            onHidden();
        }
    }, [onHidden]);

    const isDynamicOrHybrid = kind === 'dynamic' || kind === 'hybrid';

    const handleSave = async () => {
        if (isReadOnly) return;

        const formInstance = formRef.current?.instance();
        const currentData: ClusterFormData = formInstance ? formInstance.option("formData") : formData;

        if (!currentData?.name?.trim()) {
            notify("El nombre del clúster es obligatorio", "warning", 3000);
            return;
        }

        if (isDynamicOrHybrid && ruleSet) {
            const validation = strategy.validateRuleSet(ruleSet);
            if (!validation.isValid) {
                notify(validation.errorMessage || "Las reglas configuradas no son válidas", "warning", 3000);
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const updatePayload: any = {
                name: currentData.name.trim(),
                description: currentData.description?.trim() || null,
                refreshMode: currentData.refreshMode,
                active: currentData.active,
            };

            if (isDynamicOrHybrid) {
                updatePayload.ruleSet = ruleSet;
            }

            await strategy.update(clusterId, updatePayload, token, currentCompany?.id);
            notify(`El clúster se actualizó exitosamente`, "success", 3000);
            if (onSuccess) {
                onSuccess();
            }
            onClose();
        } catch (error: any) {
            console.error("Error al actualizar el clúster:", error);
            const msg = error instanceof Error && error.message ? error.message : "Error al actualizar el clúster";
            notify(msg, "error", 3000);
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        const instance = formRef.current?.instance();
        if (instance) {
            const isDisabled = isSubmitting || isReadOnly;
            instance.getEditor("name")?.option("readOnly", isReadOnly);
            instance.getEditor("name")?.option("disabled", isSubmitting);
            instance.getEditor("refreshMode")?.option("readOnly", isReadOnly);
            instance.getEditor("refreshMode")?.option("disabled", isSubmitting);
            instance.getEditor("active")?.option("readOnly", true);
            instance.getEditor("active")?.option("disabled", true);
            instance.getEditor("description")?.option("readOnly", isReadOnly);
            instance.getEditor("description")?.option("disabled", isSubmitting);
        }
    }, [isSubmitting, isReadOnly]);

    const formContent = useMemo(() => (
        <Form
            ref={formRef}
            formData={formData}
            labelLocation="top"
            showColonAfterLabel={false}
        >
            <GroupItem colCount={1}>
                <SimpleItem
                    dataField="name"
                    label={{ text: "Nombre del Clúster *" }}
                    editorType="dxTextBox"
                    editorOptions={{
                        stylingMode: "filled",
                        placeholder: "Ej: Kioscos VIP",
                        readOnly: isReadOnly,
                    }}
                />
            </GroupItem>

            <GroupItem colCount={2}>
                <SimpleItem
                    dataField="refreshMode"
                    label={{ text: "Modo de Actualización" }}
                    editorType="dxSelectBox"
                    editorOptions={{
                        items: REFRESH_MODE_OPTIONS,
                        valueExpr: "id",
                        displayExpr: "name",
                        stylingMode: "filled",
                        readOnly: isReadOnly,
                    }}
                />

                <SimpleItem
                    dataField="active"
                    label={{ text: "Estado" }}
                    editorType="dxCheckBox"
                    editorOptions={{
                        text: "Clúster Activo",
                        readOnly: true,
                        disabled: true,
                    }}
                />
            </GroupItem>

            <GroupItem colCount={1}>
                <SimpleItem
                    dataField="description"
                    label={{ text: "Descripción" }}
                    editorType="dxTextBox"
                    editorOptions={{
                        stylingMode: "filled",
                        placeholder: "Propósito comercial de este clúster",
                        readOnly: isReadOnly,
                    }}
                />
            </GroupItem>
        </Form>
    ), [formData, isReadOnly]);

    const modalTitle = isReadOnly
        ? `Detalle de ${strategy.entityLabel.singular}`
        : `Editar ${strategy.entityLabel.singular}`;

    return (
        <Popup
            visible={isOpen}
            onHiding={onClose}
            onHidden={handleHidden}
            onShown={(e) => {
                e.component.repaint();
            }}
            dragEnabled={false}
            hideOnOutsideClick={true}
            showCloseButton={true}
            showTitle={true}
            title={modalTitle}
            width={isDynamicOrHybrid ? 760 : 540}
            height="auto"
            minHeight={isDynamicOrHybrid ? 550 : 200}
            maxHeight="90vh"
            className="custom-popup"
        >
            <Position at="center" my="center" />
            <div className="p-4 max-h-[75vh] overflow-y-auto font-sans text-xs">
                <div className="flex flex-col gap-4">
                    {formContent}


                    {isDynamicOrHybrid && (
                        <div className="border-t border-main/10 pt-3">
                            <ClusterRuleBuilder
                                entityType={entityType}
                                value={ruleSet}
                                onChange={setRuleSet}
                                disabled={isReadOnly || isSubmitting}
                                companyId={currentCompany?.id}
                                token={token}
                            />
                        </div>
                    )}
                </div>
            </div>

            {isReadOnly ? (
                <ToolbarItem toolbar="bottom" location="after">
                    <Button
                        text="Cerrar"
                        onClick={onClose}
                        stylingMode="text"
                        className="!rounded-dx !bg-main/10"
                    />
                </ToolbarItem>
            ) : (
                <>
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
                            text={isSubmitting ? "Guardando..." : "Guardar"}
                            stylingMode="contained"
                            onClick={handleSave}
                            disabled={isSubmitting || isLoading}
                            className="!bg-focus-300 shadow-lg shadow-black/20 !text-variant"
                        />
                    </ToolbarItem>
                </>
            )}
        </Popup>
    );
};

export default ClusterDetailModal;
