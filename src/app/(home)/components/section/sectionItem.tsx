import Link from "next/link";
import React from "react";

interface ISectionItemProps {
    label: string;
    path: string;
}

const SectionItem: React.FC<ISectionItemProps> = ({ label, path }) => (
    <div className="flex items-center justify-between bg-primary-900 rounded-dx px-6 py-4 min-w-0">
        <span className="text-lg truncate min-w-0 flex-1 mr-2 text-main" title={label}>
            {label}
        </span>
        <Link
            className="bg-linear-to-tr from-focus-500 to-focus-100 rounded-dx w-10 h-10 flex flex-shrink-0 items-center justify-center ml-3 cursor-pointer transition-all duration-200 ease-in-out hover:scale-110"
            href={path}
            onClick={(e) => {
                if (path === "#") {
                    e.preventDefault();
                }
            }}
            aria-label={path === "#" ? "Más elementos" : `Ir a ${label}`}
        >
            <img
                src="/diagonal_arrow_right_up.svg"
                alt=""
                className="w-6 h-6"
                style={{ filter: "invert(1)" }}
            />
        </Link>
    </div>
);

export default SectionItem;