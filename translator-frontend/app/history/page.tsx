"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase_client';
import { ArrowLeft, Download, Trash2, Search } from 'lucide-react';
import Footer from '@/components/Footer';
import { useRouter } from 'next/navigation';

interface Translation {
  id: string;
  input_text: string;
  output_text: string;
  source_lang: string | null;
  target_lang: string;
  modality: string;
  created_at: string;
}

export default function History() {
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [filteredTranslations, setFilteredTranslations] = useState<Translation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchTranslations();
    }
  }, [user]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = translations.filter(
        (t) =>
          t.input_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.output_text.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTranslations(filtered);
    } else {
      setFilteredTranslations(translations);
    }
  }, [searchQuery, translations]);

  const fetchTranslations = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/v1/translate/history`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setTranslations(data.translations || []);
      setFilteredTranslations(data.translations || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) {
      toast.error('You must be logged in to delete translations.');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/v1/translate/history/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setTranslations((prev) => prev.filter((t) => t.id !== id));
      toast.success('The translation has been removed.');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleExport = async () => {
    if (!user) {
      toast.error('You must be logged in to export translations.');
      return;
    }

    try {
      const csvContent = [
        ['Date', 'Source Language', 'Target Language', 'Modality', 'Input Text', 'Output Text'].join(','),
        ...filteredTranslations.map(t => [
          new Date(t.created_at).toLocaleDateString(),
          t.source_lang || 'Auto',
          t.target_lang,
          t.modality,
          `"${t.input_text.replace(/"/g, '""')}"`,
          `"${t.output_text.replace(/"/g, '""')}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'translation-history.csv';
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success('Your translation history has been exported.');
    } catch (error: any) {
      toast.error('Failed to export translation history.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-background flex flex-col">
      <header className="glass-card border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold gradient-text">Translation History</h1>
          </div>
          <Button onClick={handleExport} className="gradient-bg hover:opacity-90">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="glass-card rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search translations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>

          {authLoading || loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : !user ? (
            <div className="text-center py-12 text-muted-foreground">
              Please log in to view your translation history.
            </div>
          ) : filteredTranslations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? 'No translations found' : 'No translation history yet'}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTranslations.map((translation) => (
                <div
                  key={translation.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium capitalize">{translation.modality}</span>
                        <span>•</span>
                        <span>{new Date(translation.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>
                          {translation.source_lang || 'Auto'} → {translation.target_lang}
                        </span>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Input:</p>
                          <p className="text-sm line-clamp-3">{translation.input_text}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Output:</p>
                          <p className="text-sm line-clamp-3">{translation.output_text}</p>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(translation.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
