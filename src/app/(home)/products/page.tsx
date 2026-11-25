import SectionHeader from "../components/section/sectionHeader";
import ProductTabs from "@repo/domain-ui/products/components/tabs/tabs";

const ProductsPage = () => {
    return (
        <div className="flex flex-col w-full h-full gap-y-2 overflow-hidden">
            <SectionHeader title="Artículos" />
            <div className="flex-1 flex flex-col min-h-0">
                <ProductTabs />
            </div>
        </div>
    );
};

export default ProductsPage;
