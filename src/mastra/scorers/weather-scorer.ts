// import { z } from "zod";
// import { createToolCallAccuracyScorerCode } from "@mastra/evals/scorers/code";
// import { createCompletenessScorer } from "@mastra/evals/scorers/code";
// import { createScorer } from "@mastra/core/scores";

// export const toolCallAppropriatenessScorer = createToolCallAccuracyScorerCode({
//   expectedTool: "weatherTool",
//   strictMode: false,
// });

// export const completenessScorer = createCompletenessScorer();

// // Custom LLM-judged scorer: evaluates if non-English locations are translated appropriately
// // Mood-to-genre mapping scorer (refactored from translationScorer)
// export const translationScorer = createScorer({
//   name: "Mood Translation Quality",
//   description:
//     "Checks that user sentiments are translated into mood codes (genres) correctly",
//   type: "agent",
//   judge: {
//     model: "google/gemini-2.5-pro",
//     instructions:
//       "You are an expert evaluator of mood translation quality for movie or weather recommendations. " +
//       "Determine whether the user text expresses a mood and whether the assistant correctly mapped that mood to a genre code. " +
//       "Be lenient with synonyms and related moods. " +
//       "Return only the structured JSON matching the provided schema.",
//   },
// })
//   .preprocess(({ run }) => {
//     // For weather, you may want to use inputMessages, for movie, userInput. Adjust as needed.
//     const userText =
//       (run.input?.userInput as string) ||
//       (run.input?.inputMessages?.[0]?.content as string) ||
//       "";
//     const assistantGenre =
//       (run.output?.detectedMood as string) ||
//       (run.output?.[0]?.content as string) ||
//       "";
//     return { userText, assistantGenre };
//   })
//   .analyze({
//     description: "Extract user mood and detect adequacy of genre mapping",
//     outputSchema: z.object({
//       moodDetected: z.boolean(),
//       correctGenre: z.boolean(),
//       confidence: z.number().min(0).max(1).default(1),
//       explanation: z.string().default(""),
//     }),
//     createPrompt: ({ results }) => `
//             You are evaluating if an assistant correctly handled mapping of user mood to a genre.
//             User text:
//             """
//             ${results.preprocessStepResult.userText}
//             """
//             Assistant detected mood/genre:
//             """
//             ${results.preprocessStepResult.assistantGenre}
//             """
//             Tasks:
//             1) Identify if the user mentioned a mood or sentiment.
//             2) If so, check whether the assistant mapped that mood to a reasonable genre (be lenient with synonyms/related moods).
//             Return JSON with fields:
//             {
//             "moodDetected": boolean,
//             "correctGenre": boolean,
//             "confidence": number, // 0-1
//             "explanation": string
//             }
//         `,
//   })
//   .generateScore(({ results }) => {
//     const r = (results as any)?.analyzeStepResult || {};
//     if (!r.moodDetected) return 1; // If not applicable, full credit
//     if (r.correctGenre)
//       return Math.max(0, Math.min(1, 0.7 + 0.3 * (r.confidence ?? 1)));
//     return 0; // Mood detected but not mapped correctly
//   })
//   .generateReason(({ results, score }) => {
//     const r = (results as any)?.analyzeStepResult || {};
//     return `Mood translation scoring: moodDetected=${r.moodDetected ?? false}, correctGenre=${r.correctGenre ?? false}, confidence=${r.confidence ?? 0}. Score=${score}. ${r.explanation ?? ""}`;
//   });

// export const scorers = {
//   toolCallAppropriatenessScorer,
//   completenessScorer,
//   translationScorer,
// };
