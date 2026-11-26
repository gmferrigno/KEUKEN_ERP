'use client';

import { useRecovery } from "@repo/recovery";
import { useBrand } from '@repo/ui/brand';
import Switch from 'devextreme-react/switch';

export default function CustomFooter() {
  const { brand } = useBrand();
  const { isRecoveryMode, recoveryVisibility, canUseRecovery, toggleRecoveryMode, setRecoveryVisibility } = useRecovery();

  return (
    <footer className="w-full h-8 bg-linear-to-r from-secondary-900 to-secondary-950 border-t border-main/10 flex items-center justify-between px-2 z-50 sticky bottom-0 left-0 relative text-variant">
      <div className="flex items-center gap-2 h-full z-10">
        {canUseRecovery && (
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded border transition-all text-xs ${isRecoveryMode
                ? 'bg-focus-500/10 border-focus-500/30 text-focus-300 font-medium'
                : 'bg-main/5 border-main/10 text-variant/40'
                }`}
              title={isRecoveryMode ? 'Modo papelera activo' : 'Modo papelera inactivo'}
            >
              <i className={`dx-icon-trash text-xs ${isRecoveryMode ? 'text-focus-300' : 'text-variant/40'}`} />
              <span className="text-[10px] select-none">Modo recuperación</span>
              <Switch
                value={isRecoveryMode}
                onValueChanged={(e) => toggleRecoveryMode(e.value)}
                switchedOnText="ON"
                switchedOffText="OFF"
                width={46}
                height={18}
              />
            </div>

            {isRecoveryMode && (
              <div
                className="flex items-center gap-1.5 px-1.5 py-0.5 rounded border transition-all text-xs bg-focus-500/10 border-focus-500/30 text-focus-300 font-medium"
                title="Mostrando únicamente registros eliminados"
              >
                <i className="dx-icon-eyeopen text-xs text-focus-300" />
                <span className="text-[10px] select-none font-semibold">
                  Borrados
                </span>
                <Switch
                  value={false}
                  disabled={true}
                  switchedOnText="TODOS"
                  switchedOffText="BORRADOS"
                  width={72}
                  height={18}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
        <h2 className="text-xs text-dx-text font-medium select-none flex items-center gap-1.5 whitespace-nowrap">
          <span>{brand.name}</span>
          {(brand.id?.toUpperCase() !== 'KEUKEN' && brand.name?.toUpperCase() !== 'KEUKEN') && (
            <span className="opacity-70 text-[11px] font-normal">
              — Powered by Keuken
            </span>
          )}
        </h2>
      </div>

      <div className="flex items-center gap-2 h-full z-10" />
    </footer>
  );
}
