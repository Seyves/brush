import { WSMessage } from "./definitions"

const apipath = `http://${import.meta.env.VITE_SERVER_URL}/api`
const apipathws = `ws://${import.meta.env.VITE_SERVER_URL}/api`

export async function createRoom() {
    const resp = await fetch(`${apipath}/rooms`, {method: "POST"})

    return await resp.text()
}

export class RestClient {
    roomId: string
    name: string

    constructor(roomId: string, name: string) {
        this.roomId = roomId
        this.name = name
    }

    async getUsers() {
        const resp = await fetch(`${apipath}/rooms/${this.roomId}/users`)

        const json = await resp.json() as Record<string, string>

        delete json[this.name]

        return json
    }

    async getUsersColor(name: string) {
        const resp = await fetch(`${apipath}/rooms/${this.roomId}/color/${name}`)

        return await resp.text() as string
    }

    async getExistingDraws() {
        const resp = await fetch(`${apipath}/rooms/${this.roomId}/draws`)

        return await resp.json() as Record<string, WSMessage[]>
    }

    async getLastPositions() {
        const resp = await fetch(`${apipath}/rooms/${this.roomId}/last-positions`)

        const json = await resp.json() as Record<string, WSMessage>

        delete json[this.name]

        return json
    }
}

export class WebsocketClient {
    connection: WebSocket

    constructor(roomId: string, name: string) {
        this.connection = new WebSocket(`${apipathws}/rooms/${roomId}/ws?name=${name}`)
    }

    send(obj: WSMessage) {
        this.connection.send(JSON.stringify(obj))
    }
}
