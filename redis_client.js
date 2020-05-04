var redis = require("redis")
const { promisify } = require('util');

module.exports = class {

    constructor(aName, aConfig) {
        this.name = aName;
        this.client = redis.createClient(aConfig.port, aConfig.host,
            { no_ready_check: true });

        if (aConfig.password)
            this.client.auth(aConfig.password, function (err) {
                if (err)
                    console.log("cannot connect to redis ", err)
                else
                    console.log('Redis client connected');
            });

        this.client.on("error", (err) => {
            console.log("Error RPC connection error " + err);
        });

        this.client.on("connect", () => {
            // console.log(`${this.name} :: connect successfully`);
        });

        //rename client
        this.client.client('SETNAME', this.name, (err, res) => {
            // if (!err)
            //     console.log(" client name : ", this.name, res);
            // else
            //     console.error("error in client name : ", this.name, err);
        });

        this.BRPOP = promisify(this.client.BRPOP).bind(this.client);
        this.lpush = promisify(this.client.lpush).bind(this.client);
        this.rpush = promisify(this.client.rpush).bind(this.client);
        this.get = promisify(this.client.get).bind(this.client);
        this.set = promisify(this.client.set).bind(this.client);
        this.del = promisify(this.client.del).bind(this.client);
        this.publish = promisify(this.client.publish).bind(this.client);
        // this.subscribe = promisify(this.client.subscribe).bind(this.client);
    }

    /* Calling unref() will allow this program to exit immediately after the get
    command finishes. Otherwise the client would hang as long as the
    client-server connection is alive. */

    stop() {
        console.log("stop redis client");
        this.client.unref();
    }
}