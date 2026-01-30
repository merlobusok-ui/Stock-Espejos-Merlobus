
import React from 'react';
import { 
  LayoutDashboard, 
  Calculator, 
  Factory, 
  Package, 
  Layers, 
  Save, 
  Settings, 
  History 
} from 'lucide-react';
import { ViewType } from './types';

export const INITIAL_CATALOG = [
  { sku: 'ESP-STA-3-DER', marca: 'Starbus', modelo: '3', lado: 'Der', min: 5, stock: 0, wip: 0 },
  { sku: 'ESP-STA-3-IZQ', marca: 'Starbus', modelo: '3', lado: 'Izq', min: 5, stock: 0, wip: 0 },
  { sku: 'ESP-MAR-G7-DER', marca: 'Marcopolo', modelo: 'G7', lado: 'Der', min: 5, stock: 0, wip: 0 },
  { sku: 'ESP-MAR-G7-IZQ', marca: 'Marcopolo', modelo: 'G7', lado: 'Izq', min: 5, stock: 0, wip: 0 },
  { sku: 'ESP-MAR-G7N-DER', marca: 'Marcopolo', modelo: 'G7 New', lado: 'Der', min: 5, stock: 0, wip: 0 },
  { sku: 'ESP-MAR-G7N-IZQ', marca: 'Marcopolo', modelo: 'G7 New', lado: 'Izq', min: 5, stock: 0, wip: 0 },
  { sku: 'ESP-MAR-VIA-DER', marca: 'Marcopolo', modelo: 'Viaggio', lado: 'Der', min: 5, stock: 0, wip: 0 },
  { sku: 'ESP-MAR-VIA-IZQ', marca: 'Marcopolo', modelo: 'Viaggio', lado: 'Izq', min: 5, stock: 0, wip: 0 },
  { sku: 'ESP-SAL-AVA-DER', marca: 'Saldivia', modelo: 'Avanzado', lado: 'Der', min: 5, stock: 0, wip: 0 },
  { sku: 'ESP-SAL-AVA-IZQ', marca: 'Saldivia', modelo: 'Avanzado', lado: 'Izq', min: 5, stock: 0, wip: 0 },
  { sku: 'ESP-SAL-22-DER', marca: 'Saldivia', modelo: '22', lado: 'Der', min: 5, stock: 0, wip: 0 },
  { sku: 'ESP-SAL-22-IZQ', marca: 'Saldivia', modelo: '22', lado: 'Izq', min: 5, stock: 0, wip: 0 },
  { sku: 'ESP-SAL-2911-DER', marca: 'Saldivia', modelo: '2911', lado: 'Der', min: 5, stock: 0, wip: 0 },
  { sku: 'ESP-SAL-2911-IZQ', marca: 'Saldivia', modelo: '2911', lado: 'Izq', min: 5, stock: 0, wip: 0 },
  { sku: 'ESP-SAL-ARI-DER', marca: 'Saldivia', modelo: 'Aries', lado: 'Der', min: 5, stock: 0, wip: 0 },
  { sku: 'ESP-SAL-ARI-IZQ', marca: 'Saldivia', modelo: 'Aries', lado: 'Izq', min: 5, stock: 0, wip: 0 },
  { sku: 'ESP-COM-345-DER', marca: 'Comil', modelo: '345', lado: 'Der', min: 5, stock: 0, wip: 0 },
  { sku: 'ESP-COM-345-IZQ', marca: 'Comil', modelo: '345', lado: 'Izq', min: 5, stock: 0, wip: 0 },
  { sku: 'ESP-COM-INV-DER', marca: 'Comil', modelo: 'Invictus', lado: 'Der', min: 5, stock: 0, wip: 0 },
  { sku: 'ESP-COM-INV-IZQ', marca: 'Comil', modelo: 'Invictus', lado: 'Izq', min: 5, stock: 0, wip: 0 }
];

export const TABS = [
  { id: ViewType.DASHBOARD, label: 'Panel', icon: LayoutDashboard },
  { id: ViewType.PLANNING, label: 'Planificación', icon: Calculator },
  { id: ViewType.OPERATIONS, label: 'Operaciones', icon: Factory },
  { id: ViewType.PRODUCTS, label: 'Stock Real', icon: Package },
  { id: ViewType.RAW_MATERIALS, label: 'Mat. Primas', icon: Layers },
  { id: ViewType.RECIPES, label: 'Recetas', icon: Save },
  { id: ViewType.REPORTS, label: 'Datos y Nube', icon: Settings },
  { id: ViewType.HISTORY, label: 'Historial', icon: History }
];

export const BRAND_COLORS = {
  primary: '#2B3860',
  secondary: '#1e2844',
  accent: '#4F46E5',
  success: '#059669',
  danger: '#DC2626',
  warning: '#D97706'
};
