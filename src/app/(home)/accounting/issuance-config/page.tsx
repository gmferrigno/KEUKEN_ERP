import SectionHeader from "../../components/section/sectionHeader";
import IssuanceConfigClient from "./issuanceConfigClient";

const IssuanceConfigPage = () => {
    return (
        <div className="flex flex-col w-full h-full gap-y-2 overflow-hidden">
            <SectionHeader title="Reglas de Emisión" />
            <IssuanceConfigClient />
        </div>
    );
};

export default IssuanceConfigPage;
