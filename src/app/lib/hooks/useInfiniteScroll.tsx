'use client'
import { ScrollViewRef } from 'devextreme-react/cjs/scroll-view';
import { RefObject, useCallback, useEffect, useRef, useState } from 'react';

interface UseInfiniteScrollOptions<T> {
    fetchData: (page: number, params: any) => Promise<{ data: T[], total: number }>;
    params?: any;
    initialPage?: number;
    pageSize?: number;
    threshold?: number;
}

interface UseInfiniteScrollResult<T> {
    items: T[];
    isLoading: boolean;
    hasMore: boolean;
    loadMore: () => void;
    refresh: () => void;
    page: number;
    totalItems: number;
}

export function useInfiniteScroll<T>(
    containerRef: RefObject<ScrollViewRef | null>,
    {
        fetchData,
        params,
        initialPage = 1,
        pageSize = 20,
        threshold = 20
    }: UseInfiniteScrollOptions<T>
): UseInfiniteScrollResult<T> {
    const [items, setItems] = useState<T[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(initialPage);
    const [totalItems, setTotalItems] = useState(0);

    const isLoadingRef = useRef(false);
    const lastRequestId = useRef(0);

    const loadData = useCallback(async (pageNum: number, currentParams: any, isReset: boolean = false) => {
        if (!isReset && isLoadingRef.current) return;

        const requestId = ++lastRequestId.current;
        isLoadingRef.current = true;
        setIsLoading(true);

        try {
            const { data: newItems, total } = await fetchData(pageNum, currentParams);

            if (requestId !== lastRequestId.current) return;

            setTotalItems(total);

            setItems(prevItems => {
                const updatedItems = isReset ? newItems : [...prevItems, ...newItems];
                setHasMore(updatedItems.length < total);
                return updatedItems;
            });

            if (isReset) {
                setPage(initialPage + 1);
            } else if (newItems.length > 0) {
                setPage(prev => prev + 1);
            }
        } catch (error) {
            if (requestId === lastRequestId.current) {
                console.error("Error loading data:", error);
            }
        } finally {
            if (requestId === lastRequestId.current) {
                setIsLoading(false);
                isLoadingRef.current = false;
            }
        }
    }, [fetchData, initialPage]);

    useEffect(() => {
        setItems([]);
        setPage(initialPage);
        setHasMore(true);
        loadData(initialPage, params, true);
    }, [params, initialPage, loadData]);


    useEffect(() => {
        const instance = containerRef.current?.instance();
        if (!instance) return;

        const handleScroll = () => {
            if (isLoadingRef.current || !hasMore) return;

            const scrollTop = instance.scrollTop();
            const scrollHeight = instance.content().scrollHeight;
            const clientHeight = instance.element().clientHeight;

            if (scrollHeight - scrollTop - clientHeight <= threshold) {
                loadData(page, params);
            }
        };

        instance.on('scroll', handleScroll);
        const checkRefetch = setTimeout(() => {
            if (!isLoadingRef.current && hasMore) {
                const scrollHeight = instance.content().scrollHeight;
                const clientHeight = instance.element().clientHeight;
                if (scrollHeight <= clientHeight + threshold) {
                    loadData(page, params);
                }
            }
        }, 100);

        return () => {
            instance.off('scroll', handleScroll);
            clearTimeout(checkRefetch);
        };
    }, [containerRef, hasMore, page, params, loadData, threshold, items]);

    const loadMore = useCallback(() => {
        if (!isLoadingRef.current && hasMore) {
            loadData(page, params);
        }
    }, [hasMore, page, params, loadData]);

    const refresh = useCallback(() => {
        setItems([]);
        setPage(initialPage);
        setHasMore(true);
        loadData(initialPage, params, true);
    }, [initialPage, params, loadData]);

    return { items, isLoading, hasMore, loadMore, refresh, page, totalItems };
}
