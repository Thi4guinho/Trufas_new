import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldAlert, 
  Search, 
  Calendar,
  User,
  Clock,
  Briefcase
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AuditLog } from '../types';

interface AuditLogManagerProps {
  logs: AuditLog[];
}

export const AuditLogManager: React.FC<AuditLogManagerProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = useMemo(() => {
    return logs
      .filter(log => 
        log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .sort((a, b) => b.date.seconds - a.date.seconds);
  }, [logs, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#141414]/40">Histórico de Segurança e Alterações</p>
          <h3 className="text-3xl font-black tracking-tighter italic">Registro de Auditoria</h3>
        </div>

        <div className="relative group w-full sm:max-w-xs">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#141414]/20 group-focus-within:text-[#141414] transition-colors" size={16} />
          <input 
            type="text"
            placeholder="Filtrar por usuário ou ação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white rounded-xl border border-[#141414]/5 shadow-sm focus:ring-2 focus:ring-[#141414]/10 font-bold text-xs transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-[#141414]/5 shadow-sm p-6 overflow-hidden">
        <div className="space-y-4">
          {filteredLogs.map((log) => (
            <div 
              key={log.id} 
              className="p-4 rounded-2xl bg-[#F5F5F4]/60 hover:bg-[#F5F5F4] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#141414]/5"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">
                    <User size={10} /> {log.userName}
                  </span>
                  <span className="text-xs text-[#141414]/40">•</span>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-[#141414]/40">
                    <Clock size={10} /> {format(log.date.toDate(), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                  </span>
                </div>
                <h5 className="font-black text-sm text-[#141414] italic leading-tight">{log.action}</h5>
                {log.details && (
                  <p className="text-xs font-medium text-[#141414]/60 bg-white/60 p-2 rounded-xl mt-2 font-mono text-[11px] leading-relaxed border border-[#141414]/5">
                    {log.details}
                  </p>
                )}
              </div>
            </div>
          ))}

          {filteredLogs.length === 0 && (
            <div className="text-center py-16 opacity-30">
              <ShieldAlert size={44} className="mx-auto mb-3" />
              <p className="text-xs font-black uppercase tracking-widest">Nenhum registro de auditoria encontrado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
