import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Store, Mail, Lock, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';

export const LoginPage = () => {
  const { user, loginOrRegister } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (user) {
    return <Navigate to="/pos" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email || !password) {
      setErrorMsg('Harap isi email dan password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await loginOrRegister(email, password);
      navigate('/pos');
    } catch (err) {
      console.error('Auth error:', err);
      setErrorMsg(err.message || 'Gagal masuk atau mendaftar. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      {/* Container card */}
      <div className="w-full max-w-md bg-surface rounded-lg shadow-sm border border-border-custom p-8 sm:p-10">
        
        {/* Branding header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-lg text-primary mb-3">
            <Store className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
            POS <span className="text-primary">UMKM</span>
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Solusi Kasir Praktis & Penjualan UMKM
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-2.5 text-xs text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5" htmlFor="email">
              Email Pengguna
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contoh@posumkm.com"
                className="w-full h-11 pl-10 pr-3 bg-background border border-border-custom rounded-md text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
          </div>

          {/* Password input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5" htmlFor="password">
              Kata Sandi
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 pl-10 pr-10 bg-background border border-border-custom rounded-md text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-primary hover:bg-primary-hover text-white font-semibold text-sm rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99]"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <span>Masuk / Daftar Akun</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer info */}
        <div className="mt-8 pt-6 border-t border-border-custom text-center text-xs text-text-secondary">
          <p>Sistem otomatis membuat akun baru jika belum terdaftar.</p>
        </div>
      </div>
    </div>
  );
};
