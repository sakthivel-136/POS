"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, IndianRupee } from "lucide-react";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0], category: "Rent", amount: "", description: "" });

  const fetchExpenses = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/expenses`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });
      if (res.ok) setExpenses(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const openEditModal = (expense: any) => {
    setEditingExpenseId(expense.id);
    setFormData({
      date: expense.date,
      category: expense.category,
      amount: expense.amount.toString(),
      description: expense.description || ""
    });
    setIsModalOpen(true);
  };

  const handleAddClick = () => {
    setEditingExpenseId(null);
    setFormData({ date: new Date().toISOString().split('T')[0], category: "Rent", amount: "", description: "" });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const token = localStorage.getItem("token");
    const method = editingExpenseId ? "PUT" : "POST";
    const url = editingExpenseId 
        ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/expenses/${editingExpenseId}`
        : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/expenses`;

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...formData, amount: parseFloat(formData.amount) })
      });
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ date: new Date().toISOString().split('T')[0], category: "Rent", amount: "", description: "" });
        setEditingExpenseId(null);
        fetchExpenses();
      } else {
        alert("Failed to save expense.");
      }
    } catch (err) {
      alert("Network Error.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteExpense = async (id: number) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/expenses/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchExpenses();
    } catch (err) {
      alert("Network Error.");
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Business Expenses</h1>
        <Button onClick={handleAddClick} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" /> Add Expense
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">₹{totalExpenses.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Expense History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center">No expenses logged yet</TableCell></TableRow>
              ) : (
                expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                        {expense.category}
                      </span>
                    </TableCell>
                    <TableCell>{expense.description || "-"}</TableCell>
                    <TableCell className="font-semibold text-destructive">₹{expense.amount}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEditModal(expense)} className="text-gray-600 hover:text-gray-900 mr-2">
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteExpense(expense.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Log Expense</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Date</label>
                <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Category</label>
                <select className="w-full border rounded-lg p-2.5 bg-gray-50" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                  <option>Rent</option>
                  <option>Salary</option>
                  <option>Electricity</option>
                  <option>Materials</option>
                  <option>Logistics</option>
                  <option>Food</option>
                  <option>Petrol</option>
                  <option>Repair</option>
                  <option>Stock Purchase</option>
                  <option>Cover</option>
                  <option>Miscellaneous</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Amount (₹)</label>
                <Input type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Description (Optional)</label>
                <Input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Cancel</Button>
                <Button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {isSaving ? "Saving..." : "Save Expense"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
