/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
const _ = require("lodash/fp");

/**
 * Masks all values of ALL_CAPS keys in o, so that sensitive data isn't
 * inadvertantly echoed
 */
function sanitize(o) {
    return _.fromPairs(
      Object.entries(o).map(([k, v]) => {
        if (k.match(/^[A-Z0-9_]+$/)) {
          return [k, k.replace(/./g, "•") + v.substr(-4)];
        } else {
          return [k, v];
        }
      })
    );
  }
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
  
  /**
   * Wraps a function f with proper logging, before and after.
   */
  function wrap(f) {
    return function(p) {
      const winston = require("winston");
      require("winston-loggly-bulk");
  
      // default log level
      var loglevel = "info";
      // default request ID
      var requestid = "debug";
      // OpenWhisk activation ID (works only in OpenWhisk, only for a single invocation)
      var activation = process.env["__OW_ACTIVATION_ID"] ? process.env["__OW_ACTIVATION_ID"] : "debug";

      var functionname = process.env["__OW_ACTION_NAME"] ? process.env["__OW_ACTION_NAME"].replace(/\/.+\//, "") : "debug";

      if (p["__ow_headers"]) {
        if (p["__ow_headers"]["X-Debug"]) {
          // use the log level set in the `X-Debug` header
          loglevel = p["__ow_headers"]["X-Debug"];
          if (p["__ow_headers"]["X-CDN-Request-Id"]) {
              requestid = p["__ow_headers"]["X-CDN-Request-Id"];
          }
        }
      } else {
        //there are no headers present, this is a direct invocation, set log level to debug
        loglevel = "debug";
      }
  
      console.log("Logging with level " + loglevel);
      try {
        winston.add(winston.transports.Loggly, {
          token: p.LOGGLY_KEY,
          subdomain: p.LOGGLY_HOST,
          //include OW_ACTION_NAME in tags for easier filtering
          tags: [
            "OpenWhisk",
            functionname,
            activation
          ],
          json: true,
          level: loglevel
        });
      } catch (e) {
        console.error(e);
      }
      console.log("before");
      const [secrets, params] = split(p);
      winston.log("debug", "before", { params: params, request: requestid, activation: activation, function: process.env["__OW_ACTION_NAME"] });
      try {
        const retval = Promise.resolve(f(params, secrets, winston))
          .then(r => {
            console.log("resolved");
            winston.log("debug", "resolved", { result: r, request: requestid, activation: activation, function: process.env["__OW_ACTION_NAME"] });
            return r;
          })
          .catch(e => {
            console.log("error");
            winston.log("debug", "error", { error: e, request: requestid, activation: activation, function: process.env["__OW_ACTION_NAME"] });
            return e;
          });
        return retval;
      } catch (e) {
        if (!e.toString().indexOf('Transport already attached')) {
          console.error("ERROR in wrap", e);
        }
      }
    };
  }

  module.exports = wrap;