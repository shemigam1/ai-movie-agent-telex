import { createTool } from '@mastra/core';
import { z } from 'zod';

const recommendationCache = {
  mood: null,
  recommendations: null,
  timestamp: null};
const movieRecommendationTool = createTool({
  id: "movie-recommendation",
  description: "Recommends movies based on user mood with intelligent caching",
  inputSchema: z.object({
    mood: z.string().describe(
      "The user's current mood (e.g., happy, sad, excited, relaxed, scared)"
    ),
    cacheTTL: z.number().default(18e5).describe(
      "Cache time-to-live in milliseconds (default: 1800000 = 30 minutes)"
    ),
    limit: z.number().default(5).describe("Number of movie recommendations to return (default: 5)")
  }),
  outputSchema: z.object({
    mood: z.string(),
    recommendations: z.array(
      z.object({
        title: z.string(),
        genre: z.string(),
        description: z.string(),
        matchScore: z.number()
      })
    ),
    cached: z.boolean(),
    timestamp: z.string(),
    cacheAge: z.number().optional(),
    moodChanged: z.boolean().optional()
  }),
  execute: async ({ context }) => {
    const { mood, cacheTTL, limit } = context;
    const now = Date.now();
    const cacheAge = recommendationCache.timestamp ? now - recommendationCache.timestamp : Infinity;
    const isCacheFresh = cacheAge < cacheTTL;
    const isSameMood = recommendationCache.mood === mood;
    if (isCacheFresh && isSameMood && recommendationCache.recommendations !== null) {
      console.log(
        `[MovieAgent] \u2705 Cache HIT - Mood: "${mood}" (age: ${Math.round(cacheAge / 1e3)}s)`
      );
      return {
        mood,
        recommendations: recommendationCache.recommendations.slice(0, limit),
        cached: true,
        cacheAge: Math.round(cacheAge / 1e3),
        timestamp: new Date(recommendationCache.timestamp).toISOString()
      };
    }
    console.log(
      `[MovieAgent] \u{1F3AF} Cache MISS - Generating recommendations for mood: "${mood}"`
    );
    try {
      const recommendations = generateMovieRecommendations(mood, limit);
      const moodChanged = recommendationCache.mood !== null && recommendationCache.mood !== mood;
      recommendationCache.mood = mood;
      recommendationCache.recommendations = recommendations;
      recommendationCache.timestamp = now;
      if (moodChanged) {
        console.log(
          `[MovieAgent] \u{1F504} MOOD CHANGE: "${recommendationCache.mood}" \u2192 "${mood}"`
        );
      }
      console.log(
        `[MovieAgent] \u{1F3AC} Generated ${recommendations.length} recommendations for "${mood}"`
      );
      return {
        mood,
        recommendations,
        cached: false,
        timestamp: new Date(now).toISOString(),
        moodChanged
      };
    } catch (error) {
      console.error(
        `[MovieAgent] \u274C Recommendation generation FAILED: ${error.message}`
      );
      return {
        mood,
        recommendations: [],
        cached: false,
        timestamp: new Date(now).toISOString()
      };
    }
  }
});
function generateMovieRecommendations(mood, limit) {
  const moodMap = {
    happy: [
      {
        title: "The Grand Budapest Hotel",
        genre: "Comedy",
        description: "A whimsical caper about a legendary concierge",
        matchScore: 95
      },
      {
        title: "Paddington 2",
        genre: "Family Comedy",
        description: "A charming adventure with a beloved bear",
        matchScore: 94
      },
      {
        title: "Knives Out",
        genre: "Mystery Comedy",
        description: "A clever and entertaining whodunit",
        matchScore: 92
      },
      {
        title: "Am\xE9lie",
        genre: "Romantic Comedy",
        description: "A whimsical journey through Paris",
        matchScore: 93
      },
      {
        title: "School of Rock",
        genre: "Comedy Drama",
        description: "Inspiring and fun musical comedy",
        matchScore: 91
      }
    ],
    sad: [
      {
        title: "Life is Beautiful",
        genre: "Drama",
        description: "A poignant story of hope and love",
        matchScore: 96
      },
      {
        title: "The Shawshank Redemption",
        genre: "Drama",
        description: "A moving tale of friendship and perseverance",
        matchScore: 95
      },
      {
        title: "Moonlight",
        genre: "Drama",
        description: "An intimate exploration of identity",
        matchScore: 93
      },
      {
        title: "Manchester by the Sea",
        genre: "Drama",
        description: "A tender story about grief and healing",
        matchScore: 92
      },
      {
        title: "About Time",
        genre: "Drama Romance",
        description: "A heartfelt film about love and family",
        matchScore: 91
      }
    ],
    excited: [
      {
        title: "Mad Max: Fury Road",
        genre: "Action",
        description: "An adrenaline-pumping post-apocalyptic adventure",
        matchScore: 94
      },
      {
        title: "Top Gun: Maverick",
        genre: "Action Drama",
        description: "High-octane aerial thrills",
        matchScore: 93
      },
      {
        title: "Inception",
        genre: "Sci-Fi Action",
        description: "Mind-bending action and stunning visuals",
        matchScore: 92
      },
      {
        title: "The Dark Knight",
        genre: "Action Thriller",
        description: "Epic superhero action with depth",
        matchScore: 93
      },
      {
        title: "Baby Driver",
        genre: "Action Crime",
        description: "Fast-paced action set to great music",
        matchScore: 91
      }
    ],
    relaxed: [
      {
        title: "Spirited Away",
        genre: "Animation Fantasy",
        description: "A serene and magical animated journey",
        matchScore: 95
      },
      {
        title: "Midnight in Paris",
        genre: "Romance Fantasy",
        description: "A dreamy romantic escape",
        matchScore: 92
      },
      {
        title: "My Neighbor Totoro",
        genre: "Animation Family",
        description: "A peaceful and wholesome animated classic",
        matchScore: 94
      },
      {
        title: "Lost in Translation",
        genre: "Drama",
        description: "A quiet and contemplative film",
        matchScore: 91
      },
      {
        title: "Garden State",
        genre: "Comedy Drama",
        description: "A laid-back indie gem",
        matchScore: 90
      }
    ],
    scared: [
      {
        title: "The Shining",
        genre: "Horror",
        description: "A psychological horror masterpiece",
        matchScore: 95
      },
      {
        title: "Hereditary",
        genre: "Horror",
        description: "A deeply unsettling supernatural thriller",
        matchScore: 93
      },
      {
        title: "A Quiet Place",
        genre: "Horror Thriller",
        description: "Tense and terrifying with minimal dialogue",
        matchScore: 92
      },
      {
        title: "Get Out",
        genre: "Horror Thriller",
        description: "A smart and shocking thriller",
        matchScore: 94
      },
      {
        title: "The Conjuring",
        genre: "Horror",
        description: "A well-crafted haunted house experience",
        matchScore: 91
      }
    ]
  };
  const normalizedMood = mood.toLowerCase().trim();
  const recommendations = moodMap[normalizedMood] || moodMap.relaxed;
  return recommendations.slice(0, limit);
}

export { movieRecommendationTool };
