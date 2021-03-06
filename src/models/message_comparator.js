var logger = require('../utils/logger')('MessageComparator'),
    Response = require('./response');

/**
 * Represents a MessageComparator capable of determining whether an
 * incoming message must be relayed to a module or not.
 * @param {RegExp}      regex       Regex to which every incoming
 *                                  message will be tested against
 * @param {Function}    callback    Callback function that will be called
 *                                  when a given message is matched by the
 *                                  provided regex
 * @constructor
 */
var MessageComparator = function(moduleName, regex, callback) {
    this.regex = regex;
    this.callback = callback;
    this.moduleName = moduleName;
    this.suspended = false;
    logger.verbose('Registered message: ' + regex);
};

MessageComparator.prototype = {
    /**
     * Checks and executes the callback on a given message in an Envelope
     * @param  {Envelope}   envelope    Envelope containing a message
     *                                  to be checked
     * @return {Bool}                   Whether the callback was called or not
     */
    call: function(envelope) {
        if(this.suspended) {
            return false;
        }
        var match = this.regex.exec(envelope.text);
        if(!!match) {
            logger.verbose('Message ' + envelope.text + ' matched regex ' + this.regex);
            envelope.stopPropagation = true;
            this.callback(new Response(envelope, match));
            return true;
        }
        return false;
    },

    /**
     * Sets the suspension state of this MessageComparator. Setting it to true, prevents it
     * from matching messages and calling its module.
     * @param {Boolean} newState New suspension state of this MessageComparator
     * @since 2.0
     */
    setSuspensionState: function(newState) {
        this.suspended = newState;
    }
};

module.exports = MessageComparator;
