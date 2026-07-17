import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function generateBillPDF(bill: any, customer: any, items: any[], title = "INVOICE") {
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
  const grandTotal = paid + pending;
  const previousPending = Math.max(0, grandTotal - total);

  // Construct item rows
  const itemRows = items.map((item: any, index: number) => {
    const englishName = item.product_name || `Item ID: ${item.product_id}`;
    const tamilName = item.tamil_name ? `${item.tamil_name} (${englishName})` : englishName;
    return `
      <tr>
        <td style="padding: 8px 10px; font-size: 13px; border-bottom: 1px solid #f0f0f0; text-align: center;">${index + 1}</td>
        <td style="padding: 8px 10px; font-size: 13px; border-bottom: 1px solid #f0f0f0;">${tamilName}</td>
        <td style="padding: 8px 10px; font-size: 13px; border-bottom: 1px solid #f0f0f0; text-align: center;">${item.quantity} &times; ${Number(item.rate).toFixed(2)}</td>
        <td style="padding: 8px 10px; font-size: 13px; border-bottom: 1px solid #f0f0f0; text-align: right; font-weight: 600;">${Number(item.amount).toFixed(2)}</td>
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
            <div style="font-size: 12px; color: #d32f2f; font-weight: 600;">Pending: ₹ ${pending.toFixed(2)}</div>
        </div>
        <div class="totals-right">
            <table class="totals-table">
                <tr>
                    <th>Current Bill Total</th>
                    <td>₹ ${total.toFixed(2)}</td>
                </tr>
                ${previousPending > 0.01 ? `
                <tr>
                    <th>Previous Pending</th>
                    <td>₹ ${previousPending.toFixed(2)}</td>
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
