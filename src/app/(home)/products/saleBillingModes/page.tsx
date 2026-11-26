import SectionHeader from "../../components/section/sectionHeader";
import SaleBillingModesClient from "@repo/domain-ui/products/saleBillingModes/saleBillingModesClient";

const SaleBillingModesPage = () => {
    return (
        <div className="flex flex-col w-full h-full gap-y-2 overflow-hidden">
            <SectionHeader title="Modos de facturación" />
            <SaleBillingModesClient />
        </div>
    );
};

export default SaleBillingModesPage;
