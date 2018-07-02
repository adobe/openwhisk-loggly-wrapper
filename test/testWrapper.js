const assert = require("assert");
const wrapper = require("../wrap");

describe("Test wrapper.js", () => {
  it("Wrapper can be loaded", () => {
    assert.ok(wrapper);
  });

  it("Wrapper is a function", () => {
    assert.equal(typeof wrapper, "function");
  });

  it("Wrapping executes immediately", done => {
    assert.ok(
      wrapper(() => {
        done();
        return true;
      })
    );
  });

  it("Wrapping passes parameters", done => {
    assert.ok(
      wrapper(p => {
        assert.ok(p.hello);
        done();
        return true;
      }, {hello: 'world'})
    );
  });

  it("Wrapping masks secret parameters", done => {
    assert.ok(
      wrapper(p => {
        assert.notEqual(p.HELLO, 'world');
        done();
        return true;
      }, {HELLO: 'world'})
    );
  });

  it("Wrapping passes secret parameters as secrets", done => {
    assert.ok(
      wrapper((p, s) => {
        assert.notEqual(p.HELLO, 'world');
        assert.equal(s.HELLO, 'world');
        done();
        return true;
      }, {HELLO: 'world'})
    );
  });

  it("Wrapping enables overriding of secret parameters", done => {
    assert.ok(
      wrapper((p, s) => {
        assert.notEqual(s.HELLO, 'world');
        assert.equal(s.HELLO, 'just kidding');
        done();
        return true;
      }, {HELLO: 'world'}, {HELLO: 'just kidding'})
    );
  });

  it("Wrapping sets up a logger with one transports", done => {
    assert.ok(
      wrapper((p, s, l) => {
        assert.ok(l);
        assert.ok(l.loggers.default.transports);
        assert.equal(l.loggers.default.transports.length, 1);
        done();
        return true;
      }, {HELLO: 'world'}, {HELLO: 'just kidding'})
    );
  });
});