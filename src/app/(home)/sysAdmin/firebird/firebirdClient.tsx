'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Form, { GroupItem, SimpleItem, Label } from 'devextreme-react/form';
import { Button, GenericSelectBox } from '@repo/devextreme';
import { custom } from 'devextreme/ui/dialog';
import notify from 'devextreme/ui/notify';
import { IFFirebirdConfig, IFFirebirdPutRequest } from '@repo/api-contracts/erp';
import { firebirdCompanyService } from '@repo/erp-services/userContext/firebirdCompany.service';
import { canDo } from '@repo/access';
import PERMISSIONS_CONSTANTS from '@repo/access';
import { useAuth } from '@/contexts/AuthContext';
import SectionHeader from '../../components/section/sectionHeader';
import {
    SysAdminBadge,
    SysAdminEmptyState,
    SysAdminInlineCode,
    SysAdminLoadingState,
    SysAdminPanel,
    SysAdminPanelBody,
    SysAdminPanelHeader,
    SysAdminToolbar,
} from '../components/sysAdminChrome';
import { useCompaniesList } from '../components/useCompaniesList';
import { useCompanyQueryParam } from '../components/useCompanyQueryParam';
import { FIREBIRD_CHARSETS } from '../lib/constants';

type FirebirdFormState = {
    fdbDsn: string | null;
    fdbHost: string | null;
    fdbPath: string | null;
    fdbUser: string | null;
    fdbCharset: string | null;
    fdbPassword: string;
};

const emptyForm = (): FirebirdFormState => ({
    fdbDsn: null,
    fdbHost: null,
    fdbPath: null,
    fdbUser: null,
    fdbCharset: 'WIN1252',
    fdbPassword: '',
});

function configToForm(config: IFFirebirdConfig | null): FirebirdFormState {
    if (!config) return emptyForm();
    return {
        fdbDsn: config.fdbDsn,
        fdbHost: config.fdbHost,
        fdbPath: config.fdbPath,
        fdbUser: config.fdbUser,
        fdbCharset: config.fdbCharset,
        fdbPassword: '',
    };
}

