export const getToken = (): string => {
    if (typeof window === 'undefined') return '';
    try {
        return localStorage.getItem('authToken') || '';
    } catch {
        return '';
    }
};

export const setClientAuthToken = (token: string): void => {
    if (typeof window === 'undefined') return;
    try {
        if (token) localStorage.setItem('authToken', token);
        else localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
    } catch {
    }
};

export const clearClientAuthToken = (): void => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
    } catch {
    }
};
