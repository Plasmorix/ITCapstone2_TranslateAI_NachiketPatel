// API client for translator backend
import { supabase } from '@/lib/supabase_client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface TextTranslateRequest {
  text: string;
  source_lang: string;
  target_lang: string;
}

export interface TextTranslateResponse {
  translated_text: string;
  source_lang: string;
  target_lang: string;
  original_text: string;
}

export interface Language {
  code: string;
  name: string;
}

export interface SupportedLanguagesResponse {
  languages: Language[];
}

export interface AudioTranslateResponse {
  transcribed_text: string;
  translated_text: string;
  target_lang: string;
  original_filename: string;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new AuthError('No valid session found');
    }

    return {
      'Authorization': `Bearer ${session.access_token}`,
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const authHeaders = await this.getAuthHeaders();
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new AuthError('Invalid authentication');
        }
        
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new Error(error instanceof Error ? error.message : 'Request failed');
    }
  }

  async translateText(request: TextTranslateRequest): Promise<TextTranslateResponse> {
    return this.request<TextTranslateResponse>('/v1/translate/text', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async translateDocument(file: File, sourceLang: string, targetLang: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('source_lang', sourceLang);
    formData.append('target_lang', targetLang);

    const authHeaders = await this.getAuthHeaders();
    
    const response = await fetch(`${this.baseUrl}/v1/translate/document`, {
      method: 'POST',
      headers: {
        ...authHeaders,
      },
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new AuthError('Invalid authentication');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async translateImage(file: File, sourceLang: string, targetLang: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('source_lang', sourceLang);
    formData.append('target_lang', targetLang);

    const authHeaders = await this.getAuthHeaders();
    
    const response = await fetch(`${this.baseUrl}/v1/translate/image`, {
      method: 'POST',
      headers: {
        ...authHeaders,
      },
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new AuthError('Invalid authentication');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async translateAudio(file: File, targetLang: string): Promise<AudioTranslateResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_lang', targetLang);

    const authHeaders = await this.getAuthHeaders();
    
    const response = await fetch(`${this.baseUrl}/v1/translate/audio`, {
      method: 'POST',
      headers: {
        ...authHeaders,
      },
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new AuthError('Invalid authentication');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getSupportedLanguages(): Promise<SupportedLanguagesResponse> {
    const response = await fetch(`${this.baseUrl}/v1/translate/text/languages`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
}

export const apiClient = new ApiClient();