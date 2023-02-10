/* eslint-env node */
'use strict';

// eslint-disable-next-line n/no-extraneous-require
const EngineAddon = require('ember-engines/lib/engine-addon');

module.exports = EngineAddon.extend({
  name: 'whatever',

  lazyLoading: Object.freeze({
    enabled: false,
  }),

  isDevelopingAddon() {
    return true;
  },
});
