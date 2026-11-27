'use client';

import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { ButtonGroup, Item } from 'devextreme-react/button-group';
import { Behavior, Label, RangeSelector, Scale, Size, SliderMarker } from 'devextreme-react/range-selector';
import { Switch } from 'devextreme-react/switch';
import { useMemo, useState } from 'react';

dayjs.locale('es');

type TViewMode = 'week' | 'month' | 'year';

const VIEW_MODES: { id: TViewMode; text: string; icon: string }[] = [
    { id: 'week', text: 'Semana', icon: 'event' },
    { id: 'month', text: 'Mes', icon: 'calendar' },
    { id: 'year', text: 'Año', icon: 'chart' },
];

const Timeline = () => {
    const [viewMode, setViewMode] = useState<TViewMode>('month');
    const [isLive, setIsLive] = useState(true);

    const now = useMemo(() => new Date(), []);

    const config = useMemo(() => {
        let startValue: Date;
        let tickInterval: any;
        let formatString: string;

        switch (viewMode) {
            case 'week':
                startValue = dayjs(now).subtract(4, 'week').startOf('week').toDate();
                tickInterval = 'week';
                formatString = 'DD MMM';
                break;
            case 'month':
                startValue = dayjs(now).subtract(4, 'month').startOf('month').toDate();
                tickInterval = 'month';
                formatString = 'MMM YYYY';
                break;
            case 'year':
                startValue = dayjs(now).subtract(1, 'year').startOf('year').toDate();
                tickInterval = 'month';
                formatString = 'MMM YYYY';
                break;
            default:
                startValue = dayjs(now).subtract(4, 'month').startOf('month').toDate();
                tickInterval = 'month';
                formatString = 'MMM YYYY';
        }

        return { startValue, endValue: now, tickInterval, formatString };
    }, [viewMode, now]);

    const handleModeChange = (e: any) => {
        if (e.itemData) {
            setViewMode(e.itemData.id);
        }
    };

    return (
        <div className={`w-full mt-2 p-3 backdrop-blur-md border rounded-dx shadow-xl flex flex-col gap-3 transition-all duration-500 ${isLive ? 'bg-green-500/5 border-green-500/20' : 'bg-primary-500/30 border-primary-500/20'
            }`}>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3 pr-6">
                        <span className={`flex size-2 rounded-full  ${isLive ? 'bg-green-500' : 'bg-primary-500'} animate-pulse"`} />
                        <Switch
                            value={isLive}
                            onValueChanged={(e) => setIsLive(e.value)}
                            switchedOnText=""
                            switchedOffText=""
                        />
                    </div>
                </div>

                <ButtonGroup
                    items={VIEW_MODES}
                    keyExpr="id"
                    stylingMode="outlined"
                    selectedItemKeys={[viewMode]}
                    onItemClick={handleModeChange}
                    disabled={isLive}
                    className="!bg-primary-900/40 !rounded-dx overflow-hidden border-primary-500/20 scale-90 origin-right"
                >
                    <Item />
                </ButtonGroup>
            </div>

            {}
            <div className={`w-full transition-opacity duration-500 ${isLive ? 'opacity-40 pointer-events-none grayscale-[0.5]' : 'opacity-100'}`}>
                <RangeSelector
                    id="range-selector"
                    defaultValue={[config.startValue, config.endValue]}
                    theme="generic.dark"
                    margin={{ bottom: 0, top: 0, left: 5, right: 5 }}
                    disabled={isLive}
                >
                    <Size height={80} />
                    <Scale
                        startValue={config.startValue}
                        endValue={config.endValue}
                        tickInterval={config.tickInterval}
                        valueType="datetime"
                    >
                        <Label visible={true} format={config.formatString} topIndent={5} />
                    </Scale>

                    <Behavior
                        snapToTicks={true}
                        animationEnabled={false}
                    />

                    <SliderMarker visible={false} />
                </RangeSelector>
            </div>
        </div>
    );
};

export default Timeline;
