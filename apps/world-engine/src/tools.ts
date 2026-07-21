import type { FunctionDeclaration } from '@google/generative-ai';
import { SchemaType } from '@google/generative-ai';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * These are the tools the Gemini LLM can call during the Judgement Loop.
 * Each tool maps to a real action on the host OS (executed inside a Docker sandbox).
 */
export const AXIOM_SYSCALLS: FunctionDeclaration[] = [
  {
    name: 'runTerminalCommand',
    description: 'Executes a bash shell command on the host Ubuntu machine. Use this to navigate directories, install packages, or run scripts.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        command: {
          type: SchemaType.STRING,
          description: 'The exact bash command to run (e.g., "ls -la" or "npm install express").',
        },
      },
      required: ['command'],
    },
  },
  {
    name: 'writeLocalFile',
    description: 'Creates or overwrites a file on the host machine with specific content.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        filepath: {
          type: SchemaType.STRING,
          description: 'The path and filename (e.g., "./my-app/index.js").',
        },
        content: {
          type: SchemaType.STRING,
          description: 'The exact code or text to write inside the file.',
        },
      },
      required: ['filepath', 'content'],
    },
  },
];

/**
 * Execute a tool call from the LLM.
 * Routes to the correct handler based on the syscall name.
 */
export async function executeSyscall(name: string, args: Record<string, any>): Promise<string> {
  console.log('[SYSCALL] Executing:', name, args);

  try {
    if (name === 'runTerminalCommand') {
      // Run the command inside a Docker container for sandboxing
      const safeCommand = (args.command as string).replace(/"/g, '\\"');
      const dockerWrapper = `docker exec axiom-workspace sh -c "${safeCommand}"`;

      const output = execSync(dockerWrapper, { encoding: 'utf-8' });
      console.log('[SYSCALL] Command successfully executed inside Docker sandbox.');
      return output || 'Command executed successfully, but there was no output.';
    } else if (name === 'writeLocalFile') {
      // Write files to the local sandbox directory (mounted into Docker)
      const cleanPath = (args.filepath as string).replace('/workspace/', '').replace(/^(\.\/|\/)/, '');
      const targetPath = path.resolve(process.cwd(), 'sandbox', cleanPath);

      // Create the directory if it doesn't exist
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(targetPath, args.content as string);
      console.log(`[SYSCALL SUCCESS] File safely written to sandbox: ${targetPath}`);
      return `Success: File written to /workspace/${cleanPath}`;
    } else {
      console.error('[SYSCALL ERROR] Unknown syscall name:', name);
      return `Error: Unknown syscall name "${name}"`;
    }
  } catch (error: unknown) {
    // Extract stdout/stderr from execSync errors for better debugging
    const execError = error as { message?: string; stdout?: Buffer; stderr?: Buffer };
    const message = execError.message || String(error);
    const stdoutStr = execError.stdout ? execError.stdout.toString() : '';
    const stderrStr = execError.stderr ? execError.stderr.toString() : '';

    console.error('[SYSCALL ERROR] An error occurred while executing syscall:', message);
    return `Error executing syscall: ${message}\nOutput: ${stdoutStr}\nStderr: ${stderrStr}`;
  }
}
