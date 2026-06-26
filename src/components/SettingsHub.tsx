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
  UserPlus
} from 'lucide-react';
import { auth } from '../firebase';
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
                    <h4 className="font-black tracking-tighter italic text-lg text-[#141414]">Preço Progressivo</h4>
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
              {activeTab === 'pricing' ? 'Preço Progressivo' : 
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
