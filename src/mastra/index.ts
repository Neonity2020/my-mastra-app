import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { DuckDBStore } from "@mastra/duckdb";
import { MastraCompositeStore } from '@mastra/core/storage';
import { Observability, MastraStorageExporter, MastraPlatformExporter, SensitiveDataFilter } from '@mastra/observability';
import { weatherWorkflow } from './workflows/weather-workflow';
import { weatherAgent } from './agents/weather-agent';
import { codingAgent } from './agents/coding-agent';
import { toolCallAppropriatenessScorer, completenessScorer, translationScorer } from './scorers/weather-scorer';

const isCli = process.env.MASTRA_CLI === 'true';

export const mastra = new Mastra({
  workflows: { weatherWorkflow },
  agents: { weatherAgent, codingAgent },
  scorers: { toolCallAppropriatenessScorer, completenessScorer, translationScorer },
  storage: new MastraCompositeStore({
    id: 'composite-storage',
    default: new LibSQLStore({
      id: "mastra-storage",
      url: "file:./mastra.db",
    }),
    domains: isCli
      ? {}
      : {
          observability: await new DuckDBStore().getStore('observability'),
        },
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  ...(isCli
    ? {}
    : {
        observability: new Observability({
          configs: {
            default: {
              serviceName: 'mastra',
              exporters: [
                new MastraStorageExporter(),
                new MastraPlatformExporter(),
              ],
              spanOutputProcessors: [
                new SensitiveDataFilter(),
              ],
            },
          },
        }),
      }),
});
