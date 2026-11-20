'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Form, { GroupItem, SimpleItem, Label } from 'devextreme-react/form';
import { Button, GenericSelectBox } from '@repo/devextreme';
import { custom } from 'devextreme/ui/dialog';
import notify from 'devextreme/ui/notify';
import {
    IFLicenseContract,
    IFLicensePutRequest,
    IFLicenseValidityPatch,
    IFModuleOverride,
    IFQuotaOverride,
    TFLicensePlanCode,
    TFProductModuleCode,
    TFQuotaCode,
} from '@repo/api-contracts/erp';
import { licenseCompanyService } from '@repo/erp-services/userContext/licenseCompany.service';
import { canDo } from '@repo/access';
import PERMISSIONS_CONSTANTS from '@repo/access';
import { useAuth } from '@/contexts/AuthContext';
import SectionHeader from '../../components/section/sectionHeader';
import {
    SysAdminEmptyState,
    SysAdminLoadingState,
    SysAdminMetaField,
    SysAdminMetaGrid,
    SysAdminPanel,
    SysAdminPanelBody,
    SysAdminPanelFooter,
    SysAdminPanelHeader,
    SysAdminToolbar,
} from '../components/sysAdminChrome';
import { useCompaniesList } from '../components/useCompaniesList';
import { useCompanyQueryParam } from '../components/useCompanyQueryParam';
import LicenseBadges from './components/licenseBadges';
import {
    LICENSE_PLANS,
    PRODUCT_MODULES,
    QUOTA_CODES,
} from '../lib/constants';

type LicenseFormState = {
    plan: TFLicensePlanCode | string;
    validFrom: string | null;
    validUntil: string | null;
    graceDays: number;
    moduleOverrides: Record<string, boolean | null>;
    quotaOverrides: Record<string, number | '' | null>;
};

const emptyForm = (): LicenseFormState => ({
    plan: 'core',
    validFrom: null,
    validUntil: null,
    graceDays: 7,
    moduleOverrides: Object.fromEntries(PRODUCT_MODULES.map((m) => [m.id, null])),
    quotaOverrides: Object.fromEntries(QUOTA_CODES.map((q) => [q.id, ''])),
});

function contractToForm(license: IFLicenseContract | null): LicenseFormState {
    if (!license) return emptyForm();

    const moduleOverrides = Object.fromEntries(
        PRODUCT_MODULES.map((m) => {
            const found = license.moduleOverrides.find((o) => o.moduleCode === m.id);
            return [m.id, found ? found.enabled : null] as const;
        })
    ) as LicenseFormState['moduleOverrides'];

    const quotaOverrides = Object.fromEntries(
        QUOTA_CODES.map((q) => {
            const found = license.quotaOverrides.find((o) => o.quotaCode === q.id);
            return [q.id, found ? (found.maxCount ?? null) : ''] as const;
        })
    ) as LicenseFormState['quotaOverrides'];

    return {
        plan: license.plan,
        validFrom: license.validFrom,
        validUntil: license.validUntil,
        graceDays: license.graceDays ?? 7,
        moduleOverrides,
        quotaOverrides,
    };
}

function formToPutRequest(form: LicenseFormState): IFLicensePutRequest {
    const moduleOverrides: IFModuleOverride[] = Object.entries(form.moduleOverrides)
        .filter(([, enabled]) => enabled !== null && enabled !== undefined)
        .map(([moduleCode, enabled]) => ({
            moduleCode: moduleCode as TFProductModuleCode,
            enabled: Boolean(enabled),
        }));

    const quotaOverrides: IFQuotaOverride[] = Object.entries(form.quotaOverrides)
        .filter(([, maxCount]) => maxCount !== '')
        .map(([quotaCode, maxCount]) => ({
            quotaCode: quotaCode as TFQuotaCode,
            maxCount: maxCount === null || maxCount === undefined ? null : Number(maxCount),
        }));

    return {
        plan: form.plan,
        validFrom: form.validFrom || null,
        validUntil: form.validUntil || null,
        graceDays: Number(form.graceDays) >= 0 ? Number(form.graceDays) : 7,
        moduleOverrides: moduleOverrides.length ? moduleOverrides : undefined,
        quotaOverrides: quotaOverrides.length ? quotaOverrides : undefined,
    };
}

