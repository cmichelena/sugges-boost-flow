type MomentumLevel = "fresh" | "warming" | "heating" | "fire";

interface MomentumDialProps {
  level: MomentumLevel;
  score: number;
  size?: "sm" | "lg";
}

const levelConfig: Record<
  MomentumLevel,
  {
    label: string;
    color: string;
    percentage: number;
  }
> = {
  fresh: {
    label: "Fresh",
    color: "hsl(var(--momentum-fresh))",
    percentage: 20,
  },
  warming: {
    label: "Warming Up",
    color: "hsl(var(--momentum-warming))",
    percentage: 45,
  },
  heating: {
    label: "Heating Up",
    color: "hsl(var(--momentum-heating))",
    percentage: 70,
  },
  fire: {
    label: "On Fire",
    color: "hsl(var(--momentum-fire))",
    percentage: 95,
  },
};

export const MomentumDial = ({ level, score, size = "sm" }: MomentumDialProps) => {
  const config = levelConfig[level];
  const isSmall = size === "sm";
  
  const diameter = isSmall ? 64 : 120;
  const strokeWidth = isSmall ? 6 : 10;
  const radius = (diameter - strokeWidth) / 2;
  const circumference = Math.PI * radius;
  
  // Gauge goes from -90° to 90° (180° semicircle)
  // Calculate arc length shown (accounting for round linecap which adds strokeWidth/2 visually)
  const arcLengthShown = circumference * (config.percentage / 100);
  const arcAngleShown = (arcLengthShown / circumference) * 180;
  
  // Needle points to the visual end of the colored arc
  const needleAngle = -90 + arcAngleShown;
  const needleLength = radius;
  const needleX = diameter / 2 + needleLength * Math.cos((needleAngle * Math.PI) / 180);
  const needleY = diameter / 2 + needleLength * Math.sin((needleAngle * Math.PI) / 180);
  
  // Calculate the arc dash offset - start from beginning
  const progressOffset = circumference * (1 - config.percentage / 100);

  return (
    <div className={`flex items-center gap-2 ${isSmall ? "" : "flex-col"}`}>
      <div className="relative" style={{ width: diameter, height: diameter / 2 + strokeWidth }}>
        <svg
          width={diameter}
          height={diameter / 2 + strokeWidth}
          className="overflow-visible"
        >
          {/* Background arc */}
          <path
            d={`M ${strokeWidth / 2} ${diameter / 2} A ${radius} ${radius} 0 0 1 ${diameter - strokeWidth / 2} ${diameter / 2}`}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          
          {/* Progress arc with solid color based on level */}
          <path
            d={`M ${strokeWidth / 2} ${diameter / 2} A ${radius} ${radius} 0 0 1 ${diameter - strokeWidth / 2} ${diameter / 2}`}
            fill="none"
            stroke={config.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={progressOffset}
            className="transition-all duration-700 ease-out"
            style={{ filter: level === "fire" ? "drop-shadow(0 0 8px currentColor)" : "none" }}
          />
          
          {/* Center pivot point */}
          <circle
            cx={diameter / 2}
            cy={diameter / 2}
            r={isSmall ? 3 : 5}
            fill="hsl(var(--foreground))"
            className="drop-shadow-sm"
          />
          
          {/* Elegant needle */}
          <line
            x1={diameter / 2}
            y1={diameter / 2}
            x2={needleX}
            y2={needleY}
            stroke="hsl(var(--foreground))"
            strokeWidth={isSmall ? 2 : 3}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out drop-shadow-md"
          />
          
          {/* Needle tip dot */}
          <circle
            cx={needleX}
            cy={needleY}
            r={isSmall ? 3 : 4}
            fill={config.color}
            className={`transition-all duration-700 ease-out drop-shadow-lg ${level === "fire" ? "animate-pulse" : ""}`}
          />
        </svg>
      </div>
      
      {!isSmall && (
        <div className="text-center mt-2">
          <div className="font-semibold" style={{ color: config.color }}>
            {config.label}
          </div>
          <div className="text-sm text-muted-foreground">{score} points</div>
        </div>
      )}
    </div>
  );
};