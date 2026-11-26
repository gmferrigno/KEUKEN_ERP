'use client';

import { useAuth } from '@/contexts/AuthContext';
import type { IFCategory, IFItem } from '@repo/api-contracts/erp';
import { categoriesService } from '@repo/erp-services/product_services/categories.service';
import { itemsService } from '@repo/erp-services/product_services/items.service';
import { productsService } from '@repo/erp-services/product_services/products.service';
import notify from 'devextreme/ui/notify';
import { useEffect, useState } from 'react';
import type { PosViewMode } from '../types';
import {
    PAGE_SIZE,
    buildCategoryIdFilter,
    collectCategoryTreeIds,
    matchesCatalogSearch,
} from '../utils';

type UsePosCatalogArgs = {
    viewMode: PosViewMode;
};

/** Sin categoría: una página de ítems. Con búsqueda se afina en server + cliente. */
const ITEMS_PAGE_LIMIT = 200;
const PRODUCT_ID_BATCH = 8;

/**
 * Catálogo POS:
 * - Buscador → `GET /items?search=` (SKU/nombre de ítem) + filtro local de seguridad.
 * - Categoría → productos por `category_id` (server) → ítems por `product_id`.
 *   La categoría está en el producto, no en el ítem.
 */
export function usePosCatalog({ viewMode }: UsePosCatalogArgs) {
    const { token, currentCompany } = useAuth();
    const [products, setProducts] = useState<IFItem[]>([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [categories, setCategories] = useState<IFCategory[]>([]);
    const [categoriesLoading, setCategoriesLoading] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
        null
    );

    useEffect(() => {
        if (viewMode !== 'catalog' || !token || !currentCompany?.id) return;

        let cancelled = false;
        const loadCategories = async () => {
            try {
                setCategoriesLoading(true);
                const all: IFCategory[] = [];
                let offset = 0;
                let totalItems = Infinity;

                while (!cancelled && offset < totalItems) {
                    const response = await categoriesService.getAll(
                        currentCompany.id,
                        { limit: PAGE_SIZE, offset },
                        token
                    );
                    const page = response.items || [];
                    all.push(...page);
                    totalItems = response.metadata?.totalItems ?? all.length;
                    if (page.length < PAGE_SIZE) break;
                    offset += PAGE_SIZE;
                }

                if (cancelled) return;
                setCategories(all);
            } catch (error) {
                console.error('Error loading categories for POS:', error);
                notify(
                    error instanceof Error
                        ? error.message
                        : 'No se pudieron cargar las categorías',
                    'error',
                    3000
                );
                setCategories([]);
            } finally {
                if (!cancelled) setCategoriesLoading(false);
            }
        };

        void loadCategories();
        return () => {
            cancelled = true;
        };
    }, [viewMode, token, currentCompany?.id]);

    useEffect(() => {
        if (viewMode !== 'catalog' || !token || !currentCompany?.id) {
            return;
        }

        if (selectedCategoryId && categoriesLoading) return;

        let cancelled = false;
        const loadCatalog = async () => {
            try {
                setProductsLoading(true);
                const search = productSearch.trim();

                if (selectedCategoryId) {
                    const categoryIds = collectCategoryTreeIds(
                        categories,
                        selectedCategoryId
                    );
                    const categoryFilter = buildCategoryIdFilter(categoryIds);
                    const productIds: string[] = [];
                    let offset = 0;
                    let totalProducts = Infinity;

                    while (!cancelled && offset < totalProducts) {
                        const response = await productsService.getAll(
                            currentCompany.id,
                            {
                                limit: PAGE_SIZE,
                                offset,
                                filter: categoryFilter || undefined,
                            },
                            token,
                            false
                        );
                        const page = response.items || [];
                        for (const product of page) {
                            // Defensa: si el back ignora filter, aún validamos categoryId.
                            if (
                                product.id &&
                                product.categoryId &&
                                categoryIds.includes(product.categoryId)
                            ) {
                                productIds.push(product.id);
                            }
                        }
                        totalProducts =
                            response.metadata?.totalItems ??
                            offset + page.length;
                        if (page.length < PAGE_SIZE) break;
                        offset += PAGE_SIZE;
                    }

                    if (cancelled) return;

                    const catalogItems: IFItem[] = [];
                    for (let i = 0; i < productIds.length; i += PRODUCT_ID_BATCH) {
                        if (cancelled) return;
                        const batch = productIds.slice(i, i + PRODUCT_ID_BATCH);
                        const pages = await Promise.all(
                            batch.map((productId) =>
                                itemsService.getAll(
                                    currentCompany.id,
                                    { limit: PAGE_SIZE, offset: 0 },
                                    token,
                                    false,
                                    { productId }
                                )
                            )
                        );
                        for (const page of pages) {
                            catalogItems.push(...(page.items || []));
                        }
                    }

                    if (cancelled) return;
                    setProducts(
                        search
                            ? catalogItems.filter((item) =>
                                  matchesCatalogSearch(item, search)
                              )
                            : catalogItems
                    );
                    return;
                }

                // Sin categoría: búsqueda sobre ítems (SKU / nombre).
                const response = await itemsService.getAll(
                    currentCompany.id,
                    {
                        limit: ITEMS_PAGE_LIMIT,
                        offset: 0,
                        search: search || undefined,
                    },
                    token,
                    false
                );
                if (cancelled) return;
                const items = response.items || [];
                setProducts(
                    search
                        ? items.filter((item) => matchesCatalogSearch(item, search))
                        : items
                );
            } catch (error) {
                console.error('Error loading products for POS:', error);
                notify(
                    error instanceof Error
                        ? error.message
                        : 'No se pudieron cargar los productos',
                    'error',
                    3000
                );
                setProducts([]);
            } finally {
                if (!cancelled) setProductsLoading(false);
            }
        };

        const timer = window.setTimeout(loadCatalog, searchDebounceMs(productSearch));
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [
        viewMode,
        token,
        currentCompany?.id,
        productSearch,
        selectedCategoryId,
        categories,
        categoriesLoading,
    ]);

    return {
        products,
        productsLoading:
            productsLoading || (!!selectedCategoryId && categoriesLoading),
        productSearch,
        setProductSearch,
        categories,
        categoriesLoading,
        selectedCategoryId,
        setSelectedCategoryId,
    };
}

const searchDebounceMs = (value: string) => (value.trim() ? 300 : 0);
