import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { LibSQLStore } from "@mastra/libsql";
import { weatherWorkflow } from "./workflows/weather-workflow";
// import {
//   toolCallAppropriatenessScorer,
//   completenessScorer,
//   translationScorer,
// } from "./scorers/weather-scorer";
import { movieAgent } from "./agents/movie-agent";
import { a2aAgentRoute } from "./routes/a2a-route";
import { telexA2AHandler } from "./routes/telex";

export const mastra = new Mastra({
  // workflows: { weatherWorkflow },
  agents: { movieAgent },
  // scorers: {
  //   toolCallAppropriatenessScorer,
  //   completenessScorer,
  //   translationScorer,
  // },
  storage: new LibSQLStore({
    // stores observability, scores, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
  server: {
    apiRoutes: [a2aAgentRoute],
  },
  // telemetry: {
  //   // Telemetry is deprecated and will be removed in the Nov 4th release
  //   enabled: false,
  // },
  observability: {
    // Enables DefaultExporter and CloudExporter for AI tracing
    default: { enabled: true },
  },
});
