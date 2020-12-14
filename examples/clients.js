const RPC_client = require('../');
let { redisConfig } = require('./configs')
const config = {
    redisConfig,
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
        methodName: "goodmorning",
        body: {
            name: "developer"
        }
    },
    {
        service: 'mathService',
        methodName: "sum",
        body: {
            param1: 5,
            param2: 1,

        }
    }
]

clients_requests.forEach(async ({ service, methodName, body }) => {
    console.log("before call Param : ", { service, queue: service, methodName, body })
    for (var i = 0; i < 2; i++) {
        //body.name = body.name + i
        rpc_ins.callRemoteMethod(service, `${service}`, methodName, body).then(data => {
            console.log("request Param : ", { service, queue: service, methodName, body }
                , "\nresult Data:", data)
        })

    }
})


setTimeout(() => {
    rpc_ins.stop();
}, 20000);

