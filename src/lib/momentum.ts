export type MomentumLevel = "fresh" | "warming" | "heating" | "fire";

export const calculateMomentum = (
  likes: number,
  comments: number,
  views: number,
  createdAt: Date
): number => {
  const now = new Date();
  const ageInDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

  // Points from engagement
  const likePoints = likes * 10;
  const commentPoints = comments * 15;
  const viewPoints = views * 2;

  // Waiting time multiplier (increases over time)
  const waitingMultiplier = Math.min(1 + ageInDays * 0.1, 3);

  const totalScore = (likePoints + commentPoints + viewPoints) * waitingMultiplier;

  return Math.round(totalScore);
};

export const getMomentumLevel = (score: number): MomentumLevel => {
  if (score < 50) return "fresh";
  if (score < 150) return "warming";
  if (score < 300) return "heating";
  return "fire";
};