import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

export interface IArticle {
    code: string;
    description: string;
    quantity: string;
    priceUnit: number;
    subTotal: number;
    total: number;
}

export interface IReceiptProps {
    type?: 'A' | 'B' | 'C';
    emissionDate?: string;
    observations?: string;
    homeAddress?: string;
    IVACategory?: string;
    condition?: string;
    channel?: string;
    order?: string;
    preSeller?: number;
    zone?: number;
    locality?: string;
    receiptNumber?: string;
    articles?: IArticle[];
    companyName?: string;
    totalAmount?: number;
    client?: string;
    cuitCDIdni?: string;
    delivery?: number;
    clientHelpCode?: string;
    IVA?: string;
    qrCode?: string;
    packageCount?: number;
    IIBB?: string;
    IVAAmount?: number;
    IIBBAmount?: number;
    totalAmountWT?: number;
    vtoCAE?: string;
    CAE?: string;
    entity?: string;
    requireAccordance?: boolean;
}

const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontSize: 9,
        fontFamily: 'Helvetica',
        color: '#000',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
    },
    header: {
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: '#000',
        height: 100,
        marginTop: 15,
        marginBottom: 5,
    },
    headerLeft: {
        flex: 1,
        padding: 10,
        justifyContent: 'center',
    },
    headerRight: {
        flex: 1,
        padding: 10,
        borderLeftWidth: 1,
        borderLeftColor: '#000',
        justifyContent: 'center',
    },
    typeBox: {
        position: 'absolute',
        top: -15,
        left: '50%',
        marginLeft: -20,
        width: 40,
        height: 40,
        borderWidth: 1,
        borderColor: '#000',
        backgroundColor: '#FFF',
        zIndex: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    typeText: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    receiptCode: {
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 10,
    },
    detailsRow: {
        flexDirection: 'row',
        marginBottom: 0,
        alignItems: 'baseline',
    },
    label: {
        fontWeight: 'bold',
        width: 85,
        fontSize: 6.5,
        color: '#444',
        textTransform: 'uppercase',
    },
    value: {
        flex: 1,
        fontSize: 8,
    },
    metaRow: {
        flexDirection: 'row',
        borderBottomWidth: 0.5,
        borderBottomColor: '#eee',
    },
    metaColumnHalf: {
        flex: 1,
        paddingHorizontal: 10,
        paddingVertical: 1,
    },
    metaColumnFull: {
        flex: 1,
        paddingHorizontal: 10,
        paddingVertical: 1,
    },
    metaDivider: {
        width: 0.5,
        backgroundColor: '#eee',
        height: '100%',
    },
    metaSection: {
        borderWidth: 1,
        borderColor: '#000',
        marginBottom: 5,
    },
    obsSection: {
        borderTopWidth: 0.5,
        borderTopColor: '#000',
        paddingTop: 3,
        paddingHorizontal: 10,
        paddingBottom: 3,
    },
    tableHeader: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        backgroundColor: '#f0f0f0',
        paddingVertical: 4,
        fontWeight: 'bold',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 0.5,
        borderBottomColor: '#eee',
        paddingVertical: 1,
    },
    colCode: { width: '10%', textAlign: 'center', fontSize: 8, },
    colDesc: { width: '50%', textAlign: 'left', paddingLeft: 5, fontSize: 8, },
    colQty: { width: '5%', textAlign: 'center', fontSize: 8, },
    colPrice: { width: '10%', textAlign: 'right', fontSize: 8, },
    colSub: { width: '12.5%', textAlign: 'right', fontSize: 8, },
    colTotal: { width: '12.5%', textAlign: 'right', paddingRight: 5, fontSize: 8, },

    pageNumberContainer: {
        position: 'absolute',
        right: 10,
        bottom: 5,
        alignItems: 'flex-end',
    },
    pageCounter: {
        fontSize: 7,
        color: '#666',
    },
    summarySection: {
        marginTop: 'auto', // Esto empuja el footer al fondo si el contenedor tiene flex
        paddingTop: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    footerWrapper: {
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#000',
        paddingTop: 5,
    },
    footerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    qrBox: {
        width: 60,
        height: 60,
    },
    footerInfo: {
        fontSize: 7,
        color: '#444',
    },
    summaryDetails: {
        width: 180,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 2,
    },
    totalLabel: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    totalValue: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    stubSection: {
        marginTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#000',
        borderTopStyle: 'dashed',
        paddingTop: 10,
    },
    stubHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    signatureRow: {
        marginTop: 30,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    signatureBox: {
        width: '40%',
        borderTopWidth: 1,
        borderTopColor: '#000',
        alignItems: 'center',
        paddingTop: 5,
    },
});

