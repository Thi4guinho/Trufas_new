import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings as SettingsIcon, 
  History, 
  CreditCard, 
  LogOut, 
  ChevronRight, 
  Package,
  Users,
  ShieldCheck,
  FileText,
  UserPlus,
  Trash2
} from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { UserProfile, UserSettings, Sale, Truffle, Customer, AuditLog } from '../types';
import { Settings } from './Settings';
import { AdminHistory } from './AdminHistory';
import { PendingPayments } from './PendingPayments';
import { TruffleManager } from './TruffleManager';
import { CustomerManager } from './CustomerManager';
import { AuditLogManager } from './AuditLogManager';
import { CompanyMembersManager } from './CompanyMembersManager';
import { cn, downloadFullReportPDF } from '../utils';

interface SettingsHubProps {
  user: any;
  profile: any;
  settings: UserSettings | null;
  sales: Sale[];
  truffles: Truffle[];
  customers: Customer[];
  logs: AuditLog[];
}

type SettingsTab = 'menu' | 'pricing' | 'history' | 'pending' | 'truffles' | 'customers' | 'logs' | 'members';

export const SettingsHub: React.FC<SettingsHubProps> = ({ 
  user, 
  profile, 
  settings, 
  sales, 
  truffles, 
  customers, 
  logs 
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('menu');

  
  
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetCode, setResetCode] = useState('');

  const handleResetDatabase = async () => {
    const ownerId = profile?.companyId || auth.currentUser?.uid;
    if (!ownerId) return;

    if (resetCode !== 'APAGAR') {
      return;
    }

    setIsResetting(true);
    try {
      const collections = [
        'truffles',
        'sales',
        'customers',
        'cashflow',
        'audit_logs',
        'production_batches',
        'stock_batches',
        'materials'
      ];

      for (const collName of collections) {
        const q = query(collection(db, collName), where('ownerId', '==', ownerId));
        const snap = await getDocs(q);
        const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
      }

      setShowResetConfirm(false);
      setResetCode('');
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert('Erro ao tentar resetar o sistema.');
    } finally {
      setIsResetting(false);
    }
  };
const renderContent = () => {
    switch (activeTab) {
      case 'pricing':
        return <Settings settings={settings} profile={profile} />;
      case 'history':
        return <AdminHistory sales={sales} settings={settings} profile={profile} />;
      case 'pending':
        return <PendingPayments sales={sales} profile={profile} settings={settings} />;
      case 'truffles':
        return <TruffleManager truffles={truffles} profile={profile} lowStockLimit={settings?.lowStockAlert || 5} />;
      case 'customers':
        return <CustomerManager customers={customers} sales={sales} profile={profile} />;
      case 'logs':
        return <AuditLogManager logs={logs} />;
      case 'members':
        return <CompanyMembersManager companyId={profile?.companyId} currentUserEmail={user?.email} />;
      default:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => setActiveTab('pricing')}
                className="p-6 bg-white rounded-[2rem] border border-[#141414]/5 shadow-sm hover:shadow-md transition-all flex items-center justify-between group text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <SettingsIcon size={24} />
                  </div>
                  <div>
                    <h4 className="font-black tracking-tighter italic text-lg text-[#141414]">Configurações Gerais</h4>
                    <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest mt-0.5">Ajustes gerais e regras de volume</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-[#141414]/20 group-hover:text-[#141414] transition-colors" />
              </button>

              <button 
                onClick={() => setActiveTab('history')}
                className="p-6 bg-white rounded-[2rem] border border-[#141414]/5 shadow-sm hover:shadow-md transition-all flex items-center justify-between group text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <History size={24} />
                  </div>
                  <div>
                    <h4 className="font-black tracking-tighter italic text-lg text-[#141414]">Histórico de Vendas</h4>
                    <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest mt-0.5">Ver e gerenciar todas as vendas</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-[#141414]/20 group-hover:text-[#141414] transition-colors" />
              </button>

              <button 
                onClick={() => setActiveTab('pending')}
                className="p-6 bg-white rounded-[2rem] border border-[#141414]/5 shadow-sm hover:shadow-md transition-all flex items-center justify-between group text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-colors">
                    <CreditCard size={24} />
                  </div>
                  <div>
                    <h4 className="font-black tracking-tighter italic text-lg text-[#141414]">Pagamentos Pendentes</h4>
                    <p className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-orange-100 text-orange-600 rounded-lg inline-block mt-1">
                      {sales.filter(s => s.paymentStatus === 'pending' && s.status !== 'cancelled').length} pendentes
                    </p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-[#141414]/20 group-hover:text-[#141414] transition-colors" />
              </button>

              <button 
                onClick={() => setActiveTab('truffles')}
                className="p-6 bg-white rounded-[2rem] border border-[#141414]/5 shadow-sm hover:shadow-md transition-all flex items-center justify-between group text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Package size={24} />
                  </div>
                  <div>
                    <h4 className="font-black tracking-tighter italic text-lg text-[#141414]">Registro de Estoque</h4>
                    <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest mt-0.5">Sabores, quantidade e custos</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-[#141414]/20 group-hover:text-[#141414] transition-colors" />
              </button>

              <button 
                onClick={() => setActiveTab('customers')}
                className="p-6 bg-white rounded-[2rem] border border-[#141414]/5 shadow-sm hover:shadow-md transition-all flex items-center justify-between group text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
                    <Users size={24} />
                  </div>
                  <div>
                    <h4 className="font-black tracking-tighter italic text-lg text-[#141414]">Registro de Clientes</h4>
                    <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest mt-0.5">Carteira e histórico dos compradores</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-[#141414]/20 group-hover:text-[#141414] transition-colors" />
              </button>

              <button 
                onClick={() => setActiveTab('logs')}
                className="p-6 bg-white rounded-[2rem] border border-[#141414]/5 shadow-sm hover:shadow-md transition-all flex items-center justify-between group text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h4 className="font-black tracking-tighter italic text-lg text-[#141414]">Ações de Segurança</h4>
                    <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest mt-0.5">Consultar logs de auditoria</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-[#141414]/20 group-hover:text-[#141414] transition-colors" />
              </button>

              <button 
                onClick={() => setActiveTab('members')}
                className="p-6 bg-white rounded-[2rem] border border-[#141414]/5 shadow-sm hover:shadow-md transition-all flex items-center justify-between group text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors">
                    <UserPlus size={24} />
                  </div>
                  <div>
                    <h4 className="font-black tracking-tighter italic text-lg text-[#141414]">Gestão de Sócios</h4>
                    <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest mt-0.5">Controlar acessos e permissões</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-[#141414]/20 group-hover:text-[#141414] transition-colors" />
              </button>
            </div>

            <div className="pt-8 border-t border-[#141414]/5 space-y-4">
              {/* Report Export Button */}
              <button 
                onClick={() => downloadFullReportPDF(sales, truffles, customers, settings)}
                className="w-full p-6 bg-indigo-600 text-white rounded-[2rem] hover:bg-indigo-700 transition-all flex items-center justify-between group text-left shadow-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h4 className="font-black tracking-tighter italic text-lg">Exportar Relatório Geral</h4>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Baixar balanço de caixa, estoque e clientes em PDF</p>
                  </div>
                </div>
                <ChevronRight size={20} className="opacity-40 group-hover:opacity-100 transition-opacity" />
              </button>

              
              {/* Reset Data Button */}
              {!showResetConfirm ? (
                <button 
                  onClick={() => setShowResetConfirm(true)}
                  className="w-full p-6 bg-red-600 text-white rounded-[2rem] hover:bg-red-700 transition-all flex items-center justify-between group text-left shadow-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                      <Trash2 size={24} />
                    </div>
                    <div>
                      <h4 className="font-black tracking-tighter italic text-lg">Zona de Perigo: Resete</h4>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Apagar TODOS os dados e começar do zero</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                </button>
              ) : (
                <div className="w-full p-6 bg-red-50 border border-red-200 rounded-[2rem]">
                  <h4 className="font-black tracking-tighter italic text-lg text-red-800 mb-2">Tem certeza absoluta?</h4>
                  <p className="text-sm text-red-600 mb-4 font-medium">Esta ação é irreversível. Todos os clientes, vendas, produtos e histórico serão apagados permanentemente.</p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-red-800/60 mb-2">
                        Digite APAGAR para confirmar
                      </label>
                      <input
                        type="text"
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        placeholder="APAGAR"
                        className="w-full p-4 bg-white rounded-xl border border-red-200 font-bold text-center"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setShowResetConfirm(false);
                          setResetCode('');
                        }}
                        className="flex-1 p-4 bg-white text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={handleResetDatabase}
                        disabled={resetCode !== 'APAGAR' || isResetting}
                        className="flex-1 p-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {isResetting ? 'Apagando...' : 'Confirmar Exclusão'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {/* Sign out button */}

              <button 
                onClick={() => auth.signOut()}
                className="w-full p-6 bg-red-50 text-red-600 rounded-[2rem] hover:bg-red-600 hover:text-white transition-all flex items-center justify-between group text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/25 rounded-2xl flex items-center justify-center">
                    <LogOut size={24} />
                  </div>
                  <div>
                    <h4 className="font-black tracking-tighter italic text-lg">Sair da Conta</h4>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Log Out / Encerrar sessão atual de forma segura</p>
                  </div>
                </div>
                <ChevronRight size={20} className="opacity-20 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          {activeTab !== 'menu' && (
            <button 
              onClick={() => setActiveTab('menu')}
              className="w-12 h-12 bg-white rounded-2xl border border-[#141414]/5 flex items-center justify-center hover:bg-[#141414] hover:text-white transition-all shadow-sm"
            >
              <ChevronRight size={24} className="rotate-180" />
            </button>
          )}
          <div>
            <h2 className="text-3xl font-black tracking-tighter italic">
              {activeTab === 'pricing' ? 'Configurações Gerais' : 
               activeTab === 'history' ? 'Histórico de Vendas' :
               activeTab === 'pending' ? 'Pagamentos Pendentes' :
               activeTab === 'truffles' ? 'Controle de Estoque' :
               activeTab === 'customers' ? 'Controle de Clientes' :
               activeTab === 'logs' ? 'Logs de Auditoria' : 
               activeTab === 'members' ? 'Gestão de Sócios' : 'Configurações'}
            </h2>
            <p className="text-[10px] font-black text-[#141414]/40 uppercase tracking-widest">
              Painel de Controle Administrativo
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
