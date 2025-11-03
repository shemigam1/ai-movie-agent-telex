import { registerApiRoute } from "@mastra/core/server";
import { randomUUID } from "crypto";

export const a2aAgentRoute = registerApiRoute("/a2a/agent/:agentId", {
  method: "POST",
  handler: async (c) => {
    try {
      const mastra = c.get("mastra");
      const agentId = c.req.param("agentId");

      // Parse JSON-RPC 2.0 request
      const body = await c.req.json();
      const { jsonrpc, id: requestId, method, params } = body;

      console.log(`[A2A] Received request for agent: ${agentId}`);
      console.log(`[A2A] Request ID: ${requestId}`);

      // Validate JSON-RPC 2.0 format
      if (jsonrpc !== "2.0" || !requestId) {
        return c.json(
          {
            jsonrpc: "2.0",
            id: requestId || null,
            error: {
              code: -32600,
              message:
                'Invalid Request: jsonrpc must be "2.0" and id is required',
            },
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
              message: `Agent '${agentId}' not found`,
            },
          },
          404
        );
      }

      console.log(`[A2A] Agent found: ${agentId}`);

      // Extract message from params
      const { message, contextId, taskId } = params || {};

      if (!message || !message.parts || !message.parts[0]) {
        return c.json(
          {
            jsonrpc: "2.0",
            id: requestId,
            error: {
              code: -32602,
              message: "Invalid params: message with parts required",
            },
          },
          400
        );
      }

      // Extract user prompt
      const userPrompt = message.parts[0].text;
      console.log(`[A2A] User prompt: ${userPrompt}`);

      // Execute agent
      console.log(`[A2A] Executing agent...`);
      const response = await agent.generate(userPrompt);
      const agentText = response.text || "";
      console.log(`[A2A] Agent response: ${agentText.substring(0, 100)}...`);

      // Build artifacts array
      const artifacts = [
        {
          artifactId: randomUUID(),
          name: `${agentId}Response`,
          parts: [{ kind: "text", text: agentText }],
        },
      ];

      // Add tool results as artifacts
      //   if (response.toolResults && response.toolResults.length > 0) {
      //     console.log(`[A2A] Tool results: ${response.toolResults.length}`);
      //     artifacts.push({
      //       artifactId: randomUUID(),
      //       name: "ToolResults",
      //       parts: response.toolResults.map((result) => ({
      //         kind: "text",
      //         text: JSON.stringify(result),
      //       })),
      //     });
      //   }

      // Build conversation history
      const history = [
        {
          kind: "message",
          role: message.role,
          parts: message.parts,
          messageId: message.messageId || randomUUID(),
          taskId: taskId || randomUUID(),
        },
        {
          kind: "message",
          role: "agent",
          parts: [{ kind: "text", text: agentText }],
          messageId: randomUUID(),
          taskId: taskId || randomUUID(),
        },
      ];

      // Return A2A-compliant response
      const a2aResponse = {
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
          history,
          kind: "task",
        },
      };

      console.log(`[A2A] Sending response back to Telex`);
      return c.json(a2aResponse);
    } catch (error: any) {
      console.error(`[A2A] Error:`, error);
      return c.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32603,
            message: "Internal error",
            data: { details: error.message },
          },
        },
        500
      );
    }
  },
});
