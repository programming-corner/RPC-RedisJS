const redis_client = require('./redis_client');
const procedure_listener = require('./procedure_listener');
var uuid = require('uuidv4').uuid;
var registered_services = [];
class RPC_Queue {

    //must check for param to throw error
    constructor(config) {
        this.config = config;
        if (config.callee) {
            this.resultSendClient = new redis_client(this.config); //client to send result to user //for each RPC_queue
            this.maximunValue = config.maxWorkingMSG || 3;
        } else {
            this.enqueue_client = new redis_client(this.config); //create dedicated redis client for enqueue
            this.dequeue_client = new redis_client(this.config); //create dedicated redis client for dequeue
        }
    }

    async getkey(key) {
        return new Promise(async (resolve, reject) => {
            var value = null;
            var interval = setInterval(async () => {
                value = await this.dequeue_client.get(key);
                if (value) {
                    this.dequeue_client.del(key);
                    clearInterval(interval)
                    return resolve(value)
                }
            }, 100);
        })
    }

    //must check for param to throw error
    async callRemoteMethod(serviceName, queueName, methodName, param) {
        var message = this.formatMSG(serviceName, methodName, param); //format MSG
        var beforegetres = Date.now();
        await this.enqueue_client.lpush(queueName, JSON.stringify(message)); //start rpc
        var response = await this.getkey(message.header.id)
        var aftergetres = Date.now();
        response = JSON.parse(response);
        delete response.result.timeTrack;
        response.timeTrack.beforegetres = beforegetres;
        response.timeTrack.aftergetres = aftergetres;
        return response;
    }

    formatMSG(serviceName, methodName, param) {
        return {
            header: {
                id: uuid(),
                parentReqId:param.parentReqId,
                serviceName: serviceName,
                methodName: methodName,
            },
            body: param,
            timeTrack: {
                enqueuTime: Date.now()
            }
        }
    }

    //must check for param to throw error
    async registerRemoteService(serviceName, queueName, maxWorkingMSG, callbackFun) {
        if (registered_services.indexOf(serviceName) == -1)
            registered_services.push(serviceName);
        else
            throw Error(`${serviceName} is registered before`);

        var client_service = new redis_client(this.config); //crate dedcaited client //listener
        var process_listener = new procedure_listener(client_service, this.resultSendClient, serviceName, queueName, maxWorkingMSG, callbackFun);
        process_listener.startListener();
    }
}

module.exports = RPC_Queue;