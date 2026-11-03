const NodeEnvironment = require(
  require.resolve('jest-environment-node', { paths: [require.resolve('jest')] }),
);

class E2ENvironment extends NodeEnvironment {
  constructor(config, context) {
    super(config, context);
    // Jest 27 omits Node's web globals, which discord.js expects on import.
    for (const name of [
      'fetch',
      'Headers',
      'Request',
      'Response',
      'FormData',
      'Blob',
      'File',
      'ReadableStream',
    ]) {
      this.global[name] = globalThis[name];
    }
  }
}

module.exports = E2ENvironment;
