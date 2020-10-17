const EventEmitter = require('events');
function sleep(t) {
    return new Promise(resolve => setTimeout(resolve, t))
}
class procedure_listener {

    constructor(client, publisher, serviceName, queueName, maxConsume, functionLogic) {
        this.client = client; //that consume that blocked
        this.publisher = publisher;
        this.serviceName = serviceName;
        this.queueName = queueName;
        this.maxConsume = maxConsume;
        this.currentConsLen = 0;
        this.functionLogic = functionLogic;
        this.EventEmitter = new EventEmitter();
        this.blocked = false;
    }

    async startListener() {
        console.log('[', new Date(new Date() + 'UTC'), ']', "listener", this.currentConsLen, this.maxConsume);
        try {
            if (this.currentConsLen == this.maxConsume)
                (this.blocked = true) && await this.toOpen();

            let msg = await this.client.BRPOP(this.queueName, 0);
            msg = JSON.parse(msg[1]);
            msg.timeTrack.dequeueTime = Date.now();
            this.currentConsLen++;
            this.processMSG(msg);
            msg = undefined;
            return this.startListener();
        } catch (e) {
            console.log('[', new Date(new Date() + 'UTC'), ']', "consumer error >>> ", e);
        }
    };

    async resolveBlock() {
        if (this.currentConsLen < this.maxConsume && this.blocked)
            return this.EventEmitter.emit("open");
        if (this.currentConsLen == this.maxConsume) {
            await sleep(1000);
            return this.resolveBlock();
        }
    }

    async toOpen() {
        return new Promise((resolve, recject) => {
            console.log("status Iam blocked ", this.blocked)
            this.EventEmitter.once("open", () => {
                this.blocked = false;
                console.log("now I am free to accept msg    this.blocked:", this.blocked)
                return resolve("open your gate");
            });
            if (this.currentConsLen != this.maxConsume && this.blocked)
                this.EventEmitter.emit("open")
            return this.resolveBlock();
        })
    }

    async processMSG(callerMSG) {
        callerMSG.timeTrack.befProsTime = Date.now();
        //publish
        let res;
        try {
            res = await this.functionLogic(callerMSG);
        } catch (error) {
            res = {
                result: null,
                status: {
                    level: -1,
                    code: "RPCDETECTERROR",
                    details:{
                        error: `cannot process ${callerMSG.header.methodName}`,
                        detail: error.stack
                    } 
                }
            }
        }
        res = Object.assign({}, callerMSG, {
            result: res
        });
        res.reqId = callerMSG.header.id;
        await this.publisher.lpush(callerMSG.header.processResQueue, JSON.stringify(res)); //start rpc
        if (this.currentConsLen == this.maxConsume) this.EventEmitter.emit("open");
        this.currentConsLen--
        res = callerMSG = undefined;
        return;
    }
}

module.exports = procedure_listener;