"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, UserCog, User, ShieldAlert, ShieldCheck } from "lucide-react";

export default function StaffManagementPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Basic frontend check - if not SAKTHI, redirect away immediately
    const username = localStorage.getItem("username")?.toUpperCase();
    if (username !== "SAKTHI") {
      router.push("/dashboard");
      return;
    }

    fetchUsers();
  }, [router]);

  const fetchUsers = async () => {
    setIsLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setUsers(await res.json());
      } else {
        // Forbidden or error
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateRole = async (userId: number, newRole: string) => {
    if (!window.confirm(`Are you sure you want to change this user's role to ${newRole.toUpperCase()}?`)) return;
    
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/users/${userId}/role?role=${newRole}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        fetchUsers(); // refresh the list
      } else {
        const error = await res.json();
        alert(error.detail || "Failed to update role");
      }
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred");
    }
  };

  if (isLoading) return <div className="p-8 text-center">Loading Staff Management...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UserCog className="w-8 h-8 text-indigo-600" />
            Staff & Admin Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage system access roles for your employees</p>
        </div>
      </div>

      <Card className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-500" />
            Active Team Members
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/30">
                <TableHead className="font-semibold">User ID</TableHead>
                <TableHead className="font-semibold">Username / Phone</TableHead>
                <TableHead className="font-semibold">Current Role</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className="hover:bg-gray-50/50 transition-colors">
                  <TableCell className="font-medium text-gray-500">#{user.id}</TableCell>
                  <TableCell className="font-semibold">{user.username}</TableCell>
                  <TableCell>
                    {user.role === 'admin' ? (
                      <Badge variant="default" className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-none">
                        <ShieldCheck className="w-3 h-3 mr-1" /> Admin
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-100 text-gray-700 border-none">
                        <User className="w-3 h-3 mr-1" /> Staff
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={user.status === 'active' ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : 'text-amber-600 border-amber-200 bg-amber-50'}>
                      {user.status || 'active'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {user.username.toUpperCase() === 'SAKTHI' ? (
                      <span className="text-xs text-gray-400 font-medium italic">Master Admin (Fixed)</span>
                    ) : (
                      <div className="flex justify-end gap-2">
                        {user.role === 'staff' ? (
                          <Button 
                            onClick={() => updateRole(user.id, 'admin')}
                            size="sm" 
                            variant="outline"
                            className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 border-indigo-200"
                          >
                            Promote to Admin
                          </Button>
                        ) : (
                          <Button 
                            onClick={() => updateRole(user.id, 'staff')}
                            size="sm" 
                            variant="outline"
                            className="bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 border-amber-200"
                          >
                            <ShieldAlert className="w-4 h-4 mr-1" /> Demote to Staff
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    No staff or admins found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
