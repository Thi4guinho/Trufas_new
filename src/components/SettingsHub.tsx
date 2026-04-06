import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings as SettingsIcon, 
  History, 
  CreditCard, 
  LogOut, 
  ChevronRight, 
  ShieldAlert 
} from 'lucide-react';
import { auth } from '../firebase';
import { UserProfile, UserSettings, Sale } from '../types';
import { Settings } from './Settings';
import { AdminHistory } from './AdminHistory';
import { PendingPayments } from './PendingPayments';
import { cn } from '../utils';

interface SettingsHubProps {
  user: UserProfile;
  settings: UserSettings | null;
  sales: Sale[];
}

type SettingsTab = 'menu' | 'pricing' | 'history' | 'pending';

export const SettingsHub: React.FC<SettingsHubProps> = ({ user, settings, sales }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('menu');
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'admin') {
      setIsAdminAuthenticated(true);
    } else {
      alert('Senha incorreta!');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'pricing':
        return <Settings settings={settings} />;
      case 'history':
        return <AdminHistory sales={sales} settings={settings} />;
      case 'pending':
        return <PendingPayments sales={sales} />;
      default:
        return (
          <div className="space-y-4">
            <button 
              onClick={() => setActiveTab('pricing')}
              className="w-full p-6 bg-white rounded-[2rem] border border-[#141414]/5 shadow-sm hover:shadow-md transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <SettingsIcon size={24} />
                </div>
                <div className="text-left">
                  <h4 className="font-black tracking-tighter italic text-lg">Preço Progressivo</h4>
                  <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest">Configurar descontos por quantidade</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-[#141414]/20 group-hover:text-[#141414] transition-colors" />
            </button>

            <button 
              onClick={() => setActiveTab('history')}
              className="w-full p-6 bg-white rounded-[2rem] border border-[#141414]/5 shadow-sm hover:shadow-md transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <History size={24} />
                </div>
                <div className="text-left">
                  <h4 className="font-black tracking-tighter italic text-lg">Histórico de Vendas</h4>
                  <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest">Ver e gerenciar todas as transações</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-[#141414]/20 group-hover:text-[#141414] transition-colors" />
            </button>

            <button 
              onClick={() => setActiveTab('pending')}
              className="w-full p-6 bg-white rounded-[2rem] border border-[#141414]/5 shadow-sm hover:shadow-md transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-colors">
                  <CreditCard size={24} />
                </div>
                <div className="text-left">
                  <h4 className="font-black tracking-tighter italic text-lg">Pagamentos Pendentes</h4>
                  <p className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-orange-100 text-orange-600 rounded-lg inline-block mt-1">
                    {sales.filter(s => s.status === 'pending').length} pendentes
                  </p>
                </div>
              </div>
              <ChevronRight size={20} className="text-[#141414]/20 group-hover:text-[#141414] transition-colors" />
            </button>

            <div className="pt-8 border-t border-[#141414]/5">
              <button 
                onClick={() => auth.signOut()}
                className="w-full p-6 bg-red-50 text-red-600 rounded-[2rem] hover:bg-red-600 hover:text-white transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <LogOut size={24} />
                  </div>
                  <div className="text-left">
                    <h4 className="font-black tracking-tighter italic text-lg">Sair da Conta</h4>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Encerrar sessão atual</p>
                  </div>
                </div>
                <ChevronRight size={20} className="opacity-20 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>
        );
    }
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="max-w-md mx-auto bg-white p-10 rounded-[2.5rem] border border-[#141414]/5 shadow-2xl text-center">
        <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
          <ShieldAlert size={40} />
        </div>
        <h3 className="text-3xl font-black tracking-tighter italic mb-2">Área Restrita</h3>
        <p className="text-[#141414]/40 font-bold text-sm mb-8 leading-relaxed">
          Esta seção contém dados sensíveis. Por favor, insira a senha administrativa para continuar.
        </p>
        <form onSubmit={handleAdminAuth} className="space-y-4">
          <input 
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            placeholder="Senha de Admin"
            className="w-full p-5 bg-[#F5F5F4] rounded-2xl font-bold border-none focus:ring-2 focus:ring-[#141414]/10 text-center tracking-widest"
            autoFocus
          />
          <button className="w-full bg-[#141414] text-white py-5 rounded-2xl font-black text-lg tracking-tight hover:bg-[#141414]/90 transition-all active:scale-[0.98] shadow-xl">
            Acessar Configurações
          </button>
        </form>
      </div>
    );
  }

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
               activeTab === 'pending' ? 'Pagamentos Pendentes' : 'Configurações'}
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
