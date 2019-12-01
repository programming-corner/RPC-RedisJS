class procedure_listener {

    constructor(client, publisher, serviceName, queueName, maxConsume, functionLogic) {
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
                detail: error
            }
        }
        res = Object.assign(callerMSG, {
            result: res
        });

        console.log("&&&&&&&&&&&& befor publish res",callerMSG.header.id)

     //   const result = await redis.set(key, JSON.stringify(shamu));

        if (callerMSG.header.id != 1)
            await this.publisher.rpush(callerMSG.header.id, JSON.stringify(res)); //start rpc

            // else
            // setTimeout(() => {
            //      this.publisher.rpush(callerMSG.header.id, JSON.stringify(res)); //start rpc

            // }, 10000);
        this.currentConsLen--;
        this.reStartListener(); //restart consumer
    }
}


module.exports = procedure_listener;