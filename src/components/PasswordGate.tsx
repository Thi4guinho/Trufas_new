import React, { useState } from 'react';
import { ShieldAlert, ArrowRight } from 'lucide-react';

interface PasswordGateProps {
  onAuthenticated: () => void;
  title: string;
  description: string;
}

export const PasswordGate: React.FC<PasswordGateProps> = ({ 
  onAuthenticated, 
  title, 
  description 
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin') {
      onAuthenticated();
    } else {
      setError(true);
      setPassword('');
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-10 rounded-[2.5rem] border border-[#141414]/5 shadow-2xl text-center font-sans">
      <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
        <ShieldAlert size={40} />
      </div>
      <h3 className="text-3xl font-black tracking-tighter italic mb-2">{title}</h3>
      <p className="text-[#141414]/40 font-bold text-xs mb-8 leading-relaxed">
        {description}
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <input 
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
            placeholder="Senha de Acesso"
            className="w-full p-5 bg-[#F5F5F4] rounded-2xl font-bold border-none focus:ring-2 focus:ring-[#141414]/10 text-center tracking-widest text-[#141414]"
            autoFocus
          />
        </div>
        
        {error && (
          <p className="text-xs font-bold text-red-600 mt-1 uppercase tracking-wider">A senha digitada está incorreta!</p>
        )}

        <button className="w-full bg-[#141414] text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#141414]/90 transition-all active:scale-[0.98] shadow-xl flex items-center justify-center gap-2">
          Acessar Painel <ArrowRight size={16} />
        </button>
      </form>
    </div>
  );
};
