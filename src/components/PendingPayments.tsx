import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DollarSign, 
  Search, 
  Calendar, 
  User, 
  CheckCircle2, 
  FileText,
  AlertTriangle,
  History,
  TrendingDown,
  X
} from 'lucide-react';
import { updateDoc, doc, addDoc, Timestamp, collection } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Sale, OperationType } from '../types';
import { handleFirestoreError, downloadReceiptPDF } from '../utils';
import { format } from 'date-fns';

interface PendingPaymentsProps {
  sales: Sale[];
  profile: any;
  settings: any;
}

export const PendingPayments: React.FC<PendingPaymentsProps> = ({ sales, profile, settings }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDebtors, setExpandedDebtors] = useState<Record<string, boolean>>({});

  const [receivingSale, setReceivingSale] = useState<Sale | null>(null);
  const [receivingDebtor, setReceivingDebtor] = useState<{ name: string; totalDue: number; count: number; salesList: Sale[] } | null>(null);
  const [receiveAmount, setReceiveAmount] = useState<string>('');
  const [receiveMethod, setReceiveMethod] = useState<'dinheiro' | 'cartao_debito' | 'cartao_credito' | 'pix'>('pix');

  const toggleDebtor = (name: string) => {
    setExpandedDebtors(prev => ({ ...prev, [name]: !prev[name] }));
  };

  // Sieve the sales to filter credit / fiado and pending payments (where status is not cancelled!)

  const pendingSales = useMemo(() => {
    return sales
      .filter(s => s.paymentStatus === 'pending' && s.status !== 'cancelled')
      .sort((a, b) => b.date.seconds - a.date.seconds);
  }, [sales]);

  // Aggregate pending amount by customer to show "Devedores" cards
  const debtorGroups = useMemo(() => {
    const debtors: { [name: string]: { totalDue: number; count: number; salesList: Sale[] } } = {};

    pendingSales.forEach(s => {
      const name = s.customerName;
      if (!debtors[name]) {
        debtors[name] = { totalDue: 0, count: 0, salesList: [] };
      }
      debtors[name].totalDue += (s.totalPrice - (s.paidAmount || 0));
      debtors[name].count += 1;
      debtors[name].salesList.push(s);
    });

    return Object.entries(debtors)
      .map(([name, data]) => ({
        name,
        ...data
      }))
      .sort((a, b) => b.totalDue - a.totalDue);
  }, [pendingSales]);

  const filteredDebtors = useMemo(() => {
    return debtorGroups.filter(d => 
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.salesList.some(s => s.saleNumber && s.saleNumber.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [debtorGroups, searchTerm]);

  const stats = useMemo(() => {
    const totalOutstanding = pendingSales.reduce((acc, s) => acc + (s.totalPrice - (s.paidAmount || 0)), 0);
    return {
      totalOutstanding,
      debtorsCount: debtorGroups.length,
      ordersCount: pendingSales.length
    };
  }, [pendingSales, debtorGroups]);

  const handleOpenReceive = (sale: Sale) => {
    setReceivingSale(sale);
    setReceiveAmount((sale.totalPrice - (sale.paidAmount || 0)).toFixed(2));
    setReceiveMethod('pix');
  };

  const handleOpenReceiveBulk = (debtor: { name: string; totalDue: number; count: number; salesList: Sale[] }) => {
    setReceivingDebtor(debtor);
    setReceiveAmount(debtor.totalDue.toFixed(2));
    setReceiveMethod('pix');
  };

  const handleConfirmReceive = async () => {
    if (!receiveAmount || isNaN(Number(receiveAmount)) || Number(receiveAmount) <= 0) return;
    
    const amountToPay = Number(receiveAmount);

    if (receivingSale) {
      const balanceDue = receivingSale.totalPrice - (receivingSale.paidAmount || 0);
      const finalAmount = Math.min(amountToPay, balanceDue);
      const newPaidAmount = (receivingSale.paidAmount || 0) + finalAmount;
      const isFullyPaid = newPaidAmount >= receivingSale.totalPrice;

      try {
        await updateDoc(doc(db, 'sales', receivingSale.id), {
          paymentStatus: isFullyPaid ? 'paid' : 'pending',
          paidAmount: newPaidAmount
        });

        await addDoc(collection(db, 'audit_logs'), {
          userId: auth.currentUser!.uid,
          userName: profile?.displayName || auth.currentUser?.email || 'Sistema',
          action: `Recebeu pagamento ${isFullyPaid ? 'integral' : 'parcial'} do pedido #${receivingSale.saleNumber || receivingSale.id.slice(-6)}`,
          details: `Cliente: ${receivingSale.customerName} | Valor recebido: R$ ${finalAmount.toFixed(2)} | Método: ${receiveMethod}`,
          date: Timestamp.now(),
          ownerId: profile?.companyId || auth.currentUser!.uid
        });

        await addDoc(collection(db, 'cashflow'), {
          type: 'income',
          value: finalAmount,
          category: 'Recebimento de Fiado',
          date: Timestamp.now(),
          description: `Recebimento de Fiado - Pedido #${receivingSale.saleNumber || receivingSale.id.slice(-6)} - ${receivingSale.customerName} - ${receiveMethod.toUpperCase()}`,
          responsible: profile?.displayName || profile?.email || auth.currentUser?.email || 'Sistema',
          ownerId: profile?.companyId || auth.currentUser!.uid,
          isSystem: true
        });

        setReceivingSale(null);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `sales/${receivingSale.id}`);
      }
    } else if (receivingDebtor) {
      const finalAmount = Math.min(amountToPay, receivingDebtor.totalDue);
      const sortedSales = [...receivingDebtor.salesList].sort((a, b) => a.date.seconds - b.date.seconds);
      
      let remainingAmount = finalAmount;
      try {
        for (const sale of sortedSales) {
          if (remainingAmount <= 0) break;
          
          const balanceDue = sale.totalPrice - (sale.paidAmount || 0);
          if (balanceDue <= 0) continue;
          
          const amountForThisSale = Math.min(remainingAmount, balanceDue);
          const newPaidAmount = (sale.paidAmount || 0) + amountForThisSale;
          const isFullyPaid = newPaidAmount >= sale.totalPrice;
          
          await updateDoc(doc(db, 'sales', sale.id), {
            paymentStatus: isFullyPaid ? 'paid' : 'pending',
            paidAmount: newPaidAmount
          });
          
          remainingAmount -= amountForThisSale;
        }
        
        await addDoc(collection(db, 'audit_logs'), {
          userId: auth.currentUser!.uid,
          userName: profile?.displayName || auth.currentUser?.email || 'Sistema',
          action: `Recebeu pagamento em lote do cliente ${receivingDebtor.name}`,
          details: `Valor recebido: R$ ${finalAmount.toFixed(2)} | Método: ${receiveMethod}`,
          date: Timestamp.now(),
          ownerId: profile?.companyId || auth.currentUser!.uid
        });

        await addDoc(collection(db, 'cashflow'), {
          type: 'income',
          value: finalAmount,
          category: 'Recebimento de Fiado',
          date: Timestamp.now(),
          description: `Recebimento de Fiado em Lote - Cliente ${receivingDebtor.name} - ${receiveMethod.toUpperCase()}`,
          responsible: profile?.displayName || profile?.email || auth.currentUser?.email || 'Sistema',
          ownerId: profile?.companyId || auth.currentUser!.uid,
          isSystem: true
        });
        
        setReceivingDebtor(null);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `sales`);
      }
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Title */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#141414]/40 dark:text-zinc-400">Setor Financeiro / Cobrança</p>
        <h3 className="text-3xl font-black tracking-tighter italic font-black">Contas a Receber (Fiado)</h3>
        <p className="text-xs text-[#141414]/50 dark:text-zinc-400 mt-0.5 font-semibold">Acompanhe saldos pendentes de clientes e controle de recebíveis</p>
      </div>

      {/* Numerical Stats overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-[#141414]/5 dark:border-zinc-50/10 shadow-sm">
          <div className="flex items-center gap-3 mb-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-[#141414]/40 dark:text-zinc-400">Total a Receber</p>
          </div>
          <h4 className="text-2xl font-black text-orange-600">R$ {stats.totalOutstanding.toFixed(2)}</h4>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-[#141414]/5 dark:border-zinc-50/10 shadow-sm">
          <div className="flex items-center gap-3 mb-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#141414]/5 dark:bg-zinc-50/5 text-[#141414] dark:text-zinc-100 flex items-center justify-center">
              <User size={20} />
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-[#141414]/40 dark:text-zinc-400">Clientes Devedores</p>
          </div>
          <h4 className="text-2xl font-black text-[#141414] dark:text-zinc-100">{stats.debtorsCount} Devedores</h4>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-[#141414]/5 dark:border-zinc-50/10 shadow-sm">
          <div className="flex items-center gap-3 mb-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#141414]/5 dark:bg-zinc-50/5 text-[#141414] dark:text-zinc-100 flex items-center justify-center">
              <History size={20} />
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-[#141414]/40 dark:text-zinc-400">Pedidos Pendentes</p>
          </div>
          <h4 className="text-2xl font-black text-[#141414] dark:text-zinc-100">{stats.ordersCount} Vendas fiadas</h4>
        </div>
      </div>

      {/* Detailed rows list and Search filter */}
      <div className="space-y-4">
        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#141414]/20 dark:text-zinc-600 group-focus-within:text-[#141414] dark:text-zinc-100 transition-colors" size={20} />
          <input 
            type="text"
            placeholder="Filtrar lançamentos pendentes por cliente ou nº do pedido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-6 py-5 bg-white dark:bg-zinc-900 rounded-[2rem] border border-[#141414]/5 dark:border-zinc-50/10 shadow-sm focus:ring-2 focus:ring-[#141414]/10 dark:ring-zinc-50/10 font-bold transition-all text-xs"
          />
        </div>

        <div className="space-y-6">
          {filteredDebtors.map(debtor => (
            <div key={debtor.name} className="bg-white dark:bg-zinc-900 rounded-3xl border border-[#141414]/5 dark:border-zinc-50/10 shadow-sm overflow-hidden">
              <div 
                className="p-4 sm:p-6 border-b border-[#141414]/5 dark:border-zinc-50/10 flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4 cursor-pointer hover:bg-[#F5F5F4] dark:hover:bg-zinc-800/40 transition-colors"
                onClick={() => toggleDebtor(debtor.name)}
              >
                <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center shrink-0">
                    <User size={20} className="sm:hidden" />
                    <User size={24} className="hidden sm:block" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg sm:text-xl font-black text-[#141414] dark:text-zinc-100 truncate">{debtor.name}</h4>
                    <p className="text-[10px] sm:text-xs font-bold text-[#141414]/40 dark:text-zinc-400 mt-0.5 sm:mt-1 uppercase tracking-widest">{debtor.count} Pedidos Pendentes</p>
                  </div>
                </div>
                <div className="text-left sm:text-right flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto bg-[#F5F5F4] dark:bg-zinc-800 sm:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none">
                  <div className="w-full flex sm:block justify-between items-center gap-4">
                    <div>
                      <p className="text-[10px] font-black text-[#141414]/40 dark:text-zinc-400 uppercase tracking-widest sm:mb-1">Dívida Total</p>
                      <p className="text-lg sm:text-2xl font-black text-red-600">R$ {debtor.totalDue.toFixed(2)}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOpenReceiveBulk(debtor); }}
                      className="px-4 py-2 border border-green-600/10 bg-white dark:bg-zinc-900 hover:bg-green-600 hover:text-white transition-all rounded-xl text-[9px] font-black uppercase tracking-widest text-green-600 flex items-center gap-1 sm:mt-2 shadow-sm"
                      title="Quitar Dívida Total"
                    >
                      <CheckCircle2 size={12} /> Quitar Total
                    </button>
                  </div>
                </div>
              </div>
              
              <AnimatePresence>
                {expandedDebtors[debtor.name] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-0 overflow-x-auto bg-[#FAFAFA]">
                      <table className="w-full text-left border-collapse min-w-[750px]">
                        <thead>
                          <tr className="border-b border-[#141414]/5 dark:border-zinc-50/10 text-[#141414]/40 dark:text-zinc-400">
                            <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest">Pedido / Data</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Produtos</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right">Saldo Devedor</th>
                            <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-center">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#141414]/5">
                          {debtor.salesList.map((sale) => {
                            const balanceDue = sale.totalPrice - (sale.paidAmount || 0);

                            return (
                              <tr key={sale.id} className="hover:bg-white dark:bg-zinc-900 transition-colors">
                                <td className="px-8 py-5 whitespace-nowrap">
                                  <p className="font-extrabold text-sm text-[#141414] dark:text-zinc-100 italic leading-none">
                                    #{sale.saleNumber || sale.id.slice(-6).toUpperCase()}
                                  </p>
                                  <span className="text-[9px] font-bold text-[#141414]/30 dark:text-zinc-500 uppercase tracking-widest mt-1.5 inline-block">
                                    {format(sale.date.toDate(), 'dd/MM/yyyy HH:mm')}
                                  </span>
                                </td>

                                <td className="px-6 py-5">
                                  <div className="space-y-0.5">
                                    {sale.items && sale.items.length > 0 ? (
                                      sale.items.map((item, idx) => (
                                        <p key={idx} className="font-bold text-xs text-[#141414]/75 dark:text-zinc-300">
                                          {item.quantity}x {item.truffleName}
                                        </p>
                                      ))
                                    ) : (
                                      <p className="font-bold text-xs text-[#141414]/75 dark:text-zinc-300">
                                        {sale.quantity}x {sale.truffleName}
                                      </p>
                                    )}
                                  </div>
                                </td>

                                <td className="px-6 py-5 text-right whitespace-nowrap">
                                  <p className="font-black text-sm text-red-600">R$ {balanceDue.toFixed(2)}</p>
                                  <span className="text-[8px] font-bold text-[#141414]/30 dark:text-zinc-500 uppercase tracking-wider mt-1 block">
                                    Total: R$ {sale.totalPrice.toFixed(2)}
                                  </span>
                                </td>

                                <td className="px-8 py-5 whitespace-nowrap text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleOpenReceive(sale); }}
                                      className="px-4 py-2 border border-green-600/10 hover:bg-green-600 hover:text-white transition-all rounded-xl text-[9px] font-black uppercase tracking-widest text-green-600 flex items-center gap-1 bg-white dark:bg-zinc-900"
                                      title="Receber Pagamento"
                                    >
                                      <CheckCircle2 size={12} /> Confirmar Recebimento
                                    </button>

                                    <button
                                      onClick={(e) => { e.stopPropagation(); downloadReceiptPDF(sale, settings); }}
                                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent bg-white dark:bg-zinc-900"
                                      title="Emitir Comprovante"
                                    >
                                      <FileText size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}

          {filteredDebtors.length === 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-[#141414]/5 dark:border-zinc-50/10 shadow-sm overflow-hidden p-8">
              <div className="text-center py-16 opacity-30">
                <DollarSign size={44} className="mx-auto mb-3" />
                <p className="text-xs font-black uppercase tracking-widest">Nenhuma conta pendente de recebimento</p>
              </div>
            </div>
          )}
        </div>

        {/* Receive Payment Modal */}
        <AnimatePresence>
          {(receivingSale || receivingDebtor) && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#141414]/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-[#FAFAFA] rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl relative border border-[#141414]/5 dark:border-zinc-50/10"
              >
                <button 
                  onClick={() => { setReceivingSale(null); setReceivingDebtor(null); }}
                  className="absolute right-6 top-6 w-10 h-10 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center text-[#141414]/40 dark:text-zinc-400 hover:text-[#141414] dark:hover:text-zinc-100 shadow-sm transition-colors"
                >
                  <X size={20} />
                </button>
                
                <div className="mb-8">
                  <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-6">
                    <DollarSign size={32} />
                  </div>
                  <h3 className="text-2xl font-black italic tracking-tight">
                    {receivingSale ? 'Receber Pagamento' : 'Receber em Lote'}
                  </h3>
                  <p className="text-xs font-bold text-[#141414]/40 dark:text-zinc-400 mt-1 uppercase tracking-widest">
                    {receivingSale ? `Pedido #${receivingSale.saleNumber || receivingSale.id.slice(-6).toUpperCase()} - ${receivingSale.customerName}` : `Cliente: ${receivingDebtor?.name}`}
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 dark:text-zinc-400 mb-2">Valor a Receber (R$)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      min="0.01"
                      max={receivingSale ? (receivingSale.totalPrice - (receivingSale.paidAmount || 0)).toFixed(2) : receivingDebtor?.totalDue.toFixed(2)}
                      value={receiveAmount}
                      onChange={(e) => setReceiveAmount(e.target.value)}
                      className="w-full px-5 py-4 bg-white dark:bg-zinc-900 rounded-2xl border border-[#141414]/5 dark:border-zinc-50/10 focus:ring-2 focus:ring-[#141414]/10 dark:ring-zinc-50/10 font-black text-xl transition-all shadow-sm"
                      placeholder="0.00"
                    />
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-[10px] font-bold text-[#141414]/40 dark:text-zinc-400">
                        Saldo Devedor: R$ {receivingSale ? (receivingSale.totalPrice - (receivingSale.paidAmount || 0)).toFixed(2) : receivingDebtor?.totalDue.toFixed(2)}
                      </p>
                      <button 
                        onClick={() => setReceiveAmount(receivingSale ? (receivingSale.totalPrice - (receivingSale.paidAmount || 0)).toFixed(2) : receivingDebtor!.totalDue.toFixed(2))}
                        className="text-[10px] font-black uppercase tracking-widest text-green-600 hover:text-green-700"
                      >
                        Pagar Total
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 dark:text-zinc-400 mb-2">Método de Pagamento</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'dinheiro', label: 'Dinheiro' },
                        { id: 'pix', label: 'PIX' },
                        { id: 'cartao_credito', label: 'Crédito' },
                        { id: 'cartao_debito', label: 'Débito' }
                      ].map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setReceiveMethod(m.id as any)}
                          className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                            receiveMethod === m.id
                              ? 'bg-[#141414] dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-md'
                              : 'bg-white dark:bg-zinc-900 text-[#141414]/50 dark:text-zinc-400 border border-[#141414]/5 dark:border-zinc-50/10 hover:bg-[#F5F5F4] dark:bg-zinc-800'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={handleConfirmReceive}
                    disabled={!receiveAmount || isNaN(Number(receiveAmount)) || Number(receiveAmount) <= 0}
                    className="w-full py-5 bg-[#141414] dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[#141414]/90 active:scale-[0.98] transition-all shadow-xl disabled:opacity-50 disabled:active:scale-100"
                  >
                    Confirmar Pagamento
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
