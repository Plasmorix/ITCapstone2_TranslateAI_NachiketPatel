import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient, TextTranslateRequest } from '@/lib/api';
import { useAuthErrorHandler } from './useAuthErrorHandler';

export function useTextTranslation() {
  const { handleError } = useAuthErrorHandler();
  
  return useMutation({
    mutationFn: (request: TextTranslateRequest) => apiClient.translateText(request),
    onError: (error) => {
      console.error('Translation error:', error);
      handleError(error);
    },
  });
}

export function useDocumentTranslation() {
  const { handleError } = useAuthErrorHandler();
  
  return useMutation({
    mutationFn: ({ file, sourceLang, targetLang }: { file: File; sourceLang: string; targetLang: string }) => 
      apiClient.translateDocument(file, sourceLang, targetLang),
    onError: (error) => {
      console.error('Document translation error:', error);
      handleError(error);
    },
  });
}

export function useImageTranslation() {
  const { handleError } = useAuthErrorHandler();
  
  return useMutation({
    mutationFn: ({ file, sourceLang, targetLang }: { file: File; sourceLang: string; targetLang: string }) => 
      apiClient.translateImage(file, sourceLang, targetLang),
    onError: (error) => {
      console.error('Image translation error:', error);
      handleError(error);
    },
  });
}

export function useAudioTranslation() {
  const { handleError } = useAuthErrorHandler();
  
  return useMutation({
    mutationFn: ({ file, targetLang }: { file: File; targetLang: string }) => 
      apiClient.translateAudio(file, targetLang),
    onError: (error) => {
      console.error('Audio translation error:', error);
      handleError(error);
    },
  });
}

export function useSupportedLanguages() {
  const { handleError } = useAuthErrorHandler();
  
  return useQuery({
    queryKey: ['supported-languages'],
    queryFn: () => apiClient.getSupportedLanguages(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      if (handleError(error)) {
        return false;
      }
      return failureCount < 3;
    },
  });
}