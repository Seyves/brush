import { Setter, createSignal } from "solid-js"
import * as api from "./api.ts"
import { Credentials } from "./App.tsx"
import "./auth.css"

interface Props {
    setCredentials: Setter<Credentials | null>
}

export default function AuthScreen(props: Props) {
    const [getNameInput, setNameInput] = createSignal("")
    const [getRoomIdInput, setRoomIdInput] = createSignal("")
    const [isCreateMode, setIsCreateMode] = createSignal(true)

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

        console.log(roomId)

        enterRoom(roomId, name)
    }

    return (
        <div class="screen auth-screen">
            <div class="auth-form-wrapper">
                <form class="auth-form">
                    <h2 class="auth-form__title">Hello :)</h2>
                    <div class="auth-form__name">
                        <label for="name">Name *</label>
                        <input type="text" class="input" id="name" onChange={(e) => setNameInput(e.currentTarget.value)} />
                    </div>
                    <div class="auth-form__create-checkbox">
                        <input id="is-create" checked type="checkbox" onChange={(e) => setIsCreateMode(e.currentTarget.checked)} />
                        <label for="is-create">I want to create a new room</label>
                    </div>
                    <div class={"auth-form__room-id" + (isCreateMode() ? "" : " auth-form__room-id_active")}>
                        <label for="room-id">Room ID</label>
                        <input id="room-id" type="text" class="input" onChange={(e) => setRoomIdInput(e.currentTarget.value)} />
                    </div>
                    <button class="button" type="button" onClick={() => isCreateMode() ?
                        createRoom(getNameInput()) :
                        enterRoom(getRoomIdInput(), getNameInput())
                    }>Join</button>
                </form>
            </div>
        </div>
    )
}
