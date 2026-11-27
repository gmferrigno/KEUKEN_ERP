
const SubdivisionGrid = ({ rows, cols }: { rows: number; cols: number }) => (
    <div className="relative aspect-square w-full bg-primary-900/60 rounded-dx border border-main/5 overflow-hidden p-2 flex items-center justify-center group/grid">
        <div
            className="grid gap-0.5 w-full h-full"
            style={{
                gridTemplateRows: `repeat(${rows}, 1fr)`,
                gridTemplateColumns: `repeat(${cols}, 1fr)`
            }}
        >
            {Array.from({ length: rows * cols }).map((_, i) => {
                const r = Math.floor(i / cols) + 1;
                const c = (i % cols) + 1;
                return (
                    <div
                        key={i}
                        className="relative border border-dashed border-green-400/60 bg-green-400/20 flex items-center justify-center transition-all"
                    >
                        <span className="text-[7px] text-main/20 font-bold uppercase pointer-events-none group-hover/grid:opacity-100 opacity-0 transition-opacity">
                            {r}-{c}
                        </span>
                    </div>
                );
            })}
        </div>
    </div>
);

export default SubdivisionGrid;
