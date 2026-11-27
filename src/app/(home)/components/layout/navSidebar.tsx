'use client';

import { getCustomData, getParentChain, IGNORED_ROUTE_KEYS } from '@/app/lib/routes/customData';
import { IAppRoute } from '@/app/lib/routes/getRoutes';
import { canRenderRoute } from "@repo/access";
import { useAuth } from '@/contexts/AuthContext';
import TextBox from 'devextreme-react/text-box';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';


import { BrandLogo, useBrand } from '@repo/ui/brand';
import { SupportIcon } from '@repo/icons';

const NavSidebar = ({ initialRoutes }: { initialRoutes: IAppRoute[] }) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);
  const [supportPeek, setSupportPeek] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())
  const [searchValue, setSearchValue] = useState<string>('')
  const searchRef = useRef(null)

  const isSidebarExpanded = !isCollapsed || supportPeek;
  const showCollapsedUi = !isSidebarExpanded;

  const { effectiveScopes, companyLicense } = useAuth();
  const { brand } = useBrand();
  const userPermissions: string[] = effectiveScopes;

  const pathname = usePathname();
  const router = useRouter();

  const supportNumber =
    process.env.NEXT_PUBLIC_SUPPORT_CONTACT_NUMBER?.trim() || '';

  const routes = useMemo(() => {
    const routeById = new Map(initialRoutes.map(route => [route.id, route]));

    const filtered = initialRoutes
      .filter(route => {
        if (IGNORED_ROUTE_KEYS.includes(route.routeKey)) return false;
        if (!canRenderRoute(route.path, userPermissions, companyLicense)) return false;
        return true;
      })
      .map(route => {
        const custom = getCustomData(route.routeKey);
        return { ...route, ...custom };
      });

    const allowedIds = new Set(filtered.map(route => route.id));
    const shells: typeof filtered = [];

    filtered.forEach(route => {
      let parentId = route.parentId;
      while (parentId) {
        if (allowedIds.has(parentId)) break;
        const parent = routeById.get(parentId);
        if (!parent) break;
        const custom = getCustomData(parent.routeKey);
        shells.push({
          ...parent,
          ...custom,
          hideMainSubRoute: true,
        });
        allowedIds.add(parent.id);
        parentId = parent.parentId;
      }
    });

    const withShells = [...filtered, ...shells];

    const parentIds = new Set<string>();
    withShells.forEach(route => {
      if (route.parentId) {
        parentIds.add(route.parentId);
      }
    });

    const result = [...withShells];
    withShells.forEach(route => {
      if (parentIds.has(route.id) && route.path && !route.hideMainSubRoute) {
        result.push({
          id: `${route.id}/_main`,
          parentId: route.id,
          path: route.path,
          routeKey: `${route.routeKey}_main`,
          text: route.parentSubText || route.text,
          icon: '',
          position: -1,
        });
      }
    });

    return result;
  }, [initialRoutes, userPermissions, companyLicense]);

  const routeTree = useMemo(() => {
    const items = JSON.parse(JSON.stringify(routes));
    const map: { [key: string]: any } = {};
    items.forEach((item: any) => {
      item.items = [];
      map[item.id] = item;
    });

    const tree: any[] = [];
    items.forEach((item: any) => {
      if (item.parentId && map[item.parentId]) {
        map[item.parentId].items.push(item);
      } else if (!item.parentId) {
        tree.push(item);
      }
    });

    const sortByPosition = (a: any, b: any) => {
      const posA = a.position !== undefined ? a.position : 9999;
      const posB = b.position !== undefined ? b.position : 9999;
      return posA - posB;
    };

    Object.values(map).forEach((node: any) => {
      if (node.items && node.items.length > 0) {
        node.items.sort(sortByPosition);
      }
    });

    tree.sort(sortByPosition);

    return tree;
  }, [routes]);


  const activeRoute = useMemo(() => {
    let bestMatch: IAppRoute | undefined = undefined;
    for (const route of routes) {
      if (!route.path) continue;

      const isMatch =
        pathname === route.path ||
        (route.path !== '/' && pathname.startsWith(route.path.endsWith('/') ? route.path : route.path + '/'));

      if (isMatch) {
        if (
          !bestMatch ||
          route.path.length > bestMatch.path.length ||
          (route.path.length === bestMatch.path.length && route.parentId)
        ) {
          bestMatch = route;
        }
      }
    }
    return bestMatch;
  }, [routes, pathname]);

  const parentChain = useMemo(() => {
    if (!activeRoute) return [];

    const chain: string[] = [];
    let current: IAppRoute | undefined = activeRoute;
    while (current?.parentId) {
      const parent = routes.find(r => r.id === current?.parentId);
      if (parent) {
        chain.push(parent.id);
        current = parent;
      } else {
        break;
      }
    }

    return chain;
  }, [activeRoute, routes]);

  const filteredRouteIds = useMemo(() => {
    if (!searchValue.trim()) return null;
    const lower = searchValue.toLowerCase();
    return routes
      .filter(route =>
        route.text?.toLowerCase().includes(lower) ||
        route.path?.toLowerCase().includes(lower)
      )
      .map(route => route.id)
  }, [searchValue, routes])

  useEffect(() => {
    if (filteredRouteIds && filteredRouteIds.length > 0) {
      const expanded = new Set<string>();
      filteredRouteIds.forEach(id => {
        getParentChain(routes, routes.find(r => r.id === id)).forEach(parentId => expanded.add(parentId));
      });
      setExpandedKeys(expanded);
    } else if (!isCollapsed) {
      const keys = new Set(parentChain)
      if (activeRoute && routes.some(r => r.parentId === activeRoute.id)) {
        keys.add(activeRoute.id)
      }
      setExpandedKeys(keys)
    }
  }, [filteredRouteIds, routes, isCollapsed, parentChain]);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
    if (!isCollapsed) {
      setExpandedKeys(new Set())
      setSearchValue('')
    }
  }

  const toggleSubmenu = (key: string, forceOpen: boolean = false) => {
    setExpandedKeys(prev => {
      const isExpanded = prev.has(key);
      if (forceOpen && isExpanded) return prev;

      const newSet = new Set(prev)
      if (isExpanded) {
        newSet.delete(key)
      } else {
        newSet.add(key)
      }
      return newSet
    })
  }

  const handleNavigation = (route: any) => {
    if (route.items && route.items.length > 0) {
      if (isCollapsed) {
        setIsCollapsed(false)
      }
      toggleSubmenu(route.id, true)
    } else {
      router.push(route.path)
    }
  }

  const handleLogoClick = () => {
    router.push('/')
  }

  const handleLogoMiddleMouseDown = (e: MouseEvent) => {
    if (e.button !== 1) return
    e.preventDefault()
  }

  const handleLogoMiddleClick = (e: MouseEvent) => {
    if (e.button !== 1) return
    e.preventDefault()
    window.open(window.location.href, '_blank', 'noopener,noreferrer')
  }

  const renderMenuItems = (items: any[], level: number = 0) => {
    const filteredItems = items
      .filter(route => {
        if (!filteredRouteIds) return true;
        if (filteredRouteIds.includes(route.id)) return true;
        if (route.items && route.items.some((child: any) => filteredRouteIds.includes(child.id))) return true;
        if (route.items && route.items.some((child: any) => {
          const check = (r: any): boolean => filteredRouteIds.includes(r.id) || (r.items && r.items.some(check));
          return check(child);
        })) return true;
        return false;
      })

    if (filteredRouteIds && filteredItems.length === 0) {
      return (
        <div className="px-4 py-6 text-center text-variant/50 select-none">
          No se encontraron resultados
        </div>
      )
    }

    return filteredItems.map(route => {
      const hasChildren = route.items && route.items.length > 0
      const isExpanded = expandedKeys.has(route.id)
      const uniqueKey = `${route.path}-${level}`
      const isActive = activeRoute?.id === route.id || parentChain.includes(route.id);

      return (
        <div key={uniqueKey}>
          <button
            onClick={() => handleNavigation(route)}
            className={`
              flex items-center gap-2.5 w-full text-left transition-all duration-200 ease-in-out cursor-pointer
              ${showCollapsedUi
                ? `justify-center py-2.5 px-2 text-base hover:bg-variant/10 ${isActive ? 'bg-main/15 text-variant font-semibold' : 'text-variant/80'}`
                : `${level > 0 ? 'py-1.5 text-[13px]' : 'py-2 text-sm'} pr-4 ${isActive || isExpanded
                  ? 'bg-main/15 font-semibold text-variant'
                  : 'hover:bg-variant/10 text-variant/80'
                } ${level > 0 && !isActive
                  ? 'opacity-90 text-focus-500'
                  : ''
                }`
              }
            `}
            style={!showCollapsedUi ? { paddingLeft: `${level * 16 + 16}px` } : undefined}
          >
            {route.icon && level === 0 && showCollapsedUi && (
              <i className={`dx-icon dx-icon-${route.icon} text-lg ${isActive ? 'text-variant font-semibold' : ''}`} />
            )}
            {!showCollapsedUi && <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">{route.text}</span>}
            {hasChildren && !showCollapsedUi && (
              <i
                className={`dx-icon dx-icon-${isExpanded ? 'chevrondown' : 'chevronright'} ml-auto text-[10px] opacity-60 transition-colors`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSubmenu(route.id);
                }}
              />
            )}
          </button>

          {hasChildren && isExpanded && !showCollapsedUi && (
            <div className="bg-main/5 border-l border-main/20 ml-4">{renderMenuItems(route.items, level + 1)}</div>
          )}
        </div>
      )
    })
  }

  return (
    <aside className={`flex flex-col h-screen max-h-screen bg-linear-to-b from-secondary-500 to-secondary-900 transition-[width] shadow-r-lg z-60 duration-300 ease-in-out overflow-hidden text-variant ${showCollapsedUi ? 'w-16' : 'w-60'}`} >

      <div className={`flex items-center justify-between border-b border-main/10 min-h-14 shrink-0 ${showCollapsedUi ? 'px-1 py-3' : 'py-3 px-4'}`}>
        <div
          className="flex items-center cursor-pointer w-full min-w-0"
          onClick={handleLogoClick}
          onMouseDown={handleLogoMiddleMouseDown}
          onAuxClick={handleLogoMiddleClick}
        >
          {showCollapsedUi ? (
            <div className="w-full flex items-center justify-center">
              <BrandLogo
                size={32}
                variant="icon"
                className="w-8 h-8 flex items-center justify-center p-0 text-variant"
              />
            </div>
          ) : (
            <div className="flex items-center w-full min-w-0 pr-1 overflow-hidden">
              {brand.logo.component === brand.icon.component ? (
                <div className="flex items-center gap-2.5 w-full min-w-0 overflow-hidden">
                  <BrandLogo
                    size={28}
                    variant="logo"
                    className="h-7 w-auto shrink-0 text-variant"
                  />
                  <p className="text-[15px] text-left font-semibold tracking-[2px] whitespace-nowrap text-variant">
                    {brand.shortName}
                  </p>
                </div>
              ) : (
                <BrandLogo
                  variant="logo"
                  width="100%"
                  height="auto"
                  className="w-full h-auto max-h-9 object-contain text-variant"
                />
              )}
            </div>
          )}
        </div>

        {!showCollapsedUi && (
          <div className="ml-2 shrink-0">
            <button onClick={toggleSidebar} className="transition-colors p-1.5 hover:bg-main/10 rounded-dx" aria-label="Colapsar menú">
              <i className="dx-icon dx-icon-hidepanel text-xl text-variant" />
            </button>
          </div>
        )}
      </div>


      {showCollapsedUi && (
        <div className="flex justify-center py-1.5">
          <button onClick={toggleSidebar} className="p-1.5 rounded-dx hover:bg-main/10 transition-colors">
            <i className="dx-icon dx-icon-menu text-xl text-variant" />
          </button>
        </div>
      )}


      {!showCollapsedUi && (
        <div className="py-2 px-3 border-b border-main/10 shrink-0">
          <TextBox
            ref={searchRef}
            placeholder="Buscar..."
            stylingMode="filled"
            showClearButton
            value={searchValue}
            onValueChanged={e => setSearchValue(e.value)}
            elementAttr={{
              class: "!bg-variant !text-black !rounded-dx !h-8"
            }}
            inputAttr={{
              class: "!text-black !py-1 !text-sm"
            }}
          />
        </div>
      )}

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 min-h-0">{renderMenuItems(routeTree)}</nav>


      <div
        className={`border-t border-main/10 shrink-0 ${
          showCollapsedUi ? 'p-2 flex justify-center' : 'p-3'
        }`}
        onMouseEnter={() => {
          if (isCollapsed) setSupportPeek(true);
        }}
        onMouseLeave={() => setSupportPeek(false)}
      >
        <div
          title={
            supportNumber
              ? `Soporte: ${supportNumber}`
              : 'Soporte fuera de servicio temporalmente'
          }
          aria-label={
            supportNumber
              ? `Soporte ${supportNumber}`
              : 'Soporte fuera de servicio temporalmente'
          }
          className={`flex items-stretch h-8 gap-1 select-none transition-all duration-300 ease-out ${
            showCollapsedUi ? 'w-8' : 'w-full'
          }`}
        >
          <span className="flex w-8 h-8 shrink-0 items-center justify-center bg-linear-to-br from-focus-100 to-focus-500 text-variant rounded-dx rounded-br-none shadow-sm">
            <SupportIcon size={16} className="text-variant" />
          </span>
          {!showCollapsedUi ? (
            <span
              className={`flex flex-1 min-w-0 items-center px-3 bg-secondary-950 border border-main/20 rounded-dx rounded-bl-none ${
                supportNumber
                  ? 'text-xs font-semibold tabular-nums whitespace-nowrap text-variant'
                  : 'text-[10px] italic leading-tight text-variant/40'
              }`}
            >
              {supportNumber || 'Soporte fuera de servicio temporalmente'}
            </span>
          ) : null}
        </div>
      </div>
    </aside>
  )
}

export default NavSidebar;
