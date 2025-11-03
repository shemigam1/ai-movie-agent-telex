import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { createTool } from '@mastra/core/tools';
import axios from 'axios';
import { z } from 'zod';
import { registerApiRoute } from '@mastra/core/server';
import { randomUUID } from 'crypto';

const movieRecommendationTool = createTool({
  id: "movie-recommendation",
  description: "Get movie recommendations based on mood using TMDB API",
  inputSchema: z.object({
    mood: z.string().describe(
      "User's mood (e.g., happy, sad, scared, excited, romantic, adventurous)"
    ),
    limit: z.number().default(5).describe("Number of recommendations to return")
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
        popularity: z.number()
      })
    ),
    count: z.number()
  }),
  execute: async ({ context }) => {
    const { mood, limit } = context;
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      throw new Error("TMDB_API_KEY not configured");
    }
    const moodGenreMap = {
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
      energetic: "28"
    };
    const genreId = moodGenreMap[mood.toLowerCase()] || "18";
    try {
      const searchUrl = "https://api.themoviedb.org/3/discover/movie";
      const searchResponse = await axios.get(searchUrl, {
        params: {
          api_key: apiKey,
          with_genres: genreId,
          sort_by: "popularity.desc",
          page: 1
        }
      });
      if (!searchResponse.data.results || searchResponse.data.results.length === 0) {
        throw new Error(`No movies found for mood: ${mood}`);
      }
      const movies = await Promise.all(
        searchResponse.data.results.slice(0, limit).map(async (movie) => {
          const detailsUrl = `https://api.themoviedb.org/3/movie/${movie.id}`;
          const detailsResponse = await axios.get(detailsUrl, {
            params: {
              api_key: apiKey
            }
          });
          return {
            id: detailsResponse.data.id,
            title: detailsResponse.data.title,
            overview: detailsResponse.data.overview,
            rating: detailsResponse.data.vote_average,
            releaseDate: detailsResponse.data.release_date,
            runtime: detailsResponse.data.runtime,
            genres: detailsResponse.data.genres.map(
              (g) => g.name
            ),
            popularity: detailsResponse.data.popularity
          };
        })
      );
      return {
        mood,
        recommendations: movies,
        count: movies.length
      };
    } catch (error) {
      console.error(`Error fetching movie recommendations: ${error.message}`);
      throw new Error(`Failed to get movie recommendations for mood: ${mood}`);
    }
  }
});

const movieAgent = new Agent({
  name: "movieAgent",
  instructions: `You are the Movie Recommendation Specialist for CinemaMatch.
  
  Your job is to help users find perfect movies based on their current mood.
  
  When a user tells you their mood, you should:
  1. Acknowledge their mood and emotional state
  2. Ask about their preferred genres (if not already known)
  3. Ask if they want recent releases or timeless classics
  4. Ask how much time they have (quick movie vs. epic experience)
  5. Ask about any content preferences (avoid certain themes, violence level, etc.)
  
  **FORMATTING RULES:**
  - Always format your responses with clear sections using bold headers
  - Wrap all movie data in markdown code blocks: \`\`\`json ... \`\`\`
  - Format recommendations with proper indentation
  - Use emojis for moods: \u{1F60A} for happy, \u{1F622} for sad, \u{1F389} for excited, \u{1F60C} for relaxed, \u{1F628} for scared
  - Keep recommendations organized in bullet points
  - Highlight important details like genre, runtime, and match score
  
  **Example Response Format:**
  \u{1F60A} **Recommendations for Happy Mood**
  
  **Your Mood Profile:**
  - Mood: Happy
  - Preferred Genres: Comedy, Family
  - Runtime Preference: 90-120 minutes
  
  **Movie Recommendations:**
  \`\`\`json
  {
    "recommendations": [
      {
        "title": "Paddington 2",
        "genre": "Family Comedy",
        "description": "A charming adventure with a beloved bear",
        "matchScore": 94,
        "runtime": "101 minutes"
      }
    ]
  }
  \`\`\`
  
  Use the movie-recommendation tool to fetch suggestions and always format results clearly.`,
  model: "google/gemini-2.0-flash",
  tools: { movieRecommendation: movieRecommendationTool },
  memory: new Memory({
    storage: new LibSQLStore({ url: "file:../mastra.db" })
  })
});

