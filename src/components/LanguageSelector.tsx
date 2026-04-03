import { useLanguage, type Language } from '@/contexts/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const flags: Record<Language, string> = { pt: '🇧🇷', en: '🇺🇸', es: '🇪🇸' };
const labels: Record<Language, string> = { pt: 'Português', en: 'English', es: 'Español' };

interface Props {
  compact?: boolean;
}

export function LanguageSelector({ compact }: Props) {
  const { language, setLanguage } = useLanguage();

  return (
    <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
      <SelectTrigger className={compact ? 'w-14 px-2 justify-center' : 'w-[140px]'}>
        <SelectValue>
          {compact ? flags[language] : `${flags[language]} ${labels[language]}`}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {(['pt', 'en', 'es'] as Language[]).map((l) => (
          <SelectItem key={l} value={l}>
            {flags[l]} {labels[l]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
