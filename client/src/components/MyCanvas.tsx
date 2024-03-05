import { createEffect, createSignal, on, onMount } from "solid-js";
import { useAppContext } from "../App";
import { CMDS, Coords } from "../definitions";
import { createThrottler } from "../utils";
import { scrollOffsetSignal } from "./Canvases";
import { historyStore } from "../MainScreen";
import * as drawAPI from "../draw-api.ts"

export const pageOffsetSignal = createSignal<Coords>([0, 0])

interface Props {
    brushSize: number
}

export default function MyCanvas(props: Props) {
    const {
        wsClient,
        me
    } = useAppContext()

    const [getPageOffset, setPageOffset] = pageOffsetSignal
    const [getScrollOffset] = scrollOffsetSignal
    const [isDrawing, setIsDrawing] = createSignal(false)
    const [position, setPosition] = createSignal<Coords>([0, 0])
    const [history, setHistory] = historyStore

    let canvas: HTMLCanvasElement | undefined
    let pixelRatio = window.devicePixelRatio

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
            drawAPI.createLinePart(ctx, [x * ratio, y * ratio], size, me.color)

            const msg = {
                cmd: CMDS.LINE,
                payload: `${size / ratio},${x};${y}`
            }

            setHistory((prev) => {
                if (prev.cursor !== -1) {
                    return {
                        cursor: -1,
                        items: [...prev.items.slice(0, prev.cursor + 1), msg]
                    }
                }

                prev.items.push(msg)
                return { ...prev, cursor: -1 }
            })

            wsClient.send(msg)
        }, 20)

        const drawEndLine = function() {
            drawAPI.createEndLine(ctx)

            const msg = {
                cmd: CMDS.ENDLINE,
                payload: ``
            }

            setHistory((prev) => {
                prev.items.push(msg)
                return { ...prev, cursor: -1 }
            })

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
                drawLinePart(offsetCoords, props.brushSize, pixelRatio)
            } else {
                sendMove(offsetCoords)
            }
        }))

        createEffect((prevIsDrawing) => {
            if (prevIsDrawing && !isDrawing()) drawEndLine()

            return isDrawing()
        }, false)

        createEffect(on(getScrollOffset, drawEndLine))

        createEffect((prevCursor: number) => {
            if (!canvas) return history.cursor

            if (history.cursor === -1) return history.cursor

            const isUndo = prevCursor === -1 || prevCursor > history.cursor

            ctx.clearRect(0, 0, canvas.width, canvas.height)

            for (let i = 0; i <= history.cursor; i++) {
                const msg = history.items[i]

                switch (msg.cmd) {
                    case CMDS.LINE: {
                        const [size, pos] = msg.payload.split(",")
                        const [x, y] = pos.split(";")

                        drawAPI.createLinePart(
                            ctx,
                            [+x * pixelRatio, +y * pixelRatio],
                            +size * pixelRatio,
                            me.color
                        )

                        if (!isUndo && i > prevCursor) {
                            wsClient.send({
                                cmd: CMDS.LINE,
                                payload: `${size},${x};${y}`
                            })
                        }

                        break
                    }
                    case CMDS.ENDLINE: {
                        drawAPI.createEndLine(ctx)

                        if (!isUndo && i > prevCursor) {
                            wsClient.send({
                                cmd: CMDS.ENDLINE,
                                payload: ``
                            })
                        }

                        break
                    }
                }
            }

            if (isUndo) {
                const msg = {
                    cmd: CMDS.UNDO,
                    payload: (history.cursor + 1).toString()
                }

                wsClient.send(msg)
            }

            return history.cursor
        }, -1)

        function onPointerMove(event: PointerEvent) {
            if (event.target !== canvas) return

            setPosition([event.pageX, event.pageY])
        }

        canvas.addEventListener("pointermove", onPointerMove)

        function onPointerDown() {
            setIsDrawing(true)
            document.addEventListener("pointerup", onPointerUp)
        }

        canvas.addEventListener("pointerdown", onPointerDown)

        function onPointerUp() {
            setIsDrawing(false)
            document.removeEventListener("pointerup", onPointerUp)
        }

        window.addEventListener("resize", function() {
            if (!canvas) return

            const canvasRect = canvas.getBoundingClientRect()

            setPageOffset([canvasRect.x, canvasRect.y])

            //pixelRatio = window.devicePixelRatio
            //canvas.width = 1920 * pixelRatio
            //canvas.height = 1080 * pixelRatio

            drawEndLine()
        }, false)
    })

    function getBrushStyles() {
        const size = props.brushSize
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
