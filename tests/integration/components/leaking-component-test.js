/* global FinalizationRegistry, WeakRef, gc */

import QUnit, { module, test } from 'qunit';
import { setupRenderingTest } from 'mem-leak-app/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function detectIfMemoryIsLeaked() {
  gc();
  gc();
  gc();

  // eslint-disable-next-line no-restricted-syntax, no-unused-vars
  for (const [owner, testNames] of window.leakReg) {
    debugger;
    // throw Error('got to hooks.after');
  }
}

QUnit.on('testStart', () => {
  const currentTest = QUnit.config.current;
  const { finish } = currentTest;
  const { pushFailure } = currentTest;

  // eslint-disable-next-line consistent-return
  currentTest.pushFailure = function (message) {
    if (message.indexOf('got to hooks.after') === 0) {
      debugger;
    } else {
      return pushFailure.apply(this, arguments);
    }
  };

  currentTest.finish = async function () {
    const doFinish = () => finish.apply(this, arguments);

    const finishResult = await doFinish();

    detectIfMemoryIsLeaked(this);

    return finishResult;
  };
});

class IterableWeakMap {
  #weakMap = new WeakMap();

  #refSet = new Set();

  // eslint-disable-next-line no-use-before-define
  #finalizationGroup = new FinalizationRegistry(IterableWeakMap.#cleanup);

  static #cleanup({ set, ref }) {
    set.delete(ref);
  }

  set(key, value) {
    const ref = new WeakRef(key);

    this.#weakMap.set(key, { value, ref });
    this.#refSet.add(ref);
    this.#finalizationGroup.register(
      key,
      {
        set: this.#refSet,
        ref,
      },
      ref
    );
  }

  get(key) {
    const entry = this.#weakMap.get(key);
    return entry && entry.value;
  }

  delete(key) {
    const entry = this.#weakMap.get(key);
    if (!entry) {
      return false;
    }

    this.#weakMap.delete(key);
    this.#refSet.delete(entry.ref);
    this.#finalizationGroup.unregister(entry.ref);
    return true;
  }

  *[Symbol.iterator]() {
    // eslint-disable-next-line no-restricted-syntax
    for (const ref of this.#refSet) {
      const key = ref.deref();
      // eslint-disable-next-line no-continue
      if (!key) continue;
      const { value } = this.#weakMap.get(key);
      yield [key, value];
    }
  }

  entries() {
    return this[Symbol.iterator]();
  }

  *keys() {
    // eslint-disable-next-line no-restricted-syntax, no-unused-vars
    for (const [key, value] of this) {
      yield key;
    }
  }

  *values() {
    // eslint-disable-next-line no-restricted-syntax, no-unused-vars
    for (const [key, value] of this) {
      yield value;
    }
  }
}

function setupLeakCatcher(hooks) {
  // let reg;

  hooks.before(function () {
    window.leakReg = new IterableWeakMap();
  });

  hooks.beforeEach(function () {
    const { owner } = this;
    const testName = `${QUnit.config.current.module.name}: ${QUnit.config.current.testName}`;

    const existing = window.leakReg.get(owner);
    // TODO: rwjblue doesn't think this can happen?
    if (existing) {
      existing.push(testName);
    } else {
      window.leakReg.set(owner, testName);
    }
  });

  hooks.after(function () {
    // gc();
    // gc();
    // gc();
    // // eslint-disable-next-line no-restricted-syntax, no-unused-vars
    // for (const [owner, testNames] of reg) {
    //   // throw Error('got to hooks.after');
    // }
  });
}

module('Integration | Component | leaking-component', function (hooks) {
  setupRenderingTest(hooks);
  setupLeakCatcher(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`<LeakingComponent />`);

    assert.dom(this.element).hasText('');

    // Template block usage:
    await render(hbs`
      <LeakingComponent>
        template block text
      </LeakingComponent>
    `);

    assert.dom(this.element).hasText('template block text');
  });
});
