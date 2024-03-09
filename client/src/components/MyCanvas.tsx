import { createEffect, createSignal, on, onMount } from "solid-js";
import { useAppContext } from "../App";
import { CMDS, Coords } from "../definitions";
import { createThrottler } from "../utils";
import { scrollOffsetSignal } from "./Canvases";
import { historyCursorSignal, historySignal } from "../MainScreen";
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

    const [getIsDrawing, setIsDrawing] = createSignal(false)
    const [getPosition, setPosition] = createSignal<Coords>([0, 0])

    const [getPageOffset, setPageOffset] = pageOffsetSignal
    const [getScrollOffset, setScrollOffset] = scrollOffsetSignal
    const [getHistoryCursor, setHistoryCursor] = historyCursorSignal
    const [getHistory, setHistory] = historySignal

    let canvas: HTMLCanvasElement | undefined
    let pixelRatio = window.devicePixelRatio

    onMount(() => {
        if (!canvas) return

        canvas.style.width = `1920px`
        canvas.style.height = `1020px`
        canvas.width = 1920 * pixelRatio
        canvas.height = 1020 * pixelRatio

        const ctx = canvas.getContext("2d")

        if (!ctx) throw new Error("No canvas context")

        const canvasRect = canvas.getBoundingClientRect()

        setPageOffset([Math.max(canvasRect.x, 0), Math.max(canvasRect.y, 0)])

        const drawEndLine = function() {
            console.log("drawing end line")
            drawAPI.createLineEnd(ctx)

            const msg = {
                cmd: CMDS.ENDLINE,
                payload: ``
            }

            setHistory((prev) => {
                prev.push(msg)

                return prev
            })

            wsClient.send(msg)
        }

        const sendMove = createThrottler(function(coords: Coords) {
            wsClient.send({
                cmd: CMDS.MOVE,
                payload: coords.join(";")
            })
        }, 50)

        createEffect(on(getPosition, () => {
            if (getIsDrawing()) return

            const [pageOffsetX, pageOffsetY] = getPageOffset()
            const [scrollOffsetX, scrollOffsetY] = getScrollOffset()
            const [x, y] = getPosition()

            const offsetCoords = [
                Math.round(x - pageOffsetX + scrollOffsetX),
                Math.round(y - pageOffsetY + scrollOffsetY)
            ] as const

            sendMove(offsetCoords)
        }))

        const drawLinePart = function() {
            let prevPos: Coords = [0, 0]
            let throttleTime = performance.now()

            return function(
                [x, y]: Coords,
                ratio: number,
                size: number
            ) {
                const deltaTime = performance.now() - throttleTime

                //these numbers do not make sense, just practically fugired them out
                const isEnoughX = Math.abs(x - prevPos[0]) ** 1.4 * deltaTime > 80
                const isEnoughY = Math.abs(y - prevPos[1]) ** 1.4 * deltaTime > 80

                if (!isEnoughX && !isEnoughY) return

                console.log(x, y)
                console.log("drawing line")
                drawAPI.createLinePartLive(ctx, [x * ratio, y * ratio], size, me.color)

                const msg = {
                    cmd: CMDS.LINE,
                    payload: `${size / ratio},${x};${y}`
                }

                setHistory((prev) => {
                    if (getHistoryCursor() !== -1) {
                        return [...prev.slice(0, getHistoryCursor() + 1), msg]
                    }

                    prev.push(msg)

                    return prev
                })

                setHistoryCursor(-1)

                wsClient.send(msg)

                prevPos = [x, y]
                throttleTime = performance.now()
            }
        }()

        function frameHandler() {
            if (!getIsDrawing()) return requestAnimationFrame(frameHandler)

            const [pageOffsetX, pageOffsetY] = getPageOffset()
            const [scrollOffsetX, scrollOffsetY] = getScrollOffset()
            const [x, y] = getPosition()

            const offsetCoords = [
                Math.round(x - pageOffsetX + scrollOffsetX),
                Math.round(y - pageOffsetY + scrollOffsetY)
            ] as const

            drawLinePart(offsetCoords, pixelRatio, props.brushSize)

            requestAnimationFrame(frameHandler)
        }

        requestAnimationFrame(frameHandler)

        createEffect((prevIsDrawing) => {
            const history = getHistory()
            const isDrawing = getIsDrawing()

            if (prevIsDrawing && !isDrawing && history[history.length - 1]?.cmd === CMDS.LINE) drawEndLine()

            return isDrawing
        }, false)

        createEffect(on(getScrollOffset, drawEndLine))

        createEffect((prevCursor: number) => {
            const history = getHistory()
            const historyCursor = getHistoryCursor()

            if (!canvas) return historyCursor

            if (historyCursor === -1) return historyCursor

            ctx.clearRect(0, 0, canvas.width, canvas.height)

            for (let i = 0; i <= historyCursor; i++) {
                const msg = history[i]

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

                        break
                    }
                    case CMDS.ENDLINE: {
                        drawAPI.createLineEnd(ctx)

                        break
                    }
                }
            }

            const isUndo = prevCursor === -1 || prevCursor > historyCursor

            if (isUndo) {
                const msg = {
                    cmd: CMDS.UNDO,
                    payload: (historyCursor + 1).toString()
                }

                wsClient.send(msg)
            } else {
                const msg = {
                    cmd: CMDS.REDO,
                    payload: JSON.stringify(history.slice(prevCursor + 1, historyCursor + 1))
                }

                wsClient.send(msg)
            }

            return historyCursor
        }, -1)

        function onPointerMove(event: PointerEvent) {
            if (event.target !== canvas) return

            setPosition([event.pageX, event.pageY])
        }

        canvas.addEventListener("pointermove", onPointerMove)

        function onPointerDown(event: PointerEvent) {
            setPosition([event.pageX, event.pageY])
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

            setPageOffset([Math.max(canvasRect.x, 0), Math.max(canvasRect.y, 0)])

            const band = document.querySelector(".canvases-band")

            if (band) {
                setScrollOffset([band.scrollLeft, band.scrollTop])
            }

            const history = getHistory()

            if (history[history.length - 1]?.cmd === CMDS.LINE) drawEndLine()
        }, false)
    })

    function getBrushStyles() {
        const size = props.brushSize
        const [x, y] = getPosition()
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
