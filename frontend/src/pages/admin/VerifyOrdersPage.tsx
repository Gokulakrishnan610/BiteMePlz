import React, { useEffect, useState } from 'react'
import api from '../../api'
import { useAdminShop } from '../../context/AdminShopContext'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'

interface Order {
  id: string
  _id?: string
  order_id: string
  total_price: number
  is_paid: boolean
  is_verified: boolean
  status: string
}

const VerifyOrdersPage: React.FC = () => {
  const { selectedShop } = useAdminShop()
  const [q, setQ] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)

  const search = async () => {
    setLoading(true)
    try {
      const params: any = { q }
      if (selectedShop?.id) params.shop_id = selectedShop.id
      const { data } = await api.get('/api/orders/search/', { params })
      setOrders(data.results || [])
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { search() }, [])

  const accept = async (order: Order) => {
    try {
      await api.put(`/api/orders/${order.id || order._id}/verify/`, selectedShop?.id ? { selected_shop_id: selectedShop.id } : {})
      await search()
    } catch {}
  }
  const reject = async (order: Order) => {
    try {
      await api.post(`/api/orders/${order.id || order._id}/reject/`, selectedShop?.id ? { selected_shop_id: selectedShop.id } : {})
      await search()
    } catch {}
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Verify Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by Order ID / user" />
            <Button onClick={search} className="bg-purple-600 hover:bg-purple-700 text-white">Search</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {orders.map((o) => (
          <Card key={o.id || o._id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold">{o.order_id}</div>
                <div className="text-sm text-gray-600">₹{o.total_price} • {o.status} • {o.is_verified ? 'Verified' : 'Not Verified'}</div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => accept(o)} disabled={o.is_verified} className="bg-green-600 hover:bg-green-700 text-white">Accept</Button>
                <Button onClick={() => reject(o)} variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">Reject</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!loading && orders.length === 0 && (
          <div className="text-sm text-gray-600">No results</div>
        )}
      </div>
    </div>
  )
}

export default VerifyOrdersPage


