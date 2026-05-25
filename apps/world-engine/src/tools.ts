import type { FunctionDeclaration } from '@google/generative-ai';
import { SchemaType } from '@google/generative-ai';
import { execSync } from 'child_process';
import { log } from 'console';
import fs from 'fs';
import path from 'path';

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

export async function executeSyscall(name:string,args:any):Promise<string> {
    console.log("[SYSCALL] Executing:", name, args);
    try {
        if (name === "runTerminalCommand") {
            const safeCommand = args.command.replace(/"/g, '\\"');
            const dockerWrapper = `docker exec axiom-workspace sh -c "${safeCommand}"`;
            
            const output = execSync(dockerWrapper, { encoding: 'utf-8' });
            console.log("[SYSCALL] Command successfully executed inside Docker sandbox.");
            return output || "Command executed successfully, but there was no output.";

        } else if (name === "writeLocalFile") {
            const cleanPath = args.filepath.replace('/workspace/', '').replace(/^(\.\/|\/)/, '');

            const targetPath = path.resolve(process.cwd(), 'sandbox', cleanPath);
            
            const dir = path.dirname(targetPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            
            fs.writeFileSync(targetPath, args.content);
            console.log(`[SYSCALL SUCCESS] File safely written to sandbox: ${targetPath}`);
            
            return `Success: File written to /workspace/${cleanPath}`;

        } else {
            console.error("[SYSCALL ERROR] Unknown syscall name:", name);
            return `Error: Unknown syscall name "${name}"`;
        }
    } catch (error: any) {
        console.error("[SYSCALL ERROR] An error occurred while executing syscall:", error.message);
        const stdoutStr = error.stdout ? error.stdout.toString() : '';
        const stderrStr = error.stderr ? error.stderr.toString() : '';
        return `Error executing syscall: ${error.message}\nOutput: ${stdoutStr}\nStderr: ${stderrStr}`;
    }
}