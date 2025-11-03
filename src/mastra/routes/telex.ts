import { registerApiRoute } from "@mastra/core/server";
import { randomUUID } from "crypto";

export const telexA2AHandler = registerApiRoute("/a2a/agent/:agentId", {
  method: "POST",
  handler: async (c) => {
    try {
      const mastra = c.get("mastra");
      const agentId = c.req.param("agentId");
      const body = await c.req.json();

      const { jsonrpc, id: requestId, method, params } = body;
      const { message, contextId, taskId, configuration } = params || {};

      const webhookUrl = configuration?.pushNotificationConfig?.url;
      const webhookToken = configuration?.pushNotificationConfig?.token;
      if (!webhookUrl || !webhookToken) {
        throw new Error("Missing pushNotificationConfig in request");
      }

      const mainPrompt = message?.parts?.[0]?.text;
      if (!mainPrompt) {
        throw new Error("Could not find main prompt in message.parts[0].text");
      }

      // This is the background task that will run.
      const runAgentAndPushResult = async () => {
        // --- THIS IS THE NEW ERROR HANDLING ---
        // We define this function here so we can call it from the catch block
        const sendErrorToWebhook = async (errorMessage: string) => {
          console.error(
            `[A2A Async] ❌ Sending error to webhook: ${errorMessage}`
          );
          const errorPayload = {
            jsonrpc: "2.0",
            id: requestId,
            result: {
              id: taskId || randomUUID(),
              contextId: contextId || randomUUID(),
              status: {
                state: "failed", // Use 'failed' state
                timestamp: new Date().toISOString(),
                message: {
                  messageId: randomUUID(),
                  role: "agent",
                  parts: [
                    {
                      kind: "text",
                      text: `I'm sorry, an error occurred: ${errorMessage}`,
                    },
                  ],
                  kind: "message",
                },
              },
              artifacts: [],
              history: [],
              kind: "task",
            },
          };

          await fetch(webhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${webhookToken}`,
            },
            body: JSON.stringify(errorPayload),
          });
          console.log(`[A2A Async] 📡 Error webhook push to Telex successful.`);
        };
        // --- END OF NEW ERROR HANDLING ---

        try {
          console.log(
            `[A2A Async] 🚀 Starting agent ${agentId} for task ${taskId}`
          );
          const agent = mastra.getAgent(agentId);
          if (!agent) {
            throw new Error(`Agent '${agentId}' not found`);
          }

          const response = await agent.generate(mainPrompt);
          const agentText = response.text || "";
          console.log(
            `[A2A Async] ✅ Agent ${agentId} finished. Replying to webhook...`
          );

          const artifacts = [
            {
              artifactId: randomUUID(),
              name: `${agentId}Response`,
              parts: [{ kind: "text", text: agentText }],
            },
          ];

          if (response.toolResults && response.toolResults.length > 0) {
            artifacts.push({
              artifactId: randomUUID(),
              name: "ToolResults",
              parts: response.toolResults.map((result) => ({
                kind: "text",
                text:
                  typeof result === "string" ? result : JSON.stringify(result),
              })),
            });
          }

          const resultPayload = {
            jsonrpc: "2.0",
            id: requestId,
            result: {
              id: taskId || randomUUID(),
              contextId: contextId || randomUUID(),
              status: {
                state: "completed",
                timestamp: new Date().toISOString(),
                message: {
                  messageId: randomUUID(),
                  role: "agent",
                  parts: [{ kind: "text", text: agentText }],
                  kind: "message",
                },
              },
              artifacts,
              history: [],
              kind: "task",
            },
          };

          await fetch(webhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${webhookToken}`,
            },
            body: JSON.stringify(resultPayload),
          });
          console.log(`[A2A Async] 📡 Webhook push to Telex successful.`);
        } catch (error: any) {
          console.error(
            `[A2A Async] ❌ Error during async agent run:`,
            error.message
          );
          // --- THIS IS THE FIX ---
          // Call our new function to send the error back to the user
          await sendErrorToWebhook(
            error.message || "An unknown error occurred."
          );
        }
      };

      // Tell the execution context to wait for the background task to finish
      c.executionCtx.waitUntil(runAgentAndPushResult());

      // IMMEDIATELY return the "202 Accepted" response
      console.log(`[A2A Handler] 📬 Sending 202 Accepted for task ${taskId}`);
      return c.json(
        {
          status: "success",
          status_code: 202,
          message: "request received",
          task_id: taskId || randomUUID(),
        },
        202
      );
    } catch (error: any) {
      console.error(`[A2A Handler] ❌ Critical handler error:`, error);
      // We can't send a webhook here, so just return a server error
      return c.json(
        {
          status: "error",
          status_code: 500,
          message: "Internal Server Error",
          data: { details: error.message },
        },
        500
      );
    }
  },
});
