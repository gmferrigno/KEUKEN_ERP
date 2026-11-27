import React from "react";
import { cookies } from "next/headers";
import { metadataService } from "@repo/erp-services/metadata.service";
import MetadataFieldsClient from "./MetadataFieldsClient";
import { IFMetadataFieldsProps } from "@repo/api-contracts/erp";

export default async function MetadataFields({
    entityType,
    entityId,
    title,
    mode = "default",
    readOnly = false,
    canEdit = false,
    onToggle,
    isToggled,
    loading,
    error,
    initialValues,
}: IFMetadataFieldsProps) {

    if (!entityId) {
        return (
            <div className="p-4 border border-dashed rounded text-gray-500 text-sm">
                Guardá el registro para configurar metadata dinámica.
            </div>
        );
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value || "";

    if (!token) {
        return <div className="text-red-500 text-sm">No autorizado para cargar metadata</div>;
    }

    try {
        const [attributes, groups, initialFetchedValues] = await Promise.all([
            metadataService.getAttributes(entityType, token, true),
            metadataService.getGroups(entityType, token),
            metadataService.getValues(entityType, entityId, token)
        ]);

        return (
            <MetadataFieldsClient
                entityType={entityType}
                entityId={entityId}
                title={title}
                mode={mode}
                readOnly={readOnly}
                canEdit={canEdit}
                onToggle={onToggle}
                isToggled={isToggled}
                loading={loading}
                error={error}
                initialValues={initialValues}
                attributes={attributes}
                groups={groups}
                initialFetchedValues={initialFetchedValues}
            />
        );
    } catch (error: any) {
        console.error("Error cargando metadatos dinámicos:", error);
        const errorMessage = error instanceof Error && error.message ? error.message : "Ocurrió un error al cargar los campos de metadatos. Revisa la consola o contacta soporte.";
        return (
            <div className="text-red-500 text-sm p-4 border rounded bg-red-50">
                {errorMessage}
            </div>
        );
    }
}
