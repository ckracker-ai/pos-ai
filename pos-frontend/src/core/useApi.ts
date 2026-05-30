// Hooks for common operations
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, unwrapApiData } from '@/core/api/api-client';
import { Product, Branch, Sale } from '@/core/interfaces';

export function useProducts(options = {}) {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.getProducts();
      return unwrapApiData<Product[]>(response.data);
    },
    ...options,
  });
}

export function useSearchProducts(query: string, options = {}) {
  return useQuery({
    queryKey: ['products', 'search', query],
    queryFn: async () => {
      if (!query) return [];
      const response = await api.searchProducts(query);
      return unwrapApiData<Product[]>(response.data);
    },
    enabled: query.length > 0,
    ...options,
  });
}

export function useSales(options = {}) {
  return useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const response = await api.getSales();
      return unwrapApiData<Sale[]>(response.data);
    },
    ...options,
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: unknown) => api.createSale(data as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
}

export function useBranches(options = {}) {
  return useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.getBranches();
      return unwrapApiData<Branch[]>(response.data);
    },
    ...options,
  });
}
