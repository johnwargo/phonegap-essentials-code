
/*
 * PhoneGap is available under *either* the terms of the modified BSD license *or* the
 * MIT License (2008). See http://opensource.org/licenses/alphabetical for full text.
 * 
 * Copyright (c) 2005-2010, Nitobi Software Inc.
 * Copyright (c) 2010, IBM Corporation
 */

/**
 * The order of events during page load and PhoneGap startup is as follows:
 *
 * onDOMContentLoaded         Internal event that is received when the web page is loaded and parsed.
 * window.onload              Body onload event.
 * onNativeReady              Internal event that indicates the PhoneGap native side is ready.
 * onPhoneGapInit             Internal event that kicks off creation of all PhoneGap JavaScript objects (runs constructors).
 * onPhoneGapReady            Internal event fired when all PhoneGap JavaScript objects have been created
 * onPhoneGapInfoReady        Internal event fired when device properties are available
 * onDeviceReady              User event fired to indicate that PhoneGap is ready
 * onResume                   User event fired to indicate a start/resume lifecycle event
 *
 * The only PhoneGap events that user code should register for are:
 *      onDeviceReady
 *      onResume
 *
 * Listeners can be registered as:
 *      document.addEventListener("deviceready", myDeviceReadyListener, false);
 *      document.addEventListener("resume", myResumeListener, false);
 */

function debugPrint(body) {
    var list = document.getElementById("debuglist");
    var item = document.createElement("li");
    item.appendChild(document.createTextNode(body));
    list.appendChild(item);
}
/**
 * This represents the PhoneGap API itself, and provides a global namespace for accessing
 * information about the state of PhoneGap.
 * @class
 */
PhoneGap = { 
   queue: {
        ready: true,
        commands: [],
        timer: null
    },
    _constructors: []
};

/**
 * Boolean flag indicating if the PhoneGap API is available and initialized.
 */ // TODO: Remove this, it is unused here ... -jm
PhoneGap.available = function() {
  return window.device.uuid != undefined;
}

/**
 * Custom pub-sub channel that can have functions subscribed to it
 */
PhoneGap.Channel = function(type)
{
    this.type = type;
    this.handlers = {};
    this.guid = 0;
    this.fired = false;
    this.enabled = true;
};

/**
 * Subscribes the given function to the channel. Any time that 
 * Channel.fire is called so too will the function.
 * Optionally specify an execution context for the function
 * and a guid that can be used to stop subscribing to the channel.
 * Returns the guid.
 */
PhoneGap.Channel.prototype.subscribe = function(f, c, g) {
    // need a function to call
    if (f == null) { return; }

    var func = f;
    if (typeof c == "object" && f instanceof Function) { func = PhoneGap.close(c, f); }

    g = g || func.observer_guid || f.observer_guid || this.guid++;
    func.observer_guid = g;
    f.observer_guid = g;
    this.handlers[g] = func;
    return g;
};

/**
 * Like subscribe but the function is only called once and then it
 * auto-unsubscribes itself.
 */
PhoneGap.Channel.prototype.subscribeOnce = function(f, c) {
    var g = null;
    var _this = this;
    var m = function() {
        f.apply(c || null, arguments);
        _this.unsubscribe(g);
    }
    if (this.fired) {
        if (typeof c == "object" && f instanceof Function) { f = PhoneGap.close(c, f); }
        f.apply(this, this.fireArgs);
    } else {
        g = this.subscribe(m);
    }
    return g;
};

/** 
 * Unsubscribes the function with the given guid from the channel.
 */
PhoneGap.Channel.prototype.unsubscribe = function(g) {
    if (g instanceof Function) { g = g.observer_guid; }
    this.handlers[g] = null;
    delete this.handlers[g];
};

/** 
 * Calls all functions subscribed to this channel.
 */
PhoneGap.Channel.prototype.fire = function(e) {
    if (this.enabled) {
        var fail = false;
        for (var item in this.handlers) {
            var handler = this.handlers[item];
            if (handler instanceof Function) {
                var rv = (handler.apply(this, arguments)==false);
                fail = fail || rv;
            }
        }
        this.fired = true;
        this.fireArgs = arguments;
        return !fail;
    }
    return true;
};

/**
 * Calls the provided function only after all of the channels specified
 * have been fired.
 */
PhoneGap.Channel.join = function(h, c) {
    var i = c.length;
    var f = function() {
        if (!(--i)) h();
    }
    for (var j=0; j<i; j++) {
        (!c[j].fired?c[j].subscribeOnce(f):i--);
    }
    if (!i) h();
};

/**
 * Add an initialization function to a queue that ensures it will run and initialize
 * application constructors only once PhoneGap has been initialized.
 * @param {Function} func The function callback you want run once PhoneGap is initialized
 */
PhoneGap.addConstructor = function(func) {
    PhoneGap.onPhoneGapInit.subscribeOnce(function() {
        // try {
            func();
        // } catch(e) {
        //     if (typeof(debug['log']) == 'function') {
        //         debug.log("Failed to run constructor: " + debug.processMessage(e));
        //     } else {
        //         alert("Failed to run constructor: " + e.message);
        //     }
        // }
    });
};

/**
 * Plugins object.
 */
if (!window.plugins) {
    window.plugins = {};
}

/**
 * Adds new plugin object to window.plugins.
 * The plugin is accessed using window.plugins.<name>
 * 
 * @param name      The plugin name
 * @param obj       The plugin object
 */
PhoneGap.addPlugin = function(name, obj) {
    if (!window.plugins[name]) {
        window.plugins[name] = obj;
    }
    else {
        console.log("Plugin " + name + " already exists.");
    }
};

/**
 * onDOMContentLoaded channel is fired when the DOM content 
 * of the page has been parsed.
 */
PhoneGap.onDOMContentLoaded = new PhoneGap.Channel('onDOMContentLoaded');

/**
 * onNativeReady channel is fired when the PhoneGap native code
 * has been initialized.
 */
PhoneGap.onNativeReady = new PhoneGap.Channel('onNativeReady');

/**
 * onPhoneGapInit channel is fired when the web page is fully loaded and
 * PhoneGap native code has been initialized.
 */
PhoneGap.onPhoneGapInit = new PhoneGap.Channel('onPhoneGapInit');

/**
 * onPhoneGapReady channel is fired when the JS PhoneGap objects have been created.
 */
PhoneGap.onPhoneGapReady = new PhoneGap.Channel('onPhoneGapReady');

/**
 * onPhoneGapInfoReady channel is fired when the PhoneGap device properties
 * has been set.
 */
PhoneGap.onPhoneGapInfoReady = new PhoneGap.Channel('onPhoneGapInfoReady');

