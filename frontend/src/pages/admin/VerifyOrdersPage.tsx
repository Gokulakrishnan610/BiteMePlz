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
  return null
}

export default VerifyOrdersPage


