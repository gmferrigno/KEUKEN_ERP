import SectionHeader from '../components/section/sectionHeader';
import ProductTabsV2 from '@repo/domain-ui/products/components/tabs/tabsV2';

const ProductsPageV2 = () => {
    return (
        <div className="flex flex-col w-full h-full gap-y-2 overflow-hidden">
            <SectionHeader title="Artículos (Columnas Miller)" />
            <div className="flex-1 flex flex-col min-h-0">
                <ProductTabsV2 />
            </div>
        </div>
    );
};

export default ProductsPageV2;
