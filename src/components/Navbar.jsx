import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Store, ShoppingCart, Package, Users, History, LogOut, User } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-2 px-3 py-2 rounded-md font-medium text-sm transition-colors ${
      isActive
        ? 'bg-white/20 text-white shadow-inner font-semibold'
        : 'text-white/80 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <header className="bg-primary text-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center text-white border border-white/20">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight block leading-none">
                POS <span className="font-light text-white/80">UMKM</span>
              </span>
              <span className="text-[10px] text-white/70 tracking-wider uppercase font-medium">
                Sistem Kasir Serbaguna
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-black/10 p-1 rounded-lg border border-white/10">
            <NavLink to="/pos" className={linkClass}>
              <ShoppingCart className="w-4 h-4" />
              <span>Kasir (POS)</span>
            </NavLink>
            <NavLink to="/products" className={linkClass}>
              <Package className="w-4 h-4" />
              <span>Kelola Produk</span>
            </NavLink>
            <NavLink to="/customers" className={linkClass}>
              <Users className="w-4 h-4" />
              <span>Pelanggan (Kasbon)</span>
            </NavLink>
            <NavLink to="/history" className={linkClass}>
              <History className="w-4 h-4" />
              <span>Riwayat Transaksi</span>
            </NavLink>
          </nav>

          {/* User Email & Logout */}
          <div className="flex items-center gap-4">
            {user && (
              <div className="hidden lg:flex items-center gap-2 text-xs bg-white/10 px-3 py-1.5 rounded-full border border-white/15">
                <User className="w-3.5 h-3.5 text-white/80" />
                <span className="font-medium text-white/90 truncate max-w-[180px]">
                  {user.email}
                </span>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-destructive hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all border border-white/20 active:scale-95"
              title="Keluar dari akun"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav Bar */}
      <div className="md:hidden flex border-t border-white/10 bg-primary-dark/80 px-2 py-1 justify-around text-xs">
        <NavLink to="/pos" className={linkClass}>
          <ShoppingCart className="w-4 h-4" />
          <span>Kasir</span>
        </NavLink>
        <NavLink to="/products" className={linkClass}>
          <Package className="w-4 h-4" />
          <span>Produk</span>
        </NavLink>
        <NavLink to="/customers" className={linkClass}>
          <Users className="w-4 h-4" />
          <span>Pelanggan</span>
        </NavLink>
        <NavLink to="/history" className={linkClass}>
          <History className="w-4 h-4" />
          <span>Riwayat</span>
        </NavLink>
      </div>
    </header>
  );
};
