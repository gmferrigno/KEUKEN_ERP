"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Form, { SimpleItem, GroupItem, TabbedItem, Tab } from "devextreme-react/form";
import { GenericButton as Button } from '@repo/devextreme';
import { useAuth } from "@/contexts/AuthContext";
import { metadataService } from "@repo/erp-services/metadata.service";
import { IFMetadataAttribute, IFMetadataGroup, IFMetadataFieldsProps } from "@repo/api-contracts/erp";
import MetadataEmptyState from "./MetadataEmptyState";
import notify from "devextreme/ui/notify";

interface Props extends Omit<IFMetadataFieldsProps, 'onToggle'> {
    attributes?: IFMetadataAttribute[];
    groups?: IFMetadataGroup[];
    initialFetchedValues?: any;
    onToggle?: (forceRefresh?: boolean) => void;
}

const getEditorOptions = (attr: IFMetadataAttribute, isFormReadOnly: boolean) => {
    const attrName = attr.name || attr.code;
    const placeholder = attr.shortDescription || attrName;

    const commonProps = {
        readOnly: isFormReadOnly,
        stylingMode: "filled" as const,
        elementAttr: { class: "rounded-dx w-full" },
        placeholder,
    };

    switch (attr.dataType) {
        case "string":
            return { ...commonProps, valueChangeEvent: "blur" };
        case "integer":
            return { ...commonProps, step: 1, valueChangeEvent: "blur" };
        case "decimal":
            return { ...commonProps, step: attr.constraints?.step, valueChangeEvent: "blur" };
        case "boolean":
            return { ...commonProps };
        case "date":
            return { ...commonProps, type: "date" as const };
        case "datetime":
            return { ...commonProps, type: "datetime" as const };
        case "list":
            const optionsList = attr.constraints?.options || [];
            const isObjectOption = optionsList.length > 0 && typeof optionsList[0] === 'object';
            return {
                ...commonProps,
                dataSource: optionsList,
                displayExpr: isObjectOption ? "label" : undefined,
                valueExpr: isObjectOption ? "value" : undefined,
                searchEnabled: true,
                showClearButton: true
            };
        case "json":
            return { ...commonProps, valueChangeEvent: "blur", autoResizeEnabled: true };
        default:
            return { ...commonProps, valueChangeEvent: "blur" };
    }
};

const getEditorType = (dataType: string) => {
    switch (dataType) {
        case "string": return "dxTextBox";
        case "integer": return "dxNumberBox";
        case "decimal": return "dxNumberBox";
        case "boolean": return "dxCheckBox";
        case "date": return "dxDateBox";
        case "datetime": return "dxDateBox";
        case "list": return "dxSelectBox";
        case "json": return "dxTextArea";
        default: return "dxTextBox";
    }
};

const mapValidationRules = (attribute: IFMetadataAttribute) => {
    const rules: any[] = [];
    if (attribute.isRequired) {
        rules.push({ type: "required", message: "Este campo es requerido" });
    }
    if (attribute.constraints) {
        if (attribute.constraints.maxLength) {
            rules.push({ type: "stringLength", max: attribute.constraints.maxLength, message: `Máximo ${attribute.constraints.maxLength} caracteres` });
        }
        if (attribute.constraints.min !== undefined || attribute.constraints.max !== undefined) {
            rules.push({
                type: "range",
                min: attribute.constraints.min,
                max: attribute.constraints.max,
                message: `Fuera de rango (${attribute.constraints.min || '∞'} - ${attribute.constraints.max || '∞'})`
            });
        }
        if (attribute.constraints.pattern) {
            rules.push({ type: "pattern", pattern: attribute.constraints.pattern, message: "Formato inválido" });
        }
    }
    return rules.length > 0 ? rules : undefined;
};