const PRODUCTS = [
    { desc: 'GALLETITAS OREO REGULAR 354GR', price: 2100.50, code: '76223007' },
    { desc: 'GALLETITAS PEPITOS ORIGINAL 357GR', price: 1950.00, code: '76223008' },
    { desc: 'GALLETITAS TERRABUSI VARIEDAD 400GR', price: 1800.25, code: '76223009' },
    { desc: 'CHOCOLATE MILKA LECHE 155GR', price: 3200.75, code: '76223010' },
    { desc: 'ALFAJOR TERRABUSI TORTA 70GR', price: 950.00, code: '76223011' },
    { desc: 'MANTECOL CLASICO 250GR', price: 2800.50, code: '76223012' },
    { desc: 'JUGO EN POLVO TANG NARANJA 18GR', price: 350.00, code: '76223013' },
    { desc: 'JUGO EN POLVO CLIGHT MANZANA 8GR', price: 380.40, code: '76223014' },
    { desc: 'CHICLES BELDENT MENTOL SIN AZUCAR', price: 650.20, code: '76223015' },
    { desc: 'GALLETITAS CLUB SOCIAL ORIGINAL 141GR', price: 1100.00, code: '76223016' },
    { desc: 'GALLETITAS CEREAL MIX AVENA Y PASAS', price: 1400.30, code: '76223017' },
    { desc: 'BOCADITO CABSHA ESTUCHE 200GR', price: 4500.00, code: '76223018' },
    { desc: 'GALLETITAS RHODESIA PACK X4', price: 1750.50, code: '76223019' },
    { desc: 'GALLETITAS TITA PACK X6', price: 2200.00, code: '76223020' },
    { desc: 'POSTRE ROYAL VAINILLA 100GR', price: 850.75, code: '76223021' }
];

const generateArticles = (quantity: number) => {
    const articles: IArticle[] = [];
    for (let i = 0; i < quantity; i++) {
        const product = PRODUCTS[i % PRODUCTS.length];
        const qty = Math.floor(Math.random() * 12) + 1;
        const subTotal = product.price * qty;
        articles.push({
            code: product.code,
            description: `${product.desc} ${i % 3 === 0 ? '- PROMOCION' : ''}`,
            quantity: qty.toString(),
            priceUnit: product.price,
            subTotal: subTotal,
            total: subTotal,
        });
    }
    return articles;
};

const defaultProps: IReceiptProps = {
    type: 'A',
    emissionDate: new Date().toLocaleDateString(),
    observations: 'Entrega en puerta trasera de lunes a viernes de 08:00 a 14:00. Por favor verificar que los bultos no presenten roturas antes de firmar el remito/conformidad de entrega.',
    client: "(15847) ECONORTESHOP S.A",
    homeAddress: 'Av. Corrientes 1234, CABA, Argentina',
    IVACategory: 'Responsable Inscripto',
    condition: 'Contado NETO - 7 Días',
    channel: "MINORISTA",
    order: "REQ-958432-B",
    preSeller: 564,
    zone: 256,
    delivery: 5069,
    locality: 'MAQUINISTA SAVIO',
    receiptNumber: '0011-0097330',
    companyName: 'AG DISTRIBUCIONES S.A.',
    articles: [],
    cuitCDIdni: '20-12345678-9',
    qrCode: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    packageCount: 2,
    clientHelpCode: '123456789',
    IVA: '21%',
    IIBB: '3.5%',
    IVAAmount: 4250.75,
    IIBBAmount: 720.30,
    totalAmount: 25420.50,
    totalAmountWT: 20449.45,
    vtoCAE: '22/02/2026',
    CAE: '74125896301245',
    entity: 'ORIGINAL',
    requireAccordance: false,
};


export const getCopiesTitles = (copies: number) => {
    const titles: string[] = ['ORIGINAL', 'DUPLICADO', 'TRIPLICADO'];
    return titles.slice(0, Math.min(copies, titles.length));
};



const ARTICLES_PER_PAGE = 40;
const MIN_SPACE_FOR_STUB = 20;


