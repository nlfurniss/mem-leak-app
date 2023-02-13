/* global WeakRef, gc */

import QUnit from 'qunit';
import Application from '@ember/application';
import Engine from '@ember/engine';

const HAS_GC = typeof gc === 'function';

let OwnerRefs = [];
if (HAS_GC) {
  QUnit.on('testStart', () => {
    const currentTest = QUnit.config.current;
    const { finish } = currentTest;

    currentTest.finish = async function () {
      currentTest.testEnvironment = null;

      gc();
      gc();
      gc();

      // eslint-disable-next-line no-restricted-syntax, no-unused-vars
      for (let i = 0; i < OwnerRefs.length; i++) {
        let ref = OwnerRefs[i];
        if (ref.deref()) {
          let message = `Leaked an owner`;
          currentTest.expected++;
          currentTest.assert.pushResult({
            result: false,
            message: `${message} \nMore information has been printed to the console. Please use that information to help in debugging.\n\n`,
          });
        }
      }

      OwnerRefs = [];

      // let finishResult = await finish.apply(this, arguments);
      return await finish.apply(this, arguments);
    };
  });

  const originalBuildApplicationInstance = Application.prototype.buildInstance;
  Application.prototype.buildInstance = function buildInstance(options) {
    let owner = originalBuildApplicationInstance.call(this, options);
    OwnerRefs.push(new WeakRef(owner));
    return owner;
  };

  const originalBuildEngineInstance = Engine.prototype.buildInstance;
  Engine.prototype.buildInstance = function buildInstance(options) {
    let owner = originalBuildEngineInstance.call(this, options);
    OwnerRefs.push(new WeakRef(owner));
    return owner;
  };
}
