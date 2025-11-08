"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, History, Settings } from 'lucide-react';
import TextTranslation from '@/components/TextTranslation';
import VoiceTranslation from '@/components/VoiceTranslation';
import ImageTranslation from '@/components/ImageTranslation';
import DocumentTranslation from '@/components/DocumentTranslation';
import Footer from '@/components/Footer';

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('text');
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-background">
        {/* Header */}
        <header className="glass-card border-b sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-3xl font-bold gradient-text">TranslateAI</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                Welcome back, <span className="font-semibold text-foreground">{fullName}</span>
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/history')}
                title="History"
              >
                <History className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/settings')}
                title="Settings"
              >
                <Settings className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                title="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 max-w-2xl mx-auto mb-8">
              <TabsTrigger value="text">Text</TabsTrigger>
              <TabsTrigger value="voice">Voice</TabsTrigger>
              <TabsTrigger value="image">Image</TabsTrigger>
              <TabsTrigger value="document">Document</TabsTrigger>
            </TabsList>

            <TabsContent value="text">
              <TextTranslation />
            </TabsContent>

            <TabsContent value="voice">
              <VoiceTranslation />
            </TabsContent>

            <TabsContent value="image">
              <ImageTranslation />
            </TabsContent>

            <TabsContent value="document">
              <DocumentTranslation />
            </TabsContent>
          </Tabs>
        </main>
        <Footer />
      </div>
    )
  }

  return null;
}
