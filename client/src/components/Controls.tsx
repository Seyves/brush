import { Setter, createSignal, onMount } from "solid-js"
import { historySignal, historyCursorSignal } from "../MainScreen"
import { CMDS } from "../definitions"
import { useAppContext } from "../App"

interface Props {
    brushSize: number
    setBrushSize: Setter<number>
}

export default function Controls(props: Props) {
    const { restClient } = useAppContext()

    const [_, setHistoryCursor] = historyCursorSignal
    const [getHistory] = historySignal
    const [getIsBPressend, setIsBPressed] = createSignal(false)

    let sliderLineElem: HTMLSpanElement | undefined = undefined

    onMount(() => {
        if (!sliderLineElem) return

        const sliderElem = sliderLineElem.parentElement

        if (!sliderElem) return

        function onPointerMove(event: PointerEvent) {
            if (!sliderLineElem) return
            event.preventDefault()

            const lineRect = sliderLineElem.getBoundingClientRect()

            const zeroCoord = lineRect.x
            const sliderSize = lineRect.width

            const brushSize = Math.round(Math.max(0, Math.min(sliderSize, event.pageX - zeroCoord)))

            props.setBrushSize(brushSize)
        }

        function onPointerUp() {
            document.removeEventListener("pointermove", onPointerMove)
            document.removeEventListener("pointerup", onPointerUp)
        }

        sliderElem.addEventListener("pointerdown", (event) => {
            if (!event.isPrimary) return
            event.preventDefault()
            document.addEventListener("pointerup", onPointerUp)
            document.addEventListener("pointermove", onPointerMove)
        })
    })

    function undo() {
        setHistoryCursor(prev => {
            const history = getHistory()

            let endIdx = 0

            const start = prev === -1 ? history.length - 1 : prev

            for (let i = start - 1; i > 0; i--) {
                if (history[i].cmd !== CMDS.ENDLINE) continue

                endIdx = i
                break
            }

            return endIdx
        })
    }

    function redo() {
        setHistoryCursor(prev => {
            if (prev === -1) return prev

            const history = getHistory()

            let endIdx = prev

            for (let i = prev + 1; i < history.length; i++) {
                if (history[i].cmd !== CMDS.ENDLINE) continue

                endIdx = i
                break
            }

            return endIdx
        })
    }

    window.addEventListener("keydown", function(event: KeyboardEvent) {
        if (event.ctrlKey && event.key === "z") undo()
    })

    window.addEventListener("keydown", function(event: KeyboardEvent) {
        if (event.ctrlKey && event.key === "y") redo()
    })

    window.addEventListener("keydown", function(event: KeyboardEvent) {
        if (event.key === "b") setIsBPressed(true)
    })

    window.addEventListener("keyup", function(event: KeyboardEvent) {
        if (event.key === "b") setIsBPressed(false)
    })

    window.addEventListener("wheel", function(event) {
        if (!getIsBPressend()) return false

        props.setBrushSize((prev) => {
            return Math.max(prev - Math.round(event.deltaY / 50), 1)
        })

        return false
    })

    return (
        <div
            class="controls"
        >
            <div class="controls__size">
                <label for="size-control">Brush size: {props.brushSize}</label>
                <div class="size-slider">
                    <div class="size-slider__line" ref={sliderLineElem}>
                        <span
                            class="size-slider__head"
                            style={{ left: props.brushSize + "px" }}
                        ></span>
                    </div>
                </div>
            </div>
            <button class="controls__button controls__undo button" onClick={undo} >⟳</button>
            <button class="controls__button button" onClick={redo} >⟳</button>
            <button class="controls__button controls__copy button" onClick={() => navigator.clipboard.writeText(restClient.roomId)} >Copy Room ID</button>
        </div>
    )
}