/**
 * onResume channel is fired when the PhoneGap native code
 * resumes.
 */
PhoneGap.onResume = new PhoneGap.Channel('onResume');

/**
 * onPause channel is fired when the PhoneGap native code
 * pauses.
 */
PhoneGap.onPause = new PhoneGap.Channel('onPause');

// _nativeReady is global variable that the native side can set
// to signify that the native code is ready. It is a global since 
// it may be called before any PhoneGap JS is ready.
if (typeof _nativeReady !== 'undefined') { PhoneGap.onNativeReady.fire(); }

/**
 * onDeviceReady is fired only after all PhoneGap objects are created and
 * the device properties are set.
 */
PhoneGap.onDeviceReady = new PhoneGap.Channel('onDeviceReady');

/**
 * Create all PhoneGap objects once page has fully loaded and native side is ready.
 */
PhoneGap.Channel.join(function() {

    // Run PhoneGap constructors
    PhoneGap.onPhoneGapInit.fire();

    // Fire event to notify that all objects are created
    PhoneGap.onPhoneGapReady.fire();

}, [ PhoneGap.onDOMContentLoaded, PhoneGap.onNativeReady ]);

/**
 * Fire onDeviceReady event once all constructors have run and PhoneGap info has been
 * received from native side.
 */
PhoneGap.Channel.join(function() {
    PhoneGap.onDeviceReady.fire();
    
    // Fire the onresume event, since first one happens before JavaScript is loaded
    PhoneGap.onResume.fire();
}, [ PhoneGap.onPhoneGapReady, PhoneGap.onPhoneGapInfoReady]);

// Listen for DOMContentLoaded and notify our channel subscribers
document.addEventListener('DOMContentLoaded', function() {
    PhoneGap.onDOMContentLoaded.fire();
}, false);

// Intercept calls to document.addEventListener and watch for deviceready
PhoneGap.m_document_addEventListener = document.addEventListener;

document.addEventListener = function(evt, handler, capture) {
    var e = evt.toLowerCase();
    if (e == 'deviceready') {
        PhoneGap.onDeviceReady.subscribeOnce(handler);
    } else if (e == 'resume') {
        PhoneGap.onResume.subscribe(handler);
        // if subscribing listener after event has already fired, invoke the handler
        if (PhoneGap.onResume.fired && handler instanceof Function) {
            handler();
        }
    } else if (e == 'pause') {
        PhoneGap.onPause.subscribe(handler);
    } else {
        PhoneGap.m_document_addEventListener.call(document, evt, handler, capture);
    }
};

PhoneGap.m_element_addEventListener = Element.prototype.addEventListener;

/**
 * For BlackBerry, the touchstart event does not work so we need to do click
 * events when touchstart events are attached.
 */
Element.prototype.addEventListener = function(evt, handler, capture) {
    if (evt === 'touchstart') {
        evt = 'click';
    }
    PhoneGap.m_element_addEventListener.call(this, evt, handler, capture);
};

/**
 * Does a deep clone of the object.
 *
 * @param obj
 * @return
 */
PhoneGap.clone = function(obj) {
    if(!obj) { 
        return obj;
    }
    
    if(obj instanceof Array){
        var retVal = new Array();
        for(var i = 0; i < obj.length; ++i){
            retVal.push(PhoneGap.clone(obj[i]));
        }
        return retVal;
    }
    
    if (obj instanceof Function) {
        return obj;
    }
    
    if(!(obj instanceof Object)){
        return obj;
    }
    
    if(obj instanceof Date){
        return obj;
    }

    retVal = new Object();
    for(i in obj){
        if(!(i in retVal) || retVal[i] != obj[i]) {
            retVal[i] = PhoneGap.clone(obj[i]);
        }
    }
    return retVal;
};

PhoneGap.close = function(context, func, params) {
    if (typeof params === 'undefined') {
        return function() {
            return func.apply(context, arguments);
        }
    } else {
        return function() {
            return func.apply(context, params);
        }
    }
};

PhoneGap.callbackId = 0;
PhoneGap.callbacks  = {};
PhoneGap.callbackStatus = {
    NO_RESULT: 0,
    OK: 1,
    CLASS_NOT_FOUND_EXCEPTION: 2,
    ILLEGAL_ACCESS_EXCEPTION: 3,
    INSTANTIATION_EXCEPTION: 4,
    MALFORMED_URL_EXCEPTION: 5,
    IO_EXCEPTION: 6,
    INVALID_ACTION: 7,
    JSON_EXCEPTION: 8,
    ERROR: 9
};

/**
 * Called by native code when returning successful result from an action.
 *
 * @param callbackId
 * @param args
 */
PhoneGap.callbackSuccess = function(callbackId, args) {
    if (PhoneGap.callbacks[callbackId]) {

        // If result is to be sent to callback
        if (args.status == PhoneGap.callbackStatus.OK) {
            try {
                if (PhoneGap.callbacks[callbackId].success) {
                    PhoneGap.callbacks[callbackId].success(args.message);
                }
            }
            catch (e) {
                console.log("Error in success callback: "+callbackId+" = "+e);
            }
        }

        // Clear callback if not expecting any more results
        if (!args.keepCallback) {
            delete PhoneGap.callbacks[callbackId];
        }
    }
};

/**
 * Called by native code when returning error result from an action.
 *
 * @param callbackId
 * @param args
 */
PhoneGap.callbackError = function(callbackId, args) {
    if (PhoneGap.callbacks[callbackId]) {
        try {
            if (PhoneGap.callbacks[callbackId].fail) {
                PhoneGap.callbacks[callbackId].fail(args.message);
            }
        }
        catch (e) {
            console.log("Error in error callback: "+callbackId+" = "+e);
        }

        // Clear callback if not expecting any more results
        if (!args.keepCallback) {
            delete PhoneGap.callbacks[callbackId];
        }
    }
};

/**
 * Create a UUID
 *
 * @return
 */
PhoneGap.createUUID = function() {
    return PhoneGap.UUIDcreatePart(4) + '-' +
        PhoneGap.UUIDcreatePart(2) + '-' +
        PhoneGap.UUIDcreatePart(2) + '-' +
        PhoneGap.UUIDcreatePart(2) + '-' +
        PhoneGap.UUIDcreatePart(6);
};

PhoneGap.UUIDcreatePart = function(length) {
    var uuidpart = "";
    for (var i=0; i<length; i++) {
        var uuidchar = parseInt((Math.random() * 256)).toString(16);
        if (uuidchar.length == 1) {
            uuidchar = "0" + uuidchar;
        }
        uuidpart += uuidchar;
    }
    return uuidpart;
};
/**
 * Execute a PhoneGap command in a queued fashion, to ensure commands do not
 * execute with any race conditions, and only run when PhoneGap is ready to
 * receive them.
 *
 */
