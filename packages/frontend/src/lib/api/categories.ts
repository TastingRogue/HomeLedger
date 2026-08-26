/**
 * API client module for categories management.
 * Provides typed functions for listing, creating, editing, and deleting categories,
 * as well as fetching category analysis data.
 */

import { apiGet, apiPost, apiPut, apiDelete } from './client';

// ─── Types ───

export interface Subcategory {
  id: number;
  categoryId: number;
  name: string;
  createdAt: string;
}

export interface Category {
  id: number;
  userId: number | null;
  name: string;
  icon: string | null;
  color: string | null;
  type: 'Gasto' | 'Ingreso' | 'Ambos';
  isSystem: boolean;
  createdAt: string;
  subcategories: Subcategory[];
}

export interface CategoryAnalysisItem {
  categoryId: number;
  categoryName: string;
  total: number;
  percentage: number;
}

export interface CreateCategoryPayload {
  name: string;
  icon?: string;
  color?: string;
  type?: 'Gasto' | 'Ingreso' | 'Ambos';
}

export interface UpdateCategoryPayload {
  name?: string;
  icon?: string | null;
  color?: string | null;
  type?: 'Gasto' | 'Ingreso' | 'Ambos';
}

// ─── API Functions ───

/**
 * List all categories (system + user-created) with their subcategories.
 */
export async function listCategories(): Promise<Category[]> {
  return apiGet<Category[]>('/categories');
}

/**
 * Get category expense analysis with optional date range.
 */
export async function getCategoryAnalysis(startDate?: string, endDate?: string): Promise<CategoryAnalysisItem[]> {
  const params: Record<string, string | undefined> = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  return apiGet<CategoryAnalysisItem[]>('/categories/analysis', params);
}

/**
 * Create a new category.
 */
export async function createCategory(payload: CreateCategoryPayload): Promise<Category> {
  return apiPost<Category>('/categories', payload);
}

/**
 * Update an existing category.
 */
export async function updateCategory(id: number, payload: UpdateCategoryPayload): Promise<Category> {
  return apiPut<Category>(`/categories/${id}`, payload);
}

/**
 * Delete a category (only if no transactions are associated).
 */
export async function deleteCategory(id: number): Promise<{ message: string }> {
  return apiDelete<{ message: string }>(`/categories/${id}`);
}

/**
 * Create a subcategory under a parent category.
 */
export async function createSubcategory(categoryId: number, name: string): Promise<Subcategory> {
  return apiPost<Subcategory>(`/categories/${categoryId}/subcategories`, { name });
}
