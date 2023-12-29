const apipath = `http://${location.hostname}:9000/api`
const apipathws = `ws://${location.hostname}:9000/api`

export async function getUsers() {
    const resp = await fetch(`${apipath}/users`)

    return await resp.json()
}

export async function getUsersColor(name) {
    const resp = await fetch(`${apipath}/color/${name}`)

    return await resp.text()
}

export async function getExistingDraws() {
    const resp = await fetch(`${apipath}/draws`)

    return await resp.json()
}

class WebsocketClient {
    constructor(myName) {
        this.connection = new WebSocket(`${apipathws}/ws?name=${myName}`)
    }

    #sendStringified(obj) {
        this.connection.send(JSON.stringify(obj))
    }

    line(coords) {
        this.#sendStringified({
            cmd: "line",
            payload: `${coords.x};${coords.y}`
        })
    }

    move(coords) {
        this.#sendStringified({
            cmd: "move",
            payload: `${coords.x};${coords.y}`
        })
    }

    endLine() {
        this.#sendStringified({
            cmd: "end-line",
            payload: ``
        })
    }
}

export function wsConnect(myName) {
    return new WebsocketClient(myName)
}
