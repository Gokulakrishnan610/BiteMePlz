import React, { useCallback, useEffect, useState } from "react";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";
import { useAdminShop } from "../../context/AdminShopContext";
import { toast } from "sonner";
import Loader from "../../components/Loader";

interface Order {
  _id: string;
  order_id: string;
  user: {
    name: string;
    email: string;
    rollNo: string;
  };
  items: Array<{
    product: {
      name: string;
      price: number;
    };
    quantity: number;
  }>;
  totalPrice: number;
  status: string;
  payment_status: string;
  created_at: string;
  shop: {
    name: string;
  };
}

const OrderVerificationPage: React.FC = () => {
  const { user } = useAuth();
  const { selectedShop } = useAdminShop();
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const effectiveShopId = user?.role === "admin" && selectedShop ? selectedShop.id : user?.shop;

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      if (!effectiveShopId) {
        setLoading(false);
        return;
      }
      const { data }: { data: any } = await api.get(`/api/orders/shop/?shop_id=${effectiveShopId}`);
      const filtered = (data.results || data)
        .filter((order: any) => order.is_paid && !order.is_verified && order.status !== 'expired');
      const transformedOrders = filtered.map((order: any) => ({
        _id: order._id,
        order_id: order.order_id,
        user: order.user,
        items: order.order_items || [],
        totalPrice: order.total_price,
        status: order.is_verified ? "verified" : "pending",
        payment_status: order.is_paid ? "paid" : "pending",
        created_at: order.createdAt,
        shop: { name: "Current Shop" },
      }));
      setAllOrders(transformedOrders);
      setLoading(false);
    } catch (err) {
      toast.error("Failed to fetch orders");
      setLoading(false);
    }
  }, [effectiveShopId]);

  useEffect(() => {
    fetchOrders();
    const id = setInterval(() => {
      fetchOrders();
    }, 10000);
    return () => clearInterval(id);
  }, [effectiveShopId, fetchOrders]);

  // Filter orders as user types
  useEffect(() => {
    const s = search.trim().toLowerCase();
    if (!s) {
      setOrders(allOrders);
      return;
    }
    const filtered = allOrders.filter((order) => {
      if (/^\d{4}$/.test(s)) {
        return (
          String(order.order_id).slice(-4) === s ||
          String(order._id).toLowerCase().includes(s) ||
          (order.user?.name && order.user.name.toLowerCase().includes(s)) ||
          (order.user?.email && order.user.email.toLowerCase().includes(s)) ||
          (order.user?.rollNo && order.user.rollNo.toLowerCase().includes(s))
        );
      }
      return (
        String(order.order_id).toLowerCase().includes(s) ||
        String(order._id).toLowerCase().includes(s) ||
        (order.user?.name && order.user.name.toLowerCase().includes(s)) ||
        (order.user?.email && order.user.email.toLowerCase().includes(s)) ||
        (order.user?.rollNo && order.user.rollNo.toLowerCase().includes(s))
      );
    });
    setOrders(filtered);
  }, [search, allOrders]);

  const handleAccept = async (orderId: string) => {
    try {
      await api.put(`/api/orders/${orderId}/verify/`);
      setOrders((prev) => prev.filter((order) => order._id !== orderId));
      toast.success("Order verified!");
    } catch (error) {
      toast.error("Failed to verify order");
    }
  };

  const handleReject = async (orderId: string) => {
    try {
      await api.post(`/api/orders/${orderId}/reject/`);
      setOrders((prev) => prev.filter((order) => order._id !== orderId));
      toast.success("Order rejected and refunded!");
    } catch (error) {
      toast.error("Failed to reject order");
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <h1 className="text-xl sm:text-2xl font-bold">Order Verification</h1>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search by Order # (e.g., 20250827-0005)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 sm:flex-initial px-3 py-2 border rounded-md text-sm"
          />
          <button
            onClick={fetchOrders}
            className="px-3 py-2 text-sm rounded-md bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>
      {orders.length === 0 ? (
        <div className="text-center py-8 sm:py-12 px-4">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-600 mb-2">No Orders to Verify</h2>
          <p className="text-sm sm:text-base text-gray-500">All paid orders have been verified or rejected.</p>
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left p-3 font-semibold">Order ID</th>
                  <th className="text-left p-3 font-semibold">Customer</th>
                  <th className="text-left p-3 font-semibold">Items</th>
                  <th className="text-left p-3 font-semibold">Total</th>
                  <th className="text-left p-3 font-semibold">Date</th>
                  <th className="text-left p-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">#{order.order_id}</td>
                    <td className="p-3">
                      <div>
                        <p className="font-medium">{order.user.name}</p>
                        <p className="text-sm text-gray-500">{order.user.email}</p>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="space-y-1">
                        {order.items.map((item, index) => (
                          <p key={index} className="text-sm">
                            {item.quantity || 0}x {item.product?.name || "Unknown Product"}
                          </p>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 font-medium">₹{order.totalPrice}</td>
                    <td className="p-3 text-sm">{new Date(order.created_at).toLocaleDateString()}</td>
                    <td className="p-3">
                      <div className="flex gap-2 items-center">
                        <button
                          className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                          onClick={() => handleAccept(order._id)}
                        >
                          Accept
                        </button>
                        <button
                          className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                          onClick={() => handleReject(order._id)}
                        >
                          Reject
                        </button>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            placeholder="+min"
                            className="w-16 px-2 py-1 border rounded text-xs"
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter') {
                                const minutes = parseInt((e.target as HTMLInputElement).value)
                                if (!isNaN(minutes) && minutes > 0) {
                                  try {
                                    await api.patch(`/api/orders/${order._id}/update_expiry/`, { add_minutes: minutes })
                                    toast.success(`Extended by ${minutes} min`)
                                    fetchOrders()
                                  } catch (err) {
                                    toast.error('Failed to extend expiry')
                                  }
                                }
                              }
                            }}
                          />
                          <span className="text-xs text-gray-500">Extend</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderVerificationPage;
