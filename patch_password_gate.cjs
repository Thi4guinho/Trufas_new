const fs = require('fs');
let code = fs.readFileSync('src/components/PasswordGate.tsx', 'utf-8');

if (!code.includes('Fingerprint')) {
  code = code.replace(
    "import { ShieldAlert, ArrowRight } from 'lucide-react';",
    "import { ShieldAlert, ArrowRight, Fingerprint } from 'lucide-react';"
  );
  
  const uiReplacement = `  const handleBiometricAuth = async () => {
    try {
      if (!window.PublicKeyCredential) {
        alert("Autenticação biométrica não suportada neste dispositivo/navegador.");
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
      console.error(err);
      alert("Autenticação biométrica falhou ou foi cancelada.");
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
            onClick={handleBiometricAuth}
            className="w-full bg-[#F5F5F4] dark:bg-zinc-800 text-[#141414] dark:text-zinc-100 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#E5E5E4] dark:hover:bg-zinc-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Fingerprint size={20} /> Entrar com Digital (Biometria)
          </button>
        </div>
      </form>
    </div>`;
    
  code = code.replace(/return \([\s\S]*?<\/div>\s*\);\s*\};\s*$/, uiReplacement + '\n  );\n};\n');
  fs.writeFileSync('src/components/PasswordGate.tsx', code);
}
