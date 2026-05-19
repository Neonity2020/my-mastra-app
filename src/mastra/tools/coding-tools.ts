import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const execFileAsync = promisify(execFile);

const workspaceRoot = process.cwd();
const defaultIgnores = new Set(['.git', 'node_modules', '.mastra', '.build', 'dist', 'coverage']);
const projectMemoryFile = 'MEMORY.md';
const memorySections = [
  'User Preferences',
  'Project Decisions',
  'Working Agreements',
  'Continuation State',
  'Facts',
] as const;
const defaultMemoryContent = `# MEMORY

Durable project memory maintained by the Coding Agent.

## User Preferences

## Project Decisions

## Working Agreements

## Continuation State

## Facts
`;

function logToolProgress(message: string): void {
  if (process.env.MASTRA_CLI !== 'true' || process.env.MASTRA_CLI_PROGRESS === 'false') {
    return;
  }

  process.stderr.write(`\x1b[90m[tool]\x1b[0m ${message}\n`);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(path.join(workspaceRoot, filePath));
    return true;
  } catch {
    return false;
  }
}

function normalizeMemoryForCompare(value: string): string {
  return value
    .toLowerCase()
    .replace(/^\s*-\s*\d{4}-\d{2}-\d{2}:\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeMemoryEntry(value: string): string {
  return value
    .split('\n')
    .map((line) => line.replace(/^\s*[-*]\s*/, '').trim())
    .filter(Boolean)
    .join('; ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function ensureProjectMemory(): Promise<string> {
  const memoryPath = path.join(workspaceRoot, projectMemoryFile);

  if (!(await fileExists(projectMemoryFile))) {
    await fs.writeFile(memoryPath, defaultMemoryContent, 'utf8');
    return defaultMemoryContent;
  }

  const content = await fs.readFile(memoryPath, 'utf8');

  if (content.trimEnd()) {
    return content;
  }

  await fs.writeFile(memoryPath, defaultMemoryContent, 'utf8');
  return defaultMemoryContent;
}

export async function readProjectMemory(): Promise<string> {
  logToolProgress(`Reading ${projectMemoryFile}`);
  return ensureProjectMemory();
}

export async function updateProjectMemory(input: {
  category?: (typeof memorySections)[number];
  memory: string;
}): Promise<{ filePath: string; added: boolean; category: string; content: string }> {
  const category = input.category ?? 'Facts';
  const memory = normalizeMemoryEntry(input.memory);

  if (!memory) {
    throw new Error('Memory entry cannot be empty.');
  }

  logToolProgress(`Updating ${projectMemoryFile}`);

  let content = await ensureProjectMemory();
  const normalizedContent = normalizeMemoryForCompare(content);
  const normalizedMemory = normalizeMemoryForCompare(memory);

  if (normalizedContent.includes(normalizedMemory)) {
    return {
      filePath: projectMemoryFile,
      added: false,
      category,
      content,
    };
  }

  if (!content.includes('# MEMORY')) {
    content = `${defaultMemoryContent.trimEnd()}\n\n${content.trimEnd()}\n`;
  }

  if (!content.match(new RegExp(`^## ${category}$`, 'm'))) {
    content = `${content.trimEnd()}\n\n## ${category}\n`;
  }

  const lines = content.trimEnd().split('\n');
  const sectionIndex = lines.findIndex((line) => line.trim() === `## ${category}`);
  const nextSectionIndex = lines.findIndex((line, index) => index > sectionIndex && /^##\s+/.test(line));
  const insertIndex =
    nextSectionIndex === -1 || lines[nextSectionIndex - 1]?.trim() === ''
      ? nextSectionIndex === -1
        ? lines.length
        : nextSectionIndex - 1
      : nextSectionIndex;
  const stamp = new Date().toISOString().slice(0, 10);

  lines.splice(insertIndex, 0, `- ${stamp}: ${memory}`);

  if (nextSectionIndex !== -1 && lines[insertIndex + 1]?.trim() !== '') {
    lines.splice(insertIndex + 1, 0, '');
  }

  const updated = `${lines.join('\n')}\n`;
  await fs.writeFile(path.join(workspaceRoot, projectMemoryFile), updated, 'utf8');

  return {
    filePath: projectMemoryFile,
    added: true,
    category,
    content: updated,
  };
}

async function tryExec(command: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync(command, args, {
      cwd: workspaceRoot,
      timeout: 5_000,
      maxBuffer: 256 * 1024,
    });
    return stdout.trim();
  } catch {
    return '';
  }
}

function resolveWorkspacePath(inputPath = '.'): string {
  const resolvedPath = path.resolve(workspaceRoot, inputPath);
  const relativePath = path.relative(workspaceRoot, resolvedPath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(`Path is outside the workspace: ${inputPath}`);
  }

  return resolvedPath;
}

function toWorkspaceRelative(inputPath: string): string {
  return path.relative(workspaceRoot, inputPath) || '.';
}

async function walkFiles(
  directory: string,
  options: { maxFiles: number; includeHidden: boolean },
  files: string[] = [],
): Promise<string[]> {
  if (files.length >= options.maxFiles) {
    return files;
  }

  const entries = await fs.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (files.length >= options.maxFiles) {
      break;
    }

    if ((!options.includeHidden && entry.name.startsWith('.')) || defaultIgnores.has(entry.name)) {
      continue;
    }

    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      await walkFiles(entryPath, options, files);
    } else if (entry.isFile()) {
      files.push(toWorkspaceRelative(entryPath));
    }
  }

  return files;
}

export async function getWorkspaceContext() {
  logToolProgress('Inspecting workspace context');

  const packageJsonPath = path.join(workspaceRoot, 'package.json');
  let packageName = '';
  let scripts: Record<string, string> = {};

  if (await fileExists('package.json')) {
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8')) as {
      name?: string;
      scripts?: Record<string, string>;
    };
    packageName = packageJson.name ?? '';
    scripts = packageJson.scripts ?? {};
  }

  const packageManager =
    (await fileExists('bun.lock')) || (await fileExists('bun.lockb'))
      ? 'bun'
      : (await fileExists('pnpm-lock.yaml'))
        ? 'pnpm'
        : (await fileExists('yarn.lock'))
          ? 'yarn'
          : (await fileExists('package-lock.json'))
            ? 'npm'
            : 'unknown';

  const gitBranch = await tryExec('git', ['branch', '--show-current']);
  const gitStatus = await tryExec('git', ['status', '--short']);
  const dirtyFiles = gitStatus
    .split('\n')
    .filter(Boolean)
    .map((line) => line.trim());
  const importantFiles = (await walkFiles(workspaceRoot, { maxFiles: 80, includeHidden: false })).filter((file) => {
    return (
      file === 'package.json' ||
      file === 'tsconfig.json' ||
      file === 'README.md' ||
      file === 'AGENTS.md' ||
      file === projectMemoryFile ||
      file.startsWith('src/mastra/') ||
      file.startsWith('src/cli/')
    );
  });

  return {
    cwd: workspaceRoot,
    packageName,
    packageManager,
    scripts,
    gitBranch: gitBranch || null,
    dirtyFiles,
    importantFiles,
  };
}

