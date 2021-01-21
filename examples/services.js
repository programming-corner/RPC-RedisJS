let { redisConfig } = require('./configs');
const RPC = require('../');
let rpc_ins = new RPC({ redisConfig, serviceProvider: true });
rpc_ins.on('RPCerror_redis', (data) => {
    console.log("rpc on error", data);
});
rpc_ins.on('RPCconnnect_redis', (data) => {
});

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
            //handle reqBody based on methodName 
            return await this[reqBody.header.methodName](reqBody.body)
        }
    },
    mathService: {
        maxWorkingMSG: 5,
        methods: async function methods(reqBody) {
            this.sum = (body) => { return body.param1 + body.param2 };
            this.subtract = (body) => { return body.param1 - body.param2 }
            //handle reqBody based on methodName 
            return await this[reqBody.header.methodName](reqBody.body)
        }
    }
}

for (const [serviceName, { methods, maxWorkingMSG = 5 }] of Object.entries(services)) {

    let serviceQueue = `${serviceName}_queue`;
    console.log(`register service ${serviceName} on Queue ${serviceQueue}`);

    //  methods take role as handle callbackfn
    rpc_ins.registerRemoteService(serviceName, serviceQueue, maxWorkingMSG, methods).then(() => {
        console.log(`register ${serviceName} success`);
    }).catch(error => {
        console.error("error data", error)
    })
}