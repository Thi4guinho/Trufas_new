import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  ShoppingBag, 
  Users, 
  AlertTriangle,
  ArrowUpRight,
  DollarSign,
  Briefcase,
  Layers,
  Award
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Sale, Truffle, UserSettings } from '../types';
import { cn } from '../utils';
import { 
  format, 
  isToday, 
  isThisWeek, 
  isThisMonth, 
  subDays, 
  eachDayOfInterval, 
  startOfMonth, 
  endOfMonth,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardProps {
  sales: Sale[];
  truffles: Truffle[];
  customersCount: number;
  settings: UserSettings | null;
  onTabChange: (tab: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  sales, 
  truffles, 
  customersCount, 
  settings, 
  onTabChange 
}) => {
  // Low stock check limit (uses user setting or defaults to 5)
  const lowStockLimit = settings?.lowStockAlert || 5;

  const activeSales = useMemo(() => {
    return sales.filter(s => s.status !== 'cancelled');
  }, [sales]);

  // Helper dictionary for quick truffle cost lookup
  const truffleCosts = useMemo(() => {
    const dict: { [id: string]: number } = {};
    truffles.forEach(t => {
      dict[t.id] = t.cost || 0;
    });
    return dict;
  }, [truffles]);

  // Helper dictionary for truffle price lookup
  const trufflePrices = useMemo(() => {
    const dict: { [id: string]: number } = {};
    truffles.forEach(t => {
      dict[t.id] = t.price || 0;
    });
    return dict;
  }, [truffles]);

  // Calculate profit for any single sale
  const calculateSaleProfit = (sale: Sale): number => {
    let profit = 0;
    if (sale.items && sale.items.length > 0) {
      sale.items.forEach(item => {
        const costRaw = item.costPerUnit !== undefined ? item.costPerUnit : (truffleCosts[item.truffleId] || 0);
        const cost = Number(costRaw) || 0;
        const price = Number(item.pricePerUnit) || 0;
        const qty = Number(item.quantity) || 0;
        profit += qty * (price - cost);
      });
      // Deduct overall manual discount, if any
      profit -= (sale.discount || 0);
    } else {
      // Legacy backward compatible check
      const truffleId = sale.truffleId || '';
      const unitCost = truffleCosts[truffleId] || 0;
      profit = sale.totalPrice - (sale.quantity * unitCost);
    }
    return Math.max(0, profit);
  };

  // 1. Calculations for Financial and Quantity Indicators
  const metrics = useMemo(() => {
    let faturamentoDia = 0;
    let faturamentoSemana = 0;
    let faturamentoMes = 0;

    let lucroDia = 0;
    let lucroMes = 0;

    const today = new Date();

    activeSales.forEach(sale => {
      const saleDate = sale.date.toDate();
      const value = sale.totalPrice;
      const profit = calculateSaleProfit(sale);

      if (isToday(saleDate)) {
        faturamentoDia += value;
        lucroDia += profit;
      }

      if (isThisWeek(saleDate, { weekStartsOn: 0 })) {
        faturamentoSemana += value;
      }

      if (isThisMonth(saleDate)) {
        faturamentoMes += value;
        lucroMes += profit;
      }
    });

    const totalVendasPeriodo = activeSales.length;
    const ticketMedio = totalVendasPeriodo > 0 
      ? activeSales.reduce((acc, s) => acc + s.totalPrice, 0) / totalVendasPeriodo 
      : 0;

    // Best Seller / Most Profitable tracking
    const productSalesQty: { [name: string]: number } = {};
    const productProfits: { [name: string]: number } = {};

    activeSales.forEach(sale => {
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach(item => {
          const name = item.truffleName;
          const qty = Number(item.quantity) || 0;
          const costRaw = item.costPerUnit !== undefined ? item.costPerUnit : (truffleCosts[item.truffleId] || 0);
          const cost = Number(costRaw) || 0;
          const price = Number(item.pricePerUnit) || 0;
          const profit = qty * (price - cost);

          productSalesQty[name] = (productSalesQty[name] || 0) + qty;
          productProfits[name] = (productProfits[name] || 0) + profit;
        });
      } else if (sale.truffleName) {
        // Legacy
        const name = sale.truffleName;
        const qty = sale.quantity;
        const truffleId = sale.truffleId || '';
        const unitCost = truffleCosts[truffleId] || 0;
        const profit = sale.totalPrice - (qty * unitCost);

        productSalesQty[name] = (productSalesQty[name] || 0) + qty;
        productProfits[name] = (productProfits[name] || 0) + profit;
      }
    });

    let bestSellerName = 'Nenhum';
    let bestSellerQty = 0;
    Object.entries(productSalesQty).forEach(([name, qty]) => {
      if (qty > bestSellerQty) {
        bestSellerQty = qty;
        bestSellerName = name;
      }
    });

    let mostProfitableName = 'Nenhum';
    let mostProfitableValue = 0;
    Object.entries(productProfits).forEach(([name, profit]) => {
      if (profit > mostProfitableValue) {
        mostProfitableValue = profit;
        mostProfitableName = name;
      }
    });

    // Stock alerts
    const lowStockCount = truffles.filter(t => t.stock <= lowStockLimit).length;

    return {
      faturamentoDia,
      faturamentoSemana,
      faturamentoMes,
      lucroDia,
      lucroMes,
      totalVendasPeriodo,
      ticketMedio,
      bestSellerName,
      bestSellerQty,
      mostProfitableName,
      mostProfitableValue,
      lowStockCount
    };
  }, [activeSales, truffles, truffleCosts, lowStockLimit]);

  // 2. Charts Data Processing
  // Vendas por período (last 15 days evolution)
  const salesEvolutionData = useMemo(() => {
    const end = new Date();
    const start = subDays(end, 14); // 15 days window
    const days = eachDayOfInterval({ start, end });

    return days.map(day => {
      const formattedDay = format(day, 'dd/MM');
      let totalRevenue = 0;
      let totalProfit = 0;

      activeSales.forEach(sale => {
        const sDate = sale.date.toDate();
        if (format(sDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')) {
          totalRevenue += sale.totalPrice;
          totalProfit += calculateSaleProfit(sale);
        }
      });

      return {
        dia: formattedDay,
        Faturamento: parseFloat(totalRevenue.toFixed(2)),
        Lucro: parseFloat(totalProfit.toFixed(2))
      };
    });
  }, [activeSales, truffleCosts]);

  // Product sales chart (Top 5 products)
  const topProductsData = useMemo(() => {
    const counts: { [name: string]: { qty: number; profit: number } } = {};
    
    activeSales.forEach(sale => {
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach(item => {
          const name = item.truffleName;
          const qty = Number(item.quantity) || 0;
          const costRaw = item.costPerUnit !== undefined ? item.costPerUnit : (truffleCosts[item.truffleId] || 0);
          const cost = Number(costRaw) || 0;
          const price = Number(item.pricePerUnit) || 0;
          const profit = qty * (price - cost);

          if (!counts[name]) counts[name] = { qty: 0, profit: 0 };
          counts[name].qty += qty;
          counts[name].profit += profit;
        });
      } else if (sale.truffleName) {
        const name = sale.truffleName;
        const qty = sale.quantity;
        const truffleId = sale.truffleId || '';
        const unitCost = truffleCosts[truffleId] || 0;
        const profit = sale.totalPrice - (qty * unitCost);

        if (!counts[name]) counts[name] = { qty: 0, profit: 0 };
        counts[name].qty += qty;
        counts[name].profit += profit;
      }
    });

    return Object.entries(counts)
      .map(([name, stat]) => ({
        name,
        Quantidade: stat.qty,
        Lucro: parseFloat(stat.profit.toFixed(2))
      }))
      .sort((a, b) => b.Quantidade - a.Quantidade)
      .slice(0, 5);
  }, [activeSales, truffleCosts]);

  return (
    <div className="space-y-8 font-sans">
      {/* Welcome Title */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#141414]/40">Painel Executivo</p>
        <h3 className="text-3xl font-black tracking-tighter italic">Visão Geral do Negócio</h3>
        <p className="text-xs text-[#141414]/50 mt-1 font-medium">Relatórios em tempo real da produção e resultados de vendas</p>
      </div>

      {/* Numerical Indicators Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Faturamento do Dia */}
        <div className="bg-white p-5 md:p-6 rounded-3xl border border-[#141414]/5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center gap-2 mb-2 lg:mb-3">
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <DollarSign size={16} />
            </div>
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider text-[#141414]/40">Faturamento Dia</span>
          </div>
          <h4 className="text-xl md:text-2xl font-black text-[#141414] tracking-tight">R$ {metrics.faturamentoDia.toFixed(2)}</h4>
          <span className="text-[8px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded uppercase tracking-wider mt-2 inline-block">Hoje</span>
        </div>

        {/* Faturamento do Mês */}
        <div className="bg-white p-5 md:p-6 rounded-3xl border border-[#141414]/5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2 lg:mb-3">
            <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
              <TrendingUp size={16} />
            </div>
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider text-[#141414]/40">Faturamento Mês</span>
          </div>
          <h4 className="text-xl md:text-2xl font-black text-[#141414] tracking-tight">R$ {metrics.faturamentoMes.toFixed(2)}</h4>
          <p className="text-[8px] font-bold text-[#141414]/30 uppercase tracking-widest mt-2">{format(new Date(), 'MMMM', { locale: ptBR })}</p>
        </div>

        {/* Lucro do Mês */}
        <div className="bg-white p-5 md:p-6 rounded-3xl border border-[#141414]/5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2 lg:mb-3">
            <div className="w-8 h-8 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
              <ArrowUpRight size={16} />
            </div>
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider text-[#141414]/40">Lucro Líquido Mês</span>
          </div>
          <h4 className="text-xl md:text-2xl font-black text-green-600 tracking-tight">R$ {metrics.lucroMes.toFixed(2)}</h4>
          <span className="text-[8px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded uppercase tracking-wider mt-2 inline-block">Estimado</span>
        </div>

        {/* Ticket Médio */}
        <div className="bg-white p-5 md:p-6 rounded-3xl border border-[#141414]/5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2 lg:mb-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Layers size={16} />
            </div>
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider text-[#141414]/40">Ticket Médio</span>
          </div>
          <h4 className="text-xl md:text-2xl font-black text-[#141414] tracking-tight">R$ {metrics.ticketMedio.toFixed(2)}</h4>
          <p className="text-[8px] font-bold text-[#141414]/30 uppercase tracking-widest mt-2">{metrics.totalVendasPeriodo} Vagas totais</p>
        </div>
      </div>

      {/* Secondary Quick Metrics Cards (Customer count, lowest stock, Best Seller, Profit Champion) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-[#FAF9F5] p-5 rounded-2xl border border-[#141414]/5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Award size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[8px] font-black uppercase tracking-wider text-[#141414]/40">Mais Vendido</p>
            <h5 className="font-black text-xs text-[#141414] leading-tight truncate">{metrics.bestSellerName}</h5>
            <span className="text-[8px] font-bold text-[#141414]/40">{metrics.bestSellerQty} un. vendidas</span>
          </div>
        </div>

        <div className="bg-[#FAF9F5] p-5 rounded-2xl border border-[#141414]/5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <Briefcase size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[8px] font-black uppercase tracking-wider text-[#141414]/40">Mais Lucrativo</p>
            <h5 className="font-black text-xs text-[#141414] leading-tight truncate">{metrics.mostProfitableName}</h5>
            <span className="text-[8px] font-bold text-green-600">R$ {metrics.mostProfitableValue.toFixed(2)}</span>
          </div>
        </div>

        <div 
          onClick={() => onTabChange('settings')} 
          className="bg-[#FAF9F5] p-5 rounded-2xl border border-[#141414]/5 flex items-center gap-4 cursor-pointer hover:bg-white transition-colors group"
        >
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <AlertTriangle size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[8px] font-black uppercase tracking-wider text-[#141414]/40">Estoque Baixo</p>
            <h5 className="font-black text-xs text-[#141414] leading-tight truncate">{metrics.lowStockCount} Produtos</h5>
            <span className="text-[8px] font-bold text-red-600 hover:underline">Ver Alertas</span>
          </div>
        </div>

        <div 
          onClick={() => onTabChange('settings')} 
          className="bg-[#FAF9F5] p-5 rounded-2xl border border-[#141414]/5 flex items-center gap-4 cursor-pointer hover:bg-white transition-colors group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#141414]/5 text-[#141414] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Users size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[8px] font-black uppercase tracking-wider text-[#141414]/40">Total Clientes</p>
            <h5 className="font-black text-xs text-[#141414] leading-tight truncate">{customersCount} Cadastrados</h5>
            <span className="text-[8px] font-bold text-[#141414]/40">Gerenciar clientes</span>
          </div>
        </div>
      </div>

      {/* Charts Panels Block */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Evolução de faturamento vs lucro */}
        <div className="lg:col-span-8 bg-white p-6 md:p-8 rounded-[2.5rem] border border-[#141414]/5 shadow-sm">
          <div className="mb-6">
            <h4 className="text-lg font-black tracking-tight italic">Evolução de Vendas de Caixa</h4>
            <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest mt-0.5">Últimos 15 dias de movimentações</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesEvolutionData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#141414" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#141414" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f0" />
                <XAxis 
                  dataKey="dia" 
                  stroke="#141414" 
                  opacity={0.3} 
                  style={{ fontSize: '10px', fontWeight: 'bold' }} 
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#141414" 
                  opacity={0.3} 
                  style={{ fontSize: '10px', fontWeight: 'bold' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `R$ ${value}`}
                />
                <Tooltip 
                  content={({ active, payload, label }: any) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#141414] text-white p-4 rounded-2xl shadow-xl border border-white/10 text-xs font-bold min-w-[150px]">
                          <p className="mb-3 uppercase tracking-widest text-white/50 text-[10px] border-b border-white/10 pb-2">{label}</p>
                          {payload.map((entry: any, index: number) => (
                            <div key={index} className="flex justify-between items-center gap-4 mb-2 last:mb-0">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="opacity-75">{entry.name}:</span>
                              </div>
                              <span>R$ {entry.value !== undefined ? Number(entry.value).toFixed(2) : '0.00'}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="Faturamento" stroke="#141414" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="Lucro" stroke="#16a34a" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products bar chart */}
        <div className="lg:col-span-4 bg-white p-6 md:p-8 rounded-[2.5rem] border border-[#141414]/5 shadow-sm">
          <div className="mb-6">
            <h4 className="text-lg font-black tracking-tight italic">Mais Vendidos</h4>
            <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest mt-0.5">Top 5 sabores de produtos (Unidades)</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProductsData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f1f0" />
                <XAxis 
                  type="number" 
                  stroke="#141414" 
                  opacity={0.3} 
                  style={{ fontSize: '10px', fontWeight: 'bold' }} 
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="#141414" 
                  opacity={0.7} 
                  width={90} 
                  style={{ fontSize: "10px", fontWeight: "bold" }} 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => value.length > 12 ? `${value.substring(0, 10)}...` : value}
                />
                <Tooltip 
                  cursor={{ fill: '#f5f5f4' }}
                  content={({ active, payload, label }: any) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#141414] text-white p-4 rounded-2xl shadow-xl border border-white/10 text-xs font-bold">
                          <p className="mb-3 uppercase tracking-widest text-white/50 text-[10px] border-b border-white/10 pb-2">{label}</p>
                          {payload.map((entry: any, index: number) => (
                            <div key={index} className="flex justify-between items-center gap-4 mb-2 last:mb-0">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="opacity-75">{entry.name}:</span>
                              </div>
                              <span>{entry.value} un.</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="Quantidade" fill="#141414" radius={[0, 8, 8, 0]} barSize={24}>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
