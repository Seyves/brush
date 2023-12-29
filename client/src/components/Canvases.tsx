import { For, createEffect, createMemo, createResource, onMount } from "solid-js"
import { CMDS, WSMessage } from "../definitions"
import { useAppContext } from "../App.tsx"
import * as api from "../api.ts"

interface Props {
    users: Record<string, string>
}

export default function Canvases(props: Props) {
    const { wsClient } = useAppContext()

    const canvases: Record<string, HTMLCanvasElement> = {}
    const contexts: Record<string, CanvasRenderingContext2D> = {}

    const [existingDraws] = createResource(api.getExistingDraws)

    createEffect(() => {
        for (const user in props.users) {
            const canvas = canvases[user]

            if (!contexts.hasOwnProperty(user)) {
                const context = canvas.getContext("2d") as CanvasRenderingContext2D

                canvas.width = screen.width
                canvas.height = screen.height

                contexts[user] = context
            }
        }

        for (const user in contexts) {
            if (!props.users.hasOwnProperty(user)) {
                delete contexts[user]
            }
        }
    })

    onMount(function() {
        const exDraws = existingDraws()

        for (const user in exDraws) {
            for (const message of exDraws[user]) {
                handleDraw(user, message)
            }
        }

        wsClient.connection.addEventListener("message", function(unparsed) {
            const parsed = JSON.parse(unparsed.data)

            handleDraw(parsed.initiator, parsed.message)
        })
    })

    function handleDraw(user: string, message: WSMessage) {
        switch (message.cmd) {
            case CMDS.LINE: {
                const ctx = contexts[user]

                const [x, y] = message.payload.split(";")

                ctx.lineJoin = "round"
                ctx.lineWidth = 9

                ctx.strokeStyle = props.users[user]

                ctx.lineTo(+x, +y)
                ctx.stroke()

                break
            }
            case CMDS.ENDLINE: {
                const ctx = contexts[user]

                ctx.stroke()
                ctx.beginPath()

                break
            }
        }
    }

    return (
        <For each={Object.keys(props.users)}>{(user) => {
            return <canvas class="canvas" ref={canvases[user]}></canvas>
        }}</For>
    )
}
