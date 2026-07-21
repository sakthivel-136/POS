"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Receipt, Search, FileEdit, X, IndianRupee, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { generateBillPDF } from "@/utils/pdfGenerator";

const STATUS_TABS = [
  { id: "all", label: "All Bills", icon: Receipt },
  { id: "unpaid", label: "Not Paid", icon: Clock },
  { id: "partially_paid", label: "Partially Paid", icon: AlertCircle },
  { id: "paid", label: "Fully Paid", icon: CheckCircle },
];

const statusStyle: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
  partially_paid: "bg-amber-100 text-amber-700 border-amber-200",
  unpaid: "bg-red-100 text-red-700 border-red-200",
};
const statusLabel: Record<string, string> = {
  paid: "Fully Paid",
  partially_paid: "Partially Paid",
  unpaid: "Not Paid",
};

export default function BillsPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("all");
  const [statusTab, setStatusTab] = useState("all");
  const [search, setSearch] = useState("");
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<any>(null);

  // Edit Items State
  const [isEditItemsModalOpen, setIsEditItemsModalOpen] = useState(false);
  const [editingItems, setEditingItems] = useState<any[]>([]);
  const [itemsBill, setItemsBill] = useState<any>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [isSavingItems, setIsSavingItems] = useState(false);

  const router = useRouter();

  const fetchData = async () => {
    const token = localStorage.getItem("token");
    if (!token) return router.push("/");
    
    try {
      const [billsRes, custRes, prodRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/billing`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/customers`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/products`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (billsRes.ok) setBills(await billsRes.json());
      if (custRes.ok) setCustomers(await custRes.json());
      if (prodRes.ok) setProducts(await prodRes.json());
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, [router]);

  const filteredBills = useMemo(() => {
    let result = bills;
    if (selectedCustomerId !== "all") result = result.filter(b => b.customer_id.toString() === selectedCustomerId);
    if (statusTab !== "all") result = result.filter(b => b.status === statusTab);
    if (search) result = result.filter(b => b.id.toString().includes(search));
    return result;
  }, [bills, selectedCustomerId, statusTab, search]);

  // Counts for tabs
  const counts = useMemo(() => ({
    all: bills.length,
    unpaid: bills.filter(b => b.status === "unpaid").length,
    partially_paid: bills.filter(b => b.status === "partially_paid").length,
    paid: bills.filter(b => b.status === "paid").length,
  }), [bills]);

  const openEditModal = (bill: any) => {
    const grandTotal = parseFloat(bill.paid_amount || 0) + parseFloat(bill.pending_amount || 0);
    setEditingBill({
      id: bill.id,
      total_amount: bill.total_amount,
      grand_total: grandTotal,
      paid_amount: bill.paid_amount || "0",
      pending_amount: bill.pending_amount,
      status: bill.status
    });
    setIsEditModalOpen(true);
  };

  const openEditItemsModal = (bill: any) => {
    setItemsBill(bill);
    if (bill.bill_items) {
      const mapped = bill.bill_items.map((bi: any) => {
        const prod = products.find(p => p.id === bi.product_id);
        return {
          product_id: bi.product_id,
          product_name: prod ? prod.product_name : `Product #${bi.product_id}`,
          qty: parseFloat(bi.quantity),
          rateToUse: parseFloat(bi.rate)
        };
      });
      setEditingItems(mapped);
    } else {
      setEditingItems([]);
    }
    setSelectedProductId("");
    setIsEditItemsModalOpen(true);
  };

  const handleAddItem = (productIdOverride?: string) => {
    const id = productIdOverride || selectedProductId;
    if (!id) return;
    const prod = products.find(p => p.id.toString() === id);
    if (!prod) return;
    setEditingItems(prev => {
      const existing = prev.find(i => i.product_id === prod.id);
      if (existing) {
        return prev.map(i => i.product_id === prod.id ? { ...i, qty: parseFloat(i.qty) + 1 } : i);
      } else {
        return [...prev, { product_id: prod.id, product_name: prod.product_name, qty: 1, rateToUse: parseFloat(prod.default_selling_price || "0") }];
      }
    });
    setSelectedProductId("");
  };

  const handleEditItemsSubmit = async () => {
    if (editingItems.length === 0) return alert("Bill must have at least one item.");
    
    // Calculate new values
    const newTotalAmount = editingItems.reduce((acc, item) => acc + (parseFloat(item.rateToUse) * parseFloat(item.qty)), 0);
    const paidAmount = parseFloat(itemsBill.paid_amount || 0);
    
    let newStatus = itemsBill.status;
    let finalPaid = paidAmount;
    let newPending = newTotalAmount - paidAmount;
    if (newPending <= 0) {
      newStatus = "paid";
      finalPaid = newTotalAmount;
      newPending = 0;
    } else if (paidAmount > 0) {
      newStatus = "partially_paid";
    } else {
      newStatus = "unpaid";
    }

    // Optimistic Update
    setIsEditItemsModalOpen(false);
    
    // Create new bill items array for optimistic UI
    const newBillItems = editingItems.map(i => ({
      product_id: i.product_id,
      quantity: parseFloat(i.qty),
      rate: parseFloat(i.rateToUse),
      amount: parseFloat(i.qty) * parseFloat(i.rateToUse)
    }));

    setBills(prev => prev.map(b => b.id === itemsBill.id ? { 
      ...b, 
      total_amount: newTotalAmount, 
      paid_amount: finalPaid, 
      pending_amount: newPending, 
      status: newStatus,
      bill_items: newBillItems
    } : b));
    const currentItemsBill = itemsBill;
    
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/billing/${currentItemsBill.id}/full`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          customer_id: itemsBill.customer_id,
          status: newStatus,
          total_amount: newTotalAmount,
          paid_amount: finalPaid,
          pending_amount: newPending,
          items: newBillItems
        })
      });
      if (!res.ok) {
        alert("Warning: Failed to save changes to the server. Page will reload.");
        window.location.reload();
      }
    } catch (err) {
      alert("Network Error: Could not connect to the server.");
      window.location.reload();
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Optimistic UI
    setIsEditModalOpen(false);
    setBills(prev => prev.map(b => b.id === editingBill.id ? {
      ...b,
      status: editingBill.status,
      paid_amount: parseFloat(editingBill.paid_amount),
      pending_amount: parseFloat(editingBill.pending_amount)
    } : b));
    
    const token = localStorage.getItem("token");
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/billing/${editingBill.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          status: editingBill.status,
          paid_amount: parseFloat(editingBill.paid_amount),
          pending_amount: parseFloat(editingBill.pending_amount)
        })
      });
    } catch (err) {}
  };

  const handlePaidChange = (newPaid: string) => {
    const paid = parseFloat(newPaid) || 0;
    const grandTotal = editingBill.grand_total;
    const pending = Math.max(0, grandTotal - paid);
    let status = paid >= grandTotal ? "paid" : paid > 0 ? "partially_paid" : "unpaid";
    setEditingBill({ ...editingBill, paid_amount: newPaid, pending_amount: pending.toFixed(2), status });
  };

  // Summary totals
  const totalPending = bills.reduce((s, b) => s + parseFloat(b.pending_amount || 0), 0);
  const totalPaid = bills.reduce((s, b) => s + parseFloat(b.paid_amount || 0), 0);

  const generatePDF = async (bill: any, customer: any) => {
    // enrich items with product info
    const enrichedItems = (bill.bill_items || []).map((item: any) => {
      const prod = products.find(p => p.id === item.product_id);
      return {
        ...item,
        product_name: prod ? prod.product_name : `Product ${item.product_id}`,
        tamil_name: prod ? prod.tamil_name : "",
      };
    });
    
    await generateBillPDF(bill, customer, enrichedItems);
  };

  const shareToWhatsApp = (bill: any, customer: any) => {
    if (!customer || !customer.phone_number) {
      alert("Customer phone number not available.");
      return;
    }
    const phone = customer.phone_number.replace(/\D/g, "");
    const waPhone = phone.startsWith("91") ? phone : (phone.length === 10 ? `91${phone}` : phone);
    
    const text = `*SAKTHI SPICES*\n\nHello ${customer.customer_name},\n\nHere are the details for your recent purchase (Bill #${bill.id}):\n\n*Total Amount:* Rs. ${bill.total_amount}\n*Paid:* Rs. ${bill.paid_amount || 0}\n*Pending:* Rs. ${bill.pending_amount}\n\nThank you for choosing Sakthi Spices!`;
    const encodedText = encodeURIComponent(text);
    
    window.open(`https://wa.me/${waPhone}?text=${encodedText}`, "_blank");
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3"><Receipt className="w-8 h-8 text-primary" /> Bills History</h1>
          <p className="text-muted-foreground">View and update all customer bills</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-l-gray-400">
          <p className="text-xs font-medium text-gray-500 mb-1">Total Bills</p>
          <p className="text-2xl font-bold text-gray-900">{bills.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-l-red-400">
          <p className="text-xs font-medium text-gray-500 mb-1">Total Pending</p>
          <p className="text-2xl font-bold text-red-600">₹{totalPending.toFixed(0)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-l-emerald-400">
          <p className="text-xs font-medium text-gray-500 mb-1">Total Collected</p>
          <p className="text-2xl font-bold text-emerald-600">₹{totalPaid.toFixed(0)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-l-amber-400">
          <p className="text-xs font-medium text-gray-500 mb-1">Partially Paid</p>
          <p className="text-2xl font-bold text-amber-600">{counts.partially_paid}</p>
        </div>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-0">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            {STATUS_TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = statusTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                    isActive
                      ? tab.id === "unpaid" ? "bg-red-500 text-white border-red-500 shadow-sm"
                      : tab.id === "partially_paid" ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                      : tab.id === "paid" ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                      : "bg-gray-900 text-white border-gray-900 shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  <span className={`px-1.5 py-0.5 rounded-md text-xs font-bold ${isActive ? "bg-white/20" : "bg-gray-100"}`}>
                    {counts[tab.id as keyof typeof counts]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 pb-2">
            <select 
              className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-black"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
            >
              <option value="all">All Customers</option>
              {customers.map(c => (
                <option key={c.id} value={c.id.toString()}>{c.customer_name}</option>
              ))}
            </select>
            
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Search Bill ID..." 
                className="pl-9 border-gray-200 h-10 text-black bg-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-100 hover:bg-transparent">
                <TableHead>Bill #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBills.map((bill) => {
                const customer = customers.find(c => c.id === bill.customer_id);
                return (
                  <TableRow key={bill.id} className="border-gray-100 hover:bg-gray-50 transition-colors">
                    <TableCell className="font-bold text-gray-900">#{bill.id}</TableCell>
                    <TableCell className="text-gray-500 text-sm">{new Date(bill.bill_date).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell className="font-medium">{customer ? customer.customer_name : `ID: ${bill.customer_id}`}</TableCell>
                    <TableCell className="text-right font-semibold">₹{bill.total_amount}</TableCell>
                    <TableCell className="text-right text-emerald-600 font-semibold">₹{bill.paid_amount || "0"}</TableCell>
                    <TableCell className="text-right text-red-500 font-semibold">₹{bill.pending_amount}</TableCell>
                    <TableCell>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusStyle[bill.status] || "bg-gray-100 text-gray-700"}`}>
                        {statusLabel[bill.status] || bill.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button onClick={() => openEditModal(bill)} variant="outline" size="sm" className="h-8 border-gray-200 hover:bg-gray-50 text-gray-700">
                        <FileEdit className="w-3.5 h-3.5 mr-1.5" /> Payment
                      </Button>
                      <Button onClick={() => openEditItemsModal(bill)} variant="outline" size="sm" className="h-8 border-blue-200 hover:bg-blue-50 text-blue-600">
                        <FileEdit className="w-3.5 h-3.5 mr-1.5" /> Items
                      </Button>
                      <Button onClick={() => generatePDF(bill, customer)} variant="outline" size="sm" className="h-8 border-red-200 hover:bg-red-50 text-red-600">
                        <FileEdit className="w-3.5 h-3.5 mr-1.5" /> PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredBills.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    No bills found for this filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Bill Modal */}
      {isEditModalOpen && editingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Edit Payment — Bill #{editingBill.id}</h2>
                <p className="text-sm text-gray-500 mt-0.5">Update how much the customer has paid</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-5">
              <div className="bg-gray-50 rounded-xl p-4 flex justify-between items-center border border-gray-100">
                <span className="text-gray-500 font-medium">Total Bill Amount</span>
                <span className="text-2xl font-bold text-gray-900">₹{editingBill.total_amount}</span>
              </div>

              {/* Quick status buttons */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Mark as</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "unpaid", label: "Not Paid", paid: "0" },
                    { id: "partially_paid", label: "Partial" },
                    { id: "paid", label: "Fully Paid", paid: editingBill.total_amount },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        if (opt.paid !== undefined) handlePaidChange(opt.paid);
                        else setEditingBill({ ...editingBill, status: opt.id });
                      }}
                      className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                        editingBill.status === opt.id
                          ? opt.id === "unpaid" ? "border-red-400 bg-red-50 text-red-700"
                          : opt.id === "partially_paid" ? "border-amber-400 bg-amber-50 text-amber-700"
                          : "border-emerald-400 bg-emerald-50 text-emerald-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Amount Paid (₹)</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    type="number" step="0.01" required
                    value={editingBill.paid_amount}
                    onChange={e => handlePaidChange(e.target.value)}
                    className="pl-8 text-black"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl bg-red-50 border border-red-100">
                <span className="text-sm font-medium text-red-700">Remaining Pending</span>
                <span className="text-lg font-bold text-red-700">₹{editingBill.pending_amount}</span>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)} className="flex-1">Cancel</Button>
                <Button type="submit" className="flex-1 bg-[#1a1752] hover:bg-[#2a267c] text-white">Save Payment</Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Bill Items Modal */}
      {isEditItemsModalOpen && itemsBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b flex justify-between items-center bg-gray-50 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Edit Items — Bill #{itemsBill.id}</h2>
                <p className="text-sm text-gray-500 mt-0.5">Add, remove, or change product quantities</p>
              </div>
              <button onClick={() => setIsEditItemsModalOpen(false)} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto space-y-6 bg-gray-50/50">
              
              {/* Add Product Section */}
              <div className="flex gap-3 items-end bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex-1 space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Add Product to Bill</label>
                  <select 
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:border-primary text-sm text-black"
                    value={selectedProductId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedProductId(val);
                      if (val) handleAddItem(val);
                    }}
                  >
                    <option value="">-- Select Product --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id.toString()}>{p.product_name} - ₹{p.default_selling_price}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items List */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="w-24 text-center">Rate</TableHead>
                      <TableHead className="w-32 text-center">Qty</TableHead>
                      <TableHead className="w-24 text-right">Total</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editingItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium text-gray-900">{item.product_name}</TableCell>
                        <TableCell className="text-center">
                          <Input 
                            type="number" step="0.01" 
                            className="h-8 text-center text-black px-1"
                            value={item.rateToUse}
                            onChange={(e) => {
                              setEditingItems(prev => prev.map((it, i) => i === index ? { ...it, rateToUse: parseFloat(e.target.value) || 0 } : it));
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
                            <button type="button" onClick={() => {
                              setEditingItems(prev => prev.map((it, i) => i === index ? { ...it, qty: Math.max(1, parseFloat(it.qty) - 1) } : it));
                            }} className="w-6 h-6 rounded bg-white border flex items-center justify-center text-gray-600 hover:bg-gray-100 text-lg leading-none shrink-0">-</button>
                            <Input 
                              type="number" 
                              className="h-6 w-12 text-center border-0 bg-transparent p-0 focus-visible:ring-0 text-black font-semibold"
                              value={item.qty}
                              onChange={(e) => {
                                setEditingItems(prev => prev.map((it, i) => i === index ? { ...it, qty: Math.max(1, parseFloat(e.target.value) || 1) } : it));
                              }}
                            />
                            <button type="button" onClick={() => {
                              setEditingItems(prev => prev.map((it, i) => i === index ? { ...it, qty: parseFloat(it.qty) + 1 } : it));
                            }} className="w-6 h-6 rounded bg-white border flex items-center justify-center text-gray-600 hover:bg-gray-100 text-sm leading-none shrink-0">+</button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-gray-900">₹{(item.rateToUse * item.qty).toFixed(0)}</TableCell>
                        <TableCell className="text-right">
                          <button type="button" onClick={() => {
                            setEditingItems(prev => prev.filter((_, i) => i !== index));
                          }} className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50">
                            <X className="w-4 h-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {editingItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-gray-500">No items in this bill.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Totals Summary */}
              <div className="flex justify-end">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm min-w-[250px] space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>New Total:</span>
                    <span className="font-bold text-gray-900">₹{editingItems.reduce((acc, item) => acc + (item.rateToUse * item.qty), 0).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Previously Paid:</span>
                    <span className="font-bold text-emerald-600">₹{itemsBill.paid_amount || 0}</span>
                  </div>
                </div>
              </div>

            </div>
            
            <div className="p-4 border-t bg-white flex gap-3 shrink-0">
              <Button type="button" variant="outline" onClick={() => setIsEditItemsModalOpen(false)} className="flex-1">Cancel</Button>
              <Button type="button" onClick={handleEditItemsSubmit} disabled={isSavingItems} className="flex-1 bg-[#1a1752] hover:bg-[#2a267c] text-white">
                {isSavingItems ? "Saving..." : "Update Bill Items"}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
