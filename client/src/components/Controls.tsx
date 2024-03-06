import { Setter } from "solid-js"
import { historySignal, historyCursorSignal } from "../MainScreen"
import { CMDS } from "../definitions"

interface Props {
    brushSize: number
    setBrushSize: Setter<number>
}

export default function Controls(props: Props) {
    const [_, setHistoryCursor] = historyCursorSignal
    const [getHistory] = historySignal

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

    return (
        <div
            class="controls"
        >
            <div class="controls__size">
                <label for="size-control">Brush size: </label>
                <input id="size-control" class="input" value={props.brushSize} onInput={(event) => {
                    const value = event.currentTarget.value

                    if (!/^\d+$/.test(value)) {
                        event.currentTarget.value = props.brushSize.toString()
                    } else {
                        props.setBrushSize(parseInt(value))
                    }
                }} />
            </div>
            <button class="controls__undo button" onClick={undo} >⟳</button>
            <button class="controls__redo button" onClick={redo} >⟳</button>
        </div>
    )
}
