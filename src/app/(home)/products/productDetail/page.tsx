"use client";

import SectionHeader from "../../components/section/sectionHeader";
import ProductDetailView from "@repo/domain-ui/products/productDetail/ProductDetailView";

export default function ProductDetailPage() {
    return <ProductDetailView SectionHeader={SectionHeader} />;
}
