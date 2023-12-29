import { Accessor, For, Show, Suspense, createEffect, createResource, createSignal, lazy, useContext } from "solid-js"
import * as api from "./api.ts"
import { CMDS, WSMessage } from "./definitions.ts"
import Canvases from "./components/Canvases.tsx"
import { useAppContext } from "./App.tsx"
import MyCanvas from "./components/MyCanvas.tsx"
import Cursors from "./components/Cursors.tsx"

export default function MainScreen() {
    const { wsClient, me } = useAppContext()

    wsClient.connection.addEventListener("message", function(unparsed) {
        const parsed = JSON.parse(unparsed.data)

        if ("initiator" in parsed && "message" in parsed) {
            handleOnline(parsed.initiator as string, parsed.message as WSMessage)
        }
    })

    const [users, { mutate: setUsers }] = createResource(
        () => api.getUsers(me.name),
        {
            initialValue: {},
            storage: (value) => createSignal(value, { equals: false })
        }
    )

    function handleOnline(user: string, message: WSMessage) {
        switch (message.cmd) {
            case CMDS.REG: {
                setUsers((prev) => {
                    prev[user] = message.payload

                    return prev
                })
                break
            }
            case CMDS.UNREG: {
                setUsers((prev) => {
                    delete prev[user]

                    return prev
                })
                break
            }
        }
    }

    return (
        <div class="screen">
            <Suspense fallback={<p>Loading...</p>}>
                <Show when={users()} fallback={<p>Something went wrong</p>}>
                    <Canvases users={users()} />
                    <MyCanvas />
                    <Cursors users={users()} />
                </Show>
            </Suspense>
        </div>
    )
}

