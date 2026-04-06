import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  DollarSign, 
  AlertCircle, 
  TrendingUp, 
  Package, 
  ArrowRight, 
  History 
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Sale, Truffle, UserSettings } from '../types';
import { cn } from '../utils';

interface DashboardProps {
  sales: Sale[];
  truffles: Truffle[];
  onTabChange: (tab: any) => void;
  settings: UserSettings | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ sales, truffles, onTabChange, settings }) => {
  const stats = useMemo(() => {
    const totalRevenue = sales.reduce((acc, s) => acc + s.totalPrice, 0);
    const pendingRevenue = sales.filter(s => s.status === 'pending').reduce((acc, s) => acc + (s.totalPrice - (s.paidAmount || 0)), 0);
    const totalSales = sales.length;
    const threshold = settings?.lowStockAlert || 10;
    const lowStock = truffles.filter(t => t.stock < threshold).length;

    return { totalRevenue, pendingRevenue, totalSales, lowStock };
  }, [sales, truffles, settings]);

  return (
    <div className="space-y-8">
      {settings?.businessName && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-2"
        >
          <h1 className="text-5xl font-black tracking-tighter italic text-[#141414]">{settings.businessName}</h1>
        </motion.div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { id: 'sales', label: 'Receita Total', value: `R$${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'bg-green-50 text-green-600' },
          { id: 'pending', label: 'Pendente (Fiado)', value: `R$${stats.pendingRevenue.toFixed(2)}`, icon: AlertCircle, color: 'bg-orange-50 text-orange-600' },
          { id: 'sales', label: 'Total de Vendas', value: stats.totalSales, icon: TrendingUp, color: 'bg-blue-50 text-blue-600' },
          { id: 'inventory', label: 'Estoque Baixo', value: stats.lowStock, icon: Package, color: 'bg-red-50 text-red-600' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => onTabChange(stat.id)}
            className="bg-white p-6 rounded-3xl border border-[#141414]/5 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-95"
          >
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4", stat.color)}>
              <stat.icon size={24} />
            </div>
            <p className="text-xs font-bold text-[#141414]/40 uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className="text-2xl font-black text-[#141414] tracking-tight">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2rem] border border-[#141414]/5 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black tracking-tight italic">Vendas Recentes</h3>
              <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest mt-1">Últimas 5 transações</p>
            </div>
            <button 
              onClick={() => onTabChange('admin')}
              className="flex items-center justify-center w-10 h-10 bg-[#F5F5F4] hover:bg-[#141414] hover:text-white rounded-xl transition-all group"
              title="Ver Todas as Vendas"
            >
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <div className="space-y-3">
            {sales.slice(0, 5).map((sale, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                key={i} 
                className="flex items-center justify-between p-4 bg-[#F5F5F4]/50 hover:bg-[#F5F5F4] rounded-2xl transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <History size={18} className="text-[#141414]/40" />
                  </div>
                  <div>
                    <p className="font-bold text-sm leading-tight">{sale.truffleName || 'Trufa Desconhecida'}</p>
                    <p className="text-[9px] text-[#141414]/40 font-bold uppercase tracking-wider mt-0.5">
                      {format(sale.date.toDate(), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-sm">R${sale.totalPrice.toFixed(2)}</p>
                  <span className={cn(
                    "text-[7px] font-black uppercase px-2 py-0.5 rounded-full tracking-widest",
                    sale.status === 'paid' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                  )}>
                    {sale.status === 'paid' ? 'pago' : 'pendente'}
                  </span>
                </div>
              </motion.div>
            ))}
            {sales.length === 0 && (
              <div className="py-10 text-center opacity-20">
                <History size={40} className="mx-auto mb-2" />
                <p className="text-xs font-bold uppercase tracking-widest">Nenhuma venda registrada</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-[#141414]/5 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black tracking-tight italic">Status do Estoque</h3>
              <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest mt-1">Níveis de disponibilidade</p>
            </div>
            <button 
              onClick={() => onTabChange('inventory')}
              className="flex items-center justify-center w-10 h-10 bg-[#F5F5F4] hover:bg-[#141414] hover:text-white rounded-xl transition-all group"
              title="Ver Estoque Completo"
            >
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <div className="space-y-6">
            {truffles.slice(0, 5).map((truffle, i) => {
              const threshold = settings?.lowStockAlert || 10;
              const isLow = truffle.stock < threshold;
              const percentage = Math.min((truffle.stock / 50) * 100, 100);
              return (
                <motion.div 
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={i} 
                  className="space-y-2"
                >
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-sm font-black tracking-tight">{truffle.name}</p>
                      <p className={cn(
                        "text-[9px] font-black uppercase tracking-widest",
                        isLow ? "text-red-500" : "text-[#141414]/40"
                      )}>
                        {isLow ? 'Estoque Crítico' : 'Estoque Estável'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        "text-lg font-black leading-none",
                        isLow ? "text-red-600" : "text-[#141414]"
                      )}>
                        {truffle.stock}
                      </span>
                      <span className="text-[10px] font-bold text-[#141414]/20 ml-1 uppercase">unid</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-[#F5F5F4] rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      className={cn(
                        "h-full rounded-full transition-colors duration-500",
                        isLow ? "bg-red-500" : "bg-[#141414]"
                      )}
                    />
                  </div>
                </motion.div>
              );
            })}
            {truffles.length === 0 && (
              <div className="py-10 text-center opacity-20">
                <Package size={40} className="mx-auto mb-2" />
                <p className="text-xs font-bold uppercase tracking-widest">Nenhum produto cadastrado</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
