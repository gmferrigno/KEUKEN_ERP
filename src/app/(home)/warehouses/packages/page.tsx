import SectionHeader from "../../components/section/sectionHeader";
import PackagesClient from "./packagesClient";

const PackagesPage = () => {
    return (
        <div className="flex flex-col w-full h-full gap-y-2 overflow-hidden">
            <SectionHeader title="Bultos WMS" />
            <PackagesClient />
        </div>
    );
};

export default PackagesPage;
