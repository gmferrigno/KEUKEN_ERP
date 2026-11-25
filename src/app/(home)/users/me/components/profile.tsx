'use client';

import { mapUsersAbmError } from '@/app/lib/constants/users.constants';
import { useAuth } from '@/contexts/AuthContext';
import { hasScope } from '@repo/access';
import { Button } from '@repo/devextreme';
import { usersService } from '@repo/erp-services/users.service';
import type { ITextBoxOptions } from 'devextreme-react/cjs/text-box';
import Form, {
    type FormRef,
    CompareRule,
    GroupItem,
    Label,
    RequiredRule,
    SimpleItem,
    StringLengthRule,
} from 'devextreme-react/form';
import ScrollView from 'devextreme-react/scroll-view';
import notify from 'devextreme/ui/notify';
import Validator from 'devextreme/ui/validator';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

const E164_PATTERN = /^\+[1-9]\d{6,14}$/;

export default function Profile() {
    const {
        user,
        profileContext,
        companies,
        currentCompany,
        changePassword,
        isSuperAdmin,
        effectiveScopes,
        token,
        refreshProfileContext,
    } = useAuth();

    const profileFormRef = useRef<FormRef>(null);
    const passwordFormRef = useRef<FormRef>(null);
    const [savingPassword, setSavingPassword] = useState(false);
    const [savingPhone, setSavingPhone] = useState(false);
    const [editingPhone, setEditingPhone] = useState(false);

    const passwordFormData = useRef({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    // Contrato: no hay PATCH self /auth/me — phone solo con users:abm:write (o SA).
    const canEditPhone =
        isSuperAdmin || hasScope(effectiveScopes, 'users:abm:write');

    const userId = profileContext?.id ?? user?.id;
    const displayName = profileContext?.name ?? user?.name ?? '';
    const displayLogin = profileContext?.login ?? user?.login ?? '';
    const storedPhone = profileContext?.phoneE164?.trim() || '';

    const profileFormData = useRef({
        name: displayName,
        login: displayLogin,
        phoneE164: storedPhone,
        roles: '',
        companies: '',
    });

    const displayRoles = useMemo(() => {
        const roles = profileContext?.rolesEffective?.length
            ? profileContext.rolesEffective
            : user?.roles || [];
        return roles.length ? roles.join(', ') : '—';
    }, [profileContext?.rolesEffective, user?.roles]);

    const displayCompanies = useMemo(() => {
        const fromMe = profileContext?.companies?.length
            ? profileContext.companies.map((c) => c.name)
            : companies.map((c) => c.name);
        if (!fromMe.length) return '—';
        const currentName = currentCompany?.name;
        if (currentName && fromMe.includes(currentName)) {
            return fromMe
                .map((name) => (name === currentName ? `${name} (actual)` : name))
                .join(', ');
        }
        return fromMe.join(', ');
    }, [profileContext?.companies, companies, currentCompany?.name]);

    useEffect(() => {
        profileFormData.current.name = displayName;
        profileFormData.current.login = displayLogin;
        profileFormData.current.phoneE164 = storedPhone;
        profileFormData.current.roles = displayRoles;
        profileFormData.current.companies = displayCompanies;
        const form = profileFormRef.current?.instance();
        if (form) {
            form.option('formData', { ...profileFormData.current });
        }
    }, [displayName, displayLogin, storedPhone, displayRoles, displayCompanies]);

    const initials = displayName
        ? displayName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()
        : '?';

    const changePasswordMode = useCallback((name: string): void => {
        const editor = passwordFormRef.current?.instance().getEditor(name);
        editor?.option(
            'mode',
            editor?.option('mode') === 'text' ? 'password' : 'text'
        );
    }, []);

    const getPasswordOptions = useCallback(
        (fieldName: string, autocomplete: string): ITextBoxOptions => ({
            mode: 'password',
            valueChangeEvent: 'keyup blur change',
            stylingMode: 'filled',
            placeholder: '********',
            elementAttr: {
                name: fieldName,
                autocomplete,
                class: '!bg-main/5 !rounded-dx',
            },
            buttons: [
                {
                    name: 'password',
                    location: 'after',
                    options: {
                        stylingMode: 'text',
                        icon: 'eyeopen',
                        onClick: (): void => changePasswordMode(fieldName),
                    },
                },
            ],
        }),
        [changePasswordMode]
    );

    const newPasswordComparisonTarget = useCallback(
        () => passwordFormData.current.newPassword,
        []
    );

    /** CompareRule solo corre al validar confirm; hay que revalidarlo si cambia newPassword. */
    const revalidateConfirmPassword = useCallback(() => {
        const editor = passwordFormRef.current
            ?.instance()
            .getEditor('confirmPassword');
        if (!editor) return;
        const validator = Validator.getInstance(editor.element()) as
            | { validate: () => void }
            | undefined;
        validator?.validate();
    }, []);

    const handlePasswordFieldDataChanged = useCallback(
        (e: { dataField?: string }) => {
            if (e.dataField === 'newPassword') {
                revalidateConfirmPassword();
            }
        },
        [revalidateConfirmPassword]
    );

    const handleStartEditPhone = useCallback(() => {
        profileFormData.current.phoneE164 = storedPhone;
        profileFormRef.current
            ?.instance()
            .getEditor('phoneE164')
            ?.option('value', storedPhone);
        setEditingPhone(true);
    }, [storedPhone]);

    const handleCancelEditPhone = useCallback(() => {
        profileFormData.current.phoneE164 = storedPhone;
        profileFormRef.current
            ?.instance()
            .getEditor('phoneE164')
            ?.option('value', storedPhone);
        setEditingPhone(false);
    }, [storedPhone]);

    const handleSavePhone = useCallback(async (): Promise<void> => {
        if (!canEditPhone || !userId || !token) return;

        const raw = String(profileFormData.current.phoneE164 ?? '').trim();
        if (raw && !E164_PATTERN.test(raw)) {
            notify(
                'Usá formato E.164 (ej. +5491112345678) o dejalo vacío para limpiar',
                'error',
                4000
            );
            return;
        }

        setSavingPhone(true);
        try {
            await usersService.update(userId, { phoneE164: raw || '' }, token);
            await refreshProfileContext(currentCompany?.id);
            notify('Teléfono actualizado', 'success', 3000);
            setEditingPhone(false);
        } catch (error: unknown) {
            notify(mapUsersAbmError(error, 'No se pudo actualizar el teléfono'), 'error', 4000);
        } finally {
            setSavingPhone(false);
        }
    }, [canEditPhone, userId, token, refreshProfileContext, currentCompany?.id]);

    const handleChangePassword = useCallback(
        async (e?: FormEvent): Promise<void> => {
            if (e) e.preventDefault();

            const result = passwordFormRef.current?.instance().validate();
            if (!result?.isValid) {
                notify('Completá todos los campos correctamente', 'error', 3000);
                return;
            }

            const { currentPassword, newPassword, confirmPassword } =
                passwordFormData.current;

            if (newPassword !== confirmPassword) {
                notify('Las contraseñas no coinciden', 'error', 3000);
                return;
            }
            if (currentPassword === newPassword) {
                notify('La nueva contraseña debe ser distinta a la actual', 'error', 3000);
                return;
            }

            setSavingPassword(true);
            try {
                await changePassword(currentPassword, newPassword);
                passwordFormData.current.currentPassword = '';
                passwordFormData.current.newPassword = '';
                passwordFormData.current.confirmPassword = '';
                // resetValues() was removed in DX 25 — use clear()
                passwordFormRef.current?.instance().clear();
                notify('Contraseña actualizada', 'success', 3000);
            } catch (error: any) {
                notify(
                    error?.message || 'No se pudo cambiar la contraseña',
                    'error',
                    4000
                );
            } finally {
                setSavingPassword(false);
            }
        },
        [changePassword]
    );

    if (!user && !profileContext) return null;

    const phoneReadOnly = !canEditPhone || !editingPhone;
    const phoneDisplayValue = phoneReadOnly && !storedPhone ? '—' : storedPhone;

    return (
        <ScrollView className="w-full h-full overflow-hidden" showScrollbar="always">
            <div className="w-full h-full grid grid-cols-1 gap-4 max-w-6xl mx-auto">
                <div className="bg-primary-500 rounded-dx shadow-sm p-8 flex flex-col md:flex-row items-center gap-10">
                    <div className="shrink-0">
                        <div className="w-40 h-40 rounded-full bg-linear-to-tr from-focus-100 to-focus-500 flex items-center justify-center text-5xl font-extrabold shadow-xl ring-4 ring-primary-900">
                            {initials}
                        </div>
                    </div>

                    <div className="flex-1 w-full">
                        <Form
                            ref={profileFormRef}
                            formData={profileFormData.current}
                            readOnly={false}
                            labelLocation="top"
                            onFieldDataChanged={(e) => {
                                if (e.dataField === 'phoneE164') {
                                    profileFormData.current.phoneE164 = String(
                                        e.value ?? ''
                                    );
                                }
                            }}
                        >
                            <GroupItem colCount={2}>
                                <SimpleItem
                                    dataField="name"
                                    editorOptions={{
                                        stylingMode: 'filled',
                                        readOnly: true,
                                    }}
                                >
                                    <Label text="Nombre Completo" />
                                </SimpleItem>
                                <SimpleItem
                                    dataField="login"
                                    editorOptions={{
                                        stylingMode: 'filled',
                                        readOnly: true,
                                    }}
                                >
                                    <Label text="Email" />
                                </SimpleItem>
                                <SimpleItem
                                    dataField="phoneE164"
                                    editorOptions={{
                                        stylingMode: 'filled',
                                        readOnly: phoneReadOnly,
                                        value: phoneDisplayValue,
                                        placeholder: '+54911...',
                                        valueChangeEvent: 'keyup blur change',
                                    }}
                                >
                                    <Label text="Teléfono" />
                                </SimpleItem>
                                <SimpleItem
                                    dataField="roles"
                                    editorOptions={{
                                        stylingMode: 'filled',
                                        readOnly: true,
                                    }}
                                >
                                    <Label text="Roles" />
                                </SimpleItem>
                                <SimpleItem
                                    dataField="companies"
                                    colSpan={2}
                                    editorOptions={{
                                        stylingMode: 'filled',
                                        readOnly: true,
                                    }}
                                >
                                    <Label text="Compañías" />
                                </SimpleItem>
                            </GroupItem>
                        </Form>

                        {canEditPhone ? (
                            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                                {!editingPhone ? (
                                    <Button
                                        text="Editar teléfono"
                                        icon="edit"
                                        type="normal"
                                        stylingMode="outlined"
                                        height={36}
                                        onClick={handleStartEditPhone}
                                        className="rounded-dx!"
                                    />
                                ) : (
                                    <>
                                        <Button
                                            text="Cancelar"
                                            stylingMode="text"
                                            height={36}
                                            disabled={savingPhone}
                                            onClick={handleCancelEditPhone}
                                            className="rounded-dx!"
                                        />
                                        <Button
                                            text={
                                                savingPhone
                                                    ? 'Guardando...'
                                                    : 'Guardar teléfono'
                                            }
                                            type="default"
                                            stylingMode="contained"
                                            height={36}
                                            disabled={savingPhone}
                                            onClick={() => void handleSavePhone()}
                                            className="bg-focus-300! rounded-dx! text-variant!"
                                        />
                                    </>
                                )}
                            </div>
                        ) : (
                            <p className="mt-3 text-[11px] text-main/45">
                                El teléfono solo lo puede editar quien tenga permiso de ABM de
                                usuarios.
                            </p>
                        )}
                    </div>
                </div>

                <div className="bg-primary-500/80 rounded-dx border border-main/10 shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <i className="dx-icon dx-icon-key text-focus-300 text-lg" />
                        <h2 className="text-base font-semibold text-main">
                            Cambiar contraseña
                        </h2>
                    </div>

                    <form onSubmit={handleChangePassword}>
                        <Form
                            ref={passwordFormRef}
                            formData={passwordFormData.current}
                            labelLocation="top"
                            colCount={1}
                            onFieldDataChanged={handlePasswordFieldDataChanged}
                        >
                            <GroupItem>
                                <SimpleItem
                                    dataField="currentPassword"
                                    label={{ text: 'Contraseña actual' }}
                                    editorType="dxTextBox"
                                    editorOptions={getPasswordOptions(
                                        'currentPassword',
                                        'current-password'
                                    )}
                                >
                                    <RequiredRule message="La contraseña actual es requerida" />
                                </SimpleItem>
                                <SimpleItem
                                    dataField="newPassword"
                                    label={{ text: 'Nueva contraseña' }}
                                    editorType="dxTextBox"
                                    editorOptions={getPasswordOptions(
                                        'newPassword',
                                        'new-password'
                                    )}
                                >
                                    <RequiredRule message="La nueva contraseña es requerida" />
                                    <StringLengthRule
                                        min={8}
                                        message="La nueva contraseña debe tener al menos 8 caracteres"
                                    />
                                </SimpleItem>
                                <SimpleItem
                                    dataField="confirmPassword"
                                    label={{ text: 'Confirmar nueva contraseña' }}
                                    editorType="dxTextBox"
                                    editorOptions={getPasswordOptions(
                                        'confirmPassword',
                                        'new-password'
                                    )}
                                >
                                    <RequiredRule message="Debes confirmar la nueva contraseña" />
                                    <CompareRule
                                        message="Las contraseñas no coinciden"
                                        comparisonTarget={newPasswordComparisonTarget}
                                        ignoreEmptyValue
                                    />
                                </SimpleItem>
                            </GroupItem>
                        </Form>

                        <div className="mt-4 flex justify-end">
                            <Button
                                type="default"
                                stylingMode="contained"
                                useSubmitBehavior={true}
                                disabled={savingPassword}
                                height={36}
                                className="bg-focus-300! rounded-dx! shadow-r-lg"
                            >
                                <div className="flex items-center justify-center gap-2 px-2">
                                    {savingPassword && (
                                        <i className="dx-icon-refresh dx-icon-spin text-sm text-variant" />
                                    )}
                                    <p className="text-sm font-medium text-variant!">
                                        {savingPassword
                                            ? 'Guardando...'
                                            : 'Actualizar contraseña'}
                                    </p>
                                </div>
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </ScrollView>
    );
}
