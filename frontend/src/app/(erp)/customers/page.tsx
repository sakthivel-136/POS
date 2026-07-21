"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Plus, Search, IndianRupee, Trash2, X, Tag } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    name: "", 
    phone: "", 
    phone2: "",
    phone3: "",
    phone4: "",
    phone5: "",
    location: "",
    pending_balance: ""
  });
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [customPrices, setCustomPrices] = useState<any>({});
  
  const [isBillsModalOpen, setIsBillsModalOpen] = useState(false);
  const [selectedCustomerBills, setSelectedCustomerBills] = useState<any[]>([]);
  
  const router = useRouter();

  const fetchCustomers = async () => {
    const token = localStorage.getItem("token");
    if (!token) return router.push("/");
    
    try {
      const [custRes, prodRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/customers`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/products`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      if (custRes.ok) setCustomers(await custRes.json());
      if (prodRes.ok) setProducts(await prodRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [router]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    
    // Optimistic UI Update
    setIsModalOpen(false);
    const method = editingCustomerId ? "PUT" : "POST";
    const url = editingCustomerId 
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/customers/${editingCustomerId}`
      : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/customers/`;
      
    if (editingCustomerId) {
      setCustomers(prev => prev.map(c => c.id === editingCustomerId ? {
        ...c, 
        customer_name: formData.name, 
        phone_number: formData.phone,
        address: formData.location,
        credit_limit: parseFloat(formData.pending_balance) || 0
      } : c));
    } else {
      // Fake ID for optimistic insert
      const fakeId = Math.random() * -10000;
      setCustomers(prev => [{
        id: fakeId,
        customer_name: formData.name, 
        phone_number: formData.phone,
        address: formData.location,
        credit_limit: parseFloat(formData.pending_balance) || 0,
        outstanding_balance: 0
      }, ...prev]);
    }
    
    setEditingCustomerId(null);
    setFormData({ name: "", phone: "", phone2: "", phone3: "", phone4: "", phone5: "", location: "", pending_balance: "" });

    try {
      const res = await fetch(url, {
        method: method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({
          user_id: null,
          customer_name: formData.name,
          phone_number: formData.phone || null,
          phone_number_2: formData.phone2 || null,
          phone_number_3: formData.phone3 || null,
          phone_number_4: formData.phone4 || null,
          phone_number_5: formData.phone5 || null,
          address: formData.location,
          credit_limit: parseFloat(formData.pending_balance) || 0
        })
      });
      if (res.ok && !editingCustomerId) {
        // Re-fetch to get real ID
        fetchCustomers();
      }
    } catch (error) {}
  };

  const handleDeleteCustomer = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this customer?")) return;
    setCustomers(prev => prev.filter(c => c.id !== id));
    
    const token = localStorage.getItem("token");
    await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/customers/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
  };

  const openPriceModal = async (customer: any) => {
    setSelectedCustomer(customer);
    setIsPriceModalOpen(true);
    
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/customers/${customer.id}/prices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const prices = await res.json();
        const priceMap: any = {};
        prices.forEach((p: any) => {
          priceMap[p.product_id] = p.custom_price;
        });
        setCustomPrices(priceMap);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveCustomPrice = async (productId: number, price: number) => {
    if (!selectedCustomer) return;
    const token = localStorage.getItem("token");
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/customers/${selectedCustomer.id}/prices`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({
          product_id: productId,
          custom_price: price
        })
      });
      if (res.ok) {
        setCustomPrices({ ...customPrices, [productId]: price });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openBillsModal = async (customer: any) => {
    setSelectedCustomer(customer);
    setIsBillsModalOpen(true);
    
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/customers/${customer.id}/bills`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSelectedCustomerBills(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Customers</h1>
        <Button onClick={() => { setEditingCustomerId(null); setFormData({ name: "", phone: "", phone2: "", phone3: "", phone4: "", phone5: "", location: "", pending_balance: "" }); setIsModalOpen(true); }} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" /> Add Customer
        </Button>
      </div>

      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Customer Directory</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search customers..." 
              className="pl-8 bg-white/5 border-white/10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Pending Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.filter(c => c.customer_name.toLowerCase().includes(search.toLowerCase())).map((customer) => (
                <TableRow key={customer.id} className="border-white/10 hover:bg-white/5 transition-colors">
                  <TableCell className="font-medium">{customer.customer_name}</TableCell>
                  <TableCell>{customer.address || "N/A"}</TableCell>
                  <TableCell>{customer.phone_number}</TableCell>
                  <TableCell className="text-destructive font-semibold">₹{customer.current_balance}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-500">
                      Active
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button onClick={() => openBillsModal(customer)} variant="outline" size="sm" className="bg-white/5 border-white/10 h-8 text-emerald-600 hover:text-emerald-700">
                      Bills
                    </Button>
                    <Button onClick={() => openPriceModal(customer)} variant="outline" size="sm" className="bg-white/5 border-white/10 h-8 text-blue-600 hover:text-blue-700">
                      <Tag className="w-4 h-4 mr-1" /> Rates
                    </Button>
                    <Button onClick={() => {
                      setEditingCustomerId(customer.id);
                      setFormData({
                        name: customer.customer_name || "",
                        phone: customer.phone_number || "",
                        phone2: customer.phone_number_2 || "",
                        phone3: customer.phone_number_3 || "",
                        phone4: customer.phone_number_4 || "",
                        phone5: customer.phone_number_5 || "",
                        location: customer.address || "",
                        pending_balance: (customer.current_balance || 0).toString()
                      });
                      setIsModalOpen(true);
                    }} variant="outline" size="sm" className="bg-white/5 border-white/10 h-8">
                      Edit
                    </Button>
                    <Button onClick={() => handleDeleteCustomer(customer.id)} variant="destructive" size="sm" className="h-8">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingCustomerId ? "Edit Customer" : "Add New Customer"}</h2>
              <button onClick={() => { setIsModalOpen(false); setEditingCustomerId(null); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddCustomer} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Customer Name</label>
                <Input 
                  required
                  placeholder="e.g. SK Stores" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-sm font-medium">Primary Phone Number</label>
                <Input 
                  required
                  placeholder="e.g. 9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone 2 (Optional)</label>
                <Input value={formData.phone2} onChange={(e) => setFormData({...formData, phone2: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone 3 (Optional)</label>
                <Input value={formData.phone3} onChange={(e) => setFormData({...formData, phone3: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone 4 (Optional)</label>
                <Input value={formData.phone4} onChange={(e) => setFormData({...formData, phone4: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone 5 (Optional)</label>
                <Input value={formData.phone5} onChange={(e) => setFormData({...formData, phone5: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Location / Address</label>
                <Input 
                  placeholder="e.g. Madurai" 
                  value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Pending Balance (₹)</label>
                <Input 
                  type="number"
                  placeholder="e.g. 500" 
                  value={formData.pending_balance}
                  onChange={e => setFormData({...formData, pending_balance: e.target.value})}
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {isSaving ? "Saving..." : "Save Customer"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Prices Modal */}
      {isPriceModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-xl font-bold">Custom Rates</h2>
                <p className="text-sm text-muted-foreground">{selectedCustomer.customer_name}</p>
              </div>
              <button onClick={() => setIsPriceModalOpen(false)} className="text-gray-400 hover:text-gray-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              {products.map(product => (
                <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="font-semibold">{product.product_name}</p>
                    <p className="text-xs text-muted-foreground">Default: ₹{product.default_selling_price || 0}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-500">Custom Rate (₹):</label>
                    <Input 
                      type="number"
                      placeholder="e.g. 2400"
                      className="w-32 bg-white"
                      value={customPrices[product.id] || ""}
                      onChange={(e) => setCustomPrices({...customPrices, [product.id]: Number(e.target.value)})}
                      onBlur={(e) => {
                        if (e.target.value) {
                          saveCustomPrice(product.id, Number(e.target.value));
                        }
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* View Bills Modal */}
      {isBillsModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-xl font-bold">Previous Bills</h2>
                <p className="text-sm text-muted-foreground">{selectedCustomer.customer_name}</p>
              </div>
              <button onClick={() => setIsBillsModalOpen(false)} className="text-gray-400 hover:text-gray-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              {selectedCustomerBills.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No previous bills found for this customer.</div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead>Bill ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Pending</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedCustomerBills.map(bill => (
                        <TableRow key={bill.id}>
                          <TableCell className="font-medium">#{bill.id}</TableCell>
                          <TableCell>{new Date(bill.bill_date).toLocaleDateString()}</TableCell>
                          <TableCell>₹{bill.total_amount}</TableCell>
                          <TableCell className="text-emerald-600">₹{bill.paid_amount}</TableCell>
                          <TableCell className="text-destructive font-semibold">₹{bill.pending_amount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
