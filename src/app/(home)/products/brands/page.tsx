import SectionHeader from "../../components/section/sectionHeader";
import BrandsClient from "@repo/domain-ui/products/brands/brandsClient";

const BrandsPage = () => {
    return (
        <div className="flex flex-col w-full h-full gap-y-2 overflow-hidden">
            <SectionHeader title="Marcas" />
            <BrandsClient />
        </div>
    );
};

export default BrandsPage;
