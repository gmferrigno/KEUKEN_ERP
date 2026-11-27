'use client';

import { accountsService } from '@repo/erp-services/accountant/accounts.service';
import { IFAccountCreation, TFAccountStatus, TFAccountType } from "@repo/api-contracts/erp";
import { useAccounting } from '@/contexts/AccountingContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button, SelectBox } from '@repo/devextreme';
import { CheckBox } from 'devextreme-react/check-box';
import { Popup, ToolbarItem } from 'devextreme-react/popup';
import { TextBox } from 'devextreme-react/text-box';
import notify from 'devextreme/ui/notify';
import { useState } from 'react';
import { useAccountBreadcrumbs } from '../../hooks/useAccountBreadcrumbs';

interface AddNewAccountProps {
    isOpen: boolean;
    onClose: () => void;
    parentId: string | null;
}

const accountTypes = [
    { id: 'asset', name: 'Activo' },
    { id: 'liability', name: 'Pasivo' },
    { id: 'equity', name: 'Patrimonio' },
    { id: 'income', name: 'Ingreso' },
    { id: 'expense', name: 'Egreso' },
    { id: 'order', name: 'Orden' }
];

const accountStatuses = [
    { id: 'active', name: 'Activa' },
    { id: 'summary', name: 'Sumarizado' },
    { id: 'deprecated', name: 'Deprecada' }
];

