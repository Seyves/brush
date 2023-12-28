import { useAppContext } from "../App";
import { CMDS, Coords } from "../definitions";
import { createThrottler } from "../utils";

interface Props {
    myColor: string
}

export default function MyCanvas(props: Props) {
    const { wsClient } = useAppContext()

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    canvas.classList.add("canvas")

    const throttledMove = createThrottler(function(coords: Coords) {
        wsClient.send({
            cmd: CMDS.MOVE,
            payload: `${coords.x};${coords.y}`
        })
    }, 70)

    function moveCursor(event: PointerEvent) {
        const position = { x: event.pageX, y: event.pageY }

        throttledMove(position)
    }

    const throttledDraw = createThrottler(function(coords: Coords) {
        ctx.lineJoin = "round"
        ctx.lineWidth = 9
        ctx.strokeStyle = props.myColor

        ctx.lineTo(coords.x, coords.y)
        ctx.stroke()

        wsClient.send({
            cmd: CMDS.LINE,
            payload: `${coords.x};${coords.y}`
        })
    }, 20)

    function draw(event: PointerEvent) {
        const position = { x: event.pageX, y: event.pageY }

        throttledDraw(position)
    }

    function startDrawing() {
        document.removeEventListener("pointermove", moveCursor)
        document.addEventListener("pointermove", draw)
        document.addEventListener("pointerup", stopDrawing)
    }

    function stopDrawing() {
        ctx.stroke()
        ctx.beginPath()

        wsClient.send({
            cmd: CMDS.ENDLINE,
            payload: ``
        })

        document.addEventListener("pointermove", moveCursor)
        document.removeEventListener("pointermove", draw)
        document.removeEventListener("pointerup", stopDrawing)
    }

    document.addEventListener("pointerdown", startDrawing)
    document.addEventListener("pointermove", moveCursor)

    return canvas
}
