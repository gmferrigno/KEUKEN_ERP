import { commonService } from "@repo/erp-services/common.service";
import { ApiError } from "@repo/erp-api-client";
import notify from "devextreme/ui/notify";
import { confirm } from "devextreme/ui/dialog";

/**
 * Purge individual con dry_run obligatorio primero.
 * Requiere canPurge en UI antes de llamar.
 */
export async function purgeWithDryRunConfirm(params: {
    schema: string;
    table: string;
    id: string;
    token: string;
    label?: string;
}): Promise<boolean> {
    const { schema, table, id, token, label } = params;
    const name = label || id;

    try {
        const dry = await commonService.purge(schema, table, id, token, { dryRun: true });
        const ok = await confirm(
            `Simulación OK: ${dry.message || "candidato a purge"}.\n\n` +
                `¿Eliminar FÍSICAMENTE "${name}"? Esta acción es irreversible.`,
            "Confirmar purge"
        );
        if (!ok) return false;

        const result = await commonService.purge(schema, table, id, token, { dryRun: false });
        notify(result.message || "Registro purgado", "success", 3000);
        return true;
    } catch (error) {
        if (error instanceof ApiError && error.status === 503) {
            notify(
                "Purge no disponible en el backend (rol erp_purge). Contactá a infraestructura.",
                "error",
                6000
            );
            return false;
        }
        notify(
            error instanceof ApiError
                ? error.message
                : error instanceof Error
                  ? error.message
                  : "Error al purgar",
            "error",
            4000
        );
        return false;
    }
}