function LicensesClientInner() {
    const { token, permissions, isSuperAdmin } = useAuth();
    const { companies, loading: loadingCompanies } = useCompaniesList();
    const { companyId, setCompanyId } = useCompanyQueryParam();

    const formRef = useRef<any>(null);
    const validityFormRef = useRef<any>(null);

    const [license, setLicense] = useState<IFLicenseContract | null>(null);
    const [loadingLicense, setLoadingLicense] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<LicenseFormState>(emptyForm);
    const [validityData, setValidityData] = useState<IFLicenseValidityPatch>({
        validFrom: null,
        validUntil: null,
        graceDays: 7,
    });
    const [showAssignForm, setShowAssignForm] = useState(false);

    const canModify = useMemo(() => {
        return Boolean(isSuperAdmin || (permissions && canDo('modify', PERMISSIONS_CONSTANTS.modifySysAdmin, permissions)));
    }, [isSuperAdmin, permissions]);

    const loadLicense = useCallback(async (id: string) => {
        if (!token) return;
        setLoadingLicense(true);
        try {
            const data = await licenseCompanyService.getCompanyLicense(id, token);
            setLicense(data);
            setFormData(contractToForm(data));
            setShowAssignForm(!data || data.status === 'revoked');
            if (data) {
                setValidityData({
                    validFrom: data.validFrom,
                    validUntil: data.validUntil,
                    graceDays: data.graceDays,
                });
            }
        } catch (err: any) {
            console.error(err);
            notify(err?.message || 'Error al obtener la licencia', 'error', 3500);
            setLicense(null);
            setFormData(emptyForm());
            setShowAssignForm(true);
        } finally {
            setLoadingLicense(false);
        }
    }, [token]);

    useEffect(() => {
        if (companyId) {
            void loadLicense(companyId);
        } else {
            setLicense(null);
            setFormData(emptyForm());
            setShowAssignForm(false);
        }
    }, [companyId, loadLicense]);

    const handleSavePut = async () => {
        if (!token || !companyId || !canModify) return;
        const formInstance = formRef.current?.instance();
        const validation = formInstance?.validate();
        if (validation && !validation.isValid) return;

        const current = (formInstance?.option('formData') as LicenseFormState) || formData;
        if (current.moduleOverrides?.core === false) {
            notify('No se puede deshabilitar el módulo core', 'error', 3000);
            return;
        }

        setSaving(true);
        try {
            const body = formToPutRequest(current);
            const updated = await licenseCompanyService.putCompanyLicense(companyId, body, token);
            setLicense(updated);
            setFormData(contractToForm(updated));
            setShowAssignForm(false);
            setValidityData({
                validFrom: updated.validFrom,
                validUntil: updated.validUntil,
                graceDays: updated.graceDays,
            });
            notify('Licencia asignada / reemplazada', 'success', 2500);
        } catch (err: any) {
            console.error(err);
            notify(err?.message || 'No se pudo guardar la licencia', 'error', 4000);
        } finally {
            setSaving(false);
        }
    };

    const handlePatchValidity = async () => {
        if (!token || !companyId || !canModify) return;
        const formInstance = validityFormRef.current?.instance();
        const current = (formInstance?.option('formData') as IFLicenseValidityPatch) || validityData;

        setSaving(true);
        try {
            const updated = await licenseCompanyService.patchLicenseValidity(companyId, {
                validFrom: current.validFrom ?? null,
                validUntil: current.validUntil ?? null,
                graceDays: current.graceDays,
            }, token);
            setLicense(updated);
            setFormData(contractToForm(updated));
            setValidityData({
                validFrom: updated.validFrom,
                validUntil: updated.validUntil,
                graceDays: updated.graceDays,
            });
            notify('Vigencia actualizada', 'success', 2500);
        } catch (err: any) {
            console.error(err);
            notify(err?.message || 'No se pudo actualizar la vigencia', 'error', 4000);
        } finally {
            setSaving(false);
        }
    };

    const handleRevoke = async () => {
        if (!token || !companyId || !canModify) return;

        const result = await custom({
            title: 'Revocar licencia',
            messageHtml: '¿Revocar la licencia activa/en gracia de esta compañía? El acceso quedará candado hasta un nuevo PUT.',
            buttons: [
                { text: 'Cancelar', onClick: () => false },
                { text: 'Revocar', onClick: () => true },
            ],
        }).show();

        if (!result) return;

        setSaving(true);
        try {
            const updated = await licenseCompanyService.revokeCompanyLicense(companyId, token);
            setLicense(updated);
            setFormData(contractToForm(updated));
            notify('Licencia revocada', 'success', 2500);
        } catch (err: any) {
            console.error(err);
            notify(err?.message || 'No se pudo revocar la licencia', 'error', 4000);
        } finally {
            setSaving(false);
        }
    };

    const canRevoke = Boolean(
        canModify &&
        license &&
        (license.status === 'active' || (license.status === 'expired' && license.warning === 'in_grace'))
    );

    const canPatchValidity = Boolean(
        canModify &&
        license &&
        license.status !== 'revoked'
    );

    const showPutForm = Boolean(companyId && showAssignForm);

    return (
        <div className="flex flex-col w-full h-full min-h-0 gap-y-3 overflow-hidden">
            <div className="shrink-0">
                <SectionHeader title="SysAdmin · Licencias" />
            </div>

            <div className="shrink-0">
                <SysAdminToolbar>
                    <div className="flex flex-col gap-1.5 w-full">
                        <label className="text-[11px] uppercase tracking-wide text-main/50">Compañía</label>
                        <GenericSelectBox
                            dataSource={companies}
                            value={companyId ?? undefined}
                            displayExpr="name"
                            valueExpr="id"
                            searchExpr={['name', 'taxId']}
                            placeholder={loadingCompanies ? 'Cargando compañías…' : 'Seleccionar compañía'}
                            disabled={loadingCompanies}
                            deferRendering={false}
                            width="100%"
                            onValueChanged={(e) => {
                                if (!e.event) return;
                                const next = e.value == null || e.value === '' ? null : String(e.value);
                                if (next === (companyId ?? null)) return;
                                setCompanyId(next);
                            }}
                        />
                        {companyId && !loadingLicense ? (
                            <LicenseBadges license={license} />
                        ) : null}
                    </div>
                </SysAdminToolbar>
            </div>

            {/* Content box: scroll interno; las cards se muestran completas sin scroll de página */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                <div className="flex flex-col gap-3">
                {!companyId ? (
                    <SysAdminPanel className="min-h-[280px] shrink-0">
                        <SysAdminEmptyState
                            icon="key"
                            title="Seleccioná una compañía"
                            description="Consultá el contrato admin de licencia, asigná un plan o ajustá vigencia / revocá acceso."
                        />
                    </SysAdminPanel>
                ) : loadingLicense ? (
                    <SysAdminPanel className="min-h-[200px] shrink-0">
                        <SysAdminLoadingState label="Cargando licencia…" />
                    </SysAdminPanel>
                ) : (
                    <>
                        {license ? (
                            <SysAdminPanel className="shrink-0">
                                <SysAdminPanelHeader
                                    title="Contrato actual"
                                    description={
                                        <>
                                            Catálogo: {license.catalogVersion || '—'}
                                        </>
                                    }
                                />
                                <SysAdminPanelBody>
                                    <SysAdminMetaGrid>
                                        <SysAdminMetaField label="Vigencia">
                                            {license.validFrom || 'ya vigente'} → {license.validUntil || 'sin vencimiento'}
                                            <span className="text-main/50"> · Gracia de {license.graceDays} días</span>
                                        </SysAdminMetaField>
                                        <SysAdminMetaField label="Módulos efectivos">
                                            {license.lockout || license.modulesEffective.length === 0
                                                ? '—'
                                                : license.modulesEffective.join(', ')}
                                        </SysAdminMetaField>
                                        <SysAdminMetaField label="Cuotas efectivas" className="md:col-span-2">
                                            {Object.keys(license.quotasEffective || {}).length === 0
                                                ? '—'
                                                : Object.entries(license.quotasEffective)
                                                    .map(([k, v]) => `${k}: ${v === null ? '∞' : v}`)
                                                    .join(' · ')}
                                        </SysAdminMetaField>
                                    </SysAdminMetaGrid>
                                </SysAdminPanelBody>
                                <SysAdminPanelFooter>
                                    {license.status !== 'revoked' ? (
                                        <Button
                                            text="Reemplazar plan"
                                            stylingMode="outlined"
                                            disabled={!canModify || saving}
                                            onClick={() => setShowAssignForm(true)}
                                        />
                                    ) : null}
                                    <Button
                                        text="Revocar"
                                        type="danger"
                                        stylingMode="outlined"
                                        disabled={!canRevoke || saving}
                                        onClick={() => void handleRevoke()}
                                    />
                                </SysAdminPanelFooter>
                            </SysAdminPanel>
                        ) : null}

                        {canPatchValidity && !showPutForm ? (
                            <SysAdminPanel className="shrink-0">
                                <SysAdminPanelHeader
                                    title="Extender / ajustar vigencia"
                                    description="Configurar vigencia y plan"
                                />
                                <SysAdminPanelBody>
                                    <Form
                                        ref={validityFormRef}
                                        formData={validityData}
                                        onFieldDataChanged={(e) => {
                                            if (!e.dataField) return;
                                            setValidityData((prev) => ({
                                                ...prev,
                                                [e.dataField as string]: e.value,
                                            }));
                                        }}
                                        labelLocation="top"
                                        colCount={3}
                                    >
                                        <SimpleItem dataField="validFrom" editorType="dxDateBox" editorOptions={{ type: 'date', displayFormat: 'yyyy-MM-dd', dateSerializationFormat: 'yyyy-MM-dd', openOnFieldClick: true }}>
                                            <Label text="Válida desde" />
                                        </SimpleItem>
                                        <SimpleItem dataField="validUntil" editorType="dxDateBox" editorOptions={{ type: 'date', displayFormat: 'yyyy-MM-dd', dateSerializationFormat: 'yyyy-MM-dd', openOnFieldClick: true, showClearButton: true }}>
                                            <Label text="Válida hasta" />
                                        </SimpleItem>
                                        <SimpleItem dataField="graceDays" editorType="dxNumberBox" editorOptions={{ min: 0, showSpinButtons: true }}>
                                            <Label text="Días de gracia" />
                                        </SimpleItem>
                                    </Form>
                                </SysAdminPanelBody>
                                <SysAdminPanelFooter>
                                    <Button
                                        text="Guardar vigencia"
                                        type="default"
                                        disabled={!canModify || saving}
                                        onClick={() => void handlePatchValidity()}
                                    />
                                </SysAdminPanelFooter>
                            </SysAdminPanel>
                        ) : null}

                        {!license && !showAssignForm ? (
                            <SysAdminPanel className="min-h-[280px] shrink-0">
                                <SysAdminEmptyState
                                    icon="lock"
                                    title="Sin licencia asignada"
                                    description="La compañía existe pero no tiene fila de licencia. Los usuarios normales quedan bajo candado total."
                                    action={
                                        canModify ? (
                                            <Button
                                                text="Asignar licencia"
                                                type="default"
                                                onClick={() => {
                                                    setFormData(emptyForm());
                                                    setShowAssignForm(true);
                                                }}
                                            />
                                        ) : null
                                    }
                                />
                            </SysAdminPanel>
                        ) : null}

                        {showPutForm ? (
                            <SysAdminPanel className="shrink-0">
                                <SysAdminPanelHeader
                                    title={license ? 'Asignar / reemplazar licencia' : 'Alta de licencia'}
                                    description="Crea fila active; la anterior active pasa a superseded. Sin campo status."
                                />
                                <SysAdminPanelBody>
                                    <Form
                                        ref={formRef}
                                        formData={formData}
                                        onFieldDataChanged={(e) => {
                                            if (!e.dataField) return;
                                            setFormData((prev) => {
                                                const next = { ...prev } as any;
                                                const path = String(e.dataField).split('.');
                                                if (path.length === 1) {
                                                    next[path[0]] = e.value;
                                                } else if (path.length === 2) {
                                                    next[path[0]] = { ...next[path[0]], [path[1]]: e.value };
                                                }
                                                return next;
                                            });
                                        }}
                                        labelLocation="top"
                                        colCount={2}
                                        disabled={!canModify}
                                    >
                                        <GroupItem colCount={2} colSpan={2} caption="Plan y vigencia">
                                            <SimpleItem
                                                dataField="plan"
                                                editorType="dxSelectBox"
                                                isRequired
                                                editorOptions={{
                                                    dataSource: LICENSE_PLANS,
                                                    displayExpr: 'name',
                                                    valueExpr: 'id',
                                                    searchEnabled: true,
                                                }}
                                            >
                                                <Label text="Plan" />
                                            </SimpleItem>
                                            <SimpleItem dataField="graceDays" editorType="dxNumberBox" editorOptions={{ min: 0, showSpinButtons: true }}>
                                                <Label text="Días de gracia" />
                                            </SimpleItem>
                                            <SimpleItem dataField="validFrom" editorType="dxDateBox" editorOptions={{ type: 'date', displayFormat: 'yyyy-MM-dd', dateSerializationFormat: 'yyyy-MM-dd', openOnFieldClick: true, showClearButton: true }}>
                                                <Label text="Válida desde (omitir = ya vigente)" />
                                            </SimpleItem>
                                            <SimpleItem dataField="validUntil" editorType="dxDateBox" editorOptions={{ type: 'date', displayFormat: 'yyyy-MM-dd', dateSerializationFormat: 'yyyy-MM-dd', openOnFieldClick: true, showClearButton: true }}>
                                                <Label text="Válida hasta (vacío = sin vencimiento)" />
                                            </SimpleItem>
                                        </GroupItem>

                                        <GroupItem colCount={2} colSpan={2} caption="Overrides de módulos">
                                            {PRODUCT_MODULES.map((mod) => (
                                                <SimpleItem
                                                    key={mod.id}
                                                    dataField={`moduleOverrides.${mod.id}`}
                                                    editorType="dxSelectBox"
                                                    editorOptions={{
                                                        dataSource: [
                                                            { id: null, name: 'Sin override' },
                                                            { id: true, name: 'Forzar ON' },
                                                            { id: false, name: 'Forzar OFF' },
                                                        ],
                                                        displayExpr: 'name',
                                                        valueExpr: 'id',
                                                    }}
                                                >
                                                    <Label text={mod.name} />
                                                </SimpleItem>
                                            ))}
                                        </GroupItem>

                                        <GroupItem colCount={3} colSpan={2} caption="Overrides de cuotas">
                                            {QUOTA_CODES.map((q) => (
                                                <SimpleItem
                                                    key={q.id}
                                                    dataField={`quotaOverrides.${q.id}`}
                                                    editorType="dxNumberBox"
                                                    editorOptions={{
                                                        min: 0,
                                                        showSpinButtons: true,
                                                        showClearButton: true,
                                                        placeholder: 'Sin override',
                                                    }}
                                                >
                                                    <Label text={q.name} />
                                                </SimpleItem>
                                            ))}
                                        </GroupItem>
                                    </Form>
                                </SysAdminPanelBody>
                                <SysAdminPanelFooter>
                                    {license && license.status !== 'revoked' ? (
                                        <Button
                                            text="Cancelar"
                                            stylingMode="text"
                                            disabled={saving}
                                            onClick={() => {
                                                setFormData(contractToForm(license));
                                                setShowAssignForm(false);
                                            }}
                                        />
                                    ) : null}
                                    <Button
                                        text={license ? 'Reemplazar licencia' : 'Asignar licencia'}
                                        type="default"
                                        disabled={!canModify || saving}
                                        onClick={() => void handleSavePut()}
                                    />
                                </SysAdminPanelFooter>
                            </SysAdminPanel>
                        ) : null}
                    </>
                )}
                </div>
            </div>
        </div>
    );
}

export default function LicensesClient() {
    return (
        <div className="h-full min-h-0 w-full">
            <Suspense fallback={<SysAdminLoadingState label="Cargando…" />}>
                <LicensesClientInner />
            </Suspense>
        </div>
    );
}
