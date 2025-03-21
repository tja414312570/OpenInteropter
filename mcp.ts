import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Create an MCP server
const server = new McpServer({
    name: "Demo",
    version: "1.0.0"
});

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
    let clientTransport: InMemoryTransport;
    let serverTransport: InMemoryTransport;
    [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    // Start receiving messages on stdin and sending messages on stdout
    await server.connect(serverTransport);
    const client = new Client(
        {
            name: "example-client",
            version: "1.0.0"
        }
    );
    await client.connect(clientTransport);

    // List prompts
    // const prompts = await client.listPrompts();
    // console.log(JSON.stringify(prompts))
    // Get a prompt
    // List resources
    const resources = await client.listResources();
    console.log(JSON.stringify(resources))
    const resourcesT = await client.listResourceTemplates();
    console.log(JSON.stringify(resourcesT))
    // Read a resource
    // const tools = await client.listTools();
    // console.log(JSON.stringify(tools))
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