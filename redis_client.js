var redis = require("redis")
const { promisify } = require('util');

module.exports = class {

    constructor(aName, aConfig) {
        this.name = aName;
        this.client = redis.createClient(aConfig.port, aConfig.host,
            { no_ready_check: true });
        // this.client('SETNAME', this.name, (err, res) => {
        //     console.log('[',new Date(new Date() + 'UTC'),']' , "setName", err, res);
        // });
        this.client.BRPOP = promisify(this.client.BRPOP).bind(this.client);
        this.client.lpush = promisify(this.client.lpush).bind(this.client);
        this.client.rpush = promisify(this.client.rpush).bind(this.client);
        this.client.get = promisify(this.client.get).bind(this.client);
        this.client.set = promisify(this.client.set).bind(this.client);
        this.client.del = promisify(this.client.del).bind(this.client);
        this.client.publish = promisify(this.client.publish).bind(this.client);
        return this.client;
        // this.subscribe = promisify(this.client.subscribe).bind(this.client);
    }

    /* Calling unref() will allow this program to exit immediately after the get
    command finishes. Otherwise the client would hang as long as the
    client-server connection is alive. */

    stop() {
        console.log('[', new Date(new Date() + 'UTC'), ']', "stop redis client");
        this.unref();
    }
}