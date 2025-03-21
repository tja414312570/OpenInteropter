// import { Client } from "@modelcontextprotocol/sdk/client/index.js";
// import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import McpManagerServer from './src/main/services/mcp-service'
import { MemoryMcp } from './src/main/mcp/mcp-in-memory'
// Create an MCP server
const mcpServer = new MemoryMcp({
    name: "Demo",
    version: "1.0.0"
});
const server = mcpServer.getServer();
// Add an addition tool
server.tool("add",
    { a: z.number(), b: z.number() },
    async ({ a, b }) => ({
        content: [{ type: "text", text: String(a + b) }]
    })
);

// Add a dynamic greeting resource
server.resource(
    "echo",
    new ResourceTemplate("echo://{message}", { list: undefined }),
    async (uri, { message }) => ({
        contents: [{
            uri: uri.href,
            text: `Resource echo: ${message}`
        }]
    })
);
server.resource(
    "echo2",
    new ResourceTemplate("echo://{message}", { list: undefined }),
    async (uri, { message }) => ({
        contents: [{
            uri: uri.href,
            text: `Resource echo: ${message}`
        }]
    })
);

server.prompt(
    "review-code",
    { code: z.string() },
    ({ code }) => ({
        messages: [{
            role: "user",
            content: {
                type: "text",
                text: `Please review this code:\n\n${code}`
            }
        }]
    })
);
(async () => {
    const client = mcpServer;
    mcpServer.connect()
    // List prompts
    const prompts = await client.listPrompts();
    console.log(JSON.stringify(prompts))
    // Get a prompt
    // List resources
    const resources = await client.listResources();
    console.log(JSON.stringify(resources))
    const resourcesT = await client.listResourceTemplates();
    console.log(JSON.stringify(resourcesT))
    // Read a resource
    const tools = await client.listTools();
    console.log(JSON.stringify(tools))
    // Call a tool
    const result = await client.callTool({
        name: "add",
        arguments: {
            a: 1,
            b: 2
        }
    });
    console.log("计算结果:", result)
    const resource = await client.readResource({
        name: "echo",
        uri: "echo://test"
    });
    console.log("资源结果:", resource)
})()