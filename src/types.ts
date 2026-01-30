
export enum ViewType {
  DASHBOARD = 'dashboard',
  PLANNING = 'planning',
  OPERATIONS = 'operations',
  PRODUCTS = 'products',
  RAW_MATERIALS = 'mps',
  RECIPES = 'recipes',
  HISTORY = 'history',
  REPORTS = 'reports'
}

export interface Product {
  id: string;
  sku: string;
  marca: string;
  modelo: string;
  lado: string;
  min: number;
  stock: number;
  wip: number;
  createdAt?: any;
}

export interface RawMaterial {
  id: string;
  sku: string;
  desc: string;
  min: number;
  stock: number;
  pending: number;
  wip?: number; // Stock en proceso de fabricación para insumos semielaborados
  createdAt?: any;
}

export interface Recipe {
  id: string;
  targetId: string; // ID del producto o insumo al que pertenece la receta
  targetType: 'product' | 'mp';
  mpId: string;   // ID del material utilizado
  qty: number;
}

export interface ProductionOrder {
  id: string;
  targetId: string;
  targetType: 'product' | 'mp';
  productName: string;
  qty: number;
  status: 'in_progress' | 'completed';
  startedAt: any;
  startedBy: string;
}

export interface Movement {
  id: string;
  ts: any;
  tipo: string;
  detalle: string;
  user: string;
}

export interface UserProfile {
  name: string;
  role: 'admin' | 'operator' | 'viewer';
}
