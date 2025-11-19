import { Flame } from "lucide-react";

type MomentumLevel = "fresh" | "warming" | "heating" | "fire";

interface MomentumDialProps {
  level: MomentumLevel;
  score: number;
  size?: "sm" | "lg";
}

const levelConfig: Record<MomentumLevel, {
  label: string;
  color: string;
  bgColor: string;
  rotation: string;
  pulse?: boolean;
}> = {
  fresh: {
    label: "Fresh",
    color: "text-momentum-fresh",
    bgColor: "bg-momentum-fresh/10",
    rotation: "rotate-[-45deg]",
  },
  warming: {
    label: "Warming Up",
    color: "text-momentum-warming",
    bgColor: "bg-momentum-warming/10",
    rotation: "rotate-0",
  },
  heating: {
    label: "Heating Up",
    color: "text-momentum-heating",
    bgColor: "bg-momentum-heating/10",
    rotation: "rotate-45",
  },
  fire: {
    label: "On Fire",
    color: "text-momentum-fire",
    bgColor: "bg-momentum-fire/10",
    rotation: "rotate-90",
    pulse: true,
  },
};

export const MomentumDial = ({ level, score, size = "sm" }: MomentumDialProps) => {
  const config = levelConfig[level];
  const isSmall = size === "sm";

  return (
    <div className={`flex items-center gap-2 ${isSmall ? "" : "flex-col"}`}>
      <div
        className={`relative ${isSmall ? "w-10 h-10" : "w-24 h-24"} ${config.bgColor} rounded-full flex items-center justify-center transition-all duration-300`}
      >
        <Flame
          className={`${isSmall ? "w-5 h-5" : "w-12 h-12"} ${config.color} transition-all duration-500 ${config.rotation} ${config.pulse ? "animate-pulse" : ""}`}
        />
      </div>
      {!isSmall && (
        <div className="text-center">
          <div className={`font-semibold ${config.color}`}>{config.label}</div>
          <div className="text-sm text-muted-foreground">{score} points</div>
        </div>
      )}
    </div>
  );
};