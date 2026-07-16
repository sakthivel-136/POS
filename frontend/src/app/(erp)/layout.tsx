"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  ReceiptText, 
  Settings,
  LogOut,
  Menu,
  X,
  BarChart
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function ERPLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/");
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Billing (POS)", href: "/billing", icon: ReceiptText },
    { name: "Orders", href: "/orders", icon: Package },
    { name: "Customers", href: "/customers", icon: Users },
    { name: "Bills History", href: "/bills", icon: ReceiptText },
    { name: "Products", href: "/products", icon: Package },
    { name: "Reports", href: "/reports", icon: BarChart },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 shadow-sm transform transition-transform duration-300 lg:relative lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-[#1e293b] tracking-tight">
              SAKTHI <span className="text-[#8B5CF6]">ERP</span>
            </h1>
            <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          <nav className="flex-1 space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.name} href={item.href}>
                  <div className={cn(
                    "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300",
                    isActive 
                      ? "bg-[#EEF2FF] text-[#4F46E5] font-semibold shadow-sm" 
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  )}>
                    <Icon className={cn("w-5 h-5", isActive ? "text-[#4F46E5]" : "text-gray-400")} />
                    <span>{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="pt-6 mt-6 border-t border-gray-100">
            <div className="flex items-center space-x-3 px-4 py-3 mb-4 rounded-xl bg-gray-50 border border-gray-100">
              <div className="w-10 h-10 rounded-full bg-[#4F46E5]/10 flex items-center justify-center text-[#4F46E5] font-bold">
                SA
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Sakthi Admin</p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
            </div>
            
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center p-3 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-300 shadow-sm"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm">
          <h1 className="text-xl font-bold text-[#1e293b]">SAKTHI ERP</h1>
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
