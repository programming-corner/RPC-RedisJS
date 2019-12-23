const redis_client = require('./redis_client');
const EventEmitter = require('events')
const procedure_listener = require('./procedure_listener');
var uuid = require('uuidv4').uuid;
var registered_services = [];
class RPC_Queue {

    //must check for param to throw error
    constructor(config) {
        this.config = config;
        if (config.callee) {
            this.resultSendClient = new redis_client(this.config.redisConfig); //client to send result to user //for each RPC_queue
            this.maximunValue = config.maxWorkingMSG || 3;
        } else {
            this.enqueue_client = new redis_client(this.config.redisConfig); //create dedicated redis client for enqueue
            this.dequeue_client = new redis_client(this.config.redisConfig); //create dedicated redis client for dequeue
            this.EventEmitter = new EventEmitter();
            this.resQueue = this.config.resQueue + process.pid
            this.getCallerMsg(this.resQueue);
        }
    }

    async getCallerMsg(bResQueue) {
        try {
            var reqRes = await this.dequeue_client.BRPOP(bResQueue, 0);
            reqRes = JSON.parse(reqRes[1]);
            this.EventEmitter.emit(reqRes.reqId, reqRes);
            this.getCallerMsg(bResQueue);
        } catch (e) {
            console.log("cannot get res error >>> ", e);
        }
    }

    //must check for param to throw error
    async callRemoteMethod(serviceName, queueName, methodName, param) {
        if (this.resultSendClient)
            throw Error("you arenot consumer ");
        var message = this.formatMSG(serviceName, methodName, param, this.resQueue); //format MSG
        var beforegetres = Date.now();
        await this.enqueue_client.lpush(queueName, JSON.stringify(message)); //start rpc
        return new Promise((resolve, reject) => {
            console.log("listenerOn", message.header.id)
            return this.EventEmitter.once(message.header.id, (resBody) => {
                let response = resBody
                var aftergetres = Date.now();
                delete response.result.timeTrack;
                response.timeTrack.beforegetres = beforegetres;
                response.timeTrack.aftergetres = aftergetres;
                return resolve(response);
            });
        });
    }

    //must check for param to throw error
    formatMSG(serviceName, methodName, param, processResQueue) {
        var parentReqId = param.parentReqId;
        delete param.parentReqId
        return {
            header: {
                id: uuid(),
                parentReqId: parentReqId,
                serviceName: serviceName,
                methodName: methodName,
                processResQueue: processResQueue
            },
            body: param,
            timeTrack: {
                enqueuTime: Date.now()
            }
        }
    }

    //must check for param to throw error
    async registerRemoteService(serviceName, queueName, maxWorkingMSG, callbackFun) {

        if (this.enqueue_client)
            throw Error("you arenot aprovider ");

        if (registered_services.indexOf(serviceName) == -1)
            registered_services.push(serviceName);
        else
            throw Error(`${serviceName} is registered before`);

        var client_service = new redis_client(this.config.redisConfig); //crate dedcaited client //listener
        var process_listener = new procedure_listener(client_service, this.resultSendClient, serviceName, queueName, maxWorkingMSG, callbackFun);
        process_listener.startListener();
    }
}

module.exports = RPC_Queue;