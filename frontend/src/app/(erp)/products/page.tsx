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
import { Plus, Search, AlertTriangle, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const router = useRouter();

  const fetchProducts = async () => {
    const token = localStorage.getItem("token");
    if (!token) return router.push("/");
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      } else if (res.status === 403 || res.status === 401) {
        alert("Account pending approval or unauthorized");
        router.push("/");
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [router]);

  const handleAddProduct = async () => {
    const name = window.prompt("Enter product name (English):");
    if (!name) return;
    const price = window.prompt("Enter default selling price:");
    const stock = window.prompt("Enter initial stock (pcs):");
    
    const token = localStorage.getItem("token");
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/products`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}` 
      },
      body: JSON.stringify({
        product_name: name,
        tamil_name: "",
        category: "Spices",
        default_selling_price: parseFloat(price || "0"),
        unit: "pcs",
        current_stock: parseFloat(stock || "0"),
        minimum_stock: 10
      })
    });
    
    if (res.ok) {
      fetchProducts();
    } else {
      alert("Failed to add product");
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    const token = localStorage.getItem("token");
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/products/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.ok) {
      fetchProducts();
    } else {
      alert("Failed to delete. Only admins can delete products.");
    }
  };

  const openEditModal = (product: any) => {
    setEditingProduct({
      id: product.id,
      product_name: product.product_name,
      default_selling_price: product.default_selling_price,
      current_stock: product.current_stock
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/products/${editingProduct.id}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}` 
      },
      body: JSON.stringify({
        product_name: editingProduct.product_name,
        tamil_name: "",
        category: "Spices",
        default_selling_price: parseFloat(editingProduct.default_selling_price),
        unit: "pcs",
        current_stock: parseFloat(editingProduct.current_stock),
        minimum_stock: 10
      })
    });
    if (res.ok) {
      fetchProducts();
      setIsEditModalOpen(false);
    } else {
      alert("Failed to update product");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Products Inventory</h1>
        <Button onClick={handleAddProduct} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" /> Add Product
        </Button>
      </div>

      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Inventory List</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search products..." 
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
                <TableHead>English Name</TableHead>
                <TableHead>Tamil Name</TableHead>
                <TableHead>Default Price</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.filter(p => p.product_name.toLowerCase().includes(search.toLowerCase())).map((product) => (
                <TableRow key={product.id} className="border-white/10 hover:bg-white/5 transition-colors">
                  <TableCell className="font-medium">{product.product_name}</TableCell>
                  <TableCell>{product.tamil_name}</TableCell>
                  <TableCell>₹{product.default_selling_price} / {product.unit}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{product.current_stock} {product.unit}</span>
                      {product.current_stock <= product.minimum_stock && (
                        <AlertTriangle className="w-4 h-4 text-primary" title="Low Stock" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 bg-emerald-500/20 text-emerald-500 rounded-full text-xs">
                      {product.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button onClick={() => openEditModal(product)} variant="outline" size="sm" className="bg-white/5 border-white/10 h-8">
                      Edit
                    </Button>
                    <Button onClick={() => handleDeleteProduct(product.id)} variant="destructive" size="sm" className="h-8">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Product Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Edit Product</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-700 transition-colors">
                ✕
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Product Name</label>
                <Input 
                  required
                  value={editingProduct.product_name}
                  onChange={e => setEditingProduct({...editingProduct, product_name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Default Selling Price (₹)</label>
                <Input 
                  type="number"
                  step="0.01"
                  required
                  value={editingProduct.default_selling_price}
                  onChange={e => setEditingProduct({...editingProduct, default_selling_price: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Current Stock</label>
                <Input 
                  type="number"
                  step="0.01"
                  required
                  value={editingProduct.current_stock}
                  onChange={e => setEditingProduct({...editingProduct, current_stock: e.target.value})}
                />
              </div>

              <div className="pt-4 flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#1a1752] hover:bg-[#2a267c] text-white">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