function FirebirdClientInner() {
    const { token, permissions, isSuperAdmin } = useAuth();
    const { companies, loading: loadingCompanies } = useCompaniesList();
    const { companyId, setCompanyId } = useCompanyQueryParam();

    const formRef = useRef<any>(null);
    const [config, setConfig] = useState<IFFirebirdConfig | null>(null);
    const [formData, setFormData] = useState<FirebirdFormState>(emptyForm);
    const [loadingConfig, setLoadingConfig] = useState(false);
    const [saving, setSaving] = useState(false);
    const [passwordDirty, setPasswordDirty] = useState(false);

    const canModify = useMemo(() => {
        return Boolean(isSuperAdmin || (permissions && canDo('modify', PERMISSIONS_CONSTANTS.modifySysAdmin, permissions)));
    }, [isSuperAdmin, permissions]);

    const changePasswordMode = useCallback(() => {
        const editor = formRef.current?.instance()?.getEditor('fdbPassword');
        if (!editor) return;
        const nextMode = editor.option('mode') === 'text' ? 'password' : 'text';
        editor.option('mode', nextMode);
        editor.getButton('password')?.option('icon', nextMode === 'text' ? 'eyeclose' : 'eyeopen');
    }, []);

    const passwordEditorOptions = useMemo(
        () => ({
            mode: 'password' as const,
            stylingMode: 'filled' as const,
            placeholder: config?.fdbPasswordSet
                ? '•••••••• (dejar vacío para no cambiar)'
                : 'Nuevo password',
            buttons: [
                {
                    name: 'password',
                    location: 'after' as const,
                    options: {
                        stylingMode: 'text' as const,
                        icon: 'eyeopen',
                        onClick: changePasswordMode,
                    },
                },
            ],
        }),
        [changePasswordMode, config?.fdbPasswordSet]
    );

    const loadConfig = useCallback(async (id: string) => {
        if (!token) return;
        setLoadingConfig(true);
        try {
            const data = await firebirdCompanyService.getCompanyFirebird(id, token);
            setConfig(data);
            setFormData(configToForm(data));
            setPasswordDirty(false);
        } catch (err: any) {
            console.error(err);
            notify(err?.message || 'Error al obtener Firebird', 'error', 3500);
            setConfig(null);
            setFormData(emptyForm());
        } finally {
            setLoadingConfig(false);
        }
    }, [token]);

    useEffect(() => {
        if (companyId) {
            void loadConfig(companyId);
        } else {
            setConfig(null);
            setFormData(emptyForm());
            setPasswordDirty(false);
        }
    }, [companyId, loadConfig]);

    const buildPutBody = (current: FirebirdFormState, options?: { clearPassword?: boolean; clearAll?: boolean }): IFFirebirdPutRequest => {
        if (options?.clearAll) {
            return {
                fdbDsn: null,
                fdbHost: null,
                fdbPath: null,
                fdbUser: null,
                fdbCharset: null,
                fdbPassword: null,
            };
        }

        const body: IFFirebirdPutRequest = {
            fdbDsn: current.fdbDsn || null,
            fdbHost: current.fdbHost || null,
            fdbPath: current.fdbPath || null,
            fdbUser: current.fdbUser || null,
            fdbCharset: current.fdbCharset || null,
        };

        if (options?.clearPassword) {
            body.fdbPassword = null;
        } else if (passwordDirty && current.fdbPassword) {
            body.fdbPassword = current.fdbPassword;
        }

        return body;
    };

    const persist = async (body: IFFirebirdPutRequest, successMsg: string) => {
        if (!token || !companyId || !canModify) return;
        setSaving(true);
        try {
            const updated = await firebirdCompanyService.putCompanyFirebird(companyId, body, token);
            setConfig(updated);
            setFormData(configToForm(updated));
            setPasswordDirty(false);
            notify(successMsg, 'success', 2500);
        } catch (err: any) {
            console.error(err);
            notify(err?.message || 'No se pudo guardar Firebird', 'error', 4000);
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async () => {
        const formInstance = formRef.current?.instance();
        const current = (formInstance?.option('formData') as FirebirdFormState) || formData;
        await persist(buildPutBody(current), 'Configuración Firebird guardada');
    };

    const handleClearPassword = async () => {
        const result = await custom({
            title: 'Limpiar password',
            messageHtml: '¿Eliminar el password Firebird configurado para esta compañía?',
            buttons: [
                { text: 'Cancelar', onClick: () => false },
                { text: 'Limpiar', onClick: () => true },
            ],
        }).show();
        if (!result) return;

        const formInstance = formRef.current?.instance();
        const current = (formInstance?.option('formData') as FirebirdFormState) || formData;
        await persist(buildPutBody(current, { clearPassword: true }), 'Password Firebird eliminado');
    };

    const handleClearAll = async () => {
        const result = await custom({
            title: 'Vaciar configuración',
            messageHtml: '¿Poner en null todos los campos Firebird (incl. password)? Sin credenciales fallan syncs / API legacy.',
            buttons: [
                { text: 'Cancelar', onClick: () => false },
                { text: 'Vaciar', onClick: () => true },
            ],
        }).show();
        if (!result) return;

        await persist(buildPutBody(formData, { clearAll: true }), 'Configuración Firebird vaciada');
    };

    return (
        <div className="flex flex-col w-full h-full gap-y-3 overflow-hidden">
            <SectionHeader title="SysAdmin · Firebird" />

            <SysAdminToolbar>
                <div className="flex flex-col gap-1 w-full min-w-[280px] max-w-md grow sm:grow-0">
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
                </div>
                {companyId && !loadingConfig && config ? (
                    <div className="pb-1 flex items-center min-h-9">
                        <SysAdminBadge
                            label={config.fdbPasswordSet ? 'Password configurado' : 'Sin password'}
                            tone={config.fdbPasswordSet ? 'ok' : 'neutral'}
                        />
                    </div>
                ) : null}
            </SysAdminToolbar>

            <div className="flex-1 min-h-0 overflow-auto">
                <SysAdminPanel className="h-full min-h-[320px] max-w-4xl">
                    {!companyId ? (
                        <SysAdminEmptyState
                            icon="fields"
                            title="Seleccioná una compañía"
                            description="Credenciales Firebird por compañía (syncs + API legacy). El password nunca vuelve en claro desde la API."
                        />
                    ) : loadingConfig ? (
                        <SysAdminLoadingState label="Cargando Firebird…" />
                    ) : (
                        <>
                            <SysAdminPanelHeader
                                title="Configuración Firebird"
                            />
                            <SysAdminPanelBody>
                                <Form
                                    ref={formRef}
                                    formData={formData}
                                    onFieldDataChanged={(e) => {
                                        if (!e.dataField) return;
                                        setFormData((prev) => ({ ...prev, [e.dataField as string]: e.value }));
                                        if (e.dataField === 'fdbPassword') {
                                            setPasswordDirty(Boolean(e.value));
                                        }
                                    }}
                                    labelLocation="top"
                                    colCount={2}
                                    disabled={!canModify}
                                >
                                    <GroupItem colCount={2} colSpan={2} caption="Conexión">
                                        <SimpleItem dataField="fdbDsn" colSpan={2} editorOptions={{ placeholder: 'host:/path/db.fdb' }}>
                                            <Label text="DSN (alternativa a host+path)" />
                                        </SimpleItem>
                                        <SimpleItem dataField="fdbHost" editorOptions={{ placeholder: 'hostname' }}>
                                            <Label text="Host" />
                                        </SimpleItem>
                                        <SimpleItem dataField="fdbPath" editorOptions={{ placeholder: '/path/db.fdb' }}>
                                            <Label text="Path" />
                                        </SimpleItem>
                                        <SimpleItem dataField="fdbUser">
                                            <Label text="Usuario" />
                                        </SimpleItem>
                                        <SimpleItem
                                            dataField="fdbCharset"
                                            editorType="dxSelectBox"
                                            editorOptions={{
                                                dataSource: FIREBIRD_CHARSETS,
                                                displayExpr: 'name',
                                                valueExpr: 'id',
                                                searchEnabled: true,
                                                showClearButton: true,
                                            }}
                                        >
                                            <Label text="Charset" />
                                        </SimpleItem>
                                        <SimpleItem
                                            dataField="fdbPassword"
                                            editorType="dxTextBox"
                                            editorOptions={passwordEditorOptions}
                                        >
                                            <Label text="Password" />
                                        </SimpleItem>
                                    </GroupItem>
                                </Form>

                                <div className="mt-4 flex flex-wrap justify-end gap-2">
                                    <Button
                                        text="Vaciar config"
                                        stylingMode="outlined"
                                        type="danger"
                                        disabled={!canModify || saving}
                                        onClick={() => void handleClearAll()}
                                    />
                                    <Button
                                        text="Limpiar password"
                                        stylingMode="outlined"
                                        disabled={!canModify || saving || !config?.fdbPasswordSet}
                                        onClick={() => void handleClearPassword()}
                                    />
                                    <Button
                                        text="Guardar"
                                        type="default"
                                        disabled={!canModify || saving}
                                        onClick={() => void handleSave()}
                                    />
                                </div>
                            </SysAdminPanelBody>
                        </>
                    )}
                </SysAdminPanel>
            </div>
        </div>
    );
}

export default function FirebirdClient() {
    return (
        <Suspense fallback={<SysAdminLoadingState label="Cargando…" />}>
            <FirebirdClientInner />
        </Suspense>
    );
}
