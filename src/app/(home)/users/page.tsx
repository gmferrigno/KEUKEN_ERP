import SectionHeader from "../components/section/sectionHeader";
import UsersClient from "@repo/domain-ui/users/usersClient";

export default function Users() {
  return (
    <div className="flex flex-col w-full h-full gap-y-2 overflow-hidden">
      <SectionHeader title="Usuarios" />
      <UsersClient />
    </div>
  );
}
