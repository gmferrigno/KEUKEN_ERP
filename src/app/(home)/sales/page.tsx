import SectionHeader from '../components/section/sectionHeader';
import { Metadata } from 'next';
import PosClient from './posClient';

export const metadata: Metadata = {
    title: 'Punto de Venta',
};

export default function SalesPosPage() {
    return (
        <div className="flex flex-col w-full h-full gap-y-2 overflow-hidden">
            <SectionHeader title="Punto de Venta" />
            <div className="flex-1 flex flex-col min-h-0">
                <PosClient />
            </div>
        </div>
    );
}
