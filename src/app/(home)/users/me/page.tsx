import SectionHeader from "../../components/section/sectionHeader";
import MeClient from "@repo/profile-ui/me/meClient";

export default function Me() {
    return (
        <div className="flex flex-col w-full h-full gap-y-2 overflow-hidden">
            <SectionHeader title="Mi Perfil" />
            <MeClient />
        </div>
    );
}
