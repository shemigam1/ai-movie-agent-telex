import { createTool } from "@mastra/core/tools";
import axios from "axios";
import { z } from "zod";

export const movieRecommendationTool = createTool({
  id: "movie-recommendation",
  description: "Get movie recommendations based on mood using TMDB API",
  inputSchema: z.object({
    mood: z
      .string()
      .describe(
        "User's mood (e.g., happy, sad, scared, excited, romantic, adventurous)"
      ),
    limit: z
      .number()
      .default(5)
      .describe("Number of recommendations to return"),
  }),
  outputSchema: z.object({
    mood: z.string(),
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
    const { mood, limit } = context;
    const apiKey = process.env.TMDB_API_KEY;

    if (!apiKey) {
      throw new Error("TMDB_API_KEY not configured");
    }

    // Map moods to TMDB genre IDs
    const moodGenreMap: Record<string, string> = {
      sad: "18",
      happy: "35",
      scared: "27",
      excited: "28",
      romantic: "10749",
      adventurous: "12",
      thoughtful: "18",
      chill: "35,10749",
      angry: "28",
      peaceful: "36",
      inspired: "18",
      energetic: "28",
    };

    const genreId = moodGenreMap[mood.toLowerCase()] || "18";

    try {
      // Step 1: Search for movies by genre and mood
      const searchUrl = "https://api.themoviedb.org/3/discover/movie";
      const searchResponse = await axios.get(searchUrl, {
        params: {
          //   api_key: apiKey,
          with_genres: genreId,
          sort_by: "popularity.desc",
          page: 1,
        },
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (
        !searchResponse.data.results ||
        searchResponse.data.results.length === 0
      ) {
        throw new Error(`No movies found for mood: ${mood}`);
      }

      // Step 2: Fetch detailed information for each movie
      const movies = await Promise.all(
        searchResponse.data.results.slice(0, limit).map(async (movie: any) => {
          const detailsUrl = `https://api.themoviedb.org/3/movie/${movie.id}`;
          const detailsResponse = await axios.get(detailsUrl, {
            params: {
              api_key: apiKey,
            },
          });

          return {
            id: detailsResponse.data.id,
            title: detailsResponse.data.title,
            overview: detailsResponse.data.overview,
            rating: detailsResponse.data.vote_average,
            releaseDate: detailsResponse.data.release_date,
            runtime: detailsResponse.data.runtime,
            genres: detailsResponse.data.genres.map(
              (g: Record<string, unknown>) => g.name
            ),
            popularity: detailsResponse.data.popularity,
          };
        })
      );

      return {
        mood,
        recommendations: movies,
        count: movies.length,
      };
    } catch (error: any) {
      console.error(`Error fetching movie recommendations: ${error.message}`);
      throw new Error(`Failed to get movie recommendations for mood: ${mood}`);
    }
  },
});
