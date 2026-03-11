import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";

export const SuggestionDisclaimer = () => {
  const { t } = useTranslation();

  return (
    <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border/50">
      <div className="flex items-start gap-2">
        <Info className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground space-y-1">
          <p className="font-medium">{t("suggestion.disclaimerTitle")}</p>
          <p>{t("suggestion.disclaimerDesc")}</p>
          <p className="font-medium">{t("suggestion.disclaimerWarning")}</p>
          <p>{t("suggestion.disclaimerAdvice")}</p>
        </div>
      </div>
    </div>
  );
};