PhoneGap.exec = function() { 
	
    PhoneGap.queue.commands.push(arguments);
    if (PhoneGap.queue.timer == null)
        PhoneGap.queue.timer = setInterval(PhoneGap.run_command, 10);
};

/**
 * Internal function used to dispatch the request to PhoneGap.  It processes the
 * command queue and executes the next command on the list.  Simple parameters are passed
 * as arguments on the url.  JavaScript objects converted into a JSON string and passed as a
 * query string argument of the url.
 * Arguments may be in one of two formats:
 *   FORMAT ONE (preferable)
 * The native side will call PhoneGap.callbackSuccess or PhoneGap.callbackError,
 * depending upon the result of the action.
 *
 * @param {Function} success    The success callback
 * @param {Function} fail       The fail callback
 * @param {String} service      The name of the service to use
 * @param {String} action		The name of the action to use
 * @param {String[]} [args]     Zero or more arguments to pass to the method
 *  	
 * FORMAT TWO
 * @param {String} command Command to be run in PhoneGap, e.g. "ClassName.method"
 * @param {String[]} [args] Zero or more arguments to pass to the method
 * object parameters are passed as an array object [object1, object2] each object will be passed as JSON strings 
 * @private
 */
PhoneGap.run_command = function() {
    if (!PhoneGap.available() || !PhoneGap.queue.ready)
        return;

    var args = PhoneGap.queue.commands.shift();
    if (PhoneGap.queue.commands.length == 0) {
        clearInterval(PhoneGap.queue.timer);
        PhoneGap.queue.timer = null;
    }
	
	var service;
	var callbackId = null;
	var start=0;
    try {
 		if (args[0] == null || typeof args[0] === "function") {
 			var success = args[0];
 			var fail = args[1];
 			service = args[2] + "." + args[3];
			args = args[4];  //array of arguments to 
      if (success || fail) {
          callbackId = service + PhoneGap.callbackId++;
          PhoneGap.callbacks[callbackId] = {success:success, fail:fail};
      }
 		} else { 
 			service = args[0]; 
 			start = 1;
 		}
        
      var uri = [];
      var query = [];
    	for (var i = start; i < args.length; i++) {
        	var arg = args[i];
        	if (arg == undefined || arg == null)
            	continue;
        	if (typeof(arg) == 'object') {
              for(i in arg) {
                if(typeof(arg[i]) != 'object') {
                  query.push(encodeURIComponent(i) + '=' + encodeURIComponent(arg[i]));
                }
              }
          }
        	else {
            	uri.push(encodeURIComponent(arg));
          }
    	}
    	var next = callbackId != null  ?  ("/" + callbackId + "/") : "/";
    	var url = "gap://" + service + next + uri.join("/");

    	if (query.length > 0) {
        	url += "?" + query.join("&");
    	}
      PhoneGap.queue.ready = false;
      document.location = url;
   
    } catch (e) {
        console.log("PhoneGapExec Error: "+e);
    }
    

};


/*
 * PhoneGap is available under *either* the terms of the modified BSD license *or* the
 * MIT License (2008). See http://opensource.org/licenses/alphabetical for full text.
 * 
 * Copyright (c) 2005-2010, Nitobi Software Inc.
 * Copyright (c) 2010, IBM Corporation
 */

/**
 * This class provides access to device GPS data.
 * @constructor
 */
function Geolocation() {

    // The last known GPS position.
    this.lastPosition = null;
    this.id = null;
};

/**
 * Position error object
 *
 * @param code
 * @param message
 */
function PositionError(code, message) {
    this.code = code || 0;
    this.message = message || '';
};

PositionError.UNKNOWN_ERROR = 0;
PositionError.PERMISSION_DENIED = 1;
PositionError.POSITION_UNAVAILABLE = 2;
PositionError.TIMEOUT = 3;

/**
 * Asynchronously aquires the current position.
 *
 * @param {Function} successCallback    The function to call when the position data is available
 * @param {Function} errorCallback      The function to call when there is an error getting the heading position. (OPTIONAL)
 * @param {PositionOptions} options     The options for getting the position data. (OPTIONAL)
 */
Geolocation.prototype.getCurrentPosition = function(successCallback, errorCallback, options) {
    this.id = PhoneGap.createUUID();
    // default maximumAge value should be 0, and set if positive 
    var maximumAge = 0;

    // default timeout value should be infinity, but that's a really long time
    var timeout = 3600000; 

    var enableHighAccuracy = false;
    if (options) {
        if (options.maximumAge && (options.maximumAge > 0)) {
            maximumAge = options.maximumAge;
        }
        if (options.enableHighAccuracy) {
            enableHighAccuracy = options.enableHighAccuracy;
        }
        if (options.timeout) {
            timeout = (options.timeout < 0) ? 0 : options.timeout;
        }
    }
    PhoneGap.exec(successCallback, errorCallback, "com.phonegap.Geolocation", "getCurrentPosition", [maximumAge, timeout, enableHighAccuracy]);
}

/**
 * Asynchronously watches the geolocation for changes to geolocation.  When a change occurs,
 * the successCallback is called with the new location.
 *
 * @param {Function} successCallback    The function to call each time the location data is available
 * @param {Function} errorCallback      The function to call when there is an error getting the location data. (OPTIONAL)
 * @param {PositionOptions} options     The options for getting the location data such as frequency. (OPTIONAL)
 * @return String                       The watch id that must be passed to #clearWatch to stop watching.
 */
Geolocation.prototype.watchPosition = function(successCallback, errorCallback, options) {

    // default maximumAge value should be 0, and set if positive 
    var maximumAge = 0;

    // DO NOT set timeout to a large value for watchPosition in BlackBerry.  
    // The interval used for updates is half the timeout value, so a large 
    // timeout value will mean a long wait for the first location.
    var timeout = 10000; 

    var enableHighAccuracy = false;
    if (options) {
        if (options.maximumAge && (options.maximumAge > 0)) {
            maximumAge = options.maximumAge;
        }
        if (options.enableHighAccuracy) {
            enableHighAccuracy = options.enableHighAccuracy;
        }
        if (options.timeout) {
            timeout = (options.timeout < 0) ? 0 : options.timeout;
        }
    }
    this.id = PhoneGap.createUUID();
    PhoneGap.exec(successCallback, errorCallback, "com.phonegap.Geolocation", "watchPosition", [maximumAge, timeout, enableHighAccuracy]);
    return this.id;
};

