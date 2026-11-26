import SectionHeader from "../../components/section/sectionHeader";
import UomCategoriesClient from "@repo/domain-ui/products/uom-categories/uomCategoriesClient";

const UomCategoriesPage = () => {
    return (
        <div className="flex flex-col w-full h-full gap-y-2 overflow-hidden">
            <SectionHeader title="Categorías de UOM" />
            <UomCategoriesClient />
        </div>
    );
};

export default UomCategoriesPage;
