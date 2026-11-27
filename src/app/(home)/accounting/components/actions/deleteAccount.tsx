'use client';

import { accountsService } from '@repo/erp-services/accountant/accounts.service';
import { useAccounting } from '@/contexts/AccountingContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@repo/devextreme';
import { Popup } from 'devextreme-react/popup';
import { TextBox } from 'devextreme-react/text-box';
import { ToolbarItem } from 'devextreme-react/popup';
import { Position } from 'devextreme-react/popup';
import notify from 'devextreme/ui/notify';
import { useMemo, useState } from 'react';

interface DeleteAccountProps {
    isOpen: boolean;
    onClose: () => void;
    accountId: string | null;
}

export default function DeleteAccount({ isOpen, onClose, accountId }: DeleteAccountProps) {
    const { getAccountById, triggerRefresh, setSelectedAccount } = useAccounting();
    const { token, currentCompany } = useAuth();

    const [confirmName, setConfirmName] = useState('');
    const [loading, setLoading] = useState(false);

    const account = useMemo(
        () => (accountId ? getAccountById(accountId) : null),
        [accountId, getAccountById]
    );

    const isNameMatch = confirmName.trim() === account?.name?.trim();

    const handleClose = () => {
        setConfirmName('');
        onClose();
    };

    const handleDelete = async () => {
        if (!isNameMatch) {
            notify('El nombre ingresado no coincide con el de la cuenta', 'warning', 3000);
            return;
        }
        if (!token || !currentCompany || !accountId) {
            notify('Error de autenticación o cuenta inválida', 'error', 3000);
            return;
        }

        setLoading(true);
        try {
            await accountsService.delete(accountId, token, currentCompany.id);
            notify('Cuenta eliminada exitosamente', 'success', 3000);
            setSelectedAccount(null);
            triggerRefresh();
            handleClose();
        } catch (error) {
            console.error(error);
            notify('Error al eliminar la cuenta', 'error', 3000);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Popup
            visible={isOpen}
            onHiding={handleClose}
            dragEnabled={false}
            hideOnOutsideClick={!loading}
            showCloseButton={true}
            showTitle={true}
            title="Eliminar Cuenta"
            width={480}
            height="auto"
            className="rounded-dx"
            onShown={(e) => { e.component.repaint(); }}
        >
            <Position at="center" my="center" />

            <div className="p-4 flex flex-col gap-5">
                {}
                <div className="flex items-start gap-3 p-3 rounded-dx border border-red-500/30 bg-red-500/10">
                    <i className="dx-icon-warning text-red-400 text-xl mt-0.5 shrink-0" />
                    <div className="flex flex-col gap-1">
                        <p className="text-sm font-semibold text-red-300">Esta acción es irreversible</p>
                        <p className="text-xs text-main/60">
                            Se eliminará permanentemente la cuenta{' '}
                            <span className="font-semibold text-main/80">{account?.name}</span>.
                            Esta operación no se puede deshacer.
                        </p>
                    </div>
                </div>

                {}
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-main/80">
                        Para confirmar, escribí el nombre de la cuenta:
                    </label>
                    <TextBox
                        value={confirmName}
                        onValueChanged={(e) => setConfirmName(e.value)}
                        placeholder="Escribí el nombre exacto..."
                        stylingMode="filled"
                        valueChangeEvent="input"
                    />
                    {confirmName.length > 0 && !isNameMatch && (
                        <p className="text-xs text-focus-300 flex items-center gap-1">
                            <i className="dx-icon-close text-xs" /> El nombre no coincide
                        </p>
                    )}
                    {isNameMatch && (
                        <p className="text-xs text-focus-300 flex items-center gap-1">
                            <i className="dx-icon-check text-xs" /> Nombre verificado
                        </p>
                    )}
                </div>
            </div>

            <ToolbarItem toolbar="bottom" location="before">
                <Button
                    text="Cancelar"
                    stylingMode="text"
                    className="rounded-dx! bg-main/10!"
                    onClick={handleClose}
                    disabled={loading}
                />
            </ToolbarItem>

            <ToolbarItem toolbar="bottom" location="after">
                <Button
                    type="danger"
                    stylingMode="contained"
                    disabled={!isNameMatch || loading}
                    onClick={handleDelete}
                    className="shadow-lg shadow-black/20"
                >
                    <div className="flex items-center justify-center gap-2">
                        {loading
                            ? <i className="dx-icon-refresh text-sm animate-spin text-variant" />
                            : <i className="dx-icon-trash text-sm text-variant" />
                        }
                        <p className="text-sm text-variant!">
                            {loading ? 'Eliminando...' : 'Eliminar Cuenta'}
                        </p>
                    </div>
                </Button>
            </ToolbarItem>
        </Popup>
    );
}
