"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, UserCog, User, ShieldAlert, ShieldCheck, MoreVertical, Edit, KeyRound, Trash2 } from "lucide-react";

export default function StaffManagementPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Edit Details State
  const [editUser, setEditUser] = useState<any>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editStatus, setEditStatus] = useState("active");
  const [isEditing, setIsEditing] = useState(false);
  
  // Reset Password State
  const [resetUser, setResetUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  // Dropdown state
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);

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
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateRole = async (userId: number, newRole: string) => {
    setOpenDropdown(null);
    if (!window.confirm(`Are you sure you want to change this user's role to ${newRole.toUpperCase()}?`)) return;
    
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/users/${userId}/role?role=${newRole}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) fetchUsers();
      else {
        const error = await res.json();
        alert(error.detail || "Failed to update role");
      }
    } catch (err) { alert("An unexpected error occurred"); }
  };

  const deleteUser = async (userId: number) => {
    setOpenDropdown(null);
    if (!window.confirm("WARNING: Are you absolutely sure you want to DELETE this user? This cannot be undone.")) return;
    
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchUsers();
      else alert("Failed to delete user");
    } catch (err) { alert("An unexpected error occurred"); }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setIsEditing(true);
    
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/users/${editUser.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ username: editUsername, status: editStatus })
      });
      
      if (res.ok) {
        setEditUser(null);
        fetchUsers();
      } else alert("Failed to update user details");
    } catch (err) { alert("An unexpected error occurred"); }
    finally { setIsEditing(false); }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser || !newPassword) return;
    if (newPassword.length < 6) {
        alert("Password must be at least 6 characters");
        return;
    }
    setIsResetting(true);
    
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/users/${resetUser.id}/reset-password`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: newPassword })
      });
      
      if (res.ok) {
        setResetUser(null);
        setNewPassword("");
        alert("Password reset successfully!");
      } else alert("Failed to reset password");
    } catch (err) { alert("An unexpected error occurred"); }
    finally { setIsResetting(false); }
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
          <p className="text-sm text-gray-500 mt-1">Full control over system access roles and credentials</p>
        </div>
      </div>

      <Card className="rounded-xl border border-gray-200 shadow-sm overflow-visible">
        <CardHeader className="bg-gray-50/50 border-b">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-500" />
            Active Team Members
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-visible">
          <Table className="overflow-visible">
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
                <TableRow key={user.id} className="hover:bg-gray-50/50 transition-colors group">
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
                  <TableCell className="text-right relative overflow-visible">
                    {user.username.toUpperCase() === 'SAKTHI' ? (
                      <span className="text-xs text-gray-400 font-medium italic">Master Admin (Fixed)</span>
                    ) : (
                      <div className="flex justify-end gap-2 relative z-10">
                          {user.role === 'staff' ? (
                              <Button onClick={() => updateRole(user.id, 'admin')} size="sm" variant="outline" className="h-8 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-indigo-200 px-3">
                                  Promote
                              </Button>
                          ) : (
                              <Button onClick={() => updateRole(user.id, 'staff')} size="sm" variant="outline" className="h-8 bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200 px-3">
                                  Demote
                              </Button>
                          )}
                          <Button 
                            onClick={() => { setEditUser(user); setEditUsername(user.username); setEditStatus(user.status || "active"); }} 
                            size="sm" variant="outline" className="h-8 text-gray-700 hover:bg-gray-100 px-3"
                          >
                              Edit
                          </Button>
                          <Button 
                            onClick={() => { setResetUser(user); setNewPassword(""); }} 
                            size="sm" variant="outline" className="h-8 text-gray-700 hover:bg-gray-100 px-3"
                          >
                              Reset Password
                          </Button>
                          <Button 
                            onClick={() => deleteUser(user.id)} 
                            size="sm" variant="outline" className="h-8 text-red-600 hover:bg-red-50 border-red-200 px-3"
                          >
                              Delete
                          </Button>
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

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-xl animate-in zoom-in-95 duration-200">
            <CardHeader className="border-b bg-gray-50">
              <CardTitle>Edit Staff Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Username / Phone Number</label>
                  <Input 
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Account Status</label>
                  <select 
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full h-10 px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <div className="flex gap-3 justify-end mt-6 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
                  <Button type="submit" disabled={isEditing}>
                    {isEditing ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-xl animate-in zoom-in-95 duration-200">
            <CardHeader className="border-b bg-rose-50 text-rose-900">
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5" /> 
                Reset Password
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="mb-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border">
                You are about to securely reset the password for <strong>{resetUser.username}</strong>.
              </div>
              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">New Password (min 6 chars)</label>
                  <Input 
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new strong password"
                    minLength={6}
                    required
                  />
                </div>
                <div className="flex gap-3 justify-end mt-6 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setResetUser(null)}>Cancel</Button>
                  <Button type="submit" disabled={isResetting} className="bg-rose-600 hover:bg-rose-700 text-white">
                    {isResetting ? "Resetting..." : "Confirm Password Reset"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
