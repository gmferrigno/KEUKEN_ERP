import SectionHeader from "../../components/section/sectionHeader";
import CompaniesClient from "./companiesClient";

export default function CompaniesPage() {
  return (
    <div className="flex flex-col w-full h-full gap-y-2 overflow-hidden">
      <SectionHeader title="SysAdmin · Empresas" />
      <CompaniesClient />
    </div>
  );
}
