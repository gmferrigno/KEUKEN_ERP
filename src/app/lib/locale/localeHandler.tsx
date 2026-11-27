'use client'
import { useLocale } from '@/contexts/LocaleContext';
import { locale as dxLocale, loadMessages } from 'devextreme/localization';
import enMessage from 'devextreme/localization/messages/en.json';
import esMessages from 'devextreme/localization/messages/es.json';
import ptMessages from 'devextreme/localization/messages/pt.json';
import { useEffect } from 'react';

export default function DevExtremeIntlBridge() {
    const { locale } = useLocale();
    useEffect(() => {
        const esPatched = {
            ...esMessages,
            es: {
                ...(esMessages as { es?: Record<string, string> }).es,
                'dxDataGrid-ariaDataGrid': 'Tabla de datos con {0} filas y {1} columnas',
            },
        };
        loadMessages({ ...esPatched, ...enMessage, ...ptMessages });
        dxLocale(locale);
    }, [locale]);

    return null;
}
