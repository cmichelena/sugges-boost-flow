import { Info } from "lucide-react";

export const SuggestionDisclaimer = () => (
  <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border/50">
    <div className="flex items-start gap-2">
      <Info className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
      <div className="text-sm text-muted-foreground space-y-1">
        <p className="font-medium">🤝 What Suggistit Is (and Isn't) For</p>
        <p>
          Suggistit is designed for everyday workplace improvements — sharing ideas, 
          spotting issues, and helping organisations get better.
        </p>
        <p className="font-medium">
          It is not intended for reporting serious HR, legal, misconduct, or safeguarding concerns.
        </p>
        <p>
          For any sensitive matters, please use your organisation's official reporting 
          channels or speak directly with Human Resources.
        </p>
      </div>
    </div>
  </div>
);
