import SectionHeader from "../../components/section/sectionHeader";
import { Metadata } from "next";
import AddressesClient from "./";

export const metadata: Metadata = {
    title: "Direcciones",
};

export default function CustomerAddressesPage() {
    return (
        <div className="flex flex-col w-full h-full gap-y-2 overflow-hidden">
            <SectionHeader title="Direcciones" />
            <AddressesClient />
        </div>
    );
}
