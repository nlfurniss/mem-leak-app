/* eslint-env node */
'use strict';

module.exports = function (environment) {
  let ENV = {
    modulePrefix: 'whatever',
    environment,
  };

  return ENV;
};
