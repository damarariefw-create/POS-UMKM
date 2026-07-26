import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { History, Calendar, ShoppingBag, ChevronDown, ChevronUp, AlertCircle, Banknote, UserCheck, DollarSign } from 'lucide-react';

export const HistoryPage = () => {
  const { user } = useAuth();

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [expandedSaleId, setExpandedSaleId] = useState(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      // 1. Try querying sales with sale_items and customer details
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          customers ( name, phone ),
          sale_items (
            id,
            product_id,
            quantity,
            price_at_time,
            subtotal,
            products ( name )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (salesError) {
        // Fallback to transactions table if schema alias used
        const { data: transData, error: transError } = await supabase
          .from('transactions')
          .select(`
            *,
            transaction_items (
              id,
              product_id,
              product_name,
              price,
              quantity,
              subtotal
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (transError) throw salesError;
        setSales(transData || []);
      } else {
        setSales(salesData || []);
      }
    } catch (err) {
      console.error('Fetch history error:', err);
      setErrorMsg('Gagal memuat riwayat transaksi dari database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchHistory();
    }
  }, [user?.id]);

  const toggleExpand = (id) => {
    setExpandedSaleId((prev) => (prev === id ? null : id));
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Summary Calculations
  const totalRevenue = sales.reduce((acc, s) => acc + (Number(s.total_amount) || 0), 0);
  
  const totalLunas = sales
    .filter((s) => s.payment_method === 'cash' || !s.payment_method)
    .reduce((acc, s) => acc + (Number(s.total_amount) || 0), 0);

  const totalKasbon = sales
    .filter((s) => s.payment_method === 'kasbon')
    .reduce((acc, s) => acc + (Number(s.total_amount) || 0), 0);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-custom pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-text-primary flex items-center gap-2">
            <History className="w-6 h-6 text-primary" />
            Riwayat Transaksi Penjualan
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            Laporan lengkap penjualan tunai dan catatan kasbon.
          </p>
        </div>
      </div>

      {/* Error notification */}
      {errorMsg && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-xs text-destructive flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* SUMMARY CARDS AT TOP */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Omset */}
        <div className="bg-surface p-4 rounded-lg border border-border-custom shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-bold text-text-secondary">Total Penjualan</span>
            <div className="text-xl font-extrabold text-text-primary tabular-nums mt-0.5">
              {formatCurrency(totalRevenue)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Total Lunas (Cash) */}
        <div className="bg-emerald-50/60 p-4 rounded-lg border border-emerald-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-bold text-emerald-800">Total Lunas (Tunai)</span>
            <div className="text-xl font-extrabold text-emerald-700 tabular-nums mt-0.5">
              {formatCurrency(totalLunas)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center">
            <Banknote className="w-5 h-5" />
          </div>
        </div>

        {/* Total Kasbon (Debt) */}
        <div className="bg-amber-50/60 p-4 rounded-lg border border-amber-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-bold text-amber-800">Total Kasbon (Belum Lunas)</span>
            <div className="text-xl font-extrabold text-amber-700 tabular-nums mt-0.5">
              {formatCurrency(totalKasbon)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* TRANSACTIONS LIST */}
      {loading ? (
        <div className="p-12 text-center text-text-secondary">
          <div className="w-7 h-7 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-medium">Memuat riwayat transaksi...</p>
        </div>
      ) : sales.length === 0 ? (
        <div className="bg-surface rounded-lg border border-dashed border-border-custom p-12 text-center text-text-secondary">
          <ShoppingBag className="w-12 h-12 text-border-custom mx-auto mb-3 stroke-[1.5]" />
          <h3 className="text-base font-bold text-text-primary mb-1">Belum ada transaksi</h3>
          <p className="text-xs text-text-secondary max-w-sm mx-auto">
            Transaksi yang Anda selesaikan di layar Kasir (POS) akan tercatat otomatis di sini.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sales.map((sale) => {
            const isExpanded = expandedSaleId === sale.id;
            const items = sale.sale_items || sale.transaction_items || [];
            const itemsCount = items.reduce((acc, it) => acc + (it.quantity || 1), 0);
            const customerName = sale.customers ? sale.customers.name : sale.customer_name;
            const isKasbon = sale.payment_method === 'kasbon';

            return (
              <div
                key={sale.id}
                className="bg-surface rounded-lg border border-border-custom shadow-xs overflow-hidden transition-all"
              >
                {/* Transaction Summary Header */}
                <div
                  onClick={() => toggleExpand(sale.id)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-background/50 transition-colors select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${
                        isKasbon
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {isKasbon ? <UserCheck className="w-5 h-5" /> : <Banknote className="w-5 h-5" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-text-primary">
                          #{sale.id.slice(0, 8)}
                        </span>
                        
                        {/* Payment Method Badge */}
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            isKasbon
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}
                        >
                          {isKasbon ? `Kasbon (${customerName || 'Pelanggan'})` : 'Tunai / Cash'}
                        </span>

                        <span className="text-[11px] bg-background border border-border-custom px-2 py-0.5 rounded-full text-text-secondary font-medium tabular-nums">
                          {itemsCount} item
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-text-secondary mt-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDate(sale.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[10px] text-text-secondary uppercase font-bold block">Total</span>
                      <span className="font-black text-base text-primary tabular-nums">
                        {formatCurrency(sale.total_amount)}
                      </span>
                    </div>

                    <div className="text-text-secondary p-1">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Collapsible Items Details */}
                {isExpanded && (
                  <div className="bg-background p-4 border-t border-border-custom space-y-2 text-xs">
                    <h5 className="font-semibold text-text-secondary uppercase tracking-wider text-[11px] mb-2">
                      Rincian Barang Yang Dibeli:
                    </h5>
                    <div className="divide-y divide-border-custom/50 bg-surface rounded-md border border-border-custom overflow-hidden">
                      {items.length === 0 ? (
                        <p className="p-3 text-text-secondary text-center">Tidak ada rincian barang.</p>
                      ) : (
                        items.map((item, idx) => {
                          const itemName =
                            item.products?.name || item.product_name || `Produk #${item.product_id?.slice(0, 6) || idx + 1}`;
                          const itemPrice = item.price_at_time || item.price || 0;

                          return (
                            <div key={item.id || idx} className="p-3 flex justify-between items-center text-text-primary">
                              <div>
                                <span className="font-semibold">{itemName}</span>
                                <span className="text-text-secondary ml-2 tabular-nums">
                                  ({formatCurrency(itemPrice)} x {item.quantity})
                                </span>
                              </div>
                              <span className="font-bold tabular-nums">
                                {formatCurrency(item.subtotal)}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
