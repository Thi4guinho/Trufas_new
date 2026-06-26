import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Trash2, 
  Edit3, 
  Mail, 
  Clock, 
  CheckCircle,
  X 
} from 'lucide-react';
import { Company, CompanyMember, CompanyPermission } from '../types';
import { getMemberPermissions } from '../permissions';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';
import { cn } from '../utils';

interface CompanyMembersManagerProps {
  companyId: string;
  currentUserEmail: string | null;
}

export const CompanyMembersManager: React.FC<CompanyMembersManagerProps> = ({ companyId, currentUserEmail }) => {
  const [company, setCompany] = useState<Company | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [editingMember, setEditingMember] = useState<CompanyMember | null>(null);

  useEffect(() => {
    if (!companyId) return;
    const fetchCompany = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'companies', companyId));
        if (docSnap.exists()) {
          setCompany({ id: docSnap.id, ...docSnap.data() } as Company);
        }
      } catch (error) {
        console.error("Error fetching company:", error);
      }
    };
    fetchCompany();
  }, [companyId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !inviteEmail || Object.keys(company.members || {}).length >= 6) return;

    const email = inviteEmail.trim().toLowerCase();
    
    if (company.members && company.members[email]) {
      alert('Usuário já é membro da empresa.');
      return;
    }

    const newMember: CompanyMember = {
      email,
      name: inviteName,
      role: 'member',
      status: 'pending',
      joinedAt: new Date().toISOString(),
      permissions: getMemberPermissions()
    };

    try {
      const newMembers = { ...(company.members || {}), [email]: newMember };

      await updateDoc(doc(db, 'companies', companyId), {
        members: newMembers,
        memberEmails: arrayUnion(email)
      });
      
      setCompany(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          memberEmails: [...(prev.memberEmails || []), email],
          members: newMembers
        };
      });

      setIsInviting(false);
      setInviteEmail('');
      setInviteName('');
    } catch (err) {
      console.error(err);
      alert('Erro ao convidar membro.');
    }
  };

  const handleRemoveMember = async (email: string) => {
    if (!company) return;
    if (!window.confirm(`Tem certeza que deseja remover ${email}?`)) return;

    try {
      const companyRef = doc(db, 'companies', companyId);
      
      const newMembers = { ...company.members };
      delete newMembers[email];
      
      const emailParts = email.split('@');
      if (emailParts.length === 2 && newMembers[emailParts[0] + '@' + emailParts[1].split('.')[0]]) {
         delete newMembers[emailParts[0] + '@' + emailParts[1].split('.')[0]];
      }

      await updateDoc(companyRef, {
        members: newMembers,
        memberEmails: arrayRemove(email)
      });
      
      setCompany(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          memberEmails: prev.memberEmails.filter(e => e !== email),
          members: newMembers
        };
      });
    } catch (err) {
      console.error(err);
      alert('Erro ao remover membro.');
    }
  };

  const handleUpdatePermissions = async (member: CompanyMember) => {
    try {
      if (!company) return;
      
      // Clean up potentially corrupted entries and set correct properties
      const currentMembers = company.members || {};
      const newMembers = { ...currentMembers };
      
      const emailParts = member.email.split('@');
      if (emailParts.length === 2) {
        const corruptedKey = emailParts[0] + '@' + emailParts[1].split('.')[0];
        if (newMembers[corruptedKey] && corruptedKey !== member.email) {
          delete newMembers[corruptedKey];
        }
      }
      
      newMembers[member.email] = {
        ...(newMembers[member.email] || {}),
        ...member, // Ensure all current state details are preserved
        permissions: member.permissions
      };
      
      await updateDoc(doc(db, 'companies', companyId), {
        members: newMembers
      });

      setCompany(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          members: newMembers
        };
      });

      setEditingMember(null);
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar permissões.');
    }
  };

  if (!company) return <div>Carregando...</div>;

  const memberList = Object.entries(company.members || {}).map(([email, member]) => {
    const typedMember = member as CompanyMember;
    return {
      ...typedMember,
      email: typedMember.email || email,
      name: typedMember.name || typedMember.email || email
    };
  }) as CompanyMember[];

  return (
    <div className="space-y-8">
      {/* Header & Stats */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-[#141414]/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#141414]/5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#141414] text-white rounded-[1.5rem] flex items-center justify-center font-black text-2xl italic tracking-tighter">
              {(company.name || 'Empresa').charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-black italic tracking-tighter text-[#141414]">{company.name || 'Sua Empresa'}</h2>
              <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest mt-0.5">Gestão de Equipe e Sócios</p>
            </div>
          </div>

          <div className="flex items-center gap-4 px-6 py-3 bg-[#F5F5F4] rounded-2xl">
            <Users size={24} className="text-[#141414]/40" />
            <div>
              <p className="font-black text-lg leading-tight">{memberList.length} / 6</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#141414]/40">Membros</p>
            </div>
          </div>
        </div>

        {/* Members List */}
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-[#141414] uppercase tracking-wide text-xs">Membros da Empresa</h3>
            {memberList.length < 6 && (
              <button
                onClick={() => setIsInviting(true)}
                className="flex items-center gap-2 bg-[#141414] text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-black transition-colors"
              >
                <UserPlus size={14} />
                Adicionar Sócio
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {memberList.map((m, i) => (
              <div key={m?.email || i} className="flex items-center justify-between p-4 bg-[#F5F5F4] rounded-2xl border border-transparent hover:border-[#141414]/5 transition-all gap-4">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0",
                    m.role === 'owner' ? "bg-amber-100 text-amber-600" : "bg-[#141414] text-white"
                  )}>
                    {(m.name || m.email || 'M').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-[#141414] leading-tight flex items-center gap-2 truncate">
                      <span className="truncate">{m.name || m.email}</span>
                      {m.role === 'owner' && <span className="text-[8px] px-2 py-0.5 bg-amber-100 text-amber-600 rounded-md uppercase tracking-wider shrink-0">Proprietário</span>}
                      {m.status === 'pending' && <span className="text-[8px] px-2 py-0.5 bg-blue-100 text-blue-600 rounded-md uppercase tracking-wider shrink-0">Pendente</span>}
                    </h4>
                    <p className="text-[10px] font-bold text-[#141414]/40 truncate">{m.email}</p>
                    {m.lastAccess && <p className="text-[9px] font-medium text-[#141414]/30 mt-1 flex items-center gap-1 truncate"><Clock size={10} className="shrink-0" /> Último acesso: {new Date(m.lastAccess).toLocaleDateString()}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {m.role !== 'owner' && (
                    <>
                      <button 
                        onClick={() => setEditingMember(m)}
                        className="p-2 text-[#141414]/40 hover:text-blue-600 bg-white rounded-lg transition-colors border border-[#141414]/5"
                        title="Editar Permissões"
                      >
                        <Shield size={16} />
                      </button>
                      <button 
                        onClick={() => handleRemoveMember(m.email)}
                        className="p-2 text-[#141414]/40 hover:text-red-600 bg-white rounded-lg transition-colors border border-[#141414]/5"
                        title="Remover Membro"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {isInviting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl relative">
            <button onClick={() => setIsInviting(false)} className="absolute top-6 right-6 p-2 text-[#141414]/40 hover:text-[#141414]"><X size={20} /></button>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
              <Mail size={24} />
            </div>
            <h2 className="text-2xl font-black italic tracking-tight text-[#141414] mb-2">Convidar Sócio</h2>
            <p className="text-xs font-medium text-[#141414]/60 mb-6">O membro entrará automaticamente na sua empresa ao realizar login com este e-mail.</p>
            
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#141414]/40 ml-4 mb-1 block">Nome do Membro</label>
                <input required type="text" value={inviteName} onChange={e => setInviteName(e.target.value)} className="w-full bg-[#F5F5F4] px-6 py-4 rounded-2xl font-bold text-[#141414] outline-none" placeholder="Ex: João da Silva" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#141414]/40 ml-4 mb-1 block">E-mail do Membro</label>
                <input required type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="w-full bg-[#F5F5F4] px-6 py-4 rounded-2xl font-bold text-[#141414] outline-none" placeholder="joao@email.com" />
              </div>
              <button type="submit" className="w-full mt-4 bg-[#141414] text-white py-4 rounded-xl font-black uppercase text-xs tracking-wider">
                Enviar Convite
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Permissions Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar">
            <button onClick={() => setEditingMember(null)} className="absolute top-6 right-6 p-2 text-[#141414]/40 hover:text-[#141414] bg-[#F5F5F4] rounded-full"><X size={20} /></button>
            <div className="flex items-center gap-4 mb-8 pr-12">
              <div className="w-12 h-12 bg-[#141414] text-white rounded-2xl flex items-center justify-center shrink-0">
                <Shield size={24} />
              </div>
              <div className="truncate">
                <h2 className="text-xl md:text-2xl font-black italic tracking-tight text-[#141414] truncate">{editingMember.name || editingMember.email}</h2>
                <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest mt-0.5 truncate">{editingMember.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              {Object.keys(getMemberPermissions()).reduce((acc, curr) => {
                const [category, action] = curr.split('_');
                const catGroup = acc.find(g => g.category === category);
                if (catGroup) catGroup.actions.push(action);
                else acc.push({ category, actions: [action] });
                return acc;
              }, [] as { category: string, actions: string[] }[]).map(group => {
                
                const categoryTranslations: Record<string, string> = {
                  sales: 'VENDAS',
                  customers: 'CLIENTES',
                  truffles: 'PRODUTOS/PRODUTOS',
                  stock: 'ESTOQUE',
                  finance: 'FINANCEIRO'
                };
                
                return (
                  <div key={group.category} className="bg-[#F5F5F4] p-4 md:p-5 rounded-2xl border border-[#141414]/5">
                    <h4 className="font-black text-[#141414] uppercase tracking-wider text-xs mb-3 flex items-center gap-2 pb-2 border-b border-[#141414]/5">
                      {categoryTranslations[group.category.toLowerCase()] || group.category.toUpperCase()}
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {group.actions.map(action => {
                        const permKey = `${group.category}_${action}` as keyof CompanyPermission;
                        const actionTranslations: Record<string, string> = {
                          view: 'Ver',
                          create: 'Criar',
                          edit: 'Editar',
                          delete: 'Apagar',
                          move: 'Mover'
                        };
                        return (
                          <label key={permKey} className={cn("flex items-center gap-3 p-3 rounded-xl shadow-sm border cursor-pointer transition-colors", editingMember.permissions?.[permKey] ? "bg-blue-50 border-blue-500/30" : "bg-white border-[#141414]/5 hover:border-blue-500/30")}>
                            <input 
                              type="checkbox" 
                              checked={editingMember.permissions?.[permKey] || false}
                              onChange={(e) => setEditingMember({
                                ...editingMember,
                                permissions: {
                                  ...editingMember.permissions,
                                  [permKey]: e.target.checked
                                }
                              })}
                              className="accent-blue-600 w-4 h-4 rounded"
                            />
                            <span className="text-xs font-bold text-[#141414]">{actionTranslations[action.toLowerCase()] || action}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )
              })}

              <button 
                onClick={() => handleUpdatePermissions(editingMember)}
                className="w-full mt-6 bg-[#141414] hover:bg-black text-white py-4 rounded-xl font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition-colors"
              >
                <CheckCircle size={16} /> Salvar Permissões
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
