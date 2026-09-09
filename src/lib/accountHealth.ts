 // Mock account engagement analyzer
// Generates realistic randomized metrics for a given username

export interface EngagementMetrics {
  engagementRate: number;
  avgLikes: number;
  avgComments: number;
  followerGrowth: number;
  reach: number;
}

export function analyzeAccountEngagement(username: string): EngagementMetrics {
  const baseRate = Math.random() * (8 - 1) + 1;
  const likes = Math.floor(Math.random() * (1000 - 50 + 1)) + 50;
  const comments = Math.floor(Math.random() * (100 - 5 + 1)) + 5;
  const growth = Math.random() * (15 - (-3) + 1) + (-3);
  const reach = Math.floor(Math.random() * (50000 - 5000 + 1)) + 5000;

  return {
    engagementRate: parseFloat(baseRate.toFixed(2)),
    avgLikes: likes,
    avgComments: comments,
    followerGrowth: parseFloat(growth.toFixed(1)),
    reach,
  };
}
