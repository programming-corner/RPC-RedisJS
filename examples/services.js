let { redisConfig } = require('./configs')
const RPC = require('../');
let rpc_ins = new RPC({ redisConfig, callee: true });
function getRPCInstance() {
    if (rpc_ins) return rpc_ins; RPCerror_redis
    rpc_ins = new RPC_client(config);
    rpc_ins.on('', (data) => {
    });
    rpc_ins.on('RPCconnnect_redis', (data) => {
    });
    return rpc_ins
}
getRPCInstance();

function timeout(t) {
    return new Promise(resolve => setTimeout(resolve, t));
}

//add list of service each one contains list of functions
let services = {
    welcomeService: {
        maxWorkingMSG: 5,
        methods: async function methods(reqBody) {
            this.goodmorning = async function goodmorning(body) {
                await timeout(12000);
                return `good morning ${body.name}`
            }
            this.goodbye = body => { return `good bye ${body.name}` }
            return await this[reqBody.header.methodName](reqBody.body)
        }
    },
    mathService: {
        maxWorkingMSG: 5,
        methods: async function methods(reqBody) {
            this.sum = (body) => { return body.param1 + body.param2 };
            this.subtract = (body) => { return body.param1 - body.param2 }
            return await this[reqBody.header.methodName](reqBody.body)
        }
    }
}

for (const [serviceName, { methods, maxWorkingMSG = 5 }] of Object.entries(services)) {

    console.log(`register service ${serviceName} on Queue ${serviceName}_queue`);
    rpc_ins.registerRemoteService(serviceName, serviceName,
        maxWorkingMSG, methods).then(() => {
            console.log(`register ${serviceName} success`);
        }).catch(error => {
            console.error("error data", error)
        })
}