export default function AddNewAccount({ isOpen, onClose, parentId }: AddNewAccountProps) {
    const { getAccountById, triggerRefresh } = useAccounting();
    const { token, currentCompany } = useAuth();

    const [inputCode, setInputCode] = useState('');
    const [name, setName] = useState('');
    const [type, setType] = useState<TFAccountType>('asset');
    const [reconcile, setReconcile] = useState(false);
    const [status, setStatus] = useState<TFAccountStatus>('active');
    const [loading, setLoading] = useState(false);

    const breadcrumbItems = useAccountBreadcrumbs(parentId);

    const parentAccount = parentId ? getAccountById(parentId) : null;
    const computedPath = parentAccount ? parentAccount.path : '';
    const computedCode = computedPath ? `${computedPath}.${inputCode}` : inputCode;
    const computedPathDisplay = ['Libro', ...breadcrumbItems.map(acc => acc.name)];

    const handleCreate = async () => {
        if (!inputCode || !name || !type || !status) {
            notify('Por favor complete todos los campos obligatorios', 'warning', 3000);
            return;
        }

        if (!token || !currentCompany) {
            notify('Error de autenticación', 'error', 3000);
            return;
        }

        setLoading(true);
        try {
            const data: IFAccountCreation = {
                code: computedCode,
                name,
                type,
                reconcile,
                path: computedPath,
                status
            };

            await accountsService.create(data, token, currentCompany.id);
            notify('Cuenta creada exitosamente', 'success', 3000);
            triggerRefresh();
            handleClose();
        } catch (error) {
            console.error(error);
            notify('Error al crear la cuenta', 'error', 3000);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setInputCode('');
        setName('');
        setType('asset');
        setReconcile(false);
        setStatus('active');
        onClose();
    };

    return (
        <Popup
            visible={isOpen}
            onHiding={handleClose}
            dragEnabled={false}
            hideOnOutsideClick={true}
            showTitle={true}
            title="Crear Nueva Cuenta"
            width={600}
            height="auto"
            className="rounded-dx"
        >
            <div className="flex flex-col gap-4 p-2">

                <div className="flex flex-col gap-2">
                    {computedPathDisplay.length > 0 ? (
                        <div className="text-xs text-main/50 flex items-center flex-wrap gap-y-1">
                            <i className='dx-icon-activefolder mr-1 shrink-0'></i>
                            {computedPathDisplay.map((item, index) => (
                                <div key={index} className="flex items-center shrink-0">
                                    <span className="font-bold text-main">{item}</span>
                                    <i className='dx-icon-chevronright text-[10px] mx-1'></i>
                                </div>
                            ))}
                            <span className="italic shrink-0">{name || "..."}</span>
                        </div>
                    ) : null}
                    <label className="text-sm font-medium text-main/80">Ubicación y Código de la Cuenta</label>
                    <nav className="flex justify-start items-center flex-wrap gap-y-2 gap-x-1 p-2 bg-primary-900 backdrop-blur-md border border-primary-500/10 rounded-dx">
                        <div className='flex items-center flex-wrap'>
                            <div className="flex items-center gap-2 transition-all">
                                <div className={`size-8 flex items-center justify-center rounded-dx border transition-all duration-300 ${breadcrumbItems.length === 0
                                    ? 'bg-focus-500 border-focus-500 shadow-xs shadow-black/20'
                                    : 'bg-primary-900/50 border-primary-500/20'
                                    }`}>
                                    <i className={`dx-icon-home text-base ${breadcrumbItems.length === 0 ? '!text-variant' : '!text-main'}`}></i>
                                </div>
                                <span className={`text-sm font-medium transition-colors ${breadcrumbItems.length === 0 ? 'text-focus-100' : ''
                                    }`}>
                                    Libro
                                </span>
                            </div>

                            {breadcrumbItems.map((account) => (
                                <div
                                    key={account.id}
                                    className="flex items-center gap-1 animate-in fade-in slide-in-from-left-4 duration-500"
                                >
                                    <div className="flex items-center justify-center w-6">
                                        <i className="dx-icon-chevronright text-[10px]"></i>
                                    </div>
                                    <div className="flex items-center px-0.5 py-1.5 rounded-dx transition-all duration-300 border bg-transparent border-transparent">
                                        <span className="text-xs font-bold whitespace-nowrap tracking-tight">
                                            {account.path.split('.').pop()}
                                        </span>
                                    </div>
                                </div>
                            ))}

                            <div className="flex items-center gap-1 ml-2">
                                {breadcrumbItems.length > 0 ? (
                                    <div className="flex items-center justify-center w-6">
                                        <i className="dx-icon-chevronright text-[10px]"></i>
                                    </div>
                                ) : null}
                                <TextBox
                                    value={inputCode}
                                    onValueChanged={(e) => setInputCode(e.value)}
                                    placeholder="Código"
                                    width={60}
                                    className="font-bold text-xs ml-1"
                                />
                            </div>
                        </div>
                    </nav>
                    {computedCode ? (
                        <p className="text-xs text-main/50 ml-1">Código final resultante: <span className="font-bold text-main">{computedCode}</span></p>
                    ) : null}
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-main/80">Nombre</label>
                    <TextBox
                        value={name}
                        onValueChanged={(e) => setName(e.value)}
                        placeholder="Nombre de la cuenta..."
                        width="100%"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-main/80">Tipo</label>
                        <SelectBox
                            items={accountTypes}
                            valueExpr="id"
                            displayExpr="name"
                            value={type}
                            onValueChanged={(e) => setType(e.value)}
                            width="100%"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-main/80">Estado</label>
                        <SelectBox
                            items={accountStatuses}
                            valueExpr="id"
                            displayExpr="name"
                            value={status}
                            onValueChanged={(e) => setStatus(e.value)}
                            width="100%"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                    <CheckBox
                        value={reconcile}
                        onValueChanged={(e) => setReconcile(e.value)}
                        text="Permite Conciliación"
                    />
                </div>

            </div>

            <ToolbarItem
                toolbar="bottom"
                location="after"
            >
                <Button
                    text="Cancelar"
                    type="normal"
                    stylingMode="outlined"
                    onClick={handleClose}
                    disabled={loading}
                />
            </ToolbarItem>
            <ToolbarItem
                toolbar="bottom"
                location="after"
            >
                <Button
                    text={loading ? "Guardando..." : "Guardar Cuenta"}
                    type="default"
                    stylingMode="contained"
                    onClick={handleCreate}
                    disabled={loading}
                    className="!text-variant"
                />
            </ToolbarItem>
        </Popup>
    );
}
