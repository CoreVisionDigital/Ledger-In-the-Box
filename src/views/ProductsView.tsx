import React, { useState } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { formatNaira } from '../lib/money';
import { Table, Column } from '../components/common/Table';
import { Button } from '../components/common/Button';
import { ProductService } from '../types';
import { ProductModal } from '../components/products/ProductModal';
import { Plus, Edit2, Trash2, Package, Wrench } from 'lucide-react';

export const ProductsView: React.FC = () => {
  const { products, deleteProduct } = useBusiness();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<ProductService | null>(null);

  const handleEdit = (prod: ProductService) => {
    setProductToEdit(prod);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setProductToEdit(null);
    setIsModalOpen(true);
  };

  const columns: Column<ProductService>[] = [
    {
      header: 'Item',
      accessorKey: 'name',
      cell: p => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shrink-0">
            {p.type === 'product' ? <Package className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
          </div>
          <div>
            <span className="font-bold text-slate-900 block leading-tight">{p.name}</span>
            <span className="text-[11px] text-slate-500 capitalize">{p.type} • per {p.unit}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Description',
      accessorKey: 'description',
      cell: p => <span className="text-xs text-slate-600 truncate max-w-sm block">{p.description || '-'}</span>,
    },
    {
      header: 'Currency',
      accessorKey: 'currency',
      cell: p => <span className="font-mono text-xs text-slate-500 font-semibold">{p.currency}</span>,
    },
    {
      header: 'Unit Selling Price',
      accessorKey: 'priceMinor',
      className: 'text-right',
      cell: p => (
        <span className="font-mono font-bold text-slate-900 text-sm">
          {formatNaira(p.priceMinor)}
        </span>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: p => (
        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => handleEdit(p)}
            title="Edit Item"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => deleteProduct(p.id)}
            title="Delete Item"
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Products & Services Catalog</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Maintain your items catalog with prices stored in exact integer minor units (kobo).
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleNew}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Product / Service
        </Button>
      </div>

      <Table
        data={products}
        columns={columns}
        keyExtractor={p => p.id}
        searchPlaceholder="Search catalog items..."
        searchFilter={(p, query) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.unit.toLowerCase().includes(query)
        }
      />

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        productToEdit={productToEdit}
      />
    </div>
  );
};
