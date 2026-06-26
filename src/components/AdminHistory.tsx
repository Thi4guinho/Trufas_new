import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Calendar, 
  Clock, 
  Tags,
  AlertCircle,
  Filter,
  DollarSign,
  User,
  ShoppingBag
} from 'lucide-react';
import { deleteDoc, doc, updateDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
import { Sale, UserSettings, OperationType } from '../types';
import { db, auth } from '../firebase';
import { downloadReceiptPDF, handleFirestoreError, cn } from '../utils';
import { format, isToday, isWithinInterval, subDays, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AdminHistoryProps {
  sales: Sale[];
  settings: UserSettings | null;
  profile: any;
  onEditSale?: (sale: Sale) => void;
}

export const AdminHistory: React.FC<AdminHistoryProps> = ({ 
  sales, 
  settings, 
  profile,
  onEditSale 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPayment, setFilterPayment] = useState<'all' | 'paid' | 'pending'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'preparing' | 'finished' | 'cancelled'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter pipeline
  const filteredSales = useMemo(() => {
    return sales
      .filter(s => {
        // Search filter matching customer name or saleNumber
        const query = searchTerm.toLowerCase();
        const matchesSearch = s.customerName.toLowerCase().includes(query) || 
          (s.saleNumber && s.saleNumber.toLowerCase().includes(query)) ||
          (s.items && s.items.some(item => item.truffleName.toLowerCase().includes(query))) ||
          (s.truffleName && s.truffleName.toLowerCase().includes(query));

        // Payment status filter
        const matchesPayment = filterPayment === 'all' || s.paymentStatus === filterPayment;

        // Order status filter
        const matchesStatus = filterStatus === 'all' || s.status === filterStatus;

        return matchesSearch && matchesPayment && matchesStatus;
      })
      .sort((a, b) => b.date.seconds - a.date.seconds);
  }, [sales, searchTerm, filterPayment, filterStatus]);

  // Handle status updating (preparing, finished, cancelled)
  const handleUpdateStatus = async (saleId: string, newStatus: 'preparing' | 'finished' | 'cancelled') => {
    try {
      const sale = sales.find(s => s.id === saleId);
      if (!sale) return;

      await updateDoc(doc(db, 'sales', saleId), {
        status: newStatus
      });

      // Log Security Action (Section 10)
      await addDoc(collection(db, 'audit_logs'), {
        userId: auth.currentUser!.uid,
        userName: profile?.displayName || auth.currentUser?.email || 'Sistema',
        action: `Alterou status do pedido #${sale.saleNumber || sale.id.slice(-6)} para ${newStatus}`,
        details: `Cliente: ${sale.customerName} | Status: ${newStatus}`,
        date: Timestamp.now(),
        ownerId: profile?.companyId || auth.currentUser!.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sales/${saleId}`);
    }
  };

  // Handle payment processing (Confirm payment of pending/fiado)
  const handleConfirmPayment = async (sale: Sale) => {
    try {
      await updateDoc(doc(db, 'sales', sale.id), {
        paymentStatus: 'paid',
        paidAmount: sale.totalPrice // Set paid amount to full price
      });

      // Log Security Action
      await addDoc(collection(db, 'audit_logs'), {
        userId: auth.currentUser!.uid,
        userName: profile?.displayName || auth.currentUser?.email || 'Sistema',
        action: `Confirmou recebimento de pagamento do pedido #${sale.saleNumber || sale.id.slice(-6)}`,
        details: `Cliente: ${sale.customerName} | Recebido: R$ ${sale.totalPrice.toFixed(2)}`,
        date: Timestamp.now(),
        ownerId: profile?.companyId || auth.currentUser!.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sales/${sale.id}`);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const saleToDelete = sales.find(s => s.id === deletingId);
    try {
      await deleteDoc(doc(db, 'sales', deletingId));
      
      // Log Security Action
      if (saleToDelete) {
        await addDoc(collection(db, 'audit_logs'), {
          userId: auth.currentUser!.uid,
          userName: profile?.displayName || auth.currentUser?.email || 'Sistema',
          action: `Excluiu permanentemente a venda #${saleToDelete.saleNumber || saleToDelete.id.slice(-6)}`,
          details: `Cliente: ${saleToDelete.customerName} | Valor retornado ao caixa: R$ -${saleToDelete.totalPrice.toFixed(2)}`,
          date: Timestamp.now(),
          ownerId: profile?.companyId || auth.currentUser!.uid
        });
      }
      setDeletingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `sales/${deletingId}`);
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#141414]/40">Histórico de Transações</p>
          <h3 className="text-3xl font-black tracking-tighter italic">Registro de Vendas</h3>
          <p className="text-xs text-[#141414]/50 mt-0.5 font-medium">Consulte, altere status de entrega e emita comprovantes</p>
        </div>

        {/* Filters Panel bar */}
        <div className="flex flex-wrap gap-2">
          {/* Payment Filter */}
          <select
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value as any)}
            className="p-3 bg-[#F5F5F4] rounded-xl text-[10px] font-black uppercase tracking-widest border-none text-[#141414]/65"
          >
            <option value="all">PAGAMENTO: TODOS</option>
            <option value="paid">PAGAS</option>
            <option value="pending">PENDENTES (FIADO)</option>
          </select>

          {/* Delivery/Order Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="p-3 bg-[#F5F5F4] rounded-xl text-[10px] font-black uppercase tracking-widest border-none text-[#141414]/65"
          >
            <option value="all">PEDIDO: TODOS</option>
            <option value="preparing">EM PREPARO</option>
            <option value="finished">FINALIZADOS</option>
            <option value="cancelled">CANCELADOS</option>
          </select>
        </div>
      </div>

      {/* Search Input bar */}
      <div className="relative group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#141414]/20 group-focus-within:text-[#141414] transition-colors" size={20} />
        <input 
          type="text"
          placeholder="Buscar por Nº do pedido, cliente, sabor de produto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-14 pr-6 py-5 bg-white rounded-[2rem] border border-[#141414]/5 shadow-sm focus:ring-2 focus:ring-[#141414]/10 font-bold transition-all"
        />
      </div>

      {/* Sales list panel */}
      <div className="bg-white rounded-[2.5rem] border border-[#141414]/5 shadow-sm overflow-hidden p-8">
        <div className="overflow-x-auto -mx-8">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="border-b border-[#141414]/5 text-[#141414]/40">
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest">Abertura / Data</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Pedido / Código</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Sabor / Quantidade</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Responsável</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Cliente / Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right">Total / Líquido</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-center">Painel de Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141414]/5">
              {filteredSales.map((sale) => {
                const docId = sale.id || '';
                const dateStr = format(sale.date.toDate(), 'dd/MM/yyyy HH:mm', { locale: ptBR });
                
                const orderStatusLabels = {
                  preparing: { text: 'Em preparo', bg: 'bg-amber-50 text-amber-600' },
                  finished: { text: 'Finalizado', bg: 'bg-green-50 text-green-600' },
                  cancelled: { text: 'Cancelado', bg: 'bg-red-50 text-red-600' }
                };

                const paymentMethodLabels: { [key: string]: string } = {
                  dinheiro: 'Dinheiro',
                  cartao_debito: 'Débito',
                  cartao_credito: 'Crédito',
                  pix: 'Pix',
                  fiado: 'Fiado'
                };

                return (
                  <tr key={sale.id} className="hover:bg-[#F5F5F4]/40 transition-colors">
                    {/* Date */}
                    <td className="px-8 py-5 whitespace-nowrap">
                      <p className="font-bold text-xs text-[#141414] leading-none">{dateStr}</p>
                      <span className="text-[9px] font-bold text-[#141414]/30 uppercase tracking-widest mt-1.5 inline-block">
                        {format(sale.date.toDate(), 'EEEE', { locale: ptBR })}
                      </span>
                    </td>

                    {/* Pedido Código & ID */}
                    <td className="px-6 py-5 whitespace-nowrap">
                      <p className="font-black text-sm text-[#141414] leading-none italic">
                        #{sale.saleNumber || docId.slice(-8).toUpperCase()}
                      </p>
                      <span className="text-[9px] font-extrabold text-[#141414]/30 uppercase tracking-wider block mt-1.5">
                        REGISTRADO POR ID
                      </span>
                    </td>

                    {/* Sabor & Quantities */}
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        {sale.items && sale.items.length > 0 ? (
                          sale.items.map((item, idx) => (
                            <p key={idx} className="font-extrabold text-xs text-[#141414] leading-tight">
                              {item.quantity}un. <span className="italic font-bold text-[#141414]/60">{item.truffleName}</span>
                            </p>
                          ))
                        ) : (
                          <p className="font-extrabold text-xs text-[#141414] leading-tight">
                            {sale.quantity}un. <span className="italic font-bold text-[#141414]/60">{sale.truffleName || 'Produto'}</span>
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Responsável */}
                    <td className="px-6 py-5 whitespace-nowrap">
                      <p className="font-extrabold text-xs text-[#141414] leading-none">
                        {sale.sellerName || 'Sistema'}
                      </p>
                    </td>

                    {/* Cliente, Payment method & status */}
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <User size={12} className="opacity-35" />
                          <p className="font-extrabold text-xs text-[#141414] italic leading-none">{sale.customerName || 'Consumidor'}</p>
                        </div>
                        
                        {/* Badges line */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded",
                            sale.paymentStatus === 'paid' ? "bg-green-500/10 text-green-700" : "bg-orange-500/10 text-orange-700"
                          )}>
                            {sale.paymentStatus === 'paid' ? 'Pago' : 'Pendente'}
                          </span>
                          
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded",
                            (orderStatusLabels[sale.status as keyof typeof orderStatusLabels] || orderStatusLabels.finished).bg
                          )}>
                            {(orderStatusLabels[sale.status as keyof typeof orderStatusLabels] || orderStatusLabels.finished).text}
                          </span>

                          <span className="text-[8px] font-extrabold text-[#141414]/30 bg-[#F5F5F4] px-1.5 py-0.5 rounded">
                            {paymentMethodLabels[sale.paymentMethod || 'dinheiro'] || 'Dinheiro'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Yield / Total price */}
                    <td className="px-6 py-5 text-right whitespace-nowrap">
                      <p className={cn(
                        "font-extrabold text-sm",
                        sale.status === 'cancelled' ? "text-[#141414]/40 line-through" : "text-[#141414]"
                      )}>
                        R$ {sale.totalPrice.toFixed(2)}
                      </p>
                      
                      {(() => {
                        const totalCost = sale.items && sale.items.length > 0 
                          ? sale.items.reduce((acc, item) => acc + (item.quantity * (item.costPerUnit || 0)), 0)
                          : 0;
                        const netProfit = sale.totalPrice - totalCost;
                        
                        return sale.status !== 'cancelled' && totalCost > 0 ? (
                          <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1 py-0.5 rounded inline-block mt-1">
                            Líquido: R$ {netProfit.toFixed(2)}
                          </span>
                        ) : null;
                      })()}
                      
                      {sale.discount > 0 && (
                        <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1 py-0.5 rounded inline-block mt-1 ml-1">
                          -R$ {sale.discount.toFixed(2)} Desc.
                        </span>
                      )}
                    </td>

                    {/* Interactive controls */}
                    <td className="px-8 py-5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        {/* Download copy receipt */}
                        <button
                          onClick={() => downloadReceiptPDF(sale, settings)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                          title="Emitir Recibo"
                        >
                          <FileText size={16} />
                        </button>

                        {/* Edit button */}
                        {onEditSale && sale.status !== 'cancelled' && (
                          <button
                            onClick={() => onEditSale(sale)}
                            className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors border border-transparent hover:border-orange-100/30"
                            title="Editar Pedido"
                          >
                            <FileText size={16} className="rotate-90" />
                          </button>
                        )}

                        {/* Pay Confirm of credit/fiado */}
                        {sale.paymentStatus === 'pending' && sale.status !== 'cancelled' && (
                          <button
                            onClick={() => handleConfirmPayment(sale)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-transparent hover:border-green-100"
                            title="Confirmar Recebimento"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}

                        {/* Order status cycle controls */}
                        {sale.status === 'preparing' && (
                          <button
                            onClick={() => handleUpdateStatus(sale.id, 'finished')}
                            className="p-1.5 text-violet-600 hover:bg-violet-50 rounded-lg transition-colors font-extrabold text-[10px]"
                            title="Finalizar Entrega"
                          >
                            Pronto ✓
                          </button>
                        )}

                        {sale.status !== 'cancelled' ? (
                          <button
                            onClick={() => handleUpdateStatus(sale.id, 'cancelled')}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors-red"
                            title="Cancelar Pedido"
                          >
                            <XCircle size={16} />
                          </button>
                        ) : (
                          // Delete from firebase button if already cancelled
                          profile?.role === 'admin' && (
                            <button
                              onClick={() => setDeletingId(sale.id)}
                              className="p-1.5 text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="Excluir Definitivo"
                            >
                              <Trash2 size={16} />
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-16 opacity-30">
                    <ShoppingBag size={44} className="mx-auto mb-3" />
                    <p className="text-xs font-black uppercase tracking-widest">Nenhuma venda encontrada no período</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 bg-[#141414]/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-black tracking-tighter italic mb-2">Remover do Registro?</h3>
              <p className="text-[#141414]/40 font-bold text-xs mb-8">
                Confirmando, este registro de venda cancelada será removido permanentemente de sua contabilidade.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeletingId(null)}
                  className="flex-1 py-4 font-bold text-sm uppercase text-[#141414]/40 hover:text-[#141414] transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-red-700 transition-all text-xs uppercase tracking-wider"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
