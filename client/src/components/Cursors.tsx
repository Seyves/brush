import { For, createEffect, createResource, createSignal, on } from "solid-js";
import { useAppContext } from "../App";
import { CMDS, WSMessage } from "../definitions";
import Cursor from "./Cursor.tsx";
import { pageOffsetSignal } from "./MyCanvas.tsx";
import { scrollOffsetSignal } from "./Canvases.tsx";

interface Props {
    users: Record<string, string>
}

export default function Cursors(props: Props) {
    const { wsClient, restClient } = useAppContext()

    const [getPageOffset] = pageOffsetSignal
    const [getScrollOffset] = scrollOffsetSignal

    const [lastPositions, { mutate: setLastPositions }] = createResource(() => restClient.getLastPositions(), {
            initialValue: {},
            storage: (val) => createSignal(val, { equals: false })
    })

    createEffect(on(() => props.users, (users) => {
        setLastPositions((lastPositions) => {
            for (const user in lastPositions) {
                if (users.hasOwnProperty(user)) continue

                delete lastPositions[user]
            }

            return lastPositions
        })
    }))

    wsClient.connection.addEventListener("message", function(unparsed) {
        const parsed = JSON.parse(unparsed.data)

        handleMove(parsed.initiator, parsed.message)
    })

    function handleMove(user: string, message: WSMessage) {
        switch (message.cmd) {
            case CMDS.LINE:
            case CMDS.MOVE: {
                setLastPositions(lastPositions => {
                    lastPositions[user] = message

                    return lastPositions
                })
            }
        }
    }

    return (
        <For each={Object.keys(lastPositions())}>
            {(name) => {
                function coords() {
                    const msg = lastPositions()[name]

                    const pos = msg.cmd === CMDS.LINE ?
                        msg.payload.split(",")[1] :
                        msg.payload

                    const [pageOffsetX, pageOffsetY] = getPageOffset()
                    const [scrollOffsetX, scrollOffsetY] = getScrollOffset()
                    const [x, y] = pos.split(";").map(Number)

                    return [
                        Math.round(x + pageOffsetX + scrollOffsetX),
                        Math.round(y + pageOffsetY + scrollOffsetY)
                    ] as const
                }

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
