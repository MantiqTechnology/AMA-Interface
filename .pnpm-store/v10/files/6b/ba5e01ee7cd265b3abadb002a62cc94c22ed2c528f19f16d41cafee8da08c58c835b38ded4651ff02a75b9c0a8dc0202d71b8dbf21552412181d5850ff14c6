import { x } from 'tinyexec';
import { getRandomPort, waitForPort } from 'get-port-please';
import { createFetch, fetch as fetch$1 } from 'ofetch';
import { resolve as resolve$1 } from 'pathe';
import { withTrailingSlash, joinURL } from 'ufo';
import { resolve } from 'node:path';
import { defu } from 'defu';
import { isWindows, isBun } from 'std-env';

let currentContext;
function createTestContext(options) {
  const _options = defu(options, {
    testDir: resolve(process.cwd(), "test"),
    fixture: "fixture",
    configFile: "nuxt.config",
    setupTimeout: isWindows ? 24e4 : 12e4,
    teardownTimeout: isWindows ? 6e4 : 3e4,
    serverStartTimeout: isWindows ? 12e4 : 6e4,
    dev: !!JSON.parse(process.env.NUXT_TEST_DEV || "false"),
    logLevel: 1,
    server: true,
    build: options.browser !== false || options.server !== false,
    env: {},
    nuxtConfig: {
      // suppress compatibility date warning for runtime environment tests
      compatibilityDate: "2024-04-03"
    },
    browserOptions: {
      type: "chromium"
    }
  });
  if (!_options.dev) {
    _options.env.NODE_ENV ||= "production";
  }
  if (_options.host) {
    _options.build = false;
    _options.server = false;
  }
  if (process.env.VITEST === "true") {
    _options.runner ||= "vitest";
  } else if (process.env.JEST_WORKER_ID) {
    _options.runner ||= "jest";
  } else if (isBun) {
    _options.runner ||= "bun";
  }
  return setTestContext({
    options: _options,
    url: withTrailingSlash(_options.host)
  });
}
function useTestContext() {
  recoverContextFromEnv();
  if (!currentContext) {
    throw new Error("No context is available. (Forgot calling setup or createContext?)");
  }
  return currentContext;
}
function setTestContext(context) {
  currentContext = context;
  return currentContext;
}
function isDev() {
  const ctx = useTestContext();
  return ctx.options.dev;
}
function recoverContextFromEnv() {
  if (!currentContext && process.env.NUXT_TEST_CONTEXT) {
    setTestContext(JSON.parse(process.env.NUXT_TEST_CONTEXT || "{}"));
  }
}
function exposeContextToEnv() {
  const { options, browser, url } = currentContext;
  process.env.NUXT_TEST_CONTEXT = JSON.stringify({ options, browser, url });
}

const globalFetch = globalThis.fetch || fetch$1;
async function startServer(options = {}) {
  const ctx = useTestContext();
  await stopServer();
  const host = "127.0.0.1";
  const port = ctx.options.port || await getRandomPort(host);
  ctx.url = `http://${host}:${port}/`;
  if (ctx.options.dev) {
    ctx.serverProcess = x("nuxi", ["_dev"], {
      throwOnError: true,
      nodeOptions: {
        cwd: ctx.nuxt.options.rootDir,
        stdio: "inherit",
        env: {
          ...process.env,
          _PORT: String(port),
          // Used by internal _dev command
          PORT: String(port),
          HOST: host,
          NODE_ENV: "development",
          ...ctx.options.env,
          ...options.env
        }
      }
    });
  } else {
    const outputDir = ctx.nuxt ? ctx.nuxt.options.nitro.output.dir : ctx.options.nuxtConfig.nitro.output.dir;
    ctx.serverProcess = x(
      "node",
      [resolve$1(outputDir, "server/index.mjs")],
      {
        throwOnError: true,
        nodeOptions: {
          stdio: "inherit",
          env: {
            ...process.env,
            PORT: String(port),
            HOST: host,
            NODE_ENV: "test",
            ...ctx.options.env,
            ...options.env
          }
        }
      }
    );
  }
  await waitForServer({ host, port, dev: ctx.options.dev });
}
async function waitForServer({ host, port, dev }) {
  const ctx = useTestContext();
  const baseURL = ctx.nuxt?.options.app.baseURL ?? "/";
  const deadline = Date.now() + ctx.options.serverStartTimeout;
  await waitForPort(port, { retries: 8, host }).catch(() => {
  });
  let lastError;
  while (Date.now() < deadline) {
    if (ctx.serverProcess && (ctx.serverProcess.killed || ctx.serverProcess.exitCode != null)) {
      throw new Error(`Server process exited before becoming ready (exit code: ${ctx.serverProcess.exitCode ?? "unknown"})`);
    }
    try {
      const res = await globalFetch(joinURL(ctx.url, baseURL), { signal: AbortSignal.timeout(1e4) });
      if (dev && res.status === 503) {
        lastError = new Error(`Server responded with ${res.status} ${res.statusText}`);
      } else if (dev && (await res.text()).includes("__NUXT_LOADING__")) {
        lastError = new Error("Dev server is still starting up");
      } else {
        return;
      }
    } catch (e) {
      lastError = e;
    }
    await new Promise((resolve2) => setTimeout(resolve2, 100));
  }
  await stopServer();
  throw lastError instanceof Error ? lastError : new Error(`Timeout (${ctx.options.serverStartTimeout}ms) waiting for ${dev ? "dev" : "built"} server to become ready at ${ctx.url}`);
}
async function stopServer() {
  const ctx = useTestContext();
  const proc = ctx.serverProcess;
  if (!proc) {
    return;
  }
  ctx.serverProcess = void 0;
  const exited = Promise.resolve(proc).then(() => {
  }, () => {
  });
  const sleep = (ms) => new Promise((resolve2) => setTimeout(resolve2, ms));
  proc.kill();
  await Promise.race([exited, sleep(5e3)]);
  if (proc.exitCode == null) {
    proc.kill("SIGKILL");
    await Promise.race([exited, sleep(5e3)]);
  }
}
function fetch(path, options) {
  return globalFetch(url(path), options);
}
const _$fetch = createFetch({ fetch: globalFetch });
const $fetch = function $fetch2(path, options) {
  return _$fetch(url(path), options);
};
function url(path) {
  const ctx = useTestContext();
  if (!ctx.url) {
    throw new Error("url is not available (is server option enabled?)");
  }
  if (path.startsWith(ctx.url)) {
    return path;
  }
  return joinURL(ctx.url, path);
}

export { $fetch as $, startServer as a, stopServer as b, createTestContext as c, url as d, exposeContextToEnv as e, fetch as f, isDev as i, recoverContextFromEnv as r, setTestContext as s, useTestContext as u };
