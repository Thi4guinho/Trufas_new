import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Sale, UserSettings, OperationType, FirestoreErrorInfo, Customer, Truffle } from './types';
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
  const dateStr = format(sale.date.toDate(), 'dd/MM/yyyy HH:mm');
  const transactionId = sale.id ? sale.id.slice(-8).toUpperCase() : 'NOVO';

  const subtotal = sale.totalPrice + sale.discount;

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(20, 20, 20);
  doc.text(businessName, 105, 22, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('COMPROVANTE DE VENDA', 105, 30, { align: 'center' });

  // Divider line
  doc.setDrawColor(220, 219, 215);
  doc.setLineWidth(0.5);
  doc.line(20, 36, 190, 36);

  // Info Grid
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('DATA/HORA:', 20, 45);
  doc.text('PEDIDO Nº:', 105, 45);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(dateStr, 45, 45);
  doc.text(`#${sale.saleNumber || transactionId}`, 125, 45);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('CLIENTE:', 20, 52);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(sale.customerName || 'Consumidor Final', 45, 52);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('PAGAMENTO:', 20, 59);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  
  const paymentMethodLabels: { [key: string]: string } = {
    dinheiro: 'Dinheiro',
    cartao_debito: 'Cartão de Débito',
    cartao_credito: 'Cartão de Crédito',
    pix: 'Pix',
    fiado: 'Fiado / pendente'
  };
  doc.text(paymentMethodLabels[sale.paymentMethod] || 'Não informado', 45, 59);

  // Items Table
  const tableBody: any[][] = sale.items && sale.items.length > 0 
    ? sale.items.map(item => [
        { 
          content: `${item.truffleName}\n${item.quantity} un. x R$ ${item.pricePerUnit.toFixed(2)}`,
          styles: { fontStyle: 'bold' } 
        },
        `R$ ${(item.quantity * item.pricePerUnit).toFixed(2)}`
      ])
    : [[
        { 
          content: `${sale.truffleName || 'Produto'}\n${sale.quantity} un. x R$ ${(subtotal / sale.quantity).toFixed(2)}`,
          styles: { fontStyle: 'bold' } 
        },
        `R$ ${subtotal.toFixed(2)}`
      ]];

  if (sale.discount > 0) {
    tableBody.push([
      { 
        content: `   DESCONTO APLICADO`,
        styles: { fontStyle: 'italic', textColor: [220, 50, 50] } 
      },
      `(- R$ ${sale.discount.toFixed(2)})`
    ]);
  }

  autoTable(doc, {
    startY: 68,
    head: [['PRODUTO / DETALHE', 'VALOR TOTAL']],
    body: tableBody,
    theme: 'plain',
    headStyles: { 
      fillColor: [245, 245, 244], 
      textColor: [20, 20, 20], 
      fontStyle: 'bold',
      lineWidth: 0.1,
      lineColor: [220, 220, 220]
    },
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 5 },
    columnStyles: {
      1: { halign: 'right' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;

  // Summary Card Border
  doc.setDrawColor(240, 240, 240);
  doc.setFillColor(250, 250, 249);
  doc.roundedRect(110, finalY, 80, 48, 4, 4, 'FD');

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  
  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', 115, finalY + 12);
  doc.text(`R$ ${subtotal.toFixed(2)}`, 185, finalY + 12, { align: 'right' });

  // Discount
  if (sale.discount > 0) {
    doc.setTextColor(220, 50, 50);
    doc.text('Desconto:', 115, finalY + 20);
    doc.text(`- R$ ${sale.discount.toFixed(2)}`, 185, finalY + 20, { align: 'right' });
  }

  // Total
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(11);
  doc.text('TOTAL:', 115, finalY + 30);
  doc.text(`R$ ${sale.totalPrice.toFixed(2)}`, 185, finalY + 30, { align: 'right' });

  // Paid value / Outstanding balance
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  if (sale.paymentStatus === 'paid') {
    doc.setTextColor(12, 166, 120);
    doc.text('PAGAMENTO INTEGRAL CONFIRMADO', 115, finalY + 40);
  } else {
    doc.text(`Pago: R$ ${(sale.paidAmount || 0).toFixed(2)}`, 115, finalY + 39);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 80, 20);
    doc.text(`Saldo: R$ ${(sale.totalPrice - (sale.paidAmount || 0)).toFixed(2)}`, 115, finalY + 44);
  }

  // Status Badge on bottom left
  const pStatusText = sale.paymentStatus === 'paid' ? 'PAGAMENTO OK' : 'PENDENTE DE PAGAMENTO';
  const oStatusText = sale.status === 'preparing' ? 'EM PREPARO' : sale.status === 'finished' ? 'FINALIZADO' : 'CANCELADO';
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  
  doc.setTextColor(100, 100, 100);
  doc.text('STATUS DO PEDIDO:', 20, finalY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(oStatusText, 60, finalY + 12);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('SITUAÇÃO FINANCEIRA:', 20, finalY + 20);
  if (sale.paymentStatus === 'paid') {
    doc.setTextColor(12, 166, 120);
  } else {
    doc.setTextColor(220, 80, 20);
  }
  doc.text(pStatusText, 60, finalY + 20);

  if (sale.notes) {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(8);
    doc.text(`Obs: ${sale.notes.substring(0, 50)}`, 20, finalY + 32);
  }

  // Footer text
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(160, 160, 160);
  doc.setFontSize(9);
  doc.text('Agradecemos sinceramente pela sua preferência!', 105, finalY + 62, { align: 'center' });
  if (businessPhone) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Suporte: ${businessPhone}`, 105, finalY + 68, { align: 'center' });
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Sistema comercial fornecido por TruffleTech', 105, finalY + 76, { align: 'center' });

  doc.save(`recibo-${sale.saleNumber || transactionId}.pdf`);
};

export const downloadFullReportPDF = (
  sales: Sale[],
  truffles: Truffle[],
  customers: Customer[],
  settings: UserSettings | null
) => {
  const doc = new jsPDF();
  const businessName = settings?.businessName || 'TruffleTech';
  const businessPhone = settings?.businessPhone || '';
  const dateStr = format(new Date(), 'dd/MM/yyyy HH:mm');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(20, 20, 20);
  doc.text(businessName.toUpperCase(), 14, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`RELATORIO GERENCIAL DE NEGOCIOS - EMITIDO EM ${dateStr}`, 14, 25);

  // Horizontal separator line
  doc.setDrawColor(220, 219, 215);
  doc.line(14, 28, 196, 28);

  // Financial Metrics Calculate
  const activeSales = sales.filter(s => s.status !== 'cancelled');
  const totalSalesCount = activeSales.length;
  const totalRevenue = activeSales.reduce((acc, s) => acc + s.totalPrice, 0);
  
  let totalCost = 0;
  activeSales.forEach(sale => {
    if (sale.items && sale.items.length > 0) {
      sale.items.forEach(item => {
        totalCost += item.quantity * (item.costPerUnit || 0);
      });
    } else {
      const truffle = truffles.find(t => t.id === sale.truffleId);
      totalCost += sale.quantity * (truffle?.cost || 0);
    }
  });
  
  const totalProfit = Math.max(0, totalRevenue - totalCost);
  const totalPending = sales.filter(s => s.status !== 'cancelled' && s.paymentStatus === 'pending')
                            .reduce((acc, s) => acc + (s.totalPrice - (s.paidAmount || 0)), 0);

  // Draw Summary Box
  doc.setFillColor(245, 245, 244);
  doc.roundedRect(14, 34, 182, 35, 3, 3, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50);
  doc.text('RESUMO FINANCEIRO GERAL', 20, 42);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Total de Vendas Ativas: ${totalSalesCount}`, 20, 49);
  doc.text(`Faturamento Total: R$ ${totalRevenue.toFixed(2)}`, 20, 55);
  doc.text(`Lucro Liquido Estimado: R$ ${totalProfit.toFixed(2)}`, 20, 61);

  doc.text(`Total Contas a Receber (Fiados): R$ ${totalPending.toFixed(2)}`, 110, 49);
  doc.text(`Clientes Cadastrados: ${customers.length}`, 110, 55);
  doc.text(`Sabores de Produto Ativos: ${truffles.length}`, 110, 61);

  // Stock table section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20);
  doc.text('1. CONTROLE DE ESTOQUE E SABORES', 14, 82);

  const stockRows = truffles.map(t => [
    t.name,
    `${t.stock} un.`,
    `R$ ${(t.cost || 0).toFixed(2)}`,
    `R$ ${t.price.toFixed(2)}`,
    `R$ ${(t.price - (t.cost || 0)).toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: 86,
    head: [['SABOR / PRODUTO', 'ESTOQUE ATUAL', 'PRECO CUSTO', 'PRECO VENDA', 'MARGEM ESTIMADA']],
    body: stockRows,
    styles: { fontSize: 8, cellPadding: 3, font: 'helvetica' },
    headStyles: { fillColor: [20, 20, 20], textColor: [255, 255, 255] },
    theme: 'grid'
  });

  const afterStockY = (doc as any).lastAutoTable.finalY + 12;

  // Recent Sales section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20);
  doc.text('2. REGISTRO RECENTE DE TRANSACÕES', 14, afterStockY);

  const salesRows = activeSales.slice(0, 15).map(s => {
    const dStr = format(s.date.toDate(), 'dd/MM/yyyy HH:mm');
    const itemsStr = s.items && s.items.length > 0
      ? s.items.map(item => `${item.quantity}x ${item.truffleName}`).join('\n')
      : `${s.quantity}x ${s.truffleName || 'Produto'}`;
    const pStatus = s.paymentStatus === 'paid' ? 'PAGO' : 'PENDENTE';
    return [
      s.saleNumber || s.id.slice(-6).toUpperCase(),
      dStr,
      s.customerName || 'Consumidor',
      itemsStr,
      `R$ ${s.totalPrice.toFixed(2)}`,
      pStatus
    ];
  });

  autoTable(doc, {
    startY: afterStockY + 4,
    head: [['CODIGO', 'DATA', 'CLIENTE', 'ITENS COMPRADOS', 'TOTAL', 'SITUACÃO']],
    body: salesRows,
    styles: { fontSize: 7, cellPadding: 2, font: 'helvetica' },
    headStyles: { fillColor: [80, 80, 80], textColor: [255, 255, 255] },
    theme: 'grid'
  });

  // Footer watermark on page 1 and subsequent
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160);
    doc.text(`TruffleTech Gestao - Pagina ${i} de ${pageCount}`, 105, 287, { align: 'center' });
  }

  doc.save(`relatorio-gerencial-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
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
