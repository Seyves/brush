import { createEffect, createSignal, on, onMount}  from "solid-js";
import { useAppContext } from "../App";
import { CMDS, Coords, WSMessage } from "../definitions";
import { createThrottler } from "../utils";
import { scrollOffsetSignal } from "./Canvases";

export const pageOffsetSignal = createSignal<Coords>([0, 0])

export default function MyCanvas() {
    const {
        wsClient,
        me
    } = useAppContext()

    const [getPageOffset, setPageOffset] = pageOffsetSignal
    const [getScrollOffset] = scrollOffsetSignal
    const [isDrawing, setIsDrawing] = createSignal(false)
    const [brushSize, setBrushSize] = createSignal(20)
    const [position, setPosition] = createSignal<Coords>([0, 0])

    let canvas: HTMLCanvasElement | undefined
    let pixelRatio = window.devicePixelRatio
    let history: WSMessage[] = []

    onMount(() => {
        if (!canvas) return

        canvas.style.width = `1920px`
        canvas.style.height = `1080px`
        canvas.width = 1920 * pixelRatio
        canvas.height = 1080 * pixelRatio

        const ctx = canvas.getContext("2d")

        if (!ctx) throw new Error("No canvas context")

        const canvasRect = canvas.getBoundingClientRect()

        setPageOffset([canvasRect.x, canvasRect.y])

        const drawLinePart = createThrottler(function(
            [x, y]: Coords,
            size: number,
            ratio: number
        ) {
            ctx.lineWidth = size
            ctx.lineJoin = "round"
            ctx.lineCap = "round"
            ctx.strokeStyle = me.color

            ctx.lineTo(x * ratio, y * ratio)
            ctx.stroke()

            const msg = {
                cmd: CMDS.LINE,
                payload: `${size / ratio},${x};${y}`
            }

            history.push(msg)

            wsClient.send(msg)
        }, 20)

        const endLine = function() {
            ctx.stroke()
            ctx.beginPath()

            const msg = {
                cmd: CMDS.ENDLINE,
                payload: ``
            }

            history.push(msg)

            wsClient.send(msg)
        }

        const sendMove = createThrottler(function(coords: Coords) {
            wsClient.send({
                cmd: CMDS.MOVE,
                payload: coords.join(";")
            })
        }, 70)

        createEffect(on(position, () => {
            const [pageOffsetX, pageOffsetY] = getPageOffset()
            const [scrollOffsetX, scrollOffsetY] = getScrollOffset()
            const [x, y] = position()

            const offsetCoords = [
                Math.round(x - pageOffsetX + scrollOffsetX),
                Math.round(y - pageOffsetY + scrollOffsetY)
            ] as const

            if (isDrawing()) {
                drawLinePart(offsetCoords, brushSize(), pixelRatio)
            } else {
                sendMove(offsetCoords)
            }
        }))

        createEffect((prevIsDrawing) => {
            if (prevIsDrawing && !isDrawing()) endLine()

            return isDrawing()
        }, false)

        createEffect(on(getScrollOffset, endLine))

        const undo = function() {
            if (!canvas) return

            let endIdx = 0

            for (let i = history.length - 2; i > 0; i--) {
                if (history[i].cmd !== CMDS.ENDLINE) continue

                endIdx = i
                break
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height)

            for (let i = 0; i <= endIdx; i++) {
                const msg = history[i]

                switch (msg.cmd) {
                    case CMDS.LINE: {
                        const [size, pos] = msg.payload.split(",")
                        const [x, y] = pos.split(";")

                        ctx.lineWidth = +size * pixelRatio
                        ctx.lineJoin = "round"
                        ctx.lineCap = "round"
                        ctx.strokeStyle = me.color

                        ctx.lineTo(+x * pixelRatio, +y * pixelRatio)
                        ctx.stroke()
                        break
                    }
                    case CMDS.ENDLINE: {
                        ctx.stroke()
                        ctx.beginPath()

                        break
                    }
                }
            }

            history = history.slice(0, endIdx + 1)

            const msg = {
                cmd: CMDS.UNDO,
                payload: (endIdx + 1).toString()
            }

            wsClient.send(msg)
        }

        function onPointerMove(event: PointerEvent) {
            if (event.target !== canvas) return

            setPosition([event.pageX, event.pageY])
        }

        document.addEventListener("pointermove", onPointerMove)

        function onPointerDown() {
            setIsDrawing(true)
        }

        document.addEventListener("pointerdown", onPointerDown)

        function onPointerUp() {
            setIsDrawing(false)
        }

        document.addEventListener("pointerup", onPointerUp)

        function changeBrushSize(event: WheelEvent) {
            setBrushSize((prev) => prev + Math.round(event.deltaY / 50))
        }

        document.addEventListener("wheel", changeBrushSize)

        window.addEventListener("resize", function() {
            if (!canvas) return

            const canvasRect = canvas.getBoundingClientRect()

            setPageOffset([canvasRect.x, canvasRect.y])

            //pixelRatio = window.devicePixelRatio
            //canvas.width = 1920 * pixelRatio
            //canvas.height = 1080 * pixelRatio

            endLine()
        }, false)

        window.addEventListener("keydown", function(event: KeyboardEvent) {
            if (event.key === "ArrowLeft") undo()
        })
    })

    function getBrushStyles() {
        const size = brushSize()
        const [x, y] = position()
        return {
            width: `${size} px`,
            height: `${size} px`,
            transform: `translate(${x - size / 2}px, ${y - size / 2}px)`,
            background: me.color,
            opacity: 0.5
        }
    }

    return (
        <>
            <canvas ref={canvas} class="canvas my-canvas"></canvas>
            <div class="brush" style={getBrushStyles()}></div>
        </>
    )
}
