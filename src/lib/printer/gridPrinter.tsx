import { jsPDF } from 'jspdf';
import { gridPdfTemplate, IPdfTemplate } from "./templates/template";


const PRINTER_TEMPLATES: Record<string, IPdfTemplate> = {
    grid: gridPdfTemplate,
};

export type PrinterTemplateKey = keyof typeof PRINTER_TEMPLATES;

export interface GridPrinterOptions {
    gridId: string;
    title?: string;
    onBeforePrint?: (state: { gridId: string }) => void;
    onAfterPrint?: (state: { gridId: string }) => void;
    printerTemplate: PrinterTemplateKey;
    templateInAll?: boolean;
}


export interface GridPrinterResult {
    onPrint: (child: any) => void;
}

export function createGridPrinter(options: GridPrinterOptions): GridPrinterResult {
    const { gridId, title = 'Reporte', onBeforePrint, printerTemplate, templateInAll } = options;

    return {
        onPrint: (child: any) => {
            if (onBeforePrint) {
                onBeforePrint({ gridId });
            }

            if (child) {
                printPdfWithTemplate(child, title, printerTemplate, templateInAll);
            } else {
                console.warn('Expected jsPDF instance in onPrint for PDF printing.');
            }
        }
    };
}


export function printPdfWithTemplate(
    doc: jsPDF,
    title: string,
    templateKey: PrinterTemplateKey,
    templateInAll: boolean = true
) {
    const template = PRINTER_TEMPLATES[templateKey];
    if (!template) {
        console.error(`Printer template "${templateKey}" not found.`);
        return;
    }

    const pageCount = doc.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        const shouldDrawHeader = i === 1;
        const shouldDrawFooter = templateInAll || i === pageCount;

        if (shouldDrawHeader) {
            template.drawHeader(doc, title);
        }

        if (shouldDrawFooter) {
            template.drawFooter(doc, i, pageCount);
        }
    }

    doc.autoPrint();
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);

    const iframe = document.createElement('iframe');
    Object.assign(iframe.style, {
        position: 'fixed',
        width: '0',
        height: '0',
        border: 'none',
    });

    iframe.src = url;
    document.body.appendChild(iframe);


}
