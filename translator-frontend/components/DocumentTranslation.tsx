import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CloudUpload, Loader2, FileText } from 'lucide-react';
import { useDocumentTranslation, useSupportedLanguages } from '@/lib/hooks/useTranslation';

export default function DocumentTranslation() {
  const [fileName, setFileName] = useState('');
  const [translation, setTranslation] = useState('');
  const [targetLang, setTargetLang] = useState('en');
  const [sourceLang, setSourceLang] = useState('auto');
  const [isDragging, setIsDragging] = useState(false);

  const translateMutation = useDocumentTranslation();
  const { data: languagesData, isLoading: languagesLoading } = useSupportedLanguages();

  const languages = languagesData?.languages || [];
  
  const processDocument = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Maximum file size is 5MB.');
      return;
    }

    setFileName(file.name);
    setTranslation('');

    translateMutation.mutate(
      { file, sourceLang, targetLang },
      {
        onSuccess: (data) => {
          setTranslation(data.translated_text);
          toast.success('Document translation completed successfully.');
        },
        onError: (error) => {
          const errorMessage = error instanceof Error ? error.message : 'Document translation failed';
          toast.error(errorMessage);
        },
      }
    );
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processDocument(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    const validTypes = ['.txt', '.md', '.csv', '.yaml', '.yml', '.pdf'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (file && validTypes.includes(fileExtension)) {
      await processDocument(file);
    } else {
      toast.error('Please upload a TXT, MD, CSV, YAML, YML, or PDF file.');
    }
  };


  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="glass-card rounded-2xl p-4">
        <h2 className="text-xl font-semibold mb-4">Document Translation</h2>
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">From:</span>
            <Select value={sourceLang} onValueChange={setSourceLang} disabled={languagesLoading}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-detect</SelectItem>
                {languages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <span className="text-sm text-muted-foreground">→</span>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">To:</span>
            <Select value={targetLang} onValueChange={setTargetLang} disabled={languagesLoading}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl border border-border overflow-hidden">
        <div className="grid md:grid-cols-2 min-h-[280px]">
          <div
            className={`flex flex-col items-center justify-center p-8 border-r border-border transition-colors ${
              isDragging ? 'bg-primary/5' : ''
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {translateMutation.isPending ? (
              <>
                <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground">Processing document...</p>
              </>
            ) : (
              <>
                <CloudUpload className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg text-foreground font-medium">Drag and drop your document</p>
              </>
            )}
          </div>

          <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <input
              type="file"
              accept=".txt,.md,.csv,.yaml,.yml,.pdf"
              onChange={handleFileSelect}
              className="hidden"
              id="document-upload"
              disabled={translateMutation.isPending}
            />
            <label htmlFor="document-upload" className="w-full">
              <Button
                className="w-full gradient-bg hover:opacity-90"
                size="lg"
                disabled={translateMutation.isPending}
                asChild
              >
                <span>Browse your files</span>
              </Button>
            </label>
            <p className="text-xs text-muted-foreground text-center pt-2">
              Supported file types: .txt, .md, .csv, .yaml, .yml, .pdf
            </p>
          </div>
        </div>
      </div>

      {fileName && (
        <div className="glass-card rounded-2xl p-4 border border-border">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">{fileName}</span>
          </div>
        </div>
      )}

      {translation && (
        <div className="glass-card rounded-2xl p-6 border border-primary/20 bg-primary/5">
          <p className="text-sm text-muted-foreground mb-3">Translated Document:</p>
          <div className="p-4 bg-background/50 rounded-lg max-h-96 overflow-y-auto">
            <p className="whitespace-pre-wrap leading-relaxed">{translation}</p>
          </div>
        </div>
      )}
    </div>
  );
}
