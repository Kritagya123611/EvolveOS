//The Architecture of a Syscall
//This file will hold the definitions of what your agents are physically allowed to do

import type { FunctionDeclaration } from '@google/generative-ai';
import { SchemaType } from '@google/generative-ai';
import { execSync } from 'child_process';
import { log } from 'console';
import fs from 'fs';
import path from 'path';

//telling the llm what it can do with the terminal
export const AXIOM_SYSCALLS: FunctionDeclaration[] = [
    {
        name: 'runTerminalCommand',
        description: 'Executes a bash shell command on the host Ubuntu machine. Use this to navigate directories, install packages, or run scripts.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                command: {
                    type: SchemaType.STRING,
                    description: 'The exact bash command to run (e.g., "ls -la" or "npm install express").'
                }
            },
            required: ['command']
        }
    },
    {
        name: 'writeLocalFile',
        description: 'Creates or overwrites a file on the host machine with specific content.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                filepath: {
                    type: SchemaType.STRING,
                    description: 'The path and filename (e.g., "./my-app/index.js").'
                },
                content: {
                    type: SchemaType.STRING,
                    description: 'The exact code or text to write inside the file.'
                }
            },
            required: ['filepath', 'content']
        }
    }
];

//function to run the calls actually on the machine
export async function executeSyscall(name:string,args:any):Promise<string> {
    console.log("[SYSCALL] Executing:", name, args);
    try {
        if (name === "runTerminalCommand") {
            // --- SECURITY: Route into Docker Sandbox ---
            // We escape double quotes so the shell command doesn't break
            const safeCommand = args.command.replace(/"/g, '\\"');
            const dockerWrapper = `docker exec axiom-workspace sh -c "${safeCommand}"`;
            
            const output = execSync(dockerWrapper, { encoding: 'utf-8' });
            console.log("[SYSCALL] Command successfully executed inside Docker sandbox.");
            return output || "Command executed successfully, but there was no output.";

        } else if (name === "writeLocalFile") {
            // --- SECURITY: Force files into the Sandbox folder ---
            // If the AI specifies "/workspace/file.js" or "./file.js", we strip it clean
            const cleanPath = args.filepath.replace('/workspace/', '').replace(/^(\.\/|\/)/, '');
            
            // Route the file specifically into your local 'sandbox' directory
            const targetPath = path.resolve(process.cwd(), 'sandbox', cleanPath);
            
            // Ensure the directory exists before writing
            const dir = path.dirname(targetPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            
            fs.writeFileSync(targetPath, args.content);
            console.log(`[SYSCALL SUCCESS] File safely written to sandbox: ${targetPath}`);
            
            // We tell the AI it wrote to /workspace because that's where it lives
            return `Success: File written to /workspace/${cleanPath}`;

        } else {
            console.error("[SYSCALL ERROR] Unknown syscall name:", name);
            return `Error: Unknown syscall name "${name}"`;
        }
    } catch (error: any) {
        console.error("[SYSCALL ERROR] An error occurred while executing syscall:", error.message);
        // We capture Docker's specific error output so the AI can debug its own mistakes
        const stdoutStr = error.stdout ? error.stdout.toString() : '';
        const stderrStr = error.stderr ? error.stderr.toString() : '';
        return `Error executing syscall: ${error.message}\nOutput: ${stdoutStr}\nStderr: ${stderrStr}`;
    }
}