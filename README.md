# RPC-RedisJS

implement Remote procedure call (RPC) technology using java script and Redis features.

---

## Installation

---

```bash
$ npm install RPC-RedisJS
```

## Prerequisites

---

- install [redis-server](https://redis.io/download).

- install [NodeJS](https://nodejs.org/en/).

## Quick Start

---

```bash
$ npm i
$ cd ./examples
$ nano configs.js 
 - contains your running redis-server configuration.
$ node services.js
$ node clients.js
```

## Usage

---

- RPC serviceProvider

```js
let { redisConfig } = require('./configs')
const RPC = require('../');
let rpc_ins = new RPC({ redisConfig, serviceProvider: true });
rpc_ins.on('RPCerror_redis', (data) => {
    console.log("rpc on error",data);
});
rpc_ins.on('RPCconnnect_redis', (data) => {
});
// ...check examples folder services.js file
```

- RPC serviceConsumer

```js
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

// ...check examples folder clients.js file

```
