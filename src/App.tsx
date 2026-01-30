import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from './firebase'; 
// 1. NUEVO: Agregamos 'onSnapshot' para escuchar cambios en vivo
import { collection, doc, setDoc, updateDoc, deleteDoc, getDocs, writeBatch, onSnapshot } from 'firebase/firestore';

import { 
  Package, LogOut, Factory, AlertCircle, BrainCircuit, Loader2, 
  ArrowRight, Layers, Globe, Save, Plus, Trash2, CheckCircle, Truck, X, 
  Download, FileUp, Edit2, Search, Printer, Hammer, FileSpreadsheet, CloudUpload, Maximize, Minimize, UploadCloud, RefreshCw
} from 'lucide-react';
import { 
  ViewType, Product, RawMaterial, Recipe, ProductionOrder, Movement, UserProfile 
} from './types';
import { TABS, INITIAL_CATALOG } from './constants';
import { Card, Button, Input, Badge, SectionHeader } from './components/UI';
import { getAIInventoryAdvice } from './services/geminiService';

const K = {
  STABLE: 'mb_data_v9_stable_final'
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ViewType>(ViewType.DASHBOARD);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tempName, setTempName] = useState('');
  
  const [isOnline, setIsOnline] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
   
  const [products, setProducts] = useState<Product[]>([]);
  const [mps, setMps] = useState<RawMaterial[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [history, setHistory] = useState<Movement[]>([]);
   
  const [loading, setLoading] = useState(true);
  const [aiAdvice, setAiAdvice] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddMp, setShowAddMp] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMpQuery, setSearchMpQuery] = useState('');

  // --- LÓGICA DE SINCRONIZACIÓN ---

  // 1. Carga inicial (Offline First)
  useEffect(() => {
    const saved = localStorage.getItem(K.STABLE);
    if (saved) {
      try {
        const d = JSON.parse(saved);
        setProducts(d.products || []);
        setMps(d.mps || []);
        setRecipes(d.recipes || []);
        setOrders(d.orders || []);
        setHistory(d.history || []);
        if (d.user) setUser(d.user);
      } catch (e) { console.error("Error cargando caché local", e); }
    } else {
        // Carga datos iniciales si es la primera vez absoluta
        const initialProducts = INITIAL_CATALOG.map((p, i) => ({ ...p, id: `p-${Date.now()}-${i}`, wip: 0 }));
        setProducts(initialProducts);
    }
    setLoading(false);
  }, []);

  // 2. ESCUCHAS EN TIEMPO REAL (La Magia de Firebase)
  useEffect(() => {
    // Si no estamos logueados, no escuchamos
    if (!user) return;

    console.log("📡 Iniciando conexión en tiempo real...");
    
    // Escuchar colección 'products'
    const unsubProd = onSnapshot(collection(db, "products"), (snapshot) => {
        setIsOnline(true); // Si recibimos datos, estamos online
        const data = snapshot.docs.map(doc => doc.data() as Product);
        // Solo actualizamos si hay datos (para evitar borrar todo por error de conexión)
        if (data.length > 0) setProducts(data);
    }, (error) => {
        console.log("Modo Offline (Productos):", error);
        setIsOnline(false);
    });

    // Escuchar colección 'mps'
    const unsubMps = onSnapshot(collection(db, "mps"), (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data() as RawMaterial);
        if (data.length > 0) setMps(data);
    });

    // Escuchar 'orders'
    const unsubOrders = onSnapshot(collection(db, "orders"), (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data() as ProductionOrder);
        // Ordenar por fecha (más nuevo arriba) si vienen desordenados
        setOrders(data.sort((a,b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()));
    });

     // Escuchar 'recipes'
     const unsubRecipes = onSnapshot(collection(db, "recipes"), (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data() as Recipe);
        if (data.length > 0) setRecipes(data);
    });

     // Escuchar 'history' (últimos 100)
     const unsubHistory = onSnapshot(collection(db, "history"), (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data() as Movement);
        setHistory(data.sort((a,b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()).slice(0, 100));
    });

    return () => {
        // Limpieza al cerrar componente
        unsubProd(); unsubMps(); unsubOrders(); unsubRecipes(); unsubHistory();
    };
  }, [user]); // Se reinicia solo si cambia el usuario

  // 3. Persistencia Local (Backup automático al recibir cambios de la nube o locales)
  useEffect(() => {
    if (!loading && user) {
      const dataToSave = { products, mps, recipes, orders, history, user };
      localStorage.setItem(K.STABLE, JSON.stringify(dataToSave));
    }
  }, [products, mps, recipes, orders, history, user, loading]);

  const forceSave = useCallback(() => {
    const dataToSave = { products, mps, recipes, orders, history, user };
    localStorage.setItem(K.STABLE, JSON.stringify(dataToSave));
    console.log("💾 Guardado manual ejecutado");
  }, [products, mps, recipes, orders, history, user]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.error(err));
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // --- CRUD OPERATIONS (Escriben en Firebase, el listener actualiza el estado local) ---

  const logMovement = useCallback(async (tipo: string, detalle: string) => {
    const newMov = { id: Math.random().toString(36).substr(2, 9), ts: new Date().toISOString(), tipo, detalle, user: user?.name || 'Sistema' };
    // Optimistic UI update (actualiza visualmente ya, por si el internet es lento)
    setHistory(prev => [newMov, ...prev].slice(0, 100));
    try { await setDoc(doc(db, 'history', newMov.id), newMov); } catch (e) { console.error(e); }
  }, [user]);

  const handleUpdateProductField = async (id: string, field: keyof Product, value: any) => {
    // Optimistic update
    setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    try {
        const ref = doc(db, 'products', id);
        await updateDoc(ref, { [field]: value });
    } catch (e) { console.error(e); }
  };

  const handleUpdateMpField = async (id: string, field: keyof RawMaterial, value: any) => {
    setMps(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
    try {
        const ref = doc(db, 'mps', id);
        await updateDoc(ref, { [field]: value });
    } catch (e) { console.error(e); }
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('¿Eliminar SKU?')) {
      setProducts(prev => prev.filter(p => p.id !== id));
      deleteDoc(doc(db, 'products', id)).catch(e => console.error(e));
    }
  };

  const handleDeleteMp = (id: string) => {
    if (confirm('¿Eliminar insumo?')) {
      setMps(prev => prev.filter(m => m.id !== id));
      deleteDoc(doc(db, 'mps', id)).catch(e => console.error(e));
    }
  };

  const handleMpEntry = async (id: string, qty: number) => {
    const mp = mps.find(m => m.id === id);
    if (!mp) return;
    const newStock = (mp.stock || 0) + qty;
    await handleUpdateMpField(id, 'stock', newStock);
    logMovement('INGRESO_MP', `+${qty}u de ${mp.desc || mp.sku}`);
  };

  const handleProductDispatch = async (id: string, qty: number, extra?: { cliente?: string, remito?: string, fecha?: string }) => {
    const p = products.find(x => x.id === id);
    if (!p) return;
    if (p.stock < qty) { alert('Stock insuficiente'); return; }
    const newStock = p.stock - qty;
    await handleUpdateProductField(id, 'stock', newStock);
    logMovement('DESPACHO', `-${qty}u de ${p.sku} | Cliente: ${extra?.cliente || 'N/A'}`);
  };

  const handleStartProduction = async (targetId: string, targetType: 'product' | 'mp', qty: number) => {
    const target = targetType === 'product' ? products.find(p => p.id === targetId) : mps.find(m => m.id === targetId);
    if (!target) return;

    const productRecipes = recipes.filter(r => r.targetId === targetId && r.targetType === targetType);
    const missing: string[] = [];
    
    productRecipes.forEach(r => {
      const mp = mps.find(m => m.id === r.mpId);
      const req = r.qty * qty;
      if (!mp || mp.stock < req) missing.push(`${mp?.desc || mp?.sku} (Falta: ${req - (mp?.stock || 0)}u)`);
    });

    if (missing.length > 0) {
      alert(`⚠️ PRODUCCIÓN BLOQUEADA\n\nFaltan componentes:\n${missing.join('\n')}`);
      return; 
    }

    // Descontar MP (Optimistic)
    const updatedMps = mps.map(m => {
      const recipeItem = productRecipes.find(r => r.mpId === m.id);
      if (recipeItem) return { ...m, stock: m.stock - (recipeItem.qty * qty) };
      return m;
    });
    setMps(updatedMps);

    // Actualizar MPs en Firebase
    updatedMps.forEach(async (m) => {
        const original = mps.find(orig => orig.id === m.id);
        if (original && original.stock !== m.stock) {
            await updateDoc(doc(db, 'mps', m.id), { stock: m.stock });
        }
    });

    const newOrder: ProductionOrder = { 
      id: Math.random().toString(36).substr(2, 9), targetId, targetType, productName: target.sku, qty, 
      status: 'in_progress', startedAt: new Date().toISOString(), startedBy: user?.name || 'Sistema' 
    };
    
    setOrders(prev => [newOrder, ...prev]);
    
    if (targetType === 'product') await handleUpdateProductField(targetId, 'wip', (target.wip || 0) + qty);
    else await handleUpdateMpField(targetId, 'wip', ((target as RawMaterial).wip || 0) + qty);

    logMovement('PRODUCCION_INICIO', `${qty}u de ${target.sku}`);
    setDoc(doc(db, 'orders', newOrder.id), newOrder).catch(e => console.error(e));
  };

  const handleCompleteOrder = async (order: ProductionOrder) => {
    if (order.targetType === 'product') {
      const prod = products.find(p => p.id === order.targetId);
      if (prod) {
        await handleUpdateProductField(prod.id, 'stock', (prod.stock || 0) + order.qty);
        await handleUpdateProductField(prod.id, 'wip', Math.max(0, (prod.wip || 0) - order.qty));
      }
    } else {
      const mp = mps.find(m => m.id === order.targetId);
      if (mp) {
        await handleUpdateMpField(mp.id, 'stock', (mp.stock || 0) + order.qty);
        await handleUpdateMpField(mp.id, 'wip', Math.max(0, (mp.wip || 0) - order.qty));
      }
    }
    setOrders(prev => prev.filter(o => o.id !== order.id));
    logMovement('PRODUCCION_FIN', `${order.qty}u ${order.productName}`);
    deleteDoc(doc(db, 'orders', order.id)).catch(e => console.error(e));
  };

  const handleAddRecipeItem = (targetId: string, targetType: 'product' | 'mp', mpId: string, qty: number) => {
    const newRecipe: Recipe = { id: Math.random().toString(36).substr(2, 9), targetId, targetType, mpId, qty };
    setRecipes(prev => [...prev, newRecipe]);
    setDoc(doc(db, 'recipes', newRecipe.id), newRecipe).catch(e => console.error(e));
  };

  const handleDeleteRecipeItem = (id: string) => {
    setRecipes(prev => prev.filter(r => r.id !== id));
    deleteDoc(doc(db, 'recipes', id)).catch(e => console.error(e));
  };

  const exportToCsv = () => {
    const headers = "Tipo,SKU,Marca,Modelo,Lado,Stock,Minimo,En Taller\n";
    const pRows = products.map(p => `Espejo,${p.sku},${p.marca},${p.modelo},${p.lado},${p.stock},${p.min},${p.wip}`).join("\n");
    const mRows = mps.map(m => `Insumo,${m.sku},${m.desc},,,${m.stock},${m.min},${m.wip || 0}`).join("\n");
    const blob = new Blob([headers + pRows + "\n" + mRows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `merlobus_excel_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  // RESTAURAR BACKUP JSON
  const handleJsonRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);
        
        if (!data.products && !data.mps) {
            alert("El archivo no parece ser un backup válido.");
            return;
        }

        if (confirm(`¿Restaurar?\n- ${data.products?.length || 0} Productos\n- ${data.mps?.length || 0} Insumos`)) {
            // Subida masiva a Firebase para que todos se enteren
            setLoading(true);
            const uploadCollection = async (colName: string, items: any[]) => {
                const batch = writeBatch(db);
                items.forEach((item) => {
                    const ref = doc(db, colName, item.id);
                    batch.set(ref, item);
                });
                await batch.commit();
            };

            await uploadCollection('products', data.products || []);
            await uploadCollection('mps', data.mps || []);
            await uploadCollection('recipes', data.recipes || []);
            setLoading(false);
            alert("Datos restaurados y sincronizados a la nube.");
        }
      } catch (error) {
        console.error(error);
        alert("Error al leer JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'products' | 'mps') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim() !== '');
      if (lines.length < 2) return;
      const newItems: any[] = [];
      lines.slice(1).forEach(row => {
        const v = row.split(',').map(s => s.trim());
        if (type === 'products') {
          newItems.push({ id: `p-${Date.now()}-${Math.random()}`, sku: v[0] || 'N/A', marca: v[1] || '', modelo: v[2] || '', lado: v[3] || '', min: parseInt(v[4]) || 5, stock: parseInt(v[5]) || 0, wip: 0 });
        } else {
          newItems.push({ id: `mp-${Date.now()}-${Math.random()}`, sku: v[0] || 'N/A', desc: v[1] || 'Insumo', min: parseInt(v[2]) || 10, stock: parseInt(v[3]) || 0, pending: 0, wip: 0 });
        }
      });
      
      // Subir cada uno a Firebase
      newItems.forEach(item => {
          setDoc(doc(db, type, item.id), item).catch(console.error);
      });
      logMovement('CARGA_MASIVA', `${newItems.length} registros en ${type}`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const syncToCloud = async () => {
    if (!isOnline) { alert("Sin conexión."); return; }
    if (!confirm("Esto sobrescribirá la nube con tus datos locales. ¿Seguro?")) return;
    
    try {
      setLoading(true);
      const uploadCollection = async (colName: string, items: any[]) => {
        const batchSize = 400; 
        for (let i = 0; i < items.length; i += batchSize) {
            const chunk = items.slice(i, i + batchSize);
            const batch = writeBatch(db);
            chunk.forEach((item) => {
                const ref = doc(db, colName, item.id);
                batch.set(ref, item);
            });
            await batch.commit();
        }
      };

      await uploadCollection('products', products);
      await uploadCollection('mps', mps);
      await uploadCollection('recipes', recipes);
      
      alert("✅ Sincronización Forzada completada.");
    } catch (e) {
      console.error(e);
      alert("Error: " + e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm p-10 bg-white rounded-[3rem] shadow-2xl">
          <div className="text-center mb-8">
            <div className="bg-[#2B3860] w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-4 text-white"><Package size={40} /></div>
            <h1 className="text-3xl font-black text-[#2B3860]">Merlobus v9</h1>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (tempName.trim()) setUser({ name: tempName, role: 'admin' }); }} className="space-y-4">
            <Input autoFocus placeholder="Nombre de Operario" value={tempName} onChange={e => setTempName(e.target.value)} />
            <Button type="submit" className="w-full py-4 rounded-2xl" icon={ArrowRight}>Acceder</Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <header className="h-16 md:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shadow-sm no-print">
        <div className="flex items-center gap-2 md:gap-4">
          <div className="bg-[#2B3860] p-2 rounded-xl text-white"><Package size={20} /></div>
          <span className="font-black text-lg md:text-xl text-[#2B3860] uppercase tracking-tighter truncate">MERLOBUS PRO</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleFullscreen} className="hidden md:block p-2 text-slate-400 hover:text-[#2B3860] transition-colors rounded-lg hover:bg-slate-50">
            {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
          </button>
          <Badge type={isOnline ? 'ok' : 'warn'} text={isOnline ? 'ONLINE' : 'OFFLINE'} />
          <button onClick={() => { setUser(null); }} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><LogOut size={24}/></button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden no-print">
        <aside className="w-16 lg:w-64 bg-white border-r p-2 lg:p-4 flex flex-col gap-2 shadow-sm overflow-y-auto z-10">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as ViewType)} className={`flex items-center justify-center lg:justify-start gap-4 p-3 lg:p-4 rounded-2xl transition-all ${activeTab === tab.id ? 'bg-[#2B3860] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
              <tab.icon size={22} />
              <span className="hidden lg:block font-bold text-sm">{tab.label}</span>
            </button>
          ))}
        </aside>

        <main className="flex-1 overflow-y-auto p-2 md:p-6 lg:p-10 custom-scrollbar">
          {activeTab === ViewType.DASHBOARD && (
            <div className="space-y-4 md:space-y-8">
              <SectionHeader title="Panel Principal" subtitle={`Operario: ${user.name}`} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                <StatCard title="Total Espejos" value={products.reduce((a, b) => a + b.stock, 0)} icon={Package} color="blue" />
                <StatCard title="En Taller" value={products.reduce((a, b) => a + (b.wip || 0), 0) + mps.reduce((a, b) => a + (b.wip || 0), 0)} icon={Hammer} color="blue" />
                <StatCard title="Insumos" value={mps.reduce((a, b) => a + b.stock, 0)} icon={Layers} color="blue" />
                <StatCard title="Alertas" value={products.filter(p => p.stock < p.min).length + mps.filter(m => m.stock < m.min).length} icon={AlertCircle} color="red" />
              </div>
              <Card className="p-4 md:p-8 bg-indigo-50 border-indigo-200">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-6 gap-4">
                  <h3 className="font-black text-indigo-900 flex items-center gap-3"><BrainCircuit size={24} /> Asesor de Planta</h3>
                  <Button onClick={() => { setIsAiLoading(true); getAIInventoryAdvice(products, mps).then(setAiAdvice).finally(()=>setIsAiLoading(false)) }} disabled={isAiLoading} variant="special">
                    {isAiLoading ? 'Pensando...' : 'Consultar AI'}
                  </Button>
                </div>
                {aiAdvice.length > 0 && (
                  <ul className="space-y-3">
                    {aiAdvice.map((a, i) => <li key={i} className="text-xs md:text-sm text-indigo-700 bg-white/60 p-4 rounded-2xl border border-indigo-200 font-bold">• {a}</li>)}
                  </ul>
                )}
              </Card>
            </div>
          )}

          {activeTab === ViewType.PLANNING && <PlanningView products={products} mps={mps} recipes={recipes} />}

          {activeTab === ViewType.OPERATIONS && (
            <OperationsManager 
              products={products} mps={mps} recipes={recipes} orders={orders} 
              onStartOrder={handleStartProduction} onCompleteOrder={handleCompleteOrder} onMpEntry={handleMpEntry}
            />
          )}

          {activeTab === ViewType.RECIPES && (
            <RecipeManager products={products} mps={mps} recipes={recipes} onAddRecipeItem={handleAddRecipeItem} onDeleteRecipeItem={handleDeleteRecipeItem} onForceSave={forceSave} />
          )}

          {activeTab === ViewType.RAW_MATERIALS && (
            <div className="space-y-4 md:space-y-8">
              <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <SectionHeader title="Insumos" />
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2">
                   <Button onClick={handlePrint} variant="secondary" icon={Printer}>Imprimir</Button>
                   <Button onClick={exportToCsv} variant="secondary" icon={FileSpreadsheet}>Excel</Button>
                   <Button onClick={() => setShowAddMp(true)} icon={Plus}>Añadir</Button>
                </div>
              </div>

              <div className="relative max-w-sm"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><Input placeholder="Filtrar..." className="pl-12 py-3" value={searchMpQuery} onChange={e => setSearchMpQuery(e.target.value)} /></div>
              {showAddMp && (
                <Card className="p-4 md:p-8 bg-emerald-50 border-emerald-200 animate-in slide-in-from-top-2">
                  <div className="flex justify-between items-center mb-6"><h3 className="font-bold">Nuevo Insumo</h3><button onClick={()=>setShowAddMp(false)}><X/></button></div>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const newMp: RawMaterial = { 
                      id: `mp-${Date.now()}`, 
                      sku: fd.get('sku') as string, 
                      desc: fd.get('desc') as string, 
                      min: Number(fd.get('min')), 
                      stock: Number(fd.get('stock')), 
                      pending: 0, wip: 0 
                    };
                    setDoc(doc(db, 'mps', newMp.id), newMp).catch(e => console.error(e));
                    setShowAddMp(false);
                    alert("Insumo guardado.");
                  }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Input name="sku" placeholder="Código" required />
                    <Input name="desc" placeholder="Descripción" required />
                    <Input name="min" type="number" defaultValue="10" placeholder="Min" />
                    <Input name="stock" type="number" defaultValue="0" placeholder="Stock" />
                    <Button type="submit" variant="success" className="col-span-full py-4 font-bold">GUARDAR</Button>
                  </form>
                </Card>
              )}
              <InventoryTable data={mps.filter(m => m.desc.toLowerCase().includes(searchMpQuery.toLowerCase()) || m.sku.toLowerCase().includes(searchMpQuery.toLowerCase()))} type="mps" onUpdateField={handleUpdateMpField} onDelete={handleDeleteMp} onAction={handleMpEntry} />
            </div>
          )}

          {activeTab === ViewType.PRODUCTS && (
            <div className="space-y-4 md:space-y-8">
               <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <SectionHeader title="Productos Finales" />
                 <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2">
                   <Button onClick={handlePrint} variant="secondary" icon={Printer}>Print</Button>
                   <Button onClick={exportToCsv} variant="secondary" icon={FileSpreadsheet}>Excel</Button>
                   <label className="flex items-center gap-2 cursor-pointer bg-slate-100 px-4 py-2 rounded-xl hover:bg-slate-200 transition-all font-bold text-xs whitespace-nowrap">
                      <FileUp size={16} /> CSV
                      <input type="file" accept=".csv" className="hidden" onChange={(e) => handleCsvUpload(e, 'products')} />
                    </label>
                   <Button onClick={() => setShowAddProduct(true)} icon={Plus}>Nuevo</Button>
                 </div>
               </div>
               
               <div className="relative max-w-sm"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><Input placeholder="Buscar..." className="pl-12 py-3" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
              {showAddProduct && (
                  <Card className="p-4 md:p-8 bg-blue-50 border-blue-200">
                  <div className="flex justify-between items-center mb-6"><h3 className="font-bold">Nuevo SKU</h3><button onClick={()=>setShowAddProduct(false)}><X/></button></div>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const newProd: Product = { 
                      id: `p-${Date.now()}`, 
                      sku: fd.get('sku') as string, 
                      marca: fd.get('marca') as string, 
                      modelo: fd.get('modelo') as string, 
                      lado: fd.get('lado') as string, 
                      min: Number(fd.get('min')), 
                      stock: Number(fd.get('stock')), 
                      wip: 0 
                    };
                    setDoc(doc(db, 'products', newProd.id), newProd).catch(e => console.error(e));
                    setShowAddProduct(false);
                    alert("Producto guardado.");
                  }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Input name="sku" placeholder="SKU" required />
                    <Input name="marca" placeholder="Marca" required />
                    <Input name="modelo" placeholder="Modelo" required />
                    <Input name="lado" placeholder="Lado" required />
                    <Input name="min" type="number" defaultValue="5" />
                    <Input name="stock" type="number" defaultValue="0" />
                    <Button type="submit" className="col-span-full py-4 font-bold">GUARDAR SKU</Button>
                  </form>
                </Card>
              )}
              <InventoryTable data={products.filter(p => p.sku.toLowerCase().includes(searchQuery.toLowerCase()) || p.marca.toLowerCase().includes(searchQuery.toLowerCase()))} type="products" onUpdateField={handleUpdateProductField} onDelete={handleDeleteProduct} onAction={handleProductDispatch} />
            </div>
          )}

          {activeTab === ViewType.REPORTS && (
            <div className="max-w-2xl mx-auto py-10">
              <Card className="p-8 md:p-12 text-center space-y-8 bg-white shadow-2xl rounded-[2rem] md:rounded-[3rem]">
                <Globe size={80} className={`mx-auto ${isOnline ? 'text-emerald-500' : 'text-slate-300'}`} />
                <h3 className="text-2xl md:text-3xl font-black text-slate-800">{isOnline ? 'Sincronización en Vivo ACTIVA' : 'Modo Offline'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="secondary" onClick={handlePrint} className="py-6" icon={Printer}>Imprimir PDF</Button>
                  <Button variant="secondary" onClick={exportToCsv} className="py-6" icon={FileSpreadsheet}>Exportar Excel</Button>
                  
                  <label className="col-span-full py-6 flex items-center justify-center gap-2 cursor-pointer bg-orange-50 text-orange-600 border border-orange-200 px-4 rounded-xl hover:bg-orange-100 transition-all font-black text-sm uppercase">
                      <UploadCloud size={20} /> Restaurar Backup JSON
                      <input type="file" accept=".json" className="hidden" onChange={handleJsonRestore} />
                  </label>

                  <Button variant="special" onClick={syncToCloud} className="col-span-full py-6" icon={RefreshCw}>Forzar Resincronización</Button>
                </div>
              </Card>
            </div>
          )}

          {activeTab === ViewType.HISTORY && (
            <div className="space-y-6">
              <SectionHeader title="Auditoría" />
              <Card className="overflow-hidden shadow-lg overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                  <thead className="bg-slate-800 text-white text-[10px] uppercase font-black">
                    <tr><th className="p-3 md:p-5">FECHA</th><th className="p-3 md:p-5">TIPO</th><th className="p-3 md:p-5">DETALLE</th><th className="p-3 md:p-5 text-right">USUARIO</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map(h => (
                      <tr key={h.id} className="text-xs md:text-sm hover:bg-slate-50 transition-colors">
                        <td className="p-3 md:p-5 text-slate-400 font-mono">{new Date(h.ts).toLocaleString()}</td>
                        <td className="p-3 md:p-5"><span className="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg uppercase text-[10px]">{h.tipo}</span></td>
                        <td className="p-3 md:p-5 text-slate-600 font-medium">{h.detalle}</td>
                        <td className="p-3 md:p-5 text-right uppercase text-slate-400 font-black">{h.user}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

// ... COMPONENTES AUXILIARES (StatCard, InventoryTable, RecipeManager, etc.) SE MANTIENEN IGUAL ...
// Para ahorrar espacio aquí, asumo que mantienes el código de los componentes de abajo
// (InventoryTable, RecipeManager, OperationsManager, PlanningView, StatCard).
// Solo copia y pega los componentes de abajo del código anterior si los borraste.

const StatCard = ({ title, value, icon: Icon, color }: any) => {
  const colors: any = { blue: "bg-blue-50 text-blue-600", red: "bg-red-50 text-red-600" };
  return (
    <Card className="p-3 md:p-6 flex flex-col md:flex-row items-center md:items-start gap-2 md:gap-5 hover:shadow-md transition-shadow text-center md:text-left">
      <div className={`p-3 rounded-2xl ${colors[color]}`}><Icon size={20} className="md:w-7 md:h-7" /></div>
      <div><p className="text-slate-400 text-[8px] md:text-[10px] font-black uppercase tracking-widest">{title}</p><p className="text-xl md:text-3xl font-black text-[#2B3860]">{value}</p></div>
    </Card>
  );
};

const InventoryTable = ({ data, type, onUpdateField, onDelete, onAction }: any) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [qtyInput, setQtyInput] = useState<number>(1);
  const [cliente, setCliente] = useState('');

  return (
    <Card className="overflow-hidden shadow-lg border-none overflow-x-auto">
      <table className="w-full text-left min-w-[800px] md:min-w-0">
        <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
          <tr>
            <th className="p-2 md:p-5 w-10">#</th>
            <th className="p-2 md:p-5">CÓDIGO</th>
            {type === 'products' ? (
              <>
                <th className="p-2 md:p-5">MARCA</th>
                <th className="p-2 md:p-5">MODELO</th>
                <th className="p-2 md:p-5">LADO</th>
              </>
            ) : (
              <th className="p-2 md:p-5">DESCRIPCIÓN</th>
            )}
            <th className="p-2 md:p-5 text-center">MÍN</th>
            <th className="p-2 md:p-5 text-center">STOCK</th>
            <th className="p-2 md:p-5 text-center">TALLER</th>
            <th className="p-2 md:p-5 text-right no-print w-32">ACCIONES</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((item: any, index: number) => {
            const isEditing = editingId === item.id;
            const isActionActive = activeActionId === item.id;
            const isLow = item.stock < item.min;
            return (
              <React.Fragment key={item.id}>
                <tr className={`hover:bg-slate-50 transition-all text-xs md:text-sm ${isEditing ? 'bg-blue-50/30' : ''}`}>
                  <td className="p-2 md:p-5 text-slate-400 font-mono">{index + 1}</td>
                  <td className="p-2 md:p-5 font-black text-slate-700">{isEditing ? <Input value={item.sku} onChange={e => onUpdateField(item.id, 'sku', e.target.value)} /> : item.sku}</td>
                  
                  {type === 'products' ? (
                    <>
                      <td className="p-2 md:p-5 text-slate-500 font-medium">{isEditing ? <Input value={item.marca} onChange={e => onUpdateField(item.id, 'marca', e.target.value)} /> : item.marca}</td>
                      <td className="p-2 md:p-5 text-slate-500 font-medium">{isEditing ? <Input value={item.modelo} onChange={e => onUpdateField(item.id, 'modelo', e.target.value)} /> : item.modelo}</td>
                      <td className="p-2 md:p-5 text-slate-500 font-medium">{isEditing ? <Input value={item.lado} onChange={e => onUpdateField(item.id, 'lado', e.target.value)} /> : item.lado}</td>
                    </>
                  ) : (
                    <td className="p-2 md:p-5 text-slate-500 font-medium">{isEditing ? <Input value={item.desc} onChange={e => onUpdateField(item.id, 'desc', e.target.value)} /> : item.desc}</td>
                  )}

                  <td className="p-2 md:p-5 text-center"><Input type="number" className="w-16 md:w-20 mx-auto text-center font-bold" value={item.min} onChange={e => onUpdateField(item.id, 'min', parseInt(e.target.value) || 0)} /></td>
                  <td className="p-2 md:p-5 text-center"><Input type="number" className={`w-16 md:w-24 mx-auto text-center font-black ${isLow ? 'text-red-600 bg-red-50' : 'text-emerald-600'}`} value={item.stock} onChange={e => onUpdateField(item.id, 'stock', parseInt(e.target.value) || 0)} /></td>
                  <td className="p-2 md:p-5 text-center font-black text-blue-600">{item.wip || 0}</td>
                  <td className="p-2 md:p-5 text-right flex justify-end gap-1 md:gap-2 no-print">
                    <button onClick={() => { setActiveActionId(isActionActive ? null : item.id); setQtyInput(1); setCliente(''); }} className={`p-2 rounded-xl transition-all ${isActionActive ? 'bg-emerald-600 text-white shadow-md' : 'text-emerald-600 hover:bg-emerald-50'}`} title="Mover"><Truck size={16}/></button>
                    <button onClick={() => setEditingId(isEditing ? null : item.id)} className={`p-2 rounded-xl transition-all ${isEditing ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-100'}`} title="Editar">{isEditing ? <CheckCircle size={16}/> : <Edit2 size={16}/>}</button>
                    <button onClick={() => onDelete(item.id)} className="p-2 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-xl" title="Eliminar"><Trash2 size={16}/></button>
                  </td>
                </tr>
                {isActionActive && (
                  <tr className="bg-slate-50/80 animate-in slide-in-from-top-1 border-b">
                    <td colSpan={type === 'products' ? 9 : 7} className="p-4 md:p-6">
                      <div className="flex flex-wrap items-end gap-3 md:gap-6">
                        <div className="flex-none"><label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Cantidad</label><Input type="number" className="w-24 font-black h-12 text-lg" value={qtyInput} onChange={e => setQtyInput(Number(e.target.value))} /></div>
                        {type === 'products' && <div className="flex-1 min-w-[150px]"><label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Nota</label><Input placeholder="Cliente..." value={cliente} onChange={e => setCliente(e.target.value)} /></div>}
                        <div className="flex gap-2">
                          <Button variant="success" className="h-12 px-4 md:px-8 font-black" onClick={() => { onAction(item.id, qtyInput, type === 'products' ? { cliente } : undefined); setActiveActionId(null); }}>PROCESAR</Button>
                          <Button variant="secondary" className="h-12" onClick={() => setActiveActionId(null)}>X</Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
};

const RecipeManager = ({ products, mps, recipes, onAddRecipeItem, onDeleteRecipeItem, onForceSave }: any) => {
  const [targetType, setTargetType] = useState<'product' | 'mp'>('product');
  const [selId, setSelId] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [selMpId, setSelMpId] = useState('');
  const [qty, setQty] = useState(1);
  const currentRecipes = recipes.filter((r: any) => r.targetId === selId && r.targetType === targetType);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in">
      <Card className="p-4 md:p-8 h-fit space-y-6 shadow-xl">
        <h3 className="font-black text-xl">Configuración</h3>
        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Define componentes</p>
        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
          <button onClick={() => {setTargetType('product'); setSelId('');}} className={`flex-1 p-3 rounded-xl text-[10px] font-black uppercase transition-all ${targetType === 'product' ? 'bg-[#2B3860] text-white shadow-md' : 'text-slate-400'}`}>FINAL</button>
          <button onClick={() => {setTargetType('mp'); setSelId('');}} className={`flex-1 p-3 rounded-xl text-[10px] font-black uppercase transition-all ${targetType === 'mp' ? 'bg-[#2B3860] text-white shadow-md' : 'text-slate-400'}`}>SEMI</button>
        </div>
        <select className="w-full p-4 border-2 rounded-2xl font-black bg-slate-50 outline-none focus:ring-4 focus:ring-blue-100" value={selId} onChange={e=>setSelId(e.target.value)}>
          <option value="">-- Seleccionar Item --</option>
          {targetType === 'product' ? products.map((p:any) => <option key={p.id} value={p.id}>{p.sku}</option>) : mps.map((m:any) => <option key={m.id} value={m.id}>{m.desc || m.sku}</option>)}
        </select>
        
        {selId && (
          <Button onClick={() => { onForceSave(); alert("✅ Receta asegurada."); }} variant="special" className="w-full py-4 rounded-xl" icon={Save}>
            Guardar Cambios
          </Button>
        )}
      </Card>
      <Card className="md:col-span-2 p-4 md:p-10 min-h-[500px] shadow-2xl relative bg-white">
        <div className="flex justify-between items-center mb-8">
          <h3 className="font-black text-lg md:text-2xl text-slate-800">Composición</h3>
          <Button variant="secondary" size="lg" icon={Plus} disabled={!selId} onClick={() => setShowAdd(!showAdd)}>{showAdd ? 'Cerrar' : 'Añadir'}</Button>
        </div>
        {showAdd && (
          <div className="bg-blue-50 p-6 rounded-3xl mb-8 grid grid-cols-1 md:grid-cols-3 gap-4 border-2 border-blue-100 animate-in slide-in-from-top-4">
            <select className="md:col-span-2 p-4 border-2 rounded-2xl bg-white font-black" value={selMpId} onChange={e=>setSelMpId(e.target.value)}>
               <option value="">-- Componente --</option>
               {mps.map((m:any) => m.id !== selId && <option key={m.id} value={m.id}>{m.desc || m.sku}</option>)}
            </select>
            <Input type="number" step="0.01" value={qty} onChange={e=>setQty(Number(e.target.value))} className="text-center font-black h-14 text-xl" />
            <Button className="col-span-full py-5 rounded-2xl text-lg font-black" variant="success" onClick={() => { if(selMpId && qty > 0) { onAddRecipeItem(selId, targetType, selMpId, qty); setShowAdd(false); setSelMpId(''); setQty(1); } }}>VINCULAR</Button>
          </div>
        )}
        <div className="space-y-3">
          {currentRecipes.map((r:any) => (
            <div key={r.id} className="p-5 border-2 rounded-2xl flex justify-between items-center bg-white hover:border-blue-300 transition-all shadow-sm">
              <span className="font-black text-slate-700 text-sm md:text-lg">{mps.find((m:any)=>m.id === r.mpId)?.desc || mps.find((m:any)=>m.id === r.mpId)?.sku || 'Componente'}</span>
              <div className="flex items-center gap-4 md:gap-8">
                <span className="font-black text-blue-700 text-xl md:text-2xl">{r.qty} u.</span>
                <button onClick={() => onDeleteRecipeItem(r.id)} className="text-slate-300 hover:text-red-500 transition-colors" title="Quitar"><Trash2 size={20}/></button>
              </div>
            </div>
          ))}
          {!selId && <div className="h-full flex flex-col items-center justify-center text-slate-200 py-20"><p className="text-xl font-bold text-center">Selecciona un item</p></div>}
        </div>
      </Card>
    </div>
  );
};

const OperationsManager = ({ products, mps, recipes, orders, onStartOrder, onCompleteOrder, onMpEntry }: any) => {
  const [mode, setMode] = useState<'product' | 'mp'>('product');
  const [selId, setSelId] = useState('');
  const [qty, setQty] = useState(1);
  const [selMpEntry, setSelMpEntry] = useState('');
  const [qtyMpEntry, setQtyMpEntry] = useState(1);

  const previewReqs = useMemo(() => {
    if (!selId) return [];
    return recipes.filter((r:any) => r.targetId === selId && r.targetType === mode).map((r:any) => {
      const mp = mps.find((m:any)=>m.id === r.mpId);
      const needed = r.qty * qty;
      return { name: mp?.desc || mp?.sku, stock: mp?.stock || 0, needed, ok: (mp?.stock || 0) >= needed };
    });
  }, [selId, qty, recipes, mps, mode]);

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <Card className="p-6 md:p-10 space-y-6 shadow-2xl border-t-[10px] border-[#2B3860] bg-white rounded-[2rem] md:rounded-[3rem]">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-xl md:text-2xl uppercase tracking-tighter">Plan de Fabricación</h3>
            <div className="flex bg-slate-100 p-1.5 rounded-2xl">
              <button onClick={()=>setMode('product')} className={`px-3 md:px-5 py-2 text-[10px] font-black rounded-xl transition-all ${mode==='product' ? 'bg-white shadow-md text-[#2B3860]':'text-slate-400'}`}>PROD</button>
              <button onClick={()=>setMode('mp')} className={`px-3 md:px-5 py-2 text-[10px] font-black rounded-xl transition-all ${mode==='mp' ? 'bg-white shadow-md text-[#2B3860]':'text-slate-400'}`}>SEMI</button>
            </div>
          </div>
          <select className="w-full p-5 border-2 rounded-[2rem] font-black bg-slate-50 text-lg md:text-xl outline-none focus:ring-4 focus:ring-blue-100" value={selId} onChange={e=>setSelId(e.target.value)}>
            <option value="">-- Seleccionar Item --</option>
            {mode==='product' ? products.map((p:any)=><option key={p.id} value={p.id}>{p.sku}</option>) : mps.map((m:any)=> recipes.some((r:any)=>r.targetId===m.id && r.targetType==='mp') && <option key={m.id} value={m.id}>{m.desc || m.sku}</option>)}
          </select>
          <Input type="number" min="1" value={qty} onChange={e=>setQty(Number(e.target.value))} className="text-4xl font-black h-24 text-center border-2 rounded-[2rem]" />
          
          {selId && (
            <div className="bg-slate-50 p-6 rounded-3xl space-y-3 border shadow-inner">
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Disponibilidad</p>
               {previewReqs.map((req:any, i:number) => (
                 <div key={i} className="flex justify-between text-sm items-center border-b border-slate-200 pb-2">
                    <span className={`font-black ${req.ok ? 'text-slate-600' : 'text-red-600 flex items-center gap-2'}`}>{!req.ok && <AlertCircle size={14}/>} {req.name}</span>
                    <span className={req.ok ? 'text-emerald-600 font-black' : 'text-red-600 font-black'}>{req.needed} u.</span>
                 </div>
               ))}
            </div>
          )}
          <Button className="w-full py-6 md:py-8 text-xl md:text-2xl font-black rounded-[2rem] shadow-xl" variant="special" icon={Factory} disabled={!selId} onClick={()=>{onStartOrder(selId, mode, qty); setSelId(''); setQty(1);}}>LANZAR A TALLER</Button>
        </Card>

        <Card className="p-6 md:p-10 space-y-6 shadow-2xl border-t-[10px] border-emerald-600 bg-white rounded-[2rem] md:rounded-[3rem]">
          <h3 className="font-black text-xl md:text-2xl uppercase tracking-tighter flex items-center gap-3"><Truck className="text-emerald-600"/> Entrada de Insumos</h3>
          <select className="w-full p-5 border-2 rounded-[2rem] font-black bg-slate-50 text-lg md:text-xl outline-none focus:ring-4 focus:ring-emerald-100" value={selMpEntry} onChange={e=>setSelMpEntry(e.target.value)}>
            <option value="">-- Seleccionar Insumo --</option>
            {mps.map((m:any) => <option key={m.id} value={m.id}>{m.desc || m.sku}</option>)}
          </select>
          <Input type="number" min="1" value={qtyMpEntry} onChange={e=>setQtyMpEntry(Number(e.target.value))} className="text-4xl font-black h-24 text-center border-2 rounded-[2rem]" />
          <Button className="w-full py-6 md:py-8 text-xl md:text-2xl font-black rounded-[2rem] shadow-xl" variant="success" icon={Download} disabled={!selMpEntry} onClick={()=>{onMpEntry(selMpEntry, qtyMpEntry); setSelMpEntry(''); setQtyMpEntry(1);}}>CONFIRMAR INGRESO</Button>
        </Card>

        <Card className="p-6 md:p-12 shadow-2xl bg-[#0f172a] text-white lg:col-span-2 rounded-[2rem] md:rounded-[3.5rem] border border-slate-800">
          <div className="flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
            <h3 className="font-black text-xl md:text-3xl uppercase tracking-widest flex items-center gap-4"><Hammer className="text-blue-400" /> Producción</h3>
            <Badge type="process" text={`${orders.length} ÓRDENES`} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {orders.map((o:any) => (
              <div key={o.id} className="p-8 bg-slate-800/60 border-2 border-slate-700 rounded-[2.5rem] space-y-6 shadow-xl group transition-all hover:border-blue-500">
                <Badge type={o.targetType === 'mp' ? 'warn' : 'info'} text={o.targetType === 'mp' ? 'ESTR' : 'ESP'} />
                <p className="font-black text-white text-2xl leading-tight group-hover:text-blue-300 transition-colors">{o.productName}</p>
                <p className="text-blue-400 font-black text-lg uppercase tracking-tighter">Lote: {o.qty} Unidades</p>
                <Button onClick={() => onCompleteOrder(o)} variant="success" size="lg" className="w-full py-5 text-xl font-black rounded-3xl group-hover:scale-105 transition-transform">TERMINAR</Button>
              </div>
            ))}
            {orders.length === 0 && <div className="col-span-full text-center py-24 text-slate-700 font-black uppercase text-2xl border-4 border-dashed border-slate-800 rounded-[3rem] opacity-40 italic">Taller en espera</div>}
          </div>
        </Card>
      </div>
    </div>
  );
};

const PlanningView = ({ products, mps, recipes }: any) => {
  const [sel, setSel] = useState('');
  const [qty, setQty] = useState(1);

  const getFullRequirements = useCallback((targetId: string, targetType: 'product' | 'mp', multiplier: number, depth: number = 0): any[] => {
    const immediate = recipes.filter((r: any) => r.targetId === targetId && r.targetType === targetType);
    let all: any[] = [];
    immediate.forEach((r: any) => {
      const mp = mps.find((m: any) => m.id === r.mpId);
      const neededTotal = r.qty * multiplier;
      all.push({ mp, needed: neededTotal, depth, parentId: targetId });
      const subRecipes = recipes.filter((sr: any) => sr.targetId === r.mpId && sr.targetType === 'mp');
      if (subRecipes.length > 0) {
        all = [...all, ...getFullRequirements(r.mpId, 'mp', neededTotal, depth + 1)];
      }
    });
    return all;
  }, [recipes, mps]);

  const requirements = useMemo(() => {
    if (!sel) return [];
    return getFullRequirements(sel, 'product', qty);
  }, [sel, qty, getFullRequirements]);

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-2">
      <SectionHeader title="Explosión de Materiales" subtitle="Planifica las compras" />
      <Card className="p-6 md:p-10 bg-[#2B3860] text-white flex flex-col md:flex-row gap-8 items-end shadow-2xl rounded-[2rem] md:rounded-[3rem]">
        <div className="flex-1 w-full"><label className="text-[10px] font-black uppercase text-blue-300 mb-4 block tracking-widest">Espejo</label>
          <select className="w-full p-5 rounded-[2rem] text-slate-900 font-black text-xl outline-none" value={sel} onChange={e=>setSel(e.target.value)}>
            <option value="">-- Seleccionar SKU --</option>
            {products.map((p:any)=><option key={p.id} value={p.id}>{p.sku} ({p.marca})</option>)}
          </select>
        </div>
        <div className="w-full md:w-32"><label className="text-[10px] font-black uppercase text-blue-300 mb-4 block tracking-widest">Unidades</label>
          <Input type="number" min="1" value={qty} onChange={e=>setQty(Number(e.target.value))} className="p-5 font-black text-center text-slate-900 h-20 text-4xl rounded-[2rem] border-none" />
        </div>
      </Card>
      {sel ? (
        <Card className="p-4 md:p-10 bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead className="text-[10px] uppercase font-black text-slate-400">
              <tr className="border-b-2 border-slate-100">
                <th className="pb-5 text-left w-12">#</th>
                <th className="pb-5 text-left">MATERIAL</th>
                <th className="pb-5 text-center">STOCK</th>
                <th className="pb-5 text-center">NECESARIO</th>
                <th className="pb-5 text-center">DIF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requirements.map((req:any, i:number) => {
                const diff = (req.mp?.stock || 0) - req.needed;
                const isSemie = recipes.some((sr: any) => sr.targetId === req.mp?.id && sr.targetType === 'mp');
                return (
                  <tr key={i} className={`text-sm hover:bg-slate-50 transition-colors ${req.depth > 0 ? 'bg-blue-50/10' : ''}`}>
                    <td className="py-4 md:py-6 text-slate-300 font-mono text-xs">{i+1}</td>
                    <td className="py-4 md:py-6">
                      <div className="flex items-center gap-4" style={{ paddingLeft: `${req.depth * 20}px` }}>
                        {req.depth > 0 ? <ChevronRight size={18} className="text-blue-400" /> : <div className="w-3 h-3 bg-slate-800 rounded-full"></div>}
                        <span className={`font-black uppercase text-sm md:text-lg ${req.depth > 0 ? 'text-blue-700' : 'text-slate-800'}`}>
                          {req.mp?.desc || req.mp?.sku || 'Material'}
                        </span>
                        {isSemie && <Badge type="warn" text="SEMI" />}
                      </div>
                    </td>
                    <td className="py-4 md:py-6 text-center font-bold text-slate-400 text-lg">{req.mp?.stock || 0}</td>
                    <td className="py-4 md:py-6 text-center font-black text-blue-600 text-xl">{req.needed}</td>
                    <td className={`py-4 md:py-6 text-center font-black text-lg ${diff >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{diff >= 0 ? `+${diff}` : diff}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ) : <div className="py-40 text-center text-slate-300 font-black uppercase text-2xl italic border-4 border-dashed border-slate-100 rounded-[3rem] opacity-30">Selecciona un modelo</div>}
    </div>
  );
};

export default App;
