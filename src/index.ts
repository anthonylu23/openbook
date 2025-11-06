import { Command } from "commander";

const figlet = require("figlet");

const fs = require("fs");

const path = require("path");

const program = new Command()

console.log(figlet.textSync("openbook"));

program
    .version("1.0.0")
    .description("A CLI for indexing your knowledge base as LLM context")
    .option("-i, --index <directory>", "The directory to index")
    .option("-s, --serve", "Start the MCP server")
    .option("-q, --query <query>", "Query the indexed files")
    .option("-status, --status", "Server status")
    .parse(process.argv);

const options = program.opts();

async function indexDirectory(directory: string) {
    try {
        const files = await fs.promises.readdir(directory);
        for (const file of files) {
            const filePath = path.join(directory, file);

        }
    } catch (error) {
}