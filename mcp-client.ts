import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
    command: "npx ts-node",
    args: ["./mcp.ts"]
});

const client = new Client(
    {
        name: "example-client",
        version: "1.0.0"
    },
    {
        capabilities: {
            prompts: {},
            resources: {},
            tools: {}
        }
    }
);
(async () => {

    await client.connect(transport);

    // List prompts
    const prompts = await client.listPrompts();
    console.log(prompts)
    // Get a prompt
    // List resources
    const resources = await client.listResources();

    // Read a resource

    // Call a tool
    const result = await client.callTool({
        name: "example-tool",
        arguments: {
            arg1: "value"
        }
    });
})()