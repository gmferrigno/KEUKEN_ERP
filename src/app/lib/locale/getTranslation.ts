'use client'
import { useLocale } from '@/contexts/LocaleContext';
import en from '../../../../public/locales/en.json';
import es from '../../../../public/locales/es.json';

const translations: Record<string, any> = { en, es };

export const useTranslation = () => {
    const { locale } = useLocale();

    const t = (key: string): string => {
        const keys = key.split('.');
        let value: any = translations[locale];

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return key;
            }
        }

        return typeof value === 'string' ? value : key;
    };

    return { t, locale };
};

export const t = (key: string, locale: string = 'es'): string => {
    const keys = key.split('.');
    let value: any = translations[locale];

    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = value[k];
        } else {
            return key;
        }
    }

    return typeof value === 'string' ? value : key;
};