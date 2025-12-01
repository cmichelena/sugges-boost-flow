import { useTranslation } from "react-i18next";

type MomentumLevel = "fresh" | "warming" | "heating" | "fire";

interface MomentumDialProps {
  level: MomentumLevel;
  score: number;
  size?: "sm" | "lg";
}

const levelConfig: Record<
  MomentumLevel,
  {
    labelKey: string;
    color: string;
    percentage: number;
  }
> = {
  fresh: {
    labelKey: "momentum.fresh",
    color: "hsl(var(--momentum-fresh))",
    percentage: 25,
  },
  warming: {
    labelKey: "momentum.warming",
    color: "hsl(var(--momentum-warming))",
    percentage: 50,
  },
  heating: {
    labelKey: "momentum.heating",
    color: "hsl(var(--momentum-heating))",
    percentage: 75,
  },
  fire: {
    labelKey: "momentum.fire",
    color: "hsl(var(--momentum-fire))",
    percentage: 100,
  },
};

export const MomentumDial = ({ level, score, size = "sm" }: MomentumDialProps) => {
  const { t } = useTranslation();
  const config = levelConfig[level];
  const isSmall = size === "sm";
  
  const diameter = isSmall ? 64 : 120;
  const strokeWidth = isSmall ? 8 : 12;
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate the progress offset for a full circle
  const progressOffset = circumference * (1 - config.percentage / 100);

  return (
    <div className={`flex items-center gap-2 ${isSmall ? "" : "flex-col"}`}>
      <div className="relative" style={{ width: diameter, height: diameter }}>
        <svg
          width={diameter}
          height={diameter}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={diameter / 2}
            cy={diameter / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
          />
          
          {/* Progress circle with color based on level */}
          <circle
            cx={diameter / 2}
            cy={diameter / 2}
            r={radius}
            fill="none"
            stroke={config.color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={progressOffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        
        {/* Score value in center */}
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{ color: config.color }}
        >
          <span className={`font-bold ${isSmall ? "text-sm" : "text-2xl"} ${level === "fire" ? "animate-pulse" : ""}`}>
            {score}
          </span>
        </div>
      </div>
      
      {!isSmall && (
        <div className="text-center mt-2">
          <div className="font-semibold" style={{ color: config.color }}>
            {t(config.labelKey)}
          </div>
          <div className="text-sm text-muted-foreground">{score} points</div>
        </div>
      )}
    </div>
  );
};
