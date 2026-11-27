import { cookies } from 'next/headers';

export async function requireAuthToken(): Promise<string | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('authToken')?.value;
    return token && token.length > 0 ? token : null;
}
