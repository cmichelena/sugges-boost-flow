export type MomentumLevel = "fresh" | "warming" | "heating" | "fire";

/**
 * Calculate a momentum score for a suggestion based on engagement and recency.
 * Uses weighted reaction score instead of simple likes.
 * @param reactionScore Weighted reaction score (champion=+2, support=+1, neutral=0, concerns=-1)
 * @param comments Number of comments
 * @param views Number of views
 * @param createdAt When the suggestion was created
 * @returns A score between 0 and 100+
 */
export const calculateMomentum = (
  reactionScore: number,
  comments: number,
  views: number,
  createdAt: Date
): number => {
  const now = new Date();
  const ageInDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

  // Points from engagement - reaction score can be negative
  // Scale reaction score more significantly since it represents weighted reactions
  const reactionPoints = reactionScore * 12; // Each point of reaction score = 12 momentum points
  const commentPoints = comments * 15;
  const viewPoints = views * 2;

  // Waiting time multiplier (increases over time)
  const waitingMultiplier = Math.min(1 + ageInDays * 0.1, 3);

  // Base engagement (ensure minimum of 0)
  const baseScore = Math.max(0, reactionPoints + commentPoints + viewPoints);
  const totalScore = baseScore * waitingMultiplier;

  return Math.round(totalScore);
};

export const getMomentumLevel = (score: number): MomentumLevel => {
  if (score < 50) return "fresh";
  if (score < 150) return "warming";
  if (score < 300) return "heating";
  return "fire";
};

/**
 * Calculate weighted reaction score from individual reaction counts
 */
export const calculateReactionScore = (
  champion: number,
  support: number,
  neutral: number,
  concerns: number
): number => {
  return (champion * 2) + (support * 1) + (neutral * 0) + (concerns * -1);
};
