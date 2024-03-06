import { Show, Suspense, createResource, createSignal, } from "solid-js"
import { CMDS, WSMessage } from "./definitions.ts"
import Canvases from "./components/Canvases.tsx"
import { useAppContext } from "./App.tsx"
import Cursors from "./components/Cursors.tsx"
import Controls from "./components/Controls.tsx"

export const historySignal = createSignal<WSMessage[]>([])
export const historyCursorSignal = createSignal(-1)

export default function MainScreen() {
    const { wsClient, restClient } = useAppContext()

    const [brushSize, setBrushSize] = createSignal(20)

    wsClient.connection.addEventListener("message", function(unparsed) {
        const parsed = JSON.parse(unparsed.data)

        if ("initiator" in parsed && "message" in parsed) {
            handleOnline(parsed.initiator as string, parsed.message as WSMessage)
        }
    })

    const [users, { mutate: setUsers }] = createResource(() => restClient.getUsers(), {
        initialValue: {},
    })

    const [existingDraws] = createResource(() => restClient.getExistingDraws())

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

    function loader() {
        const u = users()
        const e = existingDraws()
        if (u && e) return {
            users: u,
            existingDraws: e
        } 

        return null
    }

    return (
        <div class="screen" id="main-screen">
            <Suspense fallback={<p>Loading...</p>}>
                <Show when={loader()} fallback={<p>Something went wrong</p>}>
                    {(loaded) =>
                        <>
                            <Canvases users={loaded().users} existingDraws={loaded().existingDraws} brushSize={brushSize()}/>
                            <Cursors users={loaded().users} />
                            <Controls brushSize={brushSize()} setBrushSize={setBrushSize}/>
                        </>
                    }
                </Show>
            </Suspense>
        </div>
    )
}