/**
 * Clears the specified position watch.
 *
 * @param {String} id       The ID of the watch returned from #watchPosition
 */
Geolocation.prototype.clearWatch = function(id) {
    PhoneGap.exec(null, null, "com.phonegap.Geolocation", "stop", []);
    this.id = null;
};

/**
 * Force the PhoneGap geolocation to be used instead of built-in.
 */
Geolocation.usingPhoneGap = false;
Geolocation.usePhoneGap = function() {
    if (Geolocation.usingPhoneGap) {
        return;
    }
    Geolocation.usingPhoneGap = true;

    // Set built-in geolocation methods to our own implementations
    // (Cannot replace entire geolocation, but can replace individual methods)
    navigator.geolocation.getCurrentPosition = navigator._geo.getCurrentPosition;
    navigator.geolocation.watchPosition = navigator._geo.watchPosition;
    navigator.geolocation.clearWatch = navigator._geo.clearWatch;
    navigator.geolocation.success = navigator._geo.success;
    navigator.geolocation.fail = navigator._geo.fail;
};

PhoneGap.addConstructor(function() {
    navigator._geo = new Geolocation();

    // if no native geolocation object, use PhoneGap geolocation
    if (typeof navigator.geolocation == 'undefined') {
        navigator.geolocation = navigator._geo;
        Geolocation.usingPhoneGap = true;
    }
});

/*
 * PhoneGap is available under *either* the terms of the modified BSD license *or* the
 * MIT License (2008). See http://opensource.org/licenses/alphabetical for full text.
 * 
 * Copyright (c) 2005-2010, Nitobi Software Inc.
 * Copyright (c) 2010, IBM Corporation
 */

/**
 * This class contains position information.
 * @param {Object} lat
 * @param {Object} lng
 * @param {Object} acc
 * @param {Object} alt
 * @param {Object} altacc
 * @param {Object} head
 * @param {Object} vel
 * @constructor
 */
function Position(coords, timestamp) {
	this.coords = coords;
    this.timestamp = timestamp;
}

function PositionOptions(enableHighAccuracy, timeout, maximumAge, minimumAccuracy) {
    this.enableHighAccuracy = enableHighAccuracy || false;
    this.timeout = timeout || 10000000;
    this.maximumAge = maximumAge || 0;
    this.minimumAccuracy = minimumAccuracy || 10000000;
}

function Coordinates(lat, lng, alt, acc, head, vel, altacc) {
	/**
	 * The latitude of the position.
	 */
	this.latitude = lat || 0;
	/**
	 * The longitude of the position,
	 */
	this.longitude = lng || 0;
	/**
	 * The accuracy of the position.
	 */
	this.accuracy = acc || 0;
	/**
	 * The altitude of the position.
	 */
	this.altitude = alt || 0;
	/**
	 * The direction the device is moving at the position.
	 */
	this.heading = head || 0;
	/**
	 * The velocity with which the device is moving at the position.
	 */
	this.speed = vel || 0;
	/**
	 * The altitude accuracy of the position.
	 */
	this.altitudeAccuracy = (altacc != 'undefined') ? altacc : null; 
}
/*
 * PhoneGap is available under *either* the terms of the modified BSD license *or* the
 * MIT License (2008). See http://opensource.org/licenses/alphabetical for full text.
 * 
 * Copyright (c) 2005-2010, Nitobi Software Inc.
 * Copyright (c) 2010, IBM Corporation
 */
function Acceleration(x, y, z, timestamp) {
  this.x = x;
  this.y = y;
  this.z = z;
  this.timestamp = timestamp || new Date().getTime();
};

/**
 * Class provides access to device accelerometer data.
 * @constructor
 */
function Accelerometer() {

    /**
     * The last known acceleration.  type=Acceleration()
     */
    this.lastAcceleration = null;
    this.id = null;
};

/**
 * Asynchronously acquires the current acceleration.
 *
 * @param {Function} successCallback    The function to call when the acceleration data is available
 * @param {Function} errorCallback      The function to call when there is an error getting the acceleration data. (OPTIONAL)
 * @param {AccelerationOptions} options The options for getting the accelerometer data such as timeout. (OPTIONAL)
 */
Accelerometer.prototype.getCurrentAcceleration = function(successCallback, errorCallback, options) {

    // successCallback required
    if (typeof successCallback != "function") {
        console.log("Accelerometer Error: successCallback is not a function");
        return;
    }

    // errorCallback optional
    if (errorCallback && (typeof errorCallback != "function")) {
        console.log("Accelerometer Error: errorCallback is not a function");
        return;
    }

    // Get acceleration
    PhoneGap.exec(successCallback, errorCallback, "com.phonegap.Accelerometer", "getCurrentAcceleration", []);
};

/**
 * Asynchronously acquires the device acceleration at a given interval.
 *
 * @param {Function} successCallback    The function to call each time the acceleration data is available
 * @param {Function} errorCallback      The function to call when there is an error getting the acceleration data. (OPTIONAL)
 * @param {AccelerationOptions} options The options for getting the accelerometer data such as timeout. (OPTIONAL)
 * @return String                       The watch id that must be passed to #clearWatch to stop watching.
 */
Accelerometer.prototype.watchAcceleration = function(successCallback, errorCallback, options) {

    // Default interval (10 sec)
    var frequency = (options != undefined) ? options.frequency : 10000;

    // successCallback required
    if (typeof successCallback != "function") {
        console.log("Accelerometer Error: successCallback is not a function");
        return;
    }

    // errorCallback optional
    if (errorCallback && (typeof errorCallback != "function")) {
        console.log("Accelerometer Error: errorCallback is not a function");
        return;
    }
    // Start watch timer
    this.id = PhoneGap.createUUID();
    PhoneGap.exec(successCallback, errorCallback, "com.phonegap.Accelerometer", "watchAcceleration", []);
    return this.id;
};

/**
 * Clears the specified accelerometer watch.
 *
 * @param {String} id The id of the watch returned from #watchAcceleration.
 */
Accelerometer.prototype.clearWatch = function(id) {

    // Stop javascript timer & remove from timer list
    if (id == this.id) {
        PhoneGap.exec(null, null, "com.phonegap.Accelerometer", "clearWatch", []);
    }
};

/*
 * Native callback when watchAcceleration has a new acceleration.
 */
Accelerometer.prototype.success = function(id, result) {
	try {
        var accel = new Acceleration(result.x, result.y, result.z, result.timestamp);
        navigator.accelerometer.lastAcceleration = accel;
        navigator.accelerometer.listeners[id].success(accel);
    }
    catch (e) {
        debugPrint("Geolocation Error: "+e.message);
        console.log("Geolocation Error: Error calling success callback function.");
    }

    if (id == "global") {
        delete navigator.accelerometer.listeners["global"];
    }
};

