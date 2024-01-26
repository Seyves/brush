import { Setter, createSignal } from "solid-js"
import * as api from "./api.ts"
import { Credentials } from "./App.tsx"

interface Props {
    setCredentials: Setter<Credentials | null>
}

export default function AuthScreen(props: Props) {
    const [getNameInput, setNameInput] = createSignal("")
    const [getRoomIdInput, setRoomIdInput] = createSignal("")

    function enterRoom(roomId: string, name: string) {
        const wsClient = new api.WebsocketClient(roomId, name)
        const restClient = new api.RestClient(roomId, name)

        async function onOpen() {
            const color = await restClient.getUsersColor(name)

            props.setCredentials({
                me: {
                    color,
                    name,
                },
                restClient,
                wsClient
            })
        }

        wsClient.connection.onopen = onOpen
    }

    async function createRoom(name: string) {
        const roomId = await api.createRoom()

        enterRoom(roomId, name)
    }

    return (
        <div class="screen" id="auth-screen">
            <form id="auth-form">
                <label>Please input your name</label>
                <input type="text" onChange={(e) => setNameInput(e.currentTarget.value)} />
                <input type="text" onChange={(e) => setRoomIdInput(e.currentTarget.value)} />
                <button type="button" onClick={() => enterRoom(getRoomIdInput(), getNameInput())}>Enter room</button>
                <button type="button" onClick={() => createRoom(getNameInput())}>Create new room</button>
            </form>
        </div>
    )
}
