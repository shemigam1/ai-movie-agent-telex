import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const movieRecommendationTool = createTool({
  id: "wasiu_the_cinephile",
  description:
    "Get movie recommendations by analyzing user input with Gemini to determine mood, then fetching from TMDB",
  inputSchema: z.object({
    userInput: z
      .string()
      .describe(
        "User's description of their current state or what they want to watch"
      ),
    limit: z
      .number()
      .default(5)
      .describe("Number of recommendations to return"),
  }),
  outputSchema: z.object({
    detectedMood: z.string(),
    moodConfidence: z.number(),
    recommendations: z.array(
      z.object({
        id: z.number(),
        title: z.string(),
        overview: z.string(),
        rating: z.number(),
        releaseDate: z.string(),
        runtime: z.number(),
        genres: z.array(z.string()),
        popularity: z.number(),
      })
    ),
    count: z.number(),
  }),
  execute: async ({ context }) => {
    const { userInput, limit } = context;
    const tmdbApiKey = process.env.TMDB_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!tmdbApiKey) {
      throw new Error("TMDB_API_KEY not configured");
    }
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    try {
      // Step 1: Use Gemini to analyze user input and determine mood
      const { mood, confidence } = await determineMoodWithGemini(
        userInput,
        geminiApiKey
      );

      // Step 2: Map mood to TMDB genre ID
      const genreId = mapMoodToGenreId(mood);

      // Step 3: Fetch movies from TMDB based on genre
      const recommendations = await fetchMoviesFromTMDB(
        tmdbApiKey,
        genreId,
        limit
      );

      return {
        detectedMood: mood,
        moodConfidence: confidence,
        recommendations,
        count: recommendations.length,
      };
    } catch (error) {
      console.error("[Movie Tool] Error:", error);
      throw error;
    }
  },
});

/**
 * Uses Gemini AI to analyze user input and determine their mood
 */
async function determineMoodWithGemini(
  userInput: string,
  apiKey: string
): Promise<{ mood: string; confidence: number }> {
  try {
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: "gemini-2.0-flash-001" });

    const prompt = `Analyze the following user input and determine their current mood. Respond ONLY with valid JSON in this exact format:
{
  "mood": "one of: happy, sad, excited, relaxed, scared, romantic, adventurous, thoughtful, chill, angry, peaceful, inspired, energetic",
  "confidence": 0.0 to 1.0
}

User input: "${userInput}"`;

    const result = await model.generateContent(prompt);
    const responseText =
      result.response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    const parsed = JSON.parse(responseText);
    return {
      mood: parsed.mood || "relaxed",
      confidence: parsed.confidence || 0.5,
    };
  } catch (error) {
    console.error("[Mood Detection] Error:", error);
    throw new Error(`Failed to determine mood: ${error}`);
  }
}

/**
 * Maps mood to TMDB genre IDs
 */
function mapMoodToGenreId(mood: string): string {
  const moodGenreMap: Record<string, string> = {
    happy: "35", // Comedy
    sad: "18", // Drama
    excited: "28", // Action
    relaxed: "10749", // Romance
    scared: "27", // Horror
    romantic: "10749", // Romance
    adventurous: "12", // Adventure
    thoughtful: "18", // Drama
    chill: "35,10749", // Comedy, Romance
    angry: "28", // Action
    peaceful: "36", // History
    inspired: "18", // Drama
    energetic: "28", // Action
  };

  return moodGenreMap[mood.toLowerCase()] || "18"; // Default to Drama
}

/**
 * Fetches movies from TMDB API based on genre
 */
async function fetchMoviesFromTMDB(
  apiKey: string,
  genreId: string,
  limit: number
): Promise<
  Array<{
    id: number;
    title: string;
    overview: string;
    rating: number;
    releaseDate: string;
    runtime: number;
    genres: string[];
    popularity: number;
  }>
> {
  try {
    const searchUrl = "https://api.themoviedb.org/3/discover/movie";

    const params = new URLSearchParams({
      api_key: apiKey,
      with_genres: genreId,
      sort_by: "popularity.desc",
      page: "1",
    });

    const searchResponse = await fetch(`${searchUrl}?${params}`);

    if (!searchResponse.ok) {
      throw new Error(
        `TMDB API error: ${searchResponse.status} ${searchResponse.statusText}`
      );
    }

    const searchData = (await searchResponse.json()) as TMDBSearchResponse;

    if (!searchData || !searchData.results || searchData.results.length === 0) {
      throw new Error(`No movies found for genre: ${genreId}`);
    }

    // Fetch detailed info for each movie
    const movies = await Promise.all(
      searchData.results.slice(0, limit).map(async (movie) => {
        try {
          const detailResponse = await fetch(
            `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${apiKey}`
          );

          if (!detailResponse.ok) {
            throw new Error(`Failed to fetch details for movie ${movie.id}`);
          }

          const details = (await detailResponse.json()) as TMDBMovieDetail;

          return {
            id: movie.id,
            title: movie.title,
            overview: movie.overview,
            rating: movie.vote_average,
            releaseDate: movie.release_date,
            runtime: details.runtime || 0,
            genres: details.genres?.map((g) => g.name) || [],
            popularity: movie.popularity,
          };
        } catch (error) {
          console.error(
            `[TMDB] Error fetching details for movie ${movie.id}:`,
            error
          );
          return {
            id: movie.id,
            title: movie.title,
            overview: movie.overview,
            rating: movie.vote_average,
            releaseDate: movie.release_date,
            runtime: 0,
            genres: [],
            popularity: movie.popularity,
          };
        }
      })
    );

    return movies;
  } catch (error) {
    console.error("[TMDB Fetch] Error:", error);
    throw new Error(`Failed to fetch movies from TMDB: ${error}`);
  }
}

interface TMDBSearchResponse {
  results: {
    id: number;
    title: string;
    overview: string;
    vote_average: number;
    release_date: string;
    popularity: number;
  }[];
}

interface TMDBMovieDetail {
  id: number;
  title: string;
  overview: string;
  vote_average: number;
  release_date: string;
  runtime: number;
  genres: Array<{
    id: number;
    name: string;
  }>;
  popularity: number;
}
