"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Search, CheckCircle2, Download as DownloadIcon, IndianRupee } from "lucide-react";
import { generateBillPDF } from "@/utils/pdfGenerator";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function BillingPOS() {
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [savedBillId, setSavedBillId] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Payment mode state
  const [paymentMode, setPaymentMode] = useState<"unpaid" | "partially_paid" | "paid">("unpaid");
  const [receivedAmount, setReceivedAmount] = useState<number | "">("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPaymentInMode, setIsPaymentInMode] = useState(false);

  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerRates, setCustomerRates] = useState<any>({});

  const [editBillId, setEditBillId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [originalBill, setOriginalBill] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const [custRes, prodRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/customers`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/products`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
        ]);
        let loadedProducts = [];
        let loadedCustomers = [];
        if (prodRes.ok) {
          loadedProducts = await prodRes.json();
          setProducts(loadedProducts);
        }
        if (custRes.ok) {
          loadedCustomers = await custRes.json();
          setCustomers(loadedCustomers);
        }

        // Check for edit mode
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const editId = params.get("edit_bill");
          if (editId) {
            setEditBillId(editId);
            setIsEditMode(true);
            const billRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/billing`, { headers: { Authorization: `Bearer ${token}` } });
            if (billRes.ok) {
              const bills = await billRes.json();
              const targetBill = bills.find((b: any) => b.id.toString() === editId);
              if (targetBill) {
                setOriginalBill(targetBill);
                const cust = loadedCustomers.find((c: any) => c.id === targetBill.customer_id);
                if (cust) setSelectedCustomer(cust);
                
                if (targetBill.bill_items) {
                  const mappedItems = targetBill.bill_items.map((bi: any) => {
                    const prod = loadedProducts.find((p: any) => p.id === bi.product_id);
                    return {
                      ...prod,
                      cart_id: Date.now() + Math.random(),
                      qty: Math.abs(bi.quantity),
                      rateToUse: bi.rate,
                      isReturn: bi.quantity < 0
                    };
                  }).filter((i: any) => i.id);
                  setItems(mappedItems);
                }
                
                setPaymentMode(targetBill.status);
                if (targetBill.status === "partially_paid") {
                  setReceivedAmount(targetBill.paid_amount);
                }
              }
            }
          }
        }
      } catch (err) { console.error(err); }
    };
    fetchData();
  }, []);

  const addItem = (product: any) => {
    const rateToUse = customerRates[product.id] !== undefined ? customerRates[product.id] : (product.default_selling_price || 0);
    const existing = items.find(i => i.id === product.id && !i.isReturn);
    if (existing) {
      setItems(items.map(i => (i.id === product.id && !i.isReturn) ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setItems([...items, { ...product, cart_id: Date.now() + Math.random(), qty: 1, rateToUse, isReturn: false }]);
    }
  };

  const removeItem = (cart_id: number) => setItems(items.filter(i => i.cart_id !== cart_id));

  const updateQty = (cart_id: number, qty: number) => {
    setItems(items.map(i => i.cart_id === cart_id ? { ...i, qty: Math.max(1, Number(qty)) } : i));
  };

  const toggleReturn = (cart_id: number) => {
    setItems(items.map(i => i.cart_id === cart_id ? { ...i, isReturn: !i.isReturn } : i));
  };

  const updateRate = (cart_id: number, rate: number) => {
    setItems(items.map(i => i.cart_id === cart_id ? { ...i, rateToUse: Number(rate) } : i));
  };

  const currentBillAmount = items.reduce((acc, item) => acc + ((item.isReturn ? -1 : 1) * item.rateToUse * item.qty), 0);
  const previousPending = isEditMode ? 0 : (selectedCustomer ? (selectedCustomer.current_balance || 0) : 0);
  const grandTotal = currentBillAmount + previousPending;

  // The actual pending amount FOR THIS SPECIFIC BILL ONLY
  const rawPaidAmount = paymentMode === "paid" ? currentBillAmount : paymentMode === "partially_paid" ? Number(receivedAmount) : 0;
  const thisBillPending = Math.max(0, currentBillAmount - rawPaidAmount);
  
  // Status is based on whether they paid enough to cover the CURRENT bill
  const thisBillStatus = rawPaidAmount >= currentBillAmount ? "paid" : rawPaidAmount > 0 ? "partially_paid" : "unpaid";
  
  // Total pending after payment (for UI display only)
  const effectivePaid = paymentMode === "paid" ? grandTotal : paymentMode === "partially_paid" ? Number(receivedAmount) : 0;
  const effectivePending = Math.max(0, grandTotal - effectivePaid);

  const handleSaveBill = async () => {
    if (!selectedCustomer) return alert("Select a customer");
    if (!isPaymentInMode && items.length === 0) return alert("Add items to bill");
    if (isPaymentInMode && (!receivedAmount || Number(receivedAmount) <= 0)) return alert("Enter the payment amount");
    if (paymentMode === "partially_paid" && (!receivedAmount || Number(receivedAmount) <= 0))
      return alert("Enter the amount paid for partial payment");

    const token = localStorage.getItem("token");

    const payload = {
      customer_id: selectedCustomer.id,
      total_amount: currentBillAmount,
      paid_amount: isPaymentInMode || paymentMode === "partially_paid" ? Number(receivedAmount) : rawPaidAmount,
      pending_amount: isPaymentInMode ? 0 : thisBillPending,
      status: isPaymentInMode ? "paid" : thisBillStatus,
      items: items.map(i => ({ 
        product_id: i.id, 
        quantity: i.isReturn ? -i.qty : i.qty, 
        rate: i.rateToUse, 
        amount: (i.isReturn ? -1 : 1) * i.qty * i.rateToUse 
      }))
    };

    const method = isEditMode ? "PUT" : "POST";
    let url = isEditMode 
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/billing/${editBillId}/full`
      : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/billing/`;
      
    if (isPaymentInMode && !isEditMode) {
      url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/payments/`;
    }
      
    setIsSaving(true);

    try {
      // 1. Sync custom prices for any items whose rate differs from customerRates/default
      const pricePromises = items.map(async (item) => {
        const defaultRate = customerRates[item.id] !== undefined ? customerRates[item.id] : (item.default_selling_price || 0);
        if (item.rateToUse !== defaultRate) {
          // Send price update to backend
          return fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/customers/${selectedCustomer.id}/prices`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ product_id: item.id, custom_price: item.rateToUse })
          });
        }
      }).filter(Boolean);
      
      if (pricePromises.length > 0) {
        await Promise.all(pricePromises);
      }

      // 2. Save the Bill or Payment
      let res;
      if (isPaymentInMode && !isEditMode) {
        // Send to payments endpoint
        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({
            customer_id: selectedCustomer.id,
            amount: Number(receivedAmount),
            payment_mode: "cash",
            notes: "Payment In"
          })
        });
      } else {
        res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        const data = await res.json();
        setSavedBillId(data.id || null);
        toast.success(isPaymentInMode ? "Payment logged successfully!" : "Bill saved successfully!");
        
        // Re-fetch customers to instantly update balances
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/customers`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
          .then(r => r.json())
          .then(custData => {
            setCustomers(custData);
            // We want to keep the selected customer, but update its balance!
            if (selectedCustomer) {
              const updatedCust = custData.find((c: any) => c.id === selectedCustomer.id);
              if (updatedCust) setSelectedCustomer(updatedCust);
            }
          });
        
        // Reset only after success
        if (!isEditMode) {
          setItems([]);
          setPaymentMode("unpaid");
          setReceivedAmount("");
          if (isPaymentInMode) setIsPaymentInMode(false);
        }
        
        if (isEditMode) {
          window.location.href = "/bills"; // Redirect back to bills history after edit
        }
        return data;
      } else {
        toast.error("Failed to save transaction.");
        return null;
      }
    } catch (err) {
      toast.error("Network Error.");
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedCustomer) return alert("Select a customer");
    if (!isPaymentInMode && items.length === 0) return alert("Add items to bill");

    // Save first to get real bill ID
    const savedData = await handleSaveBill();
    const billId = savedData?.id || savedBillId || "DRAFT";

    // Prepare bill mock object
    const billMock = {
      id: billId,
      bill_date: new Date().toISOString(),
      total_amount: currentBillAmount,
      paid_amount: isPaymentInMode ? Number(receivedAmount) : rawPaidAmount,
      pending_amount: isPaymentInMode ? 0 : thisBillPending
    };

    await generateBillPDF(billMock, selectedCustomer, items, previousPending);
  };

  const filteredProducts = products.filter(p =>
    (p.product_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.tamil_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col lg:flex-row h-auto min-h-screen lg:min-h-0 lg:h-[calc(100vh-theme(spacing.16))] gap-6 p-4 lg:p-6 w-full max-w-[1600px] mx-auto"
    >
      {/* Left Panel: Catalog & Search */}
      <div className="flex-1 flex flex-col min-h-0 space-y-4">
        {/* Top bar */}
        <Card className="glass-card shrink-0">
          <CardHeader className="pb-4">
            <CardTitle>Customer Selection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <select
                className="flex-1 bg-white border border-gray-200 text-gray-900 font-medium rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary outline-none"
                onChange={async (e) => {
                  const c = customers.find(c => c.id === Number(e.target.value));
                  setSelectedCustomer(c || null);
                  setItems([]);
                  setPaymentMode("unpaid");
                  setReceivedAmount(0);
                  if (c) {
                    const token = localStorage.getItem("token");
                    try {
                      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/customers/${c.id}/prices`, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      if (res.ok) {
                        const prices = await res.json();
                        const priceMap: any = {};
                        prices.forEach((p: any) => { priceMap[Number(p.product_id)] = p.custom_price; });
                        setCustomerRates(priceMap);
                      }
                    } catch (err) {}
                  } else {
                    setCustomerRates({});
                  }
                }}
              >
                <option value="">Select Customer...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.customer_name} — {c.address || "No Location"}</option>
                ))}
              </select>
            </div>
            {selectedCustomer && (
              <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-xl flex justify-between items-center">
                <div>
                  <p className="font-semibold">{selectedCustomer.customer_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.phone_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Previous Pending</p>
                  <p className="font-bold text-destructive">₹{selectedCustomer.current_balance || 0}</p>
                </div>
              </div>
            )}
            
            <div className="mt-4 flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <div>
                <p className="font-semibold text-sm text-gray-900">Payment In Only</p>
                <p className="text-xs text-muted-foreground">Record a payment without items</p>
              </div>
              <button 
                onClick={() => { setIsPaymentInMode(!isPaymentInMode); setItems([]); setPaymentMode(isPaymentInMode ? "unpaid" : "partially_paid"); }}
                className={cn("w-12 h-6 rounded-full transition-colors flex items-center px-1 shadow-inner", isPaymentInMode ? "bg-emerald-500" : "bg-gray-300")}
              >
                <div className={cn("w-4 h-4 bg-white rounded-full transition-transform shadow-sm", isPaymentInMode ? "translate-x-6" : "")} />
              </button>
            </div>
            
            <AnimatePresence>
              {!isPaymentInMode && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex-1 flex flex-col min-h-0"
                >
                  <Card className="glass-card flex-1 flex flex-col min-h-0 mt-4">
                    <CardHeader className="pb-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search products..."
                          className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-primary outline-none transition-all"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {filteredProducts.map(p => {
                          const pId = Number(p.id);
                          const rate = customerRates[pId] !== undefined ? customerRates[pId] : (p.default_selling_price || 0);
                          return (
                            <motion.button
                              whileHover={{ scale: 1.02, y: -2 }}
                              whileTap={{ scale: 0.98 }}
                              key={p.id}
                              onClick={() => addItem(p)}
                              className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-primary/5 transition-all text-left flex flex-col h-full"
                            >
                              <span className="font-semibold text-lg leading-tight">{p.product_name}</span>
                              <span className="text-sm text-muted-foreground">{p.tamil_name}</span>
                              <div className="mt-auto pt-4 flex justify-between items-center">
                                <span className="text-primary font-bold">₹{rate}</span>
                                <span className="text-xs px-2 py-1 bg-white/10 rounded-md">/{p.unit}</span>
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel: Invoice */}
      <div className="w-full lg:w-[460px] flex flex-col h-full min-h-[600px] lg:min-h-0">
        <Card className="glass-card flex-1 flex flex-col min-h-0 border-primary/20 bg-white">
          <CardHeader className="border-b border-gray-100 pb-4 bg-gray-50 text-black">
            <CardTitle className="flex justify-between items-center">
              <span className="text-base">Sakthi Spices ERP — Invoice</span>
              <span className="text-sm font-normal text-muted-foreground">
                {savedBillId ? `#${savedBillId}` : "Draft"}
              </span>
            </CardTitle>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0 min-h-0">
            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {items.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No items added yet
                </div>
              ) : (
                items.map((item, index) => (
                  <div key={item.cart_id || item.id} className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/5">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">{index + 1}</div>
                    <div className="flex-1">
                      <p className="font-semibold leading-none">{item.product_name}</p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <span>₹</span>
                        <input
                          type="number"
                          value={item.rateToUse}
                          onChange={(e) => updateRate(item.cart_id, Number(e.target.value))}
                          className="w-16 h-6 bg-background/50 border border-white/20 px-1 rounded-sm text-black focus:outline-none focus:ring-1 focus:ring-primary"
                          min="0"
                        />
                        <span>/ {item.unit}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        <button onClick={() => updateQty(item.cart_id, item.qty - 1)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-l-md flex items-center justify-center border border-white/10 text-lg font-bold">-</button>
                        <input
                          type="number"
                          value={item.qty}
                          onChange={(e) => updateQty(item.cart_id, Number(e.target.value))}
                          className="w-12 h-8 bg-background border-y border-white/10 px-1 text-center focus:outline-none"
                          min="1"
                        />
                        <button onClick={() => updateQty(item.cart_id, item.qty + 1)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-r-md flex items-center justify-center border border-white/10 text-lg font-bold">+</button>
                      </div>
                      <button 
                        onClick={() => toggleReturn(item.cart_id)} 
                        className={cn("px-2 py-1 text-[10px] font-bold rounded-md ml-1 uppercase transition-colors", item.isReturn ? "bg-red-500/20 text-red-600 border border-red-500/30" : "bg-gray-100 text-gray-400 border border-transparent")}
                      >
                        {item.isReturn ? "Return" : "Sale"}
                      </button>
                      <div className={cn("w-16 text-right font-bold", item.isReturn ? "text-red-500" : "")}>
                        {item.isReturn ? "- " : ""}₹{item.rateToUse * item.qty}
                      </div>
                      <button onClick={() => removeItem(item.cart_id)} className="p-1 hover:bg-destructive/20 text-destructive rounded-md transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Billing Summary */}
            <div className="p-5 bg-white border-t border-gray-100 space-y-4 text-black">
              
              {/* Breakdown */}
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-200">
                  <span className="text-sm font-bold text-gray-700">Rate Breakdown</span>
                  <span className="text-xs text-gray-500 font-medium">Total Items: {items.length} | Qty: {items.reduce((acc, i) => acc + (parseFloat(i.qty as any) || 0), 0)}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {Object.entries(
                    items.reduce((acc: any, item: any) => {
                      const rate = parseFloat(item.rateToUse) || 0;
                      acc[rate] = (acc[rate] || 0) + ((item.isReturn ? -1 : 1) * (parseFloat(item.qty) || 0));
                      return acc;
                    }, {})
                  ).map(([rate, qty]) => (
                    <div key={rate} className="flex justify-between">
                      <span className="text-gray-500">₹{rate}</span>
                      <span className={cn("font-bold", (qty as number) < 0 ? "text-red-600" : "text-gray-800")}>{qty as number} qty</span>
                    </div>
                  ))}
                  {items.length === 0 && <span className="text-gray-400 italic">No items added</span>}
                </div>
              </div>

              <div className="flex justify-between text-muted-foreground text-sm">
                <span>Current Bill Amount</span>
                <span className="font-medium">₹{currentBillAmount}</span>
              </div>
              <div className="flex justify-between text-destructive text-sm">
                <span>Previous Pending</span>
                <span>+ ₹{previousPending}</span>
              </div>
              <div className="flex justify-between font-bold text-xl py-2 border-y border-white/10">
                <span>{isPaymentInMode ? "Balance Before Payment" : "Grand Total"}</span>
                <span>₹{grandTotal}</span>
              </div>

              {/* Payment Mode */}
              {!isPaymentInMode && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700">Payment Status</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "unpaid", label: "Not Paid" },
                      { id: "partially_paid", label: "Partial" },
                      { id: "paid", label: "Full Paid" },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => { setPaymentMode(opt.id as any); setReceivedAmount(0); }}
                        className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                          paymentMode === opt.id
                            ? opt.id === "unpaid" ? "border-red-400 bg-red-50 text-red-700"
                            : opt.id === "partially_paid" ? "border-amber-400 bg-amber-50 text-amber-700"
                            : "border-emerald-400 bg-emerald-50 text-emerald-700"
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Partial amount input */}
              {(paymentMode === "partially_paid" || isPaymentInMode) && (
                <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className={cn("text-sm font-semibold whitespace-nowrap", isPaymentInMode ? "text-emerald-600" : "text-amber-600")}>Payment Amount (₹)</label>
                  <div className="relative flex-1">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={receivedAmount || ""}
                      onChange={(e) => setReceivedAmount(Number(e.target.value))}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-2 bg-amber-50 border border-amber-300 rounded-lg text-right font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>
              )}

              {paymentMode === "paid" && (
                <div className="flex justify-between text-emerald-600 text-sm font-medium bg-emerald-50 p-3 rounded-xl">
                  <span>Amount Received</span>
                  <span className="font-bold">₹{grandTotal} (Full)</span>
                </div>
              )}

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pending After Payment</span>
                <span className={`font-bold ${effectivePending > 0 ? "text-red-500" : "text-emerald-600"}`}>₹{effectivePending}</span>
              </div>

              <div className="pt-2 flex gap-3">
                <Button onClick={handleSaveBill} disabled={isSaving} className="flex-1 py-6 bg-emerald-600 hover:bg-emerald-700 text-white">
                  <CheckCircle2 className="w-5 h-5 mr-2" /> {isSaving ? "Saving..." : (isEditMode ? `Update Bill #${editBillId}` : "Save Bill")}
                </Button>
                <Button variant="outline" className="flex-1 py-6 bg-white border-gray-300 text-black hover:bg-gray-100" onClick={handleDownloadPDF} disabled={isSaving}>
                  <DownloadIcon className="w-5 h-5 mr-2" /> Download PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
