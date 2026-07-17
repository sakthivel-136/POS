"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Download, Settings as SettingsIcon, Shield, Database, CheckCircle, XCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('data');
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState("staff");
  const [staffPassword, setStaffPassword] = useState("");
  const router = useRouter();

  const fetchPendingUsers = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/admin/pending_users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setPendingUsers(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const openRoleModal = (id: number) => {
    setSelectedUserId(id);
    setSelectedRole("staff");
    setStaffPassword("");
    setRoleModalOpen(true);
  };

  const handleApproveConfirm = async () => {
    if (selectedUserId === null) return;
    if (selectedRole !== "customer" && !staffPassword) {
      alert("Please provide a password for the staff member.");
      return;
    }
    const token = localStorage.getItem("token");
    try {
      let url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/admin/approve_user/${selectedUserId}?action=approve&role=${selectedRole}`;
      if (selectedRole !== "customer" && staffPassword) {
        url += `&password=${encodeURIComponent(staffPassword)}`;
      }
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchPendingUsers();
        setRoleModalOpen(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (id: number) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/admin/approve_user/${id}?action=reject&role=staff`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchPendingUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async () => {
    if (!file) return alert("Please select a file first.");
    
    setIsUploading(true);
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/csv/upload`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData,
      });
      
      const data = await res.json();
      if (res.ok) {
        alert(`Success! Added ${data.customers_added} customers and ${data.products_added} products.`);
        setFile(null);
      } else {
        alert("Upload failed: " + data.detail);
      }
    } catch (err) {
      alert("Network error.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]">System Settings</h1>
          <p className="text-sm text-gray-500">Manage data, users, and ERP configuration</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Nav */}
        <div className="space-y-2">
          <button 
            onClick={() => setActiveTab('data')}
            className={`w-full text-left px-4 py-3 rounded-lg font-medium flex items-center transition-colors ${activeTab === 'data' ? 'bg-[#EEF2FF] text-[#1a1752]' : 'hover:bg-gray-100 text-gray-600'}`}
          >
            <Database className="w-4 h-4 mr-3" /> Data Management
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`w-full text-left px-4 py-3 rounded-lg font-medium flex items-center transition-colors ${activeTab === 'security' ? 'bg-[#EEF2FF] text-[#1a1752]' : 'hover:bg-gray-100 text-gray-600'}`}
          >
            <Shield className="w-4 h-4 mr-3" /> Security & Access
          </button>
          <button 
            onClick={() => setActiveTab('general')}
            className={`w-full text-left px-4 py-3 rounded-lg font-medium flex items-center transition-colors ${activeTab === 'general' ? 'bg-[#EEF2FF] text-[#1a1752]' : 'hover:bg-gray-100 text-gray-600'}`}
          >
            <SettingsIcon className="w-4 h-4 mr-3" /> General Preferences
          </button>
        </div>

        {/* Main Settings Area */}
        <div className="md:col-span-2 space-y-6">
          
          {activeTab === 'data' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
              <Card className="rounded-xl border border-gray-200 shadow-sm">
                <CardHeader className="border-b border-gray-100 bg-gray-50/50">
                  <CardTitle className="text-lg">CSV Data Import</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <p className="text-sm text-gray-500 mb-4">
                    Upload your Universal CSV template to bulk insert Customers and Products into the database.
                  </p>
                  
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                    <input 
                      type="file" 
                      accept=".csv"
                      className="hidden" 
                      id="csv-upload"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    <label htmlFor="csv-upload" className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700">
                      {file ? file.name : "Click to select a CSV file"}
                    </label>
                    <p className="text-xs text-gray-400 mt-2">Only .csv files are supported</p>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button 
                      onClick={handleFileUpload} 
                      disabled={!file || isUploading}
                      className="bg-[#1a1752] hover:bg-[#2a267c] text-white"
                    >
                      {isUploading ? "Uploading..." : "Process Upload"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl border border-gray-200 shadow-sm">
                <CardHeader className="border-b border-gray-100 bg-gray-50/50">
                  <CardTitle className="text-lg">CSV Data Export</CardTitle>
                </CardHeader>
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-700">Download Template</h4>
                    <p className="text-sm text-gray-500">Get the blank universal template to fill out.</p>
                  </div>
                  <a href="/universal_template.csv" download>
                    <Button variant="outline" className="border-gray-200 hover:bg-gray-50">
                      <Download className="w-4 h-4 mr-2" /> Download CSV
                    </Button>
                  </a>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <Card className="rounded-xl border border-gray-200 shadow-sm">
                <CardHeader className="border-b border-gray-100 bg-gray-50/50">
                  <CardTitle className="text-lg flex items-center"><Shield className="w-5 h-5 mr-2 text-blue-600"/> Pending User Approvals</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {pendingUsers.length === 0 ? (
                    <p className="text-sm text-gray-500">No pending users awaiting approval.</p>
                  ) : (
                    <div className="space-y-4">
                      {pendingUsers.map(user => (
                        <div key={user.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg bg-gray-50/50">
                          <div>
                            <p className="font-semibold text-gray-900">{user.username}</p>
                            <p className="text-xs text-gray-500">Requested Access</p>
                          </div>
                          <div className="space-x-2">
                            <Button onClick={() => openRoleModal(user.id)} size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white">
                              <CheckCircle className="w-4 h-4 mr-1" /> Approve
                            </Button>
                            <Button onClick={() => handleReject(user.id)} size="sm" variant="destructive">
                              <XCircle className="w-4 h-4 mr-1" /> Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <Card className="rounded-xl border border-gray-200 shadow-sm">
                <CardHeader className="border-b border-gray-100 bg-gray-50/50">
                  <CardTitle className="text-lg flex items-center"><SettingsIcon className="w-5 h-5 mr-2 text-blue-600"/> General ERP Preferences</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-2">Default Currency</label>
                        <select className="w-full border rounded-lg p-2.5 bg-gray-50">
                          <option>INR (₹)</option>
                          <option>USD ($)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-2">Language</label>
                        <select className="w-full border rounded-lg p-2.5 bg-gray-50">
                          <option>English</option>
                          <option>Tamil</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-2">Timezone</label>
                      <select className="w-full border rounded-lg p-2.5 bg-gray-50">
                        <option>Asia/Kolkata (IST)</option>
                      </select>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <Button className="bg-[#1a1752] hover:bg-[#2a267c] text-white">
                        Save Preferences
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

        </div>
      </div>

      {/* Role Assignment Modal */}
      {roleModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Assign Role</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Select Role for User</label>
                <select 
                  className="w-full border rounded-lg p-2.5 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  <option value="customer">Customer</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {selectedRole !== "customer" && (
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Set Password for Staff/Admin</label>
                  <input 
                    type="text"
                    placeholder="Enter a secure password..."
                    className="w-full border rounded-lg p-2.5 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">This user will use this password to log in.</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setRoleModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleApproveConfirm} className="bg-blue-600 hover:bg-blue-700 text-white">
                Confirm & Approve
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
