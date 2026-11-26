import { getCustomData } from "@/app/lib/routes/customData";
import { IAppRoute } from "@/app/lib/routes/getRoutes";
import React from "react";
import SectionItem from "./sectionItem";


interface ISectionContainerProps {
    title: string;
    items: IAppRoute[];
    iconRight?: React.ReactNode;
    childrenClassName?: string;
}

const SectionContainer: React.FC<ISectionContainerProps> = ({
    title,
    items,
    iconRight,
    childrenClassName = "",
}) => (
    <div className="bg-primary-500/70 backdrop-blur-xl border border-main/5 rounded-dx p-6 shadow-md w-full h-full">
        <div className="flex items-center justify-between mb-2">
            <span className="text-2xl font-normal text-main">{title}</span>
            {iconRight}
        </div>
        <div className="border-b border-main/40 mb-4" />
        <div className={childrenClassName}>
            {items.map((item, idx) => (
                <SectionItem label={getCustomData(item.routeKey).text} key={item.id + idx} path={item.path} />
            ))}
        </div>
    </div>
);

export default SectionContainer;