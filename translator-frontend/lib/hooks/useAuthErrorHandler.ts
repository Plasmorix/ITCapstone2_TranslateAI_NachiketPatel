import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { AuthError } from '@/lib/api';

export function useAuthErrorHandler() {
  const router = useRouter();

  const handleError = useCallback((error: unknown) => {
    if (error instanceof AuthError) {
      toast.error('Session expired. Please log in again.');
      router.push('/login');
      return true;
    }
    return false;
  }, [router]);

  return { handleError };
}