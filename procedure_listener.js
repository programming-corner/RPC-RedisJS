const EventEmitter = require('events')
class procedure_listener extends EventEmitter {

    // constructor() {
    //     super()
    // }
    constructor(client, publisher, serviceName, queueName, maxConsume, functionLogic) {
        super()
        this.client = client; //that consume
        this.publisher = publisher;
        this.serviceName = serviceName;
        this.queueName = queueName;
        this.maxConsume = maxConsume;
        this.currentConsLen = 0;
        this.functionLogic = functionLogic;
    }

    async startListener() {
        console.log("listener", this.currentConsLen, this.maxConsume)
        while (this.currentConsLen < this.maxConsume) {
            var callerMSG = await this.getCallerMsg();
            this.currentConsLen++;
            this.processMSG(callerMSG);
        }
    };

    async getCallerMsg() {
        try {
            var msg = await this.client.BRPOP(this.queueName, 0);
            msg = JSON.parse(msg[1]);
            msg.timeTrack.dequeueTime = Date.now();
            return msg;
        } catch (e) {
            console.log("consumer error >>> ", e);
        }
    }

    async reStartListener() {
        return this.startListener();
    }

    async processMSG(callerMSG) {
        callerMSG.timeTrack.befProsTime = Date.now();
        //publish
        var res;
        try {
            res = await this.functionLogic(callerMSG);
        } catch (error) {
            res = {
                error: `cannot process ${callerMSG.header.methodName}`,
                detail: error.stack
            }
        }
        res = Object.assign({}, callerMSG, {
            result: res
        });
        //set res to redis
        await this.publisher.set(callerMSG.header.id, JSON.stringify(res)); //start rpc
        this.emit("message", callerMSG.header.id);

        this.currentConsLen--;
        this.reStartListener(); //restart consumer
    }
}


module.exports = procedure_listener;