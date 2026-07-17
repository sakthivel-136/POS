"use client";

import { useState, useEffect, useRef } from "react";
import { ShoppingCart, LogOut, Package, CheckCircle2, ChevronRight, Store, Menu, LayoutDashboard, Receipt, X, Search, Trash2, IndianRupee, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CustomerPortal() {
  const [token, setToken] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [portalError, setPortalError] = useState("");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState("dashboard");
  const [cartOpen, setCartOpen] = useState(false);

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [bills, setBills] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [cart, setCart] = useState<any[]>([]);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<number | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem("portal_token");
    if (savedToken) {
      setToken(savedToken);
      fetchDashboard(savedToken);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");
    try {
      const formData = new URLSearchParams();
      formData.append("username", phone);
      formData.append("password", "nopass");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString()
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("portal_token", data.access_token);
        setToken(data.access_token);
        fetchDashboard(data.access_token);
      } else {
        if (data.detail === "Account pending admin approval")
          setLoginError("Your account is pending admin approval. Please contact the store.");
        else if (data.detail === "Account rejected")
          setLoginError("Your account was rejected. Please contact the store.");
        else
          setLoginError(data.detail || "Login failed. Check your phone number.");
      }
    } catch {
      setLoginError("Network error. Please try again.");
    }
    setIsLoggingIn(false);
  };

  const fetchDashboard = async (authToken: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/portal/dashboard`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        setPortalError("");
        setDashboardData(await res.json());
      } else if (res.status === 401) {
        handleLogout();
      } else if (res.status === 403) {
        setPortalError("Your account is approved but not yet linked. Please contact the store admin.");
      }
    } catch (err) { console.error(err); }
  };

  const fetchBills = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/portal/bills`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setBills(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/portal/my-prices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setProducts(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchMyOrders = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/portal/my-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setMyOrders(await res.json());
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (token) {
      if (currentView === "dashboard") fetchDashboard(token);
      if (currentView === "bills") fetchBills();
      if (currentView === "order") fetchProducts();
      if (currentView === "my-orders") fetchMyOrders();
    }
  }, [currentView, token]);

  const handleLogout = () => {
    localStorage.removeItem("portal_token");
    setToken(null);
    setCurrentView("dashboard");
    setCart([]);
    setDashboardData(null);
    setPortalError("");
  };

  const updateCart = (product: any, delta: number) => {
    const existing = cart.find(i => i.product_id === product.product_id);
    const currentQty = existing ? existing.quantity : 0;
    const newQty = currentQty + delta;
    if (newQty <= 0) {
      setCart(cart.filter(i => i.product_id !== product.product_id));
    } else if (existing) {
      setCart(cart.map(i => i.product_id === product.product_id ? { ...i, quantity: newQty } : i));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const setQty = (productId: number, qty: number) => {
    if (qty <= 0) setCart(cart.filter(i => i.product_id !== productId));
    else setCart(cart.map(i => i.product_id === productId ? { ...i, quantity: qty } : i));
  };

  const placeOrder = async () => {
    if (cart.length === 0) return;
    setIsPlacingOrder(true);
    const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/portal/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity, rate: i.price, amount: i.price * i.quantity })),
          total_amount: totalAmount,
          language: "english"
        })
      });
      if (res.ok) {
        const data = await res.json();
        setCart([]);
        setCartOpen(false);
        setOrderSuccess(data.order_id);
        setTimeout(() => setOrderSuccess(null), 5000);

        // Fire and forget the email trigger (this runs in the background)
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/portal/orders/${data.order_id}/email`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => console.error("Failed to trigger email", err));

      } else alert("Failed to place order.");
    } catch { alert("Network error."); }
    setIsPlacingOrder(false);
  };

  const navigate = (view: string) => {
    setCurrentView(view);
    setSidebarOpen(false);
    setCartOpen(false);
  };

  // ─── LOGIN SCREEN ──────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-600 to-emerald-800 flex flex-col items-center justify-center p-5">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-xl">
              <Store className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Sakthi Spices</h1>
            <p className="text-emerald-100 mt-1">Customer Portal</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  required
                  inputMode="numeric"
                  placeholder="Enter your phone number"
                  className="w-full text-lg py-4 px-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-2 text-center">No password needed. Just enter your registered number.</p>
              </div>

              {loginError && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100 flex items-start gap-2">
                  <X className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-4 text-base bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isLoggingIn ? (
                  <><div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" /> Signing in...</>
                ) : (
                  <>Sign In <ChevronRight className="w-5 h-5" /></>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const filteredProducts = products.filter(p =>
    p.product_name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.tamil_name || "").toLowerCase().includes(productSearch.toLowerCase())
  );

  const statusBadge = (status: string, pending: number) => {
    if (status === "paid") return <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">✓ Fully Paid</span>;
    if (status === "partially_paid") return <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">Partial — ₹{pending} pending</span>;
    return <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">Not Paid — ₹{pending}</span>;
  };

  // ─── MAIN APP ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">

      {/* ── TOP HEADER (Mobile & Desktop) ── */}
      <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 max-w-5xl mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Store className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 leading-none text-sm">Sakthi Spices</p>
              {dashboardData && <p className="text-xs text-gray-500 leading-none mt-0.5 truncate max-w-[140px]">{dashboardData.customer_name}</p>}
            </div>
          </div>

          {/* Right side: cart on order view, logout */}
          <div className="flex items-center gap-2">
            {portalError && (
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full font-medium hidden sm:inline">⚠ Not linked</span>
            )}
            {currentView === "order" && cart.length > 0 && (
              <button
                onClick={() => setCartOpen(true)}
                className="relative bg-emerald-600 text-white rounded-xl px-3 py-2 flex items-center gap-1.5 text-sm font-semibold shadow-sm active:scale-95 transition-all"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>₹{cartTotal.toFixed(0)}</span>
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-bold">{cartCount}</span>
              </button>
            )}
            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Portal error banner */}
      {portalError && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-amber-800 text-xs text-center font-medium">
          ⚠️ {portalError}
        </div>
      )}

      {/* ── SUCCESS TOAST ── */}
      {orderSuccess !== null && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white rounded-2xl px-5 py-3 shadow-xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm">Order #{orderSuccess} Placed!</p>
            <p className="text-xs opacity-80">We'll process your order shortly.</p>
          </div>
        </div>
      )}

      {/* ── PAGE CONTENT ── */}
      <main className="flex-1 pb-40 overflow-auto">

        {/* DASHBOARD */}
        {currentView === "dashboard" && (
          <div className="max-w-2xl mx-auto p-4 space-y-4 animate-in fade-in duration-300">
            {dashboardData ? (
              <>
                <div className="bg-emerald-600 rounded-3xl p-6 text-white shadow-lg">
                  <p className="text-emerald-100 text-sm font-medium">Welcome back,</p>
                  <h2 className="text-2xl font-bold mt-0.5">{dashboardData.customer_name}</h2>
                  {dashboardData.shop_name && <p className="text-emerald-200 text-sm mt-1">{dashboardData.shop_name}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <p className="text-xs font-medium text-gray-500 mb-1">Total Purchases</p>
                    <p className="text-xl font-bold text-gray-900">₹{dashboardData.total_purchases.toFixed(0)}</p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 shadow-sm border-t-4 border-t-red-400">
                    <p className="text-xs font-medium text-gray-500 mb-1">Pending Balance</p>
                    <p className="text-xl font-bold text-red-600">₹{dashboardData.pending_amount.toFixed(0)}</p>
                  </div>
                </div>

                <button
                  onClick={() => navigate("order")}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold py-4 rounded-2xl shadow-md flex items-center justify-center gap-2 text-base transition-all"
                >
                  <Package className="w-5 h-5" /> Order Now
                </button>

                <button
                  onClick={() => navigate("bills")}
                  className="w-full bg-white hover:bg-gray-50 active:scale-[0.98] text-gray-700 font-semibold py-4 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center gap-2 text-base transition-all"
                >
                  <Receipt className="w-5 h-5 text-gray-500" /> View Previous Bills
                </button>
              </>
            ) : (
              <div className="flex justify-center items-center h-48">
                {portalError ? (
                  <div className="text-center px-6">
                    <Store className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">{portalError}</p>
                  </div>
                ) : (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
                )}
              </div>
            )}
          </div>
        )}

        {/* BILLS */}
        {currentView === "bills" && (
          <div className="max-w-2xl mx-auto p-4 space-y-3 animate-in fade-in duration-300">
            <h2 className="text-xl font-bold text-gray-900 px-1">Previous Bills</h2>
            {bills.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                <Receipt className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No bills yet</p>
                <p className="text-gray-400 text-sm mt-1">Your purchase history will appear here</p>
              </div>
            ) : (
              bills.map(bill => (
                <div key={bill.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  {/* Bill header */}
                  <div className="px-4 py-3 flex items-start justify-between border-b border-gray-100">
                    <div>
                      <p className="font-bold text-gray-900">Bill #{bill.id}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(bill.bill_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <p className="font-bold text-gray-900">₹{bill.total_amount}</p>
                      {statusBadge(bill.status, bill.pending_amount)}
                    </div>
                  </div>

                  {/* Items */}
                  <div className="px-4 py-2 divide-y divide-gray-50">
                    {bill.bill_items?.map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-2.5">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{item.product?.product_name || `Product #${item.product_id}`}</p>
                          {item.product?.tamil_name && <p className="text-xs text-gray-400">{item.product.tamil_name}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">₹{item.amount}</p>
                          <p className="text-xs text-gray-400">{item.quantity} × ₹{item.rate}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Paid/Pending footer */}
                  {(Number(bill.paid_amount) > 0 || Number(bill.pending_amount) > 0) && (
                    <div className="px-4 py-2.5 bg-gray-50 border-t flex justify-between text-sm">
                      <span className="text-emerald-600 font-medium">Paid: ₹{bill.paid_amount || 0}</span>
                      <span className={Number(bill.pending_amount) > 0 ? "text-red-500 font-semibold" : "text-emerald-600 font-medium"}>
                        {Number(bill.pending_amount) > 0 ? `Pending: ₹${bill.pending_amount}` : "Cleared ✓"}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* MY ORDERS */}
        {currentView === "my-orders" && (
          <div className="p-4 max-w-2xl mx-auto space-y-4 animate-in fade-in duration-300">
            <h2 className="text-xl font-bold text-gray-900 mb-4 px-1">My Orders</h2>
            {myOrders.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
                <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No previous orders found.</p>
              </div>
            ) : (
              myOrders.map(order => (
                <div key={order.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                  <div className="px-4 py-3 flex items-start justify-between border-b border-gray-100">
                    <div>
                      <p className="font-bold text-gray-900">Order #{order.id}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <p className="font-bold text-gray-900">₹{order.total_amount}</p>
                      {order.status === "pending" && <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">Pending</span>}
                      {order.status === "delivered" && <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">Delivered</span>}
                      {order.status === "rejected" && <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">Rejected</span>}
                    </div>
                  </div>
                  <div className="px-4 py-2 divide-y divide-gray-50 bg-gray-50">
                    {order.order_items?.map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-2.5">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{item.product?.product_name || `Product #${item.product_id}`}</p>
                          {item.product?.tamil_name && <p className="text-xs text-gray-400">{item.product.tamil_name}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">₹{item.amount}</p>
                          <p className="text-xs text-gray-400">{item.quantity} × ₹{item.rate}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ORDER */}
        {currentView === "order" && (
          <div className="animate-in fade-in duration-300">
            {/* Search bar — NOT sticky so top products are visible */}
            <div className="bg-white border-b px-4 py-3 shadow-sm">
              <div className="relative max-w-2xl mx-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:bg-white transition-all"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Product grid */}
            <div className="p-4 max-w-2xl mx-auto grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredProducts.map(p => {
                const cartItem = cart.find(i => i.product_id === p.product_id);
                const qty = cartItem?.quantity || 0;
                return (
                  <div
                    key={p.product_id}
                    className={cn(
                      "bg-white rounded-2xl p-4 shadow-sm border-2 transition-all",
                      qty > 0 ? "border-emerald-400 shadow-emerald-100" : "border-transparent"
                    )}
                  >
                    <p className="font-bold text-gray-900 leading-tight text-sm">{p.product_name}</p>
                    {p.tamil_name && <p className="text-xs text-gray-400 mt-0.5 truncate">{p.tamil_name}</p>}
                    <div className="flex items-end justify-between mt-3">
                      <div>
                        <p className="text-base font-bold text-emerald-600">₹{p.price}</p>
                        <p className="text-xs text-gray-400">/{p.unit}</p>
                      </div>
                    </div>
                    {qty === 0 ? (
                      <button
                        onClick={() => updateCart(p, 1)}
                        className="mt-3 w-full py-2 bg-slate-900 text-white text-sm font-semibold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add
                      </button>
                    ) : (
                      <div className="mt-3 flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl overflow-hidden">
                        <button onClick={() => updateCart(p, -1)} className="px-3 py-2 text-emerald-700 hover:bg-emerald-100 font-bold text-lg active:scale-90 transition-all">−</button>
                        <span className="font-bold text-emerald-700 text-sm">{qty}</span>
                        <button onClick={() => updateCart(p, 1)} className="px-3 py-2 bg-emerald-600 text-white font-bold text-lg active:scale-90 transition-all">+</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ── PLACE ORDER floating bar (above bottom nav) ── */}
      {currentView === "order" && cart.length > 0 && (
        <div className="fixed bottom-[68px] left-0 right-0 z-20 px-4 pb-2">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full max-w-sm mx-auto flex items-center justify-between bg-emerald-600 text-white rounded-2xl px-5 py-4 shadow-xl active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-xl px-2.5 py-1 text-sm font-bold">{cart.reduce((s,i) => s + i.quantity, 0)} items</div>
              <span className="font-bold text-base">View Order & Place</span>
            </div>
            <span className="text-xl font-bold">₹{cartTotal.toFixed(0)}</span>
          </button>
        </div>
      )}

      {/* ── BOTTOM NAV (Mobile) ── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-around px-2 py-2 max-w-sm mx-auto">
          {[
            { id: "dashboard", icon: LayoutDashboard, label: "Home" },
            { id: "bills", icon: Receipt, label: "Bills" },
            { id: "my-orders", icon: ShoppingCart, label: "Orders" },
            { id: "order", icon: Package, label: "New" },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = currentView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.id)}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-5 py-2 rounded-2xl transition-all relative",
                  isActive ? "text-emerald-600" : "text-gray-400"
                )}
              >
                <Icon className={cn("w-6 h-6", isActive ? "text-emerald-600" : "text-gray-400")} />
                <span className={cn("text-xs font-semibold", isActive ? "text-emerald-600" : "text-gray-400")}>{tab.label}</span>
                {tab.id === "order" && cart.length > 0 && (
                  <span className="absolute top-1 right-3 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                    {cart.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── CART BOTTOM SHEET ── */}
      {cartOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40 animate-in fade-in duration-200"
            onClick={() => setCartOpen(false)}
          />
          {/* Sheet */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom-full duration-300 max-h-[85vh] flex flex-col">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 py-3 flex items-center justify-between border-b">
              <h3 className="font-bold text-lg text-gray-900">Your Order</h3>
              <button onClick={() => setCartOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {cart.map(item => (
                <div key={item.product_id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{item.product_name}</p>
                    {item.tamil_name && <p className="text-xs text-gray-400 mt-0.5 truncate">{item.tamil_name}</p>}
                    <p className="text-xs text-gray-500">₹{item.price} each</p>
                  </div>
                  <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <button onClick={() => updateCart(item, -1)} className="px-2.5 py-1.5 text-gray-600 font-bold text-lg active:scale-90">−</button>
                    <span className="px-2 font-bold text-sm min-w-[24px] text-center">{item.quantity}</span>
                    <button onClick={() => updateCart(item, 1)} className="px-2.5 py-1.5 bg-emerald-600 text-white font-bold text-lg active:scale-90">+</button>
                  </div>
                  <p className="text-sm font-bold text-emerald-600 w-16 text-right">₹{(item.price * item.quantity).toFixed(0)}</p>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 pb-6 pt-4 border-t space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">{cart.length} items • {cartCount} units</span>
                <span className="text-2xl font-bold text-emerald-600">₹{cartTotal.toFixed(0)}</span>
              </div>
              <button
                onClick={placeOrder}
                disabled={isPlacingOrder}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-base rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isPlacingOrder ? (
                  <><div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" /> Placing Order...</>
                ) : (
                  <><CheckCircle2 className="w-5 h-5" /> Place Order — ₹{cartTotal.toFixed(0)}</>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
