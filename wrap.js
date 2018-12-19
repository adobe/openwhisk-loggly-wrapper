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
const _ = require('lodash/fp');
const winston = require('winston');
const Loggly = require('./transport');

/* eslint-disable no-underscore-dangle */

/**
 * Returns true when k is likely the name of disclosable key (i.e. not in ALL_CAPS)
 * @param {String} k
 */
function disclosable(v, k) {
  return !k.match(/^[A-Z0-9_]+$/);
}

function loglevel(p = {}) {
  if (p.__ow_headers) {
    // openwhisk transforms all headers to lowercase
    if (p.__ow_headers['x-debug']) {
      // use the log level set in the `X-Debug` header
      return p.__ow_headers['x-debug'];
    }
  }
  return 'debug';
}

function activationid() {
  return process.env.__OW_ACTIVATION_ID
    ? process.env.__OW_ACTIVATION_ID
    : 'debug';
}

function functionname() {
  return process.env.__OW_ACTION_NAME
    ? process.env.__OW_ACTION_NAME.replace(/\/.+\//, '')
    : 'debug';
}

function requestid(p = {}) {
  if (p.__ow_headers) {
    // openwhisk transforms all headers to lowercase
    if (p.__ow_headers['x-cdn-request-id']) {
      return p.__ow_headers['x-cdn-request-id'];
    }
  }
  return 'debug';
}

function defaultlogger(p = {}) {
  const token = p.LOGGLY_KEY;
  const subdomain = p.LOGGLY_HOST;
  const logger = winston.createLogger({
    level: loglevel(p),
  });
  if (token && subdomain) {
    const myloggly = new Loggly({
      token,
      subdomain,
      tags: ['OpenWhisk', functionname(), activationid()],
      json: true,
    });
    logger.add(myloggly);
  } else {
    logger.add(new winston.transports.Console({
      json: false,
      format: winston.format.simple(),
    }));
  }
  return logger;
}

/**
 * Wraps a function with proper logging, before and after.
 * @param fn The openwhisk action to wrap
 * @param params the action params
 * @returns {*} the return value of the action
 */
function wrap(fn, params = {}) {
  if (!params.__ow_logger) {
    // eslint-disable-next-line no-param-reassign
    params.__ow_logger = defaultlogger(params);
  }
  const disclosableParams = _.pickBy(disclosable, params);
  const logger = params.__ow_logger;

  logger.log('silly', 'before', {
    params,
    request: requestid(disclosableParams),
    activation: activationid(),
    function: functionname(),
  });
  try {
    return Promise.resolve(fn(params))
      .then((r) => {
        logger.log('silly', 'resolved', {
          result: r,
          request: requestid(disclosableParams),
          activation: activationid(),
          function: functionname(),
        });
        return r;
      })
      .catch((e) => {
        logger.log('debug', 'error', {
          error: e,
          request: requestid(disclosableParams),
          activation: activationid(),
          function: functionname(),
        });
        return e;
      });
  } catch (e) {
    logger.error(e.stack);
    return { error: e };
  }
}

module.exports = wrap;
