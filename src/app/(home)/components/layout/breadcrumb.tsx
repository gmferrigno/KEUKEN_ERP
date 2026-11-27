'use client';

import { IGNORED_ROUTE_KEYS } from '@/app/lib/routes/customData';
import { IAppRoute } from '@/app/lib/routes/getRoutes';
import { usePathname, useRouter } from 'next/navigation';

interface ICustomRoute extends IAppRoute {
    text?: string;
    icon?: string;
}

interface BreadcrumbProps {
    routes: ICustomRoute[];
}

export default function Breadcrumb({ routes }: BreadcrumbProps) {
    const pathname = usePathname();
    const router = useRouter();
    const segments = pathname.split('/').filter(Boolean);

    if (segments.some(seg => IGNORED_ROUTE_KEYS.includes(seg))) {
        return null;
    }

    const getHref = (idx: number) =>
        '/' + segments.slice(0, idx + 1).join('/');

    const getText = (href: string) => {
        let bestMatch: ICustomRoute | undefined = undefined;
        for (const route of routes) {
            if (href.startsWith(route.path)) {
                if (!bestMatch || route.path.length > bestMatch.path.length) {
                    bestMatch = route;
                }
            }
        }
        return bestMatch?.text || href.split('/').pop();
    };

    return (
        <nav aria-label="breadcrumb" className="text-xs ">
            <ol className="flex gap-1">
                <li>
                    <span
                        className="hover:underline cursor-pointer"
                        onClick={() => router.push('/')}
                    >
                        Inicio
                    </span>
                </li>
                {segments.map((seg, idx) => {
                    const href = getHref(idx);
                    const isLast = idx === segments.length - 1;
                    const text = getText(href);

                    return (
                        <li key={idx} className="flex items-center gap-1">
                            <span>/</span>
                            {isLast ? (
                                <span className="font-semibold">{text}</span>
                            ) : (
                                <span
                                    className="hover:underline cursor-pointer"
                                    onClick={() => router.push(href)}
                                >
                                    {text}
                                </span>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}