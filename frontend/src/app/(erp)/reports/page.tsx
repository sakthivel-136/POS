"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, BarChart3, Package } from "lucide-react";
import { useState, useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// Renders an off-screen HTML table with Tamil support, captures as image, embeds in PDF
async function generatePDFFromHTML(title: string, subtitleLine: string, tableHtml: string, filename: string) {
  // Create a temporary div to render the table
  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed; top: -9999px; left: -9999px;
    width: 800px; background: white; padding: 32px;
    font-family: 'Noto Sans Tamil', 'Latha', 'Arial Unicode MS', Arial, sans-serif;
    font-size: 13px; color: #111;
  `;

  container.innerHTML = `
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;600;700&display=swap" rel="stylesheet">
    <div style="margin-bottom:16px">
      <h1 style="font-size:20px;font-weight:700;margin:0 0 4px 0;color:#1a1752">${title}</h1>
      <p style="font-size:12px;color:#666;margin:0">${subtitleLine}</p>
    </div>
    ${tableHtml}
  `;
  document.body.appendChild(container);

  // Wait for fonts to load
  await document.fonts.ready;
  await new Promise(r => setTimeout(r, 600));

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pdfWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Paginate if content is taller than one page
    let y = 10;
    let remaining = imgHeight;
    let sourceY = 0;
    const pageContentHeight = pdfHeight - 20;

    while (remaining > 0) {
      const sliceHeight = Math.min(remaining, pageContentHeight);
      // Draw the full image shifted upwards to act as a slice
      pdf.addImage(imgData, "PNG", 10, y - sourceY, imgWidth, imgHeight, undefined, "FAST");
      remaining -= sliceHeight;
      sourceY += sliceHeight;
      if (remaining > 0) {
        pdf.addPage();
        y = 10;
      }
    }

    pdf.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}

function tableStyle(headerColor = "#1a1752") {
  return `
    <style>
      table { width: 100%; border-collapse: collapse; font-family: 'Noto Sans Tamil', Arial, sans-serif; }
      th { background: ${headerColor}; color: white; padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; }
      td { padding: 9px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; color: #374151; }
      tr:nth-child(even) td { background: #f9fafb; }
      tr:last-child td { border-bottom: none; }
      .badge-good { background:#dcfce7;color:#166534;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600; }
      .badge-low { background:#fef9c3;color:#854d0e;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600; }
      .badge-paid { background:#dcfce7;color:#166534;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600; }
      .badge-partial { background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600; }
      .badge-unpaid { background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600; }
    </style>
  `;
}

export default function ReportsPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  const downloadSalesReport = async () => {
    setIsGenerating("sales");
    const token = localStorage.getItem("token");
    let url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/reports/sales`;
    if (startDate && endDate) url += `?start_date=${startDate}&end_date=${endDate}`;

    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data: any[] = await res.json();

      const rows = data.map((row, i) => {
        const customerName = row.customer?.shop_name || row.customer?.customer_name || `Customer #${row.customer_id}`;
        const statusClass = row.status === "paid" ? "badge-paid" : row.status === "partially_paid" ? "badge-partial" : "badge-unpaid";
        const statusLabel = row.status === "paid" ? "Paid" : row.status === "partially_paid" ? "Partial" : "Not Paid";
        return `
          <tr>
            <td>${row.id}</td>
            <td><strong>${customerName}</strong></td>
            <td>${new Date(row.bill_date).toLocaleDateString("en-IN")}</td>
            <td>₹${row.total_amount}</td>
            <td>₹${row.paid_amount || 0}</td>
            <td>₹${row.pending_amount}</td>
            <td><span class="${statusClass}">${statusLabel}</span></td>
          </tr>`;
      }).join("");

      const totalSales = data.reduce((s, r) => s + parseFloat(r.total_amount), 0);
      const totalCollected = data.reduce((s, r) => s + parseFloat(r.paid_amount || 0), 0);
      const totalPending = data.reduce((s, r) => s + parseFloat(r.pending_amount || 0), 0);

      const tableHtml = `
        ${tableStyle()}
        <table>
          <thead><tr>
            <th>Bill #</th><th>Buyer / Store Name</th><th>Date</th>
            <th>Total (₹)</th><th>Paid (₹)</th><th>Pending (₹)</th><th>Status</th>
          </tr></thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="font-weight:700;padding-top:12px">Total (${data.length} bills)</td>
              <td style="font-weight:700;color:#1a1752">₹${totalSales.toFixed(2)}</td>
              <td style="font-weight:700;color:#16a34a">₹${totalCollected.toFixed(2)}</td>
              <td style="font-weight:700;color:#dc2626">₹${totalPending.toFixed(2)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      `;

      await generatePDFFromHTML(
        "Sales Report — Sakthi Spices",
        `Date: ${startDate || "All Time"} to ${endDate || "All Time"} • ${data.length} bills`,
        tableHtml,
        `Sales_Report_${startDate || "All"}.pdf`
      );
    } catch (e) {
      console.error(e);
      alert("Failed to generate report");
    } finally {
      setIsGenerating(null);
    }
  };

  const downloadStockReport = async () => {
    setIsGenerating("stock");
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/reports/stock`, { headers: { Authorization: `Bearer ${token}` } });
      const data: any[] = await res.json();

      const rows = data.map(row => {
        const statusClass = row.stock_status === "Good" ? "badge-good" : "badge-low";
        return `
          <tr>
            <td>${row.product_id}</td>
            <td><strong>${row.product_name}</strong></td>
            <td style="font-family:'Noto Sans Tamil',Arial,sans-serif">${row.tamil_name || "—"}</td>
            <td>${row.current_stock} ${row.unit || "pcs"}</td>
            <td><span class="${statusClass}">${row.stock_status}</span></td>
          </tr>`;
      }).join("");

      const tableHtml = `
        ${tableStyle("#7c3aed")}
        <table>
          <thead><tr>
            <th>ID</th><th>Product Name</th><th>Tamil Name (தமிழ்)</th><th>Stock</th><th>Status</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `;

      await generatePDFFromHTML(
        "Stock & Inventory Report — Sakthi Spices",
        `Generated on ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} • ${data.length} products`,
        tableHtml,
        "Stock_Report.pdf"
      );
    } catch (e) {
      console.error(e);
      alert("Failed to generate stock report");
    } finally {
      setIsGenerating(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold">Business Reports</h1>
        <p className="text-muted-foreground">Generate and export insights for your wholesale ERP</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">

        {/* Sales Report */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center"><BarChart3 className="w-5 h-5 mr-2 text-primary" /> Sales Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              All bills with <strong>buyer/store name</strong>, total, paid, pending and payment status.
            </p>

            <div className="flex gap-4">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-semibold">Start Date</label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white/5 border-white/10" />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-xs font-semibold">End Date</label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white/5 border-white/10" />
              </div>
            </div>

            <Button onClick={downloadSalesReport} disabled={!!isGenerating} className="w-full bg-primary hover:bg-primary/90">
              <Download className="w-4 h-4 mr-2" />
              {isGenerating === "sales" ? "Generating PDF..." : "Download Sales PDF"}
            </Button>
          </CardContent>
        </Card>

        {/* Stock Report */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center"><Package className="w-5 h-5 mr-2 text-[#8B5CF6]" /> Stock & Inventory Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              All products with <strong>Tamil names (தமிழ்)</strong>, current stock count and status.
            </p>

            <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-sm text-purple-700 font-medium">
              ✓ Tamil text renders correctly in this report
            </div>

            <Button onClick={downloadStockReport} disabled={!!isGenerating} className="w-full bg-[#8B5CF6] hover:bg-[#7c4df2] text-white">
              <Download className="w-4 h-4 mr-2" />
              {isGenerating === "stock" ? "Generating PDF..." : "Download Stock PDF"}
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