export const ReceiptPage = (props: IReceiptProps) => {
    const data = { ...defaultProps, ...props };
    const articles = data.articles || [];
    const lastArticlePage = Math.ceil(articles.length / ARTICLES_PER_PAGE);

    const articlesInLastPage = articles.length % ARTICLES_PER_PAGE || (articles.length > 0 ? ARTICLES_PER_PAGE : 0);
    const shouldBreakStub = props.requireAccordance && (articlesInLastPage > (ARTICLES_PER_PAGE - MIN_SPACE_FOR_STUB));

    return (
        <Page size="A4" style={styles.page}>

            <View fixed={true} render={({ subPageNumber }) => {
                if (subPageNumber > lastArticlePage) return null;
                return (
                    <>

                        <View style={styles.typeBox}>
                            <Text style={styles.typeText}>{data.type}</Text>
                        </View>


                        <View style={styles.header}>
                            <View style={styles.headerLeft}>
                                <Text style={styles.title}>{data.companyName}</Text>
                                <Text>{data.homeAddress}</Text>
                                <Text style={{ marginTop: 5 }}>IVA {data.IVACategory}</Text>
                                <Text style={{ marginTop: 5 }}>CUIT/CDI/DNI: {data.cuitCDIdni}</Text>
                            </View>
                            <View style={styles.headerRight}>
                                <Text style={{ fontSize: 14, fontWeight: 'bold' }}>FACTURA</Text>
                                <Text style={styles.receiptCode}>Nº {data.receiptNumber}</Text>
                                <Text style={{ marginTop: 5 }}>Fecha: {data.emissionDate}</Text>
                            </View>
                        </View>


                        <View style={styles.metaSection}>

                            <View style={styles.metaRow}>
                                <View style={styles.metaColumnHalf}>
                                    <View style={styles.detailsRow}><Text style={styles.label}>Cliente:</Text><Text style={styles.value}>{data.client}</Text></View>
                                </View>
                                <View style={styles.metaDivider} />
                                <View style={styles.metaColumnHalf}>
                                    <View style={styles.detailsRow}><Text style={styles.label}>Preventista:</Text><Text style={styles.value}>{data.preSeller}</Text></View>
                                </View>
                            </View>


                            <View style={styles.metaRow}>
                                <View style={styles.metaColumnHalf}>
                                    <View style={styles.detailsRow}><Text style={styles.label}>Domicilio:</Text><Text style={styles.value}>{data.homeAddress}</Text></View>
                                </View>
                                <View style={styles.metaDivider} />
                                <View style={styles.metaColumnHalf}>
                                    <View style={styles.detailsRow}><Text style={styles.label}>Localidad:</Text><Text style={styles.value}>{data.locality}</Text></View>
                                </View>
                            </View>


                            <View style={styles.metaRow}>
                                <View style={styles.metaColumnHalf}>
                                    <View style={styles.detailsRow}><Text style={styles.label}>Catg. IVA:</Text><Text style={styles.value}>{data.IVACategory}</Text></View>
                                </View>
                                <View style={styles.metaDivider} />
                                <View style={styles.metaColumnHalf}>
                                    <View style={styles.detailsRow}><Text style={styles.label}>Condición:</Text><Text style={styles.value}>{data.condition}</Text></View>
                                </View>
                            </View>


                            <View style={styles.metaRow}>
                                <View style={styles.metaColumnHalf}>
                                    <View style={styles.detailsRow}><Text style={styles.label}>Canal:</Text><Text style={styles.value}>{data.channel}</Text></View>
                                </View>
                                <View style={styles.metaDivider} />
                                <View style={styles.metaColumnHalf}>
                                    <View style={styles.detailsRow}><Text style={styles.label}>Reparto:</Text><Text style={styles.value}>{data.delivery}</Text></View>
                                </View>
                            </View>


                            <View style={styles.metaRow}>
                                <View style={styles.metaColumnHalf}>
                                    <View style={styles.detailsRow}><Text style={styles.label}>Zona:</Text><Text style={styles.value}>{data.zone}</Text></View>
                                </View>
                                <View style={styles.metaDivider} />
                                <View style={styles.metaColumnHalf}>
                                    <View style={styles.detailsRow}><Text style={styles.label}>Pedido:</Text><Text style={styles.value}>{data.order}</Text></View>
                                </View>
                            </View>

                            <View style={styles.obsSection}>
                                {data.observations && (
                                    <View style={{ paddingRight: 60 }}>
                                        <Text style={styles.label}>OBSERVACIONES:</Text>
                                        <Text style={{ fontSize: 8, marginTop: 2 }}>{data.observations}</Text>
                                    </View>
                                )}
                                <View style={styles.pageNumberContainer} fixed>
                                    <Text style={[styles.label, { width: 'auto', marginBottom: 2 }]}>Página</Text>
                                    <Text
                                        style={styles.pageCounter}
                                        render={({ subPageNumber, subPageTotalPages }) => (
                                            `${subPageNumber} / ${shouldBreakStub ? subPageTotalPages - 1 : subPageTotalPages}`
                                        )}
                                    />
                                </View>
                            </View>
                        </View>
                    </>
                )
            }} />



            <View style={styles.tableHeader}>
                <Text style={styles.colCode}>Cod.Art.</Text>
                <Text style={styles.colDesc}>Descripción</Text>
                <Text style={styles.colQty}>Cant.</Text>
                <Text style={styles.colPrice}>Unit.</Text>
                <Text style={styles.colSub}>Subt.</Text>
                <Text style={styles.colTotal}>Total</Text>
            </View>

            {articles.map((art, idx) => (
                <View
                    key={idx}
                    style={[
                        styles.tableRow,
                        idx % 2 !== 0 ? { backgroundColor: '#f9f9f9' } : {}
                    ]}
                    break={idx > 0 && idx % ARTICLES_PER_PAGE === 0}
                >
                    <Text style={styles.colCode}>{art.code}</Text>
                    <Text style={styles.colDesc}>{art.description}</Text>
                    <Text style={styles.colQty}>{art.quantity}</Text>
                    <Text style={styles.colPrice}>{art.priceUnit.toFixed(2)}</Text>
                    <Text style={styles.colSub}>{art.subTotal.toFixed(2)}</Text>
                    <Text style={styles.colTotal}>{art.total.toFixed(2)}</Text>
                </View>
            ))}



            <View fixed={true} style={styles.summarySection} render={(args: any) => {
                const { subPageNumber, subPageTotalPages } = args;
                if (subPageNumber > lastArticlePage) return null;
                const isLastFooterPage = subPageNumber === (shouldBreakStub ? subPageTotalPages - 1 : subPageTotalPages);
                return (
                    <View style={styles.metaColumnFull}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#000', paddingTop: 5 }}>

                            <View style={styles.footerLeft}>
                                {data.qrCode && (
                                    <Image
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(data.qrCode)}`}
                                        style={styles.qrBox}
                                    />
                                )}
                                <View style={styles.footerInfo}>
                                    <Text style={styles.title}>{data.entity}</Text>
                                    <Text style={{ marginTop: 2 }}>Controle su mercaderia.</Text>
                                    <Text style={{ marginTop: 2 }}>Atención al cliente: {data.clientHelpCode}</Text>
                                    <Text>Vto. CAE: {data.vtoCAE}</Text>
                                    <Text>C.A.E: {data.CAE}</Text>
                                    <Text>Bultos: {data.packageCount}</Text>
                                </View>
                            </View>


                            <View style={styles.footerInfo}>
                                {(
                                    <>
                                        <View style={styles.summaryRow}>
                                            <Text style={styles.label}>Neto:</Text>
                                            <Text style={styles.totalValue}>$ {isLastFooterPage ? data.totalAmountWT?.toFixed(2) : '-'}</Text>
                                        </View>

                                        <View style={[styles.summaryRow, { borderTopWidth: 0.5, borderTopColor: '#eee', marginTop: 1, paddingTop: 3 }]}>
                                            <Text style={styles.label}>IVA ({isLastFooterPage ? data.IVA : '-'}):</Text>
                                            <Text style={styles.totalValue}>$ {isLastFooterPage ? data.IVAAmount?.toFixed(2) : '-'}</Text>
                                        </View>

                                        {data.IIBBAmount && data.IIBBAmount > 0 && (
                                            <View style={[styles.summaryRow, { borderTopWidth: 0.5, borderTopColor: '#eee', marginTop: 1, paddingTop: 3 }]}>
                                                <Text style={styles.label}>Percep.IIBB ({isLastFooterPage ? data.IIBB : '-'}):</Text>
                                                <Text style={styles.totalValue}>$ {isLastFooterPage ? data.IIBBAmount?.toFixed(2) : '-'}</Text>
                                            </View>
                                        )}

                                        <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: '#000', marginTop: 4, paddingTop: 5 }]}>
                                            <Text style={styles.totalLabel}>TOTAL:</Text>
                                            <Text style={styles.totalValue}>$ {isLastFooterPage ? data.totalAmount?.toFixed(2) : '-'}</Text>
                                        </View>
                                    </>
                                )}
                            </View>
                        </View>
                        <View style={{ marginTop: 10, fontSize: 8, color: '#666' }}>
                            <Text>{data.entity} - Comprobante generado por sistema ERP Keuken S.A</Text>
                        </View>
                    </View>
                )
            }} />

            {data.requireAccordance && (
                <View wrap={true} break={shouldBreakStub} style={shouldBreakStub ? { position: 'relative', minHeight: '100%' } : {}}>

                    <View
                        style={[
                            styles.stubSection,
                            shouldBreakStub
                                ? { position: 'absolute', top: 0, left: 0, right: 0, borderTopWidth: 0, marginTop: 0 }
                                : { marginTop: 10 }
                        ]}
                        wrap={false}
                    >

                        <View style={styles.stubHeader}>
                            <View>
                                <Text style={styles.title}>{data.receiptNumber}</Text>
                                <Text>DIRECCION: {data.homeAddress}</Text>
                                <Text style={{ marginTop: 2 }}>LOCALIDAD: {data.locality}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ fontSize: 10, fontWeight: 'bold' }}>TALON DE CONFORMIDAD</Text>
                                <Text style={{ marginTop: 2 }}>Fecha: {data.emissionDate}</Text>
                                <Text style={{ marginTop: 2, fontWeight: 'bold' }}>Total: {data.totalAmount}</Text>

                            </View>
                        </View>


                        <View style={styles.metaSection}>
                            <View style={styles.metaRow}>
                                <View style={styles.metaColumnHalf}>
                                    <View style={styles.detailsRow}><Text style={styles.label}>Cliente:</Text><Text style={styles.value}>{data.client}</Text></View>
                                </View>
                                <View style={styles.metaDivider} />
                                <View style={styles.metaColumnHalf}>
                                    <View style={styles.detailsRow}><Text style={styles.label}>CUIT:</Text><Text style={styles.value}>{data.cuitCDIdni}</Text></View>
                                </View>
                            </View>
                            <View style={styles.metaRow}>
                                <View style={styles.metaColumnHalf}>
                                    <View style={styles.detailsRow}><Text style={styles.label}>Vendedor:</Text><Text style={styles.value}>{data.preSeller}</Text></View>
                                </View>
                                <View style={styles.metaDivider} />
                                <View style={styles.metaColumnHalf}>
                                    <View style={styles.detailsRow}><Text style={styles.label}>Condicion:</Text><Text style={styles.value}>{data.condition}</Text></View>
                                </View>
                            </View>
                            <View style={styles.metaRow}>
                                <View style={styles.metaColumnHalf}>
                                    <View style={styles.detailsRow}><Text style={styles.label}>Reparto:</Text><Text style={styles.value}>{data.delivery}</Text></View>
                                </View>
                                <View style={styles.metaDivider} />
                                <View style={styles.metaColumnHalf}>
                                    <View style={styles.detailsRow}><Text style={styles.label}>Pedido:</Text><Text style={styles.value}>{data.order}</Text></View>
                                </View>
                            </View>
                            <View style={[styles.metaRow, { borderBottomWidth: 0, marginBottom: 25 }]}>
                                <View style={[styles.metaColumnFull, { borderTopWidth: 0.5, borderTopColor: '#000', paddingTop: 5 }]}>
                                    <Text style={styles.label}>Observaciones</Text>
                                </View>
                            </View>
                        </View>


                        <View style={styles.signatureRow}>
                            <View style={styles.signatureBox}>
                                <Text style={{ fontSize: 8, marginTop: 2 }}>Firma</Text>
                            </View>
                            <View style={styles.signatureBox}>
                                <Text style={{ fontSize: 8, marginTop: 2 }}>Aclaración</Text>
                            </View>
                        </View>
                    </View>

                </View>
            )}
        </Page>
    );
};


const ReceiptTemplate = (props: IReceiptProps) => {
    const articles = generateArticles(Math.floor(Math.random() * 100) + 1)
    return (
        <Document title={`Factura`}>
            <ReceiptPage {...props} articles={articles} />
        </Document>
    );
};


export const BatchReceiptTemplate = ({ invoices, copies }: { invoices: IReceiptProps[], copies: number }) => {
    return (
        <Document title="Lote de Facturas">
            {invoices.map((invoice, index) => {
                const copyTitles = getCopiesTitles(copies);
                const randomQty = Math.floor(Math.random() * 85) + 1;
                const articles = generateArticles(randomQty);
                return copyTitles.map((title, copyIndex) => {
                    return <ReceiptPage key={`${index}-${copyIndex}`} {...invoice} articles={articles} entity={title} />
                })
            })}
        </Document>
    );
};

export default ReceiptTemplate;

