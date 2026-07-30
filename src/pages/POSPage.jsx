import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import {
  Search,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Package,
  AlertCircle,
  Receipt,
  UserCheck,
  Banknote,
  ChevronUp,
  X,
  QrCode,
  Upload,
  Smartphone
} from 'lucide-react';

export const POSPage = () => {
  const { user } = useAuth();
  const {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    holdOrder,
    heldOrders,
    restoreOrder,
    subtotal,
    tax,
    total,
    totalItemsCount
  } = useCart();

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [isProcessingPay, setIsProcessingPay] = useState(false);
  const [successModal, setSuccessModal] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Mobile Bottom Sheet State
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Payment method state ('cash', 'kasbon', or 'qris')
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cashGiven, setCashGiven] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Customer selection & instant add
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);

  // QRIS state — store merchant QRIS string in localStorage
  const [qrisString, setQrisString] = useState(
    () => localStorage.getItem('pos_umkm_qris_string') || ''
  );
  const [isEditingQris, setIsEditingQris] = useState(false);
  const [qrisTempInput, setQrisTempInput] = useState('');

  // Fetch products, customers, and categories from Supabase for logged-in vendor
  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      const [prodRes, custRes, catRes] = await Promise.all([
        supabase.from('products').select('*').eq('user_id', user.id).order('name', { ascending: true }),
        supabase.from('customers').select('*').eq('user_id', user.id).order('name', { ascending: true }),
        supabase.from('categories').select('*').eq('user_id', user.id).order('name', { ascending: true }),
      ]);

      if (prodRes.error) throw prodRes.error;
      if (custRes.error) throw custRes.error;

      setProducts(prodRes.data || []);
      setCustomers(custRes.data || []);
      setCategoriesList(catRes.data || []);
    } catch (err) {
      console.error('Fetch data error:', err);
      setErrorMsg('Gagal memuat data produk dan pelanggan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  // Use categories from database, adding 'Semua' as first option
  const categories = ['Semua', ...categoriesList.map((c) => c.name)];

  // Filter products based on search query and category
  const filteredProducts = products.filter((p) => {
    const categoryName = p.type || p.category || '';
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      categoryName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Semua' || categoryName === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Calculate Cash Change or Deficit (Allow negative for 'Kurang/Kasbon' logic)
  const numericCash = parseFloat(cashGiven) || 0;
  const isCashDeficit = paymentMethod === 'cash' && numericCash < total;
  const deficitAmount = isCashDeficit ? (total - numericCash) : 0;
  const changeAmount = paymentMethod === 'cash' ? (numericCash - total) : 0;

  // Handle Pay transaction
  const handlePay = async () => {
    if (cartItems.length === 0) return;

    // Trigger Otomatis: If Kasbon OR Cash payment is less than total bill, require customer selection
    if ((paymentMethod === 'kasbon' || isCashDeficit) && !selectedCustomerId) {
      setErrorMsg(
        isCashDeficit
          ? `Uang dibayar kurang ${formatCurrency(deficitAmount)}. Pilih atau tambah nama pelanggan untuk menyimpan sisa kekurangan sebagai Kasbon.`
          : 'Pilih atau tambah nama pelanggan terlebih dahulu untuk transaksi Kasbon.'
      );
      return;
    }

    setIsProcessingPay(true);
    setErrorMsg('');

    try {
      const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

      // Determine effective payment method and debt added
      let effectiveMethod = paymentMethod;
      let amountPaid = 0;
      let debtAdded = 0;

      if (paymentMethod === 'kasbon') {
        effectiveMethod = 'kasbon';
        amountPaid = 0;
        debtAdded = total;
      } else if (paymentMethod === 'qris') {
        effectiveMethod = 'qris';
        amountPaid = total;
        debtAdded = 0;
      } else if (paymentMethod === 'cash') {
        if (isCashDeficit) {
          effectiveMethod = 'kasbon'; // Partial cash converted to kasbon
          amountPaid = numericCash;
          debtAdded = deficitAmount;
        } else {
          effectiveMethod = 'cash';
          amountPaid = numericCash || total;
          debtAdded = 0;
        }
      }

      // 1. Insert into sales table
      const salePayload = {
        user_id: user.id,
        customer_id: selectedCustomerId || null,
        total_amount: total,
        payment_method: effectiveMethod,
        amount_paid: amountPaid,
        payment_notes: paymentNotes.trim() || null,
        status: 'completed',
      };

      let saleId = null;
      let saleCreatedAt = new Date().toISOString();

      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([salePayload])
        .select()
        .single();

      if (saleError) {
        // Fallback insert attempt into transactions table if schema alias exists
        const { data: transData, error: transError } = await supabase
          .from('transactions')
          .insert([{
            user_id: user.id,
            total_amount: total,
            customer_id: selectedCustomerId || null,
            payment_notes: paymentNotes.trim() || null
          }])
          .select()
          .single();

        if (transError) throw saleError;
        saleId = transData.id;
        saleCreatedAt = transData.created_at;
      } else {
        saleId = saleData.id;
        saleCreatedAt = saleData.created_at;
      }

      // 2. Insert into sale_items table
      const saleItemsPayload = cartItems.map((item) => ({
        sale_id: saleId,
        product_id: item.product.id,
        quantity: item.quantity,
        price_at_time: Number(item.product.price),
        subtotal: item.subtotal,
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItemsPayload);

      if (itemsError) {
        await supabase.from('transaction_items').insert(
          cartItems.map((item) => ({
            transaction_id: saleId,
            product_id: item.product.id,
            product_name: item.product.name,
            price: Number(item.product.price),
            quantity: item.quantity,
            subtotal: item.subtotal,
          }))
        ).catch(() => { });
      }

      // 3. Update Customer Debt if Kasbon or Deficit
      if (debtAdded > 0 && selectedCustomer) {
        const newDebt = (Number(selectedCustomer.total_debt) || 0) + debtAdded;
        await supabase
          .from('customers')
          .update({ total_debt: newDebt })
          .eq('id', selectedCustomerId);
      }

      // 4. Success Modal & Reset Cart
      setSuccessModal({
        id: saleId,
        date: new Date(saleCreatedAt || Date.now()).toLocaleString('id-ID'),
        total: total,
        items: [...cartItems],
        paymentMethod: effectiveMethod,
        customerName: selectedCustomer ? selectedCustomer.name : null,
        cashGiven: numericCash,
        changeAmount: changeAmount,
        debtAdded: debtAdded,
        paymentNotes: paymentNotes.trim(),
      });

      clearCart();
      setCashGiven('');
      setPaymentNotes('');
      setSelectedCustomerId('');
      setCustomerSearch('');
      setIsMobileCartOpen(false);
      fetchData(); // Refresh customer data & debt
    } catch (err) {
      console.error('Payment error:', err);
      setErrorMsg('Gagal memproses transaksi: ' + (err.message || 'Error server'));
    } finally {
      setIsProcessingPay(false);
    }
  };

  const getVegetableEmoji = (name = '', category = '') => {
    const n = name.toLowerCase();
    const c = category.toLowerCase();
    if (n.includes('sop') || n.includes('sayur')) return '🥗';
    if (n.includes('cabai') || n.includes('cabe') || n.includes('sambal')) return '🌶️';
    if (n.includes('bayam') || n.includes('kangkung') || n.includes('sawi')) return '🥬';
    if (n.includes('tomat')) return '🍅';
    if (n.includes('wortel')) return '🥕';
    if (n.includes('jagung')) return '🌽';
    if (n.includes('terong')) return '🍆';
    if (n.includes('bawang')) return '🧅';
    if (n.includes('kentang') || n.includes('singkong')) return '🥔';
    if (n.includes('timun')) return '🥒';
    if (n.includes('tahu') || n.includes('tempe')) return '🧈';
    if (c.includes('buah') || n.includes('pisang') || n.includes('jeruk')) return '🍎';
    if (c.includes('lauk') || n.includes('ayam') || n.includes('ikan')) return '🍗';
    return '🥬';
  };

  const handleAddInstantCustomer = async () => {
    if (!customerSearch.trim()) return;
    setIsAddingCustomer(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([{ user_id: user.id, name: customerSearch.trim(), total_debt: 0 }])
        .select()
        .single();

      if (error) throw error;

      const newCustomer = data;
      setCustomers((prev) => [...prev, newCustomer].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedCustomerId(newCustomer.id);
      setCustomerSearch('');
    } catch (err) {
      console.error('Instant add customer error:', err);
      setErrorMsg('Gagal menambahkan pelanggan baru.');
    } finally {
      setIsAddingCustomer(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Reusable Checkout Sidebar Content
  const renderCheckoutSidebarContent = () => (
    <div className="flex flex-col h-full bg-surface">
      {/* Cart Header */}
      <div className="p-4 border-b border-border-custom flex items-center justify-between bg-surface shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-base text-text-primary">Keranjang Belanja</h2>
        </div>
        <div className="flex items-center gap-2">
          {cartItems.length > 0 && (
            <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-0.5 rounded-full tabular-nums">
              {totalItemsCount} Item
            </span>
          )}
          {/* Mobile Close Button */}
          <button
            onClick={() => setIsMobileCartOpen(false)}
            className="md:hidden p-1 text-text-secondary hover:text-text-primary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {cartItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-text-secondary py-8">
            <ShoppingBag className="w-12 h-12 text-border-custom mb-2 stroke-[1.5]" />
            <p className="text-sm font-semibold text-text-primary">Keranjang Masih Kosong</p>
            <p className="text-xs text-text-secondary mt-0.5">Pilih produk di katalog untuk ditambahkan.</p>
          </div>
        ) : (
          cartItems.map((item) => (
            <div
              key={item.product.id}
              className="bg-background p-3 rounded-md border border-border-custom flex items-center justify-between gap-3 text-sm"
            >
              {/* Item Details */}
              <div className="flex-1 min-w-0">
                <h5 className="font-semibold text-text-primary truncate">
                  {item.product.name}
                </h5>
                <div className="text-xs text-text-secondary tabular-nums mt-0.5">
                  {formatCurrency(item.product.price)} x {item.quantity}
                </div>
              </div>

              {/* Quantity Controls & Delete */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-surface border border-border-custom rounded-md">
                  <button
                    onClick={() => updateQuantity(item.product.id, -1)}
                    className="p-1.5 text-text-secondary hover:text-text-primary transition-colors"
                    title="Kurangi"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 text-xs font-bold text-text-primary tabular-nums min-w-[20px] text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product.id, 1)}
                    className="p-1.5 text-text-secondary hover:text-text-primary transition-colors"
                    title="Tambah"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Subtotal */}
                <span className="font-bold text-text-primary text-xs tabular-nums min-w-[65px] text-right">
                  {formatCurrency(item.subtotal)}
                </span>

                {/* Delete button */}
                <button
                  onClick={() => removeFromCart(item.product.id)}
                  className="p-1 text-text-secondary hover:text-destructive transition-colors ml-1"
                  title="Hapus"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Payment Options & Summary Area at Bottom */}
      <div className="p-4 border-t border-border-custom bg-surface space-y-3 shrink-0">

        {/* Payment Method Selector */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase text-text-secondary">
            Metode Pembayaran
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => setPaymentMethod('cash')}
              className={`h-10 rounded-md text-[11px] font-bold flex flex-col items-center justify-center gap-0.5 border transition-all ${paymentMethod === 'cash'
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-background text-text-secondary border-border-custom hover:bg-border-custom/50'
                }`}
            >
              <Banknote className="w-4 h-4" />
              <span>Tunai</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('qris')}
              className={`h-10 rounded-md text-[11px] font-bold flex flex-col items-center justify-center gap-0.5 border transition-all ${paymentMethod === 'qris'
                  ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                  : 'bg-background text-text-secondary border-border-custom hover:bg-border-custom/50'
                }`}
            >
              <QrCode className="w-4 h-4" />
              <span>QRIS</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('kasbon')}
              className={`h-10 rounded-md text-[11px] font-bold flex flex-col items-center justify-center gap-0.5 border transition-all ${paymentMethod === 'kasbon'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-background text-text-secondary border-border-custom hover:bg-border-custom/50'
                }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Kasbon</span>
            </button>
          </div>
        </div>

        {/* CASH PAYMENT PRESETS & CHANGE CALCULATOR */}
        {paymentMethod === 'cash' && cartItems.length > 0 && (
          <div className="space-y-2 bg-background p-2.5 rounded-md border border-border-custom">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-text-secondary">Uang Diterima:</span>
              <input
                type="number"
                value={cashGiven}
                onChange={(e) => setCashGiven(e.target.value)}
                placeholder={total.toString()}
                className="w-28 px-2 py-1 bg-surface border border-border-custom rounded text-right text-xs font-bold tabular-nums focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-wrap gap-1">
              {[total, 5000, 10000, 20000, 50000, 100000].map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCashGiven(preset.toString())}
                  className="px-2 py-0.5 bg-surface hover:bg-primary/10 text-text-primary border border-border-custom rounded text-[11px] font-semibold tabular-nums"
                >
                  {preset === total ? 'Pas' : `Rp ${preset / 1000}k`}
                </button>
              ))}
            </div>
            {numericCash > 0 && (
              <div className="flex justify-between items-center text-xs font-bold pt-1 border-t border-border-custom/60">
                <span className="text-text-secondary">
                  {numericCash < total ? 'Kurang (Otomatis Kasbon):' : 'Kembalian:'}
                </span>
                <span className={`text-sm tabular-nums ${numericCash < total ? 'text-amber-600 font-extrabold' : 'text-emerald-700'}`}>
                  {numericCash < total
                    ? `-Rp ${deficitAmount.toLocaleString('id-ID')}`
                    : formatCurrency(changeAmount)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* QRIS PAYMENT PANEL — Render QR Code dari string QRIS merchant */}
        {paymentMethod === 'qris' && (
          <div className="space-y-2.5 bg-violet-50 p-2.5 rounded-md border border-violet-200">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-violet-700" />
                <span className="text-xs font-bold text-violet-900">Pembayaran QRIS</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditingQris(true);
                  setQrisTempInput(qrisString);
                }}
                className="flex items-center gap-1 text-[11px] text-violet-700 font-semibold hover:text-violet-900 underline underline-offset-2"
              >
                ✏️ {qrisString ? 'Ubah QRIS' : 'Set QRIS'}
              </button>
            </div>

            {/* Input QRIS String */}
            {isEditingQris && (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-violet-800">
                  Paste string QRIS dari bank/e-wallet Anda:
                </label>
                <textarea
                  value={qrisTempInput}
                  onChange={(e) => setQrisTempInput(e.target.value)}
                  placeholder="00020101021226...dst (QRIS EMV string dari bank)"
                  rows={3}
                  className="w-full px-2 py-1.5 bg-white border border-violet-300 rounded text-[10px] text-text-primary font-mono focus:outline-none focus:border-violet-600 resize-none leading-relaxed"
                />
                <p className="text-[10px] text-violet-600">
                  Dapatkan dari m-banking Anda: menu QRIS → Terima Pembayaran → Salin Kode QR.
                  String dimulai dengan <code className="bg-violet-100 px-1 rounded font-mono">000201</code>
                </p>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = qrisTempInput.trim();
                      setQrisString(trimmed);
                      try { localStorage.setItem('pos_umkm_qris_string', trimmed); } catch (_) { }
                      setIsEditingQris(false);
                    }}
                    disabled={!qrisTempInput.trim()}
                    className="flex-1 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded transition-colors disabled:opacity-40"
                  >
                    Simpan & Tampilkan QR
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingQris(false)}
                    className="px-3 py-1.5 bg-white border border-violet-200 text-violet-700 text-xs font-semibold rounded hover:bg-violet-50 transition-colors"
                  >
                    Batal
                  </button>
                </div>
                {qrisString && (
                  <button
                    type="button"
                    onClick={() => {
                      setQrisString('');
                      localStorage.removeItem('pos_umkm_qris_string');
                      setIsEditingQris(false);
                    }}
                    className="text-[10px] text-red-500 underline underline-offset-2 hover:text-red-700 w-full text-center"
                  >
                    Hapus QRIS
                  </button>
                )}
              </div>
            )}

            {/* QR Code Display */}
            {!isEditingQris && (
              qrisString ? (
                <div className="flex flex-col items-center gap-2">
                  {/* Nominal indicator */}
                  <div className="w-full bg-white rounded-md border border-violet-200 px-3 py-2 flex justify-between items-center">
                    <span className="text-xs text-violet-700 font-semibold">Total Transfer:</span>
                    <span className="text-sm font-extrabold text-violet-900 tabular-nums">{formatCurrency(total)}</span>
                  </div>

                  {/* Generated QR Code */}
                  <div className="bg-white rounded-xl p-3 border-2 border-violet-200 shadow-md">
                    <QRCodeSVG
                      value={qrisString}
                      size={176}
                      bgColor="#ffffff"
                      fgColor="#4c1d95"
                      level="M"
                      includeMargin={false}
                    />
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-violet-700 bg-violet-100 px-3 py-1.5 rounded-full font-medium">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Minta pembeli scan QR &amp; transfer <strong>{formatCurrency(total)}</strong></span>
                  </div>

                  <p className="text-[10px] text-violet-400 text-center">
                    ⚠️ QRIS statis — nominal diinput manual oleh pembeli di app bank mereka
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 bg-white rounded-lg p-4 border border-dashed border-violet-300">
                  <QrCode className="w-10 h-10 text-violet-300" />
                  <p className="text-xs text-center text-violet-700 font-medium">
                    Belum ada QRIS dikonfigurasi.
                    <br />
                    Klik <strong>&quot;Set QRIS&quot;</strong> di atas untuk memasukkan string QRIS Anda.
                  </p>
                </div>
              )
            )}
          </div>
        )}

        {/* KASBON / DEFICIT CUSTOMER SELECTION WITH INSTANT ADD */}
        {(paymentMethod === 'kasbon' || isCashDeficit) && (
          <div className="space-y-2 bg-amber-50 p-2.5 rounded-md border border-amber-200">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-amber-900">
                Pilih / Tambah Pelanggan {isCashDeficit ? '(Catat Sisa Kasbon) *' : '*'}
              </label>
              {selectedCustomerId && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomerId('');
                    setCustomerSearch('');
                  }}
                  className="text-[10px] text-amber-700 underline font-semibold hover:text-amber-900"
                >
                  Reset Pilih
                </button>
              )}
            </div>

            {/* Customer Search & Dropdown */}
            <div className="space-y-1.5">
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Cari atau ketik nama pelanggan baru..."
                className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded text-xs font-medium text-text-primary focus:outline-none focus:border-amber-600"
              />

              {/* Instant Add Button if typed name does not exist */}
              {customerSearch.trim() && !customers.some((c) => c.name.toLowerCase() === customerSearch.trim().toLowerCase()) && (
                <button
                  type="button"
                  onClick={() => handleAddInstantCustomer(customerSearch.trim())}
                  disabled={isAddingCustomer}
                  className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  {isAddingCustomer ? (
                    <span>Menambahkan...</span>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah &quot;{customerSearch.trim()}&quot; sebagai pelanggan baru</span>
                    </>
                  )}
                </button>
              )}

              {/* Select dropdown */}
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value);
                  const found = customers.find((c) => c.id === e.target.value);
                  if (found) setCustomerSearch(found.name);
                }}
                className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded text-xs font-semibold text-text-primary focus:outline-none focus:border-amber-600"
              >
                <option value="">-- Pilih Nama Pelanggan --</option>
                {customers
                  .filter((c) => c.name.toLowerCase().includes(customerSearch.toLowerCase()))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.total_debt > 0 ? `(Hutang: ${formatCurrency(c.total_debt)})` : ''}
                    </option>
                  ))}
              </select>
            </div>

            {customers.length === 0 && !customerSearch.trim() && (
              <p className="text-[11px] text-amber-800">
                Belum ada data pelanggan. Ketik nama pelanggan di kolom pencarian di atas untuk menambahkan instan.
              </p>
            )}
          </div>
        )}

        {/* CATATAN PEMBAYARAN */}
        <div className="space-y-1">
          <label className="block text-[11px] font-semibold uppercase text-text-secondary">
            Catatan Pembayaran / Transaksi (Opsional)
          </label>
          <input
            type="text"
            value={paymentNotes}
            onChange={(e) => setPaymentNotes(e.target.value)}
            placeholder="cth: Bayar separuh dulu, titip di warung..."
            className="w-full px-2.5 py-1.5 bg-background border border-border-custom rounded-md text-xs text-text-primary focus:outline-none focus:border-primary"
          />
        </div>

        {/* Total Summary */}
        <div className="space-y-1 text-xs text-text-secondary pt-1">
          <div className="flex justify-between items-center text-sm font-bold border-t border-border-custom pt-1.5">
            <span className="text-text-primary">Total Bayar</span>
            <span className="text-lg text-primary tabular-nums">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {/* Cancel */}
          <button
            onClick={clearCart}
            disabled={cartItems.length === 0}
            className="h-10 border border-destructive text-destructive hover:bg-destructive/10 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-40"
          >
            <XCircle className="w-4 h-4" />
            <span>Batal</span>
          </button>

          {/* Hold */}
          <button
            onClick={holdOrder}
            disabled={cartItems.length === 0}
            className="h-10 border border-primary text-primary hover:bg-primary/10 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-40"
          >
            <PauseCircle className="w-4 h-4" />
            <span>Tahan</span>
          </button>
        </div>

        {/* Pay Button */}
        <button
          onClick={handlePay}
          disabled={
            cartItems.length === 0 ||
            isProcessingPay ||
            (paymentMethod === 'kasbon' && !selectedCustomerId)
          }
          className={`w-full h-12 font-bold text-sm rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${paymentMethod === 'kasbon'
              ? 'bg-amber-600 hover:bg-amber-700 text-white'
              : paymentMethod === 'qris'
                ? 'bg-violet-600 hover:bg-violet-700 text-white'
                : 'bg-primary hover:bg-primary-hover text-white'
            }`}
        >
          {isProcessingPay ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Memproses...</span>
            </>
          ) : (
            <>
              {paymentMethod === 'qris' ? <QrCode className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
              <span>
                {paymentMethod === 'kasbon'
                  ? `CATAT KASBON (${formatCurrency(total)})`
                  : paymentMethod === 'qris'
                    ? `KONFIRMASI QRIS (${formatCurrency(total)})`
                    : `BAYAR SEKARANG (${formatCurrency(total)})`}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col md:flex-row overflow-hidden bg-background relative">

      {/* LEFT SIDE: CATALOG */}
      <div className="flex-1 flex flex-col h-full border-r border-border-custom overflow-hidden">

        {/* Search & Category Header */}
        <div className="p-3 sm:p-4 bg-surface border-b border-border-custom space-y-2.5 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama barang / produk (cth: Beras)..."
              className="w-full pl-9 pr-4 py-2 bg-background border border-border-custom rounded-md text-sm text-text-primary focus:outline-none focus:border-primary"
            />
          </div>

          {/* Categories Horizontal Scroll */}
          {categories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${selectedCategory === cat
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-background hover:bg-border-custom/50 text-text-secondary border border-border-custom'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Held Orders Bar */}
          {heldOrders.length > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 p-2 rounded-md">
              <PauseCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-xs font-semibold text-amber-800">
                {heldOrders.length} Pesanan Tertahan:
              </span>
              <div className="flex items-center gap-1 overflow-x-auto">
                {heldOrders.map((ho, i) => (
                  <button
                    key={ho.id}
                    onClick={() => restoreOrder(ho)}
                    className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold tabular-nums"
                  >
                    Buka #{i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Product Grid Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar pb-24 md:pb-4">
          {errorMsg && (
            <div className="mb-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{errorMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-text-secondary">
              <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mb-2" />
              <p className="text-xs font-medium">Memuat katalog sayuran...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center bg-surface rounded-lg border border-dashed border-border-custom p-8 text-center">
              <Package className="w-12 h-12 text-text-secondary mb-3 opacity-40" />
              <h3 className="text-base font-bold text-text-primary mb-1">Katalog Produk Kosong</h3>
              <p className="text-xs text-text-secondary max-w-sm mb-4">
                Belum ada produk. Tambahkan produk Anda di menu Kelola Produk.
              </p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-text-secondary">
              <p className="text-sm font-medium">Tidak ada produk ditemukan.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {filteredProducts.map((product) => {
                const inCart = cartItems.find((ci) => ci.product.id === product.id);

                return (
                  <div
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="group bg-surface rounded-md border border-border-custom p-3 flex flex-col justify-between cursor-pointer hover:border-primary hover:shadow-md transition-all relative overflow-hidden select-none active:scale-[0.98]"
                  >
                    {inCart && (
                      <div className="absolute top-2 right-2 bg-primary text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow tabular-nums">
                        {inCart.quantity}
                      </div>
                    )}

                    <div>
                      <div className="w-full h-20 sm:h-24 bg-background rounded-md mb-2 flex items-center justify-center overflow-hidden border border-border-custom/50">
                        {(() => {
                          const localImg = localStorage.getItem(`pos_umkm_img_${product.id}`) || localStorage.getItem(`sayurku_img_${product.id}`);
                          const imgSrc = localImg || product.image_url;

                          return imgSrc ? (
                            <img
                              src={imgSrc}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <span className="text-3xl sm:text-4xl group-hover:scale-110 transition-transform">
                              {getVegetableEmoji(product.name, product.type || product.category)}
                            </span>
                          );
                        })()}
                      </div>

                      <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary block mb-0.5">
                        {product.type || product.category || 'Umum'}
                      </span>

                      <h4 className="font-semibold text-xs sm:text-sm text-text-primary leading-snug line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                        {product.name}
                      </h4>
                    </div>

                    <div className="mt-1.5 pt-1.5 border-t border-border-custom/40 flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-extrabold text-primary tabular-nums">
                        {formatCurrency(product.price)}
                      </span>
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* DESKTOP CHECKOUT SIDEBAR (Hidden on mobile < md) */}
      <div className="hidden md:block w-[380px] h-full shrink-0 shadow-sm border-l border-border-custom">
        {renderCheckoutSidebarContent()}
      </div>

      {/* MOBILE FLOATING ACTION BUTTON (FAB) FOR CART */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 z-30">
        <button
          onClick={() => setIsMobileCartOpen(true)}
          className="w-full h-14 bg-primary text-white rounded-xl shadow-lg flex items-center justify-between px-4 font-bold text-sm active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            <span>Keranjang Belanja</span>
            {cartItems.length > 0 && (
              <span className="bg-white text-primary text-xs px-2 py-0.5 rounded-full font-extrabold tabular-nums">
                {totalItemsCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-base tabular-nums font-black">
            <span>{formatCurrency(total)}</span>
            <ChevronUp className="w-5 h-5" />
          </div>
        </button>
      </div>

      {/* MOBILE BOTTOM SHEET FOR CART */}
      {isMobileCartOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150">
          <div className="bg-surface rounded-t-2xl max-h-[85vh] h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
            {renderCheckoutSidebarContent()}
          </div>
        </div>
      )}

      {/* SUCCESS RECEIPT MODAL */}
      {successModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface rounded-lg max-w-sm w-full p-5 shadow-xl border border-border-custom animate-in fade-in zoom-in duration-150">
            <div className="text-center mb-3">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-extrabold text-text-primary">Transaksi Berhasil!</h3>
              <p className="text-xs text-text-secondary mt-0.5">
                ID: #{successModal.id.slice(0, 8)} • {successModal.date}
              </p>
              <div className={`mt-1 inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${successModal.paymentMethod === 'kasbon'
                  ? 'bg-amber-100 border-amber-300 text-amber-800'
                  : successModal.paymentMethod === 'qris'
                    ? 'bg-violet-100 border-violet-300 text-violet-800'
                    : 'bg-background border-border-custom text-text-primary'
                }`}>
                {successModal.paymentMethod === 'kasbon'
                  ? `KASBON (${successModal.customerName || 'Pelanggan'})`
                  : successModal.paymentMethod === 'qris'
                    ? '✅ QRIS / Transfer'
                    : 'TUNAI / CASH'}
              </div>
            </div>

            <div className="bg-background p-3 rounded-md border border-border-custom max-h-40 overflow-y-auto space-y-1.5 text-xs mb-3 custom-scrollbar">
              {successModal.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-text-primary">
                  <span className="truncate pr-2">
                    {item.product.name} x{item.quantity}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-1 text-xs border-t border-border-custom pt-2 mb-4">
              <div className="flex justify-between font-bold text-sm">
                <span>Total Belanja</span>
                <span className="text-primary tabular-nums">{formatCurrency(successModal.total)}</span>
              </div>
              {successModal.cashGiven > 0 && (
                <div className="flex justify-between text-text-secondary">
                  <span>Uang Diterima</span>
                  <span className="tabular-nums">{formatCurrency(successModal.cashGiven)}</span>
                </div>
              )}
              {successModal.debtAdded > 0 ? (
                <div className="flex justify-between text-amber-700 font-bold bg-amber-50 p-1.5 rounded border border-amber-200">
                  <span>Kasbon ({successModal.customerName}):</span>
                  <span className="tabular-nums">+{formatCurrency(successModal.debtAdded)}</span>
                </div>
              ) : successModal.changeAmount > 0 ? (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Kembalian</span>
                  <span className="tabular-nums">{formatCurrency(successModal.changeAmount)}</span>
                </div>
              ) : null}

              {successModal.paymentNotes && (
                <div className="mt-2 pt-1.5 border-t border-border-custom/50 text-[11px] text-text-secondary italic">
                  <span className="font-semibold not-italic text-text-primary">Catatan: </span>
                  {successModal.paymentNotes}
                </div>
              )}
            </div>

            <button
              onClick={() => setSuccessModal(null)}
              className="w-full h-11 bg-primary text-white font-semibold text-sm rounded-lg hover:bg-primary-hover transition-colors"
            >
              Selesai & Transaksi Baru
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
