import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight 
} from 'lucide-react';
import { updateDoc, doc } from 'firebase/firestore';
import { Sale, OperationType } from '../types';
import { db } from '../firebase';
import { handleFirestoreError, cn } from '../utils';

interface PendingPaymentsProps {
  sales: Sale[];
}

export const PendingPayments: React.FC<PendingPaymentsProps> = ({ sales }) => {
  const pendingSales = useMemo(() => {
    return sales.filter(s => s.status === 'pending');
  }, [sales]);

  const groupedByCustomer = useMemo<Record<string, Sale[]>>(() => {
    const groups: Record<string, Sale[]> = {};
    pendingSales.forEach(sale => {
      const name = sale.customerName || 'Cliente Desconhecido';
      if (!groups[name]) groups[name] = [];
      groups[name].push(sale);
    });
    return groups;
  }, [pendingSales]);

  const handlePayAll = async (customerName: string, customerSales: Sale[]) => {
    try {
      await Promise.all(customerSales.map(sale => 
        updateDoc(doc(db, 'sales', sale.id), {
          status: 'paid',
          paidAmount: sale.totalPrice
        })
      ));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'sales');
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <AnimatePresence mode="popLayout">
        {Object.entries(groupedByCustomer).map(([name, customerSales], i) => {
          const totalDebt = (customerSales as Sale[]).reduce((acc, s) => acc + (s.totalPrice - s.paidAmount), 0);
          
          return (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.05 }}
              key={name} 
              className="bg-white p-8 rounded-[2.5rem] border border-[#141414]/5 shadow-xl hover:shadow-2xl transition-all group"
            >
              <div className="flex items-start justify-between mb-8">
                <div className="w-16 h-16 bg-[#F5F5F4] rounded-2xl flex items-center justify-center group-hover:bg-[#141414] group-hover:text-white transition-colors">
                  <User size={32} />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-1">Dívida Total</p>
                  <p className="text-2xl font-black tracking-tighter text-red-600">R$ {totalDebt.toFixed(2)}</p>
                </div>
              </div>

              <div className="space-y-1 mb-8">
                <h4 className="text-2xl font-black tracking-tighter italic">{name}</h4>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#141414]/40">
                  {(customerSales as Sale[]).length} {(customerSales as Sale[]).length === 1 ? 'venda pendente' : 'vendas pendentes'}
                </p>
              </div>

              <div className="space-y-3 mb-8">
                {(customerSales as Sale[]).map(sale => (
                  <div key={sale.id} className="flex items-center justify-between p-3 bg-[#F5F5F4]/50 rounded-xl text-[10px] font-bold uppercase tracking-widest">
                    <span className="flex items-center gap-2">
                      <AlertCircle size={12} className="text-orange-500" />
                      {sale.truffleName} ({sale.quantity}x)
                    </span>
                    <span>R$ {(sale.totalPrice - sale.paidAmount).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => handlePayAll(name, customerSales as Sale[])}
                className="w-full bg-green-600 text-white py-4 rounded-2xl font-black text-sm tracking-tight hover:bg-green-700 transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-3"
              >
                <CheckCircle2 size={18} />
                Marcar Tudo como Pago
                <ArrowRight size={16} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {Object.keys(groupedByCustomer).length === 0 && (
        <div className="col-span-full py-20 text-center">
          <div className="w-20 h-20 bg-green-50 text-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h3 className="text-2xl font-black tracking-tighter italic mb-2">Tudo em Dia!</h3>
          <p className="text-[#141414]/40 font-bold text-sm">Não há pagamentos pendentes no momento.</p>
        </div>
      )}
    </div>
  );
};
