const RPC_client = require('../');
let { redisConfigs } = require('./service_register_configs')
const config = {
    redisConfig: redisConfigs,
    resQueue: "gateWay",
    name: "gateway"
};

let rpc_ins;

function getRPCInstance() {
    if (rpc_ins) return rpc_ins;
    rpc_ins = new RPC_client(config);
    rpc_ins.on('RPCerror_redis', (data) => {
    });
    rpc_ins.on('RPCconnnect_redis', (data) => {
    });
    return rpc_ins
}

getRPCInstance();

let clients_requests = [
    {
        service: 'welcomeService',
        methodName: "good-morning",
        body: {
            name: "developer"
        }
    }
]

clients_requests.forEach(async ({ service, queueName, methodName, body }) => {
    let resultData = await rpc_ins.callRemoteMethod(service,
        `${service}_queue`, methodName, body);
    console.log("request Param : ", { service, queueName, methodName, body }
        , "\nresult Data:", resultData)
})
