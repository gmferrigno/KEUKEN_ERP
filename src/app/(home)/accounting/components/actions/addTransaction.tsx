'use client';

import { journalsService } from '@repo/erp-services/accountant/journals.service';
import { IFJournalEntry } from "@repo/api-contracts/erp";
import { useAccounting } from '@/contexts/AccountingContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@repo/devextreme';
import Form, { Label, RequiredRule, SimpleItem } from 'devextreme-react/form';
import { Popup, Position, ToolbarItem } from 'devextreme-react/popup';
import notify from 'devextreme/ui/notify';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import TransactionItem from './transactionItem';

interface AddTransactionProps {
    visible: boolean;
    onClose: () => void;
    accountId: string;
    accountName: string;
}

interface AdditionalLine {
    id: string;
    accountId: string;
    type: 'debit' | 'accredit';
    amount: number;
}

const AddTransaction: React.FC<AddTransactionProps> = ({ visible, onClose, accountId, accountName }) => {
    const { journals, accounts, triggerRefresh } = useAccounting();
    const { token, currentCompany } = useAuth();
    const formRef = useRef<any>(null);
    const [loading, setLoading] = useState(false);
    const [additionalLines, setAdditionalLines] = useState<AdditionalLine[]>([]);

    React.useEffect(() => {
        if (visible) {
            setAdditionalLines([]);
        }
    }, [visible]);

    const formData = useRef({
        name: '',
        date: new Date().toISOString().split('T')[0],
        journalId: ''
    }).current;

    const maxDate = useMemo(() => new Date(), []);

    const { totalDebits, totalCredits, debitCount, accreditCount, isBalanced } = useMemo(() => {
        let debits = 0;
        let credits = 0;
        let dCount = 0;
        let aCount = 0;

        for (let i = 0; i < additionalLines.length; i++) {
            const line = additionalLines[i];
            if (line.type === 'debit') {
                debits += line.amount;
                dCount++;
            } else if (line.type === 'accredit') {
                credits += line.amount;
                aCount++;
            }
        }

        return {
            totalDebits: debits,
            totalCredits: credits,
            debitCount: dCount,
            accreditCount: aCount,
            isBalanced: additionalLines.length >= 2 && Math.abs(debits - credits) < 0.001
        };
    }, [additionalLines]);

    const onSave = useCallback(async () => {
        const validationResult = formRef.current?.instance().validate();
        if (!validationResult?.isValid || !currentCompany || !token) return;

        const data = formRef.current?.instance().option('formData');

        if (Math.abs(totalDebits - totalCredits) >= 0.001) {
            notify('El asiento no está balanceado (Debe != Haber)', 'error', 3000);
            return;
        }

        if (additionalLines.length < 2) {
            notify('El asiento debe tener al menos dos líneas', 'error', 3000);
            return;
        }

        if (additionalLines.some(l => !l.accountId || l.amount <= 0)) {
            notify('Complete correctamente todas las líneas del asiento', 'error', 3000);
            return;
        }

        setLoading(true);
        try {
            const lines = additionalLines.map(l => ({
                accountId: l.accountId,
                name: accounts.find(a => a.id === l.accountId)?.name || 'Línea de asiento',
                debit: l.type === 'debit' ? l.amount : 0,
                credit: l.type === 'accredit' ? l.amount : 0
            }));

            const journalEntryPayload: IFJournalEntry = {
                companyId: currentCompany.id,
                journalId: data.journalId,
                name: data.name,
                ref: "",
                date: data.date,
                post: true,
                lines: lines
            };

            await journalsService.journalEntry(journalEntryPayload, token);
            notify('Transacción registrada con éxito', 'success', 2000);
            triggerRefresh();
            onClose();
        } catch (error: any) {
            console.error("Error creating journal entry", error);
            const errorMessage = error instanceof Error && error.message
                ? error.message
                : 'Error al registrar la transacción';
            notify(errorMessage, 'error', 3000);
        } finally {
            setLoading(false);
        }
    }, [currentCompany, token, onClose, triggerRefresh, additionalLines, accounts, totalDebits, totalCredits]);

    return (
        <Popup
            visible={visible}
            onHiding={onClose}
            dragEnabled={false}
            hideOnOutsideClick={true}
            showCloseButton={true}
            showTitle={true}
            title="Registrar Asiento"
            width={1200}
            height="auto"
            className="rounded-dx overflow-hidden"
        >
            <Position at="center" my="center" of="window" />

            <div className="p-2">
                <Form
                    ref={formRef}
                    formData={formData}
                    labelLocation="top"
                    scrollingEnabled={true}
                    colCount={3}
                >
                    <SimpleItem
                        dataField="journalId"
                        editorType="dxSelectBox"
                        editorOptions={{
                            stylingMode: 'filled',
                            items: journals,
                            displayExpr: 'name',
                            valueExpr: 'id',
                            placeholder: 'Seleccione un diario...'
                        }}
                    >
                        <Label text="Diario (Journal)" />
                        {}
                    </SimpleItem>

                    <SimpleItem
                        dataField="date"
                        editorType="dxDateBox"
                        editorOptions={{
                            stylingMode: 'filled',
                            displayFormat: 'dd/MM/yyyy',
                            width: '100%',
                            max: maxDate
                        }}
                    >
                        <Label text="Fecha de Operación" />
                        <RequiredRule message="La fecha es obligatoria" />
                    </SimpleItem>

                    <SimpleItem
                        dataField="name"
                        editorType="dxTextBox"
                        editorOptions={{
                            stylingMode: 'filled',
                            placeholder: 'Ej: Pago de servicios, Venta de productos...',
                        }}
                    >
                        <Label text="Descripción del Movimiento" />
                        <RequiredRule message="La descripción es obligatoria" />
                    </SimpleItem>
                </Form>

                <div className="mt-4 border-t border-primary-0/20 pt-4">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium">Líneas del Asiento</p>
                        <div className="flex gap-2">
                            {}
                        </div>
                    </div>

                    <div className="pr-1">
                        <div className="grid grid-cols-[1fr_auto_1fr] gap-4">
                            <div className="flex flex-col min-h-65 max-h-65 overflow-y-auto bg-primary-950/50 rounded-dx border border-primary-500/10">
                                <div className="sticky top-0 z-10 bg-primary-950 flex flex-col rounded-t-dx shadow-sm">
                                    <div className="flex justify-between items-center border-b border-main/10 p-1 px-2">
                                        <p className="text-md uppercase tracking-wider text-variant">Debe ({debitCount})</p>
                                        <Button
                                            icon="plus"
                                            stylingMode="text"
                                            hint="Agregar línea al Debe"
                                            onClick={() => setAdditionalLines(prev => [...prev, { id: Date.now().toString() + Math.random().toString(36).substring(2, 9), accountId: '', type: 'debit', amount: 0 }])}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center px-5 py-1.5 bg-primary-900/40 text-[10px] text-main/50 font-bold uppercase tracking-wider border-b border-main/5">
                                        <span>Cuenta</span>
                                        <span className='mr-23'>Monto</span>

                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 mt-1 p-2 pt-0">
                                    <TransactionItem
                                        type="debit"
                                        lines={additionalLines}
                                        accounts={accounts}
                                        setLines={setAdditionalLines}
                                    />
                                </div>
                            </div>
                            <div className="border-l border-main/10 h-full"></div>
                            <div className="flex flex-col min-h-65 max-h-65 overflow-y-auto bg-primary-950/50 rounded-dx border border-primary-500/10">
                                <div className="sticky top-0 z-10 bg-primary-950 flex flex-col rounded-t-dx shadow-sm">
                                    <div className="flex justify-between items-center border-b border-main/10 p-1 px-2">
                                        <p className="text-md uppercase tracking-wider text-variant">Haber ({accreditCount})</p>
                                        <Button
                                            icon="plus"
                                            stylingMode="text"
                                            hint="Agregar línea al Haber"
                                            onClick={() => setAdditionalLines(prev => [...prev, { id: Date.now().toString() + Math.random().toString(36).substring(2, 9), accountId: '', type: 'accredit', amount: 0 }])}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center px-2 py-1.5 bg-primary-900/40 text-[10px] text-main/50 font-bold uppercase tracking-wider border-b border-main/5">
                                        <span>Cuenta</span>
                                        <span>Monto</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 mt-1 p-2 pt-0">
                                    <TransactionItem
                                        type="accredit"
                                        lines={additionalLines}
                                        accounts={accounts}
                                        setLines={setAdditionalLines}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-3 text-xs flex justify-between items-center bg-primary-900 p-2 rounded-dx border border-primary-500/10">
                        <div className="flex gap-4">
                            <span>Debe: <strong className="text-main">${totalDebits.toFixed(2)}</strong></span>
                            <span>Haber: <strong className="text-main">${totalCredits.toFixed(2)}</strong></span>
                        </div>
                        <span className={`font-bold px-2 py-1 rounded-md ${isBalanced ? "text-focus-500 bg-focus-500/10" : "text-red-500 bg-red-500/10"}`}>
                            Saldo: ${Math.abs(totalDebits - totalCredits).toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>

            <ToolbarItem
                widget="dxButton"
                toolbar="bottom"
                location="after"
                options={{
                    text: 'Registrar Asiento',
                    type: 'default',
                    stylingMode: 'contained',
                    disabled: loading,
                    onClick: onSave,
                    elementAttr: { class: 'bg-focus-500 border-none !text-variant' }
                }}
            />
            <ToolbarItem
                widget="dxButton"
                toolbar="bottom"
                location="after"
                options={{
                    text: 'Cancelar',
                    onClick: onClose,
                    stylingMode: 'text'
                }}
            />
        </Popup>
    );
};

export default AddTransaction;
