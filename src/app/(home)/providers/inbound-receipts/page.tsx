import SectionHeader from "../../components/section/sectionHeader";
import InboundReceiptsClient from "./inboundReceiptsClient";

const InboundReceiptsPage = () => {
    return (
        <div className="flex flex-col w-full h-full gap-y-2 overflow-hidden">
            <SectionHeader title="Recepciones de Entrada" />
            <InboundReceiptsClient />
        </div>
    );
};

export default InboundReceiptsPage;
