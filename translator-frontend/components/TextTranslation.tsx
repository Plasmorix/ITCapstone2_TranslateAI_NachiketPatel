import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Copy, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTextTranslation, useSupportedLanguages } from '@/lib/hooks/useTranslation';

export default function TextTranslation() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('en');

  const translateMutation = useTextTranslation();
  const { data: languagesData, isLoading: languagesLoading } = useSupportedLanguages();

  const languages = languagesData?.languages || [];

  const handleTranslate = async () => {
    if (!inputText.trim()) {
      toast.error("Please enter text to translate.");
      return;
    }

    setOutputText('');

    translateMutation.mutate(
      {
        text: inputText,
        source_lang: sourceLang,
        target_lang: targetLang,
      },
      {
        onSuccess: (data) => {
          setOutputText(data.translated_text);
          toast.success('Your text has been translated successfully.');
        },
        onError: (error) => {
          const errorMessage = error instanceof Error ? error.message : 'Translation failed';
          toast.error(errorMessage);
        },
      }
    );
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(outputText);
    toast.success('Translation copied to clipboard.');
  };



  return (
    <div className="space-y-6">
      {translateMutation.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {translateMutation.error instanceof Error
              ? translateMutation.error.message
              : 'Translation failed'}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Input</h2>
            <Select value={sourceLang} onValueChange={setSourceLang} disabled={languagesLoading}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Auto-detect" />
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
          <Textarea
            placeholder="Enter text to translate..."
            className="min-h-[300px] resize-none"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={translateMutation.isPending}
          />
        </div>

        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Translation</h2>
            <Select value={targetLang} onValueChange={setTargetLang} disabled={languagesLoading}>
              <SelectTrigger className="w-40">
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
          <Textarea
            placeholder="Translation will appear here..."
            className="min-h-[300px] resize-none"
            value={outputText}
            readOnly
          />
          {outputText && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 flex justify-center">
          <Button
            onClick={handleTranslate}
            disabled={translateMutation.isPending}
            className="gradient-bg hover:opacity-90 transition-opacity px-12 py-6 text-lg"
          >
            {translateMutation.isPending ? 'Translating...' : 'Translate'}
          </Button>
        </div>
      </div>
    </div>
  );
}
