import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { movieRecommendationTool } from "../tools/get-movies";

export const movieAgent = new Agent({
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
  - Use emojis for moods: 😊 for happy, 😢 for sad, 🎉 for excited, 😌 for relaxed, 😨 for scared
  - Keep recommendations organized in bullet points
  - Highlight important details like genre, runtime, and match score
  
  **Example Response Format:**
  😊 **Recommendations for Happy Mood**
  
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
    storage: new LibSQLStore({ url: "file:../mastra.db" }),
  }),
});

export interface MovieRecommendationResult {
  recommendations: Array<{
    title: string;
    year?: number;
    genres?: string[];
    runtimeMinutes?: number;
    reason?: string;
  }>;
  source?: string;
  // add fields you actually use...
}

// Helper function for mood-based recommendations
// export async function runMovieRecommendation(config: {
//   mood: string;
//   preferences?: {
//     genres?: string[];
//     releaseType?: "recent" | "classic" | "any";
//     runtimeRange?: [number, number];
//     contentWarnings?: string[];
//   };
//   limit?: number;
// }): Promise<MovieRecommendationResult> {
//   console.log(`\n[MovieAgent] 🎬 Finding movies for mood: "${config.mood}"`);

//   try {
//     const prompt = `Recommend movies for someone feeling ${config.mood}.
// ${config.preferences?.genres ? `Preferred genres: ${config.preferences.genres.join(", ")}` : ""}
// ${config.preferences?.releaseType ? `Release preference: ${config.preferences.releaseType}` : ""}
// ${config.preferences?.runtimeRange ? `Runtime: ${config.preferences.runtimeRange[0]}-${config.preferences.runtimeRange[1]} minutes` : ""}
// ${config.preferences?.contentWarnings ? `Avoid: ${config.preferences.contentWarnings.join(", ")}` : ""}
// ${config.limit ? `Return ${config.limit} recommendations` : "Return up to 5 recommendations"}`;

//     const result = await movieAgent.generate(prompt, {
//       onStepFinish: (step) => {
//         if (step.toolCalls && step.toolCalls.length > 0) {
//           console.log(
//             `[MovieAgent] 🔍 Fetching personalized recommendations...`
//           );
//         }
//       },
//     });

//     return result as MovieRecommendationResult;
//   } catch (error: any) {
//     console.error(`[MovieAgent] ❌ Error: ${error.message}`);
//     throw error;
//   }
// }
