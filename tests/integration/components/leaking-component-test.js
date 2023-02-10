/* global WeakRef, gc */

import QUnit, { module, test } from 'qunit';
import { setupRenderingTest } from 'mem-leak-app/tests/helpers';
import { render, visit } from '@ember/test-helpers';
import Component from '@glimmer/component';

let OwnerRefs = [];

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

import Application from '@ember/application';
const originalBuildApplicationInstance = Application.prototype.buildInstance;
Application.prototype.buildInstance = function buildInstance(options) {
  let owner = originalBuildApplicationInstance.call(this, options);
  OwnerRefs.push(new WeakRef(owner));
  return owner;
};

import Engine from '@ember/engine';
import { setupApplicationTest } from 'ember-qunit';
const originalBuildEngineInstance = Engine.prototype.buildInstance;
Engine.prototype.buildInstance = function buildInstance(options) {
  let owner = originalBuildEngineInstance.call(this, options);
  OwnerRefs.push(new WeakRef(owner));
  return owner;
};

function invertAssertExpectation(assert) {
  assert.test._originalPushResult = assert.test.pushResult;
  assert.test.pushResult = function (resultInfo) {
    // Inverts the result so we can test failing assertions
    resultInfo.result = !resultInfo.result;
    resultInfo.message = `Failed: ${resultInfo.message}`;
    this._originalPushResult(resultInfo);
  };
}

module('Integration | Component | leaking-component', function (hooks) {
  setupRenderingTest(hooks);

  test('it errors if the component has a leak', async function (assert) {
    assert.expect(0);

    invertAssertExpectation(assert);

    await render(
      class LeakingComponent extends Component {
        constructor() {
          super(...arguments);
          document.body.addEventListener('click', () => {
            console.log(this);
          });
        }
      }
    );
  });

  test('it does not error if the component does not leak', async function (assert) {
    assert.expect(0);
    await render(Component);
  });
});

module('Engines', function (hooks) {
  setupApplicationTest(hooks);

  test('it errors if the route has a leak', async function (assert) {
    assert.expect(0);
    invertAssertExpectation(assert);
    await visit('/whatever/leak');
  });

  test('it does not error if the route does have a leak', async function (assert) {
    assert.expect(0);
    await visit('/whatever/no-leak');
  });
});