export const listFilesTool = createTool({
  id: 'list-files',
  description: 'List source files in the current workspace.',
  inputSchema: z.object({
    directory: z.string().default('.').describe('Workspace-relative directory to scan.'),
    maxFiles: z.number().int().min(1).max(500).default(120),
    includeHidden: z.boolean().default(false),
  }),
  outputSchema: z.object({
    files: z.array(z.string()),
    truncated: z.boolean(),
  }),
  execute: async ({ directory, maxFiles, includeHidden }) => {
    const fileLimit = maxFiles ?? 120;
    logToolProgress(`Listing files in ${directory ?? '.'}`);
    const files = await walkFiles(resolveWorkspacePath(directory), {
      maxFiles: fileLimit,
      includeHidden: includeHidden ?? false,
    });
    logToolProgress(`Listed ${files.length}${files.length >= fileLimit ? '+' : ''} files`);

    return {
      files,
      truncated: files.length >= fileLimit,
    };
  },
});

export const readFileTool = createTool({
  id: 'read-file',
  description: 'Read a UTF-8 text file from the current workspace.',
  inputSchema: z.object({
    filePath: z.string().describe('Workspace-relative file path.'),
    maxBytes: z.number().int().min(1).max(200_000).default(40_000),
  }),
  outputSchema: z.object({
    filePath: z.string(),
    content: z.string(),
    truncated: z.boolean(),
  }),
  execute: async ({ filePath, maxBytes }) => {
    const resolvedPath = resolveWorkspacePath(filePath);
    const file = await fs.open(resolvedPath, 'r');
    const byteLimit = maxBytes ?? 40_000;
    logToolProgress(`Reading ${toWorkspaceRelative(resolvedPath)}`);

    try {
      const buffer = Buffer.alloc(byteLimit);
      const { bytesRead } = await file.read(buffer, 0, byteLimit, 0);
      const stats = await file.stat();

      return {
        filePath: toWorkspaceRelative(resolvedPath),
        content: buffer.subarray(0, bytesRead).toString('utf8'),
        truncated: stats.size > bytesRead,
      };
    } finally {
      await file.close();
    }
  },
});

