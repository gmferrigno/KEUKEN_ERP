'use client';

import { useAccounting } from "@/contexts/AccountingContext";
import Splitter, { Item as SplitterItem } from 'devextreme-react/splitter';
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useTransition } from "react";
import Breadcrumbs from "./breadcrums";
import ItemsDetailCard from "./components/cardView/detailCard";
import TreeView from "./components/treeView";

const AccountingClient = () => {
    const { setSelectedAccount } = useAccounting();
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();

    const activePath = searchParams.get('path') || '';

    useEffect(() => {
        setSelectedAccount(activePath || null);
    }, [activePath, setSelectedAccount]);

    const navigate = (newPath: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (!newPath) {
            params.delete('path');
        } else {
            params.set('path', newPath);
        }

        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`);
        });
    };


    return (
        <>
            <div className="flex flex-col w-full h-full gap-2 overflow-hidden" >
                <div className={`w-full shrink-0 transition-opacity duration-300 ${isPending ? 'opacity-50' : 'opacity-100'}`} >
                    <Breadcrumbs
                        currentPath={activePath}
                        onNavigate={navigate}
                    />
                </div>

                <div className="flex-1 min-h-0 flex flex-col gap-2">
                    <div className="flex-1 min-h-0">
                        <Splitter orientation="horizontal" width="100%" height="100%" className="gap-2">

                            <SplitterItem
                                collapsed={false}
                                minSize={'25%'}
                                maxSize={'45%'}
                            >
                                <TreeView />
                            </SplitterItem>
                            <SplitterItem
                                resizable={true}
                                maxSize={'80%'}
                            >
                                <ItemsDetailCard />
                            </SplitterItem>
                        </Splitter>
                    </div>

                </div>
            </div>
        </>
    );
};


export default AccountingClient;
