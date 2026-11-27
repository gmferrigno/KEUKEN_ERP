'use client';

import { journalsService } from '@repo/erp-services/accountant/journals.service';
import { IFJournalEntry } from "@repo/api-contracts/erp";
import { useAccounting } from '@/contexts/AccountingContext';
import { useAuth } from '@/contexts/AuthContext';
import dayjs from 'dayjs';
import { LoadIndicator } from 'devextreme-react/load-indicator';
import { Popup, Position, ToolbarItem } from 'devextreme-react/popup';
import React, { useEffect, useMemo, useState } from 'react';

interface ViewTransactionProps {
    visible: boolean;
    onClose: () => void;
    moveId: string | null;
}

const ViewTransaction: React.FC<ViewTransactionProps> = ({ visible, onClose, moveId }) => {
    const { journals, accounts } = useAccounting();
    const { token } = useAuth();

    const [data, setData] = useState<IFJournalEntry | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible && moveId && token) {
            setLoading(true);
            journalsService.getJournalMove(token, moveId)
                .then(setData)
                .catch(err => console.error("Error fetching move", err))
                .finally(() => setLoading(false));
        }
    }, [visible, moveId, token]);

    const accountsMap = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);
    const journalsMap = useMemo(() => new Map(journals.map(j => [j.id, j])), [journals]);

    const { totalDebits, totalCredits } = useMemo(() => ({
        totalDebits: data ? data.lines.reduce((sum, l) => sum + l.debit, 0) : 0,
        totalCredits: data ? data.lines.reduce((sum, l) => sum + l.credit, 0) : 0,
    }), [data]);

    return (
        <Popup
            visible={visible}
            onHiding={onClose}
            onHidden={() => {
                setData(null);
                setLoading(false);
            }}
            onShown={(e) => {
                e.component.repaint();
            }}
            dragEnabled={false}
            hideOnOutsideClick={true}
            showCloseButton={true}
            showTitle={true}
            title={`Visualizar Asiento ${moveId ? `- ${moveId}` : ''}`}
            width={1200}
            height="auto"
            className="rounded-dx overflow-hidden"
        >
            <Position at="center" my="center" of="window" />

            <div className="p-2 min-h-[300px]">
                <>
                    <div className="relative flex items-center justify-between bg-gradient-to-r from-primary-900/60 to-primary-900/20 p-4 pl-5 rounded-dx border border-primary-500/10 mb-4 shadow-sm overflow-hidden">
                        {}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-focus-500/80"></div>

                        <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] text-main/50 uppercase tracking-widest font-bold flex items-center gap-1.5">
                                <i className="dx-icon-textdocument text-[11px] opacity-70"></i> Descripción del Movimiento
                            </span>
                            <span className="text-lg font-semibold text-main leading-none tracking-tight">{data?.name || '-'}</span>
                            {data?.ref && (
                                <span className="text-[11px] text-main/60 mt-0.5 flex items-center gap-1 bg-primary-950/50 w-fit px-2 py-0.5 rounded-md border border-primary-500/5">
                                    <i className="dx-icon-bookmark text-[10px] text-focus-400"></i> Ref: {data.ref}
                                </span>
                            )}
                        </div>

                        <div className="flex gap-5 text-right">
                            <div className="flex flex-col items-end gap-1">
                                <span className="text-[10px] text-main/50 uppercase tracking-widest font-bold flex items-center gap-1.5">
                                    <i className="dx-icon-folder text-[10px] opacity-70"></i> Diario
                                </span>
                                <span className="text-[13px] font-medium text-main bg-primary-950/60 px-2.5 py-1 rounded-md border border-primary-500/10 shadow-sm whitespace-nowrap">
                                    {data?.journalId ? (journalsMap.get(data.journalId)?.name || data.journalId) : '-'}
                                </span>
                            </div>
                            <div className="w-px bg-primary-500/10 my-1"></div>
                            <div className="flex flex-col items-end gap-1">
                                <span className="text-[10px] text-main/50 uppercase tracking-widest font-bold flex items-center gap-1.5">
                                    <i className="dx-icon-event text-[10px] opacity-70"></i> Fecha
                                </span>
                                <span className="text-[13px] font-mono font-medium text-main bg-primary-950/60 px-2.5 py-1 rounded-md border border-primary-500/10 shadow-sm whitespace-nowrap">
                                    {data?.date ? dayjs(data.date).format('DD/MM/YYYY') : '-'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-2 border-t border-primary-0/20 pt-4">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-sm font-medium">Líneas del Asiento</p>
                        </div>

                        <div className="pr-1">
                            <div className="grid grid-cols-[1fr_auto_1fr] gap-4">
                                {}
                                <div className="flex flex-col min-h-60 max-h-60 overflow-y-auto bg-primary-950/50 rounded-dx border border-primary-500/10">
                                    <div className="sticky top-0 z-10 bg-primary-950 flex flex-col rounded-t-dx shadow-sm">
                                        <div className="flex justify-between items-center border-b border-main/10 p-2">
                                            <p className="text-md uppercase tracking-wider text-variant">Debe ({data?.lines ? data.lines.filter(l => l.debit > 0).length : 0})</p>
                                        </div>
                                        <div className="flex justify-between items-center px-4 py-1.5 bg-primary-900/40 text-[10px] text-main/50 font-bold uppercase tracking-wider border-b border-main/5">
                                            <span>Cuenta</span>
                                            <span>Monto</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1 mt-1 p-2 pt-0">
                                        {data?.lines ? data.lines.filter(l => l.debit > 0).map((line, idx) => (
                                            <div key={`debit-${idx}`} className="flex justify-between items-center p-2 bg-primary-900/30 hover:bg-primary-900/50 transition-colors border border-primary-500/10 rounded-md">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">{accountsMap.get(line.accountId)?.name || line.name || line.accountId}</span>
                                                </div>
                                                <span className="font-mono text-main">${line.debit.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                        )) : null}
                                    </div>
                                </div>

                                <div className="border-l border-main/10 h-full"></div>

                                {}
                                <div className="flex flex-col min-h-60 max-h-60 overflow-y-auto bg-primary-950/50 rounded-dx border border-primary-500/10">
                                    <div className="sticky top-0 z-10 bg-primary-950 flex flex-col rounded-t-dx shadow-sm">
                                        <div className="flex justify-between items-center border-b border-main/10 p-2">
                                            <p className="text-md uppercase tracking-wider text-variant">Haber ({data?.lines ? data.lines.filter(l => l.credit > 0).length : 0})</p>
                                        </div>
                                        <div className="flex justify-between items-center px-5 py-1.5 bg-primary-900/40 text-[10px] text-main/50 font-bold uppercase tracking-wider border-b border-main/5">
                                            <span>Cuenta</span>
                                            <span>Monto</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1 mt-1 p-2 pt-0">
                                        {data?.lines ? data.lines.filter(l => l.credit > 0).map((line, idx) => (
                                            <div key={`credit-${idx}`} className="flex justify-between items-center p-2 bg-primary-900/30 hover:bg-primary-900/50 transition-colors border border-primary-500/10 rounded-md">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">{accountsMap.get(line.accountId)?.name || line.name || line.accountId}</span>
                                                </div>
                                                <span className="font-mono text-main">${line.credit.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                        )) : null}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-3 text-xs flex justify-between items-center bg-primary-900 p-2 rounded-dx border border-primary-500/10">
                            <div className="flex gap-4">
                                <span>Debe: <strong className="text-main">${totalDebits.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                                <span>Haber: <strong className="text-main">${totalCredits.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                            </div>
                        </div>
                    </div>
                </>
            </div>

            <ToolbarItem
                widget="dxButton"
                toolbar="bottom"
                location="after"
                options={{
                    text: 'Cerrar',
                    onClick: onClose,
                    stylingMode: 'default'
                }}
            />
        </Popup>
    );
};

export default ViewTransaction;
