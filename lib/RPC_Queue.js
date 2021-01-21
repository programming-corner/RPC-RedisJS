const redis_client = require('./redis_client');
const EventEmitter = require('events');
const procedure_listener = require('./procedure_listener');
const { v4: uuid } = require('uuid');

var registered_services = [];
class RPC_Queue extends EventEmitter {

    constructor(config) {
        super();
        this.config = config;
        this.clientName = this.config.name || "pid:" + process.pid;// serviceConsumer|| serviceProvider
        (this.config.serviceProvider) ? this.serviceProvider() : this.serviceConsumer();
    }

    serviceProvider() { //redis instence to send result to clients or consumer of services
        this.resultSendClient = new redis_client(`${this.clientName}_resultPublisher`, this.config.redisConfig);
        this.handleListenerEvents(this.resultSendClient);
        this.maximunValue = this.config.maxWorkingMSG || 3;
    }

    serviceConsumer() {  //>>node call node or gateway call node
        //create dedicated redis client for enqueue
        this.enqueue_client = new redis_client(`${this.clientName}_enqueue`, this.config.redisConfig);
        this.handleListenerEvents(this.enqueue_client);

        //create dedicated redis client for dequeue from it's box (resultQueue)
        this.dequeue_client = new redis_client(`${this.clientName}_dequeue`, this.config.redisConfig);
        this.handleListenerEvents(this.dequeue_client, true);
        this.resQueue = this.config.resQueue + process.pid

        this.EventEmitter = new EventEmitter();

    }

    handleListenerEvents(redisClient, listenerClient) {
        redisClient.on("ready", () => {
            console.log("reday signal from RPCQ ->>>>");
            //handle redis crashes restart relisten to queue
            listenerClient && this.getConsumerResponse(this.resQueue);
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

    async getConsumerResponse(bResQueue) {
        try {
            let mesgeResponse = await this.dequeue_client.BRPOP(bResQueue, 0);
            mesgeResponse = JSON.parse(mesgeResponse[1]);
            this.EventEmitter.emit(mesgeResponse.reqId, mesgeResponse);
            mesgeResponse = undefined;
            return this.getConsumerResponse(bResQueue);
        } catch (e) {
            console.log('[', new Date(new Date() + 'UTC'), ']', "cannot get res error >>> ", e);
        }
    }

    /** 
    * Brief description of the function here.
    * @summary consumers instence method used for starting call remote method.
    * @param {String} serviceName - service that contains method.
    * @param {String} serviceQueue - serviceQueue that precieve consumers requests .
    * @param {String} methodName - methodName that consumer requests to call and execute .
    * @param {jsObject} bodyParam - service method param .
    * @param {jsObject} reqHeader - any extra data that not belong to param like authrization (future use)  .
    */
    //must check for bodyParam to throw error
    async callRemoteMethod(serviceName, serviceQueue, methodName, bodyParam, reqHeader) {

        if (this.config.serviceProvider) throw Error("you are not consumer ");

        let message = this.formatMSG(serviceName, methodName, this.resQueue,  bodyParam,reqHeader || {}); //format MSG

        let beforegetres = Date.now();
        return new Promise(async (resolve, reject) => {
            console.log('[', new Date(new Date() + 'UTC'), ']', "listenerOn", message.header.id)
            this.EventEmitter.once(message.header.id, (resBody) => {
                try {
                    resBody.timeTrack = { beforegetres: beforegetres, aftergetres: Date.now() }
                    resolve(resBody);
                    resBody = message = beforegetres = undefined;
                } catch (ex) {
                    reject(ex)
                }

            });
            await this.enqueue_client.lpush(serviceQueue, JSON.stringify(message));
        });
    }

    //must check for bodyParam to throw error
    formatMSG(serviceName, methodName, consumerQueue, bodyParam, reqHeader) {
        let MSG = {
            header: { id: uuid(), ...reqHeader, serviceName, methodName, consumerQueue },
            body: bodyParam,
            timeTrack: {
                enqueuTime: Date.now()
            }
        }
        console.log('[', new Date(new Date() + 'UTC'), ']', "request body envolve\n", JSON.stringify(MSG));
        return MSG;
    }

    //must check for bodyParam to throw error
    async registerRemoteService(serviceName, serviceQueue, maxWorkingMSG, callbackFun) {

        if (!this.config.serviceProvider) throw Error("you arenot aprovider ");

        if (registered_services.indexOf(serviceName) == -1)
            registered_services.push(serviceName);
        else
            throw Error(`${serviceName} is registered before`);

        //info: create dedcaited redis client instence =>service_listener for registered service on it's queue
        let service_listener = new redis_client(this.clientName + "listener_" + serviceQueue, this.config.redisConfig);

        new procedure_listener(service_listener, this.resultSendClient, serviceName, serviceQueue, maxWorkingMSG, callbackFun);
    }

    async stop() {
        this.config.serviceProvider && this.resultSendClient.unref();
        this.enqueue_client && this.enqueue_client.unref();
        this.dequeue_client && this.dequeue_client.unref();
    }
}

module.exports = RPC_Queue;