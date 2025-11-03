import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { LibSQLStore } from "@mastra/libsql";

// import { healthAgent } from "./agents/movie-agent";
// import { apiTestAgent } from "./agents/api-test-agent";
import { movieAgent } from "./agents/movie-agent";
// import { a2aAgentRoute } from "./routes/a2a-agent-route";
import { a2aAgentRoute } from "./routes/a2a-route";

export const mastra = new Mastra({
  workflows: {},
  agents: { movieAgent }, // Only Mastra agents here
  scorers: {},
  storage: new LibSQLStore({
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
  telemetry: {
    enabled: false,
  },
  observability: {
    default: { enabled: true },
  },
  server: {
    apiRoutes: [a2aAgentRoute],
  },
});