export const writeFileTool = createTool({
  id: 'write-file',
  description: 'Write a UTF-8 text file inside the current workspace, creating parent directories if needed.',
  inputSchema: z.object({
    filePath: z.string().describe('Workspace-relative file path.'),
    content: z.string(),
  }),
  outputSchema: z.object({
    filePath: z.string(),
    bytesWritten: z.number(),
  }),
  execute: async ({ filePath, content }) => {
    const resolvedPath = resolveWorkspacePath(filePath);
    const bytesWritten = Buffer.byteLength(content, 'utf8');
    logToolProgress(`Writing ${toWorkspaceRelative(resolvedPath)} (${bytesWritten} bytes)`);

    await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
    await fs.writeFile(resolvedPath, content, 'utf8');
    logToolProgress(`Wrote ${toWorkspaceRelative(resolvedPath)}`);

    return {
      filePath: toWorkspaceRelative(resolvedPath),
      bytesWritten,
    };
  },
});

export const searchCodeTool = createTool({
  id: 'search-code',
  description: 'Search workspace text files with ripgrep.',
  inputSchema: z.object({
    query: z.string().min(1).describe('Text or regex pattern to search for.'),
    directory: z.string().default('.').describe('Workspace-relative directory to search.'),
    maxResults: z.number().int().min(1).max(100).default(40),
  }),
  outputSchema: z.object({
    matches: z.array(
      z.object({
        filePath: z.string(),
        line: z.number(),
        text: z.string(),
      }),
    ),
  }),
  execute: async ({ query, directory, maxResults }) => {
    const searchRoot = resolveWorkspacePath(directory);
    logToolProgress(`Searching ${directory ?? '.'} for ${JSON.stringify(query)}`);
    const { stdout } = await execFileAsync(
      'rg',
      ['--line-number', '--color', 'never', '--glob', '!node_modules', '--glob', '!.git', query, searchRoot],
      { cwd: workspaceRoot, maxBuffer: 1024 * 1024 },
    ).catch((error: { code?: number; stdout?: string }) => {
      if (error.code === 1) {
        return { stdout: '' };
      }
      throw error;
    });

    const matches = stdout
        .split('\n')
        .filter(Boolean)
        .slice(0, maxResults)
        .map((line) => {
          const [filePath = '', lineNumber = '0', ...textParts] = line.split(':');
          return {
            filePath: toWorkspaceRelative(filePath),
            line: Number.parseInt(lineNumber, 10),
            text: textParts.join(':').trim(),
          };
        });
    logToolProgress(`Found ${matches.length} matches`);

    return { matches };
  },
});

