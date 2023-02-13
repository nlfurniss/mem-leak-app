import Application from 'mem-leak-app/app';
import config from 'mem-leak-app/config/environment';
import * as QUnit from 'qunit';
import { setApplication } from '@ember/test-helpers';
import { setup } from 'qunit-dom';
import { start } from 'ember-qunit';
import './helpers/owner-leak-detection';

setApplication(Application.create(config.APP));

setup(QUnit.assert);

start();
