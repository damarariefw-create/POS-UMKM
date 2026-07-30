import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Package, Plus, Trash2, Tag, DollarSign, Image as ImageIcon, AlertCircle, CheckCircle, Save, Edit3, X, Upload } from 'lucide-react';

export const ProductsPage = () => {
  const { user, ensureProfileExists } = useAuth();

  const [activeTab, setActiveTab] = useState('list'); // 'list', 'mass_update', or 'categories'
  const [products, setProducts] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State (Product)
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [imageFileName, setImageFileName] = useState('');

  // Form State (Category)
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState(null);
  const [editingCatName, setEditingCatName] = useState('');

  // Local Image Storage Map (productId -> dataUrl)
  const [localImages, setLocalImages] = useState({});

  // Mass Update State: Map of productId -> price
  const [massPrices, setMassPrices] = useState({});

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      const [prodRes, catRes] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('categories')
          .select('*')
          .eq('user_id', user.id)
          .order('name', { ascending: true })
      ]);

      if (prodRes.error) throw prodRes.error;
      if (catRes.error) {
        console.warn('Categories table might not exist yet:', catRes.error.message);
      }

      const prods = prodRes.data || [];
      const cats = catRes.data || [];

      setProducts(prods);
      setCategoriesList(cats);

      if (cats.length > 0 && !category) {
        setCategory(cats[0].name);
      }

      // Load local images from localStorage if any
      const imgMap = {};
      prods.forEach((p) => {
        const savedImg = localStorage.getItem(`pos_umkm_img_${p.id}`) || localStorage.getItem(`sayurku_img_${p.id}`);
        if (savedImg) imgMap[p.id] = savedImg;
      });
      setLocalImages(imgMap);

      // Populate massPrices map
      const priceMap = {};
      prods.forEach((p) => {
        priceMap[p.id] = p.price;
      });
      setMassPrices(priceMap);
    } catch (err) {
      console.error('Fetch data error:', err);
      setErrorMsg('Gagal memuat data dari database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  // Handle Image File Selection & Base64 Conversion
  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        setErrorMsg('Ukuran gambar terlalu besar (Maksimal 3MB).');
        return;
      }

      setErrorMsg('');
      setImageFileName(file.name);

      const reader = new FileReader();
      reader.onloadend = () => {
        setImageDataUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageDataUrl('');
    setImageFileName('');
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim() || !price) {
      setErrorMsg('Nama produk dan harga wajib diisi.');
      return;
    }

    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      setErrorMsg('Harga harus berupa angka valid.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Pastikan profil user sudah ada di Supabase (FK constraint: products.user_id -> profiles.id)
      await ensureProfileExists(user);

      // Clean payload: ONLY include valid database columns (user_id, name, type, price)
      const { data, error } = await supabase
        .from('products')
        .insert([
          {
            user_id: user.id,
            name: name.trim(),
            type: category.trim(),
            price: numericPrice,
          },
        ])
        .select();

      if (error) throw error;

      const createdProduct = data[0];

      // Store image in localStorage if provided
      if (createdProduct && imageDataUrl) {
        try {
          localStorage.setItem(`pos_umkm_img_${createdProduct.id}`, imageDataUrl);
        } catch (e) {
          console.warn('LocalStorage quota full for image');
        }
      }

      setSuccessMsg(`Produk "${name}" berhasil ditambahkan ke Supabase!`);
      setName('');
      setPrice('');
      setImageDataUrl('');
      setImageFileName('');
      fetchProducts();
    } catch (err) {
      console.error('Add product error:', err);
      setErrorMsg(err.message || 'Gagal menyimpan produk.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (productId, productName) => {
    if (!window.confirm(`Hapus produk "${productName}"?`)) return;

    try {
      setErrorMsg('');
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('user_id', user.id);

      if (error) throw error;

      localStorage.removeItem(`pos_umkm_img_${productId}`);
      localStorage.removeItem(`sayurku_img_${productId}`); // cleanup old key too
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      setSuccessMsg(`Produk "${productName}" berhasil dihapus.`);
    } catch (err) {
      console.error('Delete product error:', err);
      setErrorMsg('Gagal menghapus produk dari database.');
    }
  };

  const handleMassPriceChange = (productId, val) => {
    setMassPrices((prev) => ({
      ...prev,
      [productId]: val,
    }));
  };

  const handleSaveAllPrices = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      const updatePromises = Object.entries(massPrices).map(([id, newPrice]) => {
        const num = parseFloat(newPrice);
        if (isNaN(num) || num < 0) return Promise.resolve();
        return supabase
          .from('products')
          .update({ price: num })
          .eq('id', id)
          .eq('user_id', user.id);
      });

      await Promise.all(updatePromises);
      setSuccessMsg('Semua harga produk berhasil diperbarui di database!');
      fetchData();
    } catch (err) {
      console.error('Mass price update error:', err);
      setErrorMsg('Gagal memperbarui harga massal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Category CRUD
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('categories')
        .insert([{ user_id: user.id, name: newCatName.trim() }]);

      if (error) throw error;
      setSuccessMsg(`Kategori "${newCatName}" berhasil ditambahkan.`);
      setNewCatName('');
      fetchData();
    } catch (err) {
      console.error('Add category error:', err);
      setErrorMsg('Gagal menambahkan kategori. Pastikan tabel "categories" sudah ada.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (catId, catName) => {
    if (!window.confirm(`Hapus kategori "${catName}"?`)) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', catId)
        .eq('user_id', user.id);

      if (error) throw error;
      setSuccessMsg(`Kategori "${catName}" berhasil dihapus.`);
      fetchData();
    } catch (err) {
      console.error('Delete category error:', err);
      setErrorMsg('Gagal menghapus kategori.');
    }
  };

  const handleSaveEditCategory = async (catId) => {
    if (!editingCatName.trim()) return;
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const { error } = await supabase
        .from('categories')
        .update({ name: editingCatName.trim() })
        .eq('id', catId)
        .eq('user_id', user.id);

      if (error) throw error;
      setSuccessMsg(`Kategori berhasil diperbarui menjadi "${editingCatName.trim()}".`);
      setEditingCatId(null);
      setEditingCatName('');
      fetchData();
    } catch (err) {
      console.error('Edit category error:', err);
      setErrorMsg('Gagal memperbarui kategori.');
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

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-custom pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-text-primary flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            Kelola Inventaris & Harga Barang
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            Tambah produk baru dan perbarui harga harian massal.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center bg-surface p-1 rounded-lg border border-border-custom shadow-xs">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'list'
              ? 'bg-primary text-white shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
              }`}
          >
            <Package className="w-4 h-4" />
            <span>Tambah & Daftar Produk</span>
          </button>
          <button
            onClick={() => setActiveTab('mass_update')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'mass_update'
              ? 'bg-primary text-white shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
              }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>Daily Mass Update</span>
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'categories'
              ? 'bg-primary text-white shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
              }`}
          >
            <Tag className="w-4 h-4" />
            <span>Kelola Kategori</span>
          </button>
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

      {/* TAB 1: ADD & PRODUCT LIST */}
      {activeTab === 'list' && (
        <>
          {/* FORM TO ADD PRODUCT */}
          <div className="bg-surface rounded-lg border border-border-custom p-5 shadow-sm">
            <h2 className="text-base font-bold text-text-primary mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              Tambah Produk Baru
            </h2>

            <form onSubmit={handleAddProduct} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                  Nama Produk *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="cth: Beras"
                  className="w-full px-3 py-2 bg-background border border-border-custom rounded-md text-sm text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                  Kategori
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border-custom rounded-md text-sm text-text-primary focus:outline-none focus:border-primary"
                >
                  <option value="">-- Pilih Kategori --</option>
                  {categoriesList.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                  <option value="Lainnya">Lainnya</option>
                </select>
                {categoriesList.length === 0 && (
                  <p className="text-[10px] text-amber-600 mt-1">
                    Belum ada kategori. Tambah di tab <strong>Kelola Kategori</strong>.
                  </p>
                )}
              </div>

              {/* Price */}
              <div>
                <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                  Harga (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="500"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="cth: 5000"
                  className="w-full px-3 py-2 bg-background border border-border-custom rounded-md text-sm text-text-primary tabular-nums focus:outline-none focus:border-primary"
                />
              </div>

              {/* Upload Image File Input */}
              <div>
                <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                  Upload Foto Produk (File Gambar)
                </label>

                {imageDataUrl ? (
                  <div className="flex items-center gap-2 p-1.5 bg-background border border-border-custom rounded-md">
                    <img src={imageDataUrl} alt="Preview" className="w-8 h-8 object-cover rounded" />
                    <span className="text-xs text-text-primary truncate flex-1">{imageFileName || 'Gambar dipilih'}</span>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="p-1 text-destructive hover:bg-destructive/10 rounded"
                      title="Hapus Gambar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="w-full text-xs text-text-secondary file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 border border-border-custom rounded-md bg-background cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="sm:col-span-2 lg:col-span-4 flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-10 px-6 bg-primary hover:bg-primary-hover text-white font-semibold text-sm rounded-lg shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Menyimpan...</span>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Tambah Produk</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* PRODUCTS TABLE */}
          <div className="bg-surface rounded-lg border border-border-custom overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border-custom flex items-center justify-between bg-surface">
              <h2 className="font-bold text-base text-text-primary">Daftar Produk ({products.length})</h2>
            </div>

            {loading ? (
              <div className="p-8 text-center text-text-secondary">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs">Memuat tabel produk...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="p-8 text-center text-text-secondary">
                <p className="text-sm font-medium">Belum ada produk di database.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-background border-b border-border-custom text-xs uppercase font-semibold text-text-secondary">
                      <th className="py-3 px-4">Foto</th>
                      <th className="py-3 px-4">Nama Produk</th>
                      <th className="py-3 px-4">Kategori</th>
                      <th className="py-3 px-4 text-right">Harga</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-custom">
                    {products.map((product) => {
                      const img = localImages[product.id];

                      return (
                        <tr key={product.id} className="hover:bg-background/50 transition-colors">
                          <td className="py-2 px-4">
                            {img ? (
                              <img src={img} alt={product.name} className="w-9 h-9 object-cover rounded-md border border-border-custom" />
                            ) : (
                              <div className="w-9 h-9 rounded-md bg-background border border-border-custom flex items-center justify-center text-lg">
                                🥬
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-semibold text-text-primary">
                            {product.name}
                          </td>
                          <td className="py-3 px-4 text-xs text-text-secondary">
                            <span className="bg-background px-2 py-0.5 rounded-full border border-border-custom font-medium">
                              {product.type || 'Umum'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-primary tabular-nums">
                            {formatCurrency(product.price)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleDeleteProduct(product.id, product.name)}
                              className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors inline-flex items-center gap-1 text-xs font-medium"
                              title="Hapus Produk"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span className="hidden sm:inline">Hapus</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB 2: DAILY MASS UPDATE */}
      {activeTab === 'mass_update' && (
        <div className="bg-surface rounded-lg border border-border-custom overflow-hidden shadow-sm space-y-4 p-5">
          <div className="flex items-center justify-between border-b border-border-custom pb-3">
            <div>
              <h2 className="font-bold text-base text-text-primary flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-primary" />
                Daily Mass Update - Perbarui Harga Pasar Harian
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Ubah harga beberapa produk sekaligus dan simpan secara bersamaan ke database.
              </p>
            </div>
          </div>

          {products.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-8">
              Belum ada produk untuk diperbarui. Tambahkan produk di tab sebelah.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto border border-border-custom rounded-md">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-background border-b border-border-custom text-xs uppercase font-semibold text-text-secondary">
                      <th className="py-3 px-4">Nama Produk</th>
                      <th className="py-3 px-4">Kategori</th>
                      <th className="py-3 px-4 text-right">Harga Saat Ini</th>
                      <th className="py-3 px-4 text-right">Harga Baru (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-custom">
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-background/50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-text-primary">
                          {product.name}
                        </td>
                        <td className="py-3 px-4 text-xs text-text-secondary">
                          {product.type || 'Umum'}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-text-secondary tabular-nums">
                          {formatCurrency(product.price)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <input
                            type="number"
                            min="0"
                            step="500"
                            value={massPrices[product.id] ?? product.price}
                            onChange={(e) => handleMassPriceChange(product.id, e.target.value)}
                            className="w-32 px-3 py-1 bg-background border border-border-custom rounded text-right font-bold text-primary tabular-nums focus:outline-none focus:border-primary"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  onClick={handleSaveAllPrices}
                  disabled={isSubmitting}
                  className="h-11 px-6 bg-primary hover:bg-primary-hover text-white font-bold text-sm rounded-lg shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 active:scale-[0.99]"
                >
                  {isSubmitting ? (
                    <span>Menyimpan Semua...</span>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save All Prices (Simpan Semua Harga)</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 3: CATEGORIES MANAGEMENT */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="bg-surface rounded-lg border border-border-custom p-5 shadow-sm">
            <h2 className="text-base font-bold text-text-primary mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              Tambah Kategori Baru
            </h2>
            <form onSubmit={handleAddCategory} className="flex gap-3">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="cth: Bahan Pokok"
                className="flex-1 px-3 py-2 bg-background border border-border-custom rounded-md text-sm text-text-primary focus:outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={isSubmitting || !newCatName.trim()}
                className="h-10 px-6 bg-primary hover:bg-primary-hover text-white font-semibold text-sm rounded-lg shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>Simpan</span>
              </button>
            </form>
          </div>

          <div className="bg-surface rounded-lg border border-border-custom overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border-custom bg-surface">
              <h2 className="font-bold text-base text-text-primary">Daftar Kategori ({categoriesList.length})</h2>
            </div>
            <div className="divide-y divide-border-custom">
              {categoriesList.length === 0 ? (
                <p className="p-8 text-center text-text-secondary text-sm">
                  Belum ada kategori disetel. Tambahkan kategori baru pada form di atas.
                </p>
              ) : (
                categoriesList.map((cat) => (
                  <div key={cat.id} className="p-4 flex items-center justify-between hover:bg-background/50 transition-colors">
                    {editingCatId === cat.id ? (
                      <div className="flex items-center gap-2 flex-1 mr-3">
                        <input
                          type="text"
                          value={editingCatName}
                          onChange={(e) => setEditingCatName(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-background border border-primary rounded-md text-sm font-semibold text-text-primary focus:outline-none"
                        />
                        <button
                          onClick={() => handleSaveEditCategory(cat.id)}
                          disabled={isSubmitting || !editingCatName.trim()}
                          className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-md hover:bg-primary-hover transition-colors"
                        >
                          Simpan
                        </button>
                        <button
                          onClick={() => {
                            setEditingCatId(null);
                            setEditingCatName('');
                          }}
                          className="px-3 py-1.5 bg-background border border-border-custom text-text-secondary text-xs font-semibold rounded-md hover:bg-border-custom/50 transition-colors"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="font-semibold text-text-primary">{cat.name}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingCatId(cat.id);
                              setEditingCatName(cat.name);
                            }}
                            className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                            title="Edit Kategori"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
                            className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                            title="Hapus Kategori"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
