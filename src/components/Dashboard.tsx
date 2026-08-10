import React, { useMemo } from 'react';
import { useTheme } from './ThemeProvider';
import {
  TrendingUp,
  CreditCard,
  Wallet,
  Activity,
  PieChart as PieChartIcon, 
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
  PieChart,
  Pie,
  Cell, 
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
import { SalesCalendar } from './SalesCalendar';
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
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const textColor = isDark ? '#f4f4f5' : '#141414';
  const tooltipBg = isDark ? '#18181b' : '#ffffff';
  const tooltipBorder = isDark ? '1px solid rgba(255,255,255,0.1)' : 'none';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(20,20,20,0.05)';
  const chartColor = isDark ? '#f4f4f5' : '#141414';
  const chartCursor = isDark ? 'rgba(255,255,255,0.05)' : '#F5F5F4';
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

  const paymentMethodsData = useMemo(() => {
    const counts: Record<string, number> = {};
    activeSales.forEach(sale => {
      const method = sale.paymentMethod || 'Outros';
      counts[method] = (counts[method] || 0) + sale.totalPrice;
    });

    const methodLabels: Record<string, string> = {
      'dinheiro': 'Dinheiro',
      'cartao_debito': 'Débito',
      'cartao_credito': 'Crédito',
      'pix': 'PIX',
      'fiado': 'Fiado',
      'Outros': 'Outros'
    };

    return Object.entries(counts).map(([method, total]) => ({
      name: methodLabels[method] || method,
      value: parseFloat(total.toFixed(2))
    })).sort((a, b) => b.value - a.value);
  }, [activeSales]);
  
  const PIE_COLORS = [isDark ? '#f4f4f5' : '#141414', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

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
        
      }))
      .sort((a, b) => b.Quantidade - a.Quantidade)
      .slice(0, 5);
  }, [activeSales, truffleCosts]);

  return (
    <div className="space-y-8 font-sans">
      {/* Welcome Title */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#141414]/40 dark:text-zinc-400">Painel Executivo</p>
        <h3 className="text-3xl font-black tracking-tighter italic">Visão Geral do Negócio</h3>
        <p className="text-xs text-[#141414]/50 dark:text-zinc-400 mt-1 font-medium">Relatórios em tempo real da produção e resultados de vendas</p>
      </div>

      {/* Numerical Indicators Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Faturamento do Dia */}
        <div className="bg-white dark:bg-zinc-900 p-5 md:p-6 rounded-3xl border border-[#141414]/5 dark:border-zinc-50/10 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center gap-2 mb-2 lg:mb-3">
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <DollarSign size={16} />
            </div>
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider text-[#141414]/40 dark:text-zinc-400">Faturamento Dia</span>
          </div>
          <h4 className="text-xl md:text-2xl font-black text-[#141414] dark:text-zinc-100 tracking-tight">R$ {metrics.faturamentoDia.toFixed(2)}</h4>
          <span className="text-[8px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded uppercase tracking-wider mt-2 inline-block">Hoje</span>
        </div>

        {/* Faturamento do Mês */}
        <div className="bg-white dark:bg-zinc-900 p-5 md:p-6 rounded-3xl border border-[#141414]/5 dark:border-zinc-50/10 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2 lg:mb-3">
            <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
              <TrendingUp size={16} />
            </div>
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider text-[#141414]/40 dark:text-zinc-400">Faturamento Mês</span>
          </div>
          <h4 className="text-xl md:text-2xl font-black text-[#141414] dark:text-zinc-100 tracking-tight">R$ {metrics.faturamentoMes.toFixed(2)}</h4>
          <p className="text-[8px] font-bold text-[#141414]/30 dark:text-zinc-500 uppercase tracking-widest mt-2">{format(new Date(), 'MMMM', { locale: ptBR })}</p>
        </div>
        
        {/* Ticket Médio */}
        <div className="bg-white dark:bg-zinc-900 p-5 md:p-6 rounded-3xl border border-[#141414]/5 dark:border-zinc-50/10 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2 lg:mb-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Activity size={16} />
            </div>
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider text-[#141414]/40 dark:text-zinc-400">Ticket Médio</span>
          </div>
          <h4 className="text-xl md:text-2xl font-black text-[#141414] dark:text-zinc-100 tracking-tight">R$ {metrics.ticketMedio.toFixed(2)}</h4>
          <p className="text-[8px] font-bold text-[#141414]/30 dark:text-zinc-500 uppercase tracking-widest mt-2">Média por Venda</p>
        </div>

        {/* Total Vendas */}
        <div className="bg-white dark:bg-zinc-900 p-5 md:p-6 rounded-3xl border border-[#141414]/5 dark:border-zinc-50/10 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2 lg:mb-3">
            <div className="w-8 h-8 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
              <ShoppingBag size={16} />
            </div>
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider text-[#141414]/40 dark:text-zinc-400">Total de Vendas</span>
          </div>
          <h4 className="text-xl md:text-2xl font-black text-[#141414] dark:text-zinc-100 tracking-tight">{metrics.totalVendasPeriodo}</h4>
          <p className="text-[8px] font-bold text-[#141414]/30 dark:text-zinc-500 uppercase tracking-widest mt-2">Pedidos no Período</p>
        </div>
      </div>
      
      {/* Evolução de faturamento vs lucro */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-[2rem] border border-[#141414]/5 dark:border-zinc-50/10 shadow-sm">
          <h4 className="text-sm font-black uppercase tracking-widest text-[#141414]/40 dark:text-zinc-400 mb-6">
            Evolução de Faturamento
          </h4>
          <div className="h-[250px] md:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesEvolutionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColor} stopOpacity={0.1}/>
                    <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis 
                  dataKey="dia" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: textColor, opacity: 0.5, fontWeight: 700 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: textColor, opacity: 0.5, fontWeight: 700 }}
                  tickFormatter={(value) => `R$${value}`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: tooltipBorder, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', backgroundColor: tooltipBg, color: textColor }}
                  itemStyle={{ fontWeight: 800, color: textColor }}
                  labelStyle={{ fontWeight: 800, color: textColor, opacity: 0.5, marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="Faturamento" stroke={chartColor} strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-[2rem] border border-[#141414]/5 dark:border-zinc-50/10 shadow-sm">
          <h4 className="text-sm font-black uppercase tracking-widest text-[#141414]/40 dark:text-zinc-400 mb-6">
            Top 5 Produtos (Quantidade)
          </h4>
          <div className="h-[250px] md:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProductsData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={gridColor} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  width={100}
                  tick={{ fontSize: 10, fill: textColor, fontWeight: 800 }} 
                />
                <Tooltip 
                  cursor={{ fill: chartCursor }}
                  contentStyle={{ borderRadius: '1rem', border: tooltipBorder, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', backgroundColor: tooltipBg, color: textColor }}
                  itemStyle={{ fontWeight: 800, color: textColor }}
                />
                <Bar dataKey="Quantidade" fill={chartColor} radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Second Row of Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-[2rem] border border-[#141414]/5 dark:border-zinc-50/10 shadow-sm">
          <h4 className="text-sm font-black uppercase tracking-widest text-[#141414]/40 dark:text-zinc-400 mb-6 flex items-center gap-2">
            <Wallet size={16} /> Faturamento por Forma de Pagamento
          </h4>
          <div className="h-[250px] md:h-[300px] w-full flex items-center justify-center">
            {paymentMethodsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {paymentMethodsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '1rem', border: tooltipBorder, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', backgroundColor: tooltipBg, color: textColor }}
                    itemStyle={{ fontWeight: 800, color: textColor }}
                    formatter={(value) => `R$ ${value}`}
                  />
                  <Legend 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right"
                    wrapperStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', opacity: 0.7 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-[#141414]/40 dark:text-zinc-400 font-bold uppercase tracking-widest">Sem dados no período</p>
            )}
          </div>
        </div>
      </div>
      {/* Third Row: Heatmap Calendar */}
      <div className="grid grid-cols-1 gap-6 md:gap-8">
        <SalesCalendar sales={activeSales} />
      </div>
    </div>
  );
};

export default Dashboard;
