"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import api from "../../api"
import { Package, Plus, Edit, Trash2 } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { useAdminShop } from "../../context/AdminShopContext"
import { toast } from "sonner"
import Loader from "../../components/Loader"
import type { Product } from "../../types"

const ProductsPage: React.FC = () => {
  const { user } = useAuth()
  const { selectedShop } = useAdminShop()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [disabledCategories, setDisabledCategories] = useState<string[]>([])
  const [savingCategories, setSavingCategories] = useState(false)

  // Determine the effective shop ID
  const effectiveShopId = user?.role === "admin" && selectedShop ? selectedShop.id : user?.shop

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        if (!effectiveShopId) {
          setLoading(false)
          return
        }

        // Fetch all products with pagination handling
        let allProducts: Product[] = []
        let nextUrl: string | null = `/api/products/?shop=${effectiveShopId}`

        while (nextUrl) {
          const { data } = await api.get(nextUrl)
          const pageProducts = data.results || []
          allProducts = [...allProducts, ...pageProducts]

          // Check if there's a next page and handle URL properly
          if (data.next) {
            // Extract just the path and query parameters from the next URL
            const nextUrlObj: URL = new URL(data.next)
            nextUrl = nextUrlObj.pathname + nextUrlObj.search
          } else {
            nextUrl = null
          }
        }

        // Handle paginated response and add backward compatibility for stock_mode
        setProducts(
          allProducts.map((product: Product) => ({
            ...product,
            stock_mode: product.stock_mode || "stock", // Default to 'stock' for backward compatibility
          })),
        )
        setLoading(false)
      } catch (error: any) {
        toast.error("Failed to fetch products")
        setLoading(false)
      }
    }

    fetchProducts()
  }, [effectiveShopId])

  useEffect(() => {
    const fetchDisabled = async () => {
      try {
        if (!effectiveShopId) return
        const { data } = await api.get(`/api/shops/${effectiveShopId}/`)
        setDisabledCategories(data.disabled_categories || [])
      } catch {}
    }
    fetchDisabled()
  }, [effectiveShopId])

  const toggleCategory = (cat: string) => {
    setDisabledCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]))
  }

  const saveCategories = async () => {
    try {
      if (!effectiveShopId) return
      setSavingCategories(true)
      await api.put(`/api/shops/${effectiveShopId}/`, {
        disabled_categories: disabledCategories,
        shop_admin_id: (user as any)?._id || (user as any)?.id,
      })
      toast.success("Category visibility updated")
    } catch {
      toast.error("Failed to update categories")
    } finally {
      setSavingCategories(false)
    }
  }

  const toggleAvailability = async (p: Product, next: boolean) => {
    try {
      const productId = p.id || p._id
      const response = await api.put(`/api/products/${productId}/`, {
        is_available: next,
        shop_id: effectiveShopId,
      })

      setProducts((prev) =>
        prev.map((x) => {
          const xId = x.id || x._id
          const pId = p.id || p._id
          if (xId === pId) {
            return { ...x, is_available: next }
          }
          return x
        }),
      )
      toast.success(`Product ${next ? "enabled" : "disabled"}`)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.response?.data?.message || "Failed to update product")
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return

    try {
      await api.delete(`/api/products/${id}/`)
      toast.success("Product deleted successfully")
      setProducts((prev) => prev.filter((p) => (p.id || p._id) !== id))
    } catch (error: any) {
      toast.error("Failed to delete product")
    }
  }

  if (loading) {
    return <Loader />
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Products</h1>
        <Link
          to={
            user?.role === "admin" && selectedShop
              ? "/kisok-ac-back-office/shop-admin/products/create"
              : "/kisok-sp-back-office/products/create"
          }
          className="btn-primary flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus size={20} />
          <span>Add Product</span>
        </Link>
      </div>

      <div className="card p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-3 text-gray-900">Category Controls</h2>
        <p className="text-sm sm:text-base text-gray-600 mb-4">
          Enable/disable entire categories. Disabled categories will be hidden from customers.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3">
          {["breakfast", "lunch", "food", "beverages", "snacks", "stationery", "electronics", "others"].map((cat) => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors capitalize ${
                disabledCategories.includes(cat)
                  ? "bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
                  : "bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="mt-4">
          <button
            onClick={saveCategories}
            disabled={savingCategories}
            className="btn-primary px-6 py-2 rounded-lg font-medium w-full sm:w-auto disabled:opacity-50"
          >
            {savingCategories ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="card">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-4 px-4 font-semibold text-gray-900">Product</th>
                <th className="text-left py-4 px-4 font-semibold text-gray-900">Price</th>
                <th className="text-left py-4 px-4 font-semibold text-gray-900">Stock</th>
                <th className="text-left py-4 px-4 font-semibold text-gray-900">Status</th>
                <th className="text-left py-4 px-4 font-semibold text-gray-900">Created</th>
                <th className="text-left py-4 px-4 font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id || product._id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <Package size={20} className="text-[var(--primary)] flex-shrink-0" />
                      <span className="font-medium text-gray-900">{product.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-semibold text-gray-900">₹{product.price}</td>
                  <td className="py-4 px-4">
                    <span
                      className={`font-medium ${
                        product.stock_mode === "live_stock"
                          ? "text-[var(--primary)]"
                          : product.stock === 0
                            ? "text-[var(--error)]"
                            : "text-[var(--success)]"
                      }`}
                    >
                      {product.stock_mode === "live_stock" ? "Livestock" : product.stock}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        product.is_available ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {product.is_available ? "Available" : "Unavailable"}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-gray-600">{new Date(product.createdAt).toLocaleDateString()}</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleAvailability(product, !product.is_available)}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                          product.is_available
                            ? "text-red-600 bg-red-50 hover:bg-red-100"
                            : "text-green-600 bg-green-50 hover:bg-green-100"
                        }`}
                      >
                        {product.is_available ? "Disable" : "Enable"}
                      </button>
                      <Link
                        to={
                          user?.role === "admin" && selectedShop
                            ? `/kisok-ac-back-office/shop-admin/products/edit/${product.id || product._id}`
                            : `/kisok-sp-back-office/products/edit/${product.id || product._id}`
                        }
                        className="p-2 text-[var(--primary)] hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <Edit size={16} />
                      </Link>
                      <button
                        onClick={() => handleDelete(product.id || product._id)}
                        className="p-2 text-[var(--error)] hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-4 p-4">
          {products.map((product) => (
            <div key={product.id || product._id} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Package size={20} className="text-[var(--primary)] flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                    <p className="text-lg font-bold text-gray-900 mt-1">₹{product.price}</p>
                  </div>
                </div>
                <span
                  className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    product.is_available ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}
                >
                  {product.is_available ? "Available" : "Unavailable"}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-gray-500">Stock: </span>
                    <span
                      className={`font-medium ${
                        product.stock_mode === "live_stock"
                          ? "text-[var(--primary)]"
                          : product.stock === 0
                            ? "text-[var(--error)]"
                            : "text-[var(--success)]"
                      }`}
                    >
                      {product.stock_mode === "live_stock" ? "Livestock" : product.stock}
                    </span>
                  </div>
                  <div className="hidden sm:block">
                    <span className="text-gray-500">Created: </span>
                    <span className="text-gray-700">{new Date(product.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => toggleAvailability(product, !product.is_available)}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    product.is_available
                      ? "text-red-600 bg-red-50 hover:bg-red-100"
                      : "text-green-600 bg-green-50 hover:bg-green-100"
                  }`}
                >
                  {product.is_available ? "Disable Product" : "Enable Product"}
                </button>
                <div className="flex gap-2">
                  <Link
                    to={
                      user?.role === "admin" && selectedShop
                        ? `/kisok-ac-back-office/shop-admin/products/edit/${product.id || product._id}`
                        : `/kisok-sp-back-office/products/edit/${product.id || product._id}`
                    }
                    className="flex items-center justify-center px-3 py-2 text-[var(--primary)] bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                  >
                    <Edit size={16} />
                    <span className="ml-1 text-sm">Edit</span>
                  </Link>
                  <button
                    onClick={() => handleDelete(product.id || product._id)}
                    className="flex items-center justify-center px-3 py-2 text-[var(--error)] bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                  >
                    <Trash2 size={16} />
                    <span className="ml-1 text-sm">Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {products.length === 0 && (
          <div className="text-center py-12 sm:py-16 px-4">
            <Package size={48} className="text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-600 mb-2">No Products Yet</h2>
            <p className="text-gray-500 text-base sm:text-lg mb-6 max-w-md mx-auto">
              Start building your inventory by adding your first product.
            </p>
            <Link
              to={
                user?.role === "admin" && selectedShop
                  ? "/kisok-ac-back-office/shop-admin/products/create"
                  : "/kisok-sp-back-office/products/create"
              }
              className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium"
            >
              <Plus size={20} />
              Add Your First Product
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProductsPage;