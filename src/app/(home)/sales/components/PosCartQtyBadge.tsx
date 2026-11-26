type PosCartQtyBadgeProps = {
    qty: number;
};

const PosCartQtyBadge = ({ qty }: PosCartQtyBadgeProps) => {
    if (qty <= 0) return null;
    return (
        <span
            className="absolute top-1.5 right-1.5 min-w-[1.35rem] h-5 px-1.5 rounded-full bg-focus-500 text-white text-[10px] font-semibold inline-flex items-center justify-center"
            title={`${qty} en el carrito`}
        >
            {qty}
        </span>
    );
};

export default PosCartQtyBadge;
