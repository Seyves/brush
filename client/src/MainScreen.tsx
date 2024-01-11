import { Accessor, For, Show, Signal, Suspense, createEffect, createResource, createSignal, lazy, useContext } from "solid-js"
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
        }
    )

    const [existingDraws] = createResource(api.getExistingDraws)

    function handleOnline(user: string, message: WSMessage) {
        switch (message.cmd) {
            case CMDS.REG: {
                setUsers((users) => ({ ...users, [user]: message.payload }))
                break
            }
            case CMDS.UNREG: {
                setUsers((users) => {
                    const clone = { ...users }

                    delete clone[user]

                    return clone
                })
                break
            }
        }
    }

    //its terrible
    function loader() {
        const u = users()
        const e = existingDraws()
        if (u && e) return [u, e] as const

        return null
    }

    return (
        <div class="screen" id="main-screen">
            <Suspense fallback={<p>Loading...</p>}>
                <Show when={loader()} fallback={<p>Something went wrong</p>}>
                    {(loaded) =>
                        <>
                            <Canvases users={loaded()[0]} existingDraws={loaded()[1]} />
                            <Cursors users={loaded()[0]} />
                        </>
                    }
                </Show>
            </Suspense>
        </div>
    )
}

