import { For, createEffect, createSignal, onMount } from "solid-js"
import { CMDS, Coords, WSMessage } from "../definitions"
import { useAppContext } from "../App.tsx"
import MyCanvas from "./MyCanvas.tsx"

interface Props {
    users: Record<string, string>
    existingDraws: Record<string, WSMessage[]>
}

export const scrollOffsetSignal = createSignal<Coords>([0, 0])

export default function Canvases(props: Props) {
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

                const [size, pos] = message.payload.split(",")

                const [x, y] = pos.split(";").map(Number)

                ctx.lineJoin = "round"
                ctx.lineCap = "round"
                ctx.lineWidth = +size * pixelRatio

                ctx.strokeStyle = props.users[user]

                ctx.lineTo(x * pixelRatio, y * pixelRatio)
                ctx.stroke()

                break
            }
            case CMDS.ENDLINE: {
                const ctx = contexts[user]

                ctx.stroke()
                ctx.beginPath()

                break
            }
            case CMDS.UNDO: {
                const canvas = canvases[user]
                const ctx = contexts[user]

                const parsedMsgs = JSON.parse(message.payload) as WSMessage[]

                ctx.clearRect(0, 0, canvas.width, canvas.height)

                for (const msg of parsedMsgs) {
                    handleDraw(user, msg)
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
                <MyCanvas />
            </div>
        </div >
    )
}
