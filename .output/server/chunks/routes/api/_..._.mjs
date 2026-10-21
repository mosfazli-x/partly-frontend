import { c as defineEventHandler, u as useRuntimeConfig, p as proxyRequest } from '../../_/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';

const _____ = defineEventHandler((event) => {
  const config = useRuntimeConfig(event);
  const target = String(config.apiTarget).replace(/\/$/, "");
  return proxyRequest(event, `${target}${event.path.slice("/api".length)}`);
});

export { _____ as default };
//# sourceMappingURL=_..._.mjs.map
