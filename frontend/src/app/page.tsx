"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem("token")) {
      router.push("/dashboard");
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const formData = new URLSearchParams();
      formData.append("username", username);
      // For unified login, if the user does not provide a password, we send "nopass".
      // The backend will bypass password check for customers (since they have no password_hash).
      // However, if it's an admin/staff account and they provide "nopass", it will correctly fail.
      formData.append("password", password || "nopass");

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("token", data.access_token);
        
        // Check user role
        const meRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/users/me`, {
          headers: { Authorization: `Bearer ${data.access_token}` }
        });
        
        if (meRes.ok) {
          const meData = await meRes.json();
          localStorage.setItem("username", meData.username);
          if (meData.role === "admin" || meData.role === "staff") {
            router.push("/dashboard");
          } else if (meData.role === "customer") {
            localStorage.setItem("portal_token", data.access_token);
            router.push("/portal");
          }
        } else {
          router.push("/dashboard"); // fallback
        }
      } else {
        const errData = await res.json();
        alert("Login failed: " + errData.detail);
      }
    } catch (err) {
      alert("Network error connecting to backend.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Decorative blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl mix-blend-multiply opacity-70 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl mix-blend-multiply opacity-70 animate-pulse delay-1000" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="glass rounded-3xl p-8 space-y-8 text-center">
          <div className="space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4 border border-primary/20">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Sakthi Spices ERP</h1>
            <p className="text-muted-foreground">Sign in to your account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2 text-left">
              <label className="text-sm font-medium" htmlFor="username">Phone Number or Username</label>
              <Input 
                id="username"
                className="w-full px-4 py-6 rounded-xl border bg-white/5 border-white/10 focus:outline-none focus:ring-2 focus:ring-primary backdrop-blur-sm transition-all"
                placeholder="Enter your phone or username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2 text-left">
              <label className="text-sm font-medium" htmlFor="password">Password (Optional for Customers)</label>
              <Input 
                id="password"
                type="password"
                className="w-full px-4 py-6 rounded-xl border bg-white/5 border-white/10 focus:outline-none focus:ring-2 focus:ring-primary backdrop-blur-sm transition-all"
                placeholder="Leave blank if you are a customer"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full py-6 text-lg rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all bg-primary hover:bg-primary/90 text-primary-foreground mt-4"
              disabled={isLoading}
            >
              {isLoading ? "Authenticating..." : "Sign In"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
