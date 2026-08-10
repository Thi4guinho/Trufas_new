import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  Calendar, 
  Trash2, 
  TrendingUp, 
  Filter, 
  ArrowRightLeft,
  User,
  Tags
} from 'lucide-react';
import { addDoc, collection, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { CashflowRecord, OperationType, Sale, Truffle } from '../types';
import { handleFirestoreError, cn } from '../utils';
import { format, isToday, isWithinInterval, subDays, startOfMonth, startOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CashflowManagerProps {
  cashflow: CashflowRecord[];
  sales: Sale[];
  truffles: Truffle[];
  profile: any;
}

export const CashflowManager: React.FC<CashflowManagerProps> = ({ cashflow, sales, truffles, profile }) => {
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [value, setValue] = useState<number | ''>('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [responsible, setResponsible] = useState(profile?.displayName || '');
  const [filterPeriod, setFilterPeriod] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('month');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Categories based on type
  const incomeCategories = ['Recebimentos', 'Outros ganhos', 'Aporte de Capital'];
  const expenseCategories = ['Compra de ingredientes', 'Embalagens', 'Transporte', 'Marketing', 'Despesas gerais', 'Outros'];

  // Helper dictionary for quick truffle cost lookup
  const truffleCosts = useMemo(() => {
    const costs: Record<string, number> = {};
    truffles.forEach(t => {
      costs[t.id] = t.cost || 0;
    });
    return costs;
  }, [truffles]);

  // Combine sales and manual cashflow
  const combinedRecords = useMemo(() => {
    const saleRecords: any[] = sales
      .filter(s => s.status !== 'cancelled')
      .flatMap(s => {
        const totalCost = s.items && s.items.length > 0 
          ? s.items.reduce((acc, item) => {
              const itemCost = item.costPerUnit !== undefined ? item.costPerUnit : (truffleCosts[item.truffleId] || 0);
              return acc + (item.quantity * itemCost);
            }, 0)
          : 0;
        const netProfit = s.totalPrice - totalCost;
        
        const records: any[] = [];

        const isCreditSale = s.isCredit !== undefined 
          ? s.isCredit 
          : (s.paymentMethod === 'fiado' || s.paymentStatus === 'pending');

        if (!isCreditSale) {
          const incomeValue = (s.paidAmount !== undefined && s.paidAmount >= 0) ? s.paidAmount : s.totalPrice;
          
          if (incomeValue > 0) {
            records.push({
              id: s.id + '-income',
              type: 'income',
              value: incomeValue,
              category: 'Vendas',
              date: s.date,
              description: `Venda #${s.saleNumber} - Executado para ${s.customerName || 'Consumidor Final'}`,
              responsible: s.sellerName || 'Sistema (Vendas)',
              ownerId: s.ownerId,
              isSystem: true, // unique indicator so we cannot delete sales from cashflow module directly
              netProfit: totalCost > 0 ? netProfit : undefined
            });
          }
        }

        return records;
      });

    const manualRecords = cashflow.map(c => ({
      ...c,
      value: c.value ?? (c as any).amount ?? 0,
      isSystem: c.isSystem ?? false
    }));

    return [...saleRecords, ...manualRecords].sort((a, b) => b.date.seconds - a.date.seconds);
  }, [sales, cashflow]);

  // Apply filters
  const filteredRecords = useMemo(() => {
    const now = new Date();
    return combinedRecords.filter(r => {
      const recordDate = r.date.toDate();
      
      switch (filterPeriod) {
        case 'today':
          return isToday(recordDate);
        case 'week':
          return isWithinInterval(recordDate, {
            start: subDays(now, 7),
            end: now
          });
        case 'month':
          return isWithinInterval(recordDate, {
            start: startOfMonth(now),
            end: now
          });
        case 'year':
          return isWithinInterval(recordDate, {
            start: startOfYear(now),
            end: now
          });
        case 'all':
        default:
          return true;
      }
    });
  }, [combinedRecords, filterPeriod]);

  // Totals calculations
  const stats = useMemo(() => {
    let totalIncomes = 0;
    let totalExpenses = 0;

    filteredRecords.forEach(r => {
      const val = Number(r.value) || 0;
      if (r.type === 'income') {
        totalIncomes += val;
      } else if (r.type === 'expense') {
        totalExpenses += val;
      }
    });

    return {
      totalIncomes,
      totalExpenses,
      balance: totalIncomes - totalExpenses
    };
  }, [filteredRecords]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value || value <= 0 || !category) return;
    setIsSubmitting(true);

    try {
      const recordData = {
        type,
        value: Number(value),
        category,
        date: Timestamp.now(),
        description: description || `Lançamento manual de ${category}`,
        responsible: responsible || profile?.displayName || 'Dono',
        ownerId: profile?.companyId || auth.currentUser!.uid
      };

      await addDoc(collection(db, 'cashflow'), recordData);
      
      // Log Action (Security / audit trail requirement 10)
      await addDoc(collection(db, 'audit_logs'), {
        userId: auth.currentUser!.uid,
        userName: profile?.displayName || auth.currentUser?.email || 'Sistema',
        action: `Adicionou fluxo de caixa: ${type === 'income' ? 'Entrada' : 'Saída'} - R$ ${Number(value).toFixed(2)}`,
        details: `Categoria: ${category} | Descrição: ${recordData.description}`,
        date: Timestamp.now(),
        ownerId: profile?.companyId || auth.currentUser!.uid
      });

      // Clear Form
      setValue('');
      setCategory('');
      setDescription('');
      setShowAddForm(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'cashflow');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (record: any) => {
    if (record.isSystem) return;
    if (!confirm('Deseja realmente excluir este lançamento financeiro?')) return;

    try {
      await deleteDoc(doc(db, 'cashflow', record.id));
      
      // Log Action
      await addDoc(collection(db, 'audit_logs'), {
        userId: auth.currentUser!.uid,
        userName: profile?.displayName || auth.currentUser?.email || 'Sistema',
        action: `Excluiu lançamento de caixa: ${record.type === 'income' ? 'Entrada' : 'Saída'} - R$ ${record.value.toFixed(2)}`,
        details: `Categoria: ${record.category} | ${record.description}`,
        date: Timestamp.now(),
        ownerId: profile?.companyId || auth.currentUser!.uid
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `cashflow/${record.id}`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner and Quick Add */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#141414]/40 dark:text-zinc-400">Módulo de Gestão Financeira</p>
          <h3 className="text-3xl font-black tracking-tighter italic">Fluxo de Caixa</h3>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            if (!category) setCategory(type === 'income' ? incomeCategories[0] : expenseCategories[0]);
          }}
          className="flex items-center justify-center gap-2 bg-[#141414] dark:bg-zinc-100 text-white dark:text-zinc-900 px-6 py-4 rounded-2xl font-bold hover:bg-[#141414]/90 transition-all shadow-md shrink-0 self-start md:self-auto"
        >
          <Plus size={18} />
          {showAddForm ? 'Fechar Cadastro' : 'Novo Lançamento'}
        </button>
      </div>

      {/* Add New Record Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-white dark:bg-zinc-900 rounded-[2rem] border border-[#141414]/5 dark:border-zinc-50/10 shadow-xl"
          >
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <h4 className="text-lg font-black tracking-tight italic">Registrar Entrada / Saída Manual</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 dark:text-zinc-400 mb-2">Tipo de Lançamento</label>
                  <div className="flex bg-[#F5F5F4] dark:bg-zinc-800 p-1.5 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => {
                        setType('income');
                        setCategory(incomeCategories[0]);
                      }}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-xs font-black uppercase transition-all",
                        type === 'income' ? "bg-green-600 text-white shadow-sm" : "text-[#141414]/40 dark:text-zinc-400 hover:text-[#141414] dark:hover:text-zinc-100"
                      )}
                    >
                      Entrada (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setType('expense');
                        setCategory(expenseCategories[0]);
                      }}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-xs font-black uppercase transition-all",
                        type === 'expense' ? "bg-red-600 text-white shadow-sm" : "text-[#141414]/40 dark:text-zinc-400 hover:text-[#141414] dark:hover:text-zinc-100"
                      )}
                    >
                      Saída (-)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 dark:text-zinc-400 mb-2">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    required
                    value={Number.isNaN(value as number) ? '' : value}
                    onChange={(e) => setValue(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full p-4 bg-[#F5F5F4] dark:bg-zinc-800 rounded-2xl font-bold border-none focus:ring-2 focus:ring-[#141414]/10 dark:ring-zinc-50/10"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 dark:text-zinc-400 mb-2">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-4 bg-[#F5F5F4] dark:bg-zinc-800 rounded-2xl font-bold border-none focus:ring-2 focus:ring-[#141414]/10 dark:ring-zinc-50/10 transition-all"
                  >
                    {type === 'income' 
                      ? incomeCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)
                      : expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)
                    }
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 dark:text-zinc-400 mb-2">Responsável</label>
                  <input
                    type="text"
                    placeholder="Nome do responsável"
                    value={responsible}
                    onChange={(e) => setResponsible(e.target.value)}
                    className="w-full p-4 bg-[#F5F5F4] dark:bg-zinc-800 rounded-2xl font-bold border-none focus:ring-2 focus:ring-[#141414]/10 dark:ring-zinc-50/10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 dark:text-zinc-400 mb-2">Descrição / Detalhes</label>
                <input
                  type="text"
                  placeholder="Ex: Compra de chocolate meio amargo Melken 2kg"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-4 bg-[#F5F5F4] dark:bg-zinc-800 rounded-2xl font-bold border-none focus:ring-2 focus:ring-[#141414]/10 dark:ring-zinc-50/10"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-4 text-[#141414]/40 dark:text-zinc-400 font-bold text-sm hover:text-[#141414] dark:hover:text-zinc-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-4 bg-[#141414] dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-black text-sm hover:bg-[#141414]/90 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Confirmar Lançamento'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-[#141414]/5 dark:border-zinc-50/10 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
              <ArrowUpRight size={20} />
            </div>
            <p className="text-xs font-bold text-[#141414]/40 dark:text-zinc-400 uppercase tracking-widest">Total Recebido (Entradas)</p>
          </div>
          <h4 className="text-2xl font-black text-green-600">R$ {stats.totalIncomes.toFixed(2)}</h4>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-[#141414]/5 dark:border-zinc-50/10 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <ArrowDownRight size={20} />
            </div>
            <p className="text-xs font-bold text-[#141414]/40 dark:text-zinc-400 uppercase tracking-widest">Total Gasto (Saídas)</p>
          </div>
          <h4 className="text-2xl font-black text-red-600">R$ {stats.totalExpenses.toFixed(2)}</h4>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-[#141414]/5 dark:border-zinc-50/10 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <p className="text-xs font-bold text-[#141414]/40 dark:text-zinc-400 uppercase tracking-widest">Saldo Líquido Atual</p>
          </div>
          <h4 className={cn(
            "text-2xl font-black",
            stats.balance >= 0 ? "text-blue-600" : "text-red-600"
          )}>
            R$ {stats.balance.toFixed(2)}
          </h4>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-[#141414]/5 dark:border-zinc-50/10 shadow-sm overflow-hidden p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h4 className="text-xl font-black tracking-tight italic">Movimentações do Caixa</h4>
            <p className="text-[10px] font-bold text-[#141414]/40 dark:text-zinc-400 uppercase tracking-widest mt-0.5">Histórico financeiro por período</p>
          </div>
          
          <div className="flex items-center gap-2 bg-[#F5F5F4] dark:bg-zinc-800 p-1 rounded-2xl overflow-x-auto">
            {[
              { id: 'today', label: 'Hoje' },
              { id: 'week', label: 'Semana' },
              { id: 'month', label: 'Este Mês' },
              { id: 'year', label: 'Ano' },
              { id: 'all', label: 'Todos' }
            ].map((period) => (
              <button
                key={period.id}
                onClick={() => setFilterPeriod(period.id as any)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all",
                  filterPeriod === period.id ? "bg-[#141414] dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm" : "text-[#141414]/40 dark:text-zinc-400 hover:text-[#141414] dark:hover:text-zinc-100"
                )}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto -mx-8">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-[#141414]/5 dark:border-zinc-50/10 text-[#141414]/30 dark:text-zinc-500">
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest">Data / Hora</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Lançamento / Categoria</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Responsável</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right">Valor</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141414]/5">
              {filteredRecords.map((rec) => (
                <tr key={rec.id || Math.random().toString()} className="hover:bg-[#F5F5F4] dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-8 py-5 whitespace-nowrap">
                    <p className="font-bold text-sm text-[#141414] dark:text-zinc-100">
                      {format(rec.date.toDate(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </p>
                  </td>
                  
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                        rec.type === 'income' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                      )}>
                        {rec.type === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      </div>
                      <div>
                        <p className="font-black text-sm text-[#141414] dark:text-zinc-100 leading-tight shrink-0 max-w-[300px] truncate">
                          {rec.description}
                        </p>
                        <span className="flex items-center gap-1 mt-0.5 text-[9px] font-bold text-[#141414]/30 dark:text-zinc-500 uppercase tracking-widest">
                          <Tags size={10} /> {rec.category}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-5">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-[#141414]/60 dark:text-zinc-300">
                      <User size={12} /> {rec.responsible}
                    </span>
                  </td>

                  <td className="px-6 py-5 whitespace-nowrap text-right">
                    <p className={cn(
                      "font-black text-sm",
                      rec.type === 'income' ? "text-green-600" : "text-red-600"
                    )}>
                      {rec.type === 'income' ? '+' : '-'} R$ {rec.value.toFixed(2)}
                    </p>
                  </td>

                  <td className="px-8 py-5 whitespace-nowrap text-center">
                    {!rec.isSystem ? (
                      <button
                        onClick={() => handleDelete(rec)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        title="Excluir Lançamento"
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : (
                      <span className="text-[8px] font-black bg-[#141414]/5 dark:bg-zinc-50/5 text-[#141414]/40 dark:text-zinc-400 px-2 py-1 rounded-full uppercase tracking-wider">
                        Automático
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-16 opacity-30">
                    <ArrowRightLeft size={44} className="mx-auto mb-3" />
                    <p className="text-xs font-black uppercase tracking-widest">Nenhuma movimentação registrada no período</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
