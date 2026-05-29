import { useAuthStore } from '@/store/auth';
import { UserRole } from '@/core/interfaces';

export function useAuthCheck() {
  const { user, isAuthenticated, token } = useAuthStore();

  const hasRole = (role: UserRole | UserRole[]) => {
    if (!isAuthenticated || !user) return false;
    
    if (Array.isArray(role)) {
      return role.includes(user.role);
    }
    
    return user.role === role;
  };

  const isAdmin = () => hasRole('admin');
  const isAuditor = () => hasRole('auditor');
  const isComanda = () => hasRole('comanda');
  const isSeller = () => hasRole('seller');
  
  const canAccess = (allowedRoles: UserRole[]) => {
    return isAuthenticated && user && allowedRoles.includes(user.role);
  };

  return {
    user,
    isAuthenticated,
    token,
    hasRole,
    isAdmin,
    isAuditor,
    isComanda,
    isSeller,
    canAccess,
  };
}