export default function MetadataFieldsClient({
    entityType,
    entityId,
    title,
    mode = "default",
    readOnly = false,
    canEdit = false,
    onToggle,
    isToggled = false,
    loading = false,
    error,
    initialValues,
    attributes,
    groups,
    initialFetchedValues,
    onChange,
    onError
}: Props) {
    const { token } = useAuth();
    const formRef = useRef<any>(null);

    const formDataRef = useRef<any>({ ...initialFetchedValues, ...initialValues });
    const [savedFormData, setSavedFormData] = useState<any>(() => ({ ...initialFetchedValues, ...initialValues }));
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        const data = { ...initialFetchedValues, ...initialValues };
        formDataRef.current = data;
        setSavedFormData(data);
        if (formRef.current) {
            formRef.current.instance().updateData(data);
        }
    }, [initialFetchedValues, initialValues]);

    const isFormReadOnly = readOnly || (canEdit ? !isEditing : false);

    useEffect(() => {
        if (formRef.current && (attributes || []).length > 0) {
            (attributes || []).forEach(attr => {
                const editor = formRef.current?.instance().getEditor(attr.code);
                if (editor) {
                    editor.option("readOnly", isFormReadOnly);
                }
            });
        }
    }, [isFormReadOnly, attributes]);

    const handleCancel = () => {
        formDataRef.current = { ...savedFormData };
        if (formRef.current) {
            formRef.current.instance().updateData(savedFormData);
        }
        setIsEditing(false);
    };

    const handleSave = async () => {
        if (!formRef.current) return;
        const validation = formRef.current.instance().validate();

        if (!validation.isValid) {
            if (onError) onError(validation.brokenRules);
            return;
        }

        setIsSaving(true);
        try {
            const savedValues = await metadataService.saveValues(entityType, entityId, formDataRef.current, token);
            formDataRef.current = savedValues;
            setSavedFormData(savedValues);
            setIsEditing(false);
            notify("Metadatos guardados exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error al guardar metadata:", error);
            const errorMessage = error instanceof Error && error.message ? error.message : "Error al guardar metadatos";
            notify(errorMessage, "error", 3000);
            if (onError) onError(error);
        } finally {
            setIsSaving(false);
        }
    };

    const visibleAttributes = useMemo(() => {
        return (attributes || []).filter(a => a.isVisible && !a.isSystemInternal);
    }, [attributes]);

    const unGroupedAttrs = useMemo(() => {
        return visibleAttributes.filter(a => !a.groupCode);
    }, [visibleAttributes]);

    const attrsByGroup = useMemo(() => {
        const groupsMap: Record<string, IFMetadataAttribute[]> = {};
        visibleAttributes.forEach(attr => {
            if (attr.groupCode) {
                if (!groupsMap[attr.groupCode]) groupsMap[attr.groupCode] = [];
                groupsMap[attr.groupCode].push(attr);
            }
        });
        return groupsMap;
    }, [visibleAttributes]);

    const editorOptionsMap = useMemo(() => {
        const map: Record<string, any> = {};
        visibleAttributes.forEach(attr => {
            map[attr.code] = getEditorOptions(attr, readOnly || (canEdit ? true : false));
        });
        return map;
    }, [visibleAttributes, readOnly, canEdit]);

    const validationRulesMap = useMemo(() => {
        const map: Record<string, any> = {};
        visibleAttributes.forEach(attr => {
            map[attr.code] = mapValidationRules(attr);
        });
        return map;
    }, [visibleAttributes]);

    const handleFieldDataChanged = useCallback((e: any) => {
        if (e.dataField) {
            formDataRef.current[e.dataField] = e.value;
            if (onChange) {
                onChange({ ...formDataRef.current });
            }
        }
    }, [onChange]);

    const formContent = useMemo(() => {
        if (visibleAttributes.length === 0) {
            return <MetadataEmptyState />;
        }

        return (
            <Form
                ref={formRef}
                formData={formDataRef.current}
                showColonAfterLabel={true}
                labelLocation="top"
                onFieldDataChanged={handleFieldDataChanged}
            >

                {unGroupedAttrs.map(attr => {
                    const attrName = attr.name || attr.code;
                    return (
                        <SimpleItem
                            key={attr.code}
                            dataField={attr.code}
                            label={{ text: attrName }}
                            isRequired={attr.isRequired}
                            validationRules={validationRulesMap[attr.code]}
                            editorType={getEditorType(attr.dataType)}
                            editorOptions={editorOptionsMap[attr.code]}
                        />
                    );
                })}


                {mode === "tabs" && (groups || []).length > 0 ? (
                    <TabbedItem tabPanelOptions={{ deferRendering: false }}>
                        {(groups || []).map(g => {
                            const groupAttrs = attrsByGroup[g.code] || [];
                            if (groupAttrs.length === 0) return null;
                            return (
                                <Tab key={g.code} title={g.name}>
                                    {groupAttrs.map(attr => {
                                        const attrName = attr.name || attr.code;
                                        return (
                                            <SimpleItem
                                                key={attr.code}
                                                dataField={attr.code}
                                                label={{ text: attrName }}
                                                isRequired={attr.isRequired}
                                                validationRules={validationRulesMap[attr.code]}
                                                editorType={getEditorType(attr.dataType)}
                                                editorOptions={editorOptionsMap[attr.code]}
                                            />
                                        );
                                    })}
                                </Tab>
                            );
                        })}
                    </TabbedItem>
                ) : (

                    (groups || []).map(g => {
                        const groupAttrs = attrsByGroup[g.code] || [];
                        if (groupAttrs.length === 0) return null;
                        return (
                            <GroupItem key={g.code} caption={g.name} colCount={2}>
                                {groupAttrs.map(attr => {
                                    const attrName = attr.name || attr.code;
                                    return (
                                        <SimpleItem
                                            key={attr.code}
                                            dataField={attr.code}
                                            label={{ text: attrName }}
                                            isRequired={attr.isRequired}
                                            validationRules={validationRulesMap[attr.code]}
                                            editorType={getEditorType(attr.dataType)}
                                            editorOptions={editorOptionsMap[attr.code]}
                                        />
                                    );
                                })}
                            </GroupItem>
                        );
                    })
                )}
            </Form>
        );
    }, [visibleAttributes, unGroupedAttrs, mode, groups, attrsByGroup, validationRulesMap, editorOptionsMap, handleFieldDataChanged]);

    return (
        <div className="metadata-fields-container flex flex-col">

            <div className="flex justify-between items-center">
                {title && <h4 className="text-sm font-semibold text-main">{title}</h4>}

                <div className="flex items-center gap-2">

                    {onToggle && !isEditing && (
                        <Button
                            icon={isToggled && !loading && !error && visibleAttributes.length === 0 ? "refresh" : "fields"}
                            text={
                                isToggled
                                    ? (visibleAttributes.length === 0 && !loading && !error)
                                        ? "Refrescar"
                                        : "Ocultar metadatos"
                                    : "Ver metadatos"
                            }
                            stylingMode="text"
                            className="!text-main hover:!text-focus-300 font-semibold"
                            onClick={() => {
                                const forceRefresh = isToggled && visibleAttributes.length === 0;
                                onToggle(forceRefresh);
                            }}
                        />
                    )}


                    {!readOnly && (!onToggle || isToggled) && !loading && !error && visibleAttributes.length > 0 && (
                        <div>
                            {canEdit ? (
                                !isEditing ? (
                                    <Button
                                        icon="edit"
                                        hint="Editar metadatos"
                                        stylingMode="text"
                                        className="!text-focus-300 hover:!text-focus-500"
                                        onClick={() => setIsEditing(true)}
                                    />
                                ) : (
                                    <div className="flex gap-1.5 items-center">
                                        <Button
                                            icon="revert"
                                            hint="Cancelar"
                                            stylingMode="text"
                                            className="!text-variant hover:!text-focus-300"
                                            onClick={handleCancel}
                                            disabled={isSaving}
                                        />
                                        <Button
                                            icon="check"
                                            hint="Confirmar"
                                            type="default"
                                            stylingMode="contained"
                                            className="!bg-focus-500 shadow-md shadow-black/10 !text-variant"
                                            onClick={handleSave}
                                            disabled={isSaving}
                                        />
                                    </div>
                                )
                            ) : (
                                <Button
                                    icon="check"
                                    text={isSaving ? "Guardando..." : "Guardar Metadata"}
                                    type="default"
                                    stylingMode="contained"
                                    className="!bg-focus-500 shadow-md shadow-black/10 !text-variant"
                                    onClick={handleSave}
                                    disabled={isSaving}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>


            {(!onToggle || isToggled) && (
                <div className="mt-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-6 gap-2 text-sm text-main/60 bg-primary-900/10 rounded-dx border border-main/5">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-focus-300 border-t-transparent" />
                            Cargando metadatos...
                        </div>
                    ) : error ? (
                        <div className="text-red-500 text-xs p-3 bg-red-500/10 border border-red-500/20 rounded-dx">
                            {error}
                        </div>
                    ) : (
                        formContent
                    )}
                </div>
            )}
        </div>
    );
}
