const RPC = require('../');

function timeout(t) {
    return new Promise(resolve => setTimeout(resolve, t));
}

class RPC_service_register {
    constructor(config) {
        this.config = config;
        this.config.callee = true;
        this.rpc_ins = new RPC(config);
        this.handleRPCListener();     
    }

    handleRPCListener() {
        this.rpc_ins.on('RPCerror_redis', (data) => {
            data = {
                data, msg: this.config.name, status: " rpcUtility error  ", case: "registering service in RPC", time: Date.now()
            };
        });

        this.rpc_ins.on('RPCconnnect_redis', (data) => {
            data = {
                data, name: this.config.name, status: " rpcUtility connects ", case: "registering service in RPC", time: Date.now()
            };
            this.sendSocketPackage('redis_connect', data);
        });
    }

    async registerService(serviceName, queueName, maxWorkingMSG,processFunction) {
        if (!maxWorkingMSG) maxWorkingMSG = 5;
        // let processCallback = async (reqMSG) => {
        //     let serviceResponse = ;
        //     return serviceResponse;
        // }
        await this.rpc_ins.registerRemoteService(serviceName, queueName, maxWorkingMSG,
            processFunction);
    }
}

module.exports = RPC_service_register;