PhoneGap.addConstructor(function() {
    if (typeof navigator.accelerometer == "undefined") navigator.accelerometer = new Accelerometer();
});

/*
 * PhoneGap is available under *either* the terms of the modified BSD license *or* the
 * MIT License (2008). See http://opensource.org/licenses/alphabetical for full text.
 * 
 * Copyright (c) 2005-2010, Nitobi Software Inc.
 * Copyright (c) 2010, IBM Corporation
 */

/**
 * Network status.
 */
NetworkStatus = {
  NOT_REACHABLE: 0,
  REACHABLE_VIA_CARRIER_DATA_NETWORK: 1,
  REACHABLE_VIA_WIFI_NETWORK: 2
};

/**
 * This class provides access to device Network data (reachability).
 * @constructor
 */
function Network() {
    /**
     * The last known Network status.
	 * { hostName: string, ipAddress: string, 
		remoteHostStatus: int(0/1/2), internetConnectionStatus: int(0/1/2), localWiFiConnectionStatus: int (0/2) }
     */
	this.lastReachability = null;
};

/**
 * Determine if a URI is reachable over the network.

 * @param {Object} uri
 * @param {Function} callback
 * @param {Object} options  (isIpAddress:boolean)
 */
Network.prototype.isReachable = function(uri, callback, options) {
    var isIpAddress = false;
    if (options && options.isIpAddress) {
        isIpAddress = options.isIpAddress;
    }
    PhoneGap.exec(callback, null, 'com.phonegap.Network', 'isReachable', [uri, isIpAddress]);
};

/**
 * Called by the geolocation framework when the reachability status has changed.
 * @param {Reachibility} reachability The current reachability status.
 */
// TODO: Callback from native code not implemented for Android
Network.prototype.updateReachability = function(reachability) {
    this.lastReachability = reachability;
};

PhoneGap.addConstructor(function() {
	if (typeof navigator.network == "undefined") navigator.network = new Network();
});
/**
 * This class provides access to the debugging console.
 * @constructor
 */
function DebugConsole(isDeprecated) {
    this.logLevel = DebugConsole.INFO_LEVEL;
    this.isDeprecated = isDeprecated ? true : false;
}

// from most verbose, to least verbose
DebugConsole.ALL_LEVEL    = 1; // same as first level
DebugConsole.INFO_LEVEL   = 1;
DebugConsole.WARN_LEVEL   = 2;
DebugConsole.ERROR_LEVEL  = 4;
DebugConsole.NONE_LEVEL   = 8;
													
DebugConsole.prototype.setLevel = function(level) {
    this.logLevel = level;
}

/**
 * Utility function for rendering and indenting strings, or serializing
 * objects to a string capable of being printed to the console.
 * @param {Object|String} message The string or object to convert to an indented string
 * @private
 */
DebugConsole.prototype.processMessage = function(message, maxDepth) {
	if (maxDepth === undefined) maxDepth = 0;
    if (typeof(message) != 'object') {
        return (this.isDeprecated ? "WARNING: debug object is deprecated, please use console object " + message : message);
    } else {
        /**
         * @function
         * @ignore
         */
        function indent(str) {
            return str.replace(/^/mg, "    ");
        }
        /**
         * @function
         * @ignore
         */
        function makeStructured(obj, depth) {
            var str = "";
            for (var i in obj) {
                try {
                    if (typeof(obj[i]) == 'object' && depth < maxDepth) {
                        str += i + ": " + indent(makeStructured(obj[i])) + "   ";
                    } else {
                        str += i + " = " + indent(String(obj[i])).replace(/^    /, "") + "   ";
                    }
                } catch(e) {
                    str += i + " = EXCEPTION: " + e.message + "   ";
                }
            }
            return str;
        }
        
        return ((this.isDeprecated ? "WARNING: debug object is deprecated, please use console object   " :  "") + "Object: " + makeStructured(message, maxDepth));
    }
};

/**
 * Print a normal log message to the console
 * @param {Object|String} message Message or object to print to the console
 */
DebugConsole.prototype.log = function(message, maxDepth) {
    if (PhoneGap.available && this.logLevel <= DebugConsole.INFO_LEVEL)
        PhoneGap.exec(null, null, 'com.phonegap.DebugConsole', 'log',
            [this.processMessage(message, maxDepth), 'INFO']
        );
    else
        console.log(message);
};

/**
 * Print a warning message to the console
 * @param {Object|String} message Message or object to print to the console
 */
DebugConsole.prototype.warn = function(message, maxDepth) {
    if (PhoneGap.available && this.logLevel <= DebugConsole.WARN_LEVEL)
        PhoneGap.exec(null, null, 'com.phonegap.DebugConsole', 'log',
            [this.processMessage(message, maxDepth), 'WARN']
        );
    else
        console.error(message);
};

/**
 * Print an error message to the console
 * @param {Object|String} message Message or object to print to the console
 */
DebugConsole.prototype.error = function(message, maxDepth) {
    if (PhoneGap.available && this.logLevel <= DebugConsole.ERROR_LEVEL)
        PhoneGap.exec(null, null, 'com.phonegap.DebugConsole', 'log',
            [this.processMessage(message, maxDepth), 'ERROR']
        );
    else
        console.error(message);
};

PhoneGap.addConstructor(function() {
    window.console = new DebugConsole();
    window.debug = new DebugConsole(true);
});
/*
 * PhoneGap is available under *either* the terms of the modified BSD license *or* the
 * MIT License (2008). See http://opensource.org/licenses/alphabetical for full text.
 *
 * Copyright (c) 2005-2010, Nitobi Software Inc.
 * Copyright (c) 2010, IBM Corporation
 */

/**
* Contains information about a single contact.
* @param {DOMString} id unique identifier
* @param {DOMString} displayName
* @param {ContactName} name
* @param {DOMString} nickname
* @param {ContactField[]} phoneNumbers array of phone numbers
* @param {ContactField[]} emails array of email addresses
* @param {ContactAddress[]} addresses array of addresses
* @param {ContactField[]} ims instant messaging user ids
* @param {ContactOrganization[]} organizations
* @param {DOMString} revision date contact was last updated
* @param {DOMString} birthday contact's birthday
* @param {DOMString} gender contact's gender
* @param {DOMString} note user notes about contact
* @param {ContactField[]} photos
* @param {ContactField[]} urls contact's web sites
* @param {DOMString} timezone UTC time zone offset
*/

