import ModuleAccessLayout from "@/components/ModuleAccessLayout";
import type { ReactNode } from "react";
import { ProfileUiBridge } from "./ProfileUiBridge";

export default function UsersLayout({ children }: { children: ReactNode }) {
    return (
        <ModuleAccessLayout module="core">
            <ProfileUiBridge>{children}</ProfileUiBridge>
        </ModuleAccessLayout>
    );
}
