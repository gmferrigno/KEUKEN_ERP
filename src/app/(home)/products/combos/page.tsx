import SectionHeader from "../../components/section/sectionHeader";
import CombosClient from "@repo/domain-ui/products/combos/index";

const CombosPage = () => {
    return (
        <div className="flex flex-col w-full h-full gap-y-2 overflow-hidden">
            <SectionHeader title="Combos" />
            <div className="flex-1 flex flex-col min-h-0">
                <CombosClient />
            </div>
        </div>
    );
};

export default CombosPage;