var Contact = function(id, displayName, name, nickname, phoneNumbers, emails, addresses,
    ims, organizations, revision, birthday, gender, note, photos, categories, urls, timezone) {
    this.id = id || null;
    this.displayName = displayName || null;
    this.name = name || null; // ContactName
    this.nickname = nickname || null;
    this.phoneNumbers = phoneNumbers || null; // ContactField[]
    this.emails = emails || null; // ContactField[]
    this.addresses = addresses || null; // ContactAddress[]
    this.ims = ims || null; // ContactField[]
    this.organizations = organizations || null; // ContactOrganization[]
    this.revision = revision || null; // JS Date
    this.birthday = birthday || null; // JS Date
    this.gender = gender || null;
    this.note = note || null;
    this.photos = photos || null; // ContactField[]
    this.categories = categories || null; 
    this.urls = urls || null; // ContactField[]
    this.timezone = timezone || null;
};

/**
* Removes contact from device storage.
* @param successCB success callback
* @param errorCB error callback (optional)
*/
Contact.prototype.remove = function(successCB, errorCB) {
	if (this.id == null) {
    var errorObj = new ContactError();
    errorObj.code = ContactError.NOT_FOUND_ERROR;
    errorCB(errorObj);
  }
  else {
      PhoneGap.exec(successCB, errorCB, "com.phonegap.Contacts", "remove", [this.id]);
  }
};
/**
* Bada ONLY
* displays contact via Bada Contact UI
*
* @param errorCB error callback
*/
Contact.prototype.display = function(successCB, errorCB, options) { 
	if (this.id == null) {
    var errorObj = new ContactError();
    errorObj.code = ContactError.NOT_FOUND_ERROR;
    errorCB(errorObj);
  }
  else {
      PhoneGap.exec(successCB, errorCB, "com.phonegap.Contacts","displayContact", [this.id, options]);
  }
};

/**
* Creates a deep copy of this Contact.
* With the contact ID set to null.
* @return copy of this Contact
*/
Contact.prototype.clone = function() {
    var clonedContact = PhoneGap.clone(this);
    clonedContact.id = null;
    // Loop through and clear out any id's in phones, emails, etc.
    if (clonedContact.phoneNumbers) {
    	for (i=0; i<clonedContact.phoneNumbers.length; i++) {
    		clonedContact.phoneNumbers[i].id = null;
    	}
    }
    if (clonedContact.emails) {
    	for (i=0; i<clonedContact.emails.length; i++) {
    		clonedContact.emails[i].id = null;
    	}
    }
    if (clonedContact.addresses) {
    	for (i=0; i<clonedContact.addresses.length; i++) {
    		clonedContact.addresses[i].id = null;
    	}
    }
    if (clonedContact.ims) {
    	for (i=0; i<clonedContact.ims.length; i++) {
    		clonedContact.ims[i].id = null;
    	}
    }
    if (clonedContact.organizations) {
    	for (i=0; i<clonedContact.organizations.length; i++) {
    		clonedContact.organizations[i].id = null;
    	}
    }
    if (clonedContact.photos) {
    	for (i=0; i<clonedContact.photos.length; i++) {
    		clonedContact.photos[i].id = null;
    	}
    }
    if (clonedContact.urls) {
    	for (i=0; i<clonedContact.urls.length; i++) {
    		clonedContact.urls[i].id = null;
    	}
    }
    return clonedContact;
};

/**
* Persists contact to device storage.
* @param successCB success callback
* @param errorCB error callback - optional
*/
Contact.prototype.save = function(successCB, errorCB) {
  // Read by Bada to create contact
  var id = navigator.service.contacts.records.push(this) - 1;
	PhoneGap.exec(successCB, errorCB, "com.phonegap.Contacts", "save", [id]);
};

/**
* Contact name.
* @param formatted
* @param familyName
* @param givenName
* @param middle
* @param prefix
* @param suffix
*/
var ContactName = function(formatted, familyName, givenName, middle, prefix, suffix) {
    this.formatted = formatted != "undefined" ? formatted : null;
    this.familyName = familyName != "undefined" ? familyName : null;
    this.givenName = givenName != "undefined" ? givenName : null;
    this.middleName = middle != "undefined" ? middle : null;
    this.honorificPrefix = prefix != "undefined" ? prefix : null;
    this.honorificSuffix = suffix != "undefined" ? suffix : null;
};

/**
* Generic contact field.
* @param type
* @param value
* @param primary
* @param id
*/
var ContactField = function(type, value, pref, id) {
    this.type = type != "undefined" ? type : null;
    this.value = value != "undefined" ? value : null;
    this.pref = pref != "undefined" ? pref : null;
    this.id = id != "undefined" ? id : null;
};

/**
* Contact address.
* @param formatted
* @param streetAddress
* @param locality
* @param region
* @param postalCode
* @param country
*/
var ContactAddress = function(formatted, streetAddress, locality, region, postalCode, country, id) {
    this.formatted = formatted != "undefined" ? formatted : null;
    this.streetAddress = streetAddress != "undefined" ? streetAddress : null;
    this.locality = locality != "undefined" ? locality : null;
    this.region = region != "undefined" ? region : null;
    this.postalCode = postalCode != "undefined" ? postalCode : null;
    this.country = country != "undefined" ? country : null;
    this.id = id != "undefined" ? id : null;
};

/**
* Contact organization.
* @param name
* @param dept
* @param title
* @param startDate
* @param endDate
* @param location
* @param desc
*/
var ContactOrganization = function(name, dept, title, startDate, endDate, location, desc) {
    this.name = name != "undefined" ? name : null;
    this.department = dept != "undefined" ? dept : null;
    this.title = title != "undefined" ? title : null;
    this.startDate = startDate != "undefined" ? startDate : null;
    this.endDate = endDate != "undefined" ? endDate : null;
    this.location = location != "undefined" ? location : null;
    this.description = desc != "undefined" ? desc : null;
};

/**
* Contact account.
* @param domain
* @param username
* @param userid
*/
var ContactAccount = function(domain, username, userid) {
    this.domain = domain != "undefined" ? domain : null;
    this.username = username != "undefined" ? username : null;
    this.userid = userid != "undefined" ? userid : null;
}

/**
* Represents a group of Contacts.
*/
var Contacts = function() {
    this.inProgress = false;
    this.records = new Array(); // used by bada to create contacts
    this.results = new Array(); // used by bada to update contact results
    this.resultsCallback = null;
    this.errorCallback = null;
};
/**
* Returns an array of Contacts matching the search criteria.
* @param fields that should be searched
* @param successCB success callback
* @param errorCB error callback (optional)
* @param {ContactFindOptions} options that can be applied to contact searching
* @return array of Contacts matching search criteria
*/
Contacts.prototype.find = function(fields, successCB, errorCB, options) {
  /* fields searched are: displayName, Email, Phone Number, User Id
   * other fields are ignored
   */
	PhoneGap.exec(successCB, errorCB, "com.phonegap.Contacts","find",[options.filter]);
};

