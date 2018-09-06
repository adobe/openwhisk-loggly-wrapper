/*
 * Copyright 2018 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
/* global it, describe */
const wrapper = require('../wrap');

describe('Test Loggly Environment variables (needs env)', () => {
  it('Test Default Logger', (done) => {
    wrapper((p, s, l) => {
      l.info('Testing now', p);
      done();
    }, { LOGGLY_HOST: process.env.LOGGLY_HOST, LOGGLY_KEY: process.env.LOGGLY_KEY });
  });
});
