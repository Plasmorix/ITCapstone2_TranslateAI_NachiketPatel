import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CloudUpload, Loader2 } from 'lucide-react';
import { useImageTranslation, useSupportedLanguages } from '@/lib/hooks/useTranslation';

export default function ImageTranslation() {
  const [image, setImage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [translation, setTranslation] = useState('');
  const [targetLang, setTargetLang] = useState('en');
  const [sourceLang, setSourceLang] = useState('auto');
  const [isDragging, setIsDragging] = useState(false);

  const translateMutation = useImageTranslation();
  const { data: languagesData, isLoading: languagesLoading } = useSupportedLanguages();

  const languages = languagesData?.languages || [];

  const processImage = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Maximum file size is 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
    };
    reader.readAsDataURL(file);

    translateMutation.mutate(
      { file, sourceLang, targetLang },
      {
        onSuccess: (data) => {
          setExtractedText(data.extracted_text);
          setTranslation(data.translated_text);
          toast.success('Image translation completed successfully.');
        },
        onError: (error) => {
          const errorMessage = error instanceof Error ? error.message : 'Image translation failed';
          toast.error(errorMessage);
        },
      }
    );
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processImage(file);
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
    if (file && file.type.startsWith('image/')) {
      await processImage(file);
    } else {
      toast.error('Please upload an image file.');
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((type) => type.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], 'clipboard-image.png', { type: imageType });
          await processImage(file);
          return;
        }
      }
      toast.error('No image found in clipboard.');
    } catch (error) {
      toast.error('Please allow clipboard access or use the browse button.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="glass-card rounded-2xl p-4">
        <h2 className="text-xl font-semibold mb-4">Image Translation</h2>
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
            className={`flex flex-col items-center justify-center p-8 border-r border-border transition-colors ${isDragging ? 'bg-primary/5' : ''
              }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {translateMutation.isPending ? (
              <>
                <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground">Processing image...</p>
              </>
            ) : (
              <>
                <CloudUpload className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg text-foreground font-medium">Drag and drop</p>
              </>
            )}
          </div>

          <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
              id="image-upload"
              disabled={translateMutation.isPending}
            />
            <label htmlFor="image-upload" className="w-full">
              <Button
                className="w-full gradient-bg hover:opacity-90"
                size="lg"
                disabled={translateMutation.isPending}
                asChild
              >
                <span>Browse your files</span>
              </Button>
            </label>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={handlePasteFromClipboard}
              disabled={translateMutation.isPending}
            >
              Paste from clipboard
            </Button>
            <p className="text-xs text-muted-foreground text-center pt-2">
              Supported file types: .jpg, .jpeg, .png, .webp
            </p>
          </div>
        </div>
      </div>

      {image && (
        <div className="glass-card rounded-2xl p-6">
          <p className="text-sm text-muted-foreground mb-3">Uploaded Image:</p>
          <img src={image} alt="Uploaded" className="max-h-96 mx-auto rounded-lg border border-border" />
        </div>
      )}

      {extractedText && translation && (
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-6 border border-border">
            <p className="text-sm text-muted-foreground mb-3">Extracted Text:</p>
            <div className="p-4 bg-muted/50 rounded-lg max-h-48 overflow-y-auto">
              <p className="whitespace-pre-wrap">{extractedText}</p>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-primary/20 bg-primary/5">
            <p className="text-sm text-muted-foreground mb-3">Translation:</p>
            <div className="p-4 bg-background/50 rounded-lg max-h-48 overflow-y-auto">
              <p className="whitespace-pre-wrap">{translation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
