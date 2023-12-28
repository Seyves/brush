import { For, createMemo } from "solid-js"
import { CMDS, WSMessage } from "../definitions"
import { useAppContext } from "../App.tsx"

interface Props {
    users: Record<string, string>
}

interface Layer {
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D
    color: string
}

type Layers = Record<string, Layer>


export default function Canvases(props: Props) {
    const { wsClient } = useAppContext()

    function createNewLayer(color: string): Layer {
        const canvas = document.createElement("canvas")
        const context = canvas.getContext("2d") as CanvasRenderingContext2D

        canvas.width = window.innerWidth
        canvas.height = window.innerHeight

        canvas.classList.add("canvas")

        return {
            canvas,
            context,
            color
        }
    }

    function createInitialElements(users: Record<string, string>) {
        const layers: Layers = {}

        for (const user in users) {
            layers[user] = createNewLayer(users[user])
        }

        return layers
    }

    const layers = createMemo<Layers>((prev) => {
        for (const user in props.users) {
            if (!prev.hasOwnProperty(user)) {
                prev[user] = createNewLayer(props.users[user])
            }
        }

        for (const user in prev) {
            if (!props.users.hasOwnProperty(user)) {
                delete prev[user]
            }
        }

        return prev
    }, createInitialElements(props.users), { equals: false })


    wsClient.connection.addEventListener("message", function(unparsed) {
        const parsed = JSON.parse(unparsed.data)

        handleDraw(parsed.initiator, parsed.message)
    })

    function handleDraw(user: string, message: WSMessage) {
        switch (message.cmd) {
            case CMDS.LINE: {
                const layer = layers()[user]

                const ctx = layer.context

                const [x, y] = message.payload.split(";")

                ctx.lineJoin = "round"
                ctx.lineWidth = 9
                ctx.strokeStyle = layer.color
                ctx.lineTo(+x, +y)
                ctx.stroke()

                break
            }
            case CMDS.ENDLINE: {
                const layer = layers()[user]

                const ctx = layer.context

                ctx.stroke()
                ctx.beginPath()
                break
            }
        }
    }

    return (
        <For each={Object.values(layers())}>{(layer) => layer.canvas}</For>
    )
}
