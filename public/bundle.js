(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * The MIT License (MIT)
 * 
 * Copyright (c) 2015 Famous Industries Inc.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * Camera is a component that is responsible for sending information to the renderer about where
 * the camera is in the scene.  This allows the user to set the type of projection, the focal depth,
 * and other properties to adjust the way the scenes are rendered.
 *
 * @class Camera
 *
 * @param {Node} node to which the instance of Camera will be a component of
 */
function Camera(node) {
    this._node = node;
    this._projectionType = Camera.ORTHOGRAPHIC_PROJECTION;
    this._focalDepth = 0;
    this._near = 0;
    this._far = 0;
    this._requestingUpdate = false;
    this._id = node.addComponent(this);
    this._viewTransform = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    this._viewDirty = false;
    this._perspectiveDirty = false;
    this.setFlat();
}

Camera.FRUSTUM_PROJECTION = 0;
Camera.PINHOLE_PROJECTION = 1;
Camera.ORTHOGRAPHIC_PROJECTION = 2;

/**
 * @method
 *
 * @return {String} Name of the component
 */
Camera.prototype.toString = function toString() {
    return 'Camera';
};

/**
 * Gets object containing serialized data for the component
 *
 * @method
 *
 * @return {Object} the state of the component
 */
Camera.prototype.getValue = function getValue() {
    return {
        component: this.toString(),
        projectionType: this._projectionType,
        focalDepth: this._focalDepth,
        near: this._near,
        far: this._far
    };
};

/**
 * Set the components state based on some serialized data
 *
 * @method
 *
 * @param {Object} state an object defining what the state of the component should be
 *
 * @return {Boolean} status of the set
 */
Camera.prototype.setValue = function setValue(state) {
    if (this.toString() === state.component) {
        this.set(state.projectionType, state.focalDepth, state.near, state.far);
        return true;
    }
    return false;
};

/**
 * Set the internals of the component
 *
 * @method
 *
 * @param {Number} type an id corresponding to the type of projection to use
 * @param {Number} depth the depth for the pinhole projection model
 * @param {Number} near the distance of the near clipping plane for a frustum projection
 * @param {Number} far the distanct of the far clipping plane for a frustum projection
 * 
 * @return {Boolean} status of the set
 */
Camera.prototype.set = function set(type, depth, near, far) {
    if (!this._requestingUpdate) {
        this._node.requestUpdate(this._id);
        this._requestingUpdate = true;
    }
    this._projectionType = type;
    this._focalDepth = depth;
    this._near = near;
    this._far = far;
};

/**
 * Set the camera depth for a pinhole projection model
 *
 * @method
 *
 * @param {Number} depth the distance between the Camera and the origin
 *
 * @return {Camera} this
 */
Camera.prototype.setDepth = function setDepth(depth) {
    if (!this._requestingUpdate) {
        this._node.requestUpdate(this._id);
        this._requestingUpdate = true;
    }
    this._perspectiveDirty = true;
    this._projectionType = Camera.PINHOLE_PROJECTION;
    this._focalDepth = depth;
    this._near = 0;
    this._far = 0;

    return this;
};

/**
 * Gets object containing serialized data for the component
 *
 * @method
 *
 * @param {Number} near distance from the near clipping plane to the camera
 * @param {Number} far distance from the far clipping plane to the camera
 * 
 * @return {Camera} this
 */
Camera.prototype.setFrustum = function setFrustum(near, far) {
    if (!this._requestingUpdate) {
        this._node.requestUpdate(this._id);
        this._requestingUpdate = true;
    }

    this._perspectiveDirty = true;
    this._projectionType = Camera.FRUSTUM_PROJECTION;
    this._focalDepth = 0;
    this._near = near;
    this._far = far;

    return this;
};

/**
 * Set the Camera to have orthographic projection
 *
 * @method
 *
 * @return {Camera} this
 */
Camera.prototype.setFlat = function setFlat() {
    if (!this._requestingUpdate) {
        this._node.requestUpdate(this._id);
        this._requestingUpdate = true;
    }

    this._perspectiveDirty = true;
    this._projectionType = Camera.ORTHOGRAPHIC_PROJECTION;
    this._focalDepth = 0;
    this._near = 0;
    this._far = 0;

    return this;
};

/**
 * When the node this component is attached to updates, the Camera will
 * send new camera information to the Compositor to update the rendering
 * of the scene.
 *
 * @method
 *
 * @return {undefined} undefined
 */
Camera.prototype.onUpdate = function onUpdate() {
    this._requestingUpdate = false;

    var path = this._node.getLocation();

    this._node
        .sendDrawCommand('WITH')
        .sendDrawCommand(path);

    if (this._perspectiveDirty) {
        this._perspectiveDirty = false;

        switch (this._projectionType) {
            case Camera.FRUSTUM_PROJECTION:
                this._node.sendDrawCommand('FRUSTUM_PROJECTION');
                this._node.sendDrawCommand(this._near);
                this._node.sendDrawCommand(this._far);
                break;
            case Camera.PINHOLE_PROJECTION:
                this._node.sendDrawCommand('PINHOLE_PROJECTION');
                this._node.sendDrawCommand(this._focalDepth);
                break;
            case Camera.ORTHOGRAPHIC_PROJECTION:
                this._node.sendDrawCommand('ORTHOGRAPHIC_PROJECTION');
                break;
        }
    }

    if (this._viewDirty) {
        this._viewDirty = false;

        this._node.sendDrawCommand('CHANGE_VIEW_TRANSFORM');
        this._node.sendDrawCommand(this._viewTransform[0]);
        this._node.sendDrawCommand(this._viewTransform[1]);
        this._node.sendDrawCommand(this._viewTransform[2]);
        this._node.sendDrawCommand(this._viewTransform[3]);

        this._node.sendDrawCommand(this._viewTransform[4]);
        this._node.sendDrawCommand(this._viewTransform[5]);
        this._node.sendDrawCommand(this._viewTransform[6]);
        this._node.sendDrawCommand(this._viewTransform[7]);

        this._node.sendDrawCommand(this._viewTransform[8]);
        this._node.sendDrawCommand(this._viewTransform[9]);
        this._node.sendDrawCommand(this._viewTransform[10]);
        this._node.sendDrawCommand(this._viewTransform[11]);

        this._node.sendDrawCommand(this._viewTransform[12]);
        this._node.sendDrawCommand(this._viewTransform[13]);
        this._node.sendDrawCommand(this._viewTransform[14]);
        this._node.sendDrawCommand(this._viewTransform[15]);
    }
};

/**
 * When the transform of the node this component is attached to
 * changes, have the Camera update its projection matrix and
 * if needed, flag to node to update.
 *
 * @method
 *
 * @param {Array} transform an array denoting the transform matrix of the node
 *
 * @return {Camera} this
 */
Camera.prototype.onTransformChange = function onTransformChange(transform) {
    var a = transform;
    this._viewDirty = true;

    if (!this._requestingUpdate) {
        this._node.requestUpdate(this._id);
        this._requestingUpdate = true;
    }

    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
    a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
    a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
    a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

    b00 = a00 * a11 - a01 * a10,
    b01 = a00 * a12 - a02 * a10,
    b02 = a00 * a13 - a03 * a10,
    b03 = a01 * a12 - a02 * a11,
    b04 = a01 * a13 - a03 * a11,
    b05 = a02 * a13 - a03 * a12,
    b06 = a20 * a31 - a21 * a30,
    b07 = a20 * a32 - a22 * a30,
    b08 = a20 * a33 - a23 * a30,
    b09 = a21 * a32 - a22 * a31,
    b10 = a21 * a33 - a23 * a31,
    b11 = a22 * a33 - a23 * a32,

    det = 1/(b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06);

    this._viewTransform[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    this._viewTransform[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    this._viewTransform[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    this._viewTransform[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    this._viewTransform[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    this._viewTransform[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    this._viewTransform[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    this._viewTransform[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    this._viewTransform[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    this._viewTransform[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    this._viewTransform[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    this._viewTransform[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    this._viewTransform[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    this._viewTransform[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    this._viewTransform[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    this._viewTransform[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
};

module.exports = Camera;

},{}],2:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * Channels are being used for interacting with the UI Thread when running in
 * a Web Worker or with the UIManager/ Compositor when running in single
 * threaded mode (no Web Worker).
 *
 * @class Channel
 * @constructor
 */
function Channel() {
    if (typeof self !== 'undefined' && self.window !== self) {
        this._enterWorkerMode();
    }
}


/**
 * Called during construction. Subscribes for `message` event and routes all
 * future `sendMessage` messages to the Main Thread ("UI Thread").
 *
 * Primarily used for testing.
 *
 * @method
 *
 * @return {undefined} undefined
 */
Channel.prototype._enterWorkerMode = function _enterWorkerMode() {
    this._workerMode = true;
    var _this = this;
    self.addEventListener('message', function onmessage(ev) {
        _this.onMessage(ev.data);
    });
};

/**
 * Meant to be overriden by `Famous`.
 * Assigned method will be invoked for every received message.
 *
 * @type {Function}
 * @override
 *
 * @return {undefined} undefined
 */
Channel.prototype.onMessage = null;

/**
 * Sends a message to the UIManager.
 *
 * @param  {Any}    message Arbitrary message object.
 *
 * @return {undefined} undefined
 */
Channel.prototype.sendMessage = function sendMessage (message) {
    if (this._workerMode) {
        self.postMessage(message);
    }
    else {
        this.onmessage(message);
    }
};

/**
 * Meant to be overriden by the UIManager when running in the UI Thread.
 * Used for preserving API compatibility with Web Workers.
 * When running in Web Worker mode, this property won't be mutated.
 *
 * Assigned method will be invoked for every message posted by `famous-core`.
 *
 * @type {Function}
 * @override
 */
Channel.prototype.onmessage = null;

/**
 * Sends a message to the manager of this channel (the `Famous` singleton) by
 * invoking `onMessage`.
 * Used for preserving API compatibility with Web Workers.
 *
 * @private
 * @alias onMessage
 *
 * @param {Any} message a message to send over the channel
 *
 * @return {undefined} undefined
 */
Channel.prototype.postMessage = function postMessage(message) {
    return this.onMessage(message);
};

module.exports = Channel;

},{}],3:[function(require,module,exports){
/**
 * The MIT License (MIT)
 * 
 * Copyright (c) 2015 Famous Industries Inc.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * Equivalent of an Engine in the Worker Thread. Used to synchronize and manage
 * time across different Threads.
 *
 * @class  Clock
 * @constructor
 * @private
 */
function Clock () {
    this._time = 0;
    this._frame = 0;
    this._timerQueue = [];
    this._updatingIndex = 0;

    this._scale = 1;
    this._scaledTime = this._time;
}

/**
 * Sets the scale at which the clock time is passing.
 * Useful for slow-motion or fast-forward effects.
 * 
 * `1` means no time scaling ("realtime"),
 * `2` means the clock time is passing twice as fast,
 * `0.5` means the clock time is passing two times slower than the "actual"
 * time at which the Clock is being updated via `.step`.
 *
 * Initally the clock time is not being scaled (factor `1`).
 * 
 * @method  setScale
 * @chainable
 * 
 * @param {Number} scale    The scale at which the clock time is passing.
 *
 * @return {Clock} this
 */
Clock.prototype.setScale = function setScale (scale) {
    this._scale = scale;
    return this;
};

/**
 * @method  getScale
 * 
 * @return {Number} scale    The scale at which the clock time is passing.
 */
Clock.prototype.getScale = function getScale () {
    return this._scale;
};

/**
 * Updates the internal clock time.
 *
 * @method  step
 * @chainable
 * 
 * @param  {Number} time high resolution timstamp used for invoking the
 *                       `update` method on all registered objects
 * @return {Clock}       this
 */
Clock.prototype.step = function step (time) {
    this._frame++;

    this._scaledTime = this._scaledTime + (time - this._time)*this._scale;
    this._time = time;

    for (var i = 0; i < this._timerQueue.length; i++) {
        if (this._timerQueue[i](this._scaledTime)) {
            this._timerQueue.splice(i, 1);
        }
    }
    return this;
};

/**
 * Returns the internal clock time.
 *
 * @method  now
 * 
 * @return  {Number} time high resolution timstamp used for invoking the
 *                       `update` method on all registered objects
 */
Clock.prototype.now = function now () {
    return this._scaledTime;
};

/**
 * Returns the internal clock time.
 *
 * @method  getTime
 * @deprecated Use #now instead
 * 
 * @return  {Number} time high resolution timstamp used for invoking the
 *                       `update` method on all registered objects
 */
Clock.prototype.getTime = Clock.prototype.now;

/**
 * Returns the number of frames elapsed so far.
 *
 * @method getFrame
 * 
 * @return {Number} frames
 */
Clock.prototype.getFrame = function getFrame () {
    return this._frame;
};

/**
 * Wraps a function to be invoked after a certain amount of time.
 * After a set duration has passed, it executes the function and
 * removes it as a listener to 'prerender'.
 *
 * @method setTimeout
 *
 * @param {Function} callback function to be run after a specified duration
 * @param {Number} delay milliseconds from now to execute the function
 *
 * @return {Function} timer function used for Clock#clearTimer
 */
Clock.prototype.setTimeout = function (callback, delay) {
    var params = Array.prototype.slice.call(arguments, 2);
    var startedAt = this._time;
    var timer = function(time) {
        if (time - startedAt >= delay) {
            callback.apply(null, params);
            return true;
        }
        return false;
    };
    this._timerQueue.push(timer);
    return timer;
};


/**
 * Wraps a function to be invoked after a certain amount of time.
 *  After a set duration has passed, it executes the function and
 *  resets the execution time.
 *
 * @method setInterval
 *
 * @param {Function} callback function to be run after a specified duration
 * @param {Number} delay interval to execute function in milliseconds
 *
 * @return {Function} timer function used for Clock#clearTimer
 */
Clock.prototype.setInterval = function setInterval(callback, delay) {
    var params = Array.prototype.slice.call(arguments, 2);
    var startedAt = this._time;
    var timer = function(time) {
        if (time - startedAt >= delay) {
            callback.apply(null, params);
            startedAt = time;
        }
        return false;
    };
    this._timerQueue.push(timer);
    return timer;
};

/**
 * Removes previously via `Clock#setTimeout` or `Clock#setInterval`
 * registered callback function
 *
 * @method clearTimer
 * @chainable
 * 
 * @param  {Function} timer  previously by `Clock#setTimeout` or
 *                              `Clock#setInterval` returned callback function
 * @return {Clock}              this
 */
Clock.prototype.clearTimer = function (timer) {
    var index = this._timerQueue.indexOf(timer);
    if (index !== -1) {
        this._timerQueue.splice(index, 1);
    }
    return this;
};

module.exports = Clock;


},{}],4:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/*jshint -W079 */

'use strict';

// TODO: Dispatch should be generalized so that it can work on any Node
// not just Contexts.

var Event = require('./Event');

/**
 * The Dispatch class is used to propogate events down the
 * scene graph.
 *
 * @class Dispatch
 * @param {Scene} context The context on which it operates
 * @constructor
 */
function Dispatch (context) {

    if (!context) throw new Error('Dispatch needs to be instantiated on a node');

    this._context = context; // A reference to the context
                             // on which the dispatcher
                             // operates

    this._queue = []; // The queue is used for two purposes
                      // 1. It is used to list indicies in the
                      //    Nodes path which are then used to lookup
                      //    a node in the scene graph.
                      // 2. It is used to assist dispatching
                      //    such that it is possible to do a breadth first
                      //    traversal of the scene graph.
}

/**
 * lookupNode takes a path and returns the node at the location specified
 * by the path, if one exists. If not, it returns undefined.
 *
 * @param {String} location The location of the node specified by its path
 *
 * @return {Node | undefined} The node at the requested path
 */
Dispatch.prototype.lookupNode = function lookupNode (location) {
    if (!location) throw new Error('lookupNode must be called with a path');

    var path = this._queue;

    _splitTo(location, path);

    if (path[0] !== this._context.getSelector()) return void 0;

    var children = this._context.getChildren();
    var child;
    var i = 1;
    path[0] = this._context;

    while (i < path.length) {
        child = children[path[i]];
        path[i] = child;
        if (child) children = child.getChildren();
        else return void 0;
        i++;
    }

    return child;
};

/**
 * dispatch takes an event name and a payload and dispatches it to the
 * entire scene graph below the node that the dispatcher is on. The nodes
 * receive the events in a breadth first traversal, meaning that parents
 * have the opportunity to react to the event before children.
 *
 * @param {String} event name of the event
 * @param {Any} payload the event payload
 *
 * @return {undefined} undefined
 */
Dispatch.prototype.dispatch = function dispatch (event, payload) {
    if (!event) throw new Error('dispatch requires an event name as it\'s first argument');

    var queue = this._queue;
    var item;
    var i;
    var len;
    var children;

    queue.length = 0;
    queue.push(this._context);

    while (queue.length) {
        item = queue.shift();
        if (item.onReceive) item.onReceive(event, payload);
        children = item.getChildren();
        for (i = 0, len = children.length ; i < len ; i++) queue.push(children[i]);
    }
};

/**
 * dispatchUIevent takes a path, an event name, and a payload and dispatches them in
 * a manner anologous to DOM bubbling. It first traverses down to the node specified at
 * the path. That node receives the event first, and then every ancestor receives the event
 * until the context.
 *
 * @param {String} path the path of the node
 * @param {String} event the event name
 * @param {Any} payload the payload
 *
 * @return {undefined} undefined
 */
Dispatch.prototype.dispatchUIEvent = function dispatchUIEvent (path, event, payload) {
    if (!path) throw new Error('dispatchUIEvent needs a valid path to dispatch to');
    if (!event) throw new Error('dispatchUIEvent needs an event name as its second argument');

    var queue = this._queue;
    var node;

    Event.call(payload);
    payload.node = this.lookupNode(path); // After this call, the path is loaded into the queue
                                          // (lookUp node doesn't clear the queue after the lookup)

    while (queue.length) {
        node = queue.pop(); // pop nodes off of the queue to move up the ancestor chain.
        if (node.onReceive) node.onReceive(event, payload);
        if (payload.propagationStopped) break;
    }
};

/**
 * _splitTo is a private method which takes a path and splits it at every '/'
 * pushing the result into the supplied array. This is a destructive change.
 *
 * @private
 * @param {String} string the specified path
 * @param {Array} target the array to which the result should be written
 *
 * @return {Array} the target after having been written to
 */
function _splitTo (string, target) {
    target.length = 0; // clears the array first.
    var last = 0;
    var i;
    var len = string.length;

    for (i = 0 ; i < len ; i++) {
        if (string[i] === '/') {
            target.push(string.substring(last, i));
            last = i + 1;
        }
    }

    if (i - last > 0) target.push(string.substring(last, i));

    return target;
}

module.exports = Dispatch;

},{"./Event":5}],5:[function(require,module,exports){
/**
 * The MIT License (MIT)
 * 
 * Copyright (c) 2015 Famous Industries Inc.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * The Event class adds the stopPropagation functionality
 * to the UIEvents within the scene graph.
 *
 * @constructor Event
 */
function Event () {
    this.propagationStopped = false;
    this.stopPropagation = stopPropagation;
}

/**
 * stopPropagation ends the bubbling of the event in the
 * scene graph.
 *
 * @method stopPropagation
 *
 * @return {undefined} undefined
 */
function stopPropagation () {
    this.propagationStopped = true;
}

module.exports = Event;


},{}],6:[function(require,module,exports){
/**
 * The MIT License (MIT)
 * 
 * Copyright (c) 2015 Famous Industries Inc.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var Clock = require('./Clock');
var Scene = require('./Scene');
var Channel = require('./Channel');
var UIManager = require('../renderers/UIManager');
var Compositor = require('../renderers/Compositor');
var RequestAnimationFrameLoop = require('../render-loops/RequestAnimationFrameLoop');

var ENGINE_START = ['ENGINE', 'START'];
var ENGINE_STOP = ['ENGINE', 'STOP'];
var TIME_UPDATE = ['TIME', null];

/**
 * Famous has two responsibilities, one to act as the highest level
 * updater and another to send messages over to the renderers. It is
 * a singleton.
 *
 * @class FamousEngine
 * @constructor
 */
function FamousEngine() {
    this._updateQueue = []; // The updateQueue is a place where nodes
                            // can place themselves in order to be
                            // updated on the frame.

    this._nextUpdateQueue = []; // the nextUpdateQueue is used to queue
                                // updates for the next tick.
                                // this prevents infinite loops where during
                                // an update a node continuously puts itself
                                // back in the update queue.

    this._scenes = {}; // a hash of all of the scenes's that the FamousEngine
                         // is responsible for.

    this._messages = TIME_UPDATE;   // a queue of all of the draw commands to
                                    // send to the the renderers this frame.

    this._inUpdate = false; // when the famous is updating this is true.
                            // all requests for updates will get put in the
                            // nextUpdateQueue

    this._clock = new Clock(); // a clock to keep track of time for the scene
                               // graph.

    this._channel = new Channel();
    this._channel.onMessage = this.handleMessage.bind(this);
}


/**
 * An init script that initializes the FamousEngine with options
 * or default parameters.
 *
 * @method
 *
 * @param {Object} options a set of options containing a compositor and a render loop
 *
 * @return {FamousEngine} this
 */
FamousEngine.prototype.init = function init(options) {
    this.compositor = options && options.compositor || new Compositor();
    this.renderLoop = options && options.renderLoop || new RequestAnimationFrameLoop();
    this.uiManager = new UIManager(this.getChannel(), this.compositor, this.renderLoop);
    return this;
};

/**
 * Sets the channel that the engine will use to communicate to
 * the renderers.
 *
 * @method
 *
 * @param {Channel} channel     The channel to be used for communicating with
 *                              the `UIManager`/ `Compositor`.
 *
 * @return {FamousEngine} this
 */
FamousEngine.prototype.setChannel = function setChannel(channel) {
    this._channel = channel;
    return this;
};

/**
 * Returns the channel that the engine is currently using
 * to communicate with the renderers.
 *
 * @method
 *
 * @return {Channel} channel    The channel to be used for communicating with
 *                              the `UIManager`/ `Compositor`.
 */
FamousEngine.prototype.getChannel = function getChannel () {
    return this._channel;
};

/**
 * _update is the body of the update loop. The frame consists of
 * pulling in appending the nextUpdateQueue to the currentUpdate queue
 * then moving through the updateQueue and calling onUpdate with the current
 * time on all nodes. While _update is called _inUpdate is set to true and
 * all requests to be placed in the update queue will be forwarded to the
 * nextUpdateQueue.
 *
 * @method
 *
 * @return {undefined} undefined
 */
FamousEngine.prototype._update = function _update () {
    this._inUpdate = true;
    var time = this._clock.now();
    var nextQueue = this._nextUpdateQueue;
    var queue = this._updateQueue;
    var item;

    this._messages[1] = time;

    while (nextQueue.length) queue.unshift(nextQueue.pop());

    while (queue.length) {
        item = queue.shift();
        if (item && item.onUpdate) item.onUpdate(time);
    }

    this._inUpdate = false;
};

/**
 * requestUpdates takes a class that has an onUpdate method and puts it
 * into the updateQueue to be updated at the next frame.
 * If FamousEngine is currently in an update, requestUpdate
 * passes its argument to requestUpdateOnNextTick.
 *
 * @method
 *
 * @param {Object} requester an object with an onUpdate method
 *
 * @return {undefined} undefined
 */
FamousEngine.prototype.requestUpdate = function requestUpdate (requester) {
    if (!requester)
        throw new Error(
            'requestUpdate must be called with a class to be updated'
        );

    if (this._inUpdate) this.requestUpdateOnNextTick(requester);
    else this._updateQueue.push(requester);
};

/**
 * requestUpdateOnNextTick is requests an update on the next frame.
 * If FamousEngine is not currently in an update than it is functionally equivalent
 * to requestUpdate. This method should be used to prevent infinite loops where
 * a class is updated on the frame but needs to be updated again next frame.
 *
 * @method
 *
 * @param {Object} requester an object with an onUpdate method
 *
 * @return {undefined} undefined
 */
FamousEngine.prototype.requestUpdateOnNextTick = function requestUpdateOnNextTick (requester) {
    this._nextUpdateQueue.push(requester);
};

/**
 * postMessage sends a message queue into FamousEngine to be processed.
 * These messages will be interpreted and sent into the scene graph
 * as events if necessary.
 *
 * @method
 *
 * @param {Array} messages an array of commands.
 *
 * @return {FamousEngine} this
 */
FamousEngine.prototype.handleMessage = function handleMessage (messages) {
    if (!messages)
        throw new Error(
            'onMessage must be called with an array of messages'
        );

    var command;

    while (messages.length > 0) {
        command = messages.shift();
        switch (command) {
            case 'WITH':
                this.handleWith(messages);
                break;
            case 'FRAME':
                this.handleFrame(messages);
                break;
            default:
                throw new Error('received unknown command: ' + command);
        }
    }
    return this;
};

/**
 * handleWith is a method that takes an array of messages following the
 * WITH command. It'll then issue the next commands to the path specified
 * by the WITH command.
 *
 * @method
 *
 * @param {Array} messages array of messages.
 *
 * @return {FamousEngine} this
 */
FamousEngine.prototype.handleWith = function handleWith (messages) {
    var path = messages.shift();
    var command = messages.shift();

    switch (command) {
        case 'TRIGGER': // the TRIGGER command sends a UIEvent to the specified path
            var type = messages.shift();
            var ev = messages.shift();

            this.getContext(path).getDispatch().dispatchUIEvent(path, type, ev);
            break;
        default:
            throw new Error('received unknown command: ' + command);
    }
    return this;
};

/**
 * handleFrame is called when the renderers issue a FRAME command to
 * FamousEngine. FamousEngine will then step updating the scene graph to the current time.
 *
 * @method
 *
 * @param {Array} messages array of messages.
 *
 * @return {FamousEngine} this
 */
FamousEngine.prototype.handleFrame = function handleFrame (messages) {
    if (!messages) throw new Error('handleFrame must be called with an array of messages');
    if (!messages.length) throw new Error('FRAME must be sent with a time');

    this.step(messages.shift());
    return this;
};

/**
 * step updates the clock and the scene graph and then sends the draw commands
 * that accumulated in the update to the renderers.
 *
 * @method
 *
 * @param {Number} time current engine time
 *
 * @return {FamousEngine} this
 */
FamousEngine.prototype.step = function step (time) {
    if (time == null) throw new Error('step must be called with a time');

    this._clock.step(time);
    this._update();

    if (this._messages.length) {
        this._channel.sendMessage(this._messages);
        this._messages.length = 2;
    }

    return this;
};

/**
 * returns the context of a particular path. The context is looked up by the selector
 * portion of the path and is listed from the start of the string to the first
 * '/'.
 *
 * @method
 *
 * @param {String} selector the path to look up the context for.
 *
 * @return {Context | Undefined} the context if found, else undefined.
 */
FamousEngine.prototype.getContext = function getContext (selector) {
    if (!selector) throw new Error('getContext must be called with a selector');

    var index = selector.indexOf('/');
    selector = index === -1 ? selector : selector.substring(0, index);

    return this._scenes[selector];
};

/**
 * returns the instance of clock within famous.
 *
 * @method
 *
 * @return {Clock} FamousEngine's clock
 */
FamousEngine.prototype.getClock = function getClock () {
    return this._clock;
};

/**
 * queues a message to be transfered to the renderers.
 *
 * @method
 *
 * @param {Any} command Draw Command
 *
 * @return {FamousEngine} this
 */
FamousEngine.prototype.message = function message (command) {
    this._messages.push(command);
    return this;
};

/**
 * Creates a scene under which a scene graph could be built.
 *
 * @method
 *
 * @param {String} selector a dom selector for where the scene should be placed
 *
 * @return {Scene} a new instance of Scene.
 */
FamousEngine.prototype.createScene = function createScene (selector) {
    selector = selector || 'body';

    if (this._scenes[selector]) this._scenes[selector].dismount();
    this._scenes[selector] = new Scene(selector, this);
    return this._scenes[selector];
};

/**
 * Starts the engine running in the Main-Thread.
 * This effects **every** updateable managed by the Engine.
 *
 * @method
 *
 * @return {FamousEngine} this
 */
FamousEngine.prototype.startEngine = function startEngine () {
    this._channel.sendMessage(ENGINE_START);
    return this;
};

/**
 * Stops the engine running in the Main-Thread.
 * This effects **every** updateable managed by the Engine.
 *
 * @method
 *
 * @return {FamousEngine} this
 */
FamousEngine.prototype.stopEngine = function stopEngine () {
    this._channel.sendMessage(ENGINE_STOP);
    return this;
};

module.exports = new FamousEngine();

},{"../render-loops/RequestAnimationFrameLoop":30,"../renderers/Compositor":31,"../renderers/UIManager":33,"./Channel":2,"./Clock":3,"./Scene":8}],7:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/*jshint -W079 */

'use strict';

var Transform = require('./Transform');
var Size = require('./Size');

var TRANSFORM_PROCESSOR = new Transform();
var SIZE_PROCESSOR = new Size();

var IDENT = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
];

var ONES = [1, 1, 1];
var QUAT = [0, 0, 0, 1];

/**
 * Nodes define hierarchy and geometrical transformations. They can be moved
 * (translated), scaled and rotated.
 *
 * A Node is either mounted or unmounted. Unmounted nodes are detached from the
 * scene graph. Unmounted nodes have no parent node, while each mounted node has
 * exactly one parent. Nodes have an arbitary number of children, which can be
 * dynamically added using @{@link addChild}.
 *
 * Each Nodes have an arbitrary number of `components`. Those components can
 * send `draw` commands to the renderer or mutate the node itself, in which case
 * they define behavior in the most explicit way. Components that send `draw`
 * commands aare considered `renderables`. From the node's perspective, there is
 * no distinction between nodes that send draw commands and nodes that define
 * behavior.
 *
 * Because of the fact that Nodes themself are very unopinioted (they don't
 * "render" to anything), they are often being subclassed in order to add e.g.
 * components at initialization to them. Because of this flexibility, they might
 * as well have been called `Entities`.
 *
 * @example
 * // create three detached (unmounted) nodes
 * var parent = new Node();
 * var child1 = new Node();
 * var child2 = new Node();
 *
 * // build an unmounted subtree (parent is still detached)
 * parent.addChild(child1);
 * parent.addChild(child2);
 *
 * // mount parent by adding it to the context
 * var context = Famous.createContext("body");
 * context.addChild(parent);
 *
 * @class Node
 * @constructor
 */
function Node () {
    this._calculatedValues = {
        transform: new Float32Array(IDENT),
        size: new Float32Array(3)
    };

    this._requestingUpdate = false;
    this._inUpdate = false;

    this._updateQueue = [];
    this._nextUpdateQueue = [];

    this._freedComponentIndicies = [];
    this._components = [];

    this._freedChildIndicies = [];
    this._children = [];

    this._parent = null;
    this._globalUpdater = null;

    this._lastEulerX = 0;
    this._lastEulerY = 0;
    this._lastEulerZ = 0;
    this._lastEuler = false;

    this.value = new Node.Spec();
}

Node.RELATIVE_SIZE = Size.RELATIVE;
Node.ABSOLUTE_SIZE = Size.ABSOLUTE;
Node.RENDER_SIZE = Size.RENDER;
Node.DEFAULT_SIZE = Size.DEFAULT;

/**
 * A Node spec holds the "data" associated with a Node.
 *
 * @class Spec
 * @constructor
 *
 * @property {String} location path to the node (e.g. "body/0/1")
 * @property {Object} showState
 * @property {Boolean} showState.mounted
 * @property {Boolean} showState.shown
 * @property {Number} showState.opacity
 * @property {Object} offsets
 * @property {Float32Array.<Number>} offsets.mountPoint
 * @property {Float32Array.<Number>} offsets.align
 * @property {Float32Array.<Number>} offsets.origin
 * @property {Object} vectors
 * @property {Float32Array.<Number>} vectors.position
 * @property {Float32Array.<Number>} vectors.rotation
 * @property {Float32Array.<Number>} vectors.scale
 * @property {Object} size
 * @property {Float32Array.<Number>} size.sizeMode
 * @property {Float32Array.<Number>} size.proportional
 * @property {Float32Array.<Number>} size.differential
 * @property {Float32Array.<Number>} size.absolute
 * @property {Float32Array.<Number>} size.render
 */
Node.Spec = function Spec () {
    this.location = null;
    this.showState = {
        mounted: false,
        shown: false,
        opacity: 1
    };
    this.offsets = {
        mountPoint: new Float32Array(3),
        align: new Float32Array(3),
        origin: new Float32Array(3)
    };
    this.vectors = {
        position: new Float32Array(3),
        rotation: new Float32Array(QUAT),
        scale: new Float32Array(ONES)
    };
    this.size = {
        sizeMode: new Float32Array([Size.RELATIVE, Size.RELATIVE, Size.RELATIVE]),
        proportional: new Float32Array(ONES),
        differential: new Float32Array(3),
        absolute: new Float32Array(3),
        render: new Float32Array(3)
    };
    this.UIEvents = [];
};

/**
 * Determine the node's location in the scene graph hierarchy.
 * A location of `body/0/1` can be interpreted as the following scene graph
 * hierarchy (ignoring siblings of ancestors and additional child nodes):
 *
 * `Context:body` -> `Node:0` -> `Node:1`, where `Node:1` is the node the
 * `getLocation` method has been invoked on.
 *
 * @method getLocation
 *
 * @return {String} location (path), e.g. `body/0/1`
 */
Node.prototype.getLocation = function getLocation () {
    return this.value.location;
};

/**
 * @alias getId
 *
 * @return {String} the path of the Node
 */
Node.prototype.getId = Node.prototype.getLocation;

/**
 * Globally dispatches the event using the Scene's Dispatch. All nodes will
 * receive the dispatched event.
 *
 * @method emit
 *
 * @param  {String} event   Event type.
 * @param  {Object} payload Event object to be dispatched.
 *
 * @return {Node} this
 */
Node.prototype.emit = function emit (event, payload) {
    var current = this;

    while (current !== current.getParent()) {
        current = current.getParent();
    }

    current.getDispatch().dispatch(event, payload);
    return this;
};

// THIS WILL BE DEPRICATED
Node.prototype.sendDrawCommand = function sendDrawCommand (message) {
    this._globalUpdater.message(message);
    return this;
};

/**
 * Recursively serializes the Node, including all previously added components.
 *
 * @method getValue
 *
 * @return {Object}     Serialized representation of the node, including
 *                      components.
 */
Node.prototype.getValue = function getValue () {
    var numberOfChildren = this._children.length;
    var numberOfComponents = this._components.length;
    var i = 0;

    var value = {
        location: this.value.location,
        spec: this.value,
        components: new Array(numberOfComponents),
        children: new Array(numberOfChildren)
    };

    for (; i < numberOfChildren ; i++)
        if (this._children[i] && this._children[i].getValue)
            value.children[i] = this._children[i].getValue();

    for (i = 0 ; i < numberOfComponents ; i++)
        if (this._components[i] && this._components[i].getValue)
            value.components[i] = this._components[i].getValue();

    return value;
};

/**
 * Similar to @{@link getValue}, but returns the actual "computed" value. E.g.
 * a proportional size of 0.5 might resolve into a "computed" size of 200px
 * (assuming the parent has a width of 400px).
 *
 * @method getComputedValue
 *
 * @return {Object}     Serialized representation of the node, including
 *                      children, excluding components.
 */
Node.prototype.getComputedValue = function getComputedValue () {
    var numberOfChildren = this._children.length;

    var value = {
        location: this.value.location,
        computedValues: this._calculatedValues,
        children: new Array(numberOfChildren)
    };

    for (var i = 0 ; i < numberOfChildren ; i++)
        value.children[i] = this._children[i].getComputedValue();

    return value;
};

/**
 * Retrieves all children of the current node.
 *
 * @method getChildren
 *
 * @return {Array.<Node>}   An array of children.
 */
Node.prototype.getChildren = function getChildren () {
    return this._children;
};

/**
 * Retrieves the parent of the current node. Unmounted nodes do not have a
 * parent node.
 *
 * @method getParent
 *
 * @return {Node}       Parent node.
 */
Node.prototype.getParent = function getParent () {
    return this._parent;
};

/**
 * Schedules the @{@link update} function of the node to be invoked on the next
 * frame (if no update during this frame has been scheduled already).
 * If the node is currently being updated (which means one of the requesters
 * invoked requestsUpdate while being updated itself), an update will be
 * scheduled on the next frame.
 *
 * @method requestUpdate
 *
 * @param  {Object} requester   If the requester has an `onUpdate` method, it
 *                              will be invoked during the next update phase of
 *                              the node.
 *
 * @return {Node} this
 */
Node.prototype.requestUpdate = function requestUpdate (requester) {
    if (this._inUpdate || !this.isMounted())
        return this.requestUpdateOnNextTick(requester);
    this._updateQueue.push(requester);
    if (!this._requestingUpdate) this._requestUpdate();
    return this;
};

/**
 * Schedules an update on the next tick. Similarily to @{@link requestUpdate},
 * `requestUpdateOnNextTick` schedules the node's `onUpdate` function to be
 * invoked on the frame after the next invocation on the node's onUpdate function.
 *
 * @method requestUpdateOnNextTick
 *
 * @param  {Object} requester   If the requester has an `onUpdate` method, it
 *                              will be invoked during the next update phase of
 *                              the node.
 *
 * @return {Node} this
 */
Node.prototype.requestUpdateOnNextTick = function requestUpdateOnNextTick (requester) {
    this._nextUpdateQueue.push(requester);
    return this;
};

/**
 * Get the object responsible for updating this node.
 *
 * @method
 *
 * @return {Object} The global updater.
 */
Node.prototype.getUpdater = function getUpdater () {
    return this._globalUpdater;
};

/**
 * Checks if the node is mounted. Unmounted nodes are detached from the scene
 * graph.
 *
 * @method isMounted
 *
 * @return {Boolean}    Boolean indicating weather the node is mounted or not.
 */
Node.prototype.isMounted = function isMounted () {
    return this.value.showState.mounted;
};

/**
 * Checks if the node is visible ("shown").
 *
 * @method isShown
 *
 * @return {Boolean}    Boolean indicating weather the node is visible
 *                      ("shown") or not.
 */
Node.prototype.isShown = function isShown () {
    return this.value.showState.shown;
};

/**
 * Determines the node's relative opacity.
 * The opacity needs to be within [0, 1], where 0 indicates a completely
 * transparent, therefore invisible node, whereas an opacity of 1 means the
 * node is completely solid.
 *
 * @method getOpacity
 *
 * @return {Number}         Relative opacity of the node.
 */
Node.prototype.getOpacity = function getOpacity () {
    return this.value.showState.opacity;
};

/**
 * Determines the node's previously set mount point.
 *
 * @method getMountPoint
 *
 * @return {Float32Array}   An array representing the mount point.
 */
Node.prototype.getMountPoint = function getMountPoint () {
    return this.value.offsets.mountPoint;
};

/**
 * Determines the node's previously set align.
 *
 * @method getAlign
 *
 * @return {Float32Array}   An array representing the align.
 */
Node.prototype.getAlign = function getAlign () {
    return this.value.offsets.align;
};

/**
 * Determines the node's previously set origin.
 *
 * @method getOrigin
 *
 * @return {Float32Array}   An array representing the origin.
 */
Node.prototype.getOrigin = function getOrigin () {
    return this.value.offsets.origin;
};

/**
 * Determines the node's previously set position.
 *
 * @method getPosition
 *
 * @return {Float32Array}   An array representing the position.
 */
Node.prototype.getPosition = function getPosition () {
    return this.value.vectors.position;
};

/**
 * Returns the node's current rotation
 *
 * @method getRotation
 *
 * @return {Float32Array} an array of four values, showing the rotation as a quaternion
 */
Node.prototype.getRotation = function getRotation () {
    return this.value.vectors.rotation;
};

/**
 * Returns the scale of the node
 *
 * @method
 *
 * @return {Float32Array} an array showing the current scale vector
 */
Node.prototype.getScale = function getScale () {
    return this.value.vectors.scale;
};

/**
 * Returns the current size mode of the node
 *
 * @method
 *
 * @return {Float32Array} an array of numbers showing the current size mode
 */
Node.prototype.getSizeMode = function getSizeMode () {
    return this.value.size.sizeMode;
};

/**
 * Returns the current proportional size
 *
 * @method
 *
 * @return {Float32Array} a vector 3 showing the current proportional size
 */
Node.prototype.getProportionalSize = function getProportionalSize () {
    return this.value.size.proportional;
};

/**
 * Returns the differential size of the node
 *
 * @method
 *
 * @return {Float32Array} a vector 3 showing the current differential size
 */
Node.prototype.getDifferentialSize = function getDifferentialSize () {
    return this.value.size.differential;
};

/**
 * Returns the absolute size of the node
 *
 * @method
 *
 * @return {Float32Array} a vector 3 showing the current absolute size of the node
 */
Node.prototype.getAbsoluteSize = function getAbsoluteSize () {
    return this.value.size.absolute;
};

/**
 * Returns the current Render Size of the node. Note that the render size
 * is asynchronous (will always be one frame behind) and needs to be explicitely
 * calculated by setting the proper size mode.
 *
 * @method
 *
 * @return {Float32Array} a vector 3 showing the current render size
 */
Node.prototype.getRenderSize = function getRenderSize () {
    return this.value.size.render;
};

/**
 * Returns the external size of the node
 *
 * @method
 *
 * @return {Float32Array} a vector 3 of the final calculated side of the node
 */
Node.prototype.getSize = function getSize () {
    return this._calculatedValues.size;
};

/**
 * Returns the current world transform of the node
 *
 * @method
 *
 * @return {Float32Array} a 16 value transform
 */
Node.prototype.getTransform = function getTransform () {
    return this._calculatedValues.transform;
};

/**
 * Get the list of the UI Events that are currently associated with this node
 *
 * @method
 *
 * @return {Array} an array of strings representing the current subscribed UI event of this node
 */
Node.prototype.getUIEvents = function getUIEvents () {
    return this.value.UIEvents;
};

/**
 * Adds a new child to this node. If this method is called with no argument it will
 * create a new node, however it can also be called with an existing node which it will
 * append to the node that this method is being called on. Returns the new or passed in node.
 *
 * @method
 *
 * @param {Node | void} child the node to appended or no node to create a new node.
 *
 * @return {Node} the appended node.
 */
Node.prototype.addChild = function addChild (child) {
    var index = child ? this._children.indexOf(child) : -1;
    child = child ? child : new Node();

    if (index === -1) {
        index = this._freedChildIndicies.length ? this._freedChildIndicies.pop() : this._children.length;
        this._children[index] = child;

        if (this.isMounted() && child.onMount) {
            var myId = this.getId();
            var childId = myId + '/' + index;
            child.onMount(this, childId);
        }

    }

    return child;
};

/**
 * Removes a child node from another node. The passed in node must be
 * a child of the node that this method is called upon.
 *
 * @method
 *
 * @param {Node} child node to be removed
 *
 * @return {Boolean} whether or not the node was successfully removed
 */
Node.prototype.removeChild = function removeChild (child) {
    var index = this._children.indexOf(child);
    var added = index !== -1;
    if (added) {
        this._freedChildIndicies.push(index);

        this._children[index] = null;

        if (this.isMounted() && child.onDismount)
            child.onDismount();
    }
    return added;
};

/**
 * Each component can only be added once per node.
 *
 * @method addComponent
 *
 * @param {Object} component    An component to be added.
 * @return {Number} index       The index at which the component has been
 *                              registered. Indices aren't necessarily
 *                              consecutive.
 */
Node.prototype.addComponent = function addComponent (component) {
    var index = this._components.indexOf(component);
    if (index === -1) {
        index = this._freedComponentIndicies.length ? this._freedComponentIndicies.pop() : this._components.length;
        this._components[index] = component;

        if (this.isMounted() && component.onMount)
            component.onMount(this, index);

        if (this.isShown() && component.onShow)
            component.onShow();
    }

    return index;
};

/**
 * @method  getComponent
 *
 * @param  {Number} index   Index at which the component has been regsitered
 *                          (using `Node#addComponent`).
 * @return {*}              The component registered at the passed in index (if
 *                          any).
 */
Node.prototype.getComponent = function getComponent (index) {
    return this._components[index];
};

/**
 * Removes a previously via @{@link addComponent} added component.
 *
 * @method removeComponent
 *
 * @param  {Object} component   An component that has previously been added
 *                              using @{@link addComponent}.
 *
 * @return {Node} this
 */
Node.prototype.removeComponent = function removeComponent (component) {
    var index = this._components.indexOf(component);
    if (index !== -1) {
        this._freedComponentIndicies.push(index);
        if (this.isShown() && component.onHide)
            component.onHide();

        if (this.isMounted() && component.onDismount)
            component.onDismount();

        this._components[index] = null;
    }
    return component;
};

/**
 * Subscribes a node to a UI Event. All components on the node
 * will have the opportunity to begin listening to that event
 * and alerting the scene graph.
 *
 * @method
 *
 * @param {String} eventName the name of the event
 *
 * @return {undefined} undefined
 */
Node.prototype.addUIEvent = function addUIEvent (eventName) {
    var UIEvents = this.getUIEvents();
    var components = this._components;
    var component;

    var added = UIEvents.indexOf(eventName) !== -1;
    if (!added) {
        UIEvents.push(eventName);
        for (var i = 0, len = components.length ; i < len ; i++) {
            component = components[i];
            if (component && component.onAddUIEvent) component.onAddUIEvent(eventName);
        }
    }
};

/**
 * Private method for the Node to request an update for itself.
 *
 * @method
 * @private
 *
 * @param {Boolean} force whether or not to force the update
 *
 * @return {undefined} undefined
 */
Node.prototype._requestUpdate = function _requestUpdate (force) {
    if (force || (!this._requestingUpdate && this._globalUpdater)) {
        this._globalUpdater.requestUpdate(this);
        this._requestingUpdate = true;
    }
};

/**
 * Private method to set an optional value in an array, and
 * request an update if this changes the value of the array.
 *
 * @method
 *
 * @param {Array} vec the array to insert the value into
 * @param {Number} index the index at which to insert the value
 * @param {Any} val the value to potentially insert (if not null or undefined)
 *
 * @return {Boolean} whether or not a new value was inserted.
 */
Node.prototype._vecOptionalSet = function _vecOptionalSet (vec, index, val) {
    if (val != null && vec[index] !== val) {
        vec[index] = val;
        if (!this._requestingUpdate) this._requestUpdate();
        return true;
    }
    return false;
};

/**
 * Shows the node, which is to say, calls onShow on all of the
 * node's components. Renderable components can then issue the
 * draw commands necessary to be shown.
 *
 * @method
 *
 * @return {Node} this
 */
Node.prototype.show = function show () {
    var i = 0;
    var items = this._components;
    var len = items.length;
    var item;

    this.value.showState.shown = true;

    for (; i < len ; i++) {
        item = items[i];
        if (item && item.onShow) item.onShow();
    }

    i = 0;
    items = this._children;
    len = items.length;

    for (; i < len ; i++) {
        item = items[i];
        if (item && item.onParentShow) item.onParentShow();
    }
    return this;
};

/**
 * Hides the node, which is to say, calls onHide on all of the
 * node's components. Renderable components can then issue
 * the draw commands necessary to be hidden
 *
 * @method
 *
 * @return {Node} this
 */
Node.prototype.hide = function hide () {
    var i = 0;
    var items = this._components;
    var len = items.length;
    var item;

    this.value.showState.shown = false;

    for (; i < len ; i++) {
        item = items[i];
        if (item && item.onHide) item.onHide();
    }

    i = 0;
    items = this._children;
    len = items.length;

    for (; i < len ; i++) {
        item = items[i];
        if (item && item.onParentHide) item.onParentHide();
    }
    return this;
};

/**
 * Sets the align value of the node. Will call onAlignChange
 * on all of the Node's components.
 *
 * @method
 *
 * @param {Number} x Align value in the x dimension.
 * @param {Number} y Align value in the y dimension.
 * @param {Number} z Align value in the z dimension.
 *
 * @return {Node} this
 */
Node.prototype.setAlign = function setAlign (x, y, z) {
    var vec3 = this.value.offsets.align;
    var propogate = false;

    propogate = this._vecOptionalSet(vec3, 0, x) || propogate;
    propogate = this._vecOptionalSet(vec3, 1, y) || propogate;
    if (z != null) propogate = this._vecOptionalSet(vec3, 2, (z - 0.5)) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = vec3[0];
        y = vec3[1];
        z = vec3[2];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onAlignChange) item.onAlignChange(x, y, z);
        }
    }
    return this;
};

/**
 * Sets the mount point value of the node. Will call onMountPointChange
 * on all of the node's components.
 *
 * @method
 *
 * @param {Number} x MountPoint value in x dimension
 * @param {Number} y MountPoint value in y dimension
 * @param {Number} z MountPoint value in z dimension
 *
 * @return {Node} this
 */
Node.prototype.setMountPoint = function setMountPoint (x, y, z) {
    var vec3 = this.value.offsets.mountPoint;
    var propogate = false;

    propogate = this._vecOptionalSet(vec3, 0, x) || propogate;
    propogate = this._vecOptionalSet(vec3, 1, y) || propogate;
    if (z != null) propogate = this._vecOptionalSet(vec3, 2, (z - 0.5)) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = vec3[0];
        y = vec3[1];
        z = vec3[2];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onMountPointChange) item.onMountPointChange(x, y, z);
        }
    }
    return this;
};

/**
 * Sets the origin value of the node. Will call onOriginChange
 * on all of the node's components.
 *
 * @method
 *
 * @param {Number} x Origin value in x dimension
 * @param {Number} y Origin value in y dimension
 * @param {Number} z Origin value in z dimension
 *
 * @return {Node} this
 */
Node.prototype.setOrigin = function setOrigin (x, y, z) {
    var vec3 = this.value.offsets.origin;
    var propogate = false;

    propogate = this._vecOptionalSet(vec3, 0, x) || propogate;
    propogate = this._vecOptionalSet(vec3, 1, y) || propogate;
    if (z != null) propogate = this._vecOptionalSet(vec3, 2, (z - 0.5)) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = vec3[0];
        y = vec3[1];
        z = vec3[2];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onOriginChange) item.onOriginChange(x, y, z);
        }
    }
    return this;
};

/**
 * Sets the position of the node. Will call onPositionChange
 * on all of the node's components.
 *
 * @method
 *
 * @param {Number} x Position in x
 * @param {Number} y Position in y
 * @param {Number} z Position in z
 *
 * @return {Node} this
 */
Node.prototype.setPosition = function setPosition (x, y, z) {
    var vec3 = this.value.vectors.position;
    var propogate = false;

    propogate = this._vecOptionalSet(vec3, 0, x) || propogate;
    propogate = this._vecOptionalSet(vec3, 1, y) || propogate;
    propogate = this._vecOptionalSet(vec3, 2, z) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = vec3[0];
        y = vec3[1];
        z = vec3[2];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onPositionChange) item.onPositionChange(x, y, z);
        }
    }

    return this;
};

/**
 * Sets the rotation of the node. Will call onRotationChange
 * on all of the node's components. This method takes either
 * Euler angles or a quaternion. If the fourth argument is undefined
 * Euler angles are assumed.
 *
 * @method
 *
 * @param {Number} x Either the rotation around the x axis or the magnitude in x of the axis of rotation.
 * @param {Number} y Either the rotation around the y axis or the magnitude in y of the axis of rotation.
 * @param {Number} z Either the rotation around the z axis or the magnitude in z of the axis of rotation.
 * @param {Number|undefined} w the amount of rotation around the axis of rotation, if a quaternion is specified.
 *
 * @return {undefined} undefined
 */
Node.prototype.setRotation = function setRotation (x, y, z, w) {
    var quat = this.value.vectors.rotation;
    var propogate = false;
    var qx, qy, qz, qw;

    if (w != null) {
        qx = x;
        qy = y;
        qz = z;
        qw = w;
        this._lastEulerX = null;
        this._lastEulerY = null;
        this._lastEulerZ = null;
        this._lastEuler = false;
    }
    else {
        if (x == null || y == null || z == null) {
            if (this._lastEuler) {
                x = x == null ? this._lastEulerX : x;
                y = y == null ? this._lastEulerY : y;
                z = z == null ? this._lastEulerZ : z;
            }
            else {
                var sp = -2 * (quat[1] * quat[2] - quat[3] * quat[0]);

                if (Math.abs(sp) > 0.99999) {
                    y = y == null ? Math.PI * 0.5 * sp : y;
                    x = x == null ? Math.atan2(-quat[0] * quat[2] + quat[3] * quat[1], 0.5 - quat[1] * quat[1] - quat[2] * quat[2]) : x;
                    z = z == null ? 0 : z;
                }
                else {
                    y = y == null ? Math.asin(sp) : y;
                    x = x == null ? Math.atan2(quat[0] * quat[2] + quat[3] * quat[1], 0.5 - quat[0] * quat[0] - quat[1] * quat[1]) : x;
                    z = z == null ? Math.atan2(quat[0] * quat[1] + quat[3] * quat[2], 0.5 - quat[0] * quat[0] - quat[2] * quat[2]) : z;
                }
            }
        }

        var hx = x * 0.5;
        var hy = y * 0.5;
        var hz = z * 0.5;

        var sx = Math.sin(hx);
        var sy = Math.sin(hy);
        var sz = Math.sin(hz);
        var cx = Math.cos(hx);
        var cy = Math.cos(hy);
        var cz = Math.cos(hz);

        var sysz = sy * sz;
        var cysz = cy * sz;
        var sycz = sy * cz;
        var cycz = cy * cz;

        qx = sx * cycz + cx * sysz;
        qy = cx * sycz - sx * cysz;
        qz = cx * cysz + sx * sycz;
        qw = cx * cycz - sx * sysz;

        this._lastEuler = true;
        this._lastEulerX = x;
        this._lastEulerY = y;
        this._lastEulerZ = z;
    }

    propogate = this._vecOptionalSet(quat, 0, qx) || propogate;
    propogate = this._vecOptionalSet(quat, 1, qy) || propogate;
    propogate = this._vecOptionalSet(quat, 2, qz) || propogate;
    propogate = this._vecOptionalSet(quat, 3, qw) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = quat[0];
        y = quat[1];
        z = quat[2];
        w = quat[3];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onRotationChange) item.onRotationChange(x, y, z, w);
        }
    }
    return this;
};

/**
 * Sets the scale of the node. The default value is 1 in all dimensions.
 * The node's components will have onScaleChanged called on them.
 *
 * @method
 *
 * @param {Number} x Scale value in x
 * @param {Number} y Scale value in y
 * @param {Number} z Scale value in z
 *
 * @return {Node} this
 */
Node.prototype.setScale = function setScale (x, y, z) {
    var vec3 = this.value.vectors.scale;
    var propogate = false;

    propogate = this._vecOptionalSet(vec3, 0, x) || propogate;
    propogate = this._vecOptionalSet(vec3, 1, y) || propogate;
    propogate = this._vecOptionalSet(vec3, 2, z) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = vec3[0];
        y = vec3[1];
        z = vec3[2];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onScaleChange) item.onScaleChange(x, y, z);
        }
    }
    return this;
};

/**
 * Sets the value of the opacity of this node. All of the node's
 * components will have onOpacityChange called on them/
 *
 * @method
 *
 * @param {Number} val Value of the opacity. 1 is the default.
 *
 * @return {Node} this
 */
Node.prototype.setOpacity = function setOpacity (val) {
    if (val !== this.value.showState.opacity) {
        this.value.showState.opacity = val;
        if (!this._requestingUpdate) this._requestUpdate();

        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onOpacityChange) item.onOpacityChange(val);
        }
    }
    return this;
};

/**
 * Sets the size mode being used for determining the nodes final width, height
 * and depth.
 * Size modes are a way to define the way the node's size is being calculated.
 * Size modes are enums set on the @{@link Size} constructor (and aliased on
 * the Node).
 *
 * @example
 * node.setSizeMode(Node.RELATIVE_SIZE, Node.ABSOLUTE_SIZE, Node.ABSOLUTE_SIZE);
 * // Instead of null, any proporional height or depth can be passed in, since
 * // it would be ignored in any case.
 * node.setProportionalSize(0.5, null, null);
 * node.setAbsoluteSize(null, 100, 200);
 *
 * @method setSizeMode
 *
 * @param {SizeMode} x    The size mode being used for determining the size in
 *                        x direction ("width").
 * @param {SizeMode} y    The size mode being used for determining the size in
 *                        y direction ("height").
 * @param {SizeMode} z    The size mode being used for determining the size in
 *                        z direction ("depth").
 *
 * @return {Node} this
 */
Node.prototype.setSizeMode = function setSizeMode (x, y, z) {
    var vec3 = this.value.size.sizeMode;
    var propogate = false;

    if (x != null) propogate = this._resolveSizeMode(vec3, 0, x) || propogate;
    if (y != null) propogate = this._resolveSizeMode(vec3, 1, y) || propogate;
    if (z != null) propogate = this._resolveSizeMode(vec3, 2, z) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = vec3[0];
        y = vec3[1];
        z = vec3[2];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onSizeModeChange) item.onSizeModeChange(x, y, z);
        }
    }
    return this;
};

/**
 * A protected method that resolves string representations of size mode
 * to numeric values and applies them.
 *
 * @method
 *
 * @param {Array} vec the array to write size mode to
 * @param {Number} index the index to write to in the array
 * @param {String|Number} val the value to write
 *
 * @return {Bool} whether or not the sizemode has been changed for this index.
 */
Node.prototype._resolveSizeMode = function _resolveSizeMode (vec, index, val) {
    if (val.constructor === String) {
        switch (val.toLowerCase()) {
            case 'relative':
            case 'default':
                return this._vecOptionalSet(vec, index, 0);
            case 'absolute':
                return this._vecOptionalSet(vec, index, 1);
            case 'render':
                return this._vecOptionalSet(vec, index, 2);
            default: throw new Error('unknown size mode: ' + val);
        }
    }
    else return this._vecOptionalSet(vec, index, val);
};

/**
 * A proportional size defines the node's dimensions relative to its parents
 * final size.
 * Proportional sizes need to be within the range of [0, 1].
 *
 * @method setProportionalSize
 *
 * @param {Number} x    x-Size in pixels ("width").
 * @param {Number} y    y-Size in pixels ("height").
 * @param {Number} z    z-Size in pixels ("depth").
 *
 * @return {Node} this
 */
Node.prototype.setProportionalSize = function setProportionalSize (x, y, z) {
    var vec3 = this.value.size.proportional;
    var propogate = false;

    propogate = this._vecOptionalSet(vec3, 0, x) || propogate;
    propogate = this._vecOptionalSet(vec3, 1, y) || propogate;
    propogate = this._vecOptionalSet(vec3, 2, z) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = vec3[0];
        y = vec3[1];
        z = vec3[2];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onProportionalSizeChange) item.onProportionalSizeChange(x, y, z);
        }
    }
    return this;
};

/**
 * Differential sizing can be used to add or subtract an absolute size from a
 * otherwise proportionally sized node.
 * E.g. a differential width of `-10` and a proportional width of `0.5` is
 * being interpreted as setting the node's size to 50% of its parent's width
 * *minus* 10 pixels.
 *
 * @method setDifferentialSize
 *
 * @param {Number} x    x-Size to be added to the relatively sized node in
 *                      pixels ("width").
 * @param {Number} y    y-Size to be added to the relatively sized node in
 *                      pixels ("height").
 * @param {Number} z    z-Size to be added to the relatively sized node in
 *                      pixels ("depth").
 *
 * @return {Node} this
 */
Node.prototype.setDifferentialSize = function setDifferentialSize (x, y, z) {
    var vec3 = this.value.size.differential;
    var propogate = false;

    propogate = this._vecOptionalSet(vec3, 0, x) || propogate;
    propogate = this._vecOptionalSet(vec3, 1, y) || propogate;
    propogate = this._vecOptionalSet(vec3, 2, z) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = vec3[0];
        y = vec3[1];
        z = vec3[2];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onDifferentialSizeChange) item.onDifferentialSizeChange(x, y, z);
        }
    }
    return this;
};

/**
 * Sets the nodes size in pixels, independent of its parent.
 *
 * @method setAbsoluteSize
 *
 * @param {Number} x    x-Size in pixels ("width").
 * @param {Number} y    y-Size in pixels ("height").
 * @param {Number} z    z-Size in pixels ("depth").
 *
 * @return {Node} this
 */
Node.prototype.setAbsoluteSize = function setAbsoluteSize (x, y, z) {
    var vec3 = this.value.size.absolute;
    var propogate = false;

    propogate = this._vecOptionalSet(vec3, 0, x) || propogate;
    propogate = this._vecOptionalSet(vec3, 1, y) || propogate;
    propogate = this._vecOptionalSet(vec3, 2, z) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = vec3[0];
        y = vec3[1];
        z = vec3[2];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onAbsoluteSizeChange) item.onAbsoluteSizeChange(x, y, z);
        }
    }
    return this;
};

/**
 * Private method for alerting all components and children that
 * this node's transform has changed.
 *
 * @method
 *
 * @param {Float32Array} transform The transform that has changed
 *
 * @return {undefined} undefined
 */
Node.prototype._transformChanged = function _transformChanged (transform) {
    var i = 0;
    var items = this._components;
    var len = items.length;
    var item;

    for (; i < len ; i++) {
        item = items[i];
        if (item && item.onTransformChange) item.onTransformChange(transform);
    }

    i = 0;
    items = this._children;
    len = items.length;

    for (; i < len ; i++) {
        item = items[i];
        if (item && item.onParentTransformChange) item.onParentTransformChange(transform);
    }
};

/**
 * Private method for alerting all components and children that
 * this node's size has changed.
 *
 * @method
 *
 * @param {Float32Array} size the size that has changed
 *
 * @return {undefined} undefined
 */
Node.prototype._sizeChanged = function _sizeChanged (size) {
    var i = 0;
    var items = this._components;
    var len = items.length;
    var item;

    for (; i < len ; i++) {
        item = items[i];
        if (item && item.onSizeChange) item.onSizeChange(size);
    }

    i = 0;
    items = this._children;
    len = items.length;

    for (; i < len ; i++) {
        item = items[i];
        if (item && item.onParentSizeChange) item.onParentSizeChange(size);
    }
};

/**
 * Method for getting the current frame. Will be depricated.
 *
 * @method
 *
 * @return {Number} current frame
 */
Node.prototype.getFrame = function getFrame () {
    return this._globalUpdater.getFrame();
};

/**
 * returns an array of the components currently attached to this
 * node.
 *
 * @method getComponents
 *
 * @return {Array} list of components.
 */
Node.prototype.getComponents = function getComponents () {
    return this._components;
};

/**
 * Enters the node's update phase while updating its own spec and updating its components.
 *
 * @method update
 *
 * @param  {Number} time    high-resolution timstamp, usually retrieved using
 *                          requestAnimationFrame
 *
 * @return {Node} this
 */
Node.prototype.update = function update (time){
    this._inUpdate = true;
    var nextQueue = this._nextUpdateQueue;
    var queue = this._updateQueue;
    var item;

    while (nextQueue.length) queue.unshift(nextQueue.pop());

    while (queue.length) {
        item = this._components[queue.shift()];
        if (item && item.onUpdate) item.onUpdate(time);
    }

    var mySize = this.getSize();
    var myTransform = this.getTransform();
    var parent = this.getParent();
    var parentSize = parent.getSize();
    var parentTransform = parent.getTransform();
    var sizeChanged = SIZE_PROCESSOR.fromSpecWithParent(parentSize, this, mySize);

    var transformChanged = TRANSFORM_PROCESSOR.fromSpecWithParent(parentTransform, this.value, mySize, parentSize, myTransform);
    if (transformChanged) this._transformChanged(myTransform);
    if (sizeChanged) this._sizeChanged(mySize);

    this._inUpdate = false;
    this._requestingUpdate = false;

    if (!this.isMounted()) {
        // last update
        this._parent = null;
        this.value.location = null;
        this._globalUpdater = null;
    }
    else if (this._nextUpdateQueue.length) {
        this._globalUpdater.requestUpdateOnNextTick(this);
        this._requestingUpdate = true;
    }
    return this;
};

/**
 * Mounts the node and therefore its subtree by setting it as a child of the
 * passed in parent.
 *
 * @method mount
 *
 * @param  {Node} parent    parent node
 * @param  {String} myId    path to node (e.g. `body/0/1`)
 *
 * @return {Node} this
 */
Node.prototype.mount = function mount (parent, myId) {
    if (this.isMounted()) return this;
    var i = 0;
    var list = this._components;
    var len = list.length;
    var item;

    this._parent = parent;
    this._globalUpdater = parent.getUpdater();
    this.value.location = myId;
    this.value.showState.mounted = true;

    for (; i < len ; i++) {
        item = list[i];
        if (item && item.onMount) item.onMount(this, i);
    }

    i = 0;
    list = this._children;
    len = list.length;
    for (; i < len ; i++) {
        item = list[i];
        if (item && item.onParentMount) item.onParentMount(this, myId, i);
    }

    if (!this._requestingUpdate) this._requestUpdate(true);
    return this;
};

/**
 * Dismounts (detaches) the node from the scene graph by removing it as a
 * child of its parent.
 *
 * @method
 *
 * @return {Node} this
 */
Node.prototype.dismount = function dismount () {
    if (!this.isMounted()) return this;
    var i = 0;
    var list = this._components;
    var len = list.length;
    var item;

    this.value.showState.mounted = false;

    this._parent.removeChild(this);

    for (; i < len ; i++) {
        item = list[i];
        if (item && item.onDismount) item.onDismount();
    }

    i = 0;
    list = this._children;
    len = list.length;
    for (; i < len ; i++) {
        item = list[i];
        if (item && item.onParentDismount) item.onParentDismount();
    }

    if (!this._requestingUpdate) this._requestUpdate();
    return this;
};

/**
 * Function to be invoked by the parent as soon as the parent is
 * being mounted.
 *
 * @method onParentMount
 *
 * @param  {Node} parent        The parent node.
 * @param  {String} parentId    The parent id (path to parent).
 * @param  {Number} index       Id the node should be mounted to.
 *
 * @return {Node} this
 */
Node.prototype.onParentMount = function onParentMount (parent, parentId, index) {
    return this.mount(parent, parentId + '/' + index);
};

/**
 * Function to be invoked by the parent as soon as the parent is being
 * unmounted.
 *
 * @method onParentDismount
 *
 * @return {Node} this
 */
Node.prototype.onParentDismount = function onParentDismount () {
    return this.dismount();
};

/**
 * Method to be called in order to dispatch an event to the node and all its
 * components. Note that this doesn't recurse the subtree.
 *
 * @method receive
 *
 * @param  {String} type   The event type (e.g. "click").
 * @param  {Object} ev     The event payload object to be dispatched.
 *
 * @return {Node} this
 */
Node.prototype.receive = function receive (type, ev) {
    var i = 0;
    var list = this._components;
    var len = list.length;
    var item;
    for (; i < len ; i++) {
        item = list[i];
        if (item && item.onReceive) item.onReceive(type, ev);
    }
    return this;
};


/**
 * Private method to avoid accidentally passing arguments
 * to update events.
 *
 * @method
 *
 * @return {undefined} undefined
 */
Node.prototype._requestUpdateWithoutArgs = function _requestUpdateWithoutArgs () {
    if (!this._requestingUpdate) this._requestUpdate();
};

/**
 * A method to execute logic on update. Defaults to the
 * node's .update method.
 *
 * @method
 *
 * @param {Number} current time
 *
 * @return {undefined} undefined
 */
Node.prototype.onUpdate = Node.prototype.update;

/**
 * A method to execute logic when a parent node is shown. Delegates
 * to Node.show.
 *
 * @method
 *
 * @return {Node} this
 */
Node.prototype.onParentShow = Node.prototype.show;

/**
 * A method to execute logic when the parent is hidden. Delegates
 * to Node.hide.
 *
 * @method
 *
 * @return {Node} this
 */
Node.prototype.onParentHide = Node.prototype.hide;

/**
 * A method to execute logic when the parent transform changes.
 * Delegates to Node._requestUpdateWithoutArgs.
 *
 * @method
 *
 * @return {undefined} undefined
 */
Node.prototype.onParentTransformChange = Node.prototype._requestUpdateWithoutArgs;

/**
 * A method to execute logic when the parent size changes.
 * Delegates to Node._requestUpdateWIthoutArgs.
 *
 * @method
 *
 * @return {undefined} undefined
 */
Node.prototype.onParentSizeChange = Node.prototype._requestUpdateWithoutArgs;

/**
 * A method to execute logic when the node something wants
 * to show the node. Delegates to Node.show.
 *
 * @method
 *
 * @return {Node} this
 */
Node.prototype.onShow = Node.prototype.show;

/**
 * A method to execute logic when something wants to hide this
 * node. Delegates to Node.hide.
 *
 * @method
 *
 * @return {Node} this
 */
Node.prototype.onHide = Node.prototype.hide;

/**
 * A method which can execute logic when this node is added to
 * to the scene graph. Delegates to mount.
 *
 * @method
 *
 * @return {Node} this
 */
Node.prototype.onMount = Node.prototype.mount;

/**
 * A method which can execute logic when this node is removed from
 * the scene graph. Delegates to Node.dismount.
 *
 * @method
 *
 * @return {Node} this
 */
Node.prototype.onDismount = Node.prototype.dismount;

/**
 * A method which can execute logic when this node receives
 * an event from the scene graph. Delegates to Node.receive.
 *
 * @method
 *
 * @param {String} event name
 * @param {Object} payload
 *
 * @return {undefined} undefined
 */
Node.prototype.onReceive = Node.prototype.receive;

module.exports = Node;

},{"./Size":9,"./Transform":10}],8:[function(require,module,exports){
/**
 * The MIT License (MIT)
 * 
 * Copyright (c) 2015 Famous Industries Inc.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/*jshint -W079 */

'use strict';

var Dispatch = require('./Dispatch');
var Node = require('./Node');
var Size = require('./Size');

/**
 * Scene is the bottom of the scene graph. It is it's own
 * parent and provides the global updater to the scene graph.
 *
 * @class Scene
 * @constructor
 *
 * @param {String} selector a string which is a dom selector
 *                 signifying which dom element the context
 *                 should be set upon
 * @param {Famous} updater a class which conforms to Famous' interface
 *                 it needs to be able to send methods to
 *                 the renderers and update nodes in the scene graph
 */
function Scene (selector, updater) {
    if (!selector) throw new Error('Scene needs to be created with a DOM selector');
    if (!updater) throw new Error('Scene needs to be created with a class like Famous');

    Node.call(this);         // Scene inherits from node

    this._updater = updater; // The updater that will both
                             // send messages to the renderers
                             // and update dirty nodes 

    this._dispatch = new Dispatch(this); // instantiates a dispatcher
                                         // to send events to the scene
                                         // graph below this context
    
    this._selector = selector; // reference to the DOM selector
                               // that represents the elemnent
                               // in the dom that this context
                               // inhabits

    this.onMount(this, selector); // Mount the context to itself
                                  // (it is its own parent)
    
    this._updater                  // message a request for the dom
        .message('NEED_SIZE_FOR')  // size of the context so that
        .message(selector);        // the scene graph has a total size

    this.show(); // the context begins shown (it's already present in the dom)

}

// Scene inherits from node
Scene.prototype = Object.create(Node.prototype);
Scene.prototype.constructor = Scene;

/**
 * Scene getUpdater function returns the passed in updater
 *
 * @return {Famous} the updater for this Scene
 */
Scene.prototype.getUpdater = function getUpdater () {
    return this._updater;
};

/**
 * Returns the selector that the context was instantiated with
 *
 * @return {String} dom selector
 */
Scene.prototype.getSelector = function getSelector () {
    return this._selector;
};

/**
 * Returns the dispatcher of the context. Used to send events
 * to the nodes in the scene graph.
 *
 * @return {Dispatch} the Scene's Dispatch
 */
Scene.prototype.getDispatch = function getDispatch () {
    return this._dispatch;
};

/**
 * Receives an event. If the event is 'CONTEXT_RESIZE' it sets the size of the scene
 * graph to the payload, which must be an array of numbers of at least
 * length three representing the pixel size in 3 dimensions.
 *
 * @param {String} event the name of the event being received
 * @param {*} payload the object being sent
 *
 * @return {undefined} undefined
 */
Scene.prototype.onReceive = function onReceive (event, payload) {
    // TODO: In the future the dom element that the context is attached to
    // should have a representation as a component. It would be render sized
    // and the context would receive its size the same way that any render size
    // component receives its size.
    if (event === 'CONTEXT_RESIZE') {
        
        if (payload.length < 2) 
            throw new Error(
                    'CONTEXT_RESIZE\'s payload needs to be at least a pair' +
                    ' of pixel sizes'
            );

        this.setSizeMode(Size.ABSOLUTE, Size.ABSOLUTE, Size.ABSOLUTE);
        this.setAbsoluteSize(payload[0],
                             payload[1],
                             payload[2] ? payload[2] : 0);

    }
};

module.exports = Scene;


},{"./Dispatch":4,"./Node":7,"./Size":9}],9:[function(require,module,exports){
/**
 * The MIT License (MIT)
 * 
 * Copyright (c) 2015 Famous Industries Inc.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * The Size class is responsible for processing Size from a node
 * @constructor Size
 */
function Size () {
    this._size = new Float32Array(3);
}

// an enumeration of the different types of size modes
Size.RELATIVE = 0;
Size.ABSOLUTE = 1;
Size.RENDER = 2;
Size.DEFAULT = Size.RELATIVE;

/**
 * fromSpecWithParent takes the parent node's size, the target nodes spec,
 * and a target array to write to. Using the node's size mode it calculates 
 * a final size for the node from the node's spec. Returns whether or not
 * the final size has changed from its last value.
 *
 * @param {Array} parentSize parent node's calculated size
 * @param {Node.Spec} node the target node's spec
 * @param {Array} target an array to write the result to
 *
 * @return {Boolean} true if the size of the node has changed.
 */
Size.prototype.fromSpecWithParent = function fromSpecWithParent (parentSize, node, target) {
    var spec = node.getValue().spec;
    var components = node.getComponents();
    var mode = spec.size.sizeMode;
    var prev;
    var changed = false;
    var len = components.length;
    var j;
    for (var i = 0 ; i < 3 ; i++) {
        switch (mode[i]) {
            case Size.RELATIVE:
                prev = target[i];
                target[i] = parentSize[i] * spec.size.proportional[i] + spec.size.differential[i];
                break;
            case Size.ABSOLUTE:
                prev = target[i];
                target[i] = spec.size.absolute[i];
                break;
            case Size.RENDER:
                var candidate;
                for (j = 0; j < len ; j++) {
                    if (components[j].getRenderSize) {
                        candidate = components[j].getRenderSize()[i];
                        prev = target[i];
                        target[i] = target[i] < candidate || target[i] === 0 ? candidate : target[i];
                    }
                }
                break;
        }
        changed = changed || prev !== target[i];
    }
    return changed;
};

module.exports = Size;

},{}],10:[function(require,module,exports){
/**
 * The MIT License (MIT)
 * 
 * Copyright (c) 2015 Famous Industries Inc.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * The transform class is responsible for calculating the transform of a particular
 * node from the data on the node and its parent
 *
 * @constructor Transform
 */
function Transform () {
    this._matrix = new Float32Array(16);
}

/**
 * Returns the last calculated transform
 *
 * @return {Array} a transform
 */
Transform.prototype.get = function get () {
    return this._matrix;
};

/**
 * Uses the parent transform, the node's spec, the node's size, and the parent's size
 * to calculate a final transform for the node. Returns true if the transform has changed.
 *
 * @param {Array} parentMatrix the parent matrix
 * @param {Node.Spec} spec the target node's spec
 * @param {Array} mySize the size of the node
 * @param {Array} parentSize the size of the parent
 * @param {Array} target the target array to write the resulting transform to
 *
 * @return {Boolean} whether or not the transform changed
 */
Transform.prototype.fromSpecWithParent = function fromSpecWithParent (parentMatrix, spec, mySize, parentSize, target) {
    target = target ? target : this._matrix;

    // local cache of everything
    var t00         = target[0];
    var t01         = target[1];
    var t02         = target[2];
    var t10         = target[4];
    var t11         = target[5];
    var t12         = target[6];
    var t20         = target[8];
    var t21         = target[9];
    var t22         = target[10];
    var t30         = target[12];
    var t31         = target[13];
    var t32         = target[14];
    var p00         = parentMatrix[0];
    var p01         = parentMatrix[1];
    var p02         = parentMatrix[2];
    var p10         = parentMatrix[4];
    var p11         = parentMatrix[5];
    var p12         = parentMatrix[6];
    var p20         = parentMatrix[8];
    var p21         = parentMatrix[9];
    var p22         = parentMatrix[10];
    var p30         = parentMatrix[12];
    var p31         = parentMatrix[13];
    var p32         = parentMatrix[14];
    var posX        = spec.vectors.position[0];
    var posY        = spec.vectors.position[1];
    var posZ        = spec.vectors.position[2];
    var rotX        = spec.vectors.rotation[0];
    var rotY        = spec.vectors.rotation[1];
    var rotZ        = spec.vectors.rotation[2];
    var rotW        = spec.vectors.rotation[3];
    var scaleX      = spec.vectors.scale[0];
    var scaleY      = spec.vectors.scale[1];
    var scaleZ      = spec.vectors.scale[2];
    var alignX      = spec.offsets.align[0] * parentSize[0];
    var alignY      = spec.offsets.align[1] * parentSize[1];
    var alignZ      = spec.offsets.align[2] * parentSize[2];
    var mountPointX = spec.offsets.mountPoint[0] * mySize[0];
    var mountPointY = spec.offsets.mountPoint[1] * mySize[1];
    var mountPointZ = spec.offsets.mountPoint[2] * mySize[2];
    var originX     = spec.offsets.origin[0] * mySize[0];
    var originY     = spec.offsets.origin[1] * mySize[1];
    var originZ     = spec.offsets.origin[2] * mySize[2];

    var wx = rotW * rotX;
    var wy = rotW * rotY;
    var wz = rotW * rotZ;
    var xx = rotX * rotX;
    var yy = rotY * rotY;
    var zz = rotZ * rotZ;
    var xy = rotX * rotY;
    var xz = rotX * rotZ;
    var yz = rotY * rotZ;

    var rs0 = (1 - 2 * (yy + zz)) * scaleX;
    var rs1 = (2 * (xy + wz)) * scaleX;
    var rs2 = (2 * (xz - wy)) * scaleX;
    var rs3 = (2 * (xy - wz)) * scaleY;
    var rs4 = (1 - 2 * (xx + zz)) * scaleY;
    var rs5 = (2 * (yz + wx)) * scaleY;
    var rs6 = (2 * (xz + wy)) * scaleZ;
    var rs7 = (2 * (yz - wx)) * scaleZ;
    var rs8 = (1 - 2 * (xx + yy)) * scaleZ;

    var tx = alignX + posX - mountPointX + originX - (rs0 * originX + rs3 * originY + rs6 * originZ);
    var ty = alignY + posY - mountPointY + originY - (rs1 * originX + rs4 * originY + rs7 * originZ);
    var tz = alignZ + posZ - mountPointZ + originZ - (rs2 * originX + rs5 * originY + rs8 * originZ);

    target[0] = p00 * rs0 + p10 * rs1 + p20 * rs2;
    target[1] = p01 * rs0 + p11 * rs1 + p21 * rs2;
    target[2] = p02 * rs0 + p12 * rs1 + p22 * rs2;
    target[3] = 0;
    target[4] = p00 * rs3 + p10 * rs4 + p20 * rs5;
    target[5] = p01 * rs3 + p11 * rs4 + p21 * rs5;
    target[6] = p02 * rs3 + p12 * rs4 + p22 * rs5;
    target[7] = 0;
    target[8] = p00 * rs6 + p10 * rs7 + p20 * rs8;
    target[9] = p01 * rs6 + p11 * rs7 + p21 * rs8;
    target[10] = p02 * rs6 + p12 * rs7 + p22 * rs8;
    target[11] = 0;
    target[12] = p00 * tx + p10 * ty + p20 * tz + p30;
    target[13] = p01 * tx + p11 * ty + p21 * tz + p31;
    target[14] = p02 * tx + p12 * ty + p22 * tz + p32;
    target[15] = 1;

    return t00 !== target[0] ||
        t01 !== target[1] ||
        t02 !== target[2] ||
        t10 !== target[4] ||
        t11 !== target[5] ||
        t12 !== target[6] ||
        t20 !== target[8] ||
        t21 !== target[9] ||
        t22 !== target[10] ||
        t30 !== target[12] ||
        t31 !== target[13] ||
        t32 !== target[14];

};

module.exports = Transform;

},{}],11:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var ElementCache = require('./ElementCache');
var math = require('./Math');
var vendorPrefix = require('../utilities/vendorPrefix');
var eventMap = require('./events/EventMap');

var TRANSFORM = null;

/**
 * DOMRenderer is a class responsible for adding elements
 * to the DOM and writing to those elements.
 * There is a DOMRenderer per context, represented as an
 * element and a selector. It is instantiated in the
 * context class.
 *
 * @class DOMRenderer
 *
 * @param {HTMLElement} element an element.
 * @param {String} selector the selector of the element.
 * @param {Compositor} compositor the compositor controlling the renderer
 */
function DOMRenderer (element, selector, compositor) {
    element.classList.add('famous-dom-renderer');

    TRANSFORM = TRANSFORM || vendorPrefix('transform');
    this._compositor = compositor; // a reference to the compositor

    this._target = null; // a register for holding the current
                         // element that the Renderer is operating
                         // upon

    this._parent = null; // a register for holding the parent
                         // of the target

    this._path = null; // a register for holding the path of the target
                       // this register must be set first, and then
                       // children, target, and parent are all looked
                       // up from that.

    this._children = []; // a register for holding the children of the
                         // current target.

    this._root = new ElementCache(element, selector); // the root
                                                      // of the dom tree that this
                                                      // renderer is responsible
                                                      // for

    this._boundTriggerEvent = this._triggerEvent.bind(this);

    this._selector = selector;

    this._elements = {};

    this._elements[selector] = this._root;

    this.perspectiveTransform = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    this._VPtransform = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

    this._size = [null, null];
}


/**
 * Attaches an EventListener to the element associated with the passed in path.
 * Prevents the default browser action on all subsequent events if
 * `preventDefault` is truthy.
 * All incoming events will be forwarded to the compositor by invoking the
 * `sendEvent` method.
 * Delegates events if possible by attaching the event listener to the context.
 *
 * @method
 *
 * @param {String} type DOM event type (e.g. click, mouseover).
 * @param {Boolean} preventDefault Whether or not the default browser action should be prevented.
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype.subscribe = function subscribe(type, preventDefault) {
    // TODO preventDefault should be a separate command
    this._assertTargetLoaded();

    this._target.preventDefault[type] = preventDefault;
    this._target.subscribe[type] = true;

    if (
        !this._target.listeners[type] && !this._root.listeners[type]
    ) {
        var target = eventMap[type][1] ? this._root : this._target;
        target.listeners[type] = this._boundTriggerEvent;
        target.element.addEventListener(type, this._boundTriggerEvent);
    }
};

/**
 * Function to be added using `addEventListener` to the corresponding
 * DOMElement.
 *
 * @method
 * @private
 *
 * @param {Event} ev DOM Event payload
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype._triggerEvent = function _triggerEvent(ev) {
    // Use ev.path, which is an array of Elements (polyfilled if needed).
    var evPath = ev.path ? ev.path : _getPath(ev);
    // First element in the path is the element on which the event has actually
    // been emitted.
    for (var i = 0; i < evPath.length; i++) {
        // Skip nodes that don't have a dataset property or data-fa-path
        // attribute.
        if (!evPath[i].dataset) continue;
        var path = evPath[i].dataset.faPath;
        if (!path) continue;

        // Stop further event propogation and path traversal as soon as the
        // first ElementCache subscribing for the emitted event has been found.
        if (this._elements[path].subscribe[ev.type]) {
            ev.stopPropagation();

            // Optionally preventDefault. This needs forther consideration and
            // should be optional. Eventually this should be a separate command/
            // method.
            if (this._elements[path].preventDefault[ev.type]) {
                ev.preventDefault();
            }

            var NormalizedEventConstructor = eventMap[ev.type][0];

            // Finally send the event to the Worker Thread through the
            // compositor.
            this._compositor.sendEvent(path, ev.type, new NormalizedEventConstructor(ev));

            break;
        }
    }
};


/**
 * getSizeOf gets the dom size of a particular DOM element.  This is
 * needed for render sizing in the scene graph.
 *
 * @method
 *
 * @param {String} path path of the Node in the scene graph
 *
 * @return {Array} a vec3 of the offset size of the dom element
 */
DOMRenderer.prototype.getSizeOf = function getSizeOf(path) {
    var element = this._elements[path];
    if (!element) return null;

    var res = {val: element.size};
    this._compositor.sendEvent(path, 'resize', res);
    return res;
};

function _getPath(ev) {
    // TODO move into _triggerEvent, avoid object allocation
    var path = [];
    var node = ev.target;
    while (node !== document.body) {
        path.push(node);
        node = node.parentNode;
    }
    return path;
}


/**
 * Determines the size of the context by querying the DOM for `offsetWidth` and
 * `offsetHeight`.
 *
 * @method
 *
 * @return {Array} Offset size.
 */
DOMRenderer.prototype.getSize = function getSize() {
    this._size[0] = this._root.element.offsetWidth;
    this._size[1] = this._root.element.offsetHeight;
    return this._size;
};

DOMRenderer.prototype._getSize = DOMRenderer.prototype.getSize;


/**
 * Executes the retrieved draw commands. Draw commands only refer to the
 * cross-browser normalized `transform` property.
 *
 * @method
 *
 * @param {Object} renderState description
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype.draw = function draw(renderState) {
    if (renderState.perspectiveDirty) {
        this.perspectiveDirty = true;

        this.perspectiveTransform[0] = renderState.perspectiveTransform[0];
        this.perspectiveTransform[1] = renderState.perspectiveTransform[1];
        this.perspectiveTransform[2] = renderState.perspectiveTransform[2];
        this.perspectiveTransform[3] = renderState.perspectiveTransform[3];

        this.perspectiveTransform[4] = renderState.perspectiveTransform[4];
        this.perspectiveTransform[5] = renderState.perspectiveTransform[5];
        this.perspectiveTransform[6] = renderState.perspectiveTransform[6];
        this.perspectiveTransform[7] = renderState.perspectiveTransform[7];

        this.perspectiveTransform[8] = renderState.perspectiveTransform[8];
        this.perspectiveTransform[9] = renderState.perspectiveTransform[9];
        this.perspectiveTransform[10] = renderState.perspectiveTransform[10];
        this.perspectiveTransform[11] = renderState.perspectiveTransform[11];

        this.perspectiveTransform[12] = renderState.perspectiveTransform[12];
        this.perspectiveTransform[13] = renderState.perspectiveTransform[13];
        this.perspectiveTransform[14] = renderState.perspectiveTransform[14];
        this.perspectiveTransform[15] = renderState.perspectiveTransform[15];
    }

    if (renderState.viewDirty || renderState.perspectiveDirty) {
        math.multiply(this._VPtransform, this.perspectiveTransform, renderState.viewTransform);
        this._root.element.style[TRANSFORM] = this._stringifyMatrix(this._VPtransform);
    }
};


/**
 * Internal helper function used for ensuring that a path is currently loaded.
 *
 * @method
 * @private
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype._assertPathLoaded = function _asserPathLoaded() {
    if (!this._path) throw new Error('path not loaded');
};

/**
 * Internal helper function used for ensuring that a parent is currently loaded.
 *
 * @method
 * @private
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype._assertParentLoaded = function _assertParentLoaded() {
    if (!this._parent) throw new Error('parent not loaded');
};

/**
 * Internal helper function used for ensuring that children are currently
 * loaded.
 *
 * @method
 * @private
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype._assertChildrenLoaded = function _assertChildrenLoaded() {
    if (!this._children) throw new Error('children not loaded');
};

/**
 * Internal helper function used for ensuring that a target is currently loaded.
 *
 * @method  _assertTargetLoaded
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype._assertTargetLoaded = function _assertTargetLoaded() {
    if (!this._target) throw new Error('No target loaded');
};

/**
 * Finds and sets the parent of the currently loaded element (path).
 *
 * @method
 * @private
 *
 * @return {ElementCache} Parent element.
 */
DOMRenderer.prototype.findParent = function findParent () {
    this._assertPathLoaded();

    var path = this._path;
    var parent;

    while (!parent && path.length) {
        path = path.substring(0, path.lastIndexOf('/'));
        parent = this._elements[path];
    }
    this._parent = parent;
    return parent;
};


/**
 * Finds all children of the currently loaded element.
 *
 * @method
 * @private
 *
 * @param {Array} array Output-Array used for writing to (subsequently appending children)
 *
 * @return {Array} array of children elements
 */
DOMRenderer.prototype.findChildren = function findChildren(array) {
    // TODO: Optimize me.
    this._assertPathLoaded();

    var path = this._path + '/';
    var keys = Object.keys(this._elements);
    var i = 0;
    var len;
    array = array ? array : this._children;

    this._children.length = 0;

    while (i < keys.length) {
        if (keys[i].indexOf(path) === -1 || keys[i] === path) keys.splice(i, 1);
        else i++;
    }
    var currentPath;
    var j = 0;
    for (i = 0 ; i < keys.length ; i++) {
        currentPath = keys[i];
        for (j = 0 ; j < keys.length ; j++) {
            if (i !== j && keys[j].indexOf(currentPath) !== -1) {
                keys.splice(j, 1);
                i--;
            }
        }
    }
    for (i = 0, len = keys.length ; i < len ; i++)
        array[i] = this._elements[keys[i]];

    return array;
};


/**
 * Used for determining the target loaded under the current path.
 *
 * @method
 *
 * @return {ElementCache|undefined} Element loaded under defined path.
 */
DOMRenderer.prototype.findTarget = function findTarget() {
    this._target = this._elements[this._path];
    return this._target;
};


/**
 * Loads the passed in path.
 *
 * @method
 *
 * @param {String} path Path to be loaded
 *
 * @return {String} Loaded path
 */
DOMRenderer.prototype.loadPath = function loadPath (path) {
    this._path = path;
    return this._path;
};


/**
 * Inserts a DOMElement at the currently loaded path, assuming no target is
 * loaded. Only one DOMElement can be associated with each path.
 *
 * @method
 *
 * @param {String} tagName Tag name (capitalization will be normalized).
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype.insertEl = function insertEl (tagName) {
    if (!this._target ||
         this._target.element.tagName.toLowerCase() === tagName.toLowerCase()) {

        this.findParent();
        this.findChildren();

        this._assertParentLoaded();
        this._assertChildrenLoaded();

        if (this._target) this._parent.element.removeChild(this._target.element);

        this._target = new ElementCache(document.createElement(tagName), this._path);
        this._parent.element.appendChild(this._target.element);
        this._elements[this._path] = this._target;

        for (var i = 0, len = this._children.length ; i < len ; i++) {
            this._target.element.appendChild(this._children[i].element);
        }
    }
};


/**
 * Sets a property on the currently loaded target.
 *
 * @method
 *
 * @param {String} name Property name (e.g. background, color, font)
 * @param {String} value Proprty value (e.g. black, 20px)
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype.setProperty = function setProperty (name, value) {
    this._assertTargetLoaded();
    this._target.element.style[name] = value;
};


/**
 * Sets the size of the currently loaded target.
 * Removes any explicit sizing constraints when passed in `false`
 * ("true-sizing").
 *
 * @method
 *
 * @param {Number|false} width   Width to be set.
 * @param {Number|false} height  Height to be set.
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype.setSize = function setSize (width, height) {
    this._assertTargetLoaded();

    this.setWidth(width);
    this.setHeight(height);
};

/**
 * Sets the width of the currently loaded target.
 * Removes any explicit sizing constraints when passed in `false`
 * ("true-sizing").
 *
 * @method
 *
 * @param {Number|false} width Width to be set.
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype.setWidth = function setWidth(width) {
    this._assertTargetLoaded();

    var contentWrapper = this._target.content;

    if (width === false) {
        this._target.explicitWidth = true;
        if (contentWrapper) contentWrapper.style.width = '';
        width = contentWrapper ? contentWrapper.offsetWidth : 0;
        this._target.element.style.width = width + 'px';
    }
    else {
        this._target.explicitWidth = false;
        if (contentWrapper) contentWrapper.style.width = width + 'px';
        this._target.element.style.width = width + 'px';
    }

    this._target.size[0] = width;
};

/**
 * Sets the height of the currently loaded target.
 * Removes any explicit sizing constraints when passed in `false`
 * ("true-sizing").
 *
 * @method
 *
 * @param {Number|false} height Height to be set.
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype.setHeight = function setHeight(height) {
    this._assertTargetLoaded();

    var contentWrapper = this._target.content;

    if (height === false) {
        this._target.explicitHeight = true;
        if (contentWrapper) contentWrapper.style.height = '';
        height = contentWrapper ? contentWrapper.offsetHeight : 0;
        this._target.element.style.height = height + 'px';
    }
    else {
        this._target.explicitHeight = false;
        if (contentWrapper) contentWrapper.style.height = height + 'px';
        this._target.element.style.height = height + 'px';
    }

    this._target.size[1] = height;
};

/**
 * Sets an attribute on the currently loaded target.
 *
 * @method
 *
 * @param {String} name Attribute name (e.g. href)
 * @param {String} value Attribute value (e.g. http://famous.org)
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype.setAttribute = function setAttribute(name, value) {
    this._assertTargetLoaded();
    this._target.element.setAttribute(name, value);
};

/**
 * Sets the `innerHTML` content of the currently loaded target.
 *
 * @method
 *
 * @param {String} content Content to be set as `innerHTML`
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype.setContent = function setContent(content) {
    this._assertTargetLoaded();
    this.findChildren();

    if (!this._target.content) {
        this._target.content = document.createElement('div');
        this._target.content.classList.add('famous-dom-element-content');
        this._target.element.insertBefore(
            this._target.content,
            this._target.element.firstChild
        );
    }
    this._target.content.innerHTML = content;

    this.setSize(
        this._target.explicitWidth ? false : this._target.size[0],
        this._target.explicitHeight ? false : this._target.size[1]
    );
};


/**
 * Sets the passed in transform matrix (world space). Inverts the parent's world
 * transform.
 *
 * @method
 *
 * @param {Float32Array} transform The transform for the loaded DOM Element in world space
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype.setMatrix = function setMatrix(transform) {
    // TODO Don't multiply matrics in the first place.
    this._assertTargetLoaded();
    this.findParent();
    var worldTransform = this._target.worldTransform;
    var changed = false;

    var i;
    var len;

    if (transform)
        for (i = 0, len = 16 ; i < len ; i++) {
            changed = changed ? changed : worldTransform[i] === transform[i];
            worldTransform[i] = transform[i];
        }
    else changed = true;

    if (changed) {
        math.invert(this._target.invertedParent, this._parent.worldTransform);
        math.multiply(this._target.finalTransform, this._target.invertedParent, worldTransform);

        // TODO: this is a temporary fix for draw commands
        // coming in out of order
        var children = this.findChildren([]);
        var previousPath = this._path;
        var previousTarget = this._target;
        for (i = 0, len = children.length ; i < len ; i++) {
            this._target = children[i];
            this._path = this._target.path;
            this.setMatrix();
        }
        this._path = previousPath;
        this._target = previousTarget;
    }

    this._target.element.style[TRANSFORM] = this._stringifyMatrix(this._target.finalTransform);
};


/**
 * Adds a class to the classList associated with the currently loaded target.
 *
 * @method
 *
 * @param {String} domClass Class name to be added to the current target.
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype.addClass = function addClass(domClass) {
    this._assertTargetLoaded();
    this._target.element.classList.add(domClass);
};


/**
 * Removes a class from the classList associated with the currently loaded
 * target.
 *
 * @method
 *
 * @param {String} domClass Class name to be removed from currently loaded target.
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype.removeClass = function removeClass(domClass) {
    this._assertTargetLoaded();
    this._target.element.classList.remove(domClass);
};


/**
 * Stringifies the passed in matrix for setting the `transform` property.
 *
 * @method  _stringifyMatrix
 * @private
 *
 * @param {Array} m    Matrix as an array or array-like object.
 * @return {String}     Stringified matrix as `matrix3d`-property.
 */
DOMRenderer.prototype._stringifyMatrix = function _stringifyMatrix(m) {
    var r = 'matrix3d(';

    r += (m[0] < 0.000001 && m[0] > -0.000001) ? '0,' : m[0] + ',';
    r += (m[1] < 0.000001 && m[1] > -0.000001) ? '0,' : m[1] + ',';
    r += (m[2] < 0.000001 && m[2] > -0.000001) ? '0,' : m[2] + ',';
    r += (m[3] < 0.000001 && m[3] > -0.000001) ? '0,' : m[3] + ',';
    r += (m[4] < 0.000001 && m[4] > -0.000001) ? '0,' : m[4] + ',';
    r += (m[5] < 0.000001 && m[5] > -0.000001) ? '0,' : m[5] + ',';
    r += (m[6] < 0.000001 && m[6] > -0.000001) ? '0,' : m[6] + ',';
    r += (m[7] < 0.000001 && m[7] > -0.000001) ? '0,' : m[7] + ',';
    r += (m[8] < 0.000001 && m[8] > -0.000001) ? '0,' : m[8] + ',';
    r += (m[9] < 0.000001 && m[9] > -0.000001) ? '0,' : m[9] + ',';
    r += (m[10] < 0.000001 && m[10] > -0.000001) ? '0,' : m[10] + ',';
    r += (m[11] < 0.000001 && m[11] > -0.000001) ? '0,' : m[11] + ',';
    r += (m[12] < 0.000001 && m[12] > -0.000001) ? '0,' : m[12] + ',';
    r += (m[13] < 0.000001 && m[13] > -0.000001) ? '0,' : m[13] + ',';
    r += (m[14] < 0.000001 && m[14] > -0.000001) ? '0,' : m[14] + ',';

    r += m[15] + ')';
    return r;
};

module.exports = DOMRenderer;

},{"../utilities/vendorPrefix":37,"./ElementCache":12,"./Math":13,"./events/EventMap":16}],12:[function(require,module,exports){
/**
 * The MIT License (MIT)
 * 
 * Copyright (c) 2015 Famous Industries Inc.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

// Transform identity matrix. 
var ident = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
];

/**
 * ElementCache is being used for keeping track of an element's DOM Element,
 * path, world transform, inverted parent, final transform (as being used for
 * setting the actual `transform`-property) and post render size (final size as
 * being rendered to the DOM).
 * 
 * @class ElementCache
 *  
 * @param {Element} element DOMElement
 * @param {String} path Path used for uniquely identifying the location in the scene graph.
 */ 
function ElementCache (element, path) {
    this.element = element;
    this.path = path;
    this.content = null;
    this.size = new Int16Array(3);
    this.explicitHeight = false;
    this.explicitWidth = false;
    this.worldTransform = new Float32Array(ident);
    this.invertedParent = new Float32Array(ident);
    this.finalTransform = new Float32Array(ident);
    this.postRenderSize = new Float32Array(2);
    this.listeners = {};
    this.preventDefault = {};
    this.subscribe = {};
}

module.exports = ElementCache;

},{}],13:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * A method for inverting a transform matrix
 *
 * @method
 *
 * @param {Array} out array to store the return of the inversion
 * @param {Array} a transform matrix to inverse
 *
 * @return {Array} out
 *   output array that is storing the transform matrix
 */
function invert (out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32,

        // Calculate the determinant
        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) {
        return null;
    }
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

    return out;
}

/**
 * A method for multiplying two matricies
 *
 * @method
 *
 * @param {Array} out array to store the return of the multiplication
 * @param {Array} a transform matrix to multiply
 * @param {Array} b transform matrix to multiply
 *
 * @return {Array} out
 *   output array that is storing the transform matrix
 */
function multiply (out, a, b) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3],
        b4 = b[4], b5 = b[5], b6 = b[6], b7 = b[7],
        b8 = b[8], b9 = b[9], b10 = b[10], b11 = b[11],
        b12 = b[12], b13 = b[13], b14 = b[14], b15 = b[15];

    var changed = false;
    var out0, out1, out2, out3;

    out0 = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out1 = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out2 = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out3 = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    changed = changed ?
              changed : out0 === out[0] ||
                        out1 === out[1] ||
                        out2 === out[2] ||
                        out3 === out[3];

    out[0] = out0;
    out[1] = out1;
    out[2] = out2;
    out[3] = out3;

    b0 = b4; b1 = b5; b2 = b6; b3 = b7;
    out0 = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out1 = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out2 = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out3 = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    changed = changed ?
              changed : out0 === out[4] ||
                        out1 === out[5] ||
                        out2 === out[6] ||
                        out3 === out[7];

    out[4] = out0;
    out[5] = out1;
    out[6] = out2;
    out[7] = out3;

    b0 = b8; b1 = b9; b2 = b10; b3 = b11;
    out0 = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out1 = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out2 = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out3 = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    changed = changed ?
              changed : out0 === out[8] ||
                        out1 === out[9] ||
                        out2 === out[10] ||
                        out3 === out[11];

    out[8] = out0;
    out[9] = out1;
    out[10] = out2;
    out[11] = out3;

    b0 = b12; b1 = b13; b2 = b14; b3 = b15;
    out0 = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out1 = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out2 = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out3 = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    changed = changed ?
              changed : out0 === out[12] ||
                        out1 === out[13] ||
                        out2 === out[14] ||
                        out3 === out[15];

    out[12] = out0;
    out[13] = out1;
    out[14] = out2;
    out[15] = out3;

    return out;
}

module.exports = {
    multiply: multiply,
    invert: invert
};

},{}],14:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var UIEvent = require('./UIEvent');

/**
 * See [UI Events (formerly DOM Level 3 Events)](http://www.w3.org/TR/2015/WD-uievents-20150428/#events-compositionevents).
 *
 * @class CompositionEvent
 * @augments UIEvent
 *
 * @param {Event} ev The native DOM event.
 */
function CompositionEvent(ev) {
    // [Constructor(DOMString typeArg, optional CompositionEventInit compositionEventInitDict)]
    // interface CompositionEvent : UIEvent {
    //     readonly    attribute DOMString data;
    // };

    UIEvent.call(this, ev);

    /**
     * @name CompositionEvent#data
     * @type String
     */
    this.data = ev.data;
}

CompositionEvent.prototype = Object.create(UIEvent.prototype);
CompositionEvent.prototype.constructor = CompositionEvent;

/**
 * Return the name of the event type
 *
 * @method
 *
 * @return {String} Name of the event type
 */
CompositionEvent.prototype.toString = function toString () {
    return 'CompositionEvent';
};

module.exports = CompositionEvent;

},{"./UIEvent":22}],15:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * The Event class is being used in order to normalize native DOM events.
 * Events need to be normalized in order to be serialized through the structured
 * cloning algorithm used by the `postMessage` method (Web Workers).
 *
 * Wrapping DOM events also has the advantage of providing a consistent
 * interface for interacting with DOM events across browsers by copying over a
 * subset of the exposed properties that is guaranteed to be consistent across
 * browsers.
 *
 * See [UI Events (formerly DOM Level 3 Events)](http://www.w3.org/TR/2015/WD-uievents-20150428/#interface-Event).
 *
 * @class Event
 *
 * @param {Event} ev The native DOM event.
 */
function Event(ev) {
    // [Constructor(DOMString type, optional EventInit eventInitDict),
    //  Exposed=Window,Worker]
    // interface Event {
    //   readonly attribute DOMString type;
    //   readonly attribute EventTarget? target;
    //   readonly attribute EventTarget? currentTarget;

    //   const unsigned short NONE = 0;
    //   const unsigned short CAPTURING_PHASE = 1;
    //   const unsigned short AT_TARGET = 2;
    //   const unsigned short BUBBLING_PHASE = 3;
    //   readonly attribute unsigned short eventPhase;

    //   void stopPropagation();
    //   void stopImmediatePropagation();

    //   readonly attribute boolean bubbles;
    //   readonly attribute boolean cancelable;
    //   void preventDefault();
    //   readonly attribute boolean defaultPrevented;

    //   [Unforgeable] readonly attribute boolean isTrusted;
    //   readonly attribute DOMTimeStamp timeStamp;

    //   void initEvent(DOMString type, boolean bubbles, boolean cancelable);
    // };

    /**
     * @name Event#type
     * @type String
     */
    this.type = ev.type;

    /**
     * @name Event#defaultPrevented
     * @type Boolean
     */
    this.defaultPrevented = ev.defaultPrevented;

    /**
     * @name Event#timeStamp
     * @type Number
     */
    this.timeStamp = ev.timeStamp;


    /**
     * Used for exposing the current target's value.
     *
     * @name Event#value
     * @type String
     */
    var targetConstructor = ev.target.constructor;
    // TODO Support HTMLKeygenElement
    if (
        targetConstructor === HTMLInputElement ||
        targetConstructor === HTMLTextAreaElement ||
        targetConstructor === HTMLSelectElement
    ) {
        this.value = ev.target.value;
    }
}

/**
 * Return the name of the event type
 *
 * @method
 *
 * @return {String} Name of the event type
 */
Event.prototype.toString = function toString () {
    return 'Event';
};

module.exports = Event;

},{}],16:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var CompositionEvent = require('./CompositionEvent');
var Event = require('./Event');
var FocusEvent = require('./FocusEvent');
var InputEvent = require('./InputEvent');
var KeyboardEvent = require('./KeyboardEvent');
var MouseEvent = require('./MouseEvent');
var TouchEvent = require('./TouchEvent');
var UIEvent = require('./UIEvent');
var WheelEvent = require('./WheelEvent');

/**
 * A mapping of DOM events to the corresponding handlers
 *
 * @name EventMap
 * @type Object
 */
var EventMap = {
    change                         : [Event, true],
    submit                         : [Event, true],

    // UI Events (http://www.w3.org/TR/uievents/)
    abort                          : [Event, false],
    beforeinput                    : [InputEvent, true],
    blur                           : [FocusEvent, false],
    click                          : [MouseEvent, true],
    compositionend                 : [CompositionEvent, true],
    compositionstart               : [CompositionEvent, true],
    compositionupdate              : [CompositionEvent, true],
    dblclick                       : [MouseEvent, true],
    focus                          : [FocusEvent, false],
    focusin                        : [FocusEvent, true],
    focusout                       : [FocusEvent, true],
    input                          : [InputEvent, true],
    keydown                        : [KeyboardEvent, true],
    keyup                          : [KeyboardEvent, true],
    load                           : [Event, false],
    mousedown                      : [MouseEvent, true],
    mouseenter                     : [MouseEvent, false],
    mouseleave                     : [MouseEvent, false],

    // bubbles, but will be triggered very frequently
    mousemove                      : [MouseEvent, false],

    mouseout                       : [MouseEvent, true],
    mouseover                      : [MouseEvent, true],
    mouseup                        : [MouseEvent, true],
    resize                         : [UIEvent, false],

    // might bubble
    scroll                         : [UIEvent, false],

    select                         : [Event, true],
    unload                         : [Event, false],
    wheel                          : [WheelEvent, true],

    // Touch Events Extension (http://www.w3.org/TR/touch-events-extensions/)
    touchcancel                    : [TouchEvent, true],
    touchend                       : [TouchEvent, true],
    touchmove                      : [TouchEvent, true],
    touchstart                     : [TouchEvent, true]
};

module.exports = EventMap;

},{"./CompositionEvent":14,"./Event":15,"./FocusEvent":17,"./InputEvent":18,"./KeyboardEvent":19,"./MouseEvent":20,"./TouchEvent":21,"./UIEvent":22,"./WheelEvent":23}],17:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var UIEvent = require('./UIEvent');

/**
 * See [UI Events (formerly DOM Level 3 Events)](http://www.w3.org/TR/2015/WD-uievents-20150428/#events-focusevent).
 *
 * @class FocusEvent
 * @augments UIEvent
 *
 * @param {Event} ev The native DOM event.
 */
function FocusEvent(ev) {
    // [Constructor(DOMString typeArg, optional FocusEventInit focusEventInitDict)]
    // interface FocusEvent : UIEvent {
    //     readonly    attribute EventTarget? relatedTarget;
    // };

    UIEvent.call(this, ev);
}

FocusEvent.prototype = Object.create(UIEvent.prototype);
FocusEvent.prototype.constructor = FocusEvent;

/**
 * Return the name of the event type
 *
 * @method
 *
 * @return {String} Name of the event type
 */
FocusEvent.prototype.toString = function toString () {
    return 'FocusEvent';
};

module.exports = FocusEvent;

},{"./UIEvent":22}],18:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var UIEvent = require('./UIEvent');

/**
 * See [Input Events](http://w3c.github.io/editing-explainer/input-events.html#idl-def-InputEvent).
 *
 * @class InputEvent
 * @augments UIEvent
 *
 * @param {Event} ev The native DOM event.
 */
function InputEvent(ev) {
    // [Constructor(DOMString typeArg, optional InputEventInit inputEventInitDict)]
    // interface InputEvent : UIEvent {
    //     readonly    attribute DOMString inputType;
    //     readonly    attribute DOMString data;
    //     readonly    attribute boolean   isComposing;
    //     readonly    attribute Range     targetRange;
    // };

    UIEvent.call(this, ev);

    /**
     * @name    InputEvent#inputType
     * @type    String
     */
    this.inputType = ev.inputType;

    /**
     * @name    InputEvent#data
     * @type    String
     */
    this.data = ev.data;

    /**
     * @name    InputEvent#isComposing
     * @type    Boolean
     */
    this.isComposing = ev.isComposing;

    /**
     * **Limited browser support**.
     *
     * @name    InputEvent#targetRange
     * @type    Boolean
     */
    this.targetRange = ev.targetRange;
}

InputEvent.prototype = Object.create(UIEvent.prototype);
InputEvent.prototype.constructor = InputEvent;

/**
 * Return the name of the event type
 *
 * @method
 *
 * @return {String} Name of the event type
 */
InputEvent.prototype.toString = function toString () {
    return 'InputEvent';
};

module.exports = InputEvent;

},{"./UIEvent":22}],19:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var UIEvent = require('./UIEvent');

/**
 * See [UI Events (formerly DOM Level 3 Events)](http://www.w3.org/TR/2015/WD-uievents-20150428/#events-keyboardevents).
 *
 * @class KeyboardEvent
 * @augments UIEvent
 *
 * @param {Event} ev The native DOM event.
 */
function KeyboardEvent(ev) {
    // [Constructor(DOMString typeArg, optional KeyboardEventInit keyboardEventInitDict)]
    // interface KeyboardEvent : UIEvent {
    //     // KeyLocationCode
    //     const unsigned long DOM_KEY_LOCATION_STANDARD = 0x00;
    //     const unsigned long DOM_KEY_LOCATION_LEFT = 0x01;
    //     const unsigned long DOM_KEY_LOCATION_RIGHT = 0x02;
    //     const unsigned long DOM_KEY_LOCATION_NUMPAD = 0x03;
    //     readonly    attribute DOMString     key;
    //     readonly    attribute DOMString     code;
    //     readonly    attribute unsigned long location;
    //     readonly    attribute boolean       ctrlKey;
    //     readonly    attribute boolean       shiftKey;
    //     readonly    attribute boolean       altKey;
    //     readonly    attribute boolean       metaKey;
    //     readonly    attribute boolean       repeat;
    //     readonly    attribute boolean       isComposing;
    //     boolean getModifierState (DOMString keyArg);
    // };

    UIEvent.call(this, ev);

    /**
     * @name KeyboardEvent#DOM_KEY_LOCATION_STANDARD
     * @type Number
     */
    this.DOM_KEY_LOCATION_STANDARD = 0x00;

    /**
     * @name KeyboardEvent#DOM_KEY_LOCATION_LEFT
     * @type Number
     */
    this.DOM_KEY_LOCATION_LEFT = 0x01;

    /**
     * @name KeyboardEvent#DOM_KEY_LOCATION_RIGHT
     * @type Number
     */
    this.DOM_KEY_LOCATION_RIGHT = 0x02;

    /**
     * @name KeyboardEvent#DOM_KEY_LOCATION_NUMPAD
     * @type Number
     */
    this.DOM_KEY_LOCATION_NUMPAD = 0x03;

    /**
     * @name KeyboardEvent#key
     * @type String
     */
    this.key = ev.key;

    /**
     * @name KeyboardEvent#code
     * @type String
     */
    this.code = ev.code;

    /**
     * @name KeyboardEvent#location
     * @type Number
     */
    this.location = ev.location;

    /**
     * @name KeyboardEvent#ctrlKey
     * @type Boolean
     */
    this.ctrlKey = ev.ctrlKey;

    /**
     * @name KeyboardEvent#shiftKey
     * @type Boolean
     */
    this.shiftKey = ev.shiftKey;

    /**
     * @name KeyboardEvent#altKey
     * @type Boolean
     */
    this.altKey = ev.altKey;

    /**
     * @name KeyboardEvent#metaKey
     * @type Boolean
     */
    this.metaKey = ev.metaKey;

    /**
     * @name KeyboardEvent#repeat
     * @type Boolean
     */
    this.repeat = ev.repeat;

    /**
     * @name KeyboardEvent#isComposing
     * @type Boolean
     */
    this.isComposing = ev.isComposing;

    /**
     * @name KeyboardEvent#keyCode
     * @type String
     * @deprecated
     */
    this.keyCode = ev.keyCode;
}

KeyboardEvent.prototype = Object.create(UIEvent.prototype);
KeyboardEvent.prototype.constructor = KeyboardEvent;

/**
 * Return the name of the event type
 *
 * @method
 *
 * @return {String} Name of the event type
 */
KeyboardEvent.prototype.toString = function toString () {
    return 'KeyboardEvent';
};

module.exports = KeyboardEvent;

},{"./UIEvent":22}],20:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var UIEvent = require('./UIEvent');

/**
 * See [UI Events (formerly DOM Level 3 Events)](http://www.w3.org/TR/2015/WD-uievents-20150428/#events-mouseevents).
 *
 * @class KeyboardEvent
 * @augments UIEvent
 *
 * @param {Event} ev The native DOM event.
 */
function MouseEvent(ev) {
    // [Constructor(DOMString typeArg, optional MouseEventInit mouseEventInitDict)]
    // interface MouseEvent : UIEvent {
    //     readonly    attribute long           screenX;
    //     readonly    attribute long           screenY;
    //     readonly    attribute long           clientX;
    //     readonly    attribute long           clientY;
    //     readonly    attribute boolean        ctrlKey;
    //     readonly    attribute boolean        shiftKey;
    //     readonly    attribute boolean        altKey;
    //     readonly    attribute boolean        metaKey;
    //     readonly    attribute short          button;
    //     readonly    attribute EventTarget?   relatedTarget;
    //     // Introduced in this specification
    //     readonly    attribute unsigned short buttons;
    //     boolean getModifierState (DOMString keyArg);
    // };

    UIEvent.call(this, ev);

    /**
     * @name MouseEvent#screenX
     * @type Number
     */
    this.screenX = ev.screenX;

    /**
     * @name MouseEvent#screenY
     * @type Number
     */
    this.screenY = ev.screenY;

    /**
     * @name MouseEvent#clientX
     * @type Number
     */
    this.clientX = ev.clientX;

    /**
     * @name MouseEvent#clientY
     * @type Number
     */
    this.clientY = ev.clientY;

    /**
     * @name MouseEvent#ctrlKey
     * @type Boolean
     */
    this.ctrlKey = ev.ctrlKey;

    /**
     * @name MouseEvent#shiftKey
     * @type Boolean
     */
    this.shiftKey = ev.shiftKey;

    /**
     * @name MouseEvent#altKey
     * @type Boolean
     */
    this.altKey = ev.altKey;

    /**
     * @name MouseEvent#metaKey
     * @type Boolean
     */
    this.metaKey = ev.metaKey;

    /**
     * @type MouseEvent#button
     * @type Number
     */
    this.button = ev.button;

    /**
     * @type MouseEvent#buttons
     * @type Number
     */
    this.buttons = ev.buttons;

    /**
     * @type MouseEvent#pageX
     * @type Number
     */
    this.pageX = ev.pageX;

    /**
     * @type MouseEvent#pageY
     * @type Number
     */
    this.pageY = ev.pageY;

    /**
     * @type MouseEvent#x
     * @type Number
     */
    this.x = ev.x;

    /**
     * @type MouseEvent#y
     * @type Number
     */
    this.y = ev.y;

    /**
     * @type MouseEvent#offsetX
     * @type Number
     */
    this.offsetX = ev.offsetX;

    /**
     * @type MouseEvent#offsetY
     * @type Number
     */
    this.offsetY = ev.offsetY;
}

MouseEvent.prototype = Object.create(UIEvent.prototype);
MouseEvent.prototype.constructor = MouseEvent;

/**
 * Return the name of the event type
 *
 * @method
 *
 * @return {String} Name of the event type
 */
MouseEvent.prototype.toString = function toString () {
    return 'MouseEvent';
};

module.exports = MouseEvent;

},{"./UIEvent":22}],21:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var UIEvent = require('./UIEvent');

var EMPTY_ARRAY = [];

/**
 * See [Touch Interface](http://www.w3.org/TR/2013/REC-touch-events-20131010/#touch-interface).
 *
 * @class Touch
 * @private
 *
 * @param {Touch} touch The native Touch object.
 */
function Touch(touch) {
    // interface Touch {
    //     readonly    attribute long        identifier;
    //     readonly    attribute EventTarget target;
    //     readonly    attribute double      screenX;
    //     readonly    attribute double      screenY;
    //     readonly    attribute double      clientX;
    //     readonly    attribute double      clientY;
    //     readonly    attribute double      pageX;
    //     readonly    attribute double      pageY;
    // };

    /**
     * @name Touch#identifier
     * @type Number
     */
    this.identifier = touch.identifier;

    /**
     * @name Touch#screenX
     * @type Number
     */
    this.screenX = touch.screenX;

    /**
     * @name Touch#screenY
     * @type Number
     */
    this.screenY = touch.screenY;

    /**
     * @name Touch#clientX
     * @type Number
     */
    this.clientX = touch.clientX;

    /**
     * @name Touch#clientY
     * @type Number
     */
    this.clientY = touch.clientY;

    /**
     * @name Touch#pageX
     * @type Number
     */
    this.pageX = touch.pageX;

    /**
     * @name Touch#pageY
     * @type Number
     */
    this.pageY = touch.pageY;
}


/**
 * Normalizes the browser's native TouchList by converting it into an array of
 * normalized Touch objects.
 *
 * @method  cloneTouchList
 * @private
 *
 * @param  {TouchList} touchList    The native TouchList array.
 * @return {Array.<Touch>}          An array of normalized Touch objects.
 */
function cloneTouchList(touchList) {
    if (!touchList) return EMPTY_ARRAY;
    // interface TouchList {
    //     readonly    attribute unsigned long length;
    //     getter Touch? item (unsigned long index);
    // };

    var touchListArray = [];
    for (var i = 0; i < touchList.length; i++) {
        touchListArray[i] = new Touch(touchList[i]);
    }
    return touchListArray;
}

/**
 * See [Touch Event Interface](http://www.w3.org/TR/2013/REC-touch-events-20131010/#touchevent-interface).
 *
 * @class TouchEvent
 * @augments UIEvent
 *
 * @param {Event} ev The native DOM event.
 */
function TouchEvent(ev) {
    // interface TouchEvent : UIEvent {
    //     readonly    attribute TouchList touches;
    //     readonly    attribute TouchList targetTouches;
    //     readonly    attribute TouchList changedTouches;
    //     readonly    attribute boolean   altKey;
    //     readonly    attribute boolean   metaKey;
    //     readonly    attribute boolean   ctrlKey;
    //     readonly    attribute boolean   shiftKey;
    // };
    UIEvent.call(this, ev);

    /**
     * @name TouchEvent#touches
     * @type Array.<Touch>
     */
    this.touches = cloneTouchList(ev.touches);

    /**
     * @name TouchEvent#targetTouches
     * @type Array.<Touch>
     */
    this.targetTouches = cloneTouchList(ev.targetTouches);

    /**
     * @name TouchEvent#changedTouches
     * @type TouchList
     */
    this.changedTouches = cloneTouchList(ev.changedTouches);

    /**
     * @name TouchEvent#altKey
     * @type Boolean
     */
    this.altKey = ev.altKey;

    /**
     * @name TouchEvent#metaKey
     * @type Boolean
     */
    this.metaKey = ev.metaKey;

    /**
     * @name TouchEvent#ctrlKey
     * @type Boolean
     */
    this.ctrlKey = ev.ctrlKey;

    /**
     * @name TouchEvent#shiftKey
     * @type Boolean
     */
    this.shiftKey = ev.shiftKey;
}

TouchEvent.prototype = Object.create(UIEvent.prototype);
TouchEvent.prototype.constructor = TouchEvent;

/**
 * Return the name of the event type
 *
 * @method
 *
 * @return {String} Name of the event type
 */
TouchEvent.prototype.toString = function toString () {
    return 'TouchEvent';
};

module.exports = TouchEvent;

},{"./UIEvent":22}],22:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var Event = require('./Event');

/**
 * See [UI Events (formerly DOM Level 3 Events)](http://www.w3.org/TR/2015/WD-uievents-20150428).
 *
 * @class UIEvent
 * @augments Event
 *
 * @param  {Event} ev   The native DOM event.
 */
function UIEvent(ev) {
    // [Constructor(DOMString type, optional UIEventInit eventInitDict)]
    // interface UIEvent : Event {
    //     readonly    attribute Window? view;
    //     readonly    attribute long    detail;
    // };
    Event.call(this, ev);

    /**
     * @name UIEvent#detail
     * @type Number
     */
    this.detail = ev.detail;
}

UIEvent.prototype = Object.create(Event.prototype);
UIEvent.prototype.constructor = UIEvent;

/**
 * Return the name of the event type
 *
 * @method
 *
 * @return {String} Name of the event type
 */
UIEvent.prototype.toString = function toString () {
    return 'UIEvent';
};

module.exports = UIEvent;

},{"./Event":15}],23:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var MouseEvent = require('./MouseEvent');

/**
 * See [UI Events (formerly DOM Level 3 Events)](http://www.w3.org/TR/2015/WD-uievents-20150428/#events-wheelevents).
 *
 * @class WheelEvent
 * @augments UIEvent
 *
 * @param {Event} ev The native DOM event.
 */
function WheelEvent(ev) {
    // [Constructor(DOMString typeArg, optional WheelEventInit wheelEventInitDict)]
    // interface WheelEvent : MouseEvent {
    //     // DeltaModeCode
    //     const unsigned long DOM_DELTA_PIXEL = 0x00;
    //     const unsigned long DOM_DELTA_LINE = 0x01;
    //     const unsigned long DOM_DELTA_PAGE = 0x02;
    //     readonly    attribute double        deltaX;
    //     readonly    attribute double        deltaY;
    //     readonly    attribute double        deltaZ;
    //     readonly    attribute unsigned long deltaMode;
    // };

    MouseEvent.call(this, ev);

    /**
     * @name WheelEvent#DOM_DELTA_PIXEL
     * @type Number
     */
    this.DOM_DELTA_PIXEL = 0x00;

    /**
     * @name WheelEvent#DOM_DELTA_LINE
     * @type Number
     */
    this.DOM_DELTA_LINE = 0x01;

    /**
     * @name WheelEvent#DOM_DELTA_PAGE
     * @type Number
     */
    this.DOM_DELTA_PAGE = 0x02;

    /**
     * @name WheelEvent#deltaX
     * @type Number
     */
    this.deltaX = ev.deltaX;

    /**
     * @name WheelEvent#deltaY
     * @type Number
     */
    this.deltaY = ev.deltaY;

    /**
     * @name WheelEvent#deltaZ
     * @type Number
     */
    this.deltaZ = ev.deltaZ;

    /**
     * @name WheelEvent#deltaMode
     * @type Number
     */
    this.deltaMode = ev.deltaMode;
}

WheelEvent.prototype = Object.create(MouseEvent.prototype);
WheelEvent.prototype.constructor = WheelEvent;

/**
 * Return the name of the event type
 *
 * @method
 *
 * @return {String} Name of the event type
 */
WheelEvent.prototype.toString = function toString () {
    return 'WheelEvent';
};

module.exports = WheelEvent;

},{"./MouseEvent":20}],24:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * A two-dimensional vector.
 *
 * @class Vec2
 *
 * @param {Number} x The x component.
 * @param {Number} y The y component.
 */
var Vec2 = function(x, y) {
    if (x instanceof Array || x instanceof Float32Array) {
        this.x = x[0] || 0;
        this.y = x[1] || 0;
    }
    else {
        this.x = x || 0;
        this.y = y || 0;
    }
};

/**
 * Set the components of the current Vec2.
 *
 * @method
 *
 * @param {Number} x The x component.
 * @param {Number} y The y component.
 *
 * @return {Vec2} this
 */
Vec2.prototype.set = function set(x, y) {
    if (x != null) this.x = x;
    if (y != null) this.y = y;
    return this;
};

/**
 * Add the input v to the current Vec2.
 *
 * @method
 *
 * @param {Vec2} v The Vec2 to add.
 *
 * @return {Vec2} this
 */
Vec2.prototype.add = function add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
};

/**
 * Subtract the input v from the current Vec2.
 *
 * @method
 *
 * @param {Vec2} v The Vec2 to subtract.
 *
 * @return {Vec2} this
 */
Vec2.prototype.subtract = function subtract(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
};

/**
 * Scale the current Vec2 by a scalar or Vec2.
 *
 * @method
 *
 * @param {Number|Vec2} s The Number or vec2 by which to scale.
 *
 * @return {Vec2} this
 */
Vec2.prototype.scale = function scale(s) {
    if (s instanceof Vec2) {
        this.x *= s.x;
        this.y *= s.y;
    }
    else {
        this.x *= s;
        this.y *= s;
    }
    return this;
};

/**
 * Rotate the Vec2 counter-clockwise by theta about the z-axis.
 *
 * @method
 *
 * @param {Number} theta Angle by which to rotate.
 *
 * @return {Vec2} this
 */
Vec2.prototype.rotate = function(theta) {
    var x = this.x;
    var y = this.y;

    var cosTheta = Math.cos(theta);
    var sinTheta = Math.sin(theta);

    this.x = x * cosTheta - y * sinTheta;
    this.y = x * sinTheta + y * cosTheta;

    return this;
};

/**
 * The dot product of of the current Vec2 with the input Vec2.
 *
 * @method
 *
 * @param {Number} v The other Vec2.
 *
 * @return {Vec2} this
 */
Vec2.prototype.dot = function(v) {
    return this.x * v.x + this.y * v.y;
};

/**
 * The cross product of of the current Vec2 with the input Vec2.
 *
 * @method
 *
 * @param {Number} v The other Vec2.
 *
 * @return {Vec2} this
 */
Vec2.prototype.cross = function(v) {
    return this.x * v.y - this.y * v.x;
};

/**
 * Preserve the magnitude but invert the orientation of the current Vec2.
 *
 * @method
 *
 * @return {Vec2} this
 */
Vec2.prototype.invert = function invert() {
    this.x *= -1;
    this.y *= -1;
    return this;
};

/**
 * Apply a function component-wise to the current Vec2.
 *
 * @method
 *
 * @param {Function} fn Function to apply.
 *
 * @return {Vec2} this
 */
Vec2.prototype.map = function map(fn) {
    this.x = fn(this.x);
    this.y = fn(this.y);
    return this;
};

/**
 * Get the magnitude of the current Vec2.
 *
 * @method
 *
 * @return {Number} the length of the vector
 */
Vec2.prototype.length = function length() {
    var x = this.x;
    var y = this.y;

    return Math.sqrt(x * x + y * y);
};

/**
 * Copy the input onto the current Vec2.
 *
 * @method
 *
 * @param {Vec2} v Vec2 to copy
 *
 * @return {Vec2} this
 */
Vec2.prototype.copy = function copy(v) {
    this.x = v.x;
    this.y = v.y;
    return this;
};

/**
 * Reset the current Vec2.
 *
 * @method
 *
 * @return {Vec2} this
 */
Vec2.prototype.clear = function clear() {
    this.x = 0;
    this.y = 0;
    return this;
};

/**
 * Check whether the magnitude of the current Vec2 is exactly 0.
 *
 * @method
 *
 * @return {Boolean} whether or not the length is 0
 */
Vec2.prototype.isZero = function isZero() {
    if (this.x !== 0 || this.y !== 0) return false;
    else return true;
};

/**
 * The array form of the current Vec2.
 *
 * @method
 *
 * @return {Array} the Vec to as an array
 */
Vec2.prototype.toArray = function toArray() {
    return [this.x, this.y];
};

/**
 * Normalize the input Vec2.
 *
 * @method
 *
 * @param {Vec2} v The reference Vec2.
 * @param {Vec2} output Vec2 in which to place the result.
 *
 * @return {Vec2} The normalized Vec2.
 */
Vec2.normalize = function normalize(v, output) {
    var x = v.x;
    var y = v.y;

    var length = Math.sqrt(x * x + y * y) || 1;
    length = 1 / length;
    output.x = v.x * length;
    output.y = v.y * length;

    return output;
};

/**
 * Clone the input Vec2.
 *
 * @method
 *
 * @param {Vec2} v The Vec2 to clone.
 *
 * @return {Vec2} The cloned Vec2.
 */
Vec2.clone = function clone(v) {
    return new Vec2(v.x, v.y);
};

/**
 * Add the input Vec2's.
 *
 * @method
 *
 * @param {Vec2} v1 The left Vec2.
 * @param {Vec2} v2 The right Vec2.
 * @param {Vec2} output Vec2 in which to place the result.
 *
 * @return {Vec2} The result of the addition.
 */
Vec2.add = function add(v1, v2, output) {
    output.x = v1.x + v2.x;
    output.y = v1.y + v2.y;

    return output;
};

/**
 * Subtract the second Vec2 from the first.
 *
 * @method
 *
 * @param {Vec2} v1 The left Vec2.
 * @param {Vec2} v2 The right Vec2.
 * @param {Vec2} output Vec2 in which to place the result.
 *
 * @return {Vec2} The result of the subtraction.
 */
Vec2.subtract = function subtract(v1, v2, output) {
    output.x = v1.x - v2.x;
    output.y = v1.y - v2.y;
    return output;
};

/**
 * Scale the input Vec2.
 *
 * @method
 *
 * @param {Vec2} v The reference Vec2.
 * @param {Number} s Number to scale by.
 * @param {Vec2} output Vec2 in which to place the result.
 *
 * @return {Vec2} The result of the scaling.
 */
Vec2.scale = function scale(v, s, output) {
    output.x = v.x * s;
    output.y = v.y * s;
    return output;
};

/**
 * The dot product of the input Vec2's.
 *
 * @method
 *
 * @param {Vec2} v1 The left Vec2.
 * @param {Vec2} v2 The right Vec2.
 *
 * @return {Number} The dot product.
 */
Vec2.dot = function dot(v1, v2) {
    return v1.x * v2.x + v1.y * v2.y;
};

/**
 * The cross product of the input Vec2's.
 *
 * @method
 *
 * @param {Number} v1 The left Vec2.
 * @param {Number} v2 The right Vec2.
 *
 * @return {Number} The z-component of the cross product.
 */
Vec2.cross = function(v1,v2) {
    return v1.x * v2.y - v1.y * v2.x;
};

module.exports = Vec2;

},{}],25:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * A three-dimensional vector.
 *
 * @class Vec3
 *
 * @param {Number} x The x component.
 * @param {Number} y The y component.
 * @param {Number} z The z component.
 */
var Vec3 = function(x ,y, z){
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
};

/**
 * Set the components of the current Vec3.
 *
 * @method
 *
 * @param {Number} x The x component.
 * @param {Number} y The y component.
 * @param {Number} z The z component.
 *
 * @return {Vec3} this
 */
Vec3.prototype.set = function set(x, y, z) {
    if (x != null) this.x = x;
    if (y != null) this.y = y;
    if (z != null) this.z = z;

    return this;
};

/**
 * Add the input v to the current Vec3.
 *
 * @method
 *
 * @param {Vec3} v The Vec3 to add.
 *
 * @return {Vec3} this
 */
Vec3.prototype.add = function add(v) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;

    return this;
};

/**
 * Subtract the input v from the current Vec3.
 *
 * @method
 *
 * @param {Vec3} v The Vec3 to subtract.
 *
 * @return {Vec3} this
 */
Vec3.prototype.subtract = function subtract(v) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;

    return this;
};

/**
 * Rotate the current Vec3 by theta clockwise about the x axis.
 *
 * @method
 *
 * @param {Number} theta Angle by which to rotate.
 *
 * @return {Vec3} this
 */
Vec3.prototype.rotateX = function rotateX(theta) {
    var y = this.y;
    var z = this.z;

    var cosTheta = Math.cos(theta);
    var sinTheta = Math.sin(theta);

    this.y = y * cosTheta - z * sinTheta;
    this.z = y * sinTheta + z * cosTheta;

    return this;
};

/**
 * Rotate the current Vec3 by theta clockwise about the y axis.
 *
 * @method
 *
 * @param {Number} theta Angle by which to rotate.
 *
 * @return {Vec3} this
 */
Vec3.prototype.rotateY = function rotateY(theta) {
    var x = this.x;
    var z = this.z;

    var cosTheta = Math.cos(theta);
    var sinTheta = Math.sin(theta);

    this.x = z * sinTheta + x * cosTheta;
    this.z = z * cosTheta - x * sinTheta;

    return this;
};

/**
 * Rotate the current Vec3 by theta clockwise about the z axis.
 *
 * @method
 *
 * @param {Number} theta Angle by which to rotate.
 *
 * @return {Vec3} this
 */
Vec3.prototype.rotateZ = function rotateZ(theta) {
    var x = this.x;
    var y = this.y;

    var cosTheta = Math.cos(theta);
    var sinTheta = Math.sin(theta);

    this.x = x * cosTheta - y * sinTheta;
    this.y = x * sinTheta + y * cosTheta;

    return this;
};

/**
 * The dot product of the current Vec3 with input Vec3 v.
 *
 * @method
 *
 * @param {Vec3} v The other Vec3.
 *
 * @return {Vec3} this
 */
Vec3.prototype.dot = function dot(v) {
    return this.x*v.x + this.y*v.y + this.z*v.z;
};

/**
 * The dot product of the current Vec3 with input Vec3 v.
 * Stores the result in the current Vec3.
 *
 * @method cross
 *
 * @param {Vec3} v The other Vec3
 *
 * @return {Vec3} this
 */
Vec3.prototype.cross = function cross(v) {
    var x = this.x;
    var y = this.y;
    var z = this.z;

    var vx = v.x;
    var vy = v.y;
    var vz = v.z;

    this.x = y * vz - z * vy;
    this.y = z * vx - x * vz;
    this.z = x * vy - y * vx;
    return this;
};

/**
 * Scale the current Vec3 by a scalar.
 *
 * @method
 *
 * @param {Number} s The Number by which to scale
 *
 * @return {Vec3} this
 */
Vec3.prototype.scale = function scale(s) {
    this.x *= s;
    this.y *= s;
    this.z *= s;

    return this;
};

/**
 * Preserve the magnitude but invert the orientation of the current Vec3.
 *
 * @method
 *
 * @return {Vec3} this
 */
Vec3.prototype.invert = function invert() {
    this.x = -this.x;
    this.y = -this.y;
    this.z = -this.z;

    return this;
};

/**
 * Apply a function component-wise to the current Vec3.
 *
 * @method
 *
 * @param {Function} fn Function to apply.
 *
 * @return {Vec3} this
 */
Vec3.prototype.map = function map(fn) {
    this.x = fn(this.x);
    this.y = fn(this.y);
    this.z = fn(this.z);

    return this;
};

/**
 * The magnitude of the current Vec3.
 *
 * @method
 *
 * @return {Number} the magnitude of the Vec3
 */
Vec3.prototype.length = function length() {
    var x = this.x;
    var y = this.y;
    var z = this.z;

    return Math.sqrt(x * x + y * y + z * z);
};

/**
 * The magnitude squared of the current Vec3.
 *
 * @method
 *
 * @return {Number} magnitude of the Vec3 squared
 */
Vec3.prototype.lengthSq = function lengthSq() {
    var x = this.x;
    var y = this.y;
    var z = this.z;

    return x * x + y * y + z * z;
};

/**
 * Copy the input onto the current Vec3.
 *
 * @method
 *
 * @param {Vec3} v Vec3 to copy
 *
 * @return {Vec3} this
 */
Vec3.prototype.copy = function copy(v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
};

/**
 * Reset the current Vec3.
 *
 * @method
 *
 * @return {Vec3} this
 */
Vec3.prototype.clear = function clear() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    return this;
};

/**
 * Check whether the magnitude of the current Vec3 is exactly 0.
 *
 * @method
 *
 * @return {Boolean} whether or not the magnitude is zero
 */
Vec3.prototype.isZero = function isZero() {
    return this.x === 0 && this.y === 0 && this.z === 0;
};

/**
 * The array form of the current Vec3.
 *
 * @method
 *
 * @return {Array} a three element array representing the components of the Vec3
 */
Vec3.prototype.toArray = function toArray() {
    return [this.x, this.y, this.z];
};

/**
 * Preserve the orientation but change the length of the current Vec3 to 1.
 *
 * @method
 *
 * @return {Vec3} this
 */
Vec3.prototype.normalize = function normalize() {
    var x = this.x;
    var y = this.y;
    var z = this.z;

    var len = Math.sqrt(x * x + y * y + z * z) || 1;
    len = 1 / len;

    this.x *= len;
    this.y *= len;
    this.z *= len;
    return this;
};

/**
 * Apply the rotation corresponding to the input (unit) Quaternion
 * to the current Vec3.
 *
 * @method
 *
 * @param {Quaternion} q Unit Quaternion representing the rotation to apply
 *
 * @return {Vec3} this
 */
Vec3.prototype.applyRotation = function applyRotation(q) {
    var cw = q.w;
    var cx = -q.x;
    var cy = -q.y;
    var cz = -q.z;

    var vx = this.x;
    var vy = this.y;
    var vz = this.z;

    var tw = -cx * vx - cy * vy - cz * vz;
    var tx = vx * cw + vy * cz - cy * vz;
    var ty = vy * cw + cx * vz - vx * cz;
    var tz = vz * cw + vx * cy - cx * vy;

    var w = cw;
    var x = -cx;
    var y = -cy;
    var z = -cz;

    this.x = tx * w + x * tw + y * tz - ty * z;
    this.y = ty * w + y * tw + tx * z - x * tz;
    this.z = tz * w + z * tw + x * ty - tx * y;
    return this;
};

/**
 * Apply the input Mat33 the the current Vec3.
 *
 * @method
 *
 * @param {Mat33} matrix Mat33 to apply
 *
 * @return {Vec3} this
 */
Vec3.prototype.applyMatrix = function applyMatrix(matrix) {
    var M = matrix.get();

    var x = this.x;
    var y = this.y;
    var z = this.z;

    this.x = M[0]*x + M[1]*y + M[2]*z;
    this.y = M[3]*x + M[4]*y + M[5]*z;
    this.z = M[6]*x + M[7]*y + M[8]*z;
    return this;
};

/**
 * Normalize the input Vec3.
 *
 * @method
 *
 * @param {Vec3} v The reference Vec3.
 * @param {Vec3} output Vec3 in which to place the result.
 *
 * @return {Vec3} The normalize Vec3.
 */
Vec3.normalize = function normalize(v, output) {
    var x = v.x;
    var y = v.y;
    var z = v.z;

    var length = Math.sqrt(x * x + y * y + z * z) || 1;
    length = 1 / length;

    output.x = x * length;
    output.y = y * length;
    output.z = z * length;
    return output;
};

/**
 * Apply a rotation to the input Vec3.
 *
 * @method
 *
 * @param {Vec3} v The reference Vec3.
 * @param {Quaternion} q Unit Quaternion representing the rotation to apply.
 * @param {Vec3} output Vec3 in which to place the result.
 *
 * @return {Vec3} The rotated version of the input Vec3.
 */
Vec3.applyRotation = function applyRotation(v, q, output) {
    var cw = q.w;
    var cx = -q.x;
    var cy = -q.y;
    var cz = -q.z;

    var vx = v.x;
    var vy = v.y;
    var vz = v.z;

    var tw = -cx * vx - cy * vy - cz * vz;
    var tx = vx * cw + vy * cz - cy * vz;
    var ty = vy * cw + cx * vz - vx * cz;
    var tz = vz * cw + vx * cy - cx * vy;

    var w = cw;
    var x = -cx;
    var y = -cy;
    var z = -cz;

    output.x = tx * w + x * tw + y * tz - ty * z;
    output.y = ty * w + y * tw + tx * z - x * tz;
    output.z = tz * w + z * tw + x * ty - tx * y;
    return output;
};

/**
 * Clone the input Vec3.
 *
 * @method
 *
 * @param {Vec3} v The Vec3 to clone.
 *
 * @return {Vec3} The cloned Vec3.
 */
Vec3.clone = function clone(v) {
    return new Vec3(v.x, v.y, v.z);
};

/**
 * Add the input Vec3's.
 *
 * @method
 *
 * @param {Vec3} v1 The left Vec3.
 * @param {Vec3} v2 The right Vec3.
 * @param {Vec3} output Vec3 in which to place the result.
 *
 * @return {Vec3} The result of the addition.
 */
Vec3.add = function add(v1, v2, output) {
    output.x = v1.x + v2.x;
    output.y = v1.y + v2.y;
    output.z = v1.z + v2.z;
    return output;
};

/**
 * Subtract the second Vec3 from the first.
 *
 * @method
 *
 * @param {Vec3} v1 The left Vec3.
 * @param {Vec3} v2 The right Vec3.
 * @param {Vec3} output Vec3 in which to place the result.
 *
 * @return {Vec3} The result of the subtraction.
 */
Vec3.subtract = function subtract(v1, v2, output) {
    output.x = v1.x - v2.x;
    output.y = v1.y - v2.y;
    output.z = v1.z - v2.z;
    return output;
};

/**
 * Scale the input Vec3.
 *
 * @method
 *
 * @param {Vec3} v The reference Vec3.
 * @param {Number} s Number to scale by.
 * @param {Vec3} output Vec3 in which to place the result.
 *
 * @return {Vec3} The result of the scaling.
 */
Vec3.scale = function scale(v, s, output) {
    output.x = v.x * s;
    output.y = v.y * s;
    output.z = v.z * s;
    return output;
};

/**
 * The dot product of the input Vec3's.
 *
 * @method
 *
 * @param {Vec3} v1 The left Vec3.
 * @param {Vec3} v2 The right Vec3.
 *
 * @return {Number} The dot product.
 */
Vec3.dot = function dot(v1, v2) {
    return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
};

/**
 * The (right-handed) cross product of the input Vec3's.
 * v1 x v2.
 *
 * @method
 *
 * @param {Vec3} v1 The left Vec3.
 * @param {Vec3} v2 The right Vec3.
 * @param {Vec3} output Vec3 in which to place the result.
 *
 * @return {Object} the object the result of the cross product was placed into
 */
Vec3.cross = function cross(v1, v2, output) {
    var x1 = v1.x;
    var y1 = v1.y;
    var z1 = v1.z;
    var x2 = v2.x;
    var y2 = v2.y;
    var z2 = v2.z;

    output.x = y1 * z2 - z1 * y2;
    output.y = z1 * x2 - x1 * z2;
    output.z = x1 * y2 - y1 * x2;
    return output;
};

/**
 * The projection of v1 onto v2.
 *
 * @method
 *
 * @param {Vec3} v1 The left Vec3.
 * @param {Vec3} v2 The right Vec3.
 * @param {Vec3} output Vec3 in which to place the result.
 *
 * @return {Object} the object the result of the cross product was placed into 
 */
Vec3.project = function project(v1, v2, output) {
    var x1 = v1.x;
    var y1 = v1.y;
    var z1 = v1.z;
    var x2 = v2.x;
    var y2 = v2.y;
    var z2 = v2.z;

    var scale = x1 * x2 + y1 * y2 + z1 * z2;
    scale /= x2 * x2 + y2 * y2 + z2 * z2;

    output.x = x2 * scale;
    output.y = y2 * scale;
    output.z = z2 * scale;

    return output;
};

module.exports = Vec3;

},{}],26:[function(require,module,exports){
module.exports = noop

function noop() {
  throw new Error(
      'You should bundle your code ' +
      'using `glslify` as a transform.'
  )
}

},{}],27:[function(require,module,exports){
module.exports = programify

function programify(vertex, fragment, uniforms, attributes) {
  return {
    vertex: vertex, 
    fragment: fragment,
    uniforms: uniforms, 
    attributes: attributes
  };
}

},{}],28:[function(require,module,exports){
// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
// requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
// MIT license

'use strict';

var lastTime = 0;
var vendors = ['ms', 'moz', 'webkit', 'o'];

var rAF, cAF;

if (typeof window === 'object') {
    rAF = window.requestAnimationFrame;
    cAF = window.cancelAnimationFrame || window.cancelRequestAnimationFrame;
    for (var x = 0; x < vendors.length && !rAF; ++x) {
        rAF = window[vendors[x] + 'RequestAnimationFrame'];
        cAF = window[vendors[x] + 'CancelRequestAnimationFrame'] ||
              window[vendors[x] + 'CancelAnimationFrame'];
    }

    if (rAF && !cAF) {
        // cAF not supported.
        // Fall back to setInterval for now (very rare).
        rAF = null;
    }
}

if (!rAF) {
    var now = Date.now ? Date.now : function () {
        return new Date().getTime();
    };

    rAF = function(callback) {
        var currTime = now();
        var timeToCall = Math.max(0, 16 - (currTime - lastTime));
        var id = setTimeout(function () {
            callback(currTime + timeToCall);
        }, timeToCall);
        lastTime = currTime + timeToCall;
        return id;
    };

    cAF = function (id) {
        clearTimeout(id);
    };
}

var animationFrame = {
    /**
     * Cross browser version of [requestAnimationFrame]{@link https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame}.
     *
     * Used by Engine in order to establish a render loop.
     *
     * If no (vendor prefixed version of) `requestAnimationFrame` is available,
     * `setTimeout` will be used in order to emulate a render loop running at
     * approximately 60 frames per second.
     *
     * @method  requestAnimationFrame
     *
     * @param   {Function}  callback function to be invoked on the next frame.
     * @return  {Number}    requestId to be used to cancel the request using
     *                      @link{cancelAnimationFrame}.
     */
    requestAnimationFrame: rAF,

    /**
     * Cross browser version of [cancelAnimationFrame]{@link https://developer.mozilla.org/en-US/docs/Web/API/window/cancelAnimationFrame}.
     *
     * Cancels a previously using [requestAnimationFrame]{@link animationFrame#requestAnimationFrame}
     * scheduled request.
     *
     * Used for immediately stopping the render loop within the Engine.
     *
     * @method  cancelAnimationFrame
     *
     * @param   {Number}    requestId of the scheduled callback function
     *                      returned by [requestAnimationFrame]{@link animationFrame#requestAnimationFrame}.
     */
    cancelAnimationFrame: cAF
};

module.exports = animationFrame;

},{}],29:[function(require,module,exports){
/**
 * The MIT License (MIT)
 * 
 * Copyright (c) 2015 Famous Industries Inc.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

module.exports = {
    requestAnimationFrame: require('./animationFrame').requestAnimationFrame,
    cancelAnimationFrame: require('./animationFrame').cancelAnimationFrame
};

},{"./animationFrame":28}],30:[function(require,module,exports){
/**
 * The MIT License (MIT)
 * 
 * Copyright (c) 2015 Famous Industries Inc.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var polyfills = require('../polyfills');
var rAF = polyfills.requestAnimationFrame;
var cAF = polyfills.cancelAnimationFrame;

/**
 * Boolean constant indicating whether the RequestAnimationFrameLoop has access to the document.
 * The document is being used in order to subscribe for visibilitychange events
 * used for normalizing the RequestAnimationFrameLoop time when e.g. when switching tabs.
 * 
 * @constant
 * @type {Boolean}
 */ 
var DOCUMENT_ACCESS = typeof document !== 'undefined';

if (DOCUMENT_ACCESS) {
    var VENDOR_HIDDEN, VENDOR_VISIBILITY_CHANGE;

    // Opera 12.10 and Firefox 18 and later support
    if (typeof document.hidden !== 'undefined') {
        VENDOR_HIDDEN = 'hidden';
        VENDOR_VISIBILITY_CHANGE = 'visibilitychange';
    }
    else if (typeof document.mozHidden !== 'undefined') {
        VENDOR_HIDDEN = 'mozHidden';
        VENDOR_VISIBILITY_CHANGE = 'mozvisibilitychange';
    }
    else if (typeof document.msHidden !== 'undefined') {
        VENDOR_HIDDEN = 'msHidden';
        VENDOR_VISIBILITY_CHANGE = 'msvisibilitychange';
    }
    else if (typeof document.webkitHidden !== 'undefined') {
        VENDOR_HIDDEN = 'webkitHidden';
        VENDOR_VISIBILITY_CHANGE = 'webkitvisibilitychange';
    }
}

/**
 * RequestAnimationFrameLoop class used for updating objects on a frame-by-frame. Synchronizes the
 * `update` method invocations to the refresh rate of the screen. Manages
 * the `requestAnimationFrame`-loop by normalizing the passed in timestamp
 * when switching tabs.
 * 
 * @class RequestAnimationFrameLoop
 */
function RequestAnimationFrameLoop() {
    var _this = this;
    
    // References to objects to be updated on next frame.
    this._updates = [];
    
    this._looper = function(time) {
        _this.loop(time);
    };
    this._time = 0;
    this._stoppedAt = 0;
    this._sleep = 0;
    
    // Indicates whether the engine should be restarted when the tab/ window is
    // being focused again (visibility change).
    this._startOnVisibilityChange = true;
    
    // requestId as returned by requestAnimationFrame function;
    this._rAF = null;
    
    this._sleepDiff = true;
    
    // The engine is being started on instantiation.
    // TODO(alexanderGugel)
    this.start();

    // The RequestAnimationFrameLoop supports running in a non-browser environment (e.g. Worker).
    if (DOCUMENT_ACCESS) {
        document.addEventListener(VENDOR_VISIBILITY_CHANGE, function() {
            _this._onVisibilityChange();
        });
    }
}

/**
 * Handle the switching of tabs.
 *
 * @method
 * _private
 * 
 * @return {undefined} undefined
 */
RequestAnimationFrameLoop.prototype._onVisibilityChange = function _onVisibilityChange() {
    if (document[VENDOR_HIDDEN]) {
        this._onUnfocus();
    }
    else {
        this._onFocus();
    }
};

/**
 * Internal helper function to be invoked as soon as the window/ tab is being
 * focused after a visibiltiy change.
 * 
 * @method
 * @private
 *
 * @return {undefined} undefined
 */ 
RequestAnimationFrameLoop.prototype._onFocus = function _onFocus() {
    if (this._startOnVisibilityChange) {
        this._start();
    }
};

/**
 * Internal helper function to be invoked as soon as the window/ tab is being
 * unfocused (hidden) after a visibiltiy change.
 * 
 * @method  _onFocus
 * @private
 *
 * @return {undefined} undefined
 */ 
RequestAnimationFrameLoop.prototype._onUnfocus = function _onUnfocus() {
    this._stop();
};

/**
 * Starts the RequestAnimationFrameLoop. When switching to a differnt tab/ window (changing the
 * visibiltiy), the engine will be retarted when switching back to a visible
 * state.
 *
 * @method
 * 
 * @return {RequestAnimationFrameLoop} this
 */
RequestAnimationFrameLoop.prototype.start = function start() {
    if (!this._running) {
        this._startOnVisibilityChange = true;
        this._start();
    }
    return this;
};

/**
 * Internal version of RequestAnimationFrameLoop's start function, not affecting behavior on visibilty
 * change.
 * 
 * @method
 * @private
*
 * @return {undefined} undefined
 */ 
RequestAnimationFrameLoop.prototype._start = function _start() {
    this._running = true;
    this._sleepDiff = true;
    this._rAF = rAF(this._looper);
};

/**
 * Stops the RequestAnimationFrameLoop.
 *
 * @method
 * 
 * @return {RequestAnimationFrameLoop} this
 */
RequestAnimationFrameLoop.prototype.stop = function stop() {
    if (this._running) {
        this._startOnVisibilityChange = false;
        this._stop();
    }
    return this;
};

/**
 * Internal version of RequestAnimationFrameLoop's stop function, not affecting behavior on visibilty
 * change.
 * 
 * @method
 * @private
 *
 * @return {undefined} undefined
 */ 
RequestAnimationFrameLoop.prototype._stop = function _stop() {
    this._running = false;
    this._stoppedAt = this._time;

    // Bug in old versions of Fx. Explicitly cancel.
    cAF(this._rAF);
};

/**
 * Determines whether the RequestAnimationFrameLoop is currently running or not.
 *
 * @method
 * 
 * @return {Boolean} boolean value indicating whether the RequestAnimationFrameLoop is currently running or not
 */
RequestAnimationFrameLoop.prototype.isRunning = function isRunning() {
    return this._running;
};

/**
 * Updates all registered objects.
 *
 * @method
 * 
 * @param {Number} time high resolution timstamp used for invoking the `update` method on all registered objects
 *
 * @return {RequestAnimationFrameLoop} this
 */
RequestAnimationFrameLoop.prototype.step = function step (time) {
    this._time = time;
    if (this._sleepDiff) {
        this._sleep += time - this._stoppedAt;
        this._sleepDiff = false;
    }
    
    // The same timetamp will be emitted immediately before and after visibility
    // change.
    var normalizedTime = time - this._sleep;
    for (var i = 0, len = this._updates.length ; i < len ; i++) {
        this._updates[i].update(normalizedTime);
    }
    return this;
};

/**
 * Method being called by `requestAnimationFrame` on every paint. Indirectly
 * recursive by scheduling a future invocation of itself on the next paint.
 *
 * @method
 * 
 * @param {Number} time high resolution timstamp used for invoking the `update` method on all registered objects
 * @return {RequestAnimationFrameLoop} this
 */
RequestAnimationFrameLoop.prototype.loop = function loop(time) {
    this.step(time);
    this._rAF = rAF(this._looper);
    return this;
};

/**
 * Registeres an updateable object which `update` method should be invoked on
 * every paint, starting on the next paint (assuming the RequestAnimationFrameLoop is running).
 *
 * @method
 * 
 * @param {Object} updateable object to be updated
 * @param {Function} updateable.update update function to be called on the registered object
 *
 * @return {RequestAnimationFrameLoop} this
 */
RequestAnimationFrameLoop.prototype.update = function update(updateable) {
    if (this._updates.indexOf(updateable) === -1) {
        this._updates.push(updateable);
    }
    return this;
};

/**
 * Deregisters an updateable object previously registered using `update` to be
 * no longer updated.
 *
 * @method
 * 
 * @param {Object} updateable updateable object previously registered using `update`
 *
 * @return {RequestAnimationFrameLoop} this
 */
RequestAnimationFrameLoop.prototype.noLongerUpdate = function noLongerUpdate(updateable) {
    var index = this._updates.indexOf(updateable);
    if (index > -1) {
        this._updates.splice(index, 1);
    }
    return this;
};

module.exports = RequestAnimationFrameLoop;

},{"../polyfills":29}],31:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var Context = require('./Context');
var injectCSS = require('./inject-css');

/**
 * Instantiates a new Compositor.
 * The Compositor receives draw commands frm the UIManager and routes the to the
 * respective context objects.
 *
 * Upon creation, it injects a stylesheet used for styling the individual
 * renderers used in the context objects.
 *
 * @class Compositor
 * @constructor
 * @return {undefined} undefined
 */
function Compositor() {
    injectCSS();

    this._contexts = {};
    this._outCommands = [];
    this._inCommands = [];
    this._time = null;

    this._resized = false;

    var _this = this;
    window.addEventListener('resize', function() {
        _this._resized = true;
    });
}

/**
 * Retrieves the time being used by the internal clock managed by
 * `FamousEngine`.
 *
 * The time is being passed into core by the Engine through the UIManager.
 * Since core has the ability to scale the time, the time needs to be passed
 * back to the rendering system.
 *
 * @method
 *
 * @return {Number} time The clock time used in core.
 */
Compositor.prototype.getTime = function getTime() {
    return this._time;
};

/**
 * Schedules an event to be sent the next time the out command queue is being
 * flushed.
 *
 * @method
 * @private
 *
 * @param  {String} path Render path to the node the event should be triggered
 * on (*targeted event*)
 * @param  {String} ev Event type
 * @param  {Object} payload Event object (serializable using structured cloning
 * algorithm)
 *
 * @return {undefined} undefined
 */
Compositor.prototype.sendEvent = function sendEvent(path, ev, payload) {
    this._outCommands.push('WITH', path, 'TRIGGER', ev, payload);
};

/**
 * Internal helper method used for notifying externally
 * resized contexts (e.g. by resizing the browser window).
 *
 * @method
 * @private
 *
 * @param  {String} selector render path to the node (context) that should be
 * resized
 * @param  {Array} size new context size
 *
 * @return {undefined} undefined
 */
Compositor.prototype.sendResize = function sendResize (selector, size) {
    this.sendEvent(selector, 'CONTEXT_RESIZE', size);
};

/**
 * Internal helper method used by `drawCommands`.
 * Subsequent commands are being associated with the node defined the the path
 * following the `WITH` command.
 *
 * @method
 * @private
 *
 * @param  {Number} iterator position index within the commands queue
 * @param  {Array} commands remaining message queue received, used to
 * shift single messages from
 *
 * @return {undefined} undefined
 */
Compositor.prototype.handleWith = function handleWith (iterator, commands) {
    var path = commands[iterator];
    var pathArr = path.split('/');
    var context = this.getOrSetContext(pathArr.shift());
    return context.receive(path, commands, iterator);
};

/**
 * Retrieves the top-level Context associated with the passed in document
 * query selector. If no such Context exists, a new one will be instantiated.
 *
 * @method
 * @private
 *
 * @param  {String} selector document query selector used for retrieving the
 * DOM node the VirtualElement should be attached to
 *
 * @return {Context} context
 */
Compositor.prototype.getOrSetContext = function getOrSetContext(selector) {
    if (this._contexts[selector]) {
        return this._contexts[selector];
    }
    else {
        var context = new Context(selector, this);
        this._contexts[selector] = context;
        return context;
    }
};

/**
 * Internal helper method used by `drawCommands`.
 *
 * @method
 * @private
 *
 * @param  {Number} iterator position index within the command queue
 * @param  {Array} commands remaining message queue received, used to
 * shift single messages
 *
 * @return {undefined} undefined
 */
Compositor.prototype.giveSizeFor = function giveSizeFor(iterator, commands) {
    var selector = commands[iterator];
    var size = this.getOrSetContext(selector).getRootSize();
    this.sendResize(selector, size);
};

/**
 * Processes the previously via `receiveCommands` updated incoming "in"
 * command queue.
 * Called by UIManager on a frame by frame basis.
 *
 * @method
 *
 * @return {Array} outCommands set of commands to be sent back
 */
Compositor.prototype.drawCommands = function drawCommands() {
    var commands = this._inCommands;
    var localIterator = 0;
    var command = commands[localIterator];
    while (command) {
        switch (command) {
            case 'TIME':
                this._time = commands[++localIterator];
                break;
            case 'WITH':
                localIterator = this.handleWith(++localIterator, commands);
                break;
            case 'NEED_SIZE_FOR':
                this.giveSizeFor(++localIterator, commands);
                break;
        }
        command = commands[++localIterator];
    }

    // TODO: Switch to associative arrays here...

    for (var key in this._contexts) {
        this._contexts[key].draw();
    }

    if (this._resized) {
        this.updateSize();
    }

    return this._outCommands;
};


/**
 * Updates the size of all previously registered context objects.
 * This results into CONTEXT_RESIZE events being sent and the root elements
 * used by the individual renderers being resized to the the DOMRenderer's root
 * size.
 *
 * @method
 *
 * @return {undefined} undefined
 */
Compositor.prototype.updateSize = function updateSize() {
    for (var selector in this._contexts) {
        this._contexts[selector].updateSize();
    }
};

/**
 * Used by ThreadManager to update the internal queue of incoming commands.
 * Receiving commands does not immediately start the rendering process.
 *
 * @method
 *
 * @param  {Array} commands command queue to be processed by the compositor's
 * `drawCommands` method
 *
 * @return {undefined} undefined
 */
Compositor.prototype.receiveCommands = function receiveCommands(commands) {
    var len = commands.length;
    for (var i = 0; i < len; i++) {
        this._inCommands.push(commands[i]);
    }
};

/**
 * Flushes the queue of outgoing "out" commands.
 * Called by ThreadManager.
 *
 * @method
 *
 * @return {undefined} undefined
 */
Compositor.prototype.clearCommands = function clearCommands() {
    this._inCommands.length = 0;
    this._outCommands.length = 0;
    this._resized = false;
};

module.exports = Compositor;

},{"./Context":32,"./inject-css":34}],32:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var WebGLRenderer = require('../webgl-renderers/WebGLRenderer');
var Camera = require('../components/Camera');
var DOMRenderer = require('../dom-renderers/DOMRenderer');

/**
 * Context is a render layer with its own WebGLRenderer and DOMRenderer.
 * It is the interface between the Compositor which receives commands
 * and the renderers that interpret them. It also relays information to
 * the renderers about resizing.
 *
 * The DOMElement at the given query selector is used as the root. A
 * new DOMElement is appended to this root element, and used as the
 * parent element for all Famous DOM rendering at this context. A
 * canvas is added and used for all WebGL rendering at this context.
 *
 * @class Context
 * @constructor
 *
 * @param {String} selector Query selector used to locate root element of
 * context layer.
 * @param {Compositor} compositor Compositor reference to pass down to
 * WebGLRenderer.
 *
 * @return {undefined} undefined
 */
function Context(selector, compositor) {
    this._compositor = compositor;
    this._rootEl = document.querySelector(selector);

    this._selector = selector;

    // Create DOM element to be used as root for all famous DOM
    // rendering and append element to the root element.

    var DOMLayerEl = document.createElement('div');
    this._rootEl.appendChild(DOMLayerEl);

    // Instantiate renderers

    this.DOMRenderer = new DOMRenderer(DOMLayerEl, selector, compositor);
    this.WebGLRenderer = null;
    this.canvas = null;

    // State holders

    this._renderState = {
        projectionType: Camera.ORTHOGRAPHIC_PROJECTION,
        perspectiveTransform: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
        viewTransform: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
        viewDirty: false,
        perspectiveDirty: false
    };

    this._size = [];
    this._children = {};
    this._elementHash = {};

    this._meshTransform = [];
    this._meshSize = [0, 0, 0];
}

/**
 * Queries DOMRenderer size and updates canvas size. Relays size information to
 * WebGLRenderer.
 *
 * @return {Context} this
 */
Context.prototype.updateSize = function () {
    var newSize = this.DOMRenderer.getSize();
    this._compositor.sendResize(this._selector, newSize);

    var width = newSize[0];
    var height = newSize[1];

    this._size[0] = width;
    this._size[1] = height;
    this._size[2] = (width > height) ? width : height;

    if (this.canvas) {
        this.canvas.width  = width;
        this.canvas.height = height;
    }

    if (this.WebGLRenderer) this.WebGLRenderer.updateSize(this._size);

    return this;
};

/**
 * Draw function called after all commands have been handled for current frame.
 * Issues draw commands to all renderers with current renderState.
 *
 * @method
 *
 * @return {undefined} undefined
 */
Context.prototype.draw = function draw() {
    this.DOMRenderer.draw(this._renderState);
    if (this.WebGLRenderer) this.WebGLRenderer.draw(this._renderState);

    if (this._renderState.perspectiveDirty) this._renderState.perspectiveDirty = false;
    if (this._renderState.viewDirty) this._renderState.viewDirty = false;
};

/**
 * Gets the size of the parent element of the DOMRenderer for this context.
 *
 * @method
 *
 * @return {undefined} undefined
 */
Context.prototype.getRootSize = function getRootSize() {
    return this.DOMRenderer.getSize();
};

/**
 * Handles initialization of WebGLRenderer when necessary, including creation
 * of the canvas element and instantiation of the renderer. Also updates size
 * to pass size information to the renderer.
 *
 * @method
 *
 * @return {undefined} undefined
 */
Context.prototype.initWebGL = function initWebGL() {
    this.canvas = document.createElement('canvas');
    this._rootEl.appendChild(this.canvas);
    this.WebGLRenderer = new WebGLRenderer(this.canvas, this._compositor);
    this.updateSize();
};

/**
 * Handles delegation of commands to renderers of this context.
 *
 * @method
 *
 * @param {String} path String used as identifier of a given node in the
 * scene graph.
 * @param {Array} commands List of all commands from this frame.
 * @param {Number} iterator Number indicating progress through the command
 * queue.
 *
 * @return {Number} iterator indicating progress through the command queue.
 */
Context.prototype.receive = function receive(path, commands, iterator) {
    var localIterator = iterator;

    var command = commands[++localIterator];
    this.DOMRenderer.loadPath(path);
    this.DOMRenderer.findTarget();
    while (command) {

        switch (command) {
            case 'INIT_DOM':
                this.DOMRenderer.insertEl(commands[++localIterator]);
                break;

            case 'DOM_RENDER_SIZE':
                this.DOMRenderer.getSizeOf(commands[++localIterator]);
                break;

            case 'CHANGE_TRANSFORM':
                for (var i = 0 ; i < 16 ; i++) this._meshTransform[i] = commands[++localIterator];

                this.DOMRenderer.setMatrix(this._meshTransform);

                if (this.WebGLRenderer)
                    this.WebGLRenderer.setCutoutUniform(path, 'u_transform', this._meshTransform);

                break;

            case 'CHANGE_SIZE':
                var width = commands[++localIterator];
                var height = commands[++localIterator];

                this.DOMRenderer.setSize(width, height);
                if (this.WebGLRenderer) {
                    this._meshSize[0] = width;
                    this._meshSize[1] = height;
                    this.WebGLRenderer.setCutoutUniform(path, 'u_size', this._meshSize);
                }
                break;

            case 'CHANGE_PROPERTY':
                if (this.WebGLRenderer) this.WebGLRenderer.getOrSetCutout(path);
                this.DOMRenderer.setProperty(commands[++localIterator], commands[++localIterator]);
                break;

            case 'CHANGE_CONTENT':
                if (this.WebGLRenderer) this.WebGLRenderer.getOrSetCutout(path);
                this.DOMRenderer.setContent(commands[++localIterator]);
                break;

            case 'CHANGE_ATTRIBUTE':
                if (this.WebGLRenderer) this.WebGLRenderer.getOrSetCutout(path);
                this.DOMRenderer.setAttribute(commands[++localIterator], commands[++localIterator]);
                break;

            case 'ADD_CLASS':
                if (this.WebGLRenderer) this.WebGLRenderer.getOrSetCutout(path);
                this.DOMRenderer.addClass(commands[++localIterator]);
                break;

            case 'REMOVE_CLASS':
                if (this.WebGLRenderer) this.WebGLRenderer.getOrSetCutout(path);
                this.DOMRenderer.removeClass(commands[++localIterator]);
                break;

            case 'SUBSCRIBE':
                if (this.WebGLRenderer) this.WebGLRenderer.getOrSetCutout(path);
                this.DOMRenderer.subscribe(commands[++localIterator], commands[++localIterator]);
                break;

            case 'GL_SET_DRAW_OPTIONS':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.setMeshOptions(path, commands[++localIterator]);
                break;

            case 'GL_AMBIENT_LIGHT':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.setAmbientLightColor(
                    path,
                    commands[++localIterator],
                    commands[++localIterator],
                    commands[++localIterator]
                );
                break;

            case 'GL_LIGHT_POSITION':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.setLightPosition(
                    path,
                    commands[++localIterator],
                    commands[++localIterator],
                    commands[++localIterator]
                );
                break;

            case 'GL_LIGHT_COLOR':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.setLightColor(
                    path,
                    commands[++localIterator],
                    commands[++localIterator],
                    commands[++localIterator]
                );
                break;

            case 'MATERIAL_INPUT':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.handleMaterialInput(
                    path,
                    commands[++localIterator],
                    commands[++localIterator]
                );
                break;

            case 'GL_SET_GEOMETRY':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.setGeometry(
                    path,
                    commands[++localIterator],
                    commands[++localIterator],
                    commands[++localIterator]
                );
                break;

            case 'GL_UNIFORMS':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.setMeshUniform(
                    path,
                    commands[++localIterator],
                    commands[++localIterator]
                );
                break;

            case 'GL_BUFFER_DATA':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.bufferData(
                    path,
                    commands[++localIterator],
                    commands[++localIterator],
                    commands[++localIterator],
                    commands[++localIterator],
                    commands[++localIterator]
                );
                break;

            case 'GL_CUTOUT_STATE':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.setCutoutState(path, commands[++localIterator]);
                break;

            case 'GL_MESH_VISIBILITY':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.setMeshVisibility(path, commands[++localIterator]);
                break;

            case 'GL_REMOVE_MESH':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.removeMesh(path);
                break;

            case 'PINHOLE_PROJECTION':
                this._renderState.projectionType = Camera.PINHOLE_PROJECTION;
                this._renderState.perspectiveTransform[11] = -1 / commands[++localIterator];

                this._renderState.perspectiveDirty = true;
                break;

            case 'ORTHOGRAPHIC_PROJECTION':
                this._renderState.projectionType = Camera.ORTHOGRAPHIC_PROJECTION;
                this._renderState.perspectiveTransform[11] = 0;

                this._renderState.perspectiveDirty = true;
                break;

            case 'CHANGE_VIEW_TRANSFORM':
                this._renderState.viewTransform[0] = commands[++localIterator];
                this._renderState.viewTransform[1] = commands[++localIterator];
                this._renderState.viewTransform[2] = commands[++localIterator];
                this._renderState.viewTransform[3] = commands[++localIterator];

                this._renderState.viewTransform[4] = commands[++localIterator];
                this._renderState.viewTransform[5] = commands[++localIterator];
                this._renderState.viewTransform[6] = commands[++localIterator];
                this._renderState.viewTransform[7] = commands[++localIterator];

                this._renderState.viewTransform[8] = commands[++localIterator];
                this._renderState.viewTransform[9] = commands[++localIterator];
                this._renderState.viewTransform[10] = commands[++localIterator];
                this._renderState.viewTransform[11] = commands[++localIterator];

                this._renderState.viewTransform[12] = commands[++localIterator];
                this._renderState.viewTransform[13] = commands[++localIterator];
                this._renderState.viewTransform[14] = commands[++localIterator];
                this._renderState.viewTransform[15] = commands[++localIterator];

                this._renderState.viewDirty = true;
                break;

            case 'WITH': return localIterator - 1;
        }

        command = commands[++localIterator];
    }

    return localIterator;
};

module.exports = Context;

},{"../components/Camera":1,"../dom-renderers/DOMRenderer":11,"../webgl-renderers/WebGLRenderer":47}],33:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * The UIManager is being updated by an Engine by consecutively calling its
 * `update` method. It can either manage a real Web-Worker or the global
 * FamousEngine core singleton.
 *
 * @example
 * var compositor = new Compositor();
 * var engine = new Engine();
 *
 * // Using a Web Worker
 * var worker = new Worker('worker.bundle.js');
 * var threadmanger = new UIManager(worker, compositor, engine);
 *
 * // Without using a Web Worker
 * var threadmanger = new UIManager(Famous, compositor, engine);
 *
 * @class  UIManager
 * @constructor
 *
 * @param {Famous|Worker} thread The thread being used to receive messages
 * from and post messages to. Expected to expose a WebWorker-like API, which
 * means providing a way to listen for updates by setting its `onmessage`
 * property and sending updates using `postMessage`.
 * @param {Compositor} compositor an instance of Compositor used to extract
 * enqueued draw commands from to be sent to the thread.
 * @param {RenderLoop} renderLoop an instance of Engine used for executing
 * the `ENGINE` commands on.
 */
function UIManager (thread, compositor, renderLoop) {
    this._thread = thread;
    this._compositor = compositor;
    this._renderLoop = renderLoop;

    this._renderLoop.update(this);

    var _this = this;
    this._thread.onmessage = function (ev) {
        var message = ev.data ? ev.data : ev;
        if (message[0] === 'ENGINE') {
            switch (message[1]) {
                case 'START':
                    _this._renderLoop.start();
                    break;
                case 'STOP':
                    _this._renderLoop.stop();
                    break;
                default:
                    console.error(
                        'Unknown ENGINE command "' + message[1] + '"'
                    );
                    break;
            }
        }
        else {
            _this._compositor.receiveCommands(message);
        }
    };
    this._thread.onerror = function (error) {
        console.error(error);
    };
}

/**
 * Returns the thread being used by the UIManager.
 * This could either be an an actual web worker or a `FamousEngine` singleton.
 *
 * @method
 *
 * @return {Worker|FamousEngine} Either a web worker or a `FamousEngine` singleton.
 */
UIManager.prototype.getThread = function getThread() {
    return this._thread;
};

/**
 * Returns the compositor being used by this UIManager.
 *
 * @method
 *
 * @return {Compositor} The compositor used by the UIManager.
 */
UIManager.prototype.getCompositor = function getCompositor() {
    return this._compositor;
};

/**
 * Returns the engine being used by this UIManager.
 *
 * @method
 *
 * @return {Engine} The engine used by the UIManager.
 */
UIManager.prototype.getEngine = function getEngine() {
    return this._renderLoop;
};

/**
 * Update method being invoked by the Engine on every `requestAnimationFrame`.
 * Used for updating the notion of time within the managed thread by sending
 * a FRAME command and sending messages to
 *
 * @method
 *
 * @param  {Number} time unix timestamp to be passed down to the worker as a
 * FRAME command
 * @return {undefined} undefined
 */
UIManager.prototype.update = function update (time) {
    this._thread.postMessage(['FRAME', time]);
    var threadMessages = this._compositor.drawCommands();
    this._thread.postMessage(threadMessages);
    this._compositor.clearCommands();
};

module.exports = UIManager;

},{}],34:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var css = '.famous-dom-renderer {' +
    'width:100%;' +
    'height:100%;' +
    'transform-style:preserve-3d;' +
    '-webkit-transform-style:preserve-3d;' +
'}' +

'.famous-dom-element {' +
    '-webkit-transform-origin:0% 0%;' +
    'transform-origin:0% 0%;' +
    '-webkit-backface-visibility:visible;' +
    'backface-visibility:visible;' +
    '-webkit-transform-style:preserve-3d;' +
    'transform-style:preserve-3d;' +
    '-webkit-tap-highlight-color:transparent;' +
    'pointer-events:auto;' +
    'z-index:1;' +
'}' +

'.famous-dom-element-content,' +
'.famous-dom-element {' +
    'position:absolute;' +
    'box-sizing:border-box;' +
    '-moz-box-sizing:border-box;' +
    '-webkit-box-sizing:border-box;' +
'}' +

'.famous-webgl-renderer {' +
    '-webkit-transform: translateZ(1000000px);' +  /* TODO: Fix when Safari Fixes*/
    'transform: translateZ(1000000px)' +
    'pointer-events:none;' +
    'position:absolute;' +
    'z-index:1;' +
    'top:0;' +
    'left:0;' +
'}';

var INJECTED = typeof document === 'undefined';

function injectCSS() {
    if (INJECTED) return;
    INJECTED = true;
    if (document.createStyleSheet) {
        var sheet = document.createStyleSheet();
        sheet.cssText = css;
    }
    else {
        var head = document.getElementsByTagName('head')[0];
        var style = document.createElement('style');

        if (style.styleSheet) {
            style.styleSheet.cssText = css;
        }
        else {
            style.appendChild(document.createTextNode(css));
        }

        (head ? head : document.documentElement).appendChild(style);
    }
}

module.exports = injectCSS;

},{}],35:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * Deep clone an object.
 *
 * @method  clone
 *
 * @param {Object} b       Object to be cloned.
 * @return {Object} a      Cloned object (deep equality).
 */
var clone = function clone(b) {
    var a;
    if (typeof b === 'object') {
        a = (b instanceof Array) ? [] : {};
        for (var key in b) {
            if (typeof b[key] === 'object' && b[key] !== null) {
                if (b[key] instanceof Array) {
                    a[key] = new Array(b[key].length);
                    for (var i = 0; i < b[key].length; i++) {
                        a[key][i] = clone(b[key][i]);
                    }
                }
                else {
                  a[key] = clone(b[key]);
                }
            }
            else {
                a[key] = b[key];
            }
        }
    }
    else {
        a = b;
    }
    return a;
};

module.exports = clone;

},{}],36:[function(require,module,exports){
'use strict';

/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * Takes an object containing keys and values and returns an object
 * comprising two "associate" arrays, one with the keys and the other
 * with the values.
 *
 * @method keyValuesToArrays
 *
 * @param {Object} obj                      Objects where to extract keys and values
 *                                          from.
 * @return {Object}         result
 *         {Array.<String>} result.keys     Keys of `result`, as returned by
 *                                          `Object.keys()`
 *         {Array}          result.values   Values of passed in object.
 */
module.exports = function keyValuesToArrays(obj) {
    var keysArray = [], valuesArray = [];
    var i = 0;
    for(var key in obj) {
        if (obj.hasOwnProperty(key)) {
            keysArray[i] = key;
            valuesArray[i] = obj[key];
            i++;
        }
    }
    return {
        keys: keysArray,
        values: valuesArray
    };
};

},{}],37:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var PREFIXES = ['', '-ms-', '-webkit-', '-moz-', '-o-'];

/**
 * A helper function used for determining the vendor prefixed version of the
 * passed in CSS property.
 *
 * Vendor checks are being conducted in the following order:
 *
 * 1. (no prefix)
 * 2. `-mz-`
 * 3. `-webkit-`
 * 4. `-moz-`
 * 5. `-o-`
 *
 * @method vendorPrefix
 *
 * @param {String} property     CSS property (no camelCase), e.g.
 *                              `border-radius`.
 * @return {String} prefixed    Vendor prefixed version of passed in CSS
 *                              property (e.g. `-webkit-border-radius`).
 */
function vendorPrefix(property) {
    for (var i = 0; i < PREFIXES.length; i++) {
        var prefixed = PREFIXES[i] + property;
        if (document.documentElement.style[prefixed] === '') {
            return prefixed;
        }
    }
    return property;
}

module.exports = vendorPrefix;

},{}],38:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var GeometryIds = 0;

/**
 * Geometry is a component that defines and manages data
 * (vertex data and attributes) that is used to draw to WebGL.
 *
 * @class Geometry
 * @constructor
 *
 * @param {Object} options instantiation options
 * @return {undefined} undefined
 */
function Geometry(options) {
    this.options = options || {};
    this.DEFAULT_BUFFER_SIZE = 3;

    this.spec = {
        id: GeometryIds++,
        dynamic: false,
        type: this.options.type || 'TRIANGLES',
        bufferNames: [],
        bufferValues: [],
        bufferSpacings: [],
        invalidations: []
    };

    if (this.options.buffers) {
        var len = this.options.buffers.length;
        for (var i = 0; i < len;) {
            this.spec.bufferNames.push(this.options.buffers[i].name);
            this.spec.bufferValues.push(this.options.buffers[i].data);
            this.spec.bufferSpacings.push(this.options.buffers[i].size || this.DEFAULT_BUFFER_SIZE);
            this.spec.invalidations.push(i++);
        }
    }
}

module.exports = Geometry;

},{}],39:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var Vec3 = require('../math/Vec3');
var Vec2 = require('../math/Vec2');

var outputs = [
    new Vec3(),
    new Vec3(),
    new Vec3(),
    new Vec2(),
    new Vec2()
];

/**
 * A helper object used to calculate buffers for complicated geometries.
 * Tailored for the WebGLRenderer, used by most primitives.
 *
 * @static
 * @class GeometryHelper
 * @return {undefined} undefined
 */
var GeometryHelper = {};

/**
 * A function that iterates through vertical and horizontal slices
 * based on input detail, and generates vertices and indices for each
 * subdivision.
 *
 * @static
 * @method
 *
 * @param  {Number} detailX Amount of slices to iterate through.
 * @param  {Number} detailY Amount of stacks to iterate through.
 * @param  {Function} func Function used to generate vertex positions at each point.
 * @param  {Boolean} wrap Optional parameter (default: Pi) for setting a custom wrap range
 *
 * @return {Object} Object containing generated vertices and indices.
 */
GeometryHelper.generateParametric = function generateParametric(detailX, detailY, func, wrap) {
    var vertices = [];
    var i;
    var theta;
    var phi;
    var j;

    // We can wrap around slightly more than once for uv coordinates to look correct.

    var Xrange = wrap ? Math.PI + (Math.PI / (detailX - 1)) : Math.PI;
    var out = [];

    for (i = 0; i < detailX + 1; i++) {
        theta = i * Xrange / detailX;
        for (j = 0; j < detailY; j++) {
            phi = j * 2.0 * Xrange / detailY;
            func(theta, phi, out);
            vertices.push(out[0], out[1], out[2]);
        }
    }

    var indices = [],
        v = 0,
        next;
    for (i = 0; i < detailX; i++) {
        for (j = 0; j < detailY; j++) {
            next = (j + 1) % detailY;
            indices.push(v + j, v + j + detailY, v + next);
            indices.push(v + next, v + j + detailY, v + next + detailY);
        }
        v += detailY;
    }

    return {
        vertices: vertices,
        indices: indices
    };
};

/**
 * Calculates normals belonging to each face of a geometry.
 * Assumes clockwise declaration of vertices.
 *
 * @static
 * @method
 *
 * @param {Array} vertices Vertices of all points on the geometry.
 * @param {Array} indices Indices declaring faces of geometry.
 * @param {Array} out Array to be filled and returned.
 *
 * @return {Array} Calculated face normals.
 */
GeometryHelper.computeNormals = function computeNormals(vertices, indices, out) {
    var normals = out || [];
    var indexOne;
    var indexTwo;
    var indexThree;
    var normal;
    var j;
    var len = indices.length / 3;
    var i;
    var x;
    var y;
    var z;
    var length;

    for (i = 0; i < len; i++) {
        indexTwo = indices[i*3 + 0] * 3;
        indexOne = indices[i*3 + 1] * 3;
        indexThree = indices[i*3 + 2] * 3;

        outputs[0].set(vertices[indexOne], vertices[indexOne + 1], vertices[indexOne + 2]);
        outputs[1].set(vertices[indexTwo], vertices[indexTwo + 1], vertices[indexTwo + 2]);
        outputs[2].set(vertices[indexThree], vertices[indexThree + 1], vertices[indexThree + 2]);

        normal = outputs[2].subtract(outputs[0]).cross(outputs[1].subtract(outputs[0])).normalize();

        normals[indexOne + 0] = (normals[indexOne + 0] || 0) + normal.x;
        normals[indexOne + 1] = (normals[indexOne + 1] || 0) + normal.y;
        normals[indexOne + 2] = (normals[indexOne + 2] || 0) + normal.z;

        normals[indexTwo + 0] = (normals[indexTwo + 0] || 0) + normal.x;
        normals[indexTwo + 1] = (normals[indexTwo + 1] || 0) + normal.y;
        normals[indexTwo + 2] = (normals[indexTwo + 2] || 0) + normal.z;

        normals[indexThree + 0] = (normals[indexThree + 0] || 0) + normal.x;
        normals[indexThree + 1] = (normals[indexThree + 1] || 0) + normal.y;
        normals[indexThree + 2] = (normals[indexThree + 2] || 0) + normal.z;
    }

    for (i = 0; i < normals.length; i += 3) {
        x = normals[i];
        y = normals[i+1];
        z = normals[i+2];
        length = Math.sqrt(x * x + y * y + z * z);
        for(j = 0; j< 3; j++) {
            normals[i+j] /= length;
        }
    }

    return normals;
};

/**
 * Divides all inserted triangles into four sub-triangles. Alters the
 * passed in arrays.
 *
 * @static
 * @method
 *
 * @param {Array} indices Indices declaring faces of geometry
 * @param {Array} vertices Vertices of all points on the geometry
 * @param {Array} textureCoords Texture coordinates of all points on the geometry
 * @return {undefined} undefined
 */
GeometryHelper.subdivide = function subdivide(indices, vertices, textureCoords) {
    var triangleIndex = indices.length / 3;
    var face;
    var i;
    var j;
    var k;
    var pos;
    var tex;

    while (triangleIndex--) {
        face = indices.slice(triangleIndex * 3, triangleIndex * 3 + 3);

        pos = face.map(function(vertIndex) {
            return new Vec3(vertices[vertIndex * 3], vertices[vertIndex * 3 + 1], vertices[vertIndex * 3 + 2]);
        });
        vertices.push.apply(vertices, Vec3.scale(Vec3.add(pos[0], pos[1], outputs[0]), 0.5, outputs[1]).toArray());
        vertices.push.apply(vertices, Vec3.scale(Vec3.add(pos[1], pos[2], outputs[0]), 0.5, outputs[1]).toArray());
        vertices.push.apply(vertices, Vec3.scale(Vec3.add(pos[0], pos[2], outputs[0]), 0.5, outputs[1]).toArray());

        if (textureCoords) {
            tex = face.map(function(vertIndex) {
                return new Vec2(textureCoords[vertIndex * 2], textureCoords[vertIndex * 2 + 1]);
            });
            textureCoords.push.apply(textureCoords, Vec2.scale(Vec2.add(tex[0], tex[1], outputs[3]), 0.5, outputs[4]).toArray());
            textureCoords.push.apply(textureCoords, Vec2.scale(Vec2.add(tex[1], tex[2], outputs[3]), 0.5, outputs[4]).toArray());
            textureCoords.push.apply(textureCoords, Vec2.scale(Vec2.add(tex[0], tex[2], outputs[3]), 0.5, outputs[4]).toArray());
        }

        i = vertices.length - 3;
        j = i + 1;
        k = i + 2;

        indices.push(i, j, k);
        indices.push(face[0], i, k);
        indices.push(i, face[1], j);
        indices[triangleIndex] = k;
        indices[triangleIndex + 1] = j;
        indices[triangleIndex + 2] = face[2];
    }
};

/**
 * Creates duplicate of vertices that are shared between faces.
 * Alters the input vertex and index arrays.
 *
 * @static
 * @method
 *
 * @param {Array} vertices Vertices of all points on the geometry
 * @param {Array} indices Indices declaring faces of geometry
 * @return {undefined} undefined
 */
GeometryHelper.getUniqueFaces = function getUniqueFaces(vertices, indices) {
    var triangleIndex = indices.length / 3,
        registered = [],
        index;

    while (triangleIndex--) {
        for (var i = 0; i < 3; i++) {

            index = indices[triangleIndex * 3 + i];

            if (registered[index]) {
                vertices.push(vertices[index * 3], vertices[index * 3 + 1], vertices[index * 3 + 2]);
                indices[triangleIndex * 3 + i] = vertices.length / 3 - 1;
            }
            else {
                registered[index] = true;
            }
        }
    }
};

/**
 * Divides all inserted triangles into four sub-triangles while maintaining
 * a radius of one. Alters the passed in arrays.
 *
 * @static
 * @method
 *
 * @param {Array} vertices Vertices of all points on the geometry
 * @param {Array} indices Indices declaring faces of geometry
 * @return {undefined} undefined
 */
GeometryHelper.subdivideSpheroid = function subdivideSpheroid(vertices, indices) {
    var triangleIndex = indices.length / 3,
        abc,
        face,
        i, j, k;

    while (triangleIndex--) {
        face = indices.slice(triangleIndex * 3, triangleIndex * 3 + 3);
        abc = face.map(function(vertIndex) {
            return new Vec3(vertices[vertIndex * 3], vertices[vertIndex * 3 + 1], vertices[vertIndex * 3 + 2]);
        });

        vertices.push.apply(vertices, Vec3.normalize(Vec3.add(abc[0], abc[1], outputs[0]), outputs[1]).toArray());
        vertices.push.apply(vertices, Vec3.normalize(Vec3.add(abc[1], abc[2], outputs[0]), outputs[1]).toArray());
        vertices.push.apply(vertices, Vec3.normalize(Vec3.add(abc[0], abc[2], outputs[0]), outputs[1]).toArray());

        i = vertices.length / 3 - 3;
        j = i + 1;
        k = i + 2;

        indices.push(i, j, k);
        indices.push(face[0], i, k);
        indices.push(i, face[1], j);
        indices[triangleIndex * 3] = k;
        indices[triangleIndex * 3 + 1] = j;
        indices[triangleIndex * 3 + 2] = face[2];
    }
};

/**
 * Divides all inserted triangles into four sub-triangles while maintaining
 * a radius of one. Alters the passed in arrays.
 *
 * @static
 * @method
 *
 * @param {Array} vertices Vertices of all points on the geometry
 * @param {Array} out Optional array to be filled with resulting normals.
 *
 * @return {Array} New list of calculated normals.
 */
GeometryHelper.getSpheroidNormals = function getSpheroidNormals(vertices, out) {
    out = out || [];
    var length = vertices.length / 3;
    var normalized;

    for (var i = 0; i < length; i++) {
        normalized = new Vec3(
            vertices[i * 3 + 0],
            vertices[i * 3 + 1],
            vertices[i * 3 + 2]
        ).normalize().toArray();

        out[i * 3 + 0] = normalized[0];
        out[i * 3 + 1] = normalized[1];
        out[i * 3 + 2] = normalized[2];
    }

    return out;
};

/**
 * Calculates texture coordinates for spheroid primitives based on
 * input vertices.
 *
 * @static
 * @method
 *
 * @param {Array} vertices Vertices of all points on the geometry
 * @param {Array} out Optional array to be filled with resulting texture coordinates.
 *
 * @return {Array} New list of calculated texture coordinates
 */
GeometryHelper.getSpheroidUV = function getSpheroidUV(vertices, out) {
    out = out || [];
    var length = vertices.length / 3;
    var vertex;

    var uv = [];

    for(var i = 0; i < length; i++) {
        vertex = outputs[0].set(
            vertices[i * 3],
            vertices[i * 3 + 1],
            vertices[i * 3 + 2]
        )
        .normalize()
        .toArray();

        uv[0] = this.getAzimuth(vertex) * 0.5 / Math.PI + 0.5;
        uv[1] = this.getAltitude(vertex) / Math.PI + 0.5;

        out.push.apply(out, uv);
    }

    return out;
};

/**
 * Iterates through and normalizes a list of vertices.
 *
 * @static
 * @method
 *
 * @param {Array} vertices Vertices of all points on the geometry
 * @param {Array} out Optional array to be filled with resulting normalized vectors.
 *
 * @return {Array} New list of normalized vertices
 */
GeometryHelper.normalizeAll = function normalizeAll(vertices, out) {
    out = out || [];
    var len = vertices.length / 3;

    for (var i = 0; i < len; i++) {
        Array.prototype.push.apply(out, new Vec3(vertices[i * 3], vertices[i * 3 + 1], vertices[i * 3 + 2]).normalize().toArray());
    }

    return out;
};

/**
 * Normalizes a set of vertices to model space.
 *
 * @static
 * @method
 *
 * @param {Array} vertices Vertices of all points on the geometry
 * @param {Array} out Optional array to be filled with model space position vectors.
 *
 * @return {Array} Output vertices.
 */
GeometryHelper.normalizeVertices = function normalizeVertices(vertices, out) {
    out = out || [];
    var len = vertices.length / 3;
    var vectors = [];
    var minX;
    var maxX;
    var minY;
    var maxY;
    var minZ;
    var maxZ;
    var v;
    var i;

    for (i = 0; i < len; i++) {
        v = vectors[i] = new Vec3(
            vertices[i * 3],
            vertices[i * 3 + 1],
            vertices[i * 3 + 2]
        );

        if (minX == null || v.x < minX) minX = v.x;
        if (maxX == null || v.x > maxX) maxX = v.x;

        if (minY == null || v.y < minY) minY = v.y;
        if (maxY == null || v.y > maxY) maxY = v.y;

        if (minZ == null || v.z < minZ) minZ = v.z;
        if (maxZ == null || v.z > maxZ) maxZ = v.z;
    }

    var translation = new Vec3(
        getTranslationFactor(maxX, minX),
        getTranslationFactor(maxY, minY),
        getTranslationFactor(maxZ, minZ)
    );

    var scale = Math.min(
        getScaleFactor(maxX + translation.x, minX + translation.x),
        getScaleFactor(maxY + translation.y, minY + translation.y),
        getScaleFactor(maxZ + translation.z, minZ + translation.z)
    );

    for (i = 0; i < vectors.length; i++) {
        out.push.apply(out, vectors[i].add(translation).scale(scale).toArray());
    }

    return out;
};

/**
 * Determines translation amount for a given axis to normalize model coordinates.
 *
 * @method
 * @private
 *
 * @param {Number} max Maximum position value of given axis on the model.
 * @param {Number} min Minimum position value of given axis on the model.
 *
 * @return {Number} Number by which the given axis should be translated for all vertices.
 */
function getTranslationFactor(max, min) {
    return -(min + (max - min) / 2);
}

/**
 * Determines scale amount for a given axis to normalize model coordinates.
 *
 * @method
 * @private
 *
 * @param {Number} max Maximum scale value of given axis on the model.
 * @param {Number} min Minimum scale value of given axis on the model.
 *
 * @return {Number} Number by which the given axis should be scaled for all vertices.
 */
function getScaleFactor(max, min) {
    return 1 / ((max - min) / 2);
}

/**
 * Finds the azimuth, or angle above the XY plane, of a given vector.
 *
 * @static
 * @method
 *
 * @param {Array} v Vertex to retreive azimuth from.
 *
 * @return {Number} Azimuth value in radians.
 */
GeometryHelper.getAzimuth = function azimuth(v) {
    return Math.atan2(v[2], -v[0]);
};

/**
 * Finds the altitude, or angle above the XZ plane, of a given vector.
 *
 * @static
 * @method
 *
 * @param {Array} v Vertex to retreive altitude from.
 *
 * @return {Number} Altitude value in radians.
 */
GeometryHelper.getAltitude = function altitude(v) {
    return Math.atan2(-v[1], Math.sqrt((v[0] * v[0]) + (v[2] * v[2])));
};

/**
 * Converts a list of indices from 'triangle' to 'line' format.
 *
 * @static
 * @method
 *
 * @param {Array} indices Indices of all faces on the geometry
 * @param {Array} out Indices of all faces on the geometry
 *
 * @return {Array} New list of line-formatted indices
 */
GeometryHelper.trianglesToLines = function triangleToLines(indices, out) {
    var numVectors = indices.length / 3;
    out = out || [];
    var i;

    for (i = 0; i < numVectors; i++) {
        out.push(indices[i * 3 + 0], indices[i * 3 + 1]);
        out.push(indices[i * 3 + 1], indices[i * 3 + 2]);
        out.push(indices[i * 3 + 2], indices[i * 3 + 0]);
    }

    return out;
};

/**
 * Adds a reverse order triangle for every triangle in the mesh. Adds extra vertices
 * and indices to input arrays.
 *
 * @static
 * @method
 *
 * @param {Array} vertices X, Y, Z positions of all vertices in the geometry
 * @param {Array} indices Indices of all faces on the geometry
 * @return {undefined} undefined
 */
GeometryHelper.addBackfaceTriangles = function addBackfaceTriangles(vertices, indices) {
    var nFaces = indices.length / 3;

    var maxIndex = 0;
    var i = indices.length;
    while (i--) if (indices[i] > maxIndex) maxIndex = indices[i];

    maxIndex++;

    for (i = 0; i < nFaces; i++) {
        var indexOne = indices[i * 3],
            indexTwo = indices[i * 3 + 1],
            indexThree = indices[i * 3 + 2];

        indices.push(indexOne + maxIndex, indexThree + maxIndex, indexTwo + maxIndex);
    }

    // Iterating instead of .slice() here to avoid max call stack issue.

    var nVerts = vertices.length;
    for (i = 0; i < nVerts; i++) {
        vertices.push(vertices[i]);
    }
};

module.exports = GeometryHelper;

},{"../math/Vec2":24,"../math/Vec3":25}],40:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var Geometry = require('../Geometry');
var GeometryHelper = require('../GeometryHelper');

/**
 * This function returns a new static geometry, which is passed
 * custom buffer data.
 *
 * @class Plane
 * @constructor
 *
 * @param {Object} options Parameters that alter the
 * vertex buffers of the generated geometry.
 *
 * @return {Object} constructed geometry
 */
function Plane(options) {
    options = options || {};
    var detailX = options.detailX || options.detail || 1;
    var detailY = options.detailY || options.detail || 1;

    var vertices      = [];
    var textureCoords = [];
    var normals       = [];
    var indices       = [];

    var i;

    for (var y = 0; y <= detailY; y++) {
        var t = y / detailY;
        for (var x = 0; x <= detailX; x++) {
            var s = x / detailX;
            vertices.push(2. * (s - .5), 2 * (t - .5), 0);
            textureCoords.push(s, 1 - t);
            if (x < detailX && y < detailY) {
                i = x + y * (detailX + 1);
                indices.push(i, i + 1, i + detailX + 1);
                indices.push(i + detailX + 1, i + 1, i + detailX + 2);
            }
        }
    }

    if (options.backface !== false) {
        GeometryHelper.addBackfaceTriangles(vertices, indices);

        // duplicate texture coordinates as well

        var len = textureCoords.length;
        for (i = 0; i < len; i++) textureCoords.push(textureCoords[i]);
    }

    normals = GeometryHelper.computeNormals(vertices, indices);

    return new Geometry({
        buffers: [
            { name: 'a_pos', data: vertices },
            { name: 'a_texCoord', data: textureCoords, size: 2 },
            { name: 'a_normals', data: normals },
            { name: 'indices', data: indices, size: 1 }
        ]
    });
}

module.exports = Plane;

},{"../Geometry":38,"../GeometryHelper":39}],41:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * Buffer is a private class that wraps the vertex data that defines
 * the the points of the triangles that webgl draws. Each buffer
 * maps to one attribute of a mesh.
 *
 * @class Buffer
 * @constructor
 *
 * @param {Number} target The bind target of the buffer to update: ARRAY_BUFFER or ELEMENT_ARRAY_BUFFER
 * @param {Object} type Array type to be used in calls to gl.bufferData.
 * @param {WebGLContext} gl The WebGL context that the buffer is hosted by.
 *
 * @return {undefined} undefined
 */
function Buffer(target, type, gl) {
    this.buffer = null;
    this.target = target;
    this.type = type;
    this.data = [];
    this.gl = gl;
}

/**
 * Creates a WebGL buffer if one does not yet exist and binds the buffer to
 * to the context. Runs bufferData with appropriate data.
 *
 * @method
 *
 * @return {undefined} undefined
 */
Buffer.prototype.subData = function subData() {
    var gl = this.gl;
    var data = [];

    // to prevent against maximum call-stack issue.
    for (var i = 0, chunk = 10000; i < this.data.length; i += chunk)
        data = Array.prototype.concat.apply(data, this.data.slice(i, i + chunk));

    this.buffer = this.buffer || gl.createBuffer();
    gl.bindBuffer(this.target, this.buffer);
    gl.bufferData(this.target, new this.type(data), gl.STATIC_DRAW);
};

module.exports = Buffer;

},{}],42:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var INDICES = 'indices';

var Buffer = require('./Buffer');

/**
 * BufferRegistry is a class that manages allocation of buffers to
 * input geometries.
 *
 * @class BufferRegistry
 * @constructor
 *
 * @param {WebGLContext} context WebGL drawing context to be passed to buffers.
 *
 * @return {undefined} undefined
 */
function BufferRegistry(context) {
    this.gl = context;

    this.registry = {};
    this._dynamicBuffers = [];
    this._staticBuffers = [];

    this._arrayBufferMax = 30000;
    this._elementBufferMax = 30000;
}

/**
 * Binds and fills all the vertex data into webgl buffers.  Will reuse buffers if
 * possible.  Populates registry with the name of the buffer, the WebGL buffer
 * object, spacing of the attribute, the attribute's offset within the buffer,
 * and finally the length of the buffer.  This information is later accessed by
 * the root to draw the buffers.
 *
 * @method
 *
 * @param {Number} geometryId Id of the geometry instance that holds the buffers.
 * @param {String} name Key of the input buffer in the geometry.
 * @param {Array} value Flat array containing input data for buffer.
 * @param {Number} spacing The spacing, or itemSize, of the input buffer.
 * @param {Boolean} dynamic Boolean denoting whether a geometry is dynamic or static.
 *
 * @return {undefined} undefined
 */
BufferRegistry.prototype.allocate = function allocate(geometryId, name, value, spacing, dynamic) {
    var vertexBuffers = this.registry[geometryId] || (this.registry[geometryId] = { keys: [], values: [], spacing: [], offset: [], length: [] });

    var j = vertexBuffers.keys.indexOf(name);
    var isIndex = name === INDICES;
    var bufferFound = false;
    var newOffset;
    var offset = 0;
    var length;
    var buffer;
    var k;

    if (j === -1) {
        j = vertexBuffers.keys.length;
        length = isIndex ? value.length : Math.floor(value.length / spacing);

        if (!dynamic) {

            // Use a previously created buffer if available.

            for (k = 0; k < this._staticBuffers.length; k++) {

                if (isIndex === this._staticBuffers[k].isIndex) {
                    newOffset = this._staticBuffers[k].offset + value.length;
                    if ((!isIndex && newOffset < this._arrayBufferMax) || (isIndex && newOffset < this._elementBufferMax)) {
                        buffer = this._staticBuffers[k].buffer;
                        offset = this._staticBuffers[k].offset;
                        this._staticBuffers[k].offset += value.length;
                        bufferFound = true;
                        break;
                    }
                }
            }

            // Create a new static buffer in none were found.

            if (!bufferFound) {
                buffer = new Buffer(
                    isIndex ? this.gl.ELEMENT_ARRAY_BUFFER : this.gl.ARRAY_BUFFER,
                    isIndex ? Uint16Array : Float32Array,
                    this.gl
                );

                this._staticBuffers.push({ buffer: buffer, offset: value.length, isIndex: isIndex });
            }
        }
        else {

            // For dynamic geometries, always create new buffer.

            buffer = new Buffer(
                isIndex ? this.gl.ELEMENT_ARRAY_BUFFER : this.gl.ARRAY_BUFFER,
                isIndex ? Uint16Array : Float32Array,
                this.gl
            );

            this._dynamicBuffers.push({ buffer: buffer, offset: value.length, isIndex: isIndex });
        }

        // Update the registry for the spec with buffer information.

        vertexBuffers.keys.push(name);
        vertexBuffers.values.push(buffer);
        vertexBuffers.spacing.push(spacing);
        vertexBuffers.offset.push(offset);
        vertexBuffers.length.push(length);
    }

    var len = value.length;
    for (k = 0; k < len; k++) {
        vertexBuffers.values[j].data[offset + k] = value[k];
    }
    vertexBuffers.values[j].subData();
};

module.exports = BufferRegistry;

},{"./Buffer":41}],43:[function(require,module,exports){
'use strict';

/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * Takes the original rendering contexts' compiler function
 * and augments it with added functionality for parsing and
 * displaying errors.
 *
 * @method
 *
 * @returns {Function} Augmented function
 */
module.exports = function Debug() {
    return _augmentFunction(
        this.gl.compileShader,
        function(shader) {
            if (!this.getShaderParameter(shader, this.COMPILE_STATUS)) {
                var errors = this.getShaderInfoLog(shader);
                var source = this.getShaderSource(shader);
                _processErrors(errors, source);
            }
        }
    );
};

// Takes a function, keeps the reference and replaces it by a closure that
// executes the original function and the provided callback.
function _augmentFunction(func, callback) {
    return function() {
        var res = func.apply(this, arguments);
        callback.apply(this, arguments);
        return res;
    };
}

// Parses errors and failed source code from shaders in order
// to build displayable error blocks.
// Inspired by Jaume Sanchez Elias.
function _processErrors(errors, source) {

    var css = 'body,html{background:#e3e3e3;font-family:monaco,monospace;font-size:14px;line-height:1.7em}' +
              '#shaderReport{left:0;top:0;right:0;box-sizing:border-box;position:absolute;z-index:1000;color:' +
              '#222;padding:15px;white-space:normal;list-style-type:none;margin:50px auto;max-width:1200px}' +
              '#shaderReport li{background-color:#fff;margin:13px 0;box-shadow:0 1px 2px rgba(0,0,0,.15);' +
              'padding:20px 30px;border-radius:2px;border-left:20px solid #e01111}span{color:#e01111;' +
              'text-decoration:underline;font-weight:700}#shaderReport li p{padding:0;margin:0}' +
              '#shaderReport li:nth-child(even){background-color:#f4f4f4}' +
              '#shaderReport li p:first-child{margin-bottom:10px;color:#666}';

    var el = document.createElement('style');
    document.getElementsByTagName('head')[0].appendChild(el);
    el.textContent = css;

    var report = document.createElement('ul');
    report.setAttribute('id', 'shaderReport');
    document.body.appendChild(report);

    var re = /ERROR: [\d]+:([\d]+): (.+)/gmi;
    var lines = source.split('\n');

    var m;
    while ((m = re.exec(errors)) != null) {
        if (m.index === re.lastIndex) re.lastIndex++;
        var li = document.createElement('li');
        var code = '<p><span>ERROR</span> "' + m[2] + '" in line ' + m[1] + '</p>';
        code += '<p><b>' + lines[m[1] - 1].replace(/^[ \t]+/g, '') + '</b></p>';
        li.innerHTML = code;
        report.appendChild(li);
    }
}

},{}],44:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var clone = require('../utilities/clone');
var keyValueToArrays = require('../utilities/keyValueToArrays');

var vertexWrapper = require('../webgl-shaders').vertex;
var fragmentWrapper = require('../webgl-shaders').fragment;
var Debug = require('./Debug');

var VERTEX_SHADER = 35633;
var FRAGMENT_SHADER = 35632;
var identityMatrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

var header = 'precision mediump float;\n';

var TYPES = {
    undefined: 'float ',
    1: 'float ',
    2: 'vec2 ',
    3: 'vec3 ',
    4: 'vec4 ',
    16: 'mat4 '
};

var inputTypes = {
    u_baseColor: 'vec4',
    u_normals: 'vert',
    u_glossiness: 'vec4',
    u_positionOffset: 'vert'
};

var masks =  {
    vert: 1,
    vec3: 2,
    vec4: 4,
    float: 8
};

/**
 * Uniform keys and values
 */
var uniforms = keyValueToArrays({
    u_perspective: identityMatrix,
    u_view: identityMatrix,
    u_resolution: [0, 0, 0],
    u_transform: identityMatrix,
    u_size: [1, 1, 1],
    u_time: 0,
    u_opacity: 1,
    u_metalness: 0,
    u_glossiness: [0, 0, 0, 0],
    u_baseColor: [1, 1, 1, 1],
    u_normals: [1, 1, 1],
    u_positionOffset: [0, 0, 0],
    u_lightPosition: identityMatrix,
    u_lightColor: identityMatrix,
    u_ambientLight: [0, 0, 0],
    u_flatShading: 0,
    u_numLights: 0
});

/**
 * Attributes keys and values
 */
var attributes = keyValueToArrays({
    a_pos: [0, 0, 0],
    a_texCoord: [0, 0],
    a_normals: [0, 0, 0]
});

/**
 * Varyings keys and values
 */
var varyings = keyValueToArrays({
    v_textureCoordinate: [0, 0],
    v_normal: [0, 0, 0],
    v_position: [0, 0, 0],
    v_eyeVector: [0, 0, 0]
});

/**
 * A class that handles interactions with the WebGL shader program
 * used by a specific context.  It manages creation of the shader program
 * and the attached vertex and fragment shaders.  It is also in charge of
 * passing all uniforms to the WebGLContext.
 *
 * @class Program
 * @constructor
 *
 * @param {WebGL_Context} gl Context to be used to create the shader program
 * @param {Object} options Program options
 *
 * @return {undefined} undefined
 */
function Program(gl, options) {
    this.gl = gl;
    this.textureSlots = 1;
    this.options = options || {};

    this.registeredMaterials = {};
    this.flaggedUniforms = [];
    this.cachedUniforms  = {};
    this.uniformTypes = [];

    this.definitionVec4 = [];
    this.definitionVec3 = [];
    this.definitionFloat = [];
    this.applicationVec3 = [];
    this.applicationVec4 = [];
    this.applicationFloat = [];
    this.applicationVert = [];
    this.definitionVert = [];

    this.resetProgram();
}

/**
 * Determines whether a material has already been registered to
 * the shader program.
 *
 * @method
 *
 * @param {String} name Name of target input of material.
 * @param {Object} material Compiled material object being verified.
 *
 * @return {Program} this Current program.
 */
Program.prototype.registerMaterial = function registerMaterial(name, material) {
    var compiled = material;
    var type = inputTypes[name];
    var mask = masks[type];

    if ((this.registeredMaterials[material._id] & mask) === mask) return this;

    var k;

    for (k in compiled.uniforms) {
        if (uniforms.keys.indexOf(k) === -1) {
            uniforms.keys.push(k);
            uniforms.values.push(compiled.uniforms[k]);
        }
    }

    for (k in compiled.varyings) {
        if (varyings.keys.indexOf(k) === -1) {
            varyings.keys.push(k);
            varyings.values.push(compiled.varyings[k]);
        }
    }

    for (k in compiled.attributes) {
        if (attributes.keys.indexOf(k) === -1) {
            attributes.keys.push(k);
            attributes.values.push(compiled.attributes[k]);
        }
    }

    this.registeredMaterials[material._id] |= mask;

    if (type === 'float') {
        this.definitionFloat.push(material.defines);
        this.definitionFloat.push('float fa_' + material._id + '() {\n '  + compiled.glsl + ' \n}');
        this.applicationFloat.push('if (int(abs(ID)) == ' + material._id + ') return fa_' + material._id  + '();');
    }

    if (type === 'vec3') {
        this.definitionVec3.push(material.defines);
        this.definitionVec3.push('vec3 fa_' + material._id + '() {\n '  + compiled.glsl + ' \n}');
        this.applicationVec3.push('if (int(abs(ID.x)) == ' + material._id + ') return fa_' + material._id + '();');
    }

    if (type === 'vec4') {
        this.definitionVec4.push(material.defines);
        this.definitionVec4.push('vec4 fa_' + material._id + '() {\n '  + compiled.glsl + ' \n}');
        this.applicationVec4.push('if (int(abs(ID.x)) == ' + material._id + ') return fa_' + material._id + '();');
    }

    if (type === 'vert') {
        this.definitionVert.push(material.defines);
        this.definitionVert.push('vec3 fa_' + material._id + '() {\n '  + compiled.glsl + ' \n}');
        this.applicationVert.push('if (int(abs(ID.x)) == ' + material._id + ') return fa_' + material._id + '();');
    }

    return this.resetProgram();
};

/**
 * Clears all cached uniforms and attribute locations.  Assembles
 * new fragment and vertex shaders and based on material from
 * currently registered materials.  Attaches said shaders to new
 * shader program and upon success links program to the WebGL
 * context.
 *
 * @method
 *
 * @return {Program} Current program.
 */
Program.prototype.resetProgram = function resetProgram() {
    var vertexHeader = [header];
    var fragmentHeader = [header];

    var fragmentSource;
    var vertexSource;
    var program;
    var name;
    var value;
    var i;

    this.uniformLocations   = [];
    this.attributeLocations = {};

    this.uniformTypes = {};

    this.attributeNames = clone(attributes.keys);
    this.attributeValues = clone(attributes.values);

    this.varyingNames = clone(varyings.keys);
    this.varyingValues = clone(varyings.values);

    this.uniformNames = clone(uniforms.keys);
    this.uniformValues = clone(uniforms.values);

    this.flaggedUniforms = [];
    this.cachedUniforms = {};

    fragmentHeader.push('uniform sampler2D u_textures[7];\n');

    if (this.applicationVert.length) {
        vertexHeader.push('uniform sampler2D u_textures[7];\n');
    }

    for(i = 0; i < this.uniformNames.length; i++) {
        name = this.uniformNames[i];
        value = this.uniformValues[i];
        vertexHeader.push('uniform ' + TYPES[value.length] + name + ';\n');
        fragmentHeader.push('uniform ' + TYPES[value.length] + name + ';\n');
    }

    for(i = 0; i < this.attributeNames.length; i++) {
        name = this.attributeNames[i];
        value = this.attributeValues[i];
        vertexHeader.push('attribute ' + TYPES[value.length] + name + ';\n');
    }

    for(i = 0; i < this.varyingNames.length; i++) {
        name = this.varyingNames[i];
        value = this.varyingValues[i];
        vertexHeader.push('varying ' + TYPES[value.length]  + name + ';\n');
        fragmentHeader.push('varying ' + TYPES[value.length] + name + ';\n');
    }

    vertexSource = vertexHeader.join('') + vertexWrapper
        .replace('#vert_definitions', this.definitionVert.join('\n'))
        .replace('#vert_applications', this.applicationVert.join('\n'));

    fragmentSource = fragmentHeader.join('') + fragmentWrapper
        .replace('#vec3_definitions', this.definitionVec3.join('\n'))
        .replace('#vec3_applications', this.applicationVec3.join('\n'))
        .replace('#vec4_definitions', this.definitionVec4.join('\n'))
        .replace('#vec4_applications', this.applicationVec4.join('\n'))
        .replace('#float_definitions', this.definitionFloat.join('\n'))
        .replace('#float_applications', this.applicationFloat.join('\n'));

    program = this.gl.createProgram();

    this.gl.attachShader(
        program,
        this.compileShader(this.gl.createShader(VERTEX_SHADER), vertexSource)
    );

    this.gl.attachShader(
        program,
        this.compileShader(this.gl.createShader(FRAGMENT_SHADER), fragmentSource)
    );

    this.gl.linkProgram(program);

    if (! this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
        console.error('link error: ' + this.gl.getProgramInfoLog(program));
        this.program = null;
    }
    else {
        this.program = program;
        this.gl.useProgram(this.program);
    }

    this.setUniforms(this.uniformNames, this.uniformValues);

    var textureLocation = this.gl.getUniformLocation(this.program, 'u_textures[0]');
    this.gl.uniform1iv(textureLocation, [0, 1, 2, 3, 4, 5, 6]);

    return this;
};

/**
 * Compares the value of the input uniform value against
 * the cached value stored on the Program class.  Updates and
 * creates new entries in the cache when necessary.
 *
 * @method
 * @param {String} targetName Key of uniform spec being evaluated.
 * @param {Number|Array} value Value of uniform spec being evaluated.
 *
 * @return {Boolean} boolean Indicating whether the uniform being set is cached.
 */
Program.prototype.uniformIsCached = function(targetName, value) {
    if(this.cachedUniforms[targetName] == null) {
        if (value.length) {
            this.cachedUniforms[targetName] = new Float32Array(value);
        }
        else {
            this.cachedUniforms[targetName] = value;
        }
        return false;
    }
    else if (value.length) {
        var i = value.length;
        while (i--) {
            if(value[i] !== this.cachedUniforms[targetName][i]) {
                i = value.length;
                while(i--) this.cachedUniforms[targetName][i] = value[i];
                return false;
            }
        }
    }

    else if (this.cachedUniforms[targetName] !== value) {
        this.cachedUniforms[targetName] = value;
        return false;
    }

    return true;
};

/**
 * Handles all passing of uniforms to WebGL drawing context.  This
 * function will find the uniform location and then, based on
 * a type inferred from the javascript value of the uniform, it will call
 * the appropriate function to pass the uniform to WebGL.  Finally,
 * setUniforms will iterate through the passed in shaderChunks (if any)
 * and set the appropriate uniforms to specify which chunks to use.
 *
 * @method
 * @param {Array} uniformNames Array containing the keys of all uniforms to be set.
 * @param {Array} uniformValue Array containing the values of all uniforms to be set.
 *
 * @return {Program} Current program.
 */
Program.prototype.setUniforms = function (uniformNames, uniformValue) {
    var gl = this.gl;
    var location;
    var value;
    var name;
    var len;
    var i;

    if (!this.program) return this;

    len = uniformNames.length;
    for (i = 0; i < len; i++) {
        name = uniformNames[i];
        value = uniformValue[i];

        // Retreive the cached location of the uniform,
        // requesting a new location from the WebGL context
        // if it does not yet exist.

        location = this.uniformLocations[name] || gl.getUniformLocation(this.program, name);
        if (!location) continue;

        this.uniformLocations[name] = location;

        // Check if the value is already set for the
        // given uniform.

        if (this.uniformIsCached(name, value)) continue;

        // Determine the correct function and pass the uniform
        // value to WebGL.

        if (!this.uniformTypes[name]) {
            this.uniformTypes[name] = this.getUniformTypeFromValue(value);
        }

        // Call uniform setter function on WebGL context with correct value

        switch (this.uniformTypes[name]) {
            case 'uniform4fv':  gl.uniform4fv(location, value); break;
            case 'uniform3fv':  gl.uniform3fv(location, value); break;
            case 'uniform2fv':  gl.uniform2fv(location, value); break;
            case 'uniform1fv':  gl.uniform1fv(location, value); break;
            case 'uniform1f' :  gl.uniform1f(location, value); break;
            case 'uniformMatrix3fv': gl.uniformMatrix3fv(location, false, value); break;
            case 'uniformMatrix4fv': gl.uniformMatrix4fv(location, false, value); break;
        }
    }

    return this;
};

/**
 * Infers uniform setter function to be called on the WebGL context, based
 * on an input value.
 *
 * @method
 *
 * @param {Number|Array} value Value from which uniform type is inferred.
 *
 * @return {String} Name of uniform function for given value.
 */
Program.prototype.getUniformTypeFromValue = function getUniformTypeFromValue(value) {
    if (Array.isArray(value) || value instanceof Float32Array) {
        switch (value.length) {
            case 1:  return 'uniform1fv';
            case 2:  return 'uniform2fv';
            case 3:  return 'uniform3fv';
            case 4:  return 'uniform4fv';
            case 9:  return 'uniformMatrix3fv';
            case 16: return 'uniformMatrix4fv';
        }
    }
    else if (!isNaN(parseFloat(value)) && isFinite(value)) {
        return 'uniform1f';
    }

    throw 'cant load uniform "' + name + '" with value:' + JSON.stringify(value);
};

/**
 * Adds shader source to shader and compiles the input shader.  Checks
 * compile status and logs error if necessary.
 *
 * @method
 *
 * @param {Object} shader Program to be compiled.
 * @param {String} source Source to be used in the shader.
 *
 * @return {Object} Compiled shader.
 */
Program.prototype.compileShader = function compileShader(shader, source) {
    var i = 1;

    if (this.options.debug) {
        this.gl.compileShader = Debug.call(this);
    }

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
        console.error('compile error: ' + this.gl.getShaderInfoLog(shader));
        console.error('1: ' + source.replace(/\n/g, function () {
            return '\n' + (i+=1) + ': ';
        }));
    }

    return shader;
};

module.exports = Program;

},{"../utilities/clone":35,"../utilities/keyValueToArrays":36,"../webgl-shaders":51,"./Debug":43}],45:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * Texture is a private class that stores image data
 * to be accessed from a shader or used as a render target.
 *
 * @class Texture
 * @constructor
 *
 * @param {GL} gl GL
 * @param {Object} options Options
 *
 * @return {undefined} undefined
 */
function Texture(gl, options) {
    options = options || {};
    this.id = gl.createTexture();
    this.width = options.width || 0;
    this.height = options.height || 0;
    this.mipmap = options.mipmap;
    this.format = options.format || 'RGBA';
    this.type = options.type || 'UNSIGNED_BYTE';
    this.gl = gl;

    this.bind();

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl[options.magFilter] || gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl[options.minFilter] || gl.NEAREST);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl[options.wrapS] || gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl[options.wrapT] || gl.CLAMP_TO_EDGE);
}

/**
 * Binds this texture as the selected target.
 *
 * @method
 * @return {Object} Current texture instance.
 */
Texture.prototype.bind = function bind() {
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.id);
    return this;
};

/**
 * Erases the texture data in the given texture slot.
 *
 * @method
 * @return {Object} Current texture instance.
 */
Texture.prototype.unbind = function unbind() {
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    return this;
};

/**
 * Replaces the image data in the texture with the given image.
 *
 * @method
 *
 * @param {Image}   img     The image object to upload pixel data from.
 * @return {Object}         Current texture instance.
 */
Texture.prototype.setImage = function setImage(img) {
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl[this.format], this.gl[this.format], this.gl[this.type], img);
    if (this.mipmap) this.gl.generateMipmap(this.gl.TEXTURE_2D);
    return this;
};

/**
 * Replaces the image data in the texture with an array of arbitrary data.
 *
 * @method
 *
 * @param {Array}   input   Array to be set as data to texture.
 * @return {Object}         Current texture instance.
 */
Texture.prototype.setArray = function setArray(input) {
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl[this.format], this.width, this.height, 0, this.gl[this.format], this.gl[this.type], input);
    return this;
};

/**
 * Dumps the rgb-pixel contents of a texture into an array for debugging purposes
 *
 * @method
 *
 * @param {Number} x        x-offset between texture coordinates and snapshot
 * @param {Number} y        y-offset between texture coordinates and snapshot
 * @param {Number} width    x-depth of the snapshot
 * @param {Number} height   y-depth of the snapshot
 *
 * @return {Array}          An array of the pixels contained in the snapshot.
 */
Texture.prototype.readBack = function readBack(x, y, width, height) {
    var gl = this.gl;
    var pixels;
    x = x || 0;
    y = y || 0;
    width = width || this.width;
    height = height || this.height;
    var fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.id, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) {
        pixels = new Uint8Array(width * height * 4);
        gl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    }
    return pixels;
};

module.exports = Texture;

},{}],46:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
'use strict';

var Texture = require('./Texture');
var createCheckerboard = require('./createCheckerboard');

/**
 * Handles loading, binding, and resampling of textures for WebGLRenderer.
 *
 * @class TextureManager
 * @constructor
 *
 * @param {WebGL_Context} gl Context used to create and bind textures.
 *
 * @return {undefined} undefined
 */
function TextureManager(gl) {
    this.registry = [];
    this._needsResample = [];

    this._activeTexture = 0;
    this._boundTexture = null;

    this._checkerboard = createCheckerboard();

    this.gl = gl;
}

/**
 * Update function used by WebGLRenderer to queue resamples on
 * registered textures.
 *
 * @method
 *
 * @param {Number}      time    Time in milliseconds according to the compositor.
 * @return {undefined}          undefined
 */
TextureManager.prototype.update = function update(time) {
    var registryLength = this.registry.length;

    for (var i = 1; i < registryLength; i++) {
        var texture = this.registry[i];

        if (texture && texture.isLoaded && texture.resampleRate) {
            if (!texture.lastResample || time - texture.lastResample > texture.resampleRate) {
                if (!this._needsResample[texture.id]) {
                    this._needsResample[texture.id] = true;
                    texture.lastResample = time;
                }
            }
        }
    }
};

/**
 * Creates a spec and creates a texture based on given texture data.
 * Handles loading assets if necessary.
 *
 * @method
 *
 * @param {Object}  input   Object containing texture id, texture data
 *                          and options used to draw texture.
 * @param {Number}  slot    Texture slot to bind generated texture to.
 * @return {undefined}      undefined
 */
TextureManager.prototype.register = function register(input, slot) {
    var source = input.data;
    var textureId = input.id;
    var options = input.options || {};
    var texture = this.registry[textureId];
    var spec;

    if (!texture) {

        texture = new Texture(this.gl, options);
        texture.setImage(this._checkerboard);

        // Add texture to registry

        spec = this.registry[textureId] = {
            resampleRate: options.resampleRate || null,
            lastResample: null,
            isLoaded: false,
            texture: texture,
            source: source,
            id: textureId,
            slot: slot
        };

        // Handle array

        if (Array.isArray(source) || source instanceof Uint8Array || source instanceof Float32Array) {
            this.bindTexture(textureId);
            texture.setArray(source);
            spec.isLoaded = true;
        }

        // Handle video

        else if (window && source instanceof window.HTMLVideoElement) {
            source.addEventListener('loadeddata', function() {
                this.bindTexture(textureId);
                texture.setImage(source);

                spec.isLoaded = true;
                spec.source = source;
            }.bind(this));
        }

        // Handle image url

        else if (typeof source === 'string') {
            loadImage(source, function (img) {
                this.bindTexture(textureId);
                texture.setImage(img);

                spec.isLoaded = true;
                spec.source = img;
            }.bind(this));
        }
    }

    return textureId;
};

/**
 * Loads an image from a string or Image object and executes a callback function.
 *
 * @method
 * @private
 *
 * @param {Object|String} input The input image data to load as an asset.
 * @param {Function} callback The callback function to be fired when the image has finished loading.
 *
 * @return {Object} Image object being loaded.
 */
function loadImage (input, callback) {
    var image = (typeof input === 'string' ? new Image() : input) || {};
        image.crossOrigin = 'anonymous';

    if (!image.src) image.src = input;
    if (!image.complete) {
        image.onload = function () {
            callback(image);
        };
    }
    else {
        callback(image);
    }

    return image;
}

/**
 * Sets active texture slot and binds target texture.  Also handles
 * resampling when necessary.
 *
 * @method
 *
 * @param {Number} id Identifier used to retreive texture spec
 *
 * @return {undefined} undefined
 */
TextureManager.prototype.bindTexture = function bindTexture(id) {
    var spec = this.registry[id];

    if (this._activeTexture !== spec.slot) {
        this.gl.activeTexture(this.gl.TEXTURE0 + spec.slot);
        this._activeTexture = spec.slot;
    }

    if (this._boundTexture !== id) {
        this._boundTexture = id;
        spec.texture.bind();
    }

    if (this._needsResample[spec.id]) {

        // TODO: Account for resampling of arrays.

        spec.texture.setImage(spec.source);
        this._needsResample[spec.id] = false;
    }
};

module.exports = TextureManager;

},{"./Texture":45,"./createCheckerboard":49}],47:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var Program = require('./Program');
var BufferRegistry = require('./BufferRegistry');
var Plane = require('../webgl-geometries/primitives/Plane');
var sorter = require('./radixSort');
var keyValueToArrays = require('../utilities/keyValueToArrays');
var TextureManager = require('./TextureManager');
var compileMaterial = require('./compileMaterial');

var identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

var globalUniforms = keyValueToArrays({
    'u_numLights': 0,
    'u_ambientLight': new Array(3),
    'u_lightPosition': new Array(3),
    'u_lightColor': new Array(3),
    'u_perspective': new Array(16),
    'u_time': 0,
    'u_view': new Array(16)
});

/**
 * WebGLRenderer is a private class that manages all interactions with the WebGL
 * API. Each frame it receives commands from the compositor and updates its
 * registries accordingly. Subsequently, the draw function is called and the
 * WebGLRenderer issues draw calls for all meshes in its registry.
 *
 * @class WebGLRenderer
 * @constructor
 *
 * @param {Element} canvas The DOM element that GL will paint itself onto.
 * @param {Compositor} compositor Compositor used for querying the time from.
 *
 * @return {undefined} undefined
 */
function WebGLRenderer(canvas, compositor) {
    canvas.classList.add('famous-webgl-renderer');

    this.canvas = canvas;
    this.compositor = compositor;

    for (var key in this.constructor.DEFAULT_STYLES) {
        this.canvas.style[key] = this.constructor.DEFAULT_STYLES[key];
    }

    var gl = this.gl = this.getWebGLContext(this.canvas);

    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.polygonOffset(0.1, 0.1);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.depthFunc(gl.LEQUAL);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    this.meshRegistry = {};
    this.meshRegistryKeys = [];

    this.cutoutRegistry = {};

    this.cutoutRegistryKeys = [];

    /**
     * Lights
     */
    this.numLights = 0;
    this.ambientLightColor = [0, 0, 0];
    this.lightRegistry = {};
    this.lightRegistryKeys = [];
    this.lightPositions = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.lightColors = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    this.textureManager = new TextureManager(gl);
    this.texCache = {};
    this.bufferRegistry = new BufferRegistry(gl);
    this.program = new Program(gl, { debug: true });

    this.state = {
        boundArrayBuffer: null,
        boundElementBuffer: null,
        lastDrawn: null,
        enabledAttributes: {},
        enabledAttributesKeys: []
    };

    this.resolutionName = ['u_resolution'];
    this.resolutionValues = [];

    this.cachedSize = [];

    /*
    The projectionTransform has some constant components, i.e. the z scale, and the x and y translation.

    The z scale keeps the final z position of any vertex within the clip's domain by scaling it by an
    arbitrarily small coefficient. This has the advantage of being a useful default in the event of the
    user forgoing a near and far plane, an alien convention in dom space as in DOM overlapping is
    conducted via painter's algorithm.

    The x and y translation transforms the world space origin to the top left corner of the screen.

    The final component (this.projectionTransform[15]) is initialized as 1 because certain projection models,
    e.g. the WC3 specified model, keep the XY plane as the projection hyperplane.
    */
    this.projectionTransform = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -0.000001, 0, -1, 1, 0, 1];

    // TODO: remove this hack

    var cutout = this.cutoutGeometry = new Plane();

    this.bufferRegistry.allocate(cutout.spec.id, 'a_pos', cutout.spec.bufferValues[0], 3);
    this.bufferRegistry.allocate(cutout.spec.id, 'a_texCoord', cutout.spec.bufferValues[1], 2);
    this.bufferRegistry.allocate(cutout.spec.id, 'a_normals', cutout.spec.bufferValues[2], 3);
    this.bufferRegistry.allocate(cutout.spec.id, 'indices', cutout.spec.bufferValues[3], 1);
}

/**
 * Attempts to retreive the WebGLRenderer context using several
 * accessors. For browser compatability. Throws on error.
 *
 * @method
 *
 * @param {Object} canvas Canvas element from which the context is retreived
 *
 * @return {Object} WebGLContext of canvas element
 */
WebGLRenderer.prototype.getWebGLContext = function getWebGLContext(canvas) {
    var names = ['webgl', 'experimental-webgl', 'webkit-3d', 'moz-webgl'];
    var context = null;
    for (var i = 0; i < names.length; i++) {
        try {
            context = canvas.getContext(names[i]);
        }
        catch (error) {
            var msg = 'Error creating WebGL context: ' + error.prototype.toString();
            console.error(msg);
        }
        if (context) {
            break;
        }
    }
    return context ? context : false;
};

/**
 * Adds a new base spec to the light registry at a given path.
 *
 * @method
 *
 * @param {String} path Path used as id of new light in lightRegistry
 *
 * @return {Object} Newly created light spec
 */
WebGLRenderer.prototype.createLight = function createLight(path) {
    this.numLights++;
    this.lightRegistryKeys.push(path);
    this.lightRegistry[path] = {
        color: [0, 0, 0],
        position: [0, 0, 0]
    };
    return this.lightRegistry[path];
};

/**
 * Adds a new base spec to the mesh registry at a given path.
 *
 * @method
 *
 * @param {String} path Path used as id of new mesh in meshRegistry.
 *
 * @return {Object} Newly created mesh spec.
 */
WebGLRenderer.prototype.createMesh = function createMesh(path) {
    this.meshRegistryKeys.push(path);

    var uniforms = keyValueToArrays({
        u_opacity: 1,
        u_transform: identity,
        u_size: [0, 0, 0],
        u_baseColor: [0.5, 0.5, 0.5, 1],
        u_positionOffset: [0, 0, 0],
        u_normals: [0, 0, 0],
        u_flatShading: 0,
        u_glossiness: [0, 0, 0, 0]
    });
    this.meshRegistry[path] = {
        depth: null,
        uniformKeys: uniforms.keys,
        uniformValues: uniforms.values,
        buffers: {},
        geometry: null,
        drawType: null,
        textures: [],
        visible: true
    };
    return this.meshRegistry[path];
};

/**
 * Sets flag on indicating whether to do skip draw phase for
 * cutout mesh at given path.
 *
 * @method
 *
 * @param {String} path Path used as id of target cutout mesh.
 * @param {Boolean} usesCutout Indicates the presence of a cutout mesh
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.setCutoutState = function setCutoutState(path, usesCutout) {
    var cutout = this.getOrSetCutout(path);

    cutout.visible = usesCutout;
};

/**
 * Creates or retreives cutout
 *
 * @method
 *
 * @param {String} path Path used as id of target cutout mesh.
 *
 * @return {Object} Newly created cutout spec.
 */
WebGLRenderer.prototype.getOrSetCutout = function getOrSetCutout(path) {
    if (this.cutoutRegistry[path]) {
        return this.cutoutRegistry[path];
    }
    else {
        var uniforms = keyValueToArrays({
            u_opacity: 0,
            u_transform: identity.slice(),
            u_size: [0, 0, 0],
            u_origin: [0, 0, 0],
            u_baseColor: [0, 0, 0, 1]
        });

        this.cutoutRegistryKeys.push(path);

        this.cutoutRegistry[path] = {
            uniformKeys: uniforms.keys,
            uniformValues: uniforms.values,
            geometry: this.cutoutGeometry.spec.id,
            drawType: this.cutoutGeometry.spec.type,
            visible: true
        };

        return this.cutoutRegistry[path];
    }
};

/**
 * Sets flag on indicating whether to do skip draw phase for
 * mesh at given path.
 *
 * @method
 * @param {String} path Path used as id of target mesh.
 * @param {Boolean} visibility Indicates the visibility of target mesh.
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.setMeshVisibility = function setMeshVisibility(path, visibility) {
    var mesh = this.meshRegistry[path] || this.createMesh(path);

    mesh.visible = visibility;
};

/**
 * Deletes a mesh from the meshRegistry.
 *
 * @method
 * @param {String} path Path used as id of target mesh.
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.removeMesh = function removeMesh(path) {
    var keyLocation = this.meshRegistryKeys.indexOf(path);
    this.meshRegistryKeys.splice(keyLocation, 1);
    this.meshRegistry[path] = null;
};

/**
 * Creates or retreives cutout
 *
 * @method
 * @param {String} path Path used as id of cutout in cutout registry.
 * @param {String} uniformName Identifier used to upload value
 * @param {Array} uniformValue Value of uniform data
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.setCutoutUniform = function setCutoutUniform(path, uniformName, uniformValue) {
    var cutout = this.getOrSetCutout(path);

    var index = cutout.uniformKeys.indexOf(uniformName);

    if (Array.isArray(uniformValue)) {
        for (var i = 0, len = uniformValue.length; i < len; i++) {
            cutout.uniformValues[index][i] = uniformValue[i];
        }
    }
    else {
        cutout.uniformValues[index] = uniformValue;
    }
};

/**
 * Edits the options field on a mesh
 *
 * @method
 * @param {String} path Path used as id of target mesh
 * @param {Object} options Map of draw options for mesh
 *
 * @return {undefined} undefined
**/
WebGLRenderer.prototype.setMeshOptions = function(path, options) {
    var mesh = this.meshRegistry[path] || this.createMesh(path);

    mesh.options = options;
    return this;
};

/**
 * Changes the color of the fixed intensity lighting in the scene
 *
 * @method
 *
 * @param {String} path Path used as id of light
 * @param {Number} r red channel
 * @param {Number} g green channel
 * @param {Number} b blue channel
 *
 * @return {undefined} undefined
**/
WebGLRenderer.prototype.setAmbientLightColor = function setAmbientLightColor(path, r, g, b) {
    this.ambientLightColor[0] = r;
    this.ambientLightColor[1] = g;
    this.ambientLightColor[2] = b;
    return this;
};

/**
 * Changes the location of the light in the scene
 *
 * @method
 *
 * @param {String} path Path used as id of light
 * @param {Number} x x position
 * @param {Number} y y position
 * @param {Number} z z position
 *
 * @return {undefined} undefined
**/
WebGLRenderer.prototype.setLightPosition = function setLightPosition(path, x, y, z) {
    var light = this.lightRegistry[path] || this.createLight(path);

    light.position[0] = x;
    light.position[1] = y;
    light.position[2] = z;
    return this;
};

/**
 * Changes the color of a dynamic intensity lighting in the scene
 *
 * @method
 *
 * @param {String} path Path used as id of light in light Registry.
 * @param {Number} r red channel
 * @param {Number} g green channel
 * @param {Number} b blue channel
 *
 * @return {undefined} undefined
**/
WebGLRenderer.prototype.setLightColor = function setLightColor(path, r, g, b) {
    var light = this.lightRegistry[path] || this.createLight(path);

    light.color[0] = r;
    light.color[1] = g;
    light.color[2] = b;
    return this;
};

/**
 * Compiles material spec into program shader
 *
 * @method
 *
 * @param {String} path Path used as id of cutout in cutout registry.
 * @param {String} name Name that the rendering input the material is bound to
 * @param {Object} material Material spec
 *
 * @return {undefined} undefined
**/
WebGLRenderer.prototype.handleMaterialInput = function handleMaterialInput(path, name, material) {
    var mesh = this.meshRegistry[path] || this.createMesh(path);
    material = compileMaterial(material, mesh.textures.length);

    // Set uniforms to enable texture!

    mesh.uniformValues[mesh.uniformKeys.indexOf(name)][0] = -material._id;

    // Register textures!

    var i = material.textures.length;
    while (i--) {
        mesh.textures.push(
            this.textureManager.register(material.textures[i], mesh.textures.length + i)
        );
    }

    // Register material!

    this.program.registerMaterial(name, material);

    return this.updateSize();
};

/**
 * Changes the geometry data of a mesh
 *
 * @method
 *
 * @param {String} path Path used as id of cutout in cutout registry.
 * @param {Object} geometry Geometry object containing vertex data to be drawn
 * @param {Number} drawType Primitive identifier
 * @param {Boolean} dynamic Whether geometry is dynamic
 *
 * @return {undefined} undefined
**/
WebGLRenderer.prototype.setGeometry = function setGeometry(path, geometry, drawType, dynamic) {
    var mesh = this.meshRegistry[path] || this.createMesh(path);

    mesh.geometry = geometry;
    mesh.drawType = drawType;
    mesh.dynamic = dynamic;

    return this;
};

/**
 * Uploads a new value for the uniform data when the mesh is being drawn
 *
 * @method
 *
 * @param {String} path Path used as id of mesh in mesh registry
 * @param {String} uniformName Identifier used to upload value
 * @param {Array} uniformValue Value of uniform data
 *
 * @return {undefined} undefined
**/
WebGLRenderer.prototype.setMeshUniform = function setMeshUniform(path, uniformName, uniformValue) {
    var mesh = this.meshRegistry[path] || this.createMesh(path);

    var index = mesh.uniformKeys.indexOf(uniformName);

    if (index === -1) {
        mesh.uniformKeys.push(uniformName);
        mesh.uniformValues.push(uniformValue);
    }
    else {
        mesh.uniformValues[index] = uniformValue;
    }
};

/**
 * Triggers the 'draw' phase of the WebGLRenderer. Iterates through registries
 * to set uniforms, set attributes and issue draw commands for renderables.
 *
 * @method
 *
 * @param {String} path Path used as id of mesh in mesh registry
 * @param {Number} geometryId Id of geometry in geometry registry
 * @param {String} bufferName Attribute location name
 * @param {Array} bufferValue Vertex data
 * @param {Number} bufferSpacing The dimensions of the vertex
 * @param {Boolean} isDynamic Whether geometry is dynamic
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.bufferData = function bufferData(path, geometryId, bufferName, bufferValue, bufferSpacing, isDynamic) {
    this.bufferRegistry.allocate(geometryId, bufferName, bufferValue, bufferSpacing, isDynamic);

    return this;
};

/**
 * Triggers the 'draw' phase of the WebGLRenderer. Iterates through registries
 * to set uniforms, set attributes and issue draw commands for renderables.
 *
 * @method
 *
 * @param {Object} renderState Parameters provided by the compositor, that affect the rendering of all renderables.
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.draw = function draw(renderState) {
    var time = this.compositor.getTime();

    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    this.textureManager.update(time);

    this.meshRegistryKeys = sorter(this.meshRegistryKeys, this.meshRegistry);

    this.setGlobalUniforms(renderState);
    this.drawCutouts();
    this.drawMeshes();
};

/**
 * Iterates through and draws all registered meshes. This includes
 * binding textures, handling draw options, setting mesh uniforms
 * and drawing mesh buffers.
 *
 * @method
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.drawMeshes = function drawMeshes() {
    var gl = this.gl;
    var buffers;
    var mesh;

    for(var i = 0; i < this.meshRegistryKeys.length; i++) {
        mesh = this.meshRegistry[this.meshRegistryKeys[i]];
        buffers = this.bufferRegistry.registry[mesh.geometry];

        if (!mesh.visible) continue;

        if (mesh.uniformValues[0] < 1) {
            gl.depthMask(false);
            gl.enable(gl.BLEND);
        }
        else {
            gl.depthMask(true);
            gl.disable(gl.BLEND);
        }

        if (!buffers) continue;

        var j = mesh.textures.length;
        while (j--) this.textureManager.bindTexture(mesh.textures[j]);

        if (mesh.options) this.handleOptions(mesh.options, mesh);

        this.program.setUniforms(mesh.uniformKeys, mesh.uniformValues);
        this.drawBuffers(buffers, mesh.drawType, mesh.geometry);

        if (mesh.options) this.resetOptions(mesh.options);
    }
};

/**
 * Iterates through and draws all registered cutout meshes. Blending
 * is disabled, cutout uniforms are set and finally buffers are drawn.
 *
 * @method
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.drawCutouts = function drawCutouts() {
    var cutout;
    var buffers;
    var len = this.cutoutRegistryKeys.length;

    if (len) {
        this.gl.enable(this.gl.BLEND);
        this.gl.depthMask(true);
    }

    for (var i = 0; i < len; i++) {
        cutout = this.cutoutRegistry[this.cutoutRegistryKeys[i]];
        buffers = this.bufferRegistry.registry[cutout.geometry];

        if (!cutout.visible) continue;

        this.program.setUniforms(cutout.uniformKeys, cutout.uniformValues);
        this.drawBuffers(buffers, cutout.drawType, cutout.geometry);
    }
};

/**
 * Sets uniforms to be shared by all meshes.
 *
 * @method
 *
 * @param {Object} renderState Draw state options passed down from compositor.
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.setGlobalUniforms = function setGlobalUniforms(renderState) {
    var light;
    var stride;

    for (var i = 0, len = this.lightRegistryKeys.length; i < len; i++) {
        light = this.lightRegistry[this.lightRegistryKeys[i]];
        stride = i * 4;

        // Build the light positions' 4x4 matrix

        this.lightPositions[0 + stride] = light.position[0];
        this.lightPositions[1 + stride] = light.position[1];
        this.lightPositions[2 + stride] = light.position[2];

        // Build the light colors' 4x4 matrix

        this.lightColors[0 + stride] = light.color[0];
        this.lightColors[1 + stride] = light.color[1];
        this.lightColors[2 + stride] = light.color[2];
    }

    globalUniforms.values[0] = this.numLights;
    globalUniforms.values[1] = this.ambientLightColor;
    globalUniforms.values[2] = this.lightPositions;
    globalUniforms.values[3] = this.lightColors;

    /*
     * Set time and projection uniforms
     * projecting world space into a 2d plane representation of the canvas.
     * The x and y scale (this.projectionTransform[0] and this.projectionTransform[5] respectively)
     * convert the projected geometry back into clipspace.
     * The perpective divide (this.projectionTransform[11]), adds the z value of the point
     * multiplied by the perspective divide to the w value of the point. In the process
     * of converting from homogenous coordinates to NDC (normalized device coordinates)
     * the x and y values of the point are divided by w, which implements perspective.
     */
    this.projectionTransform[0] = 1 / (this.cachedSize[0] * 0.5);
    this.projectionTransform[5] = -1 / (this.cachedSize[1] * 0.5);
    this.projectionTransform[11] = renderState.perspectiveTransform[11];

    globalUniforms.values[4] = this.projectionTransform;
    globalUniforms.values[5] = this.compositor.getTime() * 0.001;
    globalUniforms.values[6] = renderState.viewTransform;

    this.program.setUniforms(globalUniforms.keys, globalUniforms.values);
};

/**
 * Loads the buffers and issues the draw command for a geometry.
 *
 * @method
 *
 * @param {Object} vertexBuffers All buffers used to draw the geometry.
 * @param {Number} mode Enumerator defining what primitive to draw
 * @param {Number} id ID of geometry being drawn.
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.drawBuffers = function drawBuffers(vertexBuffers, mode, id) {
    var gl = this.gl;
    var length = 0;
    var attribute;
    var location;
    var spacing;
    var offset;
    var buffer;
    var iter;
    var j;
    var i;

    iter = vertexBuffers.keys.length;
    for (i = 0; i < iter; i++) {
        attribute = vertexBuffers.keys[i];

        // Do not set vertexAttribPointer if index buffer.

        if (attribute === 'indices') {
            j = i; continue;
        }

        // Retreive the attribute location and make sure it is enabled.

        location = this.program.attributeLocations[attribute];

        if (location === -1) continue;
        if (location === undefined) {
            location = gl.getAttribLocation(this.program.program, attribute);
            this.program.attributeLocations[attribute] = location;
            if (location === -1) continue;
        }

        if (!this.state.enabledAttributes[attribute]) {
            gl.enableVertexAttribArray(location);
            this.state.enabledAttributes[attribute] = true;
            this.state.enabledAttributesKeys.push(attribute);
        }

        // Retreive buffer information used to set attribute pointer.

        buffer = vertexBuffers.values[i];
        spacing = vertexBuffers.spacing[i];
        offset = vertexBuffers.offset[i];
        length = vertexBuffers.length[i];

        // Skip bindBuffer if buffer is currently bound.

        if (this.state.boundArrayBuffer !== buffer) {
            gl.bindBuffer(buffer.target, buffer.buffer);
            this.state.boundArrayBuffer = buffer;
        }

        if (this.state.lastDrawn !== id) {
            gl.vertexAttribPointer(location, spacing, gl.FLOAT, gl.FALSE, 0, 4 * offset);
        }
    }

    // Disable any attributes that not currently being used.

    var len = this.state.enabledAttributesKeys.length;
    for (i = 0; i < len; i++) {
        var key = this.state.enabledAttributesKeys[i];
        if (this.state.enabledAttributes[key] && vertexBuffers.keys.indexOf(key) === -1) {
            gl.disableVertexAttribArray(this.program.attributeLocations[key]);
            this.state.enabledAttributes[key] = false;
        }
    }

    if (length) {

        // If index buffer, use drawElements.

        if (j !== undefined) {
            buffer = vertexBuffers.values[j];
            offset = vertexBuffers.offset[j];
            spacing = vertexBuffers.spacing[j];
            length = vertexBuffers.length[j];

            // Skip bindBuffer if buffer is currently bound.

            if (this.state.boundElementBuffer !== buffer) {
                gl.bindBuffer(buffer.target, buffer.buffer);
                this.state.boundElementBuffer = buffer;
            }

            gl.drawElements(gl[mode], length, gl.UNSIGNED_SHORT, 2 * offset);
        }
        else {
            gl.drawArrays(gl[mode], 0, length);
        }
    }

    this.state.lastDrawn = id;
};

/**
 * Updates the width and height of parent canvas, sets the viewport size on
 * the WebGL context and updates the resolution uniform for the shader program.
 * Size is retreived from the container object of the renderer.
 *
 * @method
 *
 * @param {Array} size width, height and depth of canvas
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.updateSize = function updateSize(size) {
    if (size) {
        this.cachedSize[0] = size[0];
        this.cachedSize[1] = size[1];
        this.cachedSize[2] = (size[0] > size[1]) ? size[0] : size[1];
    }

    this.gl.viewport(0, 0, this.cachedSize[0], this.cachedSize[1]);

    this.resolutionValues[0] = this.cachedSize;
    this.program.setUniforms(this.resolutionName, this.resolutionValues);

    return this;
};

/**
 * Updates the state of the WebGL drawing context based on custom parameters
 * defined on a mesh.
 *
 * @method
 *
 * @param {Object} options Draw state options to be set to the context.
 * @param {Mesh} mesh Associated Mesh
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.handleOptions = function handleOptions(options, mesh) {
    var gl = this.gl;
    if (!options) return;

    if (options.side === 'double') {
        this.gl.cullFace(this.gl.FRONT);
        this.drawBuffers(this.bufferRegistry.registry[mesh.geometry], mesh.drawType, mesh.geometry);
        this.gl.cullFace(this.gl.BACK);
    }

    if (options.blending) gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    if (options.side === 'back') gl.cullFace(gl.FRONT);
};

/**
 * Resets the state of the WebGL drawing context to default values.
 *
 * @method
 *
 * @param {Object} options Draw state options to be set to the context.
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.resetOptions = function resetOptions(options) {
    var gl = this.gl;
    if (!options) return;
    if (options.blending) gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    if (options.side === 'back') gl.cullFace(gl.BACK);
};

WebGLRenderer.DEFAULT_STYLES = {
    pointerEvents: 'none',
    position: 'absolute',
    zIndex: 1,
    top: '0px',
    left: '0px'
};

module.exports = WebGLRenderer;

},{"../utilities/keyValueToArrays":36,"../webgl-geometries/primitives/Plane":40,"./BufferRegistry":42,"./Program":44,"./TextureManager":46,"./compileMaterial":48,"./radixSort":50}],48:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
'use strict';

var types = {
    1: 'float ',
    2: 'vec2 ',
    3: 'vec3 ',
    4: 'vec4 '
};

/**
 * Traverses material to create a string of glsl code to be applied in
 * the vertex or fragment shader.
 *
 * @method
 * @protected
 *
 * @param {Object} material Material to be compiled.
 * @param {Number} textureSlot Next available texture slot for Mesh.
 *
 * @return {undefined} undefined
 */
function compileMaterial(material, textureSlot) {
    var glsl = '';
    var uniforms = {};
    var varyings = {};
    var attributes = {};
    var defines = [];
    var textures = [];

    _traverse(material, function (node, depth) {
        if (! node.chunk) return;

        var type = types[_getOutputLength(node)];
        var label = _makeLabel(node);
        var output = _processGLSL(node.chunk.glsl, node.inputs, textures.length + textureSlot);

        glsl += type + label + ' = ' + output + '\n ';

        if (node.uniforms) _extend(uniforms, node.uniforms);
        if (node.varyings) _extend(varyings, node.varyings);
        if (node.attributes) _extend(attributes, node.attributes);
        if (node.chunk.defines) defines.push(node.chunk.defines);
        if (node.texture) textures.push(node.texture);
    });

    return {
        _id: material._id,
        glsl: glsl + 'return ' + _makeLabel(material) + ';',
        defines: defines.join('\n'),
        uniforms: uniforms,
        varyings: varyings,
        attributes: attributes,
        textures: textures
    };
}

// Recursively iterates over a material's inputs, invoking a given callback
// with the current material
function _traverse(material, callback) {
	var inputs = material.inputs;
    var len = inputs && inputs.length;
    var idx = -1;

    while (++idx < len) _traverse(inputs[idx], callback);

    callback(material);

    return material;
}

// Helper function used to infer length of the output
// from a given material node.
function _getOutputLength(node) {

    // Handle constant values

    if (typeof node === 'number') return 1;
    if (Array.isArray(node)) return node.length;

    // Handle materials

    var output = node.chunk.output;
    if (typeof output === 'number') return output;

    // Handle polymorphic output

    var key = node.inputs.map(function recurse(node) {
        return _getOutputLength(node);
    }).join(',');

    return output[key];
}

// Helper function to run replace inputs and texture tags with
// correct glsl.
function _processGLSL(str, inputs, textureSlot) {
    return str
        .replace(/%\d/g, function (s) {
            return _makeLabel(inputs[s[1]-1]);
        })
        .replace(/\$TEXTURE/, 'u_textures[' + textureSlot + ']');
}

// Helper function used to create glsl definition of the
// input material node.
function _makeLabel (n) {
    if (Array.isArray(n)) return _arrayToVec(n);
    if (typeof n === 'object') return 'fa_' + (n._id);
    else return n.toFixed(6);
}

// Helper to copy the properties of an object onto another object.
function _extend (a, b) {
	for (var k in b) a[k] = b[k];
}

// Helper to create glsl vector representation of a javascript array.
function _arrayToVec(array) {
    var len = array.length;
    return 'vec' + len + '(' + array.join(',')  + ')';
}

module.exports = compileMaterial;

},{}],49:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

// Generates a checkerboard pattern to be used as a placeholder texture while an
// image loads over the network.
function createCheckerBoard() {
    var context = document.createElement('canvas').getContext('2d');
    context.canvas.width = context.canvas.height = 128;
    for (var y = 0; y < context.canvas.height; y += 16) {
        for (var x = 0; x < context.canvas.width; x += 16) {
            context.fillStyle = (x ^ y) & 16 ? '#FFF' : '#DDD';
            context.fillRect(x, y, 16, 16);
        }
    }

    return context.canvas;
}

module.exports = createCheckerBoard;

},{}],50:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
'use strict';

var radixBits = 11,
    maxRadix = 1 << (radixBits),
    radixMask = maxRadix - 1,
    buckets = new Array(maxRadix * Math.ceil(64 / radixBits)),
    msbMask = 1 << ((32 - 1) % radixBits),
    lastMask = (msbMask << 1) - 1,
    passCount = ((32 / radixBits) + 0.999999999999999) | 0,
    maxOffset = maxRadix * (passCount - 1),
    normalizer = Math.pow(20, 6);

var buffer = new ArrayBuffer(4);
var floatView = new Float32Array(buffer, 0, 1);
var intView = new Int32Array(buffer, 0, 1);

// comparator pulls relevant sorting keys out of mesh
function comp(list, registry, i) {
    var key = list[i];
    var item = registry[key];
    return (item.depth ? item.depth : registry[key].uniformValues[1][14]) + normalizer;
}

//mutator function records mesh's place in previous pass
function mutator(list, registry, i, value) {
    var key = list[i];
    registry[key].depth = intToFloat(value) - normalizer;
    return key;
}

//clean function removes mutator function's record
function clean(list, registry, i) {
    registry[list[i]].depth = null;
}

//converts a javascript float to a 32bit integer using an array buffer
//of size one
function floatToInt(k) {
    floatView[0] = k;
    return intView[0];
}
//converts a 32 bit integer to a regular javascript float using an array buffer
//of size one
function intToFloat(k) {
    intView[0] = k;
    return floatView[0];
}

//sorts a list of mesh IDs according to their z-depth
function radixSort(list, registry) {
    var pass = 0;
    var out = [];

    var i, j, k, n, div, offset, swap, id, sum, tsum, size;

    passCount = ((32 / radixBits) + 0.999999999999999) | 0;

    for (i = 0, n = maxRadix * passCount; i < n; i++) buckets[i] = 0;

    for (i = 0, n = list.length; i < n; i++) {
        div = floatToInt(comp(list, registry, i));
        div ^= div >> 31 | 0x80000000;
        for (j = 0, k = 0; j < maxOffset; j += maxRadix, k += radixBits) {
            buckets[j + (div >>> k & radixMask)]++;
        }
        buckets[j + (div >>> k & lastMask)]++;
    }

    for (j = 0; j <= maxOffset; j += maxRadix) {
        for (id = j, sum = 0; id < j + maxRadix; id++) {
            tsum = buckets[id] + sum;
            buckets[id] = sum - 1;
            sum = tsum;
        }
    }
    if (--passCount) {
        for (i = 0, n = list.length; i < n; i++) {
            div = floatToInt(comp(list, registry, i));
            out[++buckets[div & radixMask]] = mutator(list, registry, i, div ^= div >> 31 | 0x80000000);
        }
        
        swap = out;
        out = list;
        list = swap;
        while (++pass < passCount) {
            for (i = 0, n = list.length, offset = pass * maxRadix, size = pass * radixBits; i < n; i++) {
                div = floatToInt(comp(list, registry, i));
                out[++buckets[offset + (div >>> size & radixMask)]] = list[i];
            }

            swap = out;
            out = list;
            list = swap;
        }
    }

    for (i = 0, n = list.length, offset = pass * maxRadix, size = pass * radixBits; i < n; i++) {
        div = floatToInt(comp(list, registry, i));
        out[++buckets[offset + (div >>> size & lastMask)]] = mutator(list, registry, i, div ^ (~div >> 31 | 0x80000000));
        clean(list, registry, i);
    }

    return out;
}

module.exports = radixSort;

},{}],51:[function(require,module,exports){
"use strict";
var glslify = require("glslify");
var shaders = require("glslify/simple-adapter.js")("\n#define GLSLIFY 1\n\nmat3 a_x_getNormalMatrix(in mat4 t) {\n  mat3 matNorm;\n  mat4 a = t;\n  float a00 = a[0][0], a01 = a[0][1], a02 = a[0][2], a03 = a[0][3], a10 = a[1][0], a11 = a[1][1], a12 = a[1][2], a13 = a[1][3], a20 = a[2][0], a21 = a[2][1], a22 = a[2][2], a23 = a[2][3], a30 = a[3][0], a31 = a[3][1], a32 = a[3][2], a33 = a[3][3], b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32, det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;\n  det = 1.0 / det;\n  matNorm[0][0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;\n  matNorm[0][1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;\n  matNorm[0][2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;\n  matNorm[1][0] = (a02 * b10 - a01 * b11 - a03 * b09) * det;\n  matNorm[1][1] = (a00 * b11 - a02 * b08 + a03 * b07) * det;\n  matNorm[1][2] = (a01 * b08 - a00 * b10 - a03 * b06) * det;\n  matNorm[2][0] = (a31 * b05 - a32 * b04 + a33 * b03) * det;\n  matNorm[2][1] = (a32 * b02 - a30 * b05 - a33 * b01) * det;\n  matNorm[2][2] = (a30 * b04 - a31 * b02 + a33 * b00) * det;\n  return matNorm;\n}\nfloat b_x_inverse(float m) {\n  return 1.0 / m;\n}\nmat2 b_x_inverse(mat2 m) {\n  return mat2(m[1][1], -m[0][1], -m[1][0], m[0][0]) / (m[0][0] * m[1][1] - m[0][1] * m[1][0]);\n}\nmat3 b_x_inverse(mat3 m) {\n  float a00 = m[0][0], a01 = m[0][1], a02 = m[0][2];\n  float a10 = m[1][0], a11 = m[1][1], a12 = m[1][2];\n  float a20 = m[2][0], a21 = m[2][1], a22 = m[2][2];\n  float b01 = a22 * a11 - a12 * a21;\n  float b11 = -a22 * a10 + a12 * a20;\n  float b21 = a21 * a10 - a11 * a20;\n  float det = a00 * b01 + a01 * b11 + a02 * b21;\n  return mat3(b01, (-a22 * a01 + a02 * a21), (a12 * a01 - a02 * a11), b11, (a22 * a00 - a02 * a20), (-a12 * a00 + a02 * a10), b21, (-a21 * a00 + a01 * a20), (a11 * a00 - a01 * a10)) / det;\n}\nmat4 b_x_inverse(mat4 m) {\n  float a00 = m[0][0], a01 = m[0][1], a02 = m[0][2], a03 = m[0][3], a10 = m[1][0], a11 = m[1][1], a12 = m[1][2], a13 = m[1][3], a20 = m[2][0], a21 = m[2][1], a22 = m[2][2], a23 = m[2][3], a30 = m[3][0], a31 = m[3][1], a32 = m[3][2], a33 = m[3][3], b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32, det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;\n  return mat4(a11 * b11 - a12 * b10 + a13 * b09, a02 * b10 - a01 * b11 - a03 * b09, a31 * b05 - a32 * b04 + a33 * b03, a22 * b04 - a21 * b05 - a23 * b03, a12 * b08 - a10 * b11 - a13 * b07, a00 * b11 - a02 * b08 + a03 * b07, a32 * b02 - a30 * b05 - a33 * b01, a20 * b05 - a22 * b02 + a23 * b01, a10 * b10 - a11 * b08 + a13 * b06, a01 * b08 - a00 * b10 - a03 * b06, a30 * b04 - a31 * b02 + a33 * b00, a21 * b02 - a20 * b04 - a23 * b00, a11 * b07 - a10 * b09 - a12 * b06, a00 * b09 - a01 * b07 + a02 * b06, a31 * b01 - a30 * b03 - a32 * b00, a20 * b03 - a21 * b01 + a22 * b00) / det;\n}\nfloat c_x_transpose(float m) {\n  return m;\n}\nmat2 c_x_transpose(mat2 m) {\n  return mat2(m[0][0], m[1][0], m[0][1], m[1][1]);\n}\nmat3 c_x_transpose(mat3 m) {\n  return mat3(m[0][0], m[1][0], m[2][0], m[0][1], m[1][1], m[2][1], m[0][2], m[1][2], m[2][2]);\n}\nmat4 c_x_transpose(mat4 m) {\n  return mat4(m[0][0], m[1][0], m[2][0], m[3][0], m[0][1], m[1][1], m[2][1], m[3][1], m[0][2], m[1][2], m[2][2], m[3][2], m[0][3], m[1][3], m[2][3], m[3][3]);\n}\nvec4 applyTransform(vec4 pos) {\n  mat4 MVMatrix = u_view * u_transform;\n  pos.x += 1.0;\n  pos.y -= 1.0;\n  pos.xyz *= u_size * 0.5;\n  pos.y *= -1.0;\n  v_position = (MVMatrix * pos).xyz;\n  v_eyeVector = (u_resolution * 0.5) - v_position;\n  pos = u_perspective * MVMatrix * pos;\n  return pos;\n}\n#vert_definitions\n\nvec3 calculateOffset(vec3 ID) {\n  \n  #vert_applications\n  return vec3(0.0);\n}\nvoid main() {\n  v_textureCoordinate = a_texCoord;\n  vec3 invertedNormals = a_normals + (u_normals.x < 0.0 ? calculateOffset(u_normals) * 2.0 - 1.0 : vec3(0.0));\n  invertedNormals.y *= -1.0;\n  v_normal = c_x_transpose(mat3(b_x_inverse(u_transform))) * invertedNormals;\n  vec3 offsetPos = a_pos + calculateOffset(u_positionOffset);\n  gl_Position = applyTransform(vec4(offsetPos, 1.0));\n}", "\n#define GLSLIFY 1\n\n#float_definitions\n\nfloat a_x_applyMaterial(float ID) {\n  \n  #float_applications\n  return 1.;\n}\n#vec3_definitions\n\nvec3 a_x_applyMaterial(vec3 ID) {\n  \n  #vec3_applications\n  return vec3(0);\n}\n#vec4_definitions\n\nvec4 a_x_applyMaterial(vec4 ID) {\n  \n  #vec4_applications\n  return vec4(0);\n}\nvec4 b_x_applyLight(in vec4 baseColor, in vec3 normal, in vec4 glossiness) {\n  int numLights = int(u_numLights);\n  vec3 ambientColor = u_ambientLight * baseColor.rgb;\n  vec3 eyeVector = normalize(v_eyeVector);\n  vec3 diffuse = vec3(0.0);\n  bool hasGlossiness = glossiness.a > 0.0;\n  bool hasSpecularColor = length(glossiness.rgb) > 0.0;\n  for(int i = 0; i < 4; i++) {\n    if(i >= numLights)\n      break;\n    vec3 lightDirection = normalize(u_lightPosition[i].xyz - v_position);\n    float lambertian = max(dot(lightDirection, normal), 0.0);\n    if(lambertian > 0.0) {\n      diffuse += u_lightColor[i].rgb * baseColor.rgb * lambertian;\n      if(hasGlossiness) {\n        vec3 halfVector = normalize(lightDirection + eyeVector);\n        float specularWeight = pow(max(dot(halfVector, normal), 0.0), glossiness.a);\n        vec3 specularColor = hasSpecularColor ? glossiness.rgb : u_lightColor[i].rgb;\n        diffuse += specularColor * specularWeight * lambertian;\n      }\n    }\n  }\n  return vec4(ambientColor + diffuse, baseColor.a);\n}\nvoid main() {\n  vec4 material = u_baseColor.r >= 0.0 ? u_baseColor : a_x_applyMaterial(u_baseColor);\n  bool lightsEnabled = (u_flatShading == 0.0) && (u_numLights > 0.0 || length(u_ambientLight) > 0.0);\n  vec3 normal = normalize(v_normal);\n  vec4 glossiness = u_glossiness.x < 0.0 ? a_x_applyMaterial(u_glossiness) : u_glossiness;\n  vec4 color = lightsEnabled ? b_x_applyLight(material, normalize(v_normal), glossiness) : material;\n  gl_FragColor = color;\n  gl_FragColor.a *= u_opacity;\n}", [], []);
module.exports = shaders;
},{"glslify":26,"glslify/simple-adapter.js":27}],52:[function(require,module,exports){
'use strict';

var Node = require('famous/core/Node');

function Twitterus(mount) {
    // Extend Node
    Node.call(this);

    makeHeader(this);
    makeFooter(this);
    makeSwapper(this);
}

// Extend the prototype
Twitterus.prototype = Object.create(Node.prototype);

function makeHeader(node) {
    // the header will be positioned defaultly
    // along the top of its parent.
    // It will be the complete width of its parent
    // and 100 pixels tall.
    node.addChild().setSizeMode('default', 'absolute').setAbsoluteSize(null, 100).addChild();
}

function makeSwapper(node) {
    // the swapper will be 200 pixels smaller than
    // its parent in Y and otherwise the same size.
    // It will be position 100 pixels below its parent
    // such that it clears the header
    node.addChild().setDifferentialSize(null, -200).setPosition(0, 100).addChild();
}

function makeFooter(node) {
    // the footer will be aligned
    // to the bottom of its parent.
    // Like the header it will be
    // 100px tall and the complete width.
    // note how we use MountPoint and Align
    // together to line up the bottom of the footer
    // with the bottom of the parent
    node.addChild().setSizeMode('default', 'absolute').setAbsoluteSize(null, 100).setMountPoint(0, 1).setAlign(0, 1).addChild();
}

module.exports = Twitterus;

},{"famous/core/Node":7}],53:[function(require,module,exports){
'use strict';

var Twitterus = require('./Twitterus');
var FamousEngine = require('famous/core/FamousEngine');

//create the app and pass in the target element
var twitterus = FamousEngine.createScene().addChild(new Twitterus());

},{"./Twitterus":52,"famous/core/FamousEngine":6}]},{},[53])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2NvbXBvbmVudHMvQ2FtZXJhLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9jb3JlL0NoYW5uZWwuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2NvcmUvQ2xvY2suanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2NvcmUvRGlzcGF0Y2guanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2NvcmUvRXZlbnQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2NvcmUvRmFtb3VzRW5naW5lLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9jb3JlL05vZGUuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2NvcmUvU2NlbmUuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2NvcmUvU2l6ZS5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvY29yZS9UcmFuc2Zvcm0uanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2RvbS1yZW5kZXJlcnMvRE9NUmVuZGVyZXIuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2RvbS1yZW5kZXJlcnMvRWxlbWVudENhY2hlLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9kb20tcmVuZGVyZXJzL01hdGguanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2RvbS1yZW5kZXJlcnMvZXZlbnRzL0NvbXBvc2l0aW9uRXZlbnQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2RvbS1yZW5kZXJlcnMvZXZlbnRzL0V2ZW50LmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9kb20tcmVuZGVyZXJzL2V2ZW50cy9FdmVudE1hcC5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvZG9tLXJlbmRlcmVycy9ldmVudHMvRm9jdXNFdmVudC5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvZG9tLXJlbmRlcmVycy9ldmVudHMvSW5wdXRFdmVudC5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvZG9tLXJlbmRlcmVycy9ldmVudHMvS2V5Ym9hcmRFdmVudC5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvZG9tLXJlbmRlcmVycy9ldmVudHMvTW91c2VFdmVudC5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvZG9tLXJlbmRlcmVycy9ldmVudHMvVG91Y2hFdmVudC5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvZG9tLXJlbmRlcmVycy9ldmVudHMvVUlFdmVudC5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvZG9tLXJlbmRlcmVycy9ldmVudHMvV2hlZWxFdmVudC5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvbWF0aC9WZWMyLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9tYXRoL1ZlYzMuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL25vZGVfbW9kdWxlcy9nbHNsaWZ5L2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL25vZGVfbW9kdWxlcy9nbHNsaWZ5L3NpbXBsZS1hZGFwdGVyLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9wb2x5ZmlsbHMvYW5pbWF0aW9uRnJhbWUuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3BvbHlmaWxscy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvcmVuZGVyLWxvb3BzL1JlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3JlbmRlcmVycy9Db21wb3NpdG9yLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9yZW5kZXJlcnMvQ29udGV4dC5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvcmVuZGVyZXJzL1VJTWFuYWdlci5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvcmVuZGVyZXJzL2luamVjdC1jc3MuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3V0aWxpdGllcy9jbG9uZS5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvdXRpbGl0aWVzL2tleVZhbHVlVG9BcnJheXMuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3V0aWxpdGllcy92ZW5kb3JQcmVmaXguanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3dlYmdsLWdlb21ldHJpZXMvR2VvbWV0cnkuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3dlYmdsLWdlb21ldHJpZXMvR2VvbWV0cnlIZWxwZXIuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3dlYmdsLWdlb21ldHJpZXMvcHJpbWl0aXZlcy9QbGFuZS5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvd2ViZ2wtcmVuZGVyZXJzL0J1ZmZlci5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvd2ViZ2wtcmVuZGVyZXJzL0J1ZmZlclJlZ2lzdHJ5LmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy93ZWJnbC1yZW5kZXJlcnMvRGVidWcuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3dlYmdsLXJlbmRlcmVycy9Qcm9ncmFtLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy93ZWJnbC1yZW5kZXJlcnMvVGV4dHVyZS5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvd2ViZ2wtcmVuZGVyZXJzL1RleHR1cmVNYW5hZ2VyLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy93ZWJnbC1yZW5kZXJlcnMvV2ViR0xSZW5kZXJlci5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvd2ViZ2wtcmVuZGVyZXJzL2NvbXBpbGVNYXRlcmlhbC5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvd2ViZ2wtcmVuZGVyZXJzL2NyZWF0ZUNoZWNrZXJib2FyZC5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvd2ViZ2wtcmVuZGVyZXJzL3JhZGl4U29ydC5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvd2ViZ2wtc2hhZGVycy9pbmRleC5qcyIsIi9Vc2Vycy9tb3JnYW50aGVwbGFudC9EZXNrdG9wL2xlc3Nvbi10d2l0dGVydXMtc3RhcnRlci1raXQvc3JjL3R3aXR0ZXJ1cy9Ud2l0dGVydXMuanMiLCIvVXNlcnMvbW9yZ2FudGhlcGxhbnQvRGVza3RvcC9sZXNzb24tdHdpdHRlcnVzLXN0YXJ0ZXIta2l0L3NyYy90d2l0dGVydXMvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdlRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaE5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOWxCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDelhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbmVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaE5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzkwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaklBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDSEEsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUM7O0FBRXZDLFNBQVMsU0FBUyxDQUFDLEtBQUssRUFBRTs7QUFFdEIsUUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzs7QUFFaEIsY0FBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ2pCLGNBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNqQixlQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7Q0FDckI7OztBQUdELFNBQVMsQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7O0FBRXBELFNBQVMsVUFBVSxDQUFDLElBQUksRUFBRTs7Ozs7QUFLdEIsUUFBSSxDQUFDLFFBQVEsRUFBRSxDQUNWLFdBQVcsQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQ2xDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQzFCLFFBQVEsRUFBRSxDQUFDO0NBQ25COztBQUVELFNBQVMsV0FBVyxDQUFDLElBQUksRUFBRTs7Ozs7QUFLdkIsUUFBSSxDQUFDLFFBQVEsRUFBRSxDQUNWLG1CQUFtQixDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUMvQixXQUFXLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUNuQixRQUFRLEVBQUUsQ0FBQztDQUNuQjs7QUFFRCxTQUFTLFVBQVUsQ0FBQyxJQUFJLEVBQUU7Ozs7Ozs7O0FBUXRCLFFBQUksQ0FBQyxRQUFRLEVBQUUsQ0FDVixXQUFXLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUNsQyxlQUFlLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUMxQixhQUFhLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUNuQixRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUNkLFFBQVEsRUFBRSxDQUFDO0NBQ25COztBQUVELE1BQU0sQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFDOzs7OztBQ3BEM0IsSUFBSSxTQUFTLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ3ZDLElBQUksWUFBWSxHQUFHLE9BQU8sQ0FBQywwQkFBMEIsQ0FBQyxDQUFDOzs7QUFHdkQsSUFBSSxTQUFTLEdBQUcsWUFBWSxDQUFDLFdBQVcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLFNBQVMsRUFBRSxDQUFDLENBQUMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqIFxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqIFxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICogXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKiBcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBDYW1lcmEgaXMgYSBjb21wb25lbnQgdGhhdCBpcyByZXNwb25zaWJsZSBmb3Igc2VuZGluZyBpbmZvcm1hdGlvbiB0byB0aGUgcmVuZGVyZXIgYWJvdXQgd2hlcmVcbiAqIHRoZSBjYW1lcmEgaXMgaW4gdGhlIHNjZW5lLiAgVGhpcyBhbGxvd3MgdGhlIHVzZXIgdG8gc2V0IHRoZSB0eXBlIG9mIHByb2plY3Rpb24sIHRoZSBmb2NhbCBkZXB0aCxcbiAqIGFuZCBvdGhlciBwcm9wZXJ0aWVzIHRvIGFkanVzdCB0aGUgd2F5IHRoZSBzY2VuZXMgYXJlIHJlbmRlcmVkLlxuICpcbiAqIEBjbGFzcyBDYW1lcmFcbiAqXG4gKiBAcGFyYW0ge05vZGV9IG5vZGUgdG8gd2hpY2ggdGhlIGluc3RhbmNlIG9mIENhbWVyYSB3aWxsIGJlIGEgY29tcG9uZW50IG9mXG4gKi9cbmZ1bmN0aW9uIENhbWVyYShub2RlKSB7XG4gICAgdGhpcy5fbm9kZSA9IG5vZGU7XG4gICAgdGhpcy5fcHJvamVjdGlvblR5cGUgPSBDYW1lcmEuT1JUSE9HUkFQSElDX1BST0pFQ1RJT047XG4gICAgdGhpcy5fZm9jYWxEZXB0aCA9IDA7XG4gICAgdGhpcy5fbmVhciA9IDA7XG4gICAgdGhpcy5fZmFyID0gMDtcbiAgICB0aGlzLl9yZXF1ZXN0aW5nVXBkYXRlID0gZmFsc2U7XG4gICAgdGhpcy5faWQgPSBub2RlLmFkZENvbXBvbmVudCh0aGlzKTtcbiAgICB0aGlzLl92aWV3VHJhbnNmb3JtID0gbmV3IEZsb2F0MzJBcnJheShbMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMV0pO1xuICAgIHRoaXMuX3ZpZXdEaXJ0eSA9IGZhbHNlO1xuICAgIHRoaXMuX3BlcnNwZWN0aXZlRGlydHkgPSBmYWxzZTtcbiAgICB0aGlzLnNldEZsYXQoKTtcbn1cblxuQ2FtZXJhLkZSVVNUVU1fUFJPSkVDVElPTiA9IDA7XG5DYW1lcmEuUElOSE9MRV9QUk9KRUNUSU9OID0gMTtcbkNhbWVyYS5PUlRIT0dSQVBISUNfUFJPSkVDVElPTiA9IDI7XG5cbi8qKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge1N0cmluZ30gTmFtZSBvZiB0aGUgY29tcG9uZW50XG4gKi9cbkNhbWVyYS5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gJ0NhbWVyYSc7XG59O1xuXG4vKipcbiAqIEdldHMgb2JqZWN0IGNvbnRhaW5pbmcgc2VyaWFsaXplZCBkYXRhIGZvciB0aGUgY29tcG9uZW50XG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge09iamVjdH0gdGhlIHN0YXRlIG9mIHRoZSBjb21wb25lbnRcbiAqL1xuQ2FtZXJhLnByb3RvdHlwZS5nZXRWYWx1ZSA9IGZ1bmN0aW9uIGdldFZhbHVlKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIGNvbXBvbmVudDogdGhpcy50b1N0cmluZygpLFxuICAgICAgICBwcm9qZWN0aW9uVHlwZTogdGhpcy5fcHJvamVjdGlvblR5cGUsXG4gICAgICAgIGZvY2FsRGVwdGg6IHRoaXMuX2ZvY2FsRGVwdGgsXG4gICAgICAgIG5lYXI6IHRoaXMuX25lYXIsXG4gICAgICAgIGZhcjogdGhpcy5fZmFyXG4gICAgfTtcbn07XG5cbi8qKlxuICogU2V0IHRoZSBjb21wb25lbnRzIHN0YXRlIGJhc2VkIG9uIHNvbWUgc2VyaWFsaXplZCBkYXRhXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBzdGF0ZSBhbiBvYmplY3QgZGVmaW5pbmcgd2hhdCB0aGUgc3RhdGUgb2YgdGhlIGNvbXBvbmVudCBzaG91bGQgYmVcbiAqXG4gKiBAcmV0dXJuIHtCb29sZWFufSBzdGF0dXMgb2YgdGhlIHNldFxuICovXG5DYW1lcmEucHJvdG90eXBlLnNldFZhbHVlID0gZnVuY3Rpb24gc2V0VmFsdWUoc3RhdGUpIHtcbiAgICBpZiAodGhpcy50b1N0cmluZygpID09PSBzdGF0ZS5jb21wb25lbnQpIHtcbiAgICAgICAgdGhpcy5zZXQoc3RhdGUucHJvamVjdGlvblR5cGUsIHN0YXRlLmZvY2FsRGVwdGgsIHN0YXRlLm5lYXIsIHN0YXRlLmZhcik7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIFNldCB0aGUgaW50ZXJuYWxzIG9mIHRoZSBjb21wb25lbnRcbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHR5cGUgYW4gaWQgY29ycmVzcG9uZGluZyB0byB0aGUgdHlwZSBvZiBwcm9qZWN0aW9uIHRvIHVzZVxuICogQHBhcmFtIHtOdW1iZXJ9IGRlcHRoIHRoZSBkZXB0aCBmb3IgdGhlIHBpbmhvbGUgcHJvamVjdGlvbiBtb2RlbFxuICogQHBhcmFtIHtOdW1iZXJ9IG5lYXIgdGhlIGRpc3RhbmNlIG9mIHRoZSBuZWFyIGNsaXBwaW5nIHBsYW5lIGZvciBhIGZydXN0dW0gcHJvamVjdGlvblxuICogQHBhcmFtIHtOdW1iZXJ9IGZhciB0aGUgZGlzdGFuY3Qgb2YgdGhlIGZhciBjbGlwcGluZyBwbGFuZSBmb3IgYSBmcnVzdHVtIHByb2plY3Rpb25cbiAqIFxuICogQHJldHVybiB7Qm9vbGVhbn0gc3RhdHVzIG9mIHRoZSBzZXRcbiAqL1xuQ2FtZXJhLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiBzZXQodHlwZSwgZGVwdGgsIG5lYXIsIGZhcikge1xuICAgIGlmICghdGhpcy5fcmVxdWVzdGluZ1VwZGF0ZSkge1xuICAgICAgICB0aGlzLl9ub2RlLnJlcXVlc3RVcGRhdGUodGhpcy5faWQpO1xuICAgICAgICB0aGlzLl9yZXF1ZXN0aW5nVXBkYXRlID0gdHJ1ZTtcbiAgICB9XG4gICAgdGhpcy5fcHJvamVjdGlvblR5cGUgPSB0eXBlO1xuICAgIHRoaXMuX2ZvY2FsRGVwdGggPSBkZXB0aDtcbiAgICB0aGlzLl9uZWFyID0gbmVhcjtcbiAgICB0aGlzLl9mYXIgPSBmYXI7XG59O1xuXG4vKipcbiAqIFNldCB0aGUgY2FtZXJhIGRlcHRoIGZvciBhIHBpbmhvbGUgcHJvamVjdGlvbiBtb2RlbFxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gZGVwdGggdGhlIGRpc3RhbmNlIGJldHdlZW4gdGhlIENhbWVyYSBhbmQgdGhlIG9yaWdpblxuICpcbiAqIEByZXR1cm4ge0NhbWVyYX0gdGhpc1xuICovXG5DYW1lcmEucHJvdG90eXBlLnNldERlcHRoID0gZnVuY3Rpb24gc2V0RGVwdGgoZGVwdGgpIHtcbiAgICBpZiAoIXRoaXMuX3JlcXVlc3RpbmdVcGRhdGUpIHtcbiAgICAgICAgdGhpcy5fbm9kZS5yZXF1ZXN0VXBkYXRlKHRoaXMuX2lkKTtcbiAgICAgICAgdGhpcy5fcmVxdWVzdGluZ1VwZGF0ZSA9IHRydWU7XG4gICAgfVxuICAgIHRoaXMuX3BlcnNwZWN0aXZlRGlydHkgPSB0cnVlO1xuICAgIHRoaXMuX3Byb2plY3Rpb25UeXBlID0gQ2FtZXJhLlBJTkhPTEVfUFJPSkVDVElPTjtcbiAgICB0aGlzLl9mb2NhbERlcHRoID0gZGVwdGg7XG4gICAgdGhpcy5fbmVhciA9IDA7XG4gICAgdGhpcy5fZmFyID0gMDtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBHZXRzIG9iamVjdCBjb250YWluaW5nIHNlcmlhbGl6ZWQgZGF0YSBmb3IgdGhlIGNvbXBvbmVudFxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gbmVhciBkaXN0YW5jZSBmcm9tIHRoZSBuZWFyIGNsaXBwaW5nIHBsYW5lIHRvIHRoZSBjYW1lcmFcbiAqIEBwYXJhbSB7TnVtYmVyfSBmYXIgZGlzdGFuY2UgZnJvbSB0aGUgZmFyIGNsaXBwaW5nIHBsYW5lIHRvIHRoZSBjYW1lcmFcbiAqIFxuICogQHJldHVybiB7Q2FtZXJhfSB0aGlzXG4gKi9cbkNhbWVyYS5wcm90b3R5cGUuc2V0RnJ1c3R1bSA9IGZ1bmN0aW9uIHNldEZydXN0dW0obmVhciwgZmFyKSB7XG4gICAgaWYgKCF0aGlzLl9yZXF1ZXN0aW5nVXBkYXRlKSB7XG4gICAgICAgIHRoaXMuX25vZGUucmVxdWVzdFVwZGF0ZSh0aGlzLl9pZCk7XG4gICAgICAgIHRoaXMuX3JlcXVlc3RpbmdVcGRhdGUgPSB0cnVlO1xuICAgIH1cblxuICAgIHRoaXMuX3BlcnNwZWN0aXZlRGlydHkgPSB0cnVlO1xuICAgIHRoaXMuX3Byb2plY3Rpb25UeXBlID0gQ2FtZXJhLkZSVVNUVU1fUFJPSkVDVElPTjtcbiAgICB0aGlzLl9mb2NhbERlcHRoID0gMDtcbiAgICB0aGlzLl9uZWFyID0gbmVhcjtcbiAgICB0aGlzLl9mYXIgPSBmYXI7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0IHRoZSBDYW1lcmEgdG8gaGF2ZSBvcnRob2dyYXBoaWMgcHJvamVjdGlvblxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtDYW1lcmF9IHRoaXNcbiAqL1xuQ2FtZXJhLnByb3RvdHlwZS5zZXRGbGF0ID0gZnVuY3Rpb24gc2V0RmxhdCgpIHtcbiAgICBpZiAoIXRoaXMuX3JlcXVlc3RpbmdVcGRhdGUpIHtcbiAgICAgICAgdGhpcy5fbm9kZS5yZXF1ZXN0VXBkYXRlKHRoaXMuX2lkKTtcbiAgICAgICAgdGhpcy5fcmVxdWVzdGluZ1VwZGF0ZSA9IHRydWU7XG4gICAgfVxuXG4gICAgdGhpcy5fcGVyc3BlY3RpdmVEaXJ0eSA9IHRydWU7XG4gICAgdGhpcy5fcHJvamVjdGlvblR5cGUgPSBDYW1lcmEuT1JUSE9HUkFQSElDX1BST0pFQ1RJT047XG4gICAgdGhpcy5fZm9jYWxEZXB0aCA9IDA7XG4gICAgdGhpcy5fbmVhciA9IDA7XG4gICAgdGhpcy5fZmFyID0gMDtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBXaGVuIHRoZSBub2RlIHRoaXMgY29tcG9uZW50IGlzIGF0dGFjaGVkIHRvIHVwZGF0ZXMsIHRoZSBDYW1lcmEgd2lsbFxuICogc2VuZCBuZXcgY2FtZXJhIGluZm9ybWF0aW9uIHRvIHRoZSBDb21wb3NpdG9yIHRvIHVwZGF0ZSB0aGUgcmVuZGVyaW5nXG4gKiBvZiB0aGUgc2NlbmUuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkNhbWVyYS5wcm90b3R5cGUub25VcGRhdGUgPSBmdW5jdGlvbiBvblVwZGF0ZSgpIHtcbiAgICB0aGlzLl9yZXF1ZXN0aW5nVXBkYXRlID0gZmFsc2U7XG5cbiAgICB2YXIgcGF0aCA9IHRoaXMuX25vZGUuZ2V0TG9jYXRpb24oKTtcblxuICAgIHRoaXMuX25vZGVcbiAgICAgICAgLnNlbmREcmF3Q29tbWFuZCgnV0lUSCcpXG4gICAgICAgIC5zZW5kRHJhd0NvbW1hbmQocGF0aCk7XG5cbiAgICBpZiAodGhpcy5fcGVyc3BlY3RpdmVEaXJ0eSkge1xuICAgICAgICB0aGlzLl9wZXJzcGVjdGl2ZURpcnR5ID0gZmFsc2U7XG5cbiAgICAgICAgc3dpdGNoICh0aGlzLl9wcm9qZWN0aW9uVHlwZSkge1xuICAgICAgICAgICAgY2FzZSBDYW1lcmEuRlJVU1RVTV9QUk9KRUNUSU9OOlxuICAgICAgICAgICAgICAgIHRoaXMuX25vZGUuc2VuZERyYXdDb21tYW5kKCdGUlVTVFVNX1BST0pFQ1RJT04nKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCh0aGlzLl9uZWFyKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCh0aGlzLl9mYXIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBDYW1lcmEuUElOSE9MRV9QUk9KRUNUSU9OOlxuICAgICAgICAgICAgICAgIHRoaXMuX25vZGUuc2VuZERyYXdDb21tYW5kKCdQSU5IT0xFX1BST0pFQ1RJT04nKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCh0aGlzLl9mb2NhbERlcHRoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgQ2FtZXJhLk9SVEhPR1JBUEhJQ19QUk9KRUNUSU9OOlxuICAgICAgICAgICAgICAgIHRoaXMuX25vZGUuc2VuZERyYXdDb21tYW5kKCdPUlRIT0dSQVBISUNfUFJPSkVDVElPTicpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3ZpZXdEaXJ0eSkge1xuICAgICAgICB0aGlzLl92aWV3RGlydHkgPSBmYWxzZTtcblxuICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCgnQ0hBTkdFX1ZJRVdfVFJBTlNGT1JNJyk7XG4gICAgICAgIHRoaXMuX25vZGUuc2VuZERyYXdDb21tYW5kKHRoaXMuX3ZpZXdUcmFuc2Zvcm1bMF0pO1xuICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCh0aGlzLl92aWV3VHJhbnNmb3JtWzFdKTtcbiAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQodGhpcy5fdmlld1RyYW5zZm9ybVsyXSk7XG4gICAgICAgIHRoaXMuX25vZGUuc2VuZERyYXdDb21tYW5kKHRoaXMuX3ZpZXdUcmFuc2Zvcm1bM10pO1xuXG4gICAgICAgIHRoaXMuX25vZGUuc2VuZERyYXdDb21tYW5kKHRoaXMuX3ZpZXdUcmFuc2Zvcm1bNF0pO1xuICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCh0aGlzLl92aWV3VHJhbnNmb3JtWzVdKTtcbiAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQodGhpcy5fdmlld1RyYW5zZm9ybVs2XSk7XG4gICAgICAgIHRoaXMuX25vZGUuc2VuZERyYXdDb21tYW5kKHRoaXMuX3ZpZXdUcmFuc2Zvcm1bN10pO1xuXG4gICAgICAgIHRoaXMuX25vZGUuc2VuZERyYXdDb21tYW5kKHRoaXMuX3ZpZXdUcmFuc2Zvcm1bOF0pO1xuICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCh0aGlzLl92aWV3VHJhbnNmb3JtWzldKTtcbiAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQodGhpcy5fdmlld1RyYW5zZm9ybVsxMF0pO1xuICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCh0aGlzLl92aWV3VHJhbnNmb3JtWzExXSk7XG5cbiAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQodGhpcy5fdmlld1RyYW5zZm9ybVsxMl0pO1xuICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCh0aGlzLl92aWV3VHJhbnNmb3JtWzEzXSk7XG4gICAgICAgIHRoaXMuX25vZGUuc2VuZERyYXdDb21tYW5kKHRoaXMuX3ZpZXdUcmFuc2Zvcm1bMTRdKTtcbiAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQodGhpcy5fdmlld1RyYW5zZm9ybVsxNV0pO1xuICAgIH1cbn07XG5cbi8qKlxuICogV2hlbiB0aGUgdHJhbnNmb3JtIG9mIHRoZSBub2RlIHRoaXMgY29tcG9uZW50IGlzIGF0dGFjaGVkIHRvXG4gKiBjaGFuZ2VzLCBoYXZlIHRoZSBDYW1lcmEgdXBkYXRlIGl0cyBwcm9qZWN0aW9uIG1hdHJpeCBhbmRcbiAqIGlmIG5lZWRlZCwgZmxhZyB0byBub2RlIHRvIHVwZGF0ZS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtBcnJheX0gdHJhbnNmb3JtIGFuIGFycmF5IGRlbm90aW5nIHRoZSB0cmFuc2Zvcm0gbWF0cml4IG9mIHRoZSBub2RlXG4gKlxuICogQHJldHVybiB7Q2FtZXJhfSB0aGlzXG4gKi9cbkNhbWVyYS5wcm90b3R5cGUub25UcmFuc2Zvcm1DaGFuZ2UgPSBmdW5jdGlvbiBvblRyYW5zZm9ybUNoYW5nZSh0cmFuc2Zvcm0pIHtcbiAgICB2YXIgYSA9IHRyYW5zZm9ybTtcbiAgICB0aGlzLl92aWV3RGlydHkgPSB0cnVlO1xuXG4gICAgaWYgKCF0aGlzLl9yZXF1ZXN0aW5nVXBkYXRlKSB7XG4gICAgICAgIHRoaXMuX25vZGUucmVxdWVzdFVwZGF0ZSh0aGlzLl9pZCk7XG4gICAgICAgIHRoaXMuX3JlcXVlc3RpbmdVcGRhdGUgPSB0cnVlO1xuICAgIH1cblxuICAgIHZhciBhMDAgPSBhWzBdLCBhMDEgPSBhWzFdLCBhMDIgPSBhWzJdLCBhMDMgPSBhWzNdLFxuICAgIGExMCA9IGFbNF0sIGExMSA9IGFbNV0sIGExMiA9IGFbNl0sIGExMyA9IGFbN10sXG4gICAgYTIwID0gYVs4XSwgYTIxID0gYVs5XSwgYTIyID0gYVsxMF0sIGEyMyA9IGFbMTFdLFxuICAgIGEzMCA9IGFbMTJdLCBhMzEgPSBhWzEzXSwgYTMyID0gYVsxNF0sIGEzMyA9IGFbMTVdLFxuXG4gICAgYjAwID0gYTAwICogYTExIC0gYTAxICogYTEwLFxuICAgIGIwMSA9IGEwMCAqIGExMiAtIGEwMiAqIGExMCxcbiAgICBiMDIgPSBhMDAgKiBhMTMgLSBhMDMgKiBhMTAsXG4gICAgYjAzID0gYTAxICogYTEyIC0gYTAyICogYTExLFxuICAgIGIwNCA9IGEwMSAqIGExMyAtIGEwMyAqIGExMSxcbiAgICBiMDUgPSBhMDIgKiBhMTMgLSBhMDMgKiBhMTIsXG4gICAgYjA2ID0gYTIwICogYTMxIC0gYTIxICogYTMwLFxuICAgIGIwNyA9IGEyMCAqIGEzMiAtIGEyMiAqIGEzMCxcbiAgICBiMDggPSBhMjAgKiBhMzMgLSBhMjMgKiBhMzAsXG4gICAgYjA5ID0gYTIxICogYTMyIC0gYTIyICogYTMxLFxuICAgIGIxMCA9IGEyMSAqIGEzMyAtIGEyMyAqIGEzMSxcbiAgICBiMTEgPSBhMjIgKiBhMzMgLSBhMjMgKiBhMzIsXG5cbiAgICBkZXQgPSAxLyhiMDAgKiBiMTEgLSBiMDEgKiBiMTAgKyBiMDIgKiBiMDkgKyBiMDMgKiBiMDggLSBiMDQgKiBiMDcgKyBiMDUgKiBiMDYpO1xuXG4gICAgdGhpcy5fdmlld1RyYW5zZm9ybVswXSA9IChhMTEgKiBiMTEgLSBhMTIgKiBiMTAgKyBhMTMgKiBiMDkpICogZGV0O1xuICAgIHRoaXMuX3ZpZXdUcmFuc2Zvcm1bMV0gPSAoYTAyICogYjEwIC0gYTAxICogYjExIC0gYTAzICogYjA5KSAqIGRldDtcbiAgICB0aGlzLl92aWV3VHJhbnNmb3JtWzJdID0gKGEzMSAqIGIwNSAtIGEzMiAqIGIwNCArIGEzMyAqIGIwMykgKiBkZXQ7XG4gICAgdGhpcy5fdmlld1RyYW5zZm9ybVszXSA9IChhMjIgKiBiMDQgLSBhMjEgKiBiMDUgLSBhMjMgKiBiMDMpICogZGV0O1xuICAgIHRoaXMuX3ZpZXdUcmFuc2Zvcm1bNF0gPSAoYTEyICogYjA4IC0gYTEwICogYjExIC0gYTEzICogYjA3KSAqIGRldDtcbiAgICB0aGlzLl92aWV3VHJhbnNmb3JtWzVdID0gKGEwMCAqIGIxMSAtIGEwMiAqIGIwOCArIGEwMyAqIGIwNykgKiBkZXQ7XG4gICAgdGhpcy5fdmlld1RyYW5zZm9ybVs2XSA9IChhMzIgKiBiMDIgLSBhMzAgKiBiMDUgLSBhMzMgKiBiMDEpICogZGV0O1xuICAgIHRoaXMuX3ZpZXdUcmFuc2Zvcm1bN10gPSAoYTIwICogYjA1IC0gYTIyICogYjAyICsgYTIzICogYjAxKSAqIGRldDtcbiAgICB0aGlzLl92aWV3VHJhbnNmb3JtWzhdID0gKGExMCAqIGIxMCAtIGExMSAqIGIwOCArIGExMyAqIGIwNikgKiBkZXQ7XG4gICAgdGhpcy5fdmlld1RyYW5zZm9ybVs5XSA9IChhMDEgKiBiMDggLSBhMDAgKiBiMTAgLSBhMDMgKiBiMDYpICogZGV0O1xuICAgIHRoaXMuX3ZpZXdUcmFuc2Zvcm1bMTBdID0gKGEzMCAqIGIwNCAtIGEzMSAqIGIwMiArIGEzMyAqIGIwMCkgKiBkZXQ7XG4gICAgdGhpcy5fdmlld1RyYW5zZm9ybVsxMV0gPSAoYTIxICogYjAyIC0gYTIwICogYjA0IC0gYTIzICogYjAwKSAqIGRldDtcbiAgICB0aGlzLl92aWV3VHJhbnNmb3JtWzEyXSA9IChhMTEgKiBiMDcgLSBhMTAgKiBiMDkgLSBhMTIgKiBiMDYpICogZGV0O1xuICAgIHRoaXMuX3ZpZXdUcmFuc2Zvcm1bMTNdID0gKGEwMCAqIGIwOSAtIGEwMSAqIGIwNyArIGEwMiAqIGIwNikgKiBkZXQ7XG4gICAgdGhpcy5fdmlld1RyYW5zZm9ybVsxNF0gPSAoYTMxICogYjAxIC0gYTMwICogYjAzIC0gYTMyICogYjAwKSAqIGRldDtcbiAgICB0aGlzLl92aWV3VHJhbnNmb3JtWzE1XSA9IChhMjAgKiBiMDMgLSBhMjEgKiBiMDEgKyBhMjIgKiBiMDApICogZGV0O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYW1lcmE7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQ2hhbm5lbHMgYXJlIGJlaW5nIHVzZWQgZm9yIGludGVyYWN0aW5nIHdpdGggdGhlIFVJIFRocmVhZCB3aGVuIHJ1bm5pbmcgaW5cbiAqIGEgV2ViIFdvcmtlciBvciB3aXRoIHRoZSBVSU1hbmFnZXIvIENvbXBvc2l0b3Igd2hlbiBydW5uaW5nIGluIHNpbmdsZVxuICogdGhyZWFkZWQgbW9kZSAobm8gV2ViIFdvcmtlcikuXG4gKlxuICogQGNsYXNzIENoYW5uZWxcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBDaGFubmVsKCkge1xuICAgIGlmICh0eXBlb2Ygc2VsZiAhPT0gJ3VuZGVmaW5lZCcgJiYgc2VsZi53aW5kb3cgIT09IHNlbGYpIHtcbiAgICAgICAgdGhpcy5fZW50ZXJXb3JrZXJNb2RlKCk7XG4gICAgfVxufVxuXG5cbi8qKlxuICogQ2FsbGVkIGR1cmluZyBjb25zdHJ1Y3Rpb24uIFN1YnNjcmliZXMgZm9yIGBtZXNzYWdlYCBldmVudCBhbmQgcm91dGVzIGFsbFxuICogZnV0dXJlIGBzZW5kTWVzc2FnZWAgbWVzc2FnZXMgdG8gdGhlIE1haW4gVGhyZWFkIChcIlVJIFRocmVhZFwiKS5cbiAqXG4gKiBQcmltYXJpbHkgdXNlZCBmb3IgdGVzdGluZy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuQ2hhbm5lbC5wcm90b3R5cGUuX2VudGVyV29ya2VyTW9kZSA9IGZ1bmN0aW9uIF9lbnRlcldvcmtlck1vZGUoKSB7XG4gICAgdGhpcy5fd29ya2VyTW9kZSA9IHRydWU7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICBzZWxmLmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiBvbm1lc3NhZ2UoZXYpIHtcbiAgICAgICAgX3RoaXMub25NZXNzYWdlKGV2LmRhdGEpO1xuICAgIH0pO1xufTtcblxuLyoqXG4gKiBNZWFudCB0byBiZSBvdmVycmlkZW4gYnkgYEZhbW91c2AuXG4gKiBBc3NpZ25lZCBtZXRob2Qgd2lsbCBiZSBpbnZva2VkIGZvciBldmVyeSByZWNlaXZlZCBtZXNzYWdlLlxuICpcbiAqIEB0eXBlIHtGdW5jdGlvbn1cbiAqIEBvdmVycmlkZVxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkNoYW5uZWwucHJvdG90eXBlLm9uTWVzc2FnZSA9IG51bGw7XG5cbi8qKlxuICogU2VuZHMgYSBtZXNzYWdlIHRvIHRoZSBVSU1hbmFnZXIuXG4gKlxuICogQHBhcmFtICB7QW55fSAgICBtZXNzYWdlIEFyYml0cmFyeSBtZXNzYWdlIG9iamVjdC5cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5DaGFubmVsLnByb3RvdHlwZS5zZW5kTWVzc2FnZSA9IGZ1bmN0aW9uIHNlbmRNZXNzYWdlIChtZXNzYWdlKSB7XG4gICAgaWYgKHRoaXMuX3dvcmtlck1vZGUpIHtcbiAgICAgICAgc2VsZi5wb3N0TWVzc2FnZShtZXNzYWdlKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRoaXMub25tZXNzYWdlKG1lc3NhZ2UpO1xuICAgIH1cbn07XG5cbi8qKlxuICogTWVhbnQgdG8gYmUgb3ZlcnJpZGVuIGJ5IHRoZSBVSU1hbmFnZXIgd2hlbiBydW5uaW5nIGluIHRoZSBVSSBUaHJlYWQuXG4gKiBVc2VkIGZvciBwcmVzZXJ2aW5nIEFQSSBjb21wYXRpYmlsaXR5IHdpdGggV2ViIFdvcmtlcnMuXG4gKiBXaGVuIHJ1bm5pbmcgaW4gV2ViIFdvcmtlciBtb2RlLCB0aGlzIHByb3BlcnR5IHdvbid0IGJlIG11dGF0ZWQuXG4gKlxuICogQXNzaWduZWQgbWV0aG9kIHdpbGwgYmUgaW52b2tlZCBmb3IgZXZlcnkgbWVzc2FnZSBwb3N0ZWQgYnkgYGZhbW91cy1jb3JlYC5cbiAqXG4gKiBAdHlwZSB7RnVuY3Rpb259XG4gKiBAb3ZlcnJpZGVcbiAqL1xuQ2hhbm5lbC5wcm90b3R5cGUub25tZXNzYWdlID0gbnVsbDtcblxuLyoqXG4gKiBTZW5kcyBhIG1lc3NhZ2UgdG8gdGhlIG1hbmFnZXIgb2YgdGhpcyBjaGFubmVsICh0aGUgYEZhbW91c2Agc2luZ2xldG9uKSBieVxuICogaW52b2tpbmcgYG9uTWVzc2FnZWAuXG4gKiBVc2VkIGZvciBwcmVzZXJ2aW5nIEFQSSBjb21wYXRpYmlsaXR5IHdpdGggV2ViIFdvcmtlcnMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBhbGlhcyBvbk1lc3NhZ2VcbiAqXG4gKiBAcGFyYW0ge0FueX0gbWVzc2FnZSBhIG1lc3NhZ2UgdG8gc2VuZCBvdmVyIHRoZSBjaGFubmVsXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuQ2hhbm5lbC5wcm90b3R5cGUucG9zdE1lc3NhZ2UgPSBmdW5jdGlvbiBwb3N0TWVzc2FnZShtZXNzYWdlKSB7XG4gICAgcmV0dXJuIHRoaXMub25NZXNzYWdlKG1lc3NhZ2UpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDaGFubmVsO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqIFxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqIFxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICogXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKiBcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBFcXVpdmFsZW50IG9mIGFuIEVuZ2luZSBpbiB0aGUgV29ya2VyIFRocmVhZC4gVXNlZCB0byBzeW5jaHJvbml6ZSBhbmQgbWFuYWdlXG4gKiB0aW1lIGFjcm9zcyBkaWZmZXJlbnQgVGhyZWFkcy5cbiAqXG4gKiBAY2xhc3MgIENsb2NrXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIENsb2NrICgpIHtcbiAgICB0aGlzLl90aW1lID0gMDtcbiAgICB0aGlzLl9mcmFtZSA9IDA7XG4gICAgdGhpcy5fdGltZXJRdWV1ZSA9IFtdO1xuICAgIHRoaXMuX3VwZGF0aW5nSW5kZXggPSAwO1xuXG4gICAgdGhpcy5fc2NhbGUgPSAxO1xuICAgIHRoaXMuX3NjYWxlZFRpbWUgPSB0aGlzLl90aW1lO1xufVxuXG4vKipcbiAqIFNldHMgdGhlIHNjYWxlIGF0IHdoaWNoIHRoZSBjbG9jayB0aW1lIGlzIHBhc3NpbmcuXG4gKiBVc2VmdWwgZm9yIHNsb3ctbW90aW9uIG9yIGZhc3QtZm9yd2FyZCBlZmZlY3RzLlxuICogXG4gKiBgMWAgbWVhbnMgbm8gdGltZSBzY2FsaW5nIChcInJlYWx0aW1lXCIpLFxuICogYDJgIG1lYW5zIHRoZSBjbG9jayB0aW1lIGlzIHBhc3NpbmcgdHdpY2UgYXMgZmFzdCxcbiAqIGAwLjVgIG1lYW5zIHRoZSBjbG9jayB0aW1lIGlzIHBhc3NpbmcgdHdvIHRpbWVzIHNsb3dlciB0aGFuIHRoZSBcImFjdHVhbFwiXG4gKiB0aW1lIGF0IHdoaWNoIHRoZSBDbG9jayBpcyBiZWluZyB1cGRhdGVkIHZpYSBgLnN0ZXBgLlxuICpcbiAqIEluaXRhbGx5IHRoZSBjbG9jayB0aW1lIGlzIG5vdCBiZWluZyBzY2FsZWQgKGZhY3RvciBgMWApLlxuICogXG4gKiBAbWV0aG9kICBzZXRTY2FsZVxuICogQGNoYWluYWJsZVxuICogXG4gKiBAcGFyYW0ge051bWJlcn0gc2NhbGUgICAgVGhlIHNjYWxlIGF0IHdoaWNoIHRoZSBjbG9jayB0aW1lIGlzIHBhc3NpbmcuXG4gKlxuICogQHJldHVybiB7Q2xvY2t9IHRoaXNcbiAqL1xuQ2xvY2sucHJvdG90eXBlLnNldFNjYWxlID0gZnVuY3Rpb24gc2V0U2NhbGUgKHNjYWxlKSB7XG4gICAgdGhpcy5fc2NhbGUgPSBzY2FsZTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQG1ldGhvZCAgZ2V0U2NhbGVcbiAqIFxuICogQHJldHVybiB7TnVtYmVyfSBzY2FsZSAgICBUaGUgc2NhbGUgYXQgd2hpY2ggdGhlIGNsb2NrIHRpbWUgaXMgcGFzc2luZy5cbiAqL1xuQ2xvY2sucHJvdG90eXBlLmdldFNjYWxlID0gZnVuY3Rpb24gZ2V0U2NhbGUgKCkge1xuICAgIHJldHVybiB0aGlzLl9zY2FsZTtcbn07XG5cbi8qKlxuICogVXBkYXRlcyB0aGUgaW50ZXJuYWwgY2xvY2sgdGltZS5cbiAqXG4gKiBAbWV0aG9kICBzdGVwXG4gKiBAY2hhaW5hYmxlXG4gKiBcbiAqIEBwYXJhbSAge051bWJlcn0gdGltZSBoaWdoIHJlc29sdXRpb24gdGltc3RhbXAgdXNlZCBmb3IgaW52b2tpbmcgdGhlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgYHVwZGF0ZWAgbWV0aG9kIG9uIGFsbCByZWdpc3RlcmVkIG9iamVjdHNcbiAqIEByZXR1cm4ge0Nsb2NrfSAgICAgICB0aGlzXG4gKi9cbkNsb2NrLnByb3RvdHlwZS5zdGVwID0gZnVuY3Rpb24gc3RlcCAodGltZSkge1xuICAgIHRoaXMuX2ZyYW1lKys7XG5cbiAgICB0aGlzLl9zY2FsZWRUaW1lID0gdGhpcy5fc2NhbGVkVGltZSArICh0aW1lIC0gdGhpcy5fdGltZSkqdGhpcy5fc2NhbGU7XG4gICAgdGhpcy5fdGltZSA9IHRpbWU7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX3RpbWVyUXVldWUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHRoaXMuX3RpbWVyUXVldWVbaV0odGhpcy5fc2NhbGVkVGltZSkpIHtcbiAgICAgICAgICAgIHRoaXMuX3RpbWVyUXVldWUuc3BsaWNlKGksIDEpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBpbnRlcm5hbCBjbG9jayB0aW1lLlxuICpcbiAqIEBtZXRob2QgIG5vd1xuICogXG4gKiBAcmV0dXJuICB7TnVtYmVyfSB0aW1lIGhpZ2ggcmVzb2x1dGlvbiB0aW1zdGFtcCB1c2VkIGZvciBpbnZva2luZyB0aGVcbiAqICAgICAgICAgICAgICAgICAgICAgICBgdXBkYXRlYCBtZXRob2Qgb24gYWxsIHJlZ2lzdGVyZWQgb2JqZWN0c1xuICovXG5DbG9jay5wcm90b3R5cGUubm93ID0gZnVuY3Rpb24gbm93ICgpIHtcbiAgICByZXR1cm4gdGhpcy5fc2NhbGVkVGltZTtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgaW50ZXJuYWwgY2xvY2sgdGltZS5cbiAqXG4gKiBAbWV0aG9kICBnZXRUaW1lXG4gKiBAZGVwcmVjYXRlZCBVc2UgI25vdyBpbnN0ZWFkXG4gKiBcbiAqIEByZXR1cm4gIHtOdW1iZXJ9IHRpbWUgaGlnaCByZXNvbHV0aW9uIHRpbXN0YW1wIHVzZWQgZm9yIGludm9raW5nIHRoZVxuICogICAgICAgICAgICAgICAgICAgICAgIGB1cGRhdGVgIG1ldGhvZCBvbiBhbGwgcmVnaXN0ZXJlZCBvYmplY3RzXG4gKi9cbkNsb2NrLnByb3RvdHlwZS5nZXRUaW1lID0gQ2xvY2sucHJvdG90eXBlLm5vdztcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBudW1iZXIgb2YgZnJhbWVzIGVsYXBzZWQgc28gZmFyLlxuICpcbiAqIEBtZXRob2QgZ2V0RnJhbWVcbiAqIFxuICogQHJldHVybiB7TnVtYmVyfSBmcmFtZXNcbiAqL1xuQ2xvY2sucHJvdG90eXBlLmdldEZyYW1lID0gZnVuY3Rpb24gZ2V0RnJhbWUgKCkge1xuICAgIHJldHVybiB0aGlzLl9mcmFtZTtcbn07XG5cbi8qKlxuICogV3JhcHMgYSBmdW5jdGlvbiB0byBiZSBpbnZva2VkIGFmdGVyIGEgY2VydGFpbiBhbW91bnQgb2YgdGltZS5cbiAqIEFmdGVyIGEgc2V0IGR1cmF0aW9uIGhhcyBwYXNzZWQsIGl0IGV4ZWN1dGVzIHRoZSBmdW5jdGlvbiBhbmRcbiAqIHJlbW92ZXMgaXQgYXMgYSBsaXN0ZW5lciB0byAncHJlcmVuZGVyJy5cbiAqXG4gKiBAbWV0aG9kIHNldFRpbWVvdXRcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBydW4gYWZ0ZXIgYSBzcGVjaWZpZWQgZHVyYXRpb25cbiAqIEBwYXJhbSB7TnVtYmVyfSBkZWxheSBtaWxsaXNlY29uZHMgZnJvbSBub3cgdG8gZXhlY3V0ZSB0aGUgZnVuY3Rpb25cbiAqXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn0gdGltZXIgZnVuY3Rpb24gdXNlZCBmb3IgQ2xvY2sjY2xlYXJUaW1lclxuICovXG5DbG9jay5wcm90b3R5cGUuc2V0VGltZW91dCA9IGZ1bmN0aW9uIChjYWxsYmFjaywgZGVsYXkpIHtcbiAgICB2YXIgcGFyYW1zID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcbiAgICB2YXIgc3RhcnRlZEF0ID0gdGhpcy5fdGltZTtcbiAgICB2YXIgdGltZXIgPSBmdW5jdGlvbih0aW1lKSB7XG4gICAgICAgIGlmICh0aW1lIC0gc3RhcnRlZEF0ID49IGRlbGF5KSB7XG4gICAgICAgICAgICBjYWxsYmFjay5hcHBseShudWxsLCBwYXJhbXMpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG4gICAgdGhpcy5fdGltZXJRdWV1ZS5wdXNoKHRpbWVyKTtcbiAgICByZXR1cm4gdGltZXI7XG59O1xuXG5cbi8qKlxuICogV3JhcHMgYSBmdW5jdGlvbiB0byBiZSBpbnZva2VkIGFmdGVyIGEgY2VydGFpbiBhbW91bnQgb2YgdGltZS5cbiAqICBBZnRlciBhIHNldCBkdXJhdGlvbiBoYXMgcGFzc2VkLCBpdCBleGVjdXRlcyB0aGUgZnVuY3Rpb24gYW5kXG4gKiAgcmVzZXRzIHRoZSBleGVjdXRpb24gdGltZS5cbiAqXG4gKiBAbWV0aG9kIHNldEludGVydmFsXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgcnVuIGFmdGVyIGEgc3BlY2lmaWVkIGR1cmF0aW9uXG4gKiBAcGFyYW0ge051bWJlcn0gZGVsYXkgaW50ZXJ2YWwgdG8gZXhlY3V0ZSBmdW5jdGlvbiBpbiBtaWxsaXNlY29uZHNcbiAqXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn0gdGltZXIgZnVuY3Rpb24gdXNlZCBmb3IgQ2xvY2sjY2xlYXJUaW1lclxuICovXG5DbG9jay5wcm90b3R5cGUuc2V0SW50ZXJ2YWwgPSBmdW5jdGlvbiBzZXRJbnRlcnZhbChjYWxsYmFjaywgZGVsYXkpIHtcbiAgICB2YXIgcGFyYW1zID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcbiAgICB2YXIgc3RhcnRlZEF0ID0gdGhpcy5fdGltZTtcbiAgICB2YXIgdGltZXIgPSBmdW5jdGlvbih0aW1lKSB7XG4gICAgICAgIGlmICh0aW1lIC0gc3RhcnRlZEF0ID49IGRlbGF5KSB7XG4gICAgICAgICAgICBjYWxsYmFjay5hcHBseShudWxsLCBwYXJhbXMpO1xuICAgICAgICAgICAgc3RhcnRlZEF0ID0gdGltZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICB0aGlzLl90aW1lclF1ZXVlLnB1c2godGltZXIpO1xuICAgIHJldHVybiB0aW1lcjtcbn07XG5cbi8qKlxuICogUmVtb3ZlcyBwcmV2aW91c2x5IHZpYSBgQ2xvY2sjc2V0VGltZW91dGAgb3IgYENsb2NrI3NldEludGVydmFsYFxuICogcmVnaXN0ZXJlZCBjYWxsYmFjayBmdW5jdGlvblxuICpcbiAqIEBtZXRob2QgY2xlYXJUaW1lclxuICogQGNoYWluYWJsZVxuICogXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gdGltZXIgIHByZXZpb3VzbHkgYnkgYENsb2NrI3NldFRpbWVvdXRgIG9yXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGBDbG9jayNzZXRJbnRlcnZhbGAgcmV0dXJuZWQgY2FsbGJhY2sgZnVuY3Rpb25cbiAqIEByZXR1cm4ge0Nsb2NrfSAgICAgICAgICAgICAgdGhpc1xuICovXG5DbG9jay5wcm90b3R5cGUuY2xlYXJUaW1lciA9IGZ1bmN0aW9uICh0aW1lcikge1xuICAgIHZhciBpbmRleCA9IHRoaXMuX3RpbWVyUXVldWUuaW5kZXhPZih0aW1lcik7XG4gICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgICB0aGlzLl90aW1lclF1ZXVlLnNwbGljZShpbmRleCwgMSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDbG9jaztcblxuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuLypqc2hpbnQgLVcwNzkgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vLyBUT0RPOiBEaXNwYXRjaCBzaG91bGQgYmUgZ2VuZXJhbGl6ZWQgc28gdGhhdCBpdCBjYW4gd29yayBvbiBhbnkgTm9kZVxuLy8gbm90IGp1c3QgQ29udGV4dHMuXG5cbnZhciBFdmVudCA9IHJlcXVpcmUoJy4vRXZlbnQnKTtcblxuLyoqXG4gKiBUaGUgRGlzcGF0Y2ggY2xhc3MgaXMgdXNlZCB0byBwcm9wb2dhdGUgZXZlbnRzIGRvd24gdGhlXG4gKiBzY2VuZSBncmFwaC5cbiAqXG4gKiBAY2xhc3MgRGlzcGF0Y2hcbiAqIEBwYXJhbSB7U2NlbmV9IGNvbnRleHQgVGhlIGNvbnRleHQgb24gd2hpY2ggaXQgb3BlcmF0ZXNcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBEaXNwYXRjaCAoY29udGV4dCkge1xuXG4gICAgaWYgKCFjb250ZXh0KSB0aHJvdyBuZXcgRXJyb3IoJ0Rpc3BhdGNoIG5lZWRzIHRvIGJlIGluc3RhbnRpYXRlZCBvbiBhIG5vZGUnKTtcblxuICAgIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0OyAvLyBBIHJlZmVyZW5jZSB0byB0aGUgY29udGV4dFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBvbiB3aGljaCB0aGUgZGlzcGF0Y2hlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBvcGVyYXRlc1xuXG4gICAgdGhpcy5fcXVldWUgPSBbXTsgLy8gVGhlIHF1ZXVlIGlzIHVzZWQgZm9yIHR3byBwdXJwb3Nlc1xuICAgICAgICAgICAgICAgICAgICAgIC8vIDEuIEl0IGlzIHVzZWQgdG8gbGlzdCBpbmRpY2llcyBpbiB0aGVcbiAgICAgICAgICAgICAgICAgICAgICAvLyAgICBOb2RlcyBwYXRoIHdoaWNoIGFyZSB0aGVuIHVzZWQgdG8gbG9va3VwXG4gICAgICAgICAgICAgICAgICAgICAgLy8gICAgYSBub2RlIGluIHRoZSBzY2VuZSBncmFwaC5cbiAgICAgICAgICAgICAgICAgICAgICAvLyAyLiBJdCBpcyB1c2VkIHRvIGFzc2lzdCBkaXNwYXRjaGluZ1xuICAgICAgICAgICAgICAgICAgICAgIC8vICAgIHN1Y2ggdGhhdCBpdCBpcyBwb3NzaWJsZSB0byBkbyBhIGJyZWFkdGggZmlyc3RcbiAgICAgICAgICAgICAgICAgICAgICAvLyAgICB0cmF2ZXJzYWwgb2YgdGhlIHNjZW5lIGdyYXBoLlxufVxuXG4vKipcbiAqIGxvb2t1cE5vZGUgdGFrZXMgYSBwYXRoIGFuZCByZXR1cm5zIHRoZSBub2RlIGF0IHRoZSBsb2NhdGlvbiBzcGVjaWZpZWRcbiAqIGJ5IHRoZSBwYXRoLCBpZiBvbmUgZXhpc3RzLiBJZiBub3QsIGl0IHJldHVybnMgdW5kZWZpbmVkLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBsb2NhdGlvbiBUaGUgbG9jYXRpb24gb2YgdGhlIG5vZGUgc3BlY2lmaWVkIGJ5IGl0cyBwYXRoXG4gKlxuICogQHJldHVybiB7Tm9kZSB8IHVuZGVmaW5lZH0gVGhlIG5vZGUgYXQgdGhlIHJlcXVlc3RlZCBwYXRoXG4gKi9cbkRpc3BhdGNoLnByb3RvdHlwZS5sb29rdXBOb2RlID0gZnVuY3Rpb24gbG9va3VwTm9kZSAobG9jYXRpb24pIHtcbiAgICBpZiAoIWxvY2F0aW9uKSB0aHJvdyBuZXcgRXJyb3IoJ2xvb2t1cE5vZGUgbXVzdCBiZSBjYWxsZWQgd2l0aCBhIHBhdGgnKTtcblxuICAgIHZhciBwYXRoID0gdGhpcy5fcXVldWU7XG5cbiAgICBfc3BsaXRUbyhsb2NhdGlvbiwgcGF0aCk7XG5cbiAgICBpZiAocGF0aFswXSAhPT0gdGhpcy5fY29udGV4dC5nZXRTZWxlY3RvcigpKSByZXR1cm4gdm9pZCAwO1xuXG4gICAgdmFyIGNoaWxkcmVuID0gdGhpcy5fY29udGV4dC5nZXRDaGlsZHJlbigpO1xuICAgIHZhciBjaGlsZDtcbiAgICB2YXIgaSA9IDE7XG4gICAgcGF0aFswXSA9IHRoaXMuX2NvbnRleHQ7XG5cbiAgICB3aGlsZSAoaSA8IHBhdGgubGVuZ3RoKSB7XG4gICAgICAgIGNoaWxkID0gY2hpbGRyZW5bcGF0aFtpXV07XG4gICAgICAgIHBhdGhbaV0gPSBjaGlsZDtcbiAgICAgICAgaWYgKGNoaWxkKSBjaGlsZHJlbiA9IGNoaWxkLmdldENoaWxkcmVuKCk7XG4gICAgICAgIGVsc2UgcmV0dXJuIHZvaWQgMDtcbiAgICAgICAgaSsrO1xuICAgIH1cblxuICAgIHJldHVybiBjaGlsZDtcbn07XG5cbi8qKlxuICogZGlzcGF0Y2ggdGFrZXMgYW4gZXZlbnQgbmFtZSBhbmQgYSBwYXlsb2FkIGFuZCBkaXNwYXRjaGVzIGl0IHRvIHRoZVxuICogZW50aXJlIHNjZW5lIGdyYXBoIGJlbG93IHRoZSBub2RlIHRoYXQgdGhlIGRpc3BhdGNoZXIgaXMgb24uIFRoZSBub2Rlc1xuICogcmVjZWl2ZSB0aGUgZXZlbnRzIGluIGEgYnJlYWR0aCBmaXJzdCB0cmF2ZXJzYWwsIG1lYW5pbmcgdGhhdCBwYXJlbnRzXG4gKiBoYXZlIHRoZSBvcHBvcnR1bml0eSB0byByZWFjdCB0byB0aGUgZXZlbnQgYmVmb3JlIGNoaWxkcmVuLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCBuYW1lIG9mIHRoZSBldmVudFxuICogQHBhcmFtIHtBbnl9IHBheWxvYWQgdGhlIGV2ZW50IHBheWxvYWRcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5EaXNwYXRjaC5wcm90b3R5cGUuZGlzcGF0Y2ggPSBmdW5jdGlvbiBkaXNwYXRjaCAoZXZlbnQsIHBheWxvYWQpIHtcbiAgICBpZiAoIWV2ZW50KSB0aHJvdyBuZXcgRXJyb3IoJ2Rpc3BhdGNoIHJlcXVpcmVzIGFuIGV2ZW50IG5hbWUgYXMgaXRcXCdzIGZpcnN0IGFyZ3VtZW50Jyk7XG5cbiAgICB2YXIgcXVldWUgPSB0aGlzLl9xdWV1ZTtcbiAgICB2YXIgaXRlbTtcbiAgICB2YXIgaTtcbiAgICB2YXIgbGVuO1xuICAgIHZhciBjaGlsZHJlbjtcblxuICAgIHF1ZXVlLmxlbmd0aCA9IDA7XG4gICAgcXVldWUucHVzaCh0aGlzLl9jb250ZXh0KTtcblxuICAgIHdoaWxlIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgaXRlbSA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgIGlmIChpdGVtLm9uUmVjZWl2ZSkgaXRlbS5vblJlY2VpdmUoZXZlbnQsIHBheWxvYWQpO1xuICAgICAgICBjaGlsZHJlbiA9IGl0ZW0uZ2V0Q2hpbGRyZW4oKTtcbiAgICAgICAgZm9yIChpID0gMCwgbGVuID0gY2hpbGRyZW4ubGVuZ3RoIDsgaSA8IGxlbiA7IGkrKykgcXVldWUucHVzaChjaGlsZHJlbltpXSk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBkaXNwYXRjaFVJZXZlbnQgdGFrZXMgYSBwYXRoLCBhbiBldmVudCBuYW1lLCBhbmQgYSBwYXlsb2FkIGFuZCBkaXNwYXRjaGVzIHRoZW0gaW5cbiAqIGEgbWFubmVyIGFub2xvZ291cyB0byBET00gYnViYmxpbmcuIEl0IGZpcnN0IHRyYXZlcnNlcyBkb3duIHRvIHRoZSBub2RlIHNwZWNpZmllZCBhdFxuICogdGhlIHBhdGguIFRoYXQgbm9kZSByZWNlaXZlcyB0aGUgZXZlbnQgZmlyc3QsIGFuZCB0aGVuIGV2ZXJ5IGFuY2VzdG9yIHJlY2VpdmVzIHRoZSBldmVudFxuICogdW50aWwgdGhlIGNvbnRleHQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggdGhlIHBhdGggb2YgdGhlIG5vZGVcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCB0aGUgZXZlbnQgbmFtZVxuICogQHBhcmFtIHtBbnl9IHBheWxvYWQgdGhlIHBheWxvYWRcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5EaXNwYXRjaC5wcm90b3R5cGUuZGlzcGF0Y2hVSUV2ZW50ID0gZnVuY3Rpb24gZGlzcGF0Y2hVSUV2ZW50IChwYXRoLCBldmVudCwgcGF5bG9hZCkge1xuICAgIGlmICghcGF0aCkgdGhyb3cgbmV3IEVycm9yKCdkaXNwYXRjaFVJRXZlbnQgbmVlZHMgYSB2YWxpZCBwYXRoIHRvIGRpc3BhdGNoIHRvJyk7XG4gICAgaWYgKCFldmVudCkgdGhyb3cgbmV3IEVycm9yKCdkaXNwYXRjaFVJRXZlbnQgbmVlZHMgYW4gZXZlbnQgbmFtZSBhcyBpdHMgc2Vjb25kIGFyZ3VtZW50Jyk7XG5cbiAgICB2YXIgcXVldWUgPSB0aGlzLl9xdWV1ZTtcbiAgICB2YXIgbm9kZTtcblxuICAgIEV2ZW50LmNhbGwocGF5bG9hZCk7XG4gICAgcGF5bG9hZC5ub2RlID0gdGhpcy5sb29rdXBOb2RlKHBhdGgpOyAvLyBBZnRlciB0aGlzIGNhbGwsIHRoZSBwYXRoIGlzIGxvYWRlZCBpbnRvIHRoZSBxdWV1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gKGxvb2tVcCBub2RlIGRvZXNuJ3QgY2xlYXIgdGhlIHF1ZXVlIGFmdGVyIHRoZSBsb29rdXApXG5cbiAgICB3aGlsZSAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIG5vZGUgPSBxdWV1ZS5wb3AoKTsgLy8gcG9wIG5vZGVzIG9mZiBvZiB0aGUgcXVldWUgdG8gbW92ZSB1cCB0aGUgYW5jZXN0b3IgY2hhaW4uXG4gICAgICAgIGlmIChub2RlLm9uUmVjZWl2ZSkgbm9kZS5vblJlY2VpdmUoZXZlbnQsIHBheWxvYWQpO1xuICAgICAgICBpZiAocGF5bG9hZC5wcm9wYWdhdGlvblN0b3BwZWQpIGJyZWFrO1xuICAgIH1cbn07XG5cbi8qKlxuICogX3NwbGl0VG8gaXMgYSBwcml2YXRlIG1ldGhvZCB3aGljaCB0YWtlcyBhIHBhdGggYW5kIHNwbGl0cyBpdCBhdCBldmVyeSAnLydcbiAqIHB1c2hpbmcgdGhlIHJlc3VsdCBpbnRvIHRoZSBzdXBwbGllZCBhcnJheS4gVGhpcyBpcyBhIGRlc3RydWN0aXZlIGNoYW5nZS5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtTdHJpbmd9IHN0cmluZyB0aGUgc3BlY2lmaWVkIHBhdGhcbiAqIEBwYXJhbSB7QXJyYXl9IHRhcmdldCB0aGUgYXJyYXkgdG8gd2hpY2ggdGhlIHJlc3VsdCBzaG91bGQgYmUgd3JpdHRlblxuICpcbiAqIEByZXR1cm4ge0FycmF5fSB0aGUgdGFyZ2V0IGFmdGVyIGhhdmluZyBiZWVuIHdyaXR0ZW4gdG9cbiAqL1xuZnVuY3Rpb24gX3NwbGl0VG8gKHN0cmluZywgdGFyZ2V0KSB7XG4gICAgdGFyZ2V0Lmxlbmd0aCA9IDA7IC8vIGNsZWFycyB0aGUgYXJyYXkgZmlyc3QuXG4gICAgdmFyIGxhc3QgPSAwO1xuICAgIHZhciBpO1xuICAgIHZhciBsZW4gPSBzdHJpbmcubGVuZ3RoO1xuXG4gICAgZm9yIChpID0gMCA7IGkgPCBsZW4gOyBpKyspIHtcbiAgICAgICAgaWYgKHN0cmluZ1tpXSA9PT0gJy8nKSB7XG4gICAgICAgICAgICB0YXJnZXQucHVzaChzdHJpbmcuc3Vic3RyaW5nKGxhc3QsIGkpKTtcbiAgICAgICAgICAgIGxhc3QgPSBpICsgMTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChpIC0gbGFzdCA+IDApIHRhcmdldC5wdXNoKHN0cmluZy5zdWJzdHJpbmcobGFzdCwgaSkpO1xuXG4gICAgcmV0dXJuIHRhcmdldDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBEaXNwYXRjaDtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKiBcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKiBcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqIFxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICogXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogVGhlIEV2ZW50IGNsYXNzIGFkZHMgdGhlIHN0b3BQcm9wYWdhdGlvbiBmdW5jdGlvbmFsaXR5XG4gKiB0byB0aGUgVUlFdmVudHMgd2l0aGluIHRoZSBzY2VuZSBncmFwaC5cbiAqXG4gKiBAY29uc3RydWN0b3IgRXZlbnRcbiAqL1xuZnVuY3Rpb24gRXZlbnQgKCkge1xuICAgIHRoaXMucHJvcGFnYXRpb25TdG9wcGVkID0gZmFsc2U7XG4gICAgdGhpcy5zdG9wUHJvcGFnYXRpb24gPSBzdG9wUHJvcGFnYXRpb247XG59XG5cbi8qKlxuICogc3RvcFByb3BhZ2F0aW9uIGVuZHMgdGhlIGJ1YmJsaW5nIG9mIHRoZSBldmVudCBpbiB0aGVcbiAqIHNjZW5lIGdyYXBoLlxuICpcbiAqIEBtZXRob2Qgc3RvcFByb3BhZ2F0aW9uXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuZnVuY3Rpb24gc3RvcFByb3BhZ2F0aW9uICgpIHtcbiAgICB0aGlzLnByb3BhZ2F0aW9uU3RvcHBlZCA9IHRydWU7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRXZlbnQ7XG5cbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKiBcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKiBcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqIFxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICogXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBDbG9jayA9IHJlcXVpcmUoJy4vQ2xvY2snKTtcbnZhciBTY2VuZSA9IHJlcXVpcmUoJy4vU2NlbmUnKTtcbnZhciBDaGFubmVsID0gcmVxdWlyZSgnLi9DaGFubmVsJyk7XG52YXIgVUlNYW5hZ2VyID0gcmVxdWlyZSgnLi4vcmVuZGVyZXJzL1VJTWFuYWdlcicpO1xudmFyIENvbXBvc2l0b3IgPSByZXF1aXJlKCcuLi9yZW5kZXJlcnMvQ29tcG9zaXRvcicpO1xudmFyIFJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AgPSByZXF1aXJlKCcuLi9yZW5kZXItbG9vcHMvUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcCcpO1xuXG52YXIgRU5HSU5FX1NUQVJUID0gWydFTkdJTkUnLCAnU1RBUlQnXTtcbnZhciBFTkdJTkVfU1RPUCA9IFsnRU5HSU5FJywgJ1NUT1AnXTtcbnZhciBUSU1FX1VQREFURSA9IFsnVElNRScsIG51bGxdO1xuXG4vKipcbiAqIEZhbW91cyBoYXMgdHdvIHJlc3BvbnNpYmlsaXRpZXMsIG9uZSB0byBhY3QgYXMgdGhlIGhpZ2hlc3QgbGV2ZWxcbiAqIHVwZGF0ZXIgYW5kIGFub3RoZXIgdG8gc2VuZCBtZXNzYWdlcyBvdmVyIHRvIHRoZSByZW5kZXJlcnMuIEl0IGlzXG4gKiBhIHNpbmdsZXRvbi5cbiAqXG4gKiBAY2xhc3MgRmFtb3VzRW5naW5lXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gRmFtb3VzRW5naW5lKCkge1xuICAgIHRoaXMuX3VwZGF0ZVF1ZXVlID0gW107IC8vIFRoZSB1cGRhdGVRdWV1ZSBpcyBhIHBsYWNlIHdoZXJlIG5vZGVzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2FuIHBsYWNlIHRoZW1zZWx2ZXMgaW4gb3JkZXIgdG8gYmVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB1cGRhdGVkIG9uIHRoZSBmcmFtZS5cblxuICAgIHRoaXMuX25leHRVcGRhdGVRdWV1ZSA9IFtdOyAvLyB0aGUgbmV4dFVwZGF0ZVF1ZXVlIGlzIHVzZWQgdG8gcXVldWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdXBkYXRlcyBmb3IgdGhlIG5leHQgdGljay5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhpcyBwcmV2ZW50cyBpbmZpbml0ZSBsb29wcyB3aGVyZSBkdXJpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYW4gdXBkYXRlIGEgbm9kZSBjb250aW51b3VzbHkgcHV0cyBpdHNlbGZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYmFjayBpbiB0aGUgdXBkYXRlIHF1ZXVlLlxuXG4gICAgdGhpcy5fc2NlbmVzID0ge307IC8vIGEgaGFzaCBvZiBhbGwgb2YgdGhlIHNjZW5lcydzIHRoYXQgdGhlIEZhbW91c0VuZ2luZVxuICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlzIHJlc3BvbnNpYmxlIGZvci5cblxuICAgIHRoaXMuX21lc3NhZ2VzID0gVElNRV9VUERBVEU7ICAgLy8gYSBxdWV1ZSBvZiBhbGwgb2YgdGhlIGRyYXcgY29tbWFuZHMgdG9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNlbmQgdG8gdGhlIHRoZSByZW5kZXJlcnMgdGhpcyBmcmFtZS5cblxuICAgIHRoaXMuX2luVXBkYXRlID0gZmFsc2U7IC8vIHdoZW4gdGhlIGZhbW91cyBpcyB1cGRhdGluZyB0aGlzIGlzIHRydWUuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYWxsIHJlcXVlc3RzIGZvciB1cGRhdGVzIHdpbGwgZ2V0IHB1dCBpbiB0aGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBuZXh0VXBkYXRlUXVldWVcblxuICAgIHRoaXMuX2Nsb2NrID0gbmV3IENsb2NrKCk7IC8vIGEgY2xvY2sgdG8ga2VlcCB0cmFjayBvZiB0aW1lIGZvciB0aGUgc2NlbmVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBncmFwaC5cblxuICAgIHRoaXMuX2NoYW5uZWwgPSBuZXcgQ2hhbm5lbCgpO1xuICAgIHRoaXMuX2NoYW5uZWwub25NZXNzYWdlID0gdGhpcy5oYW5kbGVNZXNzYWdlLmJpbmQodGhpcyk7XG59XG5cblxuLyoqXG4gKiBBbiBpbml0IHNjcmlwdCB0aGF0IGluaXRpYWxpemVzIHRoZSBGYW1vdXNFbmdpbmUgd2l0aCBvcHRpb25zXG4gKiBvciBkZWZhdWx0IHBhcmFtZXRlcnMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIGEgc2V0IG9mIG9wdGlvbnMgY29udGFpbmluZyBhIGNvbXBvc2l0b3IgYW5kIGEgcmVuZGVyIGxvb3BcbiAqXG4gKiBAcmV0dXJuIHtGYW1vdXNFbmdpbmV9IHRoaXNcbiAqL1xuRmFtb3VzRW5naW5lLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gaW5pdChvcHRpb25zKSB7XG4gICAgdGhpcy5jb21wb3NpdG9yID0gb3B0aW9ucyAmJiBvcHRpb25zLmNvbXBvc2l0b3IgfHwgbmV3IENvbXBvc2l0b3IoKTtcbiAgICB0aGlzLnJlbmRlckxvb3AgPSBvcHRpb25zICYmIG9wdGlvbnMucmVuZGVyTG9vcCB8fCBuZXcgUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcCgpO1xuICAgIHRoaXMudWlNYW5hZ2VyID0gbmV3IFVJTWFuYWdlcih0aGlzLmdldENoYW5uZWwoKSwgdGhpcy5jb21wb3NpdG9yLCB0aGlzLnJlbmRlckxvb3ApO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXRzIHRoZSBjaGFubmVsIHRoYXQgdGhlIGVuZ2luZSB3aWxsIHVzZSB0byBjb21tdW5pY2F0ZSB0b1xuICogdGhlIHJlbmRlcmVycy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtDaGFubmVsfSBjaGFubmVsICAgICBUaGUgY2hhbm5lbCB0byBiZSB1c2VkIGZvciBjb21tdW5pY2F0aW5nIHdpdGhcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlIGBVSU1hbmFnZXJgLyBgQ29tcG9zaXRvcmAuXG4gKlxuICogQHJldHVybiB7RmFtb3VzRW5naW5lfSB0aGlzXG4gKi9cbkZhbW91c0VuZ2luZS5wcm90b3R5cGUuc2V0Q2hhbm5lbCA9IGZ1bmN0aW9uIHNldENoYW5uZWwoY2hhbm5lbCkge1xuICAgIHRoaXMuX2NoYW5uZWwgPSBjaGFubmVsO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBjaGFubmVsIHRoYXQgdGhlIGVuZ2luZSBpcyBjdXJyZW50bHkgdXNpbmdcbiAqIHRvIGNvbW11bmljYXRlIHdpdGggdGhlIHJlbmRlcmVycy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7Q2hhbm5lbH0gY2hhbm5lbCAgICBUaGUgY2hhbm5lbCB0byBiZSB1c2VkIGZvciBjb21tdW5pY2F0aW5nIHdpdGhcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlIGBVSU1hbmFnZXJgLyBgQ29tcG9zaXRvcmAuXG4gKi9cbkZhbW91c0VuZ2luZS5wcm90b3R5cGUuZ2V0Q2hhbm5lbCA9IGZ1bmN0aW9uIGdldENoYW5uZWwgKCkge1xuICAgIHJldHVybiB0aGlzLl9jaGFubmVsO1xufTtcblxuLyoqXG4gKiBfdXBkYXRlIGlzIHRoZSBib2R5IG9mIHRoZSB1cGRhdGUgbG9vcC4gVGhlIGZyYW1lIGNvbnNpc3RzIG9mXG4gKiBwdWxsaW5nIGluIGFwcGVuZGluZyB0aGUgbmV4dFVwZGF0ZVF1ZXVlIHRvIHRoZSBjdXJyZW50VXBkYXRlIHF1ZXVlXG4gKiB0aGVuIG1vdmluZyB0aHJvdWdoIHRoZSB1cGRhdGVRdWV1ZSBhbmQgY2FsbGluZyBvblVwZGF0ZSB3aXRoIHRoZSBjdXJyZW50XG4gKiB0aW1lIG9uIGFsbCBub2Rlcy4gV2hpbGUgX3VwZGF0ZSBpcyBjYWxsZWQgX2luVXBkYXRlIGlzIHNldCB0byB0cnVlIGFuZFxuICogYWxsIHJlcXVlc3RzIHRvIGJlIHBsYWNlZCBpbiB0aGUgdXBkYXRlIHF1ZXVlIHdpbGwgYmUgZm9yd2FyZGVkIHRvIHRoZVxuICogbmV4dFVwZGF0ZVF1ZXVlLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5GYW1vdXNFbmdpbmUucHJvdG90eXBlLl91cGRhdGUgPSBmdW5jdGlvbiBfdXBkYXRlICgpIHtcbiAgICB0aGlzLl9pblVwZGF0ZSA9IHRydWU7XG4gICAgdmFyIHRpbWUgPSB0aGlzLl9jbG9jay5ub3coKTtcbiAgICB2YXIgbmV4dFF1ZXVlID0gdGhpcy5fbmV4dFVwZGF0ZVF1ZXVlO1xuICAgIHZhciBxdWV1ZSA9IHRoaXMuX3VwZGF0ZVF1ZXVlO1xuICAgIHZhciBpdGVtO1xuXG4gICAgdGhpcy5fbWVzc2FnZXNbMV0gPSB0aW1lO1xuXG4gICAgd2hpbGUgKG5leHRRdWV1ZS5sZW5ndGgpIHF1ZXVlLnVuc2hpZnQobmV4dFF1ZXVlLnBvcCgpKTtcblxuICAgIHdoaWxlIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgaXRlbSA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgIGlmIChpdGVtICYmIGl0ZW0ub25VcGRhdGUpIGl0ZW0ub25VcGRhdGUodGltZSk7XG4gICAgfVxuXG4gICAgdGhpcy5faW5VcGRhdGUgPSBmYWxzZTtcbn07XG5cbi8qKlxuICogcmVxdWVzdFVwZGF0ZXMgdGFrZXMgYSBjbGFzcyB0aGF0IGhhcyBhbiBvblVwZGF0ZSBtZXRob2QgYW5kIHB1dHMgaXRcbiAqIGludG8gdGhlIHVwZGF0ZVF1ZXVlIHRvIGJlIHVwZGF0ZWQgYXQgdGhlIG5leHQgZnJhbWUuXG4gKiBJZiBGYW1vdXNFbmdpbmUgaXMgY3VycmVudGx5IGluIGFuIHVwZGF0ZSwgcmVxdWVzdFVwZGF0ZVxuICogcGFzc2VzIGl0cyBhcmd1bWVudCB0byByZXF1ZXN0VXBkYXRlT25OZXh0VGljay5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHJlcXVlc3RlciBhbiBvYmplY3Qgd2l0aCBhbiBvblVwZGF0ZSBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5GYW1vdXNFbmdpbmUucHJvdG90eXBlLnJlcXVlc3RVcGRhdGUgPSBmdW5jdGlvbiByZXF1ZXN0VXBkYXRlIChyZXF1ZXN0ZXIpIHtcbiAgICBpZiAoIXJlcXVlc3RlcilcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgJ3JlcXVlc3RVcGRhdGUgbXVzdCBiZSBjYWxsZWQgd2l0aCBhIGNsYXNzIHRvIGJlIHVwZGF0ZWQnXG4gICAgICAgICk7XG5cbiAgICBpZiAodGhpcy5faW5VcGRhdGUpIHRoaXMucmVxdWVzdFVwZGF0ZU9uTmV4dFRpY2socmVxdWVzdGVyKTtcbiAgICBlbHNlIHRoaXMuX3VwZGF0ZVF1ZXVlLnB1c2gocmVxdWVzdGVyKTtcbn07XG5cbi8qKlxuICogcmVxdWVzdFVwZGF0ZU9uTmV4dFRpY2sgaXMgcmVxdWVzdHMgYW4gdXBkYXRlIG9uIHRoZSBuZXh0IGZyYW1lLlxuICogSWYgRmFtb3VzRW5naW5lIGlzIG5vdCBjdXJyZW50bHkgaW4gYW4gdXBkYXRlIHRoYW4gaXQgaXMgZnVuY3Rpb25hbGx5IGVxdWl2YWxlbnRcbiAqIHRvIHJlcXVlc3RVcGRhdGUuIFRoaXMgbWV0aG9kIHNob3VsZCBiZSB1c2VkIHRvIHByZXZlbnQgaW5maW5pdGUgbG9vcHMgd2hlcmVcbiAqIGEgY2xhc3MgaXMgdXBkYXRlZCBvbiB0aGUgZnJhbWUgYnV0IG5lZWRzIHRvIGJlIHVwZGF0ZWQgYWdhaW4gbmV4dCBmcmFtZS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHJlcXVlc3RlciBhbiBvYmplY3Qgd2l0aCBhbiBvblVwZGF0ZSBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5GYW1vdXNFbmdpbmUucHJvdG90eXBlLnJlcXVlc3RVcGRhdGVPbk5leHRUaWNrID0gZnVuY3Rpb24gcmVxdWVzdFVwZGF0ZU9uTmV4dFRpY2sgKHJlcXVlc3Rlcikge1xuICAgIHRoaXMuX25leHRVcGRhdGVRdWV1ZS5wdXNoKHJlcXVlc3Rlcik7XG59O1xuXG4vKipcbiAqIHBvc3RNZXNzYWdlIHNlbmRzIGEgbWVzc2FnZSBxdWV1ZSBpbnRvIEZhbW91c0VuZ2luZSB0byBiZSBwcm9jZXNzZWQuXG4gKiBUaGVzZSBtZXNzYWdlcyB3aWxsIGJlIGludGVycHJldGVkIGFuZCBzZW50IGludG8gdGhlIHNjZW5lIGdyYXBoXG4gKiBhcyBldmVudHMgaWYgbmVjZXNzYXJ5LlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBtZXNzYWdlcyBhbiBhcnJheSBvZiBjb21tYW5kcy5cbiAqXG4gKiBAcmV0dXJuIHtGYW1vdXNFbmdpbmV9IHRoaXNcbiAqL1xuRmFtb3VzRW5naW5lLnByb3RvdHlwZS5oYW5kbGVNZXNzYWdlID0gZnVuY3Rpb24gaGFuZGxlTWVzc2FnZSAobWVzc2FnZXMpIHtcbiAgICBpZiAoIW1lc3NhZ2VzKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAnb25NZXNzYWdlIG11c3QgYmUgY2FsbGVkIHdpdGggYW4gYXJyYXkgb2YgbWVzc2FnZXMnXG4gICAgICAgICk7XG5cbiAgICB2YXIgY29tbWFuZDtcblxuICAgIHdoaWxlIChtZXNzYWdlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNvbW1hbmQgPSBtZXNzYWdlcy5zaGlmdCgpO1xuICAgICAgICBzd2l0Y2ggKGNvbW1hbmQpIHtcbiAgICAgICAgICAgIGNhc2UgJ1dJVEgnOlxuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlV2l0aChtZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdGUkFNRSc6XG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVGcmFtZShtZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigncmVjZWl2ZWQgdW5rbm93biBjb21tYW5kOiAnICsgY29tbWFuZCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIGhhbmRsZVdpdGggaXMgYSBtZXRob2QgdGhhdCB0YWtlcyBhbiBhcnJheSBvZiBtZXNzYWdlcyBmb2xsb3dpbmcgdGhlXG4gKiBXSVRIIGNvbW1hbmQuIEl0J2xsIHRoZW4gaXNzdWUgdGhlIG5leHQgY29tbWFuZHMgdG8gdGhlIHBhdGggc3BlY2lmaWVkXG4gKiBieSB0aGUgV0lUSCBjb21tYW5kLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBtZXNzYWdlcyBhcnJheSBvZiBtZXNzYWdlcy5cbiAqXG4gKiBAcmV0dXJuIHtGYW1vdXNFbmdpbmV9IHRoaXNcbiAqL1xuRmFtb3VzRW5naW5lLnByb3RvdHlwZS5oYW5kbGVXaXRoID0gZnVuY3Rpb24gaGFuZGxlV2l0aCAobWVzc2FnZXMpIHtcbiAgICB2YXIgcGF0aCA9IG1lc3NhZ2VzLnNoaWZ0KCk7XG4gICAgdmFyIGNvbW1hbmQgPSBtZXNzYWdlcy5zaGlmdCgpO1xuXG4gICAgc3dpdGNoIChjb21tYW5kKSB7XG4gICAgICAgIGNhc2UgJ1RSSUdHRVInOiAvLyB0aGUgVFJJR0dFUiBjb21tYW5kIHNlbmRzIGEgVUlFdmVudCB0byB0aGUgc3BlY2lmaWVkIHBhdGhcbiAgICAgICAgICAgIHZhciB0eXBlID0gbWVzc2FnZXMuc2hpZnQoKTtcbiAgICAgICAgICAgIHZhciBldiA9IG1lc3NhZ2VzLnNoaWZ0KCk7XG5cbiAgICAgICAgICAgIHRoaXMuZ2V0Q29udGV4dChwYXRoKS5nZXREaXNwYXRjaCgpLmRpc3BhdGNoVUlFdmVudChwYXRoLCB0eXBlLCBldik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigncmVjZWl2ZWQgdW5rbm93biBjb21tYW5kOiAnICsgY29tbWFuZCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBoYW5kbGVGcmFtZSBpcyBjYWxsZWQgd2hlbiB0aGUgcmVuZGVyZXJzIGlzc3VlIGEgRlJBTUUgY29tbWFuZCB0b1xuICogRmFtb3VzRW5naW5lLiBGYW1vdXNFbmdpbmUgd2lsbCB0aGVuIHN0ZXAgdXBkYXRpbmcgdGhlIHNjZW5lIGdyYXBoIHRvIHRoZSBjdXJyZW50IHRpbWUuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IG1lc3NhZ2VzIGFycmF5IG9mIG1lc3NhZ2VzLlxuICpcbiAqIEByZXR1cm4ge0ZhbW91c0VuZ2luZX0gdGhpc1xuICovXG5GYW1vdXNFbmdpbmUucHJvdG90eXBlLmhhbmRsZUZyYW1lID0gZnVuY3Rpb24gaGFuZGxlRnJhbWUgKG1lc3NhZ2VzKSB7XG4gICAgaWYgKCFtZXNzYWdlcykgdGhyb3cgbmV3IEVycm9yKCdoYW5kbGVGcmFtZSBtdXN0IGJlIGNhbGxlZCB3aXRoIGFuIGFycmF5IG9mIG1lc3NhZ2VzJyk7XG4gICAgaWYgKCFtZXNzYWdlcy5sZW5ndGgpIHRocm93IG5ldyBFcnJvcignRlJBTUUgbXVzdCBiZSBzZW50IHdpdGggYSB0aW1lJyk7XG5cbiAgICB0aGlzLnN0ZXAobWVzc2FnZXMuc2hpZnQoKSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIHN0ZXAgdXBkYXRlcyB0aGUgY2xvY2sgYW5kIHRoZSBzY2VuZSBncmFwaCBhbmQgdGhlbiBzZW5kcyB0aGUgZHJhdyBjb21tYW5kc1xuICogdGhhdCBhY2N1bXVsYXRlZCBpbiB0aGUgdXBkYXRlIHRvIHRoZSByZW5kZXJlcnMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB0aW1lIGN1cnJlbnQgZW5naW5lIHRpbWVcbiAqXG4gKiBAcmV0dXJuIHtGYW1vdXNFbmdpbmV9IHRoaXNcbiAqL1xuRmFtb3VzRW5naW5lLnByb3RvdHlwZS5zdGVwID0gZnVuY3Rpb24gc3RlcCAodGltZSkge1xuICAgIGlmICh0aW1lID09IG51bGwpIHRocm93IG5ldyBFcnJvcignc3RlcCBtdXN0IGJlIGNhbGxlZCB3aXRoIGEgdGltZScpO1xuXG4gICAgdGhpcy5fY2xvY2suc3RlcCh0aW1lKTtcbiAgICB0aGlzLl91cGRhdGUoKTtcblxuICAgIGlmICh0aGlzLl9tZXNzYWdlcy5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5fY2hhbm5lbC5zZW5kTWVzc2FnZSh0aGlzLl9tZXNzYWdlcyk7XG4gICAgICAgIHRoaXMuX21lc3NhZ2VzLmxlbmd0aCA9IDI7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIHJldHVybnMgdGhlIGNvbnRleHQgb2YgYSBwYXJ0aWN1bGFyIHBhdGguIFRoZSBjb250ZXh0IGlzIGxvb2tlZCB1cCBieSB0aGUgc2VsZWN0b3JcbiAqIHBvcnRpb24gb2YgdGhlIHBhdGggYW5kIGlzIGxpc3RlZCBmcm9tIHRoZSBzdGFydCBvZiB0aGUgc3RyaW5nIHRvIHRoZSBmaXJzdFxuICogJy8nLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc2VsZWN0b3IgdGhlIHBhdGggdG8gbG9vayB1cCB0aGUgY29udGV4dCBmb3IuXG4gKlxuICogQHJldHVybiB7Q29udGV4dCB8IFVuZGVmaW5lZH0gdGhlIGNvbnRleHQgaWYgZm91bmQsIGVsc2UgdW5kZWZpbmVkLlxuICovXG5GYW1vdXNFbmdpbmUucHJvdG90eXBlLmdldENvbnRleHQgPSBmdW5jdGlvbiBnZXRDb250ZXh0IChzZWxlY3Rvcikge1xuICAgIGlmICghc2VsZWN0b3IpIHRocm93IG5ldyBFcnJvcignZ2V0Q29udGV4dCBtdXN0IGJlIGNhbGxlZCB3aXRoIGEgc2VsZWN0b3InKTtcblxuICAgIHZhciBpbmRleCA9IHNlbGVjdG9yLmluZGV4T2YoJy8nKTtcbiAgICBzZWxlY3RvciA9IGluZGV4ID09PSAtMSA/IHNlbGVjdG9yIDogc2VsZWN0b3Iuc3Vic3RyaW5nKDAsIGluZGV4KTtcblxuICAgIHJldHVybiB0aGlzLl9zY2VuZXNbc2VsZWN0b3JdO1xufTtcblxuLyoqXG4gKiByZXR1cm5zIHRoZSBpbnN0YW5jZSBvZiBjbG9jayB3aXRoaW4gZmFtb3VzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtDbG9ja30gRmFtb3VzRW5naW5lJ3MgY2xvY2tcbiAqL1xuRmFtb3VzRW5naW5lLnByb3RvdHlwZS5nZXRDbG9jayA9IGZ1bmN0aW9uIGdldENsb2NrICgpIHtcbiAgICByZXR1cm4gdGhpcy5fY2xvY2s7XG59O1xuXG4vKipcbiAqIHF1ZXVlcyBhIG1lc3NhZ2UgdG8gYmUgdHJhbnNmZXJlZCB0byB0aGUgcmVuZGVyZXJzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge0FueX0gY29tbWFuZCBEcmF3IENvbW1hbmRcbiAqXG4gKiBAcmV0dXJuIHtGYW1vdXNFbmdpbmV9IHRoaXNcbiAqL1xuRmFtb3VzRW5naW5lLnByb3RvdHlwZS5tZXNzYWdlID0gZnVuY3Rpb24gbWVzc2FnZSAoY29tbWFuZCkge1xuICAgIHRoaXMuX21lc3NhZ2VzLnB1c2goY29tbWFuZCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBzY2VuZSB1bmRlciB3aGljaCBhIHNjZW5lIGdyYXBoIGNvdWxkIGJlIGJ1aWx0LlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc2VsZWN0b3IgYSBkb20gc2VsZWN0b3IgZm9yIHdoZXJlIHRoZSBzY2VuZSBzaG91bGQgYmUgcGxhY2VkXG4gKlxuICogQHJldHVybiB7U2NlbmV9IGEgbmV3IGluc3RhbmNlIG9mIFNjZW5lLlxuICovXG5GYW1vdXNFbmdpbmUucHJvdG90eXBlLmNyZWF0ZVNjZW5lID0gZnVuY3Rpb24gY3JlYXRlU2NlbmUgKHNlbGVjdG9yKSB7XG4gICAgc2VsZWN0b3IgPSBzZWxlY3RvciB8fCAnYm9keSc7XG5cbiAgICBpZiAodGhpcy5fc2NlbmVzW3NlbGVjdG9yXSkgdGhpcy5fc2NlbmVzW3NlbGVjdG9yXS5kaXNtb3VudCgpO1xuICAgIHRoaXMuX3NjZW5lc1tzZWxlY3Rvcl0gPSBuZXcgU2NlbmUoc2VsZWN0b3IsIHRoaXMpO1xuICAgIHJldHVybiB0aGlzLl9zY2VuZXNbc2VsZWN0b3JdO1xufTtcblxuLyoqXG4gKiBTdGFydHMgdGhlIGVuZ2luZSBydW5uaW5nIGluIHRoZSBNYWluLVRocmVhZC5cbiAqIFRoaXMgZWZmZWN0cyAqKmV2ZXJ5KiogdXBkYXRlYWJsZSBtYW5hZ2VkIGJ5IHRoZSBFbmdpbmUuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge0ZhbW91c0VuZ2luZX0gdGhpc1xuICovXG5GYW1vdXNFbmdpbmUucHJvdG90eXBlLnN0YXJ0RW5naW5lID0gZnVuY3Rpb24gc3RhcnRFbmdpbmUgKCkge1xuICAgIHRoaXMuX2NoYW5uZWwuc2VuZE1lc3NhZ2UoRU5HSU5FX1NUQVJUKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU3RvcHMgdGhlIGVuZ2luZSBydW5uaW5nIGluIHRoZSBNYWluLVRocmVhZC5cbiAqIFRoaXMgZWZmZWN0cyAqKmV2ZXJ5KiogdXBkYXRlYWJsZSBtYW5hZ2VkIGJ5IHRoZSBFbmdpbmUuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge0ZhbW91c0VuZ2luZX0gdGhpc1xuICovXG5GYW1vdXNFbmdpbmUucHJvdG90eXBlLnN0b3BFbmdpbmUgPSBmdW5jdGlvbiBzdG9wRW5naW5lICgpIHtcbiAgICB0aGlzLl9jaGFubmVsLnNlbmRNZXNzYWdlKEVOR0lORV9TVE9QKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IEZhbW91c0VuZ2luZSgpO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuLypqc2hpbnQgLVcwNzkgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgVHJhbnNmb3JtID0gcmVxdWlyZSgnLi9UcmFuc2Zvcm0nKTtcbnZhciBTaXplID0gcmVxdWlyZSgnLi9TaXplJyk7XG5cbnZhciBUUkFOU0ZPUk1fUFJPQ0VTU09SID0gbmV3IFRyYW5zZm9ybSgpO1xudmFyIFNJWkVfUFJPQ0VTU09SID0gbmV3IFNpemUoKTtcblxudmFyIElERU5UID0gW1xuICAgIDEsIDAsIDAsIDAsXG4gICAgMCwgMSwgMCwgMCxcbiAgICAwLCAwLCAxLCAwLFxuICAgIDAsIDAsIDAsIDFcbl07XG5cbnZhciBPTkVTID0gWzEsIDEsIDFdO1xudmFyIFFVQVQgPSBbMCwgMCwgMCwgMV07XG5cbi8qKlxuICogTm9kZXMgZGVmaW5lIGhpZXJhcmNoeSBhbmQgZ2VvbWV0cmljYWwgdHJhbnNmb3JtYXRpb25zLiBUaGV5IGNhbiBiZSBtb3ZlZFxuICogKHRyYW5zbGF0ZWQpLCBzY2FsZWQgYW5kIHJvdGF0ZWQuXG4gKlxuICogQSBOb2RlIGlzIGVpdGhlciBtb3VudGVkIG9yIHVubW91bnRlZC4gVW5tb3VudGVkIG5vZGVzIGFyZSBkZXRhY2hlZCBmcm9tIHRoZVxuICogc2NlbmUgZ3JhcGguIFVubW91bnRlZCBub2RlcyBoYXZlIG5vIHBhcmVudCBub2RlLCB3aGlsZSBlYWNoIG1vdW50ZWQgbm9kZSBoYXNcbiAqIGV4YWN0bHkgb25lIHBhcmVudC4gTm9kZXMgaGF2ZSBhbiBhcmJpdGFyeSBudW1iZXIgb2YgY2hpbGRyZW4sIHdoaWNoIGNhbiBiZVxuICogZHluYW1pY2FsbHkgYWRkZWQgdXNpbmcgQHtAbGluayBhZGRDaGlsZH0uXG4gKlxuICogRWFjaCBOb2RlcyBoYXZlIGFuIGFyYml0cmFyeSBudW1iZXIgb2YgYGNvbXBvbmVudHNgLiBUaG9zZSBjb21wb25lbnRzIGNhblxuICogc2VuZCBgZHJhd2AgY29tbWFuZHMgdG8gdGhlIHJlbmRlcmVyIG9yIG11dGF0ZSB0aGUgbm9kZSBpdHNlbGYsIGluIHdoaWNoIGNhc2VcbiAqIHRoZXkgZGVmaW5lIGJlaGF2aW9yIGluIHRoZSBtb3N0IGV4cGxpY2l0IHdheS4gQ29tcG9uZW50cyB0aGF0IHNlbmQgYGRyYXdgXG4gKiBjb21tYW5kcyBhYXJlIGNvbnNpZGVyZWQgYHJlbmRlcmFibGVzYC4gRnJvbSB0aGUgbm9kZSdzIHBlcnNwZWN0aXZlLCB0aGVyZSBpc1xuICogbm8gZGlzdGluY3Rpb24gYmV0d2VlbiBub2RlcyB0aGF0IHNlbmQgZHJhdyBjb21tYW5kcyBhbmQgbm9kZXMgdGhhdCBkZWZpbmVcbiAqIGJlaGF2aW9yLlxuICpcbiAqIEJlY2F1c2Ugb2YgdGhlIGZhY3QgdGhhdCBOb2RlcyB0aGVtc2VsZiBhcmUgdmVyeSB1bm9waW5pb3RlZCAodGhleSBkb24ndFxuICogXCJyZW5kZXJcIiB0byBhbnl0aGluZyksIHRoZXkgYXJlIG9mdGVuIGJlaW5nIHN1YmNsYXNzZWQgaW4gb3JkZXIgdG8gYWRkIGUuZy5cbiAqIGNvbXBvbmVudHMgYXQgaW5pdGlhbGl6YXRpb24gdG8gdGhlbS4gQmVjYXVzZSBvZiB0aGlzIGZsZXhpYmlsaXR5LCB0aGV5IG1pZ2h0XG4gKiBhcyB3ZWxsIGhhdmUgYmVlbiBjYWxsZWQgYEVudGl0aWVzYC5cbiAqXG4gKiBAZXhhbXBsZVxuICogLy8gY3JlYXRlIHRocmVlIGRldGFjaGVkICh1bm1vdW50ZWQpIG5vZGVzXG4gKiB2YXIgcGFyZW50ID0gbmV3IE5vZGUoKTtcbiAqIHZhciBjaGlsZDEgPSBuZXcgTm9kZSgpO1xuICogdmFyIGNoaWxkMiA9IG5ldyBOb2RlKCk7XG4gKlxuICogLy8gYnVpbGQgYW4gdW5tb3VudGVkIHN1YnRyZWUgKHBhcmVudCBpcyBzdGlsbCBkZXRhY2hlZClcbiAqIHBhcmVudC5hZGRDaGlsZChjaGlsZDEpO1xuICogcGFyZW50LmFkZENoaWxkKGNoaWxkMik7XG4gKlxuICogLy8gbW91bnQgcGFyZW50IGJ5IGFkZGluZyBpdCB0byB0aGUgY29udGV4dFxuICogdmFyIGNvbnRleHQgPSBGYW1vdXMuY3JlYXRlQ29udGV4dChcImJvZHlcIik7XG4gKiBjb250ZXh0LmFkZENoaWxkKHBhcmVudCk7XG4gKlxuICogQGNsYXNzIE5vZGVcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBOb2RlICgpIHtcbiAgICB0aGlzLl9jYWxjdWxhdGVkVmFsdWVzID0ge1xuICAgICAgICB0cmFuc2Zvcm06IG5ldyBGbG9hdDMyQXJyYXkoSURFTlQpLFxuICAgICAgICBzaXplOiBuZXcgRmxvYXQzMkFycmF5KDMpXG4gICAgfTtcblxuICAgIHRoaXMuX3JlcXVlc3RpbmdVcGRhdGUgPSBmYWxzZTtcbiAgICB0aGlzLl9pblVwZGF0ZSA9IGZhbHNlO1xuXG4gICAgdGhpcy5fdXBkYXRlUXVldWUgPSBbXTtcbiAgICB0aGlzLl9uZXh0VXBkYXRlUXVldWUgPSBbXTtcblxuICAgIHRoaXMuX2ZyZWVkQ29tcG9uZW50SW5kaWNpZXMgPSBbXTtcbiAgICB0aGlzLl9jb21wb25lbnRzID0gW107XG5cbiAgICB0aGlzLl9mcmVlZENoaWxkSW5kaWNpZXMgPSBbXTtcbiAgICB0aGlzLl9jaGlsZHJlbiA9IFtdO1xuXG4gICAgdGhpcy5fcGFyZW50ID0gbnVsbDtcbiAgICB0aGlzLl9nbG9iYWxVcGRhdGVyID0gbnVsbDtcblxuICAgIHRoaXMuX2xhc3RFdWxlclggPSAwO1xuICAgIHRoaXMuX2xhc3RFdWxlclkgPSAwO1xuICAgIHRoaXMuX2xhc3RFdWxlclogPSAwO1xuICAgIHRoaXMuX2xhc3RFdWxlciA9IGZhbHNlO1xuXG4gICAgdGhpcy52YWx1ZSA9IG5ldyBOb2RlLlNwZWMoKTtcbn1cblxuTm9kZS5SRUxBVElWRV9TSVpFID0gU2l6ZS5SRUxBVElWRTtcbk5vZGUuQUJTT0xVVEVfU0laRSA9IFNpemUuQUJTT0xVVEU7XG5Ob2RlLlJFTkRFUl9TSVpFID0gU2l6ZS5SRU5ERVI7XG5Ob2RlLkRFRkFVTFRfU0laRSA9IFNpemUuREVGQVVMVDtcblxuLyoqXG4gKiBBIE5vZGUgc3BlYyBob2xkcyB0aGUgXCJkYXRhXCIgYXNzb2NpYXRlZCB3aXRoIGEgTm9kZS5cbiAqXG4gKiBAY2xhc3MgU3BlY1xuICogQGNvbnN0cnVjdG9yXG4gKlxuICogQHByb3BlcnR5IHtTdHJpbmd9IGxvY2F0aW9uIHBhdGggdG8gdGhlIG5vZGUgKGUuZy4gXCJib2R5LzAvMVwiKVxuICogQHByb3BlcnR5IHtPYmplY3R9IHNob3dTdGF0ZVxuICogQHByb3BlcnR5IHtCb29sZWFufSBzaG93U3RhdGUubW91bnRlZFxuICogQHByb3BlcnR5IHtCb29sZWFufSBzaG93U3RhdGUuc2hvd25cbiAqIEBwcm9wZXJ0eSB7TnVtYmVyfSBzaG93U3RhdGUub3BhY2l0eVxuICogQHByb3BlcnR5IHtPYmplY3R9IG9mZnNldHNcbiAqIEBwcm9wZXJ0eSB7RmxvYXQzMkFycmF5LjxOdW1iZXI+fSBvZmZzZXRzLm1vdW50UG9pbnRcbiAqIEBwcm9wZXJ0eSB7RmxvYXQzMkFycmF5LjxOdW1iZXI+fSBvZmZzZXRzLmFsaWduXG4gKiBAcHJvcGVydHkge0Zsb2F0MzJBcnJheS48TnVtYmVyPn0gb2Zmc2V0cy5vcmlnaW5cbiAqIEBwcm9wZXJ0eSB7T2JqZWN0fSB2ZWN0b3JzXG4gKiBAcHJvcGVydHkge0Zsb2F0MzJBcnJheS48TnVtYmVyPn0gdmVjdG9ycy5wb3NpdGlvblxuICogQHByb3BlcnR5IHtGbG9hdDMyQXJyYXkuPE51bWJlcj59IHZlY3RvcnMucm90YXRpb25cbiAqIEBwcm9wZXJ0eSB7RmxvYXQzMkFycmF5LjxOdW1iZXI+fSB2ZWN0b3JzLnNjYWxlXG4gKiBAcHJvcGVydHkge09iamVjdH0gc2l6ZVxuICogQHByb3BlcnR5IHtGbG9hdDMyQXJyYXkuPE51bWJlcj59IHNpemUuc2l6ZU1vZGVcbiAqIEBwcm9wZXJ0eSB7RmxvYXQzMkFycmF5LjxOdW1iZXI+fSBzaXplLnByb3BvcnRpb25hbFxuICogQHByb3BlcnR5IHtGbG9hdDMyQXJyYXkuPE51bWJlcj59IHNpemUuZGlmZmVyZW50aWFsXG4gKiBAcHJvcGVydHkge0Zsb2F0MzJBcnJheS48TnVtYmVyPn0gc2l6ZS5hYnNvbHV0ZVxuICogQHByb3BlcnR5IHtGbG9hdDMyQXJyYXkuPE51bWJlcj59IHNpemUucmVuZGVyXG4gKi9cbk5vZGUuU3BlYyA9IGZ1bmN0aW9uIFNwZWMgKCkge1xuICAgIHRoaXMubG9jYXRpb24gPSBudWxsO1xuICAgIHRoaXMuc2hvd1N0YXRlID0ge1xuICAgICAgICBtb3VudGVkOiBmYWxzZSxcbiAgICAgICAgc2hvd246IGZhbHNlLFxuICAgICAgICBvcGFjaXR5OiAxXG4gICAgfTtcbiAgICB0aGlzLm9mZnNldHMgPSB7XG4gICAgICAgIG1vdW50UG9pbnQ6IG5ldyBGbG9hdDMyQXJyYXkoMyksXG4gICAgICAgIGFsaWduOiBuZXcgRmxvYXQzMkFycmF5KDMpLFxuICAgICAgICBvcmlnaW46IG5ldyBGbG9hdDMyQXJyYXkoMylcbiAgICB9O1xuICAgIHRoaXMudmVjdG9ycyA9IHtcbiAgICAgICAgcG9zaXRpb246IG5ldyBGbG9hdDMyQXJyYXkoMyksXG4gICAgICAgIHJvdGF0aW9uOiBuZXcgRmxvYXQzMkFycmF5KFFVQVQpLFxuICAgICAgICBzY2FsZTogbmV3IEZsb2F0MzJBcnJheShPTkVTKVxuICAgIH07XG4gICAgdGhpcy5zaXplID0ge1xuICAgICAgICBzaXplTW9kZTogbmV3IEZsb2F0MzJBcnJheShbU2l6ZS5SRUxBVElWRSwgU2l6ZS5SRUxBVElWRSwgU2l6ZS5SRUxBVElWRV0pLFxuICAgICAgICBwcm9wb3J0aW9uYWw6IG5ldyBGbG9hdDMyQXJyYXkoT05FUyksXG4gICAgICAgIGRpZmZlcmVudGlhbDogbmV3IEZsb2F0MzJBcnJheSgzKSxcbiAgICAgICAgYWJzb2x1dGU6IG5ldyBGbG9hdDMyQXJyYXkoMyksXG4gICAgICAgIHJlbmRlcjogbmV3IEZsb2F0MzJBcnJheSgzKVxuICAgIH07XG4gICAgdGhpcy5VSUV2ZW50cyA9IFtdO1xufTtcblxuLyoqXG4gKiBEZXRlcm1pbmUgdGhlIG5vZGUncyBsb2NhdGlvbiBpbiB0aGUgc2NlbmUgZ3JhcGggaGllcmFyY2h5LlxuICogQSBsb2NhdGlvbiBvZiBgYm9keS8wLzFgIGNhbiBiZSBpbnRlcnByZXRlZCBhcyB0aGUgZm9sbG93aW5nIHNjZW5lIGdyYXBoXG4gKiBoaWVyYXJjaHkgKGlnbm9yaW5nIHNpYmxpbmdzIG9mIGFuY2VzdG9ycyBhbmQgYWRkaXRpb25hbCBjaGlsZCBub2Rlcyk6XG4gKlxuICogYENvbnRleHQ6Ym9keWAgLT4gYE5vZGU6MGAgLT4gYE5vZGU6MWAsIHdoZXJlIGBOb2RlOjFgIGlzIHRoZSBub2RlIHRoZVxuICogYGdldExvY2F0aW9uYCBtZXRob2QgaGFzIGJlZW4gaW52b2tlZCBvbi5cbiAqXG4gKiBAbWV0aG9kIGdldExvY2F0aW9uXG4gKlxuICogQHJldHVybiB7U3RyaW5nfSBsb2NhdGlvbiAocGF0aCksIGUuZy4gYGJvZHkvMC8xYFxuICovXG5Ob2RlLnByb3RvdHlwZS5nZXRMb2NhdGlvbiA9IGZ1bmN0aW9uIGdldExvY2F0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZS5sb2NhdGlvbjtcbn07XG5cbi8qKlxuICogQGFsaWFzIGdldElkXG4gKlxuICogQHJldHVybiB7U3RyaW5nfSB0aGUgcGF0aCBvZiB0aGUgTm9kZVxuICovXG5Ob2RlLnByb3RvdHlwZS5nZXRJZCA9IE5vZGUucHJvdG90eXBlLmdldExvY2F0aW9uO1xuXG4vKipcbiAqIEdsb2JhbGx5IGRpc3BhdGNoZXMgdGhlIGV2ZW50IHVzaW5nIHRoZSBTY2VuZSdzIERpc3BhdGNoLiBBbGwgbm9kZXMgd2lsbFxuICogcmVjZWl2ZSB0aGUgZGlzcGF0Y2hlZCBldmVudC5cbiAqXG4gKiBAbWV0aG9kIGVtaXRcbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IGV2ZW50ICAgRXZlbnQgdHlwZS5cbiAqIEBwYXJhbSAge09iamVjdH0gcGF5bG9hZCBFdmVudCBvYmplY3QgdG8gYmUgZGlzcGF0Y2hlZC5cbiAqXG4gKiBAcmV0dXJuIHtOb2RlfSB0aGlzXG4gKi9cbk5vZGUucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbiBlbWl0IChldmVudCwgcGF5bG9hZCkge1xuICAgIHZhciBjdXJyZW50ID0gdGhpcztcblxuICAgIHdoaWxlIChjdXJyZW50ICE9PSBjdXJyZW50LmdldFBhcmVudCgpKSB7XG4gICAgICAgIGN1cnJlbnQgPSBjdXJyZW50LmdldFBhcmVudCgpO1xuICAgIH1cblxuICAgIGN1cnJlbnQuZ2V0RGlzcGF0Y2goKS5kaXNwYXRjaChldmVudCwgcGF5bG9hZCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBUSElTIFdJTEwgQkUgREVQUklDQVRFRFxuTm9kZS5wcm90b3R5cGUuc2VuZERyYXdDb21tYW5kID0gZnVuY3Rpb24gc2VuZERyYXdDb21tYW5kIChtZXNzYWdlKSB7XG4gICAgdGhpcy5fZ2xvYmFsVXBkYXRlci5tZXNzYWdlKG1lc3NhZ2UpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZWN1cnNpdmVseSBzZXJpYWxpemVzIHRoZSBOb2RlLCBpbmNsdWRpbmcgYWxsIHByZXZpb3VzbHkgYWRkZWQgY29tcG9uZW50cy5cbiAqXG4gKiBAbWV0aG9kIGdldFZhbHVlXG4gKlxuICogQHJldHVybiB7T2JqZWN0fSAgICAgU2VyaWFsaXplZCByZXByZXNlbnRhdGlvbiBvZiB0aGUgbm9kZSwgaW5jbHVkaW5nXG4gKiAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRzLlxuICovXG5Ob2RlLnByb3RvdHlwZS5nZXRWYWx1ZSA9IGZ1bmN0aW9uIGdldFZhbHVlICgpIHtcbiAgICB2YXIgbnVtYmVyT2ZDaGlsZHJlbiA9IHRoaXMuX2NoaWxkcmVuLmxlbmd0aDtcbiAgICB2YXIgbnVtYmVyT2ZDb21wb25lbnRzID0gdGhpcy5fY29tcG9uZW50cy5sZW5ndGg7XG4gICAgdmFyIGkgPSAwO1xuXG4gICAgdmFyIHZhbHVlID0ge1xuICAgICAgICBsb2NhdGlvbjogdGhpcy52YWx1ZS5sb2NhdGlvbixcbiAgICAgICAgc3BlYzogdGhpcy52YWx1ZSxcbiAgICAgICAgY29tcG9uZW50czogbmV3IEFycmF5KG51bWJlck9mQ29tcG9uZW50cyksXG4gICAgICAgIGNoaWxkcmVuOiBuZXcgQXJyYXkobnVtYmVyT2ZDaGlsZHJlbilcbiAgICB9O1xuXG4gICAgZm9yICg7IGkgPCBudW1iZXJPZkNoaWxkcmVuIDsgaSsrKVxuICAgICAgICBpZiAodGhpcy5fY2hpbGRyZW5baV0gJiYgdGhpcy5fY2hpbGRyZW5baV0uZ2V0VmFsdWUpXG4gICAgICAgICAgICB2YWx1ZS5jaGlsZHJlbltpXSA9IHRoaXMuX2NoaWxkcmVuW2ldLmdldFZhbHVlKCk7XG5cbiAgICBmb3IgKGkgPSAwIDsgaSA8IG51bWJlck9mQ29tcG9uZW50cyA7IGkrKylcbiAgICAgICAgaWYgKHRoaXMuX2NvbXBvbmVudHNbaV0gJiYgdGhpcy5fY29tcG9uZW50c1tpXS5nZXRWYWx1ZSlcbiAgICAgICAgICAgIHZhbHVlLmNvbXBvbmVudHNbaV0gPSB0aGlzLl9jb21wb25lbnRzW2ldLmdldFZhbHVlKCk7XG5cbiAgICByZXR1cm4gdmFsdWU7XG59O1xuXG4vKipcbiAqIFNpbWlsYXIgdG8gQHtAbGluayBnZXRWYWx1ZX0sIGJ1dCByZXR1cm5zIHRoZSBhY3R1YWwgXCJjb21wdXRlZFwiIHZhbHVlLiBFLmcuXG4gKiBhIHByb3BvcnRpb25hbCBzaXplIG9mIDAuNSBtaWdodCByZXNvbHZlIGludG8gYSBcImNvbXB1dGVkXCIgc2l6ZSBvZiAyMDBweFxuICogKGFzc3VtaW5nIHRoZSBwYXJlbnQgaGFzIGEgd2lkdGggb2YgNDAwcHgpLlxuICpcbiAqIEBtZXRob2QgZ2V0Q29tcHV0ZWRWYWx1ZVxuICpcbiAqIEByZXR1cm4ge09iamVjdH0gICAgIFNlcmlhbGl6ZWQgcmVwcmVzZW50YXRpb24gb2YgdGhlIG5vZGUsIGluY2x1ZGluZ1xuICogICAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW4sIGV4Y2x1ZGluZyBjb21wb25lbnRzLlxuICovXG5Ob2RlLnByb3RvdHlwZS5nZXRDb21wdXRlZFZhbHVlID0gZnVuY3Rpb24gZ2V0Q29tcHV0ZWRWYWx1ZSAoKSB7XG4gICAgdmFyIG51bWJlck9mQ2hpbGRyZW4gPSB0aGlzLl9jaGlsZHJlbi5sZW5ndGg7XG5cbiAgICB2YXIgdmFsdWUgPSB7XG4gICAgICAgIGxvY2F0aW9uOiB0aGlzLnZhbHVlLmxvY2F0aW9uLFxuICAgICAgICBjb21wdXRlZFZhbHVlczogdGhpcy5fY2FsY3VsYXRlZFZhbHVlcyxcbiAgICAgICAgY2hpbGRyZW46IG5ldyBBcnJheShudW1iZXJPZkNoaWxkcmVuKVxuICAgIH07XG5cbiAgICBmb3IgKHZhciBpID0gMCA7IGkgPCBudW1iZXJPZkNoaWxkcmVuIDsgaSsrKVxuICAgICAgICB2YWx1ZS5jaGlsZHJlbltpXSA9IHRoaXMuX2NoaWxkcmVuW2ldLmdldENvbXB1dGVkVmFsdWUoKTtcblxuICAgIHJldHVybiB2YWx1ZTtcbn07XG5cbi8qKlxuICogUmV0cmlldmVzIGFsbCBjaGlsZHJlbiBvZiB0aGUgY3VycmVudCBub2RlLlxuICpcbiAqIEBtZXRob2QgZ2V0Q2hpbGRyZW5cbiAqXG4gKiBAcmV0dXJuIHtBcnJheS48Tm9kZT59ICAgQW4gYXJyYXkgb2YgY2hpbGRyZW4uXG4gKi9cbk5vZGUucHJvdG90eXBlLmdldENoaWxkcmVuID0gZnVuY3Rpb24gZ2V0Q2hpbGRyZW4gKCkge1xuICAgIHJldHVybiB0aGlzLl9jaGlsZHJlbjtcbn07XG5cbi8qKlxuICogUmV0cmlldmVzIHRoZSBwYXJlbnQgb2YgdGhlIGN1cnJlbnQgbm9kZS4gVW5tb3VudGVkIG5vZGVzIGRvIG5vdCBoYXZlIGFcbiAqIHBhcmVudCBub2RlLlxuICpcbiAqIEBtZXRob2QgZ2V0UGFyZW50XG4gKlxuICogQHJldHVybiB7Tm9kZX0gICAgICAgUGFyZW50IG5vZGUuXG4gKi9cbk5vZGUucHJvdG90eXBlLmdldFBhcmVudCA9IGZ1bmN0aW9uIGdldFBhcmVudCAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3BhcmVudDtcbn07XG5cbi8qKlxuICogU2NoZWR1bGVzIHRoZSBAe0BsaW5rIHVwZGF0ZX0gZnVuY3Rpb24gb2YgdGhlIG5vZGUgdG8gYmUgaW52b2tlZCBvbiB0aGUgbmV4dFxuICogZnJhbWUgKGlmIG5vIHVwZGF0ZSBkdXJpbmcgdGhpcyBmcmFtZSBoYXMgYmVlbiBzY2hlZHVsZWQgYWxyZWFkeSkuXG4gKiBJZiB0aGUgbm9kZSBpcyBjdXJyZW50bHkgYmVpbmcgdXBkYXRlZCAod2hpY2ggbWVhbnMgb25lIG9mIHRoZSByZXF1ZXN0ZXJzXG4gKiBpbnZva2VkIHJlcXVlc3RzVXBkYXRlIHdoaWxlIGJlaW5nIHVwZGF0ZWQgaXRzZWxmKSwgYW4gdXBkYXRlIHdpbGwgYmVcbiAqIHNjaGVkdWxlZCBvbiB0aGUgbmV4dCBmcmFtZS5cbiAqXG4gKiBAbWV0aG9kIHJlcXVlc3RVcGRhdGVcbiAqXG4gKiBAcGFyYW0gIHtPYmplY3R9IHJlcXVlc3RlciAgIElmIHRoZSByZXF1ZXN0ZXIgaGFzIGFuIGBvblVwZGF0ZWAgbWV0aG9kLCBpdFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWxsIGJlIGludm9rZWQgZHVyaW5nIHRoZSBuZXh0IHVwZGF0ZSBwaGFzZSBvZlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGUgbm9kZS5cbiAqXG4gKiBAcmV0dXJuIHtOb2RlfSB0aGlzXG4gKi9cbk5vZGUucHJvdG90eXBlLnJlcXVlc3RVcGRhdGUgPSBmdW5jdGlvbiByZXF1ZXN0VXBkYXRlIChyZXF1ZXN0ZXIpIHtcbiAgICBpZiAodGhpcy5faW5VcGRhdGUgfHwgIXRoaXMuaXNNb3VudGVkKCkpXG4gICAgICAgIHJldHVybiB0aGlzLnJlcXVlc3RVcGRhdGVPbk5leHRUaWNrKHJlcXVlc3Rlcik7XG4gICAgdGhpcy5fdXBkYXRlUXVldWUucHVzaChyZXF1ZXN0ZXIpO1xuICAgIGlmICghdGhpcy5fcmVxdWVzdGluZ1VwZGF0ZSkgdGhpcy5fcmVxdWVzdFVwZGF0ZSgpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTY2hlZHVsZXMgYW4gdXBkYXRlIG9uIHRoZSBuZXh0IHRpY2suIFNpbWlsYXJpbHkgdG8gQHtAbGluayByZXF1ZXN0VXBkYXRlfSxcbiAqIGByZXF1ZXN0VXBkYXRlT25OZXh0VGlja2Agc2NoZWR1bGVzIHRoZSBub2RlJ3MgYG9uVXBkYXRlYCBmdW5jdGlvbiB0byBiZVxuICogaW52b2tlZCBvbiB0aGUgZnJhbWUgYWZ0ZXIgdGhlIG5leHQgaW52b2NhdGlvbiBvbiB0aGUgbm9kZSdzIG9uVXBkYXRlIGZ1bmN0aW9uLlxuICpcbiAqIEBtZXRob2QgcmVxdWVzdFVwZGF0ZU9uTmV4dFRpY2tcbiAqXG4gKiBAcGFyYW0gIHtPYmplY3R9IHJlcXVlc3RlciAgIElmIHRoZSByZXF1ZXN0ZXIgaGFzIGFuIGBvblVwZGF0ZWAgbWV0aG9kLCBpdFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWxsIGJlIGludm9rZWQgZHVyaW5nIHRoZSBuZXh0IHVwZGF0ZSBwaGFzZSBvZlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGUgbm9kZS5cbiAqXG4gKiBAcmV0dXJuIHtOb2RlfSB0aGlzXG4gKi9cbk5vZGUucHJvdG90eXBlLnJlcXVlc3RVcGRhdGVPbk5leHRUaWNrID0gZnVuY3Rpb24gcmVxdWVzdFVwZGF0ZU9uTmV4dFRpY2sgKHJlcXVlc3Rlcikge1xuICAgIHRoaXMuX25leHRVcGRhdGVRdWV1ZS5wdXNoKHJlcXVlc3Rlcik7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEdldCB0aGUgb2JqZWN0IHJlc3BvbnNpYmxlIGZvciB1cGRhdGluZyB0aGlzIG5vZGUuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge09iamVjdH0gVGhlIGdsb2JhbCB1cGRhdGVyLlxuICovXG5Ob2RlLnByb3RvdHlwZS5nZXRVcGRhdGVyID0gZnVuY3Rpb24gZ2V0VXBkYXRlciAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2dsb2JhbFVwZGF0ZXI7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiB0aGUgbm9kZSBpcyBtb3VudGVkLiBVbm1vdW50ZWQgbm9kZXMgYXJlIGRldGFjaGVkIGZyb20gdGhlIHNjZW5lXG4gKiBncmFwaC5cbiAqXG4gKiBAbWV0aG9kIGlzTW91bnRlZFxuICpcbiAqIEByZXR1cm4ge0Jvb2xlYW59ICAgIEJvb2xlYW4gaW5kaWNhdGluZyB3ZWF0aGVyIHRoZSBub2RlIGlzIG1vdW50ZWQgb3Igbm90LlxuICovXG5Ob2RlLnByb3RvdHlwZS5pc01vdW50ZWQgPSBmdW5jdGlvbiBpc01vdW50ZWQgKCkge1xuICAgIHJldHVybiB0aGlzLnZhbHVlLnNob3dTdGF0ZS5tb3VudGVkO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgdGhlIG5vZGUgaXMgdmlzaWJsZSAoXCJzaG93blwiKS5cbiAqXG4gKiBAbWV0aG9kIGlzU2hvd25cbiAqXG4gKiBAcmV0dXJuIHtCb29sZWFufSAgICBCb29sZWFuIGluZGljYXRpbmcgd2VhdGhlciB0aGUgbm9kZSBpcyB2aXNpYmxlXG4gKiAgICAgICAgICAgICAgICAgICAgICAoXCJzaG93blwiKSBvciBub3QuXG4gKi9cbk5vZGUucHJvdG90eXBlLmlzU2hvd24gPSBmdW5jdGlvbiBpc1Nob3duICgpIHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZS5zaG93U3RhdGUuc2hvd247XG59O1xuXG4vKipcbiAqIERldGVybWluZXMgdGhlIG5vZGUncyByZWxhdGl2ZSBvcGFjaXR5LlxuICogVGhlIG9wYWNpdHkgbmVlZHMgdG8gYmUgd2l0aGluIFswLCAxXSwgd2hlcmUgMCBpbmRpY2F0ZXMgYSBjb21wbGV0ZWx5XG4gKiB0cmFuc3BhcmVudCwgdGhlcmVmb3JlIGludmlzaWJsZSBub2RlLCB3aGVyZWFzIGFuIG9wYWNpdHkgb2YgMSBtZWFucyB0aGVcbiAqIG5vZGUgaXMgY29tcGxldGVseSBzb2xpZC5cbiAqXG4gKiBAbWV0aG9kIGdldE9wYWNpdHlcbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9ICAgICAgICAgUmVsYXRpdmUgb3BhY2l0eSBvZiB0aGUgbm9kZS5cbiAqL1xuTm9kZS5wcm90b3R5cGUuZ2V0T3BhY2l0eSA9IGZ1bmN0aW9uIGdldE9wYWNpdHkgKCkge1xuICAgIHJldHVybiB0aGlzLnZhbHVlLnNob3dTdGF0ZS5vcGFjaXR5O1xufTtcblxuLyoqXG4gKiBEZXRlcm1pbmVzIHRoZSBub2RlJ3MgcHJldmlvdXNseSBzZXQgbW91bnQgcG9pbnQuXG4gKlxuICogQG1ldGhvZCBnZXRNb3VudFBvaW50XG4gKlxuICogQHJldHVybiB7RmxvYXQzMkFycmF5fSAgIEFuIGFycmF5IHJlcHJlc2VudGluZyB0aGUgbW91bnQgcG9pbnQuXG4gKi9cbk5vZGUucHJvdG90eXBlLmdldE1vdW50UG9pbnQgPSBmdW5jdGlvbiBnZXRNb3VudFBvaW50ICgpIHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZS5vZmZzZXRzLm1vdW50UG9pbnQ7XG59O1xuXG4vKipcbiAqIERldGVybWluZXMgdGhlIG5vZGUncyBwcmV2aW91c2x5IHNldCBhbGlnbi5cbiAqXG4gKiBAbWV0aG9kIGdldEFsaWduXG4gKlxuICogQHJldHVybiB7RmxvYXQzMkFycmF5fSAgIEFuIGFycmF5IHJlcHJlc2VudGluZyB0aGUgYWxpZ24uXG4gKi9cbk5vZGUucHJvdG90eXBlLmdldEFsaWduID0gZnVuY3Rpb24gZ2V0QWxpZ24gKCkge1xuICAgIHJldHVybiB0aGlzLnZhbHVlLm9mZnNldHMuYWxpZ247XG59O1xuXG4vKipcbiAqIERldGVybWluZXMgdGhlIG5vZGUncyBwcmV2aW91c2x5IHNldCBvcmlnaW4uXG4gKlxuICogQG1ldGhvZCBnZXRPcmlnaW5cbiAqXG4gKiBAcmV0dXJuIHtGbG9hdDMyQXJyYXl9ICAgQW4gYXJyYXkgcmVwcmVzZW50aW5nIHRoZSBvcmlnaW4uXG4gKi9cbk5vZGUucHJvdG90eXBlLmdldE9yaWdpbiA9IGZ1bmN0aW9uIGdldE9yaWdpbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMudmFsdWUub2Zmc2V0cy5vcmlnaW47XG59O1xuXG4vKipcbiAqIERldGVybWluZXMgdGhlIG5vZGUncyBwcmV2aW91c2x5IHNldCBwb3NpdGlvbi5cbiAqXG4gKiBAbWV0aG9kIGdldFBvc2l0aW9uXG4gKlxuICogQHJldHVybiB7RmxvYXQzMkFycmF5fSAgIEFuIGFycmF5IHJlcHJlc2VudGluZyB0aGUgcG9zaXRpb24uXG4gKi9cbk5vZGUucHJvdG90eXBlLmdldFBvc2l0aW9uID0gZnVuY3Rpb24gZ2V0UG9zaXRpb24gKCkge1xuICAgIHJldHVybiB0aGlzLnZhbHVlLnZlY3RvcnMucG9zaXRpb247XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIG5vZGUncyBjdXJyZW50IHJvdGF0aW9uXG4gKlxuICogQG1ldGhvZCBnZXRSb3RhdGlvblxuICpcbiAqIEByZXR1cm4ge0Zsb2F0MzJBcnJheX0gYW4gYXJyYXkgb2YgZm91ciB2YWx1ZXMsIHNob3dpbmcgdGhlIHJvdGF0aW9uIGFzIGEgcXVhdGVybmlvblxuICovXG5Ob2RlLnByb3RvdHlwZS5nZXRSb3RhdGlvbiA9IGZ1bmN0aW9uIGdldFJvdGF0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZS52ZWN0b3JzLnJvdGF0aW9uO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBzY2FsZSBvZiB0aGUgbm9kZVxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtGbG9hdDMyQXJyYXl9IGFuIGFycmF5IHNob3dpbmcgdGhlIGN1cnJlbnQgc2NhbGUgdmVjdG9yXG4gKi9cbk5vZGUucHJvdG90eXBlLmdldFNjYWxlID0gZnVuY3Rpb24gZ2V0U2NhbGUgKCkge1xuICAgIHJldHVybiB0aGlzLnZhbHVlLnZlY3RvcnMuc2NhbGU7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGN1cnJlbnQgc2l6ZSBtb2RlIG9mIHRoZSBub2RlXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge0Zsb2F0MzJBcnJheX0gYW4gYXJyYXkgb2YgbnVtYmVycyBzaG93aW5nIHRoZSBjdXJyZW50IHNpemUgbW9kZVxuICovXG5Ob2RlLnByb3RvdHlwZS5nZXRTaXplTW9kZSA9IGZ1bmN0aW9uIGdldFNpemVNb2RlICgpIHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZS5zaXplLnNpemVNb2RlO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBjdXJyZW50IHByb3BvcnRpb25hbCBzaXplXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge0Zsb2F0MzJBcnJheX0gYSB2ZWN0b3IgMyBzaG93aW5nIHRoZSBjdXJyZW50IHByb3BvcnRpb25hbCBzaXplXG4gKi9cbk5vZGUucHJvdG90eXBlLmdldFByb3BvcnRpb25hbFNpemUgPSBmdW5jdGlvbiBnZXRQcm9wb3J0aW9uYWxTaXplICgpIHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZS5zaXplLnByb3BvcnRpb25hbDtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgZGlmZmVyZW50aWFsIHNpemUgb2YgdGhlIG5vZGVcbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7RmxvYXQzMkFycmF5fSBhIHZlY3RvciAzIHNob3dpbmcgdGhlIGN1cnJlbnQgZGlmZmVyZW50aWFsIHNpemVcbiAqL1xuTm9kZS5wcm90b3R5cGUuZ2V0RGlmZmVyZW50aWFsU2l6ZSA9IGZ1bmN0aW9uIGdldERpZmZlcmVudGlhbFNpemUgKCkge1xuICAgIHJldHVybiB0aGlzLnZhbHVlLnNpemUuZGlmZmVyZW50aWFsO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBhYnNvbHV0ZSBzaXplIG9mIHRoZSBub2RlXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge0Zsb2F0MzJBcnJheX0gYSB2ZWN0b3IgMyBzaG93aW5nIHRoZSBjdXJyZW50IGFic29sdXRlIHNpemUgb2YgdGhlIG5vZGVcbiAqL1xuTm9kZS5wcm90b3R5cGUuZ2V0QWJzb2x1dGVTaXplID0gZnVuY3Rpb24gZ2V0QWJzb2x1dGVTaXplICgpIHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZS5zaXplLmFic29sdXRlO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBjdXJyZW50IFJlbmRlciBTaXplIG9mIHRoZSBub2RlLiBOb3RlIHRoYXQgdGhlIHJlbmRlciBzaXplXG4gKiBpcyBhc3luY2hyb25vdXMgKHdpbGwgYWx3YXlzIGJlIG9uZSBmcmFtZSBiZWhpbmQpIGFuZCBuZWVkcyB0byBiZSBleHBsaWNpdGVseVxuICogY2FsY3VsYXRlZCBieSBzZXR0aW5nIHRoZSBwcm9wZXIgc2l6ZSBtb2RlLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtGbG9hdDMyQXJyYXl9IGEgdmVjdG9yIDMgc2hvd2luZyB0aGUgY3VycmVudCByZW5kZXIgc2l6ZVxuICovXG5Ob2RlLnByb3RvdHlwZS5nZXRSZW5kZXJTaXplID0gZnVuY3Rpb24gZ2V0UmVuZGVyU2l6ZSAoKSB7XG4gICAgcmV0dXJuIHRoaXMudmFsdWUuc2l6ZS5yZW5kZXI7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGV4dGVybmFsIHNpemUgb2YgdGhlIG5vZGVcbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7RmxvYXQzMkFycmF5fSBhIHZlY3RvciAzIG9mIHRoZSBmaW5hbCBjYWxjdWxhdGVkIHNpZGUgb2YgdGhlIG5vZGVcbiAqL1xuTm9kZS5wcm90b3R5cGUuZ2V0U2l6ZSA9IGZ1bmN0aW9uIGdldFNpemUgKCkge1xuICAgIHJldHVybiB0aGlzLl9jYWxjdWxhdGVkVmFsdWVzLnNpemU7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGN1cnJlbnQgd29ybGQgdHJhbnNmb3JtIG9mIHRoZSBub2RlXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge0Zsb2F0MzJBcnJheX0gYSAxNiB2YWx1ZSB0cmFuc2Zvcm1cbiAqL1xuTm9kZS5wcm90b3R5cGUuZ2V0VHJhbnNmb3JtID0gZnVuY3Rpb24gZ2V0VHJhbnNmb3JtICgpIHtcbiAgICByZXR1cm4gdGhpcy5fY2FsY3VsYXRlZFZhbHVlcy50cmFuc2Zvcm07XG59O1xuXG4vKipcbiAqIEdldCB0aGUgbGlzdCBvZiB0aGUgVUkgRXZlbnRzIHRoYXQgYXJlIGN1cnJlbnRseSBhc3NvY2lhdGVkIHdpdGggdGhpcyBub2RlXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge0FycmF5fSBhbiBhcnJheSBvZiBzdHJpbmdzIHJlcHJlc2VudGluZyB0aGUgY3VycmVudCBzdWJzY3JpYmVkIFVJIGV2ZW50IG9mIHRoaXMgbm9kZVxuICovXG5Ob2RlLnByb3RvdHlwZS5nZXRVSUV2ZW50cyA9IGZ1bmN0aW9uIGdldFVJRXZlbnRzICgpIHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZS5VSUV2ZW50cztcbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBjaGlsZCB0byB0aGlzIG5vZGUuIElmIHRoaXMgbWV0aG9kIGlzIGNhbGxlZCB3aXRoIG5vIGFyZ3VtZW50IGl0IHdpbGxcbiAqIGNyZWF0ZSBhIG5ldyBub2RlLCBob3dldmVyIGl0IGNhbiBhbHNvIGJlIGNhbGxlZCB3aXRoIGFuIGV4aXN0aW5nIG5vZGUgd2hpY2ggaXQgd2lsbFxuICogYXBwZW5kIHRvIHRoZSBub2RlIHRoYXQgdGhpcyBtZXRob2QgaXMgYmVpbmcgY2FsbGVkIG9uLiBSZXR1cm5zIHRoZSBuZXcgb3IgcGFzc2VkIGluIG5vZGUuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7Tm9kZSB8IHZvaWR9IGNoaWxkIHRoZSBub2RlIHRvIGFwcGVuZGVkIG9yIG5vIG5vZGUgdG8gY3JlYXRlIGEgbmV3IG5vZGUuXG4gKlxuICogQHJldHVybiB7Tm9kZX0gdGhlIGFwcGVuZGVkIG5vZGUuXG4gKi9cbk5vZGUucHJvdG90eXBlLmFkZENoaWxkID0gZnVuY3Rpb24gYWRkQ2hpbGQgKGNoaWxkKSB7XG4gICAgdmFyIGluZGV4ID0gY2hpbGQgPyB0aGlzLl9jaGlsZHJlbi5pbmRleE9mKGNoaWxkKSA6IC0xO1xuICAgIGNoaWxkID0gY2hpbGQgPyBjaGlsZCA6IG5ldyBOb2RlKCk7XG5cbiAgICBpZiAoaW5kZXggPT09IC0xKSB7XG4gICAgICAgIGluZGV4ID0gdGhpcy5fZnJlZWRDaGlsZEluZGljaWVzLmxlbmd0aCA/IHRoaXMuX2ZyZWVkQ2hpbGRJbmRpY2llcy5wb3AoKSA6IHRoaXMuX2NoaWxkcmVuLmxlbmd0aDtcbiAgICAgICAgdGhpcy5fY2hpbGRyZW5baW5kZXhdID0gY2hpbGQ7XG5cbiAgICAgICAgaWYgKHRoaXMuaXNNb3VudGVkKCkgJiYgY2hpbGQub25Nb3VudCkge1xuICAgICAgICAgICAgdmFyIG15SWQgPSB0aGlzLmdldElkKCk7XG4gICAgICAgICAgICB2YXIgY2hpbGRJZCA9IG15SWQgKyAnLycgKyBpbmRleDtcbiAgICAgICAgICAgIGNoaWxkLm9uTW91bnQodGhpcywgY2hpbGRJZCk7XG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIHJldHVybiBjaGlsZDtcbn07XG5cbi8qKlxuICogUmVtb3ZlcyBhIGNoaWxkIG5vZGUgZnJvbSBhbm90aGVyIG5vZGUuIFRoZSBwYXNzZWQgaW4gbm9kZSBtdXN0IGJlXG4gKiBhIGNoaWxkIG9mIHRoZSBub2RlIHRoYXQgdGhpcyBtZXRob2QgaXMgY2FsbGVkIHVwb24uXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gY2hpbGQgbm9kZSB0byBiZSByZW1vdmVkXG4gKlxuICogQHJldHVybiB7Qm9vbGVhbn0gd2hldGhlciBvciBub3QgdGhlIG5vZGUgd2FzIHN1Y2Nlc3NmdWxseSByZW1vdmVkXG4gKi9cbk5vZGUucHJvdG90eXBlLnJlbW92ZUNoaWxkID0gZnVuY3Rpb24gcmVtb3ZlQ2hpbGQgKGNoaWxkKSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy5fY2hpbGRyZW4uaW5kZXhPZihjaGlsZCk7XG4gICAgdmFyIGFkZGVkID0gaW5kZXggIT09IC0xO1xuICAgIGlmIChhZGRlZCkge1xuICAgICAgICB0aGlzLl9mcmVlZENoaWxkSW5kaWNpZXMucHVzaChpbmRleCk7XG5cbiAgICAgICAgdGhpcy5fY2hpbGRyZW5baW5kZXhdID0gbnVsbDtcblxuICAgICAgICBpZiAodGhpcy5pc01vdW50ZWQoKSAmJiBjaGlsZC5vbkRpc21vdW50KVxuICAgICAgICAgICAgY2hpbGQub25EaXNtb3VudCgpO1xuICAgIH1cbiAgICByZXR1cm4gYWRkZWQ7XG59O1xuXG4vKipcbiAqIEVhY2ggY29tcG9uZW50IGNhbiBvbmx5IGJlIGFkZGVkIG9uY2UgcGVyIG5vZGUuXG4gKlxuICogQG1ldGhvZCBhZGRDb21wb25lbnRcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gY29tcG9uZW50ICAgIEFuIGNvbXBvbmVudCB0byBiZSBhZGRlZC5cbiAqIEByZXR1cm4ge051bWJlcn0gaW5kZXggICAgICAgVGhlIGluZGV4IGF0IHdoaWNoIHRoZSBjb21wb25lbnQgaGFzIGJlZW5cbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVnaXN0ZXJlZC4gSW5kaWNlcyBhcmVuJ3QgbmVjZXNzYXJpbHlcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc2VjdXRpdmUuXG4gKi9cbk5vZGUucHJvdG90eXBlLmFkZENvbXBvbmVudCA9IGZ1bmN0aW9uIGFkZENvbXBvbmVudCAoY29tcG9uZW50KSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy5fY29tcG9uZW50cy5pbmRleE9mKGNvbXBvbmVudCk7XG4gICAgaWYgKGluZGV4ID09PSAtMSkge1xuICAgICAgICBpbmRleCA9IHRoaXMuX2ZyZWVkQ29tcG9uZW50SW5kaWNpZXMubGVuZ3RoID8gdGhpcy5fZnJlZWRDb21wb25lbnRJbmRpY2llcy5wb3AoKSA6IHRoaXMuX2NvbXBvbmVudHMubGVuZ3RoO1xuICAgICAgICB0aGlzLl9jb21wb25lbnRzW2luZGV4XSA9IGNvbXBvbmVudDtcblxuICAgICAgICBpZiAodGhpcy5pc01vdW50ZWQoKSAmJiBjb21wb25lbnQub25Nb3VudClcbiAgICAgICAgICAgIGNvbXBvbmVudC5vbk1vdW50KHRoaXMsIGluZGV4KTtcblxuICAgICAgICBpZiAodGhpcy5pc1Nob3duKCkgJiYgY29tcG9uZW50Lm9uU2hvdylcbiAgICAgICAgICAgIGNvbXBvbmVudC5vblNob3coKTtcbiAgICB9XG5cbiAgICByZXR1cm4gaW5kZXg7XG59O1xuXG4vKipcbiAqIEBtZXRob2QgIGdldENvbXBvbmVudFxuICpcbiAqIEBwYXJhbSAge051bWJlcn0gaW5kZXggICBJbmRleCBhdCB3aGljaCB0aGUgY29tcG9uZW50IGhhcyBiZWVuIHJlZ3NpdGVyZWRcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAodXNpbmcgYE5vZGUjYWRkQ29tcG9uZW50YCkuXG4gKiBAcmV0dXJuIHsqfSAgICAgICAgICAgICAgVGhlIGNvbXBvbmVudCByZWdpc3RlcmVkIGF0IHRoZSBwYXNzZWQgaW4gaW5kZXggKGlmXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgYW55KS5cbiAqL1xuTm9kZS5wcm90b3R5cGUuZ2V0Q29tcG9uZW50ID0gZnVuY3Rpb24gZ2V0Q29tcG9uZW50IChpbmRleCkge1xuICAgIHJldHVybiB0aGlzLl9jb21wb25lbnRzW2luZGV4XTtcbn07XG5cbi8qKlxuICogUmVtb3ZlcyBhIHByZXZpb3VzbHkgdmlhIEB7QGxpbmsgYWRkQ29tcG9uZW50fSBhZGRlZCBjb21wb25lbnQuXG4gKlxuICogQG1ldGhvZCByZW1vdmVDb21wb25lbnRcbiAqXG4gKiBAcGFyYW0gIHtPYmplY3R9IGNvbXBvbmVudCAgIEFuIGNvbXBvbmVudCB0aGF0IGhhcyBwcmV2aW91c2x5IGJlZW4gYWRkZWRcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXNpbmcgQHtAbGluayBhZGRDb21wb25lbnR9LlxuICpcbiAqIEByZXR1cm4ge05vZGV9IHRoaXNcbiAqL1xuTm9kZS5wcm90b3R5cGUucmVtb3ZlQ29tcG9uZW50ID0gZnVuY3Rpb24gcmVtb3ZlQ29tcG9uZW50IChjb21wb25lbnQpIHtcbiAgICB2YXIgaW5kZXggPSB0aGlzLl9jb21wb25lbnRzLmluZGV4T2YoY29tcG9uZW50KTtcbiAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICAgIHRoaXMuX2ZyZWVkQ29tcG9uZW50SW5kaWNpZXMucHVzaChpbmRleCk7XG4gICAgICAgIGlmICh0aGlzLmlzU2hvd24oKSAmJiBjb21wb25lbnQub25IaWRlKVxuICAgICAgICAgICAgY29tcG9uZW50Lm9uSGlkZSgpO1xuXG4gICAgICAgIGlmICh0aGlzLmlzTW91bnRlZCgpICYmIGNvbXBvbmVudC5vbkRpc21vdW50KVxuICAgICAgICAgICAgY29tcG9uZW50Lm9uRGlzbW91bnQoKTtcblxuICAgICAgICB0aGlzLl9jb21wb25lbnRzW2luZGV4XSA9IG51bGw7XG4gICAgfVxuICAgIHJldHVybiBjb21wb25lbnQ7XG59O1xuXG4vKipcbiAqIFN1YnNjcmliZXMgYSBub2RlIHRvIGEgVUkgRXZlbnQuIEFsbCBjb21wb25lbnRzIG9uIHRoZSBub2RlXG4gKiB3aWxsIGhhdmUgdGhlIG9wcG9ydHVuaXR5IHRvIGJlZ2luIGxpc3RlbmluZyB0byB0aGF0IGV2ZW50XG4gKiBhbmQgYWxlcnRpbmcgdGhlIHNjZW5lIGdyYXBoLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnROYW1lIHRoZSBuYW1lIG9mIHRoZSBldmVudFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbk5vZGUucHJvdG90eXBlLmFkZFVJRXZlbnQgPSBmdW5jdGlvbiBhZGRVSUV2ZW50IChldmVudE5hbWUpIHtcbiAgICB2YXIgVUlFdmVudHMgPSB0aGlzLmdldFVJRXZlbnRzKCk7XG4gICAgdmFyIGNvbXBvbmVudHMgPSB0aGlzLl9jb21wb25lbnRzO1xuICAgIHZhciBjb21wb25lbnQ7XG5cbiAgICB2YXIgYWRkZWQgPSBVSUV2ZW50cy5pbmRleE9mKGV2ZW50TmFtZSkgIT09IC0xO1xuICAgIGlmICghYWRkZWQpIHtcbiAgICAgICAgVUlFdmVudHMucHVzaChldmVudE5hbWUpO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gY29tcG9uZW50cy5sZW5ndGggOyBpIDwgbGVuIDsgaSsrKSB7XG4gICAgICAgICAgICBjb21wb25lbnQgPSBjb21wb25lbnRzW2ldO1xuICAgICAgICAgICAgaWYgKGNvbXBvbmVudCAmJiBjb21wb25lbnQub25BZGRVSUV2ZW50KSBjb21wb25lbnQub25BZGRVSUV2ZW50KGV2ZW50TmFtZSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKipcbiAqIFByaXZhdGUgbWV0aG9kIGZvciB0aGUgTm9kZSB0byByZXF1ZXN0IGFuIHVwZGF0ZSBmb3IgaXRzZWxmLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwcml2YXRlXG4gKlxuICogQHBhcmFtIHtCb29sZWFufSBmb3JjZSB3aGV0aGVyIG9yIG5vdCB0byBmb3JjZSB0aGUgdXBkYXRlXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuTm9kZS5wcm90b3R5cGUuX3JlcXVlc3RVcGRhdGUgPSBmdW5jdGlvbiBfcmVxdWVzdFVwZGF0ZSAoZm9yY2UpIHtcbiAgICBpZiAoZm9yY2UgfHwgKCF0aGlzLl9yZXF1ZXN0aW5nVXBkYXRlICYmIHRoaXMuX2dsb2JhbFVwZGF0ZXIpKSB7XG4gICAgICAgIHRoaXMuX2dsb2JhbFVwZGF0ZXIucmVxdWVzdFVwZGF0ZSh0aGlzKTtcbiAgICAgICAgdGhpcy5fcmVxdWVzdGluZ1VwZGF0ZSA9IHRydWU7XG4gICAgfVxufTtcblxuLyoqXG4gKiBQcml2YXRlIG1ldGhvZCB0byBzZXQgYW4gb3B0aW9uYWwgdmFsdWUgaW4gYW4gYXJyYXksIGFuZFxuICogcmVxdWVzdCBhbiB1cGRhdGUgaWYgdGhpcyBjaGFuZ2VzIHRoZSB2YWx1ZSBvZiB0aGUgYXJyYXkuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHZlYyB0aGUgYXJyYXkgdG8gaW5zZXJ0IHRoZSB2YWx1ZSBpbnRvXG4gKiBAcGFyYW0ge051bWJlcn0gaW5kZXggdGhlIGluZGV4IGF0IHdoaWNoIHRvIGluc2VydCB0aGUgdmFsdWVcbiAqIEBwYXJhbSB7QW55fSB2YWwgdGhlIHZhbHVlIHRvIHBvdGVudGlhbGx5IGluc2VydCAoaWYgbm90IG51bGwgb3IgdW5kZWZpbmVkKVxuICpcbiAqIEByZXR1cm4ge0Jvb2xlYW59IHdoZXRoZXIgb3Igbm90IGEgbmV3IHZhbHVlIHdhcyBpbnNlcnRlZC5cbiAqL1xuTm9kZS5wcm90b3R5cGUuX3ZlY09wdGlvbmFsU2V0ID0gZnVuY3Rpb24gX3ZlY09wdGlvbmFsU2V0ICh2ZWMsIGluZGV4LCB2YWwpIHtcbiAgICBpZiAodmFsICE9IG51bGwgJiYgdmVjW2luZGV4XSAhPT0gdmFsKSB7XG4gICAgICAgIHZlY1tpbmRleF0gPSB2YWw7XG4gICAgICAgIGlmICghdGhpcy5fcmVxdWVzdGluZ1VwZGF0ZSkgdGhpcy5fcmVxdWVzdFVwZGF0ZSgpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBTaG93cyB0aGUgbm9kZSwgd2hpY2ggaXMgdG8gc2F5LCBjYWxscyBvblNob3cgb24gYWxsIG9mIHRoZVxuICogbm9kZSdzIGNvbXBvbmVudHMuIFJlbmRlcmFibGUgY29tcG9uZW50cyBjYW4gdGhlbiBpc3N1ZSB0aGVcbiAqIGRyYXcgY29tbWFuZHMgbmVjZXNzYXJ5IHRvIGJlIHNob3duLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtOb2RlfSB0aGlzXG4gKi9cbk5vZGUucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbiBzaG93ICgpIHtcbiAgICB2YXIgaSA9IDA7XG4gICAgdmFyIGl0ZW1zID0gdGhpcy5fY29tcG9uZW50cztcbiAgICB2YXIgbGVuID0gaXRlbXMubGVuZ3RoO1xuICAgIHZhciBpdGVtO1xuXG4gICAgdGhpcy52YWx1ZS5zaG93U3RhdGUuc2hvd24gPSB0cnVlO1xuXG4gICAgZm9yICg7IGkgPCBsZW4gOyBpKyspIHtcbiAgICAgICAgaXRlbSA9IGl0ZW1zW2ldO1xuICAgICAgICBpZiAoaXRlbSAmJiBpdGVtLm9uU2hvdykgaXRlbS5vblNob3coKTtcbiAgICB9XG5cbiAgICBpID0gMDtcbiAgICBpdGVtcyA9IHRoaXMuX2NoaWxkcmVuO1xuICAgIGxlbiA9IGl0ZW1zLmxlbmd0aDtcblxuICAgIGZvciAoOyBpIDwgbGVuIDsgaSsrKSB7XG4gICAgICAgIGl0ZW0gPSBpdGVtc1tpXTtcbiAgICAgICAgaWYgKGl0ZW0gJiYgaXRlbS5vblBhcmVudFNob3cpIGl0ZW0ub25QYXJlbnRTaG93KCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBIaWRlcyB0aGUgbm9kZSwgd2hpY2ggaXMgdG8gc2F5LCBjYWxscyBvbkhpZGUgb24gYWxsIG9mIHRoZVxuICogbm9kZSdzIGNvbXBvbmVudHMuIFJlbmRlcmFibGUgY29tcG9uZW50cyBjYW4gdGhlbiBpc3N1ZVxuICogdGhlIGRyYXcgY29tbWFuZHMgbmVjZXNzYXJ5IHRvIGJlIGhpZGRlblxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtOb2RlfSB0aGlzXG4gKi9cbk5vZGUucHJvdG90eXBlLmhpZGUgPSBmdW5jdGlvbiBoaWRlICgpIHtcbiAgICB2YXIgaSA9IDA7XG4gICAgdmFyIGl0ZW1zID0gdGhpcy5fY29tcG9uZW50cztcbiAgICB2YXIgbGVuID0gaXRlbXMubGVuZ3RoO1xuICAgIHZhciBpdGVtO1xuXG4gICAgdGhpcy52YWx1ZS5zaG93U3RhdGUuc2hvd24gPSBmYWxzZTtcblxuICAgIGZvciAoOyBpIDwgbGVuIDsgaSsrKSB7XG4gICAgICAgIGl0ZW0gPSBpdGVtc1tpXTtcbiAgICAgICAgaWYgKGl0ZW0gJiYgaXRlbS5vbkhpZGUpIGl0ZW0ub25IaWRlKCk7XG4gICAgfVxuXG4gICAgaSA9IDA7XG4gICAgaXRlbXMgPSB0aGlzLl9jaGlsZHJlbjtcbiAgICBsZW4gPSBpdGVtcy5sZW5ndGg7XG5cbiAgICBmb3IgKDsgaSA8IGxlbiA7IGkrKykge1xuICAgICAgICBpdGVtID0gaXRlbXNbaV07XG4gICAgICAgIGlmIChpdGVtICYmIGl0ZW0ub25QYXJlbnRIaWRlKSBpdGVtLm9uUGFyZW50SGlkZSgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0cyB0aGUgYWxpZ24gdmFsdWUgb2YgdGhlIG5vZGUuIFdpbGwgY2FsbCBvbkFsaWduQ2hhbmdlXG4gKiBvbiBhbGwgb2YgdGhlIE5vZGUncyBjb21wb25lbnRzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0geCBBbGlnbiB2YWx1ZSBpbiB0aGUgeCBkaW1lbnNpb24uXG4gKiBAcGFyYW0ge051bWJlcn0geSBBbGlnbiB2YWx1ZSBpbiB0aGUgeSBkaW1lbnNpb24uXG4gKiBAcGFyYW0ge051bWJlcn0geiBBbGlnbiB2YWx1ZSBpbiB0aGUgeiBkaW1lbnNpb24uXG4gKlxuICogQHJldHVybiB7Tm9kZX0gdGhpc1xuICovXG5Ob2RlLnByb3RvdHlwZS5zZXRBbGlnbiA9IGZ1bmN0aW9uIHNldEFsaWduICh4LCB5LCB6KSB7XG4gICAgdmFyIHZlYzMgPSB0aGlzLnZhbHVlLm9mZnNldHMuYWxpZ247XG4gICAgdmFyIHByb3BvZ2F0ZSA9IGZhbHNlO1xuXG4gICAgcHJvcG9nYXRlID0gdGhpcy5fdmVjT3B0aW9uYWxTZXQodmVjMywgMCwgeCkgfHwgcHJvcG9nYXRlO1xuICAgIHByb3BvZ2F0ZSA9IHRoaXMuX3ZlY09wdGlvbmFsU2V0KHZlYzMsIDEsIHkpIHx8IHByb3BvZ2F0ZTtcbiAgICBpZiAoeiAhPSBudWxsKSBwcm9wb2dhdGUgPSB0aGlzLl92ZWNPcHRpb25hbFNldCh2ZWMzLCAyLCAoeiAtIDAuNSkpIHx8IHByb3BvZ2F0ZTtcblxuICAgIGlmIChwcm9wb2dhdGUpIHtcbiAgICAgICAgdmFyIGkgPSAwO1xuICAgICAgICB2YXIgbGlzdCA9IHRoaXMuX2NvbXBvbmVudHM7XG4gICAgICAgIHZhciBsZW4gPSBsaXN0Lmxlbmd0aDtcbiAgICAgICAgdmFyIGl0ZW07XG4gICAgICAgIHggPSB2ZWMzWzBdO1xuICAgICAgICB5ID0gdmVjM1sxXTtcbiAgICAgICAgeiA9IHZlYzNbMl07XG4gICAgICAgIGZvciAoOyBpIDwgbGVuIDsgaSsrKSB7XG4gICAgICAgICAgICBpdGVtID0gbGlzdFtpXTtcbiAgICAgICAgICAgIGlmIChpdGVtICYmIGl0ZW0ub25BbGlnbkNoYW5nZSkgaXRlbS5vbkFsaWduQ2hhbmdlKHgsIHksIHopO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXRzIHRoZSBtb3VudCBwb2ludCB2YWx1ZSBvZiB0aGUgbm9kZS4gV2lsbCBjYWxsIG9uTW91bnRQb2ludENoYW5nZVxuICogb24gYWxsIG9mIHRoZSBub2RlJ3MgY29tcG9uZW50cy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHggTW91bnRQb2ludCB2YWx1ZSBpbiB4IGRpbWVuc2lvblxuICogQHBhcmFtIHtOdW1iZXJ9IHkgTW91bnRQb2ludCB2YWx1ZSBpbiB5IGRpbWVuc2lvblxuICogQHBhcmFtIHtOdW1iZXJ9IHogTW91bnRQb2ludCB2YWx1ZSBpbiB6IGRpbWVuc2lvblxuICpcbiAqIEByZXR1cm4ge05vZGV9IHRoaXNcbiAqL1xuTm9kZS5wcm90b3R5cGUuc2V0TW91bnRQb2ludCA9IGZ1bmN0aW9uIHNldE1vdW50UG9pbnQgKHgsIHksIHopIHtcbiAgICB2YXIgdmVjMyA9IHRoaXMudmFsdWUub2Zmc2V0cy5tb3VudFBvaW50O1xuICAgIHZhciBwcm9wb2dhdGUgPSBmYWxzZTtcblxuICAgIHByb3BvZ2F0ZSA9IHRoaXMuX3ZlY09wdGlvbmFsU2V0KHZlYzMsIDAsIHgpIHx8IHByb3BvZ2F0ZTtcbiAgICBwcm9wb2dhdGUgPSB0aGlzLl92ZWNPcHRpb25hbFNldCh2ZWMzLCAxLCB5KSB8fCBwcm9wb2dhdGU7XG4gICAgaWYgKHogIT0gbnVsbCkgcHJvcG9nYXRlID0gdGhpcy5fdmVjT3B0aW9uYWxTZXQodmVjMywgMiwgKHogLSAwLjUpKSB8fCBwcm9wb2dhdGU7XG5cbiAgICBpZiAocHJvcG9nYXRlKSB7XG4gICAgICAgIHZhciBpID0gMDtcbiAgICAgICAgdmFyIGxpc3QgPSB0aGlzLl9jb21wb25lbnRzO1xuICAgICAgICB2YXIgbGVuID0gbGlzdC5sZW5ndGg7XG4gICAgICAgIHZhciBpdGVtO1xuICAgICAgICB4ID0gdmVjM1swXTtcbiAgICAgICAgeSA9IHZlYzNbMV07XG4gICAgICAgIHogPSB2ZWMzWzJdO1xuICAgICAgICBmb3IgKDsgaSA8IGxlbiA7IGkrKykge1xuICAgICAgICAgICAgaXRlbSA9IGxpc3RbaV07XG4gICAgICAgICAgICBpZiAoaXRlbSAmJiBpdGVtLm9uTW91bnRQb2ludENoYW5nZSkgaXRlbS5vbk1vdW50UG9pbnRDaGFuZ2UoeCwgeSwgeik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIG9yaWdpbiB2YWx1ZSBvZiB0aGUgbm9kZS4gV2lsbCBjYWxsIG9uT3JpZ2luQ2hhbmdlXG4gKiBvbiBhbGwgb2YgdGhlIG5vZGUncyBjb21wb25lbnRzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0geCBPcmlnaW4gdmFsdWUgaW4geCBkaW1lbnNpb25cbiAqIEBwYXJhbSB7TnVtYmVyfSB5IE9yaWdpbiB2YWx1ZSBpbiB5IGRpbWVuc2lvblxuICogQHBhcmFtIHtOdW1iZXJ9IHogT3JpZ2luIHZhbHVlIGluIHogZGltZW5zaW9uXG4gKlxuICogQHJldHVybiB7Tm9kZX0gdGhpc1xuICovXG5Ob2RlLnByb3RvdHlwZS5zZXRPcmlnaW4gPSBmdW5jdGlvbiBzZXRPcmlnaW4gKHgsIHksIHopIHtcbiAgICB2YXIgdmVjMyA9IHRoaXMudmFsdWUub2Zmc2V0cy5vcmlnaW47XG4gICAgdmFyIHByb3BvZ2F0ZSA9IGZhbHNlO1xuXG4gICAgcHJvcG9nYXRlID0gdGhpcy5fdmVjT3B0aW9uYWxTZXQodmVjMywgMCwgeCkgfHwgcHJvcG9nYXRlO1xuICAgIHByb3BvZ2F0ZSA9IHRoaXMuX3ZlY09wdGlvbmFsU2V0KHZlYzMsIDEsIHkpIHx8IHByb3BvZ2F0ZTtcbiAgICBpZiAoeiAhPSBudWxsKSBwcm9wb2dhdGUgPSB0aGlzLl92ZWNPcHRpb25hbFNldCh2ZWMzLCAyLCAoeiAtIDAuNSkpIHx8IHByb3BvZ2F0ZTtcblxuICAgIGlmIChwcm9wb2dhdGUpIHtcbiAgICAgICAgdmFyIGkgPSAwO1xuICAgICAgICB2YXIgbGlzdCA9IHRoaXMuX2NvbXBvbmVudHM7XG4gICAgICAgIHZhciBsZW4gPSBsaXN0Lmxlbmd0aDtcbiAgICAgICAgdmFyIGl0ZW07XG4gICAgICAgIHggPSB2ZWMzWzBdO1xuICAgICAgICB5ID0gdmVjM1sxXTtcbiAgICAgICAgeiA9IHZlYzNbMl07XG4gICAgICAgIGZvciAoOyBpIDwgbGVuIDsgaSsrKSB7XG4gICAgICAgICAgICBpdGVtID0gbGlzdFtpXTtcbiAgICAgICAgICAgIGlmIChpdGVtICYmIGl0ZW0ub25PcmlnaW5DaGFuZ2UpIGl0ZW0ub25PcmlnaW5DaGFuZ2UoeCwgeSwgeik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIHBvc2l0aW9uIG9mIHRoZSBub2RlLiBXaWxsIGNhbGwgb25Qb3NpdGlvbkNoYW5nZVxuICogb24gYWxsIG9mIHRoZSBub2RlJ3MgY29tcG9uZW50cy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHggUG9zaXRpb24gaW4geFxuICogQHBhcmFtIHtOdW1iZXJ9IHkgUG9zaXRpb24gaW4geVxuICogQHBhcmFtIHtOdW1iZXJ9IHogUG9zaXRpb24gaW4gelxuICpcbiAqIEByZXR1cm4ge05vZGV9IHRoaXNcbiAqL1xuTm9kZS5wcm90b3R5cGUuc2V0UG9zaXRpb24gPSBmdW5jdGlvbiBzZXRQb3NpdGlvbiAoeCwgeSwgeikge1xuICAgIHZhciB2ZWMzID0gdGhpcy52YWx1ZS52ZWN0b3JzLnBvc2l0aW9uO1xuICAgIHZhciBwcm9wb2dhdGUgPSBmYWxzZTtcblxuICAgIHByb3BvZ2F0ZSA9IHRoaXMuX3ZlY09wdGlvbmFsU2V0KHZlYzMsIDAsIHgpIHx8IHByb3BvZ2F0ZTtcbiAgICBwcm9wb2dhdGUgPSB0aGlzLl92ZWNPcHRpb25hbFNldCh2ZWMzLCAxLCB5KSB8fCBwcm9wb2dhdGU7XG4gICAgcHJvcG9nYXRlID0gdGhpcy5fdmVjT3B0aW9uYWxTZXQodmVjMywgMiwgeikgfHwgcHJvcG9nYXRlO1xuXG4gICAgaWYgKHByb3BvZ2F0ZSkge1xuICAgICAgICB2YXIgaSA9IDA7XG4gICAgICAgIHZhciBsaXN0ID0gdGhpcy5fY29tcG9uZW50cztcbiAgICAgICAgdmFyIGxlbiA9IGxpc3QubGVuZ3RoO1xuICAgICAgICB2YXIgaXRlbTtcbiAgICAgICAgeCA9IHZlYzNbMF07XG4gICAgICAgIHkgPSB2ZWMzWzFdO1xuICAgICAgICB6ID0gdmVjM1syXTtcbiAgICAgICAgZm9yICg7IGkgPCBsZW4gOyBpKyspIHtcbiAgICAgICAgICAgIGl0ZW0gPSBsaXN0W2ldO1xuICAgICAgICAgICAgaWYgKGl0ZW0gJiYgaXRlbS5vblBvc2l0aW9uQ2hhbmdlKSBpdGVtLm9uUG9zaXRpb25DaGFuZ2UoeCwgeSwgeik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0cyB0aGUgcm90YXRpb24gb2YgdGhlIG5vZGUuIFdpbGwgY2FsbCBvblJvdGF0aW9uQ2hhbmdlXG4gKiBvbiBhbGwgb2YgdGhlIG5vZGUncyBjb21wb25lbnRzLiBUaGlzIG1ldGhvZCB0YWtlcyBlaXRoZXJcbiAqIEV1bGVyIGFuZ2xlcyBvciBhIHF1YXRlcm5pb24uIElmIHRoZSBmb3VydGggYXJndW1lbnQgaXMgdW5kZWZpbmVkXG4gKiBFdWxlciBhbmdsZXMgYXJlIGFzc3VtZWQuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB4IEVpdGhlciB0aGUgcm90YXRpb24gYXJvdW5kIHRoZSB4IGF4aXMgb3IgdGhlIG1hZ25pdHVkZSBpbiB4IG9mIHRoZSBheGlzIG9mIHJvdGF0aW9uLlxuICogQHBhcmFtIHtOdW1iZXJ9IHkgRWl0aGVyIHRoZSByb3RhdGlvbiBhcm91bmQgdGhlIHkgYXhpcyBvciB0aGUgbWFnbml0dWRlIGluIHkgb2YgdGhlIGF4aXMgb2Ygcm90YXRpb24uXG4gKiBAcGFyYW0ge051bWJlcn0geiBFaXRoZXIgdGhlIHJvdGF0aW9uIGFyb3VuZCB0aGUgeiBheGlzIG9yIHRoZSBtYWduaXR1ZGUgaW4geiBvZiB0aGUgYXhpcyBvZiByb3RhdGlvbi5cbiAqIEBwYXJhbSB7TnVtYmVyfHVuZGVmaW5lZH0gdyB0aGUgYW1vdW50IG9mIHJvdGF0aW9uIGFyb3VuZCB0aGUgYXhpcyBvZiByb3RhdGlvbiwgaWYgYSBxdWF0ZXJuaW9uIGlzIHNwZWNpZmllZC5cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5Ob2RlLnByb3RvdHlwZS5zZXRSb3RhdGlvbiA9IGZ1bmN0aW9uIHNldFJvdGF0aW9uICh4LCB5LCB6LCB3KSB7XG4gICAgdmFyIHF1YXQgPSB0aGlzLnZhbHVlLnZlY3RvcnMucm90YXRpb247XG4gICAgdmFyIHByb3BvZ2F0ZSA9IGZhbHNlO1xuICAgIHZhciBxeCwgcXksIHF6LCBxdztcblxuICAgIGlmICh3ICE9IG51bGwpIHtcbiAgICAgICAgcXggPSB4O1xuICAgICAgICBxeSA9IHk7XG4gICAgICAgIHF6ID0gejtcbiAgICAgICAgcXcgPSB3O1xuICAgICAgICB0aGlzLl9sYXN0RXVsZXJYID0gbnVsbDtcbiAgICAgICAgdGhpcy5fbGFzdEV1bGVyWSA9IG51bGw7XG4gICAgICAgIHRoaXMuX2xhc3RFdWxlclogPSBudWxsO1xuICAgICAgICB0aGlzLl9sYXN0RXVsZXIgPSBmYWxzZTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGlmICh4ID09IG51bGwgfHwgeSA9PSBudWxsIHx8IHogPT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2xhc3RFdWxlcikge1xuICAgICAgICAgICAgICAgIHggPSB4ID09IG51bGwgPyB0aGlzLl9sYXN0RXVsZXJYIDogeDtcbiAgICAgICAgICAgICAgICB5ID0geSA9PSBudWxsID8gdGhpcy5fbGFzdEV1bGVyWSA6IHk7XG4gICAgICAgICAgICAgICAgeiA9IHogPT0gbnVsbCA/IHRoaXMuX2xhc3RFdWxlclogOiB6O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIHNwID0gLTIgKiAocXVhdFsxXSAqIHF1YXRbMl0gLSBxdWF0WzNdICogcXVhdFswXSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoTWF0aC5hYnMoc3ApID4gMC45OTk5OSkge1xuICAgICAgICAgICAgICAgICAgICB5ID0geSA9PSBudWxsID8gTWF0aC5QSSAqIDAuNSAqIHNwIDogeTtcbiAgICAgICAgICAgICAgICAgICAgeCA9IHggPT0gbnVsbCA/IE1hdGguYXRhbjIoLXF1YXRbMF0gKiBxdWF0WzJdICsgcXVhdFszXSAqIHF1YXRbMV0sIDAuNSAtIHF1YXRbMV0gKiBxdWF0WzFdIC0gcXVhdFsyXSAqIHF1YXRbMl0pIDogeDtcbiAgICAgICAgICAgICAgICAgICAgeiA9IHogPT0gbnVsbCA/IDAgOiB6O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgeSA9IHkgPT0gbnVsbCA/IE1hdGguYXNpbihzcCkgOiB5O1xuICAgICAgICAgICAgICAgICAgICB4ID0geCA9PSBudWxsID8gTWF0aC5hdGFuMihxdWF0WzBdICogcXVhdFsyXSArIHF1YXRbM10gKiBxdWF0WzFdLCAwLjUgLSBxdWF0WzBdICogcXVhdFswXSAtIHF1YXRbMV0gKiBxdWF0WzFdKSA6IHg7XG4gICAgICAgICAgICAgICAgICAgIHogPSB6ID09IG51bGwgPyBNYXRoLmF0YW4yKHF1YXRbMF0gKiBxdWF0WzFdICsgcXVhdFszXSAqIHF1YXRbMl0sIDAuNSAtIHF1YXRbMF0gKiBxdWF0WzBdIC0gcXVhdFsyXSAqIHF1YXRbMl0pIDogejtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgaHggPSB4ICogMC41O1xuICAgICAgICB2YXIgaHkgPSB5ICogMC41O1xuICAgICAgICB2YXIgaHogPSB6ICogMC41O1xuXG4gICAgICAgIHZhciBzeCA9IE1hdGguc2luKGh4KTtcbiAgICAgICAgdmFyIHN5ID0gTWF0aC5zaW4oaHkpO1xuICAgICAgICB2YXIgc3ogPSBNYXRoLnNpbihoeik7XG4gICAgICAgIHZhciBjeCA9IE1hdGguY29zKGh4KTtcbiAgICAgICAgdmFyIGN5ID0gTWF0aC5jb3MoaHkpO1xuICAgICAgICB2YXIgY3ogPSBNYXRoLmNvcyhoeik7XG5cbiAgICAgICAgdmFyIHN5c3ogPSBzeSAqIHN6O1xuICAgICAgICB2YXIgY3lzeiA9IGN5ICogc3o7XG4gICAgICAgIHZhciBzeWN6ID0gc3kgKiBjejtcbiAgICAgICAgdmFyIGN5Y3ogPSBjeSAqIGN6O1xuXG4gICAgICAgIHF4ID0gc3ggKiBjeWN6ICsgY3ggKiBzeXN6O1xuICAgICAgICBxeSA9IGN4ICogc3ljeiAtIHN4ICogY3lzejtcbiAgICAgICAgcXogPSBjeCAqIGN5c3ogKyBzeCAqIHN5Y3o7XG4gICAgICAgIHF3ID0gY3ggKiBjeWN6IC0gc3ggKiBzeXN6O1xuXG4gICAgICAgIHRoaXMuX2xhc3RFdWxlciA9IHRydWU7XG4gICAgICAgIHRoaXMuX2xhc3RFdWxlclggPSB4O1xuICAgICAgICB0aGlzLl9sYXN0RXVsZXJZID0geTtcbiAgICAgICAgdGhpcy5fbGFzdEV1bGVyWiA9IHo7XG4gICAgfVxuXG4gICAgcHJvcG9nYXRlID0gdGhpcy5fdmVjT3B0aW9uYWxTZXQocXVhdCwgMCwgcXgpIHx8IHByb3BvZ2F0ZTtcbiAgICBwcm9wb2dhdGUgPSB0aGlzLl92ZWNPcHRpb25hbFNldChxdWF0LCAxLCBxeSkgfHwgcHJvcG9nYXRlO1xuICAgIHByb3BvZ2F0ZSA9IHRoaXMuX3ZlY09wdGlvbmFsU2V0KHF1YXQsIDIsIHF6KSB8fCBwcm9wb2dhdGU7XG4gICAgcHJvcG9nYXRlID0gdGhpcy5fdmVjT3B0aW9uYWxTZXQocXVhdCwgMywgcXcpIHx8IHByb3BvZ2F0ZTtcblxuICAgIGlmIChwcm9wb2dhdGUpIHtcbiAgICAgICAgdmFyIGkgPSAwO1xuICAgICAgICB2YXIgbGlzdCA9IHRoaXMuX2NvbXBvbmVudHM7XG4gICAgICAgIHZhciBsZW4gPSBsaXN0Lmxlbmd0aDtcbiAgICAgICAgdmFyIGl0ZW07XG4gICAgICAgIHggPSBxdWF0WzBdO1xuICAgICAgICB5ID0gcXVhdFsxXTtcbiAgICAgICAgeiA9IHF1YXRbMl07XG4gICAgICAgIHcgPSBxdWF0WzNdO1xuICAgICAgICBmb3IgKDsgaSA8IGxlbiA7IGkrKykge1xuICAgICAgICAgICAgaXRlbSA9IGxpc3RbaV07XG4gICAgICAgICAgICBpZiAoaXRlbSAmJiBpdGVtLm9uUm90YXRpb25DaGFuZ2UpIGl0ZW0ub25Sb3RhdGlvbkNoYW5nZSh4LCB5LCB6LCB3KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0cyB0aGUgc2NhbGUgb2YgdGhlIG5vZGUuIFRoZSBkZWZhdWx0IHZhbHVlIGlzIDEgaW4gYWxsIGRpbWVuc2lvbnMuXG4gKiBUaGUgbm9kZSdzIGNvbXBvbmVudHMgd2lsbCBoYXZlIG9uU2NhbGVDaGFuZ2VkIGNhbGxlZCBvbiB0aGVtLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0geCBTY2FsZSB2YWx1ZSBpbiB4XG4gKiBAcGFyYW0ge051bWJlcn0geSBTY2FsZSB2YWx1ZSBpbiB5XG4gKiBAcGFyYW0ge051bWJlcn0geiBTY2FsZSB2YWx1ZSBpbiB6XG4gKlxuICogQHJldHVybiB7Tm9kZX0gdGhpc1xuICovXG5Ob2RlLnByb3RvdHlwZS5zZXRTY2FsZSA9IGZ1bmN0aW9uIHNldFNjYWxlICh4LCB5LCB6KSB7XG4gICAgdmFyIHZlYzMgPSB0aGlzLnZhbHVlLnZlY3RvcnMuc2NhbGU7XG4gICAgdmFyIHByb3BvZ2F0ZSA9IGZhbHNlO1xuXG4gICAgcHJvcG9nYXRlID0gdGhpcy5fdmVjT3B0aW9uYWxTZXQodmVjMywgMCwgeCkgfHwgcHJvcG9nYXRlO1xuICAgIHByb3BvZ2F0ZSA9IHRoaXMuX3ZlY09wdGlvbmFsU2V0KHZlYzMsIDEsIHkpIHx8IHByb3BvZ2F0ZTtcbiAgICBwcm9wb2dhdGUgPSB0aGlzLl92ZWNPcHRpb25hbFNldCh2ZWMzLCAyLCB6KSB8fCBwcm9wb2dhdGU7XG5cbiAgICBpZiAocHJvcG9nYXRlKSB7XG4gICAgICAgIHZhciBpID0gMDtcbiAgICAgICAgdmFyIGxpc3QgPSB0aGlzLl9jb21wb25lbnRzO1xuICAgICAgICB2YXIgbGVuID0gbGlzdC5sZW5ndGg7XG4gICAgICAgIHZhciBpdGVtO1xuICAgICAgICB4ID0gdmVjM1swXTtcbiAgICAgICAgeSA9IHZlYzNbMV07XG4gICAgICAgIHogPSB2ZWMzWzJdO1xuICAgICAgICBmb3IgKDsgaSA8IGxlbiA7IGkrKykge1xuICAgICAgICAgICAgaXRlbSA9IGxpc3RbaV07XG4gICAgICAgICAgICBpZiAoaXRlbSAmJiBpdGVtLm9uU2NhbGVDaGFuZ2UpIGl0ZW0ub25TY2FsZUNoYW5nZSh4LCB5LCB6KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0cyB0aGUgdmFsdWUgb2YgdGhlIG9wYWNpdHkgb2YgdGhpcyBub2RlLiBBbGwgb2YgdGhlIG5vZGUnc1xuICogY29tcG9uZW50cyB3aWxsIGhhdmUgb25PcGFjaXR5Q2hhbmdlIGNhbGxlZCBvbiB0aGVtL1xuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gdmFsIFZhbHVlIG9mIHRoZSBvcGFjaXR5LiAxIGlzIHRoZSBkZWZhdWx0LlxuICpcbiAqIEByZXR1cm4ge05vZGV9IHRoaXNcbiAqL1xuTm9kZS5wcm90b3R5cGUuc2V0T3BhY2l0eSA9IGZ1bmN0aW9uIHNldE9wYWNpdHkgKHZhbCkge1xuICAgIGlmICh2YWwgIT09IHRoaXMudmFsdWUuc2hvd1N0YXRlLm9wYWNpdHkpIHtcbiAgICAgICAgdGhpcy52YWx1ZS5zaG93U3RhdGUub3BhY2l0eSA9IHZhbDtcbiAgICAgICAgaWYgKCF0aGlzLl9yZXF1ZXN0aW5nVXBkYXRlKSB0aGlzLl9yZXF1ZXN0VXBkYXRlKCk7XG5cbiAgICAgICAgdmFyIGkgPSAwO1xuICAgICAgICB2YXIgbGlzdCA9IHRoaXMuX2NvbXBvbmVudHM7XG4gICAgICAgIHZhciBsZW4gPSBsaXN0Lmxlbmd0aDtcbiAgICAgICAgdmFyIGl0ZW07XG4gICAgICAgIGZvciAoOyBpIDwgbGVuIDsgaSsrKSB7XG4gICAgICAgICAgICBpdGVtID0gbGlzdFtpXTtcbiAgICAgICAgICAgIGlmIChpdGVtICYmIGl0ZW0ub25PcGFjaXR5Q2hhbmdlKSBpdGVtLm9uT3BhY2l0eUNoYW5nZSh2YWwpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXRzIHRoZSBzaXplIG1vZGUgYmVpbmcgdXNlZCBmb3IgZGV0ZXJtaW5pbmcgdGhlIG5vZGVzIGZpbmFsIHdpZHRoLCBoZWlnaHRcbiAqIGFuZCBkZXB0aC5cbiAqIFNpemUgbW9kZXMgYXJlIGEgd2F5IHRvIGRlZmluZSB0aGUgd2F5IHRoZSBub2RlJ3Mgc2l6ZSBpcyBiZWluZyBjYWxjdWxhdGVkLlxuICogU2l6ZSBtb2RlcyBhcmUgZW51bXMgc2V0IG9uIHRoZSBAe0BsaW5rIFNpemV9IGNvbnN0cnVjdG9yIChhbmQgYWxpYXNlZCBvblxuICogdGhlIE5vZGUpLlxuICpcbiAqIEBleGFtcGxlXG4gKiBub2RlLnNldFNpemVNb2RlKE5vZGUuUkVMQVRJVkVfU0laRSwgTm9kZS5BQlNPTFVURV9TSVpFLCBOb2RlLkFCU09MVVRFX1NJWkUpO1xuICogLy8gSW5zdGVhZCBvZiBudWxsLCBhbnkgcHJvcG9yaW9uYWwgaGVpZ2h0IG9yIGRlcHRoIGNhbiBiZSBwYXNzZWQgaW4sIHNpbmNlXG4gKiAvLyBpdCB3b3VsZCBiZSBpZ25vcmVkIGluIGFueSBjYXNlLlxuICogbm9kZS5zZXRQcm9wb3J0aW9uYWxTaXplKDAuNSwgbnVsbCwgbnVsbCk7XG4gKiBub2RlLnNldEFic29sdXRlU2l6ZShudWxsLCAxMDAsIDIwMCk7XG4gKlxuICogQG1ldGhvZCBzZXRTaXplTW9kZVxuICpcbiAqIEBwYXJhbSB7U2l6ZU1vZGV9IHggICAgVGhlIHNpemUgbW9kZSBiZWluZyB1c2VkIGZvciBkZXRlcm1pbmluZyB0aGUgc2l6ZSBpblxuICogICAgICAgICAgICAgICAgICAgICAgICB4IGRpcmVjdGlvbiAoXCJ3aWR0aFwiKS5cbiAqIEBwYXJhbSB7U2l6ZU1vZGV9IHkgICAgVGhlIHNpemUgbW9kZSBiZWluZyB1c2VkIGZvciBkZXRlcm1pbmluZyB0aGUgc2l6ZSBpblxuICogICAgICAgICAgICAgICAgICAgICAgICB5IGRpcmVjdGlvbiAoXCJoZWlnaHRcIikuXG4gKiBAcGFyYW0ge1NpemVNb2RlfSB6ICAgIFRoZSBzaXplIG1vZGUgYmVpbmcgdXNlZCBmb3IgZGV0ZXJtaW5pbmcgdGhlIHNpemUgaW5cbiAqICAgICAgICAgICAgICAgICAgICAgICAgeiBkaXJlY3Rpb24gKFwiZGVwdGhcIikuXG4gKlxuICogQHJldHVybiB7Tm9kZX0gdGhpc1xuICovXG5Ob2RlLnByb3RvdHlwZS5zZXRTaXplTW9kZSA9IGZ1bmN0aW9uIHNldFNpemVNb2RlICh4LCB5LCB6KSB7XG4gICAgdmFyIHZlYzMgPSB0aGlzLnZhbHVlLnNpemUuc2l6ZU1vZGU7XG4gICAgdmFyIHByb3BvZ2F0ZSA9IGZhbHNlO1xuXG4gICAgaWYgKHggIT0gbnVsbCkgcHJvcG9nYXRlID0gdGhpcy5fcmVzb2x2ZVNpemVNb2RlKHZlYzMsIDAsIHgpIHx8IHByb3BvZ2F0ZTtcbiAgICBpZiAoeSAhPSBudWxsKSBwcm9wb2dhdGUgPSB0aGlzLl9yZXNvbHZlU2l6ZU1vZGUodmVjMywgMSwgeSkgfHwgcHJvcG9nYXRlO1xuICAgIGlmICh6ICE9IG51bGwpIHByb3BvZ2F0ZSA9IHRoaXMuX3Jlc29sdmVTaXplTW9kZSh2ZWMzLCAyLCB6KSB8fCBwcm9wb2dhdGU7XG5cbiAgICBpZiAocHJvcG9nYXRlKSB7XG4gICAgICAgIHZhciBpID0gMDtcbiAgICAgICAgdmFyIGxpc3QgPSB0aGlzLl9jb21wb25lbnRzO1xuICAgICAgICB2YXIgbGVuID0gbGlzdC5sZW5ndGg7XG4gICAgICAgIHZhciBpdGVtO1xuICAgICAgICB4ID0gdmVjM1swXTtcbiAgICAgICAgeSA9IHZlYzNbMV07XG4gICAgICAgIHogPSB2ZWMzWzJdO1xuICAgICAgICBmb3IgKDsgaSA8IGxlbiA7IGkrKykge1xuICAgICAgICAgICAgaXRlbSA9IGxpc3RbaV07XG4gICAgICAgICAgICBpZiAoaXRlbSAmJiBpdGVtLm9uU2l6ZU1vZGVDaGFuZ2UpIGl0ZW0ub25TaXplTW9kZUNoYW5nZSh4LCB5LCB6KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQSBwcm90ZWN0ZWQgbWV0aG9kIHRoYXQgcmVzb2x2ZXMgc3RyaW5nIHJlcHJlc2VudGF0aW9ucyBvZiBzaXplIG1vZGVcbiAqIHRvIG51bWVyaWMgdmFsdWVzIGFuZCBhcHBsaWVzIHRoZW0uXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHZlYyB0aGUgYXJyYXkgdG8gd3JpdGUgc2l6ZSBtb2RlIHRvXG4gKiBAcGFyYW0ge051bWJlcn0gaW5kZXggdGhlIGluZGV4IHRvIHdyaXRlIHRvIGluIHRoZSBhcnJheVxuICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfSB2YWwgdGhlIHZhbHVlIHRvIHdyaXRlXG4gKlxuICogQHJldHVybiB7Qm9vbH0gd2hldGhlciBvciBub3QgdGhlIHNpemVtb2RlIGhhcyBiZWVuIGNoYW5nZWQgZm9yIHRoaXMgaW5kZXguXG4gKi9cbk5vZGUucHJvdG90eXBlLl9yZXNvbHZlU2l6ZU1vZGUgPSBmdW5jdGlvbiBfcmVzb2x2ZVNpemVNb2RlICh2ZWMsIGluZGV4LCB2YWwpIHtcbiAgICBpZiAodmFsLmNvbnN0cnVjdG9yID09PSBTdHJpbmcpIHtcbiAgICAgICAgc3dpdGNoICh2YWwudG9Mb3dlckNhc2UoKSkge1xuICAgICAgICAgICAgY2FzZSAncmVsYXRpdmUnOlxuICAgICAgICAgICAgY2FzZSAnZGVmYXVsdCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3ZlY09wdGlvbmFsU2V0KHZlYywgaW5kZXgsIDApO1xuICAgICAgICAgICAgY2FzZSAnYWJzb2x1dGUnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl92ZWNPcHRpb25hbFNldCh2ZWMsIGluZGV4LCAxKTtcbiAgICAgICAgICAgIGNhc2UgJ3JlbmRlcic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3ZlY09wdGlvbmFsU2V0KHZlYywgaW5kZXgsIDIpO1xuICAgICAgICAgICAgZGVmYXVsdDogdGhyb3cgbmV3IEVycm9yKCd1bmtub3duIHNpemUgbW9kZTogJyArIHZhbCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSByZXR1cm4gdGhpcy5fdmVjT3B0aW9uYWxTZXQodmVjLCBpbmRleCwgdmFsKTtcbn07XG5cbi8qKlxuICogQSBwcm9wb3J0aW9uYWwgc2l6ZSBkZWZpbmVzIHRoZSBub2RlJ3MgZGltZW5zaW9ucyByZWxhdGl2ZSB0byBpdHMgcGFyZW50c1xuICogZmluYWwgc2l6ZS5cbiAqIFByb3BvcnRpb25hbCBzaXplcyBuZWVkIHRvIGJlIHdpdGhpbiB0aGUgcmFuZ2Ugb2YgWzAsIDFdLlxuICpcbiAqIEBtZXRob2Qgc2V0UHJvcG9ydGlvbmFsU2l6ZVxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB4ICAgIHgtU2l6ZSBpbiBwaXhlbHMgKFwid2lkdGhcIikuXG4gKiBAcGFyYW0ge051bWJlcn0geSAgICB5LVNpemUgaW4gcGl4ZWxzIChcImhlaWdodFwiKS5cbiAqIEBwYXJhbSB7TnVtYmVyfSB6ICAgIHotU2l6ZSBpbiBwaXhlbHMgKFwiZGVwdGhcIikuXG4gKlxuICogQHJldHVybiB7Tm9kZX0gdGhpc1xuICovXG5Ob2RlLnByb3RvdHlwZS5zZXRQcm9wb3J0aW9uYWxTaXplID0gZnVuY3Rpb24gc2V0UHJvcG9ydGlvbmFsU2l6ZSAoeCwgeSwgeikge1xuICAgIHZhciB2ZWMzID0gdGhpcy52YWx1ZS5zaXplLnByb3BvcnRpb25hbDtcbiAgICB2YXIgcHJvcG9nYXRlID0gZmFsc2U7XG5cbiAgICBwcm9wb2dhdGUgPSB0aGlzLl92ZWNPcHRpb25hbFNldCh2ZWMzLCAwLCB4KSB8fCBwcm9wb2dhdGU7XG4gICAgcHJvcG9nYXRlID0gdGhpcy5fdmVjT3B0aW9uYWxTZXQodmVjMywgMSwgeSkgfHwgcHJvcG9nYXRlO1xuICAgIHByb3BvZ2F0ZSA9IHRoaXMuX3ZlY09wdGlvbmFsU2V0KHZlYzMsIDIsIHopIHx8IHByb3BvZ2F0ZTtcblxuICAgIGlmIChwcm9wb2dhdGUpIHtcbiAgICAgICAgdmFyIGkgPSAwO1xuICAgICAgICB2YXIgbGlzdCA9IHRoaXMuX2NvbXBvbmVudHM7XG4gICAgICAgIHZhciBsZW4gPSBsaXN0Lmxlbmd0aDtcbiAgICAgICAgdmFyIGl0ZW07XG4gICAgICAgIHggPSB2ZWMzWzBdO1xuICAgICAgICB5ID0gdmVjM1sxXTtcbiAgICAgICAgeiA9IHZlYzNbMl07XG4gICAgICAgIGZvciAoOyBpIDwgbGVuIDsgaSsrKSB7XG4gICAgICAgICAgICBpdGVtID0gbGlzdFtpXTtcbiAgICAgICAgICAgIGlmIChpdGVtICYmIGl0ZW0ub25Qcm9wb3J0aW9uYWxTaXplQ2hhbmdlKSBpdGVtLm9uUHJvcG9ydGlvbmFsU2l6ZUNoYW5nZSh4LCB5LCB6KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogRGlmZmVyZW50aWFsIHNpemluZyBjYW4gYmUgdXNlZCB0byBhZGQgb3Igc3VidHJhY3QgYW4gYWJzb2x1dGUgc2l6ZSBmcm9tIGFcbiAqIG90aGVyd2lzZSBwcm9wb3J0aW9uYWxseSBzaXplZCBub2RlLlxuICogRS5nLiBhIGRpZmZlcmVudGlhbCB3aWR0aCBvZiBgLTEwYCBhbmQgYSBwcm9wb3J0aW9uYWwgd2lkdGggb2YgYDAuNWAgaXNcbiAqIGJlaW5nIGludGVycHJldGVkIGFzIHNldHRpbmcgdGhlIG5vZGUncyBzaXplIHRvIDUwJSBvZiBpdHMgcGFyZW50J3Mgd2lkdGhcbiAqICptaW51cyogMTAgcGl4ZWxzLlxuICpcbiAqIEBtZXRob2Qgc2V0RGlmZmVyZW50aWFsU2l6ZVxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB4ICAgIHgtU2l6ZSB0byBiZSBhZGRlZCB0byB0aGUgcmVsYXRpdmVseSBzaXplZCBub2RlIGluXG4gKiAgICAgICAgICAgICAgICAgICAgICBwaXhlbHMgKFwid2lkdGhcIikuXG4gKiBAcGFyYW0ge051bWJlcn0geSAgICB5LVNpemUgdG8gYmUgYWRkZWQgdG8gdGhlIHJlbGF0aXZlbHkgc2l6ZWQgbm9kZSBpblxuICogICAgICAgICAgICAgICAgICAgICAgcGl4ZWxzIChcImhlaWdodFwiKS5cbiAqIEBwYXJhbSB7TnVtYmVyfSB6ICAgIHotU2l6ZSB0byBiZSBhZGRlZCB0byB0aGUgcmVsYXRpdmVseSBzaXplZCBub2RlIGluXG4gKiAgICAgICAgICAgICAgICAgICAgICBwaXhlbHMgKFwiZGVwdGhcIikuXG4gKlxuICogQHJldHVybiB7Tm9kZX0gdGhpc1xuICovXG5Ob2RlLnByb3RvdHlwZS5zZXREaWZmZXJlbnRpYWxTaXplID0gZnVuY3Rpb24gc2V0RGlmZmVyZW50aWFsU2l6ZSAoeCwgeSwgeikge1xuICAgIHZhciB2ZWMzID0gdGhpcy52YWx1ZS5zaXplLmRpZmZlcmVudGlhbDtcbiAgICB2YXIgcHJvcG9nYXRlID0gZmFsc2U7XG5cbiAgICBwcm9wb2dhdGUgPSB0aGlzLl92ZWNPcHRpb25hbFNldCh2ZWMzLCAwLCB4KSB8fCBwcm9wb2dhdGU7XG4gICAgcHJvcG9nYXRlID0gdGhpcy5fdmVjT3B0aW9uYWxTZXQodmVjMywgMSwgeSkgfHwgcHJvcG9nYXRlO1xuICAgIHByb3BvZ2F0ZSA9IHRoaXMuX3ZlY09wdGlvbmFsU2V0KHZlYzMsIDIsIHopIHx8IHByb3BvZ2F0ZTtcblxuICAgIGlmIChwcm9wb2dhdGUpIHtcbiAgICAgICAgdmFyIGkgPSAwO1xuICAgICAgICB2YXIgbGlzdCA9IHRoaXMuX2NvbXBvbmVudHM7XG4gICAgICAgIHZhciBsZW4gPSBsaXN0Lmxlbmd0aDtcbiAgICAgICAgdmFyIGl0ZW07XG4gICAgICAgIHggPSB2ZWMzWzBdO1xuICAgICAgICB5ID0gdmVjM1sxXTtcbiAgICAgICAgeiA9IHZlYzNbMl07XG4gICAgICAgIGZvciAoOyBpIDwgbGVuIDsgaSsrKSB7XG4gICAgICAgICAgICBpdGVtID0gbGlzdFtpXTtcbiAgICAgICAgICAgIGlmIChpdGVtICYmIGl0ZW0ub25EaWZmZXJlbnRpYWxTaXplQ2hhbmdlKSBpdGVtLm9uRGlmZmVyZW50aWFsU2l6ZUNoYW5nZSh4LCB5LCB6KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0cyB0aGUgbm9kZXMgc2l6ZSBpbiBwaXhlbHMsIGluZGVwZW5kZW50IG9mIGl0cyBwYXJlbnQuXG4gKlxuICogQG1ldGhvZCBzZXRBYnNvbHV0ZVNpemVcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0geCAgICB4LVNpemUgaW4gcGl4ZWxzIChcIndpZHRoXCIpLlxuICogQHBhcmFtIHtOdW1iZXJ9IHkgICAgeS1TaXplIGluIHBpeGVscyAoXCJoZWlnaHRcIikuXG4gKiBAcGFyYW0ge051bWJlcn0geiAgICB6LVNpemUgaW4gcGl4ZWxzIChcImRlcHRoXCIpLlxuICpcbiAqIEByZXR1cm4ge05vZGV9IHRoaXNcbiAqL1xuTm9kZS5wcm90b3R5cGUuc2V0QWJzb2x1dGVTaXplID0gZnVuY3Rpb24gc2V0QWJzb2x1dGVTaXplICh4LCB5LCB6KSB7XG4gICAgdmFyIHZlYzMgPSB0aGlzLnZhbHVlLnNpemUuYWJzb2x1dGU7XG4gICAgdmFyIHByb3BvZ2F0ZSA9IGZhbHNlO1xuXG4gICAgcHJvcG9nYXRlID0gdGhpcy5fdmVjT3B0aW9uYWxTZXQodmVjMywgMCwgeCkgfHwgcHJvcG9nYXRlO1xuICAgIHByb3BvZ2F0ZSA9IHRoaXMuX3ZlY09wdGlvbmFsU2V0KHZlYzMsIDEsIHkpIHx8IHByb3BvZ2F0ZTtcbiAgICBwcm9wb2dhdGUgPSB0aGlzLl92ZWNPcHRpb25hbFNldCh2ZWMzLCAyLCB6KSB8fCBwcm9wb2dhdGU7XG5cbiAgICBpZiAocHJvcG9nYXRlKSB7XG4gICAgICAgIHZhciBpID0gMDtcbiAgICAgICAgdmFyIGxpc3QgPSB0aGlzLl9jb21wb25lbnRzO1xuICAgICAgICB2YXIgbGVuID0gbGlzdC5sZW5ndGg7XG4gICAgICAgIHZhciBpdGVtO1xuICAgICAgICB4ID0gdmVjM1swXTtcbiAgICAgICAgeSA9IHZlYzNbMV07XG4gICAgICAgIHogPSB2ZWMzWzJdO1xuICAgICAgICBmb3IgKDsgaSA8IGxlbiA7IGkrKykge1xuICAgICAgICAgICAgaXRlbSA9IGxpc3RbaV07XG4gICAgICAgICAgICBpZiAoaXRlbSAmJiBpdGVtLm9uQWJzb2x1dGVTaXplQ2hhbmdlKSBpdGVtLm9uQWJzb2x1dGVTaXplQ2hhbmdlKHgsIHksIHopO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBQcml2YXRlIG1ldGhvZCBmb3IgYWxlcnRpbmcgYWxsIGNvbXBvbmVudHMgYW5kIGNoaWxkcmVuIHRoYXRcbiAqIHRoaXMgbm9kZSdzIHRyYW5zZm9ybSBoYXMgY2hhbmdlZC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtGbG9hdDMyQXJyYXl9IHRyYW5zZm9ybSBUaGUgdHJhbnNmb3JtIHRoYXQgaGFzIGNoYW5nZWRcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5Ob2RlLnByb3RvdHlwZS5fdHJhbnNmb3JtQ2hhbmdlZCA9IGZ1bmN0aW9uIF90cmFuc2Zvcm1DaGFuZ2VkICh0cmFuc2Zvcm0pIHtcbiAgICB2YXIgaSA9IDA7XG4gICAgdmFyIGl0ZW1zID0gdGhpcy5fY29tcG9uZW50cztcbiAgICB2YXIgbGVuID0gaXRlbXMubGVuZ3RoO1xuICAgIHZhciBpdGVtO1xuXG4gICAgZm9yICg7IGkgPCBsZW4gOyBpKyspIHtcbiAgICAgICAgaXRlbSA9IGl0ZW1zW2ldO1xuICAgICAgICBpZiAoaXRlbSAmJiBpdGVtLm9uVHJhbnNmb3JtQ2hhbmdlKSBpdGVtLm9uVHJhbnNmb3JtQ2hhbmdlKHRyYW5zZm9ybSk7XG4gICAgfVxuXG4gICAgaSA9IDA7XG4gICAgaXRlbXMgPSB0aGlzLl9jaGlsZHJlbjtcbiAgICBsZW4gPSBpdGVtcy5sZW5ndGg7XG5cbiAgICBmb3IgKDsgaSA8IGxlbiA7IGkrKykge1xuICAgICAgICBpdGVtID0gaXRlbXNbaV07XG4gICAgICAgIGlmIChpdGVtICYmIGl0ZW0ub25QYXJlbnRUcmFuc2Zvcm1DaGFuZ2UpIGl0ZW0ub25QYXJlbnRUcmFuc2Zvcm1DaGFuZ2UodHJhbnNmb3JtKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFByaXZhdGUgbWV0aG9kIGZvciBhbGVydGluZyBhbGwgY29tcG9uZW50cyBhbmQgY2hpbGRyZW4gdGhhdFxuICogdGhpcyBub2RlJ3Mgc2l6ZSBoYXMgY2hhbmdlZC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtGbG9hdDMyQXJyYXl9IHNpemUgdGhlIHNpemUgdGhhdCBoYXMgY2hhbmdlZFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbk5vZGUucHJvdG90eXBlLl9zaXplQ2hhbmdlZCA9IGZ1bmN0aW9uIF9zaXplQ2hhbmdlZCAoc2l6ZSkge1xuICAgIHZhciBpID0gMDtcbiAgICB2YXIgaXRlbXMgPSB0aGlzLl9jb21wb25lbnRzO1xuICAgIHZhciBsZW4gPSBpdGVtcy5sZW5ndGg7XG4gICAgdmFyIGl0ZW07XG5cbiAgICBmb3IgKDsgaSA8IGxlbiA7IGkrKykge1xuICAgICAgICBpdGVtID0gaXRlbXNbaV07XG4gICAgICAgIGlmIChpdGVtICYmIGl0ZW0ub25TaXplQ2hhbmdlKSBpdGVtLm9uU2l6ZUNoYW5nZShzaXplKTtcbiAgICB9XG5cbiAgICBpID0gMDtcbiAgICBpdGVtcyA9IHRoaXMuX2NoaWxkcmVuO1xuICAgIGxlbiA9IGl0ZW1zLmxlbmd0aDtcblxuICAgIGZvciAoOyBpIDwgbGVuIDsgaSsrKSB7XG4gICAgICAgIGl0ZW0gPSBpdGVtc1tpXTtcbiAgICAgICAgaWYgKGl0ZW0gJiYgaXRlbS5vblBhcmVudFNpemVDaGFuZ2UpIGl0ZW0ub25QYXJlbnRTaXplQ2hhbmdlKHNpemUpO1xuICAgIH1cbn07XG5cbi8qKlxuICogTWV0aG9kIGZvciBnZXR0aW5nIHRoZSBjdXJyZW50IGZyYW1lLiBXaWxsIGJlIGRlcHJpY2F0ZWQuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge051bWJlcn0gY3VycmVudCBmcmFtZVxuICovXG5Ob2RlLnByb3RvdHlwZS5nZXRGcmFtZSA9IGZ1bmN0aW9uIGdldEZyYW1lICgpIHtcbiAgICByZXR1cm4gdGhpcy5fZ2xvYmFsVXBkYXRlci5nZXRGcmFtZSgpO1xufTtcblxuLyoqXG4gKiByZXR1cm5zIGFuIGFycmF5IG9mIHRoZSBjb21wb25lbnRzIGN1cnJlbnRseSBhdHRhY2hlZCB0byB0aGlzXG4gKiBub2RlLlxuICpcbiAqIEBtZXRob2QgZ2V0Q29tcG9uZW50c1xuICpcbiAqIEByZXR1cm4ge0FycmF5fSBsaXN0IG9mIGNvbXBvbmVudHMuXG4gKi9cbk5vZGUucHJvdG90eXBlLmdldENvbXBvbmVudHMgPSBmdW5jdGlvbiBnZXRDb21wb25lbnRzICgpIHtcbiAgICByZXR1cm4gdGhpcy5fY29tcG9uZW50cztcbn07XG5cbi8qKlxuICogRW50ZXJzIHRoZSBub2RlJ3MgdXBkYXRlIHBoYXNlIHdoaWxlIHVwZGF0aW5nIGl0cyBvd24gc3BlYyBhbmQgdXBkYXRpbmcgaXRzIGNvbXBvbmVudHMuXG4gKlxuICogQG1ldGhvZCB1cGRhdGVcbiAqXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHRpbWUgICAgaGlnaC1yZXNvbHV0aW9uIHRpbXN0YW1wLCB1c3VhbGx5IHJldHJpZXZlZCB1c2luZ1xuICogICAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZVxuICpcbiAqIEByZXR1cm4ge05vZGV9IHRoaXNcbiAqL1xuTm9kZS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gdXBkYXRlICh0aW1lKXtcbiAgICB0aGlzLl9pblVwZGF0ZSA9IHRydWU7XG4gICAgdmFyIG5leHRRdWV1ZSA9IHRoaXMuX25leHRVcGRhdGVRdWV1ZTtcbiAgICB2YXIgcXVldWUgPSB0aGlzLl91cGRhdGVRdWV1ZTtcbiAgICB2YXIgaXRlbTtcblxuICAgIHdoaWxlIChuZXh0UXVldWUubGVuZ3RoKSBxdWV1ZS51bnNoaWZ0KG5leHRRdWV1ZS5wb3AoKSk7XG5cbiAgICB3aGlsZSAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGl0ZW0gPSB0aGlzLl9jb21wb25lbnRzW3F1ZXVlLnNoaWZ0KCldO1xuICAgICAgICBpZiAoaXRlbSAmJiBpdGVtLm9uVXBkYXRlKSBpdGVtLm9uVXBkYXRlKHRpbWUpO1xuICAgIH1cblxuICAgIHZhciBteVNpemUgPSB0aGlzLmdldFNpemUoKTtcbiAgICB2YXIgbXlUcmFuc2Zvcm0gPSB0aGlzLmdldFRyYW5zZm9ybSgpO1xuICAgIHZhciBwYXJlbnQgPSB0aGlzLmdldFBhcmVudCgpO1xuICAgIHZhciBwYXJlbnRTaXplID0gcGFyZW50LmdldFNpemUoKTtcbiAgICB2YXIgcGFyZW50VHJhbnNmb3JtID0gcGFyZW50LmdldFRyYW5zZm9ybSgpO1xuICAgIHZhciBzaXplQ2hhbmdlZCA9IFNJWkVfUFJPQ0VTU09SLmZyb21TcGVjV2l0aFBhcmVudChwYXJlbnRTaXplLCB0aGlzLCBteVNpemUpO1xuXG4gICAgdmFyIHRyYW5zZm9ybUNoYW5nZWQgPSBUUkFOU0ZPUk1fUFJPQ0VTU09SLmZyb21TcGVjV2l0aFBhcmVudChwYXJlbnRUcmFuc2Zvcm0sIHRoaXMudmFsdWUsIG15U2l6ZSwgcGFyZW50U2l6ZSwgbXlUcmFuc2Zvcm0pO1xuICAgIGlmICh0cmFuc2Zvcm1DaGFuZ2VkKSB0aGlzLl90cmFuc2Zvcm1DaGFuZ2VkKG15VHJhbnNmb3JtKTtcbiAgICBpZiAoc2l6ZUNoYW5nZWQpIHRoaXMuX3NpemVDaGFuZ2VkKG15U2l6ZSk7XG5cbiAgICB0aGlzLl9pblVwZGF0ZSA9IGZhbHNlO1xuICAgIHRoaXMuX3JlcXVlc3RpbmdVcGRhdGUgPSBmYWxzZTtcblxuICAgIGlmICghdGhpcy5pc01vdW50ZWQoKSkge1xuICAgICAgICAvLyBsYXN0IHVwZGF0ZVxuICAgICAgICB0aGlzLl9wYXJlbnQgPSBudWxsO1xuICAgICAgICB0aGlzLnZhbHVlLmxvY2F0aW9uID0gbnVsbDtcbiAgICAgICAgdGhpcy5fZ2xvYmFsVXBkYXRlciA9IG51bGw7XG4gICAgfVxuICAgIGVsc2UgaWYgKHRoaXMuX25leHRVcGRhdGVRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5fZ2xvYmFsVXBkYXRlci5yZXF1ZXN0VXBkYXRlT25OZXh0VGljayh0aGlzKTtcbiAgICAgICAgdGhpcy5fcmVxdWVzdGluZ1VwZGF0ZSA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBNb3VudHMgdGhlIG5vZGUgYW5kIHRoZXJlZm9yZSBpdHMgc3VidHJlZSBieSBzZXR0aW5nIGl0IGFzIGEgY2hpbGQgb2YgdGhlXG4gKiBwYXNzZWQgaW4gcGFyZW50LlxuICpcbiAqIEBtZXRob2QgbW91bnRcbiAqXG4gKiBAcGFyYW0gIHtOb2RlfSBwYXJlbnQgICAgcGFyZW50IG5vZGVcbiAqIEBwYXJhbSAge1N0cmluZ30gbXlJZCAgICBwYXRoIHRvIG5vZGUgKGUuZy4gYGJvZHkvMC8xYClcbiAqXG4gKiBAcmV0dXJuIHtOb2RlfSB0aGlzXG4gKi9cbk5vZGUucHJvdG90eXBlLm1vdW50ID0gZnVuY3Rpb24gbW91bnQgKHBhcmVudCwgbXlJZCkge1xuICAgIGlmICh0aGlzLmlzTW91bnRlZCgpKSByZXR1cm4gdGhpcztcbiAgICB2YXIgaSA9IDA7XG4gICAgdmFyIGxpc3QgPSB0aGlzLl9jb21wb25lbnRzO1xuICAgIHZhciBsZW4gPSBsaXN0Lmxlbmd0aDtcbiAgICB2YXIgaXRlbTtcblxuICAgIHRoaXMuX3BhcmVudCA9IHBhcmVudDtcbiAgICB0aGlzLl9nbG9iYWxVcGRhdGVyID0gcGFyZW50LmdldFVwZGF0ZXIoKTtcbiAgICB0aGlzLnZhbHVlLmxvY2F0aW9uID0gbXlJZDtcbiAgICB0aGlzLnZhbHVlLnNob3dTdGF0ZS5tb3VudGVkID0gdHJ1ZTtcblxuICAgIGZvciAoOyBpIDwgbGVuIDsgaSsrKSB7XG4gICAgICAgIGl0ZW0gPSBsaXN0W2ldO1xuICAgICAgICBpZiAoaXRlbSAmJiBpdGVtLm9uTW91bnQpIGl0ZW0ub25Nb3VudCh0aGlzLCBpKTtcbiAgICB9XG5cbiAgICBpID0gMDtcbiAgICBsaXN0ID0gdGhpcy5fY2hpbGRyZW47XG4gICAgbGVuID0gbGlzdC5sZW5ndGg7XG4gICAgZm9yICg7IGkgPCBsZW4gOyBpKyspIHtcbiAgICAgICAgaXRlbSA9IGxpc3RbaV07XG4gICAgICAgIGlmIChpdGVtICYmIGl0ZW0ub25QYXJlbnRNb3VudCkgaXRlbS5vblBhcmVudE1vdW50KHRoaXMsIG15SWQsIGkpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5fcmVxdWVzdGluZ1VwZGF0ZSkgdGhpcy5fcmVxdWVzdFVwZGF0ZSh0cnVlKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogRGlzbW91bnRzIChkZXRhY2hlcykgdGhlIG5vZGUgZnJvbSB0aGUgc2NlbmUgZ3JhcGggYnkgcmVtb3ZpbmcgaXQgYXMgYVxuICogY2hpbGQgb2YgaXRzIHBhcmVudC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7Tm9kZX0gdGhpc1xuICovXG5Ob2RlLnByb3RvdHlwZS5kaXNtb3VudCA9IGZ1bmN0aW9uIGRpc21vdW50ICgpIHtcbiAgICBpZiAoIXRoaXMuaXNNb3VudGVkKCkpIHJldHVybiB0aGlzO1xuICAgIHZhciBpID0gMDtcbiAgICB2YXIgbGlzdCA9IHRoaXMuX2NvbXBvbmVudHM7XG4gICAgdmFyIGxlbiA9IGxpc3QubGVuZ3RoO1xuICAgIHZhciBpdGVtO1xuXG4gICAgdGhpcy52YWx1ZS5zaG93U3RhdGUubW91bnRlZCA9IGZhbHNlO1xuXG4gICAgdGhpcy5fcGFyZW50LnJlbW92ZUNoaWxkKHRoaXMpO1xuXG4gICAgZm9yICg7IGkgPCBsZW4gOyBpKyspIHtcbiAgICAgICAgaXRlbSA9IGxpc3RbaV07XG4gICAgICAgIGlmIChpdGVtICYmIGl0ZW0ub25EaXNtb3VudCkgaXRlbS5vbkRpc21vdW50KCk7XG4gICAgfVxuXG4gICAgaSA9IDA7XG4gICAgbGlzdCA9IHRoaXMuX2NoaWxkcmVuO1xuICAgIGxlbiA9IGxpc3QubGVuZ3RoO1xuICAgIGZvciAoOyBpIDwgbGVuIDsgaSsrKSB7XG4gICAgICAgIGl0ZW0gPSBsaXN0W2ldO1xuICAgICAgICBpZiAoaXRlbSAmJiBpdGVtLm9uUGFyZW50RGlzbW91bnQpIGl0ZW0ub25QYXJlbnREaXNtb3VudCgpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5fcmVxdWVzdGluZ1VwZGF0ZSkgdGhpcy5fcmVxdWVzdFVwZGF0ZSgpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBGdW5jdGlvbiB0byBiZSBpbnZva2VkIGJ5IHRoZSBwYXJlbnQgYXMgc29vbiBhcyB0aGUgcGFyZW50IGlzXG4gKiBiZWluZyBtb3VudGVkLlxuICpcbiAqIEBtZXRob2Qgb25QYXJlbnRNb3VudFxuICpcbiAqIEBwYXJhbSAge05vZGV9IHBhcmVudCAgICAgICAgVGhlIHBhcmVudCBub2RlLlxuICogQHBhcmFtICB7U3RyaW5nfSBwYXJlbnRJZCAgICBUaGUgcGFyZW50IGlkIChwYXRoIHRvIHBhcmVudCkuXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IGluZGV4ICAgICAgIElkIHRoZSBub2RlIHNob3VsZCBiZSBtb3VudGVkIHRvLlxuICpcbiAqIEByZXR1cm4ge05vZGV9IHRoaXNcbiAqL1xuTm9kZS5wcm90b3R5cGUub25QYXJlbnRNb3VudCA9IGZ1bmN0aW9uIG9uUGFyZW50TW91bnQgKHBhcmVudCwgcGFyZW50SWQsIGluZGV4KSB7XG4gICAgcmV0dXJuIHRoaXMubW91bnQocGFyZW50LCBwYXJlbnRJZCArICcvJyArIGluZGV4KTtcbn07XG5cbi8qKlxuICogRnVuY3Rpb24gdG8gYmUgaW52b2tlZCBieSB0aGUgcGFyZW50IGFzIHNvb24gYXMgdGhlIHBhcmVudCBpcyBiZWluZ1xuICogdW5tb3VudGVkLlxuICpcbiAqIEBtZXRob2Qgb25QYXJlbnREaXNtb3VudFxuICpcbiAqIEByZXR1cm4ge05vZGV9IHRoaXNcbiAqL1xuTm9kZS5wcm90b3R5cGUub25QYXJlbnREaXNtb3VudCA9IGZ1bmN0aW9uIG9uUGFyZW50RGlzbW91bnQgKCkge1xuICAgIHJldHVybiB0aGlzLmRpc21vdW50KCk7XG59O1xuXG4vKipcbiAqIE1ldGhvZCB0byBiZSBjYWxsZWQgaW4gb3JkZXIgdG8gZGlzcGF0Y2ggYW4gZXZlbnQgdG8gdGhlIG5vZGUgYW5kIGFsbCBpdHNcbiAqIGNvbXBvbmVudHMuIE5vdGUgdGhhdCB0aGlzIGRvZXNuJ3QgcmVjdXJzZSB0aGUgc3VidHJlZS5cbiAqXG4gKiBAbWV0aG9kIHJlY2VpdmVcbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHR5cGUgICBUaGUgZXZlbnQgdHlwZSAoZS5nLiBcImNsaWNrXCIpLlxuICogQHBhcmFtICB7T2JqZWN0fSBldiAgICAgVGhlIGV2ZW50IHBheWxvYWQgb2JqZWN0IHRvIGJlIGRpc3BhdGNoZWQuXG4gKlxuICogQHJldHVybiB7Tm9kZX0gdGhpc1xuICovXG5Ob2RlLnByb3RvdHlwZS5yZWNlaXZlID0gZnVuY3Rpb24gcmVjZWl2ZSAodHlwZSwgZXYpIHtcbiAgICB2YXIgaSA9IDA7XG4gICAgdmFyIGxpc3QgPSB0aGlzLl9jb21wb25lbnRzO1xuICAgIHZhciBsZW4gPSBsaXN0Lmxlbmd0aDtcbiAgICB2YXIgaXRlbTtcbiAgICBmb3IgKDsgaSA8IGxlbiA7IGkrKykge1xuICAgICAgICBpdGVtID0gbGlzdFtpXTtcbiAgICAgICAgaWYgKGl0ZW0gJiYgaXRlbS5vblJlY2VpdmUpIGl0ZW0ub25SZWNlaXZlKHR5cGUsIGV2KTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbi8qKlxuICogUHJpdmF0ZSBtZXRob2QgdG8gYXZvaWQgYWNjaWRlbnRhbGx5IHBhc3NpbmcgYXJndW1lbnRzXG4gKiB0byB1cGRhdGUgZXZlbnRzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5Ob2RlLnByb3RvdHlwZS5fcmVxdWVzdFVwZGF0ZVdpdGhvdXRBcmdzID0gZnVuY3Rpb24gX3JlcXVlc3RVcGRhdGVXaXRob3V0QXJncyAoKSB7XG4gICAgaWYgKCF0aGlzLl9yZXF1ZXN0aW5nVXBkYXRlKSB0aGlzLl9yZXF1ZXN0VXBkYXRlKCk7XG59O1xuXG4vKipcbiAqIEEgbWV0aG9kIHRvIGV4ZWN1dGUgbG9naWMgb24gdXBkYXRlLiBEZWZhdWx0cyB0byB0aGVcbiAqIG5vZGUncyAudXBkYXRlIG1ldGhvZC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IGN1cnJlbnQgdGltZVxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbk5vZGUucHJvdG90eXBlLm9uVXBkYXRlID0gTm9kZS5wcm90b3R5cGUudXBkYXRlO1xuXG4vKipcbiAqIEEgbWV0aG9kIHRvIGV4ZWN1dGUgbG9naWMgd2hlbiBhIHBhcmVudCBub2RlIGlzIHNob3duLiBEZWxlZ2F0ZXNcbiAqIHRvIE5vZGUuc2hvdy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7Tm9kZX0gdGhpc1xuICovXG5Ob2RlLnByb3RvdHlwZS5vblBhcmVudFNob3cgPSBOb2RlLnByb3RvdHlwZS5zaG93O1xuXG4vKipcbiAqIEEgbWV0aG9kIHRvIGV4ZWN1dGUgbG9naWMgd2hlbiB0aGUgcGFyZW50IGlzIGhpZGRlbi4gRGVsZWdhdGVzXG4gKiB0byBOb2RlLmhpZGUuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge05vZGV9IHRoaXNcbiAqL1xuTm9kZS5wcm90b3R5cGUub25QYXJlbnRIaWRlID0gTm9kZS5wcm90b3R5cGUuaGlkZTtcblxuLyoqXG4gKiBBIG1ldGhvZCB0byBleGVjdXRlIGxvZ2ljIHdoZW4gdGhlIHBhcmVudCB0cmFuc2Zvcm0gY2hhbmdlcy5cbiAqIERlbGVnYXRlcyB0byBOb2RlLl9yZXF1ZXN0VXBkYXRlV2l0aG91dEFyZ3MuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbk5vZGUucHJvdG90eXBlLm9uUGFyZW50VHJhbnNmb3JtQ2hhbmdlID0gTm9kZS5wcm90b3R5cGUuX3JlcXVlc3RVcGRhdGVXaXRob3V0QXJncztcblxuLyoqXG4gKiBBIG1ldGhvZCB0byBleGVjdXRlIGxvZ2ljIHdoZW4gdGhlIHBhcmVudCBzaXplIGNoYW5nZXMuXG4gKiBEZWxlZ2F0ZXMgdG8gTm9kZS5fcmVxdWVzdFVwZGF0ZVdJdGhvdXRBcmdzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5Ob2RlLnByb3RvdHlwZS5vblBhcmVudFNpemVDaGFuZ2UgPSBOb2RlLnByb3RvdHlwZS5fcmVxdWVzdFVwZGF0ZVdpdGhvdXRBcmdzO1xuXG4vKipcbiAqIEEgbWV0aG9kIHRvIGV4ZWN1dGUgbG9naWMgd2hlbiB0aGUgbm9kZSBzb21ldGhpbmcgd2FudHNcbiAqIHRvIHNob3cgdGhlIG5vZGUuIERlbGVnYXRlcyB0byBOb2RlLnNob3cuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge05vZGV9IHRoaXNcbiAqL1xuTm9kZS5wcm90b3R5cGUub25TaG93ID0gTm9kZS5wcm90b3R5cGUuc2hvdztcblxuLyoqXG4gKiBBIG1ldGhvZCB0byBleGVjdXRlIGxvZ2ljIHdoZW4gc29tZXRoaW5nIHdhbnRzIHRvIGhpZGUgdGhpc1xuICogbm9kZS4gRGVsZWdhdGVzIHRvIE5vZGUuaGlkZS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7Tm9kZX0gdGhpc1xuICovXG5Ob2RlLnByb3RvdHlwZS5vbkhpZGUgPSBOb2RlLnByb3RvdHlwZS5oaWRlO1xuXG4vKipcbiAqIEEgbWV0aG9kIHdoaWNoIGNhbiBleGVjdXRlIGxvZ2ljIHdoZW4gdGhpcyBub2RlIGlzIGFkZGVkIHRvXG4gKiB0byB0aGUgc2NlbmUgZ3JhcGguIERlbGVnYXRlcyB0byBtb3VudC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7Tm9kZX0gdGhpc1xuICovXG5Ob2RlLnByb3RvdHlwZS5vbk1vdW50ID0gTm9kZS5wcm90b3R5cGUubW91bnQ7XG5cbi8qKlxuICogQSBtZXRob2Qgd2hpY2ggY2FuIGV4ZWN1dGUgbG9naWMgd2hlbiB0aGlzIG5vZGUgaXMgcmVtb3ZlZCBmcm9tXG4gKiB0aGUgc2NlbmUgZ3JhcGguIERlbGVnYXRlcyB0byBOb2RlLmRpc21vdW50LlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtOb2RlfSB0aGlzXG4gKi9cbk5vZGUucHJvdG90eXBlLm9uRGlzbW91bnQgPSBOb2RlLnByb3RvdHlwZS5kaXNtb3VudDtcblxuLyoqXG4gKiBBIG1ldGhvZCB3aGljaCBjYW4gZXhlY3V0ZSBsb2dpYyB3aGVuIHRoaXMgbm9kZSByZWNlaXZlc1xuICogYW4gZXZlbnQgZnJvbSB0aGUgc2NlbmUgZ3JhcGguIERlbGVnYXRlcyB0byBOb2RlLnJlY2VpdmUuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCBuYW1lXG4gKiBAcGFyYW0ge09iamVjdH0gcGF5bG9hZFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbk5vZGUucHJvdG90eXBlLm9uUmVjZWl2ZSA9IE5vZGUucHJvdG90eXBlLnJlY2VpdmU7XG5cbm1vZHVsZS5leHBvcnRzID0gTm9kZTtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKiBcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKiBcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqIFxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICogXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4vKmpzaGludCAtVzA3OSAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBEaXNwYXRjaCA9IHJlcXVpcmUoJy4vRGlzcGF0Y2gnKTtcbnZhciBOb2RlID0gcmVxdWlyZSgnLi9Ob2RlJyk7XG52YXIgU2l6ZSA9IHJlcXVpcmUoJy4vU2l6ZScpO1xuXG4vKipcbiAqIFNjZW5lIGlzIHRoZSBib3R0b20gb2YgdGhlIHNjZW5lIGdyYXBoLiBJdCBpcyBpdCdzIG93blxuICogcGFyZW50IGFuZCBwcm92aWRlcyB0aGUgZ2xvYmFsIHVwZGF0ZXIgdG8gdGhlIHNjZW5lIGdyYXBoLlxuICpcbiAqIEBjbGFzcyBTY2VuZVxuICogQGNvbnN0cnVjdG9yXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHNlbGVjdG9yIGEgc3RyaW5nIHdoaWNoIGlzIGEgZG9tIHNlbGVjdG9yXG4gKiAgICAgICAgICAgICAgICAgc2lnbmlmeWluZyB3aGljaCBkb20gZWxlbWVudCB0aGUgY29udGV4dFxuICogICAgICAgICAgICAgICAgIHNob3VsZCBiZSBzZXQgdXBvblxuICogQHBhcmFtIHtGYW1vdXN9IHVwZGF0ZXIgYSBjbGFzcyB3aGljaCBjb25mb3JtcyB0byBGYW1vdXMnIGludGVyZmFjZVxuICogICAgICAgICAgICAgICAgIGl0IG5lZWRzIHRvIGJlIGFibGUgdG8gc2VuZCBtZXRob2RzIHRvXG4gKiAgICAgICAgICAgICAgICAgdGhlIHJlbmRlcmVycyBhbmQgdXBkYXRlIG5vZGVzIGluIHRoZSBzY2VuZSBncmFwaFxuICovXG5mdW5jdGlvbiBTY2VuZSAoc2VsZWN0b3IsIHVwZGF0ZXIpIHtcbiAgICBpZiAoIXNlbGVjdG9yKSB0aHJvdyBuZXcgRXJyb3IoJ1NjZW5lIG5lZWRzIHRvIGJlIGNyZWF0ZWQgd2l0aCBhIERPTSBzZWxlY3RvcicpO1xuICAgIGlmICghdXBkYXRlcikgdGhyb3cgbmV3IEVycm9yKCdTY2VuZSBuZWVkcyB0byBiZSBjcmVhdGVkIHdpdGggYSBjbGFzcyBsaWtlIEZhbW91cycpO1xuXG4gICAgTm9kZS5jYWxsKHRoaXMpOyAgICAgICAgIC8vIFNjZW5lIGluaGVyaXRzIGZyb20gbm9kZVxuXG4gICAgdGhpcy5fdXBkYXRlciA9IHVwZGF0ZXI7IC8vIFRoZSB1cGRhdGVyIHRoYXQgd2lsbCBib3RoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNlbmQgbWVzc2FnZXMgdG8gdGhlIHJlbmRlcmVyc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBhbmQgdXBkYXRlIGRpcnR5IG5vZGVzIFxuXG4gICAgdGhpcy5fZGlzcGF0Y2ggPSBuZXcgRGlzcGF0Y2godGhpcyk7IC8vIGluc3RhbnRpYXRlcyBhIGRpc3BhdGNoZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdG8gc2VuZCBldmVudHMgdG8gdGhlIHNjZW5lXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGdyYXBoIGJlbG93IHRoaXMgY29udGV4dFxuICAgIFxuICAgIHRoaXMuX3NlbGVjdG9yID0gc2VsZWN0b3I7IC8vIHJlZmVyZW5jZSB0byB0aGUgRE9NIHNlbGVjdG9yXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhhdCByZXByZXNlbnRzIHRoZSBlbGVtbmVudFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGluIHRoZSBkb20gdGhhdCB0aGlzIGNvbnRleHRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpbmhhYml0c1xuXG4gICAgdGhpcy5vbk1vdW50KHRoaXMsIHNlbGVjdG9yKTsgLy8gTW91bnQgdGhlIGNvbnRleHQgdG8gaXRzZWxmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gKGl0IGlzIGl0cyBvd24gcGFyZW50KVxuICAgIFxuICAgIHRoaXMuX3VwZGF0ZXIgICAgICAgICAgICAgICAgICAvLyBtZXNzYWdlIGEgcmVxdWVzdCBmb3IgdGhlIGRvbVxuICAgICAgICAubWVzc2FnZSgnTkVFRF9TSVpFX0ZPUicpICAvLyBzaXplIG9mIHRoZSBjb250ZXh0IHNvIHRoYXRcbiAgICAgICAgLm1lc3NhZ2Uoc2VsZWN0b3IpOyAgICAgICAgLy8gdGhlIHNjZW5lIGdyYXBoIGhhcyBhIHRvdGFsIHNpemVcblxuICAgIHRoaXMuc2hvdygpOyAvLyB0aGUgY29udGV4dCBiZWdpbnMgc2hvd24gKGl0J3MgYWxyZWFkeSBwcmVzZW50IGluIHRoZSBkb20pXG5cbn1cblxuLy8gU2NlbmUgaW5oZXJpdHMgZnJvbSBub2RlXG5TY2VuZS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE5vZGUucHJvdG90eXBlKTtcblNjZW5lLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNjZW5lO1xuXG4vKipcbiAqIFNjZW5lIGdldFVwZGF0ZXIgZnVuY3Rpb24gcmV0dXJucyB0aGUgcGFzc2VkIGluIHVwZGF0ZXJcbiAqXG4gKiBAcmV0dXJuIHtGYW1vdXN9IHRoZSB1cGRhdGVyIGZvciB0aGlzIFNjZW5lXG4gKi9cblNjZW5lLnByb3RvdHlwZS5nZXRVcGRhdGVyID0gZnVuY3Rpb24gZ2V0VXBkYXRlciAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3VwZGF0ZXI7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIHNlbGVjdG9yIHRoYXQgdGhlIGNvbnRleHQgd2FzIGluc3RhbnRpYXRlZCB3aXRoXG4gKlxuICogQHJldHVybiB7U3RyaW5nfSBkb20gc2VsZWN0b3JcbiAqL1xuU2NlbmUucHJvdG90eXBlLmdldFNlbGVjdG9yID0gZnVuY3Rpb24gZ2V0U2VsZWN0b3IgKCkge1xuICAgIHJldHVybiB0aGlzLl9zZWxlY3Rvcjtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgZGlzcGF0Y2hlciBvZiB0aGUgY29udGV4dC4gVXNlZCB0byBzZW5kIGV2ZW50c1xuICogdG8gdGhlIG5vZGVzIGluIHRoZSBzY2VuZSBncmFwaC5cbiAqXG4gKiBAcmV0dXJuIHtEaXNwYXRjaH0gdGhlIFNjZW5lJ3MgRGlzcGF0Y2hcbiAqL1xuU2NlbmUucHJvdG90eXBlLmdldERpc3BhdGNoID0gZnVuY3Rpb24gZ2V0RGlzcGF0Y2ggKCkge1xuICAgIHJldHVybiB0aGlzLl9kaXNwYXRjaDtcbn07XG5cbi8qKlxuICogUmVjZWl2ZXMgYW4gZXZlbnQuIElmIHRoZSBldmVudCBpcyAnQ09OVEVYVF9SRVNJWkUnIGl0IHNldHMgdGhlIHNpemUgb2YgdGhlIHNjZW5lXG4gKiBncmFwaCB0byB0aGUgcGF5bG9hZCwgd2hpY2ggbXVzdCBiZSBhbiBhcnJheSBvZiBudW1iZXJzIG9mIGF0IGxlYXN0XG4gKiBsZW5ndGggdGhyZWUgcmVwcmVzZW50aW5nIHRoZSBwaXhlbCBzaXplIGluIDMgZGltZW5zaW9ucy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgdGhlIG5hbWUgb2YgdGhlIGV2ZW50IGJlaW5nIHJlY2VpdmVkXG4gKiBAcGFyYW0geyp9IHBheWxvYWQgdGhlIG9iamVjdCBiZWluZyBzZW50XG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuU2NlbmUucHJvdG90eXBlLm9uUmVjZWl2ZSA9IGZ1bmN0aW9uIG9uUmVjZWl2ZSAoZXZlbnQsIHBheWxvYWQpIHtcbiAgICAvLyBUT0RPOiBJbiB0aGUgZnV0dXJlIHRoZSBkb20gZWxlbWVudCB0aGF0IHRoZSBjb250ZXh0IGlzIGF0dGFjaGVkIHRvXG4gICAgLy8gc2hvdWxkIGhhdmUgYSByZXByZXNlbnRhdGlvbiBhcyBhIGNvbXBvbmVudC4gSXQgd291bGQgYmUgcmVuZGVyIHNpemVkXG4gICAgLy8gYW5kIHRoZSBjb250ZXh0IHdvdWxkIHJlY2VpdmUgaXRzIHNpemUgdGhlIHNhbWUgd2F5IHRoYXQgYW55IHJlbmRlciBzaXplXG4gICAgLy8gY29tcG9uZW50IHJlY2VpdmVzIGl0cyBzaXplLlxuICAgIGlmIChldmVudCA9PT0gJ0NPTlRFWFRfUkVTSVpFJykge1xuICAgICAgICBcbiAgICAgICAgaWYgKHBheWxvYWQubGVuZ3RoIDwgMikgXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICAgICAgICdDT05URVhUX1JFU0laRVxcJ3MgcGF5bG9hZCBuZWVkcyB0byBiZSBhdCBsZWFzdCBhIHBhaXInICtcbiAgICAgICAgICAgICAgICAgICAgJyBvZiBwaXhlbCBzaXplcydcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgdGhpcy5zZXRTaXplTW9kZShTaXplLkFCU09MVVRFLCBTaXplLkFCU09MVVRFLCBTaXplLkFCU09MVVRFKTtcbiAgICAgICAgdGhpcy5zZXRBYnNvbHV0ZVNpemUocGF5bG9hZFswXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGF5bG9hZFsxXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGF5bG9hZFsyXSA/IHBheWxvYWRbMl0gOiAwKTtcblxuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU2NlbmU7XG5cbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKiBcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKiBcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqIFxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICogXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogVGhlIFNpemUgY2xhc3MgaXMgcmVzcG9uc2libGUgZm9yIHByb2Nlc3NpbmcgU2l6ZSBmcm9tIGEgbm9kZVxuICogQGNvbnN0cnVjdG9yIFNpemVcbiAqL1xuZnVuY3Rpb24gU2l6ZSAoKSB7XG4gICAgdGhpcy5fc2l6ZSA9IG5ldyBGbG9hdDMyQXJyYXkoMyk7XG59XG5cbi8vIGFuIGVudW1lcmF0aW9uIG9mIHRoZSBkaWZmZXJlbnQgdHlwZXMgb2Ygc2l6ZSBtb2Rlc1xuU2l6ZS5SRUxBVElWRSA9IDA7XG5TaXplLkFCU09MVVRFID0gMTtcblNpemUuUkVOREVSID0gMjtcblNpemUuREVGQVVMVCA9IFNpemUuUkVMQVRJVkU7XG5cbi8qKlxuICogZnJvbVNwZWNXaXRoUGFyZW50IHRha2VzIHRoZSBwYXJlbnQgbm9kZSdzIHNpemUsIHRoZSB0YXJnZXQgbm9kZXMgc3BlYyxcbiAqIGFuZCBhIHRhcmdldCBhcnJheSB0byB3cml0ZSB0by4gVXNpbmcgdGhlIG5vZGUncyBzaXplIG1vZGUgaXQgY2FsY3VsYXRlcyBcbiAqIGEgZmluYWwgc2l6ZSBmb3IgdGhlIG5vZGUgZnJvbSB0aGUgbm9kZSdzIHNwZWMuIFJldHVybnMgd2hldGhlciBvciBub3RcbiAqIHRoZSBmaW5hbCBzaXplIGhhcyBjaGFuZ2VkIGZyb20gaXRzIGxhc3QgdmFsdWUuXG4gKlxuICogQHBhcmFtIHtBcnJheX0gcGFyZW50U2l6ZSBwYXJlbnQgbm9kZSdzIGNhbGN1bGF0ZWQgc2l6ZVxuICogQHBhcmFtIHtOb2RlLlNwZWN9IG5vZGUgdGhlIHRhcmdldCBub2RlJ3Mgc3BlY1xuICogQHBhcmFtIHtBcnJheX0gdGFyZ2V0IGFuIGFycmF5IHRvIHdyaXRlIHRoZSByZXN1bHQgdG9cbiAqXG4gKiBAcmV0dXJuIHtCb29sZWFufSB0cnVlIGlmIHRoZSBzaXplIG9mIHRoZSBub2RlIGhhcyBjaGFuZ2VkLlxuICovXG5TaXplLnByb3RvdHlwZS5mcm9tU3BlY1dpdGhQYXJlbnQgPSBmdW5jdGlvbiBmcm9tU3BlY1dpdGhQYXJlbnQgKHBhcmVudFNpemUsIG5vZGUsIHRhcmdldCkge1xuICAgIHZhciBzcGVjID0gbm9kZS5nZXRWYWx1ZSgpLnNwZWM7XG4gICAgdmFyIGNvbXBvbmVudHMgPSBub2RlLmdldENvbXBvbmVudHMoKTtcbiAgICB2YXIgbW9kZSA9IHNwZWMuc2l6ZS5zaXplTW9kZTtcbiAgICB2YXIgcHJldjtcbiAgICB2YXIgY2hhbmdlZCA9IGZhbHNlO1xuICAgIHZhciBsZW4gPSBjb21wb25lbnRzLmxlbmd0aDtcbiAgICB2YXIgajtcbiAgICBmb3IgKHZhciBpID0gMCA7IGkgPCAzIDsgaSsrKSB7XG4gICAgICAgIHN3aXRjaCAobW9kZVtpXSkge1xuICAgICAgICAgICAgY2FzZSBTaXplLlJFTEFUSVZFOlxuICAgICAgICAgICAgICAgIHByZXYgPSB0YXJnZXRbaV07XG4gICAgICAgICAgICAgICAgdGFyZ2V0W2ldID0gcGFyZW50U2l6ZVtpXSAqIHNwZWMuc2l6ZS5wcm9wb3J0aW9uYWxbaV0gKyBzcGVjLnNpemUuZGlmZmVyZW50aWFsW2ldO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTaXplLkFCU09MVVRFOlxuICAgICAgICAgICAgICAgIHByZXYgPSB0YXJnZXRbaV07XG4gICAgICAgICAgICAgICAgdGFyZ2V0W2ldID0gc3BlYy5zaXplLmFic29sdXRlW2ldO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTaXplLlJFTkRFUjpcbiAgICAgICAgICAgICAgICB2YXIgY2FuZGlkYXRlO1xuICAgICAgICAgICAgICAgIGZvciAoaiA9IDA7IGogPCBsZW4gOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXBvbmVudHNbal0uZ2V0UmVuZGVyU2l6ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FuZGlkYXRlID0gY29tcG9uZW50c1tqXS5nZXRSZW5kZXJTaXplKClbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmV2ID0gdGFyZ2V0W2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0W2ldID0gdGFyZ2V0W2ldIDwgY2FuZGlkYXRlIHx8IHRhcmdldFtpXSA9PT0gMCA/IGNhbmRpZGF0ZSA6IHRhcmdldFtpXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjaGFuZ2VkID0gY2hhbmdlZCB8fCBwcmV2ICE9PSB0YXJnZXRbaV07XG4gICAgfVxuICAgIHJldHVybiBjaGFuZ2VkO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTaXplO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqIFxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqIFxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICogXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKiBcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBUaGUgdHJhbnNmb3JtIGNsYXNzIGlzIHJlc3BvbnNpYmxlIGZvciBjYWxjdWxhdGluZyB0aGUgdHJhbnNmb3JtIG9mIGEgcGFydGljdWxhclxuICogbm9kZSBmcm9tIHRoZSBkYXRhIG9uIHRoZSBub2RlIGFuZCBpdHMgcGFyZW50XG4gKlxuICogQGNvbnN0cnVjdG9yIFRyYW5zZm9ybVxuICovXG5mdW5jdGlvbiBUcmFuc2Zvcm0gKCkge1xuICAgIHRoaXMuX21hdHJpeCA9IG5ldyBGbG9hdDMyQXJyYXkoMTYpO1xufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIGxhc3QgY2FsY3VsYXRlZCB0cmFuc2Zvcm1cbiAqXG4gKiBAcmV0dXJuIHtBcnJheX0gYSB0cmFuc2Zvcm1cbiAqL1xuVHJhbnNmb3JtLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiBnZXQgKCkge1xuICAgIHJldHVybiB0aGlzLl9tYXRyaXg7XG59O1xuXG4vKipcbiAqIFVzZXMgdGhlIHBhcmVudCB0cmFuc2Zvcm0sIHRoZSBub2RlJ3Mgc3BlYywgdGhlIG5vZGUncyBzaXplLCBhbmQgdGhlIHBhcmVudCdzIHNpemVcbiAqIHRvIGNhbGN1bGF0ZSBhIGZpbmFsIHRyYW5zZm9ybSBmb3IgdGhlIG5vZGUuIFJldHVybnMgdHJ1ZSBpZiB0aGUgdHJhbnNmb3JtIGhhcyBjaGFuZ2VkLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHBhcmVudE1hdHJpeCB0aGUgcGFyZW50IG1hdHJpeFxuICogQHBhcmFtIHtOb2RlLlNwZWN9IHNwZWMgdGhlIHRhcmdldCBub2RlJ3Mgc3BlY1xuICogQHBhcmFtIHtBcnJheX0gbXlTaXplIHRoZSBzaXplIG9mIHRoZSBub2RlXG4gKiBAcGFyYW0ge0FycmF5fSBwYXJlbnRTaXplIHRoZSBzaXplIG9mIHRoZSBwYXJlbnRcbiAqIEBwYXJhbSB7QXJyYXl9IHRhcmdldCB0aGUgdGFyZ2V0IGFycmF5IHRvIHdyaXRlIHRoZSByZXN1bHRpbmcgdHJhbnNmb3JtIHRvXG4gKlxuICogQHJldHVybiB7Qm9vbGVhbn0gd2hldGhlciBvciBub3QgdGhlIHRyYW5zZm9ybSBjaGFuZ2VkXG4gKi9cblRyYW5zZm9ybS5wcm90b3R5cGUuZnJvbVNwZWNXaXRoUGFyZW50ID0gZnVuY3Rpb24gZnJvbVNwZWNXaXRoUGFyZW50IChwYXJlbnRNYXRyaXgsIHNwZWMsIG15U2l6ZSwgcGFyZW50U2l6ZSwgdGFyZ2V0KSB7XG4gICAgdGFyZ2V0ID0gdGFyZ2V0ID8gdGFyZ2V0IDogdGhpcy5fbWF0cml4O1xuXG4gICAgLy8gbG9jYWwgY2FjaGUgb2YgZXZlcnl0aGluZ1xuICAgIHZhciB0MDAgICAgICAgICA9IHRhcmdldFswXTtcbiAgICB2YXIgdDAxICAgICAgICAgPSB0YXJnZXRbMV07XG4gICAgdmFyIHQwMiAgICAgICAgID0gdGFyZ2V0WzJdO1xuICAgIHZhciB0MTAgICAgICAgICA9IHRhcmdldFs0XTtcbiAgICB2YXIgdDExICAgICAgICAgPSB0YXJnZXRbNV07XG4gICAgdmFyIHQxMiAgICAgICAgID0gdGFyZ2V0WzZdO1xuICAgIHZhciB0MjAgICAgICAgICA9IHRhcmdldFs4XTtcbiAgICB2YXIgdDIxICAgICAgICAgPSB0YXJnZXRbOV07XG4gICAgdmFyIHQyMiAgICAgICAgID0gdGFyZ2V0WzEwXTtcbiAgICB2YXIgdDMwICAgICAgICAgPSB0YXJnZXRbMTJdO1xuICAgIHZhciB0MzEgICAgICAgICA9IHRhcmdldFsxM107XG4gICAgdmFyIHQzMiAgICAgICAgID0gdGFyZ2V0WzE0XTtcbiAgICB2YXIgcDAwICAgICAgICAgPSBwYXJlbnRNYXRyaXhbMF07XG4gICAgdmFyIHAwMSAgICAgICAgID0gcGFyZW50TWF0cml4WzFdO1xuICAgIHZhciBwMDIgICAgICAgICA9IHBhcmVudE1hdHJpeFsyXTtcbiAgICB2YXIgcDEwICAgICAgICAgPSBwYXJlbnRNYXRyaXhbNF07XG4gICAgdmFyIHAxMSAgICAgICAgID0gcGFyZW50TWF0cml4WzVdO1xuICAgIHZhciBwMTIgICAgICAgICA9IHBhcmVudE1hdHJpeFs2XTtcbiAgICB2YXIgcDIwICAgICAgICAgPSBwYXJlbnRNYXRyaXhbOF07XG4gICAgdmFyIHAyMSAgICAgICAgID0gcGFyZW50TWF0cml4WzldO1xuICAgIHZhciBwMjIgICAgICAgICA9IHBhcmVudE1hdHJpeFsxMF07XG4gICAgdmFyIHAzMCAgICAgICAgID0gcGFyZW50TWF0cml4WzEyXTtcbiAgICB2YXIgcDMxICAgICAgICAgPSBwYXJlbnRNYXRyaXhbMTNdO1xuICAgIHZhciBwMzIgICAgICAgICA9IHBhcmVudE1hdHJpeFsxNF07XG4gICAgdmFyIHBvc1ggICAgICAgID0gc3BlYy52ZWN0b3JzLnBvc2l0aW9uWzBdO1xuICAgIHZhciBwb3NZICAgICAgICA9IHNwZWMudmVjdG9ycy5wb3NpdGlvblsxXTtcbiAgICB2YXIgcG9zWiAgICAgICAgPSBzcGVjLnZlY3RvcnMucG9zaXRpb25bMl07XG4gICAgdmFyIHJvdFggICAgICAgID0gc3BlYy52ZWN0b3JzLnJvdGF0aW9uWzBdO1xuICAgIHZhciByb3RZICAgICAgICA9IHNwZWMudmVjdG9ycy5yb3RhdGlvblsxXTtcbiAgICB2YXIgcm90WiAgICAgICAgPSBzcGVjLnZlY3RvcnMucm90YXRpb25bMl07XG4gICAgdmFyIHJvdFcgICAgICAgID0gc3BlYy52ZWN0b3JzLnJvdGF0aW9uWzNdO1xuICAgIHZhciBzY2FsZVggICAgICA9IHNwZWMudmVjdG9ycy5zY2FsZVswXTtcbiAgICB2YXIgc2NhbGVZICAgICAgPSBzcGVjLnZlY3RvcnMuc2NhbGVbMV07XG4gICAgdmFyIHNjYWxlWiAgICAgID0gc3BlYy52ZWN0b3JzLnNjYWxlWzJdO1xuICAgIHZhciBhbGlnblggICAgICA9IHNwZWMub2Zmc2V0cy5hbGlnblswXSAqIHBhcmVudFNpemVbMF07XG4gICAgdmFyIGFsaWduWSAgICAgID0gc3BlYy5vZmZzZXRzLmFsaWduWzFdICogcGFyZW50U2l6ZVsxXTtcbiAgICB2YXIgYWxpZ25aICAgICAgPSBzcGVjLm9mZnNldHMuYWxpZ25bMl0gKiBwYXJlbnRTaXplWzJdO1xuICAgIHZhciBtb3VudFBvaW50WCA9IHNwZWMub2Zmc2V0cy5tb3VudFBvaW50WzBdICogbXlTaXplWzBdO1xuICAgIHZhciBtb3VudFBvaW50WSA9IHNwZWMub2Zmc2V0cy5tb3VudFBvaW50WzFdICogbXlTaXplWzFdO1xuICAgIHZhciBtb3VudFBvaW50WiA9IHNwZWMub2Zmc2V0cy5tb3VudFBvaW50WzJdICogbXlTaXplWzJdO1xuICAgIHZhciBvcmlnaW5YICAgICA9IHNwZWMub2Zmc2V0cy5vcmlnaW5bMF0gKiBteVNpemVbMF07XG4gICAgdmFyIG9yaWdpblkgICAgID0gc3BlYy5vZmZzZXRzLm9yaWdpblsxXSAqIG15U2l6ZVsxXTtcbiAgICB2YXIgb3JpZ2luWiAgICAgPSBzcGVjLm9mZnNldHMub3JpZ2luWzJdICogbXlTaXplWzJdO1xuXG4gICAgdmFyIHd4ID0gcm90VyAqIHJvdFg7XG4gICAgdmFyIHd5ID0gcm90VyAqIHJvdFk7XG4gICAgdmFyIHd6ID0gcm90VyAqIHJvdFo7XG4gICAgdmFyIHh4ID0gcm90WCAqIHJvdFg7XG4gICAgdmFyIHl5ID0gcm90WSAqIHJvdFk7XG4gICAgdmFyIHp6ID0gcm90WiAqIHJvdFo7XG4gICAgdmFyIHh5ID0gcm90WCAqIHJvdFk7XG4gICAgdmFyIHh6ID0gcm90WCAqIHJvdFo7XG4gICAgdmFyIHl6ID0gcm90WSAqIHJvdFo7XG5cbiAgICB2YXIgcnMwID0gKDEgLSAyICogKHl5ICsgenopKSAqIHNjYWxlWDtcbiAgICB2YXIgcnMxID0gKDIgKiAoeHkgKyB3eikpICogc2NhbGVYO1xuICAgIHZhciByczIgPSAoMiAqICh4eiAtIHd5KSkgKiBzY2FsZVg7XG4gICAgdmFyIHJzMyA9ICgyICogKHh5IC0gd3opKSAqIHNjYWxlWTtcbiAgICB2YXIgcnM0ID0gKDEgLSAyICogKHh4ICsgenopKSAqIHNjYWxlWTtcbiAgICB2YXIgcnM1ID0gKDIgKiAoeXogKyB3eCkpICogc2NhbGVZO1xuICAgIHZhciByczYgPSAoMiAqICh4eiArIHd5KSkgKiBzY2FsZVo7XG4gICAgdmFyIHJzNyA9ICgyICogKHl6IC0gd3gpKSAqIHNjYWxlWjtcbiAgICB2YXIgcnM4ID0gKDEgLSAyICogKHh4ICsgeXkpKSAqIHNjYWxlWjtcblxuICAgIHZhciB0eCA9IGFsaWduWCArIHBvc1ggLSBtb3VudFBvaW50WCArIG9yaWdpblggLSAocnMwICogb3JpZ2luWCArIHJzMyAqIG9yaWdpblkgKyByczYgKiBvcmlnaW5aKTtcbiAgICB2YXIgdHkgPSBhbGlnblkgKyBwb3NZIC0gbW91bnRQb2ludFkgKyBvcmlnaW5ZIC0gKHJzMSAqIG9yaWdpblggKyByczQgKiBvcmlnaW5ZICsgcnM3ICogb3JpZ2luWik7XG4gICAgdmFyIHR6ID0gYWxpZ25aICsgcG9zWiAtIG1vdW50UG9pbnRaICsgb3JpZ2luWiAtIChyczIgKiBvcmlnaW5YICsgcnM1ICogb3JpZ2luWSArIHJzOCAqIG9yaWdpblopO1xuXG4gICAgdGFyZ2V0WzBdID0gcDAwICogcnMwICsgcDEwICogcnMxICsgcDIwICogcnMyO1xuICAgIHRhcmdldFsxXSA9IHAwMSAqIHJzMCArIHAxMSAqIHJzMSArIHAyMSAqIHJzMjtcbiAgICB0YXJnZXRbMl0gPSBwMDIgKiByczAgKyBwMTIgKiByczEgKyBwMjIgKiByczI7XG4gICAgdGFyZ2V0WzNdID0gMDtcbiAgICB0YXJnZXRbNF0gPSBwMDAgKiByczMgKyBwMTAgKiByczQgKyBwMjAgKiByczU7XG4gICAgdGFyZ2V0WzVdID0gcDAxICogcnMzICsgcDExICogcnM0ICsgcDIxICogcnM1O1xuICAgIHRhcmdldFs2XSA9IHAwMiAqIHJzMyArIHAxMiAqIHJzNCArIHAyMiAqIHJzNTtcbiAgICB0YXJnZXRbN10gPSAwO1xuICAgIHRhcmdldFs4XSA9IHAwMCAqIHJzNiArIHAxMCAqIHJzNyArIHAyMCAqIHJzODtcbiAgICB0YXJnZXRbOV0gPSBwMDEgKiByczYgKyBwMTEgKiByczcgKyBwMjEgKiByczg7XG4gICAgdGFyZ2V0WzEwXSA9IHAwMiAqIHJzNiArIHAxMiAqIHJzNyArIHAyMiAqIHJzODtcbiAgICB0YXJnZXRbMTFdID0gMDtcbiAgICB0YXJnZXRbMTJdID0gcDAwICogdHggKyBwMTAgKiB0eSArIHAyMCAqIHR6ICsgcDMwO1xuICAgIHRhcmdldFsxM10gPSBwMDEgKiB0eCArIHAxMSAqIHR5ICsgcDIxICogdHogKyBwMzE7XG4gICAgdGFyZ2V0WzE0XSA9IHAwMiAqIHR4ICsgcDEyICogdHkgKyBwMjIgKiB0eiArIHAzMjtcbiAgICB0YXJnZXRbMTVdID0gMTtcblxuICAgIHJldHVybiB0MDAgIT09IHRhcmdldFswXSB8fFxuICAgICAgICB0MDEgIT09IHRhcmdldFsxXSB8fFxuICAgICAgICB0MDIgIT09IHRhcmdldFsyXSB8fFxuICAgICAgICB0MTAgIT09IHRhcmdldFs0XSB8fFxuICAgICAgICB0MTEgIT09IHRhcmdldFs1XSB8fFxuICAgICAgICB0MTIgIT09IHRhcmdldFs2XSB8fFxuICAgICAgICB0MjAgIT09IHRhcmdldFs4XSB8fFxuICAgICAgICB0MjEgIT09IHRhcmdldFs5XSB8fFxuICAgICAgICB0MjIgIT09IHRhcmdldFsxMF0gfHxcbiAgICAgICAgdDMwICE9PSB0YXJnZXRbMTJdIHx8XG4gICAgICAgIHQzMSAhPT0gdGFyZ2V0WzEzXSB8fFxuICAgICAgICB0MzIgIT09IHRhcmdldFsxNF07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVHJhbnNmb3JtO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgRWxlbWVudENhY2hlID0gcmVxdWlyZSgnLi9FbGVtZW50Q2FjaGUnKTtcbnZhciBtYXRoID0gcmVxdWlyZSgnLi9NYXRoJyk7XG52YXIgdmVuZG9yUHJlZml4ID0gcmVxdWlyZSgnLi4vdXRpbGl0aWVzL3ZlbmRvclByZWZpeCcpO1xudmFyIGV2ZW50TWFwID0gcmVxdWlyZSgnLi9ldmVudHMvRXZlbnRNYXAnKTtcblxudmFyIFRSQU5TRk9STSA9IG51bGw7XG5cbi8qKlxuICogRE9NUmVuZGVyZXIgaXMgYSBjbGFzcyByZXNwb25zaWJsZSBmb3IgYWRkaW5nIGVsZW1lbnRzXG4gKiB0byB0aGUgRE9NIGFuZCB3cml0aW5nIHRvIHRob3NlIGVsZW1lbnRzLlxuICogVGhlcmUgaXMgYSBET01SZW5kZXJlciBwZXIgY29udGV4dCwgcmVwcmVzZW50ZWQgYXMgYW5cbiAqIGVsZW1lbnQgYW5kIGEgc2VsZWN0b3IuIEl0IGlzIGluc3RhbnRpYXRlZCBpbiB0aGVcbiAqIGNvbnRleHQgY2xhc3MuXG4gKlxuICogQGNsYXNzIERPTVJlbmRlcmVyXG4gKlxuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWxlbWVudCBhbiBlbGVtZW50LlxuICogQHBhcmFtIHtTdHJpbmd9IHNlbGVjdG9yIHRoZSBzZWxlY3RvciBvZiB0aGUgZWxlbWVudC5cbiAqIEBwYXJhbSB7Q29tcG9zaXRvcn0gY29tcG9zaXRvciB0aGUgY29tcG9zaXRvciBjb250cm9sbGluZyB0aGUgcmVuZGVyZXJcbiAqL1xuZnVuY3Rpb24gRE9NUmVuZGVyZXIgKGVsZW1lbnQsIHNlbGVjdG9yLCBjb21wb3NpdG9yKSB7XG4gICAgZWxlbWVudC5jbGFzc0xpc3QuYWRkKCdmYW1vdXMtZG9tLXJlbmRlcmVyJyk7XG5cbiAgICBUUkFOU0ZPUk0gPSBUUkFOU0ZPUk0gfHwgdmVuZG9yUHJlZml4KCd0cmFuc2Zvcm0nKTtcbiAgICB0aGlzLl9jb21wb3NpdG9yID0gY29tcG9zaXRvcjsgLy8gYSByZWZlcmVuY2UgdG8gdGhlIGNvbXBvc2l0b3JcblxuICAgIHRoaXMuX3RhcmdldCA9IG51bGw7IC8vIGEgcmVnaXN0ZXIgZm9yIGhvbGRpbmcgdGhlIGN1cnJlbnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAvLyBlbGVtZW50IHRoYXQgdGhlIFJlbmRlcmVyIGlzIG9wZXJhdGluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHVwb25cblxuICAgIHRoaXMuX3BhcmVudCA9IG51bGw7IC8vIGEgcmVnaXN0ZXIgZm9yIGhvbGRpbmcgdGhlIHBhcmVudFxuICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9mIHRoZSB0YXJnZXRcblxuICAgIHRoaXMuX3BhdGggPSBudWxsOyAvLyBhIHJlZ2lzdGVyIGZvciBob2xkaW5nIHRoZSBwYXRoIG9mIHRoZSB0YXJnZXRcbiAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhpcyByZWdpc3RlciBtdXN0IGJlIHNldCBmaXJzdCwgYW5kIHRoZW5cbiAgICAgICAgICAgICAgICAgICAgICAgLy8gY2hpbGRyZW4sIHRhcmdldCwgYW5kIHBhcmVudCBhcmUgYWxsIGxvb2tlZFxuICAgICAgICAgICAgICAgICAgICAgICAvLyB1cCBmcm9tIHRoYXQuXG5cbiAgICB0aGlzLl9jaGlsZHJlbiA9IFtdOyAvLyBhIHJlZ2lzdGVyIGZvciBob2xkaW5nIHRoZSBjaGlsZHJlbiBvZiB0aGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjdXJyZW50IHRhcmdldC5cblxuICAgIHRoaXMuX3Jvb3QgPSBuZXcgRWxlbWVudENhY2hlKGVsZW1lbnQsIHNlbGVjdG9yKTsgLy8gdGhlIHJvb3RcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9mIHRoZSBkb20gdHJlZSB0aGF0IHRoaXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJlbmRlcmVyIGlzIHJlc3BvbnNpYmxlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBmb3JcblxuICAgIHRoaXMuX2JvdW5kVHJpZ2dlckV2ZW50ID0gdGhpcy5fdHJpZ2dlckV2ZW50LmJpbmQodGhpcyk7XG5cbiAgICB0aGlzLl9zZWxlY3RvciA9IHNlbGVjdG9yO1xuXG4gICAgdGhpcy5fZWxlbWVudHMgPSB7fTtcblxuICAgIHRoaXMuX2VsZW1lbnRzW3NlbGVjdG9yXSA9IHRoaXMuX3Jvb3Q7XG5cbiAgICB0aGlzLnBlcnNwZWN0aXZlVHJhbnNmb3JtID0gbmV3IEZsb2F0MzJBcnJheShbMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMV0pO1xuICAgIHRoaXMuX1ZQdHJhbnNmb3JtID0gbmV3IEZsb2F0MzJBcnJheShbMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMV0pO1xuXG4gICAgdGhpcy5fc2l6ZSA9IFtudWxsLCBudWxsXTtcbn1cblxuXG4vKipcbiAqIEF0dGFjaGVzIGFuIEV2ZW50TGlzdGVuZXIgdG8gdGhlIGVsZW1lbnQgYXNzb2NpYXRlZCB3aXRoIHRoZSBwYXNzZWQgaW4gcGF0aC5cbiAqIFByZXZlbnRzIHRoZSBkZWZhdWx0IGJyb3dzZXIgYWN0aW9uIG9uIGFsbCBzdWJzZXF1ZW50IGV2ZW50cyBpZlxuICogYHByZXZlbnREZWZhdWx0YCBpcyB0cnV0aHkuXG4gKiBBbGwgaW5jb21pbmcgZXZlbnRzIHdpbGwgYmUgZm9yd2FyZGVkIHRvIHRoZSBjb21wb3NpdG9yIGJ5IGludm9raW5nIHRoZVxuICogYHNlbmRFdmVudGAgbWV0aG9kLlxuICogRGVsZWdhdGVzIGV2ZW50cyBpZiBwb3NzaWJsZSBieSBhdHRhY2hpbmcgdGhlIGV2ZW50IGxpc3RlbmVyIHRvIHRoZSBjb250ZXh0LlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdHlwZSBET00gZXZlbnQgdHlwZSAoZS5nLiBjbGljaywgbW91c2VvdmVyKS5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gcHJldmVudERlZmF1bHQgV2hldGhlciBvciBub3QgdGhlIGRlZmF1bHQgYnJvd3NlciBhY3Rpb24gc2hvdWxkIGJlIHByZXZlbnRlZC5cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5ET01SZW5kZXJlci5wcm90b3R5cGUuc3Vic2NyaWJlID0gZnVuY3Rpb24gc3Vic2NyaWJlKHR5cGUsIHByZXZlbnREZWZhdWx0KSB7XG4gICAgLy8gVE9ETyBwcmV2ZW50RGVmYXVsdCBzaG91bGQgYmUgYSBzZXBhcmF0ZSBjb21tYW5kXG4gICAgdGhpcy5fYXNzZXJ0VGFyZ2V0TG9hZGVkKCk7XG5cbiAgICB0aGlzLl90YXJnZXQucHJldmVudERlZmF1bHRbdHlwZV0gPSBwcmV2ZW50RGVmYXVsdDtcbiAgICB0aGlzLl90YXJnZXQuc3Vic2NyaWJlW3R5cGVdID0gdHJ1ZTtcblxuICAgIGlmIChcbiAgICAgICAgIXRoaXMuX3RhcmdldC5saXN0ZW5lcnNbdHlwZV0gJiYgIXRoaXMuX3Jvb3QubGlzdGVuZXJzW3R5cGVdXG4gICAgKSB7XG4gICAgICAgIHZhciB0YXJnZXQgPSBldmVudE1hcFt0eXBlXVsxXSA/IHRoaXMuX3Jvb3QgOiB0aGlzLl90YXJnZXQ7XG4gICAgICAgIHRhcmdldC5saXN0ZW5lcnNbdHlwZV0gPSB0aGlzLl9ib3VuZFRyaWdnZXJFdmVudDtcbiAgICAgICAgdGFyZ2V0LmVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCB0aGlzLl9ib3VuZFRyaWdnZXJFdmVudCk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBGdW5jdGlvbiB0byBiZSBhZGRlZCB1c2luZyBgYWRkRXZlbnRMaXN0ZW5lcmAgdG8gdGhlIGNvcnJlc3BvbmRpbmdcbiAqIERPTUVsZW1lbnQuXG4gKlxuICogQG1ldGhvZFxuICogQHByaXZhdGVcbiAqXG4gKiBAcGFyYW0ge0V2ZW50fSBldiBET00gRXZlbnQgcGF5bG9hZFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5fdHJpZ2dlckV2ZW50ID0gZnVuY3Rpb24gX3RyaWdnZXJFdmVudChldikge1xuICAgIC8vIFVzZSBldi5wYXRoLCB3aGljaCBpcyBhbiBhcnJheSBvZiBFbGVtZW50cyAocG9seWZpbGxlZCBpZiBuZWVkZWQpLlxuICAgIHZhciBldlBhdGggPSBldi5wYXRoID8gZXYucGF0aCA6IF9nZXRQYXRoKGV2KTtcbiAgICAvLyBGaXJzdCBlbGVtZW50IGluIHRoZSBwYXRoIGlzIHRoZSBlbGVtZW50IG9uIHdoaWNoIHRoZSBldmVudCBoYXMgYWN0dWFsbHlcbiAgICAvLyBiZWVuIGVtaXR0ZWQuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBldlBhdGgubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgLy8gU2tpcCBub2RlcyB0aGF0IGRvbid0IGhhdmUgYSBkYXRhc2V0IHByb3BlcnR5IG9yIGRhdGEtZmEtcGF0aFxuICAgICAgICAvLyBhdHRyaWJ1dGUuXG4gICAgICAgIGlmICghZXZQYXRoW2ldLmRhdGFzZXQpIGNvbnRpbnVlO1xuICAgICAgICB2YXIgcGF0aCA9IGV2UGF0aFtpXS5kYXRhc2V0LmZhUGF0aDtcbiAgICAgICAgaWYgKCFwYXRoKSBjb250aW51ZTtcblxuICAgICAgICAvLyBTdG9wIGZ1cnRoZXIgZXZlbnQgcHJvcG9nYXRpb24gYW5kIHBhdGggdHJhdmVyc2FsIGFzIHNvb24gYXMgdGhlXG4gICAgICAgIC8vIGZpcnN0IEVsZW1lbnRDYWNoZSBzdWJzY3JpYmluZyBmb3IgdGhlIGVtaXR0ZWQgZXZlbnQgaGFzIGJlZW4gZm91bmQuXG4gICAgICAgIGlmICh0aGlzLl9lbGVtZW50c1twYXRoXS5zdWJzY3JpYmVbZXYudHlwZV0pIHtcbiAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuXG4gICAgICAgICAgICAvLyBPcHRpb25hbGx5IHByZXZlbnREZWZhdWx0LiBUaGlzIG5lZWRzIGZvcnRoZXIgY29uc2lkZXJhdGlvbiBhbmRcbiAgICAgICAgICAgIC8vIHNob3VsZCBiZSBvcHRpb25hbC4gRXZlbnR1YWxseSB0aGlzIHNob3VsZCBiZSBhIHNlcGFyYXRlIGNvbW1hbmQvXG4gICAgICAgICAgICAvLyBtZXRob2QuXG4gICAgICAgICAgICBpZiAodGhpcy5fZWxlbWVudHNbcGF0aF0ucHJldmVudERlZmF1bHRbZXYudHlwZV0pIHtcbiAgICAgICAgICAgICAgICBldi5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgTm9ybWFsaXplZEV2ZW50Q29uc3RydWN0b3IgPSBldmVudE1hcFtldi50eXBlXVswXTtcblxuICAgICAgICAgICAgLy8gRmluYWxseSBzZW5kIHRoZSBldmVudCB0byB0aGUgV29ya2VyIFRocmVhZCB0aHJvdWdoIHRoZVxuICAgICAgICAgICAgLy8gY29tcG9zaXRvci5cbiAgICAgICAgICAgIHRoaXMuX2NvbXBvc2l0b3Iuc2VuZEV2ZW50KHBhdGgsIGV2LnR5cGUsIG5ldyBOb3JtYWxpemVkRXZlbnRDb25zdHJ1Y3RvcihldikpO1xuXG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblxuLyoqXG4gKiBnZXRTaXplT2YgZ2V0cyB0aGUgZG9tIHNpemUgb2YgYSBwYXJ0aWN1bGFyIERPTSBlbGVtZW50LiAgVGhpcyBpc1xuICogbmVlZGVkIGZvciByZW5kZXIgc2l6aW5nIGluIHRoZSBzY2VuZSBncmFwaC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggcGF0aCBvZiB0aGUgTm9kZSBpbiB0aGUgc2NlbmUgZ3JhcGhcbiAqXG4gKiBAcmV0dXJuIHtBcnJheX0gYSB2ZWMzIG9mIHRoZSBvZmZzZXQgc2l6ZSBvZiB0aGUgZG9tIGVsZW1lbnRcbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLmdldFNpemVPZiA9IGZ1bmN0aW9uIGdldFNpemVPZihwYXRoKSB7XG4gICAgdmFyIGVsZW1lbnQgPSB0aGlzLl9lbGVtZW50c1twYXRoXTtcbiAgICBpZiAoIWVsZW1lbnQpIHJldHVybiBudWxsO1xuXG4gICAgdmFyIHJlcyA9IHt2YWw6IGVsZW1lbnQuc2l6ZX07XG4gICAgdGhpcy5fY29tcG9zaXRvci5zZW5kRXZlbnQocGF0aCwgJ3Jlc2l6ZScsIHJlcyk7XG4gICAgcmV0dXJuIHJlcztcbn07XG5cbmZ1bmN0aW9uIF9nZXRQYXRoKGV2KSB7XG4gICAgLy8gVE9ETyBtb3ZlIGludG8gX3RyaWdnZXJFdmVudCwgYXZvaWQgb2JqZWN0IGFsbG9jYXRpb25cbiAgICB2YXIgcGF0aCA9IFtdO1xuICAgIHZhciBub2RlID0gZXYudGFyZ2V0O1xuICAgIHdoaWxlIChub2RlICE9PSBkb2N1bWVudC5ib2R5KSB7XG4gICAgICAgIHBhdGgucHVzaChub2RlKTtcbiAgICAgICAgbm9kZSA9IG5vZGUucGFyZW50Tm9kZTtcbiAgICB9XG4gICAgcmV0dXJuIHBhdGg7XG59XG5cblxuLyoqXG4gKiBEZXRlcm1pbmVzIHRoZSBzaXplIG9mIHRoZSBjb250ZXh0IGJ5IHF1ZXJ5aW5nIHRoZSBET00gZm9yIGBvZmZzZXRXaWR0aGAgYW5kXG4gKiBgb2Zmc2V0SGVpZ2h0YC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7QXJyYXl9IE9mZnNldCBzaXplLlxuICovXG5ET01SZW5kZXJlci5wcm90b3R5cGUuZ2V0U2l6ZSA9IGZ1bmN0aW9uIGdldFNpemUoKSB7XG4gICAgdGhpcy5fc2l6ZVswXSA9IHRoaXMuX3Jvb3QuZWxlbWVudC5vZmZzZXRXaWR0aDtcbiAgICB0aGlzLl9zaXplWzFdID0gdGhpcy5fcm9vdC5lbGVtZW50Lm9mZnNldEhlaWdodDtcbiAgICByZXR1cm4gdGhpcy5fc2l6ZTtcbn07XG5cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5fZ2V0U2l6ZSA9IERPTVJlbmRlcmVyLnByb3RvdHlwZS5nZXRTaXplO1xuXG5cbi8qKlxuICogRXhlY3V0ZXMgdGhlIHJldHJpZXZlZCBkcmF3IGNvbW1hbmRzLiBEcmF3IGNvbW1hbmRzIG9ubHkgcmVmZXIgdG8gdGhlXG4gKiBjcm9zcy1icm93c2VyIG5vcm1hbGl6ZWQgYHRyYW5zZm9ybWAgcHJvcGVydHkuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSByZW5kZXJTdGF0ZSBkZXNjcmlwdGlvblxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5kcmF3ID0gZnVuY3Rpb24gZHJhdyhyZW5kZXJTdGF0ZSkge1xuICAgIGlmIChyZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZURpcnR5KSB7XG4gICAgICAgIHRoaXMucGVyc3BlY3RpdmVEaXJ0eSA9IHRydWU7XG5cbiAgICAgICAgdGhpcy5wZXJzcGVjdGl2ZVRyYW5zZm9ybVswXSA9IHJlbmRlclN0YXRlLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzBdO1xuICAgICAgICB0aGlzLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzFdID0gcmVuZGVyU3RhdGUucGVyc3BlY3RpdmVUcmFuc2Zvcm1bMV07XG4gICAgICAgIHRoaXMucGVyc3BlY3RpdmVUcmFuc2Zvcm1bMl0gPSByZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsyXTtcbiAgICAgICAgdGhpcy5wZXJzcGVjdGl2ZVRyYW5zZm9ybVszXSA9IHJlbmRlclN0YXRlLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzNdO1xuXG4gICAgICAgIHRoaXMucGVyc3BlY3RpdmVUcmFuc2Zvcm1bNF0gPSByZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZVRyYW5zZm9ybVs0XTtcbiAgICAgICAgdGhpcy5wZXJzcGVjdGl2ZVRyYW5zZm9ybVs1XSA9IHJlbmRlclN0YXRlLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzVdO1xuICAgICAgICB0aGlzLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzZdID0gcmVuZGVyU3RhdGUucGVyc3BlY3RpdmVUcmFuc2Zvcm1bNl07XG4gICAgICAgIHRoaXMucGVyc3BlY3RpdmVUcmFuc2Zvcm1bN10gPSByZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZVRyYW5zZm9ybVs3XTtcblxuICAgICAgICB0aGlzLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzhdID0gcmVuZGVyU3RhdGUucGVyc3BlY3RpdmVUcmFuc2Zvcm1bOF07XG4gICAgICAgIHRoaXMucGVyc3BlY3RpdmVUcmFuc2Zvcm1bOV0gPSByZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZVRyYW5zZm9ybVs5XTtcbiAgICAgICAgdGhpcy5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsxMF0gPSByZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsxMF07XG4gICAgICAgIHRoaXMucGVyc3BlY3RpdmVUcmFuc2Zvcm1bMTFdID0gcmVuZGVyU3RhdGUucGVyc3BlY3RpdmVUcmFuc2Zvcm1bMTFdO1xuXG4gICAgICAgIHRoaXMucGVyc3BlY3RpdmVUcmFuc2Zvcm1bMTJdID0gcmVuZGVyU3RhdGUucGVyc3BlY3RpdmVUcmFuc2Zvcm1bMTJdO1xuICAgICAgICB0aGlzLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzEzXSA9IHJlbmRlclN0YXRlLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzEzXTtcbiAgICAgICAgdGhpcy5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsxNF0gPSByZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsxNF07XG4gICAgICAgIHRoaXMucGVyc3BlY3RpdmVUcmFuc2Zvcm1bMTVdID0gcmVuZGVyU3RhdGUucGVyc3BlY3RpdmVUcmFuc2Zvcm1bMTVdO1xuICAgIH1cblxuICAgIGlmIChyZW5kZXJTdGF0ZS52aWV3RGlydHkgfHwgcmVuZGVyU3RhdGUucGVyc3BlY3RpdmVEaXJ0eSkge1xuICAgICAgICBtYXRoLm11bHRpcGx5KHRoaXMuX1ZQdHJhbnNmb3JtLCB0aGlzLnBlcnNwZWN0aXZlVHJhbnNmb3JtLCByZW5kZXJTdGF0ZS52aWV3VHJhbnNmb3JtKTtcbiAgICAgICAgdGhpcy5fcm9vdC5lbGVtZW50LnN0eWxlW1RSQU5TRk9STV0gPSB0aGlzLl9zdHJpbmdpZnlNYXRyaXgodGhpcy5fVlB0cmFuc2Zvcm0pO1xuICAgIH1cbn07XG5cblxuLyoqXG4gKiBJbnRlcm5hbCBoZWxwZXIgZnVuY3Rpb24gdXNlZCBmb3IgZW5zdXJpbmcgdGhhdCBhIHBhdGggaXMgY3VycmVudGx5IGxvYWRlZC5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcHJpdmF0ZVxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5fYXNzZXJ0UGF0aExvYWRlZCA9IGZ1bmN0aW9uIF9hc3NlclBhdGhMb2FkZWQoKSB7XG4gICAgaWYgKCF0aGlzLl9wYXRoKSB0aHJvdyBuZXcgRXJyb3IoJ3BhdGggbm90IGxvYWRlZCcpO1xufTtcblxuLyoqXG4gKiBJbnRlcm5hbCBoZWxwZXIgZnVuY3Rpb24gdXNlZCBmb3IgZW5zdXJpbmcgdGhhdCBhIHBhcmVudCBpcyBjdXJyZW50bHkgbG9hZGVkLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwcml2YXRlXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLl9hc3NlcnRQYXJlbnRMb2FkZWQgPSBmdW5jdGlvbiBfYXNzZXJ0UGFyZW50TG9hZGVkKCkge1xuICAgIGlmICghdGhpcy5fcGFyZW50KSB0aHJvdyBuZXcgRXJyb3IoJ3BhcmVudCBub3QgbG9hZGVkJyk7XG59O1xuXG4vKipcbiAqIEludGVybmFsIGhlbHBlciBmdW5jdGlvbiB1c2VkIGZvciBlbnN1cmluZyB0aGF0IGNoaWxkcmVuIGFyZSBjdXJyZW50bHlcbiAqIGxvYWRlZC5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcHJpdmF0ZVxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5fYXNzZXJ0Q2hpbGRyZW5Mb2FkZWQgPSBmdW5jdGlvbiBfYXNzZXJ0Q2hpbGRyZW5Mb2FkZWQoKSB7XG4gICAgaWYgKCF0aGlzLl9jaGlsZHJlbikgdGhyb3cgbmV3IEVycm9yKCdjaGlsZHJlbiBub3QgbG9hZGVkJyk7XG59O1xuXG4vKipcbiAqIEludGVybmFsIGhlbHBlciBmdW5jdGlvbiB1c2VkIGZvciBlbnN1cmluZyB0aGF0IGEgdGFyZ2V0IGlzIGN1cnJlbnRseSBsb2FkZWQuXG4gKlxuICogQG1ldGhvZCAgX2Fzc2VydFRhcmdldExvYWRlZFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5fYXNzZXJ0VGFyZ2V0TG9hZGVkID0gZnVuY3Rpb24gX2Fzc2VydFRhcmdldExvYWRlZCgpIHtcbiAgICBpZiAoIXRoaXMuX3RhcmdldCkgdGhyb3cgbmV3IEVycm9yKCdObyB0YXJnZXQgbG9hZGVkJyk7XG59O1xuXG4vKipcbiAqIEZpbmRzIGFuZCBzZXRzIHRoZSBwYXJlbnQgb2YgdGhlIGN1cnJlbnRseSBsb2FkZWQgZWxlbWVudCAocGF0aCkuXG4gKlxuICogQG1ldGhvZFxuICogQHByaXZhdGVcbiAqXG4gKiBAcmV0dXJuIHtFbGVtZW50Q2FjaGV9IFBhcmVudCBlbGVtZW50LlxuICovXG5ET01SZW5kZXJlci5wcm90b3R5cGUuZmluZFBhcmVudCA9IGZ1bmN0aW9uIGZpbmRQYXJlbnQgKCkge1xuICAgIHRoaXMuX2Fzc2VydFBhdGhMb2FkZWQoKTtcblxuICAgIHZhciBwYXRoID0gdGhpcy5fcGF0aDtcbiAgICB2YXIgcGFyZW50O1xuXG4gICAgd2hpbGUgKCFwYXJlbnQgJiYgcGF0aC5sZW5ndGgpIHtcbiAgICAgICAgcGF0aCA9IHBhdGguc3Vic3RyaW5nKDAsIHBhdGgubGFzdEluZGV4T2YoJy8nKSk7XG4gICAgICAgIHBhcmVudCA9IHRoaXMuX2VsZW1lbnRzW3BhdGhdO1xuICAgIH1cbiAgICB0aGlzLl9wYXJlbnQgPSBwYXJlbnQ7XG4gICAgcmV0dXJuIHBhcmVudDtcbn07XG5cblxuLyoqXG4gKiBGaW5kcyBhbGwgY2hpbGRyZW4gb2YgdGhlIGN1cnJlbnRseSBsb2FkZWQgZWxlbWVudC5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcHJpdmF0ZVxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IE91dHB1dC1BcnJheSB1c2VkIGZvciB3cml0aW5nIHRvIChzdWJzZXF1ZW50bHkgYXBwZW5kaW5nIGNoaWxkcmVuKVxuICpcbiAqIEByZXR1cm4ge0FycmF5fSBhcnJheSBvZiBjaGlsZHJlbiBlbGVtZW50c1xuICovXG5ET01SZW5kZXJlci5wcm90b3R5cGUuZmluZENoaWxkcmVuID0gZnVuY3Rpb24gZmluZENoaWxkcmVuKGFycmF5KSB7XG4gICAgLy8gVE9ETzogT3B0aW1pemUgbWUuXG4gICAgdGhpcy5fYXNzZXJ0UGF0aExvYWRlZCgpO1xuXG4gICAgdmFyIHBhdGggPSB0aGlzLl9wYXRoICsgJy8nO1xuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXModGhpcy5fZWxlbWVudHMpO1xuICAgIHZhciBpID0gMDtcbiAgICB2YXIgbGVuO1xuICAgIGFycmF5ID0gYXJyYXkgPyBhcnJheSA6IHRoaXMuX2NoaWxkcmVuO1xuXG4gICAgdGhpcy5fY2hpbGRyZW4ubGVuZ3RoID0gMDtcblxuICAgIHdoaWxlIChpIDwga2V5cy5sZW5ndGgpIHtcbiAgICAgICAgaWYgKGtleXNbaV0uaW5kZXhPZihwYXRoKSA9PT0gLTEgfHwga2V5c1tpXSA9PT0gcGF0aCkga2V5cy5zcGxpY2UoaSwgMSk7XG4gICAgICAgIGVsc2UgaSsrO1xuICAgIH1cbiAgICB2YXIgY3VycmVudFBhdGg7XG4gICAgdmFyIGogPSAwO1xuICAgIGZvciAoaSA9IDAgOyBpIDwga2V5cy5sZW5ndGggOyBpKyspIHtcbiAgICAgICAgY3VycmVudFBhdGggPSBrZXlzW2ldO1xuICAgICAgICBmb3IgKGogPSAwIDsgaiA8IGtleXMubGVuZ3RoIDsgaisrKSB7XG4gICAgICAgICAgICBpZiAoaSAhPT0gaiAmJiBrZXlzW2pdLmluZGV4T2YoY3VycmVudFBhdGgpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIGtleXMuc3BsaWNlKGosIDEpO1xuICAgICAgICAgICAgICAgIGktLTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGkgPSAwLCBsZW4gPSBrZXlzLmxlbmd0aCA7IGkgPCBsZW4gOyBpKyspXG4gICAgICAgIGFycmF5W2ldID0gdGhpcy5fZWxlbWVudHNba2V5c1tpXV07XG5cbiAgICByZXR1cm4gYXJyYXk7XG59O1xuXG5cbi8qKlxuICogVXNlZCBmb3IgZGV0ZXJtaW5pbmcgdGhlIHRhcmdldCBsb2FkZWQgdW5kZXIgdGhlIGN1cnJlbnQgcGF0aC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7RWxlbWVudENhY2hlfHVuZGVmaW5lZH0gRWxlbWVudCBsb2FkZWQgdW5kZXIgZGVmaW5lZCBwYXRoLlxuICovXG5ET01SZW5kZXJlci5wcm90b3R5cGUuZmluZFRhcmdldCA9IGZ1bmN0aW9uIGZpbmRUYXJnZXQoKSB7XG4gICAgdGhpcy5fdGFyZ2V0ID0gdGhpcy5fZWxlbWVudHNbdGhpcy5fcGF0aF07XG4gICAgcmV0dXJuIHRoaXMuX3RhcmdldDtcbn07XG5cblxuLyoqXG4gKiBMb2FkcyB0aGUgcGFzc2VkIGluIHBhdGguXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFBhdGggdG8gYmUgbG9hZGVkXG4gKlxuICogQHJldHVybiB7U3RyaW5nfSBMb2FkZWQgcGF0aFxuICovXG5ET01SZW5kZXJlci5wcm90b3R5cGUubG9hZFBhdGggPSBmdW5jdGlvbiBsb2FkUGF0aCAocGF0aCkge1xuICAgIHRoaXMuX3BhdGggPSBwYXRoO1xuICAgIHJldHVybiB0aGlzLl9wYXRoO1xufTtcblxuXG4vKipcbiAqIEluc2VydHMgYSBET01FbGVtZW50IGF0IHRoZSBjdXJyZW50bHkgbG9hZGVkIHBhdGgsIGFzc3VtaW5nIG5vIHRhcmdldCBpc1xuICogbG9hZGVkLiBPbmx5IG9uZSBET01FbGVtZW50IGNhbiBiZSBhc3NvY2lhdGVkIHdpdGggZWFjaCBwYXRoLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdGFnTmFtZSBUYWcgbmFtZSAoY2FwaXRhbGl6YXRpb24gd2lsbCBiZSBub3JtYWxpemVkKS5cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5ET01SZW5kZXJlci5wcm90b3R5cGUuaW5zZXJ0RWwgPSBmdW5jdGlvbiBpbnNlcnRFbCAodGFnTmFtZSkge1xuICAgIGlmICghdGhpcy5fdGFyZ2V0IHx8XG4gICAgICAgICB0aGlzLl90YXJnZXQuZWxlbWVudC50YWdOYW1lLnRvTG93ZXJDYXNlKCkgPT09IHRhZ05hbWUudG9Mb3dlckNhc2UoKSkge1xuXG4gICAgICAgIHRoaXMuZmluZFBhcmVudCgpO1xuICAgICAgICB0aGlzLmZpbmRDaGlsZHJlbigpO1xuXG4gICAgICAgIHRoaXMuX2Fzc2VydFBhcmVudExvYWRlZCgpO1xuICAgICAgICB0aGlzLl9hc3NlcnRDaGlsZHJlbkxvYWRlZCgpO1xuXG4gICAgICAgIGlmICh0aGlzLl90YXJnZXQpIHRoaXMuX3BhcmVudC5lbGVtZW50LnJlbW92ZUNoaWxkKHRoaXMuX3RhcmdldC5lbGVtZW50KTtcblxuICAgICAgICB0aGlzLl90YXJnZXQgPSBuZXcgRWxlbWVudENhY2hlKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnTmFtZSksIHRoaXMuX3BhdGgpO1xuICAgICAgICB0aGlzLl9wYXJlbnQuZWxlbWVudC5hcHBlbmRDaGlsZCh0aGlzLl90YXJnZXQuZWxlbWVudCk7XG4gICAgICAgIHRoaXMuX2VsZW1lbnRzW3RoaXMuX3BhdGhdID0gdGhpcy5fdGFyZ2V0O1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSB0aGlzLl9jaGlsZHJlbi5sZW5ndGggOyBpIDwgbGVuIDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLl90YXJnZXQuZWxlbWVudC5hcHBlbmRDaGlsZCh0aGlzLl9jaGlsZHJlbltpXS5lbGVtZW50KTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblxuLyoqXG4gKiBTZXRzIGEgcHJvcGVydHkgb24gdGhlIGN1cnJlbnRseSBsb2FkZWQgdGFyZ2V0LlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBQcm9wZXJ0eSBuYW1lIChlLmcuIGJhY2tncm91bmQsIGNvbG9yLCBmb250KVxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIFByb3BydHkgdmFsdWUgKGUuZy4gYmxhY2ssIDIwcHgpXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLnNldFByb3BlcnR5ID0gZnVuY3Rpb24gc2V0UHJvcGVydHkgKG5hbWUsIHZhbHVlKSB7XG4gICAgdGhpcy5fYXNzZXJ0VGFyZ2V0TG9hZGVkKCk7XG4gICAgdGhpcy5fdGFyZ2V0LmVsZW1lbnQuc3R5bGVbbmFtZV0gPSB2YWx1ZTtcbn07XG5cblxuLyoqXG4gKiBTZXRzIHRoZSBzaXplIG9mIHRoZSBjdXJyZW50bHkgbG9hZGVkIHRhcmdldC5cbiAqIFJlbW92ZXMgYW55IGV4cGxpY2l0IHNpemluZyBjb25zdHJhaW50cyB3aGVuIHBhc3NlZCBpbiBgZmFsc2VgXG4gKiAoXCJ0cnVlLXNpemluZ1wiKS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ8ZmFsc2V9IHdpZHRoICAgV2lkdGggdG8gYmUgc2V0LlxuICogQHBhcmFtIHtOdW1iZXJ8ZmFsc2V9IGhlaWdodCAgSGVpZ2h0IHRvIGJlIHNldC5cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5ET01SZW5kZXJlci5wcm90b3R5cGUuc2V0U2l6ZSA9IGZ1bmN0aW9uIHNldFNpemUgKHdpZHRoLCBoZWlnaHQpIHtcbiAgICB0aGlzLl9hc3NlcnRUYXJnZXRMb2FkZWQoKTtcblxuICAgIHRoaXMuc2V0V2lkdGgod2lkdGgpO1xuICAgIHRoaXMuc2V0SGVpZ2h0KGhlaWdodCk7XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIHdpZHRoIG9mIHRoZSBjdXJyZW50bHkgbG9hZGVkIHRhcmdldC5cbiAqIFJlbW92ZXMgYW55IGV4cGxpY2l0IHNpemluZyBjb25zdHJhaW50cyB3aGVuIHBhc3NlZCBpbiBgZmFsc2VgXG4gKiAoXCJ0cnVlLXNpemluZ1wiKS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ8ZmFsc2V9IHdpZHRoIFdpZHRoIHRvIGJlIHNldC5cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5ET01SZW5kZXJlci5wcm90b3R5cGUuc2V0V2lkdGggPSBmdW5jdGlvbiBzZXRXaWR0aCh3aWR0aCkge1xuICAgIHRoaXMuX2Fzc2VydFRhcmdldExvYWRlZCgpO1xuXG4gICAgdmFyIGNvbnRlbnRXcmFwcGVyID0gdGhpcy5fdGFyZ2V0LmNvbnRlbnQ7XG5cbiAgICBpZiAod2lkdGggPT09IGZhbHNlKSB7XG4gICAgICAgIHRoaXMuX3RhcmdldC5leHBsaWNpdFdpZHRoID0gdHJ1ZTtcbiAgICAgICAgaWYgKGNvbnRlbnRXcmFwcGVyKSBjb250ZW50V3JhcHBlci5zdHlsZS53aWR0aCA9ICcnO1xuICAgICAgICB3aWR0aCA9IGNvbnRlbnRXcmFwcGVyID8gY29udGVudFdyYXBwZXIub2Zmc2V0V2lkdGggOiAwO1xuICAgICAgICB0aGlzLl90YXJnZXQuZWxlbWVudC5zdHlsZS53aWR0aCA9IHdpZHRoICsgJ3B4JztcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRoaXMuX3RhcmdldC5leHBsaWNpdFdpZHRoID0gZmFsc2U7XG4gICAgICAgIGlmIChjb250ZW50V3JhcHBlcikgY29udGVudFdyYXBwZXIuc3R5bGUud2lkdGggPSB3aWR0aCArICdweCc7XG4gICAgICAgIHRoaXMuX3RhcmdldC5lbGVtZW50LnN0eWxlLndpZHRoID0gd2lkdGggKyAncHgnO1xuICAgIH1cblxuICAgIHRoaXMuX3RhcmdldC5zaXplWzBdID0gd2lkdGg7XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIGhlaWdodCBvZiB0aGUgY3VycmVudGx5IGxvYWRlZCB0YXJnZXQuXG4gKiBSZW1vdmVzIGFueSBleHBsaWNpdCBzaXppbmcgY29uc3RyYWludHMgd2hlbiBwYXNzZWQgaW4gYGZhbHNlYFxuICogKFwidHJ1ZS1zaXppbmdcIikuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfGZhbHNlfSBoZWlnaHQgSGVpZ2h0IHRvIGJlIHNldC5cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5ET01SZW5kZXJlci5wcm90b3R5cGUuc2V0SGVpZ2h0ID0gZnVuY3Rpb24gc2V0SGVpZ2h0KGhlaWdodCkge1xuICAgIHRoaXMuX2Fzc2VydFRhcmdldExvYWRlZCgpO1xuXG4gICAgdmFyIGNvbnRlbnRXcmFwcGVyID0gdGhpcy5fdGFyZ2V0LmNvbnRlbnQ7XG5cbiAgICBpZiAoaGVpZ2h0ID09PSBmYWxzZSkge1xuICAgICAgICB0aGlzLl90YXJnZXQuZXhwbGljaXRIZWlnaHQgPSB0cnVlO1xuICAgICAgICBpZiAoY29udGVudFdyYXBwZXIpIGNvbnRlbnRXcmFwcGVyLnN0eWxlLmhlaWdodCA9ICcnO1xuICAgICAgICBoZWlnaHQgPSBjb250ZW50V3JhcHBlciA/IGNvbnRlbnRXcmFwcGVyLm9mZnNldEhlaWdodCA6IDA7XG4gICAgICAgIHRoaXMuX3RhcmdldC5lbGVtZW50LnN0eWxlLmhlaWdodCA9IGhlaWdodCArICdweCc7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aGlzLl90YXJnZXQuZXhwbGljaXRIZWlnaHQgPSBmYWxzZTtcbiAgICAgICAgaWYgKGNvbnRlbnRXcmFwcGVyKSBjb250ZW50V3JhcHBlci5zdHlsZS5oZWlnaHQgPSBoZWlnaHQgKyAncHgnO1xuICAgICAgICB0aGlzLl90YXJnZXQuZWxlbWVudC5zdHlsZS5oZWlnaHQgPSBoZWlnaHQgKyAncHgnO1xuICAgIH1cblxuICAgIHRoaXMuX3RhcmdldC5zaXplWzFdID0gaGVpZ2h0O1xufTtcblxuLyoqXG4gKiBTZXRzIGFuIGF0dHJpYnV0ZSBvbiB0aGUgY3VycmVudGx5IGxvYWRlZCB0YXJnZXQuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIEF0dHJpYnV0ZSBuYW1lIChlLmcuIGhyZWYpXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWUgQXR0cmlidXRlIHZhbHVlIChlLmcuIGh0dHA6Ly9mYW1vdXMub3JnKVxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5zZXRBdHRyaWJ1dGUgPSBmdW5jdGlvbiBzZXRBdHRyaWJ1dGUobmFtZSwgdmFsdWUpIHtcbiAgICB0aGlzLl9hc3NlcnRUYXJnZXRMb2FkZWQoKTtcbiAgICB0aGlzLl90YXJnZXQuZWxlbWVudC5zZXRBdHRyaWJ1dGUobmFtZSwgdmFsdWUpO1xufTtcblxuLyoqXG4gKiBTZXRzIHRoZSBgaW5uZXJIVE1MYCBjb250ZW50IG9mIHRoZSBjdXJyZW50bHkgbG9hZGVkIHRhcmdldC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGNvbnRlbnQgQ29udGVudCB0byBiZSBzZXQgYXMgYGlubmVySFRNTGBcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5ET01SZW5kZXJlci5wcm90b3R5cGUuc2V0Q29udGVudCA9IGZ1bmN0aW9uIHNldENvbnRlbnQoY29udGVudCkge1xuICAgIHRoaXMuX2Fzc2VydFRhcmdldExvYWRlZCgpO1xuICAgIHRoaXMuZmluZENoaWxkcmVuKCk7XG5cbiAgICBpZiAoIXRoaXMuX3RhcmdldC5jb250ZW50KSB7XG4gICAgICAgIHRoaXMuX3RhcmdldC5jb250ZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIHRoaXMuX3RhcmdldC5jb250ZW50LmNsYXNzTGlzdC5hZGQoJ2ZhbW91cy1kb20tZWxlbWVudC1jb250ZW50Jyk7XG4gICAgICAgIHRoaXMuX3RhcmdldC5lbGVtZW50Lmluc2VydEJlZm9yZShcbiAgICAgICAgICAgIHRoaXMuX3RhcmdldC5jb250ZW50LFxuICAgICAgICAgICAgdGhpcy5fdGFyZ2V0LmVsZW1lbnQuZmlyc3RDaGlsZFxuICAgICAgICApO1xuICAgIH1cbiAgICB0aGlzLl90YXJnZXQuY29udGVudC5pbm5lckhUTUwgPSBjb250ZW50O1xuXG4gICAgdGhpcy5zZXRTaXplKFxuICAgICAgICB0aGlzLl90YXJnZXQuZXhwbGljaXRXaWR0aCA/IGZhbHNlIDogdGhpcy5fdGFyZ2V0LnNpemVbMF0sXG4gICAgICAgIHRoaXMuX3RhcmdldC5leHBsaWNpdEhlaWdodCA/IGZhbHNlIDogdGhpcy5fdGFyZ2V0LnNpemVbMV1cbiAgICApO1xufTtcblxuXG4vKipcbiAqIFNldHMgdGhlIHBhc3NlZCBpbiB0cmFuc2Zvcm0gbWF0cml4ICh3b3JsZCBzcGFjZSkuIEludmVydHMgdGhlIHBhcmVudCdzIHdvcmxkXG4gKiB0cmFuc2Zvcm0uXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7RmxvYXQzMkFycmF5fSB0cmFuc2Zvcm0gVGhlIHRyYW5zZm9ybSBmb3IgdGhlIGxvYWRlZCBET00gRWxlbWVudCBpbiB3b3JsZCBzcGFjZVxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5zZXRNYXRyaXggPSBmdW5jdGlvbiBzZXRNYXRyaXgodHJhbnNmb3JtKSB7XG4gICAgLy8gVE9ETyBEb24ndCBtdWx0aXBseSBtYXRyaWNzIGluIHRoZSBmaXJzdCBwbGFjZS5cbiAgICB0aGlzLl9hc3NlcnRUYXJnZXRMb2FkZWQoKTtcbiAgICB0aGlzLmZpbmRQYXJlbnQoKTtcbiAgICB2YXIgd29ybGRUcmFuc2Zvcm0gPSB0aGlzLl90YXJnZXQud29ybGRUcmFuc2Zvcm07XG4gICAgdmFyIGNoYW5nZWQgPSBmYWxzZTtcblxuICAgIHZhciBpO1xuICAgIHZhciBsZW47XG5cbiAgICBpZiAodHJhbnNmb3JtKVxuICAgICAgICBmb3IgKGkgPSAwLCBsZW4gPSAxNiA7IGkgPCBsZW4gOyBpKyspIHtcbiAgICAgICAgICAgIGNoYW5nZWQgPSBjaGFuZ2VkID8gY2hhbmdlZCA6IHdvcmxkVHJhbnNmb3JtW2ldID09PSB0cmFuc2Zvcm1baV07XG4gICAgICAgICAgICB3b3JsZFRyYW5zZm9ybVtpXSA9IHRyYW5zZm9ybVtpXTtcbiAgICAgICAgfVxuICAgIGVsc2UgY2hhbmdlZCA9IHRydWU7XG5cbiAgICBpZiAoY2hhbmdlZCkge1xuICAgICAgICBtYXRoLmludmVydCh0aGlzLl90YXJnZXQuaW52ZXJ0ZWRQYXJlbnQsIHRoaXMuX3BhcmVudC53b3JsZFRyYW5zZm9ybSk7XG4gICAgICAgIG1hdGgubXVsdGlwbHkodGhpcy5fdGFyZ2V0LmZpbmFsVHJhbnNmb3JtLCB0aGlzLl90YXJnZXQuaW52ZXJ0ZWRQYXJlbnQsIHdvcmxkVHJhbnNmb3JtKTtcblxuICAgICAgICAvLyBUT0RPOiB0aGlzIGlzIGEgdGVtcG9yYXJ5IGZpeCBmb3IgZHJhdyBjb21tYW5kc1xuICAgICAgICAvLyBjb21pbmcgaW4gb3V0IG9mIG9yZGVyXG4gICAgICAgIHZhciBjaGlsZHJlbiA9IHRoaXMuZmluZENoaWxkcmVuKFtdKTtcbiAgICAgICAgdmFyIHByZXZpb3VzUGF0aCA9IHRoaXMuX3BhdGg7XG4gICAgICAgIHZhciBwcmV2aW91c1RhcmdldCA9IHRoaXMuX3RhcmdldDtcbiAgICAgICAgZm9yIChpID0gMCwgbGVuID0gY2hpbGRyZW4ubGVuZ3RoIDsgaSA8IGxlbiA7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5fdGFyZ2V0ID0gY2hpbGRyZW5baV07XG4gICAgICAgICAgICB0aGlzLl9wYXRoID0gdGhpcy5fdGFyZ2V0LnBhdGg7XG4gICAgICAgICAgICB0aGlzLnNldE1hdHJpeCgpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3BhdGggPSBwcmV2aW91c1BhdGg7XG4gICAgICAgIHRoaXMuX3RhcmdldCA9IHByZXZpb3VzVGFyZ2V0O1xuICAgIH1cblxuICAgIHRoaXMuX3RhcmdldC5lbGVtZW50LnN0eWxlW1RSQU5TRk9STV0gPSB0aGlzLl9zdHJpbmdpZnlNYXRyaXgodGhpcy5fdGFyZ2V0LmZpbmFsVHJhbnNmb3JtKTtcbn07XG5cblxuLyoqXG4gKiBBZGRzIGEgY2xhc3MgdG8gdGhlIGNsYXNzTGlzdCBhc3NvY2lhdGVkIHdpdGggdGhlIGN1cnJlbnRseSBsb2FkZWQgdGFyZ2V0LlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZG9tQ2xhc3MgQ2xhc3MgbmFtZSB0byBiZSBhZGRlZCB0byB0aGUgY3VycmVudCB0YXJnZXQuXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLmFkZENsYXNzID0gZnVuY3Rpb24gYWRkQ2xhc3MoZG9tQ2xhc3MpIHtcbiAgICB0aGlzLl9hc3NlcnRUYXJnZXRMb2FkZWQoKTtcbiAgICB0aGlzLl90YXJnZXQuZWxlbWVudC5jbGFzc0xpc3QuYWRkKGRvbUNsYXNzKTtcbn07XG5cblxuLyoqXG4gKiBSZW1vdmVzIGEgY2xhc3MgZnJvbSB0aGUgY2xhc3NMaXN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgY3VycmVudGx5IGxvYWRlZFxuICogdGFyZ2V0LlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZG9tQ2xhc3MgQ2xhc3MgbmFtZSB0byBiZSByZW1vdmVkIGZyb20gY3VycmVudGx5IGxvYWRlZCB0YXJnZXQuXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLnJlbW92ZUNsYXNzID0gZnVuY3Rpb24gcmVtb3ZlQ2xhc3MoZG9tQ2xhc3MpIHtcbiAgICB0aGlzLl9hc3NlcnRUYXJnZXRMb2FkZWQoKTtcbiAgICB0aGlzLl90YXJnZXQuZWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKGRvbUNsYXNzKTtcbn07XG5cblxuLyoqXG4gKiBTdHJpbmdpZmllcyB0aGUgcGFzc2VkIGluIG1hdHJpeCBmb3Igc2V0dGluZyB0aGUgYHRyYW5zZm9ybWAgcHJvcGVydHkuXG4gKlxuICogQG1ldGhvZCAgX3N0cmluZ2lmeU1hdHJpeFxuICogQHByaXZhdGVcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBtICAgIE1hdHJpeCBhcyBhbiBhcnJheSBvciBhcnJheS1saWtlIG9iamVjdC5cbiAqIEByZXR1cm4ge1N0cmluZ30gICAgIFN0cmluZ2lmaWVkIG1hdHJpeCBhcyBgbWF0cml4M2RgLXByb3BlcnR5LlxuICovXG5ET01SZW5kZXJlci5wcm90b3R5cGUuX3N0cmluZ2lmeU1hdHJpeCA9IGZ1bmN0aW9uIF9zdHJpbmdpZnlNYXRyaXgobSkge1xuICAgIHZhciByID0gJ21hdHJpeDNkKCc7XG5cbiAgICByICs9IChtWzBdIDwgMC4wMDAwMDEgJiYgbVswXSA+IC0wLjAwMDAwMSkgPyAnMCwnIDogbVswXSArICcsJztcbiAgICByICs9IChtWzFdIDwgMC4wMDAwMDEgJiYgbVsxXSA+IC0wLjAwMDAwMSkgPyAnMCwnIDogbVsxXSArICcsJztcbiAgICByICs9IChtWzJdIDwgMC4wMDAwMDEgJiYgbVsyXSA+IC0wLjAwMDAwMSkgPyAnMCwnIDogbVsyXSArICcsJztcbiAgICByICs9IChtWzNdIDwgMC4wMDAwMDEgJiYgbVszXSA+IC0wLjAwMDAwMSkgPyAnMCwnIDogbVszXSArICcsJztcbiAgICByICs9IChtWzRdIDwgMC4wMDAwMDEgJiYgbVs0XSA+IC0wLjAwMDAwMSkgPyAnMCwnIDogbVs0XSArICcsJztcbiAgICByICs9IChtWzVdIDwgMC4wMDAwMDEgJiYgbVs1XSA+IC0wLjAwMDAwMSkgPyAnMCwnIDogbVs1XSArICcsJztcbiAgICByICs9IChtWzZdIDwgMC4wMDAwMDEgJiYgbVs2XSA+IC0wLjAwMDAwMSkgPyAnMCwnIDogbVs2XSArICcsJztcbiAgICByICs9IChtWzddIDwgMC4wMDAwMDEgJiYgbVs3XSA+IC0wLjAwMDAwMSkgPyAnMCwnIDogbVs3XSArICcsJztcbiAgICByICs9IChtWzhdIDwgMC4wMDAwMDEgJiYgbVs4XSA+IC0wLjAwMDAwMSkgPyAnMCwnIDogbVs4XSArICcsJztcbiAgICByICs9IChtWzldIDwgMC4wMDAwMDEgJiYgbVs5XSA+IC0wLjAwMDAwMSkgPyAnMCwnIDogbVs5XSArICcsJztcbiAgICByICs9IChtWzEwXSA8IDAuMDAwMDAxICYmIG1bMTBdID4gLTAuMDAwMDAxKSA/ICcwLCcgOiBtWzEwXSArICcsJztcbiAgICByICs9IChtWzExXSA8IDAuMDAwMDAxICYmIG1bMTFdID4gLTAuMDAwMDAxKSA/ICcwLCcgOiBtWzExXSArICcsJztcbiAgICByICs9IChtWzEyXSA8IDAuMDAwMDAxICYmIG1bMTJdID4gLTAuMDAwMDAxKSA/ICcwLCcgOiBtWzEyXSArICcsJztcbiAgICByICs9IChtWzEzXSA8IDAuMDAwMDAxICYmIG1bMTNdID4gLTAuMDAwMDAxKSA/ICcwLCcgOiBtWzEzXSArICcsJztcbiAgICByICs9IChtWzE0XSA8IDAuMDAwMDAxICYmIG1bMTRdID4gLTAuMDAwMDAxKSA/ICcwLCcgOiBtWzE0XSArICcsJztcblxuICAgIHIgKz0gbVsxNV0gKyAnKSc7XG4gICAgcmV0dXJuIHI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IERPTVJlbmRlcmVyO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqIFxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqIFxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICogXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKiBcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuLy8gVHJhbnNmb3JtIGlkZW50aXR5IG1hdHJpeC4gXG52YXIgaWRlbnQgPSBbXG4gICAgMSwgMCwgMCwgMCxcbiAgICAwLCAxLCAwLCAwLFxuICAgIDAsIDAsIDEsIDAsXG4gICAgMCwgMCwgMCwgMVxuXTtcblxuLyoqXG4gKiBFbGVtZW50Q2FjaGUgaXMgYmVpbmcgdXNlZCBmb3Iga2VlcGluZyB0cmFjayBvZiBhbiBlbGVtZW50J3MgRE9NIEVsZW1lbnQsXG4gKiBwYXRoLCB3b3JsZCB0cmFuc2Zvcm0sIGludmVydGVkIHBhcmVudCwgZmluYWwgdHJhbnNmb3JtIChhcyBiZWluZyB1c2VkIGZvclxuICogc2V0dGluZyB0aGUgYWN0dWFsIGB0cmFuc2Zvcm1gLXByb3BlcnR5KSBhbmQgcG9zdCByZW5kZXIgc2l6ZSAoZmluYWwgc2l6ZSBhc1xuICogYmVpbmcgcmVuZGVyZWQgdG8gdGhlIERPTSkuXG4gKiBcbiAqIEBjbGFzcyBFbGVtZW50Q2FjaGVcbiAqICBcbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxlbWVudCBET01FbGVtZW50XG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBQYXRoIHVzZWQgZm9yIHVuaXF1ZWx5IGlkZW50aWZ5aW5nIHRoZSBsb2NhdGlvbiBpbiB0aGUgc2NlbmUgZ3JhcGguXG4gKi8gXG5mdW5jdGlvbiBFbGVtZW50Q2FjaGUgKGVsZW1lbnQsIHBhdGgpIHtcbiAgICB0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMucGF0aCA9IHBhdGg7XG4gICAgdGhpcy5jb250ZW50ID0gbnVsbDtcbiAgICB0aGlzLnNpemUgPSBuZXcgSW50MTZBcnJheSgzKTtcbiAgICB0aGlzLmV4cGxpY2l0SGVpZ2h0ID0gZmFsc2U7XG4gICAgdGhpcy5leHBsaWNpdFdpZHRoID0gZmFsc2U7XG4gICAgdGhpcy53b3JsZFRyYW5zZm9ybSA9IG5ldyBGbG9hdDMyQXJyYXkoaWRlbnQpO1xuICAgIHRoaXMuaW52ZXJ0ZWRQYXJlbnQgPSBuZXcgRmxvYXQzMkFycmF5KGlkZW50KTtcbiAgICB0aGlzLmZpbmFsVHJhbnNmb3JtID0gbmV3IEZsb2F0MzJBcnJheShpZGVudCk7XG4gICAgdGhpcy5wb3N0UmVuZGVyU2l6ZSA9IG5ldyBGbG9hdDMyQXJyYXkoMik7XG4gICAgdGhpcy5saXN0ZW5lcnMgPSB7fTtcbiAgICB0aGlzLnByZXZlbnREZWZhdWx0ID0ge307XG4gICAgdGhpcy5zdWJzY3JpYmUgPSB7fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBFbGVtZW50Q2FjaGU7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQSBtZXRob2QgZm9yIGludmVydGluZyBhIHRyYW5zZm9ybSBtYXRyaXhcbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtBcnJheX0gb3V0IGFycmF5IHRvIHN0b3JlIHRoZSByZXR1cm4gb2YgdGhlIGludmVyc2lvblxuICogQHBhcmFtIHtBcnJheX0gYSB0cmFuc2Zvcm0gbWF0cml4IHRvIGludmVyc2VcbiAqXG4gKiBAcmV0dXJuIHtBcnJheX0gb3V0XG4gKiAgIG91dHB1dCBhcnJheSB0aGF0IGlzIHN0b3JpbmcgdGhlIHRyYW5zZm9ybSBtYXRyaXhcbiAqL1xuZnVuY3Rpb24gaW52ZXJ0IChvdXQsIGEpIHtcbiAgICB2YXIgYTAwID0gYVswXSwgYTAxID0gYVsxXSwgYTAyID0gYVsyXSwgYTAzID0gYVszXSxcbiAgICAgICAgYTEwID0gYVs0XSwgYTExID0gYVs1XSwgYTEyID0gYVs2XSwgYTEzID0gYVs3XSxcbiAgICAgICAgYTIwID0gYVs4XSwgYTIxID0gYVs5XSwgYTIyID0gYVsxMF0sIGEyMyA9IGFbMTFdLFxuICAgICAgICBhMzAgPSBhWzEyXSwgYTMxID0gYVsxM10sIGEzMiA9IGFbMTRdLCBhMzMgPSBhWzE1XSxcblxuICAgICAgICBiMDAgPSBhMDAgKiBhMTEgLSBhMDEgKiBhMTAsXG4gICAgICAgIGIwMSA9IGEwMCAqIGExMiAtIGEwMiAqIGExMCxcbiAgICAgICAgYjAyID0gYTAwICogYTEzIC0gYTAzICogYTEwLFxuICAgICAgICBiMDMgPSBhMDEgKiBhMTIgLSBhMDIgKiBhMTEsXG4gICAgICAgIGIwNCA9IGEwMSAqIGExMyAtIGEwMyAqIGExMSxcbiAgICAgICAgYjA1ID0gYTAyICogYTEzIC0gYTAzICogYTEyLFxuICAgICAgICBiMDYgPSBhMjAgKiBhMzEgLSBhMjEgKiBhMzAsXG4gICAgICAgIGIwNyA9IGEyMCAqIGEzMiAtIGEyMiAqIGEzMCxcbiAgICAgICAgYjA4ID0gYTIwICogYTMzIC0gYTIzICogYTMwLFxuICAgICAgICBiMDkgPSBhMjEgKiBhMzIgLSBhMjIgKiBhMzEsXG4gICAgICAgIGIxMCA9IGEyMSAqIGEzMyAtIGEyMyAqIGEzMSxcbiAgICAgICAgYjExID0gYTIyICogYTMzIC0gYTIzICogYTMyLFxuXG4gICAgICAgIC8vIENhbGN1bGF0ZSB0aGUgZGV0ZXJtaW5hbnRcbiAgICAgICAgZGV0ID0gYjAwICogYjExIC0gYjAxICogYjEwICsgYjAyICogYjA5ICsgYjAzICogYjA4IC0gYjA0ICogYjA3ICsgYjA1ICogYjA2O1xuXG4gICAgaWYgKCFkZXQpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGRldCA9IDEuMCAvIGRldDtcblxuICAgIG91dFswXSA9IChhMTEgKiBiMTEgLSBhMTIgKiBiMTAgKyBhMTMgKiBiMDkpICogZGV0O1xuICAgIG91dFsxXSA9IChhMDIgKiBiMTAgLSBhMDEgKiBiMTEgLSBhMDMgKiBiMDkpICogZGV0O1xuICAgIG91dFsyXSA9IChhMzEgKiBiMDUgLSBhMzIgKiBiMDQgKyBhMzMgKiBiMDMpICogZGV0O1xuICAgIG91dFszXSA9IChhMjIgKiBiMDQgLSBhMjEgKiBiMDUgLSBhMjMgKiBiMDMpICogZGV0O1xuICAgIG91dFs0XSA9IChhMTIgKiBiMDggLSBhMTAgKiBiMTEgLSBhMTMgKiBiMDcpICogZGV0O1xuICAgIG91dFs1XSA9IChhMDAgKiBiMTEgLSBhMDIgKiBiMDggKyBhMDMgKiBiMDcpICogZGV0O1xuICAgIG91dFs2XSA9IChhMzIgKiBiMDIgLSBhMzAgKiBiMDUgLSBhMzMgKiBiMDEpICogZGV0O1xuICAgIG91dFs3XSA9IChhMjAgKiBiMDUgLSBhMjIgKiBiMDIgKyBhMjMgKiBiMDEpICogZGV0O1xuICAgIG91dFs4XSA9IChhMTAgKiBiMTAgLSBhMTEgKiBiMDggKyBhMTMgKiBiMDYpICogZGV0O1xuICAgIG91dFs5XSA9IChhMDEgKiBiMDggLSBhMDAgKiBiMTAgLSBhMDMgKiBiMDYpICogZGV0O1xuICAgIG91dFsxMF0gPSAoYTMwICogYjA0IC0gYTMxICogYjAyICsgYTMzICogYjAwKSAqIGRldDtcbiAgICBvdXRbMTFdID0gKGEyMSAqIGIwMiAtIGEyMCAqIGIwNCAtIGEyMyAqIGIwMCkgKiBkZXQ7XG4gICAgb3V0WzEyXSA9IChhMTEgKiBiMDcgLSBhMTAgKiBiMDkgLSBhMTIgKiBiMDYpICogZGV0O1xuICAgIG91dFsxM10gPSAoYTAwICogYjA5IC0gYTAxICogYjA3ICsgYTAyICogYjA2KSAqIGRldDtcbiAgICBvdXRbMTRdID0gKGEzMSAqIGIwMSAtIGEzMCAqIGIwMyAtIGEzMiAqIGIwMCkgKiBkZXQ7XG4gICAgb3V0WzE1XSA9IChhMjAgKiBiMDMgLSBhMjEgKiBiMDEgKyBhMjIgKiBiMDApICogZGV0O1xuXG4gICAgcmV0dXJuIG91dDtcbn1cblxuLyoqXG4gKiBBIG1ldGhvZCBmb3IgbXVsdGlwbHlpbmcgdHdvIG1hdHJpY2llc1xuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBvdXQgYXJyYXkgdG8gc3RvcmUgdGhlIHJldHVybiBvZiB0aGUgbXVsdGlwbGljYXRpb25cbiAqIEBwYXJhbSB7QXJyYXl9IGEgdHJhbnNmb3JtIG1hdHJpeCB0byBtdWx0aXBseVxuICogQHBhcmFtIHtBcnJheX0gYiB0cmFuc2Zvcm0gbWF0cml4IHRvIG11bHRpcGx5XG4gKlxuICogQHJldHVybiB7QXJyYXl9IG91dFxuICogICBvdXRwdXQgYXJyYXkgdGhhdCBpcyBzdG9yaW5nIHRoZSB0cmFuc2Zvcm0gbWF0cml4XG4gKi9cbmZ1bmN0aW9uIG11bHRpcGx5IChvdXQsIGEsIGIpIHtcbiAgICB2YXIgYTAwID0gYVswXSwgYTAxID0gYVsxXSwgYTAyID0gYVsyXSwgYTAzID0gYVszXSxcbiAgICAgICAgYTEwID0gYVs0XSwgYTExID0gYVs1XSwgYTEyID0gYVs2XSwgYTEzID0gYVs3XSxcbiAgICAgICAgYTIwID0gYVs4XSwgYTIxID0gYVs5XSwgYTIyID0gYVsxMF0sIGEyMyA9IGFbMTFdLFxuICAgICAgICBhMzAgPSBhWzEyXSwgYTMxID0gYVsxM10sIGEzMiA9IGFbMTRdLCBhMzMgPSBhWzE1XSxcblxuICAgICAgICBiMCA9IGJbMF0sIGIxID0gYlsxXSwgYjIgPSBiWzJdLCBiMyA9IGJbM10sXG4gICAgICAgIGI0ID0gYls0XSwgYjUgPSBiWzVdLCBiNiA9IGJbNl0sIGI3ID0gYls3XSxcbiAgICAgICAgYjggPSBiWzhdLCBiOSA9IGJbOV0sIGIxMCA9IGJbMTBdLCBiMTEgPSBiWzExXSxcbiAgICAgICAgYjEyID0gYlsxMl0sIGIxMyA9IGJbMTNdLCBiMTQgPSBiWzE0XSwgYjE1ID0gYlsxNV07XG5cbiAgICB2YXIgY2hhbmdlZCA9IGZhbHNlO1xuICAgIHZhciBvdXQwLCBvdXQxLCBvdXQyLCBvdXQzO1xuXG4gICAgb3V0MCA9IGIwKmEwMCArIGIxKmExMCArIGIyKmEyMCArIGIzKmEzMDtcbiAgICBvdXQxID0gYjAqYTAxICsgYjEqYTExICsgYjIqYTIxICsgYjMqYTMxO1xuICAgIG91dDIgPSBiMCphMDIgKyBiMSphMTIgKyBiMiphMjIgKyBiMyphMzI7XG4gICAgb3V0MyA9IGIwKmEwMyArIGIxKmExMyArIGIyKmEyMyArIGIzKmEzMztcblxuICAgIGNoYW5nZWQgPSBjaGFuZ2VkID9cbiAgICAgICAgICAgICAgY2hhbmdlZCA6IG91dDAgPT09IG91dFswXSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0MSA9PT0gb3V0WzFdIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQyID09PSBvdXRbMl0gfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dDMgPT09IG91dFszXTtcblxuICAgIG91dFswXSA9IG91dDA7XG4gICAgb3V0WzFdID0gb3V0MTtcbiAgICBvdXRbMl0gPSBvdXQyO1xuICAgIG91dFszXSA9IG91dDM7XG5cbiAgICBiMCA9IGI0OyBiMSA9IGI1OyBiMiA9IGI2OyBiMyA9IGI3O1xuICAgIG91dDAgPSBiMCphMDAgKyBiMSphMTAgKyBiMiphMjAgKyBiMyphMzA7XG4gICAgb3V0MSA9IGIwKmEwMSArIGIxKmExMSArIGIyKmEyMSArIGIzKmEzMTtcbiAgICBvdXQyID0gYjAqYTAyICsgYjEqYTEyICsgYjIqYTIyICsgYjMqYTMyO1xuICAgIG91dDMgPSBiMCphMDMgKyBiMSphMTMgKyBiMiphMjMgKyBiMyphMzM7XG5cbiAgICBjaGFuZ2VkID0gY2hhbmdlZCA/XG4gICAgICAgICAgICAgIGNoYW5nZWQgOiBvdXQwID09PSBvdXRbNF0gfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dDEgPT09IG91dFs1XSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0MiA9PT0gb3V0WzZdIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQzID09PSBvdXRbN107XG5cbiAgICBvdXRbNF0gPSBvdXQwO1xuICAgIG91dFs1XSA9IG91dDE7XG4gICAgb3V0WzZdID0gb3V0MjtcbiAgICBvdXRbN10gPSBvdXQzO1xuXG4gICAgYjAgPSBiODsgYjEgPSBiOTsgYjIgPSBiMTA7IGIzID0gYjExO1xuICAgIG91dDAgPSBiMCphMDAgKyBiMSphMTAgKyBiMiphMjAgKyBiMyphMzA7XG4gICAgb3V0MSA9IGIwKmEwMSArIGIxKmExMSArIGIyKmEyMSArIGIzKmEzMTtcbiAgICBvdXQyID0gYjAqYTAyICsgYjEqYTEyICsgYjIqYTIyICsgYjMqYTMyO1xuICAgIG91dDMgPSBiMCphMDMgKyBiMSphMTMgKyBiMiphMjMgKyBiMyphMzM7XG5cbiAgICBjaGFuZ2VkID0gY2hhbmdlZCA/XG4gICAgICAgICAgICAgIGNoYW5nZWQgOiBvdXQwID09PSBvdXRbOF0gfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dDEgPT09IG91dFs5XSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0MiA9PT0gb3V0WzEwXSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0MyA9PT0gb3V0WzExXTtcblxuICAgIG91dFs4XSA9IG91dDA7XG4gICAgb3V0WzldID0gb3V0MTtcbiAgICBvdXRbMTBdID0gb3V0MjtcbiAgICBvdXRbMTFdID0gb3V0MztcblxuICAgIGIwID0gYjEyOyBiMSA9IGIxMzsgYjIgPSBiMTQ7IGIzID0gYjE1O1xuICAgIG91dDAgPSBiMCphMDAgKyBiMSphMTAgKyBiMiphMjAgKyBiMyphMzA7XG4gICAgb3V0MSA9IGIwKmEwMSArIGIxKmExMSArIGIyKmEyMSArIGIzKmEzMTtcbiAgICBvdXQyID0gYjAqYTAyICsgYjEqYTEyICsgYjIqYTIyICsgYjMqYTMyO1xuICAgIG91dDMgPSBiMCphMDMgKyBiMSphMTMgKyBiMiphMjMgKyBiMyphMzM7XG5cbiAgICBjaGFuZ2VkID0gY2hhbmdlZCA/XG4gICAgICAgICAgICAgIGNoYW5nZWQgOiBvdXQwID09PSBvdXRbMTJdIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQxID09PSBvdXRbMTNdIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQyID09PSBvdXRbMTRdIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQzID09PSBvdXRbMTVdO1xuXG4gICAgb3V0WzEyXSA9IG91dDA7XG4gICAgb3V0WzEzXSA9IG91dDE7XG4gICAgb3V0WzE0XSA9IG91dDI7XG4gICAgb3V0WzE1XSA9IG91dDM7XG5cbiAgICByZXR1cm4gb3V0O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBtdWx0aXBseTogbXVsdGlwbHksXG4gICAgaW52ZXJ0OiBpbnZlcnRcbn07XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBVSUV2ZW50ID0gcmVxdWlyZSgnLi9VSUV2ZW50Jyk7XG5cbi8qKlxuICogU2VlIFtVSSBFdmVudHMgKGZvcm1lcmx5IERPTSBMZXZlbCAzIEV2ZW50cyldKGh0dHA6Ly93d3cudzMub3JnL1RSLzIwMTUvV0QtdWlldmVudHMtMjAxNTA0MjgvI2V2ZW50cy1jb21wb3NpdGlvbmV2ZW50cykuXG4gKlxuICogQGNsYXNzIENvbXBvc2l0aW9uRXZlbnRcbiAqIEBhdWdtZW50cyBVSUV2ZW50XG4gKlxuICogQHBhcmFtIHtFdmVudH0gZXYgVGhlIG5hdGl2ZSBET00gZXZlbnQuXG4gKi9cbmZ1bmN0aW9uIENvbXBvc2l0aW9uRXZlbnQoZXYpIHtcbiAgICAvLyBbQ29uc3RydWN0b3IoRE9NU3RyaW5nIHR5cGVBcmcsIG9wdGlvbmFsIENvbXBvc2l0aW9uRXZlbnRJbml0IGNvbXBvc2l0aW9uRXZlbnRJbml0RGljdCldXG4gICAgLy8gaW50ZXJmYWNlIENvbXBvc2l0aW9uRXZlbnQgOiBVSUV2ZW50IHtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIERPTVN0cmluZyBkYXRhO1xuICAgIC8vIH07XG5cbiAgICBVSUV2ZW50LmNhbGwodGhpcywgZXYpO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgQ29tcG9zaXRpb25FdmVudCNkYXRhXG4gICAgICogQHR5cGUgU3RyaW5nXG4gICAgICovXG4gICAgdGhpcy5kYXRhID0gZXYuZGF0YTtcbn1cblxuQ29tcG9zaXRpb25FdmVudC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFVJRXZlbnQucHJvdG90eXBlKTtcbkNvbXBvc2l0aW9uRXZlbnQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQ29tcG9zaXRpb25FdmVudDtcblxuLyoqXG4gKiBSZXR1cm4gdGhlIG5hbWUgb2YgdGhlIGV2ZW50IHR5cGVcbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7U3RyaW5nfSBOYW1lIG9mIHRoZSBldmVudCB0eXBlXG4gKi9cbkNvbXBvc2l0aW9uRXZlbnQucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcgKCkge1xuICAgIHJldHVybiAnQ29tcG9zaXRpb25FdmVudCc7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvc2l0aW9uRXZlbnQ7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogVGhlIEV2ZW50IGNsYXNzIGlzIGJlaW5nIHVzZWQgaW4gb3JkZXIgdG8gbm9ybWFsaXplIG5hdGl2ZSBET00gZXZlbnRzLlxuICogRXZlbnRzIG5lZWQgdG8gYmUgbm9ybWFsaXplZCBpbiBvcmRlciB0byBiZSBzZXJpYWxpemVkIHRocm91Z2ggdGhlIHN0cnVjdHVyZWRcbiAqIGNsb25pbmcgYWxnb3JpdGhtIHVzZWQgYnkgdGhlIGBwb3N0TWVzc2FnZWAgbWV0aG9kIChXZWIgV29ya2VycykuXG4gKlxuICogV3JhcHBpbmcgRE9NIGV2ZW50cyBhbHNvIGhhcyB0aGUgYWR2YW50YWdlIG9mIHByb3ZpZGluZyBhIGNvbnNpc3RlbnRcbiAqIGludGVyZmFjZSBmb3IgaW50ZXJhY3Rpbmcgd2l0aCBET00gZXZlbnRzIGFjcm9zcyBicm93c2VycyBieSBjb3B5aW5nIG92ZXIgYVxuICogc3Vic2V0IG9mIHRoZSBleHBvc2VkIHByb3BlcnRpZXMgdGhhdCBpcyBndWFyYW50ZWVkIHRvIGJlIGNvbnNpc3RlbnQgYWNyb3NzXG4gKiBicm93c2Vycy5cbiAqXG4gKiBTZWUgW1VJIEV2ZW50cyAoZm9ybWVybHkgRE9NIExldmVsIDMgRXZlbnRzKV0oaHR0cDovL3d3dy53My5vcmcvVFIvMjAxNS9XRC11aWV2ZW50cy0yMDE1MDQyOC8jaW50ZXJmYWNlLUV2ZW50KS5cbiAqXG4gKiBAY2xhc3MgRXZlbnRcbiAqXG4gKiBAcGFyYW0ge0V2ZW50fSBldiBUaGUgbmF0aXZlIERPTSBldmVudC5cbiAqL1xuZnVuY3Rpb24gRXZlbnQoZXYpIHtcbiAgICAvLyBbQ29uc3RydWN0b3IoRE9NU3RyaW5nIHR5cGUsIG9wdGlvbmFsIEV2ZW50SW5pdCBldmVudEluaXREaWN0KSxcbiAgICAvLyAgRXhwb3NlZD1XaW5kb3csV29ya2VyXVxuICAgIC8vIGludGVyZmFjZSBFdmVudCB7XG4gICAgLy8gICByZWFkb25seSBhdHRyaWJ1dGUgRE9NU3RyaW5nIHR5cGU7XG4gICAgLy8gICByZWFkb25seSBhdHRyaWJ1dGUgRXZlbnRUYXJnZXQ/IHRhcmdldDtcbiAgICAvLyAgIHJlYWRvbmx5IGF0dHJpYnV0ZSBFdmVudFRhcmdldD8gY3VycmVudFRhcmdldDtcblxuICAgIC8vICAgY29uc3QgdW5zaWduZWQgc2hvcnQgTk9ORSA9IDA7XG4gICAgLy8gICBjb25zdCB1bnNpZ25lZCBzaG9ydCBDQVBUVVJJTkdfUEhBU0UgPSAxO1xuICAgIC8vICAgY29uc3QgdW5zaWduZWQgc2hvcnQgQVRfVEFSR0VUID0gMjtcbiAgICAvLyAgIGNvbnN0IHVuc2lnbmVkIHNob3J0IEJVQkJMSU5HX1BIQVNFID0gMztcbiAgICAvLyAgIHJlYWRvbmx5IGF0dHJpYnV0ZSB1bnNpZ25lZCBzaG9ydCBldmVudFBoYXNlO1xuXG4gICAgLy8gICB2b2lkIHN0b3BQcm9wYWdhdGlvbigpO1xuICAgIC8vICAgdm9pZCBzdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcblxuICAgIC8vICAgcmVhZG9ubHkgYXR0cmlidXRlIGJvb2xlYW4gYnViYmxlcztcbiAgICAvLyAgIHJlYWRvbmx5IGF0dHJpYnV0ZSBib29sZWFuIGNhbmNlbGFibGU7XG4gICAgLy8gICB2b2lkIHByZXZlbnREZWZhdWx0KCk7XG4gICAgLy8gICByZWFkb25seSBhdHRyaWJ1dGUgYm9vbGVhbiBkZWZhdWx0UHJldmVudGVkO1xuXG4gICAgLy8gICBbVW5mb3JnZWFibGVdIHJlYWRvbmx5IGF0dHJpYnV0ZSBib29sZWFuIGlzVHJ1c3RlZDtcbiAgICAvLyAgIHJlYWRvbmx5IGF0dHJpYnV0ZSBET01UaW1lU3RhbXAgdGltZVN0YW1wO1xuXG4gICAgLy8gICB2b2lkIGluaXRFdmVudChET01TdHJpbmcgdHlwZSwgYm9vbGVhbiBidWJibGVzLCBib29sZWFuIGNhbmNlbGFibGUpO1xuICAgIC8vIH07XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBFdmVudCN0eXBlXG4gICAgICogQHR5cGUgU3RyaW5nXG4gICAgICovXG4gICAgdGhpcy50eXBlID0gZXYudHlwZTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIEV2ZW50I2RlZmF1bHRQcmV2ZW50ZWRcbiAgICAgKiBAdHlwZSBCb29sZWFuXG4gICAgICovXG4gICAgdGhpcy5kZWZhdWx0UHJldmVudGVkID0gZXYuZGVmYXVsdFByZXZlbnRlZDtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIEV2ZW50I3RpbWVTdGFtcFxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMudGltZVN0YW1wID0gZXYudGltZVN0YW1wO1xuXG5cbiAgICAvKipcbiAgICAgKiBVc2VkIGZvciBleHBvc2luZyB0aGUgY3VycmVudCB0YXJnZXQncyB2YWx1ZS5cbiAgICAgKlxuICAgICAqIEBuYW1lIEV2ZW50I3ZhbHVlXG4gICAgICogQHR5cGUgU3RyaW5nXG4gICAgICovXG4gICAgdmFyIHRhcmdldENvbnN0cnVjdG9yID0gZXYudGFyZ2V0LmNvbnN0cnVjdG9yO1xuICAgIC8vIFRPRE8gU3VwcG9ydCBIVE1MS2V5Z2VuRWxlbWVudFxuICAgIGlmIChcbiAgICAgICAgdGFyZ2V0Q29uc3RydWN0b3IgPT09IEhUTUxJbnB1dEVsZW1lbnQgfHxcbiAgICAgICAgdGFyZ2V0Q29uc3RydWN0b3IgPT09IEhUTUxUZXh0QXJlYUVsZW1lbnQgfHxcbiAgICAgICAgdGFyZ2V0Q29uc3RydWN0b3IgPT09IEhUTUxTZWxlY3RFbGVtZW50XG4gICAgKSB7XG4gICAgICAgIHRoaXMudmFsdWUgPSBldi50YXJnZXQudmFsdWU7XG4gICAgfVxufVxuXG4vKipcbiAqIFJldHVybiB0aGUgbmFtZSBvZiB0aGUgZXZlbnQgdHlwZVxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IE5hbWUgb2YgdGhlIGV2ZW50IHR5cGVcbiAqL1xuRXZlbnQucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcgKCkge1xuICAgIHJldHVybiAnRXZlbnQnO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBFdmVudDtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIENvbXBvc2l0aW9uRXZlbnQgPSByZXF1aXJlKCcuL0NvbXBvc2l0aW9uRXZlbnQnKTtcbnZhciBFdmVudCA9IHJlcXVpcmUoJy4vRXZlbnQnKTtcbnZhciBGb2N1c0V2ZW50ID0gcmVxdWlyZSgnLi9Gb2N1c0V2ZW50Jyk7XG52YXIgSW5wdXRFdmVudCA9IHJlcXVpcmUoJy4vSW5wdXRFdmVudCcpO1xudmFyIEtleWJvYXJkRXZlbnQgPSByZXF1aXJlKCcuL0tleWJvYXJkRXZlbnQnKTtcbnZhciBNb3VzZUV2ZW50ID0gcmVxdWlyZSgnLi9Nb3VzZUV2ZW50Jyk7XG52YXIgVG91Y2hFdmVudCA9IHJlcXVpcmUoJy4vVG91Y2hFdmVudCcpO1xudmFyIFVJRXZlbnQgPSByZXF1aXJlKCcuL1VJRXZlbnQnKTtcbnZhciBXaGVlbEV2ZW50ID0gcmVxdWlyZSgnLi9XaGVlbEV2ZW50Jyk7XG5cbi8qKlxuICogQSBtYXBwaW5nIG9mIERPTSBldmVudHMgdG8gdGhlIGNvcnJlc3BvbmRpbmcgaGFuZGxlcnNcbiAqXG4gKiBAbmFtZSBFdmVudE1hcFxuICogQHR5cGUgT2JqZWN0XG4gKi9cbnZhciBFdmVudE1hcCA9IHtcbiAgICBjaGFuZ2UgICAgICAgICAgICAgICAgICAgICAgICAgOiBbRXZlbnQsIHRydWVdLFxuICAgIHN1Ym1pdCAgICAgICAgICAgICAgICAgICAgICAgICA6IFtFdmVudCwgdHJ1ZV0sXG5cbiAgICAvLyBVSSBFdmVudHMgKGh0dHA6Ly93d3cudzMub3JnL1RSL3VpZXZlbnRzLylcbiAgICBhYm9ydCAgICAgICAgICAgICAgICAgICAgICAgICAgOiBbRXZlbnQsIGZhbHNlXSxcbiAgICBiZWZvcmVpbnB1dCAgICAgICAgICAgICAgICAgICAgOiBbSW5wdXRFdmVudCwgdHJ1ZV0sXG4gICAgYmx1ciAgICAgICAgICAgICAgICAgICAgICAgICAgIDogW0ZvY3VzRXZlbnQsIGZhbHNlXSxcbiAgICBjbGljayAgICAgICAgICAgICAgICAgICAgICAgICAgOiBbTW91c2VFdmVudCwgdHJ1ZV0sXG4gICAgY29tcG9zaXRpb25lbmQgICAgICAgICAgICAgICAgIDogW0NvbXBvc2l0aW9uRXZlbnQsIHRydWVdLFxuICAgIGNvbXBvc2l0aW9uc3RhcnQgICAgICAgICAgICAgICA6IFtDb21wb3NpdGlvbkV2ZW50LCB0cnVlXSxcbiAgICBjb21wb3NpdGlvbnVwZGF0ZSAgICAgICAgICAgICAgOiBbQ29tcG9zaXRpb25FdmVudCwgdHJ1ZV0sXG4gICAgZGJsY2xpY2sgICAgICAgICAgICAgICAgICAgICAgIDogW01vdXNlRXZlbnQsIHRydWVdLFxuICAgIGZvY3VzICAgICAgICAgICAgICAgICAgICAgICAgICA6IFtGb2N1c0V2ZW50LCBmYWxzZV0sXG4gICAgZm9jdXNpbiAgICAgICAgICAgICAgICAgICAgICAgIDogW0ZvY3VzRXZlbnQsIHRydWVdLFxuICAgIGZvY3Vzb3V0ICAgICAgICAgICAgICAgICAgICAgICA6IFtGb2N1c0V2ZW50LCB0cnVlXSxcbiAgICBpbnB1dCAgICAgICAgICAgICAgICAgICAgICAgICAgOiBbSW5wdXRFdmVudCwgdHJ1ZV0sXG4gICAga2V5ZG93biAgICAgICAgICAgICAgICAgICAgICAgIDogW0tleWJvYXJkRXZlbnQsIHRydWVdLFxuICAgIGtleXVwICAgICAgICAgICAgICAgICAgICAgICAgICA6IFtLZXlib2FyZEV2ZW50LCB0cnVlXSxcbiAgICBsb2FkICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBbRXZlbnQsIGZhbHNlXSxcbiAgICBtb3VzZWRvd24gICAgICAgICAgICAgICAgICAgICAgOiBbTW91c2VFdmVudCwgdHJ1ZV0sXG4gICAgbW91c2VlbnRlciAgICAgICAgICAgICAgICAgICAgIDogW01vdXNlRXZlbnQsIGZhbHNlXSxcbiAgICBtb3VzZWxlYXZlICAgICAgICAgICAgICAgICAgICAgOiBbTW91c2VFdmVudCwgZmFsc2VdLFxuXG4gICAgLy8gYnViYmxlcywgYnV0IHdpbGwgYmUgdHJpZ2dlcmVkIHZlcnkgZnJlcXVlbnRseVxuICAgIG1vdXNlbW92ZSAgICAgICAgICAgICAgICAgICAgICA6IFtNb3VzZUV2ZW50LCBmYWxzZV0sXG5cbiAgICBtb3VzZW91dCAgICAgICAgICAgICAgICAgICAgICAgOiBbTW91c2VFdmVudCwgdHJ1ZV0sXG4gICAgbW91c2VvdmVyICAgICAgICAgICAgICAgICAgICAgIDogW01vdXNlRXZlbnQsIHRydWVdLFxuICAgIG1vdXNldXAgICAgICAgICAgICAgICAgICAgICAgICA6IFtNb3VzZUV2ZW50LCB0cnVlXSxcbiAgICByZXNpemUgICAgICAgICAgICAgICAgICAgICAgICAgOiBbVUlFdmVudCwgZmFsc2VdLFxuXG4gICAgLy8gbWlnaHQgYnViYmxlXG4gICAgc2Nyb2xsICAgICAgICAgICAgICAgICAgICAgICAgIDogW1VJRXZlbnQsIGZhbHNlXSxcblxuICAgIHNlbGVjdCAgICAgICAgICAgICAgICAgICAgICAgICA6IFtFdmVudCwgdHJ1ZV0sXG4gICAgdW5sb2FkICAgICAgICAgICAgICAgICAgICAgICAgIDogW0V2ZW50LCBmYWxzZV0sXG4gICAgd2hlZWwgICAgICAgICAgICAgICAgICAgICAgICAgIDogW1doZWVsRXZlbnQsIHRydWVdLFxuXG4gICAgLy8gVG91Y2ggRXZlbnRzIEV4dGVuc2lvbiAoaHR0cDovL3d3dy53My5vcmcvVFIvdG91Y2gtZXZlbnRzLWV4dGVuc2lvbnMvKVxuICAgIHRvdWNoY2FuY2VsICAgICAgICAgICAgICAgICAgICA6IFtUb3VjaEV2ZW50LCB0cnVlXSxcbiAgICB0b3VjaGVuZCAgICAgICAgICAgICAgICAgICAgICAgOiBbVG91Y2hFdmVudCwgdHJ1ZV0sXG4gICAgdG91Y2htb3ZlICAgICAgICAgICAgICAgICAgICAgIDogW1RvdWNoRXZlbnQsIHRydWVdLFxuICAgIHRvdWNoc3RhcnQgICAgICAgICAgICAgICAgICAgICA6IFtUb3VjaEV2ZW50LCB0cnVlXVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBFdmVudE1hcDtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIFVJRXZlbnQgPSByZXF1aXJlKCcuL1VJRXZlbnQnKTtcblxuLyoqXG4gKiBTZWUgW1VJIEV2ZW50cyAoZm9ybWVybHkgRE9NIExldmVsIDMgRXZlbnRzKV0oaHR0cDovL3d3dy53My5vcmcvVFIvMjAxNS9XRC11aWV2ZW50cy0yMDE1MDQyOC8jZXZlbnRzLWZvY3VzZXZlbnQpLlxuICpcbiAqIEBjbGFzcyBGb2N1c0V2ZW50XG4gKiBAYXVnbWVudHMgVUlFdmVudFxuICpcbiAqIEBwYXJhbSB7RXZlbnR9IGV2IFRoZSBuYXRpdmUgRE9NIGV2ZW50LlxuICovXG5mdW5jdGlvbiBGb2N1c0V2ZW50KGV2KSB7XG4gICAgLy8gW0NvbnN0cnVjdG9yKERPTVN0cmluZyB0eXBlQXJnLCBvcHRpb25hbCBGb2N1c0V2ZW50SW5pdCBmb2N1c0V2ZW50SW5pdERpY3QpXVxuICAgIC8vIGludGVyZmFjZSBGb2N1c0V2ZW50IDogVUlFdmVudCB7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBFdmVudFRhcmdldD8gcmVsYXRlZFRhcmdldDtcbiAgICAvLyB9O1xuXG4gICAgVUlFdmVudC5jYWxsKHRoaXMsIGV2KTtcbn1cblxuRm9jdXNFdmVudC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFVJRXZlbnQucHJvdG90eXBlKTtcbkZvY3VzRXZlbnQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRm9jdXNFdmVudDtcblxuLyoqXG4gKiBSZXR1cm4gdGhlIG5hbWUgb2YgdGhlIGV2ZW50IHR5cGVcbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7U3RyaW5nfSBOYW1lIG9mIHRoZSBldmVudCB0eXBlXG4gKi9cbkZvY3VzRXZlbnQucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcgKCkge1xuICAgIHJldHVybiAnRm9jdXNFdmVudCc7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZvY3VzRXZlbnQ7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBVSUV2ZW50ID0gcmVxdWlyZSgnLi9VSUV2ZW50Jyk7XG5cbi8qKlxuICogU2VlIFtJbnB1dCBFdmVudHNdKGh0dHA6Ly93M2MuZ2l0aHViLmlvL2VkaXRpbmctZXhwbGFpbmVyL2lucHV0LWV2ZW50cy5odG1sI2lkbC1kZWYtSW5wdXRFdmVudCkuXG4gKlxuICogQGNsYXNzIElucHV0RXZlbnRcbiAqIEBhdWdtZW50cyBVSUV2ZW50XG4gKlxuICogQHBhcmFtIHtFdmVudH0gZXYgVGhlIG5hdGl2ZSBET00gZXZlbnQuXG4gKi9cbmZ1bmN0aW9uIElucHV0RXZlbnQoZXYpIHtcbiAgICAvLyBbQ29uc3RydWN0b3IoRE9NU3RyaW5nIHR5cGVBcmcsIG9wdGlvbmFsIElucHV0RXZlbnRJbml0IGlucHV0RXZlbnRJbml0RGljdCldXG4gICAgLy8gaW50ZXJmYWNlIElucHV0RXZlbnQgOiBVSUV2ZW50IHtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIERPTVN0cmluZyBpbnB1dFR5cGU7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBET01TdHJpbmcgZGF0YTtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGJvb2xlYW4gICBpc0NvbXBvc2luZztcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIFJhbmdlICAgICB0YXJnZXRSYW5nZTtcbiAgICAvLyB9O1xuXG4gICAgVUlFdmVudC5jYWxsKHRoaXMsIGV2KTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lICAgIElucHV0RXZlbnQjaW5wdXRUeXBlXG4gICAgICogQHR5cGUgICAgU3RyaW5nXG4gICAgICovXG4gICAgdGhpcy5pbnB1dFR5cGUgPSBldi5pbnB1dFR5cGU7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSAgICBJbnB1dEV2ZW50I2RhdGFcbiAgICAgKiBAdHlwZSAgICBTdHJpbmdcbiAgICAgKi9cbiAgICB0aGlzLmRhdGEgPSBldi5kYXRhO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgICAgSW5wdXRFdmVudCNpc0NvbXBvc2luZ1xuICAgICAqIEB0eXBlICAgIEJvb2xlYW5cbiAgICAgKi9cbiAgICB0aGlzLmlzQ29tcG9zaW5nID0gZXYuaXNDb21wb3Npbmc7XG5cbiAgICAvKipcbiAgICAgKiAqKkxpbWl0ZWQgYnJvd3NlciBzdXBwb3J0KiouXG4gICAgICpcbiAgICAgKiBAbmFtZSAgICBJbnB1dEV2ZW50I3RhcmdldFJhbmdlXG4gICAgICogQHR5cGUgICAgQm9vbGVhblxuICAgICAqL1xuICAgIHRoaXMudGFyZ2V0UmFuZ2UgPSBldi50YXJnZXRSYW5nZTtcbn1cblxuSW5wdXRFdmVudC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFVJRXZlbnQucHJvdG90eXBlKTtcbklucHV0RXZlbnQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gSW5wdXRFdmVudDtcblxuLyoqXG4gKiBSZXR1cm4gdGhlIG5hbWUgb2YgdGhlIGV2ZW50IHR5cGVcbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7U3RyaW5nfSBOYW1lIG9mIHRoZSBldmVudCB0eXBlXG4gKi9cbklucHV0RXZlbnQucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcgKCkge1xuICAgIHJldHVybiAnSW5wdXRFdmVudCc7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IElucHV0RXZlbnQ7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBVSUV2ZW50ID0gcmVxdWlyZSgnLi9VSUV2ZW50Jyk7XG5cbi8qKlxuICogU2VlIFtVSSBFdmVudHMgKGZvcm1lcmx5IERPTSBMZXZlbCAzIEV2ZW50cyldKGh0dHA6Ly93d3cudzMub3JnL1RSLzIwMTUvV0QtdWlldmVudHMtMjAxNTA0MjgvI2V2ZW50cy1rZXlib2FyZGV2ZW50cykuXG4gKlxuICogQGNsYXNzIEtleWJvYXJkRXZlbnRcbiAqIEBhdWdtZW50cyBVSUV2ZW50XG4gKlxuICogQHBhcmFtIHtFdmVudH0gZXYgVGhlIG5hdGl2ZSBET00gZXZlbnQuXG4gKi9cbmZ1bmN0aW9uIEtleWJvYXJkRXZlbnQoZXYpIHtcbiAgICAvLyBbQ29uc3RydWN0b3IoRE9NU3RyaW5nIHR5cGVBcmcsIG9wdGlvbmFsIEtleWJvYXJkRXZlbnRJbml0IGtleWJvYXJkRXZlbnRJbml0RGljdCldXG4gICAgLy8gaW50ZXJmYWNlIEtleWJvYXJkRXZlbnQgOiBVSUV2ZW50IHtcbiAgICAvLyAgICAgLy8gS2V5TG9jYXRpb25Db2RlXG4gICAgLy8gICAgIGNvbnN0IHVuc2lnbmVkIGxvbmcgRE9NX0tFWV9MT0NBVElPTl9TVEFOREFSRCA9IDB4MDA7XG4gICAgLy8gICAgIGNvbnN0IHVuc2lnbmVkIGxvbmcgRE9NX0tFWV9MT0NBVElPTl9MRUZUID0gMHgwMTtcbiAgICAvLyAgICAgY29uc3QgdW5zaWduZWQgbG9uZyBET01fS0VZX0xPQ0FUSU9OX1JJR0hUID0gMHgwMjtcbiAgICAvLyAgICAgY29uc3QgdW5zaWduZWQgbG9uZyBET01fS0VZX0xPQ0FUSU9OX05VTVBBRCA9IDB4MDM7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBET01TdHJpbmcgICAgIGtleTtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIERPTVN0cmluZyAgICAgY29kZTtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIHVuc2lnbmVkIGxvbmcgbG9jYXRpb247XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBib29sZWFuICAgICAgIGN0cmxLZXk7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBib29sZWFuICAgICAgIHNoaWZ0S2V5O1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgYm9vbGVhbiAgICAgICBhbHRLZXk7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBib29sZWFuICAgICAgIG1ldGFLZXk7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBib29sZWFuICAgICAgIHJlcGVhdDtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGJvb2xlYW4gICAgICAgaXNDb21wb3Npbmc7XG4gICAgLy8gICAgIGJvb2xlYW4gZ2V0TW9kaWZpZXJTdGF0ZSAoRE9NU3RyaW5nIGtleUFyZyk7XG4gICAgLy8gfTtcblxuICAgIFVJRXZlbnQuY2FsbCh0aGlzLCBldik7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBLZXlib2FyZEV2ZW50I0RPTV9LRVlfTE9DQVRJT05fU1RBTkRBUkRcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLkRPTV9LRVlfTE9DQVRJT05fU1RBTkRBUkQgPSAweDAwO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgS2V5Ym9hcmRFdmVudCNET01fS0VZX0xPQ0FUSU9OX0xFRlRcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLkRPTV9LRVlfTE9DQVRJT05fTEVGVCA9IDB4MDE7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBLZXlib2FyZEV2ZW50I0RPTV9LRVlfTE9DQVRJT05fUklHSFRcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLkRPTV9LRVlfTE9DQVRJT05fUklHSFQgPSAweDAyO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgS2V5Ym9hcmRFdmVudCNET01fS0VZX0xPQ0FUSU9OX05VTVBBRFxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuRE9NX0tFWV9MT0NBVElPTl9OVU1QQUQgPSAweDAzO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgS2V5Ym9hcmRFdmVudCNrZXlcbiAgICAgKiBAdHlwZSBTdHJpbmdcbiAgICAgKi9cbiAgICB0aGlzLmtleSA9IGV2LmtleTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIEtleWJvYXJkRXZlbnQjY29kZVxuICAgICAqIEB0eXBlIFN0cmluZ1xuICAgICAqL1xuICAgIHRoaXMuY29kZSA9IGV2LmNvZGU7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBLZXlib2FyZEV2ZW50I2xvY2F0aW9uXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5sb2NhdGlvbiA9IGV2LmxvY2F0aW9uO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgS2V5Ym9hcmRFdmVudCNjdHJsS2V5XG4gICAgICogQHR5cGUgQm9vbGVhblxuICAgICAqL1xuICAgIHRoaXMuY3RybEtleSA9IGV2LmN0cmxLZXk7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBLZXlib2FyZEV2ZW50I3NoaWZ0S2V5XG4gICAgICogQHR5cGUgQm9vbGVhblxuICAgICAqL1xuICAgIHRoaXMuc2hpZnRLZXkgPSBldi5zaGlmdEtleTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIEtleWJvYXJkRXZlbnQjYWx0S2V5XG4gICAgICogQHR5cGUgQm9vbGVhblxuICAgICAqL1xuICAgIHRoaXMuYWx0S2V5ID0gZXYuYWx0S2V5O1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgS2V5Ym9hcmRFdmVudCNtZXRhS2V5XG4gICAgICogQHR5cGUgQm9vbGVhblxuICAgICAqL1xuICAgIHRoaXMubWV0YUtleSA9IGV2Lm1ldGFLZXk7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBLZXlib2FyZEV2ZW50I3JlcGVhdFxuICAgICAqIEB0eXBlIEJvb2xlYW5cbiAgICAgKi9cbiAgICB0aGlzLnJlcGVhdCA9IGV2LnJlcGVhdDtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIEtleWJvYXJkRXZlbnQjaXNDb21wb3NpbmdcbiAgICAgKiBAdHlwZSBCb29sZWFuXG4gICAgICovXG4gICAgdGhpcy5pc0NvbXBvc2luZyA9IGV2LmlzQ29tcG9zaW5nO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgS2V5Ym9hcmRFdmVudCNrZXlDb2RlXG4gICAgICogQHR5cGUgU3RyaW5nXG4gICAgICogQGRlcHJlY2F0ZWRcbiAgICAgKi9cbiAgICB0aGlzLmtleUNvZGUgPSBldi5rZXlDb2RlO1xufVxuXG5LZXlib2FyZEV2ZW50LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoVUlFdmVudC5wcm90b3R5cGUpO1xuS2V5Ym9hcmRFdmVudC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBLZXlib2FyZEV2ZW50O1xuXG4vKipcbiAqIFJldHVybiB0aGUgbmFtZSBvZiB0aGUgZXZlbnQgdHlwZVxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IE5hbWUgb2YgdGhlIGV2ZW50IHR5cGVcbiAqL1xuS2V5Ym9hcmRFdmVudC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyAoKSB7XG4gICAgcmV0dXJuICdLZXlib2FyZEV2ZW50Jztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gS2V5Ym9hcmRFdmVudDtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIFVJRXZlbnQgPSByZXF1aXJlKCcuL1VJRXZlbnQnKTtcblxuLyoqXG4gKiBTZWUgW1VJIEV2ZW50cyAoZm9ybWVybHkgRE9NIExldmVsIDMgRXZlbnRzKV0oaHR0cDovL3d3dy53My5vcmcvVFIvMjAxNS9XRC11aWV2ZW50cy0yMDE1MDQyOC8jZXZlbnRzLW1vdXNlZXZlbnRzKS5cbiAqXG4gKiBAY2xhc3MgS2V5Ym9hcmRFdmVudFxuICogQGF1Z21lbnRzIFVJRXZlbnRcbiAqXG4gKiBAcGFyYW0ge0V2ZW50fSBldiBUaGUgbmF0aXZlIERPTSBldmVudC5cbiAqL1xuZnVuY3Rpb24gTW91c2VFdmVudChldikge1xuICAgIC8vIFtDb25zdHJ1Y3RvcihET01TdHJpbmcgdHlwZUFyZywgb3B0aW9uYWwgTW91c2VFdmVudEluaXQgbW91c2VFdmVudEluaXREaWN0KV1cbiAgICAvLyBpbnRlcmZhY2UgTW91c2VFdmVudCA6IFVJRXZlbnQge1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgbG9uZyAgICAgICAgICAgc2NyZWVuWDtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGxvbmcgICAgICAgICAgIHNjcmVlblk7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBsb25nICAgICAgICAgICBjbGllbnRYO1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgbG9uZyAgICAgICAgICAgY2xpZW50WTtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGJvb2xlYW4gICAgICAgIGN0cmxLZXk7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBib29sZWFuICAgICAgICBzaGlmdEtleTtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGJvb2xlYW4gICAgICAgIGFsdEtleTtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGJvb2xlYW4gICAgICAgIG1ldGFLZXk7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBzaG9ydCAgICAgICAgICBidXR0b247XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBFdmVudFRhcmdldD8gICByZWxhdGVkVGFyZ2V0O1xuICAgIC8vICAgICAvLyBJbnRyb2R1Y2VkIGluIHRoaXMgc3BlY2lmaWNhdGlvblxuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgdW5zaWduZWQgc2hvcnQgYnV0dG9ucztcbiAgICAvLyAgICAgYm9vbGVhbiBnZXRNb2RpZmllclN0YXRlIChET01TdHJpbmcga2V5QXJnKTtcbiAgICAvLyB9O1xuXG4gICAgVUlFdmVudC5jYWxsKHRoaXMsIGV2KTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIE1vdXNlRXZlbnQjc2NyZWVuWFxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuc2NyZWVuWCA9IGV2LnNjcmVlblg7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBNb3VzZUV2ZW50I3NjcmVlbllcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLnNjcmVlblkgPSBldi5zY3JlZW5ZO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgTW91c2VFdmVudCNjbGllbnRYXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5jbGllbnRYID0gZXYuY2xpZW50WDtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIE1vdXNlRXZlbnQjY2xpZW50WVxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuY2xpZW50WSA9IGV2LmNsaWVudFk7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBNb3VzZUV2ZW50I2N0cmxLZXlcbiAgICAgKiBAdHlwZSBCb29sZWFuXG4gICAgICovXG4gICAgdGhpcy5jdHJsS2V5ID0gZXYuY3RybEtleTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIE1vdXNlRXZlbnQjc2hpZnRLZXlcbiAgICAgKiBAdHlwZSBCb29sZWFuXG4gICAgICovXG4gICAgdGhpcy5zaGlmdEtleSA9IGV2LnNoaWZ0S2V5O1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgTW91c2VFdmVudCNhbHRLZXlcbiAgICAgKiBAdHlwZSBCb29sZWFuXG4gICAgICovXG4gICAgdGhpcy5hbHRLZXkgPSBldi5hbHRLZXk7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBNb3VzZUV2ZW50I21ldGFLZXlcbiAgICAgKiBAdHlwZSBCb29sZWFuXG4gICAgICovXG4gICAgdGhpcy5tZXRhS2V5ID0gZXYubWV0YUtleTtcblxuICAgIC8qKlxuICAgICAqIEB0eXBlIE1vdXNlRXZlbnQjYnV0dG9uXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5idXR0b24gPSBldi5idXR0b247XG5cbiAgICAvKipcbiAgICAgKiBAdHlwZSBNb3VzZUV2ZW50I2J1dHRvbnNcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLmJ1dHRvbnMgPSBldi5idXR0b25zO1xuXG4gICAgLyoqXG4gICAgICogQHR5cGUgTW91c2VFdmVudCNwYWdlWFxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMucGFnZVggPSBldi5wYWdlWDtcblxuICAgIC8qKlxuICAgICAqIEB0eXBlIE1vdXNlRXZlbnQjcGFnZVlcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLnBhZ2VZID0gZXYucGFnZVk7XG5cbiAgICAvKipcbiAgICAgKiBAdHlwZSBNb3VzZUV2ZW50I3hcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLnggPSBldi54O1xuXG4gICAgLyoqXG4gICAgICogQHR5cGUgTW91c2VFdmVudCN5XG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy55ID0gZXYueTtcblxuICAgIC8qKlxuICAgICAqIEB0eXBlIE1vdXNlRXZlbnQjb2Zmc2V0WFxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMub2Zmc2V0WCA9IGV2Lm9mZnNldFg7XG5cbiAgICAvKipcbiAgICAgKiBAdHlwZSBNb3VzZUV2ZW50I29mZnNldFlcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLm9mZnNldFkgPSBldi5vZmZzZXRZO1xufVxuXG5Nb3VzZUV2ZW50LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoVUlFdmVudC5wcm90b3R5cGUpO1xuTW91c2VFdmVudC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBNb3VzZUV2ZW50O1xuXG4vKipcbiAqIFJldHVybiB0aGUgbmFtZSBvZiB0aGUgZXZlbnQgdHlwZVxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IE5hbWUgb2YgdGhlIGV2ZW50IHR5cGVcbiAqL1xuTW91c2VFdmVudC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyAoKSB7XG4gICAgcmV0dXJuICdNb3VzZUV2ZW50Jztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTW91c2VFdmVudDtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIFVJRXZlbnQgPSByZXF1aXJlKCcuL1VJRXZlbnQnKTtcblxudmFyIEVNUFRZX0FSUkFZID0gW107XG5cbi8qKlxuICogU2VlIFtUb3VjaCBJbnRlcmZhY2VdKGh0dHA6Ly93d3cudzMub3JnL1RSLzIwMTMvUkVDLXRvdWNoLWV2ZW50cy0yMDEzMTAxMC8jdG91Y2gtaW50ZXJmYWNlKS5cbiAqXG4gKiBAY2xhc3MgVG91Y2hcbiAqIEBwcml2YXRlXG4gKlxuICogQHBhcmFtIHtUb3VjaH0gdG91Y2ggVGhlIG5hdGl2ZSBUb3VjaCBvYmplY3QuXG4gKi9cbmZ1bmN0aW9uIFRvdWNoKHRvdWNoKSB7XG4gICAgLy8gaW50ZXJmYWNlIFRvdWNoIHtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGxvbmcgICAgICAgIGlkZW50aWZpZXI7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBFdmVudFRhcmdldCB0YXJnZXQ7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBkb3VibGUgICAgICBzY3JlZW5YO1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgZG91YmxlICAgICAgc2NyZWVuWTtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGRvdWJsZSAgICAgIGNsaWVudFg7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBkb3VibGUgICAgICBjbGllbnRZO1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgZG91YmxlICAgICAgcGFnZVg7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBkb3VibGUgICAgICBwYWdlWTtcbiAgICAvLyB9O1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgVG91Y2gjaWRlbnRpZmllclxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuaWRlbnRpZmllciA9IHRvdWNoLmlkZW50aWZpZXI7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBUb3VjaCNzY3JlZW5YXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5zY3JlZW5YID0gdG91Y2guc2NyZWVuWDtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFRvdWNoI3NjcmVlbllcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLnNjcmVlblkgPSB0b3VjaC5zY3JlZW5ZO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgVG91Y2gjY2xpZW50WFxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuY2xpZW50WCA9IHRvdWNoLmNsaWVudFg7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBUb3VjaCNjbGllbnRZXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5jbGllbnRZID0gdG91Y2guY2xpZW50WTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFRvdWNoI3BhZ2VYXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5wYWdlWCA9IHRvdWNoLnBhZ2VYO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgVG91Y2gjcGFnZVlcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLnBhZ2VZID0gdG91Y2gucGFnZVk7XG59XG5cblxuLyoqXG4gKiBOb3JtYWxpemVzIHRoZSBicm93c2VyJ3MgbmF0aXZlIFRvdWNoTGlzdCBieSBjb252ZXJ0aW5nIGl0IGludG8gYW4gYXJyYXkgb2ZcbiAqIG5vcm1hbGl6ZWQgVG91Y2ggb2JqZWN0cy5cbiAqXG4gKiBAbWV0aG9kICBjbG9uZVRvdWNoTGlzdFxuICogQHByaXZhdGVcbiAqXG4gKiBAcGFyYW0gIHtUb3VjaExpc3R9IHRvdWNoTGlzdCAgICBUaGUgbmF0aXZlIFRvdWNoTGlzdCBhcnJheS5cbiAqIEByZXR1cm4ge0FycmF5LjxUb3VjaD59ICAgICAgICAgIEFuIGFycmF5IG9mIG5vcm1hbGl6ZWQgVG91Y2ggb2JqZWN0cy5cbiAqL1xuZnVuY3Rpb24gY2xvbmVUb3VjaExpc3QodG91Y2hMaXN0KSB7XG4gICAgaWYgKCF0b3VjaExpc3QpIHJldHVybiBFTVBUWV9BUlJBWTtcbiAgICAvLyBpbnRlcmZhY2UgVG91Y2hMaXN0IHtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIHVuc2lnbmVkIGxvbmcgbGVuZ3RoO1xuICAgIC8vICAgICBnZXR0ZXIgVG91Y2g/IGl0ZW0gKHVuc2lnbmVkIGxvbmcgaW5kZXgpO1xuICAgIC8vIH07XG5cbiAgICB2YXIgdG91Y2hMaXN0QXJyYXkgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRvdWNoTGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICB0b3VjaExpc3RBcnJheVtpXSA9IG5ldyBUb3VjaCh0b3VjaExpc3RbaV0pO1xuICAgIH1cbiAgICByZXR1cm4gdG91Y2hMaXN0QXJyYXk7XG59XG5cbi8qKlxuICogU2VlIFtUb3VjaCBFdmVudCBJbnRlcmZhY2VdKGh0dHA6Ly93d3cudzMub3JnL1RSLzIwMTMvUkVDLXRvdWNoLWV2ZW50cy0yMDEzMTAxMC8jdG91Y2hldmVudC1pbnRlcmZhY2UpLlxuICpcbiAqIEBjbGFzcyBUb3VjaEV2ZW50XG4gKiBAYXVnbWVudHMgVUlFdmVudFxuICpcbiAqIEBwYXJhbSB7RXZlbnR9IGV2IFRoZSBuYXRpdmUgRE9NIGV2ZW50LlxuICovXG5mdW5jdGlvbiBUb3VjaEV2ZW50KGV2KSB7XG4gICAgLy8gaW50ZXJmYWNlIFRvdWNoRXZlbnQgOiBVSUV2ZW50IHtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIFRvdWNoTGlzdCB0b3VjaGVzO1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgVG91Y2hMaXN0IHRhcmdldFRvdWNoZXM7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBUb3VjaExpc3QgY2hhbmdlZFRvdWNoZXM7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBib29sZWFuICAgYWx0S2V5O1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgYm9vbGVhbiAgIG1ldGFLZXk7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBib29sZWFuICAgY3RybEtleTtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGJvb2xlYW4gICBzaGlmdEtleTtcbiAgICAvLyB9O1xuICAgIFVJRXZlbnQuY2FsbCh0aGlzLCBldik7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBUb3VjaEV2ZW50I3RvdWNoZXNcbiAgICAgKiBAdHlwZSBBcnJheS48VG91Y2g+XG4gICAgICovXG4gICAgdGhpcy50b3VjaGVzID0gY2xvbmVUb3VjaExpc3QoZXYudG91Y2hlcyk7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBUb3VjaEV2ZW50I3RhcmdldFRvdWNoZXNcbiAgICAgKiBAdHlwZSBBcnJheS48VG91Y2g+XG4gICAgICovXG4gICAgdGhpcy50YXJnZXRUb3VjaGVzID0gY2xvbmVUb3VjaExpc3QoZXYudGFyZ2V0VG91Y2hlcyk7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBUb3VjaEV2ZW50I2NoYW5nZWRUb3VjaGVzXG4gICAgICogQHR5cGUgVG91Y2hMaXN0XG4gICAgICovXG4gICAgdGhpcy5jaGFuZ2VkVG91Y2hlcyA9IGNsb25lVG91Y2hMaXN0KGV2LmNoYW5nZWRUb3VjaGVzKTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFRvdWNoRXZlbnQjYWx0S2V5XG4gICAgICogQHR5cGUgQm9vbGVhblxuICAgICAqL1xuICAgIHRoaXMuYWx0S2V5ID0gZXYuYWx0S2V5O1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgVG91Y2hFdmVudCNtZXRhS2V5XG4gICAgICogQHR5cGUgQm9vbGVhblxuICAgICAqL1xuICAgIHRoaXMubWV0YUtleSA9IGV2Lm1ldGFLZXk7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBUb3VjaEV2ZW50I2N0cmxLZXlcbiAgICAgKiBAdHlwZSBCb29sZWFuXG4gICAgICovXG4gICAgdGhpcy5jdHJsS2V5ID0gZXYuY3RybEtleTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFRvdWNoRXZlbnQjc2hpZnRLZXlcbiAgICAgKiBAdHlwZSBCb29sZWFuXG4gICAgICovXG4gICAgdGhpcy5zaGlmdEtleSA9IGV2LnNoaWZ0S2V5O1xufVxuXG5Ub3VjaEV2ZW50LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoVUlFdmVudC5wcm90b3R5cGUpO1xuVG91Y2hFdmVudC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBUb3VjaEV2ZW50O1xuXG4vKipcbiAqIFJldHVybiB0aGUgbmFtZSBvZiB0aGUgZXZlbnQgdHlwZVxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IE5hbWUgb2YgdGhlIGV2ZW50IHR5cGVcbiAqL1xuVG91Y2hFdmVudC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyAoKSB7XG4gICAgcmV0dXJuICdUb3VjaEV2ZW50Jztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVG91Y2hFdmVudDtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIEV2ZW50ID0gcmVxdWlyZSgnLi9FdmVudCcpO1xuXG4vKipcbiAqIFNlZSBbVUkgRXZlbnRzIChmb3JtZXJseSBET00gTGV2ZWwgMyBFdmVudHMpXShodHRwOi8vd3d3LnczLm9yZy9UUi8yMDE1L1dELXVpZXZlbnRzLTIwMTUwNDI4KS5cbiAqXG4gKiBAY2xhc3MgVUlFdmVudFxuICogQGF1Z21lbnRzIEV2ZW50XG4gKlxuICogQHBhcmFtICB7RXZlbnR9IGV2ICAgVGhlIG5hdGl2ZSBET00gZXZlbnQuXG4gKi9cbmZ1bmN0aW9uIFVJRXZlbnQoZXYpIHtcbiAgICAvLyBbQ29uc3RydWN0b3IoRE9NU3RyaW5nIHR5cGUsIG9wdGlvbmFsIFVJRXZlbnRJbml0IGV2ZW50SW5pdERpY3QpXVxuICAgIC8vIGludGVyZmFjZSBVSUV2ZW50IDogRXZlbnQge1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgV2luZG93PyB2aWV3O1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgbG9uZyAgICBkZXRhaWw7XG4gICAgLy8gfTtcbiAgICBFdmVudC5jYWxsKHRoaXMsIGV2KTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFVJRXZlbnQjZGV0YWlsXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5kZXRhaWwgPSBldi5kZXRhaWw7XG59XG5cblVJRXZlbnQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudC5wcm90b3R5cGUpO1xuVUlFdmVudC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBVSUV2ZW50O1xuXG4vKipcbiAqIFJldHVybiB0aGUgbmFtZSBvZiB0aGUgZXZlbnQgdHlwZVxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IE5hbWUgb2YgdGhlIGV2ZW50IHR5cGVcbiAqL1xuVUlFdmVudC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyAoKSB7XG4gICAgcmV0dXJuICdVSUV2ZW50Jztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVUlFdmVudDtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIE1vdXNlRXZlbnQgPSByZXF1aXJlKCcuL01vdXNlRXZlbnQnKTtcblxuLyoqXG4gKiBTZWUgW1VJIEV2ZW50cyAoZm9ybWVybHkgRE9NIExldmVsIDMgRXZlbnRzKV0oaHR0cDovL3d3dy53My5vcmcvVFIvMjAxNS9XRC11aWV2ZW50cy0yMDE1MDQyOC8jZXZlbnRzLXdoZWVsZXZlbnRzKS5cbiAqXG4gKiBAY2xhc3MgV2hlZWxFdmVudFxuICogQGF1Z21lbnRzIFVJRXZlbnRcbiAqXG4gKiBAcGFyYW0ge0V2ZW50fSBldiBUaGUgbmF0aXZlIERPTSBldmVudC5cbiAqL1xuZnVuY3Rpb24gV2hlZWxFdmVudChldikge1xuICAgIC8vIFtDb25zdHJ1Y3RvcihET01TdHJpbmcgdHlwZUFyZywgb3B0aW9uYWwgV2hlZWxFdmVudEluaXQgd2hlZWxFdmVudEluaXREaWN0KV1cbiAgICAvLyBpbnRlcmZhY2UgV2hlZWxFdmVudCA6IE1vdXNlRXZlbnQge1xuICAgIC8vICAgICAvLyBEZWx0YU1vZGVDb2RlXG4gICAgLy8gICAgIGNvbnN0IHVuc2lnbmVkIGxvbmcgRE9NX0RFTFRBX1BJWEVMID0gMHgwMDtcbiAgICAvLyAgICAgY29uc3QgdW5zaWduZWQgbG9uZyBET01fREVMVEFfTElORSA9IDB4MDE7XG4gICAgLy8gICAgIGNvbnN0IHVuc2lnbmVkIGxvbmcgRE9NX0RFTFRBX1BBR0UgPSAweDAyO1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgZG91YmxlICAgICAgICBkZWx0YVg7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBkb3VibGUgICAgICAgIGRlbHRhWTtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGRvdWJsZSAgICAgICAgZGVsdGFaO1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgdW5zaWduZWQgbG9uZyBkZWx0YU1vZGU7XG4gICAgLy8gfTtcblxuICAgIE1vdXNlRXZlbnQuY2FsbCh0aGlzLCBldik7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBXaGVlbEV2ZW50I0RPTV9ERUxUQV9QSVhFTFxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuRE9NX0RFTFRBX1BJWEVMID0gMHgwMDtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFdoZWVsRXZlbnQjRE9NX0RFTFRBX0xJTkVcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLkRPTV9ERUxUQV9MSU5FID0gMHgwMTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFdoZWVsRXZlbnQjRE9NX0RFTFRBX1BBR0VcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLkRPTV9ERUxUQV9QQUdFID0gMHgwMjtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFdoZWVsRXZlbnQjZGVsdGFYXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5kZWx0YVggPSBldi5kZWx0YVg7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBXaGVlbEV2ZW50I2RlbHRhWVxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuZGVsdGFZID0gZXYuZGVsdGFZO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgV2hlZWxFdmVudCNkZWx0YVpcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLmRlbHRhWiA9IGV2LmRlbHRhWjtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFdoZWVsRXZlbnQjZGVsdGFNb2RlXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5kZWx0YU1vZGUgPSBldi5kZWx0YU1vZGU7XG59XG5cbldoZWVsRXZlbnQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShNb3VzZUV2ZW50LnByb3RvdHlwZSk7XG5XaGVlbEV2ZW50LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFdoZWVsRXZlbnQ7XG5cbi8qKlxuICogUmV0dXJuIHRoZSBuYW1lIG9mIHRoZSBldmVudCB0eXBlXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge1N0cmluZ30gTmFtZSBvZiB0aGUgZXZlbnQgdHlwZVxuICovXG5XaGVlbEV2ZW50LnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nICgpIHtcbiAgICByZXR1cm4gJ1doZWVsRXZlbnQnO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBXaGVlbEV2ZW50O1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEEgdHdvLWRpbWVuc2lvbmFsIHZlY3Rvci5cbiAqXG4gKiBAY2xhc3MgVmVjMlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB4IFRoZSB4IGNvbXBvbmVudC5cbiAqIEBwYXJhbSB7TnVtYmVyfSB5IFRoZSB5IGNvbXBvbmVudC5cbiAqL1xudmFyIFZlYzIgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgaWYgKHggaW5zdGFuY2VvZiBBcnJheSB8fCB4IGluc3RhbmNlb2YgRmxvYXQzMkFycmF5KSB7XG4gICAgICAgIHRoaXMueCA9IHhbMF0gfHwgMDtcbiAgICAgICAgdGhpcy55ID0geFsxXSB8fCAwO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdGhpcy54ID0geCB8fCAwO1xuICAgICAgICB0aGlzLnkgPSB5IHx8IDA7XG4gICAgfVxufTtcblxuLyoqXG4gKiBTZXQgdGhlIGNvbXBvbmVudHMgb2YgdGhlIGN1cnJlbnQgVmVjMi5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHggVGhlIHggY29tcG9uZW50LlxuICogQHBhcmFtIHtOdW1iZXJ9IHkgVGhlIHkgY29tcG9uZW50LlxuICpcbiAqIEByZXR1cm4ge1ZlYzJ9IHRoaXNcbiAqL1xuVmVjMi5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gc2V0KHgsIHkpIHtcbiAgICBpZiAoeCAhPSBudWxsKSB0aGlzLnggPSB4O1xuICAgIGlmICh5ICE9IG51bGwpIHRoaXMueSA9IHk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZCB0aGUgaW5wdXQgdiB0byB0aGUgY3VycmVudCBWZWMyLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1ZlYzJ9IHYgVGhlIFZlYzIgdG8gYWRkLlxuICpcbiAqIEByZXR1cm4ge1ZlYzJ9IHRoaXNcbiAqL1xuVmVjMi5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gYWRkKHYpIHtcbiAgICB0aGlzLnggKz0gdi54O1xuICAgIHRoaXMueSArPSB2Lnk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFN1YnRyYWN0IHRoZSBpbnB1dCB2IGZyb20gdGhlIGN1cnJlbnQgVmVjMi5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtWZWMyfSB2IFRoZSBWZWMyIHRvIHN1YnRyYWN0LlxuICpcbiAqIEByZXR1cm4ge1ZlYzJ9IHRoaXNcbiAqL1xuVmVjMi5wcm90b3R5cGUuc3VidHJhY3QgPSBmdW5jdGlvbiBzdWJ0cmFjdCh2KSB7XG4gICAgdGhpcy54IC09IHYueDtcbiAgICB0aGlzLnkgLT0gdi55O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTY2FsZSB0aGUgY3VycmVudCBWZWMyIGJ5IGEgc2NhbGFyIG9yIFZlYzIuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfFZlYzJ9IHMgVGhlIE51bWJlciBvciB2ZWMyIGJ5IHdoaWNoIHRvIHNjYWxlLlxuICpcbiAqIEByZXR1cm4ge1ZlYzJ9IHRoaXNcbiAqL1xuVmVjMi5wcm90b3R5cGUuc2NhbGUgPSBmdW5jdGlvbiBzY2FsZShzKSB7XG4gICAgaWYgKHMgaW5zdGFuY2VvZiBWZWMyKSB7XG4gICAgICAgIHRoaXMueCAqPSBzLng7XG4gICAgICAgIHRoaXMueSAqPSBzLnk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aGlzLnggKj0gcztcbiAgICAgICAgdGhpcy55ICo9IHM7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSb3RhdGUgdGhlIFZlYzIgY291bnRlci1jbG9ja3dpc2UgYnkgdGhldGEgYWJvdXQgdGhlIHotYXhpcy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHRoZXRhIEFuZ2xlIGJ5IHdoaWNoIHRvIHJvdGF0ZS5cbiAqXG4gKiBAcmV0dXJuIHtWZWMyfSB0aGlzXG4gKi9cblZlYzIucHJvdG90eXBlLnJvdGF0ZSA9IGZ1bmN0aW9uKHRoZXRhKSB7XG4gICAgdmFyIHggPSB0aGlzLng7XG4gICAgdmFyIHkgPSB0aGlzLnk7XG5cbiAgICB2YXIgY29zVGhldGEgPSBNYXRoLmNvcyh0aGV0YSk7XG4gICAgdmFyIHNpblRoZXRhID0gTWF0aC5zaW4odGhldGEpO1xuXG4gICAgdGhpcy54ID0geCAqIGNvc1RoZXRhIC0geSAqIHNpblRoZXRhO1xuICAgIHRoaXMueSA9IHggKiBzaW5UaGV0YSArIHkgKiBjb3NUaGV0YTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBUaGUgZG90IHByb2R1Y3Qgb2Ygb2YgdGhlIGN1cnJlbnQgVmVjMiB3aXRoIHRoZSBpbnB1dCBWZWMyLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gdiBUaGUgb3RoZXIgVmVjMi5cbiAqXG4gKiBAcmV0dXJuIHtWZWMyfSB0aGlzXG4gKi9cblZlYzIucHJvdG90eXBlLmRvdCA9IGZ1bmN0aW9uKHYpIHtcbiAgICByZXR1cm4gdGhpcy54ICogdi54ICsgdGhpcy55ICogdi55O1xufTtcblxuLyoqXG4gKiBUaGUgY3Jvc3MgcHJvZHVjdCBvZiBvZiB0aGUgY3VycmVudCBWZWMyIHdpdGggdGhlIGlucHV0IFZlYzIuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB2IFRoZSBvdGhlciBWZWMyLlxuICpcbiAqIEByZXR1cm4ge1ZlYzJ9IHRoaXNcbiAqL1xuVmVjMi5wcm90b3R5cGUuY3Jvc3MgPSBmdW5jdGlvbih2KSB7XG4gICAgcmV0dXJuIHRoaXMueCAqIHYueSAtIHRoaXMueSAqIHYueDtcbn07XG5cbi8qKlxuICogUHJlc2VydmUgdGhlIG1hZ25pdHVkZSBidXQgaW52ZXJ0IHRoZSBvcmllbnRhdGlvbiBvZiB0aGUgY3VycmVudCBWZWMyLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtWZWMyfSB0aGlzXG4gKi9cblZlYzIucHJvdG90eXBlLmludmVydCA9IGZ1bmN0aW9uIGludmVydCgpIHtcbiAgICB0aGlzLnggKj0gLTE7XG4gICAgdGhpcy55ICo9IC0xO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBcHBseSBhIGZ1bmN0aW9uIGNvbXBvbmVudC13aXNlIHRvIHRoZSBjdXJyZW50IFZlYzIuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIEZ1bmN0aW9uIHRvIGFwcGx5LlxuICpcbiAqIEByZXR1cm4ge1ZlYzJ9IHRoaXNcbiAqL1xuVmVjMi5wcm90b3R5cGUubWFwID0gZnVuY3Rpb24gbWFwKGZuKSB7XG4gICAgdGhpcy54ID0gZm4odGhpcy54KTtcbiAgICB0aGlzLnkgPSBmbih0aGlzLnkpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBHZXQgdGhlIG1hZ25pdHVkZSBvZiB0aGUgY3VycmVudCBWZWMyLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IHRoZSBsZW5ndGggb2YgdGhlIHZlY3RvclxuICovXG5WZWMyLnByb3RvdHlwZS5sZW5ndGggPSBmdW5jdGlvbiBsZW5ndGgoKSB7XG4gICAgdmFyIHggPSB0aGlzLng7XG4gICAgdmFyIHkgPSB0aGlzLnk7XG5cbiAgICByZXR1cm4gTWF0aC5zcXJ0KHggKiB4ICsgeSAqIHkpO1xufTtcblxuLyoqXG4gKiBDb3B5IHRoZSBpbnB1dCBvbnRvIHRoZSBjdXJyZW50IFZlYzIuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7VmVjMn0gdiBWZWMyIHRvIGNvcHlcbiAqXG4gKiBAcmV0dXJuIHtWZWMyfSB0aGlzXG4gKi9cblZlYzIucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbiBjb3B5KHYpIHtcbiAgICB0aGlzLnggPSB2Lng7XG4gICAgdGhpcy55ID0gdi55O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZXNldCB0aGUgY3VycmVudCBWZWMyLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtWZWMyfSB0aGlzXG4gKi9cblZlYzIucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24gY2xlYXIoKSB7XG4gICAgdGhpcy54ID0gMDtcbiAgICB0aGlzLnkgPSAwO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBDaGVjayB3aGV0aGVyIHRoZSBtYWduaXR1ZGUgb2YgdGhlIGN1cnJlbnQgVmVjMiBpcyBleGFjdGx5IDAuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge0Jvb2xlYW59IHdoZXRoZXIgb3Igbm90IHRoZSBsZW5ndGggaXMgMFxuICovXG5WZWMyLnByb3RvdHlwZS5pc1plcm8gPSBmdW5jdGlvbiBpc1plcm8oKSB7XG4gICAgaWYgKHRoaXMueCAhPT0gMCB8fCB0aGlzLnkgIT09IDApIHJldHVybiBmYWxzZTtcbiAgICBlbHNlIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBUaGUgYXJyYXkgZm9ybSBvZiB0aGUgY3VycmVudCBWZWMyLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtBcnJheX0gdGhlIFZlYyB0byBhcyBhbiBhcnJheVxuICovXG5WZWMyLnByb3RvdHlwZS50b0FycmF5ID0gZnVuY3Rpb24gdG9BcnJheSgpIHtcbiAgICByZXR1cm4gW3RoaXMueCwgdGhpcy55XTtcbn07XG5cbi8qKlxuICogTm9ybWFsaXplIHRoZSBpbnB1dCBWZWMyLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1ZlYzJ9IHYgVGhlIHJlZmVyZW5jZSBWZWMyLlxuICogQHBhcmFtIHtWZWMyfSBvdXRwdXQgVmVjMiBpbiB3aGljaCB0byBwbGFjZSB0aGUgcmVzdWx0LlxuICpcbiAqIEByZXR1cm4ge1ZlYzJ9IFRoZSBub3JtYWxpemVkIFZlYzIuXG4gKi9cblZlYzIubm9ybWFsaXplID0gZnVuY3Rpb24gbm9ybWFsaXplKHYsIG91dHB1dCkge1xuICAgIHZhciB4ID0gdi54O1xuICAgIHZhciB5ID0gdi55O1xuXG4gICAgdmFyIGxlbmd0aCA9IE1hdGguc3FydCh4ICogeCArIHkgKiB5KSB8fCAxO1xuICAgIGxlbmd0aCA9IDEgLyBsZW5ndGg7XG4gICAgb3V0cHV0LnggPSB2LnggKiBsZW5ndGg7XG4gICAgb3V0cHV0LnkgPSB2LnkgKiBsZW5ndGg7XG5cbiAgICByZXR1cm4gb3V0cHV0O1xufTtcblxuLyoqXG4gKiBDbG9uZSB0aGUgaW5wdXQgVmVjMi5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtWZWMyfSB2IFRoZSBWZWMyIHRvIGNsb25lLlxuICpcbiAqIEByZXR1cm4ge1ZlYzJ9IFRoZSBjbG9uZWQgVmVjMi5cbiAqL1xuVmVjMi5jbG9uZSA9IGZ1bmN0aW9uIGNsb25lKHYpIHtcbiAgICByZXR1cm4gbmV3IFZlYzIodi54LCB2LnkpO1xufTtcblxuLyoqXG4gKiBBZGQgdGhlIGlucHV0IFZlYzIncy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtWZWMyfSB2MSBUaGUgbGVmdCBWZWMyLlxuICogQHBhcmFtIHtWZWMyfSB2MiBUaGUgcmlnaHQgVmVjMi5cbiAqIEBwYXJhbSB7VmVjMn0gb3V0cHV0IFZlYzIgaW4gd2hpY2ggdG8gcGxhY2UgdGhlIHJlc3VsdC5cbiAqXG4gKiBAcmV0dXJuIHtWZWMyfSBUaGUgcmVzdWx0IG9mIHRoZSBhZGRpdGlvbi5cbiAqL1xuVmVjMi5hZGQgPSBmdW5jdGlvbiBhZGQodjEsIHYyLCBvdXRwdXQpIHtcbiAgICBvdXRwdXQueCA9IHYxLnggKyB2Mi54O1xuICAgIG91dHB1dC55ID0gdjEueSArIHYyLnk7XG5cbiAgICByZXR1cm4gb3V0cHV0O1xufTtcblxuLyoqXG4gKiBTdWJ0cmFjdCB0aGUgc2Vjb25kIFZlYzIgZnJvbSB0aGUgZmlyc3QuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7VmVjMn0gdjEgVGhlIGxlZnQgVmVjMi5cbiAqIEBwYXJhbSB7VmVjMn0gdjIgVGhlIHJpZ2h0IFZlYzIuXG4gKiBAcGFyYW0ge1ZlYzJ9IG91dHB1dCBWZWMyIGluIHdoaWNoIHRvIHBsYWNlIHRoZSByZXN1bHQuXG4gKlxuICogQHJldHVybiB7VmVjMn0gVGhlIHJlc3VsdCBvZiB0aGUgc3VidHJhY3Rpb24uXG4gKi9cblZlYzIuc3VidHJhY3QgPSBmdW5jdGlvbiBzdWJ0cmFjdCh2MSwgdjIsIG91dHB1dCkge1xuICAgIG91dHB1dC54ID0gdjEueCAtIHYyLng7XG4gICAgb3V0cHV0LnkgPSB2MS55IC0gdjIueTtcbiAgICByZXR1cm4gb3V0cHV0O1xufTtcblxuLyoqXG4gKiBTY2FsZSB0aGUgaW5wdXQgVmVjMi5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtWZWMyfSB2IFRoZSByZWZlcmVuY2UgVmVjMi5cbiAqIEBwYXJhbSB7TnVtYmVyfSBzIE51bWJlciB0byBzY2FsZSBieS5cbiAqIEBwYXJhbSB7VmVjMn0gb3V0cHV0IFZlYzIgaW4gd2hpY2ggdG8gcGxhY2UgdGhlIHJlc3VsdC5cbiAqXG4gKiBAcmV0dXJuIHtWZWMyfSBUaGUgcmVzdWx0IG9mIHRoZSBzY2FsaW5nLlxuICovXG5WZWMyLnNjYWxlID0gZnVuY3Rpb24gc2NhbGUodiwgcywgb3V0cHV0KSB7XG4gICAgb3V0cHV0LnggPSB2LnggKiBzO1xuICAgIG91dHB1dC55ID0gdi55ICogcztcbiAgICByZXR1cm4gb3V0cHV0O1xufTtcblxuLyoqXG4gKiBUaGUgZG90IHByb2R1Y3Qgb2YgdGhlIGlucHV0IFZlYzIncy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtWZWMyfSB2MSBUaGUgbGVmdCBWZWMyLlxuICogQHBhcmFtIHtWZWMyfSB2MiBUaGUgcmlnaHQgVmVjMi5cbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IFRoZSBkb3QgcHJvZHVjdC5cbiAqL1xuVmVjMi5kb3QgPSBmdW5jdGlvbiBkb3QodjEsIHYyKSB7XG4gICAgcmV0dXJuIHYxLnggKiB2Mi54ICsgdjEueSAqIHYyLnk7XG59O1xuXG4vKipcbiAqIFRoZSBjcm9zcyBwcm9kdWN0IG9mIHRoZSBpbnB1dCBWZWMyJ3MuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB2MSBUaGUgbGVmdCBWZWMyLlxuICogQHBhcmFtIHtOdW1iZXJ9IHYyIFRoZSByaWdodCBWZWMyLlxuICpcbiAqIEByZXR1cm4ge051bWJlcn0gVGhlIHotY29tcG9uZW50IG9mIHRoZSBjcm9zcyBwcm9kdWN0LlxuICovXG5WZWMyLmNyb3NzID0gZnVuY3Rpb24odjEsdjIpIHtcbiAgICByZXR1cm4gdjEueCAqIHYyLnkgLSB2MS55ICogdjIueDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVmVjMjtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBBIHRocmVlLWRpbWVuc2lvbmFsIHZlY3Rvci5cbiAqXG4gKiBAY2xhc3MgVmVjM1xuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB4IFRoZSB4IGNvbXBvbmVudC5cbiAqIEBwYXJhbSB7TnVtYmVyfSB5IFRoZSB5IGNvbXBvbmVudC5cbiAqIEBwYXJhbSB7TnVtYmVyfSB6IFRoZSB6IGNvbXBvbmVudC5cbiAqL1xudmFyIFZlYzMgPSBmdW5jdGlvbih4ICx5LCB6KXtcbiAgICB0aGlzLnggPSB4IHx8IDA7XG4gICAgdGhpcy55ID0geSB8fCAwO1xuICAgIHRoaXMueiA9IHogfHwgMDtcbn07XG5cbi8qKlxuICogU2V0IHRoZSBjb21wb25lbnRzIG9mIHRoZSBjdXJyZW50IFZlYzMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB4IFRoZSB4IGNvbXBvbmVudC5cbiAqIEBwYXJhbSB7TnVtYmVyfSB5IFRoZSB5IGNvbXBvbmVudC5cbiAqIEBwYXJhbSB7TnVtYmVyfSB6IFRoZSB6IGNvbXBvbmVudC5cbiAqXG4gKiBAcmV0dXJuIHtWZWMzfSB0aGlzXG4gKi9cblZlYzMucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIHNldCh4LCB5LCB6KSB7XG4gICAgaWYgKHggIT0gbnVsbCkgdGhpcy54ID0geDtcbiAgICBpZiAoeSAhPSBudWxsKSB0aGlzLnkgPSB5O1xuICAgIGlmICh6ICE9IG51bGwpIHRoaXMueiA9IHo7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWRkIHRoZSBpbnB1dCB2IHRvIHRoZSBjdXJyZW50IFZlYzMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7VmVjM30gdiBUaGUgVmVjMyB0byBhZGQuXG4gKlxuICogQHJldHVybiB7VmVjM30gdGhpc1xuICovXG5WZWMzLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiBhZGQodikge1xuICAgIHRoaXMueCArPSB2Lng7XG4gICAgdGhpcy55ICs9IHYueTtcbiAgICB0aGlzLnogKz0gdi56O1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFN1YnRyYWN0IHRoZSBpbnB1dCB2IGZyb20gdGhlIGN1cnJlbnQgVmVjMy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtWZWMzfSB2IFRoZSBWZWMzIHRvIHN1YnRyYWN0LlxuICpcbiAqIEByZXR1cm4ge1ZlYzN9IHRoaXNcbiAqL1xuVmVjMy5wcm90b3R5cGUuc3VidHJhY3QgPSBmdW5jdGlvbiBzdWJ0cmFjdCh2KSB7XG4gICAgdGhpcy54IC09IHYueDtcbiAgICB0aGlzLnkgLT0gdi55O1xuICAgIHRoaXMueiAtPSB2Lno7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUm90YXRlIHRoZSBjdXJyZW50IFZlYzMgYnkgdGhldGEgY2xvY2t3aXNlIGFib3V0IHRoZSB4IGF4aXMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB0aGV0YSBBbmdsZSBieSB3aGljaCB0byByb3RhdGUuXG4gKlxuICogQHJldHVybiB7VmVjM30gdGhpc1xuICovXG5WZWMzLnByb3RvdHlwZS5yb3RhdGVYID0gZnVuY3Rpb24gcm90YXRlWCh0aGV0YSkge1xuICAgIHZhciB5ID0gdGhpcy55O1xuICAgIHZhciB6ID0gdGhpcy56O1xuXG4gICAgdmFyIGNvc1RoZXRhID0gTWF0aC5jb3ModGhldGEpO1xuICAgIHZhciBzaW5UaGV0YSA9IE1hdGguc2luKHRoZXRhKTtcblxuICAgIHRoaXMueSA9IHkgKiBjb3NUaGV0YSAtIHogKiBzaW5UaGV0YTtcbiAgICB0aGlzLnogPSB5ICogc2luVGhldGEgKyB6ICogY29zVGhldGE7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUm90YXRlIHRoZSBjdXJyZW50IFZlYzMgYnkgdGhldGEgY2xvY2t3aXNlIGFib3V0IHRoZSB5IGF4aXMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB0aGV0YSBBbmdsZSBieSB3aGljaCB0byByb3RhdGUuXG4gKlxuICogQHJldHVybiB7VmVjM30gdGhpc1xuICovXG5WZWMzLnByb3RvdHlwZS5yb3RhdGVZID0gZnVuY3Rpb24gcm90YXRlWSh0aGV0YSkge1xuICAgIHZhciB4ID0gdGhpcy54O1xuICAgIHZhciB6ID0gdGhpcy56O1xuXG4gICAgdmFyIGNvc1RoZXRhID0gTWF0aC5jb3ModGhldGEpO1xuICAgIHZhciBzaW5UaGV0YSA9IE1hdGguc2luKHRoZXRhKTtcblxuICAgIHRoaXMueCA9IHogKiBzaW5UaGV0YSArIHggKiBjb3NUaGV0YTtcbiAgICB0aGlzLnogPSB6ICogY29zVGhldGEgLSB4ICogc2luVGhldGE7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUm90YXRlIHRoZSBjdXJyZW50IFZlYzMgYnkgdGhldGEgY2xvY2t3aXNlIGFib3V0IHRoZSB6IGF4aXMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB0aGV0YSBBbmdsZSBieSB3aGljaCB0byByb3RhdGUuXG4gKlxuICogQHJldHVybiB7VmVjM30gdGhpc1xuICovXG5WZWMzLnByb3RvdHlwZS5yb3RhdGVaID0gZnVuY3Rpb24gcm90YXRlWih0aGV0YSkge1xuICAgIHZhciB4ID0gdGhpcy54O1xuICAgIHZhciB5ID0gdGhpcy55O1xuXG4gICAgdmFyIGNvc1RoZXRhID0gTWF0aC5jb3ModGhldGEpO1xuICAgIHZhciBzaW5UaGV0YSA9IE1hdGguc2luKHRoZXRhKTtcblxuICAgIHRoaXMueCA9IHggKiBjb3NUaGV0YSAtIHkgKiBzaW5UaGV0YTtcbiAgICB0aGlzLnkgPSB4ICogc2luVGhldGEgKyB5ICogY29zVGhldGE7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogVGhlIGRvdCBwcm9kdWN0IG9mIHRoZSBjdXJyZW50IFZlYzMgd2l0aCBpbnB1dCBWZWMzIHYuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7VmVjM30gdiBUaGUgb3RoZXIgVmVjMy5cbiAqXG4gKiBAcmV0dXJuIHtWZWMzfSB0aGlzXG4gKi9cblZlYzMucHJvdG90eXBlLmRvdCA9IGZ1bmN0aW9uIGRvdCh2KSB7XG4gICAgcmV0dXJuIHRoaXMueCp2LnggKyB0aGlzLnkqdi55ICsgdGhpcy56KnYuejtcbn07XG5cbi8qKlxuICogVGhlIGRvdCBwcm9kdWN0IG9mIHRoZSBjdXJyZW50IFZlYzMgd2l0aCBpbnB1dCBWZWMzIHYuXG4gKiBTdG9yZXMgdGhlIHJlc3VsdCBpbiB0aGUgY3VycmVudCBWZWMzLlxuICpcbiAqIEBtZXRob2QgY3Jvc3NcbiAqXG4gKiBAcGFyYW0ge1ZlYzN9IHYgVGhlIG90aGVyIFZlYzNcbiAqXG4gKiBAcmV0dXJuIHtWZWMzfSB0aGlzXG4gKi9cblZlYzMucHJvdG90eXBlLmNyb3NzID0gZnVuY3Rpb24gY3Jvc3Modikge1xuICAgIHZhciB4ID0gdGhpcy54O1xuICAgIHZhciB5ID0gdGhpcy55O1xuICAgIHZhciB6ID0gdGhpcy56O1xuXG4gICAgdmFyIHZ4ID0gdi54O1xuICAgIHZhciB2eSA9IHYueTtcbiAgICB2YXIgdnogPSB2Lno7XG5cbiAgICB0aGlzLnggPSB5ICogdnogLSB6ICogdnk7XG4gICAgdGhpcy55ID0geiAqIHZ4IC0geCAqIHZ6O1xuICAgIHRoaXMueiA9IHggKiB2eSAtIHkgKiB2eDtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2NhbGUgdGhlIGN1cnJlbnQgVmVjMyBieSBhIHNjYWxhci5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHMgVGhlIE51bWJlciBieSB3aGljaCB0byBzY2FsZVxuICpcbiAqIEByZXR1cm4ge1ZlYzN9IHRoaXNcbiAqL1xuVmVjMy5wcm90b3R5cGUuc2NhbGUgPSBmdW5jdGlvbiBzY2FsZShzKSB7XG4gICAgdGhpcy54ICo9IHM7XG4gICAgdGhpcy55ICo9IHM7XG4gICAgdGhpcy56ICo9IHM7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUHJlc2VydmUgdGhlIG1hZ25pdHVkZSBidXQgaW52ZXJ0IHRoZSBvcmllbnRhdGlvbiBvZiB0aGUgY3VycmVudCBWZWMzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtWZWMzfSB0aGlzXG4gKi9cblZlYzMucHJvdG90eXBlLmludmVydCA9IGZ1bmN0aW9uIGludmVydCgpIHtcbiAgICB0aGlzLnggPSAtdGhpcy54O1xuICAgIHRoaXMueSA9IC10aGlzLnk7XG4gICAgdGhpcy56ID0gLXRoaXMuejtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBcHBseSBhIGZ1bmN0aW9uIGNvbXBvbmVudC13aXNlIHRvIHRoZSBjdXJyZW50IFZlYzMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIEZ1bmN0aW9uIHRvIGFwcGx5LlxuICpcbiAqIEByZXR1cm4ge1ZlYzN9IHRoaXNcbiAqL1xuVmVjMy5wcm90b3R5cGUubWFwID0gZnVuY3Rpb24gbWFwKGZuKSB7XG4gICAgdGhpcy54ID0gZm4odGhpcy54KTtcbiAgICB0aGlzLnkgPSBmbih0aGlzLnkpO1xuICAgIHRoaXMueiA9IGZuKHRoaXMueik7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogVGhlIG1hZ25pdHVkZSBvZiB0aGUgY3VycmVudCBWZWMzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IHRoZSBtYWduaXR1ZGUgb2YgdGhlIFZlYzNcbiAqL1xuVmVjMy5wcm90b3R5cGUubGVuZ3RoID0gZnVuY3Rpb24gbGVuZ3RoKCkge1xuICAgIHZhciB4ID0gdGhpcy54O1xuICAgIHZhciB5ID0gdGhpcy55O1xuICAgIHZhciB6ID0gdGhpcy56O1xuXG4gICAgcmV0dXJuIE1hdGguc3FydCh4ICogeCArIHkgKiB5ICsgeiAqIHopO1xufTtcblxuLyoqXG4gKiBUaGUgbWFnbml0dWRlIHNxdWFyZWQgb2YgdGhlIGN1cnJlbnQgVmVjMy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7TnVtYmVyfSBtYWduaXR1ZGUgb2YgdGhlIFZlYzMgc3F1YXJlZFxuICovXG5WZWMzLnByb3RvdHlwZS5sZW5ndGhTcSA9IGZ1bmN0aW9uIGxlbmd0aFNxKCkge1xuICAgIHZhciB4ID0gdGhpcy54O1xuICAgIHZhciB5ID0gdGhpcy55O1xuICAgIHZhciB6ID0gdGhpcy56O1xuXG4gICAgcmV0dXJuIHggKiB4ICsgeSAqIHkgKyB6ICogejtcbn07XG5cbi8qKlxuICogQ29weSB0aGUgaW5wdXQgb250byB0aGUgY3VycmVudCBWZWMzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1ZlYzN9IHYgVmVjMyB0byBjb3B5XG4gKlxuICogQHJldHVybiB7VmVjM30gdGhpc1xuICovXG5WZWMzLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24gY29weSh2KSB7XG4gICAgdGhpcy54ID0gdi54O1xuICAgIHRoaXMueSA9IHYueTtcbiAgICB0aGlzLnogPSB2Lno7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlc2V0IHRoZSBjdXJyZW50IFZlYzMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge1ZlYzN9IHRoaXNcbiAqL1xuVmVjMy5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbiBjbGVhcigpIHtcbiAgICB0aGlzLnggPSAwO1xuICAgIHRoaXMueSA9IDA7XG4gICAgdGhpcy56ID0gMDtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQ2hlY2sgd2hldGhlciB0aGUgbWFnbml0dWRlIG9mIHRoZSBjdXJyZW50IFZlYzMgaXMgZXhhY3RseSAwLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtCb29sZWFufSB3aGV0aGVyIG9yIG5vdCB0aGUgbWFnbml0dWRlIGlzIHplcm9cbiAqL1xuVmVjMy5wcm90b3R5cGUuaXNaZXJvID0gZnVuY3Rpb24gaXNaZXJvKCkge1xuICAgIHJldHVybiB0aGlzLnggPT09IDAgJiYgdGhpcy55ID09PSAwICYmIHRoaXMueiA9PT0gMDtcbn07XG5cbi8qKlxuICogVGhlIGFycmF5IGZvcm0gb2YgdGhlIGN1cnJlbnQgVmVjMy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7QXJyYXl9IGEgdGhyZWUgZWxlbWVudCBhcnJheSByZXByZXNlbnRpbmcgdGhlIGNvbXBvbmVudHMgb2YgdGhlIFZlYzNcbiAqL1xuVmVjMy5wcm90b3R5cGUudG9BcnJheSA9IGZ1bmN0aW9uIHRvQXJyYXkoKSB7XG4gICAgcmV0dXJuIFt0aGlzLngsIHRoaXMueSwgdGhpcy56XTtcbn07XG5cbi8qKlxuICogUHJlc2VydmUgdGhlIG9yaWVudGF0aW9uIGJ1dCBjaGFuZ2UgdGhlIGxlbmd0aCBvZiB0aGUgY3VycmVudCBWZWMzIHRvIDEuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge1ZlYzN9IHRoaXNcbiAqL1xuVmVjMy5wcm90b3R5cGUubm9ybWFsaXplID0gZnVuY3Rpb24gbm9ybWFsaXplKCkge1xuICAgIHZhciB4ID0gdGhpcy54O1xuICAgIHZhciB5ID0gdGhpcy55O1xuICAgIHZhciB6ID0gdGhpcy56O1xuXG4gICAgdmFyIGxlbiA9IE1hdGguc3FydCh4ICogeCArIHkgKiB5ICsgeiAqIHopIHx8IDE7XG4gICAgbGVuID0gMSAvIGxlbjtcblxuICAgIHRoaXMueCAqPSBsZW47XG4gICAgdGhpcy55ICo9IGxlbjtcbiAgICB0aGlzLnogKj0gbGVuO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBcHBseSB0aGUgcm90YXRpb24gY29ycmVzcG9uZGluZyB0byB0aGUgaW5wdXQgKHVuaXQpIFF1YXRlcm5pb25cbiAqIHRvIHRoZSBjdXJyZW50IFZlYzMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7UXVhdGVybmlvbn0gcSBVbml0IFF1YXRlcm5pb24gcmVwcmVzZW50aW5nIHRoZSByb3RhdGlvbiB0byBhcHBseVxuICpcbiAqIEByZXR1cm4ge1ZlYzN9IHRoaXNcbiAqL1xuVmVjMy5wcm90b3R5cGUuYXBwbHlSb3RhdGlvbiA9IGZ1bmN0aW9uIGFwcGx5Um90YXRpb24ocSkge1xuICAgIHZhciBjdyA9IHEudztcbiAgICB2YXIgY3ggPSAtcS54O1xuICAgIHZhciBjeSA9IC1xLnk7XG4gICAgdmFyIGN6ID0gLXEuejtcblxuICAgIHZhciB2eCA9IHRoaXMueDtcbiAgICB2YXIgdnkgPSB0aGlzLnk7XG4gICAgdmFyIHZ6ID0gdGhpcy56O1xuXG4gICAgdmFyIHR3ID0gLWN4ICogdnggLSBjeSAqIHZ5IC0gY3ogKiB2ejtcbiAgICB2YXIgdHggPSB2eCAqIGN3ICsgdnkgKiBjeiAtIGN5ICogdno7XG4gICAgdmFyIHR5ID0gdnkgKiBjdyArIGN4ICogdnogLSB2eCAqIGN6O1xuICAgIHZhciB0eiA9IHZ6ICogY3cgKyB2eCAqIGN5IC0gY3ggKiB2eTtcblxuICAgIHZhciB3ID0gY3c7XG4gICAgdmFyIHggPSAtY3g7XG4gICAgdmFyIHkgPSAtY3k7XG4gICAgdmFyIHogPSAtY3o7XG5cbiAgICB0aGlzLnggPSB0eCAqIHcgKyB4ICogdHcgKyB5ICogdHogLSB0eSAqIHo7XG4gICAgdGhpcy55ID0gdHkgKiB3ICsgeSAqIHR3ICsgdHggKiB6IC0geCAqIHR6O1xuICAgIHRoaXMueiA9IHR6ICogdyArIHogKiB0dyArIHggKiB0eSAtIHR4ICogeTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQXBwbHkgdGhlIGlucHV0IE1hdDMzIHRoZSB0aGUgY3VycmVudCBWZWMzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge01hdDMzfSBtYXRyaXggTWF0MzMgdG8gYXBwbHlcbiAqXG4gKiBAcmV0dXJuIHtWZWMzfSB0aGlzXG4gKi9cblZlYzMucHJvdG90eXBlLmFwcGx5TWF0cml4ID0gZnVuY3Rpb24gYXBwbHlNYXRyaXgobWF0cml4KSB7XG4gICAgdmFyIE0gPSBtYXRyaXguZ2V0KCk7XG5cbiAgICB2YXIgeCA9IHRoaXMueDtcbiAgICB2YXIgeSA9IHRoaXMueTtcbiAgICB2YXIgeiA9IHRoaXMuejtcblxuICAgIHRoaXMueCA9IE1bMF0qeCArIE1bMV0qeSArIE1bMl0qejtcbiAgICB0aGlzLnkgPSBNWzNdKnggKyBNWzRdKnkgKyBNWzVdKno7XG4gICAgdGhpcy56ID0gTVs2XSp4ICsgTVs3XSp5ICsgTVs4XSp6O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBOb3JtYWxpemUgdGhlIGlucHV0IFZlYzMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7VmVjM30gdiBUaGUgcmVmZXJlbmNlIFZlYzMuXG4gKiBAcGFyYW0ge1ZlYzN9IG91dHB1dCBWZWMzIGluIHdoaWNoIHRvIHBsYWNlIHRoZSByZXN1bHQuXG4gKlxuICogQHJldHVybiB7VmVjM30gVGhlIG5vcm1hbGl6ZSBWZWMzLlxuICovXG5WZWMzLm5vcm1hbGl6ZSA9IGZ1bmN0aW9uIG5vcm1hbGl6ZSh2LCBvdXRwdXQpIHtcbiAgICB2YXIgeCA9IHYueDtcbiAgICB2YXIgeSA9IHYueTtcbiAgICB2YXIgeiA9IHYuejtcblxuICAgIHZhciBsZW5ndGggPSBNYXRoLnNxcnQoeCAqIHggKyB5ICogeSArIHogKiB6KSB8fCAxO1xuICAgIGxlbmd0aCA9IDEgLyBsZW5ndGg7XG5cbiAgICBvdXRwdXQueCA9IHggKiBsZW5ndGg7XG4gICAgb3V0cHV0LnkgPSB5ICogbGVuZ3RoO1xuICAgIG91dHB1dC56ID0geiAqIGxlbmd0aDtcbiAgICByZXR1cm4gb3V0cHV0O1xufTtcblxuLyoqXG4gKiBBcHBseSBhIHJvdGF0aW9uIHRvIHRoZSBpbnB1dCBWZWMzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1ZlYzN9IHYgVGhlIHJlZmVyZW5jZSBWZWMzLlxuICogQHBhcmFtIHtRdWF0ZXJuaW9ufSBxIFVuaXQgUXVhdGVybmlvbiByZXByZXNlbnRpbmcgdGhlIHJvdGF0aW9uIHRvIGFwcGx5LlxuICogQHBhcmFtIHtWZWMzfSBvdXRwdXQgVmVjMyBpbiB3aGljaCB0byBwbGFjZSB0aGUgcmVzdWx0LlxuICpcbiAqIEByZXR1cm4ge1ZlYzN9IFRoZSByb3RhdGVkIHZlcnNpb24gb2YgdGhlIGlucHV0IFZlYzMuXG4gKi9cblZlYzMuYXBwbHlSb3RhdGlvbiA9IGZ1bmN0aW9uIGFwcGx5Um90YXRpb24odiwgcSwgb3V0cHV0KSB7XG4gICAgdmFyIGN3ID0gcS53O1xuICAgIHZhciBjeCA9IC1xLng7XG4gICAgdmFyIGN5ID0gLXEueTtcbiAgICB2YXIgY3ogPSAtcS56O1xuXG4gICAgdmFyIHZ4ID0gdi54O1xuICAgIHZhciB2eSA9IHYueTtcbiAgICB2YXIgdnogPSB2Lno7XG5cbiAgICB2YXIgdHcgPSAtY3ggKiB2eCAtIGN5ICogdnkgLSBjeiAqIHZ6O1xuICAgIHZhciB0eCA9IHZ4ICogY3cgKyB2eSAqIGN6IC0gY3kgKiB2ejtcbiAgICB2YXIgdHkgPSB2eSAqIGN3ICsgY3ggKiB2eiAtIHZ4ICogY3o7XG4gICAgdmFyIHR6ID0gdnogKiBjdyArIHZ4ICogY3kgLSBjeCAqIHZ5O1xuXG4gICAgdmFyIHcgPSBjdztcbiAgICB2YXIgeCA9IC1jeDtcbiAgICB2YXIgeSA9IC1jeTtcbiAgICB2YXIgeiA9IC1jejtcblxuICAgIG91dHB1dC54ID0gdHggKiB3ICsgeCAqIHR3ICsgeSAqIHR6IC0gdHkgKiB6O1xuICAgIG91dHB1dC55ID0gdHkgKiB3ICsgeSAqIHR3ICsgdHggKiB6IC0geCAqIHR6O1xuICAgIG91dHB1dC56ID0gdHogKiB3ICsgeiAqIHR3ICsgeCAqIHR5IC0gdHggKiB5O1xuICAgIHJldHVybiBvdXRwdXQ7XG59O1xuXG4vKipcbiAqIENsb25lIHRoZSBpbnB1dCBWZWMzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1ZlYzN9IHYgVGhlIFZlYzMgdG8gY2xvbmUuXG4gKlxuICogQHJldHVybiB7VmVjM30gVGhlIGNsb25lZCBWZWMzLlxuICovXG5WZWMzLmNsb25lID0gZnVuY3Rpb24gY2xvbmUodikge1xuICAgIHJldHVybiBuZXcgVmVjMyh2LngsIHYueSwgdi56KTtcbn07XG5cbi8qKlxuICogQWRkIHRoZSBpbnB1dCBWZWMzJ3MuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7VmVjM30gdjEgVGhlIGxlZnQgVmVjMy5cbiAqIEBwYXJhbSB7VmVjM30gdjIgVGhlIHJpZ2h0IFZlYzMuXG4gKiBAcGFyYW0ge1ZlYzN9IG91dHB1dCBWZWMzIGluIHdoaWNoIHRvIHBsYWNlIHRoZSByZXN1bHQuXG4gKlxuICogQHJldHVybiB7VmVjM30gVGhlIHJlc3VsdCBvZiB0aGUgYWRkaXRpb24uXG4gKi9cblZlYzMuYWRkID0gZnVuY3Rpb24gYWRkKHYxLCB2Miwgb3V0cHV0KSB7XG4gICAgb3V0cHV0LnggPSB2MS54ICsgdjIueDtcbiAgICBvdXRwdXQueSA9IHYxLnkgKyB2Mi55O1xuICAgIG91dHB1dC56ID0gdjEueiArIHYyLno7XG4gICAgcmV0dXJuIG91dHB1dDtcbn07XG5cbi8qKlxuICogU3VidHJhY3QgdGhlIHNlY29uZCBWZWMzIGZyb20gdGhlIGZpcnN0LlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1ZlYzN9IHYxIFRoZSBsZWZ0IFZlYzMuXG4gKiBAcGFyYW0ge1ZlYzN9IHYyIFRoZSByaWdodCBWZWMzLlxuICogQHBhcmFtIHtWZWMzfSBvdXRwdXQgVmVjMyBpbiB3aGljaCB0byBwbGFjZSB0aGUgcmVzdWx0LlxuICpcbiAqIEByZXR1cm4ge1ZlYzN9IFRoZSByZXN1bHQgb2YgdGhlIHN1YnRyYWN0aW9uLlxuICovXG5WZWMzLnN1YnRyYWN0ID0gZnVuY3Rpb24gc3VidHJhY3QodjEsIHYyLCBvdXRwdXQpIHtcbiAgICBvdXRwdXQueCA9IHYxLnggLSB2Mi54O1xuICAgIG91dHB1dC55ID0gdjEueSAtIHYyLnk7XG4gICAgb3V0cHV0LnogPSB2MS56IC0gdjIuejtcbiAgICByZXR1cm4gb3V0cHV0O1xufTtcblxuLyoqXG4gKiBTY2FsZSB0aGUgaW5wdXQgVmVjMy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtWZWMzfSB2IFRoZSByZWZlcmVuY2UgVmVjMy5cbiAqIEBwYXJhbSB7TnVtYmVyfSBzIE51bWJlciB0byBzY2FsZSBieS5cbiAqIEBwYXJhbSB7VmVjM30gb3V0cHV0IFZlYzMgaW4gd2hpY2ggdG8gcGxhY2UgdGhlIHJlc3VsdC5cbiAqXG4gKiBAcmV0dXJuIHtWZWMzfSBUaGUgcmVzdWx0IG9mIHRoZSBzY2FsaW5nLlxuICovXG5WZWMzLnNjYWxlID0gZnVuY3Rpb24gc2NhbGUodiwgcywgb3V0cHV0KSB7XG4gICAgb3V0cHV0LnggPSB2LnggKiBzO1xuICAgIG91dHB1dC55ID0gdi55ICogcztcbiAgICBvdXRwdXQueiA9IHYueiAqIHM7XG4gICAgcmV0dXJuIG91dHB1dDtcbn07XG5cbi8qKlxuICogVGhlIGRvdCBwcm9kdWN0IG9mIHRoZSBpbnB1dCBWZWMzJ3MuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7VmVjM30gdjEgVGhlIGxlZnQgVmVjMy5cbiAqIEBwYXJhbSB7VmVjM30gdjIgVGhlIHJpZ2h0IFZlYzMuXG4gKlxuICogQHJldHVybiB7TnVtYmVyfSBUaGUgZG90IHByb2R1Y3QuXG4gKi9cblZlYzMuZG90ID0gZnVuY3Rpb24gZG90KHYxLCB2Mikge1xuICAgIHJldHVybiB2MS54ICogdjIueCArIHYxLnkgKiB2Mi55ICsgdjEueiAqIHYyLno7XG59O1xuXG4vKipcbiAqIFRoZSAocmlnaHQtaGFuZGVkKSBjcm9zcyBwcm9kdWN0IG9mIHRoZSBpbnB1dCBWZWMzJ3MuXG4gKiB2MSB4IHYyLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1ZlYzN9IHYxIFRoZSBsZWZ0IFZlYzMuXG4gKiBAcGFyYW0ge1ZlYzN9IHYyIFRoZSByaWdodCBWZWMzLlxuICogQHBhcmFtIHtWZWMzfSBvdXRwdXQgVmVjMyBpbiB3aGljaCB0byBwbGFjZSB0aGUgcmVzdWx0LlxuICpcbiAqIEByZXR1cm4ge09iamVjdH0gdGhlIG9iamVjdCB0aGUgcmVzdWx0IG9mIHRoZSBjcm9zcyBwcm9kdWN0IHdhcyBwbGFjZWQgaW50b1xuICovXG5WZWMzLmNyb3NzID0gZnVuY3Rpb24gY3Jvc3ModjEsIHYyLCBvdXRwdXQpIHtcbiAgICB2YXIgeDEgPSB2MS54O1xuICAgIHZhciB5MSA9IHYxLnk7XG4gICAgdmFyIHoxID0gdjEuejtcbiAgICB2YXIgeDIgPSB2Mi54O1xuICAgIHZhciB5MiA9IHYyLnk7XG4gICAgdmFyIHoyID0gdjIuejtcblxuICAgIG91dHB1dC54ID0geTEgKiB6MiAtIHoxICogeTI7XG4gICAgb3V0cHV0LnkgPSB6MSAqIHgyIC0geDEgKiB6MjtcbiAgICBvdXRwdXQueiA9IHgxICogeTIgLSB5MSAqIHgyO1xuICAgIHJldHVybiBvdXRwdXQ7XG59O1xuXG4vKipcbiAqIFRoZSBwcm9qZWN0aW9uIG9mIHYxIG9udG8gdjIuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7VmVjM30gdjEgVGhlIGxlZnQgVmVjMy5cbiAqIEBwYXJhbSB7VmVjM30gdjIgVGhlIHJpZ2h0IFZlYzMuXG4gKiBAcGFyYW0ge1ZlYzN9IG91dHB1dCBWZWMzIGluIHdoaWNoIHRvIHBsYWNlIHRoZSByZXN1bHQuXG4gKlxuICogQHJldHVybiB7T2JqZWN0fSB0aGUgb2JqZWN0IHRoZSByZXN1bHQgb2YgdGhlIGNyb3NzIHByb2R1Y3Qgd2FzIHBsYWNlZCBpbnRvIFxuICovXG5WZWMzLnByb2plY3QgPSBmdW5jdGlvbiBwcm9qZWN0KHYxLCB2Miwgb3V0cHV0KSB7XG4gICAgdmFyIHgxID0gdjEueDtcbiAgICB2YXIgeTEgPSB2MS55O1xuICAgIHZhciB6MSA9IHYxLno7XG4gICAgdmFyIHgyID0gdjIueDtcbiAgICB2YXIgeTIgPSB2Mi55O1xuICAgIHZhciB6MiA9IHYyLno7XG5cbiAgICB2YXIgc2NhbGUgPSB4MSAqIHgyICsgeTEgKiB5MiArIHoxICogejI7XG4gICAgc2NhbGUgLz0geDIgKiB4MiArIHkyICogeTIgKyB6MiAqIHoyO1xuXG4gICAgb3V0cHV0LnggPSB4MiAqIHNjYWxlO1xuICAgIG91dHB1dC55ID0geTIgKiBzY2FsZTtcbiAgICBvdXRwdXQueiA9IHoyICogc2NhbGU7XG5cbiAgICByZXR1cm4gb3V0cHV0O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBWZWMzO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBub29wXG5cbmZ1bmN0aW9uIG5vb3AoKSB7XG4gIHRocm93IG5ldyBFcnJvcihcbiAgICAgICdZb3Ugc2hvdWxkIGJ1bmRsZSB5b3VyIGNvZGUgJyArXG4gICAgICAndXNpbmcgYGdsc2xpZnlgIGFzIGEgdHJhbnNmb3JtLidcbiAgKVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBwcm9ncmFtaWZ5XG5cbmZ1bmN0aW9uIHByb2dyYW1pZnkodmVydGV4LCBmcmFnbWVudCwgdW5pZm9ybXMsIGF0dHJpYnV0ZXMpIHtcbiAgcmV0dXJuIHtcbiAgICB2ZXJ0ZXg6IHZlcnRleCwgXG4gICAgZnJhZ21lbnQ6IGZyYWdtZW50LFxuICAgIHVuaWZvcm1zOiB1bmlmb3JtcywgXG4gICAgYXR0cmlidXRlczogYXR0cmlidXRlc1xuICB9O1xufVxuIiwiLy8gaHR0cDovL3BhdWxpcmlzaC5jb20vMjAxMS9yZXF1ZXN0YW5pbWF0aW9uZnJhbWUtZm9yLXNtYXJ0LWFuaW1hdGluZy9cbi8vIGh0dHA6Ly9teS5vcGVyYS5jb20vZW1vbGxlci9ibG9nLzIwMTEvMTIvMjAvcmVxdWVzdGFuaW1hdGlvbmZyYW1lLWZvci1zbWFydC1lci1hbmltYXRpbmdcbi8vIHJlcXVlc3RBbmltYXRpb25GcmFtZSBwb2x5ZmlsbCBieSBFcmlrIE3DtmxsZXIuIGZpeGVzIGZyb20gUGF1bCBJcmlzaCBhbmQgVGlubyBaaWpkZWxcbi8vIE1JVCBsaWNlbnNlXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGxhc3RUaW1lID0gMDtcbnZhciB2ZW5kb3JzID0gWydtcycsICdtb3onLCAnd2Via2l0JywgJ28nXTtcblxudmFyIHJBRiwgY0FGO1xuXG5pZiAodHlwZW9mIHdpbmRvdyA9PT0gJ29iamVjdCcpIHtcbiAgICByQUYgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lO1xuICAgIGNBRiA9IHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cuY2FuY2VsUmVxdWVzdEFuaW1hdGlvbkZyYW1lO1xuICAgIGZvciAodmFyIHggPSAwOyB4IDwgdmVuZG9ycy5sZW5ndGggJiYgIXJBRjsgKyt4KSB7XG4gICAgICAgIHJBRiA9IHdpbmRvd1t2ZW5kb3JzW3hdICsgJ1JlcXVlc3RBbmltYXRpb25GcmFtZSddO1xuICAgICAgICBjQUYgPSB3aW5kb3dbdmVuZG9yc1t4XSArICdDYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXSB8fFxuICAgICAgICAgICAgICB3aW5kb3dbdmVuZG9yc1t4XSArICdDYW5jZWxBbmltYXRpb25GcmFtZSddO1xuICAgIH1cblxuICAgIGlmIChyQUYgJiYgIWNBRikge1xuICAgICAgICAvLyBjQUYgbm90IHN1cHBvcnRlZC5cbiAgICAgICAgLy8gRmFsbCBiYWNrIHRvIHNldEludGVydmFsIGZvciBub3cgKHZlcnkgcmFyZSkuXG4gICAgICAgIHJBRiA9IG51bGw7XG4gICAgfVxufVxuXG5pZiAoIXJBRikge1xuICAgIHZhciBub3cgPSBEYXRlLm5vdyA/IERhdGUubm93IDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgfTtcblxuICAgIHJBRiA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBjdXJyVGltZSA9IG5vdygpO1xuICAgICAgICB2YXIgdGltZVRvQ2FsbCA9IE1hdGgubWF4KDAsIDE2IC0gKGN1cnJUaW1lIC0gbGFzdFRpbWUpKTtcbiAgICAgICAgdmFyIGlkID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhjdXJyVGltZSArIHRpbWVUb0NhbGwpO1xuICAgICAgICB9LCB0aW1lVG9DYWxsKTtcbiAgICAgICAgbGFzdFRpbWUgPSBjdXJyVGltZSArIHRpbWVUb0NhbGw7XG4gICAgICAgIHJldHVybiBpZDtcbiAgICB9O1xuXG4gICAgY0FGID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgIGNsZWFyVGltZW91dChpZCk7XG4gICAgfTtcbn1cblxudmFyIGFuaW1hdGlvbkZyYW1lID0ge1xuICAgIC8qKlxuICAgICAqIENyb3NzIGJyb3dzZXIgdmVyc2lvbiBvZiBbcmVxdWVzdEFuaW1hdGlvbkZyYW1lXXtAbGluayBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvd2luZG93L3JlcXVlc3RBbmltYXRpb25GcmFtZX0uXG4gICAgICpcbiAgICAgKiBVc2VkIGJ5IEVuZ2luZSBpbiBvcmRlciB0byBlc3RhYmxpc2ggYSByZW5kZXIgbG9vcC5cbiAgICAgKlxuICAgICAqIElmIG5vICh2ZW5kb3IgcHJlZml4ZWQgdmVyc2lvbiBvZikgYHJlcXVlc3RBbmltYXRpb25GcmFtZWAgaXMgYXZhaWxhYmxlLFxuICAgICAqIGBzZXRUaW1lb3V0YCB3aWxsIGJlIHVzZWQgaW4gb3JkZXIgdG8gZW11bGF0ZSBhIHJlbmRlciBsb29wIHJ1bm5pbmcgYXRcbiAgICAgKiBhcHByb3hpbWF0ZWx5IDYwIGZyYW1lcyBwZXIgc2Vjb25kLlxuICAgICAqXG4gICAgICogQG1ldGhvZCAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lXG4gICAgICpcbiAgICAgKiBAcGFyYW0gICB7RnVuY3Rpb259ICBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBpbnZva2VkIG9uIHRoZSBuZXh0IGZyYW1lLlxuICAgICAqIEByZXR1cm4gIHtOdW1iZXJ9ICAgIHJlcXVlc3RJZCB0byBiZSB1c2VkIHRvIGNhbmNlbCB0aGUgcmVxdWVzdCB1c2luZ1xuICAgICAqICAgICAgICAgICAgICAgICAgICAgIEBsaW5re2NhbmNlbEFuaW1hdGlvbkZyYW1lfS5cbiAgICAgKi9cbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWU6IHJBRixcblxuICAgIC8qKlxuICAgICAqIENyb3NzIGJyb3dzZXIgdmVyc2lvbiBvZiBbY2FuY2VsQW5pbWF0aW9uRnJhbWVde0BsaW5rIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS93aW5kb3cvY2FuY2VsQW5pbWF0aW9uRnJhbWV9LlxuICAgICAqXG4gICAgICogQ2FuY2VscyBhIHByZXZpb3VzbHkgdXNpbmcgW3JlcXVlc3RBbmltYXRpb25GcmFtZV17QGxpbmsgYW5pbWF0aW9uRnJhbWUjcmVxdWVzdEFuaW1hdGlvbkZyYW1lfVxuICAgICAqIHNjaGVkdWxlZCByZXF1ZXN0LlxuICAgICAqXG4gICAgICogVXNlZCBmb3IgaW1tZWRpYXRlbHkgc3RvcHBpbmcgdGhlIHJlbmRlciBsb29wIHdpdGhpbiB0aGUgRW5naW5lLlxuICAgICAqXG4gICAgICogQG1ldGhvZCAgY2FuY2VsQW5pbWF0aW9uRnJhbWVcbiAgICAgKlxuICAgICAqIEBwYXJhbSAgIHtOdW1iZXJ9ICAgIHJlcXVlc3RJZCBvZiB0aGUgc2NoZWR1bGVkIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgcmV0dXJuZWQgYnkgW3JlcXVlc3RBbmltYXRpb25GcmFtZV17QGxpbmsgYW5pbWF0aW9uRnJhbWUjcmVxdWVzdEFuaW1hdGlvbkZyYW1lfS5cbiAgICAgKi9cbiAgICBjYW5jZWxBbmltYXRpb25GcmFtZTogY0FGXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGFuaW1hdGlvbkZyYW1lO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqIFxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqIFxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICogXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKiBcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lOiByZXF1aXJlKCcuL2FuaW1hdGlvbkZyYW1lJykucmVxdWVzdEFuaW1hdGlvbkZyYW1lLFxuICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lOiByZXF1aXJlKCcuL2FuaW1hdGlvbkZyYW1lJykuY2FuY2VsQW5pbWF0aW9uRnJhbWVcbn07XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICogXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICogXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKiBcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqIFxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgcG9seWZpbGxzID0gcmVxdWlyZSgnLi4vcG9seWZpbGxzJyk7XG52YXIgckFGID0gcG9seWZpbGxzLnJlcXVlc3RBbmltYXRpb25GcmFtZTtcbnZhciBjQUYgPSBwb2x5ZmlsbHMuY2FuY2VsQW5pbWF0aW9uRnJhbWU7XG5cbi8qKlxuICogQm9vbGVhbiBjb25zdGFudCBpbmRpY2F0aW5nIHdoZXRoZXIgdGhlIFJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AgaGFzIGFjY2VzcyB0byB0aGUgZG9jdW1lbnQuXG4gKiBUaGUgZG9jdW1lbnQgaXMgYmVpbmcgdXNlZCBpbiBvcmRlciB0byBzdWJzY3JpYmUgZm9yIHZpc2liaWxpdHljaGFuZ2UgZXZlbnRzXG4gKiB1c2VkIGZvciBub3JtYWxpemluZyB0aGUgUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcCB0aW1lIHdoZW4gZS5nLiB3aGVuIHN3aXRjaGluZyB0YWJzLlxuICogXG4gKiBAY29uc3RhbnRcbiAqIEB0eXBlIHtCb29sZWFufVxuICovIFxudmFyIERPQ1VNRU5UX0FDQ0VTUyA9IHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCc7XG5cbmlmIChET0NVTUVOVF9BQ0NFU1MpIHtcbiAgICB2YXIgVkVORE9SX0hJRERFTiwgVkVORE9SX1ZJU0lCSUxJVFlfQ0hBTkdFO1xuXG4gICAgLy8gT3BlcmEgMTIuMTAgYW5kIEZpcmVmb3ggMTggYW5kIGxhdGVyIHN1cHBvcnRcbiAgICBpZiAodHlwZW9mIGRvY3VtZW50LmhpZGRlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgVkVORE9SX0hJRERFTiA9ICdoaWRkZW4nO1xuICAgICAgICBWRU5ET1JfVklTSUJJTElUWV9DSEFOR0UgPSAndmlzaWJpbGl0eWNoYW5nZSc7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiBkb2N1bWVudC5tb3pIaWRkZW4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIFZFTkRPUl9ISURERU4gPSAnbW96SGlkZGVuJztcbiAgICAgICAgVkVORE9SX1ZJU0lCSUxJVFlfQ0hBTkdFID0gJ21venZpc2liaWxpdHljaGFuZ2UnO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlb2YgZG9jdW1lbnQubXNIaWRkZW4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIFZFTkRPUl9ISURERU4gPSAnbXNIaWRkZW4nO1xuICAgICAgICBWRU5ET1JfVklTSUJJTElUWV9DSEFOR0UgPSAnbXN2aXNpYmlsaXR5Y2hhbmdlJztcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIGRvY3VtZW50LndlYmtpdEhpZGRlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgVkVORE9SX0hJRERFTiA9ICd3ZWJraXRIaWRkZW4nO1xuICAgICAgICBWRU5ET1JfVklTSUJJTElUWV9DSEFOR0UgPSAnd2Via2l0dmlzaWJpbGl0eWNoYW5nZSc7XG4gICAgfVxufVxuXG4vKipcbiAqIFJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AgY2xhc3MgdXNlZCBmb3IgdXBkYXRpbmcgb2JqZWN0cyBvbiBhIGZyYW1lLWJ5LWZyYW1lLiBTeW5jaHJvbml6ZXMgdGhlXG4gKiBgdXBkYXRlYCBtZXRob2QgaW52b2NhdGlvbnMgdG8gdGhlIHJlZnJlc2ggcmF0ZSBvZiB0aGUgc2NyZWVuLiBNYW5hZ2VzXG4gKiB0aGUgYHJlcXVlc3RBbmltYXRpb25GcmFtZWAtbG9vcCBieSBub3JtYWxpemluZyB0aGUgcGFzc2VkIGluIHRpbWVzdGFtcFxuICogd2hlbiBzd2l0Y2hpbmcgdGFicy5cbiAqIFxuICogQGNsYXNzIFJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3BcbiAqL1xuZnVuY3Rpb24gUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcCgpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIFxuICAgIC8vIFJlZmVyZW5jZXMgdG8gb2JqZWN0cyB0byBiZSB1cGRhdGVkIG9uIG5leHQgZnJhbWUuXG4gICAgdGhpcy5fdXBkYXRlcyA9IFtdO1xuICAgIFxuICAgIHRoaXMuX2xvb3BlciA9IGZ1bmN0aW9uKHRpbWUpIHtcbiAgICAgICAgX3RoaXMubG9vcCh0aW1lKTtcbiAgICB9O1xuICAgIHRoaXMuX3RpbWUgPSAwO1xuICAgIHRoaXMuX3N0b3BwZWRBdCA9IDA7XG4gICAgdGhpcy5fc2xlZXAgPSAwO1xuICAgIFxuICAgIC8vIEluZGljYXRlcyB3aGV0aGVyIHRoZSBlbmdpbmUgc2hvdWxkIGJlIHJlc3RhcnRlZCB3aGVuIHRoZSB0YWIvIHdpbmRvdyBpc1xuICAgIC8vIGJlaW5nIGZvY3VzZWQgYWdhaW4gKHZpc2liaWxpdHkgY2hhbmdlKS5cbiAgICB0aGlzLl9zdGFydE9uVmlzaWJpbGl0eUNoYW5nZSA9IHRydWU7XG4gICAgXG4gICAgLy8gcmVxdWVzdElkIGFzIHJldHVybmVkIGJ5IHJlcXVlc3RBbmltYXRpb25GcmFtZSBmdW5jdGlvbjtcbiAgICB0aGlzLl9yQUYgPSBudWxsO1xuICAgIFxuICAgIHRoaXMuX3NsZWVwRGlmZiA9IHRydWU7XG4gICAgXG4gICAgLy8gVGhlIGVuZ2luZSBpcyBiZWluZyBzdGFydGVkIG9uIGluc3RhbnRpYXRpb24uXG4gICAgLy8gVE9ETyhhbGV4YW5kZXJHdWdlbClcbiAgICB0aGlzLnN0YXJ0KCk7XG5cbiAgICAvLyBUaGUgUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcCBzdXBwb3J0cyBydW5uaW5nIGluIGEgbm9uLWJyb3dzZXIgZW52aXJvbm1lbnQgKGUuZy4gV29ya2VyKS5cbiAgICBpZiAoRE9DVU1FTlRfQUNDRVNTKSB7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoVkVORE9SX1ZJU0lCSUxJVFlfQ0hBTkdFLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIF90aGlzLl9vblZpc2liaWxpdHlDaGFuZ2UoKTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG4vKipcbiAqIEhhbmRsZSB0aGUgc3dpdGNoaW5nIG9mIHRhYnMuXG4gKlxuICogQG1ldGhvZFxuICogX3ByaXZhdGVcbiAqIFxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcC5wcm90b3R5cGUuX29uVmlzaWJpbGl0eUNoYW5nZSA9IGZ1bmN0aW9uIF9vblZpc2liaWxpdHlDaGFuZ2UoKSB7XG4gICAgaWYgKGRvY3VtZW50W1ZFTkRPUl9ISURERU5dKSB7XG4gICAgICAgIHRoaXMuX29uVW5mb2N1cygpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5fb25Gb2N1cygpO1xuICAgIH1cbn07XG5cbi8qKlxuICogSW50ZXJuYWwgaGVscGVyIGZ1bmN0aW9uIHRvIGJlIGludm9rZWQgYXMgc29vbiBhcyB0aGUgd2luZG93LyB0YWIgaXMgYmVpbmdcbiAqIGZvY3VzZWQgYWZ0ZXIgYSB2aXNpYmlsdGl5IGNoYW5nZS5cbiAqIFxuICogQG1ldGhvZFxuICogQHByaXZhdGVcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovIFxuUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcC5wcm90b3R5cGUuX29uRm9jdXMgPSBmdW5jdGlvbiBfb25Gb2N1cygpIHtcbiAgICBpZiAodGhpcy5fc3RhcnRPblZpc2liaWxpdHlDaGFuZ2UpIHtcbiAgICAgICAgdGhpcy5fc3RhcnQoKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEludGVybmFsIGhlbHBlciBmdW5jdGlvbiB0byBiZSBpbnZva2VkIGFzIHNvb24gYXMgdGhlIHdpbmRvdy8gdGFiIGlzIGJlaW5nXG4gKiB1bmZvY3VzZWQgKGhpZGRlbikgYWZ0ZXIgYSB2aXNpYmlsdGl5IGNoYW5nZS5cbiAqIFxuICogQG1ldGhvZCAgX29uRm9jdXNcbiAqIEBwcml2YXRlXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqLyBcblJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AucHJvdG90eXBlLl9vblVuZm9jdXMgPSBmdW5jdGlvbiBfb25VbmZvY3VzKCkge1xuICAgIHRoaXMuX3N0b3AoKTtcbn07XG5cbi8qKlxuICogU3RhcnRzIHRoZSBSZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wLiBXaGVuIHN3aXRjaGluZyB0byBhIGRpZmZlcm50IHRhYi8gd2luZG93IChjaGFuZ2luZyB0aGVcbiAqIHZpc2liaWx0aXkpLCB0aGUgZW5naW5lIHdpbGwgYmUgcmV0YXJ0ZWQgd2hlbiBzd2l0Y2hpbmcgYmFjayB0byBhIHZpc2libGVcbiAqIHN0YXRlLlxuICpcbiAqIEBtZXRob2RcbiAqIFxuICogQHJldHVybiB7UmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcH0gdGhpc1xuICovXG5SZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wLnByb3RvdHlwZS5zdGFydCA9IGZ1bmN0aW9uIHN0YXJ0KCkge1xuICAgIGlmICghdGhpcy5fcnVubmluZykge1xuICAgICAgICB0aGlzLl9zdGFydE9uVmlzaWJpbGl0eUNoYW5nZSA9IHRydWU7XG4gICAgICAgIHRoaXMuX3N0YXJ0KCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBJbnRlcm5hbCB2ZXJzaW9uIG9mIFJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AncyBzdGFydCBmdW5jdGlvbiwgbm90IGFmZmVjdGluZyBiZWhhdmlvciBvbiB2aXNpYmlsdHlcbiAqIGNoYW5nZS5cbiAqIFxuICogQG1ldGhvZFxuICogQHByaXZhdGVcbipcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi8gXG5SZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wLnByb3RvdHlwZS5fc3RhcnQgPSBmdW5jdGlvbiBfc3RhcnQoKSB7XG4gICAgdGhpcy5fcnVubmluZyA9IHRydWU7XG4gICAgdGhpcy5fc2xlZXBEaWZmID0gdHJ1ZTtcbiAgICB0aGlzLl9yQUYgPSByQUYodGhpcy5fbG9vcGVyKTtcbn07XG5cbi8qKlxuICogU3RvcHMgdGhlIFJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AuXG4gKlxuICogQG1ldGhvZFxuICogXG4gKiBAcmV0dXJuIHtSZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wfSB0aGlzXG4gKi9cblJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbiBzdG9wKCkge1xuICAgIGlmICh0aGlzLl9ydW5uaW5nKSB7XG4gICAgICAgIHRoaXMuX3N0YXJ0T25WaXNpYmlsaXR5Q2hhbmdlID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX3N0b3AoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEludGVybmFsIHZlcnNpb24gb2YgUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcCdzIHN0b3AgZnVuY3Rpb24sIG5vdCBhZmZlY3RpbmcgYmVoYXZpb3Igb24gdmlzaWJpbHR5XG4gKiBjaGFuZ2UuXG4gKiBcbiAqIEBtZXRob2RcbiAqIEBwcml2YXRlXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqLyBcblJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AucHJvdG90eXBlLl9zdG9wID0gZnVuY3Rpb24gX3N0b3AoKSB7XG4gICAgdGhpcy5fcnVubmluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3N0b3BwZWRBdCA9IHRoaXMuX3RpbWU7XG5cbiAgICAvLyBCdWcgaW4gb2xkIHZlcnNpb25zIG9mIEZ4LiBFeHBsaWNpdGx5IGNhbmNlbC5cbiAgICBjQUYodGhpcy5fckFGKTtcbn07XG5cbi8qKlxuICogRGV0ZXJtaW5lcyB3aGV0aGVyIHRoZSBSZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wIGlzIGN1cnJlbnRseSBydW5uaW5nIG9yIG5vdC5cbiAqXG4gKiBAbWV0aG9kXG4gKiBcbiAqIEByZXR1cm4ge0Jvb2xlYW59IGJvb2xlYW4gdmFsdWUgaW5kaWNhdGluZyB3aGV0aGVyIHRoZSBSZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wIGlzIGN1cnJlbnRseSBydW5uaW5nIG9yIG5vdFxuICovXG5SZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wLnByb3RvdHlwZS5pc1J1bm5pbmcgPSBmdW5jdGlvbiBpc1J1bm5pbmcoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3J1bm5pbmc7XG59O1xuXG4vKipcbiAqIFVwZGF0ZXMgYWxsIHJlZ2lzdGVyZWQgb2JqZWN0cy5cbiAqXG4gKiBAbWV0aG9kXG4gKiBcbiAqIEBwYXJhbSB7TnVtYmVyfSB0aW1lIGhpZ2ggcmVzb2x1dGlvbiB0aW1zdGFtcCB1c2VkIGZvciBpbnZva2luZyB0aGUgYHVwZGF0ZWAgbWV0aG9kIG9uIGFsbCByZWdpc3RlcmVkIG9iamVjdHNcbiAqXG4gKiBAcmV0dXJuIHtSZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wfSB0aGlzXG4gKi9cblJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AucHJvdG90eXBlLnN0ZXAgPSBmdW5jdGlvbiBzdGVwICh0aW1lKSB7XG4gICAgdGhpcy5fdGltZSA9IHRpbWU7XG4gICAgaWYgKHRoaXMuX3NsZWVwRGlmZikge1xuICAgICAgICB0aGlzLl9zbGVlcCArPSB0aW1lIC0gdGhpcy5fc3RvcHBlZEF0O1xuICAgICAgICB0aGlzLl9zbGVlcERpZmYgPSBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgLy8gVGhlIHNhbWUgdGltZXRhbXAgd2lsbCBiZSBlbWl0dGVkIGltbWVkaWF0ZWx5IGJlZm9yZSBhbmQgYWZ0ZXIgdmlzaWJpbGl0eVxuICAgIC8vIGNoYW5nZS5cbiAgICB2YXIgbm9ybWFsaXplZFRpbWUgPSB0aW1lIC0gdGhpcy5fc2xlZXA7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHRoaXMuX3VwZGF0ZXMubGVuZ3RoIDsgaSA8IGxlbiA7IGkrKykge1xuICAgICAgICB0aGlzLl91cGRhdGVzW2ldLnVwZGF0ZShub3JtYWxpemVkVGltZSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBNZXRob2QgYmVpbmcgY2FsbGVkIGJ5IGByZXF1ZXN0QW5pbWF0aW9uRnJhbWVgIG9uIGV2ZXJ5IHBhaW50LiBJbmRpcmVjdGx5XG4gKiByZWN1cnNpdmUgYnkgc2NoZWR1bGluZyBhIGZ1dHVyZSBpbnZvY2F0aW9uIG9mIGl0c2VsZiBvbiB0aGUgbmV4dCBwYWludC5cbiAqXG4gKiBAbWV0aG9kXG4gKiBcbiAqIEBwYXJhbSB7TnVtYmVyfSB0aW1lIGhpZ2ggcmVzb2x1dGlvbiB0aW1zdGFtcCB1c2VkIGZvciBpbnZva2luZyB0aGUgYHVwZGF0ZWAgbWV0aG9kIG9uIGFsbCByZWdpc3RlcmVkIG9iamVjdHNcbiAqIEByZXR1cm4ge1JlcXVlc3RBbmltYXRpb25GcmFtZUxvb3B9IHRoaXNcbiAqL1xuUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcC5wcm90b3R5cGUubG9vcCA9IGZ1bmN0aW9uIGxvb3AodGltZSkge1xuICAgIHRoaXMuc3RlcCh0aW1lKTtcbiAgICB0aGlzLl9yQUYgPSByQUYodGhpcy5fbG9vcGVyKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmVnaXN0ZXJlcyBhbiB1cGRhdGVhYmxlIG9iamVjdCB3aGljaCBgdXBkYXRlYCBtZXRob2Qgc2hvdWxkIGJlIGludm9rZWQgb25cbiAqIGV2ZXJ5IHBhaW50LCBzdGFydGluZyBvbiB0aGUgbmV4dCBwYWludCAoYXNzdW1pbmcgdGhlIFJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AgaXMgcnVubmluZykuXG4gKlxuICogQG1ldGhvZFxuICogXG4gKiBAcGFyYW0ge09iamVjdH0gdXBkYXRlYWJsZSBvYmplY3QgdG8gYmUgdXBkYXRlZFxuICogQHBhcmFtIHtGdW5jdGlvbn0gdXBkYXRlYWJsZS51cGRhdGUgdXBkYXRlIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBvbiB0aGUgcmVnaXN0ZXJlZCBvYmplY3RcbiAqXG4gKiBAcmV0dXJuIHtSZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wfSB0aGlzXG4gKi9cblJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIHVwZGF0ZSh1cGRhdGVhYmxlKSB7XG4gICAgaWYgKHRoaXMuX3VwZGF0ZXMuaW5kZXhPZih1cGRhdGVhYmxlKSA9PT0gLTEpIHtcbiAgICAgICAgdGhpcy5fdXBkYXRlcy5wdXNoKHVwZGF0ZWFibGUpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogRGVyZWdpc3RlcnMgYW4gdXBkYXRlYWJsZSBvYmplY3QgcHJldmlvdXNseSByZWdpc3RlcmVkIHVzaW5nIGB1cGRhdGVgIHRvIGJlXG4gKiBubyBsb25nZXIgdXBkYXRlZC5cbiAqXG4gKiBAbWV0aG9kXG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSB1cGRhdGVhYmxlIHVwZGF0ZWFibGUgb2JqZWN0IHByZXZpb3VzbHkgcmVnaXN0ZXJlZCB1c2luZyBgdXBkYXRlYFxuICpcbiAqIEByZXR1cm4ge1JlcXVlc3RBbmltYXRpb25GcmFtZUxvb3B9IHRoaXNcbiAqL1xuUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcC5wcm90b3R5cGUubm9Mb25nZXJVcGRhdGUgPSBmdW5jdGlvbiBub0xvbmdlclVwZGF0ZSh1cGRhdGVhYmxlKSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy5fdXBkYXRlcy5pbmRleE9mKHVwZGF0ZWFibGUpO1xuICAgIGlmIChpbmRleCA+IC0xKSB7XG4gICAgICAgIHRoaXMuX3VwZGF0ZXMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3A7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBDb250ZXh0ID0gcmVxdWlyZSgnLi9Db250ZXh0Jyk7XG52YXIgaW5qZWN0Q1NTID0gcmVxdWlyZSgnLi9pbmplY3QtY3NzJyk7XG5cbi8qKlxuICogSW5zdGFudGlhdGVzIGEgbmV3IENvbXBvc2l0b3IuXG4gKiBUaGUgQ29tcG9zaXRvciByZWNlaXZlcyBkcmF3IGNvbW1hbmRzIGZybSB0aGUgVUlNYW5hZ2VyIGFuZCByb3V0ZXMgdGhlIHRvIHRoZVxuICogcmVzcGVjdGl2ZSBjb250ZXh0IG9iamVjdHMuXG4gKlxuICogVXBvbiBjcmVhdGlvbiwgaXQgaW5qZWN0cyBhIHN0eWxlc2hlZXQgdXNlZCBmb3Igc3R5bGluZyB0aGUgaW5kaXZpZHVhbFxuICogcmVuZGVyZXJzIHVzZWQgaW4gdGhlIGNvbnRleHQgb2JqZWN0cy5cbiAqXG4gKiBAY2xhc3MgQ29tcG9zaXRvclxuICogQGNvbnN0cnVjdG9yXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5mdW5jdGlvbiBDb21wb3NpdG9yKCkge1xuICAgIGluamVjdENTUygpO1xuXG4gICAgdGhpcy5fY29udGV4dHMgPSB7fTtcbiAgICB0aGlzLl9vdXRDb21tYW5kcyA9IFtdO1xuICAgIHRoaXMuX2luQ29tbWFuZHMgPSBbXTtcbiAgICB0aGlzLl90aW1lID0gbnVsbDtcblxuICAgIHRoaXMuX3Jlc2l6ZWQgPSBmYWxzZTtcblxuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICBfdGhpcy5fcmVzaXplZCA9IHRydWU7XG4gICAgfSk7XG59XG5cbi8qKlxuICogUmV0cmlldmVzIHRoZSB0aW1lIGJlaW5nIHVzZWQgYnkgdGhlIGludGVybmFsIGNsb2NrIG1hbmFnZWQgYnlcbiAqIGBGYW1vdXNFbmdpbmVgLlxuICpcbiAqIFRoZSB0aW1lIGlzIGJlaW5nIHBhc3NlZCBpbnRvIGNvcmUgYnkgdGhlIEVuZ2luZSB0aHJvdWdoIHRoZSBVSU1hbmFnZXIuXG4gKiBTaW5jZSBjb3JlIGhhcyB0aGUgYWJpbGl0eSB0byBzY2FsZSB0aGUgdGltZSwgdGhlIHRpbWUgbmVlZHMgdG8gYmUgcGFzc2VkXG4gKiBiYWNrIHRvIHRoZSByZW5kZXJpbmcgc3lzdGVtLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IHRpbWUgVGhlIGNsb2NrIHRpbWUgdXNlZCBpbiBjb3JlLlxuICovXG5Db21wb3NpdG9yLnByb3RvdHlwZS5nZXRUaW1lID0gZnVuY3Rpb24gZ2V0VGltZSgpIHtcbiAgICByZXR1cm4gdGhpcy5fdGltZTtcbn07XG5cbi8qKlxuICogU2NoZWR1bGVzIGFuIGV2ZW50IHRvIGJlIHNlbnQgdGhlIG5leHQgdGltZSB0aGUgb3V0IGNvbW1hbmQgcXVldWUgaXMgYmVpbmdcbiAqIGZsdXNoZWQuXG4gKlxuICogQG1ldGhvZFxuICogQHByaXZhdGVcbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHBhdGggUmVuZGVyIHBhdGggdG8gdGhlIG5vZGUgdGhlIGV2ZW50IHNob3VsZCBiZSB0cmlnZ2VyZWRcbiAqIG9uICgqdGFyZ2V0ZWQgZXZlbnQqKVxuICogQHBhcmFtICB7U3RyaW5nfSBldiBFdmVudCB0eXBlXG4gKiBAcGFyYW0gIHtPYmplY3R9IHBheWxvYWQgRXZlbnQgb2JqZWN0IChzZXJpYWxpemFibGUgdXNpbmcgc3RydWN0dXJlZCBjbG9uaW5nXG4gKiBhbGdvcml0aG0pXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuQ29tcG9zaXRvci5wcm90b3R5cGUuc2VuZEV2ZW50ID0gZnVuY3Rpb24gc2VuZEV2ZW50KHBhdGgsIGV2LCBwYXlsb2FkKSB7XG4gICAgdGhpcy5fb3V0Q29tbWFuZHMucHVzaCgnV0lUSCcsIHBhdGgsICdUUklHR0VSJywgZXYsIHBheWxvYWQpO1xufTtcblxuLyoqXG4gKiBJbnRlcm5hbCBoZWxwZXIgbWV0aG9kIHVzZWQgZm9yIG5vdGlmeWluZyBleHRlcm5hbGx5XG4gKiByZXNpemVkIGNvbnRleHRzIChlLmcuIGJ5IHJlc2l6aW5nIHRoZSBicm93c2VyIHdpbmRvdykuXG4gKlxuICogQG1ldGhvZFxuICogQHByaXZhdGVcbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHNlbGVjdG9yIHJlbmRlciBwYXRoIHRvIHRoZSBub2RlIChjb250ZXh0KSB0aGF0IHNob3VsZCBiZVxuICogcmVzaXplZFxuICogQHBhcmFtICB7QXJyYXl9IHNpemUgbmV3IGNvbnRleHQgc2l6ZVxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkNvbXBvc2l0b3IucHJvdG90eXBlLnNlbmRSZXNpemUgPSBmdW5jdGlvbiBzZW5kUmVzaXplIChzZWxlY3Rvciwgc2l6ZSkge1xuICAgIHRoaXMuc2VuZEV2ZW50KHNlbGVjdG9yLCAnQ09OVEVYVF9SRVNJWkUnLCBzaXplKTtcbn07XG5cbi8qKlxuICogSW50ZXJuYWwgaGVscGVyIG1ldGhvZCB1c2VkIGJ5IGBkcmF3Q29tbWFuZHNgLlxuICogU3Vic2VxdWVudCBjb21tYW5kcyBhcmUgYmVpbmcgYXNzb2NpYXRlZCB3aXRoIHRoZSBub2RlIGRlZmluZWQgdGhlIHRoZSBwYXRoXG4gKiBmb2xsb3dpbmcgdGhlIGBXSVRIYCBjb21tYW5kLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwcml2YXRlXG4gKlxuICogQHBhcmFtICB7TnVtYmVyfSBpdGVyYXRvciBwb3NpdGlvbiBpbmRleCB3aXRoaW4gdGhlIGNvbW1hbmRzIHF1ZXVlXG4gKiBAcGFyYW0gIHtBcnJheX0gY29tbWFuZHMgcmVtYWluaW5nIG1lc3NhZ2UgcXVldWUgcmVjZWl2ZWQsIHVzZWQgdG9cbiAqIHNoaWZ0IHNpbmdsZSBtZXNzYWdlcyBmcm9tXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuQ29tcG9zaXRvci5wcm90b3R5cGUuaGFuZGxlV2l0aCA9IGZ1bmN0aW9uIGhhbmRsZVdpdGggKGl0ZXJhdG9yLCBjb21tYW5kcykge1xuICAgIHZhciBwYXRoID0gY29tbWFuZHNbaXRlcmF0b3JdO1xuICAgIHZhciBwYXRoQXJyID0gcGF0aC5zcGxpdCgnLycpO1xuICAgIHZhciBjb250ZXh0ID0gdGhpcy5nZXRPclNldENvbnRleHQocGF0aEFyci5zaGlmdCgpKTtcbiAgICByZXR1cm4gY29udGV4dC5yZWNlaXZlKHBhdGgsIGNvbW1hbmRzLCBpdGVyYXRvcik7XG59O1xuXG4vKipcbiAqIFJldHJpZXZlcyB0aGUgdG9wLWxldmVsIENvbnRleHQgYXNzb2NpYXRlZCB3aXRoIHRoZSBwYXNzZWQgaW4gZG9jdW1lbnRcbiAqIHF1ZXJ5IHNlbGVjdG9yLiBJZiBubyBzdWNoIENvbnRleHQgZXhpc3RzLCBhIG5ldyBvbmUgd2lsbCBiZSBpbnN0YW50aWF0ZWQuXG4gKlxuICogQG1ldGhvZFxuICogQHByaXZhdGVcbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHNlbGVjdG9yIGRvY3VtZW50IHF1ZXJ5IHNlbGVjdG9yIHVzZWQgZm9yIHJldHJpZXZpbmcgdGhlXG4gKiBET00gbm9kZSB0aGUgVmlydHVhbEVsZW1lbnQgc2hvdWxkIGJlIGF0dGFjaGVkIHRvXG4gKlxuICogQHJldHVybiB7Q29udGV4dH0gY29udGV4dFxuICovXG5Db21wb3NpdG9yLnByb3RvdHlwZS5nZXRPclNldENvbnRleHQgPSBmdW5jdGlvbiBnZXRPclNldENvbnRleHQoc2VsZWN0b3IpIHtcbiAgICBpZiAodGhpcy5fY29udGV4dHNbc2VsZWN0b3JdKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jb250ZXh0c1tzZWxlY3Rvcl07XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB2YXIgY29udGV4dCA9IG5ldyBDb250ZXh0KHNlbGVjdG9yLCB0aGlzKTtcbiAgICAgICAgdGhpcy5fY29udGV4dHNbc2VsZWN0b3JdID0gY29udGV4dDtcbiAgICAgICAgcmV0dXJuIGNvbnRleHQ7XG4gICAgfVxufTtcblxuLyoqXG4gKiBJbnRlcm5hbCBoZWxwZXIgbWV0aG9kIHVzZWQgYnkgYGRyYXdDb21tYW5kc2AuXG4gKlxuICogQG1ldGhvZFxuICogQHByaXZhdGVcbiAqXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IGl0ZXJhdG9yIHBvc2l0aW9uIGluZGV4IHdpdGhpbiB0aGUgY29tbWFuZCBxdWV1ZVxuICogQHBhcmFtICB7QXJyYXl9IGNvbW1hbmRzIHJlbWFpbmluZyBtZXNzYWdlIHF1ZXVlIHJlY2VpdmVkLCB1c2VkIHRvXG4gKiBzaGlmdCBzaW5nbGUgbWVzc2FnZXNcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5Db21wb3NpdG9yLnByb3RvdHlwZS5naXZlU2l6ZUZvciA9IGZ1bmN0aW9uIGdpdmVTaXplRm9yKGl0ZXJhdG9yLCBjb21tYW5kcykge1xuICAgIHZhciBzZWxlY3RvciA9IGNvbW1hbmRzW2l0ZXJhdG9yXTtcbiAgICB2YXIgc2l6ZSA9IHRoaXMuZ2V0T3JTZXRDb250ZXh0KHNlbGVjdG9yKS5nZXRSb290U2l6ZSgpO1xuICAgIHRoaXMuc2VuZFJlc2l6ZShzZWxlY3Rvciwgc2l6ZSk7XG59O1xuXG4vKipcbiAqIFByb2Nlc3NlcyB0aGUgcHJldmlvdXNseSB2aWEgYHJlY2VpdmVDb21tYW5kc2AgdXBkYXRlZCBpbmNvbWluZyBcImluXCJcbiAqIGNvbW1hbmQgcXVldWUuXG4gKiBDYWxsZWQgYnkgVUlNYW5hZ2VyIG9uIGEgZnJhbWUgYnkgZnJhbWUgYmFzaXMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge0FycmF5fSBvdXRDb21tYW5kcyBzZXQgb2YgY29tbWFuZHMgdG8gYmUgc2VudCBiYWNrXG4gKi9cbkNvbXBvc2l0b3IucHJvdG90eXBlLmRyYXdDb21tYW5kcyA9IGZ1bmN0aW9uIGRyYXdDb21tYW5kcygpIHtcbiAgICB2YXIgY29tbWFuZHMgPSB0aGlzLl9pbkNvbW1hbmRzO1xuICAgIHZhciBsb2NhbEl0ZXJhdG9yID0gMDtcbiAgICB2YXIgY29tbWFuZCA9IGNvbW1hbmRzW2xvY2FsSXRlcmF0b3JdO1xuICAgIHdoaWxlIChjb21tYW5kKSB7XG4gICAgICAgIHN3aXRjaCAoY29tbWFuZCkge1xuICAgICAgICAgICAgY2FzZSAnVElNRSc6XG4gICAgICAgICAgICAgICAgdGhpcy5fdGltZSA9IGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl07XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdXSVRIJzpcbiAgICAgICAgICAgICAgICBsb2NhbEl0ZXJhdG9yID0gdGhpcy5oYW5kbGVXaXRoKCsrbG9jYWxJdGVyYXRvciwgY29tbWFuZHMpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnTkVFRF9TSVpFX0ZPUic6XG4gICAgICAgICAgICAgICAgdGhpcy5naXZlU2l6ZUZvcigrK2xvY2FsSXRlcmF0b3IsIGNvbW1hbmRzKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjb21tYW5kID0gY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXTtcbiAgICB9XG5cbiAgICAvLyBUT0RPOiBTd2l0Y2ggdG8gYXNzb2NpYXRpdmUgYXJyYXlzIGhlcmUuLi5cblxuICAgIGZvciAodmFyIGtleSBpbiB0aGlzLl9jb250ZXh0cykge1xuICAgICAgICB0aGlzLl9jb250ZXh0c1trZXldLmRyYXcoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcmVzaXplZCkge1xuICAgICAgICB0aGlzLnVwZGF0ZVNpemUoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5fb3V0Q29tbWFuZHM7XG59O1xuXG5cbi8qKlxuICogVXBkYXRlcyB0aGUgc2l6ZSBvZiBhbGwgcHJldmlvdXNseSByZWdpc3RlcmVkIGNvbnRleHQgb2JqZWN0cy5cbiAqIFRoaXMgcmVzdWx0cyBpbnRvIENPTlRFWFRfUkVTSVpFIGV2ZW50cyBiZWluZyBzZW50IGFuZCB0aGUgcm9vdCBlbGVtZW50c1xuICogdXNlZCBieSB0aGUgaW5kaXZpZHVhbCByZW5kZXJlcnMgYmVpbmcgcmVzaXplZCB0byB0aGUgdGhlIERPTVJlbmRlcmVyJ3Mgcm9vdFxuICogc2l6ZS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuQ29tcG9zaXRvci5wcm90b3R5cGUudXBkYXRlU2l6ZSA9IGZ1bmN0aW9uIHVwZGF0ZVNpemUoKSB7XG4gICAgZm9yICh2YXIgc2VsZWN0b3IgaW4gdGhpcy5fY29udGV4dHMpIHtcbiAgICAgICAgdGhpcy5fY29udGV4dHNbc2VsZWN0b3JdLnVwZGF0ZVNpemUoKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFVzZWQgYnkgVGhyZWFkTWFuYWdlciB0byB1cGRhdGUgdGhlIGludGVybmFsIHF1ZXVlIG9mIGluY29taW5nIGNvbW1hbmRzLlxuICogUmVjZWl2aW5nIGNvbW1hbmRzIGRvZXMgbm90IGltbWVkaWF0ZWx5IHN0YXJ0IHRoZSByZW5kZXJpbmcgcHJvY2Vzcy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtICB7QXJyYXl9IGNvbW1hbmRzIGNvbW1hbmQgcXVldWUgdG8gYmUgcHJvY2Vzc2VkIGJ5IHRoZSBjb21wb3NpdG9yJ3NcbiAqIGBkcmF3Q29tbWFuZHNgIG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkNvbXBvc2l0b3IucHJvdG90eXBlLnJlY2VpdmVDb21tYW5kcyA9IGZ1bmN0aW9uIHJlY2VpdmVDb21tYW5kcyhjb21tYW5kcykge1xuICAgIHZhciBsZW4gPSBjb21tYW5kcy5sZW5ndGg7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICB0aGlzLl9pbkNvbW1hbmRzLnB1c2goY29tbWFuZHNbaV0pO1xuICAgIH1cbn07XG5cbi8qKlxuICogRmx1c2hlcyB0aGUgcXVldWUgb2Ygb3V0Z29pbmcgXCJvdXRcIiBjb21tYW5kcy5cbiAqIENhbGxlZCBieSBUaHJlYWRNYW5hZ2VyLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5Db21wb3NpdG9yLnByb3RvdHlwZS5jbGVhckNvbW1hbmRzID0gZnVuY3Rpb24gY2xlYXJDb21tYW5kcygpIHtcbiAgICB0aGlzLl9pbkNvbW1hbmRzLmxlbmd0aCA9IDA7XG4gICAgdGhpcy5fb3V0Q29tbWFuZHMubGVuZ3RoID0gMDtcbiAgICB0aGlzLl9yZXNpemVkID0gZmFsc2U7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvc2l0b3I7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBXZWJHTFJlbmRlcmVyID0gcmVxdWlyZSgnLi4vd2ViZ2wtcmVuZGVyZXJzL1dlYkdMUmVuZGVyZXInKTtcbnZhciBDYW1lcmEgPSByZXF1aXJlKCcuLi9jb21wb25lbnRzL0NhbWVyYScpO1xudmFyIERPTVJlbmRlcmVyID0gcmVxdWlyZSgnLi4vZG9tLXJlbmRlcmVycy9ET01SZW5kZXJlcicpO1xuXG4vKipcbiAqIENvbnRleHQgaXMgYSByZW5kZXIgbGF5ZXIgd2l0aCBpdHMgb3duIFdlYkdMUmVuZGVyZXIgYW5kIERPTVJlbmRlcmVyLlxuICogSXQgaXMgdGhlIGludGVyZmFjZSBiZXR3ZWVuIHRoZSBDb21wb3NpdG9yIHdoaWNoIHJlY2VpdmVzIGNvbW1hbmRzXG4gKiBhbmQgdGhlIHJlbmRlcmVycyB0aGF0IGludGVycHJldCB0aGVtLiBJdCBhbHNvIHJlbGF5cyBpbmZvcm1hdGlvbiB0b1xuICogdGhlIHJlbmRlcmVycyBhYm91dCByZXNpemluZy5cbiAqXG4gKiBUaGUgRE9NRWxlbWVudCBhdCB0aGUgZ2l2ZW4gcXVlcnkgc2VsZWN0b3IgaXMgdXNlZCBhcyB0aGUgcm9vdC4gQVxuICogbmV3IERPTUVsZW1lbnQgaXMgYXBwZW5kZWQgdG8gdGhpcyByb290IGVsZW1lbnQsIGFuZCB1c2VkIGFzIHRoZVxuICogcGFyZW50IGVsZW1lbnQgZm9yIGFsbCBGYW1vdXMgRE9NIHJlbmRlcmluZyBhdCB0aGlzIGNvbnRleHQuIEFcbiAqIGNhbnZhcyBpcyBhZGRlZCBhbmQgdXNlZCBmb3IgYWxsIFdlYkdMIHJlbmRlcmluZyBhdCB0aGlzIGNvbnRleHQuXG4gKlxuICogQGNsYXNzIENvbnRleHRcbiAqIEBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzZWxlY3RvciBRdWVyeSBzZWxlY3RvciB1c2VkIHRvIGxvY2F0ZSByb290IGVsZW1lbnQgb2ZcbiAqIGNvbnRleHQgbGF5ZXIuXG4gKiBAcGFyYW0ge0NvbXBvc2l0b3J9IGNvbXBvc2l0b3IgQ29tcG9zaXRvciByZWZlcmVuY2UgdG8gcGFzcyBkb3duIHRvXG4gKiBXZWJHTFJlbmRlcmVyLlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbmZ1bmN0aW9uIENvbnRleHQoc2VsZWN0b3IsIGNvbXBvc2l0b3IpIHtcbiAgICB0aGlzLl9jb21wb3NpdG9yID0gY29tcG9zaXRvcjtcbiAgICB0aGlzLl9yb290RWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcblxuICAgIHRoaXMuX3NlbGVjdG9yID0gc2VsZWN0b3I7XG5cbiAgICAvLyBDcmVhdGUgRE9NIGVsZW1lbnQgdG8gYmUgdXNlZCBhcyByb290IGZvciBhbGwgZmFtb3VzIERPTVxuICAgIC8vIHJlbmRlcmluZyBhbmQgYXBwZW5kIGVsZW1lbnQgdG8gdGhlIHJvb3QgZWxlbWVudC5cblxuICAgIHZhciBET01MYXllckVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgdGhpcy5fcm9vdEVsLmFwcGVuZENoaWxkKERPTUxheWVyRWwpO1xuXG4gICAgLy8gSW5zdGFudGlhdGUgcmVuZGVyZXJzXG5cbiAgICB0aGlzLkRPTVJlbmRlcmVyID0gbmV3IERPTVJlbmRlcmVyKERPTUxheWVyRWwsIHNlbGVjdG9yLCBjb21wb3NpdG9yKTtcbiAgICB0aGlzLldlYkdMUmVuZGVyZXIgPSBudWxsO1xuICAgIHRoaXMuY2FudmFzID0gbnVsbDtcblxuICAgIC8vIFN0YXRlIGhvbGRlcnNcblxuICAgIHRoaXMuX3JlbmRlclN0YXRlID0ge1xuICAgICAgICBwcm9qZWN0aW9uVHlwZTogQ2FtZXJhLk9SVEhPR1JBUEhJQ19QUk9KRUNUSU9OLFxuICAgICAgICBwZXJzcGVjdGl2ZVRyYW5zZm9ybTogbmV3IEZsb2F0MzJBcnJheShbMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMV0pLFxuICAgICAgICB2aWV3VHJhbnNmb3JtOiBuZXcgRmxvYXQzMkFycmF5KFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxXSksXG4gICAgICAgIHZpZXdEaXJ0eTogZmFsc2UsXG4gICAgICAgIHBlcnNwZWN0aXZlRGlydHk6IGZhbHNlXG4gICAgfTtcblxuICAgIHRoaXMuX3NpemUgPSBbXTtcbiAgICB0aGlzLl9jaGlsZHJlbiA9IHt9O1xuICAgIHRoaXMuX2VsZW1lbnRIYXNoID0ge307XG5cbiAgICB0aGlzLl9tZXNoVHJhbnNmb3JtID0gW107XG4gICAgdGhpcy5fbWVzaFNpemUgPSBbMCwgMCwgMF07XG59XG5cbi8qKlxuICogUXVlcmllcyBET01SZW5kZXJlciBzaXplIGFuZCB1cGRhdGVzIGNhbnZhcyBzaXplLiBSZWxheXMgc2l6ZSBpbmZvcm1hdGlvbiB0b1xuICogV2ViR0xSZW5kZXJlci5cbiAqXG4gKiBAcmV0dXJuIHtDb250ZXh0fSB0aGlzXG4gKi9cbkNvbnRleHQucHJvdG90eXBlLnVwZGF0ZVNpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG5ld1NpemUgPSB0aGlzLkRPTVJlbmRlcmVyLmdldFNpemUoKTtcbiAgICB0aGlzLl9jb21wb3NpdG9yLnNlbmRSZXNpemUodGhpcy5fc2VsZWN0b3IsIG5ld1NpemUpO1xuXG4gICAgdmFyIHdpZHRoID0gbmV3U2l6ZVswXTtcbiAgICB2YXIgaGVpZ2h0ID0gbmV3U2l6ZVsxXTtcblxuICAgIHRoaXMuX3NpemVbMF0gPSB3aWR0aDtcbiAgICB0aGlzLl9zaXplWzFdID0gaGVpZ2h0O1xuICAgIHRoaXMuX3NpemVbMl0gPSAod2lkdGggPiBoZWlnaHQpID8gd2lkdGggOiBoZWlnaHQ7XG5cbiAgICBpZiAodGhpcy5jYW52YXMpIHtcbiAgICAgICAgdGhpcy5jYW52YXMud2lkdGggID0gd2lkdGg7XG4gICAgICAgIHRoaXMuY2FudmFzLmhlaWdodCA9IGhlaWdodDtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5XZWJHTFJlbmRlcmVyKSB0aGlzLldlYkdMUmVuZGVyZXIudXBkYXRlU2l6ZSh0aGlzLl9zaXplKTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBEcmF3IGZ1bmN0aW9uIGNhbGxlZCBhZnRlciBhbGwgY29tbWFuZHMgaGF2ZSBiZWVuIGhhbmRsZWQgZm9yIGN1cnJlbnQgZnJhbWUuXG4gKiBJc3N1ZXMgZHJhdyBjb21tYW5kcyB0byBhbGwgcmVuZGVyZXJzIHdpdGggY3VycmVudCByZW5kZXJTdGF0ZS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuQ29udGV4dC5wcm90b3R5cGUuZHJhdyA9IGZ1bmN0aW9uIGRyYXcoKSB7XG4gICAgdGhpcy5ET01SZW5kZXJlci5kcmF3KHRoaXMuX3JlbmRlclN0YXRlKTtcbiAgICBpZiAodGhpcy5XZWJHTFJlbmRlcmVyKSB0aGlzLldlYkdMUmVuZGVyZXIuZHJhdyh0aGlzLl9yZW5kZXJTdGF0ZSk7XG5cbiAgICBpZiAodGhpcy5fcmVuZGVyU3RhdGUucGVyc3BlY3RpdmVEaXJ0eSkgdGhpcy5fcmVuZGVyU3RhdGUucGVyc3BlY3RpdmVEaXJ0eSA9IGZhbHNlO1xuICAgIGlmICh0aGlzLl9yZW5kZXJTdGF0ZS52aWV3RGlydHkpIHRoaXMuX3JlbmRlclN0YXRlLnZpZXdEaXJ0eSA9IGZhbHNlO1xufTtcblxuLyoqXG4gKiBHZXRzIHRoZSBzaXplIG9mIHRoZSBwYXJlbnQgZWxlbWVudCBvZiB0aGUgRE9NUmVuZGVyZXIgZm9yIHRoaXMgY29udGV4dC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuQ29udGV4dC5wcm90b3R5cGUuZ2V0Um9vdFNpemUgPSBmdW5jdGlvbiBnZXRSb290U2l6ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5ET01SZW5kZXJlci5nZXRTaXplKCk7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgaW5pdGlhbGl6YXRpb24gb2YgV2ViR0xSZW5kZXJlciB3aGVuIG5lY2Vzc2FyeSwgaW5jbHVkaW5nIGNyZWF0aW9uXG4gKiBvZiB0aGUgY2FudmFzIGVsZW1lbnQgYW5kIGluc3RhbnRpYXRpb24gb2YgdGhlIHJlbmRlcmVyLiBBbHNvIHVwZGF0ZXMgc2l6ZVxuICogdG8gcGFzcyBzaXplIGluZm9ybWF0aW9uIHRvIHRoZSByZW5kZXJlci5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuQ29udGV4dC5wcm90b3R5cGUuaW5pdFdlYkdMID0gZnVuY3Rpb24gaW5pdFdlYkdMKCkge1xuICAgIHRoaXMuY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgdGhpcy5fcm9vdEVsLmFwcGVuZENoaWxkKHRoaXMuY2FudmFzKTtcbiAgICB0aGlzLldlYkdMUmVuZGVyZXIgPSBuZXcgV2ViR0xSZW5kZXJlcih0aGlzLmNhbnZhcywgdGhpcy5fY29tcG9zaXRvcik7XG4gICAgdGhpcy51cGRhdGVTaXplKCk7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgZGVsZWdhdGlvbiBvZiBjb21tYW5kcyB0byByZW5kZXJlcnMgb2YgdGhpcyBjb250ZXh0LlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBTdHJpbmcgdXNlZCBhcyBpZGVudGlmaWVyIG9mIGEgZ2l2ZW4gbm9kZSBpbiB0aGVcbiAqIHNjZW5lIGdyYXBoLlxuICogQHBhcmFtIHtBcnJheX0gY29tbWFuZHMgTGlzdCBvZiBhbGwgY29tbWFuZHMgZnJvbSB0aGlzIGZyYW1lLlxuICogQHBhcmFtIHtOdW1iZXJ9IGl0ZXJhdG9yIE51bWJlciBpbmRpY2F0aW5nIHByb2dyZXNzIHRocm91Z2ggdGhlIGNvbW1hbmRcbiAqIHF1ZXVlLlxuICpcbiAqIEByZXR1cm4ge051bWJlcn0gaXRlcmF0b3IgaW5kaWNhdGluZyBwcm9ncmVzcyB0aHJvdWdoIHRoZSBjb21tYW5kIHF1ZXVlLlxuICovXG5Db250ZXh0LnByb3RvdHlwZS5yZWNlaXZlID0gZnVuY3Rpb24gcmVjZWl2ZShwYXRoLCBjb21tYW5kcywgaXRlcmF0b3IpIHtcbiAgICB2YXIgbG9jYWxJdGVyYXRvciA9IGl0ZXJhdG9yO1xuXG4gICAgdmFyIGNvbW1hbmQgPSBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdO1xuICAgIHRoaXMuRE9NUmVuZGVyZXIubG9hZFBhdGgocGF0aCk7XG4gICAgdGhpcy5ET01SZW5kZXJlci5maW5kVGFyZ2V0KCk7XG4gICAgd2hpbGUgKGNvbW1hbmQpIHtcblxuICAgICAgICBzd2l0Y2ggKGNvbW1hbmQpIHtcbiAgICAgICAgICAgIGNhc2UgJ0lOSVRfRE9NJzpcbiAgICAgICAgICAgICAgICB0aGlzLkRPTVJlbmRlcmVyLmluc2VydEVsKGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdET01fUkVOREVSX1NJWkUnOlxuICAgICAgICAgICAgICAgIHRoaXMuRE9NUmVuZGVyZXIuZ2V0U2l6ZU9mKGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdDSEFOR0VfVFJBTlNGT1JNJzpcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMCA7IGkgPCAxNiA7IGkrKykgdGhpcy5fbWVzaFRyYW5zZm9ybVtpXSA9IGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl07XG5cbiAgICAgICAgICAgICAgICB0aGlzLkRPTVJlbmRlcmVyLnNldE1hdHJpeCh0aGlzLl9tZXNoVHJhbnNmb3JtKTtcblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLldlYkdMUmVuZGVyZXIpXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuV2ViR0xSZW5kZXJlci5zZXRDdXRvdXRVbmlmb3JtKHBhdGgsICd1X3RyYW5zZm9ybScsIHRoaXMuX21lc2hUcmFuc2Zvcm0pO1xuXG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ0NIQU5HRV9TSVpFJzpcbiAgICAgICAgICAgICAgICB2YXIgd2lkdGggPSBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdO1xuICAgICAgICAgICAgICAgIHZhciBoZWlnaHQgPSBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5ET01SZW5kZXJlci5zZXRTaXplKHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLldlYkdMUmVuZGVyZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fbWVzaFNpemVbMF0gPSB3aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fbWVzaFNpemVbMV0gPSBoZWlnaHQ7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuV2ViR0xSZW5kZXJlci5zZXRDdXRvdXRVbmlmb3JtKHBhdGgsICd1X3NpemUnLCB0aGlzLl9tZXNoU2l6ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdDSEFOR0VfUFJPUEVSVFknOlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLldlYkdMUmVuZGVyZXIpIHRoaXMuV2ViR0xSZW5kZXJlci5nZXRPclNldEN1dG91dChwYXRoKTtcbiAgICAgICAgICAgICAgICB0aGlzLkRPTVJlbmRlcmVyLnNldFByb3BlcnR5KGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl0sIGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdDSEFOR0VfQ09OVEVOVCc6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuV2ViR0xSZW5kZXJlcikgdGhpcy5XZWJHTFJlbmRlcmVyLmdldE9yU2V0Q3V0b3V0KHBhdGgpO1xuICAgICAgICAgICAgICAgIHRoaXMuRE9NUmVuZGVyZXIuc2V0Q29udGVudChjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnQ0hBTkdFX0FUVFJJQlVURSc6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuV2ViR0xSZW5kZXJlcikgdGhpcy5XZWJHTFJlbmRlcmVyLmdldE9yU2V0Q3V0b3V0KHBhdGgpO1xuICAgICAgICAgICAgICAgIHRoaXMuRE9NUmVuZGVyZXIuc2V0QXR0cmlidXRlKGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl0sIGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdBRERfQ0xBU1MnOlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLldlYkdMUmVuZGVyZXIpIHRoaXMuV2ViR0xSZW5kZXJlci5nZXRPclNldEN1dG91dChwYXRoKTtcbiAgICAgICAgICAgICAgICB0aGlzLkRPTVJlbmRlcmVyLmFkZENsYXNzKGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdSRU1PVkVfQ0xBU1MnOlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLldlYkdMUmVuZGVyZXIpIHRoaXMuV2ViR0xSZW5kZXJlci5nZXRPclNldEN1dG91dChwYXRoKTtcbiAgICAgICAgICAgICAgICB0aGlzLkRPTVJlbmRlcmVyLnJlbW92ZUNsYXNzKGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdTVUJTQ1JJQkUnOlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLldlYkdMUmVuZGVyZXIpIHRoaXMuV2ViR0xSZW5kZXJlci5nZXRPclNldEN1dG91dChwYXRoKTtcbiAgICAgICAgICAgICAgICB0aGlzLkRPTVJlbmRlcmVyLnN1YnNjcmliZShjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdLCBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnR0xfU0VUX0RSQVdfT1BUSU9OUyc6XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLldlYkdMUmVuZGVyZXIpIHRoaXMuaW5pdFdlYkdMKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5XZWJHTFJlbmRlcmVyLnNldE1lc2hPcHRpb25zKHBhdGgsIGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdHTF9BTUJJRU5UX0xJR0hUJzpcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuV2ViR0xSZW5kZXJlcikgdGhpcy5pbml0V2ViR0woKTtcbiAgICAgICAgICAgICAgICB0aGlzLldlYkdMUmVuZGVyZXIuc2V0QW1iaWVudExpZ2h0Q29sb3IoXG4gICAgICAgICAgICAgICAgICAgIHBhdGgsXG4gICAgICAgICAgICAgICAgICAgIGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl0sXG4gICAgICAgICAgICAgICAgICAgIGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl0sXG4gICAgICAgICAgICAgICAgICAgIGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdHTF9MSUdIVF9QT1NJVElPTic6XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLldlYkdMUmVuZGVyZXIpIHRoaXMuaW5pdFdlYkdMKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5XZWJHTFJlbmRlcmVyLnNldExpZ2h0UG9zaXRpb24oXG4gICAgICAgICAgICAgICAgICAgIHBhdGgsXG4gICAgICAgICAgICAgICAgICAgIGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl0sXG4gICAgICAgICAgICAgICAgICAgIGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl0sXG4gICAgICAgICAgICAgICAgICAgIGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdHTF9MSUdIVF9DT0xPUic6XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLldlYkdMUmVuZGVyZXIpIHRoaXMuaW5pdFdlYkdMKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5XZWJHTFJlbmRlcmVyLnNldExpZ2h0Q29sb3IoXG4gICAgICAgICAgICAgICAgICAgIHBhdGgsXG4gICAgICAgICAgICAgICAgICAgIGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl0sXG4gICAgICAgICAgICAgICAgICAgIGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl0sXG4gICAgICAgICAgICAgICAgICAgIGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdNQVRFUklBTF9JTlBVVCc6XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLldlYkdMUmVuZGVyZXIpIHRoaXMuaW5pdFdlYkdMKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5XZWJHTFJlbmRlcmVyLmhhbmRsZU1hdGVyaWFsSW5wdXQoXG4gICAgICAgICAgICAgICAgICAgIHBhdGgsXG4gICAgICAgICAgICAgICAgICAgIGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl0sXG4gICAgICAgICAgICAgICAgICAgIGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdHTF9TRVRfR0VPTUVUUlknOlxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5XZWJHTFJlbmRlcmVyKSB0aGlzLmluaXRXZWJHTCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuV2ViR0xSZW5kZXJlci5zZXRHZW9tZXRyeShcbiAgICAgICAgICAgICAgICAgICAgcGF0aCxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ0dMX1VOSUZPUk1TJzpcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuV2ViR0xSZW5kZXJlcikgdGhpcy5pbml0V2ViR0woKTtcbiAgICAgICAgICAgICAgICB0aGlzLldlYkdMUmVuZGVyZXIuc2V0TWVzaFVuaWZvcm0oXG4gICAgICAgICAgICAgICAgICAgIHBhdGgsXG4gICAgICAgICAgICAgICAgICAgIGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl0sXG4gICAgICAgICAgICAgICAgICAgIGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdHTF9CVUZGRVJfREFUQSc6XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLldlYkdMUmVuZGVyZXIpIHRoaXMuaW5pdFdlYkdMKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5XZWJHTFJlbmRlcmVyLmJ1ZmZlckRhdGEoXG4gICAgICAgICAgICAgICAgICAgIHBhdGgsXG4gICAgICAgICAgICAgICAgICAgIGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl0sXG4gICAgICAgICAgICAgICAgICAgIGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl0sXG4gICAgICAgICAgICAgICAgICAgIGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl0sXG4gICAgICAgICAgICAgICAgICAgIGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl0sXG4gICAgICAgICAgICAgICAgICAgIGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdHTF9DVVRPVVRfU1RBVEUnOlxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5XZWJHTFJlbmRlcmVyKSB0aGlzLmluaXRXZWJHTCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuV2ViR0xSZW5kZXJlci5zZXRDdXRvdXRTdGF0ZShwYXRoLCBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnR0xfTUVTSF9WSVNJQklMSVRZJzpcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuV2ViR0xSZW5kZXJlcikgdGhpcy5pbml0V2ViR0woKTtcbiAgICAgICAgICAgICAgICB0aGlzLldlYkdMUmVuZGVyZXIuc2V0TWVzaFZpc2liaWxpdHkocGF0aCwgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ0dMX1JFTU9WRV9NRVNIJzpcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuV2ViR0xSZW5kZXJlcikgdGhpcy5pbml0V2ViR0woKTtcbiAgICAgICAgICAgICAgICB0aGlzLldlYkdMUmVuZGVyZXIucmVtb3ZlTWVzaChwYXRoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnUElOSE9MRV9QUk9KRUNUSU9OJzpcbiAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJTdGF0ZS5wcm9qZWN0aW9uVHlwZSA9IENhbWVyYS5QSU5IT0xFX1BST0pFQ1RJT047XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVyU3RhdGUucGVyc3BlY3RpdmVUcmFuc2Zvcm1bMTFdID0gLTEgLyBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVyU3RhdGUucGVyc3BlY3RpdmVEaXJ0eSA9IHRydWU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ09SVEhPR1JBUEhJQ19QUk9KRUNUSU9OJzpcbiAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJTdGF0ZS5wcm9qZWN0aW9uVHlwZSA9IENhbWVyYS5PUlRIT0dSQVBISUNfUFJPSkVDVElPTjtcbiAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsxMV0gPSAwO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVyU3RhdGUucGVyc3BlY3RpdmVEaXJ0eSA9IHRydWU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ0NIQU5HRV9WSUVXX1RSQU5TRk9STSc6XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVyU3RhdGUudmlld1RyYW5zZm9ybVswXSA9IGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl07XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVyU3RhdGUudmlld1RyYW5zZm9ybVsxXSA9IGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl07XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVyU3RhdGUudmlld1RyYW5zZm9ybVsyXSA9IGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl07XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVyU3RhdGUudmlld1RyYW5zZm9ybVszXSA9IGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl07XG5cbiAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJTdGF0ZS52aWV3VHJhbnNmb3JtWzRdID0gY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXTtcbiAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJTdGF0ZS52aWV3VHJhbnNmb3JtWzVdID0gY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXTtcbiAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJTdGF0ZS52aWV3VHJhbnNmb3JtWzZdID0gY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXTtcbiAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJTdGF0ZS52aWV3VHJhbnNmb3JtWzddID0gY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXTtcblxuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlclN0YXRlLnZpZXdUcmFuc2Zvcm1bOF0gPSBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdO1xuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlclN0YXRlLnZpZXdUcmFuc2Zvcm1bOV0gPSBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdO1xuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlclN0YXRlLnZpZXdUcmFuc2Zvcm1bMTBdID0gY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXTtcbiAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJTdGF0ZS52aWV3VHJhbnNmb3JtWzExXSA9IGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl07XG5cbiAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJTdGF0ZS52aWV3VHJhbnNmb3JtWzEyXSA9IGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl07XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVyU3RhdGUudmlld1RyYW5zZm9ybVsxM10gPSBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdO1xuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlclN0YXRlLnZpZXdUcmFuc2Zvcm1bMTRdID0gY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXTtcbiAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJTdGF0ZS52aWV3VHJhbnNmb3JtWzE1XSA9IGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl07XG5cbiAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJTdGF0ZS52aWV3RGlydHkgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdXSVRIJzogcmV0dXJuIGxvY2FsSXRlcmF0b3IgLSAxO1xuICAgICAgICB9XG5cbiAgICAgICAgY29tbWFuZCA9IGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl07XG4gICAgfVxuXG4gICAgcmV0dXJuIGxvY2FsSXRlcmF0b3I7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRleHQ7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogVGhlIFVJTWFuYWdlciBpcyBiZWluZyB1cGRhdGVkIGJ5IGFuIEVuZ2luZSBieSBjb25zZWN1dGl2ZWx5IGNhbGxpbmcgaXRzXG4gKiBgdXBkYXRlYCBtZXRob2QuIEl0IGNhbiBlaXRoZXIgbWFuYWdlIGEgcmVhbCBXZWItV29ya2VyIG9yIHRoZSBnbG9iYWxcbiAqIEZhbW91c0VuZ2luZSBjb3JlIHNpbmdsZXRvbi5cbiAqXG4gKiBAZXhhbXBsZVxuICogdmFyIGNvbXBvc2l0b3IgPSBuZXcgQ29tcG9zaXRvcigpO1xuICogdmFyIGVuZ2luZSA9IG5ldyBFbmdpbmUoKTtcbiAqXG4gKiAvLyBVc2luZyBhIFdlYiBXb3JrZXJcbiAqIHZhciB3b3JrZXIgPSBuZXcgV29ya2VyKCd3b3JrZXIuYnVuZGxlLmpzJyk7XG4gKiB2YXIgdGhyZWFkbWFuZ2VyID0gbmV3IFVJTWFuYWdlcih3b3JrZXIsIGNvbXBvc2l0b3IsIGVuZ2luZSk7XG4gKlxuICogLy8gV2l0aG91dCB1c2luZyBhIFdlYiBXb3JrZXJcbiAqIHZhciB0aHJlYWRtYW5nZXIgPSBuZXcgVUlNYW5hZ2VyKEZhbW91cywgY29tcG9zaXRvciwgZW5naW5lKTtcbiAqXG4gKiBAY2xhc3MgIFVJTWFuYWdlclxuICogQGNvbnN0cnVjdG9yXG4gKlxuICogQHBhcmFtIHtGYW1vdXN8V29ya2VyfSB0aHJlYWQgVGhlIHRocmVhZCBiZWluZyB1c2VkIHRvIHJlY2VpdmUgbWVzc2FnZXNcbiAqIGZyb20gYW5kIHBvc3QgbWVzc2FnZXMgdG8uIEV4cGVjdGVkIHRvIGV4cG9zZSBhIFdlYldvcmtlci1saWtlIEFQSSwgd2hpY2hcbiAqIG1lYW5zIHByb3ZpZGluZyBhIHdheSB0byBsaXN0ZW4gZm9yIHVwZGF0ZXMgYnkgc2V0dGluZyBpdHMgYG9ubWVzc2FnZWBcbiAqIHByb3BlcnR5IGFuZCBzZW5kaW5nIHVwZGF0ZXMgdXNpbmcgYHBvc3RNZXNzYWdlYC5cbiAqIEBwYXJhbSB7Q29tcG9zaXRvcn0gY29tcG9zaXRvciBhbiBpbnN0YW5jZSBvZiBDb21wb3NpdG9yIHVzZWQgdG8gZXh0cmFjdFxuICogZW5xdWV1ZWQgZHJhdyBjb21tYW5kcyBmcm9tIHRvIGJlIHNlbnQgdG8gdGhlIHRocmVhZC5cbiAqIEBwYXJhbSB7UmVuZGVyTG9vcH0gcmVuZGVyTG9vcCBhbiBpbnN0YW5jZSBvZiBFbmdpbmUgdXNlZCBmb3IgZXhlY3V0aW5nXG4gKiB0aGUgYEVOR0lORWAgY29tbWFuZHMgb24uXG4gKi9cbmZ1bmN0aW9uIFVJTWFuYWdlciAodGhyZWFkLCBjb21wb3NpdG9yLCByZW5kZXJMb29wKSB7XG4gICAgdGhpcy5fdGhyZWFkID0gdGhyZWFkO1xuICAgIHRoaXMuX2NvbXBvc2l0b3IgPSBjb21wb3NpdG9yO1xuICAgIHRoaXMuX3JlbmRlckxvb3AgPSByZW5kZXJMb29wO1xuXG4gICAgdGhpcy5fcmVuZGVyTG9vcC51cGRhdGUodGhpcyk7XG5cbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHRoaXMuX3RocmVhZC5vbm1lc3NhZ2UgPSBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgdmFyIG1lc3NhZ2UgPSBldi5kYXRhID8gZXYuZGF0YSA6IGV2O1xuICAgICAgICBpZiAobWVzc2FnZVswXSA9PT0gJ0VOR0lORScpIHtcbiAgICAgICAgICAgIHN3aXRjaCAobWVzc2FnZVsxXSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ1NUQVJUJzpcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMuX3JlbmRlckxvb3Auc3RhcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnU1RPUCc6XG4gICAgICAgICAgICAgICAgICAgIF90aGlzLl9yZW5kZXJMb29wLnN0b3AoKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgICAgICAgICAgICAgICAgICdVbmtub3duIEVOR0lORSBjb21tYW5kIFwiJyArIG1lc3NhZ2VbMV0gKyAnXCInXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgX3RoaXMuX2NvbXBvc2l0b3IucmVjZWl2ZUNvbW1hbmRzKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB0aGlzLl90aHJlYWQub25lcnJvciA9IGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgICB9O1xufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIHRocmVhZCBiZWluZyB1c2VkIGJ5IHRoZSBVSU1hbmFnZXIuXG4gKiBUaGlzIGNvdWxkIGVpdGhlciBiZSBhbiBhbiBhY3R1YWwgd2ViIHdvcmtlciBvciBhIGBGYW1vdXNFbmdpbmVgIHNpbmdsZXRvbi5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7V29ya2VyfEZhbW91c0VuZ2luZX0gRWl0aGVyIGEgd2ViIHdvcmtlciBvciBhIGBGYW1vdXNFbmdpbmVgIHNpbmdsZXRvbi5cbiAqL1xuVUlNYW5hZ2VyLnByb3RvdHlwZS5nZXRUaHJlYWQgPSBmdW5jdGlvbiBnZXRUaHJlYWQoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3RocmVhZDtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgY29tcG9zaXRvciBiZWluZyB1c2VkIGJ5IHRoaXMgVUlNYW5hZ2VyLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtDb21wb3NpdG9yfSBUaGUgY29tcG9zaXRvciB1c2VkIGJ5IHRoZSBVSU1hbmFnZXIuXG4gKi9cblVJTWFuYWdlci5wcm90b3R5cGUuZ2V0Q29tcG9zaXRvciA9IGZ1bmN0aW9uIGdldENvbXBvc2l0b3IoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NvbXBvc2l0b3I7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGVuZ2luZSBiZWluZyB1c2VkIGJ5IHRoaXMgVUlNYW5hZ2VyLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtFbmdpbmV9IFRoZSBlbmdpbmUgdXNlZCBieSB0aGUgVUlNYW5hZ2VyLlxuICovXG5VSU1hbmFnZXIucHJvdG90eXBlLmdldEVuZ2luZSA9IGZ1bmN0aW9uIGdldEVuZ2luZSgpIHtcbiAgICByZXR1cm4gdGhpcy5fcmVuZGVyTG9vcDtcbn07XG5cbi8qKlxuICogVXBkYXRlIG1ldGhvZCBiZWluZyBpbnZva2VkIGJ5IHRoZSBFbmdpbmUgb24gZXZlcnkgYHJlcXVlc3RBbmltYXRpb25GcmFtZWAuXG4gKiBVc2VkIGZvciB1cGRhdGluZyB0aGUgbm90aW9uIG9mIHRpbWUgd2l0aGluIHRoZSBtYW5hZ2VkIHRocmVhZCBieSBzZW5kaW5nXG4gKiBhIEZSQU1FIGNvbW1hbmQgYW5kIHNlbmRpbmcgbWVzc2FnZXMgdG9cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtICB7TnVtYmVyfSB0aW1lIHVuaXggdGltZXN0YW1wIHRvIGJlIHBhc3NlZCBkb3duIHRvIHRoZSB3b3JrZXIgYXMgYVxuICogRlJBTUUgY29tbWFuZFxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuVUlNYW5hZ2VyLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiB1cGRhdGUgKHRpbWUpIHtcbiAgICB0aGlzLl90aHJlYWQucG9zdE1lc3NhZ2UoWydGUkFNRScsIHRpbWVdKTtcbiAgICB2YXIgdGhyZWFkTWVzc2FnZXMgPSB0aGlzLl9jb21wb3NpdG9yLmRyYXdDb21tYW5kcygpO1xuICAgIHRoaXMuX3RocmVhZC5wb3N0TWVzc2FnZSh0aHJlYWRNZXNzYWdlcyk7XG4gICAgdGhpcy5fY29tcG9zaXRvci5jbGVhckNvbW1hbmRzKCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFVJTWFuYWdlcjtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGNzcyA9ICcuZmFtb3VzLWRvbS1yZW5kZXJlciB7JyArXG4gICAgJ3dpZHRoOjEwMCU7JyArXG4gICAgJ2hlaWdodDoxMDAlOycgK1xuICAgICd0cmFuc2Zvcm0tc3R5bGU6cHJlc2VydmUtM2Q7JyArXG4gICAgJy13ZWJraXQtdHJhbnNmb3JtLXN0eWxlOnByZXNlcnZlLTNkOycgK1xuJ30nICtcblxuJy5mYW1vdXMtZG9tLWVsZW1lbnQgeycgK1xuICAgICctd2Via2l0LXRyYW5zZm9ybS1vcmlnaW46MCUgMCU7JyArXG4gICAgJ3RyYW5zZm9ybS1vcmlnaW46MCUgMCU7JyArXG4gICAgJy13ZWJraXQtYmFja2ZhY2UtdmlzaWJpbGl0eTp2aXNpYmxlOycgK1xuICAgICdiYWNrZmFjZS12aXNpYmlsaXR5OnZpc2libGU7JyArXG4gICAgJy13ZWJraXQtdHJhbnNmb3JtLXN0eWxlOnByZXNlcnZlLTNkOycgK1xuICAgICd0cmFuc2Zvcm0tc3R5bGU6cHJlc2VydmUtM2Q7JyArXG4gICAgJy13ZWJraXQtdGFwLWhpZ2hsaWdodC1jb2xvcjp0cmFuc3BhcmVudDsnICtcbiAgICAncG9pbnRlci1ldmVudHM6YXV0bzsnICtcbiAgICAnei1pbmRleDoxOycgK1xuJ30nICtcblxuJy5mYW1vdXMtZG9tLWVsZW1lbnQtY29udGVudCwnICtcbicuZmFtb3VzLWRvbS1lbGVtZW50IHsnICtcbiAgICAncG9zaXRpb246YWJzb2x1dGU7JyArXG4gICAgJ2JveC1zaXppbmc6Ym9yZGVyLWJveDsnICtcbiAgICAnLW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7JyArXG4gICAgJy13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94OycgK1xuJ30nICtcblxuJy5mYW1vdXMtd2ViZ2wtcmVuZGVyZXIgeycgK1xuICAgICctd2Via2l0LXRyYW5zZm9ybTogdHJhbnNsYXRlWigxMDAwMDAwcHgpOycgKyAgLyogVE9ETzogRml4IHdoZW4gU2FmYXJpIEZpeGVzKi9cbiAgICAndHJhbnNmb3JtOiB0cmFuc2xhdGVaKDEwMDAwMDBweCknICtcbiAgICAncG9pbnRlci1ldmVudHM6bm9uZTsnICtcbiAgICAncG9zaXRpb246YWJzb2x1dGU7JyArXG4gICAgJ3otaW5kZXg6MTsnICtcbiAgICAndG9wOjA7JyArXG4gICAgJ2xlZnQ6MDsnICtcbid9JztcblxudmFyIElOSkVDVEVEID0gdHlwZW9mIGRvY3VtZW50ID09PSAndW5kZWZpbmVkJztcblxuZnVuY3Rpb24gaW5qZWN0Q1NTKCkge1xuICAgIGlmIChJTkpFQ1RFRCkgcmV0dXJuO1xuICAgIElOSkVDVEVEID0gdHJ1ZTtcbiAgICBpZiAoZG9jdW1lbnQuY3JlYXRlU3R5bGVTaGVldCkge1xuICAgICAgICB2YXIgc2hlZXQgPSBkb2N1bWVudC5jcmVhdGVTdHlsZVNoZWV0KCk7XG4gICAgICAgIHNoZWV0LmNzc1RleHQgPSBjc3M7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB2YXIgaGVhZCA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF07XG4gICAgICAgIHZhciBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG5cbiAgICAgICAgaWYgKHN0eWxlLnN0eWxlU2hlZXQpIHtcbiAgICAgICAgICAgIHN0eWxlLnN0eWxlU2hlZXQuY3NzVGV4dCA9IGNzcztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHN0eWxlLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGNzcykpO1xuICAgICAgICB9XG5cbiAgICAgICAgKGhlYWQgPyBoZWFkIDogZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50KS5hcHBlbmRDaGlsZChzdHlsZSk7XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGluamVjdENTUztcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBEZWVwIGNsb25lIGFuIG9iamVjdC5cbiAqXG4gKiBAbWV0aG9kICBjbG9uZVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBiICAgICAgIE9iamVjdCB0byBiZSBjbG9uZWQuXG4gKiBAcmV0dXJuIHtPYmplY3R9IGEgICAgICBDbG9uZWQgb2JqZWN0IChkZWVwIGVxdWFsaXR5KS5cbiAqL1xudmFyIGNsb25lID0gZnVuY3Rpb24gY2xvbmUoYikge1xuICAgIHZhciBhO1xuICAgIGlmICh0eXBlb2YgYiA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgYSA9IChiIGluc3RhbmNlb2YgQXJyYXkpID8gW10gOiB7fTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIGIpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgYltrZXldID09PSAnb2JqZWN0JyAmJiBiW2tleV0gIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpZiAoYltrZXldIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgICAgICAgICAgYVtrZXldID0gbmV3IEFycmF5KGJba2V5XS5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJba2V5XS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYVtrZXldW2ldID0gY2xvbmUoYltrZXldW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIGFba2V5XSA9IGNsb25lKGJba2V5XSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgYVtrZXldID0gYltrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBhID0gYjtcbiAgICB9XG4gICAgcmV0dXJuIGE7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNsb25lO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4vKipcbiAqIFRha2VzIGFuIG9iamVjdCBjb250YWluaW5nIGtleXMgYW5kIHZhbHVlcyBhbmQgcmV0dXJucyBhbiBvYmplY3RcbiAqIGNvbXByaXNpbmcgdHdvIFwiYXNzb2NpYXRlXCIgYXJyYXlzLCBvbmUgd2l0aCB0aGUga2V5cyBhbmQgdGhlIG90aGVyXG4gKiB3aXRoIHRoZSB2YWx1ZXMuXG4gKlxuICogQG1ldGhvZCBrZXlWYWx1ZXNUb0FycmF5c1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogICAgICAgICAgICAgICAgICAgICAgT2JqZWN0cyB3aGVyZSB0byBleHRyYWN0IGtleXMgYW5kIHZhbHVlc1xuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcm9tLlxuICogQHJldHVybiB7T2JqZWN0fSAgICAgICAgIHJlc3VsdFxuICogICAgICAgICB7QXJyYXkuPFN0cmluZz59IHJlc3VsdC5rZXlzICAgICBLZXlzIG9mIGByZXN1bHRgLCBhcyByZXR1cm5lZCBieVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBgT2JqZWN0LmtleXMoKWBcbiAqICAgICAgICAge0FycmF5fSAgICAgICAgICByZXN1bHQudmFsdWVzICAgVmFsdWVzIG9mIHBhc3NlZCBpbiBvYmplY3QuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ga2V5VmFsdWVzVG9BcnJheXMob2JqKSB7XG4gICAgdmFyIGtleXNBcnJheSA9IFtdLCB2YWx1ZXNBcnJheSA9IFtdO1xuICAgIHZhciBpID0gMDtcbiAgICBmb3IodmFyIGtleSBpbiBvYmopIHtcbiAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICBrZXlzQXJyYXlbaV0gPSBrZXk7XG4gICAgICAgICAgICB2YWx1ZXNBcnJheVtpXSA9IG9ialtrZXldO1xuICAgICAgICAgICAgaSsrO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICAgIGtleXM6IGtleXNBcnJheSxcbiAgICAgICAgdmFsdWVzOiB2YWx1ZXNBcnJheVxuICAgIH07XG59O1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgUFJFRklYRVMgPSBbJycsICctbXMtJywgJy13ZWJraXQtJywgJy1tb3otJywgJy1vLSddO1xuXG4vKipcbiAqIEEgaGVscGVyIGZ1bmN0aW9uIHVzZWQgZm9yIGRldGVybWluaW5nIHRoZSB2ZW5kb3IgcHJlZml4ZWQgdmVyc2lvbiBvZiB0aGVcbiAqIHBhc3NlZCBpbiBDU1MgcHJvcGVydHkuXG4gKlxuICogVmVuZG9yIGNoZWNrcyBhcmUgYmVpbmcgY29uZHVjdGVkIGluIHRoZSBmb2xsb3dpbmcgb3JkZXI6XG4gKlxuICogMS4gKG5vIHByZWZpeClcbiAqIDIuIGAtbXotYFxuICogMy4gYC13ZWJraXQtYFxuICogNC4gYC1tb3otYFxuICogNS4gYC1vLWBcbiAqXG4gKiBAbWV0aG9kIHZlbmRvclByZWZpeFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwcm9wZXJ0eSAgICAgQ1NTIHByb3BlcnR5IChubyBjYW1lbENhc2UpLCBlLmcuXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGBib3JkZXItcmFkaXVzYC5cbiAqIEByZXR1cm4ge1N0cmluZ30gcHJlZml4ZWQgICAgVmVuZG9yIHByZWZpeGVkIHZlcnNpb24gb2YgcGFzc2VkIGluIENTU1xuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eSAoZS5nLiBgLXdlYmtpdC1ib3JkZXItcmFkaXVzYCkuXG4gKi9cbmZ1bmN0aW9uIHZlbmRvclByZWZpeChwcm9wZXJ0eSkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgUFJFRklYRVMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHByZWZpeGVkID0gUFJFRklYRVNbaV0gKyBwcm9wZXJ0eTtcbiAgICAgICAgaWYgKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZVtwcmVmaXhlZF0gPT09ICcnKSB7XG4gICAgICAgICAgICByZXR1cm4gcHJlZml4ZWQ7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHByb3BlcnR5O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHZlbmRvclByZWZpeDtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIEdlb21ldHJ5SWRzID0gMDtcblxuLyoqXG4gKiBHZW9tZXRyeSBpcyBhIGNvbXBvbmVudCB0aGF0IGRlZmluZXMgYW5kIG1hbmFnZXMgZGF0YVxuICogKHZlcnRleCBkYXRhIGFuZCBhdHRyaWJ1dGVzKSB0aGF0IGlzIHVzZWQgdG8gZHJhdyB0byBXZWJHTC5cbiAqXG4gKiBAY2xhc3MgR2VvbWV0cnlcbiAqIEBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIGluc3RhbnRpYXRpb24gb3B0aW9uc1xuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuZnVuY3Rpb24gR2VvbWV0cnkob3B0aW9ucykge1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdGhpcy5ERUZBVUxUX0JVRkZFUl9TSVpFID0gMztcblxuICAgIHRoaXMuc3BlYyA9IHtcbiAgICAgICAgaWQ6IEdlb21ldHJ5SWRzKyssXG4gICAgICAgIGR5bmFtaWM6IGZhbHNlLFxuICAgICAgICB0eXBlOiB0aGlzLm9wdGlvbnMudHlwZSB8fCAnVFJJQU5HTEVTJyxcbiAgICAgICAgYnVmZmVyTmFtZXM6IFtdLFxuICAgICAgICBidWZmZXJWYWx1ZXM6IFtdLFxuICAgICAgICBidWZmZXJTcGFjaW5nczogW10sXG4gICAgICAgIGludmFsaWRhdGlvbnM6IFtdXG4gICAgfTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuYnVmZmVycykge1xuICAgICAgICB2YXIgbGVuID0gdGhpcy5vcHRpb25zLmJ1ZmZlcnMubGVuZ3RoO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjspIHtcbiAgICAgICAgICAgIHRoaXMuc3BlYy5idWZmZXJOYW1lcy5wdXNoKHRoaXMub3B0aW9ucy5idWZmZXJzW2ldLm5hbWUpO1xuICAgICAgICAgICAgdGhpcy5zcGVjLmJ1ZmZlclZhbHVlcy5wdXNoKHRoaXMub3B0aW9ucy5idWZmZXJzW2ldLmRhdGEpO1xuICAgICAgICAgICAgdGhpcy5zcGVjLmJ1ZmZlclNwYWNpbmdzLnB1c2godGhpcy5vcHRpb25zLmJ1ZmZlcnNbaV0uc2l6ZSB8fCB0aGlzLkRFRkFVTFRfQlVGRkVSX1NJWkUpO1xuICAgICAgICAgICAgdGhpcy5zcGVjLmludmFsaWRhdGlvbnMucHVzaChpKyspO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEdlb21ldHJ5O1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgVmVjMyA9IHJlcXVpcmUoJy4uL21hdGgvVmVjMycpO1xudmFyIFZlYzIgPSByZXF1aXJlKCcuLi9tYXRoL1ZlYzInKTtcblxudmFyIG91dHB1dHMgPSBbXG4gICAgbmV3IFZlYzMoKSxcbiAgICBuZXcgVmVjMygpLFxuICAgIG5ldyBWZWMzKCksXG4gICAgbmV3IFZlYzIoKSxcbiAgICBuZXcgVmVjMigpXG5dO1xuXG4vKipcbiAqIEEgaGVscGVyIG9iamVjdCB1c2VkIHRvIGNhbGN1bGF0ZSBidWZmZXJzIGZvciBjb21wbGljYXRlZCBnZW9tZXRyaWVzLlxuICogVGFpbG9yZWQgZm9yIHRoZSBXZWJHTFJlbmRlcmVyLCB1c2VkIGJ5IG1vc3QgcHJpbWl0aXZlcy5cbiAqXG4gKiBAc3RhdGljXG4gKiBAY2xhc3MgR2VvbWV0cnlIZWxwZXJcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbnZhciBHZW9tZXRyeUhlbHBlciA9IHt9O1xuXG4vKipcbiAqIEEgZnVuY3Rpb24gdGhhdCBpdGVyYXRlcyB0aHJvdWdoIHZlcnRpY2FsIGFuZCBob3Jpem9udGFsIHNsaWNlc1xuICogYmFzZWQgb24gaW5wdXQgZGV0YWlsLCBhbmQgZ2VuZXJhdGVzIHZlcnRpY2VzIGFuZCBpbmRpY2VzIGZvciBlYWNoXG4gKiBzdWJkaXZpc2lvbi5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtICB7TnVtYmVyfSBkZXRhaWxYIEFtb3VudCBvZiBzbGljZXMgdG8gaXRlcmF0ZSB0aHJvdWdoLlxuICogQHBhcmFtICB7TnVtYmVyfSBkZXRhaWxZIEFtb3VudCBvZiBzdGFja3MgdG8gaXRlcmF0ZSB0aHJvdWdoLlxuICogQHBhcmFtICB7RnVuY3Rpb259IGZ1bmMgRnVuY3Rpb24gdXNlZCB0byBnZW5lcmF0ZSB2ZXJ0ZXggcG9zaXRpb25zIGF0IGVhY2ggcG9pbnQuXG4gKiBAcGFyYW0gIHtCb29sZWFufSB3cmFwIE9wdGlvbmFsIHBhcmFtZXRlciAoZGVmYXVsdDogUGkpIGZvciBzZXR0aW5nIGEgY3VzdG9tIHdyYXAgcmFuZ2VcbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9IE9iamVjdCBjb250YWluaW5nIGdlbmVyYXRlZCB2ZXJ0aWNlcyBhbmQgaW5kaWNlcy5cbiAqL1xuR2VvbWV0cnlIZWxwZXIuZ2VuZXJhdGVQYXJhbWV0cmljID0gZnVuY3Rpb24gZ2VuZXJhdGVQYXJhbWV0cmljKGRldGFpbFgsIGRldGFpbFksIGZ1bmMsIHdyYXApIHtcbiAgICB2YXIgdmVydGljZXMgPSBbXTtcbiAgICB2YXIgaTtcbiAgICB2YXIgdGhldGE7XG4gICAgdmFyIHBoaTtcbiAgICB2YXIgajtcblxuICAgIC8vIFdlIGNhbiB3cmFwIGFyb3VuZCBzbGlnaHRseSBtb3JlIHRoYW4gb25jZSBmb3IgdXYgY29vcmRpbmF0ZXMgdG8gbG9vayBjb3JyZWN0LlxuXG4gICAgdmFyIFhyYW5nZSA9IHdyYXAgPyBNYXRoLlBJICsgKE1hdGguUEkgLyAoZGV0YWlsWCAtIDEpKSA6IE1hdGguUEk7XG4gICAgdmFyIG91dCA9IFtdO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IGRldGFpbFggKyAxOyBpKyspIHtcbiAgICAgICAgdGhldGEgPSBpICogWHJhbmdlIC8gZGV0YWlsWDtcbiAgICAgICAgZm9yIChqID0gMDsgaiA8IGRldGFpbFk7IGorKykge1xuICAgICAgICAgICAgcGhpID0gaiAqIDIuMCAqIFhyYW5nZSAvIGRldGFpbFk7XG4gICAgICAgICAgICBmdW5jKHRoZXRhLCBwaGksIG91dCk7XG4gICAgICAgICAgICB2ZXJ0aWNlcy5wdXNoKG91dFswXSwgb3V0WzFdLCBvdXRbMl0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGluZGljZXMgPSBbXSxcbiAgICAgICAgdiA9IDAsXG4gICAgICAgIG5leHQ7XG4gICAgZm9yIChpID0gMDsgaSA8IGRldGFpbFg7IGkrKykge1xuICAgICAgICBmb3IgKGogPSAwOyBqIDwgZGV0YWlsWTsgaisrKSB7XG4gICAgICAgICAgICBuZXh0ID0gKGogKyAxKSAlIGRldGFpbFk7XG4gICAgICAgICAgICBpbmRpY2VzLnB1c2godiArIGosIHYgKyBqICsgZGV0YWlsWSwgdiArIG5leHQpO1xuICAgICAgICAgICAgaW5kaWNlcy5wdXNoKHYgKyBuZXh0LCB2ICsgaiArIGRldGFpbFksIHYgKyBuZXh0ICsgZGV0YWlsWSk7XG4gICAgICAgIH1cbiAgICAgICAgdiArPSBkZXRhaWxZO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIHZlcnRpY2VzOiB2ZXJ0aWNlcyxcbiAgICAgICAgaW5kaWNlczogaW5kaWNlc1xuICAgIH07XG59O1xuXG4vKipcbiAqIENhbGN1bGF0ZXMgbm9ybWFscyBiZWxvbmdpbmcgdG8gZWFjaCBmYWNlIG9mIGEgZ2VvbWV0cnkuXG4gKiBBc3N1bWVzIGNsb2Nrd2lzZSBkZWNsYXJhdGlvbiBvZiB2ZXJ0aWNlcy5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtBcnJheX0gdmVydGljZXMgVmVydGljZXMgb2YgYWxsIHBvaW50cyBvbiB0aGUgZ2VvbWV0cnkuXG4gKiBAcGFyYW0ge0FycmF5fSBpbmRpY2VzIEluZGljZXMgZGVjbGFyaW5nIGZhY2VzIG9mIGdlb21ldHJ5LlxuICogQHBhcmFtIHtBcnJheX0gb3V0IEFycmF5IHRvIGJlIGZpbGxlZCBhbmQgcmV0dXJuZWQuXG4gKlxuICogQHJldHVybiB7QXJyYXl9IENhbGN1bGF0ZWQgZmFjZSBub3JtYWxzLlxuICovXG5HZW9tZXRyeUhlbHBlci5jb21wdXRlTm9ybWFscyA9IGZ1bmN0aW9uIGNvbXB1dGVOb3JtYWxzKHZlcnRpY2VzLCBpbmRpY2VzLCBvdXQpIHtcbiAgICB2YXIgbm9ybWFscyA9IG91dCB8fCBbXTtcbiAgICB2YXIgaW5kZXhPbmU7XG4gICAgdmFyIGluZGV4VHdvO1xuICAgIHZhciBpbmRleFRocmVlO1xuICAgIHZhciBub3JtYWw7XG4gICAgdmFyIGo7XG4gICAgdmFyIGxlbiA9IGluZGljZXMubGVuZ3RoIC8gMztcbiAgICB2YXIgaTtcbiAgICB2YXIgeDtcbiAgICB2YXIgeTtcbiAgICB2YXIgejtcbiAgICB2YXIgbGVuZ3RoO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGluZGV4VHdvID0gaW5kaWNlc1tpKjMgKyAwXSAqIDM7XG4gICAgICAgIGluZGV4T25lID0gaW5kaWNlc1tpKjMgKyAxXSAqIDM7XG4gICAgICAgIGluZGV4VGhyZWUgPSBpbmRpY2VzW2kqMyArIDJdICogMztcblxuICAgICAgICBvdXRwdXRzWzBdLnNldCh2ZXJ0aWNlc1tpbmRleE9uZV0sIHZlcnRpY2VzW2luZGV4T25lICsgMV0sIHZlcnRpY2VzW2luZGV4T25lICsgMl0pO1xuICAgICAgICBvdXRwdXRzWzFdLnNldCh2ZXJ0aWNlc1tpbmRleFR3b10sIHZlcnRpY2VzW2luZGV4VHdvICsgMV0sIHZlcnRpY2VzW2luZGV4VHdvICsgMl0pO1xuICAgICAgICBvdXRwdXRzWzJdLnNldCh2ZXJ0aWNlc1tpbmRleFRocmVlXSwgdmVydGljZXNbaW5kZXhUaHJlZSArIDFdLCB2ZXJ0aWNlc1tpbmRleFRocmVlICsgMl0pO1xuXG4gICAgICAgIG5vcm1hbCA9IG91dHB1dHNbMl0uc3VidHJhY3Qob3V0cHV0c1swXSkuY3Jvc3Mob3V0cHV0c1sxXS5zdWJ0cmFjdChvdXRwdXRzWzBdKSkubm9ybWFsaXplKCk7XG5cbiAgICAgICAgbm9ybWFsc1tpbmRleE9uZSArIDBdID0gKG5vcm1hbHNbaW5kZXhPbmUgKyAwXSB8fCAwKSArIG5vcm1hbC54O1xuICAgICAgICBub3JtYWxzW2luZGV4T25lICsgMV0gPSAobm9ybWFsc1tpbmRleE9uZSArIDFdIHx8IDApICsgbm9ybWFsLnk7XG4gICAgICAgIG5vcm1hbHNbaW5kZXhPbmUgKyAyXSA9IChub3JtYWxzW2luZGV4T25lICsgMl0gfHwgMCkgKyBub3JtYWwuejtcblxuICAgICAgICBub3JtYWxzW2luZGV4VHdvICsgMF0gPSAobm9ybWFsc1tpbmRleFR3byArIDBdIHx8IDApICsgbm9ybWFsLng7XG4gICAgICAgIG5vcm1hbHNbaW5kZXhUd28gKyAxXSA9IChub3JtYWxzW2luZGV4VHdvICsgMV0gfHwgMCkgKyBub3JtYWwueTtcbiAgICAgICAgbm9ybWFsc1tpbmRleFR3byArIDJdID0gKG5vcm1hbHNbaW5kZXhUd28gKyAyXSB8fCAwKSArIG5vcm1hbC56O1xuXG4gICAgICAgIG5vcm1hbHNbaW5kZXhUaHJlZSArIDBdID0gKG5vcm1hbHNbaW5kZXhUaHJlZSArIDBdIHx8IDApICsgbm9ybWFsLng7XG4gICAgICAgIG5vcm1hbHNbaW5kZXhUaHJlZSArIDFdID0gKG5vcm1hbHNbaW5kZXhUaHJlZSArIDFdIHx8IDApICsgbm9ybWFsLnk7XG4gICAgICAgIG5vcm1hbHNbaW5kZXhUaHJlZSArIDJdID0gKG5vcm1hbHNbaW5kZXhUaHJlZSArIDJdIHx8IDApICsgbm9ybWFsLno7XG4gICAgfVxuXG4gICAgZm9yIChpID0gMDsgaSA8IG5vcm1hbHMubGVuZ3RoOyBpICs9IDMpIHtcbiAgICAgICAgeCA9IG5vcm1hbHNbaV07XG4gICAgICAgIHkgPSBub3JtYWxzW2krMV07XG4gICAgICAgIHogPSBub3JtYWxzW2krMl07XG4gICAgICAgIGxlbmd0aCA9IE1hdGguc3FydCh4ICogeCArIHkgKiB5ICsgeiAqIHopO1xuICAgICAgICBmb3IoaiA9IDA7IGo8IDM7IGorKykge1xuICAgICAgICAgICAgbm9ybWFsc1tpK2pdIC89IGxlbmd0aDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBub3JtYWxzO1xufTtcblxuLyoqXG4gKiBEaXZpZGVzIGFsbCBpbnNlcnRlZCB0cmlhbmdsZXMgaW50byBmb3VyIHN1Yi10cmlhbmdsZXMuIEFsdGVycyB0aGVcbiAqIHBhc3NlZCBpbiBhcnJheXMuXG4gKlxuICogQHN0YXRpY1xuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IGluZGljZXMgSW5kaWNlcyBkZWNsYXJpbmcgZmFjZXMgb2YgZ2VvbWV0cnlcbiAqIEBwYXJhbSB7QXJyYXl9IHZlcnRpY2VzIFZlcnRpY2VzIG9mIGFsbCBwb2ludHMgb24gdGhlIGdlb21ldHJ5XG4gKiBAcGFyYW0ge0FycmF5fSB0ZXh0dXJlQ29vcmRzIFRleHR1cmUgY29vcmRpbmF0ZXMgb2YgYWxsIHBvaW50cyBvbiB0aGUgZ2VvbWV0cnlcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkdlb21ldHJ5SGVscGVyLnN1YmRpdmlkZSA9IGZ1bmN0aW9uIHN1YmRpdmlkZShpbmRpY2VzLCB2ZXJ0aWNlcywgdGV4dHVyZUNvb3Jkcykge1xuICAgIHZhciB0cmlhbmdsZUluZGV4ID0gaW5kaWNlcy5sZW5ndGggLyAzO1xuICAgIHZhciBmYWNlO1xuICAgIHZhciBpO1xuICAgIHZhciBqO1xuICAgIHZhciBrO1xuICAgIHZhciBwb3M7XG4gICAgdmFyIHRleDtcblxuICAgIHdoaWxlICh0cmlhbmdsZUluZGV4LS0pIHtcbiAgICAgICAgZmFjZSA9IGluZGljZXMuc2xpY2UodHJpYW5nbGVJbmRleCAqIDMsIHRyaWFuZ2xlSW5kZXggKiAzICsgMyk7XG5cbiAgICAgICAgcG9zID0gZmFjZS5tYXAoZnVuY3Rpb24odmVydEluZGV4KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFZlYzModmVydGljZXNbdmVydEluZGV4ICogM10sIHZlcnRpY2VzW3ZlcnRJbmRleCAqIDMgKyAxXSwgdmVydGljZXNbdmVydEluZGV4ICogMyArIDJdKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHZlcnRpY2VzLnB1c2guYXBwbHkodmVydGljZXMsIFZlYzMuc2NhbGUoVmVjMy5hZGQocG9zWzBdLCBwb3NbMV0sIG91dHB1dHNbMF0pLCAwLjUsIG91dHB1dHNbMV0pLnRvQXJyYXkoKSk7XG4gICAgICAgIHZlcnRpY2VzLnB1c2guYXBwbHkodmVydGljZXMsIFZlYzMuc2NhbGUoVmVjMy5hZGQocG9zWzFdLCBwb3NbMl0sIG91dHB1dHNbMF0pLCAwLjUsIG91dHB1dHNbMV0pLnRvQXJyYXkoKSk7XG4gICAgICAgIHZlcnRpY2VzLnB1c2guYXBwbHkodmVydGljZXMsIFZlYzMuc2NhbGUoVmVjMy5hZGQocG9zWzBdLCBwb3NbMl0sIG91dHB1dHNbMF0pLCAwLjUsIG91dHB1dHNbMV0pLnRvQXJyYXkoKSk7XG5cbiAgICAgICAgaWYgKHRleHR1cmVDb29yZHMpIHtcbiAgICAgICAgICAgIHRleCA9IGZhY2UubWFwKGZ1bmN0aW9uKHZlcnRJbmRleCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgVmVjMih0ZXh0dXJlQ29vcmRzW3ZlcnRJbmRleCAqIDJdLCB0ZXh0dXJlQ29vcmRzW3ZlcnRJbmRleCAqIDIgKyAxXSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRleHR1cmVDb29yZHMucHVzaC5hcHBseSh0ZXh0dXJlQ29vcmRzLCBWZWMyLnNjYWxlKFZlYzIuYWRkKHRleFswXSwgdGV4WzFdLCBvdXRwdXRzWzNdKSwgMC41LCBvdXRwdXRzWzRdKS50b0FycmF5KCkpO1xuICAgICAgICAgICAgdGV4dHVyZUNvb3Jkcy5wdXNoLmFwcGx5KHRleHR1cmVDb29yZHMsIFZlYzIuc2NhbGUoVmVjMi5hZGQodGV4WzFdLCB0ZXhbMl0sIG91dHB1dHNbM10pLCAwLjUsIG91dHB1dHNbNF0pLnRvQXJyYXkoKSk7XG4gICAgICAgICAgICB0ZXh0dXJlQ29vcmRzLnB1c2guYXBwbHkodGV4dHVyZUNvb3JkcywgVmVjMi5zY2FsZShWZWMyLmFkZCh0ZXhbMF0sIHRleFsyXSwgb3V0cHV0c1szXSksIDAuNSwgb3V0cHV0c1s0XSkudG9BcnJheSgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGkgPSB2ZXJ0aWNlcy5sZW5ndGggLSAzO1xuICAgICAgICBqID0gaSArIDE7XG4gICAgICAgIGsgPSBpICsgMjtcblxuICAgICAgICBpbmRpY2VzLnB1c2goaSwgaiwgayk7XG4gICAgICAgIGluZGljZXMucHVzaChmYWNlWzBdLCBpLCBrKTtcbiAgICAgICAgaW5kaWNlcy5wdXNoKGksIGZhY2VbMV0sIGopO1xuICAgICAgICBpbmRpY2VzW3RyaWFuZ2xlSW5kZXhdID0gaztcbiAgICAgICAgaW5kaWNlc1t0cmlhbmdsZUluZGV4ICsgMV0gPSBqO1xuICAgICAgICBpbmRpY2VzW3RyaWFuZ2xlSW5kZXggKyAyXSA9IGZhY2VbMl07XG4gICAgfVxufTtcblxuLyoqXG4gKiBDcmVhdGVzIGR1cGxpY2F0ZSBvZiB2ZXJ0aWNlcyB0aGF0IGFyZSBzaGFyZWQgYmV0d2VlbiBmYWNlcy5cbiAqIEFsdGVycyB0aGUgaW5wdXQgdmVydGV4IGFuZCBpbmRleCBhcnJheXMuXG4gKlxuICogQHN0YXRpY1xuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHZlcnRpY2VzIFZlcnRpY2VzIG9mIGFsbCBwb2ludHMgb24gdGhlIGdlb21ldHJ5XG4gKiBAcGFyYW0ge0FycmF5fSBpbmRpY2VzIEluZGljZXMgZGVjbGFyaW5nIGZhY2VzIG9mIGdlb21ldHJ5XG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5HZW9tZXRyeUhlbHBlci5nZXRVbmlxdWVGYWNlcyA9IGZ1bmN0aW9uIGdldFVuaXF1ZUZhY2VzKHZlcnRpY2VzLCBpbmRpY2VzKSB7XG4gICAgdmFyIHRyaWFuZ2xlSW5kZXggPSBpbmRpY2VzLmxlbmd0aCAvIDMsXG4gICAgICAgIHJlZ2lzdGVyZWQgPSBbXSxcbiAgICAgICAgaW5kZXg7XG5cbiAgICB3aGlsZSAodHJpYW5nbGVJbmRleC0tKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgMzsgaSsrKSB7XG5cbiAgICAgICAgICAgIGluZGV4ID0gaW5kaWNlc1t0cmlhbmdsZUluZGV4ICogMyArIGldO1xuXG4gICAgICAgICAgICBpZiAocmVnaXN0ZXJlZFtpbmRleF0pIHtcbiAgICAgICAgICAgICAgICB2ZXJ0aWNlcy5wdXNoKHZlcnRpY2VzW2luZGV4ICogM10sIHZlcnRpY2VzW2luZGV4ICogMyArIDFdLCB2ZXJ0aWNlc1tpbmRleCAqIDMgKyAyXSk7XG4gICAgICAgICAgICAgICAgaW5kaWNlc1t0cmlhbmdsZUluZGV4ICogMyArIGldID0gdmVydGljZXMubGVuZ3RoIC8gMyAtIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWdpc3RlcmVkW2luZGV4XSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKipcbiAqIERpdmlkZXMgYWxsIGluc2VydGVkIHRyaWFuZ2xlcyBpbnRvIGZvdXIgc3ViLXRyaWFuZ2xlcyB3aGlsZSBtYWludGFpbmluZ1xuICogYSByYWRpdXMgb2Ygb25lLiBBbHRlcnMgdGhlIHBhc3NlZCBpbiBhcnJheXMuXG4gKlxuICogQHN0YXRpY1xuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHZlcnRpY2VzIFZlcnRpY2VzIG9mIGFsbCBwb2ludHMgb24gdGhlIGdlb21ldHJ5XG4gKiBAcGFyYW0ge0FycmF5fSBpbmRpY2VzIEluZGljZXMgZGVjbGFyaW5nIGZhY2VzIG9mIGdlb21ldHJ5XG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5HZW9tZXRyeUhlbHBlci5zdWJkaXZpZGVTcGhlcm9pZCA9IGZ1bmN0aW9uIHN1YmRpdmlkZVNwaGVyb2lkKHZlcnRpY2VzLCBpbmRpY2VzKSB7XG4gICAgdmFyIHRyaWFuZ2xlSW5kZXggPSBpbmRpY2VzLmxlbmd0aCAvIDMsXG4gICAgICAgIGFiYyxcbiAgICAgICAgZmFjZSxcbiAgICAgICAgaSwgaiwgaztcblxuICAgIHdoaWxlICh0cmlhbmdsZUluZGV4LS0pIHtcbiAgICAgICAgZmFjZSA9IGluZGljZXMuc2xpY2UodHJpYW5nbGVJbmRleCAqIDMsIHRyaWFuZ2xlSW5kZXggKiAzICsgMyk7XG4gICAgICAgIGFiYyA9IGZhY2UubWFwKGZ1bmN0aW9uKHZlcnRJbmRleCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBWZWMzKHZlcnRpY2VzW3ZlcnRJbmRleCAqIDNdLCB2ZXJ0aWNlc1t2ZXJ0SW5kZXggKiAzICsgMV0sIHZlcnRpY2VzW3ZlcnRJbmRleCAqIDMgKyAyXSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZlcnRpY2VzLnB1c2guYXBwbHkodmVydGljZXMsIFZlYzMubm9ybWFsaXplKFZlYzMuYWRkKGFiY1swXSwgYWJjWzFdLCBvdXRwdXRzWzBdKSwgb3V0cHV0c1sxXSkudG9BcnJheSgpKTtcbiAgICAgICAgdmVydGljZXMucHVzaC5hcHBseSh2ZXJ0aWNlcywgVmVjMy5ub3JtYWxpemUoVmVjMy5hZGQoYWJjWzFdLCBhYmNbMl0sIG91dHB1dHNbMF0pLCBvdXRwdXRzWzFdKS50b0FycmF5KCkpO1xuICAgICAgICB2ZXJ0aWNlcy5wdXNoLmFwcGx5KHZlcnRpY2VzLCBWZWMzLm5vcm1hbGl6ZShWZWMzLmFkZChhYmNbMF0sIGFiY1syXSwgb3V0cHV0c1swXSksIG91dHB1dHNbMV0pLnRvQXJyYXkoKSk7XG5cbiAgICAgICAgaSA9IHZlcnRpY2VzLmxlbmd0aCAvIDMgLSAzO1xuICAgICAgICBqID0gaSArIDE7XG4gICAgICAgIGsgPSBpICsgMjtcblxuICAgICAgICBpbmRpY2VzLnB1c2goaSwgaiwgayk7XG4gICAgICAgIGluZGljZXMucHVzaChmYWNlWzBdLCBpLCBrKTtcbiAgICAgICAgaW5kaWNlcy5wdXNoKGksIGZhY2VbMV0sIGopO1xuICAgICAgICBpbmRpY2VzW3RyaWFuZ2xlSW5kZXggKiAzXSA9IGs7XG4gICAgICAgIGluZGljZXNbdHJpYW5nbGVJbmRleCAqIDMgKyAxXSA9IGo7XG4gICAgICAgIGluZGljZXNbdHJpYW5nbGVJbmRleCAqIDMgKyAyXSA9IGZhY2VbMl07XG4gICAgfVxufTtcblxuLyoqXG4gKiBEaXZpZGVzIGFsbCBpbnNlcnRlZCB0cmlhbmdsZXMgaW50byBmb3VyIHN1Yi10cmlhbmdsZXMgd2hpbGUgbWFpbnRhaW5pbmdcbiAqIGEgcmFkaXVzIG9mIG9uZS4gQWx0ZXJzIHRoZSBwYXNzZWQgaW4gYXJyYXlzLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSB2ZXJ0aWNlcyBWZXJ0aWNlcyBvZiBhbGwgcG9pbnRzIG9uIHRoZSBnZW9tZXRyeVxuICogQHBhcmFtIHtBcnJheX0gb3V0IE9wdGlvbmFsIGFycmF5IHRvIGJlIGZpbGxlZCB3aXRoIHJlc3VsdGluZyBub3JtYWxzLlxuICpcbiAqIEByZXR1cm4ge0FycmF5fSBOZXcgbGlzdCBvZiBjYWxjdWxhdGVkIG5vcm1hbHMuXG4gKi9cbkdlb21ldHJ5SGVscGVyLmdldFNwaGVyb2lkTm9ybWFscyA9IGZ1bmN0aW9uIGdldFNwaGVyb2lkTm9ybWFscyh2ZXJ0aWNlcywgb3V0KSB7XG4gICAgb3V0ID0gb3V0IHx8IFtdO1xuICAgIHZhciBsZW5ndGggPSB2ZXJ0aWNlcy5sZW5ndGggLyAzO1xuICAgIHZhciBub3JtYWxpemVkO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBub3JtYWxpemVkID0gbmV3IFZlYzMoXG4gICAgICAgICAgICB2ZXJ0aWNlc1tpICogMyArIDBdLFxuICAgICAgICAgICAgdmVydGljZXNbaSAqIDMgKyAxXSxcbiAgICAgICAgICAgIHZlcnRpY2VzW2kgKiAzICsgMl1cbiAgICAgICAgKS5ub3JtYWxpemUoKS50b0FycmF5KCk7XG5cbiAgICAgICAgb3V0W2kgKiAzICsgMF0gPSBub3JtYWxpemVkWzBdO1xuICAgICAgICBvdXRbaSAqIDMgKyAxXSA9IG5vcm1hbGl6ZWRbMV07XG4gICAgICAgIG91dFtpICogMyArIDJdID0gbm9ybWFsaXplZFsyXTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3V0O1xufTtcblxuLyoqXG4gKiBDYWxjdWxhdGVzIHRleHR1cmUgY29vcmRpbmF0ZXMgZm9yIHNwaGVyb2lkIHByaW1pdGl2ZXMgYmFzZWQgb25cbiAqIGlucHV0IHZlcnRpY2VzLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSB2ZXJ0aWNlcyBWZXJ0aWNlcyBvZiBhbGwgcG9pbnRzIG9uIHRoZSBnZW9tZXRyeVxuICogQHBhcmFtIHtBcnJheX0gb3V0IE9wdGlvbmFsIGFycmF5IHRvIGJlIGZpbGxlZCB3aXRoIHJlc3VsdGluZyB0ZXh0dXJlIGNvb3JkaW5hdGVzLlxuICpcbiAqIEByZXR1cm4ge0FycmF5fSBOZXcgbGlzdCBvZiBjYWxjdWxhdGVkIHRleHR1cmUgY29vcmRpbmF0ZXNcbiAqL1xuR2VvbWV0cnlIZWxwZXIuZ2V0U3BoZXJvaWRVViA9IGZ1bmN0aW9uIGdldFNwaGVyb2lkVVYodmVydGljZXMsIG91dCkge1xuICAgIG91dCA9IG91dCB8fCBbXTtcbiAgICB2YXIgbGVuZ3RoID0gdmVydGljZXMubGVuZ3RoIC8gMztcbiAgICB2YXIgdmVydGV4O1xuXG4gICAgdmFyIHV2ID0gW107XG5cbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmVydGV4ID0gb3V0cHV0c1swXS5zZXQoXG4gICAgICAgICAgICB2ZXJ0aWNlc1tpICogM10sXG4gICAgICAgICAgICB2ZXJ0aWNlc1tpICogMyArIDFdLFxuICAgICAgICAgICAgdmVydGljZXNbaSAqIDMgKyAyXVxuICAgICAgICApXG4gICAgICAgIC5ub3JtYWxpemUoKVxuICAgICAgICAudG9BcnJheSgpO1xuXG4gICAgICAgIHV2WzBdID0gdGhpcy5nZXRBemltdXRoKHZlcnRleCkgKiAwLjUgLyBNYXRoLlBJICsgMC41O1xuICAgICAgICB1dlsxXSA9IHRoaXMuZ2V0QWx0aXR1ZGUodmVydGV4KSAvIE1hdGguUEkgKyAwLjU7XG5cbiAgICAgICAgb3V0LnB1c2guYXBwbHkob3V0LCB1dik7XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dDtcbn07XG5cbi8qKlxuICogSXRlcmF0ZXMgdGhyb3VnaCBhbmQgbm9ybWFsaXplcyBhIGxpc3Qgb2YgdmVydGljZXMuXG4gKlxuICogQHN0YXRpY1xuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHZlcnRpY2VzIFZlcnRpY2VzIG9mIGFsbCBwb2ludHMgb24gdGhlIGdlb21ldHJ5XG4gKiBAcGFyYW0ge0FycmF5fSBvdXQgT3B0aW9uYWwgYXJyYXkgdG8gYmUgZmlsbGVkIHdpdGggcmVzdWx0aW5nIG5vcm1hbGl6ZWQgdmVjdG9ycy5cbiAqXG4gKiBAcmV0dXJuIHtBcnJheX0gTmV3IGxpc3Qgb2Ygbm9ybWFsaXplZCB2ZXJ0aWNlc1xuICovXG5HZW9tZXRyeUhlbHBlci5ub3JtYWxpemVBbGwgPSBmdW5jdGlvbiBub3JtYWxpemVBbGwodmVydGljZXMsIG91dCkge1xuICAgIG91dCA9IG91dCB8fCBbXTtcbiAgICB2YXIgbGVuID0gdmVydGljZXMubGVuZ3RoIC8gMztcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkob3V0LCBuZXcgVmVjMyh2ZXJ0aWNlc1tpICogM10sIHZlcnRpY2VzW2kgKiAzICsgMV0sIHZlcnRpY2VzW2kgKiAzICsgMl0pLm5vcm1hbGl6ZSgpLnRvQXJyYXkoKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dDtcbn07XG5cbi8qKlxuICogTm9ybWFsaXplcyBhIHNldCBvZiB2ZXJ0aWNlcyB0byBtb2RlbCBzcGFjZS5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtBcnJheX0gdmVydGljZXMgVmVydGljZXMgb2YgYWxsIHBvaW50cyBvbiB0aGUgZ2VvbWV0cnlcbiAqIEBwYXJhbSB7QXJyYXl9IG91dCBPcHRpb25hbCBhcnJheSB0byBiZSBmaWxsZWQgd2l0aCBtb2RlbCBzcGFjZSBwb3NpdGlvbiB2ZWN0b3JzLlxuICpcbiAqIEByZXR1cm4ge0FycmF5fSBPdXRwdXQgdmVydGljZXMuXG4gKi9cbkdlb21ldHJ5SGVscGVyLm5vcm1hbGl6ZVZlcnRpY2VzID0gZnVuY3Rpb24gbm9ybWFsaXplVmVydGljZXModmVydGljZXMsIG91dCkge1xuICAgIG91dCA9IG91dCB8fCBbXTtcbiAgICB2YXIgbGVuID0gdmVydGljZXMubGVuZ3RoIC8gMztcbiAgICB2YXIgdmVjdG9ycyA9IFtdO1xuICAgIHZhciBtaW5YO1xuICAgIHZhciBtYXhYO1xuICAgIHZhciBtaW5ZO1xuICAgIHZhciBtYXhZO1xuICAgIHZhciBtaW5aO1xuICAgIHZhciBtYXhaO1xuICAgIHZhciB2O1xuICAgIHZhciBpO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIHYgPSB2ZWN0b3JzW2ldID0gbmV3IFZlYzMoXG4gICAgICAgICAgICB2ZXJ0aWNlc1tpICogM10sXG4gICAgICAgICAgICB2ZXJ0aWNlc1tpICogMyArIDFdLFxuICAgICAgICAgICAgdmVydGljZXNbaSAqIDMgKyAyXVxuICAgICAgICApO1xuXG4gICAgICAgIGlmIChtaW5YID09IG51bGwgfHwgdi54IDwgbWluWCkgbWluWCA9IHYueDtcbiAgICAgICAgaWYgKG1heFggPT0gbnVsbCB8fCB2LnggPiBtYXhYKSBtYXhYID0gdi54O1xuXG4gICAgICAgIGlmIChtaW5ZID09IG51bGwgfHwgdi55IDwgbWluWSkgbWluWSA9IHYueTtcbiAgICAgICAgaWYgKG1heFkgPT0gbnVsbCB8fCB2LnkgPiBtYXhZKSBtYXhZID0gdi55O1xuXG4gICAgICAgIGlmIChtaW5aID09IG51bGwgfHwgdi56IDwgbWluWikgbWluWiA9IHYuejtcbiAgICAgICAgaWYgKG1heFogPT0gbnVsbCB8fCB2LnogPiBtYXhaKSBtYXhaID0gdi56O1xuICAgIH1cblxuICAgIHZhciB0cmFuc2xhdGlvbiA9IG5ldyBWZWMzKFxuICAgICAgICBnZXRUcmFuc2xhdGlvbkZhY3RvcihtYXhYLCBtaW5YKSxcbiAgICAgICAgZ2V0VHJhbnNsYXRpb25GYWN0b3IobWF4WSwgbWluWSksXG4gICAgICAgIGdldFRyYW5zbGF0aW9uRmFjdG9yKG1heFosIG1pblopXG4gICAgKTtcblxuICAgIHZhciBzY2FsZSA9IE1hdGgubWluKFxuICAgICAgICBnZXRTY2FsZUZhY3RvcihtYXhYICsgdHJhbnNsYXRpb24ueCwgbWluWCArIHRyYW5zbGF0aW9uLngpLFxuICAgICAgICBnZXRTY2FsZUZhY3RvcihtYXhZICsgdHJhbnNsYXRpb24ueSwgbWluWSArIHRyYW5zbGF0aW9uLnkpLFxuICAgICAgICBnZXRTY2FsZUZhY3RvcihtYXhaICsgdHJhbnNsYXRpb24ueiwgbWluWiArIHRyYW5zbGF0aW9uLnopXG4gICAgKTtcblxuICAgIGZvciAoaSA9IDA7IGkgPCB2ZWN0b3JzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG91dC5wdXNoLmFwcGx5KG91dCwgdmVjdG9yc1tpXS5hZGQodHJhbnNsYXRpb24pLnNjYWxlKHNjYWxlKS50b0FycmF5KCkpO1xuICAgIH1cblxuICAgIHJldHVybiBvdXQ7XG59O1xuXG4vKipcbiAqIERldGVybWluZXMgdHJhbnNsYXRpb24gYW1vdW50IGZvciBhIGdpdmVuIGF4aXMgdG8gbm9ybWFsaXplIG1vZGVsIGNvb3JkaW5hdGVzLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwcml2YXRlXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IG1heCBNYXhpbXVtIHBvc2l0aW9uIHZhbHVlIG9mIGdpdmVuIGF4aXMgb24gdGhlIG1vZGVsLlxuICogQHBhcmFtIHtOdW1iZXJ9IG1pbiBNaW5pbXVtIHBvc2l0aW9uIHZhbHVlIG9mIGdpdmVuIGF4aXMgb24gdGhlIG1vZGVsLlxuICpcbiAqIEByZXR1cm4ge051bWJlcn0gTnVtYmVyIGJ5IHdoaWNoIHRoZSBnaXZlbiBheGlzIHNob3VsZCBiZSB0cmFuc2xhdGVkIGZvciBhbGwgdmVydGljZXMuXG4gKi9cbmZ1bmN0aW9uIGdldFRyYW5zbGF0aW9uRmFjdG9yKG1heCwgbWluKSB7XG4gICAgcmV0dXJuIC0obWluICsgKG1heCAtIG1pbikgLyAyKTtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmVzIHNjYWxlIGFtb3VudCBmb3IgYSBnaXZlbiBheGlzIHRvIG5vcm1hbGl6ZSBtb2RlbCBjb29yZGluYXRlcy5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcHJpdmF0ZVxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBtYXggTWF4aW11bSBzY2FsZSB2YWx1ZSBvZiBnaXZlbiBheGlzIG9uIHRoZSBtb2RlbC5cbiAqIEBwYXJhbSB7TnVtYmVyfSBtaW4gTWluaW11bSBzY2FsZSB2YWx1ZSBvZiBnaXZlbiBheGlzIG9uIHRoZSBtb2RlbC5cbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IE51bWJlciBieSB3aGljaCB0aGUgZ2l2ZW4gYXhpcyBzaG91bGQgYmUgc2NhbGVkIGZvciBhbGwgdmVydGljZXMuXG4gKi9cbmZ1bmN0aW9uIGdldFNjYWxlRmFjdG9yKG1heCwgbWluKSB7XG4gICAgcmV0dXJuIDEgLyAoKG1heCAtIG1pbikgLyAyKTtcbn1cblxuLyoqXG4gKiBGaW5kcyB0aGUgYXppbXV0aCwgb3IgYW5nbGUgYWJvdmUgdGhlIFhZIHBsYW5lLCBvZiBhIGdpdmVuIHZlY3Rvci5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtBcnJheX0gdiBWZXJ0ZXggdG8gcmV0cmVpdmUgYXppbXV0aCBmcm9tLlxuICpcbiAqIEByZXR1cm4ge051bWJlcn0gQXppbXV0aCB2YWx1ZSBpbiByYWRpYW5zLlxuICovXG5HZW9tZXRyeUhlbHBlci5nZXRBemltdXRoID0gZnVuY3Rpb24gYXppbXV0aCh2KSB7XG4gICAgcmV0dXJuIE1hdGguYXRhbjIodlsyXSwgLXZbMF0pO1xufTtcblxuLyoqXG4gKiBGaW5kcyB0aGUgYWx0aXR1ZGUsIG9yIGFuZ2xlIGFib3ZlIHRoZSBYWiBwbGFuZSwgb2YgYSBnaXZlbiB2ZWN0b3IuXG4gKlxuICogQHN0YXRpY1xuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHYgVmVydGV4IHRvIHJldHJlaXZlIGFsdGl0dWRlIGZyb20uXG4gKlxuICogQHJldHVybiB7TnVtYmVyfSBBbHRpdHVkZSB2YWx1ZSBpbiByYWRpYW5zLlxuICovXG5HZW9tZXRyeUhlbHBlci5nZXRBbHRpdHVkZSA9IGZ1bmN0aW9uIGFsdGl0dWRlKHYpIHtcbiAgICByZXR1cm4gTWF0aC5hdGFuMigtdlsxXSwgTWF0aC5zcXJ0KCh2WzBdICogdlswXSkgKyAodlsyXSAqIHZbMl0pKSk7XG59O1xuXG4vKipcbiAqIENvbnZlcnRzIGEgbGlzdCBvZiBpbmRpY2VzIGZyb20gJ3RyaWFuZ2xlJyB0byAnbGluZScgZm9ybWF0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBpbmRpY2VzIEluZGljZXMgb2YgYWxsIGZhY2VzIG9uIHRoZSBnZW9tZXRyeVxuICogQHBhcmFtIHtBcnJheX0gb3V0IEluZGljZXMgb2YgYWxsIGZhY2VzIG9uIHRoZSBnZW9tZXRyeVxuICpcbiAqIEByZXR1cm4ge0FycmF5fSBOZXcgbGlzdCBvZiBsaW5lLWZvcm1hdHRlZCBpbmRpY2VzXG4gKi9cbkdlb21ldHJ5SGVscGVyLnRyaWFuZ2xlc1RvTGluZXMgPSBmdW5jdGlvbiB0cmlhbmdsZVRvTGluZXMoaW5kaWNlcywgb3V0KSB7XG4gICAgdmFyIG51bVZlY3RvcnMgPSBpbmRpY2VzLmxlbmd0aCAvIDM7XG4gICAgb3V0ID0gb3V0IHx8IFtdO1xuICAgIHZhciBpO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IG51bVZlY3RvcnM7IGkrKykge1xuICAgICAgICBvdXQucHVzaChpbmRpY2VzW2kgKiAzICsgMF0sIGluZGljZXNbaSAqIDMgKyAxXSk7XG4gICAgICAgIG91dC5wdXNoKGluZGljZXNbaSAqIDMgKyAxXSwgaW5kaWNlc1tpICogMyArIDJdKTtcbiAgICAgICAgb3V0LnB1c2goaW5kaWNlc1tpICogMyArIDJdLCBpbmRpY2VzW2kgKiAzICsgMF0pO1xuICAgIH1cblxuICAgIHJldHVybiBvdXQ7XG59O1xuXG4vKipcbiAqIEFkZHMgYSByZXZlcnNlIG9yZGVyIHRyaWFuZ2xlIGZvciBldmVyeSB0cmlhbmdsZSBpbiB0aGUgbWVzaC4gQWRkcyBleHRyYSB2ZXJ0aWNlc1xuICogYW5kIGluZGljZXMgdG8gaW5wdXQgYXJyYXlzLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSB2ZXJ0aWNlcyBYLCBZLCBaIHBvc2l0aW9ucyBvZiBhbGwgdmVydGljZXMgaW4gdGhlIGdlb21ldHJ5XG4gKiBAcGFyYW0ge0FycmF5fSBpbmRpY2VzIEluZGljZXMgb2YgYWxsIGZhY2VzIG9uIHRoZSBnZW9tZXRyeVxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuR2VvbWV0cnlIZWxwZXIuYWRkQmFja2ZhY2VUcmlhbmdsZXMgPSBmdW5jdGlvbiBhZGRCYWNrZmFjZVRyaWFuZ2xlcyh2ZXJ0aWNlcywgaW5kaWNlcykge1xuICAgIHZhciBuRmFjZXMgPSBpbmRpY2VzLmxlbmd0aCAvIDM7XG5cbiAgICB2YXIgbWF4SW5kZXggPSAwO1xuICAgIHZhciBpID0gaW5kaWNlcy5sZW5ndGg7XG4gICAgd2hpbGUgKGktLSkgaWYgKGluZGljZXNbaV0gPiBtYXhJbmRleCkgbWF4SW5kZXggPSBpbmRpY2VzW2ldO1xuXG4gICAgbWF4SW5kZXgrKztcblxuICAgIGZvciAoaSA9IDA7IGkgPCBuRmFjZXM7IGkrKykge1xuICAgICAgICB2YXIgaW5kZXhPbmUgPSBpbmRpY2VzW2kgKiAzXSxcbiAgICAgICAgICAgIGluZGV4VHdvID0gaW5kaWNlc1tpICogMyArIDFdLFxuICAgICAgICAgICAgaW5kZXhUaHJlZSA9IGluZGljZXNbaSAqIDMgKyAyXTtcblxuICAgICAgICBpbmRpY2VzLnB1c2goaW5kZXhPbmUgKyBtYXhJbmRleCwgaW5kZXhUaHJlZSArIG1heEluZGV4LCBpbmRleFR3byArIG1heEluZGV4KTtcbiAgICB9XG5cbiAgICAvLyBJdGVyYXRpbmcgaW5zdGVhZCBvZiAuc2xpY2UoKSBoZXJlIHRvIGF2b2lkIG1heCBjYWxsIHN0YWNrIGlzc3VlLlxuXG4gICAgdmFyIG5WZXJ0cyA9IHZlcnRpY2VzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgblZlcnRzOyBpKyspIHtcbiAgICAgICAgdmVydGljZXMucHVzaCh2ZXJ0aWNlc1tpXSk7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBHZW9tZXRyeUhlbHBlcjtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIEdlb21ldHJ5ID0gcmVxdWlyZSgnLi4vR2VvbWV0cnknKTtcbnZhciBHZW9tZXRyeUhlbHBlciA9IHJlcXVpcmUoJy4uL0dlb21ldHJ5SGVscGVyJyk7XG5cbi8qKlxuICogVGhpcyBmdW5jdGlvbiByZXR1cm5zIGEgbmV3IHN0YXRpYyBnZW9tZXRyeSwgd2hpY2ggaXMgcGFzc2VkXG4gKiBjdXN0b20gYnVmZmVyIGRhdGEuXG4gKlxuICogQGNsYXNzIFBsYW5lXG4gKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBQYXJhbWV0ZXJzIHRoYXQgYWx0ZXIgdGhlXG4gKiB2ZXJ0ZXggYnVmZmVycyBvZiB0aGUgZ2VuZXJhdGVkIGdlb21ldHJ5LlxuICpcbiAqIEByZXR1cm4ge09iamVjdH0gY29uc3RydWN0ZWQgZ2VvbWV0cnlcbiAqL1xuZnVuY3Rpb24gUGxhbmUob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHZhciBkZXRhaWxYID0gb3B0aW9ucy5kZXRhaWxYIHx8IG9wdGlvbnMuZGV0YWlsIHx8IDE7XG4gICAgdmFyIGRldGFpbFkgPSBvcHRpb25zLmRldGFpbFkgfHwgb3B0aW9ucy5kZXRhaWwgfHwgMTtcblxuICAgIHZhciB2ZXJ0aWNlcyAgICAgID0gW107XG4gICAgdmFyIHRleHR1cmVDb29yZHMgPSBbXTtcbiAgICB2YXIgbm9ybWFscyAgICAgICA9IFtdO1xuICAgIHZhciBpbmRpY2VzICAgICAgID0gW107XG5cbiAgICB2YXIgaTtcblxuICAgIGZvciAodmFyIHkgPSAwOyB5IDw9IGRldGFpbFk7IHkrKykge1xuICAgICAgICB2YXIgdCA9IHkgLyBkZXRhaWxZO1xuICAgICAgICBmb3IgKHZhciB4ID0gMDsgeCA8PSBkZXRhaWxYOyB4KyspIHtcbiAgICAgICAgICAgIHZhciBzID0geCAvIGRldGFpbFg7XG4gICAgICAgICAgICB2ZXJ0aWNlcy5wdXNoKDIuICogKHMgLSAuNSksIDIgKiAodCAtIC41KSwgMCk7XG4gICAgICAgICAgICB0ZXh0dXJlQ29vcmRzLnB1c2gocywgMSAtIHQpO1xuICAgICAgICAgICAgaWYgKHggPCBkZXRhaWxYICYmIHkgPCBkZXRhaWxZKSB7XG4gICAgICAgICAgICAgICAgaSA9IHggKyB5ICogKGRldGFpbFggKyAxKTtcbiAgICAgICAgICAgICAgICBpbmRpY2VzLnB1c2goaSwgaSArIDEsIGkgKyBkZXRhaWxYICsgMSk7XG4gICAgICAgICAgICAgICAgaW5kaWNlcy5wdXNoKGkgKyBkZXRhaWxYICsgMSwgaSArIDEsIGkgKyBkZXRhaWxYICsgMik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5iYWNrZmFjZSAhPT0gZmFsc2UpIHtcbiAgICAgICAgR2VvbWV0cnlIZWxwZXIuYWRkQmFja2ZhY2VUcmlhbmdsZXModmVydGljZXMsIGluZGljZXMpO1xuXG4gICAgICAgIC8vIGR1cGxpY2F0ZSB0ZXh0dXJlIGNvb3JkaW5hdGVzIGFzIHdlbGxcblxuICAgICAgICB2YXIgbGVuID0gdGV4dHVyZUNvb3Jkcy5sZW5ndGg7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykgdGV4dHVyZUNvb3Jkcy5wdXNoKHRleHR1cmVDb29yZHNbaV0pO1xuICAgIH1cblxuICAgIG5vcm1hbHMgPSBHZW9tZXRyeUhlbHBlci5jb21wdXRlTm9ybWFscyh2ZXJ0aWNlcywgaW5kaWNlcyk7XG5cbiAgICByZXR1cm4gbmV3IEdlb21ldHJ5KHtcbiAgICAgICAgYnVmZmVyczogW1xuICAgICAgICAgICAgeyBuYW1lOiAnYV9wb3MnLCBkYXRhOiB2ZXJ0aWNlcyB9LFxuICAgICAgICAgICAgeyBuYW1lOiAnYV90ZXhDb29yZCcsIGRhdGE6IHRleHR1cmVDb29yZHMsIHNpemU6IDIgfSxcbiAgICAgICAgICAgIHsgbmFtZTogJ2Ffbm9ybWFscycsIGRhdGE6IG5vcm1hbHMgfSxcbiAgICAgICAgICAgIHsgbmFtZTogJ2luZGljZXMnLCBkYXRhOiBpbmRpY2VzLCBzaXplOiAxIH1cbiAgICAgICAgXVxuICAgIH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFBsYW5lO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEJ1ZmZlciBpcyBhIHByaXZhdGUgY2xhc3MgdGhhdCB3cmFwcyB0aGUgdmVydGV4IGRhdGEgdGhhdCBkZWZpbmVzXG4gKiB0aGUgdGhlIHBvaW50cyBvZiB0aGUgdHJpYW5nbGVzIHRoYXQgd2ViZ2wgZHJhd3MuIEVhY2ggYnVmZmVyXG4gKiBtYXBzIHRvIG9uZSBhdHRyaWJ1dGUgb2YgYSBtZXNoLlxuICpcbiAqIEBjbGFzcyBCdWZmZXJcbiAqIEBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB0YXJnZXQgVGhlIGJpbmQgdGFyZ2V0IG9mIHRoZSBidWZmZXIgdG8gdXBkYXRlOiBBUlJBWV9CVUZGRVIgb3IgRUxFTUVOVF9BUlJBWV9CVUZGRVJcbiAqIEBwYXJhbSB7T2JqZWN0fSB0eXBlIEFycmF5IHR5cGUgdG8gYmUgdXNlZCBpbiBjYWxscyB0byBnbC5idWZmZXJEYXRhLlxuICogQHBhcmFtIHtXZWJHTENvbnRleHR9IGdsIFRoZSBXZWJHTCBjb250ZXh0IHRoYXQgdGhlIGJ1ZmZlciBpcyBob3N0ZWQgYnkuXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuZnVuY3Rpb24gQnVmZmVyKHRhcmdldCwgdHlwZSwgZ2wpIHtcbiAgICB0aGlzLmJ1ZmZlciA9IG51bGw7XG4gICAgdGhpcy50YXJnZXQgPSB0YXJnZXQ7XG4gICAgdGhpcy50eXBlID0gdHlwZTtcbiAgICB0aGlzLmRhdGEgPSBbXTtcbiAgICB0aGlzLmdsID0gZ2w7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIFdlYkdMIGJ1ZmZlciBpZiBvbmUgZG9lcyBub3QgeWV0IGV4aXN0IGFuZCBiaW5kcyB0aGUgYnVmZmVyIHRvXG4gKiB0byB0aGUgY29udGV4dC4gUnVucyBidWZmZXJEYXRhIHdpdGggYXBwcm9wcmlhdGUgZGF0YS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuQnVmZmVyLnByb3RvdHlwZS5zdWJEYXRhID0gZnVuY3Rpb24gc3ViRGF0YSgpIHtcbiAgICB2YXIgZ2wgPSB0aGlzLmdsO1xuICAgIHZhciBkYXRhID0gW107XG5cbiAgICAvLyB0byBwcmV2ZW50IGFnYWluc3QgbWF4aW11bSBjYWxsLXN0YWNrIGlzc3VlLlxuICAgIGZvciAodmFyIGkgPSAwLCBjaHVuayA9IDEwMDAwOyBpIDwgdGhpcy5kYXRhLmxlbmd0aDsgaSArPSBjaHVuaylcbiAgICAgICAgZGF0YSA9IEFycmF5LnByb3RvdHlwZS5jb25jYXQuYXBwbHkoZGF0YSwgdGhpcy5kYXRhLnNsaWNlKGksIGkgKyBjaHVuaykpO1xuXG4gICAgdGhpcy5idWZmZXIgPSB0aGlzLmJ1ZmZlciB8fCBnbC5jcmVhdGVCdWZmZXIoKTtcbiAgICBnbC5iaW5kQnVmZmVyKHRoaXMudGFyZ2V0LCB0aGlzLmJ1ZmZlcik7XG4gICAgZ2wuYnVmZmVyRGF0YSh0aGlzLnRhcmdldCwgbmV3IHRoaXMudHlwZShkYXRhKSwgZ2wuU1RBVElDX0RSQVcpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBCdWZmZXI7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBJTkRJQ0VTID0gJ2luZGljZXMnO1xuXG52YXIgQnVmZmVyID0gcmVxdWlyZSgnLi9CdWZmZXInKTtcblxuLyoqXG4gKiBCdWZmZXJSZWdpc3RyeSBpcyBhIGNsYXNzIHRoYXQgbWFuYWdlcyBhbGxvY2F0aW9uIG9mIGJ1ZmZlcnMgdG9cbiAqIGlucHV0IGdlb21ldHJpZXMuXG4gKlxuICogQGNsYXNzIEJ1ZmZlclJlZ2lzdHJ5XG4gKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge1dlYkdMQ29udGV4dH0gY29udGV4dCBXZWJHTCBkcmF3aW5nIGNvbnRleHQgdG8gYmUgcGFzc2VkIHRvIGJ1ZmZlcnMuXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuZnVuY3Rpb24gQnVmZmVyUmVnaXN0cnkoY29udGV4dCkge1xuICAgIHRoaXMuZ2wgPSBjb250ZXh0O1xuXG4gICAgdGhpcy5yZWdpc3RyeSA9IHt9O1xuICAgIHRoaXMuX2R5bmFtaWNCdWZmZXJzID0gW107XG4gICAgdGhpcy5fc3RhdGljQnVmZmVycyA9IFtdO1xuXG4gICAgdGhpcy5fYXJyYXlCdWZmZXJNYXggPSAzMDAwMDtcbiAgICB0aGlzLl9lbGVtZW50QnVmZmVyTWF4ID0gMzAwMDA7XG59XG5cbi8qKlxuICogQmluZHMgYW5kIGZpbGxzIGFsbCB0aGUgdmVydGV4IGRhdGEgaW50byB3ZWJnbCBidWZmZXJzLiAgV2lsbCByZXVzZSBidWZmZXJzIGlmXG4gKiBwb3NzaWJsZS4gIFBvcHVsYXRlcyByZWdpc3RyeSB3aXRoIHRoZSBuYW1lIG9mIHRoZSBidWZmZXIsIHRoZSBXZWJHTCBidWZmZXJcbiAqIG9iamVjdCwgc3BhY2luZyBvZiB0aGUgYXR0cmlidXRlLCB0aGUgYXR0cmlidXRlJ3Mgb2Zmc2V0IHdpdGhpbiB0aGUgYnVmZmVyLFxuICogYW5kIGZpbmFsbHkgdGhlIGxlbmd0aCBvZiB0aGUgYnVmZmVyLiAgVGhpcyBpbmZvcm1hdGlvbiBpcyBsYXRlciBhY2Nlc3NlZCBieVxuICogdGhlIHJvb3QgdG8gZHJhdyB0aGUgYnVmZmVycy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IGdlb21ldHJ5SWQgSWQgb2YgdGhlIGdlb21ldHJ5IGluc3RhbmNlIHRoYXQgaG9sZHMgdGhlIGJ1ZmZlcnMuXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBLZXkgb2YgdGhlIGlucHV0IGJ1ZmZlciBpbiB0aGUgZ2VvbWV0cnkuXG4gKiBAcGFyYW0ge0FycmF5fSB2YWx1ZSBGbGF0IGFycmF5IGNvbnRhaW5pbmcgaW5wdXQgZGF0YSBmb3IgYnVmZmVyLlxuICogQHBhcmFtIHtOdW1iZXJ9IHNwYWNpbmcgVGhlIHNwYWNpbmcsIG9yIGl0ZW1TaXplLCBvZiB0aGUgaW5wdXQgYnVmZmVyLlxuICogQHBhcmFtIHtCb29sZWFufSBkeW5hbWljIEJvb2xlYW4gZGVub3Rpbmcgd2hldGhlciBhIGdlb21ldHJ5IGlzIGR5bmFtaWMgb3Igc3RhdGljLlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkJ1ZmZlclJlZ2lzdHJ5LnByb3RvdHlwZS5hbGxvY2F0ZSA9IGZ1bmN0aW9uIGFsbG9jYXRlKGdlb21ldHJ5SWQsIG5hbWUsIHZhbHVlLCBzcGFjaW5nLCBkeW5hbWljKSB7XG4gICAgdmFyIHZlcnRleEJ1ZmZlcnMgPSB0aGlzLnJlZ2lzdHJ5W2dlb21ldHJ5SWRdIHx8ICh0aGlzLnJlZ2lzdHJ5W2dlb21ldHJ5SWRdID0geyBrZXlzOiBbXSwgdmFsdWVzOiBbXSwgc3BhY2luZzogW10sIG9mZnNldDogW10sIGxlbmd0aDogW10gfSk7XG5cbiAgICB2YXIgaiA9IHZlcnRleEJ1ZmZlcnMua2V5cy5pbmRleE9mKG5hbWUpO1xuICAgIHZhciBpc0luZGV4ID0gbmFtZSA9PT0gSU5ESUNFUztcbiAgICB2YXIgYnVmZmVyRm91bmQgPSBmYWxzZTtcbiAgICB2YXIgbmV3T2Zmc2V0O1xuICAgIHZhciBvZmZzZXQgPSAwO1xuICAgIHZhciBsZW5ndGg7XG4gICAgdmFyIGJ1ZmZlcjtcbiAgICB2YXIgaztcblxuICAgIGlmIChqID09PSAtMSkge1xuICAgICAgICBqID0gdmVydGV4QnVmZmVycy5rZXlzLmxlbmd0aDtcbiAgICAgICAgbGVuZ3RoID0gaXNJbmRleCA/IHZhbHVlLmxlbmd0aCA6IE1hdGguZmxvb3IodmFsdWUubGVuZ3RoIC8gc3BhY2luZyk7XG5cbiAgICAgICAgaWYgKCFkeW5hbWljKSB7XG5cbiAgICAgICAgICAgIC8vIFVzZSBhIHByZXZpb3VzbHkgY3JlYXRlZCBidWZmZXIgaWYgYXZhaWxhYmxlLlxuXG4gICAgICAgICAgICBmb3IgKGsgPSAwOyBrIDwgdGhpcy5fc3RhdGljQnVmZmVycy5sZW5ndGg7IGsrKykge1xuXG4gICAgICAgICAgICAgICAgaWYgKGlzSW5kZXggPT09IHRoaXMuX3N0YXRpY0J1ZmZlcnNba10uaXNJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICBuZXdPZmZzZXQgPSB0aGlzLl9zdGF0aWNCdWZmZXJzW2tdLm9mZnNldCArIHZhbHVlLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCghaXNJbmRleCAmJiBuZXdPZmZzZXQgPCB0aGlzLl9hcnJheUJ1ZmZlck1heCkgfHwgKGlzSW5kZXggJiYgbmV3T2Zmc2V0IDwgdGhpcy5fZWxlbWVudEJ1ZmZlck1heCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZmZlciA9IHRoaXMuX3N0YXRpY0J1ZmZlcnNba10uYnVmZmVyO1xuICAgICAgICAgICAgICAgICAgICAgICAgb2Zmc2V0ID0gdGhpcy5fc3RhdGljQnVmZmVyc1trXS5vZmZzZXQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9zdGF0aWNCdWZmZXJzW2tdLm9mZnNldCArPSB2YWx1ZS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgICBidWZmZXJGb3VuZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ3JlYXRlIGEgbmV3IHN0YXRpYyBidWZmZXIgaW4gbm9uZSB3ZXJlIGZvdW5kLlxuXG4gICAgICAgICAgICBpZiAoIWJ1ZmZlckZvdW5kKSB7XG4gICAgICAgICAgICAgICAgYnVmZmVyID0gbmV3IEJ1ZmZlcihcbiAgICAgICAgICAgICAgICAgICAgaXNJbmRleCA/IHRoaXMuZ2wuRUxFTUVOVF9BUlJBWV9CVUZGRVIgOiB0aGlzLmdsLkFSUkFZX0JVRkZFUixcbiAgICAgICAgICAgICAgICAgICAgaXNJbmRleCA/IFVpbnQxNkFycmF5IDogRmxvYXQzMkFycmF5LFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmdsXG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRpY0J1ZmZlcnMucHVzaCh7IGJ1ZmZlcjogYnVmZmVyLCBvZmZzZXQ6IHZhbHVlLmxlbmd0aCwgaXNJbmRleDogaXNJbmRleCB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcblxuICAgICAgICAgICAgLy8gRm9yIGR5bmFtaWMgZ2VvbWV0cmllcywgYWx3YXlzIGNyZWF0ZSBuZXcgYnVmZmVyLlxuXG4gICAgICAgICAgICBidWZmZXIgPSBuZXcgQnVmZmVyKFxuICAgICAgICAgICAgICAgIGlzSW5kZXggPyB0aGlzLmdsLkVMRU1FTlRfQVJSQVlfQlVGRkVSIDogdGhpcy5nbC5BUlJBWV9CVUZGRVIsXG4gICAgICAgICAgICAgICAgaXNJbmRleCA/IFVpbnQxNkFycmF5IDogRmxvYXQzMkFycmF5LFxuICAgICAgICAgICAgICAgIHRoaXMuZ2xcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIHRoaXMuX2R5bmFtaWNCdWZmZXJzLnB1c2goeyBidWZmZXI6IGJ1ZmZlciwgb2Zmc2V0OiB2YWx1ZS5sZW5ndGgsIGlzSW5kZXg6IGlzSW5kZXggfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgdGhlIHJlZ2lzdHJ5IGZvciB0aGUgc3BlYyB3aXRoIGJ1ZmZlciBpbmZvcm1hdGlvbi5cblxuICAgICAgICB2ZXJ0ZXhCdWZmZXJzLmtleXMucHVzaChuYW1lKTtcbiAgICAgICAgdmVydGV4QnVmZmVycy52YWx1ZXMucHVzaChidWZmZXIpO1xuICAgICAgICB2ZXJ0ZXhCdWZmZXJzLnNwYWNpbmcucHVzaChzcGFjaW5nKTtcbiAgICAgICAgdmVydGV4QnVmZmVycy5vZmZzZXQucHVzaChvZmZzZXQpO1xuICAgICAgICB2ZXJ0ZXhCdWZmZXJzLmxlbmd0aC5wdXNoKGxlbmd0aCk7XG4gICAgfVxuXG4gICAgdmFyIGxlbiA9IHZhbHVlLmxlbmd0aDtcbiAgICBmb3IgKGsgPSAwOyBrIDwgbGVuOyBrKyspIHtcbiAgICAgICAgdmVydGV4QnVmZmVycy52YWx1ZXNbal0uZGF0YVtvZmZzZXQgKyBrXSA9IHZhbHVlW2tdO1xuICAgIH1cbiAgICB2ZXJ0ZXhCdWZmZXJzLnZhbHVlc1tqXS5zdWJEYXRhKCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJ1ZmZlclJlZ2lzdHJ5O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4vKipcbiAqIFRha2VzIHRoZSBvcmlnaW5hbCByZW5kZXJpbmcgY29udGV4dHMnIGNvbXBpbGVyIGZ1bmN0aW9uXG4gKiBhbmQgYXVnbWVudHMgaXQgd2l0aCBhZGRlZCBmdW5jdGlvbmFsaXR5IGZvciBwYXJzaW5nIGFuZFxuICogZGlzcGxheWluZyBlcnJvcnMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gQXVnbWVudGVkIGZ1bmN0aW9uXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gRGVidWcoKSB7XG4gICAgcmV0dXJuIF9hdWdtZW50RnVuY3Rpb24oXG4gICAgICAgIHRoaXMuZ2wuY29tcGlsZVNoYWRlcixcbiAgICAgICAgZnVuY3Rpb24oc2hhZGVyKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuZ2V0U2hhZGVyUGFyYW1ldGVyKHNoYWRlciwgdGhpcy5DT01QSUxFX1NUQVRVUykpIHtcbiAgICAgICAgICAgICAgICB2YXIgZXJyb3JzID0gdGhpcy5nZXRTaGFkZXJJbmZvTG9nKHNoYWRlcik7XG4gICAgICAgICAgICAgICAgdmFyIHNvdXJjZSA9IHRoaXMuZ2V0U2hhZGVyU291cmNlKHNoYWRlcik7XG4gICAgICAgICAgICAgICAgX3Byb2Nlc3NFcnJvcnMoZXJyb3JzLCBzb3VyY2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgKTtcbn07XG5cbi8vIFRha2VzIGEgZnVuY3Rpb24sIGtlZXBzIHRoZSByZWZlcmVuY2UgYW5kIHJlcGxhY2VzIGl0IGJ5IGEgY2xvc3VyZSB0aGF0XG4vLyBleGVjdXRlcyB0aGUgb3JpZ2luYWwgZnVuY3Rpb24gYW5kIHRoZSBwcm92aWRlZCBjYWxsYmFjay5cbmZ1bmN0aW9uIF9hdWdtZW50RnVuY3Rpb24oZnVuYywgY2FsbGJhY2spIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByZXMgPSBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIGNhbGxiYWNrLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfTtcbn1cblxuLy8gUGFyc2VzIGVycm9ycyBhbmQgZmFpbGVkIHNvdXJjZSBjb2RlIGZyb20gc2hhZGVycyBpbiBvcmRlclxuLy8gdG8gYnVpbGQgZGlzcGxheWFibGUgZXJyb3IgYmxvY2tzLlxuLy8gSW5zcGlyZWQgYnkgSmF1bWUgU2FuY2hleiBFbGlhcy5cbmZ1bmN0aW9uIF9wcm9jZXNzRXJyb3JzKGVycm9ycywgc291cmNlKSB7XG5cbiAgICB2YXIgY3NzID0gJ2JvZHksaHRtbHtiYWNrZ3JvdW5kOiNlM2UzZTM7Zm9udC1mYW1pbHk6bW9uYWNvLG1vbm9zcGFjZTtmb250LXNpemU6MTRweDtsaW5lLWhlaWdodDoxLjdlbX0nICtcbiAgICAgICAgICAgICAgJyNzaGFkZXJSZXBvcnR7bGVmdDowO3RvcDowO3JpZ2h0OjA7Ym94LXNpemluZzpib3JkZXItYm94O3Bvc2l0aW9uOmFic29sdXRlO3otaW5kZXg6MTAwMDtjb2xvcjonICtcbiAgICAgICAgICAgICAgJyMyMjI7cGFkZGluZzoxNXB4O3doaXRlLXNwYWNlOm5vcm1hbDtsaXN0LXN0eWxlLXR5cGU6bm9uZTttYXJnaW46NTBweCBhdXRvO21heC13aWR0aDoxMjAwcHh9JyArXG4gICAgICAgICAgICAgICcjc2hhZGVyUmVwb3J0IGxpe2JhY2tncm91bmQtY29sb3I6I2ZmZjttYXJnaW46MTNweCAwO2JveC1zaGFkb3c6MCAxcHggMnB4IHJnYmEoMCwwLDAsLjE1KTsnICtcbiAgICAgICAgICAgICAgJ3BhZGRpbmc6MjBweCAzMHB4O2JvcmRlci1yYWRpdXM6MnB4O2JvcmRlci1sZWZ0OjIwcHggc29saWQgI2UwMTExMX1zcGFue2NvbG9yOiNlMDExMTE7JyArXG4gICAgICAgICAgICAgICd0ZXh0LWRlY29yYXRpb246dW5kZXJsaW5lO2ZvbnQtd2VpZ2h0OjcwMH0jc2hhZGVyUmVwb3J0IGxpIHB7cGFkZGluZzowO21hcmdpbjowfScgK1xuICAgICAgICAgICAgICAnI3NoYWRlclJlcG9ydCBsaTpudGgtY2hpbGQoZXZlbil7YmFja2dyb3VuZC1jb2xvcjojZjRmNGY0fScgK1xuICAgICAgICAgICAgICAnI3NoYWRlclJlcG9ydCBsaSBwOmZpcnN0LWNoaWxke21hcmdpbi1ib3R0b206MTBweDtjb2xvcjojNjY2fSc7XG5cbiAgICB2YXIgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF0uYXBwZW5kQ2hpbGQoZWwpO1xuICAgIGVsLnRleHRDb250ZW50ID0gY3NzO1xuXG4gICAgdmFyIHJlcG9ydCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3VsJyk7XG4gICAgcmVwb3J0LnNldEF0dHJpYnV0ZSgnaWQnLCAnc2hhZGVyUmVwb3J0Jyk7XG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChyZXBvcnQpO1xuXG4gICAgdmFyIHJlID0gL0VSUk9SOiBbXFxkXSs6KFtcXGRdKyk6ICguKykvZ21pO1xuICAgIHZhciBsaW5lcyA9IHNvdXJjZS5zcGxpdCgnXFxuJyk7XG5cbiAgICB2YXIgbTtcbiAgICB3aGlsZSAoKG0gPSByZS5leGVjKGVycm9ycykpICE9IG51bGwpIHtcbiAgICAgICAgaWYgKG0uaW5kZXggPT09IHJlLmxhc3RJbmRleCkgcmUubGFzdEluZGV4Kys7XG4gICAgICAgIHZhciBsaSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XG4gICAgICAgIHZhciBjb2RlID0gJzxwPjxzcGFuPkVSUk9SPC9zcGFuPiBcIicgKyBtWzJdICsgJ1wiIGluIGxpbmUgJyArIG1bMV0gKyAnPC9wPic7XG4gICAgICAgIGNvZGUgKz0gJzxwPjxiPicgKyBsaW5lc1ttWzFdIC0gMV0ucmVwbGFjZSgvXlsgXFx0XSsvZywgJycpICsgJzwvYj48L3A+JztcbiAgICAgICAgbGkuaW5uZXJIVE1MID0gY29kZTtcbiAgICAgICAgcmVwb3J0LmFwcGVuZENoaWxkKGxpKTtcbiAgICB9XG59XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBjbG9uZSA9IHJlcXVpcmUoJy4uL3V0aWxpdGllcy9jbG9uZScpO1xudmFyIGtleVZhbHVlVG9BcnJheXMgPSByZXF1aXJlKCcuLi91dGlsaXRpZXMva2V5VmFsdWVUb0FycmF5cycpO1xuXG52YXIgdmVydGV4V3JhcHBlciA9IHJlcXVpcmUoJy4uL3dlYmdsLXNoYWRlcnMnKS52ZXJ0ZXg7XG52YXIgZnJhZ21lbnRXcmFwcGVyID0gcmVxdWlyZSgnLi4vd2ViZ2wtc2hhZGVycycpLmZyYWdtZW50O1xudmFyIERlYnVnID0gcmVxdWlyZSgnLi9EZWJ1ZycpO1xuXG52YXIgVkVSVEVYX1NIQURFUiA9IDM1NjMzO1xudmFyIEZSQUdNRU5UX1NIQURFUiA9IDM1NjMyO1xudmFyIGlkZW50aXR5TWF0cml4ID0gWzEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDFdO1xuXG52YXIgaGVhZGVyID0gJ3ByZWNpc2lvbiBtZWRpdW1wIGZsb2F0O1xcbic7XG5cbnZhciBUWVBFUyA9IHtcbiAgICB1bmRlZmluZWQ6ICdmbG9hdCAnLFxuICAgIDE6ICdmbG9hdCAnLFxuICAgIDI6ICd2ZWMyICcsXG4gICAgMzogJ3ZlYzMgJyxcbiAgICA0OiAndmVjNCAnLFxuICAgIDE2OiAnbWF0NCAnXG59O1xuXG52YXIgaW5wdXRUeXBlcyA9IHtcbiAgICB1X2Jhc2VDb2xvcjogJ3ZlYzQnLFxuICAgIHVfbm9ybWFsczogJ3ZlcnQnLFxuICAgIHVfZ2xvc3NpbmVzczogJ3ZlYzQnLFxuICAgIHVfcG9zaXRpb25PZmZzZXQ6ICd2ZXJ0J1xufTtcblxudmFyIG1hc2tzID0gIHtcbiAgICB2ZXJ0OiAxLFxuICAgIHZlYzM6IDIsXG4gICAgdmVjNDogNCxcbiAgICBmbG9hdDogOFxufTtcblxuLyoqXG4gKiBVbmlmb3JtIGtleXMgYW5kIHZhbHVlc1xuICovXG52YXIgdW5pZm9ybXMgPSBrZXlWYWx1ZVRvQXJyYXlzKHtcbiAgICB1X3BlcnNwZWN0aXZlOiBpZGVudGl0eU1hdHJpeCxcbiAgICB1X3ZpZXc6IGlkZW50aXR5TWF0cml4LFxuICAgIHVfcmVzb2x1dGlvbjogWzAsIDAsIDBdLFxuICAgIHVfdHJhbnNmb3JtOiBpZGVudGl0eU1hdHJpeCxcbiAgICB1X3NpemU6IFsxLCAxLCAxXSxcbiAgICB1X3RpbWU6IDAsXG4gICAgdV9vcGFjaXR5OiAxLFxuICAgIHVfbWV0YWxuZXNzOiAwLFxuICAgIHVfZ2xvc3NpbmVzczogWzAsIDAsIDAsIDBdLFxuICAgIHVfYmFzZUNvbG9yOiBbMSwgMSwgMSwgMV0sXG4gICAgdV9ub3JtYWxzOiBbMSwgMSwgMV0sXG4gICAgdV9wb3NpdGlvbk9mZnNldDogWzAsIDAsIDBdLFxuICAgIHVfbGlnaHRQb3NpdGlvbjogaWRlbnRpdHlNYXRyaXgsXG4gICAgdV9saWdodENvbG9yOiBpZGVudGl0eU1hdHJpeCxcbiAgICB1X2FtYmllbnRMaWdodDogWzAsIDAsIDBdLFxuICAgIHVfZmxhdFNoYWRpbmc6IDAsXG4gICAgdV9udW1MaWdodHM6IDBcbn0pO1xuXG4vKipcbiAqIEF0dHJpYnV0ZXMga2V5cyBhbmQgdmFsdWVzXG4gKi9cbnZhciBhdHRyaWJ1dGVzID0ga2V5VmFsdWVUb0FycmF5cyh7XG4gICAgYV9wb3M6IFswLCAwLCAwXSxcbiAgICBhX3RleENvb3JkOiBbMCwgMF0sXG4gICAgYV9ub3JtYWxzOiBbMCwgMCwgMF1cbn0pO1xuXG4vKipcbiAqIFZhcnlpbmdzIGtleXMgYW5kIHZhbHVlc1xuICovXG52YXIgdmFyeWluZ3MgPSBrZXlWYWx1ZVRvQXJyYXlzKHtcbiAgICB2X3RleHR1cmVDb29yZGluYXRlOiBbMCwgMF0sXG4gICAgdl9ub3JtYWw6IFswLCAwLCAwXSxcbiAgICB2X3Bvc2l0aW9uOiBbMCwgMCwgMF0sXG4gICAgdl9leWVWZWN0b3I6IFswLCAwLCAwXVxufSk7XG5cbi8qKlxuICogQSBjbGFzcyB0aGF0IGhhbmRsZXMgaW50ZXJhY3Rpb25zIHdpdGggdGhlIFdlYkdMIHNoYWRlciBwcm9ncmFtXG4gKiB1c2VkIGJ5IGEgc3BlY2lmaWMgY29udGV4dC4gIEl0IG1hbmFnZXMgY3JlYXRpb24gb2YgdGhlIHNoYWRlciBwcm9ncmFtXG4gKiBhbmQgdGhlIGF0dGFjaGVkIHZlcnRleCBhbmQgZnJhZ21lbnQgc2hhZGVycy4gIEl0IGlzIGFsc28gaW4gY2hhcmdlIG9mXG4gKiBwYXNzaW5nIGFsbCB1bmlmb3JtcyB0byB0aGUgV2ViR0xDb250ZXh0LlxuICpcbiAqIEBjbGFzcyBQcm9ncmFtXG4gKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge1dlYkdMX0NvbnRleHR9IGdsIENvbnRleHQgdG8gYmUgdXNlZCB0byBjcmVhdGUgdGhlIHNoYWRlciBwcm9ncmFtXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBQcm9ncmFtIG9wdGlvbnNcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5mdW5jdGlvbiBQcm9ncmFtKGdsLCBvcHRpb25zKSB7XG4gICAgdGhpcy5nbCA9IGdsO1xuICAgIHRoaXMudGV4dHVyZVNsb3RzID0gMTtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgdGhpcy5yZWdpc3RlcmVkTWF0ZXJpYWxzID0ge307XG4gICAgdGhpcy5mbGFnZ2VkVW5pZm9ybXMgPSBbXTtcbiAgICB0aGlzLmNhY2hlZFVuaWZvcm1zICA9IHt9O1xuICAgIHRoaXMudW5pZm9ybVR5cGVzID0gW107XG5cbiAgICB0aGlzLmRlZmluaXRpb25WZWM0ID0gW107XG4gICAgdGhpcy5kZWZpbml0aW9uVmVjMyA9IFtdO1xuICAgIHRoaXMuZGVmaW5pdGlvbkZsb2F0ID0gW107XG4gICAgdGhpcy5hcHBsaWNhdGlvblZlYzMgPSBbXTtcbiAgICB0aGlzLmFwcGxpY2F0aW9uVmVjNCA9IFtdO1xuICAgIHRoaXMuYXBwbGljYXRpb25GbG9hdCA9IFtdO1xuICAgIHRoaXMuYXBwbGljYXRpb25WZXJ0ID0gW107XG4gICAgdGhpcy5kZWZpbml0aW9uVmVydCA9IFtdO1xuXG4gICAgdGhpcy5yZXNldFByb2dyYW0oKTtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmVzIHdoZXRoZXIgYSBtYXRlcmlhbCBoYXMgYWxyZWFkeSBiZWVuIHJlZ2lzdGVyZWQgdG9cbiAqIHRoZSBzaGFkZXIgcHJvZ3JhbS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgTmFtZSBvZiB0YXJnZXQgaW5wdXQgb2YgbWF0ZXJpYWwuXG4gKiBAcGFyYW0ge09iamVjdH0gbWF0ZXJpYWwgQ29tcGlsZWQgbWF0ZXJpYWwgb2JqZWN0IGJlaW5nIHZlcmlmaWVkLlxuICpcbiAqIEByZXR1cm4ge1Byb2dyYW19IHRoaXMgQ3VycmVudCBwcm9ncmFtLlxuICovXG5Qcm9ncmFtLnByb3RvdHlwZS5yZWdpc3Rlck1hdGVyaWFsID0gZnVuY3Rpb24gcmVnaXN0ZXJNYXRlcmlhbChuYW1lLCBtYXRlcmlhbCkge1xuICAgIHZhciBjb21waWxlZCA9IG1hdGVyaWFsO1xuICAgIHZhciB0eXBlID0gaW5wdXRUeXBlc1tuYW1lXTtcbiAgICB2YXIgbWFzayA9IG1hc2tzW3R5cGVdO1xuXG4gICAgaWYgKCh0aGlzLnJlZ2lzdGVyZWRNYXRlcmlhbHNbbWF0ZXJpYWwuX2lkXSAmIG1hc2spID09PSBtYXNrKSByZXR1cm4gdGhpcztcblxuICAgIHZhciBrO1xuXG4gICAgZm9yIChrIGluIGNvbXBpbGVkLnVuaWZvcm1zKSB7XG4gICAgICAgIGlmICh1bmlmb3Jtcy5rZXlzLmluZGV4T2YoaykgPT09IC0xKSB7XG4gICAgICAgICAgICB1bmlmb3Jtcy5rZXlzLnB1c2goayk7XG4gICAgICAgICAgICB1bmlmb3Jtcy52YWx1ZXMucHVzaChjb21waWxlZC51bmlmb3Jtc1trXSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKGsgaW4gY29tcGlsZWQudmFyeWluZ3MpIHtcbiAgICAgICAgaWYgKHZhcnlpbmdzLmtleXMuaW5kZXhPZihrKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIHZhcnlpbmdzLmtleXMucHVzaChrKTtcbiAgICAgICAgICAgIHZhcnlpbmdzLnZhbHVlcy5wdXNoKGNvbXBpbGVkLnZhcnlpbmdzW2tdKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZvciAoayBpbiBjb21waWxlZC5hdHRyaWJ1dGVzKSB7XG4gICAgICAgIGlmIChhdHRyaWJ1dGVzLmtleXMuaW5kZXhPZihrKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIGF0dHJpYnV0ZXMua2V5cy5wdXNoKGspO1xuICAgICAgICAgICAgYXR0cmlidXRlcy52YWx1ZXMucHVzaChjb21waWxlZC5hdHRyaWJ1dGVzW2tdKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMucmVnaXN0ZXJlZE1hdGVyaWFsc1ttYXRlcmlhbC5faWRdIHw9IG1hc2s7XG5cbiAgICBpZiAodHlwZSA9PT0gJ2Zsb2F0Jykge1xuICAgICAgICB0aGlzLmRlZmluaXRpb25GbG9hdC5wdXNoKG1hdGVyaWFsLmRlZmluZXMpO1xuICAgICAgICB0aGlzLmRlZmluaXRpb25GbG9hdC5wdXNoKCdmbG9hdCBmYV8nICsgbWF0ZXJpYWwuX2lkICsgJygpIHtcXG4gJyAgKyBjb21waWxlZC5nbHNsICsgJyBcXG59Jyk7XG4gICAgICAgIHRoaXMuYXBwbGljYXRpb25GbG9hdC5wdXNoKCdpZiAoaW50KGFicyhJRCkpID09ICcgKyBtYXRlcmlhbC5faWQgKyAnKSByZXR1cm4gZmFfJyArIG1hdGVyaWFsLl9pZCAgKyAnKCk7Jyk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGUgPT09ICd2ZWMzJykge1xuICAgICAgICB0aGlzLmRlZmluaXRpb25WZWMzLnB1c2gobWF0ZXJpYWwuZGVmaW5lcyk7XG4gICAgICAgIHRoaXMuZGVmaW5pdGlvblZlYzMucHVzaCgndmVjMyBmYV8nICsgbWF0ZXJpYWwuX2lkICsgJygpIHtcXG4gJyAgKyBjb21waWxlZC5nbHNsICsgJyBcXG59Jyk7XG4gICAgICAgIHRoaXMuYXBwbGljYXRpb25WZWMzLnB1c2goJ2lmIChpbnQoYWJzKElELngpKSA9PSAnICsgbWF0ZXJpYWwuX2lkICsgJykgcmV0dXJuIGZhXycgKyBtYXRlcmlhbC5faWQgKyAnKCk7Jyk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGUgPT09ICd2ZWM0Jykge1xuICAgICAgICB0aGlzLmRlZmluaXRpb25WZWM0LnB1c2gobWF0ZXJpYWwuZGVmaW5lcyk7XG4gICAgICAgIHRoaXMuZGVmaW5pdGlvblZlYzQucHVzaCgndmVjNCBmYV8nICsgbWF0ZXJpYWwuX2lkICsgJygpIHtcXG4gJyAgKyBjb21waWxlZC5nbHNsICsgJyBcXG59Jyk7XG4gICAgICAgIHRoaXMuYXBwbGljYXRpb25WZWM0LnB1c2goJ2lmIChpbnQoYWJzKElELngpKSA9PSAnICsgbWF0ZXJpYWwuX2lkICsgJykgcmV0dXJuIGZhXycgKyBtYXRlcmlhbC5faWQgKyAnKCk7Jyk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGUgPT09ICd2ZXJ0Jykge1xuICAgICAgICB0aGlzLmRlZmluaXRpb25WZXJ0LnB1c2gobWF0ZXJpYWwuZGVmaW5lcyk7XG4gICAgICAgIHRoaXMuZGVmaW5pdGlvblZlcnQucHVzaCgndmVjMyBmYV8nICsgbWF0ZXJpYWwuX2lkICsgJygpIHtcXG4gJyAgKyBjb21waWxlZC5nbHNsICsgJyBcXG59Jyk7XG4gICAgICAgIHRoaXMuYXBwbGljYXRpb25WZXJ0LnB1c2goJ2lmIChpbnQoYWJzKElELngpKSA9PSAnICsgbWF0ZXJpYWwuX2lkICsgJykgcmV0dXJuIGZhXycgKyBtYXRlcmlhbC5faWQgKyAnKCk7Jyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucmVzZXRQcm9ncmFtKCk7XG59O1xuXG4vKipcbiAqIENsZWFycyBhbGwgY2FjaGVkIHVuaWZvcm1zIGFuZCBhdHRyaWJ1dGUgbG9jYXRpb25zLiAgQXNzZW1ibGVzXG4gKiBuZXcgZnJhZ21lbnQgYW5kIHZlcnRleCBzaGFkZXJzIGFuZCBiYXNlZCBvbiBtYXRlcmlhbCBmcm9tXG4gKiBjdXJyZW50bHkgcmVnaXN0ZXJlZCBtYXRlcmlhbHMuICBBdHRhY2hlcyBzYWlkIHNoYWRlcnMgdG8gbmV3XG4gKiBzaGFkZXIgcHJvZ3JhbSBhbmQgdXBvbiBzdWNjZXNzIGxpbmtzIHByb2dyYW0gdG8gdGhlIFdlYkdMXG4gKiBjb250ZXh0LlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtQcm9ncmFtfSBDdXJyZW50IHByb2dyYW0uXG4gKi9cblByb2dyYW0ucHJvdG90eXBlLnJlc2V0UHJvZ3JhbSA9IGZ1bmN0aW9uIHJlc2V0UHJvZ3JhbSgpIHtcbiAgICB2YXIgdmVydGV4SGVhZGVyID0gW2hlYWRlcl07XG4gICAgdmFyIGZyYWdtZW50SGVhZGVyID0gW2hlYWRlcl07XG5cbiAgICB2YXIgZnJhZ21lbnRTb3VyY2U7XG4gICAgdmFyIHZlcnRleFNvdXJjZTtcbiAgICB2YXIgcHJvZ3JhbTtcbiAgICB2YXIgbmFtZTtcbiAgICB2YXIgdmFsdWU7XG4gICAgdmFyIGk7XG5cbiAgICB0aGlzLnVuaWZvcm1Mb2NhdGlvbnMgICA9IFtdO1xuICAgIHRoaXMuYXR0cmlidXRlTG9jYXRpb25zID0ge307XG5cbiAgICB0aGlzLnVuaWZvcm1UeXBlcyA9IHt9O1xuXG4gICAgdGhpcy5hdHRyaWJ1dGVOYW1lcyA9IGNsb25lKGF0dHJpYnV0ZXMua2V5cyk7XG4gICAgdGhpcy5hdHRyaWJ1dGVWYWx1ZXMgPSBjbG9uZShhdHRyaWJ1dGVzLnZhbHVlcyk7XG5cbiAgICB0aGlzLnZhcnlpbmdOYW1lcyA9IGNsb25lKHZhcnlpbmdzLmtleXMpO1xuICAgIHRoaXMudmFyeWluZ1ZhbHVlcyA9IGNsb25lKHZhcnlpbmdzLnZhbHVlcyk7XG5cbiAgICB0aGlzLnVuaWZvcm1OYW1lcyA9IGNsb25lKHVuaWZvcm1zLmtleXMpO1xuICAgIHRoaXMudW5pZm9ybVZhbHVlcyA9IGNsb25lKHVuaWZvcm1zLnZhbHVlcyk7XG5cbiAgICB0aGlzLmZsYWdnZWRVbmlmb3JtcyA9IFtdO1xuICAgIHRoaXMuY2FjaGVkVW5pZm9ybXMgPSB7fTtcblxuICAgIGZyYWdtZW50SGVhZGVyLnB1c2goJ3VuaWZvcm0gc2FtcGxlcjJEIHVfdGV4dHVyZXNbN107XFxuJyk7XG5cbiAgICBpZiAodGhpcy5hcHBsaWNhdGlvblZlcnQubGVuZ3RoKSB7XG4gICAgICAgIHZlcnRleEhlYWRlci5wdXNoKCd1bmlmb3JtIHNhbXBsZXIyRCB1X3RleHR1cmVzWzddO1xcbicpO1xuICAgIH1cblxuICAgIGZvcihpID0gMDsgaSA8IHRoaXMudW5pZm9ybU5hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG5hbWUgPSB0aGlzLnVuaWZvcm1OYW1lc1tpXTtcbiAgICAgICAgdmFsdWUgPSB0aGlzLnVuaWZvcm1WYWx1ZXNbaV07XG4gICAgICAgIHZlcnRleEhlYWRlci5wdXNoKCd1bmlmb3JtICcgKyBUWVBFU1t2YWx1ZS5sZW5ndGhdICsgbmFtZSArICc7XFxuJyk7XG4gICAgICAgIGZyYWdtZW50SGVhZGVyLnB1c2goJ3VuaWZvcm0gJyArIFRZUEVTW3ZhbHVlLmxlbmd0aF0gKyBuYW1lICsgJztcXG4nKTtcbiAgICB9XG5cbiAgICBmb3IoaSA9IDA7IGkgPCB0aGlzLmF0dHJpYnV0ZU5hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG5hbWUgPSB0aGlzLmF0dHJpYnV0ZU5hbWVzW2ldO1xuICAgICAgICB2YWx1ZSA9IHRoaXMuYXR0cmlidXRlVmFsdWVzW2ldO1xuICAgICAgICB2ZXJ0ZXhIZWFkZXIucHVzaCgnYXR0cmlidXRlICcgKyBUWVBFU1t2YWx1ZS5sZW5ndGhdICsgbmFtZSArICc7XFxuJyk7XG4gICAgfVxuXG4gICAgZm9yKGkgPSAwOyBpIDwgdGhpcy52YXJ5aW5nTmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbmFtZSA9IHRoaXMudmFyeWluZ05hbWVzW2ldO1xuICAgICAgICB2YWx1ZSA9IHRoaXMudmFyeWluZ1ZhbHVlc1tpXTtcbiAgICAgICAgdmVydGV4SGVhZGVyLnB1c2goJ3ZhcnlpbmcgJyArIFRZUEVTW3ZhbHVlLmxlbmd0aF0gICsgbmFtZSArICc7XFxuJyk7XG4gICAgICAgIGZyYWdtZW50SGVhZGVyLnB1c2goJ3ZhcnlpbmcgJyArIFRZUEVTW3ZhbHVlLmxlbmd0aF0gKyBuYW1lICsgJztcXG4nKTtcbiAgICB9XG5cbiAgICB2ZXJ0ZXhTb3VyY2UgPSB2ZXJ0ZXhIZWFkZXIuam9pbignJykgKyB2ZXJ0ZXhXcmFwcGVyXG4gICAgICAgIC5yZXBsYWNlKCcjdmVydF9kZWZpbml0aW9ucycsIHRoaXMuZGVmaW5pdGlvblZlcnQuam9pbignXFxuJykpXG4gICAgICAgIC5yZXBsYWNlKCcjdmVydF9hcHBsaWNhdGlvbnMnLCB0aGlzLmFwcGxpY2F0aW9uVmVydC5qb2luKCdcXG4nKSk7XG5cbiAgICBmcmFnbWVudFNvdXJjZSA9IGZyYWdtZW50SGVhZGVyLmpvaW4oJycpICsgZnJhZ21lbnRXcmFwcGVyXG4gICAgICAgIC5yZXBsYWNlKCcjdmVjM19kZWZpbml0aW9ucycsIHRoaXMuZGVmaW5pdGlvblZlYzMuam9pbignXFxuJykpXG4gICAgICAgIC5yZXBsYWNlKCcjdmVjM19hcHBsaWNhdGlvbnMnLCB0aGlzLmFwcGxpY2F0aW9uVmVjMy5qb2luKCdcXG4nKSlcbiAgICAgICAgLnJlcGxhY2UoJyN2ZWM0X2RlZmluaXRpb25zJywgdGhpcy5kZWZpbml0aW9uVmVjNC5qb2luKCdcXG4nKSlcbiAgICAgICAgLnJlcGxhY2UoJyN2ZWM0X2FwcGxpY2F0aW9ucycsIHRoaXMuYXBwbGljYXRpb25WZWM0LmpvaW4oJ1xcbicpKVxuICAgICAgICAucmVwbGFjZSgnI2Zsb2F0X2RlZmluaXRpb25zJywgdGhpcy5kZWZpbml0aW9uRmxvYXQuam9pbignXFxuJykpXG4gICAgICAgIC5yZXBsYWNlKCcjZmxvYXRfYXBwbGljYXRpb25zJywgdGhpcy5hcHBsaWNhdGlvbkZsb2F0LmpvaW4oJ1xcbicpKTtcblxuICAgIHByb2dyYW0gPSB0aGlzLmdsLmNyZWF0ZVByb2dyYW0oKTtcblxuICAgIHRoaXMuZ2wuYXR0YWNoU2hhZGVyKFxuICAgICAgICBwcm9ncmFtLFxuICAgICAgICB0aGlzLmNvbXBpbGVTaGFkZXIodGhpcy5nbC5jcmVhdGVTaGFkZXIoVkVSVEVYX1NIQURFUiksIHZlcnRleFNvdXJjZSlcbiAgICApO1xuXG4gICAgdGhpcy5nbC5hdHRhY2hTaGFkZXIoXG4gICAgICAgIHByb2dyYW0sXG4gICAgICAgIHRoaXMuY29tcGlsZVNoYWRlcih0aGlzLmdsLmNyZWF0ZVNoYWRlcihGUkFHTUVOVF9TSEFERVIpLCBmcmFnbWVudFNvdXJjZSlcbiAgICApO1xuXG4gICAgdGhpcy5nbC5saW5rUHJvZ3JhbShwcm9ncmFtKTtcblxuICAgIGlmICghIHRoaXMuZ2wuZ2V0UHJvZ3JhbVBhcmFtZXRlcihwcm9ncmFtLCB0aGlzLmdsLkxJTktfU1RBVFVTKSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdsaW5rIGVycm9yOiAnICsgdGhpcy5nbC5nZXRQcm9ncmFtSW5mb0xvZyhwcm9ncmFtKSk7XG4gICAgICAgIHRoaXMucHJvZ3JhbSA9IG51bGw7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aGlzLnByb2dyYW0gPSBwcm9ncmFtO1xuICAgICAgICB0aGlzLmdsLnVzZVByb2dyYW0odGhpcy5wcm9ncmFtKTtcbiAgICB9XG5cbiAgICB0aGlzLnNldFVuaWZvcm1zKHRoaXMudW5pZm9ybU5hbWVzLCB0aGlzLnVuaWZvcm1WYWx1ZXMpO1xuXG4gICAgdmFyIHRleHR1cmVMb2NhdGlvbiA9IHRoaXMuZ2wuZ2V0VW5pZm9ybUxvY2F0aW9uKHRoaXMucHJvZ3JhbSwgJ3VfdGV4dHVyZXNbMF0nKTtcbiAgICB0aGlzLmdsLnVuaWZvcm0xaXYodGV4dHVyZUxvY2F0aW9uLCBbMCwgMSwgMiwgMywgNCwgNSwgNl0pO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENvbXBhcmVzIHRoZSB2YWx1ZSBvZiB0aGUgaW5wdXQgdW5pZm9ybSB2YWx1ZSBhZ2FpbnN0XG4gKiB0aGUgY2FjaGVkIHZhbHVlIHN0b3JlZCBvbiB0aGUgUHJvZ3JhbSBjbGFzcy4gIFVwZGF0ZXMgYW5kXG4gKiBjcmVhdGVzIG5ldyBlbnRyaWVzIGluIHRoZSBjYWNoZSB3aGVuIG5lY2Vzc2FyeS5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcGFyYW0ge1N0cmluZ30gdGFyZ2V0TmFtZSBLZXkgb2YgdW5pZm9ybSBzcGVjIGJlaW5nIGV2YWx1YXRlZC5cbiAqIEBwYXJhbSB7TnVtYmVyfEFycmF5fSB2YWx1ZSBWYWx1ZSBvZiB1bmlmb3JtIHNwZWMgYmVpbmcgZXZhbHVhdGVkLlxuICpcbiAqIEByZXR1cm4ge0Jvb2xlYW59IGJvb2xlYW4gSW5kaWNhdGluZyB3aGV0aGVyIHRoZSB1bmlmb3JtIGJlaW5nIHNldCBpcyBjYWNoZWQuXG4gKi9cblByb2dyYW0ucHJvdG90eXBlLnVuaWZvcm1Jc0NhY2hlZCA9IGZ1bmN0aW9uKHRhcmdldE5hbWUsIHZhbHVlKSB7XG4gICAgaWYodGhpcy5jYWNoZWRVbmlmb3Jtc1t0YXJnZXROYW1lXSA9PSBudWxsKSB7XG4gICAgICAgIGlmICh2YWx1ZS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMuY2FjaGVkVW5pZm9ybXNbdGFyZ2V0TmFtZV0gPSBuZXcgRmxvYXQzMkFycmF5KHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuY2FjaGVkVW5pZm9ybXNbdGFyZ2V0TmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGVsc2UgaWYgKHZhbHVlLmxlbmd0aCkge1xuICAgICAgICB2YXIgaSA9IHZhbHVlLmxlbmd0aDtcbiAgICAgICAgd2hpbGUgKGktLSkge1xuICAgICAgICAgICAgaWYodmFsdWVbaV0gIT09IHRoaXMuY2FjaGVkVW5pZm9ybXNbdGFyZ2V0TmFtZV1baV0pIHtcbiAgICAgICAgICAgICAgICBpID0gdmFsdWUubGVuZ3RoO1xuICAgICAgICAgICAgICAgIHdoaWxlKGktLSkgdGhpcy5jYWNoZWRVbmlmb3Jtc1t0YXJnZXROYW1lXVtpXSA9IHZhbHVlW2ldO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGVsc2UgaWYgKHRoaXMuY2FjaGVkVW5pZm9ybXNbdGFyZ2V0TmFtZV0gIT09IHZhbHVlKSB7XG4gICAgICAgIHRoaXMuY2FjaGVkVW5pZm9ybXNbdGFyZ2V0TmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIGFsbCBwYXNzaW5nIG9mIHVuaWZvcm1zIHRvIFdlYkdMIGRyYXdpbmcgY29udGV4dC4gIFRoaXNcbiAqIGZ1bmN0aW9uIHdpbGwgZmluZCB0aGUgdW5pZm9ybSBsb2NhdGlvbiBhbmQgdGhlbiwgYmFzZWQgb25cbiAqIGEgdHlwZSBpbmZlcnJlZCBmcm9tIHRoZSBqYXZhc2NyaXB0IHZhbHVlIG9mIHRoZSB1bmlmb3JtLCBpdCB3aWxsIGNhbGxcbiAqIHRoZSBhcHByb3ByaWF0ZSBmdW5jdGlvbiB0byBwYXNzIHRoZSB1bmlmb3JtIHRvIFdlYkdMLiAgRmluYWxseSxcbiAqIHNldFVuaWZvcm1zIHdpbGwgaXRlcmF0ZSB0aHJvdWdoIHRoZSBwYXNzZWQgaW4gc2hhZGVyQ2h1bmtzIChpZiBhbnkpXG4gKiBhbmQgc2V0IHRoZSBhcHByb3ByaWF0ZSB1bmlmb3JtcyB0byBzcGVjaWZ5IHdoaWNoIGNodW5rcyB0byB1c2UuXG4gKlxuICogQG1ldGhvZFxuICogQHBhcmFtIHtBcnJheX0gdW5pZm9ybU5hbWVzIEFycmF5IGNvbnRhaW5pbmcgdGhlIGtleXMgb2YgYWxsIHVuaWZvcm1zIHRvIGJlIHNldC5cbiAqIEBwYXJhbSB7QXJyYXl9IHVuaWZvcm1WYWx1ZSBBcnJheSBjb250YWluaW5nIHRoZSB2YWx1ZXMgb2YgYWxsIHVuaWZvcm1zIHRvIGJlIHNldC5cbiAqXG4gKiBAcmV0dXJuIHtQcm9ncmFtfSBDdXJyZW50IHByb2dyYW0uXG4gKi9cblByb2dyYW0ucHJvdG90eXBlLnNldFVuaWZvcm1zID0gZnVuY3Rpb24gKHVuaWZvcm1OYW1lcywgdW5pZm9ybVZhbHVlKSB7XG4gICAgdmFyIGdsID0gdGhpcy5nbDtcbiAgICB2YXIgbG9jYXRpb247XG4gICAgdmFyIHZhbHVlO1xuICAgIHZhciBuYW1lO1xuICAgIHZhciBsZW47XG4gICAgdmFyIGk7XG5cbiAgICBpZiAoIXRoaXMucHJvZ3JhbSkgcmV0dXJuIHRoaXM7XG5cbiAgICBsZW4gPSB1bmlmb3JtTmFtZXMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBuYW1lID0gdW5pZm9ybU5hbWVzW2ldO1xuICAgICAgICB2YWx1ZSA9IHVuaWZvcm1WYWx1ZVtpXTtcblxuICAgICAgICAvLyBSZXRyZWl2ZSB0aGUgY2FjaGVkIGxvY2F0aW9uIG9mIHRoZSB1bmlmb3JtLFxuICAgICAgICAvLyByZXF1ZXN0aW5nIGEgbmV3IGxvY2F0aW9uIGZyb20gdGhlIFdlYkdMIGNvbnRleHRcbiAgICAgICAgLy8gaWYgaXQgZG9lcyBub3QgeWV0IGV4aXN0LlxuXG4gICAgICAgIGxvY2F0aW9uID0gdGhpcy51bmlmb3JtTG9jYXRpb25zW25hbWVdIHx8IGdsLmdldFVuaWZvcm1Mb2NhdGlvbih0aGlzLnByb2dyYW0sIG5hbWUpO1xuICAgICAgICBpZiAoIWxvY2F0aW9uKSBjb250aW51ZTtcblxuICAgICAgICB0aGlzLnVuaWZvcm1Mb2NhdGlvbnNbbmFtZV0gPSBsb2NhdGlvbjtcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgdmFsdWUgaXMgYWxyZWFkeSBzZXQgZm9yIHRoZVxuICAgICAgICAvLyBnaXZlbiB1bmlmb3JtLlxuXG4gICAgICAgIGlmICh0aGlzLnVuaWZvcm1Jc0NhY2hlZChuYW1lLCB2YWx1ZSkpIGNvbnRpbnVlO1xuXG4gICAgICAgIC8vIERldGVybWluZSB0aGUgY29ycmVjdCBmdW5jdGlvbiBhbmQgcGFzcyB0aGUgdW5pZm9ybVxuICAgICAgICAvLyB2YWx1ZSB0byBXZWJHTC5cblxuICAgICAgICBpZiAoIXRoaXMudW5pZm9ybVR5cGVzW25hbWVdKSB7XG4gICAgICAgICAgICB0aGlzLnVuaWZvcm1UeXBlc1tuYW1lXSA9IHRoaXMuZ2V0VW5pZm9ybVR5cGVGcm9tVmFsdWUodmFsdWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2FsbCB1bmlmb3JtIHNldHRlciBmdW5jdGlvbiBvbiBXZWJHTCBjb250ZXh0IHdpdGggY29ycmVjdCB2YWx1ZVxuXG4gICAgICAgIHN3aXRjaCAodGhpcy51bmlmb3JtVHlwZXNbbmFtZV0pIHtcbiAgICAgICAgICAgIGNhc2UgJ3VuaWZvcm00ZnYnOiAgZ2wudW5pZm9ybTRmdihsb2NhdGlvbiwgdmFsdWUpOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3VuaWZvcm0zZnYnOiAgZ2wudW5pZm9ybTNmdihsb2NhdGlvbiwgdmFsdWUpOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3VuaWZvcm0yZnYnOiAgZ2wudW5pZm9ybTJmdihsb2NhdGlvbiwgdmFsdWUpOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3VuaWZvcm0xZnYnOiAgZ2wudW5pZm9ybTFmdihsb2NhdGlvbiwgdmFsdWUpOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3VuaWZvcm0xZicgOiAgZ2wudW5pZm9ybTFmKGxvY2F0aW9uLCB2YWx1ZSk7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAndW5pZm9ybU1hdHJpeDNmdic6IGdsLnVuaWZvcm1NYXRyaXgzZnYobG9jYXRpb24sIGZhbHNlLCB2YWx1ZSk7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAndW5pZm9ybU1hdHJpeDRmdic6IGdsLnVuaWZvcm1NYXRyaXg0ZnYobG9jYXRpb24sIGZhbHNlLCB2YWx1ZSk7IGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEluZmVycyB1bmlmb3JtIHNldHRlciBmdW5jdGlvbiB0byBiZSBjYWxsZWQgb24gdGhlIFdlYkdMIGNvbnRleHQsIGJhc2VkXG4gKiBvbiBhbiBpbnB1dCB2YWx1ZS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ8QXJyYXl9IHZhbHVlIFZhbHVlIGZyb20gd2hpY2ggdW5pZm9ybSB0eXBlIGlzIGluZmVycmVkLlxuICpcbiAqIEByZXR1cm4ge1N0cmluZ30gTmFtZSBvZiB1bmlmb3JtIGZ1bmN0aW9uIGZvciBnaXZlbiB2YWx1ZS5cbiAqL1xuUHJvZ3JhbS5wcm90b3R5cGUuZ2V0VW5pZm9ybVR5cGVGcm9tVmFsdWUgPSBmdW5jdGlvbiBnZXRVbmlmb3JtVHlwZUZyb21WYWx1ZSh2YWx1ZSkge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSB8fCB2YWx1ZSBpbnN0YW5jZW9mIEZsb2F0MzJBcnJheSkge1xuICAgICAgICBzd2l0Y2ggKHZhbHVlLmxlbmd0aCkge1xuICAgICAgICAgICAgY2FzZSAxOiAgcmV0dXJuICd1bmlmb3JtMWZ2JztcbiAgICAgICAgICAgIGNhc2UgMjogIHJldHVybiAndW5pZm9ybTJmdic7XG4gICAgICAgICAgICBjYXNlIDM6ICByZXR1cm4gJ3VuaWZvcm0zZnYnO1xuICAgICAgICAgICAgY2FzZSA0OiAgcmV0dXJuICd1bmlmb3JtNGZ2JztcbiAgICAgICAgICAgIGNhc2UgOTogIHJldHVybiAndW5pZm9ybU1hdHJpeDNmdic7XG4gICAgICAgICAgICBjYXNlIDE2OiByZXR1cm4gJ3VuaWZvcm1NYXRyaXg0ZnYnO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKCFpc05hTihwYXJzZUZsb2F0KHZhbHVlKSkgJiYgaXNGaW5pdGUodmFsdWUpKSB7XG4gICAgICAgIHJldHVybiAndW5pZm9ybTFmJztcbiAgICB9XG5cbiAgICB0aHJvdyAnY2FudCBsb2FkIHVuaWZvcm0gXCInICsgbmFtZSArICdcIiB3aXRoIHZhbHVlOicgKyBKU09OLnN0cmluZ2lmeSh2YWx1ZSk7XG59O1xuXG4vKipcbiAqIEFkZHMgc2hhZGVyIHNvdXJjZSB0byBzaGFkZXIgYW5kIGNvbXBpbGVzIHRoZSBpbnB1dCBzaGFkZXIuICBDaGVja3NcbiAqIGNvbXBpbGUgc3RhdHVzIGFuZCBsb2dzIGVycm9yIGlmIG5lY2Vzc2FyeS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHNoYWRlciBQcm9ncmFtIHRvIGJlIGNvbXBpbGVkLlxuICogQHBhcmFtIHtTdHJpbmd9IHNvdXJjZSBTb3VyY2UgdG8gYmUgdXNlZCBpbiB0aGUgc2hhZGVyLlxuICpcbiAqIEByZXR1cm4ge09iamVjdH0gQ29tcGlsZWQgc2hhZGVyLlxuICovXG5Qcm9ncmFtLnByb3RvdHlwZS5jb21waWxlU2hhZGVyID0gZnVuY3Rpb24gY29tcGlsZVNoYWRlcihzaGFkZXIsIHNvdXJjZSkge1xuICAgIHZhciBpID0gMTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuZGVidWcpIHtcbiAgICAgICAgdGhpcy5nbC5jb21waWxlU2hhZGVyID0gRGVidWcuY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICB0aGlzLmdsLnNoYWRlclNvdXJjZShzaGFkZXIsIHNvdXJjZSk7XG4gICAgdGhpcy5nbC5jb21waWxlU2hhZGVyKHNoYWRlcik7XG4gICAgaWYgKCF0aGlzLmdsLmdldFNoYWRlclBhcmFtZXRlcihzaGFkZXIsIHRoaXMuZ2wuQ09NUElMRV9TVEFUVVMpKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ2NvbXBpbGUgZXJyb3I6ICcgKyB0aGlzLmdsLmdldFNoYWRlckluZm9Mb2coc2hhZGVyKSk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJzE6ICcgKyBzb3VyY2UucmVwbGFjZSgvXFxuL2csIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAnXFxuJyArIChpKz0xKSArICc6ICc7XG4gICAgICAgIH0pKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc2hhZGVyO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQcm9ncmFtO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFRleHR1cmUgaXMgYSBwcml2YXRlIGNsYXNzIHRoYXQgc3RvcmVzIGltYWdlIGRhdGFcbiAqIHRvIGJlIGFjY2Vzc2VkIGZyb20gYSBzaGFkZXIgb3IgdXNlZCBhcyBhIHJlbmRlciB0YXJnZXQuXG4gKlxuICogQGNsYXNzIFRleHR1cmVcbiAqIEBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7R0x9IGdsIEdMXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBPcHRpb25zXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuZnVuY3Rpb24gVGV4dHVyZShnbCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHRoaXMuaWQgPSBnbC5jcmVhdGVUZXh0dXJlKCk7XG4gICAgdGhpcy53aWR0aCA9IG9wdGlvbnMud2lkdGggfHwgMDtcbiAgICB0aGlzLmhlaWdodCA9IG9wdGlvbnMuaGVpZ2h0IHx8IDA7XG4gICAgdGhpcy5taXBtYXAgPSBvcHRpb25zLm1pcG1hcDtcbiAgICB0aGlzLmZvcm1hdCA9IG9wdGlvbnMuZm9ybWF0IHx8ICdSR0JBJztcbiAgICB0aGlzLnR5cGUgPSBvcHRpb25zLnR5cGUgfHwgJ1VOU0lHTkVEX0JZVEUnO1xuICAgIHRoaXMuZ2wgPSBnbDtcblxuICAgIHRoaXMuYmluZCgpO1xuXG4gICAgZ2wucGl4ZWxTdG9yZWkoZ2wuVU5QQUNLX0ZMSVBfWV9XRUJHTCwgZmFsc2UpO1xuICAgIGdsLnBpeGVsU3RvcmVpKGdsLlVOUEFDS19QUkVNVUxUSVBMWV9BTFBIQV9XRUJHTCwgZmFsc2UpO1xuXG4gICAgZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01BR19GSUxURVIsIGdsW29wdGlvbnMubWFnRmlsdGVyXSB8fCBnbC5ORUFSRVNUKTtcbiAgICBnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUlOX0ZJTFRFUiwgZ2xbb3B0aW9ucy5taW5GaWx0ZXJdIHx8IGdsLk5FQVJFU1QpO1xuXG4gICAgZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX1dSQVBfUywgZ2xbb3B0aW9ucy53cmFwU10gfHwgZ2wuQ0xBTVBfVE9fRURHRSk7XG4gICAgZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX1dSQVBfVCwgZ2xbb3B0aW9ucy53cmFwVF0gfHwgZ2wuQ0xBTVBfVE9fRURHRSk7XG59XG5cbi8qKlxuICogQmluZHMgdGhpcyB0ZXh0dXJlIGFzIHRoZSBzZWxlY3RlZCB0YXJnZXQuXG4gKlxuICogQG1ldGhvZFxuICogQHJldHVybiB7T2JqZWN0fSBDdXJyZW50IHRleHR1cmUgaW5zdGFuY2UuXG4gKi9cblRleHR1cmUucHJvdG90eXBlLmJpbmQgPSBmdW5jdGlvbiBiaW5kKCkge1xuICAgIHRoaXMuZ2wuYmluZFRleHR1cmUodGhpcy5nbC5URVhUVVJFXzJELCB0aGlzLmlkKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogRXJhc2VzIHRoZSB0ZXh0dXJlIGRhdGEgaW4gdGhlIGdpdmVuIHRleHR1cmUgc2xvdC5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcmV0dXJuIHtPYmplY3R9IEN1cnJlbnQgdGV4dHVyZSBpbnN0YW5jZS5cbiAqL1xuVGV4dHVyZS5wcm90b3R5cGUudW5iaW5kID0gZnVuY3Rpb24gdW5iaW5kKCkge1xuICAgIHRoaXMuZ2wuYmluZFRleHR1cmUodGhpcy5nbC5URVhUVVJFXzJELCBudWxsKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmVwbGFjZXMgdGhlIGltYWdlIGRhdGEgaW4gdGhlIHRleHR1cmUgd2l0aCB0aGUgZ2l2ZW4gaW1hZ2UuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7SW1hZ2V9ICAgaW1nICAgICBUaGUgaW1hZ2Ugb2JqZWN0IHRvIHVwbG9hZCBwaXhlbCBkYXRhIGZyb20uXG4gKiBAcmV0dXJuIHtPYmplY3R9ICAgICAgICAgQ3VycmVudCB0ZXh0dXJlIGluc3RhbmNlLlxuICovXG5UZXh0dXJlLnByb3RvdHlwZS5zZXRJbWFnZSA9IGZ1bmN0aW9uIHNldEltYWdlKGltZykge1xuICAgIHRoaXMuZ2wudGV4SW1hZ2UyRCh0aGlzLmdsLlRFWFRVUkVfMkQsIDAsIHRoaXMuZ2xbdGhpcy5mb3JtYXRdLCB0aGlzLmdsW3RoaXMuZm9ybWF0XSwgdGhpcy5nbFt0aGlzLnR5cGVdLCBpbWcpO1xuICAgIGlmICh0aGlzLm1pcG1hcCkgdGhpcy5nbC5nZW5lcmF0ZU1pcG1hcCh0aGlzLmdsLlRFWFRVUkVfMkQpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZXBsYWNlcyB0aGUgaW1hZ2UgZGF0YSBpbiB0aGUgdGV4dHVyZSB3aXRoIGFuIGFycmF5IG9mIGFyYml0cmFyeSBkYXRhLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSAgIGlucHV0ICAgQXJyYXkgdG8gYmUgc2V0IGFzIGRhdGEgdG8gdGV4dHVyZS5cbiAqIEByZXR1cm4ge09iamVjdH0gICAgICAgICBDdXJyZW50IHRleHR1cmUgaW5zdGFuY2UuXG4gKi9cblRleHR1cmUucHJvdG90eXBlLnNldEFycmF5ID0gZnVuY3Rpb24gc2V0QXJyYXkoaW5wdXQpIHtcbiAgICB0aGlzLmdsLnRleEltYWdlMkQodGhpcy5nbC5URVhUVVJFXzJELCAwLCB0aGlzLmdsW3RoaXMuZm9ybWF0XSwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQsIDAsIHRoaXMuZ2xbdGhpcy5mb3JtYXRdLCB0aGlzLmdsW3RoaXMudHlwZV0sIGlucHV0KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogRHVtcHMgdGhlIHJnYi1waXhlbCBjb250ZW50cyBvZiBhIHRleHR1cmUgaW50byBhbiBhcnJheSBmb3IgZGVidWdnaW5nIHB1cnBvc2VzXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB4ICAgICAgICB4LW9mZnNldCBiZXR3ZWVuIHRleHR1cmUgY29vcmRpbmF0ZXMgYW5kIHNuYXBzaG90XG4gKiBAcGFyYW0ge051bWJlcn0geSAgICAgICAgeS1vZmZzZXQgYmV0d2VlbiB0ZXh0dXJlIGNvb3JkaW5hdGVzIGFuZCBzbmFwc2hvdFxuICogQHBhcmFtIHtOdW1iZXJ9IHdpZHRoICAgIHgtZGVwdGggb2YgdGhlIHNuYXBzaG90XG4gKiBAcGFyYW0ge051bWJlcn0gaGVpZ2h0ICAgeS1kZXB0aCBvZiB0aGUgc25hcHNob3RcbiAqXG4gKiBAcmV0dXJuIHtBcnJheX0gICAgICAgICAgQW4gYXJyYXkgb2YgdGhlIHBpeGVscyBjb250YWluZWQgaW4gdGhlIHNuYXBzaG90LlxuICovXG5UZXh0dXJlLnByb3RvdHlwZS5yZWFkQmFjayA9IGZ1bmN0aW9uIHJlYWRCYWNrKHgsIHksIHdpZHRoLCBoZWlnaHQpIHtcbiAgICB2YXIgZ2wgPSB0aGlzLmdsO1xuICAgIHZhciBwaXhlbHM7XG4gICAgeCA9IHggfHwgMDtcbiAgICB5ID0geSB8fCAwO1xuICAgIHdpZHRoID0gd2lkdGggfHwgdGhpcy53aWR0aDtcbiAgICBoZWlnaHQgPSBoZWlnaHQgfHwgdGhpcy5oZWlnaHQ7XG4gICAgdmFyIGZiID0gZ2wuY3JlYXRlRnJhbWVidWZmZXIoKTtcbiAgICBnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIGZiKTtcbiAgICBnbC5mcmFtZWJ1ZmZlclRleHR1cmUyRChnbC5GUkFNRUJVRkZFUiwgZ2wuQ09MT1JfQVRUQUNITUVOVDAsIGdsLlRFWFRVUkVfMkQsIHRoaXMuaWQsIDApO1xuICAgIGlmIChnbC5jaGVja0ZyYW1lYnVmZmVyU3RhdHVzKGdsLkZSQU1FQlVGRkVSKSA9PT0gZ2wuRlJBTUVCVUZGRVJfQ09NUExFVEUpIHtcbiAgICAgICAgcGl4ZWxzID0gbmV3IFVpbnQ4QXJyYXkod2lkdGggKiBoZWlnaHQgKiA0KTtcbiAgICAgICAgZ2wucmVhZFBpeGVscyh4LCB5LCB3aWR0aCwgaGVpZ2h0LCBnbC5SR0JBLCBnbC5VTlNJR05FRF9CWVRFLCBwaXhlbHMpO1xuICAgIH1cbiAgICByZXR1cm4gcGl4ZWxzO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBUZXh0dXJlO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIFRleHR1cmUgPSByZXF1aXJlKCcuL1RleHR1cmUnKTtcbnZhciBjcmVhdGVDaGVja2VyYm9hcmQgPSByZXF1aXJlKCcuL2NyZWF0ZUNoZWNrZXJib2FyZCcpO1xuXG4vKipcbiAqIEhhbmRsZXMgbG9hZGluZywgYmluZGluZywgYW5kIHJlc2FtcGxpbmcgb2YgdGV4dHVyZXMgZm9yIFdlYkdMUmVuZGVyZXIuXG4gKlxuICogQGNsYXNzIFRleHR1cmVNYW5hZ2VyXG4gKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge1dlYkdMX0NvbnRleHR9IGdsIENvbnRleHQgdXNlZCB0byBjcmVhdGUgYW5kIGJpbmQgdGV4dHVyZXMuXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuZnVuY3Rpb24gVGV4dHVyZU1hbmFnZXIoZ2wpIHtcbiAgICB0aGlzLnJlZ2lzdHJ5ID0gW107XG4gICAgdGhpcy5fbmVlZHNSZXNhbXBsZSA9IFtdO1xuXG4gICAgdGhpcy5fYWN0aXZlVGV4dHVyZSA9IDA7XG4gICAgdGhpcy5fYm91bmRUZXh0dXJlID0gbnVsbDtcblxuICAgIHRoaXMuX2NoZWNrZXJib2FyZCA9IGNyZWF0ZUNoZWNrZXJib2FyZCgpO1xuXG4gICAgdGhpcy5nbCA9IGdsO1xufVxuXG4vKipcbiAqIFVwZGF0ZSBmdW5jdGlvbiB1c2VkIGJ5IFdlYkdMUmVuZGVyZXIgdG8gcXVldWUgcmVzYW1wbGVzIG9uXG4gKiByZWdpc3RlcmVkIHRleHR1cmVzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gICAgICB0aW1lICAgIFRpbWUgaW4gbWlsbGlzZWNvbmRzIGFjY29yZGluZyB0byB0aGUgY29tcG9zaXRvci5cbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gICAgICAgICAgdW5kZWZpbmVkXG4gKi9cblRleHR1cmVNYW5hZ2VyLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiB1cGRhdGUodGltZSkge1xuICAgIHZhciByZWdpc3RyeUxlbmd0aCA9IHRoaXMucmVnaXN0cnkubGVuZ3RoO1xuXG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCByZWdpc3RyeUxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciB0ZXh0dXJlID0gdGhpcy5yZWdpc3RyeVtpXTtcblxuICAgICAgICBpZiAodGV4dHVyZSAmJiB0ZXh0dXJlLmlzTG9hZGVkICYmIHRleHR1cmUucmVzYW1wbGVSYXRlKSB7XG4gICAgICAgICAgICBpZiAoIXRleHR1cmUubGFzdFJlc2FtcGxlIHx8IHRpbWUgLSB0ZXh0dXJlLmxhc3RSZXNhbXBsZSA+IHRleHR1cmUucmVzYW1wbGVSYXRlKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLl9uZWVkc1Jlc2FtcGxlW3RleHR1cmUuaWRdKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX25lZWRzUmVzYW1wbGVbdGV4dHVyZS5pZF0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB0ZXh0dXJlLmxhc3RSZXNhbXBsZSA9IHRpbWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgc3BlYyBhbmQgY3JlYXRlcyBhIHRleHR1cmUgYmFzZWQgb24gZ2l2ZW4gdGV4dHVyZSBkYXRhLlxuICogSGFuZGxlcyBsb2FkaW5nIGFzc2V0cyBpZiBuZWNlc3NhcnkuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSAgaW5wdXQgICBPYmplY3QgY29udGFpbmluZyB0ZXh0dXJlIGlkLCB0ZXh0dXJlIGRhdGFcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICBhbmQgb3B0aW9ucyB1c2VkIHRvIGRyYXcgdGV4dHVyZS5cbiAqIEBwYXJhbSB7TnVtYmVyfSAgc2xvdCAgICBUZXh0dXJlIHNsb3QgdG8gYmluZCBnZW5lcmF0ZWQgdGV4dHVyZSB0by5cbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gICAgICB1bmRlZmluZWRcbiAqL1xuVGV4dHVyZU1hbmFnZXIucHJvdG90eXBlLnJlZ2lzdGVyID0gZnVuY3Rpb24gcmVnaXN0ZXIoaW5wdXQsIHNsb3QpIHtcbiAgICB2YXIgc291cmNlID0gaW5wdXQuZGF0YTtcbiAgICB2YXIgdGV4dHVyZUlkID0gaW5wdXQuaWQ7XG4gICAgdmFyIG9wdGlvbnMgPSBpbnB1dC5vcHRpb25zIHx8IHt9O1xuICAgIHZhciB0ZXh0dXJlID0gdGhpcy5yZWdpc3RyeVt0ZXh0dXJlSWRdO1xuICAgIHZhciBzcGVjO1xuXG4gICAgaWYgKCF0ZXh0dXJlKSB7XG5cbiAgICAgICAgdGV4dHVyZSA9IG5ldyBUZXh0dXJlKHRoaXMuZ2wsIG9wdGlvbnMpO1xuICAgICAgICB0ZXh0dXJlLnNldEltYWdlKHRoaXMuX2NoZWNrZXJib2FyZCk7XG5cbiAgICAgICAgLy8gQWRkIHRleHR1cmUgdG8gcmVnaXN0cnlcblxuICAgICAgICBzcGVjID0gdGhpcy5yZWdpc3RyeVt0ZXh0dXJlSWRdID0ge1xuICAgICAgICAgICAgcmVzYW1wbGVSYXRlOiBvcHRpb25zLnJlc2FtcGxlUmF0ZSB8fCBudWxsLFxuICAgICAgICAgICAgbGFzdFJlc2FtcGxlOiBudWxsLFxuICAgICAgICAgICAgaXNMb2FkZWQ6IGZhbHNlLFxuICAgICAgICAgICAgdGV4dHVyZTogdGV4dHVyZSxcbiAgICAgICAgICAgIHNvdXJjZTogc291cmNlLFxuICAgICAgICAgICAgaWQ6IHRleHR1cmVJZCxcbiAgICAgICAgICAgIHNsb3Q6IHNsb3RcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBIYW5kbGUgYXJyYXlcblxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShzb3VyY2UpIHx8IHNvdXJjZSBpbnN0YW5jZW9mIFVpbnQ4QXJyYXkgfHwgc291cmNlIGluc3RhbmNlb2YgRmxvYXQzMkFycmF5KSB7XG4gICAgICAgICAgICB0aGlzLmJpbmRUZXh0dXJlKHRleHR1cmVJZCk7XG4gICAgICAgICAgICB0ZXh0dXJlLnNldEFycmF5KHNvdXJjZSk7XG4gICAgICAgICAgICBzcGVjLmlzTG9hZGVkID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEhhbmRsZSB2aWRlb1xuXG4gICAgICAgIGVsc2UgaWYgKHdpbmRvdyAmJiBzb3VyY2UgaW5zdGFuY2VvZiB3aW5kb3cuSFRNTFZpZGVvRWxlbWVudCkge1xuICAgICAgICAgICAgc291cmNlLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWRlZGRhdGEnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmJpbmRUZXh0dXJlKHRleHR1cmVJZCk7XG4gICAgICAgICAgICAgICAgdGV4dHVyZS5zZXRJbWFnZShzb3VyY2UpO1xuXG4gICAgICAgICAgICAgICAgc3BlYy5pc0xvYWRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgc3BlYy5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSGFuZGxlIGltYWdlIHVybFxuXG4gICAgICAgIGVsc2UgaWYgKHR5cGVvZiBzb3VyY2UgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBsb2FkSW1hZ2Uoc291cmNlLCBmdW5jdGlvbiAoaW1nKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5iaW5kVGV4dHVyZSh0ZXh0dXJlSWQpO1xuICAgICAgICAgICAgICAgIHRleHR1cmUuc2V0SW1hZ2UoaW1nKTtcblxuICAgICAgICAgICAgICAgIHNwZWMuaXNMb2FkZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHNwZWMuc291cmNlID0gaW1nO1xuICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0ZXh0dXJlSWQ7XG59O1xuXG4vKipcbiAqIExvYWRzIGFuIGltYWdlIGZyb20gYSBzdHJpbmcgb3IgSW1hZ2Ugb2JqZWN0IGFuZCBleGVjdXRlcyBhIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwcml2YXRlXG4gKlxuICogQHBhcmFtIHtPYmplY3R8U3RyaW5nfSBpbnB1dCBUaGUgaW5wdXQgaW1hZ2UgZGF0YSB0byBsb2FkIGFzIGFuIGFzc2V0LlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGZpcmVkIHdoZW4gdGhlIGltYWdlIGhhcyBmaW5pc2hlZCBsb2FkaW5nLlxuICpcbiAqIEByZXR1cm4ge09iamVjdH0gSW1hZ2Ugb2JqZWN0IGJlaW5nIGxvYWRlZC5cbiAqL1xuZnVuY3Rpb24gbG9hZEltYWdlIChpbnB1dCwgY2FsbGJhY2spIHtcbiAgICB2YXIgaW1hZ2UgPSAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJyA/IG5ldyBJbWFnZSgpIDogaW5wdXQpIHx8IHt9O1xuICAgICAgICBpbWFnZS5jcm9zc09yaWdpbiA9ICdhbm9ueW1vdXMnO1xuXG4gICAgaWYgKCFpbWFnZS5zcmMpIGltYWdlLnNyYyA9IGlucHV0O1xuICAgIGlmICghaW1hZ2UuY29tcGxldGUpIHtcbiAgICAgICAgaW1hZ2Uub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY2FsbGJhY2soaW1hZ2UpO1xuICAgICAgICB9O1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgY2FsbGJhY2soaW1hZ2UpO1xuICAgIH1cblxuICAgIHJldHVybiBpbWFnZTtcbn1cblxuLyoqXG4gKiBTZXRzIGFjdGl2ZSB0ZXh0dXJlIHNsb3QgYW5kIGJpbmRzIHRhcmdldCB0ZXh0dXJlLiAgQWxzbyBoYW5kbGVzXG4gKiByZXNhbXBsaW5nIHdoZW4gbmVjZXNzYXJ5LlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gaWQgSWRlbnRpZmllciB1c2VkIHRvIHJldHJlaXZlIHRleHR1cmUgc3BlY1xuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cblRleHR1cmVNYW5hZ2VyLnByb3RvdHlwZS5iaW5kVGV4dHVyZSA9IGZ1bmN0aW9uIGJpbmRUZXh0dXJlKGlkKSB7XG4gICAgdmFyIHNwZWMgPSB0aGlzLnJlZ2lzdHJ5W2lkXTtcblxuICAgIGlmICh0aGlzLl9hY3RpdmVUZXh0dXJlICE9PSBzcGVjLnNsb3QpIHtcbiAgICAgICAgdGhpcy5nbC5hY3RpdmVUZXh0dXJlKHRoaXMuZ2wuVEVYVFVSRTAgKyBzcGVjLnNsb3QpO1xuICAgICAgICB0aGlzLl9hY3RpdmVUZXh0dXJlID0gc3BlYy5zbG90O1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ib3VuZFRleHR1cmUgIT09IGlkKSB7XG4gICAgICAgIHRoaXMuX2JvdW5kVGV4dHVyZSA9IGlkO1xuICAgICAgICBzcGVjLnRleHR1cmUuYmluZCgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9uZWVkc1Jlc2FtcGxlW3NwZWMuaWRdKSB7XG5cbiAgICAgICAgLy8gVE9ETzogQWNjb3VudCBmb3IgcmVzYW1wbGluZyBvZiBhcnJheXMuXG5cbiAgICAgICAgc3BlYy50ZXh0dXJlLnNldEltYWdlKHNwZWMuc291cmNlKTtcbiAgICAgICAgdGhpcy5fbmVlZHNSZXNhbXBsZVtzcGVjLmlkXSA9IGZhbHNlO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVGV4dHVyZU1hbmFnZXI7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBQcm9ncmFtID0gcmVxdWlyZSgnLi9Qcm9ncmFtJyk7XG52YXIgQnVmZmVyUmVnaXN0cnkgPSByZXF1aXJlKCcuL0J1ZmZlclJlZ2lzdHJ5Jyk7XG52YXIgUGxhbmUgPSByZXF1aXJlKCcuLi93ZWJnbC1nZW9tZXRyaWVzL3ByaW1pdGl2ZXMvUGxhbmUnKTtcbnZhciBzb3J0ZXIgPSByZXF1aXJlKCcuL3JhZGl4U29ydCcpO1xudmFyIGtleVZhbHVlVG9BcnJheXMgPSByZXF1aXJlKCcuLi91dGlsaXRpZXMva2V5VmFsdWVUb0FycmF5cycpO1xudmFyIFRleHR1cmVNYW5hZ2VyID0gcmVxdWlyZSgnLi9UZXh0dXJlTWFuYWdlcicpO1xudmFyIGNvbXBpbGVNYXRlcmlhbCA9IHJlcXVpcmUoJy4vY29tcGlsZU1hdGVyaWFsJyk7XG5cbnZhciBpZGVudGl0eSA9IFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxXTtcblxudmFyIGdsb2JhbFVuaWZvcm1zID0ga2V5VmFsdWVUb0FycmF5cyh7XG4gICAgJ3VfbnVtTGlnaHRzJzogMCxcbiAgICAndV9hbWJpZW50TGlnaHQnOiBuZXcgQXJyYXkoMyksXG4gICAgJ3VfbGlnaHRQb3NpdGlvbic6IG5ldyBBcnJheSgzKSxcbiAgICAndV9saWdodENvbG9yJzogbmV3IEFycmF5KDMpLFxuICAgICd1X3BlcnNwZWN0aXZlJzogbmV3IEFycmF5KDE2KSxcbiAgICAndV90aW1lJzogMCxcbiAgICAndV92aWV3JzogbmV3IEFycmF5KDE2KVxufSk7XG5cbi8qKlxuICogV2ViR0xSZW5kZXJlciBpcyBhIHByaXZhdGUgY2xhc3MgdGhhdCBtYW5hZ2VzIGFsbCBpbnRlcmFjdGlvbnMgd2l0aCB0aGUgV2ViR0xcbiAqIEFQSS4gRWFjaCBmcmFtZSBpdCByZWNlaXZlcyBjb21tYW5kcyBmcm9tIHRoZSBjb21wb3NpdG9yIGFuZCB1cGRhdGVzIGl0c1xuICogcmVnaXN0cmllcyBhY2NvcmRpbmdseS4gU3Vic2VxdWVudGx5LCB0aGUgZHJhdyBmdW5jdGlvbiBpcyBjYWxsZWQgYW5kIHRoZVxuICogV2ViR0xSZW5kZXJlciBpc3N1ZXMgZHJhdyBjYWxscyBmb3IgYWxsIG1lc2hlcyBpbiBpdHMgcmVnaXN0cnkuXG4gKlxuICogQGNsYXNzIFdlYkdMUmVuZGVyZXJcbiAqIEBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7RWxlbWVudH0gY2FudmFzIFRoZSBET00gZWxlbWVudCB0aGF0IEdMIHdpbGwgcGFpbnQgaXRzZWxmIG9udG8uXG4gKiBAcGFyYW0ge0NvbXBvc2l0b3J9IGNvbXBvc2l0b3IgQ29tcG9zaXRvciB1c2VkIGZvciBxdWVyeWluZyB0aGUgdGltZSBmcm9tLlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbmZ1bmN0aW9uIFdlYkdMUmVuZGVyZXIoY2FudmFzLCBjb21wb3NpdG9yKSB7XG4gICAgY2FudmFzLmNsYXNzTGlzdC5hZGQoJ2ZhbW91cy13ZWJnbC1yZW5kZXJlcicpO1xuXG4gICAgdGhpcy5jYW52YXMgPSBjYW52YXM7XG4gICAgdGhpcy5jb21wb3NpdG9yID0gY29tcG9zaXRvcjtcblxuICAgIGZvciAodmFyIGtleSBpbiB0aGlzLmNvbnN0cnVjdG9yLkRFRkFVTFRfU1RZTEVTKSB7XG4gICAgICAgIHRoaXMuY2FudmFzLnN0eWxlW2tleV0gPSB0aGlzLmNvbnN0cnVjdG9yLkRFRkFVTFRfU1RZTEVTW2tleV07XG4gICAgfVxuXG4gICAgdmFyIGdsID0gdGhpcy5nbCA9IHRoaXMuZ2V0V2ViR0xDb250ZXh0KHRoaXMuY2FudmFzKTtcblxuICAgIGdsLmNsZWFyQ29sb3IoMC4wLCAwLjAsIDAuMCwgMC4wKTtcbiAgICBnbC5wb2x5Z29uT2Zmc2V0KDAuMSwgMC4xKTtcbiAgICBnbC5lbmFibGUoZ2wuUE9MWUdPTl9PRkZTRVRfRklMTCk7XG4gICAgZ2wuZW5hYmxlKGdsLkRFUFRIX1RFU1QpO1xuICAgIGdsLmVuYWJsZShnbC5CTEVORCk7XG4gICAgZ2wuZGVwdGhGdW5jKGdsLkxFUVVBTCk7XG4gICAgZ2wuYmxlbmRGdW5jKGdsLlNSQ19BTFBIQSwgZ2wuT05FX01JTlVTX1NSQ19BTFBIQSk7XG4gICAgZ2wuZW5hYmxlKGdsLkNVTExfRkFDRSk7XG4gICAgZ2wuY3VsbEZhY2UoZ2wuQkFDSyk7XG5cbiAgICB0aGlzLm1lc2hSZWdpc3RyeSA9IHt9O1xuICAgIHRoaXMubWVzaFJlZ2lzdHJ5S2V5cyA9IFtdO1xuXG4gICAgdGhpcy5jdXRvdXRSZWdpc3RyeSA9IHt9O1xuXG4gICAgdGhpcy5jdXRvdXRSZWdpc3RyeUtleXMgPSBbXTtcblxuICAgIC8qKlxuICAgICAqIExpZ2h0c1xuICAgICAqL1xuICAgIHRoaXMubnVtTGlnaHRzID0gMDtcbiAgICB0aGlzLmFtYmllbnRMaWdodENvbG9yID0gWzAsIDAsIDBdO1xuICAgIHRoaXMubGlnaHRSZWdpc3RyeSA9IHt9O1xuICAgIHRoaXMubGlnaHRSZWdpc3RyeUtleXMgPSBbXTtcbiAgICB0aGlzLmxpZ2h0UG9zaXRpb25zID0gWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdO1xuICAgIHRoaXMubGlnaHRDb2xvcnMgPSBbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF07XG5cbiAgICB0aGlzLnRleHR1cmVNYW5hZ2VyID0gbmV3IFRleHR1cmVNYW5hZ2VyKGdsKTtcbiAgICB0aGlzLnRleENhY2hlID0ge307XG4gICAgdGhpcy5idWZmZXJSZWdpc3RyeSA9IG5ldyBCdWZmZXJSZWdpc3RyeShnbCk7XG4gICAgdGhpcy5wcm9ncmFtID0gbmV3IFByb2dyYW0oZ2wsIHsgZGVidWc6IHRydWUgfSk7XG5cbiAgICB0aGlzLnN0YXRlID0ge1xuICAgICAgICBib3VuZEFycmF5QnVmZmVyOiBudWxsLFxuICAgICAgICBib3VuZEVsZW1lbnRCdWZmZXI6IG51bGwsXG4gICAgICAgIGxhc3REcmF3bjogbnVsbCxcbiAgICAgICAgZW5hYmxlZEF0dHJpYnV0ZXM6IHt9LFxuICAgICAgICBlbmFibGVkQXR0cmlidXRlc0tleXM6IFtdXG4gICAgfTtcblxuICAgIHRoaXMucmVzb2x1dGlvbk5hbWUgPSBbJ3VfcmVzb2x1dGlvbiddO1xuICAgIHRoaXMucmVzb2x1dGlvblZhbHVlcyA9IFtdO1xuXG4gICAgdGhpcy5jYWNoZWRTaXplID0gW107XG5cbiAgICAvKlxuICAgIFRoZSBwcm9qZWN0aW9uVHJhbnNmb3JtIGhhcyBzb21lIGNvbnN0YW50IGNvbXBvbmVudHMsIGkuZS4gdGhlIHogc2NhbGUsIGFuZCB0aGUgeCBhbmQgeSB0cmFuc2xhdGlvbi5cblxuICAgIFRoZSB6IHNjYWxlIGtlZXBzIHRoZSBmaW5hbCB6IHBvc2l0aW9uIG9mIGFueSB2ZXJ0ZXggd2l0aGluIHRoZSBjbGlwJ3MgZG9tYWluIGJ5IHNjYWxpbmcgaXQgYnkgYW5cbiAgICBhcmJpdHJhcmlseSBzbWFsbCBjb2VmZmljaWVudC4gVGhpcyBoYXMgdGhlIGFkdmFudGFnZSBvZiBiZWluZyBhIHVzZWZ1bCBkZWZhdWx0IGluIHRoZSBldmVudCBvZiB0aGVcbiAgICB1c2VyIGZvcmdvaW5nIGEgbmVhciBhbmQgZmFyIHBsYW5lLCBhbiBhbGllbiBjb252ZW50aW9uIGluIGRvbSBzcGFjZSBhcyBpbiBET00gb3ZlcmxhcHBpbmcgaXNcbiAgICBjb25kdWN0ZWQgdmlhIHBhaW50ZXIncyBhbGdvcml0aG0uXG5cbiAgICBUaGUgeCBhbmQgeSB0cmFuc2xhdGlvbiB0cmFuc2Zvcm1zIHRoZSB3b3JsZCBzcGFjZSBvcmlnaW4gdG8gdGhlIHRvcCBsZWZ0IGNvcm5lciBvZiB0aGUgc2NyZWVuLlxuXG4gICAgVGhlIGZpbmFsIGNvbXBvbmVudCAodGhpcy5wcm9qZWN0aW9uVHJhbnNmb3JtWzE1XSkgaXMgaW5pdGlhbGl6ZWQgYXMgMSBiZWNhdXNlIGNlcnRhaW4gcHJvamVjdGlvbiBtb2RlbHMsXG4gICAgZS5nLiB0aGUgV0MzIHNwZWNpZmllZCBtb2RlbCwga2VlcCB0aGUgWFkgcGxhbmUgYXMgdGhlIHByb2plY3Rpb24gaHlwZXJwbGFuZS5cbiAgICAqL1xuICAgIHRoaXMucHJvamVjdGlvblRyYW5zZm9ybSA9IFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAtMC4wMDAwMDEsIDAsIC0xLCAxLCAwLCAxXTtcblxuICAgIC8vIFRPRE86IHJlbW92ZSB0aGlzIGhhY2tcblxuICAgIHZhciBjdXRvdXQgPSB0aGlzLmN1dG91dEdlb21ldHJ5ID0gbmV3IFBsYW5lKCk7XG5cbiAgICB0aGlzLmJ1ZmZlclJlZ2lzdHJ5LmFsbG9jYXRlKGN1dG91dC5zcGVjLmlkLCAnYV9wb3MnLCBjdXRvdXQuc3BlYy5idWZmZXJWYWx1ZXNbMF0sIDMpO1xuICAgIHRoaXMuYnVmZmVyUmVnaXN0cnkuYWxsb2NhdGUoY3V0b3V0LnNwZWMuaWQsICdhX3RleENvb3JkJywgY3V0b3V0LnNwZWMuYnVmZmVyVmFsdWVzWzFdLCAyKTtcbiAgICB0aGlzLmJ1ZmZlclJlZ2lzdHJ5LmFsbG9jYXRlKGN1dG91dC5zcGVjLmlkLCAnYV9ub3JtYWxzJywgY3V0b3V0LnNwZWMuYnVmZmVyVmFsdWVzWzJdLCAzKTtcbiAgICB0aGlzLmJ1ZmZlclJlZ2lzdHJ5LmFsbG9jYXRlKGN1dG91dC5zcGVjLmlkLCAnaW5kaWNlcycsIGN1dG91dC5zcGVjLmJ1ZmZlclZhbHVlc1szXSwgMSk7XG59XG5cbi8qKlxuICogQXR0ZW1wdHMgdG8gcmV0cmVpdmUgdGhlIFdlYkdMUmVuZGVyZXIgY29udGV4dCB1c2luZyBzZXZlcmFsXG4gKiBhY2Nlc3NvcnMuIEZvciBicm93c2VyIGNvbXBhdGFiaWxpdHkuIFRocm93cyBvbiBlcnJvci5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGNhbnZhcyBDYW52YXMgZWxlbWVudCBmcm9tIHdoaWNoIHRoZSBjb250ZXh0IGlzIHJldHJlaXZlZFxuICpcbiAqIEByZXR1cm4ge09iamVjdH0gV2ViR0xDb250ZXh0IG9mIGNhbnZhcyBlbGVtZW50XG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLmdldFdlYkdMQ29udGV4dCA9IGZ1bmN0aW9uIGdldFdlYkdMQ29udGV4dChjYW52YXMpIHtcbiAgICB2YXIgbmFtZXMgPSBbJ3dlYmdsJywgJ2V4cGVyaW1lbnRhbC13ZWJnbCcsICd3ZWJraXQtM2QnLCAnbW96LXdlYmdsJ107XG4gICAgdmFyIGNvbnRleHQgPSBudWxsO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dChuYW1lc1tpXSk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICB2YXIgbXNnID0gJ0Vycm9yIGNyZWF0aW5nIFdlYkdMIGNvbnRleHQ6ICcgKyBlcnJvci5wcm90b3R5cGUudG9TdHJpbmcoKTtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IobXNnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29udGV4dCkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGNvbnRleHQgPyBjb250ZXh0IDogZmFsc2U7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBuZXcgYmFzZSBzcGVjIHRvIHRoZSBsaWdodCByZWdpc3RyeSBhdCBhIGdpdmVuIHBhdGguXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFBhdGggdXNlZCBhcyBpZCBvZiBuZXcgbGlnaHQgaW4gbGlnaHRSZWdpc3RyeVxuICpcbiAqIEByZXR1cm4ge09iamVjdH0gTmV3bHkgY3JlYXRlZCBsaWdodCBzcGVjXG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLmNyZWF0ZUxpZ2h0ID0gZnVuY3Rpb24gY3JlYXRlTGlnaHQocGF0aCkge1xuICAgIHRoaXMubnVtTGlnaHRzKys7XG4gICAgdGhpcy5saWdodFJlZ2lzdHJ5S2V5cy5wdXNoKHBhdGgpO1xuICAgIHRoaXMubGlnaHRSZWdpc3RyeVtwYXRoXSA9IHtcbiAgICAgICAgY29sb3I6IFswLCAwLCAwXSxcbiAgICAgICAgcG9zaXRpb246IFswLCAwLCAwXVxuICAgIH07XG4gICAgcmV0dXJuIHRoaXMubGlnaHRSZWdpc3RyeVtwYXRoXTtcbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBiYXNlIHNwZWMgdG8gdGhlIG1lc2ggcmVnaXN0cnkgYXQgYSBnaXZlbiBwYXRoLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBQYXRoIHVzZWQgYXMgaWQgb2YgbmV3IG1lc2ggaW4gbWVzaFJlZ2lzdHJ5LlxuICpcbiAqIEByZXR1cm4ge09iamVjdH0gTmV3bHkgY3JlYXRlZCBtZXNoIHNwZWMuXG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLmNyZWF0ZU1lc2ggPSBmdW5jdGlvbiBjcmVhdGVNZXNoKHBhdGgpIHtcbiAgICB0aGlzLm1lc2hSZWdpc3RyeUtleXMucHVzaChwYXRoKTtcblxuICAgIHZhciB1bmlmb3JtcyA9IGtleVZhbHVlVG9BcnJheXMoe1xuICAgICAgICB1X29wYWNpdHk6IDEsXG4gICAgICAgIHVfdHJhbnNmb3JtOiBpZGVudGl0eSxcbiAgICAgICAgdV9zaXplOiBbMCwgMCwgMF0sXG4gICAgICAgIHVfYmFzZUNvbG9yOiBbMC41LCAwLjUsIDAuNSwgMV0sXG4gICAgICAgIHVfcG9zaXRpb25PZmZzZXQ6IFswLCAwLCAwXSxcbiAgICAgICAgdV9ub3JtYWxzOiBbMCwgMCwgMF0sXG4gICAgICAgIHVfZmxhdFNoYWRpbmc6IDAsXG4gICAgICAgIHVfZ2xvc3NpbmVzczogWzAsIDAsIDAsIDBdXG4gICAgfSk7XG4gICAgdGhpcy5tZXNoUmVnaXN0cnlbcGF0aF0gPSB7XG4gICAgICAgIGRlcHRoOiBudWxsLFxuICAgICAgICB1bmlmb3JtS2V5czogdW5pZm9ybXMua2V5cyxcbiAgICAgICAgdW5pZm9ybVZhbHVlczogdW5pZm9ybXMudmFsdWVzLFxuICAgICAgICBidWZmZXJzOiB7fSxcbiAgICAgICAgZ2VvbWV0cnk6IG51bGwsXG4gICAgICAgIGRyYXdUeXBlOiBudWxsLFxuICAgICAgICB0ZXh0dXJlczogW10sXG4gICAgICAgIHZpc2libGU6IHRydWVcbiAgICB9O1xuICAgIHJldHVybiB0aGlzLm1lc2hSZWdpc3RyeVtwYXRoXTtcbn07XG5cbi8qKlxuICogU2V0cyBmbGFnIG9uIGluZGljYXRpbmcgd2hldGhlciB0byBkbyBza2lwIGRyYXcgcGhhc2UgZm9yXG4gKiBjdXRvdXQgbWVzaCBhdCBnaXZlbiBwYXRoLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBQYXRoIHVzZWQgYXMgaWQgb2YgdGFyZ2V0IGN1dG91dCBtZXNoLlxuICogQHBhcmFtIHtCb29sZWFufSB1c2VzQ3V0b3V0IEluZGljYXRlcyB0aGUgcHJlc2VuY2Ugb2YgYSBjdXRvdXQgbWVzaFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLnNldEN1dG91dFN0YXRlID0gZnVuY3Rpb24gc2V0Q3V0b3V0U3RhdGUocGF0aCwgdXNlc0N1dG91dCkge1xuICAgIHZhciBjdXRvdXQgPSB0aGlzLmdldE9yU2V0Q3V0b3V0KHBhdGgpO1xuXG4gICAgY3V0b3V0LnZpc2libGUgPSB1c2VzQ3V0b3V0O1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIG9yIHJldHJlaXZlcyBjdXRvdXRcbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggUGF0aCB1c2VkIGFzIGlkIG9mIHRhcmdldCBjdXRvdXQgbWVzaC5cbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9IE5ld2x5IGNyZWF0ZWQgY3V0b3V0IHNwZWMuXG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLmdldE9yU2V0Q3V0b3V0ID0gZnVuY3Rpb24gZ2V0T3JTZXRDdXRvdXQocGF0aCkge1xuICAgIGlmICh0aGlzLmN1dG91dFJlZ2lzdHJ5W3BhdGhdKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmN1dG91dFJlZ2lzdHJ5W3BhdGhdO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdmFyIHVuaWZvcm1zID0ga2V5VmFsdWVUb0FycmF5cyh7XG4gICAgICAgICAgICB1X29wYWNpdHk6IDAsXG4gICAgICAgICAgICB1X3RyYW5zZm9ybTogaWRlbnRpdHkuc2xpY2UoKSxcbiAgICAgICAgICAgIHVfc2l6ZTogWzAsIDAsIDBdLFxuICAgICAgICAgICAgdV9vcmlnaW46IFswLCAwLCAwXSxcbiAgICAgICAgICAgIHVfYmFzZUNvbG9yOiBbMCwgMCwgMCwgMV1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5jdXRvdXRSZWdpc3RyeUtleXMucHVzaChwYXRoKTtcblxuICAgICAgICB0aGlzLmN1dG91dFJlZ2lzdHJ5W3BhdGhdID0ge1xuICAgICAgICAgICAgdW5pZm9ybUtleXM6IHVuaWZvcm1zLmtleXMsXG4gICAgICAgICAgICB1bmlmb3JtVmFsdWVzOiB1bmlmb3Jtcy52YWx1ZXMsXG4gICAgICAgICAgICBnZW9tZXRyeTogdGhpcy5jdXRvdXRHZW9tZXRyeS5zcGVjLmlkLFxuICAgICAgICAgICAgZHJhd1R5cGU6IHRoaXMuY3V0b3V0R2VvbWV0cnkuc3BlYy50eXBlLFxuICAgICAgICAgICAgdmlzaWJsZTogdHJ1ZVxuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiB0aGlzLmN1dG91dFJlZ2lzdHJ5W3BhdGhdO1xuICAgIH1cbn07XG5cbi8qKlxuICogU2V0cyBmbGFnIG9uIGluZGljYXRpbmcgd2hldGhlciB0byBkbyBza2lwIGRyYXcgcGhhc2UgZm9yXG4gKiBtZXNoIGF0IGdpdmVuIHBhdGguXG4gKlxuICogQG1ldGhvZFxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggUGF0aCB1c2VkIGFzIGlkIG9mIHRhcmdldCBtZXNoLlxuICogQHBhcmFtIHtCb29sZWFufSB2aXNpYmlsaXR5IEluZGljYXRlcyB0aGUgdmlzaWJpbGl0eSBvZiB0YXJnZXQgbWVzaC5cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5zZXRNZXNoVmlzaWJpbGl0eSA9IGZ1bmN0aW9uIHNldE1lc2hWaXNpYmlsaXR5KHBhdGgsIHZpc2liaWxpdHkpIHtcbiAgICB2YXIgbWVzaCA9IHRoaXMubWVzaFJlZ2lzdHJ5W3BhdGhdIHx8IHRoaXMuY3JlYXRlTWVzaChwYXRoKTtcblxuICAgIG1lc2gudmlzaWJsZSA9IHZpc2liaWxpdHk7XG59O1xuXG4vKipcbiAqIERlbGV0ZXMgYSBtZXNoIGZyb20gdGhlIG1lc2hSZWdpc3RyeS5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBQYXRoIHVzZWQgYXMgaWQgb2YgdGFyZ2V0IG1lc2guXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUucmVtb3ZlTWVzaCA9IGZ1bmN0aW9uIHJlbW92ZU1lc2gocGF0aCkge1xuICAgIHZhciBrZXlMb2NhdGlvbiA9IHRoaXMubWVzaFJlZ2lzdHJ5S2V5cy5pbmRleE9mKHBhdGgpO1xuICAgIHRoaXMubWVzaFJlZ2lzdHJ5S2V5cy5zcGxpY2Uoa2V5TG9jYXRpb24sIDEpO1xuICAgIHRoaXMubWVzaFJlZ2lzdHJ5W3BhdGhdID0gbnVsbDtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBvciByZXRyZWl2ZXMgY3V0b3V0XG4gKlxuICogQG1ldGhvZFxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggUGF0aCB1c2VkIGFzIGlkIG9mIGN1dG91dCBpbiBjdXRvdXQgcmVnaXN0cnkuXG4gKiBAcGFyYW0ge1N0cmluZ30gdW5pZm9ybU5hbWUgSWRlbnRpZmllciB1c2VkIHRvIHVwbG9hZCB2YWx1ZVxuICogQHBhcmFtIHtBcnJheX0gdW5pZm9ybVZhbHVlIFZhbHVlIG9mIHVuaWZvcm0gZGF0YVxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLnNldEN1dG91dFVuaWZvcm0gPSBmdW5jdGlvbiBzZXRDdXRvdXRVbmlmb3JtKHBhdGgsIHVuaWZvcm1OYW1lLCB1bmlmb3JtVmFsdWUpIHtcbiAgICB2YXIgY3V0b3V0ID0gdGhpcy5nZXRPclNldEN1dG91dChwYXRoKTtcblxuICAgIHZhciBpbmRleCA9IGN1dG91dC51bmlmb3JtS2V5cy5pbmRleE9mKHVuaWZvcm1OYW1lKTtcblxuICAgIGlmIChBcnJheS5pc0FycmF5KHVuaWZvcm1WYWx1ZSkpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHVuaWZvcm1WYWx1ZS5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgY3V0b3V0LnVuaWZvcm1WYWx1ZXNbaW5kZXhdW2ldID0gdW5pZm9ybVZhbHVlW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBjdXRvdXQudW5pZm9ybVZhbHVlc1tpbmRleF0gPSB1bmlmb3JtVmFsdWU7XG4gICAgfVxufTtcblxuLyoqXG4gKiBFZGl0cyB0aGUgb3B0aW9ucyBmaWVsZCBvbiBhIG1lc2hcbiAqXG4gKiBAbWV0aG9kXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBQYXRoIHVzZWQgYXMgaWQgb2YgdGFyZ2V0IG1lc2hcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIE1hcCBvZiBkcmF3IG9wdGlvbnMgZm9yIG1lc2hcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuKiovXG5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5zZXRNZXNoT3B0aW9ucyA9IGZ1bmN0aW9uKHBhdGgsIG9wdGlvbnMpIHtcbiAgICB2YXIgbWVzaCA9IHRoaXMubWVzaFJlZ2lzdHJ5W3BhdGhdIHx8IHRoaXMuY3JlYXRlTWVzaChwYXRoKTtcblxuICAgIG1lc2gub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENoYW5nZXMgdGhlIGNvbG9yIG9mIHRoZSBmaXhlZCBpbnRlbnNpdHkgbGlnaHRpbmcgaW4gdGhlIHNjZW5lXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFBhdGggdXNlZCBhcyBpZCBvZiBsaWdodFxuICogQHBhcmFtIHtOdW1iZXJ9IHIgcmVkIGNoYW5uZWxcbiAqIEBwYXJhbSB7TnVtYmVyfSBnIGdyZWVuIGNoYW5uZWxcbiAqIEBwYXJhbSB7TnVtYmVyfSBiIGJsdWUgY2hhbm5lbFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4qKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLnNldEFtYmllbnRMaWdodENvbG9yID0gZnVuY3Rpb24gc2V0QW1iaWVudExpZ2h0Q29sb3IocGF0aCwgciwgZywgYikge1xuICAgIHRoaXMuYW1iaWVudExpZ2h0Q29sb3JbMF0gPSByO1xuICAgIHRoaXMuYW1iaWVudExpZ2h0Q29sb3JbMV0gPSBnO1xuICAgIHRoaXMuYW1iaWVudExpZ2h0Q29sb3JbMl0gPSBiO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBDaGFuZ2VzIHRoZSBsb2NhdGlvbiBvZiB0aGUgbGlnaHQgaW4gdGhlIHNjZW5lXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFBhdGggdXNlZCBhcyBpZCBvZiBsaWdodFxuICogQHBhcmFtIHtOdW1iZXJ9IHggeCBwb3NpdGlvblxuICogQHBhcmFtIHtOdW1iZXJ9IHkgeSBwb3NpdGlvblxuICogQHBhcmFtIHtOdW1iZXJ9IHogeiBwb3NpdGlvblxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4qKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLnNldExpZ2h0UG9zaXRpb24gPSBmdW5jdGlvbiBzZXRMaWdodFBvc2l0aW9uKHBhdGgsIHgsIHksIHopIHtcbiAgICB2YXIgbGlnaHQgPSB0aGlzLmxpZ2h0UmVnaXN0cnlbcGF0aF0gfHwgdGhpcy5jcmVhdGVMaWdodChwYXRoKTtcblxuICAgIGxpZ2h0LnBvc2l0aW9uWzBdID0geDtcbiAgICBsaWdodC5wb3NpdGlvblsxXSA9IHk7XG4gICAgbGlnaHQucG9zaXRpb25bMl0gPSB6O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBDaGFuZ2VzIHRoZSBjb2xvciBvZiBhIGR5bmFtaWMgaW50ZW5zaXR5IGxpZ2h0aW5nIGluIHRoZSBzY2VuZVxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBQYXRoIHVzZWQgYXMgaWQgb2YgbGlnaHQgaW4gbGlnaHQgUmVnaXN0cnkuXG4gKiBAcGFyYW0ge051bWJlcn0gciByZWQgY2hhbm5lbFxuICogQHBhcmFtIHtOdW1iZXJ9IGcgZ3JlZW4gY2hhbm5lbFxuICogQHBhcmFtIHtOdW1iZXJ9IGIgYmx1ZSBjaGFubmVsXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbioqL1xuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUuc2V0TGlnaHRDb2xvciA9IGZ1bmN0aW9uIHNldExpZ2h0Q29sb3IocGF0aCwgciwgZywgYikge1xuICAgIHZhciBsaWdodCA9IHRoaXMubGlnaHRSZWdpc3RyeVtwYXRoXSB8fCB0aGlzLmNyZWF0ZUxpZ2h0KHBhdGgpO1xuXG4gICAgbGlnaHQuY29sb3JbMF0gPSByO1xuICAgIGxpZ2h0LmNvbG9yWzFdID0gZztcbiAgICBsaWdodC5jb2xvclsyXSA9IGI7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENvbXBpbGVzIG1hdGVyaWFsIHNwZWMgaW50byBwcm9ncmFtIHNoYWRlclxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBQYXRoIHVzZWQgYXMgaWQgb2YgY3V0b3V0IGluIGN1dG91dCByZWdpc3RyeS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIE5hbWUgdGhhdCB0aGUgcmVuZGVyaW5nIGlucHV0IHRoZSBtYXRlcmlhbCBpcyBib3VuZCB0b1xuICogQHBhcmFtIHtPYmplY3R9IG1hdGVyaWFsIE1hdGVyaWFsIHNwZWNcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuKiovXG5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5oYW5kbGVNYXRlcmlhbElucHV0ID0gZnVuY3Rpb24gaGFuZGxlTWF0ZXJpYWxJbnB1dChwYXRoLCBuYW1lLCBtYXRlcmlhbCkge1xuICAgIHZhciBtZXNoID0gdGhpcy5tZXNoUmVnaXN0cnlbcGF0aF0gfHwgdGhpcy5jcmVhdGVNZXNoKHBhdGgpO1xuICAgIG1hdGVyaWFsID0gY29tcGlsZU1hdGVyaWFsKG1hdGVyaWFsLCBtZXNoLnRleHR1cmVzLmxlbmd0aCk7XG5cbiAgICAvLyBTZXQgdW5pZm9ybXMgdG8gZW5hYmxlIHRleHR1cmUhXG5cbiAgICBtZXNoLnVuaWZvcm1WYWx1ZXNbbWVzaC51bmlmb3JtS2V5cy5pbmRleE9mKG5hbWUpXVswXSA9IC1tYXRlcmlhbC5faWQ7XG5cbiAgICAvLyBSZWdpc3RlciB0ZXh0dXJlcyFcblxuICAgIHZhciBpID0gbWF0ZXJpYWwudGV4dHVyZXMubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgbWVzaC50ZXh0dXJlcy5wdXNoKFxuICAgICAgICAgICAgdGhpcy50ZXh0dXJlTWFuYWdlci5yZWdpc3RlcihtYXRlcmlhbC50ZXh0dXJlc1tpXSwgbWVzaC50ZXh0dXJlcy5sZW5ndGggKyBpKVxuICAgICAgICApO1xuICAgIH1cblxuICAgIC8vIFJlZ2lzdGVyIG1hdGVyaWFsIVxuXG4gICAgdGhpcy5wcm9ncmFtLnJlZ2lzdGVyTWF0ZXJpYWwobmFtZSwgbWF0ZXJpYWwpO1xuXG4gICAgcmV0dXJuIHRoaXMudXBkYXRlU2l6ZSgpO1xufTtcblxuLyoqXG4gKiBDaGFuZ2VzIHRoZSBnZW9tZXRyeSBkYXRhIG9mIGEgbWVzaFxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBQYXRoIHVzZWQgYXMgaWQgb2YgY3V0b3V0IGluIGN1dG91dCByZWdpc3RyeS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBnZW9tZXRyeSBHZW9tZXRyeSBvYmplY3QgY29udGFpbmluZyB2ZXJ0ZXggZGF0YSB0byBiZSBkcmF3blxuICogQHBhcmFtIHtOdW1iZXJ9IGRyYXdUeXBlIFByaW1pdGl2ZSBpZGVudGlmaWVyXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGR5bmFtaWMgV2hldGhlciBnZW9tZXRyeSBpcyBkeW5hbWljXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbioqL1xuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUuc2V0R2VvbWV0cnkgPSBmdW5jdGlvbiBzZXRHZW9tZXRyeShwYXRoLCBnZW9tZXRyeSwgZHJhd1R5cGUsIGR5bmFtaWMpIHtcbiAgICB2YXIgbWVzaCA9IHRoaXMubWVzaFJlZ2lzdHJ5W3BhdGhdIHx8IHRoaXMuY3JlYXRlTWVzaChwYXRoKTtcblxuICAgIG1lc2guZ2VvbWV0cnkgPSBnZW9tZXRyeTtcbiAgICBtZXNoLmRyYXdUeXBlID0gZHJhd1R5cGU7XG4gICAgbWVzaC5keW5hbWljID0gZHluYW1pYztcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBVcGxvYWRzIGEgbmV3IHZhbHVlIGZvciB0aGUgdW5pZm9ybSBkYXRhIHdoZW4gdGhlIG1lc2ggaXMgYmVpbmcgZHJhd25cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggUGF0aCB1c2VkIGFzIGlkIG9mIG1lc2ggaW4gbWVzaCByZWdpc3RyeVxuICogQHBhcmFtIHtTdHJpbmd9IHVuaWZvcm1OYW1lIElkZW50aWZpZXIgdXNlZCB0byB1cGxvYWQgdmFsdWVcbiAqIEBwYXJhbSB7QXJyYXl9IHVuaWZvcm1WYWx1ZSBWYWx1ZSBvZiB1bmlmb3JtIGRhdGFcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuKiovXG5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5zZXRNZXNoVW5pZm9ybSA9IGZ1bmN0aW9uIHNldE1lc2hVbmlmb3JtKHBhdGgsIHVuaWZvcm1OYW1lLCB1bmlmb3JtVmFsdWUpIHtcbiAgICB2YXIgbWVzaCA9IHRoaXMubWVzaFJlZ2lzdHJ5W3BhdGhdIHx8IHRoaXMuY3JlYXRlTWVzaChwYXRoKTtcblxuICAgIHZhciBpbmRleCA9IG1lc2gudW5pZm9ybUtleXMuaW5kZXhPZih1bmlmb3JtTmFtZSk7XG5cbiAgICBpZiAoaW5kZXggPT09IC0xKSB7XG4gICAgICAgIG1lc2gudW5pZm9ybUtleXMucHVzaCh1bmlmb3JtTmFtZSk7XG4gICAgICAgIG1lc2gudW5pZm9ybVZhbHVlcy5wdXNoKHVuaWZvcm1WYWx1ZSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBtZXNoLnVuaWZvcm1WYWx1ZXNbaW5kZXhdID0gdW5pZm9ybVZhbHVlO1xuICAgIH1cbn07XG5cbi8qKlxuICogVHJpZ2dlcnMgdGhlICdkcmF3JyBwaGFzZSBvZiB0aGUgV2ViR0xSZW5kZXJlci4gSXRlcmF0ZXMgdGhyb3VnaCByZWdpc3RyaWVzXG4gKiB0byBzZXQgdW5pZm9ybXMsIHNldCBhdHRyaWJ1dGVzIGFuZCBpc3N1ZSBkcmF3IGNvbW1hbmRzIGZvciByZW5kZXJhYmxlcy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggUGF0aCB1c2VkIGFzIGlkIG9mIG1lc2ggaW4gbWVzaCByZWdpc3RyeVxuICogQHBhcmFtIHtOdW1iZXJ9IGdlb21ldHJ5SWQgSWQgb2YgZ2VvbWV0cnkgaW4gZ2VvbWV0cnkgcmVnaXN0cnlcbiAqIEBwYXJhbSB7U3RyaW5nfSBidWZmZXJOYW1lIEF0dHJpYnV0ZSBsb2NhdGlvbiBuYW1lXG4gKiBAcGFyYW0ge0FycmF5fSBidWZmZXJWYWx1ZSBWZXJ0ZXggZGF0YVxuICogQHBhcmFtIHtOdW1iZXJ9IGJ1ZmZlclNwYWNpbmcgVGhlIGRpbWVuc2lvbnMgb2YgdGhlIHZlcnRleFxuICogQHBhcmFtIHtCb29sZWFufSBpc0R5bmFtaWMgV2hldGhlciBnZW9tZXRyeSBpcyBkeW5hbWljXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUuYnVmZmVyRGF0YSA9IGZ1bmN0aW9uIGJ1ZmZlckRhdGEocGF0aCwgZ2VvbWV0cnlJZCwgYnVmZmVyTmFtZSwgYnVmZmVyVmFsdWUsIGJ1ZmZlclNwYWNpbmcsIGlzRHluYW1pYykge1xuICAgIHRoaXMuYnVmZmVyUmVnaXN0cnkuYWxsb2NhdGUoZ2VvbWV0cnlJZCwgYnVmZmVyTmFtZSwgYnVmZmVyVmFsdWUsIGJ1ZmZlclNwYWNpbmcsIGlzRHluYW1pYyk7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogVHJpZ2dlcnMgdGhlICdkcmF3JyBwaGFzZSBvZiB0aGUgV2ViR0xSZW5kZXJlci4gSXRlcmF0ZXMgdGhyb3VnaCByZWdpc3RyaWVzXG4gKiB0byBzZXQgdW5pZm9ybXMsIHNldCBhdHRyaWJ1dGVzIGFuZCBpc3N1ZSBkcmF3IGNvbW1hbmRzIGZvciByZW5kZXJhYmxlcy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHJlbmRlclN0YXRlIFBhcmFtZXRlcnMgcHJvdmlkZWQgYnkgdGhlIGNvbXBvc2l0b3IsIHRoYXQgYWZmZWN0IHRoZSByZW5kZXJpbmcgb2YgYWxsIHJlbmRlcmFibGVzLlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbiBkcmF3KHJlbmRlclN0YXRlKSB7XG4gICAgdmFyIHRpbWUgPSB0aGlzLmNvbXBvc2l0b3IuZ2V0VGltZSgpO1xuXG4gICAgdGhpcy5nbC5jbGVhcih0aGlzLmdsLkNPTE9SX0JVRkZFUl9CSVQgfCB0aGlzLmdsLkRFUFRIX0JVRkZFUl9CSVQpO1xuICAgIHRoaXMudGV4dHVyZU1hbmFnZXIudXBkYXRlKHRpbWUpO1xuXG4gICAgdGhpcy5tZXNoUmVnaXN0cnlLZXlzID0gc29ydGVyKHRoaXMubWVzaFJlZ2lzdHJ5S2V5cywgdGhpcy5tZXNoUmVnaXN0cnkpO1xuXG4gICAgdGhpcy5zZXRHbG9iYWxVbmlmb3JtcyhyZW5kZXJTdGF0ZSk7XG4gICAgdGhpcy5kcmF3Q3V0b3V0cygpO1xuICAgIHRoaXMuZHJhd01lc2hlcygpO1xufTtcblxuLyoqXG4gKiBJdGVyYXRlcyB0aHJvdWdoIGFuZCBkcmF3cyBhbGwgcmVnaXN0ZXJlZCBtZXNoZXMuIFRoaXMgaW5jbHVkZXNcbiAqIGJpbmRpbmcgdGV4dHVyZXMsIGhhbmRsaW5nIGRyYXcgb3B0aW9ucywgc2V0dGluZyBtZXNoIHVuaWZvcm1zXG4gKiBhbmQgZHJhd2luZyBtZXNoIGJ1ZmZlcnMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLmRyYXdNZXNoZXMgPSBmdW5jdGlvbiBkcmF3TWVzaGVzKCkge1xuICAgIHZhciBnbCA9IHRoaXMuZ2w7XG4gICAgdmFyIGJ1ZmZlcnM7XG4gICAgdmFyIG1lc2g7XG5cbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgdGhpcy5tZXNoUmVnaXN0cnlLZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG1lc2ggPSB0aGlzLm1lc2hSZWdpc3RyeVt0aGlzLm1lc2hSZWdpc3RyeUtleXNbaV1dO1xuICAgICAgICBidWZmZXJzID0gdGhpcy5idWZmZXJSZWdpc3RyeS5yZWdpc3RyeVttZXNoLmdlb21ldHJ5XTtcblxuICAgICAgICBpZiAoIW1lc2gudmlzaWJsZSkgY29udGludWU7XG5cbiAgICAgICAgaWYgKG1lc2gudW5pZm9ybVZhbHVlc1swXSA8IDEpIHtcbiAgICAgICAgICAgIGdsLmRlcHRoTWFzayhmYWxzZSk7XG4gICAgICAgICAgICBnbC5lbmFibGUoZ2wuQkxFTkQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZ2wuZGVwdGhNYXNrKHRydWUpO1xuICAgICAgICAgICAgZ2wuZGlzYWJsZShnbC5CTEVORCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWJ1ZmZlcnMpIGNvbnRpbnVlO1xuXG4gICAgICAgIHZhciBqID0gbWVzaC50ZXh0dXJlcy5sZW5ndGg7XG4gICAgICAgIHdoaWxlIChqLS0pIHRoaXMudGV4dHVyZU1hbmFnZXIuYmluZFRleHR1cmUobWVzaC50ZXh0dXJlc1tqXSk7XG5cbiAgICAgICAgaWYgKG1lc2gub3B0aW9ucykgdGhpcy5oYW5kbGVPcHRpb25zKG1lc2gub3B0aW9ucywgbWVzaCk7XG5cbiAgICAgICAgdGhpcy5wcm9ncmFtLnNldFVuaWZvcm1zKG1lc2gudW5pZm9ybUtleXMsIG1lc2gudW5pZm9ybVZhbHVlcyk7XG4gICAgICAgIHRoaXMuZHJhd0J1ZmZlcnMoYnVmZmVycywgbWVzaC5kcmF3VHlwZSwgbWVzaC5nZW9tZXRyeSk7XG5cbiAgICAgICAgaWYgKG1lc2gub3B0aW9ucykgdGhpcy5yZXNldE9wdGlvbnMobWVzaC5vcHRpb25zKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEl0ZXJhdGVzIHRocm91Z2ggYW5kIGRyYXdzIGFsbCByZWdpc3RlcmVkIGN1dG91dCBtZXNoZXMuIEJsZW5kaW5nXG4gKiBpcyBkaXNhYmxlZCwgY3V0b3V0IHVuaWZvcm1zIGFyZSBzZXQgYW5kIGZpbmFsbHkgYnVmZmVycyBhcmUgZHJhd24uXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLmRyYXdDdXRvdXRzID0gZnVuY3Rpb24gZHJhd0N1dG91dHMoKSB7XG4gICAgdmFyIGN1dG91dDtcbiAgICB2YXIgYnVmZmVycztcbiAgICB2YXIgbGVuID0gdGhpcy5jdXRvdXRSZWdpc3RyeUtleXMubGVuZ3RoO1xuXG4gICAgaWYgKGxlbikge1xuICAgICAgICB0aGlzLmdsLmVuYWJsZSh0aGlzLmdsLkJMRU5EKTtcbiAgICAgICAgdGhpcy5nbC5kZXB0aE1hc2sodHJ1ZSk7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBjdXRvdXQgPSB0aGlzLmN1dG91dFJlZ2lzdHJ5W3RoaXMuY3V0b3V0UmVnaXN0cnlLZXlzW2ldXTtcbiAgICAgICAgYnVmZmVycyA9IHRoaXMuYnVmZmVyUmVnaXN0cnkucmVnaXN0cnlbY3V0b3V0Lmdlb21ldHJ5XTtcblxuICAgICAgICBpZiAoIWN1dG91dC52aXNpYmxlKSBjb250aW51ZTtcblxuICAgICAgICB0aGlzLnByb2dyYW0uc2V0VW5pZm9ybXMoY3V0b3V0LnVuaWZvcm1LZXlzLCBjdXRvdXQudW5pZm9ybVZhbHVlcyk7XG4gICAgICAgIHRoaXMuZHJhd0J1ZmZlcnMoYnVmZmVycywgY3V0b3V0LmRyYXdUeXBlLCBjdXRvdXQuZ2VvbWV0cnkpO1xuICAgIH1cbn07XG5cbi8qKlxuICogU2V0cyB1bmlmb3JtcyB0byBiZSBzaGFyZWQgYnkgYWxsIG1lc2hlcy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHJlbmRlclN0YXRlIERyYXcgc3RhdGUgb3B0aW9ucyBwYXNzZWQgZG93biBmcm9tIGNvbXBvc2l0b3IuXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUuc2V0R2xvYmFsVW5pZm9ybXMgPSBmdW5jdGlvbiBzZXRHbG9iYWxVbmlmb3JtcyhyZW5kZXJTdGF0ZSkge1xuICAgIHZhciBsaWdodDtcbiAgICB2YXIgc3RyaWRlO1xuXG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHRoaXMubGlnaHRSZWdpc3RyeUtleXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgbGlnaHQgPSB0aGlzLmxpZ2h0UmVnaXN0cnlbdGhpcy5saWdodFJlZ2lzdHJ5S2V5c1tpXV07XG4gICAgICAgIHN0cmlkZSA9IGkgKiA0O1xuXG4gICAgICAgIC8vIEJ1aWxkIHRoZSBsaWdodCBwb3NpdGlvbnMnIDR4NCBtYXRyaXhcblxuICAgICAgICB0aGlzLmxpZ2h0UG9zaXRpb25zWzAgKyBzdHJpZGVdID0gbGlnaHQucG9zaXRpb25bMF07XG4gICAgICAgIHRoaXMubGlnaHRQb3NpdGlvbnNbMSArIHN0cmlkZV0gPSBsaWdodC5wb3NpdGlvblsxXTtcbiAgICAgICAgdGhpcy5saWdodFBvc2l0aW9uc1syICsgc3RyaWRlXSA9IGxpZ2h0LnBvc2l0aW9uWzJdO1xuXG4gICAgICAgIC8vIEJ1aWxkIHRoZSBsaWdodCBjb2xvcnMnIDR4NCBtYXRyaXhcblxuICAgICAgICB0aGlzLmxpZ2h0Q29sb3JzWzAgKyBzdHJpZGVdID0gbGlnaHQuY29sb3JbMF07XG4gICAgICAgIHRoaXMubGlnaHRDb2xvcnNbMSArIHN0cmlkZV0gPSBsaWdodC5jb2xvclsxXTtcbiAgICAgICAgdGhpcy5saWdodENvbG9yc1syICsgc3RyaWRlXSA9IGxpZ2h0LmNvbG9yWzJdO1xuICAgIH1cblxuICAgIGdsb2JhbFVuaWZvcm1zLnZhbHVlc1swXSA9IHRoaXMubnVtTGlnaHRzO1xuICAgIGdsb2JhbFVuaWZvcm1zLnZhbHVlc1sxXSA9IHRoaXMuYW1iaWVudExpZ2h0Q29sb3I7XG4gICAgZ2xvYmFsVW5pZm9ybXMudmFsdWVzWzJdID0gdGhpcy5saWdodFBvc2l0aW9ucztcbiAgICBnbG9iYWxVbmlmb3Jtcy52YWx1ZXNbM10gPSB0aGlzLmxpZ2h0Q29sb3JzO1xuXG4gICAgLypcbiAgICAgKiBTZXQgdGltZSBhbmQgcHJvamVjdGlvbiB1bmlmb3Jtc1xuICAgICAqIHByb2plY3Rpbmcgd29ybGQgc3BhY2UgaW50byBhIDJkIHBsYW5lIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBjYW52YXMuXG4gICAgICogVGhlIHggYW5kIHkgc2NhbGUgKHRoaXMucHJvamVjdGlvblRyYW5zZm9ybVswXSBhbmQgdGhpcy5wcm9qZWN0aW9uVHJhbnNmb3JtWzVdIHJlc3BlY3RpdmVseSlcbiAgICAgKiBjb252ZXJ0IHRoZSBwcm9qZWN0ZWQgZ2VvbWV0cnkgYmFjayBpbnRvIGNsaXBzcGFjZS5cbiAgICAgKiBUaGUgcGVycGVjdGl2ZSBkaXZpZGUgKHRoaXMucHJvamVjdGlvblRyYW5zZm9ybVsxMV0pLCBhZGRzIHRoZSB6IHZhbHVlIG9mIHRoZSBwb2ludFxuICAgICAqIG11bHRpcGxpZWQgYnkgdGhlIHBlcnNwZWN0aXZlIGRpdmlkZSB0byB0aGUgdyB2YWx1ZSBvZiB0aGUgcG9pbnQuIEluIHRoZSBwcm9jZXNzXG4gICAgICogb2YgY29udmVydGluZyBmcm9tIGhvbW9nZW5vdXMgY29vcmRpbmF0ZXMgdG8gTkRDIChub3JtYWxpemVkIGRldmljZSBjb29yZGluYXRlcylcbiAgICAgKiB0aGUgeCBhbmQgeSB2YWx1ZXMgb2YgdGhlIHBvaW50IGFyZSBkaXZpZGVkIGJ5IHcsIHdoaWNoIGltcGxlbWVudHMgcGVyc3BlY3RpdmUuXG4gICAgICovXG4gICAgdGhpcy5wcm9qZWN0aW9uVHJhbnNmb3JtWzBdID0gMSAvICh0aGlzLmNhY2hlZFNpemVbMF0gKiAwLjUpO1xuICAgIHRoaXMucHJvamVjdGlvblRyYW5zZm9ybVs1XSA9IC0xIC8gKHRoaXMuY2FjaGVkU2l6ZVsxXSAqIDAuNSk7XG4gICAgdGhpcy5wcm9qZWN0aW9uVHJhbnNmb3JtWzExXSA9IHJlbmRlclN0YXRlLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzExXTtcblxuICAgIGdsb2JhbFVuaWZvcm1zLnZhbHVlc1s0XSA9IHRoaXMucHJvamVjdGlvblRyYW5zZm9ybTtcbiAgICBnbG9iYWxVbmlmb3Jtcy52YWx1ZXNbNV0gPSB0aGlzLmNvbXBvc2l0b3IuZ2V0VGltZSgpICogMC4wMDE7XG4gICAgZ2xvYmFsVW5pZm9ybXMudmFsdWVzWzZdID0gcmVuZGVyU3RhdGUudmlld1RyYW5zZm9ybTtcblxuICAgIHRoaXMucHJvZ3JhbS5zZXRVbmlmb3JtcyhnbG9iYWxVbmlmb3Jtcy5rZXlzLCBnbG9iYWxVbmlmb3Jtcy52YWx1ZXMpO1xufTtcblxuLyoqXG4gKiBMb2FkcyB0aGUgYnVmZmVycyBhbmQgaXNzdWVzIHRoZSBkcmF3IGNvbW1hbmQgZm9yIGEgZ2VvbWV0cnkuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2ZXJ0ZXhCdWZmZXJzIEFsbCBidWZmZXJzIHVzZWQgdG8gZHJhdyB0aGUgZ2VvbWV0cnkuXG4gKiBAcGFyYW0ge051bWJlcn0gbW9kZSBFbnVtZXJhdG9yIGRlZmluaW5nIHdoYXQgcHJpbWl0aXZlIHRvIGRyYXdcbiAqIEBwYXJhbSB7TnVtYmVyfSBpZCBJRCBvZiBnZW9tZXRyeSBiZWluZyBkcmF3bi5cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5kcmF3QnVmZmVycyA9IGZ1bmN0aW9uIGRyYXdCdWZmZXJzKHZlcnRleEJ1ZmZlcnMsIG1vZGUsIGlkKSB7XG4gICAgdmFyIGdsID0gdGhpcy5nbDtcbiAgICB2YXIgbGVuZ3RoID0gMDtcbiAgICB2YXIgYXR0cmlidXRlO1xuICAgIHZhciBsb2NhdGlvbjtcbiAgICB2YXIgc3BhY2luZztcbiAgICB2YXIgb2Zmc2V0O1xuICAgIHZhciBidWZmZXI7XG4gICAgdmFyIGl0ZXI7XG4gICAgdmFyIGo7XG4gICAgdmFyIGk7XG5cbiAgICBpdGVyID0gdmVydGV4QnVmZmVycy5rZXlzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgaXRlcjsgaSsrKSB7XG4gICAgICAgIGF0dHJpYnV0ZSA9IHZlcnRleEJ1ZmZlcnMua2V5c1tpXTtcblxuICAgICAgICAvLyBEbyBub3Qgc2V0IHZlcnRleEF0dHJpYlBvaW50ZXIgaWYgaW5kZXggYnVmZmVyLlxuXG4gICAgICAgIGlmIChhdHRyaWJ1dGUgPT09ICdpbmRpY2VzJykge1xuICAgICAgICAgICAgaiA9IGk7IGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmV0cmVpdmUgdGhlIGF0dHJpYnV0ZSBsb2NhdGlvbiBhbmQgbWFrZSBzdXJlIGl0IGlzIGVuYWJsZWQuXG5cbiAgICAgICAgbG9jYXRpb24gPSB0aGlzLnByb2dyYW0uYXR0cmlidXRlTG9jYXRpb25zW2F0dHJpYnV0ZV07XG5cbiAgICAgICAgaWYgKGxvY2F0aW9uID09PSAtMSkgY29udGludWU7XG4gICAgICAgIGlmIChsb2NhdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBsb2NhdGlvbiA9IGdsLmdldEF0dHJpYkxvY2F0aW9uKHRoaXMucHJvZ3JhbS5wcm9ncmFtLCBhdHRyaWJ1dGUpO1xuICAgICAgICAgICAgdGhpcy5wcm9ncmFtLmF0dHJpYnV0ZUxvY2F0aW9uc1thdHRyaWJ1dGVdID0gbG9jYXRpb247XG4gICAgICAgICAgICBpZiAobG9jYXRpb24gPT09IC0xKSBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdGhpcy5zdGF0ZS5lbmFibGVkQXR0cmlidXRlc1thdHRyaWJ1dGVdKSB7XG4gICAgICAgICAgICBnbC5lbmFibGVWZXJ0ZXhBdHRyaWJBcnJheShsb2NhdGlvbik7XG4gICAgICAgICAgICB0aGlzLnN0YXRlLmVuYWJsZWRBdHRyaWJ1dGVzW2F0dHJpYnV0ZV0gPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZS5lbmFibGVkQXR0cmlidXRlc0tleXMucHVzaChhdHRyaWJ1dGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmV0cmVpdmUgYnVmZmVyIGluZm9ybWF0aW9uIHVzZWQgdG8gc2V0IGF0dHJpYnV0ZSBwb2ludGVyLlxuXG4gICAgICAgIGJ1ZmZlciA9IHZlcnRleEJ1ZmZlcnMudmFsdWVzW2ldO1xuICAgICAgICBzcGFjaW5nID0gdmVydGV4QnVmZmVycy5zcGFjaW5nW2ldO1xuICAgICAgICBvZmZzZXQgPSB2ZXJ0ZXhCdWZmZXJzLm9mZnNldFtpXTtcbiAgICAgICAgbGVuZ3RoID0gdmVydGV4QnVmZmVycy5sZW5ndGhbaV07XG5cbiAgICAgICAgLy8gU2tpcCBiaW5kQnVmZmVyIGlmIGJ1ZmZlciBpcyBjdXJyZW50bHkgYm91bmQuXG5cbiAgICAgICAgaWYgKHRoaXMuc3RhdGUuYm91bmRBcnJheUJ1ZmZlciAhPT0gYnVmZmVyKSB7XG4gICAgICAgICAgICBnbC5iaW5kQnVmZmVyKGJ1ZmZlci50YXJnZXQsIGJ1ZmZlci5idWZmZXIpO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZS5ib3VuZEFycmF5QnVmZmVyID0gYnVmZmVyO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuc3RhdGUubGFzdERyYXduICE9PSBpZCkge1xuICAgICAgICAgICAgZ2wudmVydGV4QXR0cmliUG9pbnRlcihsb2NhdGlvbiwgc3BhY2luZywgZ2wuRkxPQVQsIGdsLkZBTFNFLCAwLCA0ICogb2Zmc2V0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIERpc2FibGUgYW55IGF0dHJpYnV0ZXMgdGhhdCBub3QgY3VycmVudGx5IGJlaW5nIHVzZWQuXG5cbiAgICB2YXIgbGVuID0gdGhpcy5zdGF0ZS5lbmFibGVkQXR0cmlidXRlc0tleXMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICB2YXIga2V5ID0gdGhpcy5zdGF0ZS5lbmFibGVkQXR0cmlidXRlc0tleXNbaV07XG4gICAgICAgIGlmICh0aGlzLnN0YXRlLmVuYWJsZWRBdHRyaWJ1dGVzW2tleV0gJiYgdmVydGV4QnVmZmVycy5rZXlzLmluZGV4T2Yoa2V5KSA9PT0gLTEpIHtcbiAgICAgICAgICAgIGdsLmRpc2FibGVWZXJ0ZXhBdHRyaWJBcnJheSh0aGlzLnByb2dyYW0uYXR0cmlidXRlTG9jYXRpb25zW2tleV0pO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZS5lbmFibGVkQXR0cmlidXRlc1trZXldID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobGVuZ3RoKSB7XG5cbiAgICAgICAgLy8gSWYgaW5kZXggYnVmZmVyLCB1c2UgZHJhd0VsZW1lbnRzLlxuXG4gICAgICAgIGlmIChqICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGJ1ZmZlciA9IHZlcnRleEJ1ZmZlcnMudmFsdWVzW2pdO1xuICAgICAgICAgICAgb2Zmc2V0ID0gdmVydGV4QnVmZmVycy5vZmZzZXRbal07XG4gICAgICAgICAgICBzcGFjaW5nID0gdmVydGV4QnVmZmVycy5zcGFjaW5nW2pdO1xuICAgICAgICAgICAgbGVuZ3RoID0gdmVydGV4QnVmZmVycy5sZW5ndGhbal07XG5cbiAgICAgICAgICAgIC8vIFNraXAgYmluZEJ1ZmZlciBpZiBidWZmZXIgaXMgY3VycmVudGx5IGJvdW5kLlxuXG4gICAgICAgICAgICBpZiAodGhpcy5zdGF0ZS5ib3VuZEVsZW1lbnRCdWZmZXIgIT09IGJ1ZmZlcikge1xuICAgICAgICAgICAgICAgIGdsLmJpbmRCdWZmZXIoYnVmZmVyLnRhcmdldCwgYnVmZmVyLmJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZS5ib3VuZEVsZW1lbnRCdWZmZXIgPSBidWZmZXI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGdsLmRyYXdFbGVtZW50cyhnbFttb2RlXSwgbGVuZ3RoLCBnbC5VTlNJR05FRF9TSE9SVCwgMiAqIG9mZnNldCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBnbC5kcmF3QXJyYXlzKGdsW21vZGVdLCAwLCBsZW5ndGgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5zdGF0ZS5sYXN0RHJhd24gPSBpZDtcbn07XG5cbi8qKlxuICogVXBkYXRlcyB0aGUgd2lkdGggYW5kIGhlaWdodCBvZiBwYXJlbnQgY2FudmFzLCBzZXRzIHRoZSB2aWV3cG9ydCBzaXplIG9uXG4gKiB0aGUgV2ViR0wgY29udGV4dCBhbmQgdXBkYXRlcyB0aGUgcmVzb2x1dGlvbiB1bmlmb3JtIGZvciB0aGUgc2hhZGVyIHByb2dyYW0uXG4gKiBTaXplIGlzIHJldHJlaXZlZCBmcm9tIHRoZSBjb250YWluZXIgb2JqZWN0IG9mIHRoZSByZW5kZXJlci5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtBcnJheX0gc2l6ZSB3aWR0aCwgaGVpZ2h0IGFuZCBkZXB0aCBvZiBjYW52YXNcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS51cGRhdGVTaXplID0gZnVuY3Rpb24gdXBkYXRlU2l6ZShzaXplKSB7XG4gICAgaWYgKHNpemUpIHtcbiAgICAgICAgdGhpcy5jYWNoZWRTaXplWzBdID0gc2l6ZVswXTtcbiAgICAgICAgdGhpcy5jYWNoZWRTaXplWzFdID0gc2l6ZVsxXTtcbiAgICAgICAgdGhpcy5jYWNoZWRTaXplWzJdID0gKHNpemVbMF0gPiBzaXplWzFdKSA/IHNpemVbMF0gOiBzaXplWzFdO1xuICAgIH1cblxuICAgIHRoaXMuZ2wudmlld3BvcnQoMCwgMCwgdGhpcy5jYWNoZWRTaXplWzBdLCB0aGlzLmNhY2hlZFNpemVbMV0pO1xuXG4gICAgdGhpcy5yZXNvbHV0aW9uVmFsdWVzWzBdID0gdGhpcy5jYWNoZWRTaXplO1xuICAgIHRoaXMucHJvZ3JhbS5zZXRVbmlmb3Jtcyh0aGlzLnJlc29sdXRpb25OYW1lLCB0aGlzLnJlc29sdXRpb25WYWx1ZXMpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFVwZGF0ZXMgdGhlIHN0YXRlIG9mIHRoZSBXZWJHTCBkcmF3aW5nIGNvbnRleHQgYmFzZWQgb24gY3VzdG9tIHBhcmFtZXRlcnNcbiAqIGRlZmluZWQgb24gYSBtZXNoLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBEcmF3IHN0YXRlIG9wdGlvbnMgdG8gYmUgc2V0IHRvIHRoZSBjb250ZXh0LlxuICogQHBhcmFtIHtNZXNofSBtZXNoIEFzc29jaWF0ZWQgTWVzaFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLmhhbmRsZU9wdGlvbnMgPSBmdW5jdGlvbiBoYW5kbGVPcHRpb25zKG9wdGlvbnMsIG1lc2gpIHtcbiAgICB2YXIgZ2wgPSB0aGlzLmdsO1xuICAgIGlmICghb3B0aW9ucykgcmV0dXJuO1xuXG4gICAgaWYgKG9wdGlvbnMuc2lkZSA9PT0gJ2RvdWJsZScpIHtcbiAgICAgICAgdGhpcy5nbC5jdWxsRmFjZSh0aGlzLmdsLkZST05UKTtcbiAgICAgICAgdGhpcy5kcmF3QnVmZmVycyh0aGlzLmJ1ZmZlclJlZ2lzdHJ5LnJlZ2lzdHJ5W21lc2guZ2VvbWV0cnldLCBtZXNoLmRyYXdUeXBlLCBtZXNoLmdlb21ldHJ5KTtcbiAgICAgICAgdGhpcy5nbC5jdWxsRmFjZSh0aGlzLmdsLkJBQ0spO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmJsZW5kaW5nKSBnbC5ibGVuZEZ1bmMoZ2wuU1JDX0FMUEhBLCBnbC5PTkUpO1xuICAgIGlmIChvcHRpb25zLnNpZGUgPT09ICdiYWNrJykgZ2wuY3VsbEZhY2UoZ2wuRlJPTlQpO1xufTtcblxuLyoqXG4gKiBSZXNldHMgdGhlIHN0YXRlIG9mIHRoZSBXZWJHTCBkcmF3aW5nIGNvbnRleHQgdG8gZGVmYXVsdCB2YWx1ZXMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIERyYXcgc3RhdGUgb3B0aW9ucyB0byBiZSBzZXQgdG8gdGhlIGNvbnRleHQuXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUucmVzZXRPcHRpb25zID0gZnVuY3Rpb24gcmVzZXRPcHRpb25zKG9wdGlvbnMpIHtcbiAgICB2YXIgZ2wgPSB0aGlzLmdsO1xuICAgIGlmICghb3B0aW9ucykgcmV0dXJuO1xuICAgIGlmIChvcHRpb25zLmJsZW5kaW5nKSBnbC5ibGVuZEZ1bmMoZ2wuU1JDX0FMUEhBLCBnbC5PTkVfTUlOVVNfU1JDX0FMUEhBKTtcbiAgICBpZiAob3B0aW9ucy5zaWRlID09PSAnYmFjaycpIGdsLmN1bGxGYWNlKGdsLkJBQ0spO1xufTtcblxuV2ViR0xSZW5kZXJlci5ERUZBVUxUX1NUWUxFUyA9IHtcbiAgICBwb2ludGVyRXZlbnRzOiAnbm9uZScsXG4gICAgcG9zaXRpb246ICdhYnNvbHV0ZScsXG4gICAgekluZGV4OiAxLFxuICAgIHRvcDogJzBweCcsXG4gICAgbGVmdDogJzBweCdcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gV2ViR0xSZW5kZXJlcjtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciB0eXBlcyA9IHtcbiAgICAxOiAnZmxvYXQgJyxcbiAgICAyOiAndmVjMiAnLFxuICAgIDM6ICd2ZWMzICcsXG4gICAgNDogJ3ZlYzQgJ1xufTtcblxuLyoqXG4gKiBUcmF2ZXJzZXMgbWF0ZXJpYWwgdG8gY3JlYXRlIGEgc3RyaW5nIG9mIGdsc2wgY29kZSB0byBiZSBhcHBsaWVkIGluXG4gKiB0aGUgdmVydGV4IG9yIGZyYWdtZW50IHNoYWRlci5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcHJvdGVjdGVkXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG1hdGVyaWFsIE1hdGVyaWFsIHRvIGJlIGNvbXBpbGVkLlxuICogQHBhcmFtIHtOdW1iZXJ9IHRleHR1cmVTbG90IE5leHQgYXZhaWxhYmxlIHRleHR1cmUgc2xvdCBmb3IgTWVzaC5cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5mdW5jdGlvbiBjb21waWxlTWF0ZXJpYWwobWF0ZXJpYWwsIHRleHR1cmVTbG90KSB7XG4gICAgdmFyIGdsc2wgPSAnJztcbiAgICB2YXIgdW5pZm9ybXMgPSB7fTtcbiAgICB2YXIgdmFyeWluZ3MgPSB7fTtcbiAgICB2YXIgYXR0cmlidXRlcyA9IHt9O1xuICAgIHZhciBkZWZpbmVzID0gW107XG4gICAgdmFyIHRleHR1cmVzID0gW107XG5cbiAgICBfdHJhdmVyc2UobWF0ZXJpYWwsIGZ1bmN0aW9uIChub2RlLCBkZXB0aCkge1xuICAgICAgICBpZiAoISBub2RlLmNodW5rKSByZXR1cm47XG5cbiAgICAgICAgdmFyIHR5cGUgPSB0eXBlc1tfZ2V0T3V0cHV0TGVuZ3RoKG5vZGUpXTtcbiAgICAgICAgdmFyIGxhYmVsID0gX21ha2VMYWJlbChub2RlKTtcbiAgICAgICAgdmFyIG91dHB1dCA9IF9wcm9jZXNzR0xTTChub2RlLmNodW5rLmdsc2wsIG5vZGUuaW5wdXRzLCB0ZXh0dXJlcy5sZW5ndGggKyB0ZXh0dXJlU2xvdCk7XG5cbiAgICAgICAgZ2xzbCArPSB0eXBlICsgbGFiZWwgKyAnID0gJyArIG91dHB1dCArICdcXG4gJztcblxuICAgICAgICBpZiAobm9kZS51bmlmb3JtcykgX2V4dGVuZCh1bmlmb3Jtcywgbm9kZS51bmlmb3Jtcyk7XG4gICAgICAgIGlmIChub2RlLnZhcnlpbmdzKSBfZXh0ZW5kKHZhcnlpbmdzLCBub2RlLnZhcnlpbmdzKTtcbiAgICAgICAgaWYgKG5vZGUuYXR0cmlidXRlcykgX2V4dGVuZChhdHRyaWJ1dGVzLCBub2RlLmF0dHJpYnV0ZXMpO1xuICAgICAgICBpZiAobm9kZS5jaHVuay5kZWZpbmVzKSBkZWZpbmVzLnB1c2gobm9kZS5jaHVuay5kZWZpbmVzKTtcbiAgICAgICAgaWYgKG5vZGUudGV4dHVyZSkgdGV4dHVyZXMucHVzaChub2RlLnRleHR1cmUpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgX2lkOiBtYXRlcmlhbC5faWQsXG4gICAgICAgIGdsc2w6IGdsc2wgKyAncmV0dXJuICcgKyBfbWFrZUxhYmVsKG1hdGVyaWFsKSArICc7JyxcbiAgICAgICAgZGVmaW5lczogZGVmaW5lcy5qb2luKCdcXG4nKSxcbiAgICAgICAgdW5pZm9ybXM6IHVuaWZvcm1zLFxuICAgICAgICB2YXJ5aW5nczogdmFyeWluZ3MsXG4gICAgICAgIGF0dHJpYnV0ZXM6IGF0dHJpYnV0ZXMsXG4gICAgICAgIHRleHR1cmVzOiB0ZXh0dXJlc1xuICAgIH07XG59XG5cbi8vIFJlY3Vyc2l2ZWx5IGl0ZXJhdGVzIG92ZXIgYSBtYXRlcmlhbCdzIGlucHV0cywgaW52b2tpbmcgYSBnaXZlbiBjYWxsYmFja1xuLy8gd2l0aCB0aGUgY3VycmVudCBtYXRlcmlhbFxuZnVuY3Rpb24gX3RyYXZlcnNlKG1hdGVyaWFsLCBjYWxsYmFjaykge1xuXHR2YXIgaW5wdXRzID0gbWF0ZXJpYWwuaW5wdXRzO1xuICAgIHZhciBsZW4gPSBpbnB1dHMgJiYgaW5wdXRzLmxlbmd0aDtcbiAgICB2YXIgaWR4ID0gLTE7XG5cbiAgICB3aGlsZSAoKytpZHggPCBsZW4pIF90cmF2ZXJzZShpbnB1dHNbaWR4XSwgY2FsbGJhY2spO1xuXG4gICAgY2FsbGJhY2sobWF0ZXJpYWwpO1xuXG4gICAgcmV0dXJuIG1hdGVyaWFsO1xufVxuXG4vLyBIZWxwZXIgZnVuY3Rpb24gdXNlZCB0byBpbmZlciBsZW5ndGggb2YgdGhlIG91dHB1dFxuLy8gZnJvbSBhIGdpdmVuIG1hdGVyaWFsIG5vZGUuXG5mdW5jdGlvbiBfZ2V0T3V0cHV0TGVuZ3RoKG5vZGUpIHtcblxuICAgIC8vIEhhbmRsZSBjb25zdGFudCB2YWx1ZXNcblxuICAgIGlmICh0eXBlb2Ygbm9kZSA9PT0gJ251bWJlcicpIHJldHVybiAxO1xuICAgIGlmIChBcnJheS5pc0FycmF5KG5vZGUpKSByZXR1cm4gbm9kZS5sZW5ndGg7XG5cbiAgICAvLyBIYW5kbGUgbWF0ZXJpYWxzXG5cbiAgICB2YXIgb3V0cHV0ID0gbm9kZS5jaHVuay5vdXRwdXQ7XG4gICAgaWYgKHR5cGVvZiBvdXRwdXQgPT09ICdudW1iZXInKSByZXR1cm4gb3V0cHV0O1xuXG4gICAgLy8gSGFuZGxlIHBvbHltb3JwaGljIG91dHB1dFxuXG4gICAgdmFyIGtleSA9IG5vZGUuaW5wdXRzLm1hcChmdW5jdGlvbiByZWN1cnNlKG5vZGUpIHtcbiAgICAgICAgcmV0dXJuIF9nZXRPdXRwdXRMZW5ndGgobm9kZSk7XG4gICAgfSkuam9pbignLCcpO1xuXG4gICAgcmV0dXJuIG91dHB1dFtrZXldO1xufVxuXG4vLyBIZWxwZXIgZnVuY3Rpb24gdG8gcnVuIHJlcGxhY2UgaW5wdXRzIGFuZCB0ZXh0dXJlIHRhZ3Mgd2l0aFxuLy8gY29ycmVjdCBnbHNsLlxuZnVuY3Rpb24gX3Byb2Nlc3NHTFNMKHN0ciwgaW5wdXRzLCB0ZXh0dXJlU2xvdCkge1xuICAgIHJldHVybiBzdHJcbiAgICAgICAgLnJlcGxhY2UoLyVcXGQvZywgZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgIHJldHVybiBfbWFrZUxhYmVsKGlucHV0c1tzWzFdLTFdKTtcbiAgICAgICAgfSlcbiAgICAgICAgLnJlcGxhY2UoL1xcJFRFWFRVUkUvLCAndV90ZXh0dXJlc1snICsgdGV4dHVyZVNsb3QgKyAnXScpO1xufVxuXG4vLyBIZWxwZXIgZnVuY3Rpb24gdXNlZCB0byBjcmVhdGUgZ2xzbCBkZWZpbml0aW9uIG9mIHRoZVxuLy8gaW5wdXQgbWF0ZXJpYWwgbm9kZS5cbmZ1bmN0aW9uIF9tYWtlTGFiZWwgKG4pIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShuKSkgcmV0dXJuIF9hcnJheVRvVmVjKG4pO1xuICAgIGlmICh0eXBlb2YgbiA9PT0gJ29iamVjdCcpIHJldHVybiAnZmFfJyArIChuLl9pZCk7XG4gICAgZWxzZSByZXR1cm4gbi50b0ZpeGVkKDYpO1xufVxuXG4vLyBIZWxwZXIgdG8gY29weSB0aGUgcHJvcGVydGllcyBvZiBhbiBvYmplY3Qgb250byBhbm90aGVyIG9iamVjdC5cbmZ1bmN0aW9uIF9leHRlbmQgKGEsIGIpIHtcblx0Zm9yICh2YXIgayBpbiBiKSBhW2tdID0gYltrXTtcbn1cblxuLy8gSGVscGVyIHRvIGNyZWF0ZSBnbHNsIHZlY3RvciByZXByZXNlbnRhdGlvbiBvZiBhIGphdmFzY3JpcHQgYXJyYXkuXG5mdW5jdGlvbiBfYXJyYXlUb1ZlYyhhcnJheSkge1xuICAgIHZhciBsZW4gPSBhcnJheS5sZW5ndGg7XG4gICAgcmV0dXJuICd2ZWMnICsgbGVuICsgJygnICsgYXJyYXkuam9pbignLCcpICArICcpJztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjb21waWxlTWF0ZXJpYWw7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8vIEdlbmVyYXRlcyBhIGNoZWNrZXJib2FyZCBwYXR0ZXJuIHRvIGJlIHVzZWQgYXMgYSBwbGFjZWhvbGRlciB0ZXh0dXJlIHdoaWxlIGFuXG4vLyBpbWFnZSBsb2FkcyBvdmVyIHRoZSBuZXR3b3JrLlxuZnVuY3Rpb24gY3JlYXRlQ2hlY2tlckJvYXJkKCkge1xuICAgIHZhciBjb250ZXh0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJykuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICBjb250ZXh0LmNhbnZhcy53aWR0aCA9IGNvbnRleHQuY2FudmFzLmhlaWdodCA9IDEyODtcbiAgICBmb3IgKHZhciB5ID0gMDsgeSA8IGNvbnRleHQuY2FudmFzLmhlaWdodDsgeSArPSAxNikge1xuICAgICAgICBmb3IgKHZhciB4ID0gMDsgeCA8IGNvbnRleHQuY2FudmFzLndpZHRoOyB4ICs9IDE2KSB7XG4gICAgICAgICAgICBjb250ZXh0LmZpbGxTdHlsZSA9ICh4IF4geSkgJiAxNiA/ICcjRkZGJyA6ICcjREREJztcbiAgICAgICAgICAgIGNvbnRleHQuZmlsbFJlY3QoeCwgeSwgMTYsIDE2KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBjb250ZXh0LmNhbnZhcztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVDaGVja2VyQm9hcmQ7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgcmFkaXhCaXRzID0gMTEsXG4gICAgbWF4UmFkaXggPSAxIDw8IChyYWRpeEJpdHMpLFxuICAgIHJhZGl4TWFzayA9IG1heFJhZGl4IC0gMSxcbiAgICBidWNrZXRzID0gbmV3IEFycmF5KG1heFJhZGl4ICogTWF0aC5jZWlsKDY0IC8gcmFkaXhCaXRzKSksXG4gICAgbXNiTWFzayA9IDEgPDwgKCgzMiAtIDEpICUgcmFkaXhCaXRzKSxcbiAgICBsYXN0TWFzayA9IChtc2JNYXNrIDw8IDEpIC0gMSxcbiAgICBwYXNzQ291bnQgPSAoKDMyIC8gcmFkaXhCaXRzKSArIDAuOTk5OTk5OTk5OTk5OTk5KSB8IDAsXG4gICAgbWF4T2Zmc2V0ID0gbWF4UmFkaXggKiAocGFzc0NvdW50IC0gMSksXG4gICAgbm9ybWFsaXplciA9IE1hdGgucG93KDIwLCA2KTtcblxudmFyIGJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcig0KTtcbnZhciBmbG9hdFZpZXcgPSBuZXcgRmxvYXQzMkFycmF5KGJ1ZmZlciwgMCwgMSk7XG52YXIgaW50VmlldyA9IG5ldyBJbnQzMkFycmF5KGJ1ZmZlciwgMCwgMSk7XG5cbi8vIGNvbXBhcmF0b3IgcHVsbHMgcmVsZXZhbnQgc29ydGluZyBrZXlzIG91dCBvZiBtZXNoXG5mdW5jdGlvbiBjb21wKGxpc3QsIHJlZ2lzdHJ5LCBpKSB7XG4gICAgdmFyIGtleSA9IGxpc3RbaV07XG4gICAgdmFyIGl0ZW0gPSByZWdpc3RyeVtrZXldO1xuICAgIHJldHVybiAoaXRlbS5kZXB0aCA/IGl0ZW0uZGVwdGggOiByZWdpc3RyeVtrZXldLnVuaWZvcm1WYWx1ZXNbMV1bMTRdKSArIG5vcm1hbGl6ZXI7XG59XG5cbi8vbXV0YXRvciBmdW5jdGlvbiByZWNvcmRzIG1lc2gncyBwbGFjZSBpbiBwcmV2aW91cyBwYXNzXG5mdW5jdGlvbiBtdXRhdG9yKGxpc3QsIHJlZ2lzdHJ5LCBpLCB2YWx1ZSkge1xuICAgIHZhciBrZXkgPSBsaXN0W2ldO1xuICAgIHJlZ2lzdHJ5W2tleV0uZGVwdGggPSBpbnRUb0Zsb2F0KHZhbHVlKSAtIG5vcm1hbGl6ZXI7XG4gICAgcmV0dXJuIGtleTtcbn1cblxuLy9jbGVhbiBmdW5jdGlvbiByZW1vdmVzIG11dGF0b3IgZnVuY3Rpb24ncyByZWNvcmRcbmZ1bmN0aW9uIGNsZWFuKGxpc3QsIHJlZ2lzdHJ5LCBpKSB7XG4gICAgcmVnaXN0cnlbbGlzdFtpXV0uZGVwdGggPSBudWxsO1xufVxuXG4vL2NvbnZlcnRzIGEgamF2YXNjcmlwdCBmbG9hdCB0byBhIDMyYml0IGludGVnZXIgdXNpbmcgYW4gYXJyYXkgYnVmZmVyXG4vL29mIHNpemUgb25lXG5mdW5jdGlvbiBmbG9hdFRvSW50KGspIHtcbiAgICBmbG9hdFZpZXdbMF0gPSBrO1xuICAgIHJldHVybiBpbnRWaWV3WzBdO1xufVxuLy9jb252ZXJ0cyBhIDMyIGJpdCBpbnRlZ2VyIHRvIGEgcmVndWxhciBqYXZhc2NyaXB0IGZsb2F0IHVzaW5nIGFuIGFycmF5IGJ1ZmZlclxuLy9vZiBzaXplIG9uZVxuZnVuY3Rpb24gaW50VG9GbG9hdChrKSB7XG4gICAgaW50Vmlld1swXSA9IGs7XG4gICAgcmV0dXJuIGZsb2F0Vmlld1swXTtcbn1cblxuLy9zb3J0cyBhIGxpc3Qgb2YgbWVzaCBJRHMgYWNjb3JkaW5nIHRvIHRoZWlyIHotZGVwdGhcbmZ1bmN0aW9uIHJhZGl4U29ydChsaXN0LCByZWdpc3RyeSkge1xuICAgIHZhciBwYXNzID0gMDtcbiAgICB2YXIgb3V0ID0gW107XG5cbiAgICB2YXIgaSwgaiwgaywgbiwgZGl2LCBvZmZzZXQsIHN3YXAsIGlkLCBzdW0sIHRzdW0sIHNpemU7XG5cbiAgICBwYXNzQ291bnQgPSAoKDMyIC8gcmFkaXhCaXRzKSArIDAuOTk5OTk5OTk5OTk5OTk5KSB8IDA7XG5cbiAgICBmb3IgKGkgPSAwLCBuID0gbWF4UmFkaXggKiBwYXNzQ291bnQ7IGkgPCBuOyBpKyspIGJ1Y2tldHNbaV0gPSAwO1xuXG4gICAgZm9yIChpID0gMCwgbiA9IGxpc3QubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIGRpdiA9IGZsb2F0VG9JbnQoY29tcChsaXN0LCByZWdpc3RyeSwgaSkpO1xuICAgICAgICBkaXYgXj0gZGl2ID4+IDMxIHwgMHg4MDAwMDAwMDtcbiAgICAgICAgZm9yIChqID0gMCwgayA9IDA7IGogPCBtYXhPZmZzZXQ7IGogKz0gbWF4UmFkaXgsIGsgKz0gcmFkaXhCaXRzKSB7XG4gICAgICAgICAgICBidWNrZXRzW2ogKyAoZGl2ID4+PiBrICYgcmFkaXhNYXNrKV0rKztcbiAgICAgICAgfVxuICAgICAgICBidWNrZXRzW2ogKyAoZGl2ID4+PiBrICYgbGFzdE1hc2spXSsrO1xuICAgIH1cblxuICAgIGZvciAoaiA9IDA7IGogPD0gbWF4T2Zmc2V0OyBqICs9IG1heFJhZGl4KSB7XG4gICAgICAgIGZvciAoaWQgPSBqLCBzdW0gPSAwOyBpZCA8IGogKyBtYXhSYWRpeDsgaWQrKykge1xuICAgICAgICAgICAgdHN1bSA9IGJ1Y2tldHNbaWRdICsgc3VtO1xuICAgICAgICAgICAgYnVja2V0c1tpZF0gPSBzdW0gLSAxO1xuICAgICAgICAgICAgc3VtID0gdHN1bTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoLS1wYXNzQ291bnQpIHtcbiAgICAgICAgZm9yIChpID0gMCwgbiA9IGxpc3QubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgICBkaXYgPSBmbG9hdFRvSW50KGNvbXAobGlzdCwgcmVnaXN0cnksIGkpKTtcbiAgICAgICAgICAgIG91dFsrK2J1Y2tldHNbZGl2ICYgcmFkaXhNYXNrXV0gPSBtdXRhdG9yKGxpc3QsIHJlZ2lzdHJ5LCBpLCBkaXYgXj0gZGl2ID4+IDMxIHwgMHg4MDAwMDAwMCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHN3YXAgPSBvdXQ7XG4gICAgICAgIG91dCA9IGxpc3Q7XG4gICAgICAgIGxpc3QgPSBzd2FwO1xuICAgICAgICB3aGlsZSAoKytwYXNzIDwgcGFzc0NvdW50KSB7XG4gICAgICAgICAgICBmb3IgKGkgPSAwLCBuID0gbGlzdC5sZW5ndGgsIG9mZnNldCA9IHBhc3MgKiBtYXhSYWRpeCwgc2l6ZSA9IHBhc3MgKiByYWRpeEJpdHM7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgICAgICAgICBkaXYgPSBmbG9hdFRvSW50KGNvbXAobGlzdCwgcmVnaXN0cnksIGkpKTtcbiAgICAgICAgICAgICAgICBvdXRbKytidWNrZXRzW29mZnNldCArIChkaXYgPj4+IHNpemUgJiByYWRpeE1hc2spXV0gPSBsaXN0W2ldO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzd2FwID0gb3V0O1xuICAgICAgICAgICAgb3V0ID0gbGlzdDtcbiAgICAgICAgICAgIGxpc3QgPSBzd2FwO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZm9yIChpID0gMCwgbiA9IGxpc3QubGVuZ3RoLCBvZmZzZXQgPSBwYXNzICogbWF4UmFkaXgsIHNpemUgPSBwYXNzICogcmFkaXhCaXRzOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIGRpdiA9IGZsb2F0VG9JbnQoY29tcChsaXN0LCByZWdpc3RyeSwgaSkpO1xuICAgICAgICBvdXRbKytidWNrZXRzW29mZnNldCArIChkaXYgPj4+IHNpemUgJiBsYXN0TWFzayldXSA9IG11dGF0b3IobGlzdCwgcmVnaXN0cnksIGksIGRpdiBeICh+ZGl2ID4+IDMxIHwgMHg4MDAwMDAwMCkpO1xuICAgICAgICBjbGVhbihsaXN0LCByZWdpc3RyeSwgaSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSByYWRpeFNvcnQ7XG4iLCJcInVzZSBzdHJpY3RcIjtcbnZhciBnbHNsaWZ5ID0gcmVxdWlyZShcImdsc2xpZnlcIik7XG52YXIgc2hhZGVycyA9IHJlcXVpcmUoXCJnbHNsaWZ5L3NpbXBsZS1hZGFwdGVyLmpzXCIpKFwiXFxuI2RlZmluZSBHTFNMSUZZIDFcXG5cXG5tYXQzIGFfeF9nZXROb3JtYWxNYXRyaXgoaW4gbWF0NCB0KSB7XFxuICBtYXQzIG1hdE5vcm07XFxuICBtYXQ0IGEgPSB0O1xcbiAgZmxvYXQgYTAwID0gYVswXVswXSwgYTAxID0gYVswXVsxXSwgYTAyID0gYVswXVsyXSwgYTAzID0gYVswXVszXSwgYTEwID0gYVsxXVswXSwgYTExID0gYVsxXVsxXSwgYTEyID0gYVsxXVsyXSwgYTEzID0gYVsxXVszXSwgYTIwID0gYVsyXVswXSwgYTIxID0gYVsyXVsxXSwgYTIyID0gYVsyXVsyXSwgYTIzID0gYVsyXVszXSwgYTMwID0gYVszXVswXSwgYTMxID0gYVszXVsxXSwgYTMyID0gYVszXVsyXSwgYTMzID0gYVszXVszXSwgYjAwID0gYTAwICogYTExIC0gYTAxICogYTEwLCBiMDEgPSBhMDAgKiBhMTIgLSBhMDIgKiBhMTAsIGIwMiA9IGEwMCAqIGExMyAtIGEwMyAqIGExMCwgYjAzID0gYTAxICogYTEyIC0gYTAyICogYTExLCBiMDQgPSBhMDEgKiBhMTMgLSBhMDMgKiBhMTEsIGIwNSA9IGEwMiAqIGExMyAtIGEwMyAqIGExMiwgYjA2ID0gYTIwICogYTMxIC0gYTIxICogYTMwLCBiMDcgPSBhMjAgKiBhMzIgLSBhMjIgKiBhMzAsIGIwOCA9IGEyMCAqIGEzMyAtIGEyMyAqIGEzMCwgYjA5ID0gYTIxICogYTMyIC0gYTIyICogYTMxLCBiMTAgPSBhMjEgKiBhMzMgLSBhMjMgKiBhMzEsIGIxMSA9IGEyMiAqIGEzMyAtIGEyMyAqIGEzMiwgZGV0ID0gYjAwICogYjExIC0gYjAxICogYjEwICsgYjAyICogYjA5ICsgYjAzICogYjA4IC0gYjA0ICogYjA3ICsgYjA1ICogYjA2O1xcbiAgZGV0ID0gMS4wIC8gZGV0O1xcbiAgbWF0Tm9ybVswXVswXSA9IChhMTEgKiBiMTEgLSBhMTIgKiBiMTAgKyBhMTMgKiBiMDkpICogZGV0O1xcbiAgbWF0Tm9ybVswXVsxXSA9IChhMTIgKiBiMDggLSBhMTAgKiBiMTEgLSBhMTMgKiBiMDcpICogZGV0O1xcbiAgbWF0Tm9ybVswXVsyXSA9IChhMTAgKiBiMTAgLSBhMTEgKiBiMDggKyBhMTMgKiBiMDYpICogZGV0O1xcbiAgbWF0Tm9ybVsxXVswXSA9IChhMDIgKiBiMTAgLSBhMDEgKiBiMTEgLSBhMDMgKiBiMDkpICogZGV0O1xcbiAgbWF0Tm9ybVsxXVsxXSA9IChhMDAgKiBiMTEgLSBhMDIgKiBiMDggKyBhMDMgKiBiMDcpICogZGV0O1xcbiAgbWF0Tm9ybVsxXVsyXSA9IChhMDEgKiBiMDggLSBhMDAgKiBiMTAgLSBhMDMgKiBiMDYpICogZGV0O1xcbiAgbWF0Tm9ybVsyXVswXSA9IChhMzEgKiBiMDUgLSBhMzIgKiBiMDQgKyBhMzMgKiBiMDMpICogZGV0O1xcbiAgbWF0Tm9ybVsyXVsxXSA9IChhMzIgKiBiMDIgLSBhMzAgKiBiMDUgLSBhMzMgKiBiMDEpICogZGV0O1xcbiAgbWF0Tm9ybVsyXVsyXSA9IChhMzAgKiBiMDQgLSBhMzEgKiBiMDIgKyBhMzMgKiBiMDApICogZGV0O1xcbiAgcmV0dXJuIG1hdE5vcm07XFxufVxcbmZsb2F0IGJfeF9pbnZlcnNlKGZsb2F0IG0pIHtcXG4gIHJldHVybiAxLjAgLyBtO1xcbn1cXG5tYXQyIGJfeF9pbnZlcnNlKG1hdDIgbSkge1xcbiAgcmV0dXJuIG1hdDIobVsxXVsxXSwgLW1bMF1bMV0sIC1tWzFdWzBdLCBtWzBdWzBdKSAvIChtWzBdWzBdICogbVsxXVsxXSAtIG1bMF1bMV0gKiBtWzFdWzBdKTtcXG59XFxubWF0MyBiX3hfaW52ZXJzZShtYXQzIG0pIHtcXG4gIGZsb2F0IGEwMCA9IG1bMF1bMF0sIGEwMSA9IG1bMF1bMV0sIGEwMiA9IG1bMF1bMl07XFxuICBmbG9hdCBhMTAgPSBtWzFdWzBdLCBhMTEgPSBtWzFdWzFdLCBhMTIgPSBtWzFdWzJdO1xcbiAgZmxvYXQgYTIwID0gbVsyXVswXSwgYTIxID0gbVsyXVsxXSwgYTIyID0gbVsyXVsyXTtcXG4gIGZsb2F0IGIwMSA9IGEyMiAqIGExMSAtIGExMiAqIGEyMTtcXG4gIGZsb2F0IGIxMSA9IC1hMjIgKiBhMTAgKyBhMTIgKiBhMjA7XFxuICBmbG9hdCBiMjEgPSBhMjEgKiBhMTAgLSBhMTEgKiBhMjA7XFxuICBmbG9hdCBkZXQgPSBhMDAgKiBiMDEgKyBhMDEgKiBiMTEgKyBhMDIgKiBiMjE7XFxuICByZXR1cm4gbWF0MyhiMDEsICgtYTIyICogYTAxICsgYTAyICogYTIxKSwgKGExMiAqIGEwMSAtIGEwMiAqIGExMSksIGIxMSwgKGEyMiAqIGEwMCAtIGEwMiAqIGEyMCksICgtYTEyICogYTAwICsgYTAyICogYTEwKSwgYjIxLCAoLWEyMSAqIGEwMCArIGEwMSAqIGEyMCksIChhMTEgKiBhMDAgLSBhMDEgKiBhMTApKSAvIGRldDtcXG59XFxubWF0NCBiX3hfaW52ZXJzZShtYXQ0IG0pIHtcXG4gIGZsb2F0IGEwMCA9IG1bMF1bMF0sIGEwMSA9IG1bMF1bMV0sIGEwMiA9IG1bMF1bMl0sIGEwMyA9IG1bMF1bM10sIGExMCA9IG1bMV1bMF0sIGExMSA9IG1bMV1bMV0sIGExMiA9IG1bMV1bMl0sIGExMyA9IG1bMV1bM10sIGEyMCA9IG1bMl1bMF0sIGEyMSA9IG1bMl1bMV0sIGEyMiA9IG1bMl1bMl0sIGEyMyA9IG1bMl1bM10sIGEzMCA9IG1bM11bMF0sIGEzMSA9IG1bM11bMV0sIGEzMiA9IG1bM11bMl0sIGEzMyA9IG1bM11bM10sIGIwMCA9IGEwMCAqIGExMSAtIGEwMSAqIGExMCwgYjAxID0gYTAwICogYTEyIC0gYTAyICogYTEwLCBiMDIgPSBhMDAgKiBhMTMgLSBhMDMgKiBhMTAsIGIwMyA9IGEwMSAqIGExMiAtIGEwMiAqIGExMSwgYjA0ID0gYTAxICogYTEzIC0gYTAzICogYTExLCBiMDUgPSBhMDIgKiBhMTMgLSBhMDMgKiBhMTIsIGIwNiA9IGEyMCAqIGEzMSAtIGEyMSAqIGEzMCwgYjA3ID0gYTIwICogYTMyIC0gYTIyICogYTMwLCBiMDggPSBhMjAgKiBhMzMgLSBhMjMgKiBhMzAsIGIwOSA9IGEyMSAqIGEzMiAtIGEyMiAqIGEzMSwgYjEwID0gYTIxICogYTMzIC0gYTIzICogYTMxLCBiMTEgPSBhMjIgKiBhMzMgLSBhMjMgKiBhMzIsIGRldCA9IGIwMCAqIGIxMSAtIGIwMSAqIGIxMCArIGIwMiAqIGIwOSArIGIwMyAqIGIwOCAtIGIwNCAqIGIwNyArIGIwNSAqIGIwNjtcXG4gIHJldHVybiBtYXQ0KGExMSAqIGIxMSAtIGExMiAqIGIxMCArIGExMyAqIGIwOSwgYTAyICogYjEwIC0gYTAxICogYjExIC0gYTAzICogYjA5LCBhMzEgKiBiMDUgLSBhMzIgKiBiMDQgKyBhMzMgKiBiMDMsIGEyMiAqIGIwNCAtIGEyMSAqIGIwNSAtIGEyMyAqIGIwMywgYTEyICogYjA4IC0gYTEwICogYjExIC0gYTEzICogYjA3LCBhMDAgKiBiMTEgLSBhMDIgKiBiMDggKyBhMDMgKiBiMDcsIGEzMiAqIGIwMiAtIGEzMCAqIGIwNSAtIGEzMyAqIGIwMSwgYTIwICogYjA1IC0gYTIyICogYjAyICsgYTIzICogYjAxLCBhMTAgKiBiMTAgLSBhMTEgKiBiMDggKyBhMTMgKiBiMDYsIGEwMSAqIGIwOCAtIGEwMCAqIGIxMCAtIGEwMyAqIGIwNiwgYTMwICogYjA0IC0gYTMxICogYjAyICsgYTMzICogYjAwLCBhMjEgKiBiMDIgLSBhMjAgKiBiMDQgLSBhMjMgKiBiMDAsIGExMSAqIGIwNyAtIGExMCAqIGIwOSAtIGExMiAqIGIwNiwgYTAwICogYjA5IC0gYTAxICogYjA3ICsgYTAyICogYjA2LCBhMzEgKiBiMDEgLSBhMzAgKiBiMDMgLSBhMzIgKiBiMDAsIGEyMCAqIGIwMyAtIGEyMSAqIGIwMSArIGEyMiAqIGIwMCkgLyBkZXQ7XFxufVxcbmZsb2F0IGNfeF90cmFuc3Bvc2UoZmxvYXQgbSkge1xcbiAgcmV0dXJuIG07XFxufVxcbm1hdDIgY194X3RyYW5zcG9zZShtYXQyIG0pIHtcXG4gIHJldHVybiBtYXQyKG1bMF1bMF0sIG1bMV1bMF0sIG1bMF1bMV0sIG1bMV1bMV0pO1xcbn1cXG5tYXQzIGNfeF90cmFuc3Bvc2UobWF0MyBtKSB7XFxuICByZXR1cm4gbWF0MyhtWzBdWzBdLCBtWzFdWzBdLCBtWzJdWzBdLCBtWzBdWzFdLCBtWzFdWzFdLCBtWzJdWzFdLCBtWzBdWzJdLCBtWzFdWzJdLCBtWzJdWzJdKTtcXG59XFxubWF0NCBjX3hfdHJhbnNwb3NlKG1hdDQgbSkge1xcbiAgcmV0dXJuIG1hdDQobVswXVswXSwgbVsxXVswXSwgbVsyXVswXSwgbVszXVswXSwgbVswXVsxXSwgbVsxXVsxXSwgbVsyXVsxXSwgbVszXVsxXSwgbVswXVsyXSwgbVsxXVsyXSwgbVsyXVsyXSwgbVszXVsyXSwgbVswXVszXSwgbVsxXVszXSwgbVsyXVszXSwgbVszXVszXSk7XFxufVxcbnZlYzQgYXBwbHlUcmFuc2Zvcm0odmVjNCBwb3MpIHtcXG4gIG1hdDQgTVZNYXRyaXggPSB1X3ZpZXcgKiB1X3RyYW5zZm9ybTtcXG4gIHBvcy54ICs9IDEuMDtcXG4gIHBvcy55IC09IDEuMDtcXG4gIHBvcy54eXogKj0gdV9zaXplICogMC41O1xcbiAgcG9zLnkgKj0gLTEuMDtcXG4gIHZfcG9zaXRpb24gPSAoTVZNYXRyaXggKiBwb3MpLnh5ejtcXG4gIHZfZXllVmVjdG9yID0gKHVfcmVzb2x1dGlvbiAqIDAuNSkgLSB2X3Bvc2l0aW9uO1xcbiAgcG9zID0gdV9wZXJzcGVjdGl2ZSAqIE1WTWF0cml4ICogcG9zO1xcbiAgcmV0dXJuIHBvcztcXG59XFxuI3ZlcnRfZGVmaW5pdGlvbnNcXG5cXG52ZWMzIGNhbGN1bGF0ZU9mZnNldCh2ZWMzIElEKSB7XFxuICBcXG4gICN2ZXJ0X2FwcGxpY2F0aW9uc1xcbiAgcmV0dXJuIHZlYzMoMC4wKTtcXG59XFxudm9pZCBtYWluKCkge1xcbiAgdl90ZXh0dXJlQ29vcmRpbmF0ZSA9IGFfdGV4Q29vcmQ7XFxuICB2ZWMzIGludmVydGVkTm9ybWFscyA9IGFfbm9ybWFscyArICh1X25vcm1hbHMueCA8IDAuMCA/IGNhbGN1bGF0ZU9mZnNldCh1X25vcm1hbHMpICogMi4wIC0gMS4wIDogdmVjMygwLjApKTtcXG4gIGludmVydGVkTm9ybWFscy55ICo9IC0xLjA7XFxuICB2X25vcm1hbCA9IGNfeF90cmFuc3Bvc2UobWF0MyhiX3hfaW52ZXJzZSh1X3RyYW5zZm9ybSkpKSAqIGludmVydGVkTm9ybWFscztcXG4gIHZlYzMgb2Zmc2V0UG9zID0gYV9wb3MgKyBjYWxjdWxhdGVPZmZzZXQodV9wb3NpdGlvbk9mZnNldCk7XFxuICBnbF9Qb3NpdGlvbiA9IGFwcGx5VHJhbnNmb3JtKHZlYzQob2Zmc2V0UG9zLCAxLjApKTtcXG59XCIsIFwiXFxuI2RlZmluZSBHTFNMSUZZIDFcXG5cXG4jZmxvYXRfZGVmaW5pdGlvbnNcXG5cXG5mbG9hdCBhX3hfYXBwbHlNYXRlcmlhbChmbG9hdCBJRCkge1xcbiAgXFxuICAjZmxvYXRfYXBwbGljYXRpb25zXFxuICByZXR1cm4gMS47XFxufVxcbiN2ZWMzX2RlZmluaXRpb25zXFxuXFxudmVjMyBhX3hfYXBwbHlNYXRlcmlhbCh2ZWMzIElEKSB7XFxuICBcXG4gICN2ZWMzX2FwcGxpY2F0aW9uc1xcbiAgcmV0dXJuIHZlYzMoMCk7XFxufVxcbiN2ZWM0X2RlZmluaXRpb25zXFxuXFxudmVjNCBhX3hfYXBwbHlNYXRlcmlhbCh2ZWM0IElEKSB7XFxuICBcXG4gICN2ZWM0X2FwcGxpY2F0aW9uc1xcbiAgcmV0dXJuIHZlYzQoMCk7XFxufVxcbnZlYzQgYl94X2FwcGx5TGlnaHQoaW4gdmVjNCBiYXNlQ29sb3IsIGluIHZlYzMgbm9ybWFsLCBpbiB2ZWM0IGdsb3NzaW5lc3MpIHtcXG4gIGludCBudW1MaWdodHMgPSBpbnQodV9udW1MaWdodHMpO1xcbiAgdmVjMyBhbWJpZW50Q29sb3IgPSB1X2FtYmllbnRMaWdodCAqIGJhc2VDb2xvci5yZ2I7XFxuICB2ZWMzIGV5ZVZlY3RvciA9IG5vcm1hbGl6ZSh2X2V5ZVZlY3Rvcik7XFxuICB2ZWMzIGRpZmZ1c2UgPSB2ZWMzKDAuMCk7XFxuICBib29sIGhhc0dsb3NzaW5lc3MgPSBnbG9zc2luZXNzLmEgPiAwLjA7XFxuICBib29sIGhhc1NwZWN1bGFyQ29sb3IgPSBsZW5ndGgoZ2xvc3NpbmVzcy5yZ2IpID4gMC4wO1xcbiAgZm9yKGludCBpID0gMDsgaSA8IDQ7IGkrKykge1xcbiAgICBpZihpID49IG51bUxpZ2h0cylcXG4gICAgICBicmVhaztcXG4gICAgdmVjMyBsaWdodERpcmVjdGlvbiA9IG5vcm1hbGl6ZSh1X2xpZ2h0UG9zaXRpb25baV0ueHl6IC0gdl9wb3NpdGlvbik7XFxuICAgIGZsb2F0IGxhbWJlcnRpYW4gPSBtYXgoZG90KGxpZ2h0RGlyZWN0aW9uLCBub3JtYWwpLCAwLjApO1xcbiAgICBpZihsYW1iZXJ0aWFuID4gMC4wKSB7XFxuICAgICAgZGlmZnVzZSArPSB1X2xpZ2h0Q29sb3JbaV0ucmdiICogYmFzZUNvbG9yLnJnYiAqIGxhbWJlcnRpYW47XFxuICAgICAgaWYoaGFzR2xvc3NpbmVzcykge1xcbiAgICAgICAgdmVjMyBoYWxmVmVjdG9yID0gbm9ybWFsaXplKGxpZ2h0RGlyZWN0aW9uICsgZXllVmVjdG9yKTtcXG4gICAgICAgIGZsb2F0IHNwZWN1bGFyV2VpZ2h0ID0gcG93KG1heChkb3QoaGFsZlZlY3Rvciwgbm9ybWFsKSwgMC4wKSwgZ2xvc3NpbmVzcy5hKTtcXG4gICAgICAgIHZlYzMgc3BlY3VsYXJDb2xvciA9IGhhc1NwZWN1bGFyQ29sb3IgPyBnbG9zc2luZXNzLnJnYiA6IHVfbGlnaHRDb2xvcltpXS5yZ2I7XFxuICAgICAgICBkaWZmdXNlICs9IHNwZWN1bGFyQ29sb3IgKiBzcGVjdWxhcldlaWdodCAqIGxhbWJlcnRpYW47XFxuICAgICAgfVxcbiAgICB9XFxuICB9XFxuICByZXR1cm4gdmVjNChhbWJpZW50Q29sb3IgKyBkaWZmdXNlLCBiYXNlQ29sb3IuYSk7XFxufVxcbnZvaWQgbWFpbigpIHtcXG4gIHZlYzQgbWF0ZXJpYWwgPSB1X2Jhc2VDb2xvci5yID49IDAuMCA/IHVfYmFzZUNvbG9yIDogYV94X2FwcGx5TWF0ZXJpYWwodV9iYXNlQ29sb3IpO1xcbiAgYm9vbCBsaWdodHNFbmFibGVkID0gKHVfZmxhdFNoYWRpbmcgPT0gMC4wKSAmJiAodV9udW1MaWdodHMgPiAwLjAgfHwgbGVuZ3RoKHVfYW1iaWVudExpZ2h0KSA+IDAuMCk7XFxuICB2ZWMzIG5vcm1hbCA9IG5vcm1hbGl6ZSh2X25vcm1hbCk7XFxuICB2ZWM0IGdsb3NzaW5lc3MgPSB1X2dsb3NzaW5lc3MueCA8IDAuMCA/IGFfeF9hcHBseU1hdGVyaWFsKHVfZ2xvc3NpbmVzcykgOiB1X2dsb3NzaW5lc3M7XFxuICB2ZWM0IGNvbG9yID0gbGlnaHRzRW5hYmxlZCA/IGJfeF9hcHBseUxpZ2h0KG1hdGVyaWFsLCBub3JtYWxpemUodl9ub3JtYWwpLCBnbG9zc2luZXNzKSA6IG1hdGVyaWFsO1xcbiAgZ2xfRnJhZ0NvbG9yID0gY29sb3I7XFxuICBnbF9GcmFnQ29sb3IuYSAqPSB1X29wYWNpdHk7XFxufVwiLCBbXSwgW10pO1xubW9kdWxlLmV4cG9ydHMgPSBzaGFkZXJzOyIsInZhciBOb2RlID0gcmVxdWlyZSgnZmFtb3VzL2NvcmUvTm9kZScpO1xuXG5mdW5jdGlvbiBUd2l0dGVydXMobW91bnQpIHtcbiAgICAvLyBFeHRlbmQgTm9kZVxuICAgIE5vZGUuY2FsbCh0aGlzKTtcblxuICAgIG1ha2VIZWFkZXIodGhpcyk7XG4gICAgbWFrZUZvb3Rlcih0aGlzKTtcbiAgICBtYWtlU3dhcHBlcih0aGlzKTtcbn1cblxuLy8gRXh0ZW5kIHRoZSBwcm90b3R5cGVcblR3aXR0ZXJ1cy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE5vZGUucHJvdG90eXBlKTtcblxuZnVuY3Rpb24gbWFrZUhlYWRlcihub2RlKSB7XG4gICAgLy8gdGhlIGhlYWRlciB3aWxsIGJlIHBvc2l0aW9uZWQgZGVmYXVsdGx5XG4gICAgLy8gYWxvbmcgdGhlIHRvcCBvZiBpdHMgcGFyZW50LlxuICAgIC8vIEl0IHdpbGwgYmUgdGhlIGNvbXBsZXRlIHdpZHRoIG9mIGl0cyBwYXJlbnRcbiAgICAvLyBhbmQgMTAwIHBpeGVscyB0YWxsLlxuICAgIG5vZGUuYWRkQ2hpbGQoKVxuICAgICAgICAuc2V0U2l6ZU1vZGUoJ2RlZmF1bHQnLCAnYWJzb2x1dGUnKVxuICAgICAgICAuc2V0QWJzb2x1dGVTaXplKG51bGwsIDEwMClcbiAgICAgICAgLmFkZENoaWxkKCk7XG59XG5cbmZ1bmN0aW9uIG1ha2VTd2FwcGVyKG5vZGUpIHtcbiAgICAvLyB0aGUgc3dhcHBlciB3aWxsIGJlIDIwMCBwaXhlbHMgc21hbGxlciB0aGFuXG4gICAgLy8gaXRzIHBhcmVudCBpbiBZIGFuZCBvdGhlcndpc2UgdGhlIHNhbWUgc2l6ZS5cbiAgICAvLyBJdCB3aWxsIGJlIHBvc2l0aW9uIDEwMCBwaXhlbHMgYmVsb3cgaXRzIHBhcmVudFxuICAgIC8vIHN1Y2ggdGhhdCBpdCBjbGVhcnMgdGhlIGhlYWRlclxuICAgIG5vZGUuYWRkQ2hpbGQoKVxuICAgICAgICAuc2V0RGlmZmVyZW50aWFsU2l6ZShudWxsLCAtMjAwKVxuICAgICAgICAuc2V0UG9zaXRpb24oMCwgMTAwKVxuICAgICAgICAuYWRkQ2hpbGQoKTtcbn1cblxuZnVuY3Rpb24gbWFrZUZvb3Rlcihub2RlKSB7XG4gICAgLy8gdGhlIGZvb3RlciB3aWxsIGJlIGFsaWduZWRcbiAgICAvLyB0byB0aGUgYm90dG9tIG9mIGl0cyBwYXJlbnQuXG4gICAgLy8gTGlrZSB0aGUgaGVhZGVyIGl0IHdpbGwgYmVcbiAgICAvLyAxMDBweCB0YWxsIGFuZCB0aGUgY29tcGxldGUgd2lkdGguXG4gICAgLy8gbm90ZSBob3cgd2UgdXNlIE1vdW50UG9pbnQgYW5kIEFsaWduXG4gICAgLy8gdG9nZXRoZXIgdG8gbGluZSB1cCB0aGUgYm90dG9tIG9mIHRoZSBmb290ZXJcbiAgICAvLyB3aXRoIHRoZSBib3R0b20gb2YgdGhlIHBhcmVudFxuICAgIG5vZGUuYWRkQ2hpbGQoKVxuICAgICAgICAuc2V0U2l6ZU1vZGUoJ2RlZmF1bHQnLCAnYWJzb2x1dGUnKVxuICAgICAgICAuc2V0QWJzb2x1dGVTaXplKG51bGwsIDEwMClcbiAgICAgICAgLnNldE1vdW50UG9pbnQoMCwgMSlcbiAgICAgICAgLnNldEFsaWduKDAsIDEpXG4gICAgICAgIC5hZGRDaGlsZCgpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFR3aXR0ZXJ1cztcbiIsInZhciBUd2l0dGVydXMgPSByZXF1aXJlKCcuL1R3aXR0ZXJ1cycpO1xudmFyIEZhbW91c0VuZ2luZSA9IHJlcXVpcmUoJ2ZhbW91cy9jb3JlL0ZhbW91c0VuZ2luZScpO1xuIFxuIC8vY3JlYXRlIHRoZSBhcHAgYW5kIHBhc3MgaW4gdGhlIHRhcmdldCBlbGVtZW50XG52YXIgdHdpdHRlcnVzID0gRmFtb3VzRW5naW5lLmNyZWF0ZVNjZW5lKCkuYWRkQ2hpbGQobmV3IFR3aXR0ZXJ1cygpKTtcbiJdfQ==
