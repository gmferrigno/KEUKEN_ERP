import SectionHeader from "../../components/section/sectionHeader";
import ByRoleClient from "@repo/domain-ui/users/by-role/byRoleClient";

export default function UsersByRolePage() {
  return (
    <div className="flex flex-col w-full h-full gap-y-2 overflow-hidden">
      <SectionHeader title="Usuarios por Rol" />
      <ByRoleClient />
    </div>
  );
}
