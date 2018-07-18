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
const loggly = require('node-loggly-bulk');
const Transport = require('winston-transport');

/* A super simple loggly transport for OpenWhisk */
class LogglyTransport extends Transport {
  constructor(options) {
    super(options);
    this.loggly = loggly.createClient(Object.assign(...options, { bufferOptions: { size: 1 } }));
  }

  log(info, callback) {
    this.loggly.log(info, callback);
  }
}

module.exports = LogglyTransport;
