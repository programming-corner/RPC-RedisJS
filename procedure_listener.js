class procedure_listener {

    constructor(client, publisher, serviceName, queueName, maxConsume, functionLogic) {
        this.client = client; //that consume that blocked
        this.publisher = publisher;
        this.serviceName = serviceName;
        this.queueName = queueName;
        this.maxConsume = maxConsume;
        this.currentConsLen = 0;
        this.functionLogic = functionLogic;
    }

    async startListener() {
        console.log('[', new Date(new Date() + 'UTC'), ']', "listener", this.currentConsLen, this.maxConsume)
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
            console.log('[', new Date(new Date() + 'UTC'), ']', "consumer error >>> ", e);
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
                result: null,
                status: {
                    level: -3,
                    code: "RPCDETECTERROR",
                    error: `cannot process ${callerMSG.header.methodName}`,
                    detail: error.stack
                }
            }
        }
        res = Object.assign({}, callerMSG, {
            result: res
        });
        res.reqId = callerMSG.header.id;
        await this.publisher.lpush(callerMSG.header.processResQueue, JSON.stringify(res)); //start rpc
        this.currentConsLen--;
        this.reStartListener(); //restart consumer
    }
}

module.exports = procedure_listener;