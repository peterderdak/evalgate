import { startPoller } from "./poller";

startPoller().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
