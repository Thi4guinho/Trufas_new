import React, { useState } from 'react';
import { ShieldAlert, ArrowRight, Fingerprint } from 'lucide-react';

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
  const [autoBiometricsTriggered, setAutoBiometricsTriggered] = useState(false);
  const [showPasswordFallback, setShowPasswordFallback] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  
  React.useEffect(() => {
    if (!autoBiometricsTriggered) {
      setAutoBiometricsTriggered(true);
      // Auto trigger biometrics on mount
      handleBiometricAuth(true);
    }
  }, [autoBiometricsTriggered]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin') {
      onAuthenticated();
    } else {
      setError(true);
      setPassword('');
    }
  };

    const handleBiometricAuth = async (isAuto = false) => {
    try {
      if (window.self !== window.top) {
        
        setShowPasswordFallback(true);
        setIsAuthenticating(false);
        return;
      }
      if (!window.PublicKeyCredential) {
        
        setShowPasswordFallback(true);
        setIsAuthenticating(false);
        return;
      }
      
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      
      const userId = new Uint8Array(16);
      window.crypto.getRandomValues(userId);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challenge,
          rp: {
            name: "Sistema Administrativo",
          },
          user: {
            id: userId,
            name: "admin",
            displayName: "Administrador",
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },
            { type: "public-key", alg: -257 }
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required"
          },
          timeout: 60000,
          attestation: "none"
        }
      });
      
      if (credential) {
        onAuthenticated();
      }
    } catch (err) {
      if (err instanceof Error && (err.name === 'NotAllowedError' || err.message.includes('feature is not enabled'))) {
        
        setShowPasswordFallback(true);
        setIsAuthenticating(false);
      } else {
        console.error(err);
        
        setShowPasswordFallback(true);
        setIsAuthenticating(false);
      }
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-zinc-900 p-10 rounded-[2.5rem] border border-[#141414]/5 dark:border-zinc-50/10 shadow-2xl text-center font-sans">
      <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
        <ShieldAlert size={40} />
      </div>
      <h3 className="text-3xl font-black tracking-tighter italic mb-2">{title}</h3>
      <p className="text-[#141414]/40 dark:text-zinc-400 font-bold text-xs mb-8 leading-relaxed">
        {description}
      </p>
      {!showPasswordFallback ? (
        <div className="space-y-6 text-center">
          <div className="animate-pulse flex justify-center">
            <Fingerprint size={64} className="text-[#141414]/20 dark:text-zinc-700" />
          </div>
          <p className="text-sm font-bold text-[#141414] dark:text-zinc-100">Aguardando biometria...</p>
          <button 
            type="button" 
            onClick={() => setShowPasswordFallback(true)}
            className="text-xs font-bold uppercase tracking-wider text-[#141414]/50 dark:text-zinc-500 hover:text-[#141414] dark:hover:text-zinc-300"
          >
            Usar senha digitada
          </button>
        </div>
      ) : (
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
            className="w-full p-5 bg-[#F5F5F4] dark:bg-zinc-800 rounded-2xl font-bold border-none focus:ring-2 focus:ring-[#141414]/10 dark:ring-zinc-50/10 text-center tracking-widest text-[#141414] dark:text-zinc-100"
            autoFocus
          />
        </div>
        
        {error && (
          <p className="text-xs font-bold text-red-600 mt-1 uppercase tracking-wider">A senha digitada está incorreta!</p>
        )}

        <button type="submit" className="w-full bg-[#141414] dark:bg-zinc-100 text-white dark:text-zinc-900 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#141414]/90 transition-all active:scale-[0.98] shadow-xl flex items-center justify-center gap-2">
          Acessar Painel <ArrowRight size={16} />
        </button>

        <div className="pt-4 border-t border-[#141414]/10 dark:border-zinc-50/10 mt-4">
          <button 
            type="button" 
            onClick={() => handleBiometricAuth(false)}
            className="w-full bg-[#F5F5F4] dark:bg-zinc-800 text-[#141414] dark:text-zinc-100 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#E5E5E4] dark:hover:bg-zinc-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Fingerprint size={20} /> Entrar com Digital (Biometria)
          </button>
        </div>
      </form>
      )}
    </div>
  );
};
