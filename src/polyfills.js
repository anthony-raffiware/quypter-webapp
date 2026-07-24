globalThis.global = globalThis;

globalThis.Buffer = globalThis.Buffer || require('buffer').Buffer;

globalThis.process = globalThis.process || {
  env: { DEBUG: undefined },
  version: '', // to avoid undefined.slice error
}