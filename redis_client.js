var redis = require("redis")
const { promisify } = require('util');

module.exports = class {

    constructor(aConfig) {
        this.client = redis.createClient(aConfig.port, aConfig.host,
            { no_ready_check: true });

        if (aConfig.password)
            this.client.auth(aConfig.password, function (err) {
                if (err)
                    console.log("cannot connect to redis ", err)
                else
                    console.log('Redis client connected');
            });

        this.client.on("error", function (err) {
            console.log("Error " + err);
        });

        this.BRPOP = promisify(this.client.BRPOP).bind(this.client);
        this.lpush = promisify(this.client.lpush).bind(this.client);
        this.rpush = promisify(this.client.rpush).bind(this.client);

    }

    /* Calling unref() will allow this program to exit immediately after the get
    command finishes. Otherwise the client would hang as long as the
    client-server connection is alive. */

    stop() {
        console.log("stop redis client");
        this.client.unref();
    }
}