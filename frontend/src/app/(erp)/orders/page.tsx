"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, CheckCircle, XCircle, Clock, Truck, X, IndianRupee, Bell, BellRing } from "lucide-react";

// Play a short notification beep using Web Audio API (no external file needed)
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playTone = (freq: number, start: number, duration: number, gain: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gainNode.gain.setValueAtTime(0, ctx.currentTime + start);
      gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + start + duration);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration + 0.05);
    };
    // Three-note chime: G5, E5, C5
    playTone(784, 0,    0.18, 0.4);
    playTone(659, 0.2,  0.18, 0.4);
    playTone(523, 0.42, 0.35, 0.4);
  } catch (e) { console.warn("Audio not supported", e); }
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const lastOrderIdsRef = useRef<Set<number>>(new Set());
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Delivery Payment Modal state
  const [deliverOrder, setDeliverOrder] = useState<any>(null);
  const [paymentType, setPaymentType] = useState<"unpaid" | "partially_paid" | "paid">("unpaid");
  const [amountPaid, setAmountPaid] = useState("");
  const [isDelivering, setIsDelivering] = useState(false);

  const fetchOrders = useCallback(async (silent = false) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const pendingOrders = data.filter((o: any) => o.status === "pending");
        const incomingIds = new Set<number>(pendingOrders.map((o: any) => o.id as number));

        // Detect genuinely NEW orders (IDs we haven't seen before)
        if (silent && lastOrderIdsRef.current.size > 0) {
          const brandNew = [...incomingIds].filter(id => !lastOrderIdsRef.current.has(id));
          if (brandNew.length > 0) {
            playNotificationSound();
            setNewOrderCount(prev => prev + brandNew.length);
          }
        }
        lastOrderIdsRef.current = incomingIds;
        setOrders(data);
      }
    } catch (e) { console.error(e); }
    finally { if (!silent) setIsLoading(false); }
  }, []);

  useEffect(() => {
    fetchOrders(false);
    // Poll every 30 seconds for new orders
    pollRef.current = setInterval(() => fetchOrders(true), 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchOrders]);

  const openDeliverModal = (order: any) => {
    setDeliverOrder(order);
    setPaymentType("unpaid");
    setAmountPaid("");
  };


  const handleDeliver = async () => {
    if (!deliverOrder) return;
    setIsDelivering(true);

    const total = parseFloat(deliverOrder.total_amount);
    let paid = 0;
    if (paymentType === "paid") paid = total;
    else if (paymentType === "partially_paid") paid = parseFloat(amountPaid) || 0;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/orders/${deliverOrder.id}/process`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "delivered", amount_paid: paid })
      });

      if (res.ok) {
        setDeliverOrder(null);
        fetchOrders();
      } else {
        const err = await res.json();
        alert("Failed: " + (err.detail || "Unknown error"));
      }
    } catch (e) { alert("Network Error"); }
    finally { setIsDelivering(false); }
  };

  const rejectOrder = async (orderId: number) => {
    if (!confirm("Reject this order?")) return;
    const token = localStorage.getItem("token");
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/orders/${orderId}/process`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected", amount_paid: 0 })
    });
    if (res.ok) fetchOrders();
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
      delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
      rejected: "bg-red-50 text-red-700 border-red-200",
    };
    const icons: Record<string, any> = {
      pending: <Clock className="w-3 h-3 mr-1" />,
      delivered: <CheckCircle className="w-3 h-3 mr-1" />,
      rejected: <XCircle className="w-3 h-3 mr-1" />,
    };
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${styles[status] || "bg-gray-50 text-gray-700 border-gray-200"}`}>
        {icons[status]} {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const deliverTotal = deliverOrder ? parseFloat(deliverOrder.total_amount) : 0;
  const partialPaid = parseFloat(amountPaid) || 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            Portal Orders
            {newOrderCount > 0 && (
              <span className="flex items-center gap-1.5 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full animate-bounce">
                <BellRing className="w-4 h-4" /> {newOrderCount} New
              </span>
            )}
          </h1>
          <p className="text-muted-foreground">Review and deliver incoming customer orders</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 bg-white px-3 py-2 rounded-xl border shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Auto-refreshing every 30s
        </div>
      </div>

      {/* New order notification banner */}
      {newOrderCount > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl px-5 py-4 flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="bg-amber-400 p-2 rounded-xl">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-amber-900">{newOrderCount} new order{newOrderCount > 1 ? "s" : ""} received!</p>
              <p className="text-sm text-amber-700">An email notification has been sent to your inbox.</p>
            </div>
          </div>
          <button onClick={() => setNewOrderCount(0)} className="text-amber-400 hover:text-amber-700">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-xl border border-dashed">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Orders Found</h3>
          <p className="text-gray-500">Customers haven't placed any orders yet.</p>
        </div>
      ) : (
        <div className="grid gap-5">
          {orders.map(order => (
            <Card key={order.id} className="overflow-hidden border-0 shadow-sm ring-1 ring-gray-200">
              <div className="bg-slate-50 border-b px-6 py-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="font-bold text-lg">{order.customer?.customer_name}{order.customer?.shop_name ? ` (${order.customer.shop_name})` : ""}</h3>
                  <div className="flex gap-3 text-sm text-muted-foreground mt-0.5">
                    <span>Order #{order.id}</span>
                    <span>•</span>
                    <span>{new Date(order.created_at).toLocaleString("en-IN")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-xl font-bold text-emerald-600">₹{order.total_amount}</p>
                  </div>
                  {statusBadge(order.status)}
                </div>
              </div>

              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm min-w-[500px]">
                  <thead className="bg-white text-gray-500 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium">Product</th>
                      <th className="px-6 py-3 text-right font-medium">Qty</th>
                      <th className="px-6 py-3 text-right font-medium">Rate</th>
                      <th className="px-6 py-3 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {order.order_items?.map((item: any) => (
                      <tr key={item.id} className="bg-white hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium">{item.product?.product_name}</td>
                        <td className="px-6 py-3 text-right text-gray-600">{item.quantity}</td>
                        <td className="px-6 py-3 text-right text-gray-600">₹{item.rate}</td>
                        <td className="px-6 py-3 text-right font-semibold">₹{item.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {order.status === "pending" && (
                  <div className="bg-gray-50 px-6 py-4 border-t flex justify-end gap-3">
                    <Button variant="outline" className="text-red-600 hover:bg-red-50 border-red-200" onClick={() => rejectOrder(order.id)}>
                      <XCircle className="w-4 h-4 mr-2" /> Reject
                    </Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm" onClick={() => openDeliverModal(order)}>
                      <Truck className="w-4 h-4 mr-2" /> Mark as Delivered
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Deliver & Payment Modal */}
      {deliverOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-5 border-b flex justify-between items-center bg-emerald-50">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-emerald-600" /> Order Delivered
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">{deliverOrder.customer?.customer_name} — Order #{deliverOrder.id}</p>
              </div>
              <button onClick={() => setDeliverOrder(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Bill Total */}
              <div className="bg-gray-50 rounded-xl p-4 flex justify-between items-center border">
                <span className="font-medium text-gray-600">Order Total</span>
                <span className="text-2xl font-bold text-gray-900">₹{deliverTotal.toFixed(2)}</span>
              </div>

              {/* Payment Status Selection */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700">Payment Received?</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "unpaid", label: "Not Paid", color: "red" },
                    { id: "partially_paid", label: "Partial", color: "amber" },
                    { id: "paid", label: "Fully Paid", color: "emerald" },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => { setPaymentType(opt.id as any); setAmountPaid(""); }}
                      className={`py-3 px-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                        paymentType === opt.id
                          ? opt.color === "red" ? "border-red-400 bg-red-50 text-red-700"
                          : opt.color === "amber" ? "border-amber-400 bg-amber-50 text-amber-700"
                          : "border-emerald-400 bg-emerald-50 text-emerald-700"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Partial Amount Input */}
              {paymentType === "partially_paid" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="text-sm font-medium text-gray-700">Amount Paid (₹)</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="number"
                      placeholder="Enter amount received"
                      className="pl-8"
                      value={amountPaid}
                      max={deliverTotal}
                      onChange={e => setAmountPaid(e.target.value)}
                    />
                  </div>
                  {partialPaid > 0 && (
                    <p className="text-xs text-amber-600 font-medium">
                      Pending: ₹{(deliverTotal - partialPaid).toFixed(2)} will be added to customer's balance.
                    </p>
                  )}
                </div>
              )}

              {paymentType === "paid" && (
                <p className="text-sm text-emerald-600 font-medium bg-emerald-50 p-3 rounded-xl">
                  ✓ Full amount of ₹{deliverTotal.toFixed(2)} marked as received.
                </p>
              )}

              {paymentType === "unpaid" && (
                <p className="text-sm text-red-600 font-medium bg-red-50 p-3 rounded-xl">
                  ₹{deliverTotal.toFixed(2)} will be added as a pending balance for this customer.
                </p>
              )}
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeliverOrder(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleDeliver}
                disabled={isDelivering || (paymentType === "partially_paid" && !amountPaid)}
              >
                {isDelivering ? "Saving..." : "Confirm Delivery"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
