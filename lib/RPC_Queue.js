const redis_client = require('./redis_client');
const EventEmitter = require('events');
const procedure_listener = require('./procedure_listener');
const { v4: uuid } = require('uuid');

var registered_services = [];
class RPC_Queue extends EventEmitter {

    //must check for param to throw error
    constructor(config) {
        super();
        this.config = config;
        this.clientName = this.config.name || "pid:" + process.pid// caller|| callee
        if (config.callee) {
            //client to send result to user //for each RPC_queue publisher
            this.resultSendClient = new redis_client(`${this.clientName}_resultPublisher`, this.config.redisConfig);
            this.handleListenerEvents(this.resultSendClient);
            this.maximunValue = config.maxWorkingMSG || 3;
        } else {
            //>>node call node or gateway call node
            this.enqueue_client = new redis_client(`${this.clientName}_enqueue`, this.config.redisConfig); //create dedicated redis client for enqueue
            this.handleListenerEvents(this.enqueue_client);
            this.dequeue_client = new redis_client(`${this.clientName}_dequeue`, this.config.redisConfig); //create dedicated redis client for dequeue
            this.handleListenerEvents(this.dequeue_client);
            this.EventEmitter = new EventEmitter();
            this.resQueue = this.config.resQueue + process.pid
            this.getCallerMsg(this.resQueue);
        }
    }

    handleListenerEvents(redisClient) {
        redisClient.on("ready", () => {
            console.log("reday signal from RPCQ ->>>>");
        });

        redisClient.on("reconnecting", () => { //sginal time based on retry_strategy
            console.log("reconnecting signal ->>>>");
        });

        redisClient.on("error", (error) => {
            let data = JSON.stringify({ error, msg: "Error RPC connection error ", time: new Date() });
            this.emit("RPCerror_redis", data);
        });

        redisClient.on("connect", () => {
            console.log("connect signal from RPCQ ->>>>>>")
            let data = JSON.stringify({ msg: " RPC connected " });
            this.emit("RPCconnnect_redis", data);
        });
    }
    //signal
    async publishMSG(channel, msg) {
        var publisher = new redis_client(this.clientName + '_publisherMSG', this.config.redisConfig); //crate dedcaited client //listener
        this.handleListenerEvents(publisher);
        var reply = await publisher.publish(channel, msg)
        console.log('[', new Date(new Date() + 'UTC'), ']', ">>>>>publisher ", reply)
        return reply;
    }

    async subscribeMSG(channel) {
        var subscriber = new redis_client(this.clientName + '_subscribeMSG', this.config.redisConfig); //crate dedcaited client //listener
        return new Promise((resolve, reject) => {
            subscriber.on("message", (channel, message) => {
                console.log('[', new Date(new Date() + 'UTC'), ']', "listener subscribe Received data :" + channel, " messag " + message, "pid    ", process.pid);
                resolve(message)
            });
            subscriber.subscribe(channel, (err, reply) => {
                console.log('[', new Date(new Date() + 'UTC'), ']', "subscribe is set up err ", err, "reply ", reply, "pid  ", process.pid);
            });
        });
    }

    async getCallerMsg(bResQueue) {
        try {
            let reqRes = await this.dequeue_client.BRPOP(bResQueue, 0);
            reqRes = JSON.parse(reqRes[1]);
            this.EventEmitter.emit(reqRes.reqId, reqRes);
            reqRes = undefined;
            return this.getCallerMsg(bResQueue);
        } catch (e) {
            console.log('[', new Date(new Date() + 'UTC'), ']', "cannot get res error >>> ", e);
        }
    }

    //must check for param to throw error
    async callRemoteMethod(serviceName, queueName, methodName, param) {
        if (this.resultSendClient) throw Error("you are not consumer ");
        let message = this.formatMSG(serviceName, methodName, param, this.resQueue); //format MSG
        let beforegetres = Date.now();
        return new Promise(async (resolve, reject) => {
            console.log('[', new Date(new Date() + 'UTC'), ']', "listenerOn", message.header.id)
            this.EventEmitter.once(message.header.id, (resBody) => {
                try {
                    delete resBody.result.timeTrack;
                    resBody.timeTrack = { beforegetres: beforegetres, aftergetres: Date.now() }
                    resolve(resBody);
                    resBody = message = beforegetres = undefined;
                } catch (ex) {
                    reject(ex)
                }

            });
            await this.enqueue_client.lpush(queueName, JSON.stringify(message));
        });
    }

    //must check for param to throw error
    formatMSG(serviceName, methodName, param, processResQueue) {
        let parentReqId = param.parentReqId;
        let redisDB = param.redisDB;
        let streamConfig = param.streamConfig;

        delete param.parentReqId;
        delete param.redisDB;
        delete param.streamConfig;
        let MSG = {
            header: { id: uuid(), parentReqId, serviceName, methodName, redisDB, streamConfig, processResQueue },
            body: param,
            timeTrack: {
                enqueuTime: Date.now()
            }
        }
        console.log('[', new Date(new Date() + 'UTC'), ']', "request body envolve\n", JSON.stringify(MSG));
        return MSG;
    }

    //must check for param to throw error
    async registerRemoteService(serviceName, queueName, maxWorkingMSG, callbackFun) {

        if (this.enqueue_client)
            throw Error("you arenot aprovider ");

        if (registered_services.indexOf(serviceName) == -1)
            registered_services.push(serviceName);
        else
            throw Error(`${serviceName} is registered before`);

        var client_service = new redis_client(this.clientName + "listener_" + queueName, this.config.redisConfig); //crate dedcaited client //listener

        new procedure_listener(client_service, this.resultSendClient, serviceName, queueName, maxWorkingMSG, callbackFun);
    }

    async stop() {
        this.config.callee && this.resultSendClient.unref();
        this.enqueue_client && this.enqueue_client.unref();
        this.dequeue_client && this.dequeue_client.unref();
    }
}

module.exports = RPC_Queue;