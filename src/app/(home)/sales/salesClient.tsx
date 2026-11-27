'use client'

import {
    ReceiptTemplate,
    BatchReceiptTemplate,
    type IReceiptProps,
} from '@repo/templates/pdfPrintable';
import { pdf } from '@react-pdf/renderer';
import { Button } from '@repo/devextreme';

const SalesClient = () => {
    const BATCH_SIZE = 1;

    const handlePrint = async () => {
        try {
            const blob = await pdf(<ReceiptTemplate />).toBlob();
            const url = URL.createObjectURL(blob);
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = url;
            document.body.appendChild(iframe);
            iframe.onload = () => {
                setTimeout(() => {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                }, 100);
            };
        } catch (error) {
            console.error('Error generating PDF:', error);
        }
    };

    const handlePrintBatch = async () => {
        try {
            const invoices: IReceiptProps[] = Array.from({ length: BATCH_SIZE }, (_, i) => ({
                receiptNumber: `0011-000000${i + 1}`,
                client: `CLIENTE DE PRUEBA ${i + 1}`,
                entity: 'ORIGINAL',
            }));

            const blob = await pdf(<BatchReceiptTemplate invoices={invoices} copies={4} />).toBlob();
            const url = URL.createObjectURL(blob);

            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = url;
            document.body.appendChild(iframe);
            iframe.onload = () => {
                setTimeout(() => {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                }, 100);
            };
        } catch (error) {
            console.error('Error generating Batch PDF:', error);
        }
    };

    return (
        <div className="bg-primary-500 rounded-dx shadow-lg p-10 flex flex-col items-center justify-center gap-6 border border-primary-900">
            <div className="w-20 h-20 rounded-dx bg-focus-500/20 flex items-center justify-center border border-focus-500/30">
                <i className="dx-icon dx-icon-money text-focus-500 text-4xl" />
            </div>

            <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Emisión de Recibo</h2>
                <p className="max-w-md">
                    Haz clic en el botón inferior para generar el documento PDF y abrir la previsualización de impresión.
                </p>
            </div>

            <div className="flex gap-4">
                <Button
                    text="Imprimir Recibo"
                    icon="print"
                    type="default"
                    stylingMode="contained"
                    onClick={handlePrint}
                    className="rounded-dx px-8 h-12 flex items-center gap-2 font-bold shadow-lg shadow-focus-500/20"
                />

                <Button
                    text={`Imprimir Lote (${BATCH_SIZE})`}
                    icon="copy"
                    type="normal"
                    stylingMode="outlined"
                    onClick={handlePrintBatch}
                    className="rounded-dx px-8 h-12 flex items-center gap-2 font-bold border-main/20  hover:bg-main/10"
                />
            </div>
        </div>
    );
};

export default SalesClient;