import SectionHeader from "../../components/section/sectionHeader";
import UomsClient from "@repo/domain-ui/products/uoms/uomsClient";

const UomsPage = () => {
    return (
        <div className="flex flex-col w-full h-full gap-y-2 overflow-hidden">
            <SectionHeader title="Unidades de medida" />
            <UomsClient />
        </div>
    );
};

export default UomsPage;
