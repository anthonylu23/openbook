"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const figlet = require("figlet");
const program = new commander_1.Command();
console.log(figlet.textSync("openbook"));
program
    .version("1.0.0")
    .description("A CLI for indexing your knowledge base as LLM context")
    .option("-i, --index <directory>", "The directory to index")
    .option("-m, --mcp", "Get MCP server URL")
    .option("-s, --start", "Start the MCP server")
    .option("-l, --list", "List the indexed files")
    .option("-r, --remove <file>", "Remove a file from the index")
    .option("-u, --update <file>", "Update indexed files")
    .parse(process.argv);
const options = program.opts();
//# sourceMappingURL=index.js.map