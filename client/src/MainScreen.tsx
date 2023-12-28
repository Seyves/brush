import { Accessor, For, Show, Suspense, createResource, createSignal, lazy, useContext } from "solid-js"
import * as api from "./api.ts"
import { CMDS, WSMessage } from "./definitions.ts"
import Canvases from "./components/Canvases.tsx"
import { useAppContext } from "./App.tsx"
import MyCanvas from "./components/MyCanvas.tsx"

export default function MainScreen() {
    const { wsClient, me } = useAppContext()

    wsClient.connection.addEventListener("message", function(unparsed) {
        const parsed = JSON.parse(unparsed.data)

        if ("initiator" in parsed && "message" in parsed) {
            handleOnline(parsed.initiator as string, parsed.message as WSMessage)
        }
    })

    const [existingDraws] = createResource(api.getExistingDraws)

    const [users, { mutate: setUsers }] = createResource(api.getUsers, {
        initialValue: {},
    })

    function handleOnline(user: string, message: WSMessage) {
        switch (message.cmd) {
            case CMDS.REG: {
                setUsers((prev) => ({ ...prev, [user]: message.payload }))
                break
            }
            case CMDS.UNREG: {
                setUsers((prev) => {
                    const updated = { ...prev }

                    delete updated[user]

                    return updated
                })
                break
            }
        }
    }

    return (
        <div class="screen">
            <Suspense fallback={<p>Loading...</p>}>
                <Show when={existingDraws() && users()} fallback={<p>Something went wrong</p>}>
                    <Canvases users={users()} />
                    <MyCanvas myColor={users()[me.name]} />
                </Show>
            </Suspense>
        </div>
    )
}

