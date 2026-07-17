import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function generateBillPDF(bill: any, customer: any, items: any[], title = "Tax Invoice / Bill") {
  // Create a temporary div to render the bill
  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed; top: -9999px; left: -9999px;
    width: 800px; background: white; padding: 40px;
    font-family: 'Noto Sans Tamil', 'Latha', 'Arial Unicode MS', Arial, sans-serif;
    color: #111;
  `;

  // Construct item rows
  const itemRows = items.map((item: any, index: number) => {
    const englishName = item.product_name || `Item ID: ${item.product_id}`;
    const tamilName = item.tamil_name ? `<br/><span style="font-size: 11px; color: #555;">${item.tamil_name}</span>` : "";
    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">${index + 1}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; font-weight: 600;">${englishName}${tamilName}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">Rs. ${Number(item.rate).toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; font-weight: 600; text-align: right;">Rs. ${Number(item.amount).toFixed(2)}</td>
      </tr>
    `;
  }).join("");

  const billIdDisplay = bill.id ? `Bill #: ${bill.id}` : "DRAFT";
  const dateDisplay = bill.bill_date ? new Date(bill.bill_date).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN");
  
  const customerHtml = customer ? `
    <div style="margin-top: 24px; margin-bottom: 32px;">
      <p style="font-size: 14px; color: #666; margin: 0 0 4px 0;">Bill To:</p>
      <p style="font-size: 16px; font-weight: 700; margin: 0 0 4px 0;">${customer.customer_name}</p>
      ${customer.phone_number ? `<p style="font-size: 14px; margin: 0 0 2px 0;">Phone: ${customer.phone_number}</p>` : ""}
      ${customer.address ? `<p style="font-size: 14px; margin: 0;">Address: ${customer.address}</p>` : ""}
    </div>
  ` : "";

  container.innerHTML = `
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;600;700&display=swap" rel="stylesheet">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="font-size: 28px; font-weight: 800; margin: 0 0 8px 0; color: #1a1752; letter-spacing: 1px;">SAKTHI SPICES</h1>
      <p style="font-size: 16px; color: #444; margin: 0;">${title}</p>
    </div>
    
    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
      ${customerHtml}
      <div style="margin-top: 24px; text-align: right;">
        <p style="font-size: 14px; font-weight: 600; margin: 0 0 4px 0;">${billIdDisplay}</p>
        <p style="font-size: 14px; margin: 0;">Date: ${dateDisplay}</p>
      </div>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px; margin-top: 16px;">
      <thead>
        <tr style="background: #1a1752; color: white;">
          <th style="padding: 12px; text-align: left; font-size: 13px; border-radius: 6px 0 0 0;">#</th>
          <th style="padding: 12px; text-align: left; font-size: 13px;">Product</th>
          <th style="padding: 12px; text-align: left; font-size: 13px;">Qty</th>
          <th style="padding: 12px; text-align: left; font-size: 13px;">Rate</th>
          <th style="padding: 12px; text-align: right; font-size: 13px; border-radius: 0 6px 0 0;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows || `<tr><td colspan="5" style="padding: 20px; text-align: center;">No items detailed.</td></tr>`}
      </tbody>
    </table>

    <div style="display: flex; justify-content: flex-end;">
      <div style="width: 300px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-size: 15px; font-weight: 600;">Total Amount:</span>
          <span style="font-size: 15px; font-weight: 700;">Rs. ${Number(bill.total_amount || 0).toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-size: 15px; color: #16a34a;">Paid Amount:</span>
          <span style="font-size: 15px; color: #16a34a; font-weight: 600;">Rs. ${Number(bill.paid_amount || 0).toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
          <span style="font-size: 16px; font-weight: 700; color: #dc2626;">Pending Balance:</span>
          <span style="font-size: 16px; font-weight: 800; color: #dc2626;">Rs. ${Number(bill.pending_amount || 0).toFixed(2)}</span>
        </div>
      </div>
    </div>
    
    <div style="margin-top: 60px; text-align: center; color: #666; font-style: italic; font-size: 14px;">
      Thank you for your business!
    </div>
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

    let y = 10;
    let remaining = imgHeight;
    let sourceY = 0;
    const pageContentHeight = pdfHeight - 20;

    while (remaining > 0) {
      const sliceHeight = Math.min(remaining, pageContentHeight);
      pdf.addImage(imgData, "PNG", 10, y - sourceY, imgWidth, imgHeight, undefined, "FAST");
      remaining -= sliceHeight;
      sourceY += sliceHeight;
      if (remaining > 0) {
        pdf.addPage();
        y = 10;
      }
    }

    pdf.save(`Sakthi_Spices_Bill_${bill.id || "DRAFT"}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
