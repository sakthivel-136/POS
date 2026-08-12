import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function generateBillPDF(bill: any, customer: any, items: any[], previousPending: number = 0, title = "INVOICE") {
  // Create a temporary div to render the bill
  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed; top: -9999px; left: -9999px;
    width: 800px; background-color: #eef2f6; padding: 40px;
    font-family: 'Noto Sans Tamil', 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: #2c3e50;
    line-height: 1.3;
    box-sizing: border-box;
  `;

  const total = Number(bill.total_amount || 0);
  const paid = Number(bill.paid_amount || 0);
  const pending = Number(bill.pending_amount || 0);
  
  // If previousPending wasn't passed directly (e.g. from bills history), infer from customer's current balance
  // Since customer's current balance includes this bill's pending, we subtract it to find what it was before this bill.
  const actualPreviousPending = previousPending > 0 
    ? previousPending 
    : Math.max(0, (Number(customer?.current_balance || 0) - pending));
    
  const grandTotal = total + actualPreviousPending;
  const finalPending = grandTotal - paid;

  // Construct item rows
  const itemRows = items.map((item: any, index: number) => {
    const englishName = item.product_name || `Item ID: ${item.product_id}`;
    const tamilName = item.tamil_name ? `${item.tamil_name} (${englishName})` : englishName;
    const isReturn = (item.quantity || item.qty) < 0;
    const qtyAbs = Math.abs(item.quantity || item.qty);
    const amountStr = Number(item.amount || ((item.quantity || item.qty) * (item.rate || item.rateToUse))).toFixed(2);
    
    return `
      <tr style="${isReturn ? 'background-color: #ffebee;' : ''}">
        <td style="padding: 8px 10px; font-size: 13px; border-bottom: 1px solid #f0f0f0; text-align: center; ${isReturn ? 'color: #d32f2f;' : ''}">${index + 1}</td>
        <td style="padding: 8px 10px; font-size: 13px; border-bottom: 1px solid #f0f0f0; ${isReturn ? 'color: #d32f2f; font-weight: 600;' : ''}">${isReturn ? '(RETURN) ' : ''}${tamilName}</td>
        <td style="padding: 8px 10px; font-size: 13px; border-bottom: 1px solid #f0f0f0; text-align: center; ${isReturn ? 'color: #d32f2f;' : ''}">${isReturn ? '-' : ''}${qtyAbs} &times; ${Number(item.rate || item.rateToUse).toFixed(2)}</td>
        <td style="padding: 8px 10px; font-size: 13px; border-bottom: 1px solid #f0f0f0; text-align: right; font-weight: 600; ${isReturn ? 'color: #d32f2f;' : ''}">${amountStr}</td>
      </tr>
    `;
  }).join("");

  const billDate = bill.created_at || bill.bill_date || new Date();
  const dateDisplay = new Date(billDate).toLocaleDateString("en-IN");
  const dayDisplay = new Date(billDate).toLocaleDateString("en-IN", { weekday: 'long' });
  
  const customerName = customer?.customer_name || "Customer";
  const customerShop = customer?.shop_name || "";
  const customerPlace = customer?.place || customer?.address || "";

  container.innerHTML = `
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; }
        .header {
            margin: -40px -40px 20px -40px;
            padding: 25px 40px;
            background-color: #1a237e;
            color: #ffffff;
            display: table;
            width: calc(100% + 80px);
        }
        .header-left { display: table-cell; vertical-align: middle; width: 60%; }
        .header-right { display: table-cell; vertical-align: middle; width: 40%; text-align: right; }
        .header-left h1 { margin: 0; font-size: 30px; letter-spacing: 2px; color: #ffca28; text-transform: uppercase; font-weight: 800; }
        .header-left p { margin: 5px 0 0 0; font-size: 14px; color: #c5cae9; }
        .header-right h2 { margin: 0; font-size: 26px; color: #ffffff; font-weight: 300; letter-spacing: 1px; }

        .info-container { display: table; width: 100%; margin-bottom: 20px; }
        .info-box {
            display: table-cell;
            background-color: #ffffff;
            padding: 12px 15px;
            border-radius: 8px;
            border-top: 4px solid #ffca28;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            vertical-align: top;
        }
        .spacer { display: table-cell; width: 15px; }
        .info-title { font-size: 11px; text-transform: uppercase; color: #7f8c8d; font-weight: bold; margin-bottom: 4px; letter-spacing: 1px; }
        .info-text { font-size: 14px; color: #1a237e; font-weight: bold; }
        .info-subtext { font-size: 12px; color: #546e7a; margin-top: 2px; }

        .table-container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 10px 15px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            margin-bottom: 20px;
        }
        table.items { width: 100%; border-collapse: collapse; }
        table.items th {
            background-color: #f8f9fa;
            color: #34495e;
            text-align: left;
            padding: 10px;
            font-size: 11px;
            text-transform: uppercase;
            border-bottom: 2px solid #e0e0e0;
        }
        
        .totals-container { display: table; width: 100%; }
        .totals-left { display: table-cell; width: 50%; vertical-align: bottom; padding-right: 20px; }
        .totals-right { display: table-cell; width: 50%; }
        .totals-table {
            width: 100%;
            border-collapse: collapse;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .totals-table th, .totals-table td { padding: 10px 15px; font-size: 13px; border-bottom: 1px solid #f0f0f0; }
        .totals-table th { text-align: left; color: #546e7a; font-weight: normal; }
        .totals-table td { text-align: right; color: #2c3e50; font-weight: bold; }
        .grand-total-row { background-color: #1a237e; }
        .grand-total-row th { color: #ffffff; font-size: 15px; font-weight: bold; border-bottom: none; }
        .grand-total-row td { color: #ffca28; font-size: 16px; border-bottom: none; }

        .footer { margin-top: 20px; text-align: center; padding-top: 12px; border-top: 1px dashed #b0bec5; }
        .footer p { margin: 0; color: #78909c; font-size: 11px; }
        .thank-you { font-size: 13px; color: #1a237e; font-weight: bold; margin-bottom: 4px !important; }
    </style>

    <div class="header">
        <div class="header-left">
            <h1>SAKTHI SPICES</h1>
            <p>Virudhunagar, Tamil Nadu</p>
        </div>
        <div class="header-right">
            <h2>${title}</h2>
        </div>
    </div>

    <div class="info-container">
        <div class="info-box" style="width: 48%;">
            <div class="info-title">Billed To</div>
            <div class="info-text">${customerName}${customerShop ? ` (${customerShop})` : ''}</div>
            <div class="info-subtext">${customerPlace}</div>
        </div>
        <div class="spacer"></div>
        <div class="info-box" style="width: 48%;">
            <div class="info-title">Invoice Date</div>
            <div class="info-text" style="font-size: 13px;">${dateDisplay}</div>
            <div class="info-subtext">${dayDisplay}</div>
        </div>
    </div>

    <div class="table-container">
        <table class="items">
            <thead>
                <tr>
                    <th style="text-align: center; width: 8%;">S.No</th>
                    <th style="width: 42%;">Item Description</th>
                    <th style="text-align: center; width: 30%;">Calculation (Qty &times; Rate)</th>
                    <th style="text-align: right; width: 20%;">Amount (₹)</th>
                </tr>
            </thead>
            <tbody>
                ${itemRows || `<tr><td colspan="4" style="padding: 20px; text-align: center;">No items detailed.</td></tr>`}
            </tbody>
        </table>
    </div>

    <div class="totals-container">
        <div class="totals-left">
            <div style="font-size: 11px; color: #546e7a; margin-bottom: 4px;">Payment Summary:</div>
            <div style="font-size: 12px; color: #1a237e; font-weight: 600;">Paid: ₹ ${paid.toFixed(2)}</div>
            <div style="font-size: 12px; color: #d32f2f; font-weight: 600;">Pending: ₹ ${finalPending.toFixed(2)}</div>
            
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #cfd8dc; font-size: 11px; color: #546e7a;">
                <div style="margin-bottom: 4px;"><strong>Total Items:</strong> ${items?.length || 0} | <strong>Total Qty:</strong> ${items?.reduce((s: number, i: any) => s + (parseFloat(i.quantity) || 0), 0)}</div>
                <div style="font-weight: 600;">Breakdown by Rate:</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2px; margin-top: 4px;">
                    ${Object.entries(
                        (items || []).reduce((acc: any, i: any) => {
                            const rate = parseFloat(i.rate) || 0;
                            acc[rate] = (acc[rate] || 0) + (parseFloat(i.quantity) || 0);
                            return acc;
                        }, {})
                    ).map(([rate, qty]) => `<div>₹${rate} : ${qty} qty</div>`).join('')}
                </div>
            </div>
        </div>
        <div class="totals-right">
            <table class="totals-table">
                <tr>
                    <th>Current Bill Total</th>
                    <td>₹ ${total.toFixed(2)}</td>
                </tr>
                ${actualPreviousPending > 0.01 ? `
                <tr>
                    <th>Previous Pending</th>
                    <td>₹ ${actualPreviousPending.toFixed(2)}</td>
                </tr>
                ` : ""}
                <tr class="grand-total-row">
                    <th>GRAND TOTAL</th>
                    <td>₹ ${grandTotal.toFixed(2)}</td>
                </tr>
            </table>
        </div>
    </div>

    <div class="footer">
        <p class="thank-you">Thank you for your business!</p>
        <p>This is a computer-generated invoice and does not require a signature.</p>
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
      backgroundColor: "#eef2f6",
      logging: false
    });

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

    pdf.save(`Sakthi_Spices_Bill_${bill.id || "DRAFT"}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}

export async function generateStatementPDF(customer: any, bills: any[], totalBilled: number, totalPaid: number, currentBalance: number) {
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "210mm"; // A4 width
  container.style.backgroundColor = "#ffffff";
  
  const today = new Date().toLocaleDateString();

  let rowsHtml = "";
  bills.forEach((b: any, index: number) => {
    rowsHtml += `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 12px 8px; font-size: 14px; color: #333;">${new Date(b.bill_date).toLocaleDateString()}</td>
        <td style="padding: 12px 8px; font-size: 14px; color: #333;">Bill #${b.id}</td>
        <td style="padding: 12px 8px; font-size: 14px; color: #333; text-align: right;">₹${b.debit.toFixed(2)}</td>
        <td style="padding: 12px 8px; font-size: 14px; color: #10b981; text-align: right;">₹${b.credit.toFixed(2)}</td>
        <td style="padding: 12px 8px; font-size: 14px; font-weight: bold; color: #333; text-align: right;">₹${b.runningBalance.toFixed(2)}</td>
      </tr>
    `;
  });

  container.innerHTML = `
    <style>
      * { box-sizing: border-box; font-family: 'Arial', sans-serif; }
      .statement-container { padding: 40px; background: white; }
      .header { display: flex; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
      .title h1 { margin: 0; font-size: 28px; color: #111; }
      .title p { margin: 5px 0 0 0; color: #666; font-size: 14px; }
      .customer-details { text-align: right; font-size: 14px; color: #444; line-height: 1.6; }
      .summary-cards { display: flex; gap: 20px; margin-bottom: 30px; }
      .card { flex: 1; padding: 15px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; }
      .card-title { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold; margin-bottom: 5px; }
      .card-value { font-size: 24px; font-weight: bold; color: #0f172a; margin: 0; }
      .card.danger { background: #fef2f2; border-color: #fecaca; }
      .card.danger .card-value { color: #dc2626; }
      .card.danger .card-title { color: #dc2626; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
      th { text-align: left; padding: 12px 8px; background: #f1f5f9; color: #475569; font-size: 13px; text-transform: uppercase; }
      th.right { text-align: right; }
      .footer { text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; margin-top: 40px; }
    </style>
    <div class="statement-container">
      <div class="header">
        <div class="title">
          <h1>Statement of Account</h1>
          <p>Generated on ${today}</p>
        </div>
        <div class="customer-details">
          <div style="font-size: 18px; font-weight: bold; color: #000;">${customer.shop_name || customer.customer_name}</div>
          ${customer.phone ? `<div>📞 ${customer.phone}</div>` : ''}
          ${customer.address ? `<div>📍 ${customer.address}</div>` : ''}
        </div>
      </div>
      
      <div class="summary-cards">
        <div class="card">
          <div class="card-title">Total Billed</div>
          <p class="card-value">₹${totalBilled.toFixed(2)}</p>
        </div>
        <div class="card">
          <div class="card-title">Total Paid</div>
          <p class="card-value" style="color: #059669;">₹${totalPaid.toFixed(2)}</p>
        </div>
        <div class="card danger">
          <div class="card-title">Current Balance Due</div>
          <p class="card-value">₹${currentBalance.toFixed(2)}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Ref / Bill #</th>
            <th class="right">Amount (Debit)</th>
            <th class="right">Paid (Credit)</th>
            <th class="right">Balance</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="footer">
        <p>*** End of Statement ***</p>
        <p>If you have any questions about this statement, please contact us.</p>
      </div>
    </div>
  `;

  document.body.appendChild(container);
  
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

    pdf.save(`Statement_${customer.customer_name}_${today.replace(/\//g, '-')}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}

