import { Form, SimpleItem, Label, GroupItem } from 'devextreme-react/form';
import { Button } from '@repo/devextreme';
import { ToolbarItem } from 'devextreme-react/popup';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usersService } from '@repo/erp-services/users.service';
import { TUserRole } from '@repo/api-contracts/erp';
import { getDefaultRoleOptions } from '@/app/lib/constants/users.constants';

interface UserModalProps {
    selectedUser: any;
    mode?: 'view' | 'create';
    onSave?: (data: any) => void;
    onCancel?: () => void;
    onEditPermissions?: () => void;
}

const UserModal = ({ selectedUser, mode = 'view', onSave, onCancel, onEditPermissions }: UserModalProps) => {
    const { token, currentCompany, isSuperAdmin } = useAuth();
    const formRef = useRef<any>(null);
    const [formData, setFormData] = useState<any>(() => ({
        role: 'user',
        ...(selectedUser ?? {})
    }));
    const [loading, setLoading] = useState(false);
    const [roleOptions, setRoleOptions] = useState<{ id: string; label: string }[]>(() =>
        getDefaultRoleOptions(false).map((r) => ({ id: String(r.id), label: r.label })),
    );

    useEffect(() => {
        setFormData({
            role: 'user',
            ...(selectedUser ?? {})
        });
    }, [selectedUser]);

    useEffect(() => {
        if (mode === 'create' && token) {
            const fallback = getDefaultRoleOptions(isSuperAdmin).map((r) => ({
                id: String(r.id),
                label: r.label,
            }));
            setRoleOptions(fallback);

            usersService.getRolesOptions(token)
                .then(res => {
                    if (res?.items && res.items.length > 0) {
                        const formatted = res.items.map(item => {
                            const code = (item.code || item.id) as TUserRole;
                            const defaultMatch = fallback.find(d => d.id === code)
                                || getDefaultRoleOptions(true).find(d => d.id === code);
                            return {
                                id: code,
                                label: defaultMatch ? defaultMatch.label : (item.label || code),
                            };
                        });
                        setRoleOptions(formatted);
                    }
                })
                .catch(err => {
                    console.warn('No se pudieron obtener roles para creación de usuario:', err);
                });
        }
    }, [mode, token, isSuperAdmin]);

    const handleSaveClick = async () => {
        const formInstance = formRef.current?.instance();
        const validation = formInstance?.validate();
        if (validation?.isValid) {
            setLoading(true);
            try {
                const currentData = formInstance?.option('formData') ?? {};
                await onSave?.(currentData);
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className={`w-full h-full flex flex-col gap-4 ${mode === 'create' ? 'p-4' : 'p-2'}`}>
            {mode === 'view' ? (
                <div className="relative flex items-center gap-4 p-4 rounded-dx bg-linear-to-r from-primary-900/60 to-primary-900/20 border border-primary-500/10 shadow-sm overflow-hidden mb-2">
                    {/* Accent line */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-focus-500/80"></div>

                    <div className="w-12 h-12 rounded-full bg-focus-100 flex items-center justify-center text-focus-500 text-xl font-bold border border-focus-300 shadow-sm shrink-0">
                        {selectedUser.name ? selectedUser.name[0].toUpperCase() : '?'}
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                        <h3 className="text-lg font-bold text-main truncate leading-tight">{selectedUser.name}</h3>
                        <p className="text-main/70 text-sm truncate">@{selectedUser.login}</p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm transition-all ${selectedUser.active
                            ? 'bg-focus-500/10 text-focus-400 border border-focus-500/20'
                            : 'bg-primary-500/15 text-main/60 border border-primary-500/10'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${selectedUser.active ? 'bg-focus-400 animate-pulse' : 'bg-main/40'}`}></span>
                            {selectedUser.active ? 'Activo' : 'Inactivo'}
                        </span>
                    </div>
                </div>
            ) : null}

                    <Form
                        ref={formRef}
                        formData={formData}
                        readOnly={mode === 'view'}
                        labelLocation="top"
                        onFieldDataChanged={(e) => {
                            setFormData((prev: any) => ({ ...prev, [e.dataField as string]: e.value }));
                        }}
                    >
                        <GroupItem colCount={2}>
                            {mode === 'view' ? (
                                <SimpleItem dataField="id" editorOptions={{ stylingMode: 'filled' }}>
                                    <Label text="ID" />
                                </SimpleItem>
                            ) : null}
                            <SimpleItem
                                dataField="name"
                                editorType="dxTextBox"
                                editorOptions={{
                                    stylingMode: 'filled',
                                    valueChangeEvent: "blur"
                                }}
                                visible={mode === 'create'}
                                isRequired={mode === 'create'}
                                validationRules={[{ type: 'required', message: "El nombre es obligatorio" }]}
                            >
                                    <Label text="Nombre Completo" />
                            </SimpleItem>

                            <SimpleItem
                                dataField="login"
                                editorType="dxTextBox"
                                editorOptions={{
                                    stylingMode: 'filled',
                                    valueChangeEvent: "blur"
                                }}
                                isRequired={mode === 'create'}
                                validationRules={[{ type: 'required', message: "El usuario es obligatorio" }]}
                            >
                                <Label text="Usuario (Login)" />
                            </SimpleItem>

                            <SimpleItem
                                dataField="password"
                                editorType="dxTextBox"
                                editorOptions={{
                                    stylingMode: 'filled',
                                    mode: 'password',
                                    valueChangeEvent: "blur"
                                }}
                                visible={mode === 'create'}
                                isRequired={mode === 'create'}
                                validationRules={[{ type: 'required', message: "La contraseña es obligatoria" }]}
                            >
                                <Label text="Contraseña" />
                            </SimpleItem>

                            {mode === 'create' ? (
                                <SimpleItem
                                    dataField="role"
                                    editorType="dxSelectBox"
                                    editorOptions={{
                                        items: roleOptions,
                                        valueExpr: "id",
                                        displayExpr: "label",
                                        placeholder: "Seleccione un rol...",
                                        stylingMode: 'filled',
                                    }}
                                    isRequired={true}
                                    validationRules={[{ type: 'required', message: "El rol inicial es obligatorio" }]}
                                >
                                    <Label text="Rol Inicial (Empresa)" />
                                </SimpleItem>
                            ) : null}

                                    {mode === 'view' ? (
                                        <SimpleItem
                                            label={{ text: `Rol en ${currentCompany?.name || 'Empresa Actual'}` }}
                                            editorOptions={{ stylingMode: 'filled' }}
                                            render={() => {
                                                const currentAssignment = selectedUser.roleAssignments?.find((ra: any) => ra.companyId === currentCompany?.id);
                                                const currentRole = currentAssignment?.roles?.join(', ') || 'user (por defecto)';
                                                return (
                                                    <div className="flex flex-col">
                                                        <div className="dx-field-item-content dx-texteditor-read-only">
                                                            <span className="font-semibold text-focus-400">{currentRole}</span>
                                                        </div>
                                                    </div>
                                                );
                                            }}
                                        />
                                    ) : null}

                    {mode === 'view' ? (
                                                <SimpleItem
                                                    label={{ text: "Roles Asignados" }}
                                                    editorOptions={{ stylingMode: 'filled' }}
                                                    render={() => (
                                                        <div className="flex flex-col">
                                                            <div className="dx-field-item-content dx-texteditor-read-only">
                                                                <span className="font-medium text-main">{selectedUser.roles?.length ? selectedUser.roles.join(', ') : 'Ninguno'}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                />
                                            ) : null}

                                                    {mode === 'view' ? (
                                                        <SimpleItem
                                                            label={{ text: "Asignaciones" }}
                                                            editorOptions={{ stylingMode: 'filled' }}
                                                            render={() => (
                                                                <div className="flex flex-col">
                                                                    <div className="dx-field-item-content dx-texteditor-read-only">
                                                                        <span className="font-medium text-main">{selectedUser.roleAssignments?.length ? `${selectedUser.roleAssignments.length} asignaciones de empresa` : '0'}</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        />
                                                    ) : null}
                </GroupItem>
            </Form >

{/* View Mode Footer Buttons */ }
{
    mode === 'view' && onEditPermissions ? (
        <div className="flex justify-end gap-2 pt-2 border-t border-main/10">
            <Button
                text="Configurar Rol y Permisos"
                icon="key"
                type="default"
                stylingMode="outlined"
                onClick={onEditPermissions}
                className="!rounded-dx"
            />
        </div>
    ) : null
}

{/* Toolbar Buttons for Create Mode */ }
{
    mode === 'create' ? (
        <>
            <ToolbarItem toolbar="bottom" location="after">
                <Button
                    text="Cancelar"
                    onClick={onCancel}
                    disabled={loading}
                    stylingMode="text"
                    className="rounded-dx! bg-main/10!"
                />
            </ToolbarItem>
            <ToolbarItem toolbar="bottom" location="after">
                <Button
                    text="Guardar"
                    type="default"
                    stylingMode="contained"
                    onClick={handleSaveClick}
                    disabled={loading}
                    className="!bg-focus-300 !rounded-dx shadow-lg shadow-black/20 !text-variant"
                />
            </ToolbarItem>
        </>
    ) : null
}
        </div >
    );
};

export default UserModal;