/**
* need to turn the JSON string representing contact object into actual object
* @param JSON string with contact data
* Call stored results function with  Contact object
*/
Contacts.prototype._findCallback = function(contact)
{
	if(contact) {
		try {
      this.results.push(this.create(contact));
		} catch(e){
			console.log("Error parsing contact");
		}
	}
};
/** 
* Need to return an error object rather than just a single error code
* @param error code
* Call optional error callback if found.
* Called from objective c find, remove, and save methods on error.
*/
Contacts.prototype._errCallback = function(pluginResult)
{
	var errorObj = new ContactError();
   	errorObj.code = pluginResult.message;
	pluginResult.message = errorObj;
	return pluginResult;
};
// Bada only api to create a new contact via the GUI
Contacts.prototype.newContactUI = function(successCallback) { 
    PhoneGap.exec(successCallback, null, "com.phonegap.Contacts","newContact", []);
};
// Bada only api to select a contact via the GUI
Contacts.prototype.chooseContact = function(successCallback, options) {
    PhoneGap.exec(successCallback, null, "com.phonegap.Contacts","chooseContact", options);
};


/**
* This function creates a new contact, but it does not persist the contact
* to device storage. To persist the contact to device storage, invoke
* contact.save().
* @param properties an object who's properties will be examined to create a new Contact
* @returns new Contact object
*/
Contacts.prototype.create = function(properties) {
    var contact = new Contact();
    for (i in properties) {
        if (contact[i]!='undefined') {
            contact[i]=properties[i];
        }
    }
    return contact;
};

/**
 * ContactFindOptions.
 * @param filter used to match contacts against
 * @param multiple boolean used to determine if more than one contact should be returned
 * @param updatedSince return only contact records that have been updated on or after the given time
 */
var ContactFindOptions = function(filter, multiple, updatedSince) {
    this.filter = filter || '';
    this.multiple = multiple || true;
    this.updatedSince = updatedSince || '';
};

/**
 *  ContactError.
 *  An error code assigned by an implementation when an error has occurred
 */
var ContactError = function() {
    this.code=null;
};

/**
 * Error codes
 */
ContactError.UNKNOWN_ERROR = 0;
ContactError.INVALID_ARGUMENT_ERROR = 1;
ContactError.NOT_FOUND_ERROR = 2;
ContactError.TIMEOUT_ERROR = 3;
ContactError.PENDING_OPERATION_ERROR = 4;
ContactError.IO_ERROR = 5;
ContactError.NOT_SUPPORTED_ERROR = 6;
ContactError.PERMISSION_DENIED_ERROR = 20;

/**
 * Add the contact interface into the browser.
 */
PhoneGap.addConstructor(function() { 
    if(typeof navigator.service == "undefined") navigator.service = new Object();
    if(typeof navigator.service.contacts == "undefined") navigator.service.contacts = new Contacts();
});


/*
 * PhoneGap is available under *either* the terms of the modified BSD license *or* the
 * MIT License (2008). See http://opensource.org/licenses/alphabetical for full text.
 * 
 * Copyright (c) 2005-2010, Nitobi Software Inc.
 * Copyright (c) 2010, IBM Corporation
 */

/**
 * This represents the mobile device, and provides properties for inspecting the model, version, UUID of the
 * phone, etc.
 * @constructor
 */
function Device() {
  this.platform = null;
  this.version  = null;
  this.name     = null;
  this.uuid     = null;
};

PhoneGap.addConstructor(function() {
  navigator.device = window.device = window.device || new Device();
  PhoneGap.onPhoneGapInfoReady.fire();
});
/**
 * This class provides access to device Compass data.
 * @constructor
 */
function Compass() {
    /**
     * The last known Compass position.
     */
  this.uuid = null;
};

/**
 * Asynchronously aquires the current heading.
 * @param {Function} successCallback The function to call when the heading
 * data is available
 * @param {Function} errorCallback The function to call when there is an error 
 * getting the heading data.
 * @param {PositionOptions} options The options for getting the heading data
 * such as timeout.
 */
Compass.prototype.getCurrentHeading = function(successCallback, errorCallback, options) {
  PhoneGap.exec(successCallback, errorCallback, "com.phonegap.Compass", "getCurrentHeading", options);
};

/**
 * Asynchronously aquires the heading repeatedly at a given interval.
 * @param {Function} successCallback The function to call each time the heading
 * data is available
 * @param {Function} errorCallback The function to call when there is an error 
 * getting the heading data.
 * @param {HeadingOptions} options The options for getting the heading data
 * such as timeout and the frequency of the watch.
 */
Compass.prototype.watchHeading= function(successCallback, errorCallback, options) {
  this.uuid = PhoneGap.createUUID();
  PhoneGap.exec(successCallback, errorCallback, "com.phonegap.Compass", "watchHeading", [this.uuid, options.frequency || 3000]);
  return this.uuid;
};


/**
 * Clears the specified heading watch.
 * @param {String} watchId The ID of the watch returned from #watchHeading.
 */
Compass.prototype.clearWatch = function(watchId) {
    if(this.uuid == watchId) {
      PhoneGap.exec(null, null, "com.phonegap.Compass", "clearWatch", [this.uuid]);
      this.uuid = null;
    } else {
      debugPrint('no clear watch');
    }
};

PhoneGap.addConstructor(function() {
    if (typeof navigator.compass == "undefined") navigator.compass = new Compass();
});

/*
 * PhoneGap is available under *either* the terms of the modified BSD license *or* the
 * MIT License (2008). See http://opensource.org/licenses/alphabetical for full text.
 * 
 * Copyright (c) 2005-2010, Nitobi Software Inc.
 * Copyright (c) 2010, IBM Corporation
 */

MessageBox.MSGBOX_STYLE_NONE = 0;
MessageBox.MSGBOX_STYLE_OK = 1;
MessageBox.MSGBOX_STYLE_CANCEL = 2;
MessageBox.MSGBOX_STYLE_OKCANCEL = 3;
MessageBox.MSGBOX_STYLE_YESNO = 4;
MessageBox.MSGBOX_STYLE_YESNOCANCEL = 5;
MessageBox.MSGBOX_STYLE_ABORTRETRYIGNORE = 6;
MessageBox.MSGBOX_STYLE_CANCELTRYCONTINUE = 7;
MessageBox.MSGBOX_STYLE_RETRYCANCEL = 8;

