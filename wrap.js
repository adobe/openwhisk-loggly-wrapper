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
require('winston-loggly-bulk');

/* eslint-disable no-underscore-dangle */

/**
 * Returns true when k is likely the name of a secure key (i.e. in ALL_CAPS)
 * @param {String} k
 */
function secure(v, k) {
  return k.match(/^[A-Z0-9_]+$/);
}

function split(o) {
  return [_.pickBy(secure, o), _.pickBy(_.negate(secure), o)];
}

function loglevel(p = {}) {
  if (p.__ow_headers) {
    if (p.__ow_headers['X-Debug']) {
      // use the log level set in the `X-Debug` header
      return p.__ow_headers['X-Debug'];
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
    if (p.__ow_headers['X-CDN-Request-Id']) {
      return p.__ow_headers['X-CDN-Request-Id'];
    }
  }
  return 'debug';
}

function defaultlogger(p, secrets) {
  console.log('getting default logger');
  const token = secrets.LOGGLY_KEY || p.LOGGLY_KEY;
  const subdomain = secrets.LOGGLY_HOST || p.LOGGLY_HOST;
  try {
    if (token && subdomain) {
      winston.add(winston.transports.Loggly, {
        token,
        subdomain,
        // include OW_ACTION_NAME in tags for easier filtering
        tags: ['OpenWhisk', functionname(), activationid()],
        json: true,
        level: loglevel(p),
      });
      console.log('loggly transport added');
    }
  } catch (e) {
    console.error(e);
    if (!e.toString().indexOf('Transport already attached')) {
      console.error('ERROR in wrap', e);
    }
  }
  return winston;
}

/**
 * Wraps a function f with proper logging, before and after.
 */
function wrap(
  f,
  passedparams,
  passedsecrets,
  logger = defaultlogger(passedparams, passedsecrets),
) {
  const [parsedsecrets, params] = split(passedparams);
  // allow overriding secrets
  const secrets = Object.assign(parsedsecrets, passedsecrets);
  logger.log('silly', 'before', {
    params,
    request: requestid(params),
    activation: activationid(),
    function: functionname(),
  });
  try {
    const retval = Promise.resolve(f(params, secrets, logger))
      .then((r) => {
        logger.log('silly', 'resolved', {
          result: r,
          request: requestid(params),
          activation: activationid(),
          function: functionname(),
        });
        return r;
      })
      .catch((e) => {
        logger.log('debug', 'error', {
          error: e,
          request: requestid(params),
          activation: activationid(),
          function: functionname(),
        });
        return e;
      });
    return retval;
  } catch (e) {
    logger.log('error', e);
    return { error: e };
  }
}

module.exports = wrap;
