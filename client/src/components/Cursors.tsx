import { For, createEffect, createMemo, createResource, createSignal } from "solid-js";
import { useAppContext } from "../App";
import { CMDS, WSMessage } from "../definitions";
import * as api from "../api.ts"
import Cursor from "./Cursor.tsx";

interface Props {
    users: Record<string, string>
}

export default function Cursors(props: Props) {
    const { wsClient, me } = useAppContext()

    const [lastPositions, { mutate: setLastPositions }] = createResource(
        () => api.getLastPositions(me.name),
        {
            initialValue: {},
            storage: (value) => createSignal(value, { equals: false })
        }
    )

    createEffect(() => {
        props.users

        setLastPositions((prev) => {
            for (const user in prev) {
                if (props.users.hasOwnProperty(user)) continue

                delete prev[user]
            }

            return prev
        })
    })

    wsClient.connection.addEventListener("message", function(unparsed) {
        const parsed = JSON.parse(unparsed.data)

        handleMove(parsed.initiator, parsed.message)
    })

    function handleMove(user: string, message: WSMessage) {
        switch (message.cmd) {
            case CMDS.LINE:
            case CMDS.MOVE: {
                setLastPositions((prev) => {
                    prev[user] = message

                    return prev
                })
            }
        }
    }

    return (
        <For each={Object.keys(lastPositions())}>
            {(name) => {
                const coords = createMemo(() => {
                    const [x, y] = lastPositions()[name].payload.split(";")

                    return { x, y }
                })

                return <Cursor
                    name={name}
                    color={props.users[name]}
                    isSoft={lastPositions()[name].cmd === CMDS.MOVE}
                    nextPosition={coords()}
                ></Cursor>
            }}
        </For >
    )
}
