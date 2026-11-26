import SectionHeader from '../../components/section/sectionHeader';
import Permissions from '@repo/domain-ui/users/me/permissions';
import MeClient from '@repo/domain-ui/users/me/profile';

export default function Me() {
  return (
    <div className="flex flex-col w-full h-full gap-y-2 overflow-hidden">
      <SectionHeader title="Mi Perfil" />
      <div className="flex-1 min-h-0 flex gap-1 overflow-hidden">
        <div className="flex-[2] h-full w-full overflow-auto">
          <MeClient />
        </div>
        <div className="flex-[3] h-full w-full overflow-auto">
          <Permissions />
        </div>
      </div>
    </div>
  );
}
