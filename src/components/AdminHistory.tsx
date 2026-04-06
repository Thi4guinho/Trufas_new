import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Calendar, 
  Trash2, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle 
} from 'lucide-react';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Sale, UserSettings, OperationType } from '../types';
import { db } from '../firebase';
import { handleFirestoreError, downloadReceiptPDF, cn } from '../utils';

interface AdminHistoryProps {
  sales: Sale[];
  settings: UserSettings | null;
}

export const AdminHistory: React.FC<AdminHistoryProps> = ({ sales, settings }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredSales = useMemo(() => {
    return sales.filter(s => 
      s.truffleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sales, searchTerm]);

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteDoc(doc(db, 'sales', deletingId));
      setDeletingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `sales/${deletingId}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#141414]/20 group-focus-within:text-[#141414] transition-colors" size={20} />
        <input 
          type="text"
          placeholder="Buscar no histórico..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-14 pr-6 py-5 bg-white rounded-[2rem] border border-[#141414]/5 shadow-sm focus:ring-2 focus:ring-[#141414]/10 font-bold transition-all"
        />
      </div>

      <div className="bg-white rounded-[2.5rem] border border-[#141414]/5 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F5F5F4]">
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-[#141414]/40">Data</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-[#141414]/40">Produto</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-[#141414]/40">Cliente</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-[#141414]/40">Total</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-[#141414]/40">Status</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-[#141414]/40">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((sale) => (
                <React.Fragment key={sale.id}>
                  <tr 
                    className={cn(
                      "border-t border-[#141414]/5 hover:bg-[#F5F5F4]/50 transition-colors cursor-pointer",
                      expandedId === sale.id && "bg-[#F5F5F4]/30"
                    )}
                    onClick={() => setExpandedId(expandedId === sale.id ? null : sale.id)}
                  >
                    <td className="p-6 font-bold text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-[#141414]/20" />
                        {format(sale.date.toDate(), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </div>
                    </td>
                    <td className="p-6 font-black tracking-tight italic">{sale.truffleName}</td>
                    <td className="p-6 font-bold text-sm text-[#141414]/60">
                      {sale.customerName || <span className="opacity-20 italic">Venda Direta</span>}
                    </td>
                    <td className="p-6 font-black tracking-tight">R$ {sale.totalPrice.toFixed(2)}</td>
                    <td className="p-6">
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
                        sale.status === 'paid' ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"
                      )}>
                        {sale.status === 'paid' ? 'Pago' : 'Pendente'}
                      </span>
                    </td>
                    <td className="p-6">
                      <div className="flex gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadReceiptPDF(sale, settings);
                          }}
                          className="p-2 text-[#141414]/40 hover:text-[#141414] hover:bg-white rounded-xl transition-all"
                        >
                          <FileText size={18} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingId(sale.id);
                          }}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                        {expandedId === sale.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </td>
                  </tr>
                  
                  <AnimatePresence>
                    {expandedId === sale.id && (
                      <tr>
                        <td colSpan={6} className="p-0">
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-[#F5F5F4]/30 overflow-hidden"
                          >
                            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                              <div className="space-y-4">
                                <h5 className="text-[10px] font-black uppercase tracking-widest text-[#141414]/40">Detalhes do Produto</h5>
                                <div className="space-y-1">
                                  <p className="font-bold text-sm">Quantidade: <span className="font-black">{sale.quantity}</span></p>
                                  <p className="font-bold text-sm">Preço Unit.: <span className="font-black">R$ {(sale.totalPrice / sale.quantity).toFixed(2)}</span></p>
                                  <p className="font-bold text-sm">Desconto: <span className="font-black text-red-600">R$ {sale.discount.toFixed(2)}</span></p>
                                </div>
                              </div>
                              
                              <div className="space-y-4">
                                <h5 className="text-[10px] font-black uppercase tracking-widest text-[#141414]/40">Pagamento</h5>
                                <div className="space-y-1">
                                  <p className="font-bold text-sm">Método: <span className="font-black">{sale.isCredit ? 'Fiado' : 'À Vista'}</span></p>
                                  <p className="font-bold text-sm">Valor Pago: <span className="font-black text-green-600">R$ {sale.paidAmount.toFixed(2)}</span></p>
                                  <p className="font-bold text-sm">Restante: <span className="font-black text-orange-600">R$ {(sale.totalPrice - sale.paidAmount).toFixed(2)}</span></p>
                                </div>
                              </div>

                              <div className="flex items-end justify-end">
                                {sale.status === 'pending' && (
                                  <button 
                                    onClick={async () => {
                                      try {
                                        await updateDoc(doc(db, 'sales', sale.id), {
                                          status: 'paid',
                                          paidAmount: sale.totalPrice
                                        });
                                      } catch (error) {
                                        handleFirestoreError(error, OperationType.UPDATE, `sales/${sale.id}`);
                                      }
                                    }}
                                    className="bg-green-600 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg hover:bg-green-700 transition-all"
                                  >
                                    Marcar como Pago
                                  </button>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              ))}
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
              <h3 className="text-xl font-black tracking-tighter italic mb-2">Excluir Registro?</h3>
              <p className="text-[#141414]/40 font-bold text-xs mb-8">
                Tem certeza que deseja excluir esta venda do histórico? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeletingId(null)}
                  className="flex-1 py-4 font-bold text-[#141414]/40 hover:text-[#141414] transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-red-700 transition-all"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
