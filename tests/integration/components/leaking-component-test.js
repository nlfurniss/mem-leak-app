import { module, test } from 'qunit';
import {
  setupRenderingTest,
  setupApplicationTest,
} from 'mem-leak-app/tests/helpers';
import { render, visit } from '@ember/test-helpers';
import Component from '@glimmer/component';

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
  test('has `gc` present', function (assert) {
    assert.strictEqual(typeof gc, 'function');
  });

  test('it errors if the route has a leak', async function (assert) {
    assert.expect(0);
    invertAssertExpectation(assert);
    await visit('/whatever/leak');
  });

  test('it does not error if the route does not have a leak', async function (assert) {
    assert.expect(0);
    await visit('/whatever/no-leak');
  });
});