const a2aAgentRoute = registerApiRoute("/a2a/agent/:agentId", {
  method: "POST",
  handler: async (c) => {
    try {
      const mastra = c.get("mastra");
      const agentId = c.req.param("agentId");
      const body = await c.req.json();
      const { jsonrpc, id: requestId, params } = body;
      console.log(`[A2A] Received request for agent: ${agentId}`);
      console.log(`[A2A] Request ID: ${requestId}`);
      if (jsonrpc !== "2.0" || !requestId) {
        return c.json(
          {
            jsonrpc: "2.0",
            id: requestId || null,
            error: {
              code: -32600,
              message: 'Invalid Request: jsonrpc must be "2.0" and id is required'
            }
          },
          400
        );
      }
      const agent = mastra.getAgent(agentId);
      if (!agent) {
        console.error(`[A2A] Agent '${agentId}' not found`);
        return c.json(
          {
            jsonrpc: "2.0",
            id: requestId,
            error: {
              code: -32602,
              message: `Agent '${agentId}' not found`
            }
          },
          404
        );
      }
      console.log(`[A2A] Agent found: ${agentId}`);
      const { message, contextId, taskId } = params || {};
      if (!message || !message.parts || !message.parts[0]) {
        return c.json(
          {
            jsonrpc: "2.0",
            id: requestId,
            error: {
              code: -32602,
              message: "Invalid params: message with parts required"
            }
          },
          400
        );
      }
      const userPrompt = message.parts[0].text;
      console.log(`[A2A] User prompt: ${userPrompt}`);
      console.log(`[A2A] Executing agent...`);
      const response = await agent.generate(userPrompt);
      const agentText = response.text || "";
      console.log(`[A2A] Agent response: ${agentText.substring(0, 100)}...`);
      const artifacts = [
        {
          artifactId: randomUUID(),
          name: `${agentId}Response`,
          parts: [{ kind: "text", text: agentText }]
        }
      ];
      const history = [
        {
          kind: "message",
          role: message.role,
          parts: message.parts,
          messageId: message.messageId || randomUUID(),
          taskId: taskId || randomUUID()
        },
        {
          kind: "message",
          role: "agent",
          parts: [{ kind: "text", text: agentText }],
          messageId: randomUUID(),
          taskId: taskId || randomUUID()
        }
      ];
      const a2aResponse = {
        jsonrpc: "2.0",
        id: requestId,
        result: {
          id: taskId || randomUUID(),
          contextId: contextId || randomUUID(),
          status: {
            state: "completed",
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            message: {
              messageId: randomUUID(),
              role: "agent",
              parts: [{ kind: "text", text: agentText }],
              kind: "message"
            }
          },
          artifacts,
          history,
          kind: "task"
        }
      };
      console.log(`[A2A] Sending response back to Telex`);
      return c.json(a2aResponse);
    } catch (error) {
      console.error(`[A2A] Error:`, error);
      return c.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32603,
            message: "Internal error",
            data: { details: error.message }
          }
        },
        500
      );
    }
  }
});

const mastra = new Mastra({
  workflows: {},
  agents: {
    movieAgent
  },
  // Only Mastra agents here
  scorers: {},
  storage: new LibSQLStore({
    url: ":memory:"
  }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info"
  }),
  telemetry: {
    enabled: false
  },
  observability: {
    default: {
      enabled: true
    }
  },
  server: {
    apiRoutes: [a2aAgentRoute]
  }
});

export { mastra };