export const runCommandTool = createTool({
  id: 'run-command',
  description: 'Run a non-interactive workspace command and return stdout, stderr, and exit code.',
  inputSchema: z.object({
    command: z.string().min(1).describe('Command to run, for example "npm run build".'),
    cwd: z.string().default('.').describe('Workspace-relative working directory.'),
    timeoutMs: z.number().int().min(1_000).max(120_000).default(30_000),
  }),
  outputSchema: z.object({
    command: z.string(),
    exitCode: z.number(),
    stdout: z.string(),
    stderr: z.string(),
  }),
  execute: async ({ command, cwd, timeoutMs }) => {
    if (/\b(rm|sudo|chmod|chown|mkfs|dd)\b/.test(command)) {
      throw new Error(`Refusing potentially destructive command: ${command}`);
    }

    const commandCwd = resolveWorkspacePath(cwd);
    logToolProgress(`Running command in ${toWorkspaceRelative(commandCwd)}: ${command}`);

    try {
      const { stdout, stderr } = await execFileAsync('zsh', ['-lc', command], {
        cwd: commandCwd,
        timeout: timeoutMs,
        maxBuffer: 1024 * 1024,
      });

      logToolProgress(`Command exited 0: ${command}`);
      return { command, exitCode: 0, stdout, stderr };
    } catch (error) {
      const commandError = error as { code?: number; stdout?: string; stderr?: string };
      const exitCode = typeof commandError.code === 'number' ? commandError.code : 1;
      logToolProgress(`Command exited ${exitCode}: ${command}`);

      return {
        command,
        exitCode,
        stdout: commandError.stdout ?? '',
        stderr: commandError.stderr ?? '',
      };
    }
  },
});

export const workspaceContextTool = createTool({
  id: 'workspace-context',
  description: 'Get compact current workspace context for coding tasks.',
  inputSchema: z.object({}),
  outputSchema: z.object({
    cwd: z.string(),
    packageName: z.string(),
    packageManager: z.string(),
    scripts: z.record(z.string(), z.string()),
    gitBranch: z.string().nullable(),
    dirtyFiles: z.array(z.string()),
    importantFiles: z.array(z.string()),
  }),
  execute: async () => {
    logToolProgress('Collecting workspace context');
    return getWorkspaceContext();
  },
});

export const readMemoryTool = createTool({
  id: 'read-memory',
  description: 'Read durable project memory from MEMORY.md.',
  inputSchema: z.object({}),
  outputSchema: z.object({
    filePath: z.string(),
    content: z.string(),
  }),
  execute: async () => {
    const content = await readProjectMemory();

    return {
      filePath: projectMemoryFile,
      content,
    };
  },
});

export const updateMemoryTool = createTool({
  id: 'update-memory',
  description:
    'Append a concise durable memory to MEMORY.md when the conversation contains long-lived project value.',
  inputSchema: z.object({
    category: z.enum(memorySections).default('Facts'),
    memory: z
      .string()
      .min(1)
      .max(2_000)
      .describe('Compressed durable memory, ideally one concise actionable sentence.'),
    reason: z
      .string()
      .max(500)
      .optional()
      .describe('Why this deserves durable memory. This is not stored in MEMORY.md.'),
  }),
  outputSchema: z.object({
    filePath: z.string(),
    added: z.boolean(),
    category: z.string(),
    content: z.string(),
  }),
  execute: async ({ category, memory }) => {
    return updateProjectMemory({ category, memory });
  },
});

export const codingTools = {
  readMemoryTool,
  updateMemoryTool,
  listFilesTool,
  readFileTool,
  writeFileTool,
  searchCodeTool,
  runCommandTool,
  workspaceContextTool,
};
