import React from 'react';
import { motion } from 'motion/react';
import { Package } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export const Login: React.FC = () => {
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user profile exists, if not create it
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        // O email thiago07bassi@gmail.com será o administrador padrão
        const isAdmin = user.email === 'thiago07bassi@gmail.com';
        
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email || '',
          role: isAdmin ? 'admin' : 'user',
          displayName: user.displayName || 'Usuário'
        });
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#E4E3E0] p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white p-10 rounded-[2rem] shadow-2xl border border-[#141414]/10"
      >
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-[#141414] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Package className="text-white" size={40} />
          </div>
          <h1 className="text-4xl font-black text-[#141414] tracking-tighter mb-2 italic">TruffleTech</h1>
          <p className="text-[#141414]/60 font-medium">Gestão Profissional de Trufas</p>
        </div>

        <button 
          onClick={handleLogin}
          className="w-full bg-[#141414] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-[#141414]/90 transition-all active:scale-[0.98] shadow-xl"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5 invert" alt="Google" />
          Entrar com Google
        </button>

        <div className="mt-10 pt-8 border-t border-[#141414]/5 text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#141414]/40">Protegido por Firebase Enterprise</p>
        </div>
      </motion.div>
    </div>
  );
};
