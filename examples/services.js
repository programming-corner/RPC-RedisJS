//service containsgroups of functions
let rpc_service_register = require('./rpc_service_register');
let { redisConfigs } = require('./service_register_configs')
let serviceRegRPC = new rpc_service_register(redisConfigs)

//add list of service each one contains list of functions
let services = {
    welcomeService: {
        maxWorkingMSG: 5,
        methods: {
            "good-morning": body => { return `good morning ${body.name}` },
            "good-bye": body => { return `good bye ${body.name}` }
        }
    },
    mathService: {
        maxWorkingMSG: 5,
        methods: {
            "sum": (body) => { return body.param1 + body.param2 },
            "subtract": (body) => { return body.param1 - body.param2 }
        }
    }
}


for (const [serviceName, { methods, maxWorkingMSG = 5 }] of Object.entries(services)) {
    console.log(`register service ${serviceName} on Queue ${serviceName}_queue`);
    for (const [methodName, functionLogic] of Object.entries(methods)) {
        console.log(`register method ${methodName}`);
        //register each method in the service
        serviceRegRPC.registerService(serviceName, `${serviceName}_queue`,
            maxWorkingMSG, functionLogic).then(resultData => {
                console.log("success resultData", resultData)
            }).catch(error => {
                console.error("error data", error)
            })
    }
}


