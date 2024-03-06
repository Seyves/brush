import { For, createEffect, createSignal, onMount } from "solid-js"
import * as drawAPI from "../draw-api.ts"
import { CMDS, Coords, WSMessage } from "../definitions"
import { useAppContext } from "../App.tsx"
import MyCanvas from "./MyCanvas.tsx"

interface Comp {
    users: Record<string, string>
    brushSize: number
    existingDraws: Record<string, WSMessage[]>
}

export const scrollOffsetSignal = createSignal<Coords>([0, 0])

export default function Canvases(props: Comp) {
    const { wsClient } = useAppContext()

    const [_, setScrollOffset] = scrollOffsetSignal

    let band: HTMLDivElement | undefined

    const canvases: Record<string, HTMLCanvasElement> = {}
    const contexts: Record<string, CanvasRenderingContext2D> = {}

    const pixelRatio = window.devicePixelRatio

    createEffect(() => {
        for (const user in props.users) {
            const canvas = canvases[user]

            if (!contexts.hasOwnProperty(user)) {
                const context = canvas.getContext("2d") as CanvasRenderingContext2D

                canvas.style.width = `1920px`
                canvas.style.height = `1080px`
                canvas.width = 1920 * window.devicePixelRatio
                canvas.height = 1080 * window.devicePixelRatio

                contexts[user] = context
            }
        }

        for (const user in contexts) {
            if (!props.users.hasOwnProperty(user)) {
                delete contexts[user]
            }
        }
    })

    onMount(() => {
        for (const user in props.existingDraws) {
            for (const message of props.existingDraws[user]) {
                handleDraw(user, message, true)
            }
        }

        wsClient.connection.addEventListener("message", function(unparsed) {
            const parsed = JSON.parse(unparsed.data)

            handleDraw(parsed.initiator, parsed.message, false)
        })
    })

    function handleDraw(user: string, message: WSMessage, isInstant: boolean) {
        const ctx = contexts[user]

        switch (message.cmd) {
            case CMDS.LINE: {
                const [size, pos] = message.payload.split(",")

                const [x, y] = pos.split(";").map(Number)

                if (isInstant) {
                    drawAPI.createLinePart(
                        ctx,
                        [+x * pixelRatio, +y * pixelRatio],
                        +size * pixelRatio,
                        props.users[user]
                    )
                } else {
                    drawAPI.createLinePartLive(
                        ctx,
                        [+x * pixelRatio, +y * pixelRatio],
                        +size * pixelRatio,
                        props.users[user]
                    )
                }

                break
            }
            case CMDS.ENDLINE: {
                drawAPI.createLineEnd(ctx)

                break
            }
            case CMDS.UNDO: {
                const canvas = canvases[user]

                const parsedMsgs = JSON.parse(message.payload) as WSMessage[]

                ctx.clearRect(0, 0, canvas.width, canvas.height)

                for (const msg of parsedMsgs) {
                    handleDraw(user, msg, true)
                }

                break
            }
            case CMDS.REDO: {
                const parsedMsgs = JSON.parse(message.payload) as WSMessage[]

                for (const msg of parsedMsgs) {
                    handleDraw(user, msg, true)
                }

                break
            }
        }
    }

    return (
        <div class="canvases-band" ref={band} onScroll={(event) => {
            const target = event.target

            setScrollOffset([target.scrollLeft, target.scrollTop])
        }}>
            <div id="canvases">
                <For each={Object.keys(props.users)}>{(user) => {
                    return <canvas class="canvas" ref={canvases[user]}></canvas>
                }}</For>
                <MyCanvas brushSize={props.brushSize} />
            </div>
        </div >
    )
}
