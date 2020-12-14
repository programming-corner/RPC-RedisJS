var redis = require("redis")
const { promisify } = require('util');

module.exports = class {

    constructor(aName, aConfig) {
        this.name = aName;
        this.client = redis.createClient(aConfig)
        var commands = ["rpush", "lpush", "BRPOP", "get", "set", "del" , "publish","subscribe"];
        // for (const key in this.client) {
        //     if (commands.includes(key)){
        //         console.log("going to promisify ->")
        //         typeof this.client[key] === "function" ? (this.client[key] = promisify(this.client[key]).bind(this.client)) : null;
        //     }
        // }

        for (const key of commands)
            typeof this.client[key] === "function" ? (this.client[key] = promisify(this.client[key]).bind(this.client)) : null;

        return this.client;
    }

    /* Calling unref() will allow this program to exit immediately after the get
    command finishes. Otherwise the client would hang as long as the
    client-server connection is alive. */

}