/* global WeakRef, gc */

import QUnit, { module, test } from 'qunit';
import { setupRenderingTest } from 'mem-leak-app/tests/helpers';
import { render } from '@ember/test-helpers';
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

function setupLeakCatcher(hooks) {
  hooks.beforeEach(function () {
    OwnerRefs.push(new WeakRef(this.owner));
  });
}

module('Integration | Component | leaking-component', function (hooks) {
  setupRenderingTest(hooks);
  setupLeakCatcher(hooks);

  test('it errors if the component has a leak', async function (assert) {
    assert.expect(0);

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
