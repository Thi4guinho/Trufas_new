const fs = require('fs');

const componentContent = `import React, { useMemo, useState } from 'react';
import { 
  format, 
  eachDayOfInterval, 
  startOfMonth, 
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  isSameMonth,
  addMonths,
  subMonths,
  isToday,
  addDays,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Sale } from '../types';
import { Calendar, ChevronLeft, ChevronRight, X, Clock, CreditCard, ShoppingBag, TrendingUp } from 'lucide-react';
import { cn } from '../utils';

type Period = 'week' | 'month' | 'quarter' | 'year';

interface SalesCalendarProps {
  sales: Sale[];
}

export const SalesCalendar: React.FC<SalesCalendarProps> = ({ sales }) => {
  const [period, setPeriod] = useState<Period>('month');
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Aggregate sales by day (YYYY-MM-DD)
  const salesByDayDetails = useMemo(() => {
    const map = new Map<string, { total: number, quantity: number, products: Record<string, number>, payments: Record<string, number>, hours: Record<string, number> }>();
    
    sales.forEach(s => {
      const date = s.date.toDate();
      const dateStr = format(date, 'yyyy-MM-dd');
      const hour = date.getHours();
      
      if (!map.has(dateStr)) {
        map.set(dateStr, { total: 0, quantity: 0, products: {}, payments: {}, hours: {} });
      }
      
      const dayData = map.get(dateStr)!;
      dayData.total += s.totalPrice;
      
      s.items.forEach(item => {
        dayData.quantity += item.quantity;
        dayData.products[item.name] = (dayData.products[item.name] || 0) + item.quantity;
      });
      
      dayData.payments[s.paymentMethod] = (dayData.payments[s.paymentMethod] || 0) + s.totalPrice;
      dayData.hours[hour] = (dayData.hours[hour] || 0) + 1;
    });
    return map;
  }, [sales]);

  // Determine current period date range
  const { start, end } = useMemo(() => {
    switch (period) {
      case 'week':
        return { start: startOfWeek(referenceDate, { weekStartsOn: 0 }), end: endOfWeek(referenceDate, { weekStartsOn: 0 }) };
      case 'month':
        return { start: startOfMonth(referenceDate), end: endOfMonth(referenceDate) };
      case 'quarter':
        return { start: startOfQuarter(referenceDate), end: endOfQuarter(referenceDate) };
      case 'year':
        return { start: startOfYear(referenceDate), end: endOfYear(referenceDate) };
    }
  }, [period, referenceDate]);

  // Get days in interval
  const days = useMemo(() => eachDayOfInterval({ start, end }), [start, end]);

  // Calculate thresholds for the current view
  const maxSales = useMemo(() => {
    let max = 0;
    days.forEach(day => {
      const val = salesByDayDetails.get(format(day, 'yyyy-MM-dd'))?.total || 0;
      if (val > max) max = val;
    });
    return max;
  }, [days, salesByDayDetails]);

  const getIntensityClass = (val: number) => {
    if (val === 0) return 'bg-[#141414]/5 dark:bg-zinc-800 text-transparent hover:text-[#141414]/30 dark:hover:text-zinc-500';
    if (val <= maxSales * 0.33) return 'bg-emerald-200 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200';
    if (val <= maxSales * 0.66) return 'bg-emerald-400 dark:bg-emerald-600 text-emerald-900 dark:text-emerald-100';
    return 'bg-emerald-600 dark:bg-emerald-400 text-white dark:text-emerald-950 font-bold';
  };

  const nextPeriod = () => {
    if (period === 'week') setReferenceDate(d => addDays(d, 7));
    if (period === 'month') setReferenceDate(d => addMonths(d, 1));
    if (period === 'quarter') setReferenceDate(d => addMonths(d, 3));
    if (period === 'year') setReferenceDate(d => addMonths(d, 12));
  };

  const prevPeriod = () => {
    if (period === 'week') setReferenceDate(d => addDays(d, -7));
    if (period === 'month') setReferenceDate(d => addMonths(d, -1));
    if (period === 'quarter') setReferenceDate(d => addMonths(d, -3));
    if (period === 'year') setReferenceDate(d => addMonths(d, -12));
  };

  const title = useMemo(() => {
    if (period === 'week') return \`Semana de \${format(start, "dd 'de' MMM", { locale: ptBR })} - \${format(end, "dd 'de' MMM", { locale: ptBR })}\`;
    if (period === 'month') return format(referenceDate, 'MMMM yyyy', { locale: ptBR });
    if (period === 'quarter') return \`\${format(start, 'MMM', { locale: ptBR })} - \${format(end, 'MMM yyyy', { locale: ptBR })}\`;
    if (period === 'year') return format(referenceDate, 'yyyy', { locale: ptBR });
  }, [period, referenceDate, start, end]);

  // Extract unique months to render multiple month blocks
  const months = useMemo(() => {
    const m = [];
    let current = startOfMonth(start);
    while (current <= end) {
      m.push(current);
      current = addMonths(current, 1);
    }
    return m;
  }, [start, end]);

  const renderDetailsModal = () => {
    if (!selectedDate) return null;
    
    const details = salesByDayDetails.get(selectedDate);
    const dateObj = new Date(selectedDate + "T12:00:00"); // avoid tz shifts
    
    // Calculate tops
    let topProduct = 'Nenhum';
    let topPayment = 'Nenhuma';
    let peakHour = 'Nenhum';
    
    if (details && details.total > 0) {
      topProduct = Object.entries(details.products).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Nenhum';
      const pmMap: Record<string, string> = {
        'pix': 'PIX',
        'credit': 'Crédito',
        'debit': 'Débito',
        'cash': 'Dinheiro'
      };
      const bestPm = Object.entries(details.payments).sort((a, b) => b[1] - a[1])[0]?.[0];
      topPayment = pmMap[bestPm] || bestPm || 'Nenhuma';
      
      const bestHour = Object.entries(details.hours).sort((a, b) => b[1] - a[1])[0]?.[0];
      peakHour = bestHour ? \`\${bestHour}h - \${Number(bestHour)+1}h\` : 'Nenhum';
    }

    return (
      <div className="fixed inset-0 bg-[#141414]/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedDate(null)}>
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 w-full max-w-sm shadow-2xl relative" onClick={e => e.stopPropagation()}>
          <button 
            onClick={() => setSelectedDate(null)}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-[#141414]/5 dark:bg-zinc-800 text-[#141414]/40 dark:text-zinc-400 hover:text-[#141414] dark:hover:text-zinc-100 transition-colors"
          >
            <X size={16} />
          </button>
          
          <div className="mb-6">
            <h3 className="text-2xl font-black tracking-tighter italic text-[#141414] dark:text-zinc-100">
              {format(dateObj, "dd 'de' MMMM", { locale: ptBR })}
            </h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40 dark:text-zinc-500">
              {format(dateObj, "EEEE", { locale: ptBR })}
            </p>
          </div>
          
          {(!details || details.total === 0) ? (
            <div className="text-center py-8">
              <p className="text-sm font-bold text-[#141414]/40 dark:text-zinc-500 uppercase tracking-widest">Nenhuma venda neste dia</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-[#F5F5F4] dark:bg-zinc-800 p-4 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40 dark:text-zinc-400">Faturamento Total</p>
                  <p className="text-xl font-black text-[#141414] dark:text-zinc-100">R$ {details.total.toFixed(2)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#FAF9F5] dark:bg-zinc-800/50 p-4 rounded-2xl border border-[#141414]/5 dark:border-zinc-50/5">
                  <ShoppingBag size={14} className="text-[#141414]/40 dark:text-zinc-400 mb-2" />
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#141414]/40 dark:text-zinc-400">Produto Mais Vendido</p>
                  <p className="text-sm font-black text-[#141414] dark:text-zinc-100 mt-0.5 truncate">{topProduct}</p>
                </div>
                
                <div className="bg-[#FAF9F5] dark:bg-zinc-800/50 p-4 rounded-2xl border border-[#141414]/5 dark:border-zinc-50/5">
                  <ShoppingBag size={14} className="text-[#141414]/40 dark:text-zinc-400 mb-2" />
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#141414]/40 dark:text-zinc-400">Itens Vendidos</p>
                  <p className="text-sm font-black text-[#141414] dark:text-zinc-100 mt-0.5">{details.quantity} un.</p>
                </div>
                
                <div className="bg-[#FAF9F5] dark:bg-zinc-800/50 p-4 rounded-2xl border border-[#141414]/5 dark:border-zinc-50/5">
                  <CreditCard size={14} className="text-[#141414]/40 dark:text-zinc-400 mb-2" />
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#141414]/40 dark:text-zinc-400">Principal Pgto.</p>
                  <p className="text-sm font-black text-[#141414] dark:text-zinc-100 mt-0.5 truncate">{topPayment}</p>
                </div>
                
                <div className="bg-[#FAF9F5] dark:bg-zinc-800/50 p-4 rounded-2xl border border-[#141414]/5 dark:border-zinc-50/5">
                  <Clock size={14} className="text-[#141414]/40 dark:text-zinc-400 mb-2" />
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#141414]/40 dark:text-zinc-400">Horário de Pico</p>
                  <p className="text-sm font-black text-[#141414] dark:text-zinc-100 mt-0.5">{peakHour}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-[2rem] border border-[#141414]/5 dark:border-zinc-50/10 shadow-sm flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h4 className="text-sm font-black uppercase tracking-widest text-[#141414]/40 dark:text-zinc-400 flex items-center gap-2">
          <Calendar size={16} /> Calendário de Vendas
        </h4>
        <div className="flex items-center gap-4 w-full sm:w-auto overflow-x-auto no-scrollbar pb-2 sm:pb-0">
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={prevPeriod} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F5F5F4] dark:hover:bg-zinc-800 text-[#141414]/40 dark:text-zinc-400 hover:text-[#141414] dark:hover:text-zinc-100 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#141414] dark:text-zinc-100 w-32 text-center truncate">
              {title}
            </span>
            <button onClick={nextPeriod} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F5F5F4] dark:hover:bg-zinc-800 text-[#141414]/40 dark:text-zinc-400 hover:text-[#141414] dark:hover:text-zinc-100 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="flex bg-[#F5F5F4] dark:bg-zinc-800 rounded-xl p-1 border border-[#141414]/5 dark:border-white/5 shrink-0">
            {(['week', 'month', 'quarter', 'year'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                  period === p 
                    ? "bg-white dark:bg-zinc-700 text-[#141414] dark:text-white shadow-sm" 
                    : "text-[#141414]/40 dark:text-zinc-400 hover:text-[#141414] dark:hover:text-zinc-200"
                )}
              >
                {p === 'week' ? 'Sem' : p === 'month' ? 'Mês' : p === 'quarter' ? 'Tri' : 'Ano'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[250px] flex items-center justify-center">
        {period === 'week' ? (
          <div className="flex w-full gap-2 overflow-x-auto pb-4 no-scrollbar">
            {days.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const val = salesByDayDetails.get(dateStr)?.total || 0;
              const isCurr = isToday(day);
              
              return (
                <button 
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={cn(
                    "flex-1 min-w-[60px] h-32 rounded-2xl p-3 flex flex-col items-center justify-center transition-all group hover:scale-[1.02] active:scale-95",
                    getIntensityClass(val),
                    isCurr && "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900 ring-[#141414] dark:ring-white"
                  )}
                >
                  <div className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-1">{format(day, 'EEE', { locale: ptBR })}</div>
                  <div className="text-[10px] font-bold opacity-50 mb-2">{format(day, 'dd/MM')}</div>
                  <div className="text-lg font-black mt-auto">
                    {val > 0 ? \`\${val.toFixed(0)}\` : '0'}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className={cn(
            "grid gap-8 w-full",
            period === 'year' ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : 
            period === 'quarter' ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 max-w-3xl mx-auto"
          )}>
            {months.map(month => {
              const monthDays = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
              const startDayOfWeek = startOfMonth(month).getDay();
              
              // Pad with empty blocks
              const prefixDays = Array.from({ length: startDayOfWeek }).map((_, i) => i);
              
              return (
                <div key={month.toISOString()} className="flex flex-col">
                  <h5 className={cn(
                    "font-black uppercase tracking-widest mb-3",
                    period === 'year' ? "text-[9px] text-[#141414]/40 dark:text-zinc-500" : "text-[11px] text-[#141414] dark:text-zinc-100 text-center"
                  )}>
                    {format(month, 'MMMM', { locale: ptBR })}
                  </h5>
                  
                  {period !== 'year' && (
                    <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
                      {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                        <div key={i} className="text-center text-[10px] font-black text-[#141414]/30 dark:text-zinc-600 uppercase">
                          {d}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-7 gap-1 md:gap-2">
                    {prefixDays.map(i => (
                      <div key={\`empty-\${i}\`} className="aspect-square rounded-sm sm:rounded-xl bg-transparent" />
                    ))}
                    {monthDays.map(day => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const val = salesByDayDetails.get(dateStr)?.total || 0;
                      const isCurr = isToday(day);
                      
                      return (
                        <button 
                          key={dateStr}
                          onClick={() => setSelectedDate(dateStr)}
                          className={cn(
                            "aspect-square rounded-lg sm:rounded-xl flex flex-col items-center justify-center transition-all hover:scale-[1.05] active:scale-95 text-[9px] sm:text-xs",
                            getIntensityClass(val),
                            isCurr && "ring-1 sm:ring-2 ring-offset-1 sm:ring-offset-2 ring-offset-white dark:ring-offset-zinc-900 ring-[#141414] dark:ring-white z-10"
                          )}
                        >
                          {(period === 'month' || period === 'quarter') ? (
                            <>
                              <span className="font-bold opacity-50 text-[8px] sm:text-[9px] mb-0.5">{format(day, 'd')}</span>
                              <span className="font-black truncate w-full px-1 text-center">
                                {val > 0 ? val.toFixed(0) : ''}
                              </span>
                            </>
                          ) : (
                            <span className="font-black truncate w-full px-1 text-center">
                              {val > 0 ? val.toFixed(0) : ''}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-[#141414]/5 dark:border-zinc-50/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[#141414]/40 dark:text-zinc-400">
          <span>R$ 0</span>
          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-[4px] bg-[#141414]/5 dark:bg-zinc-800" />
          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-[4px] bg-emerald-200 dark:bg-emerald-900/60" />
          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-[4px] bg-emerald-400 dark:bg-emerald-600" />
          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-[4px] bg-emerald-600 dark:bg-emerald-400" />
          <span>Máx</span>
        </div>
        <div className="text-[9px] font-bold text-[#141414]/30 dark:text-zinc-500 text-right uppercase tracking-widest">
          Clique no dia para mais detalhes. O valor exibido é o faturamento (R$).
        </div>
      </div>
      
      {renderDetailsModal()}
    </div>
  );
};
`;

fs.writeFileSync('src/components/SalesCalendar.tsx', componentContent);
