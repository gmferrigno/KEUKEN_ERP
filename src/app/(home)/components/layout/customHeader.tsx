'use client';

import { getCustomData } from '@/app/lib/routes/customData';
import { IAppRoute } from '@/app/lib/routes/getRoutes';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import DropDownButton from 'devextreme-react/drop-down-button';
import { useRouter } from 'next/navigation';
import Breadcrumb from './breadcrumb';
import ThemeSwitcher from './themeSwitcher';

interface HeaderProps {
  routes: IAppRoute[];
}

/** DX DropDownButton `render` (alias de `template`): pinta el botón base con tokens propios.
 * `.dx-button-mode-text .dx-icon` hardcodea color en el tema DX; el style inline en el ícono lo gana.
 */
function renderChromeButton(data: { text?: string; icon?: string }) {
  const iconStyle = { color: 'var(--text-variant)' } as const;
  return (
    <div className="flex items-center gap-1.5 text-variant">
      {data.icon ? (
        <i className={`dx-icon dx-icon-${data.icon}`} style={iconStyle} />
      ) : null}
      {data.text ? <span className="truncate max-w-[180px]">{data.text}</span> : null}
      <i className="dx-icon dx-icon-spindown" style={iconStyle} />
    </div>
  );
}

export default function CustomHeader({ routes }: HeaderProps) {
  const router = useRouter();
  const { logout, user, companies, currentCompany, changeCompany } = useAuth();
  const { branches, currentBranch, changeBranch, loadingBranches } = useBranch();

  const customRoutes = routes.map(route => ({
    ...route,
    ...getCustomData(route.routeKey),
  }));

  const hasMultipleCompanies = companies.length > 1;

  const accountMenuItems = [
    { id: 'profile', text: 'Perfil', icon: 'user', hint: 'Ver y editar mi perfil' },
    { id: 'logout', text: 'Cerrar sesión', icon: 'export', hint: 'Cerrar sesión de forma segura' },
  ];

  const renderItemWithHint = (item: any) => (
    <div className="w-full h-full flex items-center gap-2" title={item.hint}>
      {item.icon && <i className={`dx-icon-${item.icon}`} />}
      <span>{item.text}</span>
    </div>
  );

  const handleAccountMenuClick = (e: any) => {
    const item = e.itemData;
    switch (item.id) {
      case 'profile':
        router.push('/users/me');
        break;
      case 'logout':
        logout();
        break;
      default:
        break;
    }
  };

  const companyItems = companies.map(company => ({
    id: company.id,
    text: company.name,
    icon: 'home',
    hint: `Cambiar a la empresa ${company.name}`
  }));

  const handleCompanyClick = (e: any) => {
    const selectedCompany = companies.find(c => c.id === e.itemData.id);
    if (selectedCompany) {
      changeCompany(selectedCompany);
    }
  };

  const branchItems = branches.map(branch => ({
    id: branch.id,
    text: branch.name,
    icon: 'store',
    hint: `Cambiar a la sucursal ${branch.name}`
  }));

  const handleBranchClick = (e: any) => {
    const selectedBranch = branches.find(b => b.id === e.itemData.id);
    if (selectedBranch) {
      changeBranch(selectedBranch);
    }
  };

  return (
    <header className="w-full h-14 bg-secondary-500 border-b border-main/10 flex items-center justify-between px-4 z-20 sticky top-0 left-0 text-variant">
      <div className="flex items-center gap-3 h-full">
        <div className="ml-4">
          <Breadcrumb routes={customRoutes} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <ThemeSwitcher />
        {hasMultipleCompanies ? (
          <DropDownButton
            text={currentCompany?.name || 'Empresa'}
            hint={currentCompany?.name || 'Empresa'}
            icon="home"
            items={companyItems}
            onItemClick={handleCompanyClick}
            stylingMode="text"
            keyExpr="id"
            displayExpr="text"
            useItemTextAsTitle={false}
            itemRender={renderItemWithHint}
            render={renderChromeButton}
            dropDownOptions={{
              width: 240,
              maxHeight: 180,
              wrapperAttr: {
                class: 'popup-menu-container company-dropdown-popup header-dropdown-offset',
              },
            }}
          />
        ) : (
          <div
            className="inline-flex items-center gap-1.5 px-2 py-1 text-sm text-variant/90 select-none"
            title={currentCompany?.name || 'Empresa'}
          >
            <i className="dx-icon-home" style={{ color: 'var(--text-variant)' }} />
            <span className="truncate max-w-[180px]">{currentCompany?.name || 'Empresa'}</span>
          </div>
        )}
        <DropDownButton
          text={loadingBranches ? 'Cargando sucursales...' : (currentBranch?.name || 'Sucursal')}
          hint={currentBranch?.name || 'Sucursal'}
          icon="store"
          items={branchItems}
          onItemClick={handleBranchClick}
          disabled={loadingBranches || branches.length === 0}
          stylingMode="text"
          keyExpr="id"
          displayExpr="text"
          useItemTextAsTitle={false}
          itemRender={renderItemWithHint}
          render={renderChromeButton}
          dropDownOptions={{
            width: 240,
            maxHeight: 180,
            wrapperAttr: {
              class: 'popup-menu-container company-dropdown-popup',
            },
          }}
        />
        <DropDownButton
          text={user?.name || 'Cuenta'}
          icon="user"
          items={accountMenuItems}
          onItemClick={handleAccountMenuClick}
          itemRender={renderItemWithHint}
          useItemTextAsTitle={false}
          displayExpr="text"
          stylingMode="text"
          render={renderChromeButton}
          dropDownOptions={{
            minWidth: 180,
            wrapperAttr: {
              class: 'popup-menu-container header-dropdown-offset',
            },
          }}
        />
      </div>
    </header>
  );
}
