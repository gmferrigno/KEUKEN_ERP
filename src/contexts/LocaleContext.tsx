'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';

const LocaleContext = createContext({
    locale: 'en',
    updateLocale: (newLocale: string) => {}
});

export const LocaleProvider : React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [locale, setLocale] = useState('en');

    useEffect(() => {
        const savedLocale = localStorage.getItem('app_locale');

        if (savedLocale) {
            setLocale(savedLocale);
        } else {
            const browserLang = navigator.language.split('-')[0];
            updateLocale(browserLang);
        }
    }, []);

    const updateLocale = (newLocale: string) => {
        setLocale(newLocale);
        localStorage.setItem('app_locale', newLocale);
    };

    return (
        <LocaleContext.Provider value={{ locale, updateLocale }}>
            {children}
        </LocaleContext.Provider>
    );
};

export const useLocale = () => useContext(LocaleContext);