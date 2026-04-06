import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Sale, UserSettings, OperationType, FirestoreErrorInfo } from './types';
import { auth } from './firebase';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const normalizeName = (name: string) => {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const downloadReceiptPDF = (sale: Sale, settings: UserSettings | null) => {
  const doc = new jsPDF();
  const businessName = settings?.businessName || 'TruffleTech';
  const businessPhone = settings?.businessPhone || '';
  const date = format(sale.date.toDate(), 'dd/MM/yyyy HH:mm');
  const transactionId = sale.id.slice(-8).toUpperCase();

  const subtotal = sale.totalPrice + sale.discount;
  const originalUnitPrice = subtotal / sale.quantity;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(businessName, 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150);
  doc.text('COMPROVANTE DE VENDA', 105, 28, { align: 'center' });

  // Info Grid
  doc.setDrawColor(200);
  doc.line(20, 35, 190, 35);

  doc.setTextColor(0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('DATA/HORA:', 20, 45);
  doc.text('ID TRANS.:', 105, 45);
  
  doc.setFont('helvetica', 'normal');
  doc.text(date, 45, 45);
  doc.text(`#${transactionId}`, 125, 45);

  doc.setFont('helvetica', 'bold');
  doc.text('CLIENTE:', 20, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(sale.customerName || 'Consumidor Final', 45, 52);

  // Items Table
  const tableBody: any[][] = [
    [
      { 
        content: `${sale.truffleName}\n${sale.quantity} un. x R$ ${originalUnitPrice.toFixed(2)}`,
        styles: { fontStyle: 'bold' } 
      },
      `R$ ${subtotal.toFixed(2)}`
    ]
  ];

  if (sale.discount > 0) {
    tableBody.push([
      { 
        content: `   DESCONTO APLICADO`,
        styles: { fontStyle: 'italic', textColor: [100, 100, 100] } 
      },
      `(- R$ ${sale.discount.toFixed(2)})`
    ]);
  }

  autoTable(doc, {
    startY: 65,
    head: [['ITEM / DESCRIÇÃO', 'VALOR']],
    body: tableBody,
    theme: 'plain',
    headStyles: { 
      fillColor: [255, 255, 255], 
      textColor: [0, 0, 0], 
      fontStyle: 'bold',
      lineWidth: 0.1,
      lineColor: [200, 200, 200]
    },
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 4 },
    columnStyles: {
      1: { halign: 'right' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Summary Section
  doc.setDrawColor(200);
  doc.line(120, finalY, 190, finalY);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('SUBTOTAL:', 120, finalY + 10);
  doc.text(`R$ ${subtotal.toFixed(2)}`, 190, finalY + 10, { align: 'right' });

  if (sale.discount > 0) {
    doc.text('DESCONTO:', 120, finalY + 16);
    doc.text(`- R$ ${sale.discount.toFixed(2)}`, 190, finalY + 16, { align: 'right' });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('TOTAL:', 120, finalY + 26);
  doc.text(`R$ ${sale.totalPrice.toFixed(2)}`, 190, finalY + 26, { align: 'right' });

  if (sale.paidAmount > 0 && sale.status === 'paid') {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('PAGAMENTO TOTAL REALIZADO', 120, finalY + 34);
  } else if (sale.paidAmount > 0 && sale.status === 'pending') {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('VALOR PAGO ATÉ O MOMENTO:', 120, finalY + 34);
    doc.text(`R$ ${sale.paidAmount.toFixed(2)}`, 190, finalY + 34, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.text('SALDO DEVEDOR:', 120, finalY + 40);
    doc.text(`R$ ${(sale.totalPrice - sale.paidAmount).toFixed(2)}`, 190, finalY + 40, { align: 'right' });
  }

  // Status Badge
  const statusText = sale.status === 'paid' ? 'PAGAMENTO CONFIRMADO' : 'PAGAMENTO PENDENTE';
  doc.setFontSize(8);
  if (sale.status === 'paid') {
    doc.setTextColor(12, 166, 120);
  } else {
    doc.setTextColor(247, 103, 7);
  }
  doc.text(statusText, 20, finalY + 10);

  // Footer
  doc.setTextColor(150);
  doc.setFontSize(9);
  doc.text('Obrigado pela preferência!', 105, finalY + 50, { align: 'center' });
  if (businessPhone) {
    doc.text(`WhatsApp: ${businessPhone}`, 105, finalY + 55, { align: 'center' });
  }
  doc.setFontSize(7);
  doc.text('Documento gerado eletronicamente via TruffleTech', 105, finalY + 65, { align: 'center' });

  doc.save(`recibo-${transactionId}.pdf`);
};

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
