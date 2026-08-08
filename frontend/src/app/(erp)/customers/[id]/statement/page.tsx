"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Printer, ArrowLeft, Building2, Phone, MapPin, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function CustomerStatementPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [customer, setCustomer] = useState<any>(null);
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const statementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");
      if (!token) return router.push("/");
      
      try {
        // Fetch all customers to find this one
        const custRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/customers`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (custRes.ok) {
          const customers = await custRes.json();
          const found = customers.find((c: any) => c.id.toString() === id);
          if (found) setCustomer(found);
        }

        // Fetch bills for this customer
        const billsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/customers/${id}/bills`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (billsRes.ok) {
          const fetchedBills = await billsRes.json();
          // Sort chronologically (oldest first) to calculate running balance
          fetchedBills.sort((a: any, b: any) => new Date(a.bill_date).getTime() - new Date(b.bill_date).getTime());
          
          let runningBalance = 0;
          const processed = fetchedBills.map((b: any) => {
            const debit = parseFloat(b.total_amount || 0);
            const credit = parseFloat(b.paid_amount || 0);
            runningBalance += (debit - credit);
            return {
              ...b,
              debit,
              credit,
              runningBalance
            };
          });
          
          setBills(processed);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id, router]);

  const handleDownloadPDF = async () => {
    if (!statementRef.current) return;
    setIsGeneratingPDF(true);
    
    try {
      const element = statementRef.current;
      
      // Temporarily modify styles for pure white clean PDF
      const originalBorder = element.style.border;
      const originalShadow = element.style.boxShadow;
      const originalBg = element.style.backgroundColor;
      
      element.style.border = 'none';
      element.style.boxShadow = 'none';
      element.style.backgroundColor = 'white';

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false
      });

      // Restore styles
      element.style.border = originalBorder;
      element.style.boxShadow = originalShadow;
      element.style.backgroundColor = originalBg;

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let y = 0;
      let remaining = imgHeight;
      let sourceY = 0;
      const pageContentHeight = pdfHeight;

      while (remaining > 0) {
        const sliceHeight = Math.min(remaining, pageContentHeight);
        pdf.addImage(imgData, "PNG", 0, y - sourceY, imgWidth, imgHeight, undefined, "FAST");
        remaining -= sliceHeight;
        sourceY += sliceHeight;
        if (remaining > 0) {
          pdf.addPage();
          y = 0;
        }
      }

      pdf.save(`Statement_${customer.customer_name}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF", err);
      alert("Failed to generate PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading Statement...</div>;
  }

  if (!customer) {
    return <div className="flex items-center justify-center min-h-screen">Customer not found.</div>;
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gray-50 print:bg-white p-4 md:p-8"
    >
      {/* Controls - Hidden on Print */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
        <Button variant="outline" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Customers
        </Button>
        <Button onClick={handleDownloadPDF} disabled={isGeneratingPDF} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">
          {isGeneratingPDF ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <Download className="w-4 h-4" />}
          {isGeneratingPDF ? "Generating PDF..." : "Download PDF"}
        </Button>
      </div>

      {/* Statement Document */}
      <div ref={statementRef} className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-12 print:shadow-none print:border-none print:p-0">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-8 mb-8 gap-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Statement of Account</h1>
            <p className="text-gray-500 mt-1">Generated on {new Date().toLocaleDateString('en-IN')}</p>
          </div>
          <div className="text-left md:text-right">
            <h2 className="text-xl font-bold text-gray-900 flex items-center md:justify-end gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" /> {customer.customer_name}
            </h2>
            {customer.phone_number && (
              <p className="text-gray-600 flex items-center md:justify-end gap-2 mt-2">
                <Phone className="w-4 h-4 text-gray-400" /> {customer.phone_number}
              </p>
            )}
            {customer.address && (
              <p className="text-gray-600 flex items-center md:justify-end gap-2 mt-1">
                <MapPin className="w-4 h-4 text-gray-400" /> {customer.address}
              </p>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 print:border-gray-300">
            <p className="text-sm font-medium text-gray-500">Total Billed</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              ₹{bills.reduce((sum, b) => sum + b.debit, 0).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 print:border-gray-300">
            <p className="text-sm font-medium text-emerald-600 print:text-gray-700">Total Paid</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1 print:text-gray-900">
              ₹{bills.reduce((sum, b) => sum + b.credit, 0).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="bg-red-50 p-4 rounded-xl border border-red-100 print:border-gray-300">
            <p className="text-sm font-medium text-red-600 print:text-gray-700">Current Balance Due</p>
            <p className="text-2xl font-bold text-red-700 mt-1 print:text-gray-900">
              ₹{Number(customer.current_balance || 0).toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Ledger Table - Desktop */}
        <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 font-semibold text-gray-900">Date</th>
                <th className="px-4 py-3 font-semibold text-gray-900">Ref / Bill #</th>
                <th className="px-4 py-3 font-semibold text-right text-gray-900">Amount (Debit)</th>
                <th className="px-4 py-3 font-semibold text-right text-gray-900">Paid (Credit)</th>
                <th className="px-4 py-3 font-semibold text-right text-gray-900">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bills.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No transactions found.</td>
                </tr>
              ) : (
                bills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-600">{new Date(bill.bill_date).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">Bill #{bill.id}</td>
                    <td className="px-4 py-3 text-right text-gray-900">₹{bill.debit.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 print:text-gray-900">₹{bill.credit.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">₹{bill.runningBalance.toLocaleString('en-IN')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Ledger Cards - Mobile */}
        <div className="md:hidden space-y-4 print:hidden">
          {bills.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No transactions found.</div>
          ) : (
            bills.map((bill) => (
              <div key={bill.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-gray-900">Bill #{bill.id}</span>
                  <span className="text-sm text-gray-500">{new Date(bill.bill_date).toLocaleDateString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-medium">₹{bill.debit.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center text-sm mb-3">
                  <span className="text-gray-500">Paid</span>
                  <span className="font-medium text-emerald-600">₹{bill.credit.toLocaleString('en-IN')}</span>
                </div>
                <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-900">Running Balance</span>
                  <span className="font-bold text-gray-900">₹{bill.runningBalance.toLocaleString('en-IN')}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-12 text-center text-sm text-gray-400 print:block">
          <p>*** End of Statement ***</p>
        </div>
      </div>
    </motion.div>
  );
}