/**
 * This class provides access to notifications on the device.
 */
function Notification() {
  this.messageBox = new MessageBox("Test Alert", "This is an alert", "OK");
}

/*
 * MessageBox: used by Bada to retrieve Dialog Information
 */

function MessageBox(title, message, messageBoxStyle) {
  this.title = title;
  this.message = message;
  this.messageBoxStyle = messageBoxStyle;
}

labelsToBoxStyle = function(buttonLabels) {
  if(!buttonLabels)
    return MessageBox.MSGBOX_STYLE_NONE;
  if(buttonLabels == "OK")
    return MessageBox.MSGBOX_STYLE_OK;
  if(buttonLabels == "Cancel")
    return MessageBox.MSGBOX_STYLE_CANCEL;
  if(buttonLabels == "OK,Cancel")
    return MessageBox.MSGBOX_STYLE_OKCANCEL;
  if(buttonLabels == "Yes,No")
    return MessageBox.MSGBOX_STYLE_YESNO;
  if(buttonLabels == "Yes,No,Cancel")
    return MessageBox.MSGBOX_STYLE_YESNOCANCEL;
  if(buttonLabels == "Abort,Retry,Ignore")
    return MessageBox.MSGBOX_STYLE_ABORTRETRYIGNORE;
  if(buttonLabels == "Cancel,Try,Continue")
    return MessageBox.MSGBOX_STYLE_CANCELTRYCONTINUE;
  if(buttonLabels == "Retry,Cancel")
    return MessageBox.MSGBOX_STYLE_RETRYCANCEL;

  return MessageBox.MSGBOX_STYLE_NONE;
}

/**
 * Open a native alert dialog, with a customizable title and button text.
 * @param {String}   message          Message to print in the body of the alert
 * @param {Function} completeCallback The callback that is invoked when user clicks a button.
 * @param {String}   title            Title of the alert dialog (default: 'Alert')
 * @param {String}   buttonLabel      Label of the close button (default: 'OK')
 */
Notification.prototype.alert = function(message, completeCallback, title, buttonLabel) {
    var _title = (title || "Alert");
    this.messageBox = new MessageBox(_title, message, labelsToBoxStyle(buttonLabel));
    PhoneGap.exec(completeCallback, null, 'com.phonegap.Notification', 'alert', []);
};

/**
 * Open a custom confirmation dialog, with a customizable title and button text.
 * @param {String}  message         Message to print in the body of the dialog
 * @param {Function}resultCallback  The callback that is invoked when a user clicks a button.
 * @param {String}  title           Title of the alert dialog (default: 'Confirm')
 * @param {String}  buttonLabels    Comma separated list of the button labels (default: 'OK,Cancel')
 */
Notification.prototype.confirm = function(message, resultCallback, title, buttonLabels) {
    var _title = (title || "Confirm");
    var _buttonLabels = (buttonLabels || "OK,Cancel");
    this.messageBox = new MessageBox(_title, message, labelsToBoxStyle(buttonLabels));
    return PhoneGap.exec(resultCallback, null, 'com.phonegap.Notification', 'confirm', []);
};

/**
 * Causes the device to vibrate.
 * @param {Integer} mills The number of milliseconds to vibrate for.
 */
Notification.prototype.vibrate = function(mills) {
    PhoneGap.exec(null, null, 'com.phonegap.Notification', 'vibrate', [mills]);
};

/**
 * Causes the device to beep.
 * @param {Integer} count The number of beeps.
 */
Notification.prototype.beep = function(count) {
    PhoneGap.exec(null, null, 'com.phonegap.Notification', 'beep', [count]);
};

PhoneGap.addConstructor(function() {
    if (typeof navigator.notification == "undefined") navigator.notification = new Notification();
});

/*
 * PhoneGap is available under *either* the terms of the modified BSD license *or* the
 * MIT License (2008). See http://opensource.org/licenses/alphabetical for full text.
 * 
 * Copyright (c) 2005-2010, Nitobi Software Inc.
 * Copyright (c) 2010, IBM Corporation
 */

/**
 * This class provides access to the device camera.
 *
 * @constructor
 */
Camera = function() {
    this.options = null;
};

/**
 * Format of image that returned from getPicture.
 *
 * Example: navigator.camera.getPicture(success, fail,
 *              { quality: 80,
 *                destinationType: Camera.DestinationType.DATA_URL,
 *                sourceType: Camera.PictureSourceType.PHOTOLIBRARY})
 */
Camera.DestinationType = {
    DATA_URL: 0,                // Return base64 encoded string
    FILE_URI: 1                 // Return file URI
};
Camera.prototype.DestinationType = Camera.DestinationType;

/**
 * Source to getPicture from.
 *
 * Example: navigator.camera.getPicture(success, fail,
 *              { quality: 80,
 *                destinationType: Camera.DestinationType.DATA_URL,
 *                sourceType: Camera.PictureSourceType.PHOTOLIBRARY})
 */
Camera.PictureSourceType = {    // Ignored on Blackberry
    PHOTOLIBRARY : 0,           // Choose image from picture library 
    CAMERA : 1,                 // Take picture from camera
    SAVEDPHOTOALBUM : 2         // Choose image from picture library 
};
Camera.prototype.PictureSourceType = Camera.PictureSourceType;

/**
 * Gets a picture from source defined by "options.sourceType", and returns the
 * image as defined by the "options.destinationType" option.

 * The defaults are sourceType=CAMERA and destinationType=DATA_URL.
 *
 * @param {Function} successCallback
 * @param {Function} errorCallback
 * @param {Object} options
 */
Camera.prototype.getPicture = function(successCallback, errorCallback, options) {

    // successCallback required
    if (typeof successCallback != "function") {
        console.log("Camera Error: successCallback is not a function");
        return;
    }

    // errorCallback optional
    if (errorCallback && (typeof errorCallback != "function")) {
        console.log("Camera Error: errorCallback is not a function");
        return;
    }

    this.options = options;
    var quality = 80;
    if (options.quality) {
        quality = this.options.quality;
    }
    var destinationType = Camera.DestinationType.DATA_URL;
    if (this.options.destinationType) {
        destinationType = this.options.destinationType;
    }
    var sourceType = Camera.PictureSourceType.CAMERA;
    if (typeof this.options.sourceType == "number") {
        sourceType = this.options.sourceType;
    }
    PhoneGap.exec(successCallback, errorCallback, "com.phonegap.Camera", "getPicture", [quality, destinationType, sourceType]);
};

PhoneGap.addConstructor(function() {
	if (typeof navigator.camera == "undefined") navigator.camera = new Camera();
});
