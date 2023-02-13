import Application from 'mem-leak-app/app';
import config from 'mem-leak-app/config/environment';
import * as QUnit from 'qunit';
import { setApplication } from '@ember/test-helpers';
import { setup } from 'qunit-dom';
import { start } from 'ember-qunit';
import {
  setupAfterAllTestsOwnerLeakDetection,
  setupPerTestLeakDetection,
  setupPerModuleLeakDetection,
} from './helpers/owner-leak-detection';

//setupPerTestLeakDetection();
//setupPerModuleLeakDetection();
setupAfterAllTestsOwnerLeakDetection();
setApplication(Application.create(config.APP));

setup(QUnit.assert);

start();
