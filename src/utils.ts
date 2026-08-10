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
  const doc = new jsPDF('p', 'mm', 'a4');
  const businessName = String(settings?.businessName || 'TruffleTech');
  const businessPhone = settings?.businessPhone || '';
  const dateStr = format(sale.date.toDate(), 'dd/MM/yyyy');
  const timeStr = format(sale.date.toDate(), 'HH:mm:ss');
  let rawTxId = sale.saleNumber || sale.id?.slice(-6)?.toUpperCase() || 'NOVO';
  if (rawTxId.startsWith('V-')) {
    const numPart = rawTxId.replace('V-', '');
    rawTxId = `NF ${numPart.padStart(4, '0')}`;
  } else if (!rawTxId.startsWith('NF ') && rawTxId !== 'NOVO') {
    rawTxId = `NF ${rawTxId.padStart(4, '0')}`;
  }
  const transactionId = rawTxId;

  // Helper function to draw a box with label and value
  const drawBox = (x, y, w, h, label, value, valueAlign = 'left') => {
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.rect(x, y, w, h);
    if (label) {
      doc.setFontSize(5);
      doc.setFont('helvetica', 'normal');
      doc.text(label, x + 1, y + 2.5);
    }
    if (value) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      const valueY = y + h - 1.5;
      if (valueAlign === 'center') {
        doc.text(value, x + w / 2, valueY, { align: 'center' });
      } else if (valueAlign === 'right') {
        doc.text(value, x + w - 1, valueY, { align: 'right' });
      } else {
        const lines = doc.splitTextToSize(value, w - 2);
        doc.text(lines, x + 1, valueY);
      }
    }
  };

  // 1. Recebimento Section
  doc.setLineWidth(0.3);
  doc.rect(10, 10, 155, 15);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text(`RECEBEMOS DE ${businessName.toUpperCase()} OS PRODUTOS/SERVIÇOS CONSTANTES DA NOTA FISCAL INDICADA ABAIXO`, 12, 13);
  doc.line(10, 16, 165, 16);
  doc.text('DATA DE RECEBIMENTO', 12, 18.5);
  doc.line(45, 16, 45, 25);
  doc.text('IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR', 47, 18.5);

  // NF-e Block top right
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('NF-e', 180, 13);
  doc.setFontSize(8);
  doc.text(transactionId, 170, 18);
  doc.text('SÉRIE 1', 170, 22);

  // 2. Emitente Section
  // Left Box (Emitente details)
  doc.rect(10, 28, 80, 32);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(businessName.toUpperCase(), 50, 34, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Telefone: ${businessPhone}`, 50, 42, { align: 'center' });
  doc.text('Documento Auxiliar da Nota Fiscal', 50, 50, { align: 'center' });
  
  // Center Box (DANFE)
  doc.rect(90, 28, 25, 32);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DANFE', 102.5, 33, { align: 'center' });
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('Documento Auxiliar', 102.5, 36, { align: 'center' });
  doc.text('da Nota Fiscal', 102.5, 39, { align: 'center' });
  doc.text('Eletrônica', 102.5, 42, { align: 'center' });
  
  doc.text('0 - Entrada', 92, 46);
  doc.text('1 - Saída', 92, 49);
  doc.rect(110, 44, 4, 4);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('1', 112, 47, { align: 'center' });
  
  doc.setFontSize(8);
  doc.text(transactionId, 92, 53);
  doc.text('SÉRIE 1', 92, 57);
  
  // Right Box (Barcode / Chave)
  doc.rect(115, 28, 85, 32);
  // Faux Barcode lines
  doc.setLineWidth(0.5);
  for(let i=0; i<30; i++) {
    const lx = 120 + (i * 2) + Math.random();
    doc.line(lx, 30, lx, 42);
  }
  doc.setLineWidth(0.3);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('CHAVE DE ACESSO', 117, 46);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  const numOnly = transactionId.replace(/[^0-9]/g, '');
  const chaveMock = '3523 0112 3456 7890 1234 5500 1000 ' + numOnly.padStart(9, '0');
  doc.text(chaveMock, 157.5, 51, { align: 'center' });
  
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  const consultaText = 'Consulta de autenticidade no portal nacional da NF-e www.nfe.fazenda.gov.br/portal ou no site da Sefaz Autorizadora';
  const splitConsulta = doc.splitTextToSize(consultaText, 80);
  doc.text(splitConsulta, 117, 55);

  // 3. Natureza / Inscrição
  drawBox(10, 62, 105, 8, 'NATUREZA DA OPERAÇÃO', 'VENDA DE MERCADORIAS');
  drawBox(115, 62, 85, 8, 'PROTOCOLO DE AUTORIZAÇÃO DE USO', '135230000000000 - ' + dateStr + ' ' + timeStr);
  
  drawBox(10, 70, 65, 8, 'INSCRIÇÃO ESTADUAL', 'ISENTO');
  drawBox(75, 70, 65, 8, 'INSC. ESTADUAL DO SUBST. TRIBUTÁRIO', '');
  drawBox(140, 70, 60, 8, 'CNPJ', '00.000.000/0001-00');

  // 4. Destinatário / Remetente
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('DESTINATÁRIO / REMETENTE', 10, 81);
  const cliente = sale.customerName || 'CONSUMIDOR FINAL';
  drawBox(10, 82, 110, 8, 'NOME / RAZÃO SOCIAL', cliente.toUpperCase());
  drawBox(120, 82, 40, 8, 'CNPJ / CPF', '000.000.000-00');
  drawBox(160, 82, 40, 8, 'DATA DA EMISSÃO', dateStr);
  
  drawBox(10, 90, 90, 8, 'ENDEREÇO', 'NÃO INFORMADO');
  drawBox(100, 90, 40, 8, 'BAIRRO / DISTRITO', '');
  drawBox(140, 90, 20, 8, 'CEP', '');
  drawBox(160, 90, 40, 8, 'DATA SAÍDA / ENTRADA', dateStr);
  
  drawBox(10, 98, 90, 8, 'MUNICÍPIO', 'SÃO PAULO');
  drawBox(100, 98, 30, 8, 'FONE / FAX', '');
  drawBox(130, 98, 10, 8, 'UF', 'SP');
  drawBox(140, 98, 20, 8, 'INSCRIÇÃO ESTADUAL', '');
  drawBox(160, 98, 40, 8, 'HORA DE SAÍDA', timeStr);

  // 5. Fatura
  doc.text('FATURA / DUPLICATAS', 10, 109);
  drawBox(10, 110, 190, 12, 'PAGAMENTO', '');
  
  const paymentMethodLabels: { [key: string]: string } = {
    pix: 'PIX',
    credit: 'Cartão de Crédito',
    debit: 'Cartão de Débito',
    cash: 'Dinheiro',
    fiado: 'Fiado (A Prazo)'
  };
  const metodo = String(paymentMethodLabels[sale.paymentMethod] || sale.paymentMethod || '');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`Vencimento: ${dateStr} | Método: ${metodo.toUpperCase()} | Valor: R$ ${sale.totalPrice.toFixed(2)}`, 15, 117);

  // 6. Cálculo do Imposto
  doc.setFontSize(7);
  doc.text('CÁLCULO DO IMPOSTO', 10, 125);
  drawBox(10, 126, 35, 8, 'BASE DE CÁLCULO DO ICMS', '0,00', 'right');
  drawBox(45, 126, 35, 8, 'VALOR DO ICMS', '0,00', 'right');
  drawBox(80, 126, 35, 8, 'BASE CÁLC. ICMS ST', '0,00', 'right');
  drawBox(115, 126, 35, 8, 'VALOR DO ICMS ST', '0,00', 'right');
  drawBox(150, 126, 50, 8, 'VALOR TOTAL DOS PRODUTOS', sale.totalPrice.toFixed(2), 'right');
  
  drawBox(10, 134, 35, 8, 'VALOR DO FRETE', '0,00', 'right');
  drawBox(45, 134, 35, 8, 'VALOR DO SEGURO', '0,00', 'right');
  drawBox(80, 134, 35, 8, 'DESCONTO', sale.discount.toFixed(2), 'right');
  drawBox(115, 134, 35, 8, 'OUTRAS DESPESAS', '0,00', 'right');
  drawBox(150, 134, 50, 8, 'VALOR TOTAL DA NOTA', sale.totalPrice.toFixed(2), 'right');

  // 7. Transportador / Volumes
  doc.setFontSize(7);
  doc.text('TRANSPORTADOR / VOLUMES TRANSPORTADOS', 10, 145);
  drawBox(10, 146, 90, 8, 'RAZÃO SOCIAL', 'O MESMO');
  drawBox(100, 146, 25, 8, 'FRETE POR CONTA', '0 - Emitente');
  drawBox(125, 146, 20, 8, 'CÓDIGO ANTT', '');
  drawBox(145, 146, 20, 8, 'PLACA VEÍCULO', '');
  drawBox(165, 146, 10, 8, 'UF', '');
  drawBox(175, 146, 25, 8, 'CNPJ / CPF', '');

  drawBox(10, 154, 80, 8, 'ENDEREÇO', '');
  drawBox(90, 154, 55, 8, 'MUNICÍPIO', '');
  drawBox(145, 154, 10, 8, 'UF', '');
  drawBox(155, 154, 45, 8, 'INSCRIÇÃO ESTADUAL', '');

  drawBox(10, 162, 25, 8, 'QUANTIDADE', sale.items.reduce((a, b) => a + b.quantity, 0).toString());
  drawBox(35, 162, 35, 8, 'ESPÉCIE', 'VOLUMES');
  drawBox(70, 162, 35, 8, 'MARCA', '');
  drawBox(105, 162, 35, 8, 'NUMERAÇÃO', '');
  drawBox(140, 162, 30, 8, 'PESO BRUTO', '0,000');
  drawBox(170, 162, 30, 8, 'PESO LÍQUIDO', '0,000');

  // 8. Produtos
  doc.text('DADOS DO PRODUTO / SERVIÇO', 10, 173);
  
  const tableData = sale.items.map(item => [
    String(item.truffleId || '').slice(0,6).toUpperCase(), // CÓD. PROD.
    String(item.truffleName || '').toUpperCase(),                 // DESCRIÇÃO
    '00000000',                              // NCM/SH
    '0102',                                  // CFOP
    'UN',                                    // UNID
    item.quantity.toString(),                // QTDE
    item.pricePerUnit.toFixed(2),                   // VL. UNIT
    (item.quantity * item.pricePerUnit).toFixed(2), // VL. TOTAL
    '0,00', '0,00', '0,00', '0,00', '0,00'   // ICMS, IPI, etc
  ]);

  autoTable(doc, {
    startY: 174,
    head: [['CÓD.', 'DESCRIÇÃO', 'NCM', 'CFOP', 'UN', 'QTD', 'VL.UN', 'VL.TOT', 'BC ICMS', 'VL ICMS', 'VL IPI', '% ICMS', '% IPI']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 6, cellPadding: 1, lineColor: 0, lineWidth: 0.3, textColor: 20 },
    headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: 'normal', lineWidth: 0.3 },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 55 }, // Descrição maior
      2: { cellWidth: 12 },
      3: { cellWidth: 10 },
      4: { cellWidth: 8 },
      5: { cellWidth: 10, halign: 'right' },
      6: { cellWidth: 15, halign: 'right' },
      7: { cellWidth: 15, halign: 'right' },
      8: { cellWidth: 12, halign: 'right' },
      9: { cellWidth: 12, halign: 'right' },
      10: { cellWidth: 10, halign: 'right' },
      11: { cellWidth: 10, halign: 'right' },
      12: { cellWidth: 10, halign: 'right' },
    },
    margin: { left: 10, right: 10 }
  });

  // 9. Dados Adicionais
  const finalY = (doc as any).lastAutoTable?.finalY || 180;
  
  if (finalY < 260) {
    doc.text('DADOS ADICIONAIS', 10, finalY + 4);
    drawBox(10, finalY + 5, 120, 20, 'INFORMAÇÕES COMPLEMENTARES', `Documento emitido por ME ou EPP optante pelo Simples Nacional.\nNão gera direito a crédito fiscal de IPI.\nPedido gerado eletronicamente em ${dateStr} às ${timeStr}.\nSistema interno TruffleTech.`, 'left');
    drawBox(130, finalY + 5, 70, 20, 'RESERVADO AO FISCO', '');
  }

  doc.save(`DANFE-${transactionId}.pdf`);
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
  
  doc.text(`Total Contas a Receber (Fiados): R$ ${totalPending.toFixed(2)}`, 110, 49);
  doc.text(`Clientes Cadastrados: ${customers.length}`, 110, 55);
  doc.text(`Sabores de Produto Ativos: ${truffles.length}`, 110, 61);

  // Stock table section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20);
  doc.text('1. REGISTRO DE PRODUTOS', 14, 82);

  const stockRows = truffles.map(t => [
    t.name,
    `R$ ${t.price.toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: 86,
    head: [['SABOR / PRODUTO', 'PRECO VENDA']],
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
      s.saleNumber || (s.id ? s.id.slice(-6).toUpperCase() : "NOVO"),
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
  return errInfo;
}
