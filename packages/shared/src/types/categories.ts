// Entidad principal de Categoría
export interface Category {
  id: number;
  userId: number | null;             // null = categoría predefinida del sistema
  name: string;                      // máximo 50 caracteres, único
  icon: string | null;               // icono opcional
  color: string | null;              // color opcional (hex)
  isDefault: boolean;                // true para categorías predefinidas
  subcategories: Subcategory[];
  createdAt: string;
  updatedAt: string;
}

// Subcategoría dentro de una categoría
export interface Subcategory {
  id: number;
  categoryId: number;
  name: string;                      // máximo 50 caracteres
  createdAt: string;
}

// Categorías predefinidas del sistema
export const PREDEFINED_CATEGORIES = [
  'Comida',
  'Compras',
  'Corrección',
  'Despensa',
  'Dividendos',
  'Educación',
  'Entretenimiento',
  'Gasolina',
  'ISP',
  'Limpieza',
  'Luz',
  'MX-5',
  'Nómina',
  'Préstamo',
  'Renta',
  'Salud',
  'Telefonía',
  'Transporte',
  'Vales',
] as const;

export type PredefinedCategory = typeof PREDEFINED_CATEGORIES[number];
