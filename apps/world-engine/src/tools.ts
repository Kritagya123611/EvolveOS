//The Architecture of a Syscall
//The Declaration: We tell the LLM, "You have a tool called runTerminalCommand and another 
// called writeFile. Here is what they do."

//The Decision: The LLM reads the human task. Instead of responding with text, it responds 
// with a JSON object saying, "Stop thinking. Trigger runTerminalCommand with the argument 
// mkdir test-dir."

//The Execution: Your Node server catches this JSON, actually runs the command on your 
// Ubuntu machine, grabs the terminal output, and sends it back to the LLM saying, 
// "Here is what happened. What next?"

//This file will hold the definitions of what your agents are physically allowed to do

/*
    LLM Brain
    ↓
    Tool Registry (AXIOM_SYSCALLS)
    ↓
    Actual OS / File System actions
*/
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
    try{
        if(name==="runTerminalCommand"){
            const output = execSync(args.command, { encoding: 'utf-8' });
            console.log("[SYSCALL] Command successfully executed");
            return output||"Command executed successfully, but there was no output.";
        }else if(name==="writeLocalFile"){
            // Write the file to the disk
            const targetPath = path.resolve(process.cwd(), args.filepath);
            
            // Ensure the directory exists before writing
            const dir = path.dirname(targetPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            
            fs.writeFileSync(targetPath, args.content);
            console.log(`[SYSCALL SUCCESS] File written to ${targetPath}`);
            return `Success: File written to ${targetPath}`;
        }else{
            console.error("[SYSCALL ERROR] Unknown syscall name:", name);
            return `Error: Unknown syscall name "${name}"`;
        }
    }catch(error:any){
        console.error("[SYSCALL ERROR] An error occurred while executing syscall:", error.message);
        return `Error executing syscall: ${error.message}`;
    }
}