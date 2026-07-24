import type { FunctionDeclaration } from '@google/generative-ai';
import { SchemaType } from '@google/generative-ai';
import { execSync, exec as execCb } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(execCb);

// ---------------------------------------------------------------------------
// Container Lifecycle — per-agent isolated execution environments
// ---------------------------------------------------------------------------

/**
 * Spin up a fresh agent container from the axiom-agent image.
 * Returns the container ID.
 */
export async function createAgentContainer(agentId: string): Promise<string> {
  const containerName = `agent-${agentId}`;
  const sandboxDir = path.resolve(process.cwd(), 'sandbox', agentId);

  // Ensure sandbox directory exists on host
  if (!fs.existsSync(sandboxDir)) {
    fs.mkdirSync(sandboxDir, { recursive: true });
  }

  const cmd = [
    'docker run -d',
    `--name ${containerName}`,
    `-v ${sandboxDir}:/workspace`,
    'axiom-agent',
    'tail -f /dev/null',
  ].join(' ');

  const { stdout } = await execAsync(cmd);
  const containerId = stdout.trim();
  console.log(`[CONTAINER] Spawned ${containerName} (${containerId.substring(0, 12)})`);
  return containerId;
}

/**
 * Stop and remove an agent container after the judgement loop completes.
 */
export async function destroyAgentContainer(agentId: string): Promise<void> {
  const containerName = `agent-${agentId}`;
  try {
    await execAsync(`docker stop ${containerName} && docker rm ${containerName}`);
    console.log(`[CONTAINER] Destroyed ${containerName}`);
  } catch (error: unknown) {
    console.error(`[CONTAINER] Failed to destroy ${containerName}:`, (error as Error).message);
  }
}

/**
 * Get the sandbox path for a specific agent on the host filesystem.
 */
function getAgentSandboxPath(agentId: string, relativePath: string): string {
  const cleanPath = relativePath.replace('/workspace/', '').replace(/^(\.\/|\/)/, '');
  return path.resolve(process.cwd(), 'sandbox', agentId, cleanPath);
}

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
 * Execute a tool call from the LLM inside an agent's isolated container.
 * Routes to the correct handler based on the syscall name.
 */
export async function executeSyscall(
  name: string,
  args: Record<string, any>,
  agentId: string,
): Promise<string> {
  console.log(`[SYSCALL] Executing ${name} in container agent-${agentId}:`, args);

  try {
    if (name === 'runTerminalCommand') {
      const safeCommand = (args.command as string).replace(/"/g, '\\"');
      const containerName = `agent-${agentId}`;
      const dockerCmd = `docker exec ${containerName} sh -c "${safeCommand}"`;

      const output = execSync(dockerCmd, { encoding: 'utf-8' });
      console.log('[SYSCALL] Command executed successfully.');
      return output || 'Command executed successfully, but there was no output.';
    } else if (name === 'writeLocalFile') {
      const targetPath = getAgentSandboxPath(agentId, args.filepath as string);

      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(targetPath, args.content as string);
      console.log(`[SYSCALL] File written to sandbox: ${targetPath}`);
      return `Success: File written to /workspace/${args.filepath}`;
    } else {
      console.error('[SYSCALL ERROR] Unknown syscall name:', name);
      return `Error: Unknown syscall name "${name}"`;
    }
  } catch (error: unknown) {
    const execError = error as { message?: string; stdout?: Buffer; stderr?: Buffer };
    const message = execError.message || String(error);
    const stdoutStr = execError.stdout ? execError.stdout.toString() : '';
    const stderrStr = execError.stderr ? execError.stderr.toString() : '';

    console.error('[SYSCALL ERROR] An error occurred while executing syscall:', message);
    return `Error executing syscall: ${message}\nOutput: ${stdoutStr}\nStderr: ${stderrStr}`;
  }
}
