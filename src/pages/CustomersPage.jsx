import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Users, UserPlus, Phone, MapPin, MessageCircle, AlertCircle, CheckCircle, Search, DollarSign } from 'lucide-react';

export const CustomersPage = () => {
  const { user } = useAuth();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error('Fetch customers error:', err);
      setErrorMsg('Gagal memuat daftar pelanggan dari database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchCustomers();
    }
  }, [user?.id]);

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim()) {
      setErrorMsg('Nama pelanggan wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Clean phone number format for WhatsApp
      let cleanPhone = phone.trim().replace(/[^0-9]/g, '');
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '62' + cleanPhone.slice(1);
      }

      const { data, error } = await supabase
        .from('customers')
        .insert([
          {
            user_id: user.id,
            name: name.trim(),
            address: address.trim() || null,
            phone: cleanPhone || null,
            total_debt: 0,
          },
        ])
        .select();

      if (error) throw error;

      setSuccessMsg(`Pelanggan "${name}" berhasil ditambahkan!`);
      setName('');
      setAddress('');
      setPhone('');
      fetchCustomers();
    } catch (err) {
      console.error('Add customer error:', err);
      setErrorMsg(err.message || 'Gagal menambahkan pelanggan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const handleWhatsAppChat = (customer) => {
    if (!customer.phone) {
      alert(`Nomor telepon ${customer.name} belum tercatat.`);
      return;
    }

    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    const debtFormatted = formatCurrency(customer.total_debt);
    const message = encodeURIComponent(
      `Halo ${customer.name}, ini dari POS UMKM. Mengingatkan rincian catatan kasbon belanja saat ini sebesar ${debtFormatted}. Terima kasih! 🙏`
    );

    const waUrl = `https://wa.me/${cleanPhone}?text=${message}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery))
  );

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-custom pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-text-primary flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Kelola Pelanggan & Catatan Kasbon
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            Daftar langganan, rincian hutang (kasbon), dan WhatsApp Click-to-Chat.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-xs text-destructive flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-primary/10 border border-primary/20 rounded-md text-xs text-primary flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ADD CUSTOMER FORM */}
      <div className="bg-surface rounded-lg border border-border-custom p-5 shadow-sm">
        <h2 className="text-base font-bold text-text-primary mb-4 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-primary" />
          Tambah Pelanggan Baru
        </h2>

        <form onSubmit={handleAddCustomer} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
              Nama Pelanggan *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="cth: Bu Tejo"
              className="w-full px-3 py-2 bg-background border border-border-custom rounded-md text-sm text-text-primary focus:outline-none focus:border-primary"
            />
          </div>

          {/* Route / Address */}
          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
              Alamat (cth: Blok A / RT 03)
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="cth: Blok A / RT 03"
                className="w-full pl-9 pr-3 py-2 bg-background border border-border-custom rounded-md text-sm text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Phone / WA */}
          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
              No. HP / WhatsApp (cth: 628123456789)
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="628123456789"
                className="w-full pl-9 pr-3 py-2 bg-background border border-border-custom rounded-md text-sm text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="sm:col-span-3 flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-10 px-6 bg-primary hover:bg-primary-hover text-white font-semibold text-sm rounded-lg shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Menyimpan...</span>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Simpan Pelanggan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* CUSTOMER LIST TABLE */}
      <div className="bg-surface rounded-lg border border-border-custom overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border-custom flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface">
          <h2 className="font-bold text-base text-text-primary">
            Daftar Pelanggan ({customers.length})
          </h2>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari pelanggan..."
              className="w-full pl-9 pr-3 py-1.5 bg-background border border-border-custom rounded-md text-xs text-text-primary focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-text-secondary">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs">Memuat data pelanggan...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-8 text-center text-text-secondary">
            <p className="text-sm font-medium">Belum ada pelanggan terdaftar.</p>
            <p className="text-xs mt-1">Tambahkan data pelanggan di formulir di atas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-background border-b border-border-custom text-xs uppercase font-semibold text-text-secondary">
                  <th className="py-3 px-4">Nama Pelanggan</th>
                  <th className="py-3 px-4">Alamat</th>
                  <th className="py-3 px-4">No. WhatsApp</th>
                  <th className="py-3 px-4 text-right">Total Kasbon (Hutang)</th>
                  <th className="py-3 px-4 text-center">Aksi / Chat WA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-background/50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-text-primary">
                      {customer.name}
                    </td>
                    <td className="py-3 px-4 text-xs text-text-secondary max-w-[160px] sm:max-w-[220px] truncate whitespace-nowrap overflow-hidden text-ellipsis" title={customer.address}>
                      {customer.address || '-'}
                    </td>
                    <td className="py-3 px-4 text-xs text-text-secondary tabular-nums">
                      {customer.phone ? `+${customer.phone}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold tabular-nums">
                      <span
                        className={
                          customer.total_debt > 0
                            ? 'text-amber-600 font-extrabold'
                            : 'text-text-secondary font-normal'
                        }
                      >
                        {formatCurrency(customer.total_debt)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleWhatsAppChat(customer)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
                        title="Kirim pesan penagihan kasbon via WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Chat WA</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
