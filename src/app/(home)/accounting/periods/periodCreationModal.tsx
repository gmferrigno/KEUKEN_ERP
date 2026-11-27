import { periodsService } from '@repo/erp-services/accountant/periods.service';
import { IFPeriod } from "@repo/api-contracts/erp";
import { useAuth } from '@/contexts/AuthContext';
import Form, { ButtonItem, GroupItem, Item } from 'devextreme-react/form';
import { Popup } from 'devextreme-react/popup';
import notify from 'devextreme/ui/notify';
import { useEffect, useRef, useState } from 'react';

interface PeriodCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onHidden?: () => void;
    onSuccess: () => void;
    initialData?: IFPeriod | null;
}

const PeriodCreationModal = ({ isOpen, onClose, onHidden, onSuccess, initialData }: PeriodCreationModalProps) => {
    const { token, currentCompany } = useAuth();
    const formRef = useRef<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    name: initialData.name,
                    state: initialData.state,
                });
            } else {
                setFormData({
                    name: '',
                    dateStart: null,
                    dateStop: null,
                    isOpeningPeriod: false,
                    state: 'open'
                });
            }
        }
    }, [isOpen, initialData]);

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        const formInstance = formRef.current?.instance();
        const isValid = formInstance?.validate().isValid;
        if (!isValid) return;

        const currentFormData = formInstance?.option("formData");

        setIsLoading(true);
        try {
            if (!currentCompany) throw new Error("Compañía no seleccionada");

            if (initialData) {
                await periodsService.update(initialData.id, {
                    name: currentFormData.name,
                    state: currentFormData.state,
                }, token, currentCompany.id);
                notify('Periodo actualizado exitosamente', 'success', 3000);
            } else {
                const formatDate = (date: Date) => {
                    const d = new Date(date);
                    const month = '' + (d.getMonth() + 1);
                    const day = '' + d.getDate();
                    const year = d.getFullYear();

                    return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
                };

                await periodsService.create({
                    name: currentFormData.name,
                    dateStart: formatDate(currentFormData.dateStart),
                    dateStop: formatDate(currentFormData.dateStop),
                    isOpeningPeriod: currentFormData.isOpeningPeriod,
                }, token, currentCompany.id);
                notify('Periodo creado exitosamente', 'success', 3000);
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Error saving period:", error);
            const errorMessage = error instanceof Error && error.message
                ? error.message
                : 'Error al guardar el periodo';
            notify(errorMessage, 'error', 3000);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Popup
            visible={isOpen}
            onHiding={onClose}
            onHidden={onHidden}
            onShown={(e) => {
                e.component.repaint();
            }}
            dragEnabled={false}
            hideOnOutsideClick={true}
            showCloseButton={true}
            showTitle={true}
            title={initialData ? "Editar Periodo" : "Nuevo Periodo"}
            width={500}
            height="auto"
            wrapperAttr={{ class: "rounded-dx" }}
        >
            <form onSubmit={handleSubmit} className="p-4">
                <Form
                    ref={formRef}
                    formData={formData}
                    labelLocation="top"
                    showColonAfterLabel={false}
                >
                    <GroupItem>
                        <Item
                            dataField="name"
                            label={{ text: "Nombre" }}
                            editorOptions={{ placeholder: "Ej. Enero 2026" }}
                            isRequired={true}
                        />

                        {!initialData ? (
                            <>
                                <Item
                                    dataField="dateStart"
                                    editorType="dxDateBox"
                                    label={{ text: "Fecha Inicio" }}
                                    editorOptions={{
                                        displayFormat: "dd/MM/yyyy",
                                        useMaskBehavior: true
                                    }}
                                    isRequired={true}
                                />
                                <Item
                                    dataField="dateStop"
                                    editorType="dxDateBox"
                                    label={{ text: "Fecha Fin" }}
                                    editorOptions={{
                                        displayFormat: "dd/MM/yyyy",
                                        useMaskBehavior: true
                                    }}
                                    isRequired={true}
                                />
                                <Item
                                    dataField="isOpeningPeriod"
                                    editorType="dxCheckBox"
                                    label={{ text: "Es periodo de apertura", visible: false }}
                                    editorOptions={{
                                        text: "Es periodo de apertura"
                                    }}
                                />
                            </>
                        ) : null}

                        {initialData ? (
                            <Item
                                dataField="state"
                                editorType="dxSelectBox"
                                label={{ text: "Estado" }}
                                editorOptions={{
                                    items: [
                                        { id: 'open', name: 'Abierto' },
                                        { id: 'closed', name: 'Cerrado' }
                                    ],
                                    valueExpr: 'id',
                                    displayExpr: 'name'
                                }}
                                isRequired={true}
                            />
                        ) : null}
                    </GroupItem>
                    <ButtonItem
                        horizontalAlignment="right"
                        buttonOptions={{
                            text: isLoading ? "Guardando..." : "Guardar",
                            type: "default",
                            useSubmitBehavior: true,
                            disabled: isLoading
                        }}
                    />
                </Form>
            </form>
        </Popup>
    );
};

export default PeriodCreationModal;
