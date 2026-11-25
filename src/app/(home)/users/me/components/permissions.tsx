'use client';

import {
    permissionsConfig,
    TFPermissionsConfig,
    TPermissionAction,
} from '@repo/access';
import { useAuth } from '@/contexts/AuthContext';
import { CheckBox } from 'devextreme-react/check-box';
import { ScrollView } from 'devextreme-react/scroll-view';

const ACTION_HEADERS: { key: TPermissionAction; label: string }[] = [
    { key: 'view', label: 'Ver' },
    { key: 'modify', label: 'Modificar' },
    { key: 'extract', label: 'Extraer' },
];

const Permissions = () => {
    const { permissions } = useAuth();
    const effectivePermissions: TFPermissionsConfig =
        permissions ?? permissionsConfig;

    return (
        <div className="w-full h-full flex flex-col relative overflow-hidden bg-primary-900/50 rounded-dx border border-main/5 shadow-inner-lg">
            <div className="flex flex-col justify-between p-4 bg-primary-500/80 border-b border-main/10">
                <div className="flex items-center gap-3 mb-4">
                    <i className="dx-icon dx-icon-key text-focus-300 text-xl rotate-270" />
                    <h2 className="text-lg font-semibold">Tus Permisos</h2>
                </div>
                <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-6">
                        <div className="text-main/60 text-xs uppercase pl-2">
                            Módulo / Sección
                        </div>
                    </div>
                    <div className="col-span-6 flex justify-end gap-12 pr-6">
                        {ACTION_HEADERS.map((header) => (
                            <div
                                key={header.key}
                                className="text-main/60 text-xs uppercase w-20 text-center font-semibold tracking-wider"
                            >
                                {header.label}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="flex-1 min-h-0 relative">
                <ScrollView height="100%" showScrollbar="onHover">
                    <div className="flex flex-col gap-2 p-4">
                        {Object.entries(permissionsConfig)
                            .filter(([, config]) => !!config)
                            .map(([key, config]) => {
                                const routePermissions =
                                    effectivePermissions[
                                        key as keyof TFPermissionsConfig
                                    ]?.actions || {};

                                return (
                                    <div
                                        key={key}
                                        className="grid grid-cols-12 gap-2 items-center p-3 rounded-dx bg-primary-500/30 border border-main/5 hover:bg-main/5 transition-all group"
                                    >
                                        <div className="col-span-6">
                                            <p className="text-sm font-medium group-hover:text-focus-500 transition-colors">
                                                {config.label}
                                            </p>
                                        </div>
                                        <div className="col-span-6 flex justify-end gap-12 pr-6">
                                            {ACTION_HEADERS.map((action) => {
                                                const actionValue =
                                                    routePermissions[action.key];
                                                const isActionDisabled =
                                                    actionValue === null;

                                                return (
                                                    <div
                                                        key={action.key}
                                                        className="w-20 flex justify-center"
                                                    >
                                                        <CheckBox
                                                            disabled={true}
                                                            value={
                                                                actionValue === null
                                                                    ? false
                                                                    : actionValue
                                                            }
                                                            className={
                                                                isActionDisabled
                                                                    ? 'opacity-10'
                                                                    : ''
                                                            }
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </ScrollView>
            </div>
        </div>
    );
};

export default Permissions;
