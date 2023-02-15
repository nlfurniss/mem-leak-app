/* global WeakRef, gc */

import QUnit from 'qunit';
import Application from '@ember/application';
import Engine from '@ember/engine';

const HAS_GC = typeof gc === 'function';

let OwnerRefs = [];

/**
  After each test is completed, check for owner leaks. This will be the best
  ergonomics (the actual test that leaks will fail), but due to running GC many
  times per test, will be the slowest mechanism.
*/
export function setupPerTestLeakDetection() {
  applyMonkeyPatchesToCaptureOwners();
  ensureTestReleasesTestEnvironment(function () {
    const currentTest = QUnit.config.current;
    for (let [, owners] of checkForRetainedOwners()) {
      for (let owner of owners) {
        currentTest.expected++;
        currentTest.assert.pushResult({
          result: false,
          message: `Leaked ${getOwnerMetadata(owner)}`,
        });
      }
    }
  });
}

/**
  After each module is completed, check for owner leaks. This will be faster than
  checking for each test, but slower than checking once at the end of all tests.
*/
export function setupPerModuleLeakDetection() {
  applyMonkeyPatchesToCaptureOwners();
  ensureTestReleasesTestEnvironment();

  QUnit.on('suiteEnd', () => {
    const leakedOwners = checkForRetainedOwners();

    if (leakedOwners.size > 0) {
      QUnit.module(`[OWNER LEAK DETECTED]`, function () {
        for (let [testName, owners] of leakedOwners) {
          QUnit.test(
            `tests leaking owner found within \`${testName}\``,
            function (assert) {
              assert.expect(1);
              for (let owner of owners) {
                assert.pushResult({
                  result: false,
                  message: `Leaked ${getOwnerMetadata(owner)}`,
                });
              }
            }
          );
        }
      });
    }
  });
}

/**
  After all tests have been ran, check for any owner leaks. This will be the fastest
  mechanism, but also will be ran the least often (you won't get feedback until all
  tests have completed).
*/
export function setupAfterAllTestsOwnerLeakDetection() {
  applyMonkeyPatchesToCaptureOwners();
  ensureTestReleasesTestEnvironment();

  // Due to details of how QUnit functions (see https://github.com/qunitjs/qunit/pull/1629)
  // we cannot enqueue new tests if we use `runEnd` which is basically what we want (i.e. "when all tests are done run this callback")
  //
  // Instead we use `suiteEnd` and check `QUnit.config.queue` which indicates the number of tests remaining to be ran
  // when `QUnit.config.queue` gets to `0` and `suiteEnd` is running we are finished with all tests **but** `runEnd` / `QUnit.done()` hasn't ran yet so we can still emit new tests
  QUnit.on('suiteEnd', () => {
    if (QUnit.config.queue.length !== 0) {
      return;
    }

    const leakedOwners = checkForRetainedOwners();

    if (leakedOwners.size > 0) {
      QUnit.module(`[OWNER LEAK DETECTED]`, function () {
        for (let [testName, owners] of leakedOwners) {
          QUnit.test(
            `tests leaking owner found within \`${testName}\``,
            function (assert) {
              assert.expect(1);
              for (let owner of owners) {
                assert.pushResult({
                  result: false,
                  message: `Leaked ${getOwnerMetadata(owner)}`,
                });
              }
            }
          );
        }
      });
    }
  });
}

function ensureTestReleasesTestEnvironment(callback = () => {}) {
  QUnit.on('testStart', () => {
    const currentTest = QUnit.config.current;
    const { finish } = currentTest;

    currentTest.finish = async function () {
      // We must reset `currentTest.testEnvironment` or we cannot do leak
      // checking per-test (since owner is setup on `this` within the test)
      currentTest.testEnvironment = null;

      callback();

      return finish.apply(this, arguments);
    };
  });
}

function checkForRetainedOwners() {
  if (!HAS_GC) {
    return;
  }

  gc();
  gc();
  gc();

  let TestNameToRetainedOwner = new Map();
  // eslint-disable-next-line no-restricted-syntax, no-unused-vars
  for (let i = 0; i < OwnerRefs.length; i++) {
    let [ownerRef, testName] = OwnerRefs[i];
    let owner = ownerRef.deref();
    if (owner !== undefined) {
      let owners = TestNameToRetainedOwner.get(testName);
      if (owners === undefined) {
        owners = [];
        TestNameToRetainedOwner.set(testName, owners);
      }
      owners.push(owner);
    }
  }

  OwnerRefs = [];

  return TestNameToRetainedOwner;
}

function getOwnerMetadata(owner) {
  if (owner.mountPoint) {
    return `Engine [mounted at \`/${owner.mountPoint}\`]`;
  } else {
    return `Application`;
  }
}

function getTestName() {
  const currentTest = QUnit.config.current;
  return `${currentTest.module.name}: ${currentTest.testName}`;
}

function trackOwner(owner) {
  OwnerRefs.push([new WeakRef(owner), getTestName()]);
}

const originalBuildApplicationInstance = Application.prototype.buildInstance;
function ApplicationBuildInstanceOverride(options) {
  let owner = originalBuildApplicationInstance.call(this, options);

  trackOwner(owner);

  return owner;
}
ApplicationBuildInstanceOverride.isOwnerCaptureMonkeyPatch = true;

const originalBuildEngineInstance = Engine.prototype.buildInstance;
function EngineBuildInstanceOverride(options) {
  let owner = originalBuildEngineInstance.call(this, options);

  trackOwner(owner);

  return owner;
}
EngineBuildInstanceOverride.isOwnerCaptureMonkeyPatch = true;

function applyMonkeyPatchesToCaptureOwners() {
  if (!originalBuildApplicationInstance.isOwnerCaptureMonkeyPatch) {
    Application.prototype.buildInstance = ApplicationBuildInstanceOverride;
  }

  if (!originalBuildEngineInstance.isOwnerCaptureMonkeyPatch) {
    Engine.prototype.buildInstance = EngineBuildInstanceOverride;
  }
}
