"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AreaChart, Area, BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis 
} from "recharts";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { IndianRupee, TrendingUp, ReceiptText, AlertCircle, Users } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [kpis, setKpis] = useState<any>({
    todays_sales: 0,
    this_month_sales: 0,
    total_sales: 0,
    todays_collection: 0,
    todays_pending: 0,
    total_outstanding: 0,
    low_stock_count: 0,
    total_customers: 0,
    total_stock_value: 0,
    salesData: []
  });

  useEffect(() => {
    const fetchKPIs = async () => {
      const token = localStorage.getItem("token");
      if (!token) return router.push("/");
      
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/dashboard/kpis`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setKpis(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchKPIs();
  }, [router]);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]">Analytics Dashboard</h1>
          <p className="text-sm text-gray-500">Business performance overview</p>
        </div>
      </div>

      {/* KPI Cards (Light theme with left borders) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        
        <Card className="rounded-xl border border-gray-200 shadow-sm overflow-hidden relative">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600"></div>
          <CardContent className="p-5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Today's Sales</p>
            <h3 className="text-2xl font-bold text-blue-600 mb-1">₹{kpis.todays_sales}</h3>
            <p className="text-[10px] text-gray-400">Total generated today</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-gray-200 shadow-sm overflow-hidden relative">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
          <CardContent className="p-5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">This Month Sales</p>
            <h3 className="text-2xl font-bold text-indigo-500 mb-1">₹{kpis.this_month_sales || 0}</h3>
            <p className="text-[10px] text-gray-400">
              {kpis.month_growth_pct !== undefined ? (
                <span className={kpis.month_growth_pct >= 0 ? "text-green-500 font-semibold" : "text-red-500 font-semibold"}>
                  {kpis.month_growth_pct >= 0 ? '↑' : '↓'} {Math.abs(kpis.month_growth_pct)}% 
                </span>
              ) : null}
              {kpis.month_growth_pct !== undefined ? " vs last month" : "Total this month"}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-gray-200 shadow-sm overflow-hidden relative">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-600"></div>
          <CardContent className="p-5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Sales</p>
            <h3 className="text-2xl font-bold text-purple-600 mb-1">₹{kpis.total_sales || 0}</h3>
            <p className="text-[10px] text-gray-400">All-time sales</p>
          </CardContent>
        </Card>
        
        <Card className="rounded-xl border border-gray-200 shadow-sm overflow-hidden relative">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
          <CardContent className="p-5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Collections</p>
            <h3 className="text-2xl font-bold text-emerald-500 mb-1">₹{kpis.todays_collection}</h3>
            <p className="text-[10px] text-gray-400">Received today</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-gray-200 shadow-sm overflow-hidden relative">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
          <CardContent className="p-5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Pending</p>
            <h3 className="text-2xl font-bold text-red-500 mb-1">₹{kpis.total_outstanding || 0}</h3>
            <p className="text-[10px] text-gray-400">Requires follow-up</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-gray-200 shadow-sm overflow-hidden relative">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-400"></div>
          <CardContent className="p-5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Customers</p>
            <h3 className="text-2xl font-bold text-gray-600 mb-1">{kpis.total_customers !== undefined ? kpis.total_customers : 0}</h3>
            <p className="text-[10px] text-gray-400">Active accounts</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-gray-200 shadow-sm overflow-hidden relative">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#8B5CF6]"></div>
          <CardContent className="p-5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Low Stock</p>
            <h3 className="text-2xl font-bold text-[#8B5CF6] mb-1">{kpis.low_stock_count}</h3>
            <p className="text-[10px] text-gray-400">Products to refill</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-gray-200 shadow-sm overflow-hidden relative">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-500"></div>
          <CardContent className="p-5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Stock Value</p>
            <h3 className="text-2xl font-bold text-teal-500 mb-1">₹{kpis.total_stock_value || 0}</h3>
            <p className="text-[10px] text-gray-400">Current inventory worth</p>
          </CardContent>
        </Card>


      </div>

      <div className="grid gap-6 grid-cols-1">
        
        {/* Area Chart */}
        <Card className="rounded-xl border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-700">Sales vs Collections Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-0">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={kpis.salesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCollections" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="sales" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                  <Area type="monotone" dataKey="collection" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCollections)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

      </div>
      
    </div>
  );
}
